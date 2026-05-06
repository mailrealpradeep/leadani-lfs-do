// Saila Intake Engine — keyword detection, state machine, fallback tick, Sarvam relevance check.
//
// PRECEDENCE (within Saila inbound pipeline, see saila-engine.ts):
//   1. Fixed Reply Mode (Meta Ad 2nd-message-in-3h)        ← runs first, untouched
//   2. Active intake session continuation                   ← THIS module
//   3. New intake session (keyword trigger)                 ← THIS module
//   4. Keyword fast-path / template / LLM (existing)        ← unchanged
//
// Strict additivity: returns { handled: false } when intake should NOT respond, so the
// existing pipeline runs unchanged.

import { storage } from "./storage";
import { sendWhatsAppMessage } from "./saila-engine";
import * as intakeStore from "./saila-intake-storage";
import type {
  SailaIntakeFlow,
  SailaIntakeQuestion,
  SailaIntakeSession,
  SailaConfig,
  SailaPhoneSetting,
} from "@shared/schema";

export interface IntakeHandled {
  handled: true;
  source: "intake_question" | "intake_completion" | "intake_cancelled" | "intake_off_topic" | "intake_silence_timeout";
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
// (Spec: industry-agnostic; keyword arriving while same flow active is treated as the user's
// answer to the current question — never re-triggers a restart.)
export function shouldStartNewSession(existing: SailaIntakeSession | undefined, candidateFlowId: string): boolean {
  if (!existing) return true;
  if (existing.status === 'completed' || existing.status === 'abandoned') return true;
  if (existing.flow_id !== candidateFlowId) return true;
  return false;
}

export function renderFallbackPrompt(template: string, question: string): string {
  if (!template) return question;
  return template.replace(/\{question\}/g, question);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sarvam relevance check (fail-open: returns true on any error / no key)
// ─────────────────────────────────────────────────────────────────────────────

async function getSarvamApiKey(companyId: string): Promise<string | null> {
  const company = await storage.getCompany(companyId);
  const settings = (company as any)?.settings;
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
        model: "sarvam-m",
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
    }).catch(() => {});
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
      created_by_user_id: null as any, // bot/system updates
    } as any);
  } catch (err) {
    console.error("[Intake] logLeadUpdate failed:", err);
  }
}

async function writeAnswerToLead(leadId: string, fieldKey: string, value: string): Promise<void> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) return;
    const customFields = { ...(lead.custom_fields || {}), [fieldKey]: value };
    await storage.updateLead(leadId, { custom_fields: customFields } as any);
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
  // Log outgoing into whatsapp_message_logs with origin='bot'
  try {
    await storage.createWhatsAppMessageLog({
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
    } as any);
  } catch (err) {
    console.error("[Intake] WA log insert failed:", err);
  }
  if (leadId) {
    await logLeadUpdate(leadId, "whatsapp_outgoing", `[Intake/bot] ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry — called BEFORE Fixed Reply / keyword / LLM by saila-engine.ts
// ─────────────────────────────────────────────────────────────────────────────

export async function processInboundForIntake(params: {
  companyId: string;
  leadId: string | null;
  senderPhone: string;
  senderName: string;
  businessNumber: string; // display_phone_number
  messageText: string;
  config: SailaConfig;
  phoneSetting: SailaPhoneSetting;
}): Promise<IntakeResult> {
  const { companyId, leadId, senderPhone, businessNumber, messageText, config, phoneSetting } = params;

  // No lead → cannot anchor a session; skip (lead is created upstream by whatsapp-processor)
  if (!leadId) return { handled: false, reason: "no_lead_id" };

  // ── 1. Continue existing session if active OR resume from paused-until-elapsed ──
  let session = await intakeStore.getActiveSessionForLead(leadId);
  if (session && session.status === 'paused') {
    if (session.paused_until && new Date(session.paused_until) <= new Date()) {
      session = await intakeStore.updateIntakeSession(session.id, { status: 'active', paused_until: null }) || session;
    } else {
      // Still paused (within human-takeover window) — let normal pipeline handle this message
      return { handled: false, reason: "session_paused" };
    }
  }

  if (session && session.status === 'active') {
    const flow = await intakeStore.getIntakeFlow(session.flow_id);
    if (!flow || !flow.enabled) {
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
      return { handled: false, reason: "flow_missing_or_disabled" };
    }
    // Cancel-keyword aborts session
    if (isCancelMessage(messageText, flow.cancel_keywords || [])) {
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
      await logLeadUpdate(leadId, "whatsapp", `[Intake] Cancelled by lead ("${messageText.slice(0, 60)}") — flow "${flow.name}"`);
      return { handled: true, source: "intake_cancelled", responseText: "", sessionId: session.id };
    }
    return await advanceSession({ session, flow, params });
  }

  // ── 2. Try to start a NEW session via keyword ──
  const triggers = await intakeStore.listAllIntakeTriggersForCompany(companyId);
  for (const trig of triggers) {
    if (!flowAppliesToBusinessNumber(trig.flow, businessNumber)) continue;
    if (!keywordMatches(messageText, trig.keyword, (trig.match_mode as any) || 'contains')) continue;

    if (!shouldStartNewSession(session, trig.flow_id)) continue;

    // If a different-flow session existed, mark it abandoned (new keyword overrides)
    if (session && session.status === 'active' && session.flow_id !== trig.flow_id) {
      await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
    }

    const questions = await intakeStore.listIntakeQuestions(trig.flow_id);
    if (questions.length === 0) {
      console.log(`[Intake] Flow "${trig.flow.name}" has no questions — skipping`);
      continue;
    }

    const newSession = await intakeStore.createIntakeSession({
      company_id: companyId,
      lead_id: leadId,
      flow_id: trig.flow_id,
      current_question_index: 0,
      depth_reached: 0,
      status: 'active',
      fallback_attempts: 0,
      last_activity_at: new Date(),
      started_at: new Date(),
      last_business_number: businessNumber,
    });

    const firstQ = questions[0];
    await sendBotMessage(config, phoneSetting, senderPhone, firstQ.primary_prompt, leadId, companyId);
    await logLeadUpdate(leadId, "whatsapp", `[Intake] Lead message "${messageText.slice(0, 60)}" matched keyword "${trig.keyword}" → started flow "${trig.flow.name}" (Q1/${questions.length})`);

    return { handled: true, source: "intake_question", responseText: firstQ.primary_prompt, sessionId: newSession.id };
  }

  return { handled: false, reason: "no_trigger_matched" };
}

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

  // Record the incoming answer to lead history
  if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Q${idx + 1}/${questions.length} reply: ${messageText.slice(0, 200)}`);

  // Optional Sarvam relevance check
  if (currentQ.llm_relevance_check_enabled) {
    const { relevant } = await isAnswerRelevant(companyId, currentQ.primary_prompt, currentQ.relevance_topic_hint, messageText);
    if (!relevant) {
      if (currentQ.on_off_topic_action === 'end_immediately') {
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned', last_business_number: businessNumber });
        if (leadId) await logLeadUpdate(leadId, "whatsapp", `[Intake] Off-topic answer → session ended (Q${idx + 1}/${questions.length})`);
        return { handled: true, source: "intake_off_topic", responseText: "", sessionId: session.id };
      }
      // Default: re-ask via fallback prompt
      const reaskText = renderFallbackPrompt(flow.fallback_prompt_template, currentQ.primary_prompt);
      await sendBotMessage(config, phoneSetting, senderPhone, reaskText, leadId, companyId);
      await intakeStore.updateIntakeSession(session.id, { last_activity_at: new Date(), last_business_number: businessNumber });
      return { handled: true, source: "intake_question", responseText: reaskText, sessionId: session.id };
    }
  }

  // Accept answer → write to lead.custom_fields[target_field]
  if (leadId) await writeAnswerToLead(leadId, currentQ.target_field, messageText.trim());

  const nextIdx = idx + 1;
  const newDepth = Math.max(session.depth_reached, nextIdx);

  if (nextIdx >= questions.length) {
    // Done!
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

  // Advance to next question
  const nextQ = questions[nextIdx];
  await intakeStore.updateIntakeSession(session.id, {
    current_question_index: nextIdx,
    depth_reached: newDepth,
    fallback_attempts: 0,
    last_activity_at: new Date(),
    last_business_number: businessNumber,
  });
  await sendBotMessage(config, phoneSetting, senderPhone, nextQ.primary_prompt, leadId, companyId);
  return { handled: true, source: "intake_question", responseText: nextQ.primary_prompt, sessionId: session.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tick worker — silence timeout / fallback / abandonment.
// Called by saila-intake-scheduler every minute.
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

export async function tickAllActiveSessions(): Promise<{ checked: number; sentFallback: number; abandoned: number }> {
  const now = new Date();
  const sessions = await intakeStore.getActiveSessionsDueForTick(now);
  let sentFallback = 0;
  let abandoned = 0;
  for (const session of sessions) {
    try {
      const flow = await intakeStore.getIntakeFlow(session.flow_id);
      if (!flow || !flow.enabled) {
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
        abandoned++;
        continue;
      }
      const questions = await intakeStore.listIntakeQuestions(flow.id);
      const currentQ = questions[session.current_question_index];
      if (!currentQ) {
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
        abandoned++;
        continue;
      }
      const maxAttempts = currentQ.max_fallback_attempts ?? flow.max_fallback_attempts;
      const decision = decideFallbackTick({
        lastActivityAt: new Date(session.last_activity_at),
        silenceTimeoutSeconds: currentQ.silence_timeout_seconds,
        fallbackAttempts: session.fallback_attempts,
        maxFallbackAttempts: maxAttempts,
        now,
      });
      if (decision.action === "noop") continue;
      if (decision.action === "abandon") {
        await intakeStore.updateIntakeSession(session.id, { status: 'abandoned' });
        if (session.lead_id) await logLeadUpdate(session.lead_id, "whatsapp", `[Intake] Abandoned at Q${session.current_question_index + 1}/${questions.length} after ${maxAttempts} silent fallback prompts (drop-off depth: ${session.depth_reached})`);
        abandoned++;
        continue;
      }
      // send_fallback
      const config = await storage.getSailaConfig(session.company_id);
      const businessNumber = session.last_business_number || "";
      const phoneSetting = businessNumber ? await storage.getSailaPhoneSettingByNumber(session.company_id, businessNumber) : undefined;
      if (!config || !phoneSetting || !phoneSetting.enabled || !session.lead_id) {
        // Cannot send → do not bump attempts
        continue;
      }
      const lead = await storage.getLead(session.lead_id);
      const recipientPhone = (lead as any)?.mobile || "";
      if (!recipientPhone) continue;
      const text = renderFallbackPrompt(flow.fallback_prompt_template, currentQ.primary_prompt);
      await sendBotMessage(config, phoneSetting, recipientPhone, text, session.lead_id, session.company_id);
      await intakeStore.updateIntakeSession(session.id, {
        fallback_attempts: decision.newAttempts,
        last_activity_at: new Date(),
      });
      sentFallback++;
    } catch (err: any) {
      console.error(`[Intake] tick error for session ${session.id}:`, err.message);
    }
  }
  return { checked: sessions.length, sentFallback, abandoned };
}
