import type { Express } from "express";
import { z } from "zod";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import * as intakeStore from "../saila-intake-storage";

// ── Zod contracts (admin write paths) ─────────────────────────────────────────
// Hardens admin POST/PUT bodies so malformed config cannot reach storage.
// Field names mirror saila_intake_flows columns exactly.
const flowCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  applied_business_numbers: z.array(z.string().min(1)).optional(),
  cancel_keywords: z.array(z.string().min(1)).optional(),
  completion_message: z.string().max(2000).optional().nullable(),
  fallback_prompt_template: z.string().max(2000).optional(),
  max_fallback_attempts: z.number().int().min(0).max(10).optional(),
});
const flowUpdateSchema = flowCreateSchema.partial();
const triggerCreateSchema = z.object({
  keyword: z.string().trim().min(1).max(120),
  match_mode: z.enum(["contains", "exact"]).optional(),
});
const QUESTION_TYPE_V1 = z.literal("free_text");
const questionCreateSchema = z.object({
  primary_prompt: z.string().trim().min(1).max(2000),
  target_field: z.string().trim().min(1).max(200),
  silence_timeout_seconds: z.number().int().positive().max(7 * 24 * 60 * 60).optional(),
  max_fallback_attempts: z.number().int().min(0).max(10).nullable().optional(),
  question_type: QUESTION_TYPE_V1.optional(),
  next_question_config: z.any().optional().nullable(),
  llm_relevance_check_enabled: z.boolean().optional(),
  relevance_topic_hint: z.string().max(500).optional().nullable(),
  on_off_topic_action: z.enum(["reask", "end_immediately"]).optional(),
  order_index: z.number().int().min(0).optional(),
});
const questionUpdateSchema = questionCreateSchema.partial().extend({
  question_type: QUESTION_TYPE_V1.optional(),
});

function parseOr400<T>(schema: z.ZodType<T>, body: unknown, res: any): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

export function registerSailaIntakeRoutes(app: Express): void {
  // ── Flows ────────────────────────────────────────────────────────────────
  app.get("/api/saila/intake/flows", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const flows = await intakeStore.listIntakeFlows(companyId);
      // Hydrate each flow with question count + trigger count
      const result = await Promise.all(flows.map(async (f) => {
        const [questions, triggers] = await Promise.all([
          intakeStore.listIntakeQuestions(f.id),
          intakeStore.listIntakeTriggers(f.id),
        ]);
        return { ...f, question_count: questions.length, trigger_count: triggers.length };
      }));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/saila/intake/flows", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const data = parseOr400(flowCreateSchema, req.body, res);
      if (!data) return;
      const companyId = req.companyId!;
      const flow = await intakeStore.createIntakeFlow({ ...data, company_id: companyId });
      res.json(flow);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/saila/intake/flows/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const flow = await intakeStore.getIntakeFlow(req.params.id);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const [questions, triggers] = await Promise.all([
        intakeStore.listIntakeQuestions(flow.id),
        intakeStore.listIntakeTriggers(flow.id),
      ]);
      res.json({ ...flow, questions, triggers });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/saila/intake/flows/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await intakeStore.getIntakeFlow(req.params.id);
      if (!existing || existing.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const { id, company_id, created_at, ...rawPatch } = req.body;
      const patch = parseOr400(flowUpdateSchema, rawPatch, res);
      if (!patch) return;
      const flow = await intakeStore.updateIntakeFlow(req.params.id, patch);
      res.json(flow);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/saila/intake/flows/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await intakeStore.getIntakeFlow(req.params.id);
      if (!existing || existing.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      await intakeStore.deleteIntakeFlow(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Triggers (keywords) ─────────────────────────────────────────────────
  app.post("/api/saila/intake/flows/:flowId/triggers", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const flow = await intakeStore.getIntakeFlow(req.params.flowId);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const data = parseOr400(triggerCreateSchema, req.body, res);
      if (!data) return;
      const trigger = await intakeStore.createIntakeTrigger({
        flow_id: flow.id,
        keyword: data.keyword,
        match_mode: data.match_mode || 'contains',
      });
      res.json(trigger);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/saila/intake/triggers/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      // Tenant scoping: look up the trigger's flow first and confirm company ownership.
      const trig = await intakeStore.getIntakeTrigger(req.params.id);
      if (!trig) return res.json({ success: true });
      const flow = await intakeStore.getIntakeFlow(trig.flow_id);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Trigger not found" });
      await intakeStore.deleteIntakeTrigger(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Questions ───────────────────────────────────────────────────────────
  app.post("/api/saila/intake/flows/:flowId/questions", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const flow = await intakeStore.getIntakeFlow(req.params.flowId);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const data = parseOr400(questionCreateSchema, req.body, res);
      if (!data) return;
      const existing = await intakeStore.listIntakeQuestions(flow.id);
      const q = await intakeStore.createIntakeQuestion({
        flow_id: flow.id,
        order_index: data.order_index ?? existing.length,
        primary_prompt: data.primary_prompt,
        target_field: data.target_field,
        silence_timeout_seconds: data.silence_timeout_seconds ?? 86400,
        max_fallback_attempts: data.max_fallback_attempts ?? null,
        question_type: 'free_text',
        next_question_config: data.next_question_config ?? null,
        llm_relevance_check_enabled: data.llm_relevance_check_enabled ?? false,
        relevance_topic_hint: data.relevance_topic_hint ?? null,
        on_off_topic_action: data.on_off_topic_action || 'reask',
      });
      res.json(q);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/saila/intake/flows/:flowId/questions/reorder", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const flow = await intakeStore.getIntakeFlow(req.params.flowId);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const parsed = z.object({ ordered_ids: z.array(z.string().uuid()).min(1) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request body", issues: parsed.error.flatten() });
      await intakeStore.reorderIntakeQuestions(flow.id, parsed.data.ordered_ids);
      const questions = await intakeStore.listIntakeQuestions(flow.id);
      res.json({ success: true, questions });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/saila/intake/questions/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await intakeStore.getIntakeQuestion(req.params.id);
      if (!existing) return res.status(404).json({ error: "Question not found" });
      const flow = await intakeStore.getIntakeFlow(existing.flow_id);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const { id, flow_id, created_at, ...rawPatch } = req.body;
      const patch = parseOr400(questionUpdateSchema, rawPatch, res);
      if (!patch) return;
      const q = await intakeStore.updateIntakeQuestion(req.params.id, patch);
      res.json(q);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/saila/intake/questions/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await intakeStore.getIntakeQuestion(req.params.id);
      if (!existing) return res.json({ success: true });
      const flow = await intakeStore.getIntakeFlow(existing.flow_id);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      await intakeStore.deleteIntakeQuestion(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Sessions ────────────────────────────────────────────────────────────
  // Manual cancel — admin can abort any active/paused session for a lead.
  app.post("/api/saila/intake/sessions/:id/cancel", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const session = await intakeStore.getSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.company_id !== req.companyId) return res.status(404).json({ error: "Session not found" });
      if (session.status !== 'active' && session.status !== 'paused') {
        return res.status(400).json({ error: `Cannot cancel session in status '${session.status}'` });
      }
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/saila/intake/sessions", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const status = req.query.status as string | undefined;
      const sessions = await intakeStore.listSessionsForCompany(companyId, { status, limit: 200 });
      res.json(sessions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk per-company badge map: { [leadId]: { depth, total, status, flow_name } }
  // Powers the spreadsheet grid's per-row Intake badge in one round-trip.
  app.get("/api/saila/intake/lead-badges", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const companyId = req.companyId!;
      const sessions = await intakeStore.listLatestSessionsByCompany(companyId);
      if (sessions.length === 0) return res.json({});
      const flowIds = Array.from(new Set(sessions.map(s => s.flow_id)));
      const flows = await Promise.all(flowIds.map(id => intakeStore.getIntakeFlow(id)));
      const flowMap: Record<string, { name: string }> = {};
      for (const f of flows) if (f) flowMap[f.id] = { name: f.name };
      const counts = await intakeStore.getQuestionCountsByFlowIds(flowIds);
      const out: Record<string, { depth: number; total: number; status: string; flow_name: string | null }> = {};
      for (const s of sessions) {
        out[s.lead_id] = {
          depth: s.depth_reached || 0,
          total: counts[s.flow_id] || 0,
          status: s.status,
          flow_name: flowMap[s.flow_id]?.name || null,
        };
      }
      res.json(out);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Per-lead session lookup (used by lead-row badge)
  app.get("/api/saila/intake/lead/:leadId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const session = await intakeStore.getLatestSessionForLead(req.params.leadId);
      if (!session || session.company_id !== req.companyId) return res.json(null);
      const flow = await intakeStore.getIntakeFlow(session.flow_id);
      const questions = flow ? await intakeStore.listIntakeQuestions(flow.id) : [];
      res.json({
        session,
        flow_name: flow?.name || null,
        total_questions: questions.length,
        intake_depth: session.depth_reached,
        intake_status: session.status,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
