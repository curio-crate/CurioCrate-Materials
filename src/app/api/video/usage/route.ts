import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/http";
import { recordWatch } from "@/lib/video";

// Player heartbeat for per-school streaming usage. The playback id was issued after an access check.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const body = (await req.json().catch(() => ({}))) as { playbackId?: string; seconds?: number; rendition?: string };
  if (!body.playbackId || !/^[0-9a-f-]{36}$/.test(body.playbackId)) return json({ error: "bad_request" }, 400);
  await recordWatch(body.playbackId, Number(body.seconds ?? 0), body.rendition);
  return json({ ok: true });
}
