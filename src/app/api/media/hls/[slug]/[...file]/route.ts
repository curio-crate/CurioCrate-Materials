import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { MEDIA_DIR } from "@/lib/storage";
import { verifyMediaToken } from "@/lib/video";

// Local video stand-in: serves HLS playlists/segments, the poster and the low-res MP4 for one asset.
// Every request needs the signed token; playlists are rewritten so segment URLs carry it too.
const TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
};

export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/hls/[slug]/[...file]">) {
  const { slug, file } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t");
  if (!(await verifyMediaToken(token, slug))) return new Response("Link expired", { status: 403 });
  const base = path.join(MEDIA_DIR, "videos", slug);
  const full = path.join(base, ...file);
  if (!full.startsWith(base + path.sep)) return new Response("Not found", { status: 404 });
  const ext = path.extname(full);

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(full);
  } catch {
    return new Response("Video not generated in this environment (run npm run media:generate)", { status: 404 });
  }
  if (ext === ".m3u8") {
    const text = bytes
      .toString("utf8")
      .split("\n")
      .map((line) => (line && !line.startsWith("#") ? `${line.trim()}${line.includes("?") ? "&" : "?"}t=${token}` : line.replace(/URI="([^"]+)"/, (_m, u) => `URI="${u}?t=${token}"`)))
      .join("\n");
    return new Response(text, { headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, no-store" } });
  }
  const headers: Record<string, string> = { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=600", "Accept-Ranges": "bytes" };
  if (req.nextUrl.searchParams.get("dl")) headers["Content-Disposition"] = `attachment; filename="${slug}-low.mp4"`;

  // Byte ranges so <video> can seek in the MP4 download.
  const range = req.headers.get("range");
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), bytes.length - 1) : bytes.length - 1;
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
