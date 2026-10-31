import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { json, sameOrigin } from "@/lib/http";
import { redeemCode } from "@/lib/redeem";

// JSON redemption endpoint (used by the QR flow on low-end devices and by tests).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  const v = await getViewer();
  if (!v) return json({ ok: false, error: "sign_in" }, 401);
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const result = await redeemCode(v.teacher.id, String(body.code ?? ""));
  return json(result, result.ok ? 200 : result.error === "rate_limited" ? 429 : 409);
}
