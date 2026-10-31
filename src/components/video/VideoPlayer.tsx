"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Cue } from "@/db/schema";
import { Icon } from "../ui/Icon";
import styles from "./VideoPlayer.module.css";

type Playback = { provider: string; playbackId: string; hls: string; mp4?: string; captions: string; download: string; poster: string; expiresAt: number };
type HlsLike = { levels: { height: number }[]; currentLevel: number; nextLevel: number; loadSource(u: string): void; attachMedia(v: HTMLMediaElement): void; destroy(): void; on(e: string, cb: () => void): void };
type Quality = "auto" | "high" | "low";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const LOW_KEY = "cc-low-bandwidth";

/**
 * Accessible video player: native controls (keyboard + screen reader), captions on by default,
 * an interactive transcript, Auto/High/Low quality, a low-bandwidth mode that is remembered on this
 * device, and a low-res MP4 download. Playback links are signed and short-lived; they are fetched
 * from the server (after its access check) and refreshed if they expire.
 */
export function VideoPlayer({ slug, title, cues }: { slug: string; title: string; cues: Cue[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const hlsMod = useRef<(typeof import("hls.js/light"))["default"] | null>(null);
  const watched = useRef(0);
  const lastT = useRef(0);
  const [pb, setPb] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);
  const [quality, setQuality] = useState<Quality>("auto");
  const [active, setActive] = useState(-1);
  const [showTranscript, setShowTranscript] = useState(true);

  const fetchPlayback = useCallback(async () => {
    const r = await fetch(`/api/video/${slug}/playback`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status === 403 ? "You don't have access to this video." : "The video couldn't load. Check your connection and try again.");
    const p = (await r.json()) as Playback;
    setPb(p);
    return p;
  }, [slug]);

  useEffect(() => {
    let low = false;
    try {
      low = localStorage.getItem(LOW_KEY) === "1";
    } catch {}
    // Preload hls.js so pressing Play can attach and start synchronously (keeps the user gesture for autoplay rules).
    // hls.js is preferred wherever MSE exists (Chrome/Chromebooks, Firefox, Edge); native HLS is the fallback (iOS).
    import("hls.js/light").then((m) => (hlsMod.current = m.default)).catch(() => {});
    // Defer state updates out of the effect body.
    queueMicrotask(() => {
      if (low) setQuality("low");
      fetchPlayback().catch((e: Error) => setError(e.message));
    });
    return () => hlsRef.current?.destroy();
  }, [fetchPlayback]);

  const applyQuality = useCallback((q: Quality) => {
    const hls = hlsRef.current;
    if (!hls || !hls.levels.length) return;
    const sorted = hls.levels.map((l, i) => ({ h: l.height, i })).sort((a, b) => b.h - a.h);
    hls.nextLevel = q === "auto" ? -1 : q === "high" ? sorted[0].i : sorted[sorted.length - 1].i;
  }, []);

  /** Attach the stream only when the teacher presses play (saves school bandwidth). */
  const attach = useCallback(async () => {
    const video = videoRef.current;
    if (!video || attached) return;
    let p = pb;
    if (!p || p.expiresAt - Date.now() < 30_000) p = await fetchPlayback();
    setAttached(true);
    const Hls = hlsMod.current ?? (await import("hls.js/light")).default;
    if (p.mp4) {
      video.src = p.mp4; // single MP4 from the cloud bucket (no adaptive renditions)
    } else if (!Hls.isSupported()) {
      video.src = video.canPlayType("application/vnd.apple.mpegurl") ? p.hls : p.download;
    } else {
      const hls = new Hls({ capLevelToPlayerSize: true, startLevel: quality === "low" ? 1 : -1 }) as unknown as HlsLike;
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => applyQuality(quality));
      hls.loadSource(p.hls);
      hls.attachMedia(video);
    }
    await video.play().catch(() => {});
  }, [attached, pb, fetchPlayback, applyQuality, quality]);

  const beat = useCallback(() => {
    if (!pb || watched.current < 1) return;
    const seconds = watched.current;
    watched.current = 0;
    const hls = hlsRef.current;
    const rendition = hls && hls.currentLevel >= 0 ? `${hls.levels[hls.currentLevel]?.height}p` : quality;
    const body = JSON.stringify({ playbackId: pb.playbackId, seconds, rendition });
    const sent = navigator.sendBeacon?.("/api/video/usage", new Blob([body], { type: "application/json" }));
    if (!sent) void fetch("/api/video/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  }, [pb, quality]);

  useEffect(() => {
    const id = setInterval(beat, 15_000);
    return () => {
      clearInterval(id);
      beat();
    };
  }, [beat]);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const delta = t - lastT.current;
    if (delta > 0 && delta < 2) watched.current += delta;
    lastT.current = t;
    const idx = cues.findIndex((c) => t >= c.start && t < c.end);
    if (idx !== active) setActive(idx);
  };

  const seek = async (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (!attached) await attach();
    v.currentTime = t + 0.01;
    v.play().catch(() => {});
  };

  const chooseQuality = (q: Quality) => {
    setQuality(q);
    try {
      localStorage.setItem(LOW_KEY, q === "low" ? "1" : "0");
    } catch {}
    applyQuality(q);
  };

  return (
    <figure className={styles.player} aria-label={`Video: ${title}`}>
      <div className={styles.frame}>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          preload="none"
          playsInline
          poster={pb?.poster || undefined}
          onPlay={() => void attach()}
          onTimeUpdate={onTime}
          onPause={beat}
          onEnded={beat}
          aria-describedby={`${slug}-desc`}
          data-testid="lesson-video"
        >
          {pb && <track kind="captions" src={pb.captions} srcLang="en" label="English" default />}
        </video>
        {!attached && (
          <button type="button" className={styles.bigPlay} onClick={() => void attach()} disabled={!pb && !error} aria-label={`Play video: ${title}`}>
            <span className={styles.bigPlayIcon} aria-hidden="true">
              <Icon name="video" size={30} />
            </span>
            <span className={styles.bigPlayText}>{error ? "Unavailable" : pb ? "Play" : "Loading…"}</span>
          </button>
        )}
      </div>
      <p id={`${slug}-desc`} className="sr-only">
        Captions are on. A full transcript follows the video.
      </p>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      <div className={styles.toolbar}>
        <fieldset className={styles.quality}>
          <legend className="sr-only">Video quality</legend>
          <Icon name="wifi" size={16} />
          {(["auto", "high", "low"] as const).map((q) => (
            <label key={q} className={`${styles.qOpt} ${quality === q ? styles.qOn : ""}`}>
              <input type="radio" name={`${slug}-quality`} value={q} checked={quality === q} onChange={() => chooseQuality(q)} className="sr-only" />
              {q === "auto" ? "Auto" : q === "high" ? "High 720p" : "Low 360p"}
            </label>
          ))}
        </fieldset>
        <div className={styles.tools}>
          <button type="button" className="btn btn-xs" aria-expanded={showTranscript} aria-controls={`${slug}-transcript`} onClick={() => setShowTranscript((s) => !s)}>
            <Icon name="captions" size={15} /> Transcript
          </button>
          {pb && (
            <a href={pb.download} className="btn btn-xs" download data-testid="video-download">
              <Icon name="download" size={15} /> {pb.mp4 ? "Download" : "Low-res download"}
            </a>
          )}
        </div>
      </div>

      <section id={`${slug}-transcript`} hidden={!showTranscript} className={styles.transcript} aria-label={`Transcript: ${title}`}>
        <ol>
          {cues.map((c, i) => (
            <li key={i}>
              <button type="button" className={`${styles.cue} ${i === active ? styles.cueOn : ""}`} onClick={() => void seek(c.start)} aria-current={i === active ? "true" : undefined}>
                <span className={styles.cueTime}>{fmt(c.start)}</span>
                <span>{c.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </figure>
  );
}
