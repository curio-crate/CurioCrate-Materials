import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/** State-changing API routes only accept same-origin requests (defense in depth on top of SameSite cookies). */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Redirect within the site. A path ("/admin/content") is sent as a relative Location, so the browser stays on
 * the host and port it used; building it from APP_URL broke sign-in whenever APP_URL differed from that host
 * (another port locally, a preview deployment), because CSP form-action blocks the cross-origin hop.
 * Absolute URLs (real OAuth providers, Stripe) pass through unchanged.
 */
export function redirectTo(to: string, status: 302 | 303 | 307 = 303) {
  return new NextResponse(null, { status, headers: { Location: to, "Cache-Control": "no-store" } });
}

export const json =(body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
