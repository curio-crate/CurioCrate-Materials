import type { NextRequest } from "next/server";
import { getContent } from "@/lib/content";
import { toVtt, verifyMediaToken } from "@/lib/video";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/video/[slug]/captions.vtt">) {
  const { slug } = await ctx.params;
  if (!(await verifyMediaToken(req.nextUrl.searchParams.get("t"), slug))) return new Response("Link expired", { status: 403 });
  const c = await getContent(slug);
  if (!c?.captions) return new Response("Not found", { status: 404 });
  return new Response(toVtt(c.captions), { headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, max-age=300" } });
}
