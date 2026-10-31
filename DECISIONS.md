# Decisions

Choices made where the plan did not specify something. Newest at the bottom of each section.

## Design and brand

- **D-01 Fonts loaded by `<link>`, same URL.** curiocrate.org pulls one Google Fonts stylesheet with a CSS `@import`.
  We load the identical URL with `<link rel="stylesheet">` plus `preconnect`. Same files and `display=swap`, but the
  browser fetches them in parallel instead of after the CSS bundle, which matters on slow school Wi-Fi.
- **D-02 Contrast fixes (WCAG 2.1 AA).** The site uses some text colors that fail AA on `#03050f`:
  - Muted text `rgba(197,227,247,.55)` is ~4.9:1 on the page but drops near 4.5:1 on raised glass cards. We use `.62` (`--color-text-muted`).
  - Very muted text `rgba(197,227,247,.40)` (~3.0:1) and the footer copyright `rgba(168,212,240,.25)` (~1.9:1) fail. We use the nearest brand color that passes, pastel2 at `.62` (`--color-text-faint`).
  - Eyebrow labels (`.label`, pastel1 at 70% opacity) are 9-10px text, so we raised them to `.78` (`--color-label`) for margin.
- **D-03 Error color.** The site has no error/red color. Form errors use `#ff9e94` (`--color-danger`), a soft coral that
  passes AA on `--void` and sits next to the brand's warm gold. It is only used for errors.
- **D-04 Tier colors come from the site palette.** Free = pastel1 blue, Kit owner = the kit-page glow teal (`#46e3d3`),
  Subscription = gold (`#f0c070`).
- **D-05 Star field.** The site draws its night sky with a script. We draw it with CSS box-shadows on three 1px
  elements, using a fixed seed (no canvas, no client JS, one paint), so low-end Chromebooks stay smooth. Twinkle is
  disabled under `prefers-reduced-motion`.
- **D-06 Header.** It has the same structure as the site (logo left, mono uppercase links, outline + solid pair on the
  right). The pair is "Teacher sign in / Dashboard" (outline) and "Redeem code" (solid), in the slots where the site
  has "Become a member" and "Donate". A small "Materials" tag next to the logo tells users which site they are on.
  The logo file itself is not changed. There is no EN/ES toggle; the platform is English-only for now.
- **D-07 Brand images served untouched.** Logo `<Image>`s use `unoptimized`, so the original PNGs from
  `public/brand/` are served byte-for-byte instead of being re-encoded.
- **D-08 Theme enforcement.** `scripts/check-theme.mjs` runs inside `npm run lint` and fails on any hex/rgb/hsl color,
  named color or font-family outside `src/styles/tokens.css` / `tokens.ts`.

## Platform and architecture

- **D-20 Next.js 16 App Router, server components first.** Pages render on the server and ship little JavaScript.
  Client components are used only where the page has to react to the user: header menus, video player, forms
  and labs. Filters are plain GET forms, so the catalog works with no client JavaScript at all.
- **D-21 Database: PostgreSQL via Drizzle ORM, with embedded PGlite as the stand-in.** With `DATABASE_URL` set
  (Neon / Vercel Postgres) the app uses `postgres-js`. Without it, it uses PGlite, which is real PostgreSQL compiled
  to WASM: migrations and the seed run automatically, and unit tests get a fresh in-memory database per file. The
  same SQL migrations (`drizzle/`) run in both. A preview deploy without `DATABASE_URL` works but does not persist.
- **D-22 Sign-in: standard OAuth 2.0 + PKCE in our code, with the providers as the managed identity services.**
  Google Identity is the managed sign-in service; Clever and ClassLink join it in Phase 2. We did not add a
  third-party auth broker. That keeps the data flow minimal for student privacy, avoids per-user fees, and lets
  every provider run in test mode. When keys are missing, the authorize step is a local test identity provider
  (`/auth/test-idp`), and everything after it (state/PKCE checks, callback, account linking, sessions) is the
  same code path as live. The test IdP refuses to run when `VERCEL_ENV=production`.
- **D-23 Sessions:** random 256-bit token in an httpOnly, SameSite=Lax cookie. Only its SHA-256 is stored, and
  sessions last 30 days. State-changing JSON routes also check the Origin header.
- **D-24 Joining a school.** Kit access belongs to the school, so a teacher has to be in one: they join with the
  school's 6-letter join code (shown on a colleague's dashboard), auto-join by a verified email domain
  (never for gmail/outlook-style domains), or set up a new school. Support can move teachers between schools.
- **D-25 Redemption exactly-once.** *(Who gets access changed in D-67: the redeeming teacher only.)* A single conditional `UPDATE … WHERE status='active' RETURNING` claims the code
  inside a transaction. In PostgreSQL a concurrent second UPDATE blocks on the row lock, re-checks the condition
  and matches nothing. A unique index on `entitlements(source, source_ref)` is a second guard (one entitlement
  per code). Tested with 8 simultaneous attempts in unit tests, and with 2 simultaneous HTTP requests end-to-end.
  Bad guesses are rate-limited (10 failures per teacher per 15 minutes).
- **D-26 Codes.** Kit prefix plus 12 Crockford base32 characters (60 random bits), shown as `LMN-7K3D-Q9TX-2MPR`.
  Typed O/I/L/U are read as 0/1/1/V. The QR code opens `/redeem?code=…`.
- **D-27 Support staff** *(Studio part superseded by D-61; `STAFF_EMAILS` was removed)* are teachers whose email is in `STAFF_EMAILS` (or whose role is set to support/admin).
  Staff can open all content, to check what customers see. Every support action is written to the audit log.
- **D-28 District access.** An entitlement on a district covers every school whose `parent_id` is that district.
- **D-29 Video: Mux, with a local HLS stand-in.** Mux gives adaptive HLS, signed playback JWTs (RS256, 10-minute
  default), low-res MP4 static renditions for downloads, and is free to start. Captions and transcripts come
  from our own cue data (one source of truth) served as signed WebVTT. The local stand-in serves 720p + 360p HLS
  generated by `npm run media:generate`, with an HMAC-signed, expiring, asset-bound token on every playlist,
  segment and file. Streaming usage per school comes from playback rows plus player heartbeats.
- **D-30 Stand-in videos are narrated slide videos.** One branded slide per caption cue, with Windows speech
  narration when available. They demonstrate the pipeline (two renditions, captions, transcript, download) until
  real Curiocrate videos are uploaded to Mux with `npm run media:upload`.
- **D-31 Files: S3-compatible presigned GETs (Cloudflare R2 recommended), local stand-in with HMAC-signed links.**
  PDFs are rendered from the content definitions with pdf-lib in a print-friendly layout. A PDF that hasn't been
  generated is rendered on demand.
- **D-32 Card payments.** A Stripe `checkout.session.completed` event with `metadata.kind = "kit_order"` creates a
  `card` order and its codes. It is idempotent per event id and per checkout session. Without Stripe keys,
  webhooks are verified with a locally derived secret, so tests use Stripe's own test-header signing. Phase 1 has
  no public kit storefront: physical kit sales happen on the store, and staff can see the generated codes.
- **D-33 Phase gating.** `src/lib/features.ts` (`SHIPPED_PHASE`) hides entry points for phases that haven't shipped
  yet, so a phase never links to pages that don't exist.
- **D-34 Placeholder subscription prices** ($79 teacher / $690 school / $4,900 district per year) are only there to
  make the plans page concrete. **A human needs to set real prices** (`src/lib/plans.ts` and the Stripe price IDs).
- **D-35 Content-Security-Policy is generated from the domain allow-list** (`src/lib/domains.ts`), so the list
  given to school IT matches what the browser is actually allowed to load. `unsafe-eval` and `ws:` are added only
  in development.

## Two sides: company studio and teachers

- **D-40 Separate company login.** *(Superseded by D-61/D-62.)* `/company/login` signs into **Curiocrate Studio** (`/admin/*`) with a username
  and password. It uses an HMAC-signed 12-hour cookie and locks out after 8 failures. The initial account is
  `CurioCrateAdmin`. Only a scrypt hash of its password is in the code; set `ADMIN_USERNAME`/`ADMIN_PASSWORD` (or
  `ADMIN_PASSWORD_HASH`) in Vercel to change it. Staff teachers listed in `STAFF_EMAILS` can still use Studio.
- **D-41 Studio content is live immediately.** Kits, lessons, videos, PDFs, training and lab entries created in
  Studio go straight into the database, which drives the catalog, kit pages, access checks and code generation.
  There's no deploy step. Lesson text uses a small line format (`## heading`, `1. step`, `- bullet`,
  `> Safety:`, `? explain`, `Materials:`).
- **D-42 Uploads.** PDFs go to S3/R2 (or `.media/` locally). Videos are stored and then processed in the
  background (`after()`): with Mux keys they are uploaded to Mux with signed playback; otherwise ffmpeg
  makes 720p/360p HLS, a low-res MP4 and a poster. Captions can be pasted as WebVTT or as plain lines, which are timed to the
  video automatically. **Vercel's filesystem is temporary, so production video uploads need Mux and PDFs need S3/R2.**

## Phases 2-3

- **D-50 Students:** a class code creates a session holding only a random token hash and a generated nickname
  ("Curious Otter") from fixed word lists. Students never type anything about themselves, and lab results accept
  only numbers and short sanitized strings. Students can open only content assigned to their class, and only
  while their teacher's school has access.
- **D-51 Labs** are SVG + React, keyboard-operable, with results announced in live regions. The science
  models (luminol detection limit, series/parallel brightness, filter clarity/flow/cost) are pure functions
  with unit tests.
- **D-52 Clever and ClassLink** use the same OAuth flow as Google. Students are refused (teacher/staff only).
  Without keys, each provider runs in its own test mode through the local identity provider.
- **D-53 Curie.AI** runs on `claude-opus-5-5` (override with `CURIE_MODEL`) at low effort, with server-side refusal
  fallbacks enabled. Our own filters run before and after the model (personal info, unsafe topics,
  self-harm (which gets a trusted-adult / 988 referral), off-topic, answer-fishing), so a refusal never depends
  on the model. With no `ANTHROPIC_API_KEY`, a local hint-only tutor stands in. Chats are stored for teacher review
  and deleted after `CURIE_RETENTION_DAYS` (default 30) by the daily cron. Anthropic's commercial API terms
  exclude API data from model training.
- **D-54 Subscriptions:** Stripe subscription events set an entitlement whose end date is the paid period
  end. Renewals extend it and cancellation ends it now. Without Stripe keys, `/api/subscribe` sends a signed
  test-mode event through the real webhook handler.
- **D-55 District dashboard** (`/district`): a teacher moved into a district org in Studio becomes its district
  admin and sees per-school usage. Students are counted as anonymous devices.
- **D-56 LMS integrations (first step):** a "Share to Google Classroom" button and copyable lesson links for
  Canvas/Schoology. LTI 1.3 and Common Cartridge export are left for later (they need LMS developer keys
  from each district).
- **D-57 School data deletion** (Studio → school → "Contract ended") deletes the school (or district and its
  schools) with all teachers, classes, students, lab runs, chats, access and usage. Orders are kept for
  accounting, with customer details removed.
- **D-58 Files studio** (`/admin/files`, where company login lands): the team uploads several files at once
  (PDF, Word, PowerPoint, Excel, PNG, JPG; 50 MB each), picks kit, lesson and access once, and each file becomes a
  live handout. Files are checked by extension and first bytes; a rejected file creates nothing. Library with
  filter, download, replace and delete.
- **D-59 Same-site redirects are relative.** Sign-in, sign-out, join and subscribe redirect with a relative
  `Location`, and the local test sign-in uses a relative callback, so a mismatched `APP_URL` (another port, a
  preview deployment) no longer breaks login (CSP `form-action` blocked the cross-origin hop). Real OAuth providers
  and Stripe still use `APP_URL`.
- **D-60 No hand-written `-webkit-backdrop-filter`.** Lightning CSS merged it with `backdrop-filter` and kept only
  the prefixed one, which Chrome ignores, so the header never blurred when scrolled. The compiler adds prefixes itself.

## Content

- **D-10 Kit lines.** Luminol is Curiocrate's real kit. Its manual sections, box contents and NGSS alignment come from
  curiocrate.org/kits/luminol. The plan covers grades 4-10 with several kit lines, so two placeholder lines (Circuit
  Builders, grades 4-5; Clean Water Engineering, grades 9-10) are seeded with status **In development**, and the UI
  labels them that way. Edit or remove them in `src/content/kits.ts`.

## Studio, cloud storage and code security (2026-10-31)

- **D-61 Studio is password-only.** `requireAdmin()` accepts only a Studio session; the old `STAFF_EMAILS` path, which
  let a teacher's Google account open Studio, is gone. `src/proxy.ts` turns away `/admin/*` and `/api/admin/*` requests
  without a validly signed Studio cookie before any page code runs, and every page, action and route checks the session
  again against the database.
- **D-62 Studio accounts in the database.** `admin_users` (scrypt hashes) and `admin_sessions` (sha256 of a random id
  inside a signed, SameSite=Strict, 12-hour cookie). Signing out, disabling an account or changing a password ends its
  sessions. 8 wrong passwords lock an account for 15 minutes (stored in the database, so it holds across serverless
  instances; the old in-memory counter did not). Studio → Team adds people, disables them and resets passwords; the last
  active account can't be disabled. The development account (its password is in the e2e suite) is never created on a
  deployed site; the first account there comes from `ADMIN_USERNAME`/`ADMIN_PASSWORD`.
- **D-63 Cloud only in production.** With `VERCEL_ENV=production` (or `REQUIRE_CLOUD=1`) the database refuses to fall
  back to PGlite and storage refuses the local disk, with an error naming the missing variables. Studio shows a
  "Where data is stored" table and a banner while anything is still local.
- **D-64 Direct-to-bucket uploads.** Vercel functions accept about 4.5 MB per request, so Studio uploads go from the
  browser straight to R2 (presigned PUT, one hour) or to Mux (direct upload URL): `/api/admin/uploads/sign` →
  PUT → `/api/admin/uploads/complete`, which checks the stored file's first bytes before anything goes live and deletes
  rejected files. Upload keys are random (`uploads/<kind>/<yyyy-mm>/<uuid>-<name>`), replacing a file deletes the old
  one, and deleting an item deletes its stored files. Without Mux, a video plays as one MP4 from the bucket with a
  signed link; with Mux it streams adaptively. Locally, an HMAC-signed PUT route stands in for the bucket.
- **D-65 Interactive (HTML/JavaScript) lessons.** New content type `interactive`. Studio accepts a `.zip` (with
  `index.html`, optionally inside one top folder), a single `.html`, or a `.js` file (wrapped in a start page), several
  at once. Packages are unpacked (fflate; paths that escape the folder, >3000 files or >400 MB are refused) into
  `lessons/<slug>/<version>/` and the lesson switches to the new version in one update. They are served from
  `/api/lesson-pkg/<signed token>/...`; the token is issued only after the access check, expires after 6 hours and is
  bound to one package, so relative links inside the lesson work. Every response carries
  `Content-Security-Policy: sandbox allow-scripts ...` without `allow-same-origin`, and the iframe has the same sandbox,
  so lesson code runs in an opaque origin and can't read teachers' cookies or call the site as them. Because of that
  origin, package files send `Access-Control-Allow-Origin: *` so lessons can load their own modules and data files.
- **D-66 Kit manuals.** New content type `manual`: a kit-level download listed under "Manuals" on the kit page,
  uploaded in Studio → Files & manuals ("This is a: Kit manual"), downloadable from the library.
- **D-67 Kit codes are personal seats.** A redeemed code creates an entitlement with `teacher_id` = the redeemer.
  Colleagues need their own code or a school-wide license (Studio → school → Grant). Personal seats follow the teacher
  if they change schools. This replaces "one code unlocks the whole school" (D-25's exactly-once guarantees are
  unchanged).
- **D-68 School joins need approval.** Joining with a school's join code sets `membership = 'pending'`; pending teachers
  get only their personal entitlements, never school-wide ones, until the school admin (dashboard) or Curiocrate
  (Studio → Access) approves them. The creator of a school, the first teacher into an empty school and teachers who
  auto-join by verified email domain are approved automatically.
- **D-69 Three devices per teacher.** Signing in on a fourth device signs out the oldest session, so one Google login
  can't serve a department. Each sign-in is logged with a keyed hash of the network address (never the address).
- **D-70 Sharing alerts** (Studio → Security): accounts signing in from 5+ networks in 30 days, accounts holding 2+
  redeemed codes for the same kit, 5+ wrong codes in 7 days, and failed Studio sign-ins. Studio → Access looks up any
  teacher: their kits (revoke, restore, move to another teacher), devices (sign out everywhere), approval, plus a table
  to set who can open each item.
- **D-71 Real sign-in only on deployed sites.** The test identity provider now runs only without `VERCEL_ENV` (a
  developer's computer, the e2e suite). Before, preview deployments allowed it, and anyone could have signed in as any
  email there. Deployed sites list only providers with real keys.
- **D-72 Teachers own their data.** `/account` shows what is stored, downloads it as JSON and deletes the account
  (cascading to sessions, sign-in links, personal seats, classes with their student devices, lab runs and chats, views
  and usage; the email is scrubbed from the audit log; redeemed codes stay used). If the teacher was the school's only
  admin, the longest-serving approved colleague becomes admin.
