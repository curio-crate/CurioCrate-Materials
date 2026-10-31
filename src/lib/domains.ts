// Every domain the platform loads from or sends users to. Shown to school IT at /schools/it,
// written to docs/domains.md, and used to build the Content-Security-Policy in next.config.ts.
// A test (tests/domains.test.ts) fails if code references an https domain that is not listed here.

export type AllowedDomain = {
  domain: string;
  purpose: string;
  required: "always" | "when-enabled";
  csp: ("script" | "style" | "font" | "img" | "media" | "connect" | "frame" | "form")[];
};

export const ALLOWED_DOMAINS: AllowedDomain[] = [
  { domain: "materials.curiocrate.org", purpose: "This platform (pages, lessons, labs, signed file and video links)", required: "always", csp: [] },
  { domain: "curiocrate.org", purpose: "Curiocrate main site (links only)", required: "always", csp: [] },
  { domain: "fonts.googleapis.com", purpose: "Brand font stylesheet (same as curiocrate.org)", required: "always", csp: ["style"] },
  { domain: "fonts.gstatic.com", purpose: "Brand font files", required: "always", csp: ["font"] },
  { domain: "accounts.google.com", purpose: "Teacher sign-in with Google", required: "always", csp: ["form"] },
  { domain: "stream.mux.com", purpose: "Lesson video streaming (signed, short-lived links)", required: "always", csp: ["media", "connect"] },
  { domain: "image.mux.com", purpose: "Video poster images", required: "always", csp: ["img"] },
  { domain: "clever.com", purpose: "Teacher sign-in with Clever", required: "when-enabled", csp: ["form"] },
  { domain: "launchpad.classlink.com", purpose: "Teacher sign-in with ClassLink", required: "when-enabled", csp: ["form"] },
  { domain: "checkout.stripe.com", purpose: "Card payments for kits and subscriptions (staff and purchasers only)", required: "when-enabled", csp: ["form"] },
  { domain: "classroom.google.com", purpose: "Share lessons to Google Classroom", required: "when-enabled", csp: [] },
  { domain: "*.r2.cloudflarestorage.com", purpose: "Files, manuals and videos in Curiocrate's cloud storage (Cloudflare R2, presigned short-lived links)", required: "always", csp: ["connect", "img", "media"] },
  { domain: "storage.googleapis.com", purpose: "Curiocrate staff video uploads to Mux (Studio only, never students)", required: "when-enabled", csp: ["connect"] },
];
