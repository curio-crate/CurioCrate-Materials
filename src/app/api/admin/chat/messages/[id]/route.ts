import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { json, sameOrigin } from "@/lib/http";
import { deleteMessage } from "@/lib/team/chat";

// Deletes a chat message (its sender, or an admin). It goes to Recently deleted, where admins can restore it.
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/chat/messages/[id]">) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  const r = await deleteMessage(actor, (await ctx.params).id);
  return r.ok ? json(r) : json({ error: r.error }, 403);
}
