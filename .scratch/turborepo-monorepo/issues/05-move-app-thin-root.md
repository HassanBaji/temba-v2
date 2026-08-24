# 05: Contract: move the App to `apps/temba` and thin Root

**What to build:** The T3 App is `git mv`’d to `apps/temba`. Root becomes turbo-only: private, `pnpm@10.13.1`, turbo as the tooling dependency, **no scripts**. The App has a nested turbo config extending Root (`.env*` as build inputs, no standalone/`dist`). Clerk keys and `DATABASE_URL` live in the App env file; `DATABASE_URL` is also in the DB Package env file. `start-database.sh` stays at Root, sources the DB Package env, dual-writes a generated password into both env files, and exits with a copy-example message if the App env file is missing. Workspace gitignore and a minimum README of Workspace commands. This is the wide move — full green is promised on ticket 06, not here.

**Blocked by:** 03: Extract the DB Package behind `~/server/db`; 04: Lift Prettier to Root for App and DB Package

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] The App lives at `apps/temba` with `"name": "temba"`; sources were moved with `git mv`
- [ ] Root `package.json` has no scripts, is private, pins pnpm, and depends on turbo only
- [ ] Nested App turbo config extends Root, hashes `.env*` on build, and does not add `dist/**` or standalone
- [ ] App env example documents Clerk keys + `DATABASE_URL`; DB Package env example documents `DATABASE_URL` only
- [ ] `start-database.sh` remains at Root, sources the DB Package env, dual-writes generated passwords, and fails if the App env file is missing
- [ ] Gitignore covers Workspace caches (`.turbo`, unrooted `node_modules`, `.next`) without Expo noise
- [ ] README documents Workspace commands (`turbo run` / `pnpm --filter`) only
- [ ] `.cursor/` stays at Root; `.npmrc` stays at Root only
- [ ] Route `/public` remains a stub; no second App
