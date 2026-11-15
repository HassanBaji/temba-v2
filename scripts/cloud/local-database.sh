#!/usr/bin/env bash
# Runs a command with DATABASE_URL set to the local database in
# packages/db/.env. A cloud environment's own DATABASE_URL (for example a
# hosted database) would otherwise win over the .env files, and migrations or
# dev servers started here would reach it.
#
# Usage: bash scripts/cloud/local-database.sh <command> [args...]
#        bash scripts/cloud/local-database.sh --print
#
# Set TEMBA_ALLOW_REMOTE_DATABASE=1 to keep the environment's DATABASE_URL,
# including one that is not on this machine.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

env_file_database_url() {
  local file="$REPO_ROOT/packages/db/.env" line value
  [ -f "$file" ] || file="$REPO_ROOT/packages/db/.env.example"
  line=$(grep '^DATABASE_URL=' "$file" | tail -n 1 || true)
  value="${line#DATABASE_URL=}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

database_host() {
  local rest="${1#*://}"
  rest="${rest%%/*}"
  rest="${rest%%\?*}"
  rest="${rest##*@}"
  case "$rest" in
    \[*\]*) rest="${rest#\[}"; rest="${rest%%\]*}" ;;
    *) rest="${rest%%:*}" ;;
  esac
  printf '%s' "$rest"
}

is_local_host() {
  case "$1" in
    localhost | 127.0.0.1 | ::1) return 0 ;;
    *) return 1 ;;
  esac
}

if [ "${TEMBA_ALLOW_REMOTE_DATABASE:-}" = "1" ] && [ -n "${DATABASE_URL:-}" ]; then
  url="$DATABASE_URL"
else
  url="$(env_file_database_url)"
  if [ -z "$url" ]; then
    echo "error: no DATABASE_URL in packages/db/.env" >&2
    exit 1
  fi
  host="$(database_host "$url")"
  if ! is_local_host "$host"; then
    echo "error: packages/db/.env points DATABASE_URL at $host, not this machine; set TEMBA_ALLOW_REMOTE_DATABASE=1 to use it" >&2
    exit 1
  fi
fi

if [ "${1:-}" = "--print" ]; then
  printf '%s\n' "$url"
  exit 0
fi

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...] | --print" >&2
  exit 2
fi

export DATABASE_URL="$url"
exec "$@"
