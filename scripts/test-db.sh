#!/usr/bin/env bash
# Runs the Supabase migrations and security tests against a throwaway local
# Postgres database. Needs psql and a Postgres server; set PGHOST/PGPORT/PGUSER.
set -euo pipefail
DB="ariya_test_$$"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run() { psql -v ON_ERROR_STOP=1 -q -X -d "$DB" -f "$1"; }
roles_exist=$(psql -Atq -d postgres -c "select 1 from pg_roles where rolname = 'authenticated'")
if [ -z "$roles_exist" ]; then
  run supabase/tests/00_supabase_stub.sql
else
  # Roles are cluster-wide; create only the per-database parts.
  sed '/^create role/d' supabase/tests/00_supabase_stub.sql > /tmp/ariya_stub_$$.sql
  run /tmp/ariya_stub_$$.sql
  rm -f /tmp/ariya_stub_$$.sql
fi
for f in supabase/migrations/*.sql; do run "$f"; done
run supabase/tests/10_rls.sql
run supabase/tests/20_marketplace.sql
