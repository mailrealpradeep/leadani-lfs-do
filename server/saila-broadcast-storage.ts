// Saila Broadcast — direct DB CRUD layer (mirrors saila-intake-storage.ts pattern;
// not bolted onto IStorage so MemStorage stubs don't multiply).

import { db } from "./db";
import * as dbSchema from "@shared/schema";
import type {
  SailaBroadcast,
  InsertSailaBroadcast,
  WhatsAppMessageLogRecord,
} from "@shared/schema";
import { and, eq, desc, sql, inArray, gte, isNotNull } from "drizzle-orm";

export interface BroadcastRecipient {
  lead_id: string | null;
  recipient_phone: string;       // last-10 digits
  display_name: string;          // for sample preview
  last_incoming_at: Date;
}

export interface ResolvedRecipients {
  recipients: BroadcastRecipient[];
  suppressedCount: number;
  sessionOpenCount: number;
}

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve the recipient list for a broadcast.
 *
 * Step 1: pick every distinct sender_phone whose latest INCOMING row to
 * `sendFromPhone` (for this company) is within the last 24h — that's the
 * session-open base set.
 *
 * Step 2 (optional): when `cooldownHours` is non-null, exclude any sender
 * who has a broadcast-originated outgoing log
 * (`broadcast_id IS NOT NULL` AND `outcome='sent'`) from this company
 * within the last `cooldownHours`. Per-lead human sends never count toward
 * cooldown because their `broadcast_id` is NULL.
 *
 * The resolver pivots on `sender_phone` (last-10) so it works even when a
 * contact has no associated lead row yet — the broadcast will still target
 * them.
 */
export async function resolveBroadcastRecipients(
  companyId: string,
  sendFromPhone: string,
  cooldownHours: number | null,
  now: Date = new Date(),
): Promise<ResolvedRecipients> {
  const cutoff = new Date(now.getTime() - SESSION_WINDOW_MS);

  // Latest incoming per sender_phone for the chosen business number, in window.
  const incomingRows = await db
    .select({
      sender_phone: dbSchema.whatsapp_message_logs.sender_phone,
      sender_name: dbSchema.whatsapp_message_logs.sender_name,
      lead_id: dbSchema.whatsapp_message_logs.lead_id,
      processed_at: sql<Date>`MAX(${dbSchema.whatsapp_message_logs.processed_at})`,
    })
    .from(dbSchema.whatsapp_message_logs)
    .where(and(
      eq(dbSchema.whatsapp_message_logs.company_id, companyId),
      eq(dbSchema.whatsapp_message_logs.direction, 'incoming'),
      eq(dbSchema.whatsapp_message_logs.display_phone_number, sendFromPhone),
      gte(dbSchema.whatsapp_message_logs.processed_at, cutoff),
    ))
    .groupBy(
      dbSchema.whatsapp_message_logs.sender_phone,
      dbSchema.whatsapp_message_logs.sender_name,
      dbSchema.whatsapp_message_logs.lead_id,
    );

  // Dedupe by last-10 digits (one row per contact even if multiple lead links exist)
  const byPhone = new Map<string, BroadcastRecipient>();
  for (const r of incomingRows) {
    const last10 = String(r.sender_phone || "").replace(/\D/g, "").slice(-10);
    if (last10.length !== 10) continue;
    const ts = new Date(r.processed_at as any);
    const existing = byPhone.get(last10);
    if (!existing || ts > existing.last_incoming_at) {
      byPhone.set(last10, {
        lead_id: r.lead_id ?? existing?.lead_id ?? null,
        recipient_phone: last10,
        display_name: String(r.sender_name || existing?.display_name || last10),
        last_incoming_at: ts,
      });
    }
  }

  const sessionOpen = Array.from(byPhone.values());
  const sessionOpenCount = sessionOpen.length;

  if (!cooldownHours || sessionOpen.length === 0) {
    return { recipients: sessionOpen, suppressedCount: 0, sessionOpenCount };
  }

  // Cooldown filter: sender_phone last-10 with a broadcast outgoing 'sent' row
  // in the last cooldownHours.
  const cooldownCutoff = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);
  const recipientsLast10 = sessionOpen.map((r) => r.recipient_phone);

  const suppressedRows = await db
    .selectDistinct({
      sender_phone_last10: sql<string>`RIGHT(REGEXP_REPLACE(${dbSchema.whatsapp_message_logs.sender_phone}, '[^0-9]', '', 'g'), 10)`,
    })
    .from(dbSchema.whatsapp_message_logs)
    .where(and(
      eq(dbSchema.whatsapp_message_logs.company_id, companyId),
      eq(dbSchema.whatsapp_message_logs.direction, 'outgoing'),
      eq(dbSchema.whatsapp_message_logs.outcome, 'sent'),
      isNotNull(dbSchema.whatsapp_message_logs.broadcast_id),
      gte(dbSchema.whatsapp_message_logs.processed_at, cooldownCutoff),
      sql`RIGHT(REGEXP_REPLACE(${dbSchema.whatsapp_message_logs.sender_phone}, '[^0-9]', '', 'g'), 10) IN (${sql.join(recipientsLast10.map((p) => sql`${p}`), sql`, `)})`,
    ));

  const suppressedSet = new Set(suppressedRows.map((r) => r.sender_phone_last10));
  const recipients = sessionOpen.filter((r) => !suppressedSet.has(r.recipient_phone));
  return {
    recipients,
    suppressedCount: sessionOpenCount - recipients.length,
    sessionOpenCount,
  };
}

// Pure helper exported for unit tests — same dedupe + cooldown math without DB.
export interface RawIncomingRow {
  sender_phone: string;
  sender_name: string | null;
  lead_id: string | null;
  processed_at: Date;
}
export interface RawOutgoingBroadcastRow {
  sender_phone: string; // sender_phone column on outgoing rows = recipient digits in our convention
  processed_at: Date;
}

export function resolveRecipientsPure(opts: {
  incoming: RawIncomingRow[];                 // already pre-filtered to chosen number + 24h window
  outgoingBroadcasts: RawOutgoingBroadcastRow[]; // already pre-filtered to outcome='sent' + broadcast_id NOT NULL
  cooldownHours: number | null;
  now: Date;
}): ResolvedRecipients {
  const { incoming, outgoingBroadcasts, cooldownHours, now } = opts;
  const cutoff = new Date(now.getTime() - SESSION_WINDOW_MS);

  const byPhone = new Map<string, BroadcastRecipient>();
  for (const r of incoming) {
    if (r.processed_at < cutoff) continue;
    const last10 = String(r.sender_phone || "").replace(/\D/g, "").slice(-10);
    if (last10.length !== 10) continue;
    const existing = byPhone.get(last10);
    if (!existing || r.processed_at > existing.last_incoming_at) {
      byPhone.set(last10, {
        lead_id: r.lead_id ?? existing?.lead_id ?? null,
        recipient_phone: last10,
        display_name: String(r.sender_name || existing?.display_name || last10),
        last_incoming_at: r.processed_at,
      });
    }
  }
  const sessionOpen = Array.from(byPhone.values());
  const sessionOpenCount = sessionOpen.length;
  if (!cooldownHours) {
    return { recipients: sessionOpen, suppressedCount: 0, sessionOpenCount };
  }
  const cooldownCutoff = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);
  const suppressedSet = new Set<string>();
  for (const o of outgoingBroadcasts) {
    if (o.processed_at < cooldownCutoff) continue;
    const last10 = String(o.sender_phone || "").replace(/\D/g, "").slice(-10);
    if (last10.length === 10) suppressedSet.add(last10);
  }
  const recipients = sessionOpen.filter((r) => !suppressedSet.has(r.recipient_phone));
  return { recipients, suppressedCount: sessionOpenCount - recipients.length, sessionOpenCount };
}

// Throttle pacing math — exposed for tests. Returns ms to wait before sending message #i
// given a target rate of `ratePerSec` messages/second since `startedAt`.
export function throttleDelayMs(opts: {
  index: number;        // 0-based
  ratePerSec: number;
  startedAt: number;    // ms
  now: number;          // ms
}): number {
  const { index, ratePerSec, startedAt, now } = opts;
  if (ratePerSec <= 0) return 0;
  const expectedAt = startedAt + (index * 1000) / ratePerSec;
  return Math.max(0, expectedAt - now);
}

// ── Broadcast CRUD ─────────────────────────────────────────────────────────────

export async function createBroadcast(data: InsertSailaBroadcast & {
  total_recipients: number;
  suppressed_count: number;
}): Promise<SailaBroadcast> {
  const r = await db.insert(dbSchema.saila_broadcasts).values({
    ...data,
    status: 'pending',
  }).returning();
  return r[0];
}

export async function getBroadcast(id: string): Promise<SailaBroadcast | undefined> {
  const r = await db.select().from(dbSchema.saila_broadcasts)
    .where(eq(dbSchema.saila_broadcasts.id, id)).limit(1);
  return r[0];
}

export async function listBroadcasts(companyId: string, limit = 20): Promise<SailaBroadcast[]> {
  return db.select().from(dbSchema.saila_broadcasts)
    .where(eq(dbSchema.saila_broadcasts.company_id, companyId))
    .orderBy(desc(dbSchema.saila_broadcasts.created_at))
    .limit(limit);
}

export async function updateBroadcast(
  id: string,
  data: Partial<typeof dbSchema.saila_broadcasts.$inferInsert>,
): Promise<SailaBroadcast | undefined> {
  const r = await db.update(dbSchema.saila_broadcasts)
    .set(data)
    .where(eq(dbSchema.saila_broadcasts.id, id))
    .returning();
  return r[0];
}

/**
 * Atomic compare-and-set: transition pending -> running. Returns the row only
 * if THIS call won the transition. Concurrent runners (possible across Node
 * processes or via duplicate route hits) will get undefined and bail. This is
 * the only race-safe gate against double-sending the same broadcast.
 */
export async function claimBroadcastForRun(id: string): Promise<SailaBroadcast | undefined> {
  const r = await db.update(dbSchema.saila_broadcasts)
    .set({ status: 'running', started_at: new Date() })
    .where(and(
      eq(dbSchema.saila_broadcasts.id, id),
      eq(dbSchema.saila_broadcasts.status, 'pending'),
    ))
    .returning();
  return r[0];
}

export async function incrementBroadcastCounters(
  id: string,
  delta: { sent?: number; failed?: number },
): Promise<void> {
  const sent = delta.sent ?? 0;
  const failed = delta.failed ?? 0;
  if (!sent && !failed) return;
  await db.update(dbSchema.saila_broadcasts)
    .set({
      sent_count: sql`${dbSchema.saila_broadcasts.sent_count} + ${sent}`,
      failed_count: sql`${dbSchema.saila_broadcasts.failed_count} + ${failed}`,
    })
    .where(eq(dbSchema.saila_broadcasts.id, id));
}

// Crash recovery: any broadcast still 'running' with `started_at` older than
// `staleAfterMs` is marked failed. Called once at server boot.
export async function failStaleRunningBroadcasts(staleAfterMs = 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs);
  const r = await db.update(dbSchema.saila_broadcasts)
    .set({
      status: 'failed',
      error_message: 'Marked failed by crash recovery (still running after restart)',
      completed_at: new Date(),
    })
    .where(and(
      eq(dbSchema.saila_broadcasts.status, 'running'),
      sql`${dbSchema.saila_broadcasts.started_at} < ${cutoff}`,
    ))
    .returning({ id: dbSchema.saila_broadcasts.id });
  return r.length;
}
