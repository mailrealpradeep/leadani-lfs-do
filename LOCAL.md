# Running locally with Docker

A self-contained stack — the app plus PostgreSQL 16 — that mirrors what will run
on DigitalOcean. Nothing needs to be installed on the host except Docker.

Production on DO does **not** use this file: Coolify builds the `Dockerfile`
directly and connects to a DO Managed Postgres cluster. The `db` service here
exists only so local runs have a database. Keeping the two apart is deliberate —
anything that works only because Postgres is a sibling container is a bug that
would surface on cutover day.

---

## The one rule about ordering

> **Restore the schema, restore the data, and only then start the app.**

Starting the app against a schema-only database is not harmless. `registerRoutes()`
runs its seeders *before* the server listens, and `seedSystemValueDefinitions()`
inserts **35 rows** into `system_value_definitions` whenever it finds that table
empty. Restoring the real data on top of that leaves the Replit rows plus 35
orphan duplicates that nothing will ever clean up.

If you have already started the app against an empty schema, run
`scripts/db-reset.sh` before loading data.

---

## Quick start

```bash
# 1. Start only the database
docker compose -f docker-compose.local.yml up -d db

# 2. Restore schema, then data (order matters — see above)
scripts/db-restore.sh ~/Downloads/leadani-db-schema.sql
scripts/db-restore.sh ~/Downloads/leadani-db-data.sql

# 3. Now start the app
docker compose -f docker-compose.local.yml up -d --build app

# 4. Check
curl http://localhost:5000/health
docker compose -f docker-compose.local.yml logs -f app
```

The app is on <http://localhost:5000>. Postgres is on host port **5433** (not
5432, so it cannot collide with a native Postgres install).

### Useful commands

```bash
docker compose -f docker-compose.local.yml logs -f app     # follow logs
docker compose -f docker-compose.local.yml restart app     # restart app only
scripts/db-reset.sh                                        # empty the database
docker compose -f docker-compose.local.yml down            # stop, keep data
docker compose -f docker-compose.local.yml down -v         # stop, DESTROY data
```

---

## About the dump files

The exports from Replit are named `.sql` but they are **not** plain SQL — they
are custom-format `pg_dump` archives (they begin with the magic bytes `PGDMP`).
Opening one in a text editor shows binary. `scripts/db-restore.sh` sniffs the
content rather than the extension and picks `pg_restore` or `psql` accordingly.

Two version facts drive the whole restore procedure:

| | |
|---|---|
| Source server | Neon, PostgreSQL **16.15** |
| Dump written by | pg_dump **18.2**, custom format, archive version **1.16** |

`pg_restore` reads archives at or below its own version, so **PostgreSQL 16's
`pg_restore` cannot read these files at all**:

```
pg_restore: error: unsupported version (1.16) in file header
```

The client must be **18 or newer**, even though the data came from a 16 server
and is going back into one. Restoring 18 → 16 is fine; the reverse is not. The
scripts run `postgres:18-alpine` in a throwaway container for this, so no client
tools are installed on the host.

### The one error you should expect and ignore

pg_restore 18 unconditionally issues `SET transaction_timeout = 0`, a setting
that only exists from PostgreSQL 17. A PG16 server rejects it, once per parallel
worker:

```
pg_restore: error: could not execute query: ERROR:  unrecognized configuration
parameter "transaction_timeout"
Command was: SET transaction_timeout = 0;
```

It is a session setting — no data is affected — but it makes `pg_restore` exit
non-zero, so **the exit code is not a usable signal here**. `db-restore.sh`
filters exactly this one error and prints anything else under
`!!! REAL ERRORS`. Trust that line, not the exit code.

### What gets dropped on purpose

`--exclude-schema=_system` skips `_system.replit_database_migrations_v1`, Replit's
internal deployment bookkeeping. It has no meaning off Replit and the app never
reads it. `--no-owner --no-acl` skip the `neondb_owner` role, which does not
exist locally or on DigitalOcean.

### Why the data restore runs serially

A normal `pg_dump` orders everything schema → data → constraints, so no foreign
key exists while data loads and any restore order works. This export is **split
into two archives**, so by the time the data arrives all 252 FKs are already in
place and enforced.

`pg_dump` does topologically sort the `TABLE DATA` entries — `companies`, `users`
and `sheets` come before `activity_logs` and `leads` — so a **serial** restore in
TOC order satisfies every parent-before-child dependency. But `-j` hands tables
to workers concurrently and only honours dependencies recorded in the archive,
and FK relationships are not among them for a data-only dump. A parallel restore
would load children before parents and fail.

`db-restore.sh` detects which kind of archive it has from the TOC and picks
`-j 4` for schema, serial for data. The two self-referencing FKs (`users`,
`saved_reports`) are safe either way: RI checks are AFTER-ROW triggers that fire
at end of statement, and each table is a single `COPY`.

### Skipping tables you do not need

```bash
EXCLUDE_TABLES="sheet_snapshots snapshot_restore_logs" \
  scripts/db-restore.sh ~/Downloads/leadani-db-data.sql
```

`pg_restore` has no `--exclude-table`, so the script dumps the TOC with `-l`,
removes the matching entries, and feeds the result back with `-L`. Names are
anchored, so excluding `sheets` would not also knock out `sheet_snapshots`.

**Excluding a parent forces you to exclude its NOT NULL children.**
`snapshot_restore_logs.snapshot_id` is `NOT NULL` and references
`sheet_snapshots`, so dropping the snapshots alone makes every restore-log row
unloadable. The script checks for exactly this and warns by name rather than
letting you find out an hour into a restore.

`sheet_snapshots` is by far the largest table in this dataset — it alone took the
database past 6.6 GB before the rest had even started. Excluding the pair brings
a ~3.4 GB archive down to a **2.7 GB** database that restores in a few minutes.
The cost is losing the ability to roll a sheet back to a historical snapshot;
the scheduler simply starts building new ones on first boot.

---

## Verified on this stack

Schema, then data (`sheet_snapshots` / `snapshot_restore_logs` excluded), then app:

| Check | Value |
|---|---|
| Public tables | **120** |
| Foreign keys | **252**, and **all 252 pass `VALIDATE CONSTRAINT` against the loaded data** |
| Primary keys | **120** (every table has one) |
| Extensions required | **none** — only `gen_random_uuid()` and `hashtext()`, core since PG13 |
| Rows restored | **3,160,746** across 85 tables |
| Database size | 2.7 GB |
| Companies / users / sheets / leads | 12 / 50 / 50 / 47,849 |

The `VALIDATE CONSTRAINT` sweep is the check worth repeating on DigitalOcean —
it re-verifies every foreign key against the rows actually present, so it catches
a partial or mis-ordered restore that row counts alone would not.

Application behaviour on that data:

- container **healthy**, `/health` → 200
- `[Seed] Completed. Created: 0, Skipped: 35` — the seeder found the real rows and
  wrote nothing, which is the proof that the schema → data → app order held
- all 12 companies recognised (`Skipped 12 (already exists)`), 0 leads backfilled,
  0 purged by the cleanup jobs
- `GET /api/auth/me` returns the real super-admin with original timestamps
- `GET /api/super-admin/companies` returns live per-company aggregates
- `GET /api/sheets/:id/leads` on the largest sheet: **HTTP 200 in ~26 ms**
- graceful shutdown drains cleanly (`[shutdown] complete`, container exit 0)

---

## Configuration

`docker-compose.local.yml` has working defaults for every variable, so the stack
runs with no `.env` at all. To override, create a `.env` next to it — Compose
reads it automatically. See `.env.example` for the full documented list.

Two defaults are chosen deliberately:

- `JWT_SECRET` / `HMAC_SECRET` default to the **same built-in values** as
  `server/config.ts`. A dump restored from Replit therefore keeps working and no
  one is logged out. Do not "improve" these locally — matching them is the point.
- `STORAGE_DRIVER=local` so uploads work without Spaces credentials. To rehearse
  the production path, set `STORAGE_DRIVER=s3` and the five `S3_*` variables in
  `.env`; production on DO uses `s3`.

The app logs two warnings at boot in this configuration —
`STORAGE_DRIVER=local in production` and `GOOGLE_SERVICE_ACCOUNT_JSON is not
set`. Both are expected locally and both describe real production requirements.
