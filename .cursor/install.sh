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
  set_env_kv apps/temba/.env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
elif [ -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY looks like a placeholder; not syncing to apps/temba/.env" >&2
fi
if is_usable_clerk_secret "${CLERK_SECRET_KEY:-}"; then
  set_env_kv apps/temba/.env CLERK_SECRET_KEY "$CLERK_SECRET_KEY"
elif [ -n "${CLERK_SECRET_KEY:-}" ]; then
  echo "warning: CLERK_SECRET_KEY looks like a placeholder; not syncing to apps/temba/.env" >&2
fi
if [ -n "${CLERK_WEBHOOK_SIGNING_SECRET:-}" ]; then
  set_env_kv apps/temba/.env CLERK_WEBHOOK_SIGNING_SECRET "$CLERK_WEBHOOK_SIGNING_SECRET"
elif env_value_empty apps/temba/.env CLERK_WEBHOOK_SIGNING_SECRET; then
  set_env_kv apps/temba/.env CLERK_WEBHOOK_SIGNING_SECRET "whsec_cloud-agent-build-only-not-a-real-key"
fi

# Supabase Storage (Venue logos). Sync when Cloud secrets are present so env
# validation can require URL, write key, and bucket name (ADR-0006).
# Empty .env.example values fail validation; if Cloud secrets are absent,
# write syntactically valid placeholders so /login can render. Live logo
# upload still needs real keys.
if [ -n "${SUPABASE_URL:-}" ]; then
  set_env_kv apps/temba/.env SUPABASE_URL "$SUPABASE_URL"
elif env_value_empty apps/temba/.env SUPABASE_URL; then
  set_env_kv apps/temba/.env SUPABASE_URL "https://example.supabase.co"
fi
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  set_env_kv apps/temba/.env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
elif env_value_empty apps/temba/.env SUPABASE_SERVICE_ROLE_KEY; then
  set_env_kv apps/temba/.env SUPABASE_SERVICE_ROLE_KEY "cloud-agent-build-only-not-a-real-key"
fi
if [ -n "${SUPABASE_VENUE_LOGOS_BUCKET:-}" ]; then
  set_env_kv apps/temba/.env SUPABASE_VENUE_LOGOS_BUCKET "$SUPABASE_VENUE_LOGOS_BUCKET"
elif env_value_empty apps/temba/.env SUPABASE_VENUE_LOGOS_BUCKET; then
  set_env_kv apps/temba/.env SUPABASE_VENUE_LOGOS_BUCKET "venue-logos"
fi
