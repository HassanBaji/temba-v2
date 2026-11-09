#!/usr/bin/env bash
# Setup script for a Claude Code on the web environment (claude.ai/code).
# It is not run from this repository: paste it into the environment's
# "Setup script" field. It runs as root on Ubuntu 24.04 before Claude Code
# launches, without the environment's variables, and its result is snapshotted
# for about seven days. Per-session work (pnpm install, .env files, starting
# PostgreSQL, migrations) is in .claude/hooks/session-start.sh.
set -euo pipefail

# Matches "packageManager" in the root package.json.
npm install -g pnpm@10.13.1

# The image ships PostgreSQL 16 stopped; install it only if a future image drops it.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi
