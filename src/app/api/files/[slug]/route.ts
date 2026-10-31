import { NextResponse, type NextRequest } from "next/server";
import { gateContent } from "@/lib/guard";
import { json } from "@/lib/http";
import { signedFileUrl } from "@/lib/storage";

// PDF download: access is checked on the server, then the browser is redirected to a short-lived signed link.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[slug]">) {
  const { slug } = await ctx.params;
  const gate = await gateContent(slug);
  if (!gate.ok) return json({ error: gate.reason }, gate.status);
  if (!gate.content.fileKey) return json({ error: "not_a_file" }, 404);
  const url = await signedFileUrl(gate.content.fileKey, gate.content.fileName ?? `${slug}.pdf`);
  if (req.nextUrl.searchParams.get("format") === "json") return json({ url });
  return NextResponse.redirect(new URL(url, req.nextUrl.origin), { status: 302, headers: { "Cache-Control": "no-store" } });
}
