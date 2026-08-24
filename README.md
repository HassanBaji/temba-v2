# Temba

pnpm + Turborepo Workspace. One App (`temba`) and Packages (`@repo/db`, `@repo/eslint-config`, `@repo/typescript-config`).

## Setup

```bash
pnpm install
cp apps/temba/.env.example apps/temba/.env
cp packages/db/.env.example packages/db/.env
./start-database.sh
```

Fill Clerk keys in `apps/temba/.env`. Keep `DATABASE_URL` in both env files.

## Commands

```bash
pnpm exec turbo run dev --filter temba
pnpm exec turbo run typecheck
pnpm exec turbo run lint
pnpm exec turbo run build --filter temba

pnpm --filter temba format:check
pnpm --filter temba format:write
pnpm --filter @repo/db format:check
pnpm --filter @repo/db format:write

pnpm exec turbo run db:generate
pnpm exec turbo run db:migrate
pnpm exec turbo run db:push
pnpm exec turbo run db:studio
```

Equivalent filter form: `pnpm --filter temba dev`, `pnpm --filter @repo/db db:push`.
