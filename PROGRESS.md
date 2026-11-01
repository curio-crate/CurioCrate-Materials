# Progress log

## Update (2026-10-31): usability revamp: separate Studio, three roles, one-panel lessons, calmer teacher site

- **Teacher site decluttered** (D-79, D-80): calm home page (no Luminol promo, one "Try our demo"), no "In development",
  "Available", version, "Free"/"Kit owner", "free to try" or "Free demo" labels; catalog shows kits and lists items only
  when searching; dashboard lists unlocked kits first. NGSS alignment shown with one consistent marker on kit cards, the
  kit hero, every lesson row and the lesson header.
- **Studio is its own product** (D-73, D-74): `(site)` route group for teacher pages; Studio has a sidebar workspace with
  no teacher navigation, light/dark mode in CurioCrate blue, smooth transitions, new Home, Kits, Code lookup and My
  account pages, and a Studio-styled sign-in page.
- **Three tiers** (D-75, D-76): Admin / Product Officer / Curriculum, enforced on every Studio page, action and upload
  route; admins add people by email with a role. Migration `0003_studio_roles_materials` (existing accounts → Admin).
- **Create a new lesson** (D-77, D-78): one panel for details, NGSS, the JavaScript activity and supplementary materials
  (+ Teacher training, + Demo, + Manual, + Teacher manual, + File). Teacher-only materials never reach students.

**Checks:** `npm run lint` (0 warnings, theme check passes), `npm run typecheck` (0 errors), `npm test` 63/63 (3 new:
role permissions, people/roles/last-admin rules, lesson materials). `npm run build` passes. `npm run test:e2e`: 59 of 60
passed in the full run; the one failure was Chrome reporting `ERR_NETWORK_IO_SUSPENDED` (machine power state) in the
student-join test, which passes when rerun. New e2e coverage: the lesson panel end to end (activity + teacher training +
teacher manual, then the teacher view), Studio roles (Curriculum and Product Officer page access), and axe on the new
Studio pages (home, lessons panel, kits, lookup, account, library). Axe found and we fixed: blue-on-tint text contrast
(4.35:1 → 5.6:1) and two sidebar links whose accessible names didn't match their text. The e2e run also found a real
bug, now fixed: reopening a lesson right after publishing could show its materials missing.

## Update (2026-10-31): password-only Studio, cloud storage, JS lessons, manuals, code security

- **Studio is password-only** (`/company/login`). Teacher Google accounts no longer open it (`STAFF_EMAILS` removed).
  `src/proxy.ts` guards `/admin/*` and `/api/admin/*`; accounts and sessions are in the database; Studio → **Team** adds
  people, disables them, resets and changes passwords; 8 wrong passwords lock an account for 15 minutes.
- **All data in the cloud on the live site**: production refuses to start without `DATABASE_URL` (Neon) and an S3/R2
  bucket. Studio uploads go from the browser straight to the bucket (or Mux), so file size isn't limited by Vercel.
  Studio → Team shows where each kind of data is stored.
- **Pre-built JavaScript lessons**: upload `.zip` / `.html` / `.js` (several at once in Lessons & videos), served in a
  sandboxed frame behind signed links; add videos and handouts to them; re-upload to replace.
- **Kit manuals**: upload in Files & manuals, listed under "Manuals" on the kit page, downloadable from the library.
- **Access panel** (Studio → Access): look up a teacher, add / revoke / restore / move kits, approve school joins,
  sign out all devices, set who can open each item. **Security** page lists sharing signals.
- **Code sharing**: a kit code is a personal seat for the teacher who redeems it; school joins need the school admin's
  approval; 3 devices per teacher; real sign-in only on deployed sites.
- **Teacher data**: `/account` shows, downloads (JSON) and deletes the teacher's data.

**Checks:** `npm run check` passes (0 lint warnings, 0 type errors, 60/60 unit tests, including 10 new ones in
`tests/studio-security.test.ts`). `npm run build` passes. `npm run test:e2e`: 58 of 59 passed in the full run; the
failure was the phase-1 flow's video playback check (video advanced 0.17 s in 30 s), which passes when run alone and
whose code path was not changed: a timing flake under full-suite load.

## Final summary (2026-10-31)

**Built:** materials.curiocrate.org, a Next.js 16 + TypeScript + PostgreSQL platform styled to match curiocrate.org.

- **Two sides.** The **company Studio** (`/company/login`, initial user `CurioCrateAdmin`) is where the team builds
  kits and lessons, uploads videos and PDFs (auto-processed, live immediately), generates kit codes in bulk
  (QR sheets, CSV), looks up, reissues or voids codes, fixes school access, deletes a school's data, and sees usage
  and the audit log. The **teacher side** covers sign-in (Google, Clever, ClassLink), school onboarding, code
  redemption for the whole school, catalog with NGSS tags, lesson viewer, signed PDFs, signed adaptive video with
  captions/transcript/low-res download, classes, labs, Curie.AI, plans, and a district dashboard. **Students**
  join with a class code and never have an account.
- **Phase 0:** brand extracted from the live site (`design/brand.md`, `design/reference/`, `public/brand/`) into a
  single theme (`src/styles/tokens.css`), enforced by a lint check.
- **Phase 1:** project setup, CI, deployment docs, Google sign-in, organizations/entitlements/access rule, kit code
  redemption, lesson viewer + PDFs, video with signed links + captions + transcripts, free catalog + NGSS,
  support/admin tool, accessibility and Chromebook testing.
- **Phase 2:** three online labs, student class codes, Google/Clever/ClassLink sign-in, VPAT draft
  (`docs/vpat.md`), per-school data deletion.
- **Phase 3:** Curie.AI (off by default, per-class toggle, filters, hints not answers, daily limit, retention,
  teacher review), subscriptions (Stripe), district dashboards, Google Classroom sharing and LMS links.

**Checks:** `npm run lint` (ESLint + theme check), `npm run typecheck`, `npm test` (7 files, 44 unit/integration
tests on real PostgreSQL via PGlite) and `npm run test:e2e` (22 Playwright tests in Google Chrome against a
production build).

### Gate results

| Gate | Check | Result |
| --- | --- | --- |
| 0 | brand.md lists fonts, colors, buttons, logos from the live site | PASS |
| 0 | Logo and favicon in public/brand/ | PASS |
| 0 | Sample page matches reference (computed styles vs live-site values + side-by-side review) | PASS |
| 0 | Sample page passes axe WCAG 2.1 AA | PASS |
| 1 | Lint, type-check, tests | PASS (0 lint warnings, 0 type errors, 44/44 unit) |
| 1 | E2E: sign in → redeem → lesson → PDF download → video plays | PASS (Chrome; PDF verified as %PDF, playback advances, captions track showing) |
| 1 | Teacher without access can't get lesson / PDF / video link (incl. forged and swapped links) | PASS |
| 1 | Code can't be redeemed twice, including simultaneous attempts (unit: 8 at once; e2e: 2 HTTP requests) | PASS |
| 1 | Every page passes axe and works by keyboard alone | PASS (55 page states, 0 axe violations; 3 keyboard-only specs pass) |
| 1 | Every page passes the brand comparison | PASS (live-site computed styles + manual side-by-side review) |
| 1 | Pages work at 1366x768 with 4x CPU slowdown and slow network | PASS (all pages < 15 s, no overflow, video starts) |
| 2 | Phase 1 checks still pass | see rows above |
| 2 | Student joins with a code, uses a lab; DB stores no personal detail (test inspects schema and rows) | PASS (unit + e2e) |
| 2 | Each sign-in method works in its test mode (Google, Clever, ClassLink) | PASS |
| 2 | Labs run at 1366x768, throttled | PASS |
| 2 | VPAT draft in docs/vpat.md from actual results | PASS (`npm run vpat`) |
| 2 | One school's data fully deleted, proven by test | PASS |
| 3 | Curie.AI off by default, toggles per class, teacher reads chats | PASS (unit + e2e) |
| 3 | Off-topic / inappropriate / personal-info / self-harm prompts refused or redirected | PASS |
| 3 | Daily limit stops requests | PASS |
| 3 | Chats deleted after retention time | PASS |
| 3 | Subscription starts on payment, ends with the term and on cancel (Stripe test-mode events) | PASS (unit + e2e) |
| 3 | Every new page passes axe and brand comparison | PASS |

### Decisions
All decisions are in `DECISIONS.md` (D-01 to D-57). The main ones:
- the brand fonts load via the same Google Fonts URL as the site;
- contrast tweaks for AA;
- embedded PGlite as the database stand-in;
- in-house OAuth with test identity providers;
- Mux and S3/R2 with local signed stand-ins;
- phase gating;
- placeholder prices;
- the separate company login;
- Studio content goes live with no deploy;
- the student nickname model;
- Curie.AI on `claude-opus-5-5` behind our own filters.

### Needs a real account key or a human
- **Vercel + Cloudflare:** import the GitHub repo into Vercel, add a Neon Postgres (`DATABASE_URL`), add the
  `materials` CNAME in Cloudflare (`docs/deployment.md`).
- **Secrets:** `SESSION_SECRET`, `CRON_SECRET`, and `ADMIN_USERNAME`/`ADMIN_PASSWORD` to change the company login.
- **Google OAuth client** (required for real teacher sign-in); Clever and ClassLink app registrations.
- **Mux** (signing key + API token) for production video. Uploads on Vercel need Mux, because the serverless disk is temporary.
- **Cloudflare R2/S3 bucket** for PDFs.
- **Stripe:** live keys, webhook secret, and price IDs. **Set real subscription prices** (placeholders in `src/lib/plans.ts`).
- **`ANTHROPIC_API_KEY`** for Curie.AI (a local hint-only tutor runs without it).
- **Real Curiocrate content:** upload real videos and lessons through Studio. The Circuits and Clean Water kits are
  placeholders marked "In development".
- **Manual screen-reader audit** before publishing the VPAT, and a legal review of the privacy page and the DPA language.
- **Verify `scripts/upload-media.mts` and the Studio Mux upload** with real Mux keys (written to Mux's documented API, not run live).

---

## Phase 0: Brand

### Task 0.1: Extract the curiocrate.org design
- **Built:** `scripts/brand/extract.mjs` (real Chromium via Playwright; visits the home page and all 11 pages linked from the main nav), `scripts/brand/hover-probe.mjs` (hover states, dropdown panel, scrolled header), `scripts/brand/page-text.mjs`.
- **Output:** `design/brand.md` (fonts, every color, buttons, cards, spacing, header, footer, logo files, plus values that could not be read), `design/raw/*` (computed styles JSON, site CSS), `public/brand/cclogofull5.png` + `cclogosmall.png`, 46 screenshots in `design/reference/` (each page at 1440 and 1366x768, full page and viewport, plus dropdown and scrolled header).
- **Checked:** values in brand.md cross-checked against `design/raw/computed-styles.json` and the CSS `:root` variables.
- **Open:** `/demo` desktop full-page screenshot timed out (heavy WebGL page); its Chromebook screenshot exists.

### Task 0.2: Theme, header, footer, sample page
- **Built:** `src/styles/tokens.css` (single theme), `src/styles/tokens.ts`, `src/app/globals.css` (primitives using tokens only), `SiteHeader` (fixed, blur on scroll, keyboard dropdowns, mobile menu), `SiteFooter` (same 4-column layout + mono bottom bar), `Starfield`, `KitArt`, and the home page as the sample page. `scripts/check-theme.mjs` enforces "no colors or fonts in components".
- **Checked:**
  - `npm run lint` (eslint, 0 warnings) + theme check: pass. `npm run typecheck`: pass.
  - Side-by-side comparison `design/compare/home.*.side-by-side.png` reviewed: logo placement/size/glow, nav type, outline + solid button pair, footer columns/labels/bottom bar all match the site. Fixed tier-list spacing, tube halo and stars brightness after review.
  - `e2e/phase0-brand.spec.ts`: brand checks against live-site values + axe WCAG 2.1 AA at 1440 and 1366x768: 5/5 pass.

### Phase 0 gate
| Check | Result |
| --- | --- |
| design/brand.md lists fonts, colors, button styles and logo files, all taken from the live site | PASS |
| Logo and favicon files are in public/brand/ | PASS (`cclogofull5.png`, `cclogosmall.png`; the site has no separate favicon file, see brand.md) |
| Sample page screenshot matches the reference in fonts, colors, logo, header and footer | PASS (automated computed-style comparison + manual side-by-side review) |
| Sample page passes the accessibility check | PASS (axe-core, WCAG 2.0/2.1 A+AA tags, 0 violations at both sizes) |
