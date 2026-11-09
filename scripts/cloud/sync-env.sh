#!/usr/bin/env bash
# Creates the local .env files from the checked-in examples and fills them from
# the cloud environment's variables. Shared by Cursor Cloud (.cursor/install.sh)
# and Claude Code on the web (.claude/hooks/session-start.sh). Idempotent, and
# values are never printed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

for env_dir in apps/web apps/console apps/api packages/db; do
  [ -f "$env_dir/.env" ] || cp "$env_dir/.env.example" "$env_dir/.env"
done

# Rewrites the file through awk rather than `sed -i`, which differs between GNU
# and BSD, and so a value holding sed specials needs no escaping.
set_env_kv() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  KEY="$key" VALUE="$value" awk '
    BEGIN { key = ENVIRON["KEY"]; line = key "=\"" ENVIRON["VALUE"] "\""; done = 0 }
    index($0, key "=") == 1 { print line; done = 1; next }
    { print }
    END { if (!done) print line }
  ' "$file" >"$tmp"
  cat "$tmp" >"$file"
  rm -f "$tmp"
}

env_value_empty() {
  local file="$1" key="$2" line value
  line=$(grep "^${key}=" "$file" || true)
  value="${line#"${key}"=}"
  value="${value#\"}"
  value="${value%\"}"
  [ -z "$value" ]
}

# Clerk rejects empty and placeholder keys, and /login then returns 500.
is_usable_clerk_secret() {
  local value="$1"
  [ -n "$value" ] || return 1
  case "$value" in
    *placeholder* | pk_test_ | sk_test_ | pk_live_ | sk_live_) return 1 ;;
  esac
  [ "${#value}" -ge 30 ]
}

set_or_default() {
  local file="$1" key="$2" value="$3" fallback="$4"
  if [ -n "$value" ]; then
    set_env_kv "$file" "$key" "$value"
  elif env_value_empty "$file" "$key"; then
    set_env_kv "$file" "$key" "$fallback"
  fi
}

publishable_key="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
secret_key="${CLERK_SECRET_KEY:-}"

if is_usable_clerk_secret "$publishable_key"; then
  set_env_kv apps/web/.env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$publishable_key"
  set_env_kv apps/console/.env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$publishable_key"
  set_env_kv apps/api/.env CLERK_PUBLISHABLE_KEY "$publishable_key"
elif [ -n "$publishable_key" ]; then
  echo "warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY looks like a placeholder; not syncing it" >&2
fi
if is_usable_clerk_secret "$secret_key"; then
  set_env_kv apps/web/.env CLERK_SECRET_KEY "$secret_key"
  set_env_kv apps/console/.env CLERK_SECRET_KEY "$secret_key"
  set_env_kv apps/api/.env CLERK_SECRET_KEY "$secret_key"
elif [ -n "$secret_key" ]; then
  echo "warning: CLERK_SECRET_KEY looks like a placeholder; not syncing it" >&2
fi

set_or_default apps/web/.env WEB_ORIGIN "${WEB_ORIGIN:-}" "http://localhost:3000"
set_or_default apps/web/.env API_ORIGIN "${API_ORIGIN:-}" "http://localhost:4000"
set_or_default apps/console/.env API_ORIGIN "${API_ORIGIN:-}" "http://localhost:4000"

# The API App holds the database, bucket and webhook secrets. Placeholders keep
# env validation passing so the API boots; live upload and media GET need real
# AWS keys.
sync_api_env() {
  local key="$1" fallback="$2"
  set_or_default apps/api/.env "$key" "${!key:-}" "$fallback"
}
sync_api_env CLERK_WEBHOOK_SIGNING_SECRET "whsec_cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_ENDPOINT_URL "https://t3.storageapi.dev"
sync_api_env AWS_ACCESS_KEY_ID "cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_SECRET_ACCESS_KEY "cloud-agent-build-only-not-a-real-key"
sync_api_env AWS_S3_BUCKET_NAME "customizable-pannier-xnbsgm"
sync_api_env AWS_DEFAULT_REGION "auto"
