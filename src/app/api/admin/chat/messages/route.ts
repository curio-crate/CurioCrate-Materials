import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { json, sameOrigin } from "@/lib/http";
import { channelMessages, sendMessage } from "@/lib/team/chat";

// Studio chat. GET polls a conversation (everything sent, deleted or restored since `since`); POST sends a message.
export async function GET(req: NextRequest) {
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  const sp = req.nextUrl.searchParams;
  const since = sp.get("since") ? new Date(sp.get("since")!) : null;
  const r = await channelMessages(actor, sp.get("channel") ?? "", since && !Number.isNaN(since.getTime()) ? since : null);
  return r.ok ? json(r) : json({ error: r.error }, 403);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  const b = (await req.json().catch(() => ({}))) as { channel?: string; body?: string; file?: { key?: string; name?: string } | null };
  const r = await sendMessage(actor, { channel: String(b.channel ?? ""), body: String(b.body ?? ""), file: b.file?.key ? { key: String(b.file.key), name: String(b.file.name ?? "") } : null });
  return r.ok ? json(r) : json({ error: r.error }, 400);
}
