# Deployment: materials.curiocrate.org

**Goal:** a push to `main` on GitHub deploys the site automatically. Vercel hosts the app, Cloudflare serves the DNS,
and **every piece of data lives in the cloud**: accounts, lessons, codes and access in Neon Postgres; files, manuals,
JavaScript lessons and videos in a Cloudflare R2 bucket (videos optionally on Mux). The production site refuses to start
without a cloud database and a cloud bucket, so nothing is ever written to Vercel's temporary disk.

## 1. Connect the repo to Vercel (one time)

1. In Vercel, choose **Add New → Project**, import `curio-crate/CurioCrate-Materials`, framework **Next.js**.
2. Leave build settings alone; `vercel.json` sets the build command:
   `npm run db:migrate && npm run media:generate -- --if-missing && npm run build`.
3. Production branch: `main`. Every push to `main` deploys to production, and every pull request gets a preview URL.

## 2. Database (Neon Postgres)

1. In Vercel → Storage, create a **Neon Postgres** database and connect it to the project. This sets `DATABASE_URL`.
2. The build runs `db:migrate`, which applies `drizzle/*.sql` and seeds the catalog. It is safe to run repeatedly.
3. Teacher accounts and everything they create stay in this database until the teacher deletes their account
   (`/account`) or Curiocrate deletes their school's data (Studio → school → Contract ended).

## 3. File storage (Cloudflare R2)

1. Cloudflare → R2 → **Create bucket** (e.g. `curiocrate-materials`). Keep it **private** (no public access).
2. R2 → **Manage API tokens** → create a token with *Object Read & Write* on that bucket. Note the access key, secret and
   the S3 endpoint `https://<account-id>.r2.cloudflarestorage.com`.
3. Bucket → Settings → **CORS policy**, so Studio can upload straight from the browser:
   ```json
   [{ "AllowedOrigins": ["https://materials.curiocrate.org"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
   (Add a preview URL or `http://localhost:3000` to `AllowedOrigins` if you test uploads there.)
4. Set `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` in Vercel.

Uploads go from the browser directly to the bucket with one-hour presigned links, so they aren't limited by Vercel's
4.5 MB request limit (handouts up to 50 MB, lesson packages up to 200 MB, videos up to 4 GB). Downloads and video
playback use short-lived presigned links issued only after the access check.

**Videos:** with only R2, an uploaded MP4 plays straight from the bucket. For adaptive streaming on slow school Wi-Fi,
add Mux (`MUX_TOKEN_ID/SECRET` + `MUX_SIGNING_KEY_ID/PRIVATE_KEY`): Studio then uploads videos straight to Mux instead.

## 4. Teacher sign-in with Google (real Google accounts)

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project → **APIs & Services → OAuth consent screen**:
   User type **External**, app name "Curiocrate Materials", support email, authorized domain `curiocrate.org`, scopes
   `openid`, `email`, `profile`. **Publish** the app (no Google review is needed for these basic scopes).
2. **Credentials → Create credentials → OAuth client ID** → *Web application*. Authorized redirect URI:
   `https://materials.curiocrate.org/api/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.

A deployed site (production or preview) only offers real Google / Clever / ClassLink sign-in; the "type any email"
test sign-in runs only on a developer's computer and in automated tests.

## 5. Studio (company) login

Studio is username + password only. A teacher's Google account never opens it.

1. Before the first deploy, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (12+ characters) in Vercel. The first sign-in
   creates that account. (The development account from the code and tests is never created on a deployed site.)
2. Add teammates later in **Studio → Team**: each person gets their own username and password, and you can disable
   accounts or reset passwords there. Every Studio change is recorded with the username in the audit log.
3. Locked out? Set `ADMIN_PASSWORD_RESET=1` with a new `ADMIN_PASSWORD`, redeploy, sign in, then remove
   `ADMIN_PASSWORD_RESET`.

## 6. Environment variables (Vercel → Settings → Environment Variables)

Copy every variable from `.env.example`. Required for production:

| Variable | Why |
| --- | --- |
| `APP_URL` | `https://materials.curiocrate.org` |
| `SESSION_SECRET` | 32+ random chars (`openssl rand -base64 48`). Signs sessions, Studio cookies and file links |
| `DATABASE_URL` | Set by the Neon integration |
| `S3_*` | Cloudflare R2 bucket (section 3) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Teacher sign-in (section 4) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First Studio account (section 5) |
| `CRON_SECRET` | Protects `/api/cron/*` (Vercel Cron sends it automatically) |

Optional: Mux (adaptive video), Stripe (payments), Anthropic (Curie.AI), Clever, ClassLink.

## 7. Domain via Cloudflare

1. In Vercel → Settings → Domains, add `materials.curiocrate.org`.
2. In Cloudflare DNS for `curiocrate.org`, add:
   `CNAME  materials  cname.vercel-dns.com` with **Proxy status: DNS only** (grey cloud).
   (If you want the orange-cloud proxy instead, set SSL/TLS mode to **Full (strict)**.)
3. Vercel issues the certificate automatically within a few minutes.

## 8. Content

Upload real content in Studio: **Files & manuals** (handouts and kit manuals), **Lessons & videos** (text lessons,
pre-built HTML/JavaScript lessons as `.zip`/`.html`/`.js`, videos with captions). The seeded sample lessons point at
PDFs and videos generated on a developer's computer; replace or delete them in Studio before launch.

## 9. Cron

`vercel.json` schedules `/api/cron/retention` daily. It deletes Curie.AI chats older than `CURIE_RETENTION_DAYS` and
ends expired subscriptions. Vercel sends `Authorization: Bearer $CRON_SECRET`.

## 10. Checks before go-live

```
npm run check        # lint + theme check + typecheck + unit tests
npm run build
npm run test:e2e     # end-to-end, accessibility, brand, Chromebook simulation
```

Then sign in to Studio → **Team & system** and confirm every row under "Where data is stored" says *Cloud / live*.
