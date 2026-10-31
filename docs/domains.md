# Domains to allow through school web filters

Generated from `src/lib/domains.ts`. The same list is shown at `/schools/it` and is used to build the site's
Content-Security-Policy. A unit test (`tests/domains.test.ts`) fails if the code uses a browser-facing domain that is not listed here.

| Domain | Used for | Needed |
| --- | --- | --- |
| materials.curiocrate.org | This platform (pages, lessons, labs, signed file and video links) | Always |
| curiocrate.org | Curiocrate main site (links only) | Always |
| fonts.googleapis.com | Brand font stylesheet (same as curiocrate.org) | Always |
| fonts.gstatic.com | Brand font files | Always |
| accounts.google.com | Teacher sign-in with Google | Always |
| stream.mux.com | Lesson video streaming (signed, short-lived links) | Always |
| image.mux.com | Video poster images | Always |
| clever.com | Teacher sign-in with Clever | If the school uses Clever |
| launchpad.classlink.com | Teacher sign-in with ClassLink | If the school uses ClassLink |
| checkout.stripe.com | Card payments for kits and subscriptions (staff and purchasers only) | Only for purchasers |
| classroom.google.com | Share lessons to Google Classroom | If the school uses Google Classroom |
| *.r2.cloudflarestorage.com | Files, manuals and videos in Curiocrate's cloud storage (Cloudflare R2, presigned short-lived links) | Always |
| storage.googleapis.com | Curiocrate staff video uploads to Mux (Studio only, never students) | Only for Curiocrate staff |

Server-to-server only (no student device ever contacts these): `oauth2.googleapis.com`, `openidconnect.googleapis.com`,
`api.stripe.com`, `api.mux.com`, `api.anthropic.com`, Clever and ClassLink token APIs.

Students only need `materials.curiocrate.org`, the two Google Fonts domains, `*.r2.cloudflarestorage.com`, `stream.mux.com` and `image.mux.com`.
