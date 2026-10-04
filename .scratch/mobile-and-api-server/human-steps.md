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
  - `WEB_ORIGIN`: the public origin of the web App in that environment, no trailing slash. Invite links are built from it. Since TEM-320 it is also the allowed `azp` party of session tokens, so it must equal the origin browsers load the web App from.
  - Optional since TEM-320: `AUTHORIZED_PARTIES` (comma separated extra web origins, for example a preview domain), `CLERK_JWT_KEY` (the instance's PEM public key from the Clerk dashboard, API keys, Show JWT public key; skips the JWKS fetch), and `ACCEPT_SESSION_COOKIE` (leave unset; `true` is the one-release rollback).
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

## TEM-315 venues and teams cutover

- [ ] **TEM-315.** With real signed-in Clerk users, `API_ORIGIN` set at web build and run time, and `pnpm --filter api dev` plus `pnpm --filter web dev` running, open `/venues` (or any page that loads Venues or Teams) and check the browser network panel: `venues.*` and `teams.*` calls go to `/api/remote/trpc/...` with an `authorization: Bearer` header and return 200, while other routers (for example `users.home`) still go to `/api/trpc/...`.
- [ ] **TEM-315.** As an Operator, open the Venues pages in the web App and list, create, edit and archive a Venue, then add, edit and remove Courts on it. Unverified until done.
- [ ] **TEM-315.** As a User, create a Team, invite the second seat (open the invite link as another User), and dissolve the Team. Unverified until done.
- [ ] **TEM-315.** Rollback check: remove `"venues"` and `"teams"` from `REMOTE_ROUTERS` in `apps/web/src/trpc/remote-routers.ts` and confirm those calls return to `/api/trpc`.

## TEM-316 communities and groups cutover

- [ ] **TEM-316.** With real signed-in Clerk users, `API_ORIGIN` set at web build and run time, and `pnpm --filter api dev` plus `pnpm --filter web dev` running, open a Community page and a Group page and check the browser network panel: `communities.*` and `groups.*` calls go to `/api/remote/trpc/...` with an `authorization: Bearer` header and return 200, while other routers (for example `users.home`) still go to `/api/trpc/...`.
- [ ] **TEM-316.** As real Users, check a Community: create, join, request to join, approve the request, invite (open the link as another User), Soft-archive, and leave. Unverified until done.
- [ ] **TEM-316.** As real Users, check a Group: create, join, send a Group join request, check Standing, upload a Group image (needs real `AWS_*` bucket keys in `apps/api/.env`, and the image must display through `/api/media/group-images/...`), and leave. Unverified until done.
- [ ] **TEM-316.** Create a new Community Invite link and a new Group Invite link in the web App and check each URL starts with `WEB_ORIGIN` of the API (not the API origin). The Group link is covered by a host test with a stubbed authenticator; the Community link and the signed-in path are unverified.
- [ ] **TEM-316.** Rollback check: remove `"communities"` and `"groups"` from `REMOTE_ROUTERS` in `apps/web/src/trpc/remote-routers.ts` and confirm those calls return to `/api/trpc`.

## TEM-317 ratings, users and games cutover

- [ ] **TEM-317.** With real signed-in Clerk users, `API_ORIGIN` set at web build and run time, and `pnpm --filter api dev` plus `pnpm --filter web dev` running, browse Home, a Game and a Profile and check the browser network panel: no tRPC call goes to `/api/trpc/...`; every `ratings.*`, `users.*` and `games.*` call goes to `/api/remote/trpc/...` with an `authorization: Bearer` header and returns 200. Unverified until done.
- [ ] **TEM-317.** As real Users, create a Game, register, score, confirm, and see the Rating move. Unverified until done.
- [ ] **TEM-317.** As real Users, draw a Friendly tournament, post it, play it and finish it. Unverified until done.
- [ ] **TEM-317.** Open Home and Profile, and complete the Onboarding questionnaire as a new User. Unverified until done.
- [ ] **TEM-317.** Run both Playwright flow recordings (`pnpm --filter web record:flows`, `pnpm --filter web record:knockout`) against the proxied setup (API and web running, database seeded with `pnpm --filter @repo/api db:seed`, `RECORD_USERNAME` and `RECORD_PASSWORD` for Clerk test users). Unverified until done.
- [ ] **TEM-317.** Rollback check: remove `"ratings"`, `"users"` and `"games"` from `REMOTE_ROUTERS` in `apps/web/src/trpc/remote-routers.ts` and confirm those calls return to `/api/trpc`.

## TEM-318 media and webhook cutover

- [ ] **TEM-318.** `/api/media/:path*` and `/api/webhooks` are rewritten to `API_ORIGIN` by `beforeFiles` rewrites in `apps/web/next.config.js` (paths listed in `REMOTE_PATHS` in `apps/web/src/trpc/remote-paths.js`). `API_ORIGIN` must be set at web build time and run time (the rewrites are baked into the build). With the API deployed, set `API_ORIGIN` to its public origin in the web App's build and runtime environment.
- [ ] **TEM-318.** Clerk dashboard, Webhooks: keep the endpoint at `<web origin>/api/webhooks` (the web App now forwards it to the API), or point it straight at `<api origin>/api/webhooks`. Either way the API needs the endpoint's signing secret as `CLERK_WEBHOOK_SIGNING_SECRET` in its environment. Send a test `user.created` event and confirm a 200.
- [ ] **TEM-318.** With real `AWS_*` bucket keys in the API environment, open a Group and a Venue that already have an image or logo and confirm they render from `/api/media/group-images/...` and `/api/media/venue-logos/...` with no data change. Upload a new Group image and a new Venue logo and confirm each replaces the old one. Unverified until done (checked locally only: an invalid id returns 404 and an unreachable bucket returns 502, both from the API).
- [ ] **TEM-318.** Sign up as a new User and confirm a Temba User row appears through the webhook and the Onboarding questionnaire opens. Unverified until done.
- [ ] **TEM-318.** Rollback check: set `REMOTE_PATHS` in `apps/web/src/trpc/remote-paths.js` to `[]`, rebuild, and confirm media and the webhook are answered by the web route handlers again. The handlers stay until TEM-319.

## TEM-319 web App stops being a backend

- [ ] **TEM-319. HOLD BACK: do not let this commit reach production until the routers have been remote in production for one week with no rollback** (spec Phase 3 task 5). The commit subject is `feat: TEM-319 drop the web App's API handlers, database and bucket access`. Every ticket so far is on pull request 131, so a person must either hold this commit back from that merge (for example revert it on the branch before merging, then re-apply it a week later) or accept skipping the soak. Reverting it restores the in-process handlers, `REMOTE_ROUTERS` and `REMOTE_PATHS`.
- [ ] **TEM-319.** After this commit, the web App deployment no longer needs `DATABASE_URL`, `CLERK_WEBHOOK_SIGNING_SECRET` or the five `AWS_*` variables. Remove them from the web App's Railway/hosting environments once the API serves everything. It does need `API_ORIGIN` (the public API origin) in every environment, and the deployment must be able to reach it.
- [ ] **TEM-319.** The rollback steps in the TEM-314 to TEM-318 sections that edit `REMOTE_ROUTERS` or `REMOTE_PATHS` no longer apply after this commit: those files are deleted. Rollback is reverting this commit.
- [ ] **TEM-319.** Migrations: the web deploy no longer holds `DATABASE_URL`, so run `pnpm exec turbo run db:migrate` from a person's machine or a release step with `DATABASE_URL` set (the Drizzle config lives in `packages/db`).
- [ ] **TEM-319.** With real Clerk users, a bucket and a seeded database, through `pnpm dev:web`: sign up, upload a Group image, create a Game, score it, confirm it and check the Rating moved. Unverified until done.
- [ ] **TEM-319.** Run both Playwright flow recordings (`pnpm --filter web record:flows`, `pnpm --filter web record:knockout`) against the proxied setup. Unverified until done. The scripts still import `@repo/db`, `drizzle-orm` and `@repo/api` (exempt from the lint rule), so `apps/web/package.json` keeps them as dev dependencies.
- [ ] **TEM-319.** If the Clerk webhook endpoint still points at `<web origin>/api/webhooks`, it is now forwarded to the API by the single `/api/:path*` rewrite; no Clerk change is needed. Pointing it straight at `<api origin>/api/webhooks` is optional.

## TEM-322: Sign in with Apple on web (ready-for-human, skipped by agents)

Not implemented: the ticket needs an Apple Developer Program membership and Clerk dashboard access. TEM-328 (mobile sign-in) depends on it; its Apple button can only be checked once these steps are done.

- [ ] **TEM-322.** Enrol the business in the Apple Developer Program and note the Team ID.
- [ ] **TEM-322.** In Certificates, Identifiers & Profiles:
  - Create (or reuse) the App ID for the iOS App with the "Sign in with Apple" capability. Use the bundle identifier the Mobile App will ship with.
  - Create a Services ID for the web (for example `<reverse-domain>.web`) with "Sign in with Apple" enabled. Add the web domains (production and staging web origins, and the Clerk Frontend API domain), and add the return URL that the Clerk dashboard shows for Apple (`https://<clerk frontend api>/v1/oauth_callback`).
  - Create a "Sign in with Apple" private key, download the `.p8` file once, and note its Key ID.
- [ ] **TEM-322.** In the Clerk dashboard, for the development instance and then the production instance, open SSO connections, add Apple, and enter the Services ID, Team ID, Key ID and the `.p8` private key (development may use Clerk's shared credentials). Keep Google enabled.
- [ ] **TEM-322.** Then add the button in code (a person or a later agent run, once Clerk is configured): in `apps/web/src/components/auth/oauth-buttons.tsx` add `{ strategy: "oauth_apple", label: "Continue with Apple", Icon: <Apple logo> }` to `ENABLED_OAUTH_PROVIDERS` beside Google and remove the comment that says Apple is not configured. The button follows Apple's Human Interface Guidelines for Sign in with Apple (black button, white Apple logo, "Continue with Apple") and the auth screen design (hairline, no shadow). The same component is used by sign-in and sign-up; check that `sign-up-continue-form.tsx` still collects a missing phone number for an Apple sign-up (Apple may share a private relay email and no phone).
- [ ] **TEM-322.** Verify on staging: a new User signs up with Apple, gives a phone number on the continue step, gets a Temba User row through the Clerk webhook and reaches the Onboarding questionnaire; an existing User signs in with Apple; Google sign-in still works.

## TEM-323: iPhone prototype (ready-for-human, skipped by agents)

Not done: the spike needs a real iPhone, an Android emulator and a reachable API with a real Clerk session. TEM-324 and TEM-325 were built without its answers. Each agent took the choice the spec names first and its stated fallback only where the first choice demonstrably failed in the container, and recorded the choice in its own section of this note. Confirm or overturn those choices with this spike.

- [ ] **TEM-323.** On a real iPhone, with a throwaway Expo app in the Workspace (do not merge it), answer the five questions from spec Phase 5 task 1 and write each answer into the `## Comments` section of `.scratch/mobile-and-api-server/spec.md`:
  1. Which NativeWind version (v5 on Tailwind v4, or v4 with a JavaScript preset) works with the pinned Expo SDK and the generated tokens. Record the NativeWind and Expo SDK versions.
  2. Whether the custom `ArchivoExpanded-Bold` (width 115, weight 700) instance and the static Archivo weights render with tabular figures (`fontVariant: ['tabular-nums']`). If 115 looks wrong or loses `tnum`, fall back to the stock 112.5 file (spec risk R4).
  3. Whether the SVG `Hatch` scrolls smoothly with 50 rows of ten hatched slots. If not, the fallback is a pre-rendered tile image per tone (spec 4.4).
  4. Whether a tRPC call with a Clerk session token from the Expo SDK reaches the local API (`pnpm dev:web` on the laptop, phone on the same network).
  5. Whether Expo installs and runs cleanly under pnpm's default linker, or the Workspace needs `node-linker=hoisted` in `.npmrc` (spec risk R11; if it does, land that change alone with a full web gate run).
- [ ] **TEM-323.** Take a side-by-side photo or screenshot comparing the expanded numerals and the hatch on the phone with `/dashboard/design/home` on web, and attach it to the spec Comments.
- [ ] **TEM-323.** Build and launch the spike once in an Android emulator (build and launch only).
- [ ] **TEM-323.** Delete the spike code. Nothing from it is merged.

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

## TEM-320 API accepts bearer tokens only

- [ ] **TEM-320.** Deploy the API before the web App. `WEB_ORIGIN` on the deployed API must equal the origin of the deployed web App (it is now checked against the token's `azp`). Add `AUTHORIZED_PARTIES` for any other web origin that calls the API. Optionally set `CLERK_JWT_KEY`. Until then, a mismatch makes every web call return 401.
- [ ] **TEM-320.** Cookie-only check against the deployed API (`API=https://<api domain>`): `curl -s -o /dev/null -w "%{http_code}" -H "Cookie: __session=$TOKEN" "$API/api/trpc/users.home"` returns 401, and the same URL with `-H "Authorization: Bearer $TOKEN"` returns 200 (`TOKEN` from `await window.Clerk.session.getToken()` in the web App's console, fetched fresh, valid about 60 seconds). Checked locally only with no token and a forged cookie.
- [ ] **TEM-320.** With a real signed-in Clerk user, `pnpm --filter api dev` and `pnpm --filter web dev` running, use the web App end to end, including the Operator Venue pages (list, create, edit, archive). Open the network panel: every call carries `authorization: Bearer` and returns 200. Unverified until done.
- [ ] **TEM-320.** Operator Clerk-call count: in the Clerk dashboard (or the API logs) confirm one Operator procedure call causes one `GET /v1/users/{id}`. Covered by a unit test with a stubbed Clerk client only.
- [ ] **TEM-320.** Expo token check on a Clerk development instance: from a throwaway Expo app signed in with the Clerk Expo SDK, `const token = await getToken()`, then `curl -s -w " %{http_code}\n" -H "Authorization: Bearer $token" "http://localhost:4000/api/trpc/users.home"` against the local API (or the staging API) returns 200 and the same User's data. Unverified until done; the tests only use locally signed tokens.
- [ ] **TEM-320.** Rollback, if the web App breaks after deploy: set `ACCEPT_SESSION_COOKIE=true` on the API and restart. Remove the flag and `withoutCookies` handling in `apps/api/src/context.ts` in the release after.

## TEM-321 shared phone and auth-error helpers

- [ ] **TEM-321** In a browser with real Clerk users, run the web sign-in and sign-up forms (`/login`, `/signup`, including the continue step): confirm the phone field, and that a wrong identifier, wrong code and too-many-attempts error show the same messages as before. Until then, form behaviour is verified only by unit tests.

## TEM-324 design tokens feed the web theme

- [ ] **TEM-324** Compare screenshots of `/dashboard/design/home`, `/dashboard/design/game-details` and `/dashboard/design/tournament` on the commit before and the commit after, signed in with a real Clerk user (Playwright browsers and seeded Clerk users were not available to the agent). Until done, "no visual change" is proven only by the emitted CSS: the built stylesheet differs from the previous build in declaration order, and in `--muted`, `--secondary`, `--accent` and `--input`, which moved from `oklch(0.97 0 0)` / `oklch(0.64 0 0)` to `#f5f5f5` / `#8c8c8c` (under 0.1/255 apart).
- [ ] **TEM-324** No NativeWind output is generated yet. When TEM-323's result is known, confirm NativeWind v5 (the spec's first option, which consumes `packages/design-tokens/theme.css`) or switch to a v4 preset generated from `packages/design-tokens/src/tokens.ts`. Mobile work stays blocked on this choice.

## TEM-325 Expo App scaffold (choices made without TEM-323's answers)

TEM-323's iPhone spike has not been run, so the agent made each prototype choice below, with the container evidence. Confirm or overturn them on a phone. Nothing here was run on a device or an emulator.

Choices and evidence:

- **TEM-325. Expo SDK 57** (`expo ~57.0.26`, React Native `0.86.3`, React `19.2.3`, `expo-router ~57.0.24`), the current stable SDK on 2026-10-04. Dependency versions come from the SDK's `bundledNativeModules.json`. `pnpm install` resolves `react-native-gesture-handler` and `react-native-reanimated` as expo-router peers at versions newer than the SDK list (`3.3.0` and `4.7.1`, SDK list: `~2.32.0` and `4.5.1`); neither is a direct dependency yet. Run `pnpm --filter mobile exec expo install --check` on a machine with a phone and add them to `apps/mobile/package.json` at the SDK versions when a screen first uses gestures or animation.
- **TEM-325. NativeWind v5** (`nativewind 5.0.0-rc.0`, `react-native-css 3.1.0-rc.0`, Tailwind v4) consuming `@repo/design-tokens/theme.css` from `apps/mobile/global.css`. It installed, typechecked and bundled for iOS and Android with `expo export` (the v4 fallback was not needed). Two settings were needed: `lightningcss` pinned to exactly `1.30.1` (1.30.2 is refused by react-native-css and 1.33 fails to deserialize), and `inlineRem: 16` in `apps/mobile/metro.config.js` so `rem` tokens match the web (react-native-css defaults to 14). The rc could change before release; the NativeWind v4 plus generated JavaScript preset path (spec D8) stays the fallback if v5 misbehaves on a phone.
- **TEM-325. pnpm default linker kept.** Expo installed, typechecked and bundled with no `node-linker=hoisted` and no `.npmrc` change, so spec risk R11 did not trigger.
- **TEM-325. Fonts** are in `apps/mobile/assets/fonts`: static `Archivo-Regular/Medium/SemiBold/Bold` (width 100, weights 400, 500, 600, 700), the custom `ArchivoExpanded-Bold` (width 115, weight 700) and `GeistMono-Regular`, embedded through the `expo-font` config plugin in `apps/mobile/app.json`. The Archivo cuts come from `@fontsource-variable/archivo@5.3.0` (the Latin subset of Archivo, GitHub raw downloads are blocked in the container) with fontTools `instancer`; re-run them with `python3 apps/mobile/scripts/cut-fonts.py <Archivo variable font>`. Checked with fontTools: no `fvar` table remains in any cut, and `tnum` is kept in every cut. Only the Latin subset is bundled; if the App ever needs Arabic or Latin Extended characters, re-cut from the full variable font from Google Fonts. Each cut's PostScript name equals its file name so `fontFamily: "ArchivoExpanded-Bold"` should resolve on iOS and Android.
- **TEM-325. Font licence check.** Archivo (copyright "The Archivo Project Authors") and Geist Mono are both under the SIL Open Font License 1.1, copied to `apps/mobile/assets/fonts/Archivo-OFL.txt` and `GeistMono-OFL.txt`. Neither copyright notice declares a Reserved Font Name (the licence's only "Reserved Font Name" text is its definition), so the OFL lets a modified instance keep the name. The family is nevertheless named `Archivo Expanded` (file `ArchivoExpanded-Bold`), which also avoids passing a width-115 cut off as stock Archivo. The fonts are bundled, not sold on their own, and the licence files ship with them. Confirm no Reserved Font Name appears in the upstream repository's `OFL.txt` if the business wants a second opinion.
- **TEM-325. Bundle identifier `app.temba.mobile`** (iOS and Android) is a placeholder in `apps/mobile/app.json`. Change it to the identifier registered for Sign in with Apple (TEM-322) before any device build.

Steps for a person:

- [ ] **TEM-325.** Create `apps/mobile/.env` from `apps/mobile/.env.example`: set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the Clerk development publishable key (the value of `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/web/.env`). Leave `EXPO_PUBLIC_API_ORIGIN` empty for local work. Without the key the App throws at start.
- [ ] **TEM-325.** Launch on an iPhone: with `apps/api/.env` filled, run `pnpm dev` at Root (web on 3000, API on 4000, Expo on 8081), open Expo Go on a phone on the same network and scan the QR code (or run a development build with `pnpm --filter mobile exec expo run:ios`). Check the App launches and the placeholder screen shows `API replied: invalid`, which proves a public procedure (`games.previewInviteLink`) reached the local API with no env edits (the App derives `http://<laptop LAN IP>:4000` from the Expo dev server host). If the phone cannot reach it, check the laptop firewall allows ports 4000 and 8081, and that the phone is not on a guest network. Unverified until done.
- [ ] **TEM-325.** On the phone, check the placeholder screen: the large `1,234.56` is the expanded bold (width 115), the four lines below are Regular, Medium, SemiBold and Bold, digits line up in a column (tabular figures; if the lines do not align, the `tabular-nums` class did not become `fontVariant: ['tabular-nums']` and the `Text` primitive in TEM-326 must set it directly), and the eyebrow is Geist Mono. Compare the numerals with `/dashboard/design/home` on web (answers TEM-323 question 2; if 115 looks wrong or loses `tnum`, use the stock 112.5 file, spec risk R4). Unverified until done.
- [ ] **TEM-325.** Android: with an emulator running, `pnpm --filter mobile exec expo run:android` (needs Android Studio, the SDK and a JDK), or press `a` in the Expo dev server. Check the App builds and launches. Both platforms only bundled with `expo export` in the container. Unverified until done.
- [ ] **TEM-325.** The Expo dev server tried to install React Native DevTools in the root container and failed (Electron refuses to run as root). That is a container effect, not a scaffold fault; confirm `pnpm dev` is clean on a normal user account.
- [ ] **TEM-325.** After the checks above, write NativeWind and Expo versions, the font result and the `node-linker` answer into the `## Comments` section of `spec.md` (they answer TEM-323 questions 1, 2, 4 and 5).

## TEM-326 mobile primitives gallery

Open the gallery on a phone with `pnpm --filter mobile dev` (Expo dev server on port 8081), then open the `/gallery` route (the Home placeholder links to it in development only). In a release build the route redirects to `/`. Compare it with `/dashboard/design/home` in the web App (`pnpm --filter web dev`, development only).

- [ ] **TEM-326.** Compare the gallery's hatch swatches, result marks, form slots and type samples with the `HatchSwatches` panel, the recent-form row and the type scale on `/dashboard/design/home`, side by side, on both the paper and the ink Surface. The pattern angle, 1 px line and 5 px period must look the same. Unverified until done (only the bundle, typecheck, lint and unit tests ran in the container).
- [ ] **TEM-326.** With VoiceOver on, swipe through the gallery and check the Hatch swatches are skipped, the result marks and form slots read Won, Lost, Draw or Not played, and the buttons read their labels. Unverified until done.
- [ ] **TEM-326.** Turn on Settings, Accessibility, Motion, Reduce Motion, reopen `/gallery` and check the progress fill and the Level line render complete with no animation; turn it off and check both animate once on mount and the skeleton pulses. Unverified until done.
- [ ] **TEM-326.** In the gallery's Ink section, confirm the buttons are at least 44 points tall (small buttons extend their touch area by hit slop; use the Accessibility Inspector or tap just above and below the small button). To see the one-ink warning, temporarily add a second `Surface tone="ink"` under the `Screen` in `apps/mobile/app/gallery.tsx` and check the Metro log warns; remove it afterwards.
- [ ] **TEM-326.** Open the sheet from the paper section and trigger a toast from a button, and check the sheet shows a scrim and a hairline (no shadow) and the toast reads aloud under VoiceOver.

## TEM-327 web Surface and Hatch share the primitive contract

- [ ] **TEM-327.** In a browser signed in with a seeded Clerk user (`pnpm --filter web dev`, Postgres running), screenshot `/dashboard/design/home` and `/dashboard/design/game-details`, the Game details hero for a Friendly game in each phase (upcoming, ongoing, needs results, final), the Home next-game card, a Tournament hero, the create-game flow header and its loading skeleton (`apps/web/src/app/dashboard/games/new/create-flow-shell.tsx`), and the welcome and a non-welcome auth screen. Compare each with the same page on the commit before TEM-327; they must be identical. The unit test `apps/web/src/components/ui/surface.test.ts` checks the rendered classes only. Screenshot parity stays unverified until done.

## TEM-328 mobile sign-in, sign-up and the Onboarding questionnaire

Built and bundled in the container (`apps/mobile` typecheck, lint, unit tests, `expo export --platform ios`). Every flow below needs a real Clerk user and a phone, so each is unverified until done. The routes are `app/(auth)/*` (welcome, sign-in, sign-up, factor-two, reset-password, continue) and the signed-in area `app/(app)/*`, which renders the Onboarding questionnaire (`src/auth/onboarding-gate.tsx`) instead of its screens until `users.onboardingState` reports it complete. The old placeholder that called `games.previewInviteLink` is gone; the gate's `users.onboardingState` call now proves the API is reachable (supersedes the `API replied: invalid` check under TEM-325).

- [ ] **TEM-328.** The new native modules (`expo-apple-authentication`, `expo-web-browser`, `expo-crypto`, `expo-auth-session`, and the `@clerk/expo` config plugin that adds the Sign in with Apple entitlement) are not in Expo Go. Build a development build: `pnpm --filter mobile exec expo run:ios` (or an EAS development build), then `pnpm dev` at Root. Apple and Google sign-in cannot be tried in Expo Go.
- [ ] **TEM-328.** In the Clerk dashboard (development instance, then production) open Native applications, register the iOS application with the Apple Team ID and bundle identifier `app.temba.mobile` (`ios.bundleIdentifier` in `apps/mobile/app.json`), and enable "Native API". The native Apple and token flows (`oauth_token_apple`) and the Google flow need it. If you change the bundle identifier, change it in `app.json`, in the Apple App ID and here.
- [ ] **TEM-328.** Apple: finish the **TEM-322** steps first (Apple Developer membership, App ID for `app.temba.mobile` with the "Sign in with Apple" capability, Services ID, key, Apple added under SSO connections in Clerk). `app.json` already sets `ios.usesAppleSignIn: true` and the `@clerk/expo` plugin adds the `com.apple.developer.applesignin` entitlement; check the capability is on the App ID so the build signs. The Apple button is shown on iOS only and uses the native Apple sheet. Until TEM-322 is done, tapping it shows a Clerk error and Apple sign-in stays unverified.
- [ ] **TEM-328.** Google: in the Clerk dashboard check Google is enabled for the instance and that the redirect URL `temba://sso-callback` (scheme `temba` from `app.json`) is allowed under Native applications (or the instance's allowed redirect URLs). The browser flow returns to the App through that scheme. If Google shows "redirect_uri mismatch", the allowed redirect list is the cause. Unverified until done.
- [ ] **TEM-328.** On a phone, with `apps/mobile/.env` filled (see TEM-325) and the API running with real keys: sign up with a new username, a real phone number and a password; receive the SMS code; enter it; and check you land on "Step 1 of 2". Wrong code, expired code and too-many-attempts messages must read the same as on web (`packages/domain/src/clerk-auth-error.ts`).
- [ ] **TEM-328.** Onboarding gate: answer Preferred Position, then a Level, and check you reach the signed-in screen. Kill the App mid-way and reopen it: you resume on the unanswered step and cannot reach the signed-in screen. Right after sign-up, before the Clerk webhook has created the `user` row, check the "Setting up your account" wait state opens the questions on its own (poll every 2 seconds), and that after about 20 seconds without the row it offers Try again and Sign out.
- [ ] **TEM-328.** Sign in with the username and password, then with the phone number and password. Check a wrong password and an unknown username show the web messages ("That password is incorrect.", "No account matches that. Try a different one, or create an account.").
- [ ] **TEM-328.** With a User who has an SMS second factor enabled in Clerk, sign in with the password and check the code screen appears, the code completes sign-in, and Resend code unlocks after 30 seconds.
- [ ] **TEM-328.** Password reset: from Sign in, Forgot password, enter the email on a User that has one, enter the emailed code, set a new password, and check you are signed in. A User with no email sees the same Clerk error as on web.
- [ ] **TEM-328.** Google and Apple for a new person: the Continue screen (`app/(auth)/continue.tsx`) asks for exactly the fields Clerk lists as missing (username, phone number, and so on), verifies the phone with a code, then lands on the questionnaire. Apple may share a private relay email and no phone, so check the phone step appears.
- [ ] **TEM-328.** Persistence and sign-out: sign in, force-quit the App, reopen it and check you are still signed in (token cache in the keychain). Tap Sign out on the signed-in screen and check you return to the welcome screen. Then sign in as a different User on the same install and check you see that User's questionnaire state, not the previous User's.
- [ ] **TEM-328.** The Apple button is the standard ink button with the label "Continue with Apple" and no Apple logo glyph. Apple's review guidelines expect the Apple logo on the button; add it (or switch to `AppleAuthenticationButton` from `expo-apple-authentication`) before the App Store build in Phase 7.
- [ ] **TEM-328.** Terms and Privacy Policy: the sign-up and welcome screens name them in plain text. Link them to the web pages once the web App's public origin is known (an `EXPO_PUBLIC_WEB_ORIGIN` variable is not defined yet).

## TEM-329 mobile tab shell

Built and bundled in the container (`apps/mobile` typecheck, lint, unit tests for `src/navigation/tab-list.ts`, `expo export --platform ios`). The tabs are `app/(app)/(home)`, `games`, `groups`, `communities` and `profile`, each with its own stack (`src/navigation/tab-stack.tsx`) and placeholder screen; Sign out moved from Home to Profile. The checks below need a phone and a real Clerk user, so they are unverified until done.

- [ ] **TEM-329.** On a notched iPhone (development build, see TEM-328), sign in and check the tab bar clears the home indicator and the content clears the status bar and notch, in portrait and landscape.
- [ ] **TEM-329.** Check the order Home, Games, Groups, Profile; the active tab's icon and label are ink (icon heavier stroke) and the others are grey; the tab bar has a 1 px top hairline and no shadow. Compare with the web bottom navigation at a phone width.
- [ ] **TEM-329.** Sign in with an account whose Clerk public metadata has `groupCreator: true` (Clerk dashboard, Users, the user, Metadata, Public) and check Communities appears between Groups and Profile; with the flag removed (sign out and in again) it disappears.
- [ ] **TEM-329.** Each tab keeps its own stack: the stacks hold only a root placeholder today, so check the header shows the tab title with no shadow; the back affordance appears once a later ticket pushes a screen. Unverified until then.

## TEM-330 paginated Match history and Group Game history

Built and covered by PGlite tests (`listMyMatchHistory.test.ts`, `groups/byId.test.ts`). Scrolling needs a real signed-in User with enough data, so it is unverified until done.

- [ ] **TEM-330.** Sign in as a User with more than 20 Matches in History (seed one with `pnpm --filter @repo/api db:seed` plus extra completed Matches, or use a real account). Open `/dashboard/games?tab=history`, scroll to the end and check further pages load (the "Load more" button also works), the list ends with no button, and the History tab count appears only once everything is loaded.
- [ ] **TEM-330.** On a Group with more than 20 past Games, open Group home, Games tab, and tap "Load more" under Played until it disappears. Check no Game repeats and the order stays newest first. Check Home's Recent form still shows ten bars.

## TEM-331 mobile Home

Built and bundled in the container (`apps/mobile` typecheck, lint, unit tests for `src/home/*`, `expo export --platform ios`). The Home states render from the shared fixtures in `packages/domain/src/home-fixtures.ts` at the dev-only route `/gallery-home` (a link sits under the Home tab in development). Live data, the phone and the side-by-side comparison need a real signed-in User, so they are unverified until done.

- [ ] **TEM-331.** On an iPhone (development build, see TEM-328) open Home, then "Open the Home states gallery", and tap each state: Provisional, Playing now, Add results, No Games, No Group. Check exactly one black surface per state, the Level track fills once (and does not move with Settings, Accessibility, Motion, Reduce Motion on), the Provisional track is hatched and the confirmed one is wash, and Recent form shows solid, outline, diagonal-struck and hatched slots for won, lost, draw and not played.
- [ ] **TEM-331.** Signed in as a real User with a booked Game, compare Home with `/dashboard` on the web App at 390 px width for the same User: next Game (time, venue, court and format line, seats, buttons), Coming up rows (day, weekday, seat bars, tournament rows), Level (band letter, Level, change line, progress, Provisional or confirmed legend), Recent form (record, status, win rate, ten slots), All time and Standing (rank and "of N") must match. Times must read in Bahrain time on the phone whatever the phone's timezone (Hermes `Intl` with `timeZone`; if a time is wrong, the cause is `packages/domain/src/product-timezone.ts` under Hermes).
- [ ] **TEM-331.** With a User who has no Games and no Group but `groupCreator: true` in Clerk public metadata, check the empty card shows "Create a Group first, then you can create a Game." and "Create Group"; with a Group it shows "Browse available games." and "Create". Without `groupCreator` only "Browse" shows.
- [ ] **TEM-331.** Pull down on Home to refresh, then background the App for more than a few seconds, return, and check Home refetches (watch the API log for `users.home`, `ratings.me`, `games.listMyMatchHistory`). Stop the API and pull to refresh: each section shows the server or network message with "Try again".
- [ ] **TEM-331.** VoiceOver on Home: the hatched seats, slots and bars are skipped, and the open seats, form slots ("Won", "Lost", "Draw", "Not played") and seat bars ("Open seat", "3 open seats") are read as text. Every row and button must be reachable with a 44 pt target.
- [ ] **TEM-331.** Tapping a Game, a Standing row, "Create", "Create Group" or "Browse" pushes `/games/{id}`, `/groups/{id}`, `/games/new`, `/groups/new` or `/games`. Only `/games` exists today; the others show Expo Router's unmatched screen until the Game details, Groups and Create tickets land (spec Phase 6, screens 2, 3, 5 and 7).
- [ ] **TEM-331.** The "Declare your Level" card for a User with no Rating and the Invites bell are not on mobile Home yet; they belong to the Profile and Invites screens (Phase 6, screens 4 and 10). Check a new User with no Rating sees no Level card rather than an error.
