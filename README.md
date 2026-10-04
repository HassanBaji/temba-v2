# Temba

pnpm + Turborepo Workspace. One App (`web`) and Packages (`@repo/db`, `@repo/eslint-config`, `@repo/typescript-config`).

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
./start-database.sh
```

Fill Clerk keys in `apps/web/.env`. The API App owns the database, bucket and webhook variables: `cp apps/api/.env.example apps/api/.env` and fill it. Keep `DATABASE_URL` in `apps/api/.env` and `packages/db/.env`.

## Commands

```bash
pnpm dev:web
pnpm exec turbo run typecheck
pnpm exec turbo run lint
pnpm exec turbo run test --filter web
pnpm exec turbo run build --filter web

pnpm --filter web format:check
pnpm --filter web format:write
pnpm --filter @repo/db format:check
pnpm --filter @repo/db format:write

pnpm exec turbo run db:generate
pnpm exec turbo run db:migrate
pnpm exec turbo run db:push
pnpm exec turbo run db:studio
```

Equivalent filter form: `pnpm --filter web dev`, `pnpm --filter @repo/db db:push`.

`pnpm exec turbo run test --filter web` (or `pnpm --filter web test`) runs Vitest with PGLite. Suite setup applies the DB Package migrations and hands tests a Drizzle client. No product Postgres required.
