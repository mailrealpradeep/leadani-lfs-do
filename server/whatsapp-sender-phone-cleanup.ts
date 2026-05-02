import { pool } from "./db";

export interface SenderPhoneCleanupStats {
  scanned: number;
  updated: number;
  flaggedShortAfterSanitize: number;
  remainingLong: number;
}

const SELECT_LONG_ROWS_SQL = `
  SELECT id, sender_phone
  FROM whatsapp_message_logs
  WHERE LENGTH(sender_phone) > 10
`;

const UPDATE_SQL = `
  UPDATE whatsapp_message_logs
  SET sender_phone = RIGHT(REGEXP_REPLACE(sender_phone, '[^0-9]', '', 'g'), 10)
  WHERE LENGTH(sender_phone) > 10
`;

const VERIFY_SQL = `
  SELECT COUNT(*)::int AS count
  FROM whatsapp_message_logs
  WHERE LENGTH(sender_phone) > 10
`;

export async function cleanupWhatsAppSenderPhones(dryRun = false): Promise<SenderPhoneCleanupStats> {
  const stats: SenderPhoneCleanupStats = {
    scanned: 0,
    updated: 0,
    flaggedShortAfterSanitize: 0,
    remainingLong: 0,
  };

  const { rows } = await pool.query<{ id: string; sender_phone: string }>(SELECT_LONG_ROWS_SQL);
  stats.scanned = rows.length;
  console.log(`[WA Sender Phone Cleanup] Found ${rows.length} rows with sender_phone longer than 10 chars`);

  for (const row of rows) {
    const digits = row.sender_phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      stats.flaggedShortAfterSanitize += 1;
      console.warn(
        `[WA Sender Phone Cleanup] id=${row.id} would normalise to ${digits.length} digits ("${row.sender_phone}"); ` +
          `it will still be UPDATEd with whatever the right-most digits yield.`,
      );
    }
  }

  if (!dryRun) {
    const updateResult = await pool.query(UPDATE_SQL);
    stats.updated = updateResult.rowCount ?? 0;
  }

  const verify = await pool.query<{ count: number }>(VERIFY_SQL);
  stats.remainingLong = verify.rows[0]?.count ?? 0;

  console.log(
    `[WA Sender Phone Cleanup] Done. scanned=${stats.scanned} updated=${stats.updated} ` +
      `flaggedShortAfterSanitize=${stats.flaggedShortAfterSanitize} remainingLong=${stats.remainingLong}`,
  );
  return stats;
}

// CLI: npx tsx server/whatsapp-sender-phone-cleanup.ts [--dry-run]
//
// Production runbook (run after Publish, with DATABASE_URL pointing at prod):
//   1. npx tsx server/whatsapp-sender-phone-cleanup.ts --dry-run
//      Inspect "scanned" and any "flaggedShortAfterSanitize" warnings.
//   2. npx tsx server/whatsapp-sender-phone-cleanup.ts
//      Success condition: process exits 0 and the summary shows
//      "remainingLong": 0. A non-zero exit means rows with LENGTH > 10
//      still exist and require investigation.
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const dryRun = process.argv.includes("--dry-run");
  cleanupWhatsAppSenderPhones(dryRun)
    .then((stats) => {
      console.log("\n=== CLEANUP SUMMARY ===");
      console.log(JSON.stringify(stats, null, 2));
      process.exit(stats.remainingLong === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error("Cleanup failed:", err);
      process.exit(1);
    });
}
