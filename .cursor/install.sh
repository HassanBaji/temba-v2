#!/usr/bin/env bash
# Idempotent Cloud Agent install for the Temba workspace.
# Prepares system dependencies, workspace packages, local env files, and the
# database schema so a booted agent has a working environment.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- System dependency: PostgreSQL ---------------------------------------
# The base image ships Node and pnpm but not PostgreSQL. Docker is unavailable
# in Cloud Agent VMs, so the repo's Docker-based start-database.sh cannot run
# here; install PostgreSQL directly instead.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

# --- Workspace dependencies ----------------------------------------------
pnpm install --frozen-lockfile

# --- Local env files ------------------------------------------------------
# Created from the checked-in examples if absent. DATABASE_URL points at the
# local PostgreSQL instance; Clerk keys are supplied via environment secrets.
[ -f apps/temba/.env ] || cp apps/temba/.env.example apps/temba/.env
[ -f packages/db/.env ] || cp packages/db/.env.example packages/db/.env

# --- Database: start + apply migrations ----------------------------------
bash "$REPO_ROOT/.cursor/start.sh"
pnpm exec turbo run db:migrate
