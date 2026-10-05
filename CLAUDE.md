@AGENTS.md

# Temba Workspace guide

Temba is moving from one Next.js App to three Apps (web, mobile, API) on shared Packages. The plan, audit and open questions are in `.scratch/mobile-and-api-server/spec.md`. Read it before any structural work.

Use the glossary in `CONTEXT.md`. Say **Workspace**, **App** and **Package**, not "monorepo" or "the app".

## Migration status

Tickets are in Linear as TEM-294 … TEM-344. Section 6 of the spec maps them to phases. Update this table in the same pull request that completes a phase.

| Phase | What it delivers | Status |
| --- | --- | --- |
| 0 | `apps/temba` renamed to `apps/web` | Done in code, human steps pending |
| Fix | Standing and Team records from Matches, Set bounds, one win rate, one timezone, prices in fils | Done |
| 1 | `@repo/domain`, `@repo/validators`, `@repo/db` importable without connecting | Done in code, human steps pending |
| 2 | `@repo/api` Package and the `apps/api` Hono host | Done in code, human steps pending |
| 3 | Web App calls the API over HTTP and drops its database access | Done in code, human steps pending |
| 4 | Bearer-only session check in the API context | Done in code, human steps pending |
| 5 | `apps/mobile` scaffold, `@repo/design-tokens`, primitives, tab shell | Done in code, human steps pending |
| 6 | Mobile screens and flows: everything except Venue administration | Done in code, human steps pending |
| 7 | Push, universal links, App Store build (iOS first) | Not started |

Until a phase lands, its paths below do not exist. Do not create them outside that phase's tickets.

Settled decisions: the API runs on Railway, Clerk stays and gains Sign in with Apple, iOS ships before Android, and Venue administration stays web only.

## Layout

Today:

```text
apps/web                     Next.js 15 App: UI only, `/api/*` is rewritten to the API App
apps/mobile                  Expo App (SDK 57): Expo Router, NativeWind v5, Clerk, tRPC; scaffold and placeholder screen only
apps/api                     Hono host: verifies the session, builds the context, mounts routes
packages/api                 @repo/api: tRPC routers, procedures, shared server modules
packages/db                  @repo/db: Drizzle schema, client, migrations, PGlite harness
packages/domain              @repo/domain: pure rules and calculations
packages/design-tokens       @repo/design-tokens: tokens as data, generates the web theme stylesheet
packages/validators          @repo/validators: Zod schemas with two or more callers
packages/eslint-config       @repo/eslint-config
packages/typescript-config   @repo/typescript-config
```

Target:

```text
apps/web      Next.js UI                  apps/mobile   Expo UI
apps/api      Hono host, no business logic
packages/api            @repo/api            tRPC routers, procedures, shared server modules
packages/db             @repo/db             schema, client, migrations, PGlite harness
packages/domain         @repo/domain         pure rules and calculations
packages/validators     @repo/validators     Zod schemas with two or more callers
packages/design-tokens  @repo/design-tokens  colors, spacing, radii, type scale, hatch geometry
```

## Commands

Run from Root. The Web App filter is `web`.

```bash
pnpm install
./start-database.sh                          # local Postgres in Docker
pnpm exec turbo run dev --filter web         # web on :3000
pnpm exec turbo run typecheck lint test      # the gate for every pull request
pnpm exec turbo run build --filter web
pnpm --filter web format:write
pnpm --filter @repo/api db:seed              # wipes and seeds a local database
pnpm exec turbo run db:generate              # new migration from schema changes
pnpm exec turbo run db:migrate
```

- Tests run on PGlite and need neither Postgres nor `DATABASE_URL`: `@repo/db` connects on first use. The harness is `@repo/db/testing`.
- A single test: `pnpm --filter web exec vitest run path/to/file.test.ts`, or `pnpm --filter @repo/api exec vitest run path/to/file.test.ts` for the server tree.
- The API runs on port 4000. `pnpm dev` runs web, API and mobile together; the Expo dev server is on port 8081 and needs `apps/mobile/.env` (copy `.env.example`).

## Package boundaries

These bind all new code. Existing code is brought into line by the phase that moves it.

```text
apps/web, apps/mobile  ──► @repo/domain, @repo/validators, @repo/design-tokens, @repo/api/types
apps/api               ──► @repo/api, @repo/db
@repo/api              ──► @repo/db, @repo/domain, @repo/validators
@repo/validators       ──► @repo/domain
@repo/domain, @repo/db, @repo/design-tokens ──► no Workspace imports
```

- **Clients never import server code.** `apps/web/src` and `apps/mobile` may import `@repo/api/types` with `import type` and nothing else from `@repo/api`. They never import `@repo/db`. Scripts under `apps/web/scripts` are exempt.
- **`@repo/domain` is pure.** No database, React, Next, DOM, `node:` modules or web route strings. The one exception is `friendly-game-partner` and `tournament-join`, which keep their routes until Phase 6 (spec section 9). A function goes there only if a client uses it, or two or more server callers do.
- **`@repo/validators` is for shared schemas only.** A schema used by one procedure stays inline in that procedure file.
- **`@repo/api` is host-neutral.** No `next/*`, `@clerk/nextjs`, `react` or `server-only`. Auth, role metadata and the web origin arrive through the context.
- **`apps/api` holds no business logic.** It verifies the session, builds the context and mounts routes.
- **No `~/` alias inside Packages.** It is a web App alias. `@repo/api` uses `#src/...` subpath imports (webpack rejects `#/`). Other Packages use relative imports.
- **No barrel files** in `@repo/domain`. Import `@repo/domain/<module>`.

## Conventions

- **One endpoint per file** stays binding (`.cursor/rules/api-one-endpoint-per-file.mdc`). Do not move a procedure's logic into `@repo/domain` or `@repo/validators` to make the file smaller.
- **Do not rename tRPC procedure paths.** Once the mobile App is released, API changes are additive only.
- **Moves are moves.** When code changes Package, use `git mv` and change only import lines in that pull request. Tests move with their source.
- **Tests.** Pure logic gets Vitest unit tests beside it. Procedures are tested through the plain function exported from the procedure file, against PGlite.
- **Migrations.** Never edit an existing migration. Generate a new one.
- **Docs.** Record architectural decisions in `docs/adr/` and new terms in `CONTEXT.md`. Specs live in `.scratch/<feature>/spec.md`. Tickets live in Linear.

## Design system rules for mobile

The design system is locked. See section 4 of the spec for values.

- Black and white only. No accent color, no dark theme.
- Hairline borders, never shadows.
- Colors, spacing, radii and type sizes come from `@repo/design-tokens`. No hex literals in screens.
- Text goes through the `Text` primitive, which sets the font family and tabular figures. Never set `fontFamily` or `fontWeight` directly.
- `Surface tone="ink"` marks the one upcoming focus on a screen. Finished things are `paper`.
- `Hatch` means "not yet". `ResultMark` and `FormSlot` are solid for a win, outline for a loss, hatched for not played.
- At most two mount animations per screen, through `MountFill` and `MountDraw`, both honouring reduce-motion.
