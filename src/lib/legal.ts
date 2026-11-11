// Facts the Terms of Use and Privacy Policy depend on, kept in one place so the pages can't contradict each other
// or the code. Change these only together with /terms and /privacy, and have counsel review before launch.

/** The legal entity that runs CurioCrate Materials. Not a 501(c)(3): don't describe it as one. */
export const LEGAL_NAME = "Curiocrate";
export const CONTACT_EMAIL = "contact@curiocrate.org";

/**
 * TODO before launch: the state Curiocrate is organized in. It sets governing law and the courts for disputes in
 * the Terms. While null, the Terms fall back to "the state where Curiocrate is organized", which is weaker.
 */
export const GOVERNING_STATE: string | null = null;

/** TODO before launch: a postal address. COPPA requires one in the privacy notice for children's data. */
export const MAILING_ADDRESS: string | null = null;

/** Date the current Privacy Policy took effect (YYYY-MM-DD). */
export const PRIVACY_VERSION = "2026-11-11";

/** Full refund window for any subscription charge, including a renewal. */
export const REFUND_DAYS = 30;

/** Curie.AI chat retention, mirroring CURIE_RETENTION_DAYS (src/lib/curie.ts). */
export const CURIE_RETENTION_DAYS = Number(process.env.CURIE_RETENTION_DAYS ?? 30);

/** How long after a school's or district's contract ends (or it asks) before all its data is deleted. */
export const CONTRACT_END_DELETE_DAYS = 60;

/** Service providers that process personal data for us. Keep in step with docs/deployment.md and .env.example. */
export const SERVICE_PROVIDERS: { name: string; purpose: string; data: string }[] = [
  { name: "Vercel", purpose: "Hosts the website", data: "Requests to the site, including IP address and browser type, in short-lived logs" },
  { name: "Neon", purpose: "Database", data: "Everything listed above that we store" },
  { name: "Cloudflare", purpose: "Domain name service and file storage (R2)", data: "Requests for files; lesson files and Studio uploads (no student data)" },
  { name: "Mux", purpose: "Video streaming, when enabled", data: "Video requests, including IP address" },
  { name: "Anthropic", purpose: "Curie.AI, when a teacher turns it on", data: "Student chat messages that passed our filters, and lesson text. Anthropic's commercial terms bar training models on this data" },
  { name: "Stripe", purpose: "Card payments", data: "Billing name, email and card details. We never see or store full card numbers" },
  { name: "Google, Clever, ClassLink", purpose: "Teacher sign-in, whichever the teacher picks", data: "Confirms the teacher's name and email to us" },
];

export const prettyDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
