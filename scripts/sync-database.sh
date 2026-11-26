#!/usr/bin/env bash
# Copies one Temba database over another: by default the Railway prod
# Postgres over the Railway dev Postgres.
#
# The target is wiped and restored in one transaction, so a failed restore
# leaves it as it was. Contact details are scrubbed in that same transaction,
# because the dev API has an email provider and a worker that would otherwise
# email real players before anyone notices. Dev's newer migrations are
# applied afterwards.
#
# Usage:
#   scripts/sync-database.sh [--from prod|dev] [--to dev|local|<postgres url>]
#                            [--clerk-id <prod user_…>=<dev user_…>]...
#                            [--keep-contacts] [--yes]
#
#   --from           Railway environment to copy from (default prod).
#   --to             dev: the Railway dev Postgres (default).
#                    local: DATABASE_URL from packages/db/.env.
#                    Or any postgres:// URL.
#   --clerk-id       Points the User with the first Clerk id at the second, so
#                    you can sign in as that User through the dev Clerk
#                    instance. That User's contact details are kept. Repeatable.
#   --keep-contacts  Skips the scrub. Real emails and phone numbers stay, and
#                    the target's email worker can reach real players.
#   --yes            Skips the confirmation prompt.
#
# Needs Docker (pg_dump must match Railway's Postgres 18), the Railway CLI
# linked to the Temba project, and pnpm. The target can never be prod.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_IMAGE="postgres:18"

from_env="prod"
to="dev"
keep_contacts=0
assume_yes=0
clerk_pairs=()

die() {
  echo "sync-database: $*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --from) from_env="${2:?--from needs a value}"; shift 2 ;;
    --to) to="${2:?--to needs a value}"; shift 2 ;;
    --clerk-id) clerk_pairs+=("${2:?--clerk-id needs <prod>=<dev>}"); shift 2 ;;
    --keep-contacts) keep_contacts=1; shift ;;
    --yes | -y) assume_yes=1; shift ;;
    -h | --help) sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

case "$from_env" in prod | dev) ;; *) die "--from must be prod or dev" ;; esac

for tool in docker railway pnpm; do
  command -v "$tool" >/dev/null || die "$tool is not installed"
done

railway_database_url() {
  local url
  url=$(railway variables --environment "$1" --service Postgres --kv 2>/dev/null |
    grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2- || true)
  [ -n "$url" ] || die "could not read DATABASE_PUBLIC_URL for Railway environment $1 (is this folder linked with 'railway link'?)"
  printf '%s' "$url"
}

local_database_url() {
  local file="$REPO_ROOT/packages/db/.env" line value
  [ -f "$file" ] || die "packages/db/.env is missing"
  line=$(grep '^DATABASE_URL=' "$file" | tail -n 1 || true)
  value="${line#DATABASE_URL=}"
  value="${value#\"}"
  value="${value%\"}"
  [ -n "$value" ] || die "packages/db/.env has no DATABASE_URL"
  printf '%s' "$value"
}

# host:port/database, the identity used to tell databases apart.
database_identity() {
  local rest="${1#*://}" hostport db
  rest="${rest##*@}"
  hostport="${rest%%/*}"
  db="${rest#*/}"
  db="${db%%\?*}"
  case "$hostport" in *:*) ;; *) hostport="$hostport:5432" ;; esac
  printf '%s/%s' "$hostport" "$db" | tr '[:upper:]' '[:lower:]'
}

mask() {
  printf '%s' "$1" | sed -E 's#://[^@]*@#://***@#'
}

# The pg tools run in Docker, where the host's localhost is host.docker.internal.
for_docker() {
  printf '%s' "$1" | sed -E 's#@(localhost|127\.0\.0\.1|\[::1\])([:/])#@host.docker.internal\2#'
}

SOURCE_URL=$(railway_database_url "$from_env")
PROD_URL=$(railway_database_url prod)

case "$to" in
  dev) TARGET_URL=$(railway_database_url dev); target_label="Railway dev" ;;
  local) TARGET_URL=$(local_database_url); target_label="local (packages/db/.env)" ;;
  postgres://* | postgresql://*) TARGET_URL="$to"; target_label="$(mask "$to")" ;;
  *) die "--to must be dev, local or a postgres:// URL" ;;
esac

[ "$(database_identity "$TARGET_URL")" != "$(database_identity "$PROD_URL")" ] ||
  die "refusing to write to the prod database"
[ "$(database_identity "$TARGET_URL")" != "$(database_identity "$SOURCE_URL")" ] ||
  die "source and target are the same database"

kept_clerk_ids=()
remap_sql=""
for pair in ${clerk_pairs[@]+"${clerk_pairs[@]}"}; do
  prod_id="${pair%%=*}"
  dev_id="${pair#*=}"
  for id in "$prod_id" "$dev_id"; do
    [[ "$id" =~ ^user_[A-Za-z0-9]+$ ]] || die "not a Clerk user id: '$id' (expected user_…)"
  done
  kept_clerk_ids+=("'$dev_id'")
  remap_sql+="
DO \$\$ BEGIN
  UPDATE \"user\" SET clerk_id = NULL WHERE clerk_id = '$dev_id';
  UPDATE \"user\" SET clerk_id = '$dev_id' WHERE clerk_id = '$prod_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'no User has Clerk id $prod_id'; END IF;
END \$\$;"
done

if [ ${#kept_clerk_ids[@]} -gt 0 ]; then
  scrubbed_users="NOT coalesce(clerk_id IN ($(IFS=,; echo "${kept_clerk_ids[*]}")), false)"
else
  scrubbed_users="true"
fi

# Fake values are derived from the row id, so unique constraints still hold.
# Unverified emails and phones are never sent to (ADR-0054).
scrub_sql="
UPDATE \"user\" SET
  email = CASE WHEN email IS NULL THEN NULL ELSE 'user+' || id || '@example.invalid' END,
  phone_number = CASE WHEN phone_number IS NULL THEN NULL ELSE '+000' || replace(id::text, '-', '') END,
  email_verified = false,
  phone_number_verified = false,
  email_notifications = false
WHERE $scrubbed_users;
UPDATE user_merges SET phone_number = '+000' || replace(id::text, '-', '');
UPDATE group_email_invites SET email = 'invite+' || id || '@example.invalid';
UPDATE team_email_invites SET email = 'invite+' || id || '@example.invalid';
UPDATE coach SET email = NULL, mobile = NULL;
UPDATE bookings SET guest_phone = '+000' || replace(id::text, '-', '') WHERE guest_phone IS NOT NULL;
UPDATE account SET access_token = NULL, refresh_token = NULL, id_token = NULL, password = NULL;
DELETE FROM session;
DELETE FROM verification;"

echo "Copy:      Railway $from_env  $(mask "$SOURCE_URL")"
echo "Over:      $target_label  $(mask "$TARGET_URL")"
echo "Clerk ids: ${#clerk_pairs[@]} remapped"
if [ "$keep_contacts" -eq 1 ]; then
  echo "Contacts:  KEPT. The target can email and text real players."
else
  echo "Contacts:  scrubbed (except remapped Users)"
fi
echo "Jobs:      the source's queued worker jobs are dropped"
echo "Everything in the target database is replaced."

if [ "$assume_yes" -ne 1 ]; then
  confirm_word="$to"
  case "$to" in postgres://* | postgresql://*) confirm_word="overwrite" ;; esac
  printf 'Type "%s" to continue: ' "$confirm_word"
  read -r answer </dev/tty
  [ "$answer" = "$confirm_word" ] || die "cancelled"
fi

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/temba-sync.XXXXXX")
chmod 700 "$work_dir"
trap 'rm -rf "$work_dir"' EXIT

{
  cat <<'SQL'
SET client_min_messages = warning;
DO $$
DECLARE s name;
BEGIN
  FOR s IN SELECT nspname FROM pg_namespace
    WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema'
  LOOP
    EXECUTE format('DROP SCHEMA %I CASCADE', s);
  END LOOP;
END $$;
CREATE SCHEMA public;
SQL
} >"$work_dir/pre.sql"

# The source's queued jobs (emails, notifications, payment checks) must not
# run against the target, whatever happens to contact details.
clear_jobs_sql="
DO \$\$ BEGIN
  IF to_regclass('graphile_worker._private_jobs') IS NOT NULL THEN
    DELETE FROM graphile_worker._private_jobs;
    DELETE FROM graphile_worker._private_job_queues;
  END IF;
END \$\$;"

{
  # The dump empties search_path for the rest of the session.
  printf '%s\n' "SET search_path = public;"
  printf '%s\n' "$clear_jobs_sql"
  printf '%s\n' "$remap_sql"
  [ "$keep_contacts" -eq 1 ] || printf '%s\n' "$scrub_sql"
} >"$work_dir/post.sql"

export SOURCE_URL TARGET_URL
SOURCE_URL=$(for_docker "$SOURCE_URL")
TARGET_URL_DOCKER=$(for_docker "$TARGET_URL")

docker_pg() {
  docker run --rm -i --add-host=host.docker.internal:host-gateway \
    -e SOURCE_URL -e TARGET_URL="$TARGET_URL_DOCKER" \
    -v "$work_dir:/work" "$PG_IMAGE" "$@"
}

echo "Dumping Railway ${from_env}…"
docker_pg pg_dump "$SOURCE_URL" --format=custom --no-owner --no-acl --file=/work/db.dump

echo "Restoring…"
docker_pg pg_restore --no-owner --no-acl --file=/work/restore.sql /work/db.dump
docker_pg sh -c 'psql -X -q --single-transaction -v ON_ERROR_STOP=1 \
  -f /work/pre.sql -f /work/restore.sql -f /work/post.sql "$TARGET_URL" >/dev/null'

echo "Applying migrations…"
(cd "$REPO_ROOT" && DATABASE_URL="$TARGET_URL" pnpm --filter @repo/db db:migrate)

echo "Done."
