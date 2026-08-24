Status: ready-for-agent

## Problem Statement

Temba is a single Create T3 App at git Root. The developer wants this same repository to become a pnpm + Turborepo Workspace in the same *style* as EWA Connect (thin Root, Apps and Packages, DB as a Package) without changing what people using Temba see, without switching Drizzle to Prisma, and without pretending Route `/public` is a second product.

Today every install, script, env file, and Drizzle config assumes the App *is* the Workspace. That blocks extracting a DB Package, sharing lint/tsconfig, and running Turborepo tasks the way EWA Connect does.

## Solution

Convert this git repository into a Workspace: one App (`temba`) and three Packages (`@repo/db`, `@repo/eslint-config`, `@repo/typescript-config`). Move the existing T3 App and Drizzle schema with history preserved. Root stays script-less except Turborepo as a dependency. Product routes, Clerk, tRPC behavior, and the existing Drizzle prefix mismatch stay as they are. Developers run the App and DB Package through `pnpm exec turbo` / `pnpm --filter`, with env files next to each consumer (duplicate `DATABASE_URL`).

Approving this spec approves the **Test seams** in Testing Decisions.

## User Stories

1. As a developer, I want the git Root to be a Workspace rather than the App itself, so that I can add Packages without relocating the product later.

2. As a developer, I want exactly one App named `temba`, so that I am not operating a second Next process that has no product.

3. As a developer, I want Route `/public` to keep redirecting to login, so that conversion does not invent a public product.

4. As a developer, I want to `pnpm install` from Root and get the App and all Packages, so that I do not manage multiple lockfiles.

5. As a developer, I want Root `package.json` to be private and to declare `packageManager: pnpm@10.13.1`, so that nobody publishes the Workspace and everyone uses the same pnpm.

6. As a developer, I want no scripts on Root, so that I run work through Turborepo or `pnpm --filter` the way EWA Connect does.

7. As a developer, I want a short README of Workspace commands, so that I know how to dev, lint, typecheck, build, format, and run Drizzle kit after the move.

8. As a developer, I want `git mv` of the existing App and DB files, so that blame and history still point at Temba’s T3 sources.

9. As a developer, I want `.cursor/` to stay at Root, so that planner/implementer/reviewer rules still apply to the Workspace.

10. As a developer, I want the App’s `~/*` path alias to keep working inside `temba`, so that existing imports do not become `@/` or relative soup.

11. As a developer, I want tRPC to keep importing `db` from `~/server/db`, so that the App’s API layer does not care that Drizzle moved.

12. As a developer, I want `~/server/db` to be a thin re-export of `@repo/db`, so that there is a single connection singleton.

13. As an app user, I want `/` to still send me to dashboard when signed in and to login when not, so that conversion is invisible.

14. As an app user, I want `/login` and `/signup` to keep using Clerk, so that I do not get a different auth product.

15. As an app user, I want `/dashboard` to stay Clerk-protected, so that unauthenticated people cannot see it.

16. As an app user, I want Route `/public` to still take me to login, so that a dead route does not start rendering a new site.

17. As an app user, I want the existing tRPC `games` procedures to keep responding as they do today, so that scaffolding behavior does not regress.

18. As a developer, I want Clerk keys to remain required by the App’s env module, so that `next build` / `next dev` still fail closed without them.

19. As a developer, I want the App’s env module to still require `DATABASE_URL`, so that the App cannot boot without a database URL even though the DB Package also has one.

20. As a developer, I want `DATABASE_URL` in both the App env file and the DB Package env file, so that Next and drizzle-kit each load env from their own directory.

21. As a developer, I do not want the DB Package to import the App’s env module, so that `@repo/db` is not glued to Next.

22. As a developer, I want drizzle-kit to load `DATABASE_URL` from the DB Package env file via dotenv, so that `db:generate` / `db:migrate` / `db:push` / `db:studio` work from that Package.

23. As a developer, I want the runtime Drizzle client to read `process.env.DATABASE_URL` without dotenv, so that Next supplies env when the App imports `@repo/db`.

24. As a developer, I want drizzle-kit to keep the same schema and `tablesFilter: ["temba_*"]`, so that we do not “fix” the existing unprefixed table names during this move.

25. As a developer, I want unused `createTable` and better-auth leftovers to move with the tree unchanged, so that this conversion does not become a cleanup PR.

26. As a developer, I want `@repo/db` to export the `db` singleton and schema from its package entry, so that the App can re-export them without a second client.

27. As a developer, I want `@repo/db` to ship TypeScript source (no emit/build), so that we match EWA Connect’s DB Package export style while staying on Drizzle.

28. As a developer, I want the Next App to transpile `@repo/db`, so that `next build` compiles that raw TypeScript.

29. As a developer, I want `pnpm exec turbo run typecheck` to typecheck both `temba` and `@repo/db`, so that schema errors are not only discovered through the App import.

30. As a developer, I want `pnpm exec turbo run lint` to lint both `temba` and `@repo/db`, so that shared TypeScript rules apply to the DB Package.

31. As a developer, I want `pnpm exec turbo run build --filter temba` to produce a working Next build, so that the App still ships.

32. As a developer, I want `turbo run dev` not to run `db:generate` first, so that starting the App does not author Drizzle migrations.

33. As a developer, I want explicit `db:generate`, `db:migrate`, `db:push`, and `db:studio` on the DB Package, so that I opt into schema and kit work.

34. As a developer, I want Turborepo task names to match those scripts (`typecheck`, not `check-types`; no unused `db:deploy`), so that `turbo run` actually executes something.

35. As a developer, I want `globalEnv` to list Temba’s real variables (`DATABASE_URL`, Clerk keys, `SKIP_ENV_VALIDATION`, and `NODE_ENV` if needed for the client HMR cache), so that we do not copy EWA Connect’s KPI/Redis/OUC keys.

36. As a developer, I want a nested turbo config on the App that extends Root and treats `.env*` as build inputs, so that env changes bust the App’s build cache the way EWA Connect’s internal App does.

37. As a developer, I want that nested config not to assume `dist/` or `output: "standalone"`, so that we do not invent a Docker/standalone deploy in this conversion.

38. As a developer, I want `@repo/typescript-config` with `base`, `nextjs`, and `library` presets, so that the App and DB Package share Temba’s compiler strictness.

39. As a developer, I want the App’s tsconfig to extend `nextjs` and set `~/*` locally, so that the alias is not baked into a shared preset that the DB Package cannot use.

40. As a developer, I want the DB Package tsconfig to extend `library` and include its source only, so that a non-Next Package is not given the Next plugin or DOM libs it does not need.

41. As a developer, I want no tsconfig at Root, so that typecheck is always a Package/App task.

42. As a developer, I want `@repo/eslint-config` to export `./base` and `./next-js` only, so that we do not ship an unused React-library preset.

43. As a developer, I want `./next-js` to keep Temba’s T3 rules, `next/core-web-vitals`, and Drizzle `db` / `ctx.db` enforcement, so that App queries do not lose lint.

44. As a developer, I want `./base` to be those T3 TypeScript rules without Next or Drizzle, so that the DB Package can lint schema TypeScript.

45. As a developer, I do not want eslint-plugin-turbo or only-warn, so that extracting config Packages is not a silent lint rewrite.

46. As a developer, I want one Prettier config at Root including today’s Tailwind plugin, so that App UI class sorting does not disappear.

47. As a developer, I want the App to keep `format:*` scripts that use that Root config, so that my current format workflow still exists.

48. As a developer, I want the DB Package to gain `format:*` scripts against the same Root config, so that schema TypeScript is formatted the same way.

49. As a developer, I do not want a Turborepo `format` task, so that format stays an explicit Package script as decided for this conversion.

50. As a developer, I do not want a Prettier *Package*, so that we do not expand scope past eslint/tsconfig Packages.

51. As an operator, I want `start-database.sh` to remain at Root, so that local Postgres is still one command from the Workspace.

52. As an operator, I want that script to source the DB Package env file, so that kit and the container agree on `DATABASE_URL`.

53. As an operator, I want a generated password written to both the DB Package env file and the App env file, so that Next and drizzle-kit cannot silently use different passwords.

54. As an operator, I want the script to exit with a copy-example message if the App env file is missing, so that dual-write cannot no-op on a missing file.

55. As an operator, I want `.env.example` next to the App (Clerk + `DATABASE_URL`) and next to the DB Package (`DATABASE_URL` only), so that I know what to copy where.

56. As a developer, I want Root `.npmrc` to keep hoisting eslint and prettier, so that those tools resolve as they do today.

57. As a developer, I do not want a second copy of `.npmrc` inside the App, so that we do not duplicate EWA Connect’s redundant per-app npmrc.

58. As a developer, I want gitignore to understand a Workspace (`.turbo`, unrooted `node_modules`, `.next`), so that caches and installs are not committed.

59. As a developer, I want eslint/prettier/tsconfig *contents* to stay Temba T3, so that the conversion is structural rather than a style rewrite.

60. As a future reader, I want ADRs that say why this Workspace is one App and why config Packages exist despite EWA Connect, so that nobody “fixes” those toward a carbon copy.

## Implementation Decisions

- The Workspace uses pnpm workspaces (`apps/*`, `packages/*`) and Turborepo at Root. Root `package.json` is private, pins `pnpm@10.13.1`, depends on turbo only, and has no scripts.

- There is one App: `temba`. The current T3 application is moved into that App with `git mv`. Route `/public` stays a stub.

- Packages created in this conversion: `@repo/db`, `@repo/eslint-config`, `@repo/typescript-config`. No UI Package, no auth Package, no Prettier Package.

- `@repo/db` owns Drizzle schema, migrations, kit config, and the singleton `db` (plus schema re-exports) from a single package entry pointing at TypeScript source. No `build` / no emit. It has `lint`, `typecheck`, `format:*`, and `db:generate` / `db:migrate` / `db:push` / `db:studio`.

- The App keeps `~/server/db` as `export { db } from "@repo/db"` (schema may be re-exported the same way if callers need it). tRPC continues to use `~/server/db`. Call sites are not rewritten to `@repo/db`.

- The App’s env module remains the T3 `@t3-oss/env-nextjs` gate for Clerk keys + `DATABASE_URL`. The DB Package never imports that module.

- drizzle-kit in the DB Package loads dotenv from the DB Package env file. The runtime client uses `process.env.DATABASE_URL` (and `process.env.NODE_ENV` for the existing HMR connection cache) with no dotenv.

- `tablesFilter` stays `["temba_*"]`. Unused `createTable` moves with the DB Package. No schema prefix cleanup.

- The App’s Next config transpiles `@repo/db` so the raw TypeScript entry compiles. This is required by the source export, not a product toggle.

- Root `turbo.json` tasks: `build` (`dependsOn: ^build`, Next outputs, excluding cache), `dev` (persistent, cache false, **no** `^db:generate`), `typecheck`, `lint`, `db:generate`, `db:migrate`, `db:push`, `db:studio`. No `check-types`, no `db:deploy`, no `format` task.

- `globalEnv`: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `SKIP_ENV_VALIDATION`, and `NODE_ENV`.

- The App has a nested turbo config extending Root, with `.env*` as build inputs, without `dist/**` or standalone output.

- `@repo/typescript-config`: `base` (Temba strictness, no DOM, no Next, no paths), `nextjs` (DOM, jsx preserve, Next plugin, noEmit), `library` (for `@repo/db`, no Next plugin). The App tsconfig extends `nextjs` and sets `~/*` locally. The DB Package tsconfig extends `library` and includes its source. No Root tsconfig.

- `@repo/eslint-config`: `./base` (T3 typescript-eslint, no Next, no Drizzle) and `./next-js` (base + next/core-web-vitals + current Drizzle rules). No `./react-internal`. No eslint-plugin-turbo / only-warn. The App uses `./next-js`; `@repo/db` uses `./base`.

- Prettier: one config at Root, including the current Tailwind plugin. App and DB Package `format:*` scripts use it. Not a turbo task. Not a Package.

- `.npmrc` remains at Root only (existing eslint/prettier hoist). Gitignore is updated for a Workspace (`.turbo`, unrooted `node_modules`/`.next`) without EWA Connect’s Expo noise.

- `start-database.sh` stays at Root. It sources the DB Package env file. If it generates a password, it updates both that file and the App env file. If the App env file is missing, it exits and tells the operator to copy the App example env first.

- README: minimum Workspace run commands only. `.cursor/` stays at Root.

- Copy from EWA Connect: thin turbo Root, apps/packages layout, per-consumer env files, DB as a Package, nested App turbo config, unscoped App name, `@repo/` Package names, gitignore `.turbo` + unrooted `node_modules`, hoist eslint/prettier.

- Fork from EWA Connect: Drizzle not Prisma; one App; shared eslint/tsconfig Packages; Root Prettier; `typecheck` not `check-types`; drizzle `push`/`studio`; no `^db:generate` on `dev`; `"private": true` on Root; transpile `@repo/db`; DB Package has lint/typecheck/format.

## Testing Decisions

### What a good test is

This conversion has **no test suite and no CI**. Do not add Vitest, Jest, or CI. The test is **external Workspace behavior**: commands a developer runs, env validation the App already does, and product routes/auth/tRPC that users already hit. Do not assert exact turbo JSON keys, export maps, or file layout except as those commands and product outcomes fail.

### Test seams

Highest seam (one): **Workspace commands still produce a working Temba App with the same product behavior.**

If you approve this spec, you approve these seams:

- `pnpm exec turbo run typecheck` and `pnpm exec turbo run lint` succeed for `temba` and `@repo/db`
- `pnpm exec turbo run build --filter temba` succeeds
- The App still validates Clerk + `DATABASE_URL` via its env module
- tRPC still obtains `db` through the App’s `~/server/db` re-export of `@repo/db`
- drizzle-kit still uses the same schema and `tablesFilter: ["temba_*"]` (behavior-preserving, including the existing prefix mismatch)
- `start-database.sh` from Workspace Root sources the DB Package `.env` and dual-writes generated passwords to both env files
- Root Prettier config is picked up by both the App’s `format:*` scripts and `@repo/db` `format:*` scripts

Manual product check (same seam, user-visible): `/` auth redirect, `/login` `/signup` Clerk, `/dashboard` protected, Route `/public` → login.

### Modules under that seam

The Workspace Root (turbo, prettier, start-database), App `temba` (Next, env, tRPC, re-export), and Packages `@repo/db`, `@repo/eslint-config`, `@repo/typescript-config` — only as they affect the commands and product behavior above.

### Prior art

None. Temba has no tests.

## Out of Scope

- Clerk → better-auth (or the reverse). Do not delete better-auth leftovers or better-auth-shaped tables.
- Prisma, or changing Drizzle table prefixes / unused `createTable` / T3 hello router except so kit still points at the moved schema.
- A second App, a real public product, or filling Route `/public`.
- UI Package, auth Package, Prettier Package, `./react-internal` eslint export.
- Unused tRPC App-to-app exports (`trpc-react` / `trpc-server`).
- CI, Docker, Vercel, `output: "standalone"`.
- Copying EWA Connect leftovers: in-app drizzle, Expo gitignore, KPI/Redis/OUC `globalEnv`, dead `check-types`, missing `"private": true`.
- Feature work, visual redesign, new routers.
- Adding a test runner or a Turborepo `format` task.

## Further Notes

EWA Connect is the *style* reference for Workspace layout and DB-as-Package, not a file-for-file clone. The deliberate forks are listed under Implementation Decisions and in `docs/adr/`.

Glossary: Root `CONTEXT.md`. Architecture: `docs/adr/0001` (Workspace), `0002` (one App), `0003` (shared eslint/tsconfig; Root Prettier noted there).

Next step after the user approves this spec: **to-tickets** (local markdown under `.scratch/turborepo-monorepo/issues/`). Do not implement until tickets exist and an implementer is asked to run them.
