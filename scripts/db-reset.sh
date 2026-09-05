#!/usr/bin/env bash
# Drop and recreate the local `public` schema, leaving an empty database.
#
#   scripts/db-reset.sh
#
# Why this exists
# ---------------
# Booting the app against a schema-only database is NOT harmless. registerRoutes()
# runs seeders before it listens, and seedSystemValueDefinitions() inserts 35 rows
# into system_value_definitions when it finds the table empty. Restoring the real
# data dump on top of that gives you the Replit rows *plus* 35 duplicates that
# nothing will ever clean up.
#
# So the order must always be:
#
#   1. restore schema      scripts/db-restore.sh leadani-db-schema.sql
#   2. restore data        scripts/db-restore.sh leadani-db-data.sql
#   3. only then start the app
#
# If you have already started the app against an empty schema, run this first.
# It is faster than `docker compose down -v` and does not destroy the volume.
set -uo pipefail

COMPOSE_FILE="docker-compose.local.yml"
CLIENT_IMAGE="${CLIENT_IMAGE:-postgres:18-alpine}"
POSTGRES_USER="${POSTGRES_USER:-leadani}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-leadani_local_pw}"
POSTGRES_DB="${POSTGRES_DB:-leadani}"
TARGET_URL="${TARGET_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}}"

CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Name}}' db 2>/dev/null | head -1)"
if [[ -z "$CONTAINER" ]]; then
  echo "The local db container is not running." >&2
  exit 1
fi

# The app holds a pg pool open; DROP SCHEMA would block behind it.
echo "==> stopping app"
docker compose -f "$COMPOSE_FILE" stop app >/dev/null 2>&1 || true

echo "==> dropping schema"
MSYS_NO_PATHCONV=1 docker run --rm --network "container:${CONTAINER}" "$CLIENT_IMAGE" \
  psql -q -d "$TARGET_URL" \
  -c 'DROP SCHEMA IF EXISTS public CASCADE;' \
  -c 'DROP SCHEMA IF EXISTS _system CASCADE;' \
  -c 'CREATE SCHEMA public;'

echo "==> empty. Restore the schema dump, then the data dump, then start the app."
