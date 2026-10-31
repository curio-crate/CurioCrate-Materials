import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

// Local video pipeline for studio uploads (used when Mux keys are not set): 720p + 360p HLS, low-res MP4
// download and a poster frame, same layout as scripts/generate-media.mts.
async function ffmpegBin() {
  const mod = (await import("ffmpeg-static")) as unknown as { default: string };
  return mod.default;
}

function run(bin: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(bin, ["-hide_banner", "-y", ...args]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve(err) : reject(new Error(err.slice(-600)))));
  });
}

export async function probeSeconds(src: string) {
  const bin = await ffmpegBin();
  const out = await run(bin, ["-i", src, "-f", "null", "-t", "0.1", "-"]).catch((e: Error) => e.message);
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out);
  return m ? Math.round(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) : null;
}

export async function transcodeToHls(src: string, outDir: string) {
  const bin = await ffmpegBin();
  await fs.rm(outDir, { recursive: true, force: true });
  const rend = [
    { name: "v0", h: 720, vb: "1400k", ab: "96k", bw: 1600000, res: "1280x720" },
    { name: "v1", h: 360, vb: "320k", ab: "64k", bw: 420000, res: "640x360" },
  ];
  for (const r of rend) {
    await fs.mkdir(path.join(outDir, r.name), { recursive: true });
    await run(bin, ["-i", src, "-vf", `scale=-2:${r.h}`, "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-b:v", r.vb, "-maxrate", r.vb, "-bufsize", r.vb, "-g", "60", "-sc_threshold", "0", "-c:a", "aac", "-b:a", r.ab, "-ac", "2", "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_segment_filename", path.join(outDir, r.name, "seg%03d.ts"), path.join(outDir, r.name, "index.m3u8")]);
  }
  await fs.writeFile(path.join(outDir, "master.m3u8"), ["#EXTM3U", "#EXT-X-VERSION:3", ...rend.flatMap((r) => [`#EXT-X-STREAM-INF:BANDWIDTH=${r.bw},RESOLUTION=${r.res},CODECS="avc1.4d401f,mp4a.40.2"`, `${r.name}/index.m3u8`])].join("\n") + "\n");
  await run(bin, ["-i", src, "-vf", "scale=-2:360", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "300k", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", path.join(outDir, "low.mp4")]);
  await run(bin, ["-i", src, "-ss", "1", "-frames:v", "1", "-q:v", "4", path.join(outDir, "poster.jpg")]);
}
