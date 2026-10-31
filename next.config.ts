import type { NextConfig } from "next";
import { ALLOWED_DOMAINS, type AllowedDomain } from "./src/lib/domains";

// A non-R2 bucket (AWS S3, Backblaze, ...) is allowed too, from its S3_ENDPOINT (set at build time on Vercel).
const bucketOrigin = (() => {
  try {
    const ep = process.env.S3_ENDPOINT?.trim();
    if (ep) return new URL(ep).origin;
    const bucket = process.env.S3_BUCKET?.trim();
    return bucket ? `https://${bucket}.s3.${process.env.S3_REGION?.trim() || "us-east-1"}.amazonaws.com` : "";
  } catch {
    return "";
  }
})();

const origins = (purpose: AllowedDomain["csp"][number]) =>
  [...ALLOWED_DOMAINS.filter((d) => d.csp.includes(purpose)).map((d) => `https://${d.domain}`), ...(bucketOrigin && ["connect", "img", "media"].includes(purpose) ? [bucketOrigin] : [])].join(" ");

// Content-Security-Policy is built from the same domain list shown to school IT at /schools/it,
// so the allow-list districts get always matches what the site actually loads.
// Dev server only: React needs eval for debugging and Next's HMR uses a websocket.
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval' " : ""}${origins("script")}`,
  `style-src 'self' 'unsafe-inline' ${origins("style")}`,
  `font-src 'self' ${origins("font")}`,
  `img-src 'self' data: blob: ${origins("img")}`,
  `media-src 'self' blob: ${origins("media")}`,
  `connect-src 'self' ${dev ? "ws: " : ""}${origins("connect")}`,
  `frame-src 'self' ${origins("frame")}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'self' https://classroom.google.com",
  "form-action 'self' " + origins("form"),
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "ffmpeg-static"],
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
    "/api/media/**": ["./.media/**/*"],
  },
  async headers() {
    return [
      {
        // Interactive lesson files carry their own sandboxing policy (src/app/api/lesson-pkg).
        source: "/((?!api/lesson-pkg/).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
