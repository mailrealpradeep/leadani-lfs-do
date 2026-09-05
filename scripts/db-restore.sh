#!/usr/bin/env bash
# Restore a Replit/Neon dump into a target Postgres.
#
#   scripts/db-restore.sh ~/Downloads/leadani-db-schema.sql          # -> local
#   scripts/db-restore.sh ~/Downloads/leadani-db-data.sql
#   TARGET_URL="postgresql://...?sslmode=require" scripts/db-restore.sh f.sql   # -> DO
#
# Order matters: schema, then data, then start the app. Starting the app against
# a schema-only database makes its boot seeder write 35 rows into
# system_value_definitions, which the data restore then duplicates. See
# scripts/db-reset.sh.
#
# ---------------------------------------------------------------------------
# Why the client image is Postgres 18 while the server is 16
# ---------------------------------------------------------------------------
# The Replit dumps are custom-format archives written by pg_dump 18.2 against a
# Neon server running 16.15 (despite the .sql extension — they start with the
# PGDMP magic bytes, not text). That archive is format version 1.16, and
# pg_restore only reads archives at or below its own version, so PG16's
# pg_restore fails outright with:
#
#     pg_restore: error: unsupported version (1.16) in file header
#
# The client must therefore be >= 18 even though the data came from, and goes
# back into, a 16 server. Restoring 18 -> 16 is fine; the reverse is not.
set -uo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "usage: $0 <path-to-dump>   (custom-format .dump/.sql | plain .sql | .sql.gz)" >&2
  exit 1
fi

COMPOSE_FILE="docker-compose.local.yml"
CLIENT_IMAGE="${CLIENT_IMAGE:-postgres:18-alpine}"

POSTGRES_USER="${POSTGRES_USER:-leadani}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-leadani_local_pw}"
POSTGRES_DB="${POSTGRES_DB:-leadani}"

# Default target is the local compose database, addressed as `db` on its network.
TARGET_URL="${TARGET_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}}"

DUMP_DIR="$(cd "$(dirname "$DUMP")" && pwd)"
DUMP_FILE="$(basename "$DUMP")"

CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Name}}' db 2>/dev/null | head -1)"
if [[ -z "$CONTAINER" ]]; then
  echo "The local db container is not running. Start it first:" >&2
  echo "  docker compose -f $COMPOSE_FILE up -d db" >&2
  exit 1
fi

# Scratch space the container can write to (TOC filter lists, reports). The
# dump directory itself is mounted read-only — it is usually ~/Downloads and
# holds multi-GB production data, which nothing here has any business modifying.
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/db/dumps"
mkdir -p "$WORK_DIR"

# Share the db container's network namespace so the hostname `db` resolves.
# Harmless for an external TARGET_URL — outbound access still works.
run() {
  MSYS_NO_PATHCONV=1 docker run --rm -i \
    --network "container:${CONTAINER}" \
    -v "${DUMP_DIR}:/dump:ro" \
    -v "${WORK_DIR}:/work" \
    "$CLIENT_IMAGE" "$@"
}

# Sniff the content: the Replit exports carry a .sql extension but custom-format
# archives start with "PGDMP". Trusting the filename would pick the wrong tool.
MAGIC="$(head -c 5 "$DUMP")"

echo "==> restoring ${DUMP_FILE} (client ${CLIENT_IMAGE}, $(du -h "$DUMP" | cut -f1))"
LOG="$(mktemp)"

if [[ "$MAGIC" == "PGDMP" ]]; then
  # -------------------------------------------------------------------------
  # Parallelism: safe for schema, NOT safe for a data-only archive
  # -------------------------------------------------------------------------
  # A normal pg_dump orders things schema -> data -> constraints, so foreign
  # keys do not exist while data loads and any restore order works. This export
  # is split into two archives instead, which means the FKs are already in place
  # (and enforced) by the time the data arrives.
  #
  # pg_dump does topologically sort the TABLE DATA entries — companies, users
  # and sheets come before activity_logs and leads — so a SERIAL restore in TOC
  # order satisfies every parent-before-child dependency. But `-j` hands tables
  # to workers concurrently and only honours dependencies recorded in the
  # archive; FK relationships are not among them for a data-only dump. A
  # parallel restore would therefore load children before parents at random and
  # fail on FK violations.
  #
  # So: parallel when the archive builds the schema, serial when it only carries
  # data. Detected from the TOC rather than the filename.
  if run pg_restore -l "/dump/${DUMP_FILE}" | grep -qE '^[0-9]+; .* TABLE [a-z_]+ '; then
    JOBS=(-j 4)                 # schema archive — order is dependency-tracked
  else
    JOBS=()                     # data-only archive — must stay in TOC order
    echo "    data-only archive detected: restoring serially to preserve FK order"
  fi

  # -------------------------------------------------------------------------
  # Optional table exclusions
  # -------------------------------------------------------------------------
  #   EXCLUDE_TABLES="sheet_snapshots snapshot_restore_logs" scripts/db-restore.sh ...
  #
  # pg_restore has no --exclude-table, so the supported route is to dump the
  # TOC with -l, delete the unwanted entries, and feed the result back with -L.
  #
  # Excluding a table means its rows never load, so anything with a NOT NULL
  # foreign key pointing at it must be excluded too or the restore fails on
  # that child. Known pair in this schema:
  #   snapshot_restore_logs.snapshot_id -> sheet_snapshots  (NOT NULL)
  # The script checks for exactly this class of mistake below rather than
  # letting you discover it an hour into a restore.
  SELECT_ARGS=()
  if [[ -n "${EXCLUDE_TABLES:-}" ]]; then
    run pg_restore -l "/dump/${DUMP_FILE}" > "${WORK_DIR}/toc-full.txt"
    cp "${WORK_DIR}/toc-full.txt" "${WORK_DIR}/toc-filtered.txt"
    for t in $EXCLUDE_TABLES; do
      # Match the TOC entry for this table's data only, anchored on the exact
      # name so `sheets` does not also knock out `sheet_snapshots`.
      grep -vE "^[0-9]+; [0-9]+ [0-9]+ TABLE DATA [a-z_]+ ${t} " \
        "${WORK_DIR}/toc-filtered.txt" > "${WORK_DIR}/toc-tmp.txt"
      mv "${WORK_DIR}/toc-tmp.txt" "${WORK_DIR}/toc-filtered.txt"
      echo "    excluding table data: ${t}"

      # Warn about NOT NULL children that are still being restored.
      ORPHANS="$(run psql -At -d "$TARGET_URL" -c "
        SELECT r.relname
        FROM pg_constraint c
        JOIN pg_class r ON r.oid=c.conrelid
        JOIN pg_class f ON f.oid=c.confrelid
        JOIN unnest(c.conkey) k(attnum) ON true
        JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=k.attnum
        WHERE c.contype='f' AND f.relname='${t}' AND a.attnotnull;" 2>/dev/null || true)"
      for o in $ORPHANS; do
        if ! grep -qw -- "$o" <<<"$EXCLUDE_TABLES"; then
          echo "    !! ${o} has a NOT NULL FK to ${t} and is NOT excluded —" >&2
          echo "       its rows cannot load. Add it to EXCLUDE_TABLES." >&2
        fi
      done
    done
    SELECT_ARGS=(-L "/work/toc-filtered.txt")
  fi

  # --no-owner / --no-acl: the source roles (Neon's `neondb_owner`, and later
  #   DO's `doadmin`) do not exist in the target; without these every GRANT and
  #   ALTER ... OWNER TO fails and buries real errors in noise.
  # --exclude-schema=_system: Replit's internal deployment bookkeeping
  #   (_system.replit_database_migrations_v1). Meaningless off Replit.
  # Deliberately no --exit-on-error: see the triage step below.
  run pg_restore --no-owner --no-acl --no-comments \
      --exclude-schema=_system "${JOBS[@]}" "${SELECT_ARGS[@]}" \
      -d "$TARGET_URL" "/dump/${DUMP_FILE}" 2>&1 | tee "$LOG"
else
  case "$DUMP_FILE" in
    *.gz) run sh -c "gunzip -c /dump/${DUMP_FILE} | psql -v ON_ERROR_STOP=0 -d '${TARGET_URL}'" 2>&1 | tee "$LOG" ;;
    *)    run psql -v ON_ERROR_STOP=0 -d "$TARGET_URL" -f "/dump/${DUMP_FILE}" 2>&1 | tee "$LOG" ;;
  esac
fi

# ---------------------------------------------------------------------------
# Triage
# ---------------------------------------------------------------------------
# Exactly one error class is expected and benign, and it must not be allowed to
# hide a real one during a multi-gigabyte data restore. pg_restore 18 always
# emits `SET transaction_timeout = 0`, a GUC that only exists from PG17, so a
# PG16 server rejects it once per parallel worker. It is a session setting — no
# data is affected — but it makes pg_restore exit non-zero regardless, which is
# why the exit code cannot be the signal here.
#
# Drop that line and its "Command was:" continuation, then report what is left.
# Anything naming a table, index, or constraint is real.
BENIGN='unrecognized configuration parameter "transaction_timeout"|SET transaction_timeout = 0;|errors ignored on restore:'
REAL="$(grep -E '^pg_restore: error|^psql:.*ERROR|^ERROR' "$LOG" | grep -vE "$BENIGN" || true)"
rm -f "$LOG"

echo
if [[ -n "$REAL" ]]; then
  echo "!!! REAL ERRORS during restore — do not proceed until these are understood:"
  echo "$REAL"
  echo
else
  echo "==> no real errors (only the expected transaction_timeout notice)"
fi

# pg_restore leaves the empty schema behind even when its contents are excluded.
run psql -q -d "$TARGET_URL" -c 'DROP SCHEMA IF EXISTS _system CASCADE;'

# A fresh restore leaves the planner with no statistics across 120 tables, so
# the first real queries would be planned blind.
echo "==> ANALYZE"
run psql -q -d "$TARGET_URL" -c 'ANALYZE;'

echo "==> verification"
run psql -At -d "$TARGET_URL" -c "
SELECT 'tables=' || count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE';"
run psql -At -d "$TARGET_URL" -c "
SELECT 'foreign_keys=' || count(*) FROM pg_constraint c
  JOIN pg_namespace n ON n.oid=c.connamespace
  WHERE n.nspname='public' AND c.contype='f';"
run psql -At -d "$TARGET_URL" -c "
SELECT 'tables_without_pk=' || count(*) FROM information_schema.tables t
  WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname=t.table_name AND c.contype='p');"

# Exact counts. pg_stat_user_tables.n_live_tup is an estimate and will disagree
# by design, so it is useless for a migration diff.
echo "==> per-table row counts (exact) -> db/dumps/rowcounts-\$(target).txt"
run psql -At -d "$TARGET_URL" -c "
SELECT table_name || ' = ' ||
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM %I.%I','public',table_name), false, true, '')))[1]::text
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY 1;" | tee "db/dumps/rowcounts.txt" | grep -vE ' = 0$' || true

echo "==> done (full counts in db/dumps/rowcounts.txt)"
