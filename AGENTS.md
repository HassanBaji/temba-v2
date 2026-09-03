## Agent skills

### Issue tracker

Specs live locally under `.scratch/`; implementation tickets live in Linear. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Cursor agents

Project subagents live in `.cursor/agents/`: `planner`, `implementer`, `reviewer`, `orchestrator`. Use `orchestrator` to implement a feature's tickets in numerical order with a fresh `implementer` per ticket.

### App tRPC

One procedure per file under `apps/temba/src/server/api/routers/<domain>/`, with that door’s logic in the same file. Binding rule: `.cursor/rules/api-one-endpoint-per-file.mdc`. Spec: `.scratch/one-endpoint-per-file-routers/spec.md`.

Do not plan or implement thin tRPC assemblers that only forward to `server/<domain>/<verb>.ts` twins. Do not add service/repository/use-case layers for API doors. Shared glossary modules (Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create, ratings) stay shared.

## Cursor Cloud specific instructions

Cloud Agents use `.cursor/environment.json` (`install` → `.cursor/install.sh`, `start` → `.cursor/start.sh`, terminal `pnpm --filter temba dev` on port 3000).

- PostgreSQL runs natively on the VM (not Docker). Do not rely on `./start-database.sh` in Cloud Agents; `start` already brings up the cluster and applies Drizzle migrations.
- Required environment secrets: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from a Clerk **development** instance API Keys page (`pk_test_…` / `sk_test_…`). Do not use empty strings or literals like `pk_test_placeholder` / `sk_test_placeholder` — Clerk rejects those and `/login` returns 500. Without real keys the App fails env validation and the login UI cannot render.
- Venue logos also require App env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_VENUE_LOGOS_BUCKET` (ADR-0006). Cloud `install` writes syntactically valid placeholders when those secrets are unset so the App can boot; live Operator logo upload/replace/clear needs real Supabase Storage keys.
- Local `.env` files under `apps/temba` and `packages/db` are created from the checked-in examples during install; `DATABASE_URL` defaults to `postgresql://postgres:password@localhost:5432/temba`.
- Useful checks after boot: `pnpm exec turbo run typecheck`, `pnpm exec turbo run build --filter temba`, curl `http://localhost:3000/login`.

