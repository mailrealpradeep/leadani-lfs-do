-- Performance indexes for the log / append-only tables.
--
--   psql "$DO_DATABASE_URL" -f db/performance-indexes.sql
--
-- Run this against the DigitalOcean database AFTER the restore and BEFORE
-- starting the app for the first time.
--
-- Why run it here rather than letting the app do it
-- -------------------------------------------------
-- registerRoutes() creates these same indexes with plain CREATE INDEX before
-- server.listen(). On an empty database that is instantaneous. On a freshly
-- restored 2.7 GB database it is minutes of work with an ACCESS EXCLUSIVE lock
-- held on each table, all of it before /health can answer — and the container
-- healthcheck allows 120s. Building them first makes that boot a no-op, because
-- every statement there is IF NOT EXISTS.
--
-- CONCURRENTLY is used below: it takes no exclusive lock, so this file is also
-- safe to run against a database that is already serving users. It cannot run
-- inside a transaction block, which is why there is no BEGIN/COMMIT here — psql
-- runs each statement in its own transaction by default. Do not wrap it.
--
-- If a CONCURRENTLY build is interrupted it leaves an INVALID index behind.
-- Check afterwards and simply re-run this file after dropping any it finds:
--
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--
-- Keep in sync with the [Perf] block in server/routes.ts.

-- outgoing_webhook_logs — ~1 GB, primary key only.
-- Read as (webhook_id, newest first); pruned by created_at.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owl_webhook_created
  ON outgoing_webhook_logs(webhook_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owl_created
  ON outgoing_webhook_logs(created_at);

-- activity_logs — ~454 MB. Note the column is occurred_at, not created_at.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_company_occurred
  ON activity_logs(company_id, occurred_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_occurred
  ON activity_logs(occurred_at);

-- audit_logs — ~374 MB. Read by company, and by (model, model_id) for the
-- per-record history view.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs(company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_model
  ON audit_logs(model, model_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at);

-- webhook_requests — ~280 MB, 146k rows of real inbound lead traffic.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_requests_webhook_created
  ON webhook_requests(webhook_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_requests_created
  ON webhook_requests(created_at);

-- sheet_snapshots — the largest table in the source database (5,007 rows /
-- 27 GB uncompressed). getLatestSheetSnapshot() runs once per sheet per hour
-- and deleteOldSnapshots() deletes by created_at; both were seq scans.
-- These matter even when the table is restored empty, because the scheduler
-- starts refilling it immediately.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sheet_snapshots_sheet_created
  ON sheet_snapshots(sheet_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sheet_snapshots_created
  ON sheet_snapshots(created_at);

-- whatsapp_message_logs — read per company ordered by processed_at on every
-- inbound Saila message.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wml_company_processed
  ON whatsapp_message_logs(company_id, processed_at DESC);

-- backup_sync_logs — 68,218 rows and PK-only. Small today (16 MB) but unbounded:
-- 12 companies backing up hourly add ~288 rows a day. Read by backup_config_id
-- ordered by started_at. Note the timestamp column is started_at, not created_at.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bsl_config_started
  ON backup_sync_logs(backup_config_id, started_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bsl_started
  ON backup_sync_logs(started_at);

ANALYZE;
