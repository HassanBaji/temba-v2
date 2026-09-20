# Railway bucket storage

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

- [TEM-237](https://linear.app/temba-app/issue/TEM-237/switch-venue-logos-to-the-railway-bucket-and-app-media-urls) Switch Venue logos to the Railway bucket and App media URLs — no blockers
- [TEM-238](https://linear.app/temba-app/issue/TEM-238/switch-group-images-to-the-railway-bucket-and-remove-supabase-storage) Switch Group images to the Railway bucket and remove Supabase Storage — blocked by TEM-237

Settled grilling: `.scratch/railway-bucket-storage/decisions.md`.

Owners this spec defers to, where they disagree:

- Venue logo product (who uploads, file rules, Community home / Game venue card): ADR-0006 until ADR-0016 supersedes the *store*
- Group image product (who uploads, surfaces, create-then-upload): `.scratch/group-image/spec.md` / ADR-0015 until ADR-0016 supersedes the *store*
- User photos: `.scratch/user-profile-image/spec.md` (Clerk)
- tRPC placement: `.cursor/rules/api-one-endpoint-per-file.mdc`

Approving this spec approves the Test seams in Testing Decisions. No new `CONTEXT.md` term. Keep **App**, **Venue**, **Group**, **Club Group**, **Loose Group**, **Operator**, **User**, **Community**, **Group approver**.

## Problem Statement

The App stores **Venue** logos and **Group** images in Supabase Storage public-read buckets and persists those public URLs on the row. The product is moving off Supabase Storage onto a Railway Bucket (`customizable-pannier-xnbsgm`). Railway buckets are private S3-compatible storage: there is no public-read bucket, so today’s `getPublicUrl` + `<img src>` pattern cannot be copied as-is. Operators and Users still need to upload JPEG/PNG/WebP (≤ 2 MB) and see the picture on Community home, Groups hub, Group home, Game venue card, and Venue detail without S3 credentials in the browser.

## Solution

Keep the existing tRPC doors, file rules, and “persist a URL on the row” shape. Replace the blob backend with one Railway bucket and sibling App storage modules.

The App uploads with AWS SDK `PutObject` after the current base64 + magic-byte pipeline. It persists a **stable App media URL** on `logoImageUrl` / `imageUrl`. A Next.js GET under `/api/media/...` streams `GetObject` so `<img>` and `EntityMonogram` keep working. Replace upserts the same object key and changes a `v` query on the stored URL so caches refresh. Clear and empty-Group delete remove the object as they do today.

User photos stay on Clerk. Existing Supabase URLs are left in place until replace/clear; a dead URL already falls back to initials or empty logo.

## User Stories

1. As an Operator, I want uploading a Venue logo to keep working with JPEG, PNG, or WebP at most 2 MB, so that catalog chrome does not change.

2. As an Operator, I want a successful upload to show the new logo on Venue detail, Community home, the Community venue block, and the Game venue card, so that every current logo surface still matches.

3. As an Operator who replaces a logo, I want the new file to show without a stale cached picture, so that upsert is visible immediately.

4. As an Operator who clears a logo, I want the preview and Community/Game chrome to return to empty / initials, so that remove still works.

5. As a Group approver, I want Add / Change / Remove Group image to keep the same doors, copy, and file rules, so that only the store changes.

6. As a User on Groups hub Mine, Public, and Invitations, and on Group home, I want the Group image or initials to render as today, so that Groups redesign chrome is unchanged.

7. As a User whose image URL is missing or the file fails to load, I want initials (Group) or empty logo copy (Venue), so that a private bucket or placeholder keys do not leave a broken tile.

8. As a Cloud Agent or local App without live Railway credentials, I want `/login` to boot with placeholder AWS env, so that Clerk and dashboard work; live upload and media GET still need real keys.

9. As a maintainer on Railway, I want the App to use AWS SDK standard variable names so the service can reference the bucket credentials, so that production does not invent `SUPABASE_*` aliases.

10. As a maintainer, I want a single bucket with `venue-logos/` and `group-images/` prefixes, so that Venue and Group objects cannot clobber each other.

11. As a maintainer, I want sibling storage modules plus one shared S3 client, so that we do not build a generic blob service and we do not duplicate credentials.

12. As a maintainer, I want tRPC procedure keys unchanged, so that existing clients keep compiling.

13. As a maintainer, I want bucket logic to stay in App storage modules, not under `api/routers/` and not in `server/venues/upload-logo.ts` twins.

14. As a User, I want Clerk User photos unchanged, so that You and `UserAvatar` stay on Clerk.

15. As a User on `/gr/{code}` or `/g/{code}`, I want those Invite flows unchanged this spec (still name-only monograms), so that we do not expand Group image surfaces.

16. As an Operator looking at the Venues list, I want that list unchanged (still initials, no logo), so that we do not widen display scope.

17. As a Group approver deleting an empty Group, I want delete to succeed even if object removal fails, so that a down bucket does not trap the Group.

18. As a member of a Soft-archived Club Group, I still want to see the stored image if I can already see that Group, so that Soft-archive does not strip chrome.

19. As a Group approver on a host-frozen Club Group, I want upload and clear still refused, so that freeze is not reopened.

20. As a User who is not a Group approver, I want image writes still forbidden.

21. As an Operator who is not a Group approver, I want no Group image control, so that Operator stays Venue work.

22. As a maintainer, I want `@supabase/supabase-js` removed once unused, so that the App does not keep a dead Storage client.

23. As a maintainer, I want CI to test magic bytes, mocked upload/clear, persisted URL shape, and mocked GET proxy behaviour without a live bucket.

24. As a User, I want Community logos, Coach URL paste, Open Graph, cropper, GIF/SVG/AVIF, and URL-paste upload to stay out of this change.

25. As a User with an old Supabase URL still on the row, I want the UI to keep requesting that URL until replace/clear, so that we do not rewrite historical rows.

26. As a User, I want a media GET to work in the browser without a Clerk session, so that `<img>` does not depend on dashboard cookies and catalog chrome stays public-read-equivalent.

27. As a maintainer, I want media GET to skip Clerk middleware, so that CDN can cache catalog images without cookie variance.

28. As a User who uploads twice quickly, I want the last successful upsert to win at the same object key, so that Temba does not invent merge rules.

29. As a maintainer, I want ADR-0016 to record why we proxy instead of signed URLs, so that the next engineer does not “fix” this back to persist-a-Tigris-URL.

30. As a User, I want product copy to keep saying logo for Venue and image for Group, so that language does not drift.

## Implementation Decisions

- **One Railway bucket.** S3 API name from env `AWS_S3_BUCKET_NAME`, default example `customizable-pannier-xnbsgm`. Prefixes `venue-logos/{venueId}/logo` and `group-images/{groupId}/image`. Virtual-hosted style (`forcePathStyle: false`). Endpoint `AWS_ENDPOINT_URL` (example `https://t3.storageapi.dev`). Region `AWS_DEFAULT_REGION` (example `auto`).

- **Sibling modules, shared transport.** Keep Venue and Group storage modules. Extract only a small S3 client/helper used by both modules and both GET routes (Put, Get, Delete, credentials). Path strings, user-facing errors, and magic-byte helpers stay in the sibling modules. Do not generalize into a multi-entity blob service. Do not put bucket code under `api/routers/`.

- **Upload.** Unchanged tRPC input: id + `contentType` enum + `dataBase64`. Decode, 2 MB, magic bytes, then `PutObject` with detected `Content-Type`, upsert same key. Return and persist a root-relative App URL with `?v={unixMs}` after successful Put. Failure messages stay “Failed to upload Venue logo” / “Failed to upload Group image”.

- **Reject browser presigned POST** for this spec (CORS, validation-before-upload, UI/API churn). Reject Vercel Blob.

- **Serve.** Next.js GET routes:

  - `/api/media/venue-logos/{venueId}/logo`
  - `/api/media/group-images/{groupId}/image`

  `{venueId}` / `{groupId}` must be UUIDs; filename is fixed (`logo` / `image`). Query `v` is ignored by GET (cache bust only). Stream `GetObject`. Node runtime. No session. Skip Clerk middleware for `/api/media` (same idea as webhooks). Not in `isProtectedRoute`. 200: `Content-Type` from the object, `Content-Disposition: inline`, `Cache-Control: public, max-age=31536000, immutable`. 404: invalid UUID or missing object, `Cache-Control: no-store`. 502: S3/credential errors, no provider internals. Do not resize. Do not use `next/image` (current UI is `<img>` / Radix `AvatarImage`).

- **Columns.** No schema change. `venues.logo_image_url` and `groups.image_url` remain `varchar(255)` nullable. Root-relative media URLs fit. Do not store Tigris URLs or credentials.

- **Clear / delete.** Clear: `DeleteObject` then null the column (existing error copy). Empty-Group delete: best-effort remove then existing DB delete. Soft-archive unchanged.

- **Cutover.** No object copy. No row rewrite. Leftover Supabase URLs render until they fail or the writer replaces/clears.

- **Env.** Remove `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_VENUE_LOGOS_BUCKET`, `SUPABASE_GROUP_IMAGES_BUCKET` from `env.js`, `.env.example`, `turbo.json`, Cloud `install.sh`, `AGENTS.md`. Add the AWS SDK names above. Placeholders when unset (valid URL endpoint, non-empty keys, bucket name `customizable-pannier-xnbsgm`, region `auto`). Ticket 01 may keep Group’s `SUPABASE_*` until ticket 02 so Group does not go dark mid-slice; ticket 02 must remove every `SUPABASE_*` and the Supabase client.

- **Package.** Add `@aws-sdk/client-s3` on the App. Remove `@supabase/supabase-js` in ticket 02. Do not add `@aws-sdk/s3-request-presigner`.

- **tRPC.** Procedure keys, Zod inputs, Operator vs `assertGroupApprover` + freeze, and return `{ id, logoImageUrl | imageUrl }` stay. Doors keep calling storage modules.

- **UI.** No new screens. Venue detail copy/comments that say “public URL” / ADR-0006 public catalog URL should stop claiming a public bucket; behaviour (file input, preview `<img>`, clear confirm) stays. `EntityMonogram` already accepts any string `src` including root-relative paths.

- **ADR.** Ticket 02 adds `docs/adr/0016-railway-bucket-venue-and-group-images.md` and marks ADR-0006 and ADR-0015 superseded by 0016. Do not amend 0006 into generic entity images.

- **Ticket 01 vs 02.** 01 lands AWS env (alongside Group Supabase if needed), shared S3 helper, Venue module + Venue GET route, Venue magic-byte tests, Operator upload/clear/display. 02 switches Group module + Group GET route, fixture URLs, empty-Group delete still mocked, drops Supabase, writes ADR-0016, updates Cloud docs to Railway-only.

## Testing Decisions

### What a good test is

Test external behaviour: file type/size still rejected before storage; upload/clear still persist the URL the storage module returns; that URL matches the App media shape; GET returns bytes/headers for a valid UUID and 404s otherwise; Group/Venue permissions and freeze unchanged; App still typechecks without live AWS keys in CI. Do not hit a real bucket. Do not assert CSS. Prefer Vitest. Do not add Playwright or a new runner.

### Test seams

Highest seam (two, matching the tickets): (1) Operator Venue logo upload stores an App media URL and Venue GET would serve that object; clear nulls; Community/Game still receive the column; (2) Group approver upload/clear/delete-with-failed-remove behave as today with App media URLs; Supabase client and env are gone.

If you implement this spec, you implement these seams:

- Magic-byte and 2 MB helpers still reject empty, oversize, and mismatched types (Group tests stay; add Venue equivalents)
- `uploadLogo` / `uploadImage` still call storage after auth and persist whatever URL storage returns
- Storage upload (unit, mocked S3) returns `/api/media/venue-logos/{uuid}/logo?v=` / `/api/media/group-images/{uuid}/image?v=`
- PGLite fixtures use that URL shape instead of `example.supabase.co`
- `clearLogo` / `clearImage` still null after successful remove; Group frozen/FORBIDDEN unchanged
- `deleteGroup` still deletes when remove throws
- GET handler: invalid id → 404; missing object → 404; mocked object → 200, content type, long cache; do not require a session
- `app-router-shape` procedure keys unchanged
- `@supabase/supabase-js` has no App importers after ticket 02
- Existing Group list/`byId` suites stay green
- Manual (real AWS keys + bucket): Operator upload then see Community home and Game venue card; Group create with image then see Group home and hub; replace shows new file; clear/remove returns to initials; Cloud placeholders still boot `/login`

Approving this spec approves these seams.

### Prior art

- `group-images.test.ts` magic-byte/size
- `groups/uploadImage.test.ts`, `clearImage.test.ts`, `delete.test.ts` (mock storage module)
- Venue `uploadLogo` / `clearLogo` (no PGLite suite today — do not invent a full Operator PGLite suite just to move the function)
- `EntityMonogram` image + initials
- Cloud `install.sh` placeholder pattern for boot-without-live-keys
- Webhook route as the pattern for an App GET/POST that skips Clerk protect

## Out of Scope

- Migrating or deleting historical Supabase objects or rows
- Deleting, renaming, or recreating the Railway bucket
- Clerk / Temba User photos
- Community logos; Coach `imageUrl` paste
- Open Graph; Invite-link `/gr/{code}` / `/g/{code}` images
- Cropper; GIF, SVG, AVIF; files over 2 MB; URL paste
- Browser presigned POST; public Railway buckets; Vercel Blob
- A generic Storage Package or multi-entity blob API
- Changing who may upload or clear
- Changing tRPC keys or adding domain-verb twins
- Showing logos on the Operator Venues list
- Janitor for orphan objects
- SSE, versioning, object lock, lifecycle (unsupported on Railway)
- Private networking to the bucket

## Further Notes

- Feature slug `railway-bucket-storage`.
- Railway: bucket egress free; **App service egress is billed** when the GET proxy streams bytes. Mitigation: long cache + `v` bust, skip Clerk on the route, small catalog files. If cost later dominates, a redirect-to-presign can be a follow-up without changing stored path prefixes.
- JS AWS SDK must be given `endpoint` and `Bucket` explicitly; do not assume the CLI’s `AWS_ENDPOINT_URL` is auto-wired.
- `RAILWAY_BUCKET_NAME` is the display name; use `AWS_S3_BUCKET_NAME` / `BUCKET`.
- Ticket 01 is demoable on Venue detail + Community home with live keys. Ticket 02 is demoable on Groups hub / Group home and is the cutover that removes Supabase.

## Implementation tickets

Published to Linear. Frontier is [TEM-237](https://linear.app/temba-app/issue/TEM-237/switch-venue-logos-to-the-railway-bucket-and-app-media-urls).

1. [TEM-237](https://linear.app/temba-app/issue/TEM-237/switch-venue-logos-to-the-railway-bucket-and-app-media-urls) Switch Venue logos to the Railway bucket and App media URLs — unblocked.
2. [TEM-238](https://linear.app/temba-app/issue/TEM-238/switch-group-images-to-the-railway-bucket-and-remove-supabase-storage) Switch Group images to the Railway bucket and remove Supabase Storage — blocked by TEM-237.
