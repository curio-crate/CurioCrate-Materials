import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, adminLogin } from "@/lib/auth/admin";
import { redirectTo, sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const form = await req.formData();
  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const r = await adminLogin(String(form.get("username") ?? "").trim(), String(form.get("password") ?? ""), client);
  if (!r.ok) return redirectTo(`/company/login?error=${encodeURIComponent(r.error)}`);
  const res = redirectTo("/admin");
  res.cookies.set(ADMIN_COOKIE, r.token, adminCookieOptions());
  return res;
}
