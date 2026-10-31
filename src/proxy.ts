import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

// First line of defense for Studio: every /admin page and /api/admin route needs a validly signed Studio cookie.
// This is the fast check (signature + expiry, no database). The full check (live session row, active account)
// runs again in requireAdmin() inside every Studio page, server action and route handler.

const ADMIN_COOKIE = "cc_admin";

function secret() {
  const s = process.env.SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.VERCEL_ENV) return null; // deployed without a secret: refuse everything
  return "dev-only-session-secret-change-me-0123456789abcdef";
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const key = secret();
  let ok = false;
  if (token && key) {
    try {
      await jwtVerify(token, new TextEncoder().encode(key), { audience: "company-admin", algorithms: ["HS256"] });
      ok = true;
    } catch {}
  }
  if (ok) return NextResponse.next({ headers: { "Cache-Control": "no-store" } });
  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Studio sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const res = NextResponse.redirect(new URL("/company/login", req.url), 303);
  if (token) res.cookies.delete(ADMIN_COOKIE);
  return res;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
