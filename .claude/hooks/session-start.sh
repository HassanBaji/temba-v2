#!/usr/bin/env bash
# SessionStart hook for Claude Code on the web. Installs workspace packages,
# writes the .env files, starts PostgreSQL and applies migrations. A no-op
# outside the cloud. Running processes do not survive a paused session, so this
# also runs on resume; every step is idempotent.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Hook stdout becomes session context, so the detail goes to a log.
LOG="${TMPDIR:-/tmp}/temba-session-start.log"
: >"$LOG"
step() {
  local name="$1"
  shift
  if "$@" >>"$LOG" 2>&1; then
    echo "ok: $name"
  else
    echo "failed: $name (see $LOG)"
    return 1
  fi
}

as_postgres() {
  if [ "$(id -u)" = "0" ]; then
    runuser -u postgres -- "$@"
  else
    sudo -u postgres "$@"
  fi
}

as_root() {
  if [ "$(id -u)" = "0" ]; then
    "$@"
  else
    sudo "$@"
  fi
}

install_packages() {
  local stamp=node_modules/.temba-lockfile-hash hash
  hash="$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)"
  if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash" ]; then
    return 0
  fi
  pnpm install --frozen-lockfile --prefer-offline
  echo "$hash" >"$stamp"
}

# Matches DATABASE_URL in the .env examples.
start_database() {
  as_root service postgresql start
  as_postgres psql -qtc "ALTER USER postgres WITH PASSWORD 'password';"
  if ! as_postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='temba'" | grep -q 1; then
    as_postgres createdb temba
  fi
}

step "pnpm install" install_packages
step ".env files" bash scripts/cloud/sync-env.sh
step "PostgreSQL on :5432" start_database
step "db:migrate" pnpm exec turbo run db:migrate

if ! grep -q '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_' apps/web/.env; then
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export SKIP_ENV_VALIDATION=1" >>"$CLAUDE_ENV_FILE"
  fi
  echo "note: no Clerk keys in the environment, so SKIP_ENV_VALIDATION=1 is set for the gate; /login and the dev servers' auth will not work."
fi
