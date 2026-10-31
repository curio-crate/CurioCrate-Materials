import type { NextRequest } from "next/server";
import { gateContent } from "@/lib/guard";
import { json } from "@/lib/http";
import { createPlayback } from "@/lib/video";

// Issues short-lived signed playback links only after the server-side access check passes.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/video/[slug]/playback">) {
  const { slug } = await ctx.params;
  const gate = await gateContent(slug);
  if (!gate.ok) return json({ error: gate.reason }, gate.status);
  if (gate.content.type !== "video") return json({ error: "not_a_video" }, 404);
  return json(await createPlayback(gate.content, gate.who));
}
