# Migration Guide: Replit → DigitalOcean (Coolify + Managed Postgres + Spaces)

Follow the parts **in order**. Each step says **where** to do it. Don't skip the
checkmarks — they keep the migration safe.

Three rules that override everything else in this document:

> **Never run `npm run db:push` against the DigitalOcean database before the
> restore.** It would create all 120 tables, and then `pg_restore` fails
> "already exists" on every one of them.

> **Never change `JWT_SECRET`, `HMAC_SECRET`, or the `VAPID_*` keys as part of
> the move.** Copy them across byte-for-byte. Rotating them is a separate,
> announced change (Part 6).

> **Never start the app between restoring the schema and restoring the data.**
> `registerRoutes()` runs its seeders before the server listens, and
> `seedSystemValueDefinitions()` writes 35 rows into `system_value_definitions`
> whenever it finds that table empty. The data restore then lands on top of
> them, leaving 35 orphan duplicates that nothing cleans up. Schema → data →
> *then* start.

> **Start with [DeploymentWork.md](DeploymentWork.md)**, not this file. That is the
> ordered task list for the actual two-stage plan (test domain first, then
> cutover on the existing domain), written against what the production data
> really contains. This document is the reference manual it links into.

For running the whole thing locally on Docker first — which is the cheapest way
to find problems — see **[LOCAL.md](LOCAL.md)**.

---

## Part 1 — Prepare on Replit (do now, app keeps running)

### 1.1 Set secrets — *in Replit → your App → Secrets (🔒)*

Add these **exact values** (the same as the built-in defaults, so nobody gets
logged out):

| Key | Value |
|---|---|
| `JWT_SECRET` | `dabluz-crm-secret-key-change-in-production` |
| `HMAC_SECRET` | `dabluz-webhook-secret-change-in-production` |
| `SUPER_ADMIN_EMAIL` | `adminleadani@leadani.com` |
| `SUPER_ADMIN_PASSWORD` | (the current super-admin password) |

⚠️ Do NOT invent new values yet — changing `JWT_SECRET` logs out every user, and
changing `HMAC_SECRET` breaks every inbound webhook signature. Rotate later, in
a planned window.

### 1.2 Redeploy — *in Replit → Deploy*

- Pick a low-traffic hour. Redeploy the app (it now has all migration-ready code).
- ✅ Test: log in, open leads, view a notice PDF, **upload** a notice PDF, send
  one WhatsApp message.
- If anything is wrong: Replit → Deployments → **Rollback** (one click).
- Let it run 1–2 days before continuing.

### 1.3 Google service account — *in console.cloud.google.com*

1. Create a project (or use an existing one) → enable **Google Sheets API**.
2. IAM & Admin → Service Accounts → create one → Keys → **Add key (JSON)** → download.
3. In Replit Secrets add `GOOGLE_SERVICE_ACCOUNT_JSON` = the whole JSON file
   content, **base64-encoded**. The app accepts raw JSON too, but the private key
   contains embedded newlines that most environment-variable UIs mangle; base64
   avoids that whole class of problem.
4. **Share every backup spreadsheet** with the service account address
   (`…@….iam.gserviceaccount.com`) as **Editor** — in Google Sheets → Share.
   Backups fail per-company without this, even with the env var set correctly.
5. ✅ Test: in the app, trigger a manual Google Sheets backup — it must succeed.

---

## Part 2 — Move file storage to Spaces (do now, weeks ahead of cutover)

**Do not leave this for cutover day.** The Replit deployment target is Cloud Run
(`.replit`), so the production `./uploads` directory is *ephemeral and separate
from the Replit workspace filesystem*. Any notice PDF uploaded since the last
deploy exists only on the live container and is **destroyed the moment you idle
the deployment** — that is, before any cutover-day copy script could reach it.

Doing it now also makes rollback file-safe: both hosts read the same bucket.

### 2.1 Create the Space — *in DO → Spaces Object Storage*

- Create a Space (bucket), **private** (no public file listing).
- API → Spaces Keys → generate a key + secret. Note the region and endpoint
  (e.g. `https://blr1.digitaloceanspaces.com`).

### 2.2 Inventory what exists — *in the Replit Shell*

```sql
SELECT company_id, file_path, uploaded_at FROM company_notices ORDER BY uploaded_at DESC;
SELECT id, recording_url FROM call_sessions WHERE recording_url IS NOT NULL;
```

### 2.3 Copy the workspace files — *in the Replit Shell*

```bash
S3_ENDPOINT=... S3_REGION=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
npx tsx scripts/migrate-uploads-to-s3.ts
```

The script verifies every upload and then cross-checks `company_notices`.

### 2.4 Recover files that only exist on the live deployment

For each `file_path` from 2.2 with an `uploaded_at` **after the last Replit
deploy**: download it through the running app (`GET /api/notice` with an admin
token for that company) and PUT it into the Space under the *same key*. There is
no shell access to a Cloud Run deployment — the app's own download endpoint is
the only way to reach those bytes.

### 2.5 Switch Replit to Spaces — *in Replit Secrets, then Deploy*

Set `STORAGE_DRIVER=s3` plus `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and redeploy.

- ✅ Upload a fresh notice in the app → confirm the object appears in the Space
  and downloads correctly.
- ✅ Re-run the script from 2.3 → it must end with
  *"All notice files present in bucket."*

**Cutover day now has zero file work.**

---

## Part 3 — Provision DigitalOcean (~30 min)

### 3.1 Database — *in DO → Databases*

- Create a **Managed PostgreSQL** cluster. **Choose PostgreSQL 16** to match the
  source — the Neon server reports `16.15`, and a same-major dump/restore is the
  boring path. Note this constrains the *server* only; the *client* tools must
  still be v18 to read the dump (see 5.2).
- Picking **17 instead is also safe** and has one small advantage: PG17 knows the
  `transaction_timeout` setting, so the restore produces zero spurious errors
  rather than one per worker. Weigh that against giving up exact version parity
  with the source. Verified locally on 16, which is the recommendation.
- Create a dedicated database (e.g. `leadani`) rather than using `defaultdb`.
- ⚠️ Note the **direct connection** string, NOT the "connection pool" one. The
  Saila intake engine takes session-level Postgres advisory locks
  (`server/saila-intake-engine.ts`); behind a transaction-mode pooler the lock
  and the unlock land on different backends. Worse, the code *tolerates* lock
  failure and carries on unguarded, so a pooler would not throw — it would
  silently leak session locks until connections run out.
- The URL must end with `?sslmode=require`.
- **No Postgres extensions are needed.** The schema uses only `gen_random_uuid()`
  and `hashtext()`, both core since PG13.

### 3.2 Server + Coolify Cloud — *in DO → Droplets, then Coolify Cloud*

This project uses **Coolify Cloud**: the control plane is hosted and you attach
your own droplet as the deploy target. Nothing is installed on the droplet by
hand.

- Create a droplet: Ubuntu, **at least 4 GB RAM**, with your SSH key added at
  creation. Builds run on this droplet, and the Vite build asks for a 3 GB heap.
- **Add 2 GB of swap before the first build.** If the build OOMs without it, the
  kernel may kill the running app rather than the build.
- In Coolify Cloud, add a **Server** with the droplet IP and SSH key. Coolify
  installs Docker and its agent over SSH.
- Point a domain/subdomain (e.g. `app.leadani.com`) at the droplet IP.
- Add the **droplet's** IP to the database's **Trusted Sources** — the app
  runs there, not on Coolify's control plane, so that is the address that
  connects.

### 3.3 Collect for cutover day

- DO database URL (direct, `sslmode=require`)
- Spaces: endpoint, region, bucket, key, secret
- From Replit Secrets, copied **unchanged**: `JWT_SECRET`, `HMAC_SECRET`,
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SARVAM_API_KEY`,
  `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## Part 4 — Set up and rehearse in Coolify (before cutover)

### 4.1 Application settings — *in Coolify → New Resource → your git repo*

| Setting | Value |
|---|---|
| Build pack | **Dockerfile** (already in the repo) |
| Port | **5000** |
| Domain | your subdomain, HTTPS on |
| Health check path | **`/health`** |
| Health check start period | **120s** |
| Replicas | **1** |
| Deployment strategy | **stop old container, then start new** — not rolling |
| Stop grace period | **30s** |
| Persistent storage | **none** |

**Replicas must stay at 1.** The app runs six in-process `setInterval`
schedulers (snapshots, snapshot cleanup, Saila intake, Google Sheets backup,
deleted-lead purge, selfie purge), an in-memory Socket.io adapter, an in-memory
rate-limit store, and an in-memory impersonation-code map.

**Rolling deploys are equally unsafe** — they start the new container before
stopping the old one, so for 10–60 seconds two instances run every scheduler.
Nothing guards against duplicate snapshot runs, duplicate Sheets backups, or a
double lead purge. Configure stop-then-start explicitly and accept a few seconds
of downtime per deploy.

The **stop grace period must exceed 20s**, the shutdown timeout in
`server/shutdown.ts`. Below that, Docker sends SIGKILL while the app is still
draining connections and closing the database pool.

You do **not** need to configure a proxy body-size limit — Traefik has no default
request-body limit. The real ceiling is `express.json` in `server/app.ts`.

WebSockets need no configuration; Traefik proxies them transparently.

### 4.2 Environment variables — *in Coolify → Environment Variables*

Required:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=                  # DO direct connection string, ?sslmode=require
FRONTEND_URL=                  # https://<your-domain>  (Socket.io CORS origin)
JWT_SECRET=                    # byte-identical to Replit
HMAC_SECRET=                   # byte-identical to Replit
VAPID_PUBLIC_KEY=              # byte-identical to Replit
VAPID_PRIVATE_KEY=             # byte-identical to Replit
SARVAM_API_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=   # base64 of the service-account key
STORAGE_DRIVER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Optional: `DB_POOL_MAX` (default 10 — keep it below the DB plan's backend limit,
around 22 on the basic plans), `DATABASE_CA_CERT`, `S3_FORCE_PATH_STYLE`.

**Omit `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` on DigitalOcean.** After the
restore the account already exists, and the boot-time bootstrap skips itself when
they are unset. Fewer secrets stored is strictly better.

Note: WhatsApp credentials live **in the database**, not in environment
variables, so they travel with the dump — which is also why they are worth
rotating afterwards (Part 6).

Verified against the production data: `meta_platform_settings` and
`whatsapp_cloud_config` are both **empty**. The Meta embedded-signup path is not
in use. WhatsApp actually goes through **Wauper** (`crmapi.wauper.com`), with
credentials in `saila_config.wauper_api_key` and the per-phone
`saila_phone_settings.access_token` (5 enabled phones across 2 companies).

### 4.3 A note on the lockfile

`package-lock.json` used to pin 44 tarballs to `package-firewall.replit.local`,
Replit's internal package proxy — including `@aws-sdk/client-s3`, which the S3
storage driver depends on. That host does not resolve anywhere else, so `npm ci`
inside the Docker build failed with `ENOTFOUND` on any non-Replit machine. Those
URLs have been rewritten to `registry.npmjs.org`.

Running `npm install` from the Replit shell can reintroduce them. Check before
committing any lockfile change:

```bash
grep -c 'replit.local' package-lock.json   # must print 0
```

### 4.4 Rehearse against real data — *a week before cutover*

Do **not** simply deploy against an empty database. It will boot — every
boot-time DDL statement is individually error-handled, so nothing is created and
no later `pg_restore` conflict is introduced — but login 500s and you learn
nothing about DO Postgres latency, TLS, Spaces reachability, or real boot time.

Instead:

1. `CREATE DATABASE leadani_rehearsal` in the same cluster.
2. Restore a dump into it using the procedure in Part 5.
3. Point Coolify at it and run the **full** smoke test from 5.7.
4. Verify `trust proxy`. The app is configured for exactly one proxy hop
   (`server/app.ts`). Log `req.ip` from a known external IP and confirm it is not
   Traefik's internal `172.x` address. If it is wrong, every client collapses
   onto a single IP and the login limiter locks out all users at 30 attempts per
   15 minutes. Behind two hops (e.g. Cloudflare in front of Traefik) the setting
   must become `2`.
5. `DROP DATABASE leadani_rehearsal`, then stop the Coolify app until cutover.

Real users stay on Replit throughout.

---

## Part 5 — Cutover day (~30–60 min downtime, pick a quiet time)

Announce downtime. **Lower the DNS TTL to 300s a full day in advance** — doing it
an hour before buys you nothing.

Run the dump and restore **from the droplet**, not the Replit shell: faster
egress to the DO cluster, and no risk of the Replit session dropping mid-transfer.

### 5.1 Stop writes

Replit → Deployments → stop/idle the deployment.

### 5.2 Copy the database

```bash
pg_dump --format=custom --no-owner --no-acl --no-comments "$REPLIT_DATABASE_URL" -f leadani.dump
pg_restore --no-owner --no-acl --no-comments --exclude-schema=_system -j 4 \
  -d "$DO_DATABASE_URL" leadani.dump
```

**The client tools must be PostgreSQL 18 or newer — not 16.** This is not a
preference; a v16 client physically cannot read the dump.

The Replit/Neon export is a custom-format archive at **archive version 1.16**,
written by `pg_dump` **18.2** against a Neon server running **16.15**.
`pg_restore` only reads archives at or below its own version, so PostgreSQL 16's
`pg_restore` fails immediately on the file header:

```
pg_restore: error: unsupported version (1.16) in file header
```

Install PGDG `postgresql-client-18` on the droplet and use it for both commands.
Restoring 18 → 16 is fine; the reverse is not. (If you have Docker on the
droplet, `docker run --rm -v "$PWD:/dump" postgres:18-alpine pg_restore ...`
avoids installing anything.)

Also note the exports may arrive **named `.sql` but be binary** — they start with
the magic bytes `PGDMP`. Check with `head -c 5 <file>` before assuming `psql`
will work. And if the schema and data came as **two separate files**, restore the
schema first, then the data, and do not start the app in between (see the third
rule at the top of this document).

**Reading the error output:**

- Do **not** pass `--exit-on-error`, and do **not** treat the exit code as the
  signal. `pg_restore` 18 unconditionally issues `SET transaction_timeout = 0`,
  a GUC that only exists from PostgreSQL 17. A PG16 server rejects it once per
  parallel worker:

  ```
  ERROR:  unrecognized configuration parameter "transaction_timeout"
  ```

  That is a session setting — no data is affected — but it alone makes
  `pg_restore` exit non-zero on a completely successful restore.
- So capture stderr and read it. Ignore `transaction_timeout`, `plpgsql`, and
  comment noise; **anything naming a table, index, or constraint is real.**
  `scripts/db-restore.sh` does exactly this filtering and prints what is left
  under `!!! REAL ERRORS`.
- `--exclude-schema=_system` skips `_system.replit_database_migrations_v1`,
  Replit's internal deployment bookkeeping. It is meaningless off Replit and the
  app never reads it. `pg_restore` still creates the empty schema, so drop it
  afterwards: `DROP SCHEMA IF EXISTS _system CASCADE;`

**If the export arrives as separate schema and data archives**, the foreign keys
are already in place and enforced when the data loads. `pg_dump` topologically
sorts the `TABLE DATA` entries, so a **serial** restore works — but `-j` does
not, because FK relationships are not recorded as archive dependencies for a
data-only dump and workers would load children before parents. Restore the
schema with `-j 4` and the data **serially**.

**Skipping `sheet_snapshots`.** It is by far the largest table and holds
historical sheet snapshots that the scheduler rebuilds on its own. Dropping it
takes a ~3.4 GB archive down to a ~2.7 GB database. If you skip it you must also
skip `snapshot_restore_logs`, whose `snapshot_id` is `NOT NULL` and references
it — otherwise every restore-log row fails to load. `pg_restore` has no
`--exclude-table`; use `-l` to dump the TOC, delete those entries, and pass the
result back with `-L`. `scripts/db-restore.sh` does this via
`EXCLUDE_TABLES="sheet_snapshots snapshot_restore_logs"` and warns about NOT NULL
children you forgot. Note the trade-off: existing sheets can no longer be rolled
back to a historical snapshot.

### 5.3 Refresh planner statistics

```bash
psql "$DO_DATABASE_URL" -c 'ANALYZE;'
```

Skipping this means the first user queries run against a planner with no
statistics across 120 tables.

### 5.4 Verify row counts — exact, both sides, then diff

```sql
SELECT table_name,
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM %I.%I','public',table_name), false, true, '')))[1]::text::bigint AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY 1;
```

Do **not** use `pg_stat_user_tables.n_live_tup` — it is an estimate and will
disagree by design.

✅ Then re-validate every foreign key against the rows that actually landed. Row
counts alone will not catch a partial or mis-ordered restore; this will. It must
report `0`:

```sql
DO $$
DECLARE r record; bad int := 0;
BEGIN
  FOR r IN SELECT conrelid::regclass AS t, conname FROM pg_constraint c
           JOIN pg_namespace n ON n.oid = c.connamespace
           WHERE c.contype = 'f' AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.t, r.conname);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'INVALID: %.%', r.t, r.conname; bad := bad + 1;
    END;
  END LOOP;
  RAISE NOTICE 'foreign keys failing validation: %', bad;
END $$;
```

✅ Also spot-check sequences; a mismatch here means silent primary-key collisions
later:

```sql
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';
```

### 5.5 Start the app

Coolify → deploy/start. In the logs, look for:

- `[Perf] Lead indexes verified/created`
- `[Snapshot] Scheduler initialized`
- `[Saila Intake] Starting tick scheduler`
- `[Backup Scheduler] Starting with interval 60 minutes`
- and **no** `SECURITY WARNING: [config] JWT_SECRET is not set` — that line is
  the canary telling you environment-variable injection actually worked.

### 5.6 Repoint integrations — *immediately, before the smoke test*

Only needed if the public domain is changing. Inbound WhatsApp messages are lost
between app start and this step, and Meta's retries will not cover all of them.

- *Wauper dashboard* (not the Meta developer portal — see 4.2): update the
  WhatsApp webhook callback URL for each connected phone.
- Any external system posting to `/api/public/webhooks/...`: update the URL.

### 5.7 Smoke test on the new domain

Log in → leads list → view a notice PDF → **upload** a notice PDF → send a
WhatsApp message → receive an inbound WhatsApp webhook → trigger a manual Google
Sheets backup → receive a push notification → open two browser tabs and confirm
real-time updates propagate between them (this validates Traefik's WebSocket
handling and the `FRONTEND_URL` CORS origin together).

### 5.8 Switch DNS

Users are now on DigitalOcean.

---

## Part 6 — After migration

### The rollback window is defined by write divergence, not by time

- **Before any user writes to the DO database**, rollback is free and lossless:
  revert DNS and restart the Replit deployment. The Replit database is untouched.
  Because `JWT_SECRET` is identical on both hosts and tokens last 7 days, **nobody
  is logged out in either direction** — that is the whole reason for the
  don't-rotate-secrets rule at the top of this document. Files are safe too, since
  both hosts read the same Space (Part 2).
- **Once users are writing on DO**, rollback means losing those writes. Switch to
  forward-fix. Agree this line with the business *before* cutover day, so nobody
  has to make the call under pressure.
- Pre-write the rollback DNS record so it is one paste, not one lookup.
- Keep the Replit deployment stopped but intact, and its database undeleted, for
  **one week**.

### Day 1

- Take a manual `pg_dump` of the DO database to Spaces — one you control, from
  before any of the hardening below.
- Add uptime monitoring on `/health` from outside the droplet, and set up a
  Coolify log drain. On Replit, crash-restarts were platform-visible; on a
  droplet a crash loop is invisible until a user complains.

### After the soak week

- Make the config guards hard errors: `server/config.ts` currently only *warns*
  when `JWT_SECRET`, `HMAC_SECRET`, or `FRONTEND_URL` are unset in production.
  Turn those into thrown errors **now, not before** — doing it earlier would turn
  a warning into a boot loop on cutover day.
- Rotate `JWT_SECRET` and `HMAC_SECRET` to strong random values in an announced
  window. This logs everyone out once, and `HMAC_SECRET` needs coordinating with
  whoever signs the inbound webhooks.
- Rotate the Wauper API key and the per-phone WhatsApp access tokens — they are
  stored as plaintext database columns and just travelled to a new host.
- Restrict the DO database's Trusted Sources to the droplet only. Note this also
  blocks the schema-change workflow below, so build "add IP → push → remove IP"
  into that process.
- Remove the Replit residue: `.replit`, `replit.nix`, `replit.md`,
  `scripts/post-merge.sh`, the three `@replit/vite-plugin-*` devDependencies and
  the plugin block in `vite.config.ts`, and the Replit-connector fallback in
  `server/google-sheets-backup.ts`.
- `git rm --cached uploads/notices/*.pdf`.
- Add `helmet` — there is currently no CSP / HSTS / X-Frame-Options middleware.
- Cancel or downgrade Replit when confident.

### Applying schema changes on DigitalOcean

On Replit this happened automatically: the `[postMerge]` hook ran
`scripts/post-merge.sh`, which ran `npm run db:push`. **Coolify has no equivalent,
and you should not build one** — `drizzle-kit push` applying itself on every merge
to a production database will eventually propose dropping a column.

Do it manually and gated, from a development machine:

1. Temporarily add your IP to the DO database's Trusted Sources.
2. `DATABASE_URL=<do-direct-url> npm run db:push`
3. **Read the diff drizzle prints** before confirming.
4. Remove your IP again.

`drizzle-kit` is a devDependency, so it runs from your machine. Exec-ing into the
container cannot work: the runtime image contains no source and no
`shared/schema.ts`.

Longer term, consider adopting versioned migrations. `migrations/` currently holds
ten hand-written `.sql` files with no drizzle journal — `drizzle-kit generate` has
never been run. Adopting it means generating a baseline covering all 120 tables and
then marking it applied without executing it. That is a careful one-time
operation for a quiet week, **never** for cutover day. The ten existing `.sql`
files are historical records; their effects are already in the dump, so do not
run them against DigitalOcean.

---

## If something goes wrong

- **During cutover**: nothing is destroyed. The Replit deployment and its
  database are untouched. Restart the Replit deployment and revert DNS to get
  back to where you started.
- **App boots but has no data**: `DATABASE_URL` is wrong or missing. The app
  refuses to start in production without it, so check the Coolify env vars and
  the container logs.
- **Files 404**: check `STORAGE_DRIVER=s3` and the five `S3_*` variables, then
  re-run the cross-check in step 2.3.
- **Everyone is logged out**: `JWT_SECRET` does not match Replit's. Set it back.
- **All inbound webhooks fail signature checks**: `HMAC_SECRET` does not match.
- **Push notifications stopped**: the `VAPID_*` keys were regenerated instead of
  copied. Restore the originals — new keys invalidate every stored subscription.
- **Users are rate-limited into a lockout**: the `trust proxy` hop count is wrong
  for your topology. See step 4.4.4.
- **Google Sheets backups fail**: `GOOGLE_SERVICE_ACCOUNT_JSON` is unset or
  malformed, or the spreadsheets were never shared with the service account
  address as Editor. The app logs a `[config]` error at boot when the variable is
  missing.
