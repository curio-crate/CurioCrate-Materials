import "server-only";
import { signToken, verifyToken } from "../crypto";
import { env } from "../env";
import { features } from "../features";

// Sign-in providers. Each uses the OAuth 2.0 authorization-code flow with PKCE. When a provider's keys
// are not set it runs in TEST MODE: the authorize step is our local test identity provider
// (/auth/test-idp) and the code exchange verifies a signed code in-process. The callback, account
// linking and session code paths are identical in both modes.

export type ProviderId = "google" | "clever" | "classlink";
export type Profile = { sub: string; email: string; name: string; emailVerified: boolean; hostedDomain?: string };

type LiveConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce: boolean;
  fetchProfile: (accessToken: string, tokens: Record<string, unknown>) => Promise<Profile>;
  tokenAuth?: string; // HTTP Basic client auth (Clever)
};

export const PROVIDERS: Record<ProviderId, { label: string; phase: 1 | 2 }> = {
  google: { label: "Google", phase: 1 },
  clever: { label: "Clever", phase: 2 },
  classlink: { label: "ClassLink", phase: 2 },
};

export function isProviderId(p: string): p is ProviderId {
  return p in PROVIDERS;
}

/** Providers shown on the sign-in page: on a deployed site, only those with real keys. */
export function enabledProviders(): ProviderId[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).filter((p) => PROVIDERS[p].phase <= currentPhaseProviders() && (testIdpAllowed() || liveConfig(p) !== null));
}

// Clever and ClassLink ship with Phase 2.
function currentPhaseProviders() {
  return features.sso ? 2 : 1;
}

const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;

export function liveConfig(p: ProviderId): LiveConfig | null {
  if (p === "google") {
    const g = env.google();
    if (!g) return null;
    return {
      ...g,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      pkce: true,
      fetchProfile: async (accessToken) => {
        const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!r.ok) throw new Error(`google userinfo ${r.status}`);
        const u = (await r.json()) as { sub: string; email: string; name?: string; email_verified?: boolean; hd?: string };
        return { sub: u.sub, email: u.email, name: u.name ?? u.email, emailVerified: !!u.email_verified, hostedDomain: u.hd };
      },
    };
  }
  if (p === "clever" && process.env.CLEVER_CLIENT_ID && process.env.CLEVER_CLIENT_SECRET) {
    const id = process.env.CLEVER_CLIENT_ID;
    const secret = process.env.CLEVER_CLIENT_SECRET;
    return {
      clientId: id,
      clientSecret: secret,
      authorizeUrl: "https://clever.com/oauth/authorize",
      tokenUrl: "https://clever.com/oauth/tokens",
      scope: "",
      pkce: false,
      fetchProfile: async (token) => {
        const me = (await (await fetch("https://api.clever.com/v3.0/me", { headers: { Authorization: `Bearer ${token}` } })).json()) as { data: { id: string; type: string } };
        if (me.data.type !== "teacher" && me.data.type !== "staff" && me.data.type !== "district_admin") throw new Error("Only teachers and staff can sign in");
        const u = (await (await fetch(`https://api.clever.com/v3.0/users/${me.data.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { data: { email?: string; name?: { first?: string; last?: string } } };
        return { sub: me.data.id, email: u.data.email ?? "", name: [u.data.name?.first, u.data.name?.last].filter(Boolean).join(" "), emailVerified: !!u.data.email };
      },
      tokenAuth: basic(id, secret),
    } as LiveConfig;
  }
  if (p === "classlink" && process.env.CLASSLINK_CLIENT_ID && process.env.CLASSLINK_CLIENT_SECRET) {
    return {
      clientId: process.env.CLASSLINK_CLIENT_ID,
      clientSecret: process.env.CLASSLINK_CLIENT_SECRET,
      authorizeUrl: "https://launchpad.classlink.com/oauth2/v2/auth",
      tokenUrl: "https://launchpad.classlink.com/oauth2/v2/token",
      scope: "profile oneroster",
      pkce: false,
      fetchProfile: async (token) => {
        const u = (await (await fetch("https://nodeapi.classlink.com/v2/my/info", { headers: { Authorization: `Bearer ${token}` } })).json()) as { UserId: number; Email: string; DisplayName: string; Role: string };
        if (/student/i.test(u.Role)) throw new Error("Only teachers and staff can sign in");
        return { sub: String(u.UserId), email: u.Email, name: u.DisplayName, emailVerified: !!u.Email };
      },
    };
  }
  return null;
}

export function isTestMode(p: ProviderId) {
  return liveConfig(p) === null;
}

/**
 * The local test identity provider (type any email) only runs on a developer's computer and in the automated
 * tests. Any deployed site (production or preview) only offers real Google / Clever / ClassLink sign-in.
 */
export function testIdpAllowed() {
  return !process.env.VERCEL_ENV;
}

/** Real providers need the absolute callback registered with them (APP_URL). The local test provider is part of
 *  this site, so its callback is a path: sign-in then works on whatever host/port the site is opened on. */
export function redirectUri(p: ProviderId) {
  return `${isTestMode(p) ? "" : env.appUrl()}/api/auth/${p}/callback`;
}

export async function authorizeUrl(p: ProviderId, state: string, codeChallenge: string) {
  const live = liveConfig(p);
  if (!live) {
    const qs = new URLSearchParams({ provider: p, state, redirect_uri: redirectUri(p), code_challenge: codeChallenge });
    return `/auth/test-idp?${qs}`;
  }
  const u = new URL(live.authorizeUrl);
  u.searchParams.set("client_id", live.clientId);
  u.searchParams.set("redirect_uri", redirectUri(p));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", live.scope);
  u.searchParams.set("state", state);
  if (live.pkce) {
    u.searchParams.set("code_challenge", codeChallenge);
    u.searchParams.set("code_challenge_method", "S256");
  }
  if (p === "google") u.searchParams.set("prompt", "select_account");
  return u.toString();
}

/** Test IdP: issue a one-time code bound to the provider, redirect URI and PKCE challenge. */
export async function issueTestCode(input: { provider: ProviderId; email: string; name: string; redirectUri: string; codeChallenge: string }) {
  const email = input.email.trim().toLowerCase();
  return signToken(
    { provider: input.provider, email, name: input.name.trim() || email, ru: input.redirectUri, cc: input.codeChallenge, sub: `test-${email}` },
    120,
    "test-idp-code",
  );
}

export async function exchangeCode(p: ProviderId, code: string, codeVerifier: string, codeChallenge: string): Promise<Profile> {
  const live = liveConfig(p);
  if (!live) {
    if (!testIdpAllowed()) throw new Error("test identity provider disabled in production");
    const claims = await verifyToken<{ provider: string; email: string; name: string; ru: string; cc: string; sub: string }>(code, "test-idp-code");
    if (!claims || claims.provider !== p || claims.ru !== redirectUri(p) || claims.cc !== codeChallenge) throw new Error("invalid test code");
    return { sub: claims.sub, email: claims.email, name: claims.name, emailVerified: true };
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(p),
    client_id: live.clientId,
    client_secret: live.clientSecret,
    ...(live.pkce ? { code_verifier: codeVerifier } : {}),
  });
  const r = await fetch(live.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(live.tokenAuth ? { Authorization: live.tokenAuth } : {}) }, body });
  if (!r.ok) throw new Error(`${p} token exchange failed: ${r.status}`);
  const tokens = (await r.json()) as { access_token: string } & Record<string, unknown>;
  return live.fetchProfile(tokens.access_token, tokens);
}
