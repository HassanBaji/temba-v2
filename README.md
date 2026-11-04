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

## Deployed migrations

`.github/workflows/db-migrate.yml` runs `drizzle-kit migrate` when a push changes `packages/db/drizzle/**`. A push to `dev` migrates the dev database and a push to `main` migrates production. It can also be started by hand from the Actions tab. Each branch reads `DATABASE_URL` from its GitHub Environment: `development` for `dev`, `production` for `main`. On Railway, use the Postgres service's public URL (`DATABASE_PUBLIC_URL`), because GitHub runners cannot reach the private network.

The migration runs alongside the Railway deploy, not before it. Keep migrations additive, so the old code still works on the new schema. Drop a column only in a later release, after no deployed code reads it.
