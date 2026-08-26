#!/usr/bin/env bash
# Idempotent Cloud Agent install for the Temba workspace.
# Prepares system dependencies, workspace packages, and local env files.
# Per-boot DB startup and migrations live in .cursor/start.sh.
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

# Sync Clerk secrets from Cloud Agent environment variables into apps/temba/.env
# when present. Values are never printed. Empty .env placeholders are replaced.
set_env_kv() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    # Escape sed replacement specials in the value
    local escaped
    escaped=$(printf '%s' "$value" | sed -e 's/[&|\\]/\\&/g')
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

if [ -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
  set_env_kv apps/temba/.env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
fi
if [ -n "${CLERK_SECRET_KEY:-}" ]; then
  set_env_kv apps/temba/.env CLERK_SECRET_KEY "$CLERK_SECRET_KEY"
fi
