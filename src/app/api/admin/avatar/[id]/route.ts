import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { readAvatar } from "@/lib/team/people";

// A teammate's profile picture (Studio accounts only). The URL carries a version, so it can be cached.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/avatar/[id]">) {
  if (!(await studioMember())) return new Response("Studio sign-in required.", { status: 401 });
  const pic = await readAvatar((await ctx.params).id);
  if (!pic) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(pic.bytes), { headers: { "Content-Type": pic.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
