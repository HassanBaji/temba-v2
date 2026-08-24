# 03: Extract the DB Package behind `~/server/db`

**What to build:** Drizzle schema, the `db` singleton, kit config, and migrations live in `@repo/db`. The App still at Root keeps a thin `~/server/db` re-export, so tRPC and other callers do not change import path. Next transpiles `@repo/db`. The runtime client reads `process.env.DATABASE_URL` with no dotenv; drizzle-kit loads `DATABASE_URL` from the DB Package env file via dotenv. `tablesFilter` stays `["temba_*"]`. Unused `createTable` and better-auth leftovers move with the schema unchanged. The DB Package has `lint`, `typecheck`, and `db:generate` / `db:migrate` / `db:push` / `db:studio`, using the shared config Packages. The App still runs from Root.

**Blocked by:** 01: Expand Workspace Root around the current App; 02: Share T3 lint and TypeScript config Packages

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] `@repo/db` is the single owner of schema, singleton `db`, kit, and migrations (moved with `git mv`); package entry is TypeScript source (no emit/build)
- [ ] App `~/server/db` re-exports `db` from `@repo/db`; tRPC still imports `~/server/db`
- [ ] The DB Package does not import the App env module
- [ ] Runtime client uses `process.env.DATABASE_URL` (and `NODE_ENV` for the existing HMR connection cache) with no dotenv
- [ ] drizzle-kit uses the DB Package env file via dotenv; `tablesFilter` remains `["temba_*"]`
- [ ] Next transpiles `@repo/db`
- [ ] `@repo/db` has `lint` and `typecheck` via `@repo/eslint-config` `./base` and `@repo/typescript-config` `library`
- [ ] `pnpm dev`, `pnpm typecheck`, and `pnpm lint` from Root still succeed; turbo `typecheck` / `lint` include the DB Package
- [ ] DB Package `.env.example` documents `DATABASE_URL` only
