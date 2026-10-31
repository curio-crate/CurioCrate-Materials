import { NextResponse, type NextRequest } from "next/server";
import { isProviderId, isTestMode, issueTestCode, redirectUri, testIdpAllowed } from "@/lib/auth/providers";
import { redirectTo } from "@/lib/http";

// Local test identity provider: approve step. A plain form POST answered with a 303 redirect to the
// OAuth callback, exactly as a real provider would (a full-page navigation, never a client-side fetch).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const provider = String(form.get("provider") ?? "");
  if (!isProviderId(provider) || !isTestMode(provider) || !testIdpAllowed()) return new NextResponse("Not found", { status: 404 });
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const state = String(form.get("state") ?? "");
  const challenge = String(form.get("code_challenge") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const back = new URLSearchParams({ provider, state, code_challenge: challenge, redirect_uri: redirectUri(provider), error: "email" });
    return redirectTo(`/auth/test-idp?${back}`);
  }
  const code = await issueTestCode({ provider, email, name, redirectUri: redirectUri(provider), codeChallenge: challenge });
  return redirectTo(`${redirectUri(provider)}?${new URLSearchParams({ code, state })}`);
}
