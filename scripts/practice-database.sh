#!/usr/bin/env bash
# Builds a practice database for preview copies of the site (Plan 34 Section F): every
# migration in database/, in order, then made-up records from database/practice/seed.sql.
#
#   PRACTICE_DATABASE_URL=postgres://... scripts/practice-database.sh           # first build
#   PRACTICE_DATABASE_URL=postgres://... scripts/practice-database.sh --reset   # rebuild
#
# Safety: it refuses the production project, refuses any database that already holds the
# campaign without the practice marker, and never reads DATABASE_URL. The address is taken
# from the environment only, so it never lands in a file or in shell history.
set -euo pipefail
cd "$(dirname "$0")/.."

PRODUCTION_REF="cvuwdlmlukepwfffpgdu"
MARKER="practice database: fictional records only"
RESET="${1:-}"

if [ -z "${PRACTICE_DATABASE_URL:-}" ]; then
  echo "Set PRACTICE_DATABASE_URL to the practice database's address." >&2
  exit 2
fi
case "$PRACTICE_DATABASE_URL" in
  *"$PRODUCTION_REF"*) echo "Refused: that address is the production project." >&2; exit 2 ;;
esac
if [ -n "${DATABASE_URL:-}" ] && [ "$PRACTICE_DATABASE_URL" = "$DATABASE_URL" ]; then
  echo "Refused: that address is the app's own DATABASE_URL." >&2
  exit 2
fi
if [ -n "$RESET" ] && [ "$RESET" != "--reset" ]; then
  echo "Unknown option: $RESET" >&2
  exit 2
fi

run() { psql "$PRACTICE_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
value() { run -At -c "$1"; }

if [ "$(value "SELECT pg_catalog.to_regnamespace('mothers_love') IS NOT NULL")" = "t" ]; then
  marker="$(value "SELECT COALESCE(pg_catalog.obj_description('mothers_love'::regnamespace, 'pg_namespace'), '')")"
  if [ "$marker" != "$MARKER" ]; then
    echo "Refused: this database holds the campaign and is not marked as a practice database." >&2
    exit 2
  fi
  if [ "$RESET" != "--reset" ]; then
    echo "The practice database already exists. Pass --reset to rebuild it." >&2
    exit 2
  fi
  echo "Rebuilding the practice database."
  run -c "DROP SCHEMA mothers_love CASCADE"
  for signature in $(value "SELECT p.oid::regprocedure FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname LIKE 'ml\\_%'" | tr ' ' '~'); do
    run -c "DROP FUNCTION ${signature//\~/ }"
  done
fi

# What a hosted Supabase database already has; a plain PostgreSQL needs it added once.
run <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $roles$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
    END IF;
  END LOOP;
END
$roles$;
SQL

for file in $(ls database | grep -E '^[0-9]{3}_.*\.sql$' | sort); do
  # 020 expects its index, which is built outside a transaction.
  if [ "$file" = "020_display_delta.sql" ]; then run -f database/ops/020_display_delta_index.sql >/dev/null; fi
  run -f "database/$file" >/dev/null
  echo "applied $file"
done

run -c "COMMENT ON SCHEMA mothers_love IS '$MARKER'"
run -f database/practice/seed.sql
echo "The practice database is ready."
