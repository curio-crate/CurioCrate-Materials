import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { redirectTo } from "@/lib/http";
import { getObjectBytes, signedFileUrl } from "@/lib/storage";
import { chatFile } from "@/lib/team/chat";
import { sniffImage } from "@/lib/team/people";

// A chat attachment, for people who can read its conversation. Images are served inline from here (checked by
// their bytes, so nothing else can render in the page); everything else is a short-lived download link.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/chat/file/[id]">) {
  const actor = await studioMember();
  if (!actor) return new Response("Studio sign-in required.", { status: 401 });
  const m = await chatFile(actor, (await ctx.params).id);
  if (!m?.fileKey) return new Response("Not found", { status: 404 });
  if (m.isImage && !req.nextUrl.searchParams.get("download")) {
    const bytes = await getObjectBytes(m.fileKey);
    const kind = bytes && sniffImage(bytes);
    if (!bytes || !kind) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": kind.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  }
  return redirectTo(await signedFileUrl(m.fileKey, m.fileName ?? "file", { ttlSec: 300 }), 302);
}
