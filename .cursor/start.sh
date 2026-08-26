#!/usr/bin/env bash
# Per-boot startup for the Temba workspace: bring up the local PostgreSQL
# instance the app expects at postgresql://postgres:password@localhost:5432/temba
# and apply Drizzle migrations. Idempotent: safe when already running / migrated.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Start the PostgreSQL 16 cluster if it is not already running.
if ! sudo pg_ctlcluster 16 main status >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start
fi

# Align the postgres role password with the one in DATABASE_URL and make sure
# the application database exists.
sudo -u postgres psql -tc "ALTER USER postgres WITH PASSWORD 'password';" >/dev/null
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='temba'" | grep -q 1; then
  sudo -u postgres createdb temba
fi

# Apply schema migrations (no-op when already up to date).
pnpm exec turbo run db:migrate
