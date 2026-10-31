import type { NextRequest } from "next/server";
import { OAUTH_COOKIE, pkceChallenge, readOAuthState } from "@/lib/auth/flow";
import { exchangeCode, isProviderId } from "@/lib/auth/providers";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { isStaffTeacher } from "@/lib/auth/viewer";
import { redirectTo } from "@/lib/http";
import { upsertTeacherFromProfile } from "@/lib/teachers";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const fail = (reason: string) => redirectTo(`/signin?error=${encodeURIComponent(reason)}`, 307);
  if (!isProviderId(provider)) return fail("provider");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("cancelled");
  const st = await readOAuthState(req.cookies.get(OAUTH_COOKIE)?.value);
  if (!st || st.p !== provider || st.s !== params.get("state")) return fail("state");

  try {
    const profile = await exchangeCode(provider, params.get("code") ?? "", st.v, pkceChallenge(st.v));
    const teacher = await upsertTeacherFromProfile(provider, profile);
    const token = await createSession(teacher.id, { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: req.headers.get("user-agent") });
    const dest = teacher.orgId || isStaffTeacher(teacher) ? st.n : `/onboarding?next=${encodeURIComponent(st.n)}`;
    const res = redirectTo(dest, 307);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  } catch (e) {
    console.error(`sign-in via ${provider} failed`, e);
    return fail("exchange");
  }
}
