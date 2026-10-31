// Generates local stand-in media into .media/ (gitignored):
//   - every PDF handout/guide (pdf-lib)
//   - every video: branded slides (one per caption cue) + narration (Windows speech synthesis when
//     available, else silence), encoded as 2-rendition HLS (720p + 360p), a low-res MP4 download and a poster.
// Slide durations come from cueSeconds(), the same function that writes the captions, so video, VTT and
// transcript always agree.
// Usage: npm run media:generate [-- --if-missing] [-- --only=<slug>]
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { KITS } from "../src/content/kits";
import { CONTENT, cueSeconds, type ContentSeed } from "../src/content/lessons";
import { renderPdf } from "../src/lib/pdf";
import { THEME } from "../src/styles/tokens";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, ".media");
const ifMissing = process.argv.includes("--if-missing");
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];

function ff(args: string[], label: string) {
  const r = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
}

async function pdfs() {
  let n = 0;
  for (const c of CONTENT.filter((x) => x.pdf && (!only || x.slug === only))) {
    const file = path.join(OUT, "files", `${c.slug}.pdf`);
    if (ifMissing && existsSync(file)) continue;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, await renderPdf(c.pdf!, { title: c.title, slug: c.slug }));
    n++;
  }
  console.log(`media: ${n} PDF(s) written`);
}

// ---------- narration ----------
function tts(text: string, wav: string) {
  if (process.platform !== "win32") return false;
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { input: text, encoding: "utf8" });
  return r.status === 0 && existsSync(wav);
}

function wavSeconds(wav: string) {
  const r = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-i", wav], { encoding: "utf8" });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr ?? "");
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

// ---------- slides ----------
type Browser = Awaited<ReturnType<typeof import("@playwright/test").chromium.launch>>;
async function maybeBrowser(): Promise<Browser | null> {
  try {
    const { chromium } = await import("@playwright/test");
    return await chromium.launch();
  } catch {
    console.warn("media: Playwright Chromium not available; videos use plain gradient frames");
    return null;
  }
}

function slideHtml(c: ContentSeed, text: string, i: number, total: number, logoData: string) {
  const kit = KITS.find((k) => k.slug === c.kit);
  const accent = kit?.accent === "lum" ? THEME.lumGlow : kit?.accent === "gold" ? THEME.gold : THEME.pastel1;
  const stars = Array.from({ length: 70 }, (_, k) => {
    const x = (k * 197) % 1280;
    const y = (k * 113 + i * 7) % 720;
    return `<i style="left:${x}px;top:${y}px;opacity:${0.2 + ((k * 37) % 60) / 100}"></i>`;
  }).join("");
  return `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=JetBrains+Mono&display=block">
  <style>
    html{background:${THEME.void}}
    body{margin:0;width:1280px;height:720px;background:radial-gradient(70% 60% at 70% 30%, ${THEME.navy}88, ${THEME.void}00 70%), ${THEME.void};color:${THEME.cream};overflow:hidden;position:relative;font-family:'Cormorant Garamond',serif}
    i{position:absolute;width:2px;height:2px;border-radius:50%;background:${THEME.cream}}
    .eyebrow{position:absolute;left:96px;top:80px;font:14px 'JetBrains Mono',monospace;letter-spacing:6px;text-transform:uppercase;color:${THEME.pastel1}}
    .text{position:absolute;left:96px;right:120px;top:50%;transform:translateY(-50%);font-size:${text.length > 70 ? 60 : 72}px;line-height:1.12;letter-spacing:-0.02em;font-weight:400}
    .text em{color:${accent};font-style:italic;font-weight:300}
    .bar{position:absolute;left:96px;right:96px;bottom:84px;display:flex;gap:10px}
    .bar b{flex:1;height:3px;border-radius:2px;background:${THEME.pastel1}33}
    .bar b.on{background:${accent};box-shadow:0 0 12px ${accent}}
    img{position:absolute;right:88px;top:62px;height:46px;filter:drop-shadow(0 0 10px ${THEME.pastel1}80)}
  </style></head><body>${stars}
  <div class="eyebrow">${kit ? kit.shortName + " · " : ""}${c.title}</div><img src="${logoData}">
  <div class="text">${i === 0 ? `<em>${text}</em>` : text}</div>
  <div class="bar">${Array.from({ length: total }, (_, k) => `<b class="${k <= i ? "on" : ""}"></b>`).join("")}</div>
  </body></html>`;
}

async function video(c: ContentSeed, browser: Browser | null, logoData: string, hasTts: { value: boolean }) {
  const dir = path.join(OUT, "videos", c.slug);
  if (ifMissing && existsSync(path.join(dir, "master.m3u8"))) return false;
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cc-${c.slug}-`));
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.join(dir, "v0"), { recursive: true });
  await fs.mkdir(path.join(dir, "v1"), { recursive: true });

  const lines = c.narration!;
  const page = browser ? await browser.newPage({ viewport: { width: 1280, height: 720 } }) : null;
  const clips: string[] = [];
  for (const [i, text] of lines.entries()) {
    const dur = cueSeconds(text);
    const png = path.join(work, `s${i}.png`);
    const wav = path.join(work, `a${i}.wav`);
    if (page) {
      await page.setContent(slideHtml(c, text, i, lines.length, logoData), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: png });
    }
    const spoke = hasTts.value && tts(text, wav);
    if (!spoke) hasTts.value = false;
    const clip = path.join(work, `c${i}.mp4`);
    const videoIn = page ? ["-loop", "1", "-t", String(dur), "-i", png] : ["-f", "lavfi", "-t", String(dur), "-i", `color=c=${THEME.void.replace("#", "0x")}:s=1280x720:r=30`];
    let audioIn = ["-f", "lavfi", "-t", String(dur), "-i", "anullsrc=r=44100:cl=mono"];
    let afilter = "anull";
    if (spoke) {
      const len = wavSeconds(wav);
      const tempo = len > dur - 0.2 ? Math.min(2, len / (dur - 0.2)) : 1;
      audioIn = ["-i", wav];
      afilter = `${tempo > 1 ? `atempo=${tempo.toFixed(3)},` : ""}adelay=150|150,apad,atrim=0:${dur},aformat=sample_rates=44100:channel_layouts=mono`;
    }
    ff(
      [...videoIn, ...audioIn, "-filter_complex", `[0:v]scale=1280:720,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=${(dur - 0.25).toFixed(2)}:d=0.25,fps=30[v];[1:a]${afilter}[a]`, "-map", "[v]", "-map", "[a]", "-t", String(dur), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "96k", clip],
      `clip ${c.slug} #${i}`,
    );
    clips.push(clip);
  }
  await page?.close();

  const list = path.join(work, "list.txt");
  await fs.writeFile(list, clips.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  const full = path.join(work, "full.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", full], `concat ${c.slug}`);

  // Two HLS renditions so weak school Wi-Fi can drop to 360p.
  const renditions = [
    { name: "v0", h: 720, vb: "1400k", ab: "96k", bw: 1600000, res: "1280x720" },
    { name: "v1", h: 360, vb: "320k", ab: "64k", bw: 420000, res: "640x360" },
  ];
  for (const r of renditions) {
    ff(["-i", full, "-vf", `scale=-2:${r.h}`, "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-b:v", r.vb, "-maxrate", r.vb, "-bufsize", r.vb, "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-c:a", "aac", "-b:a", r.ab, "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_segment_filename", path.join(dir, r.name, "seg%03d.ts"), path.join(dir, r.name, "index.m3u8")], `hls ${r.name} ${c.slug}`);
  }
  await fs.writeFile(
    path.join(dir, "master.m3u8"),
    ["#EXTM3U", "#EXT-X-VERSION:3", ...renditions.flatMap((r) => [`#EXT-X-STREAM-INF:BANDWIDTH=${r.bw},RESOLUTION=${r.res},CODECS="avc1.4d401f,mp4a.40.2"`, `${r.name}/index.m3u8`])].join("\n") + "\n",
  );
  ff(["-i", full, "-vf", "scale=-2:360", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "300k", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", path.join(dir, "low.mp4")], `low.mp4 ${c.slug}`);
  ff(["-i", full, "-ss", "0.6", "-frames:v", "1", "-q:v", "4", path.join(dir, "poster.jpg")], `poster ${c.slug}`);
  await fs.copyFile(full, path.join(dir, "source.mp4")); // full-quality master for npm run media:upload (Mux)
  await fs.rm(work, { recursive: true, force: true });
  return true;
}

async function videos() {
  if (!ffmpegPath || !existsSync(ffmpegPath as unknown as string)) {
    console.warn("media: ffmpeg not available; skipping videos");
    return;
  }
  const items = CONTENT.filter((c) => c.narration && (!only || c.slug === only));
  if (ifMissing && items.every((c) => existsSync(path.join(OUT, "videos", c.slug, "master.m3u8")))) {
    console.log("media: all videos present");
    return;
  }
  const browser = await maybeBrowser();
  const logoData = `data:image/png;base64,${(await fs.readFile(path.join(ROOT, "public", "brand", "cclogofull5.png"))).toString("base64")}`;
  const hasTts = { value: true };
  let n = 0;
  for (const c of items) {
    if (await video(c, browser, logoData, hasTts)) {
      n++;
      console.log(`media: video ${c.slug}`);
    }
  }
  await browser?.close();
  console.log(`media: ${n} video(s) written${hasTts.value ? " with narration" : " (silent: no speech synthesizer)"}`);
}

await pdfs();
await videos();
