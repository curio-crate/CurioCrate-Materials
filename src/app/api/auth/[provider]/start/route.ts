import { NextResponse, type NextRequest } from "next/server";
import { newOAuthState, OAUTH_COOKIE } from "@/lib/auth/flow";
import { authorizeUrl, enabledProviders, isProviderId, isTestMode, testIdpAllowed } from "@/lib/auth/providers";
import { redirectTo } from "@/lib/http";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/start">) {
  const { provider } = await ctx.params;
  if (!isProviderId(provider) || !enabledProviders().includes(provider)) return new NextResponse("Unknown sign-in provider", { status: 404 });
  if (isTestMode(provider) && !testIdpAllowed()) return new NextResponse(`${provider} sign-in is not configured`, { status: 503 });

  const { state, challenge, cookie } = await newOAuthState(provider, req.nextUrl.searchParams.get("next") ?? "/dashboard");
  const res = redirectTo(await authorizeUrl(provider, state, challenge), 307);
  res.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.E2E,
    path: "/",
    maxAge: 600,
  });
  return res;
}
