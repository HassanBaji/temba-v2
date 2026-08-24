# 02: Share T3 lint and TypeScript config Packages

**What to build:** Temba’s current TypeScript compiler options and eslint rules live in Workspace Packages (`@repo/typescript-config` and `@repo/eslint-config`) instead of only on the App. The App at Root consumes those Packages. Lint and typecheck still pass with the same T3 rules (including Drizzle `db` / `ctx.db` on the App preset). The `~/*` alias stays App-local. There is no Root tsconfig or Root eslint config once the App points at the Packages. No turbo/only-warn plugins. No unused React-library eslint export.

**Blocked by:** 01: Expand Workspace Root around the current App

**Status:** ready-for-agent

**Parent:** `.scratch/turborepo-monorepo/spec.md`

- [ ] `@repo/typescript-config` exposes `base`, `nextjs`, and `library` presets with Temba’s current strictness (`verbatimModuleSyntax`, `noUncheckedIndexedAccess`); `base` has no DOM/Next/paths; `nextjs` adds DOM, jsx preserve, Next plugin, `noEmit`; `library` is for a non-Next Package
- [ ] `@repo/eslint-config` exports `./base` (T3 typescript-eslint, no Next, no Drizzle) and `./next-js` (base + next/core-web-vitals + current Drizzle rules); no `./react-internal`
- [ ] The App at Root extends the nextjs TypeScript preset and sets `~/*` locally
- [ ] The App at Root uses the `./next-js` eslint export
- [ ] `pnpm lint` and `pnpm typecheck` (and turbo equivalents) succeed from Root
- [ ] No Root tsconfig or Root eslint config remains
