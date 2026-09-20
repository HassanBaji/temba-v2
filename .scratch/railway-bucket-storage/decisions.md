# Railway bucket storage — settled decisions

Status: spec published — `.scratch/railway-bucket-storage/spec.md` (ready-for-agent). Linear: [TEM-237](https://linear.app/temba-app/issue/TEM-237/switch-venue-logos-to-the-railway-bucket-and-app-media-urls) (frontier) blocks [TEM-238](https://linear.app/temba-app/issue/TEM-238/switch-group-images-to-the-railway-bucket-and-remove-supabase-storage).

Autonomous planner: no live user. Forks locked from the request, ADR-0006, ADR-0015, `.scratch/group-image/decisions.md`, current storage modules, Clerk middleware, and Railway Storage Buckets docs (private S3-compatible Tigris; no public buckets; presigned URL or backend proxy to serve).

Owners this program defers to, where they disagree:

- Venue logos product rules: ADR-0006 (storage backend superseded; file rules and Operator door stay)
- Group images product rules: ADR-0015 / `.scratch/group-image/` (storage backend superseded; approver door and surfaces stay)
- User photos: `.scratch/user-profile-image/` (Clerk; do not extend to Venue or Group)
- tRPC placement: `.cursor/rules/api-one-endpoint-per-file.mdc`

No new `CONTEXT.md` term. Image remains an attribute of Venue (logo) or Group (image). Railway Bucket / S3 / App media URL are infrastructure.

## Current vs requested

**Today.** `@supabase/supabase-js` is used only by `venue-logos` and `group-images`. Client sends base64 over tRPC; the App decodes, checks JPEG/PNG/WebP magic bytes and ≤ 2 MB, uploads with the service role to a public-read bucket (`{venueId}/logo` or `{groupId}/image`, upsert), persists `getPublicUrl` on the row, and the UI puts that URL in `<img>` / `EntityMonogram`. Failed remote loads already fall back to initials / empty logo. User photos stay on Clerk.

**Requested.** Same doors, file rules, and persist-URL-at-upload shape, but objects live in Railway bucket `customizable-pannier-xnbsgm`. Drop `SUPABASE_*` and `@supabase/supabase-js`. Because the bucket is private, the stored URL cannot be a Tigris public object URL.

## Grill (round 1) — locked

❓ **Q1 - One bucket or two?** User gave one S3 API name. Group-image grilling rejected putting Group files in the Venue bucket *when that bucket was named and credentialed as Venue-only Supabase*. Here the product choice is a single Railway bucket for both catalog-chrome kinds.

➡️ **One bucket, two prefixes.** Keys `venue-logos/{venueId}/logo` and `group-images/{groupId}/image`. Keep sibling App modules (`venue-logos`, `group-images`) so we do not invent a generic blob service. A tiny shared S3 client used by both (and by the GET routes) is allowed: the same transport rule has two+ callers.

---

❓ **Q2 - Upload path?** Railway offers service `PutObject` (App egress) or browser presigned POST (CORS, different UI).

➡️ **Keep server-side PutObject after the existing tRPC base64 + magic-byte pipeline.** Reject presigned POST: CORS is a new operational surface; validation currently happens *before* bytes leave the App; 2 MB is already in App memory; Operator/approver UI and procedure keys stay. Multipart is unnecessary under 2 MB.

---

❓ **Q3 - Existing rows / cutover?** No seed or production fixtures store live Supabase object URLs (tests use `example.supabase.co` strings only).

➡️ **No one-time copy.** New uploads go to Railway. Existing Supabase URLs remain until the Operator or Group approver replaces or clears. Broken remote files already fall back to initials / empty logo. Out of scope: migrating historical objects, deleting the Railway bucket, Clerk User photos.

## Grill (round 2) — locked (depends on Q1–Q2)

❓ **Q4 - Read/serve path?** Railway: presigned URLs (≤ 90 days, bucket egress free) or proxy through the App (stable URLs, **service** egress billed, bucket egress free). ADR-0006 rejected “private bucket plus signed URLs on every display” because Supabase public-read existed. That alternative is gone. Catalog chrome is not private-per-viewer: anyone who can see the Venue/Group row may see the image. Must not ship S3 credentials to the browser. Columns stay `logoImageUrl` / `imageUrl` and the UI keeps putting the stored string in `<img>` / `EntityMonogram`.

➡️ **Stable App GET proxy that streams GetObject.** Persist a root-relative App URL on the row at upload time (same persist-URL-at-upload shape as today).

Rejected **presigned-at-read** (sign in every `list` / `byId`): stored column would not be what `<img>` uses, or stored URLs would expire; Groups hub would N-presign per page; `<img>` cache keys would churn; ADR-0006 already called this overkill for catalog chrome.

Rejected **presign at upload and persist a 90-day Tigris URL**: lists rot; replace/clear cannot rely on the column.

Rejected **redirect GET → short-lived presign**: needs the presigner package; CDN would cache per-presign Tigris URLs; extra 302 on every miss. Catalog files are small (≤ 2 MB, usually far less). Streaming plus a cache-buster query plus long `Cache-Control` lets the App’s CDN cache bytes at the App URL. Document App/Vercel egress on cache miss; bucket egress stays free.

URL shape (fits `varchar(255)` with room):

- `/api/media/venue-logos/{venueId}/logo?v={unixMs}`
- `/api/media/group-images/{groupId}/image?v={unixMs}`

Root-relative: no public App origin env; Cloud Agent localhost and production both work. `{unixMs}` is `Date.now()` after a successful Put so replace invalidates `<img>` / CDN (S3 key stays the same upsert path). Clear persists `null`.

GET behaviour:

- Node runtime. `GetObject` with service credentials. Stream body. Pass through `Content-Type` set at Put. `Content-Disposition: inline`. `Cache-Control: public, max-age=31536000, immutable` on 200 (query param is the bust). Missing object or invalid UUID: 404 without long cache (`no-store`). Credential/S3 failure: 502, no AWS error body.
- **No Clerk session.** Today’s surfaces that *show* these images are under `/dashboard` (Clerk-protected). `/gr/{code}` and `/g/{code}` are not in `isProtectedRoute` and do not currently pass Group/Venue image into `EntityMonogram` (invite preview is name-only). GET must still be reachable without a session: catalog chrome matches public-read buckets; requiring auth would `Vary` on cookies and bust CDN; a later invite or unsigned surface can reuse the stored URL. Guessing a UUID is the same leak model as today’s public object URL.
- **Skip Clerk middleware** for `/api/media` the same way `/api/webhooks` is skipped, so responses stay cacheable.
- Do not add `/api/media` to `isProtectedRoute`. Do not check Operator/approver on GET. Do not require the Venue/Group row to exist (S3 404 is enough). Do not list prefixes.

Two explicit App routes (not a catch-all blob API), each calling the sibling storage module.

---

❓ **Q5 - Env naming?** Railway AWS SDK preset injects `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION=auto`, `AWS_S3_URL_STYLE=virtual`. `RAILWAY_BUCKET_NAME` is the display name — do not use it as the S3 API name. JS SDK does not auto-read `AWS_ENDPOINT_URL` or bucket name; the shared client passes `endpoint`, `region`, `credentials`, `forcePathStyle: false`, and `Bucket` on each command.

➡️ **Drop all `SUPABASE_*`.** Require in App env (with Cloud placeholders when unset):

- `AWS_ENDPOINT_URL` (example `https://t3.storageapi.dev`)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME` (example / default `customizable-pannier-xnbsgm`)
- `AWS_DEFAULT_REGION` (example `auto`)

Do not put these on the client. Do not require `AWS_S3_URL_STYLE` in `env.js` (virtual-hosted is hard-coded). Do not alias Railway’s `BUCKET` / `ENDPOINT` names in code — production should use the AWS SDK preset variable references. Cloud `install.sh` writes syntactically valid placeholders when unset so `/login` still boots; live upload/GET need real keys. Update `.env.example`, `turbo.json` `globalEnv`, `AGENTS.md`.

---

❓ **Q6 - Package and tests?** `@supabase/supabase-js` is only used by the two storage modules.

➡️ Remove it once unused. Add `@aws-sdk/client-s3` only (no presigner). Tests: keep magic-byte/size unit tests; add the missing Venue sibling of the Group file tests; router PGLite suites keep mocking storage modules and switch fixtures from `https://example.supabase.co/storage/v1/object/public/...` to `/api/media/...`; add GET-route tests with a mocked S3 client (UUID/404/Content-Type/Cache-Control). No live bucket in CI. Vitest already sets `SKIP_ENV_VALIDATION`.

## Grill (round 3) — locked (depends on Q4–Q6)

❓ **Q7 - tRPC and locality?** Group-image grilling: doors stay thin callers of `~/server/storage/*`; bucket code must not move under `api/routers/`. One-endpoint-per-file: extract only when the same rule is used by two+.

➡️ Do not change client-facing procedure keys (`venues.uploadLogo`, `venues.clearLogo`, `groups.uploadImage`, `groups.clearImage`). Do not add `server/venues/upload-logo.ts` or `server/groups/upload-image.ts` twins. Doors keep calling storage modules. Shared S3 transport lives next to those modules, not under routers. Path construction, copy, and entity errors stay in the sibling modules.

---

❓ **Q8 - ADR and glossary?** Next free number after 0015 is 0016. ADR-0006 rejected signed URLs because public-read existed; ADR-0015 copied that for Group. Both are now factually wrong about the store.

➡️ **ADR-0016** records Railway Bucket for Venue logos and Group images and **supersedes ADR-0006 and ADR-0015**. Do not rewrite glossary terms. Venue vs Group vs Clerk User photo boundaries stay. No Community logo. Lands in ticket 02 when Supabase is fully gone (ticket 01 may leave Group on Supabase briefly; do not mark 0006/0015 superseded until 02).

---

❓ **Q9 - Cache, replace, delete?** Same S3 key on upsert. DeleteObject on clear. Empty-Group delete already best-effort-removes the object and must not fail closed.

➡️ PutObject upserts the prefixed key, then persist the App URL with a new `v`. Clear: DeleteObject (idempotent if missing) then null the column. Empty-Group delete: unchanged best-effort remove then DB delete. Soft-archive does not delete objects or null URLs. Leftover object if Put succeeded and DB URL update failed: next upsert overwrites the same key (same as today). No janitor.

---

❓ **Q10 - GET auth vs public Group/Community pages?** Clerk `isProtectedRoute` is `/dashboard` and `/onboarding` only. Community home, Groups hub, Group home, Game venue card, and Venue detail are dashboard. Invite short links are signed-out-capable and do not show these images yet.

➡️ GET remains unauthenticated catalog chrome. Do not invent per-viewer image ACL. Do not use this proxy for Clerk User photos.

## Out of this program

- Copying or deleting objects in Supabase
- Deleting or renaming the Railway bucket
- Clerk User photos; Community logos; Coach URL paste
- Open Graph / Invite-link images; `/gr/{code}` starting to pass Group `imageUrl`
- Cropper; GIF/SVG/AVIF; URL paste; files over 2 MB
- Browser presigned POST; public Railway buckets; Vercel Blob
- A generic multi-entity Storage Package or blob service
- Changing who may upload/clear (Operator vs Group approver) or tRPC keys
- Showing Venue logos on the Operator Venues list (that list still uses initials)
- Private networking to the bucket (Railway: buckets are public networking only)
