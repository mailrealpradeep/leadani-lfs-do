import { pool } from "./db";
import {
  WHATSAPP_CALL_RESPONSE_LABELS,
  type WhatsAppCallResponse,
  type WhatsAppTemplateSendInfo,
} from "@shared/schema";

const TEMPLATE_TAG_RE = /\[Approved Template:\s*([^()\]]+?)\s*\(([^)]+)\)\]\s*(?:\[([^\]]*)\])?(?:\s*—\s*([\s\S]*))?/;
const PREFIX_RE = /^WA\s+(?:Sent|Send\s+Failed)\s*(?:\(([^)]*)\))?\s*:/i;

const LABEL_TO_KEY: Record<string, WhatsAppCallResponse> = Object.fromEntries(
  Object.entries(WHATSAPP_CALL_RESPONSE_LABELS).map(([k, v]) => [v.toLowerCase(), k as WhatsAppCallResponse]),
);

export interface BackfillStats {
  scanned: number;
  parsed: number;
  updated: number;
  skipped: number;
}

export function parseTemplateFromRemark(remark: string): WhatsAppTemplateSendInfo | null {
  if (!remark) return null;
  const m = TEMPLATE_TAG_RE.exec(remark);
  if (!m) return null;
  const [, name, language, varsStr, body] = m;
  const variables = varsStr
    ? varsStr.split("|").map((s) => s.trim()).filter((s) => s.length > 0)
    : [];
  const prefixMatch = PREFIX_RE.exec(remark);
  const callResponseLabel = prefixMatch?.[1]?.trim() || null;
  const callResponseKey = callResponseLabel
    ? LABEL_TO_KEY[callResponseLabel.toLowerCase()] ?? null
    : null;
  return {
    name: name.trim(),
    language: language.trim(),
    variables,
    body: body ? body.trim() : null,
    call_response: callResponseKey,
    call_response_label: callResponseLabel,
  };
}

export async function backfillWhatsAppTemplates(dryRun = false): Promise<BackfillStats> {
  const stats: BackfillStats = { scanned: 0, parsed: 0, updated: 0, skipped: 0 };

  const { rows } = await pool.query<{ id: string; remark: string }>(
    `SELECT id, remark
     FROM lead_updates
     WHERE update_via = 'whatsapp_outgoing'
       AND whatsapp_template IS NULL`,
  );

  stats.scanned = rows.length;
  console.log(`[WA Template Backfill] Found ${rows.length} candidate lead_updates`);

  for (const row of rows) {
    const parsed = parseTemplateFromRemark(row.remark || "");
    if (!parsed) {
      stats.skipped += 1;
      continue;
    }
    stats.parsed += 1;
    if (dryRun) continue;
    await pool.query(
      `UPDATE lead_updates SET whatsapp_template = $1::jsonb WHERE id = $2`,
      [JSON.stringify(parsed), row.id],
    );
    stats.updated += 1;
  }

  console.log(
    `[WA Template Backfill] Done. scanned=${stats.scanned} parsed=${stats.parsed} updated=${stats.updated} skipped=${stats.skipped}`,
  );
  return stats;
}

// CLI: npx tsx server/whatsapp-template-backfill.ts [--dry-run]
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const dryRun = process.argv.includes("--dry-run");
  backfillWhatsAppTemplates(dryRun)
    .then((stats) => {
      console.log("\n=== BACKFILL SUMMARY ===");
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}
