import type { NextRequest } from "next/server";
import { mimeFor } from "@/lib/files";
import { readLocalFile, verifyLocalFileSignature } from "@/lib/storage";

// Local storage stand-in: serves a file only with a valid, unexpired signature (issued after an access check).
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/file/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  const sp = req.nextUrl.searchParams;
  if (!verifyLocalFileSignature(key, sp.get("exp"), sp.get("sig"))) return new Response("Link expired or invalid", { status: 403 });
  const bytes = await readLocalFile(key);
  if (!bytes) return new Response("Not found", { status: 404 });
  const name = (sp.get("name") ?? key.split("/").pop() ?? "file").replace(/[^\w.-]/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeFor(key),
      "Content-Disposition": `${sp.get("inline") ? "inline" : "attachment"}; filename="${name}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
