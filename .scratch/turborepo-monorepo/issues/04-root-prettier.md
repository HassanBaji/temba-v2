# 04: Lift Prettier to Root for App and DB Package

**What to build:** One Prettier config at Root, including today’s Tailwind plugin, is what formats the Workspace. The App keeps `format:*`. The DB Package gains `format:*`. Both use that Root config. There is no Turborepo `format` task and no Prettier Package.

**Blocked by:** 03: Extract the DB Package behind `~/server/db`

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] A single Prettier config lives at Root and includes the current Tailwind plugin
- [ ] The App’s `format:*` scripts use that Root config
- [ ] The DB Package has `format:*` scripts that use that Root config
- [ ] There is no turbo `format` task and no `@repo/prettier-config` Package
- [ ] App `format:check` / `format:write` and DB Package `format:check` / `format:write` succeed against the Root config
