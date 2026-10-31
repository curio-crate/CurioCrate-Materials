import "server-only";
import { createHash } from "node:crypto";
import { randomToken, signToken, verifyToken } from "../crypto";
import type { ProviderId } from "./providers";

export const OAUTH_COOKIE = "cc_oauth";

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function newOAuthState(provider: ProviderId, next: string) {
  const state = randomToken(16);
  const verifier = randomToken(32);
  const cookie = await signToken({ p: provider, s: state, v: verifier, n: safeNext(next) }, 600, "oauth-state");
  return { state, verifier, challenge: pkceChallenge(verifier), cookie };
}

export async function readOAuthState(cookie: string | undefined) {
  return verifyToken<{ p: string; s: string; v: string; n: string }>(cookie, "oauth-state");
}
