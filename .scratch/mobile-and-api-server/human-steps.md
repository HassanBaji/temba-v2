# Steps that need a person

Agents skipped these while implementing `spec.md`. Each entry says what to do and which ticket it belongs to. Check an item off when it is done.

## Settings and access

- [ ] **TEM-294.** Change the deployment's root directory to `apps/web`. Production builds from this branch fail until it changes.
- [ ] **TEM-296.** Commit `.scratch/mobile-and-api-server/ci.yml` as `.github/workflows/ci.yml`. The agent's GitHub token lacks the `workflow` scope. Then make the `gate` job a required check.
- [ ] **TEM-309.** Set `WEB_ORIGIN` (for example `https://app.temba.example`, the public origin of the web App, no trailing slash) in every deployment environment of the web App. The App fails env validation without it. Invite links point at it. Local `.env` files need `WEB_ORIGIN="http://localhost:3000"` (copied from `apps/web/.env.example` on fresh installs).
- [ ] **TEM-310.** Agree the freeze window for the server tree move (spec risk R1) and merge pull request 131 only inside it, with no other open pull requests against `apps/web/src/server`. Any pull request still open against that path must be rebased onto the new `packages/api/src` paths (imports use `#src/...`). After the merge, run `pnpm install` once so `@repo/api` is linked.
- [ ] **TEM-311.** Copy `apps/api/.env.example` to `apps/api/.env` and fill `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` (the same value as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the web App), `CLERK_WEBHOOK_SIGNING_SECRET`, `DATABASE_URL`, `WEB_ORIGIN` and the five `AWS_*` variables. `pnpm dev:web` runs web and API together and reads this file.

## TEM-312: deploy the API to Railway (ready-for-human, skipped by agents)

Nothing calls the API yet, so this deploy changes nothing users see. TEM-313, TEM-314 and TEM-323 were built and checked against `apps/api` running locally; their checks against the deployed API wait on this section.

- [ ] **TEM-312.** In the Railway project that holds the Postgres database and the Bucket, create a service named `api` from this repository, with two environments: `staging` and `production`.
- [ ] **TEM-312.** Configure the service build for the Workspace (root directory: the repository root, not `apps/api`, because the build needs the Workspace Packages):
  - Node 22, pnpm `10.13.1` (from `packageManager` in the Root `package.json`).
  - Build command: `pnpm install --frozen-lockfile && pnpm exec turbo run build --filter api`
  - Start command: `pnpm --filter api start` (runs `node dist/index.js` in `apps/api`).
  - Health check path: `/healthz`. Restart policy: on failure.
  - Watch paths, if used: `apps/api/**`, `packages/**`, `pnpm-lock.yaml`.
- [ ] **TEM-312.** Set these variables in both environments (validated by `apps/api/src/env.ts`, documented in `apps/api/.env.example`):
  - `PORT`: leave to Railway (it injects one). The App defaults to 4000.
  - `DATABASE_URL`: reference the Postgres service's private URL (for example `${{Postgres.DATABASE_URL}}`), the same database the web App uses in that environment.
  - `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`: the same Clerk instance as the web App in that environment (`CLERK_PUBLISHABLE_KEY` equals the web App's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
  - `CLERK_WEBHOOK_SIGNING_SECRET`: the same secret the web App's `/api/webhooks` uses today (the webhook URL does not change until TEM-318).
  - `WEB_ORIGIN`: the public origin of the web App in that environment, no trailing slash. Invite links are built from it.
  - `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION`: reference the Railway Bucket (ADR-0016), the same values the web App uses.
  - Do not set `SKIP_ENV_VALIDATION`.
- [ ] **TEM-312.** Do not run migrations from the API service. The web App's deploy (and `pnpm exec turbo run db:migrate`) still owns them; apply any pending migration (for example `0048` from TEM-302) before the API deploy reads the new column.
- [ ] **TEM-312.** After each deploy, run these checks against both environments (`API=https://<api domain>`):
  - `curl -i "$API/healthz"` returns 200 with body `ok`.
  - Public procedure without a token: `curl -s "$API/api/trpc/games.previewInviteLink?input=%7B%22json%22%3A%7B%22token%22%3A%22unknown-token%22%7D%7D"` returns 200 with `"status":"invalid"`.
  - Protected procedure without a token: `curl -s -o /dev/null -w "%{http_code}" "$API/api/trpc/users.home"` returns 401.
  - Unknown image: `curl -s -o /dev/null -w "%{http_code}" "$API/api/media/group-images/00000000-0000-4000-8000-000000000000/image"` returns 404.
  - Bad webhook: `curl -s -o /dev/null -w "%{http_code}" -X POST -d '{}' "$API/api/webhooks"` returns 400.
  - Same payload as the web App for five read procedures, for one signed-in User. Get a token in the web App's browser console with `await window.Clerk.session.getToken()`, then for each of `users.home`, `ratings.me`, `games.listMyGames`, `groups.mine` and `users.profileStats` compare `curl -s -H "Authorization: Bearer $TOKEN" "$API/api/trpc/<procedure>"` with `curl -s -H "Cookie: __session=$TOKEN" "$WEB/api/trpc/<procedure>"`. The tokens last about 60 seconds, so fetch a fresh one per pair. The JSON bodies must match.
  - Restart the service from the Railway dashboard and confirm `/healthz` answers 200 again with no crash loop in the logs.
- [ ] **TEM-312.** Record the staging and production API origins in the web App's environment notes and set `API_ORIGIN` on the deployed web App in each environment (no trailing slash; the web App fails env validation without it since TEM-313). TEM-314 may reuse it as the proxy target.

## TEM-313 web reads through the API

- [ ] **TEM-313.** Set `API_ORIGIN` (server-only, validated in `apps/web/src/env.js`) on the web App in staging and production to the API origin from TEM-312, and redeploy the web App. Until it is set the Game and Group short-link pages and the dashboard fail env validation. Cloud agents get `http://localhost:4000` from `.cursor/install.sh`, but `pnpm --filter web dev` needs `apps/api` running too (`pnpm --filter api dev`).
- [ ] **TEM-313.** With a real signed-in Clerk user, check against the web App wired to a running API: a new User opening `/dashboard` is redirected to `/onboarding?redirect_url=...` with the return path preserved, and a User whose `user` row does not exist yet sees the waiting state, not an error. Unverified until done (needs Clerk users and a session token forwarded as `Authorization: Bearer`).
- [ ] **TEM-313.** Against the deployed API, `curl` a signed-out `$WEB/g/<code>` and `$WEB/gr/<code>` with a real short code and check the HTML has the Open Graph title and description. Verified locally only.

## TEM-314 web proxy and router switch

- [ ] **TEM-314.** With a real signed-in Clerk user, run `pnpm --filter api dev` and `pnpm --filter web dev`, add one router (for example `"venues"`) to `REMOTE_ROUTERS` in `apps/web/src/trpc/remote-routers.ts`, open a page that calls it, and check the browser network panel: that router's calls go to `/api/remote/trpc/...` with an `authorization: Bearer` header and return 200, and other routers still go to `/api/trpc/...`. Open a page whose single batch mixes a listed and an unlisted router and check both resolve. Remove the router from the list and check calls return to `/api/trpc`. Revert the list to empty afterwards. Signed-in behaviour is unverified until done (only the unauthenticated rewrite was checked with curl).
- [ ] **TEM-314.** `API_ORIGIN` must be set at web build time as well as run time: the `/api/remote/:path*` rewrite in `apps/web/next.config.js` is baked into the build. Confirm it is set in the build environment of staging and production.

## Deploys and migrations

- [ ] **TEM-302.** Apply migration `0048` when deploying.

## Verification agents could not run

- [ ] **TEM-294 to TEM-308.** Run both Playwright flow recordings (`record:flows`, `record:knockout`) against a seeded database with Clerk test users.
- [ ] **TEM-300, TEM-301, TEM-302.** Check the changed pages in a browser: win rate, Game times in `Asia/Bahrain`, and prices in fils.
- [ ] **TEM-309.** With real Clerk users and a bucket, check that an Operator can still open Venues and a non-Operator is refused, that a newly created Invite link starts with `WEB_ORIGIN`, that Group image and Venue logo upload and display still work, and that a new User is still redirected to the Onboarding questionnaire.
- [ ] **TEM-310.** Run both Playwright flow recordings (`pnpm --filter web record:flows`, `pnpm --filter web record:knockout`) against a database seeded with `pnpm --filter @repo/api db:seed` and Clerk test users (`RECORD_USERNAME`, `RECORD_PASSWORD`). Until then the claim "both flow recordings pass" is unverified. The scripts now import their router functions from `@repo/api/routers/...`.
- [ ] **TEM-311.** Compare payloads for a real signed-in User. Get a session token from a signed-in browser (`await window.Clerk.session.getToken()` in the console), then run `curl -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/trpc/users.home"` and the same against `http://localhost:3000/api/trpc/users.home` (web needs the token as the `__session` cookie: `-H "Cookie: __session=$TOKEN"`). The JSON bodies must match. Unverified until done.
- [ ] **TEM-311.** With real bucket keys in `apps/api/.env`, upload a Group image in the web App, then `curl -i http://localhost:4000/api/media/group-images/<groupId>/image` must return 200 with `Cache-Control: public, max-age=31536000, immutable`. Tests cover this with the storage client mocked only.
- [ ] **TEM-311.** Point a Clerk webhook endpoint at `<api origin>/api/webhooks` with `CLERK_WEBHOOK_SIGNING_SECRET` and send a test `user.created` event to confirm a 200. Tests cover only the bad-signature 400.
