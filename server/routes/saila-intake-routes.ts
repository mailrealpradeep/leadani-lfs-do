import type { Express } from "express";
import { authMiddleware, requireCompanyAdmin, type AuthRequest } from "../middleware/auth";
import * as intakeStore from "../saila-intake-storage";

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
      const companyId = req.companyId!;
      if (!req.body.name) return res.status(400).json({ error: "name is required" });
      const flow = await intakeStore.createIntakeFlow({ ...req.body, company_id: companyId });
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
      const { id, company_id, created_at, ...patch } = req.body;
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
      if (!req.body.keyword) return res.status(400).json({ error: "keyword is required" });
      const trigger = await intakeStore.createIntakeTrigger({
        flow_id: flow.id,
        keyword: req.body.keyword,
        match_mode: req.body.match_mode || 'contains',
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
      if (!req.body.primary_prompt || !req.body.target_field) {
        return res.status(400).json({ error: "primary_prompt and target_field are required" });
      }
      const existing = await intakeStore.listIntakeQuestions(flow.id);
      const q = await intakeStore.createIntakeQuestion({
        flow_id: flow.id,
        order_index: req.body.order_index ?? existing.length,
        primary_prompt: req.body.primary_prompt,
        target_field: req.body.target_field,
        silence_timeout_seconds: req.body.silence_timeout_seconds ?? 86400,
        max_fallback_attempts: req.body.max_fallback_attempts ?? null,
        question_type: req.body.question_type || 'free_text',
        next_question_config: req.body.next_question_config ?? null,
        llm_relevance_check_enabled: req.body.llm_relevance_check_enabled ?? false,
        relevance_topic_hint: req.body.relevance_topic_hint ?? null,
        on_off_topic_action: req.body.on_off_topic_action || 'reask',
      });
      res.json(q);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/saila/intake/questions/:id", authMiddleware, requireCompanyAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await intakeStore.getIntakeQuestion(req.params.id);
      if (!existing) return res.status(404).json({ error: "Question not found" });
      const flow = await intakeStore.getIntakeFlow(existing.flow_id);
      if (!flow || flow.company_id !== req.companyId) return res.status(404).json({ error: "Flow not found" });
      const { id, flow_id, created_at, ...patch } = req.body;
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
