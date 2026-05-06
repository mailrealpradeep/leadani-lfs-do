// Saila Intake — direct DB CRUD layer (does not extend IStorage to avoid touching MemStorage).
// All queries are scoped by company_id where applicable.

import { db } from "./db";
import * as dbSchema from "@shared/schema";
import type {
  SailaIntakeFlow,
  SailaIntakeTrigger,
  SailaIntakeQuestion,
  SailaIntakeSession,
  InsertSailaIntakeFlow,
  InsertSailaIntakeTrigger,
  InsertSailaIntakeQuestion,
  InsertSailaIntakeSession,
} from "@shared/schema";
import { and, eq, desc, asc, isNull, or, lte, gte, sql, inArray } from "drizzle-orm";

// ── Flows ────────────────────────────────────────────────────────────────────

export async function listIntakeFlows(companyId: string): Promise<SailaIntakeFlow[]> {
  return db.select().from(dbSchema.saila_intake_flows)
    .where(eq(dbSchema.saila_intake_flows.company_id, companyId))
    .orderBy(desc(dbSchema.saila_intake_flows.priority), asc(dbSchema.saila_intake_flows.name));
}

export async function getIntakeFlow(id: string): Promise<SailaIntakeFlow | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_flows)
    .where(eq(dbSchema.saila_intake_flows.id, id)).limit(1);
  return r[0];
}

export async function createIntakeFlow(data: InsertSailaIntakeFlow): Promise<SailaIntakeFlow> {
  const r = await db.insert(dbSchema.saila_intake_flows).values(data).returning();
  return r[0];
}

export async function updateIntakeFlow(id: string, data: Partial<InsertSailaIntakeFlow>): Promise<SailaIntakeFlow | undefined> {
  const r = await db.update(dbSchema.saila_intake_flows)
    .set({ ...data, updated_at: new Date() })
    .where(eq(dbSchema.saila_intake_flows.id, id))
    .returning();
  return r[0];
}

export async function deleteIntakeFlow(id: string): Promise<void> {
  await db.delete(dbSchema.saila_intake_flows).where(eq(dbSchema.saila_intake_flows.id, id));
}

// ── Triggers ─────────────────────────────────────────────────────────────────

export async function listIntakeTriggers(flowId: string): Promise<SailaIntakeTrigger[]> {
  return db.select().from(dbSchema.saila_intake_triggers)
    .where(eq(dbSchema.saila_intake_triggers.flow_id, flowId))
    .orderBy(asc(dbSchema.saila_intake_triggers.keyword));
}

export async function listAllIntakeTriggersForCompany(companyId: string): Promise<(SailaIntakeTrigger & { flow: SailaIntakeFlow })[]> {
  // Ordered by flow priority desc, then keyword length desc (longer/more specific first)
  const rows = await db.select({
    trigger: dbSchema.saila_intake_triggers,
    flow: dbSchema.saila_intake_flows,
  })
    .from(dbSchema.saila_intake_triggers)
    .innerJoin(dbSchema.saila_intake_flows, eq(dbSchema.saila_intake_triggers.flow_id, dbSchema.saila_intake_flows.id))
    .where(and(
      eq(dbSchema.saila_intake_flows.company_id, companyId),
      eq(dbSchema.saila_intake_flows.enabled, true),
    ))
    .orderBy(desc(dbSchema.saila_intake_flows.priority));
  const merged = rows.map(r => ({ ...r.trigger, flow: r.flow }));
  // Secondary sort: longer keywords first within same priority
  merged.sort((a, b) => {
    if (a.flow.priority !== b.flow.priority) return b.flow.priority - a.flow.priority;
    return b.keyword.length - a.keyword.length;
  });
  return merged;
}

export async function getIntakeTrigger(id: string): Promise<SailaIntakeTrigger | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_triggers)
    .where(eq(dbSchema.saila_intake_triggers.id, id)).limit(1);
  return r[0];
}

export async function createIntakeTrigger(data: InsertSailaIntakeTrigger): Promise<SailaIntakeTrigger> {
  const r = await db.insert(dbSchema.saila_intake_triggers).values(data).returning();
  return r[0];
}

export async function deleteIntakeTrigger(id: string): Promise<void> {
  await db.delete(dbSchema.saila_intake_triggers).where(eq(dbSchema.saila_intake_triggers.id, id));
}

// ── Questions ────────────────────────────────────────────────────────────────

export async function listIntakeQuestions(flowId: string): Promise<SailaIntakeQuestion[]> {
  return db.select().from(dbSchema.saila_intake_questions)
    .where(eq(dbSchema.saila_intake_questions.flow_id, flowId))
    .orderBy(asc(dbSchema.saila_intake_questions.order_index));
}

export async function getIntakeQuestion(id: string): Promise<SailaIntakeQuestion | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_questions)
    .where(eq(dbSchema.saila_intake_questions.id, id)).limit(1);
  return r[0];
}

export async function createIntakeQuestion(data: InsertSailaIntakeQuestion): Promise<SailaIntakeQuestion> {
  const r = await db.insert(dbSchema.saila_intake_questions).values(data).returning();
  return r[0];
}

export async function updateIntakeQuestion(id: string, data: Partial<InsertSailaIntakeQuestion>): Promise<SailaIntakeQuestion | undefined> {
  const r = await db.update(dbSchema.saila_intake_questions)
    .set({ ...data, updated_at: new Date() })
    .where(eq(dbSchema.saila_intake_questions.id, id))
    .returning();
  return r[0];
}

export async function deleteIntakeQuestion(id: string): Promise<void> {
  await db.delete(dbSchema.saila_intake_questions).where(eq(dbSchema.saila_intake_questions.id, id));
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function getActiveSessionForLead(leadId: string): Promise<SailaIntakeSession | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_sessions)
    .where(and(
      eq(dbSchema.saila_intake_sessions.lead_id, leadId),
      inArray(dbSchema.saila_intake_sessions.status, ['active', 'paused']),
    ))
    .orderBy(desc(dbSchema.saila_intake_sessions.last_activity_at))
    .limit(1);
  return r[0];
}

export async function getLatestSessionForLead(leadId: string): Promise<SailaIntakeSession | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_sessions)
    .where(eq(dbSchema.saila_intake_sessions.lead_id, leadId))
    .orderBy(desc(dbSchema.saila_intake_sessions.last_activity_at))
    .limit(1);
  return r[0];
}

export async function createIntakeSession(data: InsertSailaIntakeSession): Promise<SailaIntakeSession> {
  const r = await db.insert(dbSchema.saila_intake_sessions).values(data).returning();
  return r[0];
}

export async function updateIntakeSession(id: string, data: Partial<InsertSailaIntakeSession>): Promise<SailaIntakeSession | undefined> {
  const r = await db.update(dbSchema.saila_intake_sessions)
    .set({ ...data, updated_at: new Date() })
    .where(eq(dbSchema.saila_intake_sessions.id, id))
    .returning();
  return r[0];
}

export async function pauseActiveSessionsForLead(leadId: string, untilDate: Date): Promise<number> {
  const r = await db.update(dbSchema.saila_intake_sessions)
    .set({ status: 'paused', paused_at: new Date(), paused_until: untilDate, updated_at: new Date() })
    .where(and(
      eq(dbSchema.saila_intake_sessions.lead_id, leadId),
      eq(dbSchema.saila_intake_sessions.status, 'active'),
    ))
    .returning({ id: dbSchema.saila_intake_sessions.id });
  return r.length;
}

// Active sessions only (the tick decides per-row whether timeout elapsed).
// Paused/completed/abandoned sessions never tick.
export async function getActiveSessionsDueForTick(_now: Date): Promise<SailaIntakeSession[]> {
  return db.select().from(dbSchema.saila_intake_sessions)
    .where(eq(dbSchema.saila_intake_sessions.status, 'active'));
}

export async function listSessionsForCompany(companyId: string, opts: { limit?: number; status?: string } = {}): Promise<SailaIntakeSession[]> {
  const conds = [eq(dbSchema.saila_intake_sessions.company_id, companyId)];
  if (opts.status) conds.push(eq(dbSchema.saila_intake_sessions.status, opts.status));
  return db.select().from(dbSchema.saila_intake_sessions)
    .where(and(...conds))
    .orderBy(desc(dbSchema.saila_intake_sessions.last_activity_at))
    .limit(opts.limit || 100);
}

export async function getSession(id: string): Promise<SailaIntakeSession | undefined> {
  const r = await db.select().from(dbSchema.saila_intake_sessions)
    .where(eq(dbSchema.saila_intake_sessions.id, id)).limit(1);
  return r[0];
}
