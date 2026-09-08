# Runtime settings (environment variables)

Every switch below is an environment variable read once at boot by
`server/config.ts`. On the DigitalOcean deployment set them in
**Coolify → the app → Environment Variables**, then redeploy (or restart the
container). Nothing here needs a code change.

## Google Sheets backup — `GOOGLE_SHEETS_BACKUP`

Controls the hourly Google Sheets backup scheduler **and** the manual
"Sync now" button on the Backup settings page.

| Value | Effect |
|---|---|
| unset / anything else | **Off (default).** Scheduler never starts; manual sync returns "Google Sheets backup is disabled on this deployment". Boot log shows `[Backup Scheduler] Disabled`. |
| `enabled` | On. Hourly scheduler runs and manual sync works. Also needs `GOOGLE_SERVICE_ACCOUNT_JSON` (see `MIGRATION.md`). |

Why it is off by default: one backup run reads every lead of every
backup-enabled sheet (about 29,000 leads in production) and then queries the
updates of each lead one by one. That is ~29,000 database queries per run,
and the runs overlap because a run takes longer than the hourly interval. On
the 1 vCPU / 1 GB database plan this alone keeps the database at 100% CPU
around the clock. Do not enable it again until the `lead_updates(lead_id)`
index exists and the per-lead query loop has been replaced by a per-sheet
batch load.

To enable:

```
GOOGLE_SHEETS_BACKUP=enabled
```

## Sheet snapshots — `SHEET_SNAPSHOTS`

Controls the hourly snapshot scheduler that powers "restore sheet to an
earlier state". Manual snapshots from the admin UI work regardless.

| Value | Effect |
|---|---|
| unset / anything else | **On (default).** Hourly cycle plus a daily purge of snapshots older than 30 days. |
| `disabled` | Scheduler never starts. Boot log shows `[Snapshot] Disabled`. No new restore points are created. |

The hourly cycle is now cheap when nothing changed: per sheet it reads only
`(id, updated_at)` of the live leads and the previous snapshot's hash. Full
lead rows and the multi-MB snapshot JSON are read/written only for sheets
whose leads actually changed. Leave it on unless you never use restore.

## Other switches that already exist

| Variable | Default | What it controls |
|---|---|---|
| `LOG_RETENTION_DAYS` | `90` | Daily pruning of `activity_logs`, `audit_logs`, `outgoing_webhook_logs`, `webhook_requests`, `backup_sync_logs`. First pass 15 min after boot, then every 24 h, in 5,000-row batches. `0` disables pruning (tables grow forever). |
| `OUTBOUND_INTEGRATIONS` | `enabled` | `disabled` suppresses all egress: WhatsApp sends, outgoing webhooks, Google Sheets writes, web push. For staging copies only. Never set on the deployment serving real users. |
| `DB_POOL_MAX` | `10` | Max database connections the app opens. Keep below the DO plan's connection limit (about 22 on the smallest plans). |

## Background jobs with no switch yet

These have no on/off variable yet (the snapshot cycle now has one, see
`SHEET_SNAPSHOTS` above). Listed so you can decide which ones to keep;
each can be put behind a variable in the same way as the backup.

| Job | Where | Schedule | Database cost per run (production sizes) |
|---|---|---|---|
| Saila intake tick | `server/saila-intake-scheduler.ts` | every **15 s** | 1 scan of `saila_intake_sessions` for `active` rows, then per-flow/per-company lookups memoized within the tick. Sessions the tick can never prompt (no customer phone on record, config or number disabled, silent more than 7 days past the timeout) are marked `abandoned` on first sight, so nothing accumulates; the 314 stale sessions from May–Aug are drained on the first tick after deploy. |
| Sheet snapshots | `server/snapshot-scheduler.ts` | every **1 h** (first run 2 min after boot); switch: `SHEET_SNAPSHOTS` | Per sheet: one narrow `(id, updated_at)` query and one hash read. Full leads and the ~5.7 MB JSONB row are only read/written for sheets that changed. Disk grows until the 30-day cleanup. |
| Snapshot cleanup | `server/snapshot-scheduler.ts` | every **24 h** | One `DELETE` on `sheet_snapshots` older than 30 days, indexed. Cheap. |
| Log retention | `server/log-retention.ts` | every **24 h** | Batched indexed deletes; backlog is currently only ~18,000 rows. Cheap. |
| Deleted-lead purge | `server/routes.ts` (`cleanupOldDeletedLeads`) | at boot + every **24 h** | One `DELETE` on `leads` where `deleted_at` is older than 30 days. Currently 0 soft-deleted leads. Cheap. |
| Selfie URL purge | `server/routes.ts` (`cleanupOldSelfieUrls`) | at boot + every **24 h** | One `UPDATE` on `attendance_entries` (no index on `entry_time`; small table). Cheap. |
| Boot seeders | `server/routes.ts` → `server/seed.ts` | every **boot** | `backfillConversionDates` loads **every lead of every sheet** (47,846 rows) on each deploy. Runs once per boot, then idle. |
| Impersonation-code sweep | `server/routes.ts` | every **60 s** | In-memory only, no database access. |

Per-user polling from the browser (only while someone is logged in):
sidebar badge counts every 60 s (`/api/hot-leads/count`,
`/api/saila/call-commitments/counts`, `/api/custom-views-counts`, served from
in-process caches), PowerScore every 30 s, working targets every 30 s, Saila
pages every 30 s, lead drawer WhatsApp messages every 15 s while open.
