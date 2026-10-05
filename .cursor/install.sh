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
# Created from the checked-in examples if absent. DATABASE_URL (in apps/api and
# packages/db) points at the local PostgreSQL instance; Clerk keys are supplied
# via environment secrets.
[ -f apps/web/.env ] || cp apps/web/.env.example apps/web/.env
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f packages/db/.env ] || cp packages/db/.env.example packages/db/.env

# Sync Clerk secrets from Cloud Agent environment variables into apps/web/.env
# when present. Values are never printed. Empty .env placeholders are replaced.
# Reject known-invalid placeholder strings so agents do not silently sync them.
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

is_usable_clerk_secret() {
  local value="$1"
  # Non-empty, not a documented placeholder, and long enough to be a real Clerk key.
  if [ -z "$value" ]; then
    return 1
  fi
  case "$value" in
    *placeholder* | pk_test_ | sk_test_ | pk_live_ | sk_live_)
      return 1
      ;;
  esac
  if [ "${#value}" -lt 30 ]; then
    return 1
  fi
  return 0
}

env_value_empty() {
  local file="$1" key="$2"
  local line value
  line=$(grep "^${key}=" "$file" || true)
  value="${line#${key}=}"
  value="${value#\"}"
  value="${value%\"}"
  [ -z "$value" ]
}

if is_usable_clerk_secret "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"; then
  set_env_kv apps/web/.env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
elif [ -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY looks like a placeholder; not syncing to apps/web/.env" >&2
fi
if is_usable_clerk_secret "${CLERK_SECRET_KEY:-}"; then
  set_env_kv apps/web/.env CLERK_SECRET_KEY "$CLERK_SECRET_KEY"
elif [ -n "${CLERK_SECRET_KEY:-}" ]; then
  echo "warning: CLERK_SECRET_KEY looks like a placeholder; not syncing to apps/web/.env" >&2
fi

# Invite links are built from the web origin.
if [ -n "${WEB_ORIGIN:-}" ]; then
  set_env_kv apps/web/.env WEB_ORIGIN "$WEB_ORIGIN"
elif env_value_empty apps/web/.env WEB_ORIGIN; then
  set_env_kv apps/web/.env WEB_ORIGIN "http://localhost:3000"
fi
if [ -n "${API_ORIGIN:-}" ]; then
  set_env_kv apps/web/.env API_ORIGIN "$API_ORIGIN"
elif env_value_empty apps/web/.env API_ORIGIN; then
  set_env_kv apps/web/.env API_ORIGIN "http://localhost:4000"
fi

# The API App holds the database, bucket and webhook secrets. Placeholders keep
# env validation passing so the API boots; live upload and media GET need real
# AWS keys.
sync_api_env() {
  local key="$1" fallback="$2"
  local value="${!key:-}"
  if [ -n "$value" ]; then
    set_env_kv apps/api/.env "$key" "$value"
  elif env_value_empty apps/api/.env "$key"; then
    set_env_kv apps/api/.env "$key" "$fallback"
  fi
}
if is_usable_clerk_secret "${CLERK_SECRET_KEY:-}"; then
  set_env_kv apps/api/.env CLERK_SECRET_KEY "$CLERK_SECRET_KEY"
fi
if is_usable_clerk_secret "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"; then
  set_env_kv apps/api/.env CLERK_PUBLISHABLE_KEY "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
fi
sync_api_env CLERK_WEBHOOK_SIGNING_SECRET "whsec_cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_ENDPOINT_URL "https://t3.storageapi.dev"
sync_api_env AWS_ACCESS_KEY_ID "cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_SECRET_ACCESS_KEY "cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_S3_BUCKET_NAME "customizable-pannier-xnbsgm"
sync_api_env AWS_DEFAULT_REGION "auto"
