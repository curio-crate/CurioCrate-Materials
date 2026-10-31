import "server-only";

// Every outside service reads its keys from the environment. When a key is missing the app uses the
// service's test mode or a local stand-in so it still runs (listed in .env.example and /schools/it).

const v = (name: string) => {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
};

/**
 * The live site must keep every byte in the cloud: a production deployment (or REQUIRE_CLOUD=1) refuses to fall
 * back to the embedded database or the server's disk, which on Vercel are wiped on every deploy.
 */
export function cloudRequired() {
  return v("VERCEL_ENV") === "production" || v("REQUIRE_CLOUD") === "1";
}

export const env = {
  appUrl: () => v("APP_URL") ?? "http://localhost:3000",
  isProduction: () => process.env.NODE_ENV === "production" && v("VERCEL_ENV") === "production",
  sessionSecret: () => {
    const s = v("SESSION_SECRET");
    if (s) return s;
    if (v("VERCEL_ENV") === "production") throw new Error("SESSION_SECRET must be set in production");
    return "dev-only-session-secret-change-me-0123456789abcdef";
  },
  cronSecret: () => v("CRON_SECRET"),

  // Sign-in
  google: () => (v("GOOGLE_CLIENT_ID") && v("GOOGLE_CLIENT_SECRET") ? { clientId: v("GOOGLE_CLIENT_ID")!, clientSecret: v("GOOGLE_CLIENT_SECRET")! } : null),

  // Video
  mux: () =>
    v("MUX_SIGNING_KEY_ID") && v("MUX_SIGNING_PRIVATE_KEY")
      ? { signingKeyId: v("MUX_SIGNING_KEY_ID")!, signingPrivateKey: v("MUX_SIGNING_PRIVATE_KEY")!, tokenId: v("MUX_TOKEN_ID"), tokenSecret: v("MUX_TOKEN_SECRET") }
      : null,
  videoTokenTtlSec: () => Number(v("VIDEO_TOKEN_TTL_SEC") ?? 600),

  // Files
  s3: () =>
    v("S3_BUCKET") && v("S3_ACCESS_KEY_ID") && v("S3_SECRET_ACCESS_KEY")
      ? { bucket: v("S3_BUCKET")!, region: v("S3_REGION") ?? "auto", endpoint: v("S3_ENDPOINT"), accessKeyId: v("S3_ACCESS_KEY_ID")!, secretAccessKey: v("S3_SECRET_ACCESS_KEY")! }
      : null,
  fileUrlTtlSec: () => Number(v("FILE_URL_TTL_SEC") ?? 300),

  // Payments
  stripe: () => (v("STRIPE_SECRET_KEY") ? { secretKey: v("STRIPE_SECRET_KEY")!, webhookSecret: v("STRIPE_WEBHOOK_SECRET") } : null),
};

export type ServiceMode = { service: string; mode: "live" | "test" | "local"; detail: string };

export function serviceModes(): ServiceMode[] {
  return [
    { service: "Database (accounts, lessons, codes, access)", mode: v("DATABASE_URL") ? "live" : "local", detail: v("DATABASE_URL") ? "Cloud PostgreSQL (DATABASE_URL, e.g. Neon)" : "Embedded PostgreSQL on this computer (PGlite)" },
    { service: "Teacher Google sign-in", mode: env.google() ? "live" : "test", detail: env.google() ? "Real Google accounts (OAuth 2.0 + PKCE)" : "Not configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET" },
    { service: "Video streaming", mode: env.mux() || env.s3() ? "live" : "local", detail: env.mux() ? "Mux adaptive streaming, signed playback" : env.s3() ? "MP4 from the cloud bucket, signed links (add Mux for adaptive streaming)" : "Local HLS with signed URLs" },
    { service: "File storage (handouts, manuals, JS lessons, videos)", mode: env.s3() ? "live" : "local", detail: env.s3() ? `Cloud bucket ${v("S3_BUCKET")} (direct browser uploads, presigned links)` : "This computer's disk (.media/)" },
    { service: "Payments", mode: env.stripe()?.secretKey.startsWith("sk_live") ? "live" : "test", detail: env.stripe() ? "Stripe" : "Local checkout stand-in (Stripe test-mode events)" },
  ];
}
