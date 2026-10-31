# Curiocrate Materials

Online labs, lessons, videos and teacher training for Curiocrate science kits (grades 4–10).
Live at **materials.curiocrate.org** (Vercel, DNS on Cloudflare; every push to `main` deploys, see `docs/deployment.md`).

## Two sides

| Who | Where | What |
| --- | --- | --- |
| **Curiocrate team** | `/company/login` → **Studio** (`/admin`), username + password only | Build kits and lessons; upload pre-built HTML/JavaScript lessons, videos (with captions), handouts and kit manuals straight to cloud storage, and download them back; set who can open each item; generate kit codes in bulk (QR sheets, CSV); look up teachers and move, grant or revoke their kits; approve school joins; see sharing alerts, usage and the audit log; manage Studio accounts. Everything saved is live immediately. |
| **Teachers** | `/signin` (real Google accounts; Clever and ClassLink too) | Redeem the code from their kit box (unlocks the kit on their own account), open lessons, interactive lessons, manuals, PDFs, captioned videos and labs, create classes, assign work, turn Curie.AI on, subscribe. Download or delete their data at `/account`. |
| **Students** | `/join` with a class code | No account, no name. Open assigned lessons and labs, ask Curie.AI if the teacher enabled it. |

Studio login: on a developer's computer the account `CurioCrateAdmin` exists for testing. On the live site the first
account comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in Vercel; add more people in Studio → Team.

**Going live** needs four accounts set up by a person (steps in `docs/deployment.md`): Neon Postgres, a Cloudflare R2
bucket, a Google OAuth client, and the first Studio password. The live site refuses to start without the database and
bucket, so no upload or account can end up on a temporary server disk.

## Run it

```bash
npm install
npm run media:generate   # stand-in PDFs and narrated sample videos into .media/
npm run dev              # http://localhost:3000 (embedded PostgreSQL, no keys needed)
```

Every outside service (database, sign-in, video, files, payments, AI) falls back to a test mode or local
stand-in when its keys are missing. All variables are listed in `.env.example`.

## Check it

```bash
npm run check      # eslint + theme check + typecheck + unit tests
npm run build && npm run test:e2e   # end-to-end, accessibility (axe), brand, keyboard, Chromebook simulation
npm run vpat       # regenerate docs/vpat.md from the accessibility results
```

Project docs: `PROGRESS.md` (what was built and every gate result), `DECISIONS.md`, `design/brand.md`,
`docs/deployment.md`, `docs/domains.md` (web-filter allow-list), `docs/vpat.md`.
