import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/viewer";
import { json } from "@/lib/http";
import { putObject, verifyLocalUpload } from "@/lib/storage";

export const maxDuration = 300;

// Development stand-in for a presigned bucket PUT: only works without cloud storage, for a signed, unexpired key.
export async function PUT(req: NextRequest) {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const key = sp.get("key");
  if (!verifyLocalUpload(key, sp.get("exp"), sp.get("sig"))) return json({ error: "Upload link expired. Try again." }, 403);
  await putObject(key!, Buffer.from(await req.arrayBuffer()), req.headers.get("content-type") ?? "application/octet-stream");
  return new Response(null, { status: 200 });
}
