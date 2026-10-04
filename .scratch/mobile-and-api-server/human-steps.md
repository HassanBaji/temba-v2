# Steps that need a person

Agents skipped these while implementing `spec.md`. Each entry says what to do and which ticket it belongs to. Check an item off when it is done.

## Settings and access

- [ ] **TEM-294.** Change the deployment's root directory to `apps/web`. Production builds from this branch fail until it changes.
- [ ] **TEM-296.** Commit `.scratch/mobile-and-api-server/ci.yml` as `.github/workflows/ci.yml`. The agent's GitHub token lacks the `workflow` scope. Then make the `gate` job a required check.

## Deploys and migrations

- [ ] **TEM-302.** Apply migration `0048` when deploying.

## Verification agents could not run

- [ ] **TEM-294 to TEM-303.** Run both Playwright flow recordings (`record:flows`, `record:knockout`) against a seeded database with Clerk test users.
- [ ] **TEM-300, TEM-301, TEM-302.** Check the changed pages in a browser: win rate, Game times in `Asia/Bahrain`, and prices in fils.
