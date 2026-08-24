# 01: Expand Workspace Root around the current App

**What to build:** This git Root becomes a pnpm + Turborepo Workspace while the T3 App still lives at Root with its current scripts. A developer can `pnpm install`, `pnpm dev`, `pnpm typecheck`, and `pnpm lint` from Root exactly as today. Turborepo is installed and can run those same App scripts. `dev` does not depend on `db:generate`. The App is not moved. No DB Package or config Packages are required yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] Root `package.json` is private, pins `pnpm@10.13.1`, and lists turbo as a Root tooling dependency
- [ ] Root still has the current App scripts so `pnpm dev`, `pnpm typecheck`, and `pnpm lint` work from Root
- [ ] pnpm workspaces include `apps/*` and `packages/*`
- [ ] Root Turborepo config declares `build`, `dev`, `typecheck`, `lint`, and the `db:*` tasks from the spec (`dev` is persistent, uncached, and does **not** depend on `db:generate`)
- [ ] `globalEnv` lists Temba keys only (`DATABASE_URL`, Clerk keys, `SKIP_ENV_VALIDATION`, `NODE_ENV`)
- [ ] `pnpm install` from Root succeeds
- [ ] The App still runs from Root with unchanged product routes and Clerk
