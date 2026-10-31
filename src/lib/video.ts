import "server-only";
import { eq, sql } from "drizzle-orm";
import { SignJWT } from "jose";
import { createPrivateKey, type KeyObject } from "node:crypto";
import { db } from "@/db";
import { contentItems, videoPlaybacks, type Cue } from "@/db/schema";
import { signToken, verifyToken } from "./crypto";
import { env } from "./env";
import { signedFileUrl } from "./storage";

// Video playback. Live: Mux (adaptive HLS, signed playback JWTs, low-res MP4 static renditions).
// Local stand-in: HLS renditions under .media/videos/<slug>/ served by /api/media/hls with a signed token
// that expires; playlists are rewritten so every segment request carries the token.

export type Playback = {
  provider: "mux" | "local" | "file";
  playbackId: string; // our usage-tracking row id
  hls: string;
  mp4?: string; // "file": a single MP4 in the cloud bucket, played directly
  captions: string;
  download: string;
  poster: string;
  expiresAt: number;
  durationSec: number | null;
};

type VideoContent = Pick<typeof contentItems.$inferSelect, "id" | "slug" | "videoAssetId" | "videoDurationSec">;

let muxKey: KeyObject | null = null;
async function muxToken(playbackId: string, aud: "v" | "t", ttl: number) {
  const cfg = env.mux()!;
  muxKey ??= createPrivateKey(Buffer.from(cfg.signingPrivateKey, "base64").toString("utf8"));
  return new SignJWT({ sub: playbackId, aud })
    .setProtectedHeader({ alg: "RS256", kid: cfg.signingKeyId })
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(muxKey);
}

export async function mediaToken(slug: string, ttl = env.videoTokenTtlSec()) {
  return signToken({ a: slug }, ttl, "media");
}

export async function verifyMediaToken(token: string | null, slug: string) {
  const claims = await verifyToken<{ a: string }>(token, "media");
  return !!claims && claims.a === slug;
}

/** Issues signed playback links and records a playback for per-school usage reporting. Check access first. */
export async function createPlayback(content: VideoContent, who: { orgId: string | null; teacherId?: string | null; classId?: string | null }): Promise<Playback> {
  const ttl = env.videoTokenTtlSec();
  const d = await db();
  const asset = content.videoAssetId ?? `local:${content.slug}`;
  const isMux = asset.startsWith("mux:") && !!env.mux();
  const [row] = await d
    .insert(videoPlaybacks)
    .values({ orgId: who.orgId, contentId: content.id, teacherId: who.teacherId ?? null, classId: who.classId ?? null, rendition: "auto" })
    .returning({ id: videoPlaybacks.id });
  const local = await mediaToken(content.slug, ttl);
  const captions = `/api/video/${content.slug}/captions.vtt?t=${local}`;
  const expiresAt = Date.now() + ttl * 1000;

  if (isMux) {
    const id = asset.slice(4);
    const [v, t] = await Promise.all([muxToken(id, "v", ttl), muxToken(id, "t", ttl)]);
    return {
      provider: "mux", playbackId: row.id, expiresAt, durationSec: content.videoDurationSec,
      hls: `https://stream.mux.com/${id}.m3u8?token=${v}`,
      download: `https://stream.mux.com/${id}/low.mp4?token=${v}`,
      poster: `https://image.mux.com/${id}/thumbnail.jpg?token=${t}`,
      captions,
    };
  }
  if (asset.startsWith("file:")) {
    const key = asset.slice(5);
    const [mp4, download] = await Promise.all([signedFileUrl(key, `${content.slug}.mp4`, { inline: true, ttlSec: Math.max(ttl, 4 * 3600) }), signedFileUrl(key, `${content.slug}.mp4`, { ttlSec: ttl })]);
    return { provider: "file", playbackId: row.id, expiresAt, durationSec: content.videoDurationSec, hls: "", mp4, download, poster: "", captions };
  }
  const base = `/api/media/hls/${content.slug}`;
  return {
    provider: "local", playbackId: row.id, expiresAt, durationSec: content.videoDurationSec,
    hls: `${base}/master.m3u8?t=${local}`,
    download: `${base}/low.mp4?t=${local}&dl=1`,
    poster: `${base}/poster.jpg?t=${local}`,
    captions,
  };
}

/** Heartbeat from the player: adds watched seconds (capped per beat) to the playback row. */
export async function recordWatch(playbackId: string, seconds: number, rendition?: string) {
  const s = Math.max(0, Math.min(60, Math.round(seconds)));
  const d = await db();
  await d
    .update(videoPlaybacks)
    .set({ secondsWatched: sql`${videoPlaybacks.secondsWatched} + ${s}`, lastBeatAt: new Date(), ...(rendition ? { rendition: rendition.slice(0, 16) } : {}) })
    .where(eq(videoPlaybacks.id, playbackId));
}

const ts = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
};

export function toVtt(cues: Cue[]) {
  return "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n");
}
