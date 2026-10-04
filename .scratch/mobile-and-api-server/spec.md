# Mobile App and standalone API

Status: ready-for-agent (all questions answered on 2026-10-03; section 9 records the decisions)

Tickets: published to Linear as TEM-294 … TEM-344, in dependency order. Section 6 has the table.

Audited at commit `897ff97` on `dev`, 2026-10-03. No code was changed while writing this spec.

## Summary

Temba ships one Next.js App today. This spec plans a second client (an Expo React Native App) and moves the tRPC API out of Next into a standalone Hono server that both clients call.

The brief described the starting point as "a single Next.js app" to be turned into a monorepo and ported to tRPC. The audit found most of that already done, which changes the shape of the work:

| The brief assumed | What the repo actually has | Effect on the plan |
| --- | --- | --- |
| A single Next.js app | A pnpm + Turborepo Workspace: `apps/temba`, `@repo/db`, `@repo/eslint-config`, `@repo/typescript-config` | Phase 0 is a rename and a second-App setup, not a restructure |
| API routes and server actions to port | tRPC v11 with 153 procedures, one per file. Zero server actions. | Phase 2 is a mechanical move of existing code, not a port |
| Server components fetching data | Every data page is a client component using tRPC hooks. The in-process caller is never used. | The web client already talks HTTP. Phase 3 changes where that HTTP goes. |
| Logic tangled into UI and route handlers | 53 of 84 `src/lib` files are already pure domain logic with tests. The Glicko-2, match outcome, standing and pool-table cores are pure files under `src/server`. | Phase 1 is mostly relocation. A short list needs real untangling. |
| Auth to unify | Clerk, with custom sign-in screens built on Clerk hooks | Clerk has a first-party Expo SDK. Unification is one session check, not a provider change. |

Two planning constraints come from the repo itself and override the brief where they conflict:

- **One endpoint per file** (`.cursor/rules/api-one-endpoint-per-file.mdc`). A procedure's validation, authorization, rules and queries live in its own file. This spec does not hollow procedures out into `@repo/domain` or `@repo/validators`.
- **ADR-0002 "One App, not two"**. This spec contradicts it. It is worth reopening because a native client is now a product decision, which is exactly the condition that ADR names. Phase 0 records a superseding ADR.

`CONTEXT.md` says to avoid the word "monorepo". This spec uses **Workspace**, **App** and **Package** as defined there.

## 1. Audit findings

### 1.1 Stack

| Area | Finding |
| --- | --- |
| Framework | Next.js `^15.5.24`, App Router only, React 19, Turbopack in dev |
| API | tRPC `^11` with `@trpc/react-query` (classic `createTRPCReact`), TanStack Query `^5.69`, superjson |
| Database | Postgres through Drizzle `0.41.0` (pinned by a Root override) and `postgres` (postgres-js) |
| Auth | Clerk `@clerk/nextjs ^7.5.2` |
| Validation | Zod `^3.24.2`, schemas inline in procedure files |
| Styling | Tailwind CSS v4, CSS-first config in one file, shadcn-style primitives on Radix and Base UI, vaul, sonner |
| Tests | Vitest `^4.1.11` with PGlite. 162 test files: 77 in `src/lib`, 72 in `src/server`, 9 in components, 4 elsewhere. |
| Tooling | pnpm `10.13.1`, Turborepo `^2.10.11`, TypeScript `^6.0.3`, Node 22 locally |
| Size | 850 files and about 124,000 lines under `apps/temba/src` |

### 1.2 How data flows today

- **Client components over HTTP.** Every dashboard data page is a `"use client"` file. They call `api.<router>.<procedure>.useQuery` or `useMutation` from `~/trpc/react`, which sends requests to `/api/trpc` with `httpBatchStreamLink`.
- **No server-rendered data.** `~/trpc/server` exports an in-process caller, but nothing calls it. `<HydrateClient>` wraps the dashboard with nothing prefetched. There is no `useSuspenseQuery`.
- **No server actions.** There are zero `"use server"` files. The `serverActions.bodySizeLimit` setting in `next.config.js` is unused.
- **Cache freshness is manual.** 197 `invalidate` calls across 21 files. No `router.refresh()`, no `revalidatePath`.
- **No realtime.** No websockets, SSE or subscriptions. The only polling is the onboarding wait state, every 2 seconds.
- **Four route handlers:** `/api/trpc/[trpc]`, `/api/webhooks` (Clerk user sync), and two `/api/media/...` routes that stream images from the bucket.
- **Three server-side reads bypass tRPC:**
  - `app/g/[code]/page.tsx` reads the database directly to resolve a Game Invite link short code and build Open Graph metadata.
  - `app/gr/[code]/page.tsx` does the same for Group Invite links.
  - `app/dashboard/layout.tsx` reads `user.onboardingCompletedAt` directly for the onboarding gate (ADR-0012).

### 1.3 Database

- **Location:** `packages/db` (`@repo/db`). 48 schema files, 48 migrations in `packages/db/drizzle`, driven by drizzle-kit.
- **Client:** a `postgres-js` singleton created at import time with default pooling. Importing `@repo/db` throws if `DATABASE_URL` is unset. `@repo/db/schema` exports the schema without connecting.
- **Consequence for tests:** router tests fail to load without `DATABASE_URL` in the shell, even though they run on PGlite. I confirmed this by running one test with the variable unset. The README says "No product Postgres required", which is true only if the variable is set to some value.
- **Test harness:** `apps/temba/src/server/test/pglite.ts` builds an in-memory database and applies the real migrations. Tests call a plain function exported beside each procedure, passing the PGlite client. They never go through tRPC or Clerk.
- **Type leak:** 29 production files import `type TestDatabase` from the test harness to widen their database parameter type.
- **Unused tables:** `account`, `session`, `verification` (better-auth leftovers), the three `*-email-invites` tables (Email invite is retired), and the coaching tables.

### 1.4 Auth

- **Provider:** Clerk. Postgres holds a Temba `user` row keyed by `clerkId`, created and updated by the Clerk `user.created` / `user.updated` webhook.
- **Session strategy:** Clerk session cookie on web. No bearer tokens are used today.
- **Enforcement, in four places:**
  1. `middleware.ts` (Clerk middleware, edge runtime) protects `/dashboard` and `/onboarding`, and skips `/api/webhooks` and `/api/media`.
  2. The tRPC context calls Clerk `auth()` and puts the Clerk id on `ctx.userId`. `protectedProcedure` requires it.
  3. 135 procedures call `resolveAppUser(ctx.userId)` to load the Temba User row. It uses the global `db`, not `ctx.db`.
  4. `operatorProcedure` calls Clerk `currentUser()` and checks `publicMetadata.operator`. This is a Clerk API request on every Operator call.
- **Roles in Clerk metadata:** `operator` and `groupCreator`. The web UI reads both from `useUser()` to show or hide navigation.
- **Sign-in screens are custom**, built on `useSignIn` / `useSignUp` from `@clerk/nextjs/legacy`:
  - Sign in with username or phone number plus password.
  - Sign up with username, phone number and password, then a phone code.
  - SMS second factor.
  - Password reset by email code.
  - Google OAuth. Apple is not configured.
- **Profile photo** is edited in Clerk's prebuilt modal (`clerk.openUserProfile()`).
- **Dead code:** `better-auth` is a dependency with two empty files under `src/server/better-auth`.

### 1.5 Feature domains and their data operations

The API has 153 procedures: 53 queries and 100 mutations. 134 are protected, 14 are Operator-only and 5 are public.

| Brief's domain | Glossary terms | Procedures and read models |
| --- | --- | --- |
| Games: upcoming / needs-score / final | Game, Match, Set, Match result confirmation | `games` router, 57 procedures. There are no separate list procedures per state. The state is a computed phase: `upcoming`, `ongoing`, `needs_results` in `server/home/carousel-games.ts`, plus `final` and `cancelled` in `games.byId`. Lists: `games.listMyGames`, `games.listPublicPickup`, `games.listMyMatchHistory`. |
| Players: level, form, all-time stats, rankings | Rating, Level, Level band, Provisional, Standing | `ratings.me`, `ratings.selfDeclare`, `users.home`, `users.profileStats`. Recent form is derived on the client from `games.listMyMatchHistory`. A Standing is per Group, not global. |
| Groups: standing / games / members | Group, Club Group, Loose Group, Standing, Group join request | `groups` router, 29 procedures. `groups.byId` returns the leaderboard, upcoming Games, Game history and members in one payload. |
| Friendly tournaments: group stage + brackets | Friendly tournament, Tournament shape, Pool, Pool table, Round, Knockout, Bye, Walkover, Champion | Inside the `games` router: `createTournament`, `drawPools`, `postPoolDraw`, `undoPoolDraw`, `poolTables`, `updateRoundCount`, `mergeHalfTeams`. Knockout has no procedures of its own. It rides on the Pool procedures, `cancelMatch` and `completeMatch`. |
| Challenges (planned) | none | **Nothing exists.** No code, spec, ADR or glossary entry mentions it. It is planned after this work, in its own spec. |
| Not in the brief | Community, Team, Venue, Court, Invite doors, Onboarding questionnaire | `communities` (30), `teams` (16), `venues` (14, Operator-only), `users.onboardingState`, and the Lookup invite and Invite link procedures on four routers |

Sport is modelled (`padel`, `football` enums on Games, Groups, Teams and Ratings) but Game create hard-codes padel, and the 2v2 structure (two Positions per Game team, four players per Friendly game) is assumed throughout. Football is "coming soon" in the UI.

### 1.6 Where the shared logic lives

Most calculation is already pure. The problem is location and a few stray imports, not tangling.

| Logic | Location today | State |
| --- | --- | --- |
| Glicko-2 step | `server/ratings/glicko2.ts` | Pure. **No test file.** |
| Level and Level band from a Rating | `server/ratings/level.ts`, `lib/level-bands.ts`, `lib/level-range.ts` | Pure. Band thresholds are written twice in different units. |
| Doubles rating (composite opponent, weight blend) | inline in `server/ratings/apply-rated-match.ts` | Mixed with database writes |
| Set wins, Match result | `server/games/set-wins-for-games.ts`, `match-outcome.ts`, `match-slots.ts` | Pure, but re-derived in three components |
| Standing order | `server/standing/compare-standing.ts` | Pure |
| Pool table and tiebreaks | `server/games/pool-table.ts` | Pure logic, but imports an enum from `@repo/db`, which opens a connection |
| Round-robin scheduling, sizing, Rounds | `lib/tournament-schedule.ts`, `tournament-sizing.ts`, `tournament-rounds.ts` | Pure, tested |
| Knockout tree, feeds, Byes, round names | `lib/tournament-knockout.ts`, `tournament-knockout-view.ts` | Pure, tested |
| Pool draw and Match generation | inside `routers/games/drawPools.ts` and `postPoolDraw.ts` | Single-endpoint logic in procedure files |
| Knockout advance, Walkover, take-back | `server/games/knockout-advance.ts` | Mixed with database writes |
| Recent form, streak, win rate | `components/home/home-recent-form.ts` | Pure, but lives in a component folder |
| Game phase | `server/home/carousel-games.ts`, `routers/games/byId.ts` | Pure functions inside database files. The phase type is copied by hand into two lib files. |

`src/lib` has 84 source files. By imports: 53 are pure domain logic, 15 are generic pure helpers, 16 are web-bound (URL state, `cn`, sessionStorage, `navigator.share`, Clerk error handling). No lib file imports server code, React or Next. The server imports 15 lib modules directly, 24 counting what those import.

Business rules that live in components and would otherwise be re-implemented on mobile:

- The viewer's verdict and set tally: `friendly-game-details-hero.tsx`, `match-history-card.tsx`, `games/[id]/page.tsx`.
- Vacant seats: `game-summary-card.tsx` duplicates `server/games/seats.ts`.
- Win rate, with three different definitions: `home-recent-form.ts`, `profile-all-time-card.tsx`, `teams/[id]/page.tsx`.
- Organizer permissions and tournament sizing composed inline in `games/[id]/page.tsx` (1,731 lines).
- A 30-second clock for countdowns, written four times.

There are no shared Zod schemas. All 126 `z.object` inputs are inline in procedure files. Client and server share validation through pure lib functions (`level-range`, `price-per-player`, `tournament-sizing`), and there is no client form library.

### 1.7 Environment, external services, deployment

| Variable | Used by |
| --- | --- |
| `DATABASE_URL` | `@repo/db`, drizzle-kit, the App env schema |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `/api/webhooks` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, two `..._FALLBACK_REDIRECT_URL` | Clerk routing |
| `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION` | Venue logos and Group images |
| `NODE_ENV`, `SKIP_ENV_VALIDATION`, `PORT`, `VERCEL_URL` | runtime and base URL |
| `TEMBA_DRIZZLE_MIGRATIONS`, `SEED_ALLOW_REMOTE`, `SEED_CLERK_ID_*` | tests and the seed script |

The local `.env` also carries stale keys that nothing reads: `BETTER_AUTH_SECRET`, `AUTH_REDIRECT_URL`, `GOOGLE_AUTH_*`, `TWILIO_*`, `SUPABASE_*`.

External services: Clerk (identity, SMS codes, Google OAuth, webhook), Postgres, a Railway Bucket (private, S3-compatible), Google Fonts at build time. There is no email, analytics or error-tracking service.

**Deployment target is not recorded in the repo.** There is no `vercel.json`, Dockerfile, Railway config or CI workflow. `UI_AUDIT.md` refers to "the Railway `DATABASE_URL`", the bucket is on Railway, and ADR-0016 mentions "App/Vercel egress". The API host is now settled as Railway (D3). Where the web App runs is still unrecorded. It affects only risk R6.

### 1.8 What will be hard to move

| Item | Why it is hard |
| --- | --- |
| Archivo variable font | Loaded by `next/font/google` with the `wdth` axis. React Native cannot set font variation axes. |
| Stored image URLs | Rows store relative paths like `/api/media/group-images/{id}/image?v=...`, served by Next route handlers. Mobile needs an absolute origin. |
| Invite link origin | `getAppOrigin(ctx.headers)` builds Invite link URLs from the request host in 8 procedures. On a separate API host it would mint links pointing at the API. |
| Onboarding gate | Runs in a server layout with a direct database read and a header set by middleware. Mobile needs the same gate on the client. |
| Operator check | `currentUser()` is part of the Clerk Next SDK. |
| Custom auth screens | Built on `@clerk/nextjs/legacy` hooks and Next navigation. The profile photo flow uses a Clerk web-only modal. |
| Page-sized client components | `games/[id]/page.tsx` 1,731 lines, `games/new/page.tsx` 1,302, `groups/[id]` 782, `communities/[id]` 752. Rules and view code are interleaved. |
| Web-only state | `?tab=` query strings, sessionStorage drafts for Game create, `navigator.share`, `matchMedia`. |
| CSS features | `repeating-linear-gradient` (the hatch), `:has()` (49 uses), `color-mix` opacity modifiers (134 uses), `clip-path`, `oklch`, `env(safe-area-inset-*)`. |
| Streaming batch link | The web client uses `httpBatchStreamLink`. React Native's `fetch` does not stream. |
| Unbounded payloads | `games.listMyMatchHistory` and the `gameHistory` field of `groups.byId` return everything, with no limit. Acceptable on desktop Wi-Fi, costly on mobile. |

What turned out not to be a problem: no edge runtime outside Clerk middleware, no `next/image`, no server actions, no `revalidatePath`, no `next/headers` inside `src/server`. Only 5 of 311 non-test server files import Clerk, React or the Next env module.

### 1.9 Existing issues found during the audit

None of these is caused by this work. Items 1 to 5 are fixed by the fix track in section 5, by decision on 2026-10-03, so that mobile never shows them. Items 6 to 8 stay as they are. Item 9 is fixed by the CI ticket in Phase 0.

1. **Group Standing counters are never written.** `group_members.total_sets_won`, `total_points_won` and `total_games_played` are read by `groups.byId`, `groups.mine` and `users.home` and sorted by `compareStanding`, but only the seed script writes them. A live Standing therefore falls through to name order. Team counters (`gamesPlayed`, `wins`, `losses`) are the same.
2. **Sets are not bounded on the server.** `games.scoreSet` accepts any non-negative integers. The 0 to 7 clamp exists only in the web client.
3. **Three definitions of win rate** across Home, Profile and Team pages.
4. **No timezone handling.** Day grouping for Rounds and Invite link previews runs on the server in the server's timezone. Bahrain is UTC+3.
5. **Price per player assumes two decimals.** The Bahraini dinar has three.
6. **`completeMatch` repeats the completion sequence** (rate, advance, place qualifiers) instead of calling the shared completion effect.
7. **A 100 to 500 ms artificial delay** is added to every procedure in development.
8. **Leftovers:** the `games.hello` and `games.getSecretMessage` boilerplate procedures, 13 procedures no client calls, `better-auth`, a `tablesFilter` in `drizzle.config.ts` that matches no table.
9. **No CI.** Nothing runs typecheck, lint or tests on a pull request.

## 2. Target architecture

```text
temba-v2/
├── apps/
│   ├── web/                    Next.js App (today's apps/temba). UI only after Phase 3.
│   │   └── src/{app,components,hooks,lib,trpc,styles}
│   ├── mobile/                 Expo App: Expo Router, NativeWind, TypeScript.
│   │   ├── app/                routes: (auth), (tabs), game/[id], group/[id], ...
│   │   └── src/{components,primitives,trpc,lib}
│   └── api/                    Hono server (Node). Thin host, no business logic.
│       └── src/{index.ts,context.ts,routes/{trpc,media,webhooks,health}.ts,env.ts}
├── packages/
│   ├── api/                    @repo/api: routers, procedures, context type, shared server modules.
│   │   └── src/
│   │       ├── routers/<domain>/<procedure>.ts     one endpoint per file
│   │       ├── {games,groups,invites,ratings,soft-archive,storage,...}/   shared modules
│   │       ├── trpc.ts  root.ts  context.ts
│   │       └── types.ts        type-only entry for clients
│   ├── db/                     @repo/db: schema, client, migrations, PGlite test harness.
│   ├── domain/                 @repo/domain: pure TypeScript rules and calculations, with tests.
│   ├── validators/             @repo/validators: Zod schemas shared by two or more callers.
│   ├── design-tokens/          @repo/design-tokens: tokens as data, plus generated theme files.
│   ├── eslint-config/          existing, gains a boundary preset
│   └── typescript-config/      existing, gains an expo preset
├── docs/adr/  CONTEXT.md  AGENTS.md  CLAUDE.md
└── turbo.json  pnpm-workspace.yaml  package.json
```

Dependency rule. An arrow means "may import from":

```text
apps/web     ──► @repo/domain, @repo/validators, @repo/design-tokens, @repo/api/types (types only)
apps/mobile  ──► @repo/domain, @repo/validators, @repo/design-tokens, @repo/api/types (types only)
apps/api     ──► @repo/api, @repo/db
@repo/api    ──► @repo/db, @repo/domain, @repo/validators
@repo/validators ──► @repo/domain
@repo/domain, @repo/db, @repo/design-tokens ──► nothing in the Workspace
```

| Package | Owns | Must not contain |
| --- | --- | --- |
| `@repo/api` | Every tRPC procedure and the shared server modules it calls. The single source of truth for server behaviour. | Next, React, the Clerk Next SDK, request parsing |
| `@repo/db` | Schema, migrations, the client, the PGlite harness | Business rules |
| `@repo/domain` | Pure functions and constants used by a client, or by two or more server callers | Database access, React, Next, DOM, `node:` modules, web route strings |
| `@repo/validators` | Zod schemas used by two or more procedures, or by a client form and a procedure | Schemas used by one procedure only |
| `@repo/design-tokens` | Colors, spacing, radii, type scale, hatch geometry, motion durations | Components |
| `apps/api` | HTTP hosting, session verification, CORS, body limits, env | Procedures or rules |

## 3. Key decisions

### D1. The web App calls the API over HTTP, through a same-origin proxy

**Decision.** The browser keeps calling `/api/trpc` on the web origin. Next rewrites `/api/:path*` to the Hono server. The web App does not call the router in-process.

**Why not `createCaller`:**
- The audit found zero in-process calls today. Every page fetches from the browser. There is no server-rendering benefit to preserve.
- In-process calling would keep `DATABASE_URL`, the bucket keys and the whole server tree inside the Next deployment, which makes two deployed copies of the backend. Web and mobile could then run different versions of the same procedure.

**Why a proxy and not a cross-origin call:**
- Stored image URLs are relative (`/api/media/...`). They keep working on web with no data migration.
- No CORS configuration and no preflight requests.
- The Clerk webhook URL does not change.
- Cutover and rollback are a config change. With the rewrite off, the existing Next route handler answers. With it on, Hono answers.

**How SSR keeps working.** Only three server-side reads exist (section 1.2). Each becomes an HTTP call from the Next server to the API through a small server-side tRPC client:
- `/g/[code]` and `/gr/[code]` call a public procedure that returns the token and the Open Graph fields. `generateMetadata` stays a server function.
- The dashboard layout calls `users.onboardingState`, which already returns the `provisioning` shape the gate needs. It forwards the caller's session token.

**Cost.** One extra network hop for browser requests, and one for the onboarding gate on a hard dashboard load. Both are small if the web App and the API sit on the same private network. A later move to direct browser-to-API calls stays possible because auth is a bearer token (D2).

### D2. Clerk stays the identity provider. Both clients send a bearer token. One check in the API context.

**Decision.**
- Web keeps the Clerk cookie session for page gating in `middleware.ts`. For API calls it attaches `Authorization: Bearer <session token>` from Clerk's `getToken()`.
- Mobile uses Clerk's Expo SDK with its token cache on `expo-secure-store`, and attaches the same header.
- `apps/api` verifies the token once, in `createContext`, with `@clerk/backend`. It passes `{ userId, getPublicMetadata }` into the `@repo/api` context. The package itself imports no Clerk SDK.
- `operatorProcedure` reads `ctx.getPublicMetadata()` in place of `currentUser()`.

**Why keep Clerk.** The custom sign-in flows, the webhook user sync, the `operator` and `groupCreator` roles and the Onboarding questionnaire gate are all built on it. Clerk's hooks (`useSignIn`, `useSignUp`, `useUser`) exist in the Expo SDK, so the flows port without a new identity model. Replacing the provider would be a separate security project with a user migration.

**Why bearer on web too.** It gives one code path on the server, identical for both clients. `getToken()` always returns a fresh token, where a cookie can be stale after a backgrounded tab. A bearer-only API cannot be driven by a cross-site form, so CSRF is not a concern.

**What "bearer tokens in expo-secure-store" means here.** Clerk stores its long-lived client credential in the secure store and mints short-lived session tokens (about 60 seconds) from it. The app never stores a long-lived API token of its own.

**Sign in with Apple is added** on web and mobile (decided 2026-10-03). Google OAuth is offered today, and the App Store requires an equivalent privacy-preserving option beside it on iOS. This needs an Apple Developer Program membership before TEM-322 can start.

### D3. Hono runs as a long-lived Node service on Railway

**Decision.** `apps/api` uses `@hono/node-server`. It is bundled to one file for production and run with `tsx watch` in development.

**Why Node and not an edge or serverless runtime:**
- `postgres-js` holds TCP connections and a pool. That fits a long-lived process and needs a different driver or an external pooler on edge runtimes.
- The media routes stream objects from the bucket with the AWS SDK.
- Image uploads arrive as base64 inside tRPC bodies, up to about 2.7 MB each.
- Mobile clients feel cold starts more than a browser on Wi-Fi does.
- Phase 7 needs a place to send push notifications from.

**Why Railway.** Confirmed as the API host on 2026-10-03. The bucket is already there, and the database appears to be. A service in the same project gets private networking to both. Where the web App runs is still unrecorded. It affects only the cost of the proxy hop, not this decision.

**Local development.** One command at Root runs all three Apps:

| App | Command | Port |
| --- | --- | --- |
| web | `next dev --turbo` | 3000 |
| api | `tsx watch src/index.ts` | 4000 |
| mobile | `expo start` | 8081 |

`pnpm dev` runs `turbo run dev` for all three. `pnpm dev:web` runs web and api only. The mobile App derives the API host from the Expo dev server host, so a phone on the same network reaches the laptop without editing env files. Postgres still comes from `./start-database.sh`.

### D4. Clients import types and pure code, never server code

**Decision.** Three layers enforce the boundary:

1. **Package entry points.** `@repo/api` exposes `@repo/api/types`, a file containing only `export type` statements: `AppRouter`, `RouterInputs`, `RouterOutputs`. It compiles to nothing. This is the only `@repo/api` path a client may import.
2. **Package manifests.** `apps/web` and `apps/mobile` do not list `@repo/db`. pnpm's strict `node_modules` then makes the import fail to resolve. `@repo/api` is a dev dependency of the clients, for types only.
3. **Lint.** A shared `no-restricted-imports` preset in `@repo/eslint-config` bans `@repo/db`, `@repo/api` and any `@repo/api/*` path other than `types` under `apps/web/src` and `apps/mobile`.

Enum values the clients need are plain string-literal unions owned by `@repo/domain`. `@repo/api` holds a compile-time check that each matches the Drizzle enum, which is the pattern `lib/preferred-position.ts` already uses.

### D5. `@repo/api` is the existing server tree, moved whole

**Decision.** `apps/temba/src/server/**` moves to `packages/api/src/**` in one mechanical change: `git mv` plus an import rewrite, no logic edits. `api/routers/<domain>/` becomes `routers/<domain>/`. The one-endpoint-per-file rule moves with it and its paths are updated.

**Why not domain by domain.** The brief suggested porting endpoints one domain at a time. That fits a rewrite. This is a relocation of code whose routers import each other's functions (`users.home` calls functions from three other routers) and share modules for Invite doors, Soft-archive and Game admit. A Package cannot import from an App, so a partial move would need temporary shims in both directions. One move, verified by the 72 server tests and the compile-time router shape check, is smaller and safer.

Domain-by-domain still happens, at cutover. See Phase 3.

### D6. What goes into `@repo/domain`

**Rule.** A function or constant belongs in `@repo/domain` when it is pure and either a client uses it, or two or more server callers use it.

**Consequences:**
- The 24 lib modules the server already imports move first. `@repo/api` cannot exist without them.
- The pure server cores move: `glicko2`, `level`, `idle`, `match-outcome`, `set-wins-for-games`, `match-slots`, `compare-standing`, `pool-table`, `member-form-marks`, `member-win-loss`, and the pure half of `completed-matches`.
- Logic used by a single endpoint stays in its procedure file. That includes Pool draw and Match generation in `postPoolDraw.ts` and `drawPools.ts`. The brief asked for bracket generation to live in the domain Package. The tree builder already does (`tournament-knockout`). The draw itself has one caller and existing PGlite tests, so the repo rule keeps it where it is.
- Modules that return web routes (`/dashboard/...`) do not move as they are, except `friendly-game-partner` and `tournament-join`, which the server already imports and which move unchanged in Phase 1 (decided 2026-10-04). They move in Phase 6, when the mobile route they would feed exists, and they return a typed target that each App maps to its own path.

**Layout.** Flat modules with a wildcard export, so `~/lib/tournament-rounds` becomes `@repo/domain/tournament-rounds`. No barrel file. The move stays a rename, and file history is preserved.

### D7. `@repo/validators` starts small

**Decision.** A schema moves to `@repo/validators` only when two or more procedures share it, or when a client validates a form with it. Everything else stays inline in its procedure file.

**Why this differs from the brief.** There are no shared schemas today, no client form library, and the repo rule puts validation at the procedure boundary. Mobile gets its input types from `RouterInputs`. The Package starts with the `sportSchema` copied into nine files and grows when a mobile form needs a schema.

### D8. Design tokens are data, with generated theme files

**Decision.** `@repo/design-tokens` holds the tokens as a TypeScript object. A small script generates:
- a Tailwind v4 `@theme` stylesheet that the web `globals.css` imports, and
- whatever the chosen NativeWind version needs: the same stylesheet for v5, or a JavaScript preset for v4.

**Why not "both Tailwind configs import it".** The web App has no Tailwind config file. Tailwind v4 is configured in CSS. A generated stylesheet is how a shared source reaches it.

**Values.** The tokens take the values in the code today (section 4.1), not the older values in the design specs. The web App must render identically before and after.

### D9. Packages ship TypeScript source. `@repo/api` and `@repo/db` also emit declarations.

**Decision.**
- All Packages keep exporting source, as `@repo/db` does today. No runtime build step.
- `@repo/api` and `@repo/db` also emit `.d.ts` files, and their `types` export points at them. Clients typecheck against declarations.
- Code inside a Package never uses the `~/` alias. `@repo/api` uses Node subpath imports (`#/...`). `@repo/domain`, `@repo/validators` and `@repo/design-tokens` use relative imports.

**Why.** Without emitted declarations, typechecking the mobile App would compile the server's source under the mobile compiler options, which lack Node types. The `~/` alias resolves against the consumer's `tsconfig`, so it would point at the wrong directory once the code leaves the web App.

### D10. Same tRPC React integration on both clients

**Decision.** Mobile uses `@trpc/react-query` with `createTRPCReact`, as web does. Mobile uses `httpBatchLink`. Web keeps `httpBatchStreamLink`.

**Why.** The web App has 62 queries, 108 mutations and 197 invalidations written against this API. Using the same one on mobile lets hooks and invalidation patterns be copied across. Migrating web to the newer `@trpc/tanstack-react-query` client is out of scope.

### D11. Rename `apps/temba` to `apps/web`

**Decision.** `git mv apps/temba apps/web`, package name `web`. `CONTEXT.md` gains **Web App**, **Mobile App** and **API App**. A new ADR supersedes ADR-0002.

**Why.** With three Apps, an App named after the product is ambiguous. The cost is a rename across filters, scripts, the Cursor environment, docs and the deployment's root directory setting.

## 4. Design system on mobile

The design system is locked. The port reproduces it. It does not reinterpret it.

### 4.1 Token values

The single source today is `apps/temba/src/styles/globals.css`. Where design specs and code disagree, the tokens take the code's values, because that is what users see. This was confirmed on 2026-10-03, and `UI_AUDIT.md` decision D1 had already settled the palette this way.

| Group | Token | Value | Note |
| --- | --- | --- | --- |
| Color | `ink` | `#0A0A0A` | Specs say `#000000` |
| Color | `paper` | `#FFFFFF` | Also the page background. Specs say `#F6F6F3`. |
| Color | `rule` | `#E5E5E2` | Hairline on paper |
| Color | `wash` | `#F5F5F5` | From `oklch(0.97 0 0)` |
| Color | `muted` | `#6E6E6E` | Secondary text on paper |
| Color | `dim` | `#8E8E8E` | Secondary text on ink |
| Color | `dimrule` | `#2E2E2E` | Hairline on ink |
| Color | `raised` | `#1C1C1C` | Raised tile on ink |
| Color | `destructive` | about `#E7000B` | Converted from oklch at build |
| Color | `hatchStroke` / `hatchStrokeOnInk` | `#DCDCDC` / `#333333` | |
| Spacing | `surface` | 22 | Inner padding of a surface |
| Spacing | `section` | 26 | Gap between major sections |
| Spacing | `compact` | 18 | The secondary rhythm already used about 50 times |
| Radius | `slot` / `sm` / `md` / `lg` | 5 / 8 / 10 / 12 | |
| Radius | `card` / `surface` | 14 / 16 | `surface` is for hero and primary surfaces, `card` for list cards and rows, as the code uses them today |
| Type | `eyebrow` / `meta` / `body` / `lead` / `title` | 12 / 13 / 15 / 17 / 19 | Line heights 16 / 18 / 22 / 24 / 26 |
| Type | `h2` / `h1` / `h1Lg` / `display` / `hero` | 24 / 28 / 32 / 36 / 48 | |
| Type | numerals | 88, 56, 52, 34, 22 | Hero Level band, hero time, record, stat totals, big figures |
| Size | touch target | 44 | |
| Size | bottom tabs / top bar | 56 / 68 | Plus safe area |
| Size | icons | 16 row, 20 action, 21 tab | Lucide, via `lucide-react-native` |

There is no accent color and no dark theme. The app is light only. `ink`, `paper`, `dim`, `dimrule` and `raised` are fixed brand colors, not themed ones. Spacing 22, 26 and 18 are arbitrary Tailwind values on web today (about 190 uses). The tokens name them. Converting the web call sites is optional follow-up work, not part of this spec.

### 4.2 Fonts

React Native cannot set variable font axes, so the mobile App bundles static instances.

| Family name in the app | Source | Used for |
| --- | --- | --- |
| `Archivo-Regular`, `-Medium`, `-SemiBold`, `-Bold` | Static Archivo at width 100, weights 400, 500, 600, 700 | All body and UI text |
| `ArchivoExpanded-Bold` | Width 115, weight 700 | Hero numerals and Level bands. This is the only expanded setting in the web code (69 uses). |
| `GeistMono-Regular` | Static Geist Mono | Uppercase micro-labels |

- **The expanded instance is a custom cut** (decided 2026-10-03). Google ships static widths at 112.5 and 125, not 115. A 115/700 instance is cut from the variable font with fontTools `instancer` and committed. The ticket checks that the font licence allows a modified instance under the same name, and renames the family if it does not.
- **Loading.** Fonts are embedded at build time through the `expo-font` config plugin, so there is no flash of fallback text.
- **Weights are family names.** With static files, `fontWeight` is unreliable on Android. The `Text` primitive takes `weight` and `width` props and maps them to a family. Nothing else sets `fontFamily` or `fontWeight`.
- **Tabular figures.** The `Text` primitive sets `fontVariant: ['tabular-nums']` by default. React Native has no inherited body style, so this replaces the global `font-feature-settings: "tnum"` on web. The prototype in Phase 5 confirms the cut instances keep the `tnum` feature.
- **Letter spacing.** React Native takes points, not em. The token for expanded text stores -0.03 and the primitive multiplies by font size.
- **Wordmark.** Rendered as SVG. Sora is not bundled.
- The single `font-light` use on web maps to Regular.

### 4.3 Shared primitives

React Native components cannot be shared with DOM components. What is shared is the contract: the same primitive names and props on both platforms, with the meaning defined once in `@repo/domain` and the geometry once in `@repo/design-tokens`.

| Primitive | Props | Meaning | Web today | Mobile |
| --- | --- | --- | --- | --- |
| `Surface` | `tone: "ink" \| "paper"` | Ink is the one upcoming focus on a screen. Paper with a hairline is everything else, including finished things. | Hand-written classes in 8 places | New component. Provides tone through context so children pick the right hairline, text and hatch colors. |
| `Hatch` | `tone` inherited, `radius` | "Not yet": an empty seat, an unplayed slot, an unentered score, a Provisional track | CSS utility `hatch` / `hatch-on-ink` | `react-native-svg` pattern, section 4.4 |
| `ResultMark` | `variant: "won" \| "lost" \| "draw" \| "notPlayed"`, `size` | Solid is a win, outline is a loss, outline with a diagonal is a draw, hatched is not played | SVG in `components/temba/result-mark.tsx` | Same SVG paths through `react-native-svg` |
| `FormSlot` | `variant`, `compact` | The lettered W / L slot in Recent form | `home-recent-form-row.tsx` | New component, same variants |
| `Text` | `size`, `weight`, `width`, `tone` | Type scale and tabular figures | Tailwind classes | New component, section 4.2 |
| `Hairline` | `tone` inherited | 1 px divider. Never a shadow. | `border-rule`, `divide-*` | 1 px `View` |
| `Screen`, `Section` | none | 26 gap between sections, safe area | Per-page classes | New components |
| `Button` | `variant`, `size`, `pending` | Includes `inverse` and `outline-inverse` for ink surfaces | `components/ui/button.tsx` | New component, 44 minimum target |

The variant logic is shared, not copied:

- `resultMarkVariant(outcome)` already exists in `lib/result-mark.ts` and moves to `@repo/domain` in Phase 1.
- `surfaceToneForPhase(phase)` is new in `@repo/domain`. It returns `paper` for `final` and `ink` for every other phase, which is what the web Friendly game hero does inline today. Both Apps call it. How a cancelled Game reads is decided when the Game details screen is ported, since the web hero has no cancelled branch.
- Hatch geometry (angle, stroke, period) and the `ResultMark` SVG paths live in `@repo/design-tokens`.

The web App gains `Surface` and `Hatch` components with the same props, as thin wrappers over the existing classes. The 8 existing ink-surface call sites switch to `Surface`. Other call sites switch when they are next touched.

Rules the mobile primitives enforce:

- **One ink surface per screen.** A second `Surface tone="ink"` under the same `Screen` warns in development.
- **No shadows.** The mobile lint config bans `shadow*` and `elevation` style keys. Sheets and dialogs use a scrim and a hairline.
- **No raw colors.** Hex literals are banned outside `@repo/design-tokens`.
- **Hatch is decoration.** It is hidden from assistive technology, and the meaning is carried by adjacent text, as on web.

### 4.4 The `Hatch` component

- Built with `react-native-svg`: a `Pattern` in user-space units holding one 1 px line, repeated every 5 px and rotated to 45 degrees, filling a `Rect` that stretches to the parent.
- The parent `View` clips it with `overflow: hidden` and the given radius. The border is a real 1 px border in `rule` or `dimrule`, replacing the inset box-shadow used on web.
- Colors come from the surrounding `Surface` tone.
- Each instance needs a unique pattern id.
- Acceptance is visual: the mobile gallery's hatch swatches match the `HatchSwatches` panel on `/dashboard/design/home` side by side, on both tones.
- The Phase 5 prototype measures scroll performance on an iPhone with 50 rows of ten hatched slots. If the SVG pattern is too slow, the fallback is a pre-rendered tile image per tone. Low-end Android is measured when Android is taken up.

### 4.5 Motion

- **Two mount animations per screen, at most.** On web these are the progress-track fill and the Level chart path draw. The chart is commented out on web today, so Home currently has one.
- Mobile provides exactly two animation primitives, `MountFill` (width) and `MountDraw` (stroke offset), built on Reanimated.
- Both read Reanimated's `useReducedMotion()`. When it is true they render the final state immediately.
- The lint config bans Reanimated `entering`, `exiting` and `layout` props outside those two primitives.
- Navigation transitions and sheet presentation use platform defaults. They are not counted as mount animations.

### 4.6 CSS features and their replacements

| Web | Mobile |
| --- | --- |
| `repeating-linear-gradient` hatch | SVG pattern (4.4) |
| `font-variation-settings` | Static font files (4.2) |
| `oklch` colors and `/50` opacity modifiers | Precomputed hex and rgba in the tokens |
| `clip-path` diagonal on a draw slot | SVG line |
| `:has()` and CSS-variable scoping (`surface-ink`) | `Surface` tone context and explicit props |
| `env(safe-area-inset-*)`, `svh`, `dvh` | `react-native-safe-area-context` |
| vaul drawer and Radix dialog | One bottom-sheet primitive |
| sonner toasts | One toast primitive |
| `?tab=` query state | Local state or route params |
| sessionStorage Game create draft | In-memory store, or async storage if drafts must survive a restart |
| `navigator.share` and clipboard | The React Native `Share` API and `expo-clipboard` |

## 5. Phases

Every phase ends with the web App working and deployable. The checks below are the gate for every pull request in every phase:

```bash
pnpm exec turbo run typecheck lint test
pnpm exec turbo run build --filter=web
```

Phases 0 to 4 are verified end to end with the existing Playwright flow recordings (`record:flows`, `record:knockout`) against a seeded local database.

### Phase 0. Rename the App and prepare the Workspace

**Goal.** Three Apps can live side by side. Nothing a user sees changes.

**Tasks.**
1. `git mv apps/temba apps/web`. Set the package name to `web`.
2. Update every reference to the old name and path: Root scripts (`dev`, `dev:web`, `build:web`), `README.md`, `AGENTS.md`, `.cursor/environment.json`, `.cursor/install.sh`, `.cursor/rules/*.mdc`, `start-database.sh`, `.gitignore`, `apps/web/scripts/README.md`.
3. Update the deployment's root directory setting in the same release.
4. Write the ADR that supersedes ADR-0002. Update `CONTEXT.md`: **App** is no longer only Next.js, and add **Web App**, **API App**, **Mobile App**.
5. Remove dead code: the `better-auth` dependency and its two empty files, and the unused `serverActions` setting.
6. Add a GitHub Actions workflow that runs the gate commands on every pull request, with `DATABASE_URL` set to a placeholder until Phase 1 removes the need.

**Files touched.** The directory rename, Root `package.json`, `turbo.json`, the docs and scripts listed above, one new ADR.

**Acceptance criteria.**
- The gate commands pass with `--filter=web`.
- `pnpm dev:web` serves the App on port 3000 and `/login` renders.
- No file under `apps/web/src` changed content, other than the dead-code removals.
- `grep -r "apps/temba\|filter temba\|filter=temba"` over tracked files returns only historical specs under `.scratch/`.

**Verify.** Run the gate, run both flow recordings, deploy to a preview environment and sign in.

**Rollback.** Revert the rename commit and restore the deployment root directory. No data is involved.

### Phase 1. Extract `@repo/domain`, seed `@repo/validators`, harden `@repo/db`

**Goal.** Pure logic lives in Packages that any App can import. The database Package can be imported without connecting.

**Tasks.**
1. **`@repo/db`.**
   - Create the client on first use, not at import.
   - Export `Db`, `DbTx` and `DbClient` types.
   - Move the PGlite harness to `@repo/db/testing`. Replace the 29 production imports of `TestDatabase` with `DbClient`.
2. **Scaffold `@repo/domain`** with its own Vitest config, the `library` TypeScript preset and no dependencies.
3. **Move the 24 lib modules the server depends on**, with their tests. Rewrite `~/lib/<name>` to `@repo/domain/<name>` across the web App.
4. **Move the pure server cores** listed in D6, with their tests.
   - Remove their `@repo/db` enum imports in favour of literal unions owned by the Package.
   - Merge the two copies of the Level band thresholds into one.
5. **Add Glicko-2 tests.** `glicko2.ts` has none. Use the worked example from Glickman's paper as a known answer: a player at 1500 / 200 / 0.06 against three opponents ends at about 1464.06 / 151.52 / 0.05999.
6. **Extract the doubles rating core** from `apply-rated-match.ts` into a pure `rateDoublesMatch` in `@repo/domain`, with tests. `applyRatedMatch` keeps the loading and writing.
7. **Move the remaining pure lib modules** that do not return web routes, with their tests.
8. **Scaffold `@repo/validators`** with `sportSchema`. Replace its nine inline copies.

**Not moved in this phase.** The 16 web-bound lib files, and the modules that return `/dashboard/...` routes: `home-next-game`, `home-no-games`, `invite-outcome-copy`, `onboarding-step`, `create-game-flow`. `friendly-game-partner` and `tournament-join` also return routes, but the server reaches them (through `game-summary-cta` and `previewInviteLink.ts`), so they move as they are with the 24 (decided 2026-10-04). Single-endpoint logic inside procedure files stays where it is.

**Files touched.** New `packages/domain/**` and `packages/validators/**`. `packages/db/src/{index,client,testing}.ts`. `apps/web/src/lib/**` shrinks. Import lines change across `apps/web/src`. `apps/web/vitest.config.ts`.

**Acceptance criteria.**
- The test suite passes with `DATABASE_URL` unset.
- No test is deleted. The 162 existing test files are all still present, in their new locations.
- `@repo/domain` has no dependency on `react`, `next`, `@repo/db`, `drizzle-orm` or `@trpc/server`, enforced by its manifest and a lint rule.
- No file under `packages/domain` or `packages/validators` uses the `~/` alias.
- `git diff --stat` for moved files shows renames, not rewrites, apart from import lines.
- The web build output is functionally identical. Both flow recordings pass.

**Verify.** The gate, both recordings, and `env -u DATABASE_URL pnpm exec turbo run test`.

**Rollback.** Each task is its own pull request and is a move. Revert the pull request. No schema or data changes.

### Phase 2. `@repo/api` and the Hono host

**Goal.** The API is a Package with no Next or Clerk Next imports. A Hono server hosts it. The web App still serves the same router in-process, so nothing changes for users.

**Tasks.**
1. **Make the server tree host-neutral, in place.**
   - `createTRPCContext` takes `{ db, userId, getPublicMetadata, headers, webOrigin }` from its host. The Next route handler supplies them from Clerk.
   - `requireOperator` reads `ctx.getPublicMetadata()`.
   - `getAppOrigin` reads `ctx.webOrigin`, set from a new `WEB_ORIGIN` variable. Invite links must always point at the web origin.
   - The storage module reads its configuration from a Package-local env module built on `@t3-oss/env-core`.
   - `caller-onboarding-state.ts` moves out of `src/server` into the web App. It is a server-component helper, not API code.
2. **Move the tree.**
   - `git mv apps/web/src/server/** packages/api/src/**`, flattening `api/routers` to `routers`.
   - Rewrite `~/server/...` imports to `#/...`.
   - Add `packages/api/src/types.ts`.
   - Emit declarations for `@repo/api` and `@repo/db`.
   - The web route handlers import `appRouter` and the context factory from `@repo/api`.
   - `seed.ts` moves to `packages/api/scripts`.
   - Update `.cursor/rules/api-one-endpoint-per-file.mdc` and `AGENTS.md` to the new paths.
3. **Scaffold `apps/api`.**
   - Hono on Node.
   - Routes at the same paths the web App uses: `/api/trpc/*` through `@hono/trpc-server`, `GET /api/media/group-images/:groupId/image`, `GET /api/media/venue-logos/:venueId/logo`, `POST /api/webhooks`, and `GET /healthz`.
   - The context verifies the session with `@clerk/backend` `authenticateRequest`, which accepts a bearer header or a Clerk cookie.
   - A body limit of 4 MB on the tRPC route.
   - Its own env schema.
4. **Test the host** with Hono's `app.request()` against PGlite:
   - A protected procedure without a token returns `UNAUTHORIZED`.
   - A public procedure works without one.
   - Media returns 404 for an unknown id.
   - The webhook returns 400 for a bad signature.
5. **Deploy `apps/api`** to staging and production, with nothing calling it yet.

**Files touched.** `apps/web/src/server/**` is removed. `packages/api/**` is new. `apps/web/src/app/api/**` changes imports. `apps/web/src/trpc/**`. `apps/web/scripts/**`. `apps/api/**` is new. `turbo.json` gains the new env variables and build outputs.

**Acceptance criteria.**
- `packages/api` contains no import of `next`, `@clerk/nextjs`, `react` or `server-only`.
- The compile-time router shape check passes unchanged. No procedure path is renamed.
- All 72 server test files pass from their new location.
- The web App behaves identically and still serves `/api/trpc` in-process.
- Against a deployed `apps/api`: `/healthz` returns 200, `games.previewInviteLink` answers without a token, and an authenticated call with a real session token returns the same payload as the web App does for the same user.

**Verify.** The gate, both recordings, and a scripted comparison of five read procedures between the web origin and the API origin for one seeded user.

**Rollback.** Tasks 1 and 2 are mechanical, so revert the pull request. Tasks 3 to 5 are additive, so remove the service. No schema changes. Because task 2 touches about 380 files, merge it in a short window agreed in advance. See risk R1.

### Phase 3. Cut the web App over to the API, router by router

**Goal.** The web App holds no database or bucket credentials and runs no procedures. This is where the brief's "domain by domain" fits.

**Tasks.**
1. **Replace the three server-side reads.**
   - Add public procedures for Invite link short-code resolution with Open Graph fields, one file each for Games and Groups, wrapping the existing loaders.
   - Add a server-side tRPC HTTP client in the web App.
   - `g/[code]`, `gr/[code]` and the dashboard layout call the API through it.
2. **Add the proxy and the switch.**
   - A Next rewrite maps `/api/remote/:path*` to the API.
   - The web tRPC client attaches the Clerk bearer token.
   - A `splitLink` sends a procedure to the remote path when its router is in a `REMOTE_ROUTERS` list. Everything else still goes to the in-process handler.
3. **Cut over one router per pull request**, in this order, each with its checklist from the flow recordings and a manual pass:
   1. `venues` (Operator-only, lowest traffic)
   2. `teams`
   3. `communities`
   4. `groups`
   5. `ratings` and `users`
   6. `games`
4. **Cut over media and the webhook** by rewriting those two paths to the API.
5. **Remove the old path**, after every router has been remote in production for one week with no rollback.
   - Point `/api/:path*` at the API and remove the `splitLink`.
   - Delete the Next route handlers and `trpc/server.ts`.
   - Remove `@repo/db`, `drizzle-orm` and `@aws-sdk/client-s3` from the web App, and `DATABASE_URL`, `AWS_*` and `CLERK_WEBHOOK_SIGNING_SECRET` from its env schema.
   - Turn the boundary lint rule on as an error.

**Files touched.** `apps/web/next.config.js`, `apps/web/src/trpc/**`, `apps/web/src/app/{g,gr,dashboard}/**`, `apps/web/src/app/api/**` (deleted in task 5), `apps/web/src/env.js`, `apps/web/package.json`, two new procedure files under `packages/api/src/routers`.

**Acceptance criteria.**
- After task 5, `grep -r "@repo/db" apps/web/src` returns nothing and the web App boots without `DATABASE_URL`.
- Invite links created after cutover point at the web origin.
- Existing stored image URLs render on web with no data change.
- `/g/{code}` and `/gr/{code}` still return Open Graph titles in the HTML when signed out.
- A new sign-up reaches the Onboarding questionnaire, and the user row is created by the webhook through the API.
- Both flow recordings pass against the proxied setup.

**Verify.** Per router: the recordings, then the browser network panel shows that router's calls going to `/api/remote`. After task 5: sign up, upload a Group image, create a Game, score it, confirm it, and check the Rating moved.

**Rollback.** Before task 5, remove the router from `REMOTE_ROUTERS`. That is a one-line change with no data impact, because both hosts run the same code on the same database. Task 5 is its own pull request, and reverting it restores the in-process handlers.

### Phase 4. Auth unification

**Goal.** One session check, bearer only, identical for both clients.

**Tasks.**
1. The API context accepts bearer tokens only and sets `authorizedParties` to the web origins. Add context tests: valid token, expired token, wrong party, no token.
2. Memoize `getPublicMetadata` per request so an Operator call makes at most one Clerk request.
3. Move `phone-number` and the Clerk error-to-message mapping (without its DOM focus code) into `@repo/domain`, so the mobile forms reuse them.
4. Enable Sign in with Apple in Clerk and add it to the web auth screens beside Google.
5. Write the token contract into `packages/api/README.md`: header name, token lifetime, refresh behaviour, error codes.

**Files touched.** `apps/api/src/context.ts` and its tests, `packages/api/src/auth/**`, `packages/domain/**`, `apps/web/src/components/auth/**`.

**Acceptance criteria.**
- A request carrying only a Clerk cookie gets `UNAUTHORIZED` from the API.
- The web App works end to end, including Operator pages.
- A session token minted by the Clerk Expo SDK on a development instance is accepted by `curl` against the staging API.

**Verify.** The context tests, the recordings, and the `curl` check above.

**Rollback.** Cookie acceptance sits behind an env flag for one release. Turn it back on.

### Phase 5. Expo scaffold, design tokens, primitives, navigation shell

**Goal.** A signed-in user reaches an empty tab shell on a real device, and the gallery screen proves the design system survived.

**Tasks.**
1. **Prototype gate.** A throwaway spike on a real iPhone answers five questions before anything is built. iOS ships first, so Android is only checked to build and launch in an emulator:
   - Which NativeWind version works with the current Expo SDK and the tokens?
   - Do the cut Archivo instances render with tabular figures?
   - Does the SVG hatch scroll smoothly?
   - Does a tRPC call with a Clerk token reach the local API?
   - Does Expo install cleanly under pnpm's default linker, or does the Workspace need `node-linker=hoisted`?

   The answers go into this spec's Comments. The spike code is discarded.
2. **`@repo/design-tokens`.** The token object, the generator, the generated web theme. `globals.css` imports it.
3. **Scaffold `apps/mobile`.** Expo managed workflow, Expo Router, TypeScript, NativeWind, an `expo` TypeScript preset, the boundary lint preset, fonts through the config plugin, and the `dev` task in Turborepo. Pin the Expo SDK to the current stable release at scaffold time.
4. **Providers.** Clerk with the secure-store token cache, tRPC and TanStack Query with focus and network status wired to the app state, safe area.
5. **Primitives** from section 4.3, plus avatar, skeleton, sheet and toast. A development-only gallery screen mirrors `/dashboard/design/home`.
6. **Web `Surface` and `Hatch`** components with the shared contract. Migrate the 8 ink-surface call sites.
7. **Auth screens and the Onboarding questionnaire.** Welcome, sign in, sign up, code verification, second factor, password reset, Sign in with Apple and Google, then the two onboarding questions gated on `users.onboardingState`.
8. **Navigation shell.** Tabs for Home, Games, Groups and Profile, plus Communities when `groupCreator` is set. Placeholder screens.

**Files touched.** New `packages/design-tokens/**` and `apps/mobile/**`. `apps/web/src/styles/globals.css`. Two new web components. `packages/typescript-config/expo.json`. `packages/eslint-config`. `turbo.json`. `.npmrc` if the prototype requires it.

**Acceptance criteria.**
- Playwright screenshots of the three web design-preview pages are unchanged after the token switch.
- `pnpm dev` starts all three Apps. A phone on the same network signs in against the development Clerk instance and lands on the tab shell.
- A new user is held at the Onboarding questionnaire and released after answering.
- The gallery's hatch swatches, result marks, form slots and type samples match the web preview side by side.
- With the system's reduce-motion setting on, no mount animation plays.
- `apps/mobile` typechecks and contains no import from `@repo/db` or from `@repo/api` other than `@repo/api/types`.

**Verify.** The gate, the screenshot comparison, and a manual pass on an iPhone.

**Rollback.** The mobile App is additive and unreleased. The token switch on web is one pull request. Revert it.

### Fix track. Existing issues, fixed before mobile shows them

**Goal.** The five user-visible issues from section 1.9 are fixed on web, so mobile is built on correct behaviour.

**Scheduling.** These tickets do not depend on the migration. They touch `src/server` and `src/lib`, which Phases 1 and 2 relocate. Each one merges either before the Phase 2 move window opens or after it closes, never during. Each must be merged before the Phase 6 screen that shows it.

**F1. Group Standing is derived from Matches.**
- A member's Standing record is computed on every read from the completed Matches of the Group's Games, cancelled Games excluded. This is the approach `groupMemberWinLoss` already takes for the win-loss column (`.scratch/groups-redesign/spec.md` D2).
- The three numbers:
  - Sets won: Sets the member's side won.
  - Points won: games won inside those Matches' Sets, summed for the member's side.
  - Games played: Games on which the member sat in at least one completed Match.
- The order is unchanged: Sets won, then points won, then Games played, then name.
- A Walkover is not a Match result and counts for nothing.
- One pure function computes the records. `groups.byId`, `groups.mine` and `users.home` all use it through one shared loader, so the three surfaces cannot disagree.
- The `group_members` counter columns are no longer read or seeded. A later migration drops them.
- Acceptance: with two members and one completed Match, the winner ranks first on Group home, the Groups list and Home. After `reportWrongScore`, the Standing returns to its previous order with no extra write.

**F2. Team record is derived from Matches.**
- `teams.byId` computes played, wins and losses from completed Matches in which the Team sat as a Game team. A draw counts as played only.
- The `teams` counter columns are no longer read. A later migration drops them.
- Acceptance: a Team that registers on a team-only Game and wins its Match shows 1 played, 1 win.

**F3. Set scores are bounded on the server.**
- `games.scoreSet` refuses a value below 0 or above 7 for either side. The bounds are the constants the web client already clamps to, moved to shared code.
- A Set may still be level, because the glossary allows a drawn Set.
- Existing rows are not rewritten.
- Acceptance: a direct call with 8 is refused with a validation error, and 7 to 7 is accepted.

**F4. One definition of win rate.**
- Win rate is won divided by played, rounded to a whole percent. A draw counts as played and not as won, as the glossary defines a Match result.
- One function in shared code replaces the three in `home-recent-form.ts`, `profile-all-time-card.tsx` and `teams/[id]/page.tsx`. Home already uses this definition. Profile changes for any User with a draw.
- With nothing played, the value is a dash, not 0%. Home keeps its existing rule of showing a dash until three Matches are played.
- Acceptance: a User with 2 wins, 1 loss and 1 draw sees 50% on Profile, and the same function gives 50% for a Team with that record.

**F5. One timezone for Game times.**
- Every Game time is shown, and every day boundary is computed, in `Asia/Bahrain`, held as one constant in shared code. A timezone per Venue is out of scope until Venues outside UTC+3 exist. This covers Round grouping, "today" and "tomorrow", Invite link previews, share messages and the Game create date and time inputs.
- The server and every client produce the same text for the same Game, whatever the device or server timezone.
- No function in shared code calls `getDate()`, `getHours()` or `toLocaleString()` without the zone.
- Acceptance: with the server in UTC and a browser set to a different timezone, a Game at 23:30 local venue time shows the same day and time on the Game page and in the Invite link preview. A two-day tournament's Rounds split at venue midnight.

**F6. Price per player in fils.**
- The Bahraini dinar has three decimal places. The stored unit changes from hundredths to thousandths.
- Migration in two steps, so a deploy never reads a missing column: add `price_per_player_fils`, backfill it as the old value times 10, and switch the code. A later migration drops `price_per_player_cents`.
- Input accepts up to three decimals. Display always shows three, for example `5.500 BD`.
- Procedure inputs and outputs rename `pricePerPlayerCents` to `pricePerPlayerFils`. This is safe now because no mobile binary exists yet.
- Acceptance: an existing Game stored as 550 shows `5.500 BD`. A new Game accepts `5.125`. `5.1255` is refused.

**Files touched.** The Standing, stats and Team read models and the three Group and Home procedures. `scoreSet.ts`. `price-per-player.ts`, the price procedures and one migration. The date and time modules (`format-game-start`, `game-window`, `tournament-rounds`, `tournament-schedule`, `request-meta`, `home-countdown`). The components that hold the three win-rate functions.

**Verify.** The gate, both flow recordings, and the acceptance case for each fix on the web App.

**Rollback.** F1 to F5 are code only, so revert the pull request. F6 keeps the old column until its follow-up migration, so reverting the code restores the old behaviour with no data loss.

### Phase 6. Mobile screens

**Goal.** Everything a player or Organizer can do on web works on the iOS app, in every state, using only the primitives. Venue administration is the one exception and stays on web (decided 2026-10-03).

**Before the first screen:**
- Add cursor pagination to `games.listMyMatchHistory` and to Group Game history, and update the web callers.
- Add a `mediaUrl` helper that resolves stored relative image paths against the API origin.
- The fix track is merged for the screens that depend on it.

**Each screen is one vertical slice with the same steps:**
1. Lift the business rules that screen's web components compute inline into `@repo/domain`, and switch the web components to them.
2. Build the mobile screen on the same procedures.
3. Add its states to the gallery from shared fixtures.

Player screens, in the brief's order:

| Order | Screen | Procedures | States that must be covered |
| --- | --- | --- | --- |
| 1 | Home | `users.home`, `ratings.me`, `games.listMyMatchHistory` | Next Game on the ink surface, coming up, Level (Provisional and confirmed), Recent form, All time, Standing, no Games, no Group |
| 2 | Games list | `games.listMyGames`, `games.listMyMatchHistory`, `games.registerSeat` | My Games and History, drawn tournament rows, empty lists |
| 3 | Game details, Friendly game | `games.byId` and the registration, scoring and confirmation mutations | Upcoming, ongoing, needs results, final, cancelled. Viewer as non-member, registered, waitlisted. Partner registration. Level range blocked and Game Level range request. |
| 4 | Player profile and settings | `users.profileStats`, `ratings.me`, `users.setPreferredPosition` | Level card, All time, Recent form, Preferred Position, profile photo, sign out |
| 5 | Groups | `groups.mine`, `groups.listPublic`, `groups.byId` and the join mutations | My Groups, Public Groups list, Group home with Standing, Games and members, join, Group join request, leave |
| 6 | Friendly tournament | `games.byId` (Pool tables and Knockout tree), registration mutations | Before the Pool draw, drafted, posted, finished. Pool tables, Knockout rounds, Byes, Walkovers, Champion. Half teams. |

Create and Organizer flows, added to the first release by the scope decision:

| Order | Flow | Procedures | Notes |
| --- | --- | --- | --- |
| 7 | Create a Game and a Friendly tournament | `games.listCreateGroups`, `listCreateVenues`, `listCourts`, `create`, `createTournament` | The web flow is a 1,302-line page backed by `create-game-flow` (805 lines). Its rules move to `@repo/domain` first. The draft is held in memory. |
| 8 | Organizer actions on a Friendly game | `updateWindow`, `updatePricePerPlayer`, `updateLevelRange`, `closeRegistration`, `reopenRegistration`, `kick`, `cancel`, `cancelMatch`, `completeMatch`, `reportWrongScore`, `updateMatch`, the Level range request decisions | Shown only to an Organizer |
| 9 | Organizer actions on a Friendly tournament | `drawPools`, `postPoolDraw`, `undoPoolDraw`, `mergeHalfTeams`, `updateRoundCount`, `cancelMatch` with a Walkover | Pool draw draft and re-roll, post, undo. Knockout draw. |
| 10 | Invites | The `pendingLookupInvites` and accept procedures on four routers, `searchLookupUsers`, `sendLookupInvite`, `getInviteLink`, `createInviteLink`, `previewInviteLink`, `acceptInviteLink` | Inbox, sending Lookup invites, sharing an Invite link, accepting one opened inside the app. Opening a link from outside the app is Phase 7. |
| 11 | Teams | The `teams` router | List, create, Team home, invite the second seat, link to a Community, dissolve |
| 12 | Group create and administration | `groups.createLoose*`, `createClub*`, `uploadImage`, `clearImage`, `setRequiresApproval`, the join request decisions, `delete` | Image upload uses the device photo library and the existing base64 mutation |
| 13 | Communities | The `communities` router | List, create (shown when `groupCreator` is set), Community home, members and roles, Community join requests, Team link requests, Venue link request, Soft-archive |

**Files touched.** `apps/mobile/app/**` and `apps/mobile/src/**`. `packages/domain/**`. The web components whose inline rules are lifted. Two procedure files for pagination.

**Acceptance criteria, per screen or flow.**
- Every state in the tables renders from fixtures in the gallery and from live data.
- No raw colors, shadows or ad-hoc font families. The mobile lint config passes.
- Touch targets are at least 44 points. Hatch is hidden from the screen reader, with text carrying the meaning.
- At most two mount animations, both skipped under reduce-motion.
- Pull to refresh works and the screen refetches when the app returns to the foreground.
- A mutation refused by the server shows the server's message. No rule is re-implemented on the client to pre-empt it unless the web App does the same.
- The web App's behaviour for the lifted rules is unchanged, proven by the moved tests.

**Verify.** The gate, an iPhone pass per screen, and a side-by-side check against the web page at 390 px width.

**Rollback.** The mobile App is not released until Phase 7, so a screen can be reverted freely. The pagination change is additive: the new input is optional.

### Phase 7. Push notifications, deep links, store builds

This phase needs its own spec before tickets, because it adds product behaviour (which events notify whom) and store obligations. iOS ships first (decided 2026-10-03). Android follows as a later phase with its own device pass. The outline:

- **Deep links.** Universal links for `/g/{code}`, `/gr/{code}` and `/invites/*/link/{token}`. The association file is served by the web App. A signed-out open goes through sign-in and resumes.
- **Push.** A table of device push tokens, register and unregister procedures, and sends from the API on the chosen events.
- **Builds.** EAS build profiles for development, preview and production, TestFlight, and App Store submission.
- **API compatibility.** Once a binary is in a store, old versions keep calling the API. From this phase on, procedure changes are additive only, the client sends its version in a header, and a minimum-version check lets the app ask for an update.
- **Store requirements.** In-app account deletion and privacy disclosures. What happens to a deleted User's Matches and Ratings, and which events send a push notification, are settled in that spec.

**Rollback.** Push and deep links are additive. A bad build is rolled back by promoting the previous one.

## 6. Tickets

Published to Linear on 2026-10-03, in dependency order, with native `blocks` relations. All are in Backlog.

| # | Phase | Ticket | Title | Label | Blocked by |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | [TEM-294](https://linear.app/temba-app/issue/TEM-294) | Rename the App to web and record the three-App Workspace | `ready-for-agent` | None |
| 2 | 0 | [TEM-295](https://linear.app/temba-app/issue/TEM-295) | Remove better-auth and the unused server-actions setting | `ready-for-agent` | TEM-294 |
| 3 | 0 | [TEM-296](https://linear.app/temba-app/issue/TEM-296) | CI runs typecheck, lint and tests on every pull request | `ready-for-agent` | TEM-294 |
| 4 | Fix | [TEM-297](https://linear.app/temba-app/issue/TEM-297) | Group Standing is derived from completed Matches | `ready-for-agent` | None |
| 5 | Fix | [TEM-298](https://linear.app/temba-app/issue/TEM-298) | Team record is derived from completed Matches | `ready-for-agent` | None |
| 6 | Fix | [TEM-299](https://linear.app/temba-app/issue/TEM-299) | Set scores are bounded on the server | `ready-for-agent` | None |
| 7 | Fix | [TEM-300](https://linear.app/temba-app/issue/TEM-300) | One definition of win rate | `ready-for-agent` | None |
| 8 | Fix | [TEM-301](https://linear.app/temba-app/issue/TEM-301) | Game times use one product timezone | `ready-for-agent` | None |
| 9 | Fix | [TEM-302](https://linear.app/temba-app/issue/TEM-302) | Price per player is stored and shown in fils | `ready-for-agent` | None |
| 10 | 1 | [TEM-303](https://linear.app/temba-app/issue/TEM-303) | @repo/db connects on first use and owns the test harness | `ready-for-agent` | TEM-294 |
| 11 | 1 | [TEM-304](https://linear.app/temba-app/issue/TEM-304) | @repo/domain holds the pure modules the server depends on | `ready-for-agent` | TEM-294 |
| 12 | 1 | [TEM-305](https://linear.app/temba-app/issue/TEM-305) | Pure rating, scoring, standing and Pool table cores move to @repo/domain | `ready-for-agent` | TEM-303, TEM-304 |
| 13 | 1 | [TEM-306](https://linear.app/temba-app/issue/TEM-306) | Doubles rating core is a pure function | `ready-for-agent` | TEM-305 |
| 14 | 1 | [TEM-307](https://linear.app/temba-app/issue/TEM-307) | Remaining route-free pure modules move to @repo/domain | `ready-for-agent` | TEM-304 |
| 15 | 1 | [TEM-308](https://linear.app/temba-app/issue/TEM-308) | @repo/validators holds the shared sport schema | `ready-for-agent` | TEM-304 |
| 16 | 2 | [TEM-309](https://linear.app/temba-app/issue/TEM-309) | Server tree takes auth, role metadata and web origin from its host | `ready-for-agent` | TEM-303, TEM-305, TEM-307 |
| 17 | 2 | [TEM-310](https://linear.app/temba-app/issue/TEM-310) | Server tree moves to @repo/api | `ready-for-agent` | TEM-309 |
| 18 | 2 | [TEM-311](https://linear.app/temba-app/issue/TEM-311) | Hono host serves tRPC, media and the Clerk webhook | `ready-for-agent` | TEM-310 |
| 19 | 2 | [TEM-312](https://linear.app/temba-app/issue/TEM-312) | API deployed to Railway, staging and production | `ready-for-human` | TEM-311 |
| 20 | 3 | [TEM-313](https://linear.app/temba-app/issue/TEM-313) | Invite link pages and the onboarding gate read through the API | `ready-for-agent` | TEM-312 |
| 21 | 3 | [TEM-314](https://linear.app/temba-app/issue/TEM-314) | Web client can send any router to the API through the proxy | `ready-for-agent` | TEM-312 |
| 22 | 3 | [TEM-315](https://linear.app/temba-app/issue/TEM-315) | Cut over venues and teams to the API | `ready-for-agent` | TEM-314 |
| 23 | 3 | [TEM-316](https://linear.app/temba-app/issue/TEM-316) | Cut over communities and groups to the API | `ready-for-agent` | TEM-315 |
| 24 | 3 | [TEM-317](https://linear.app/temba-app/issue/TEM-317) | Cut over ratings, users and games to the API | `ready-for-agent` | TEM-316 |
| 25 | 3 | [TEM-318](https://linear.app/temba-app/issue/TEM-318) | Cut over media and the Clerk webhook to the API | `ready-for-agent` | TEM-314 |
| 26 | 3 | [TEM-319](https://linear.app/temba-app/issue/TEM-319) | Web App drops its API handlers, database and bucket access | `ready-for-agent` | TEM-313, TEM-317, TEM-318 |
| 27 | 4 | [TEM-320](https://linear.app/temba-app/issue/TEM-320) | API accepts bearer tokens only | `ready-for-agent` | TEM-319 |
| 28 | 4 | [TEM-321](https://linear.app/temba-app/issue/TEM-321) | Phone and auth-error helpers are shared through @repo/domain | `ready-for-agent` | TEM-307 |
| 29 | 4 | [TEM-322](https://linear.app/temba-app/issue/TEM-322) | Sign in with Apple on web | `ready-for-human` | None in Linear. Needs an Apple Developer membership. |
| 30 | 5 | [TEM-323](https://linear.app/temba-app/issue/TEM-323) | Prototype on an iPhone: styling, fonts, hatch and an authenticated call | `ready-for-human` | TEM-312 |
| 31 | 5 | [TEM-324](https://linear.app/temba-app/issue/TEM-324) | @repo/design-tokens feeds the web theme with no visual change | `ready-for-agent` | TEM-323 |
| 32 | 5 | [TEM-325](https://linear.app/temba-app/issue/TEM-325) | Expo App scaffold with providers and the custom Archivo instances | `ready-for-agent` | TEM-323, TEM-324 |
| 33 | 5 | [TEM-326](https://linear.app/temba-app/issue/TEM-326) | Mobile primitives and gallery | `ready-for-agent` | TEM-325 |
| 34 | 5 | [TEM-327](https://linear.app/temba-app/issue/TEM-327) | Web Surface and Hatch share the primitive contract | `ready-for-agent` | TEM-324 |
| 35 | 5 | [TEM-328](https://linear.app/temba-app/issue/TEM-328) | Mobile sign-in, sign-up and the Onboarding questionnaire | `ready-for-agent` | TEM-320, TEM-321, TEM-322, TEM-326 |
| 36 | 5 | [TEM-329](https://linear.app/temba-app/issue/TEM-329) | Mobile tab shell | `ready-for-agent` | TEM-328 |
| 37 | 6 | [TEM-330](https://linear.app/temba-app/issue/TEM-330) | Match history and Group Game history are paginated | `ready-for-agent` | TEM-310 |
| 38 | 6 | [TEM-331](https://linear.app/temba-app/issue/TEM-331) | Mobile Home | `ready-for-agent` | TEM-297, TEM-300, TEM-301, TEM-329, TEM-330 |
| 39 | 6 | [TEM-332](https://linear.app/temba-app/issue/TEM-332) | Mobile Games list | `ready-for-agent` | TEM-331 |
| 40 | 6 | [TEM-333](https://linear.app/temba-app/issue/TEM-333) | Mobile Game details for a Friendly game | `ready-for-agent` | TEM-299, TEM-302, TEM-332 |
| 41 | 6 | [TEM-334](https://linear.app/temba-app/issue/TEM-334) | Mobile player profile and settings | `ready-for-agent` | TEM-300, TEM-331 |
| 42 | 6 | [TEM-335](https://linear.app/temba-app/issue/TEM-335) | Mobile Groups: browse, join and Group home | `ready-for-agent` | TEM-297, TEM-331 |
| 43 | 6 | [TEM-336](https://linear.app/temba-app/issue/TEM-336) | Mobile Friendly tournament | `ready-for-agent` | TEM-333 |
| 44 | 6 | [TEM-337](https://linear.app/temba-app/issue/TEM-337) | Mobile create Game and create Friendly tournament | `ready-for-agent` | TEM-333, TEM-336 |
| 45 | 6 | [TEM-338](https://linear.app/temba-app/issue/TEM-338) | Mobile Organizer actions on a Friendly game | `ready-for-agent` | TEM-333 |
| 46 | 6 | [TEM-339](https://linear.app/temba-app/issue/TEM-339) | Mobile Organizer actions on a Friendly tournament | `ready-for-agent` | TEM-336, TEM-338 |
| 47 | 6 | [TEM-340](https://linear.app/temba-app/issue/TEM-340) | Mobile invites: inbox, Lookup invites and Invite links | `ready-for-agent` | TEM-333, TEM-335 |
| 48 | 6 | [TEM-341](https://linear.app/temba-app/issue/TEM-341) | Mobile Teams | `ready-for-agent` | TEM-298, TEM-340 |
| 49 | 6 | [TEM-342](https://linear.app/temba-app/issue/TEM-342) | Mobile Group create and administration | `ready-for-agent` | TEM-335, TEM-340 |
| 50 | 6 | [TEM-343](https://linear.app/temba-app/issue/TEM-343) | Mobile Communities | `ready-for-agent` | TEM-341, TEM-342 |
| 51 | 7 | [TEM-344](https://linear.app/temba-app/issue/TEM-344) | Spec: universal links, push, App Store release and API compatibility | `ready-for-human` | TEM-329 |

- TEM-297 to TEM-302 follow the fix track's scheduling rule: merged before the freeze window for TEM-310 opens, or after it closes.
- TEM-323 to TEM-327 can start as soon as the API is deployed (TEM-312). They do not wait for the web cutover.
- The frontier, with no blockers: TEM-294, the six fix-track tickets, and TEM-322 once the Apple Developer membership exists.

## 7. Risks

| # | Risk | Likelihood | Mitigation |
| --- | --- | --- | --- |
| R1 | The server move (TEM-310) touches about 380 files and conflicts with feature work in flight | High | Do the host-neutral prep first so the move is purely mechanical. A short freeze on server changes was agreed on 2026-10-03. Merge in that window with no open pull requests against `src/server`. |
| R2 | Typechecking clients against server types is slow or fails under mobile compiler options | Medium | Emitted declarations (D9). The Phase 5 prototype confirms it before the scaffold. |
| R3 | NativeWind v5, the Tailwind v4 line, was a release candidate at the time of writing | Medium | The prototype decides between v5 and v4. Tokens are data, so either can be generated. Primitives hide the styling library from screens. |
| R4 | The custom 115-width Archivo instance looks different from the web's variable rendering, loses tabular figures, or cannot keep the family name under the font licence | Medium | The prototype compares on device and the ticket checks the licence. Fallback is the stock 112.5 file. |
| R5 | Clerk session tokens from the Expo SDK fail the API's party check | Low | Tested with `curl` in Phase 4, before any mobile code exists. |
| R6 | The proxy hop adds latency or cost, depending on where the web App runs | Medium | Where the web App runs is not yet recorded. If it is not on Railway beside the API, switch the browser to direct calls with CORS, which bearer auth already allows. |
| R7 | The Clerk webhook breaks during cutover and new users get stuck at "provisioning" | Low | The webhook path does not change, because the proxy forwards it. The Onboarding questionnaire already shows a wait state and a sign-out. |
| R8 | The App Store rejects the app for missing account deletion | High if unaddressed | Sign in with Apple is in scope (TEM-322). Account deletion is designed in the Phase 7 spec. |
| R9 | A fix-track change alters what web users see: Standing order, three-decimal prices, venue-local times | Certain | These are the intended fixes. Each ticket carries its acceptance case, and the price change keeps the old column until a follow-up migration. |
| R10 | A deployed API and old mobile binaries drift apart | Certain after release | The additive-only rule and version header in Phase 7. |
| R11 | Expo needs a hoisted install and that changes how the web App resolves packages | Medium | Checked in the prototype. If required, the change lands alone with a full web gate run. |
| R12 | Two deployments (web and API) from one commit are briefly on different versions | Low | Additive API changes. Deploy the API before the web App. |
| R13 | The first mobile release is now the whole product except Venue administration: 13 screens and flows, including the two largest web pages | High | Player screens 1 to 6 ship to TestFlight first as an internal build. Flows 7 to 13 follow in order. Rules are lifted to `@repo/domain` before each port, so the mobile work is view code. |
| R14 | Android is untested until it is taken up, and Android-only problems (font rendering, hatch performance) surface late | Medium | The Android build is kept compiling in an emulator from Phase 5, and primitives hide platform differences from screens. |

## 8. Out of scope

- Replacing Clerk, Drizzle, tRPC or Postgres.
- Rewriting procedures. Phases 2 and 3 move code without changing behaviour.
- Extracting single-endpoint logic out of procedure files.
- A shared component library across web and mobile, and `react-native-web`.
- Migrating the web App to the newer tRPC TanStack client or to a form library.
- Tokenising the web App's spacing call sites.
- Dark mode, internationalisation and right-to-left layout.
- The Challenges flow. It is planned after this work, in its own spec (decided 2026-10-03).
- Venue administration on mobile. Operators use the web App.
- An Android release. Android follows iOS as a later phase.
- Football-specific behaviour.
- Items 6 to 8 of section 1.9: the duplicated completion sequence, the development delay and the leftover procedures.
- Offline support and realtime updates on mobile.

## 9. Decisions

### Answered on 2026-10-03

| Question | Decision |
| --- | --- |
| Hosting for the API | Railway |
| Rename `apps/temba` to `apps/web`, superseding ADR-0002 | Yes |
| Apple sign-in | Add Sign in with Apple on web and mobile |
| Mobile first-release scope | Everything except Venue administration |
| Challenges | Planned after this work, in its own spec |
| Existing issues | Fix all five user-visible ones before mobile shows them (the fix track) |
| Palette and radius | Tokens take the code's values. Both radii stay: 16 for hero and primary surfaces, 14 for cards and rows. |
| Expanded font | Custom 115-width Archivo instance |
| Platforms | iOS first |
| Freeze for the server move | Acceptable |

Two readings were taken where an answer was short. Correct them here if they are wrong:

- "After" for Challenges is read as after the mobile screens, not only after Phase 2.
- "Confirm" for the radius is read as confirming the code as it stands, which keeps both 14 and 16 with the roles above.

Also answered on 2026-10-03, in a second round:

| Question | Decision |
| --- | --- |
| CI | Yes. A GitHub Actions workflow runs typecheck, lint and tests on pull requests. |
| Win rate | Won divided by played. A draw counts as played. |
| Timezone | `Asia/Bahrain` as the one product timezone |

Answered on 2026-10-04:

| Question | Decision |
| --- | --- |
| `friendly-game-partner` and `tournament-join` return web routes but the server imports them (TEM-304) | Move both to `@repo/domain` as they are. They are the only modules there allowed to return web route strings, until Phase 6 gives them a typed target. |

### Still unrecorded

Nothing blocks a ticket. Two things are settled later:

- Where the web App runs. This only decides whether the proxy hop stays on a private network (risk R6).
- In-app account deletion, and which events send a push notification. Both belong to the Phase 7 spec.

## Comments

_None yet._
