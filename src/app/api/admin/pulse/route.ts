import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { json } from "@/lib/http";
import { unreadByChannel } from "@/lib/team/chat";
import { unreadNotificationCount, unreadSince } from "@/lib/team/notify";
import { myOpenTaskCount } from "@/lib/team/tasks";

// Polled by every Studio page: the sidebar badges (Inbox, Chat, To-dos) and any notification that just arrived.
export async function GET(req: NextRequest) {
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  const since = new Date(req.nextUrl.searchParams.get("since") ?? "");
  const [inbox, chat, tasks, fresh] = await Promise.all([
    unreadNotificationCount(actor.adminId),
    unreadByChannel(actor.adminId),
    myOpenTaskCount(actor.adminId),
    Number.isNaN(since.getTime()) ? [] : unreadSince(actor.adminId, since),
  ]);
  return json({ now: new Date().toISOString(), inbox, chat, tasks, fresh: fresh.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link })) });
}
