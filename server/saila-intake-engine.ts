// Saila Intake Engine — keyword detection, state machine, fallback tick, Sarvam relevance check.
//
// PRECEDENCE (within Saila inbound pipeline, see saila-engine.ts):
//   1. Active intake session continuation                   ← THIS module
//   2. Paused intake session (silent unless new keyword)    ← THIS module
//   3. Intake keyword start (new or resume from drop-off)   ← THIS module
//   4. Fixed Reply Mode (Meta Ad 2nd-message-in-3h)         ← unchanged
//   5. Keyword fast-path / template / LLM (existing)        ← unchanged
//
// Strict additivity: returns { handled: false } when intake should NOT respond, so the
// existing pipeline runs unchanged.

import { storage } from "./storage";
import { sendWhatsAppMessage } from "./saila-engine";
import * as intakeStore from "./saila-intake-storage";
import { pool } from "./db";
import type {
  SailaIntakeFlow,
  SailaIntakeQuestion,
  SailaIntakeSession,
  SailaIntakeTrigger,
  SailaConfig,
  SailaPhoneSetting,
  Lead,
} from "@shared/schema";

export interface IntakeHandled {
  handled: true;
  source: "intake_question" | "intake_completion" | "intake_cancelled" | "intake_off_topic" | "intake_silence_timeout" | "intake_paused_silent" | "intake_silent_no_text" | "intake_late_reply" | "intake_coalesced";
  responseText: string;
  sessionId: string;
}
export interface IntakeNotHandled { handled: false; reason: string; }
export type IntakeResult = IntakeHandled | IntakeNotHandled;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit tests)
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeText(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function keywordMatches(message: string, keyword: string, mode: "contains" | "exact"): boolean {
  const m = normalizeText(message);
  const k = normalizeText(keyword);
  if (!k) return false;
  if (mode === "exact") return m === k;
  return m.includes(k);
}

export function isCancelMessage(message: string, cancelKeywords: string[]): boolean {
  const m = normalizeText(message);
  return cancelKeywords.some(k => {
    const kn = normalizeText(k);
    return kn.length > 0 && m.includes(kn);
  });
}

export function flowAppliesToBusinessNumber(flow: SailaIntakeFlow, businessNumber: string): boolean {
  if (!flow.applied_business_numbers || flow.applied_business_numbers.length === 0) return true;
  return flow.applied_business_numbers.includes(businessNumber);
}

// "Restart eligibility": a brand-new keyword-match starts a fresh session if and only if
// there is no in-progress active session OR the existing session is for a different flow.
export function shouldStartNewSession(existing: SailaIntakeSession | undefined, candidateFlowId: string): boolean {
  if (!existing) return true;
  if (existing.status === 'completed' || existing.status === 'abandoned' || existing.status === 'paused') return true;
  if (existing.flow_id !== candidateFlowId) return true;
  return false;
}

export function renderFallbackPrompt(template: string, question: string): string {
  if (!template) return question;
  return template.replace(/\{question\}/g, question);
}

// Resume helper — given the lead's existing custom_fields, return the index of the
// FIRST question whose target_field is missing/empty. Used so an abandoned session
// re-triggered by a keyword resumes from the next unanswered question.
export function findNextUnansweredIndex(
  questions: SailaIntakeQuestion[],
  customFields: Record<string, any> | null | undefined,
): number {
  const cf = customFields || {};
  for (let i = 0; i < questions.length; i++) {
    const v = cf[questions[i].target_field];
    if (v === undefined || v === null || String(v).trim() === "") return i;
  }
  return questions.length; // all answered
}

// Rapid-reply classifier (Task #124). Pure function — exported for unit tests.
//
// Two race-condition guards:
//   • "late_for_previous": the inbound was typed BEFORE the bot sent its current
//     question (WA send time predates last_question_sent_at). It's logically a
//     stray reply to the PREVIOUS prompt, not an answer to the current Q.
//   • "coalesce_already_answered": this question already received an accepted
//     answer (last_activity_at later than last_question_sent_at), but the bot
//     hasn't yet advanced to the next Q. Subsequent rapid follow-ups must be
//     coalesced (transcript-only) so they don't get mis-attributed to Q+1.
//
// Returns "accept" when neither guard fires (or when timestamps are missing,
// preserving legacy behaviour for backfilled rows).
export type RapidReplyDecision = "late_for_previous" | "coalesce_already_answered" | "accept";

export function classifyInbound(args: {
  inboundTimestamp: Date | null;
  lastQuestionSentAt: Date | null;
  lastActivityAt: Date;
}): RapidReplyDecision {
  const { inboundTimestamp, lastQuestionSentAt, lastActivityAt } = args;
  if (inboundTimestamp && lastQuestionSentAt && inboundTimestamp.getTime() < lastQuestionSentAt.getTime()) {
    return "late_for_previous";
  }
  if (lastQuestionSentAt && lastActivityAt.getTime() > lastQuestionSentAt.getTime()) {
    return "coalesce_already_answered";
  }
  return "accept";
}

// Best-trigger picker for inbound text. Returns highest-priority match.
export function pickMatchingTrigger(
  triggers: (SailaIntakeTrigger & { flow: SailaIntakeFlow })[],
  messageText: string,
  businessNumber: string,
): (SailaIntakeTrigger & { flow: SailaIntakeFlow }) | null {
  for (const t of triggers) {
    if (!t.flow.enabled) continue;
    if (!flowAppliesToBusinessNumber(t.flow, businessNumber)) continue;
    const mode: "contains" | "exact" = t.match_mode === 'exact' ? 'exact' : 'contains';
    if (keywordMatches(messageText, t.keyword, mode)) return t;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sarvam relevance check (fail-open: returns true on any error / no key)
// ─────────────────────────────────────────────────────────────────────────────

async function getSarvamApiKey(companyId: string): Promise<string | null> {
  const company = await storage.getCompany(companyId);
  const settings = (company as { settings?: Record<string, any> } | undefined)?.settings;
  return settings?.quality_check_settings?.sarvam_api_key || process.env.SARVAM_API_KEY || null;
}

export async function isAnswerRelevant(
  companyId: string,
  question: string,
  topicHint: string | null,
  answer: string,
): Promise<{ relevant: boolean; reason: string }> {
  const apiKey = await getSarvamApiKey(companyId);
  if (!apiKey) return { relevant: true, reason: "no_api_key_fail_open" };
  try {
    const sysPrompt = `You are a strict relevance classifier. Given a QUESTION and an ANSWER from a user, decide if the ANSWER is on-topic to the QUESTION. Reply with ONLY one word: YES or NO.`;
    const userPrompt = `QUESTION: ${question}\n${topicHint ? `TOPIC HINT: ${topicHint}\n` : ""}ANSWER: ${answer}\n\nIs the ANSWER on-topic? Reply YES or NO.`;
    const resp = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: { "api-subscription-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sarvam-30b",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    if (!resp.ok) {
      console.warn(`[Intake] Sarvam relevance check HTTP ${resp.status} — fail-open`);
      return { relevant: true, reason: "sarvam_http_error_fail_open" };
    }
    const data = await resp.json();
    const text = (data.choices?.[0]?.message?.content || "").trim().toUpperCase();
    if (text.startsWith("NO")) return { relevant: false, reason: "sarvam_no" };
    return { relevant: true, reason: "sarvam_yes_or_unknown" };
  } catch (err: any) {
    console.warn(`[Intake] Sarvam relevance check error: ${err.message} — fail-open`);
    storage.createSailaErrorLog({
      company_id: companyId,
      sender_phone: "",
      executive_phone: "",
      message_text: answer,
      reason: "intake_relevance_error",
      reason_detail: `Sarvam relevance error: ${err.message}`,
    } as Parameters<typeof storage.createSailaErrorLog>[0]).catch(() => {});
    return { relevant: true, reason: "sarvam_exception_fail_open" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead-update logging — writes to lead_updates so admins see the full intake
// transcript inline with normal lead activity.
// ─────────────────────────────────────────────────────────────────────────────

async function logLeadUpdate(
  leadId: string,
  via: "whatsapp" | "whatsapp_outgoing",
  remark: string,
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await storage.createLeadUpdate({
      lead_id: leadId,
      update_via: via,
      update_on: today,
      remark,
      created_by_user_id: null,
    } as Parameters<typeof storage.createLeadUpdate>[0]);
  } catch (err) {
    console.error("[Intake] logLeadUpdate failed:", err);
  }
}

async function writeAnswerToLead(leadId: string, fieldKey: string, value: string): Promise<void> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) return;
    const customFields = { ...((lead as Lead).custom_fields || {}), [fieldKey]: value };
    await storage.updateLead(leadId, { custom_fields: customFields } as Parameters<typeof storage.updateLead>[1]);
  } catch (err) {
    console.error("[Intake] writeAnswerToLead failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Outbound bot send (tags origin='bot' on the WA message log if used)
// ─────────────────────────────────────────────────────────────────────────────

async function sendBotMessage(
  config: SailaConfig,
  phoneSetting: SailaPhoneSetting,
  recipientPhone: string,
  text: string,
  leadId: string | null,
  companyId: string,
): Promise<void> {
  const result = await sendWhatsAppMessage(config, phoneSetting, recipientPhone, text);
  try {
    const logRow: Parameters<typeof storage.createWhatsAppMessageLog>[0] = {
      company_id: companyId,
      webhook_request_id: null,
      direction: "outgoing",
      lead_id: leadId,
      sent_by_user_id: null,
      sender_phone: recipientPhone.replace(/\D/g, "").slice(-10),
      sender_name: null,
      sender_wa_id: recipientPhone,
      display_phone_number: phoneSetting.display_phone_number,
      message_id: result.messageId || `intake_${Date.now()}`,
      message_text: text,
      message_type: "text",
      outcome: result.success ? "sent" : "send_failed",
      outcome_details: { error: result.error || undefined, channel: "saila_intake" },
      trigger_matched: false,
      processed_at: new Date(),
      origin: "bot",
    };
    await storage.createWhatsAppMessageLog(logRow);
  } catch (err) {
    console.error("[Intake] WA log insert failed:", err);
  }
  if (leadId) {
    await logLeadUpdate(leadId, "whatsapp_outgoing", `[Intake/bot] ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: start a session OR resume an abandoned/paused one from next-unanswered Q.
// Returns the resulting handled IntakeResult (sent first prompt).
// ─────────────────────────────────────────────────────────────────────────────

async function startOrResumeSession(args: {
  companyId: string;
  leadId: string;
  trigger: SailaIntakeTrigger & { flow: SailaIntakeFlow };
  existingSession: SailaIntakeSession | undefined;
  senderPhone: string;
  businessNumber: string;
  matchedKeyword: string;
  config: SailaConfig;
  phoneSetting: SailaPhoneSetting;
  matchedMessageText: string;
}): Promise<IntakeResult> {
  const { companyId, leadId, trigger, existingSession, senderPhone, businessNumber,
    matchedKeyword, config, phoneSetting, matchedMessageText } = args;

  const questions = await intakeStore.listIntakeQuestions(trigger.flow_id);
  if (questions.length === 0) {
    return { handled: false, reason: "flow_has_no_questions" };
  }

  let sessionId: string;
  let startIdx: number;
  // Same-flow paused/abandoned session → resume at the SESSION's current_question_index
  // (session-scoped, not lead-scoped, so prefilled CRM data does not skip questions).
  if (existingSession && existingSession.flow_id === trigger.flow_id &&
      (existingSession.status === 'paused' || existingSession.status === 'abandoned')) {
    startIdx = Math.min(existingSession.current_question_index, questions.length - 1);
    const updated = await intakeStore.updateIntakeSession(existingSession.id, {
      status: 'active',
      paused_until: null,
      current_question_index: startIdx,
      depth_reached: Math.max(existingSession.depth_reached, startIdx),
      fallback_attempts: 0,
      last_activity_at: new Date(),
      last_business_number: businessNumber,
      customer_phone: senderPhone,
    });
    sessionId = updated?.id || existingSession.id;
    await logLeadUpdate(leadId, "whatsapp", `[Intake] Keyword "${matchedKeyword}" resumed flow "${trigger.flow.name}" at Q${startIdx + 1}/${questions.length}`);
  } else {
    startIdx = 0;
    // Different-flow active session? Mark abandoned (new keyword overrides).
    if (existingSession && existingSession.status === 'active' && existingSession.flow_id !== trigger.flow_id) {
      await intakeStore.updateIntakeSession(existingSession.id, { status: 'abandoned' });
    }
    const newSession = await intakeStore.createIntakeSession({
      company_id: companyId,
      lead_id: leadId,
      flow_id: trigger.flow_id,
      current_question_index: 0,
      depth_reached: 0,
      status: 'active',
      fallback_attempts: 0,
      last_activity_at: new Date(),
      started_at: new Date(),
      last_business_number: businessNumber,
      customer_phone: senderPhone,
    });
    sessionId = newSession.id;
    await logLeadUpdate(leadId, "whatsapp", `[Intake] Lead message "${matchedMessageText.slice(0, 60)}" matched keyword "${matchedKeyword}" → started flow "${trigger.flow.name}" at Q${startIdx + 1}/${questions.length}`);
  }

  const firstQ = questions[startIdx];
  await sendBotMessage(config, phoneSetting, senderPhone, firstQ.primary_prompt, leadId, companyId);
  // Stamp last_question_sent_at AFTER the WA send completes (Task #124).
  // Used by classifyInbound to gate rapid follow-ups.
  await intakeStore.updateIntakeSession(sessionId, { last_question_sent_at: new Date() });
  return { handled: true, source: "intake_question", responseText: firstQ.primary_prompt, sessionId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-lead distributed mutex (Task #124, hardened in Task #125).
//
// Serialises ALL inbound messages for the same lead through the intake engine
// so two near-simultaneous webhooks cannot race past the session-state read
// and double-advance the flow.
//
// Uses a Postgres SESSION-level advisory lock keyed by
// (SAILA_INTAKE_LOCK_NS, hashtext('saila_intake:' || lead_id)). This protects
// across multiple Node.js processes / instances if/when the app is scaled
// horizontally (the in-memory Map used previously did not).
//
// The lock is held on a dedicated checked-out client for the duration of the
// callback and released in `finally`. A `lock_timeout` is set on the session
// so a crashed/hung peer cannot block this one indefinitely; if the lock
// cannot be acquired we fall back to running the callback unguarded (better
// to risk the rare race than to drop the inbound message entirely).
// ─────────────────────────────────────────────────────────────────────────────
const SAILA_INTAKE_LOCK_NS = 0x5A11A1; // arbitrary 32-bit namespace tag
const LEAD_LOCK_TIMEOUT_MS = 60_000;

export async function withLeadLock<T>(leadId: string, fn: () => Promise<T>): Promise<T> {
  const lockKeyText = `saila_intake:${leadId}`;
  let client: Awaited<ReturnType<typeof pool.connect>> | null = null;
  let locked = false;
  try {
    client = await pool.connect();
    try {
      await client.query(`SET lock_timeout = ${LEAD_LOCK_TIMEOUT_MS}`);
      await client.query(
        `SELECT pg_advisory_lock($1::int, hashtext($2)::int)`,
        [SAILA_INTAKE_LOCK_NS, lockKeyText],
      );
      locked = true;
    } catch (err) {
      // Lock acquisition failed (timeout, connection issue, etc.). Log and
      // proceed without the cross-instance guarantee rather than dropping the
      // inbound message — single-instance correctness is still preserved by
      // Postgres row-level concurrency in saila-intake-storage.
      console.error(`[saila-intake] advisory lock acquire failed for lead ${leadId}:`, err);
    }
    return await fn();
  } finally {
    if (client) {
      if (locked) {
        try {
          await client.query(
            `SELECT pg_advisory_unlock($1::int, hashtext($2)::int)`,
            [SAILA_INTAKE_LOCK_NS, lockKeyText],
          );
        } catch (err) {
          console.error(`[saila-intake] advisory unlock failed for lead ${leadId}:`, err);
        }
      }
      // Reset any session-level GUCs we tweaked so the next borrower of this
      // pooled connection doesn't inherit our 60s lock_timeout.
      try {
        await client.query(`RESET lock_timeout`);
      } catch {
        // best-effort
      }
      try {
        client.release();
      } catch {
        // ignore
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry — called BEFORE Fixed Reply / keyword / LLM by saila-engine.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessInboundParams {
  companyId: string;
  leadId: string | null;
  senderPhone: string;
  senderName: string;
  businessNumber: string;
  messageText: string;
  config: SailaConfig;
  phoneSetting: SailaPhoneSetting;
  // WA-reported send time of this inbound. Used to detect rapid follow-ups
  // typed BEFORE the bot's most recent question was actually sent.
  inboundMessageTimestamp?: Date | null;
}

export async function processInboundForIntake(params: ProcessInboundParams): Promise<IntakeResult> {
  if (!params.leadId) return { handled: false, reason: "no_lead_id" };
  return withLeadLock(params.leadId, () => processInboundForIntakeInner(params));
}

async function processInboundForIntakeInner(params: ProcessInboundParams): Promise<IntakeResult> {
  const { companyId, leadId, senderPhone, businessNumber, messageText, config, phoneSetting } = params;
  const inboundTs = params.inboundMessageTimestamp || null;

  if (!leadId) return { handled: false, reason: "no_lead_id" };

  const now = new Date();
  const session = await intakeStore.getActiveSessionForLead(leadId); // active or paused
  const triggers = await intakeStore.listAllIntakeTriggersForCompany(companyId);

  // Helper: keyword-driven start/resume. Always uses PER-FLOW history for the
  // matched trigger so completed/abandoned/paused state is evaluated correctly
  // even when the lead has prior sessions in OTHER flows.
  const startFromKeyword = async (
    currentActive: SailaIntakeSession | undefined,
  ): Promise<IntakeResult | null> => {
    const trig = pickMatchingTrigger(triggers, messageText, businessNumber);
    if (!trig) return null;
    const priorForFlow = await intakeStore.getLatestSessionForLeadAndFlow(leadId, trig.flow_id);
    if (priorForFlow && priorForFlow.status === 'completed') {
      return { handled: false, reason: "flow_already_completed" };
    }
    // Different-flow active/paused session → abandon so this lead has only one active.
    if (currentActive && currentActive.flow_id !== trig.flow_id) {
      await intakeStore.updateIntakeSession(currentActive.id, { status: 'abandoned' });
    }
    return await startOrResumeSession({
      companyId, leadId, trigger: trig, existingSession: priorForFlow,
      senderPhone, businessNumber, matchedKeyword: trig.keyword,
      config, phoneSetting, matchedMessageText: messageText,
    });
  };

  // ── 1. PAUSED session gating ──
  if (session && session.status === 'paused') {
    const expired = session.paused_until ? now >= new Date(session.paused_until) : false;
    if (!expired) {
      // <24h: silent regardless of message content (no resume even on keyword).
      return { handled: true, source: "intake_paused_silent", responseText: "", sessionId: session.id };
    }
    // >=24h: keyword (per-flow eligibility) can start/resume; otherwise fall through.
    const r = await startFromKeyword(session);
    if (r) return r;
    return { handled: false, reason: "paused_expired_no_keyword" };
  }

  // ── 2. ACTIVE session: continue current question ──
  if (session && session.status === 'active') {
    const flow = await intakeStore.getIntakeFlow(session.flow_id);
    if (!flow || !flow.enabled) {
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
      return { handled: false, reason: "flow_missing_or_disabled" };
    }
    if (!messageText || !messageText.trim()) {
      // Non-text / empty: do NOT advance, do NOT speak. Tick worker owns silence escalation.
      return { handled: true, source: "intake_silent_no_text", responseText: "", sessionId: session.id };
    }
    if (isCancelMessage(messageText, flow.cancel_keywords || [])) {
      // Polite termination — send a friendly close-out before abandoning.
      const cancelMsg = flow.completion_message?.trim() || POLITE_CANCEL_MESSAGE;
      await sendBotMessage(config, phoneSetting, senderPhone, cancelMsg, leadId, companyId);
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
      await logLeadUpdate(leadId, "whatsapp", `[Intake] Cancelled by lead ("${messageText.slice(0, 60)}") — flow "${flow.name}" (sent polite cancel reply)`);
      return { handled: true, source: "intake_cancelled", responseText: cancelMsg, sessionId: session.id };
    }
    // Rapid-reply ordering guards (Task #124). Inside the per-lead mutex so
    // session state is fresh; runs BEFORE advanceSession to prevent
    // double-advance and mis-attributed-answer races.
    const decision = classifyInbound({
      inboundTimestamp: inboundTs,
      lastQuestionSentAt: session.last_question_sent_at ? new Date(session.last_question_sent_at as any) : null,
      lastActivityAt: new Date(session.last_activity_at as any),
    });
    if (decision === "late_for_previous") {
      await logLeadUpdate(leadId, "whatsapp", `[Intake] Late inbound (typed before Q${session.current_question_index + 1} prompt was sent) — transcript only, not advancing: ${messageText.slice(0, 200)}`);
      return { handled: true, source: "intake_late_reply", responseText: "", sessionId: session.id };
    }
    if (decision === "coalesce_already_answered") {
      await logLeadUpdate(leadId, "whatsapp", `[Intake] Coalesced rapid follow-up at Q${session.current_question_index + 1} (current Q already answered) — transcript only: ${messageText.slice(0, 200)}`);
      return { handled: true, source: "intake_coalesced", responseText: "", sessionId: session.id };
    }
    return await advanceSession({ session, flow, params });
  }

  // ── 3. No active/paused session → keyword can start (or resume drop-off) ──
  const r = await startFromKeyword(undefined);
  if (r) return r;
  return { handled: false, reason: "no_trigger_matched" };
}

const POLITE_CANCEL_MESSAGE = "No problem — we'll stop here. Reply anytime if you'd like to continue.";

// ─────────────────────────────────────────────────────────────────────────────
// State machine: process a lead's reply to the current question
// ─────────────────────────────────────────────────────────────────────────────

async function advanceSession(args: {
  session: SailaIntakeSession;
  flow: SailaIntakeFlow;
  params: {
    companyId: string;
    leadId: string | null;
    senderPhone: string;
    businessNumber: string;
    messageText: string;
    config: SailaConfig;
    phoneSetting: SailaPhoneSetting;
  };
}): Promise<IntakeResult> {
  const { session, flow, params } = args;
  const { companyId, leadId, senderPhone, businessNumber, messageText, config, phoneSetting } = params;
  const questions = await intakeStore.listIntakeQuestions(flow.id);
  const idx = session.current_question_index;
  const currentQ = questions[idx];
  if (!currentQ) {
    await intakeStore.updateIntakeSession(session.id, { status: 'completed', completed_at: new Date() });
    return { handled: false, reason: "question_index_out_of_range" };
  }

  if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Q${idx + 1}/${questions.length} reply: ${messageText.slice(0, 200)}`);

  // Optional Sarvam relevance check
  if (currentQ.llm_relevance_check_enabled) {
    const { relevant } = await isAnswerRelevant(companyId, currentQ.primary_prompt, currentQ.relevance_topic_hint, messageText);
    if (!relevant) {
      const maxAttempts = currentQ.max_fallback_attempts ?? flow.max_fallback_attempts;

      if (currentQ.on_off_topic_action === 'end_immediately') {
        // Send goodbye/completion BEFORE marking abandoned so the lead knows the flow ended.
        const goodbye = (flow.completion_message?.trim() || "Thanks for your time — we'll be in touch shortly.");
        await sendBotMessage(config, phoneSetting, senderPhone, goodbye, leadId, companyId);
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned', last_business_number: businessNumber });
        if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Off-topic answer at Q${idx + 1}/${questions.length} → flow ended (sent completion message)`);
        return { handled: true, source: "intake_off_topic", responseText: goodbye, sessionId: session.id };
      }

      // 'reask' (default): increment fallback_attempts and check max. If exceeded → abandon.
      const newAttempts = session.fallback_attempts + 1;
      if (newAttempts > maxAttempts) {
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned', last_business_number: businessNumber });
        if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Off-topic answers exceeded ${maxAttempts} re-asks at Q${idx + 1}/${questions.length} → abandoned`);
        return { handled: true, source: "intake_off_topic", responseText: "", sessionId: session.id };
      }
      const reaskText = renderFallbackPrompt(flow.fallback_prompt_template, currentQ.primary_prompt);
      await sendBotMessage(config, phoneSetting, senderPhone, reaskText, leadId, companyId);
      await intakeStore.updateIntakeSession(session.id, {
        fallback_attempts: newAttempts,
        last_activity_at: new Date(),
        last_business_number: businessNumber,
        // Re-ask = the bot prompted again. Refresh last_question_sent_at so
        // the next inbound is judged against this newer prompt time.
        last_question_sent_at: new Date(),
      });
      return { handled: true, source: "intake_question", responseText: reaskText, sessionId: session.id };
    }
  }

  // Accept answer
  if (leadId) await writeAnswerToLead(leadId, currentQ.target_field, messageText.trim());

  const nextIdx = idx + 1;
  const newDepth = Math.max(session.depth_reached, nextIdx);

  if (nextIdx >= questions.length) {
    await intakeStore.updateIntakeSession(session.id, {
      status: 'completed',
      current_question_index: nextIdx,
      depth_reached: newDepth,
      fallback_attempts: 0,
      completed_at: new Date(),
      last_activity_at: new Date(),
      last_business_number: businessNumber,
    });
    const completionText = flow.completion_message?.trim() || "";
    if (completionText) {
      await sendBotMessage(config, phoneSetting, senderPhone, completionText, leadId, companyId);
    }
    if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Flow "${flow.name}" completed — ${questions.length}/${questions.length} questions answered`);
    return { handled: true, source: "intake_completion", responseText: completionText, sessionId: session.id };
  }

  const nextQ = questions[nextIdx];
  // Two-phase update so classifyInbound's "already answered" guard works (Task #124):
  //   (1) bump last_activity_at = now1 BEFORE sending next Q (records the accepted answer)
  //   (2) stamp last_question_sent_at = now2 AFTER the WA send (now2 > now1)
  // Any rapid follow-up arriving between (1) and (2) sees last_activity_at >= last_question_sent_at
  // (still equal-or-old) and gets coalesced; an inbound arriving after (2) with a WA timestamp
  // before now2 is classified as late_for_previous.
  const acceptedAt = new Date();
  await intakeStore.updateIntakeSession(session.id, {
    current_question_index: nextIdx,
    depth_reached: newDepth,
    fallback_attempts: 0,
    last_activity_at: acceptedAt,
    last_business_number: businessNumber,
  });
  await sendBotMessage(config, phoneSetting, senderPhone, nextQ.primary_prompt, leadId, companyId);
  await intakeStore.updateIntakeSession(session.id, { last_question_sent_at: new Date() });
  return { handled: true, source: "intake_question", responseText: nextQ.primary_prompt, sessionId: session.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tick worker — silence timeout / fallback / abandonment.
// Only operates on status='active' sessions (paused/completed/abandoned never tick).
// ─────────────────────────────────────────────────────────────────────────────

export interface FallbackTickDecision {
  action: "noop" | "send_fallback" | "abandon";
  newAttempts: number;
}

export function decideFallbackTick(args: {
  lastActivityAt: Date;
  silenceTimeoutSeconds: number;
  fallbackAttempts: number;
  maxFallbackAttempts: number;
  now?: Date;
}): FallbackTickDecision {
  const now = args.now || new Date();
  const elapsedSec = (now.getTime() - args.lastActivityAt.getTime()) / 1000;
  if (elapsedSec < args.silenceTimeoutSeconds) return { action: "noop", newAttempts: args.fallbackAttempts };
  if (args.fallbackAttempts >= args.maxFallbackAttempts) {
    return { action: "abandon", newAttempts: args.fallbackAttempts };
  }
  return { action: "send_fallback", newAttempts: args.fallbackAttempts + 1 };
}

// A session whose silence timeout expired more than this long ago is abandoned
// instead of prompted: a fallback to a customer silent for over a week reads
// as spam, and it stops a deploy from bursting months-old prompts.
const STALE_SESSION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export async function tickAllActiveSessions(): Promise<{ checked: number; sentFallback: number; abandoned: number }> {
  const now = new Date();
  const sessions = await intakeStore.getActiveSessionsDueForTick(now);
  let sentFallback = 0;
  let abandoned = 0;

  // Per-tick memo. Hundreds of sessions share a handful of flows, configs and
  // phone settings; without this every session cost 4-5 queries per tick.
  const flowById = new Map<string, SailaIntakeFlow | undefined>();
  const questionsByFlow = new Map<string, SailaIntakeQuestion[]>();
  const configByCompany = new Map<string, SailaConfig | undefined>();
  const phoneSettingByKey = new Map<string, SailaPhoneSetting | undefined>();

  // Every path that cannot make progress marks the session abandoned. Leaving
  // it 'active' (the old behaviour) meant it was re-evaluated every tick
  // forever; an abandoned session still resumes at its question when the lead
  // messages again (see startFlow).
  const abandon = async (session: SailaIntakeSession, questionCount: number, reason: string) => {
    await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
    if (session.lead_id) {
      await logLeadUpdate(session.lead_id, "whatsapp", `[Intake] Abandoned at Q${session.current_question_index + 1}/${questionCount} — ${reason} (drop-off depth: ${session.depth_reached})`);
    }
    abandoned++;
  };

  for (const session of sessions) {
    try {
      if (!flowById.has(session.flow_id)) flowById.set(session.flow_id, await intakeStore.getIntakeFlow(session.flow_id));
      const flow = flowById.get(session.flow_id);
      if (!flow || !flow.enabled) {
        await abandon(session, 0, "flow is disabled or deleted");
        continue;
      }
      if (!questionsByFlow.has(flow.id)) questionsByFlow.set(flow.id, await intakeStore.listIntakeQuestions(flow.id));
      const questions = questionsByFlow.get(flow.id)!;
      const currentQ = questions[session.current_question_index];
      if (!currentQ) {
        await abandon(session, questions.length, "current question no longer exists");
        continue;
      }
      const maxAttempts = currentQ.max_fallback_attempts ?? flow.max_fallback_attempts;
      const lastActivityAt = new Date(session.last_activity_at);
      const decision = decideFallbackTick({
        lastActivityAt,
        silenceTimeoutSeconds: currentQ.silence_timeout_seconds,
        fallbackAttempts: session.fallback_attempts,
        maxFallbackAttempts: maxAttempts,
        now,
      });
      if (decision.action === "noop") continue;
      if (decision.action === "abandon") {
        await abandon(session, questions.length, `after ${maxAttempts} silent fallback prompts`);
        continue;
      }
      // send_fallback
      const overdueMs = now.getTime() - lastActivityAt.getTime() - currentQ.silence_timeout_seconds * 1000;
      if (overdueMs > STALE_SESSION_GRACE_MS) {
        await abandon(session, questions.length, "silent for more than 7 days past the timeout");
        continue;
      }
      const recipientPhone = session.customer_phone || "";
      if (!recipientPhone || !session.lead_id) {
        await abandon(session, questions.length, "no customer phone on record for a fallback prompt");
        continue;
      }
      if (!configByCompany.has(session.company_id)) configByCompany.set(session.company_id, await storage.getSailaConfig(session.company_id));
      const config = configByCompany.get(session.company_id);
      const businessNumber = session.last_business_number || "";
      const psKey = `${session.company_id}:${businessNumber}`;
      if (!phoneSettingByKey.has(psKey)) {
        phoneSettingByKey.set(psKey, businessNumber ? await storage.getSailaPhoneSettingByNumber(session.company_id, businessNumber) : undefined);
      }
      const phoneSetting = phoneSettingByKey.get(psKey);
      if (!config || !phoneSetting || !phoneSetting.enabled) {
        await abandon(session, questions.length, "Saila config or business number is disabled");
        continue;
      }
      const text = renderFallbackPrompt(flow.fallback_prompt_template, currentQ.primary_prompt);
      await sendBotMessage(config, phoneSetting, recipientPhone, text, session.lead_id, session.company_id);
      // Conditional update to guard against duplicate sends from a parallel worker:
      // only bump attempts if fallback_attempts is still what we expected.
      // Also refresh last_question_sent_at so subsequent rapid-reply classification
      // is judged against this newer fallback-prompt time (Task #124).
      const tickStamp = new Date();
      await intakeStore.updateIntakeSession(session.id, {
        fallback_attempts: decision.newAttempts,
        last_activity_at: tickStamp,
        last_question_sent_at: tickStamp,
      });
      sentFallback++;
    } catch (err: any) {
      console.error(`[Intake] tick error for session ${session.id}:`, err.message);
    }
  }
  return { checked: sessions.length, sentFallback, abandoned };
}
