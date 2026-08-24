# 06: Integrate and verify Workspace test seams

**What to build:** The conversion is done when the spec’s single test seam is true: Workspace commands still produce a working Temba App with the same product behavior. Glue anything ticket 05 left broken. Do not add a test runner or CI. This ticket is where “green” is promised.

**Blocked by:** 04: Lift Prettier to Root for App and DB Package; 05: Contract: move the App to `apps/temba` and thin Root

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] `pnpm exec turbo run typecheck` succeeds for `temba` and `@repo/db`
- [ ] `pnpm exec turbo run lint` succeeds for `temba` and `@repo/db`
- [ ] `pnpm exec turbo run build --filter temba` succeeds
- [ ] The App still validates Clerk + `DATABASE_URL` via its env module
- [ ] tRPC still obtains `db` through the App’s `~/server/db` re-export of `@repo/db`
- [ ] drizzle-kit still uses the same schema and `tablesFilter: ["temba_*"]`
- [ ] `start-database.sh` from Root sources the DB Package env and dual-writes generated passwords to both env files
- [ ] Root Prettier is picked up by both the App’s `format:*` and the DB Package’s `format:*`
- [ ] Product routes unchanged: `/` auth redirect, `/login` and `/signup` Clerk, `/dashboard` protected, Route `/public` → login
- [ ] `turbo run dev` does not run `db:generate`
