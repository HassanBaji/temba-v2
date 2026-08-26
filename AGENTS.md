## Agent skills

### Issue tracker

Specs live locally under `.scratch/`; implementation tickets live in Linear. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Cursor agents

Project subagents live in `.cursor/agents/`: `planner`, `implementer`, `reviewer`, `orchestrator`. Use `orchestrator` to implement a feature's tickets in numerical order with a fresh `implementer` per ticket.

## Cursor Cloud specific instructions

Cloud Agents use `.cursor/environment.json` (`install` → `.cursor/install.sh`, `start` → `.cursor/start.sh`, terminal `pnpm --filter temba dev` on port 3000).

- PostgreSQL runs natively on the VM (not Docker). Do not rely on `./start-database.sh` in Cloud Agents; `start` already brings up the cluster and applies Drizzle migrations.
- Required environment secrets: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (Clerk development instance). Without them the App fails env validation and the login UI cannot render.
- Local `.env` files under `apps/temba` and `packages/db` are created from the checked-in examples during install; `DATABASE_URL` defaults to `postgresql://postgres:password@localhost:5432/temba`.
- Useful checks after boot: `pnpm exec turbo run typecheck`, `pnpm exec turbo run build --filter temba`, curl `http://localhost:3000/login`.

