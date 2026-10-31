// Uploads generated media to the production services, then points the database at them:
//   - PDFs (.media/files/*.pdf) → S3-compatible bucket (S3_* env)
//   - Videos (.media/videos/<slug>/source.mp4, the 720p master) → Mux with SIGNED playback and MP4 renditions
//     (MUX_TOKEN_ID / MUX_TOKEN_SECRET); content_items.video_asset_id becomes "mux:<playbackId>"
// Requires DATABASE_URL for the asset-id update. Run after `npm run media:generate`.
// Usage: npm run media:upload [-- --only=<slug>]
// NOTE: written against Mux's documented Direct Upload API; verify with real keys before the first production run.
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { CONTENT } from "../src/content/lessons";
import * as schema from "../src/db/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const pick = <T extends { slug: string }>(xs: T[]) => xs.filter((x) => !only || x.slug === only);

async function uploadPdfs() {
  const { S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return console.log("upload: S3 keys not set; skipping PDFs");
  const s3 = new S3Client({ region: S3_REGION || "auto", endpoint: S3_ENDPOINT || undefined, forcePathStyle: !!S3_ENDPOINT, credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } });
  for (const c of pick(CONTENT.filter((x) => x.pdf))) {
    const body = await fs.readFile(path.join(ROOT, ".media", "files", `${c.slug}.pdf`));
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: `files/${c.slug}.pdf`, Body: body, ContentType: "application/pdf" }));
    console.log(`upload: pdf ${c.slug}`);
  }
}

async function mux(pathname: string, init: RequestInit = {}) {
  const auth = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");
  const r = await fetch(`https://api.mux.com${pathname}`, { ...init, headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`mux ${pathname} ${r.status}: ${await r.text()}`);
  return ((await r.json()) as { data: Record<string, unknown> }).data;
}

async function uploadVideos() {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) return console.log("upload: Mux keys not set; skipping videos");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to record Mux playback ids");
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  for (const c of pick(CONTENT.filter((x) => x.narration))) {
    const upload = await mux("/video/v1/uploads", { method: "POST", body: JSON.stringify({ cors_origin: "*", new_asset_settings: { playback_policy: ["signed"], mp4_support: "standard", passthrough: c.slug } }) });
    const file = await fs.readFile(path.join(ROOT, ".media", "videos", c.slug, "source.mp4"));
    const put = await fetch(String(upload.url), { method: "PUT", body: file, headers: { "Content-Type": "video/mp4" } });
    if (!put.ok) throw new Error(`upload PUT failed for ${c.slug}: ${put.status}`);
    let assetId = "";
    for (let i = 0; i < 60 && !assetId; i++) {
      const u = await mux(`/video/v1/uploads/${upload.id}`);
      assetId = String(u.asset_id ?? "");
      if (!assetId) await new Promise((r) => setTimeout(r, 2000));
    }
    let playbackId = "";
    for (let i = 0; i < 90 && !playbackId; i++) {
      const a = await mux(`/video/v1/assets/${assetId}`);
      if (a.status === "ready") playbackId = String((a.playback_ids as { id: string; policy: string }[]).find((p) => p.policy === "signed")?.id ?? "");
      else await new Promise((r) => setTimeout(r, 2000));
    }
    if (!playbackId) throw new Error(`asset ${assetId} for ${c.slug} never became ready`);
    await db.update(schema.contentItems).set({ videoAssetId: `mux:${playbackId}` }).where(eq(schema.contentItems.slug, c.slug));
    console.log(`upload: video ${c.slug} → mux:${playbackId}`);
  }
  await client.end();
}

await uploadPdfs();
await uploadVideos();
