## Agent skills

### Issue tracker

Specs live locally under `.scratch/`; implementation tickets live in Linear. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary (label string equals role name). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Cursor agents

Project subagents live in `.cursor/agents/`: `planner`, `implementer`, `reviewer`, `orchestrator`. Use `orchestrator` to implement a feature's tickets in numerical order with a fresh `implementer` per ticket.

### App tRPC

One procedure per file under `packages/api/src/routers/<domain>/`, with that door’s logic in the same file. Binding rule: `.cursor/rules/api-one-endpoint-per-file.mdc`. Spec: `.scratch/one-endpoint-per-file-routers/spec.md`.

Do not plan or implement thin tRPC assemblers that only forward to `packages/api/src/<domain>/<verb>.ts` twins. Do not add service/repository/use-case layers for API doors. Shared glossary modules (Soft-archive, Game admit, Invite doors, Friendly Game create, ratings) stay shared.

## Code comments

Do not add unnecessary comments. Code should explain itself through clear names and small functions.

- Do not add comments that restate what the code does (`// increment count`, `// fetch the group`, `// return result`).
- Do not add comments that narrate the change or the task (`// added for TEM-123`, `// new: …`, `// updated to use X`). That belongs in the commit message or PR.
- Do not add section-divider or JSDoc boilerplate that only repeats the function name and parameter types.
- Do not delete or rewrite existing comments unless the code they describe changed.
- Only comment when the *why* is not obvious from the code: a non-obvious constraint, a workaround, a domain rule, or a deliberate trade-off.

## Cursor Cloud specific instructions

Cloud Agents use `.cursor/environment.json` (`install` → `.cursor/install.sh`, `start` → `.cursor/start.sh`, terminal `pnpm dev:web`: web on port 3000, API on port 4000).

- PostgreSQL runs natively on the VM (not Docker). Do not rely on `./start-database.sh` in Cloud Agents; `start` already brings up the cluster and applies Drizzle migrations.
- Required environment secrets: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from a Clerk **development** instance API Keys page (`pk_test_…` / `sk_test_…`). Do not use empty strings or literals like `pk_test_placeholder` / `sk_test_placeholder` — Clerk rejects those and `/login` returns 500. Without real keys the App fails env validation and the login UI cannot render.
- Venue logos and Group images require API App env (`apps/api/.env`) `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, and `AWS_DEFAULT_REGION` (ADR-0016). Cloud `install` writes syntactically valid placeholders when those secrets are unset so the API can boot; live Operator logo and Group image upload, and media GET, need real AWS keys.
- Local `.env` files under `apps/web`, `apps/api` and `packages/db` are created from the checked-in examples during install; `DATABASE_URL` defaults to `postgresql://postgres:password@localhost:5432/temba`.
- Useful checks after boot: `pnpm exec turbo run typecheck`, `pnpm exec turbo run build --filter web`, curl `http://localhost:3000/login`.


## Claude Code on the web specific instructions

Cloud sessions at claude.ai/code are set up in two parts.

- **Environment setup script.** Paste `scripts/cloud/claude-environment-setup.sh` into the environment's Setup script field. It runs as root before Claude starts and is snapshotted, so it only provisions the VM: pnpm 10.13.1, and PostgreSQL 16 if the image lacks it.
- **SessionStart hook.** `.claude/settings.json` runs `.claude/hooks/session-start.sh` on startup and resume, only when `CLAUDE_CODE_REMOTE=true`. It runs `pnpm install` (skipped when `pnpm-lock.yaml` is unchanged), writes the `.env` files through `scripts/cloud/sync-env.sh` (shared with Cursor Cloud), starts PostgreSQL with `service postgresql start`, and applies migrations. Its log is `$TMPDIR/temba-session-start.log` (or `/tmp/temba-session-start.log`).
- **Environment variables.** Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Clerk **development** instance, plus the `AWS_*` keys for live uploads. Without Clerk keys the hook sets `SKIP_ENV_VALIDATION=1` so `pnpm exec turbo run typecheck lint test` still passes, but `/login` and the dev servers' auth do not work.
- **Network access.** The default Trusted level covers npm and apt but not Clerk. To sign in from the dev servers, choose Custom, add the Clerk development instance's Frontend API host (`*.clerk.accounts.dev`) and `api.clerk.com`, and keep the default package manager list.
- **Database.** A `DATABASE_URL` in the environment wins over the `.env` files, so the hook (and `.cursor/start.sh`) migrate through `scripts/cloud/local-database.sh`, which uses the local URL in `packages/db/.env` and refuses one that is not on this machine. The hook also exports that URL to the session's shells. Set `TEMBA_ALLOW_REMOTE_DATABASE=1` to keep the environment's own URL.
- Tests run on PGlite and need none of this. Start the dev servers with `pnpm dev:web` (web on 3000, API on 4000).
