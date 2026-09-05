// Retention for the append-only log tables.
//
// Five tables grow without limit and nothing ever deletes from them. Measured
// against the production dump (2.7 GB total, sheet_snapshots excluded):
//
//   outgoing_webhook_logs   1094 MB
//   activity_logs            454 MB
//   audit_logs               374 MB
//   webhook_requests         280 MB
//   backup_sync_logs          16 MB   (68,218 rows, +288/day)
//
// The first four are ~2.1 GB of 2.7 GB — the logs are the database. On Replit this only
// cost money slowly. On DigitalOcean Managed Postgres disk is fixed by the plan
// and a full disk is an outage, so the growth has to be bounded.
//
// Each table is pruned by its own timestamp column, oldest first, in bounded
// batches. A single unbounded `DELETE ... WHERE created_at < cutoff` on a 1 GB
// table holds row locks and bloats WAL for as long as it runs; a batched loop
// commits every BATCH_SIZE rows so autovacuum can keep up and nothing else
// waits on it.
//
// Set LOG_RETENTION_DAYS=0 to disable pruning entirely.

import { pool } from "./db";
import { LOG_RETENTION_DAYS } from "./config";
import { managedInterval, managedTimeout, isShuttingDown } from "./shutdown";

const BATCH_SIZE = 5_000;
// Ceiling per table per run, so one nightly pass can never turn into an
// hours-long delete storm on first enable. Whatever is left over is picked up
// by the next run.
const MAX_BATCHES_PER_RUN = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

interface LogTable {
  table: string;
  timestampColumn: string;
}

// Timestamp column per table — these differ, and using the wrong one silently
// prunes nothing (or everything), so they are listed explicitly rather than
// assumed to be created_at.
const LOG_TABLES: LogTable[] = [
  { table: "outgoing_webhook_logs", timestampColumn: "created_at" },
  { table: "activity_logs", timestampColumn: "occurred_at" },
  { table: "audit_logs", timestampColumn: "created_at" },
  { table: "webhook_requests", timestampColumn: "created_at" },
  // Not in the "largest tables" list — 16 MB — but unbounded and PK-only, and
  // it gains ~288 rows a day from 12 companies backing up hourly. Its timestamp
  // column is started_at; there is no created_at.
  { table: "backup_sync_logs", timestampColumn: "started_at" },
];

/**
 * Delete rows older than `days` from one table, in batches.
 *
 * Deletes by ctid drawn from a LIMITed subquery: the planner can satisfy that
 * from the timestamp index without sorting the whole table, and each statement
 * is its own transaction.
 */
async function pruneTable(
  { table, timestampColumn }: LogTable,
  days: number,
): Promise<number> {
  let deleted = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
    // Stop promptly on SIGTERM — a redeploy should not wait out the loop.
    if (isShuttingDown()) break;

    const result = await pool.query(
      `DELETE FROM ${table}
        WHERE ctid IN (
          SELECT ctid FROM ${table}
           WHERE ${timestampColumn} < NOW() - $1::interval
           LIMIT ${BATCH_SIZE}
        )`,
      [`${days} days`],
    );

    const rows = result.rowCount ?? 0;
    deleted += rows;
    if (rows < BATCH_SIZE) break;
  }

  return deleted;
}

export async function runLogRetention(): Promise<void> {
  const days = LOG_RETENTION_DAYS;
  if (!Number.isFinite(days) || days <= 0) {
    console.log("[LogRetention] LOG_RETENTION_DAYS <= 0 — pruning disabled");
    return;
  }

  console.log(`[LogRetention] Pruning log rows older than ${days} days`);

  for (const logTable of LOG_TABLES) {
    if (isShuttingDown()) return;
    try {
      const deleted = await pruneTable(logTable, days);
      if (deleted > 0) {
        console.log(`[LogRetention] ${logTable.table}: deleted ${deleted} row(s)`);
      }
    } catch (error: any) {
      // One unprunable table must not stop the others.
      console.error(
        `[LogRetention] ${logTable.table}: ${error?.message || error}`,
      );
    }
  }

  console.log("[LogRetention] Pass complete");
}

let started = false;

export function startLogRetentionScheduler(): void {
  if (started) return;
  started = true;

  if (LOG_RETENTION_DAYS <= 0) {
    console.log("[LogRetention] Disabled (LOG_RETENTION_DAYS=0)");
    return;
  }

  // Deliberately delayed rather than run at boot. The first pass after a
  // migration has months of backlog to clear and would otherwise compete with
  // the boot seeders and the first users hitting a cold cache.
  managedTimeout(() => {
    void runLogRetention();
  }, 15 * 60 * 1000);

  managedInterval(() => {
    void runLogRetention();
  }, DAY_MS);

  console.log(
    `[LogRetention] Scheduler initialized — retention ${LOG_RETENTION_DAYS} days, first pass in 15 minutes, then daily`,
  );
}

export function stopLogRetentionScheduler(): void {
  // The timers are managed, so clearManagedTimers() in the shutdown drain
  // already stops them. This exists so the scheduler can be restarted in tests
  // and to keep the start/stop pair symmetric with the other schedulers.
  started = false;
}
