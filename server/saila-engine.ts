import { storage } from "./storage";
import { getCompanyTimezone, getTodayDateString } from "./timezone-utils";
import { processInboundForIntake } from "./saila-intake-engine";
import type {
  SailaConfig,
  SailaPhoneSetting,
  SailaTemplate,
  SailaTemplateMessage,
  SailaKeyword,
  SailaConversation,
  SailaConversationMessage,
  WhatsAppMessageLogRecord,
} from "@shared/schema";

export interface SailaResponse {
  shouldRespond: boolean;
  responseText: string;
  confidenceScore: number;
  source: "template" | "keyword" | "sarvam_llm" | "fallback" | "none" | "fixed_reply";
  templateUsed?: string;
  keywordMatched?: string;
  mediaToSend?: { url: string; type: string; name: string }[];
}

interface ConversationContext {
  messages: SailaConversationMessage[];
  conversation: SailaConversation;
}

export interface TemplateWithMessages {
  template: SailaTemplate;
  messages: SailaTemplateMessage[];
}

function computeStringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let matched = 0;
  for (const w of words1) {
    if (words2.some(w2 => w2.includes(w) || w.includes(w2))) matched++;
  }
  const wordScore = (matched / Math.max(words1.length, words2.length)) * 100;

  let lcsLen = 0;
  const maxLen = Math.max(s1.length, s2.length);
  for (let len = Math.min(s1.length, s2.length); len >= 3; len--) {
    for (let i = 0; i <= s1.length - len; i++) {
      const sub = s1.substring(i, i + len);
      if (s2.includes(sub)) {
        lcsLen = len;
        break;
      }
    }
    if (lcsLen > 0) break;
  }
  const substringScore = (lcsLen / maxLen) * 100;

  return Math.max(wordScore, substringScore);
}

/**
 * Pre-selects the top 10 most contextually relevant templates from potentially
 * 100+ templates using 4 local scoring signals — no LLM call needed.
 *
 * Signals:
 *   S1 (weight 0.35): Direct message match vs template incoming messages
 *   S2 (weight 0.25): Template name + description keyword overlap with message
 *   S3 (weight 0.30): Conversation history alignment with template message sequence
 *   S4 (flat +30):    Continuation bonus if last Saila response used this template
 */
function selectTopTemplates(
  allTemplates: TemplateWithMessages[],
  currentMessage: string,
  conversationHistory: SailaConversationMessage[],
  lastTemplateUsed?: string
): TemplateWithMessages[] {
  if (allTemplates.length <= 10) return allTemplates;

  const scored = allTemplates.map(({ template, messages }) => {
    const incomingMessages = messages
      .filter(m => m.direction === "incoming")
      .sort((a, b) => a.order_index - b.order_index);

    // Signal 1: Best direct similarity between current message and any incoming template message
    let s1 = 0;
    for (const msg of incomingMessages) {
      const sim = computeStringSimilarity(currentMessage, msg.message_text);
      if (sim > s1) s1 = sim;
    }

    // Signal 2: Name + description keyword match
    const nameDesc = `${template.name} ${template.description || ""} ${template.category || ""}`;
    let s2 = computeStringSimilarity(currentMessage, nameDesc);
    // Bonus if any individual word from template name appears in the message
    const templateWords = template.name.toLowerCase().split(/\s+/);
    const msgLower = currentMessage.toLowerCase();
    if (templateWords.some(w => w.length > 3 && msgLower.includes(w))) {
      s2 = Math.min(100, s2 + 20);
    }

    // Signal 3: Conversation history alignment
    // Take last 4 messages from history, compare against template's full message sequence
    let s3 = 0;
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory
        .slice(-4)
        .map(m => m.message_text)
        .join(" ");
      const templateFlow = messages
        .sort((a, b) => a.order_index - b.order_index)
        .map(m => m.message_text)
        .join(" ");
      s3 = computeStringSimilarity(recentHistory, templateFlow);
    }

    // Signal 4: Continuation bonus
    const continuationBonus =
      lastTemplateUsed && lastTemplateUsed === template.name ? 30 : 0;

    const finalScore =
      s1 * 0.35 + s2 * 0.25 + s3 * 0.30 + continuationBonus;

    return { template, messages, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(({ template, messages }) => ({ template, messages }));
}

async function matchKeyword(
  companyId: string,
  messageText: string
): Promise<{ keyword: SailaKeyword; score: number } | null> {
  const keywords = await storage.getSailaKeywords(companyId);
  const enabledKeywords = keywords.filter(k => k.enabled).sort((a, b) => b.priority - a.priority);
  if (enabledKeywords.length === 0) return null;

  const lowerText = messageText.toLowerCase();

  for (const kw of enabledKeywords) {
    const kwLower = kw.keyword.toLowerCase();
    let matched = false;

    switch (kw.match_type) {
      case "exact":
        matched = lowerText === kwLower;
        break;
      case "starts_with":
        matched = lowerText.startsWith(kwLower);
        break;
      case "contains":
      default:
        matched = lowerText.includes(kwLower);
        break;
    }

    if (matched) {
      const score = kw.match_type === "exact" ? 95 : kw.match_type === "starts_with" ? 85 : 75;
      return { keyword: kw, score };
    }
  }

  return null;
}

async function callSarvamLLM(
  config: SailaConfig,
  messageText: string,
  executiveName: string,
  conversationHistory: SailaConversationMessage[],
  language: string,
  selectedTemplates: TemplateWithMessages[],
  rolePrompt?: string,
  instructionPrompt?: string,
  executiveDesignation?: string
): Promise<{ responseText: string; confidence: number } | null> {
  if (!config.sarvam_api_key) {
    console.log("[Saila] No Sarvam API key configured, skipping LLM");
    return null;
  }

  try {
    // Language instruction
    const languageInstruction = language === "odia"
      ? "Respond naturally in Odia language using Odia script."
      : language === "odinglish"
        ? "Respond naturally in Odinglish - romanized Odia written in English letters. Example style: 'kouthi ghara heba', 'kemiti achhanti', 'namaskar bhai'. Do NOT use Odia script, write everything in English/Roman letters."
        : language === "english"
          ? "Respond naturally in English."
          : language === "hinglish"
            ? "Respond naturally in Hinglish (Hindi+English mix written in Roman/English letters). Example: 'kya plan hai ghar lene ka', 'aap kab free ho call ke liye'."
            : language === "telugu"
              ? "Respond naturally in Telugu language using Telugu script."
              : "Respond naturally in Hindi.";

    // Block 1: Role & Persona
    const identityLine = executiveDesignation
      ? `${executiveName}, ${executiveDesignation}`
      : executiveName;
    const defaultRolePrompt = `You are ${identityLine}, a friendly and professional sales executive. Your goal is to engage with potential customers, understand their needs, and schedule a call or site visit.`;
    const block1 = (rolePrompt || defaultRolePrompt)
      .replace(/\{executive_name\}/g, executiveName)
      .replace(/\{executive_designation\}/g, executiveDesignation || "");

    // Block 2: Top 10 pre-selected conversation scripts
    let block2 = "";
    if (selectedTemplates.length > 0) {
      const scriptLines: string[] = [
        "=== Reference Conversation Scripts ===",
        `Executive Identity: ${identityLine}`,
      ];
      for (const { template, messages } of selectedTemplates) {
        const sortedMessages = messages.sort((a, b) => a.order_index - b.order_index);
        scriptLines.push(`\nScript: "${template.name}"${template.description ? ` (${template.description})` : ""}`);
        for (const msg of sortedMessages) {
          const speaker = msg.direction === "incoming" ? "Customer" : executiveName;
          const text = msg.message_text.replace(/\{executive_name\}/g, executiveName);
          scriptLines.push(`  ${speaker}: ${text}`);
        }
      }
      block2 = scriptLines.join("\n");
    }

    // Block 3: Full conversation history (last 20 messages)
    let block3 = "";
    if (conversationHistory.length > 0) {
      const historyLines = conversationHistory.slice(-20).map(m => {
        const speaker = m.direction === "incoming" ? "Customer" : executiveName;
        return `${speaker}: ${m.message_text}`;
      });
      block3 = `=== Current Conversation ===\n${historyLines.join("\n")}`;
    }

    // Block 4: Response instruction
    const defaultInstructionPrompt = `Based on the conversation scripts and history above, understand what the customer needs right now and respond naturally. Follow the spirit of the scripts but do not copy them word-for-word. Keep it concise (2-3 sentences). Always move toward booking a call or visit.`;
    const block4 = (instructionPrompt || defaultInstructionPrompt)
      .replace(/\{executive_name\}/g, executiveName)
      .replace(/\{executive_designation\}/g, executiveDesignation || "");

    // Assemble system prompt
    const systemParts = [block1, languageInstruction];
    if (block2) systemParts.push(block2);
    if (block3) systemParts.push(block3);
    systemParts.push(block4);
    const systemPrompt = systemParts.join("\n\n");

    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.sarvam_api_key}`,
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageText },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("[Saila] Sarvam API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return { responseText: text, confidence: 70 };
  } catch (err) {
    console.error("[Saila] Sarvam API call failed:", err);
    return null;
  }
}

/**
 * Validate the approved-template portion of a saved WhatsApp message template.
 * Returns null when the configuration is acceptable, or a human-readable
 * error string suitable for surfacing in an HTTP 400 response.
 *
 * The send route depends on this helper for the "missing template name"
 * pre-flight check so that misconfigured templates fail loudly without ever
 * touching Wauper / Meta or creating a `lead_updates` row.
 */
export function validateApprovedTemplateConfig(template: {
  template_type?: string | null;
  approved_template_name?: string | null;
}): string | null {
  if ((template?.template_type ?? "") !== "approved") return null;
  const name = String(template?.approved_template_name ?? "").trim();
  if (!name) {
    return "Approved template name is not configured for this call response";
  }
  return null;
}

/**
 * Result of fetching an approved template's metadata from Wauper / Meta.
 *
 * The route layer uses this to validate that the configured
 * `approved_template_variables` length (or `approved_template_variable_count`)
 * matches what the template actually expects, so admins can be warned at
 * save time instead of at send time.
 *
 *  - `ok: true`  — Meta returned the template; `expectedVariableCount` is the
 *    number of `{{N}}` placeholders in the BODY component.
 *  - `ok: false` — We could not determine the expected count (no waba_id,
 *    network error, template not found, etc). The caller should treat this
 *    as "skip validation" rather than blocking the save, so the feature
 *    degrades gracefully when admins have not connected the Cloud API yet.
 */
export type ApprovedTemplateMetadataResult =
  | { ok: true; expectedVariableCount: number; matchedLanguage: string }
  | { ok: false; reason: "no_waba_id" | "no_access_token" | "not_found" | "network_error" | "no_body_component"; error?: string };

function countBodyPlaceholders(text: string): number {
  if (!text) return 0;
  const matches = String(text).match(/\{\{\s*\d+\s*\}\}/g);
  if (!matches) return 0;
  // Use the highest index seen rather than match count, since Meta numbers
  // body parameters positionally and may repeat the same {{N}} token multiple
  // times in the body.
  let maxIdx = 0;
  for (const m of matches) {
    const n = parseInt(m.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n) && n > maxIdx) maxIdx = n;
  }
  return maxIdx;
}

/**
 * Fetch metadata for a single approved WhatsApp template from Wauper / Meta.
 *
 * Returns the expected number of body variables so the route layer can warn
 * admins about a mismatch BEFORE a real send fails. We use the WhatsApp
 * Business Cloud API style endpoint that Wauper proxies:
 *   GET {wauper_domain}/{wauper_api_version}/{waba_id}/message_templates?name={name}
 */
export async function fetchApprovedTemplateMetadata(
  config: SailaConfig,
  accessToken: string | null | undefined,
  wabaId: string | null | undefined,
  templateName: string,
  languageCode?: string | null,
): Promise<ApprovedTemplateMetadataResult> {
  const token = String(accessToken ?? "").trim();
  if (!token) return { ok: false, reason: "no_access_token" };
  const wid = String(wabaId ?? "").trim();
  if (!wid) return { ok: false, reason: "no_waba_id" };

  const domain = (config.wauper_domain || "https://crmapi.wauper.com").replace(/\/$/, "");
  const version = config.wauper_api_version || "v1";
  const name = encodeURIComponent(String(templateName).trim());
  const url = `${domain}/${version}/${wid}/message_templates?name=${name}&limit=50`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    console.error("[Saila] Wauper template metadata fetch error:", err?.message || err);
    return { ok: false, reason: "network_error", error: err?.message };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.warn("[Saila] Wauper template metadata fetch non-OK:", response.status, text.slice(0, 200));
    if (response.status === 404) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "network_error", error: `HTTP ${response.status}` };
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch (err: any) {
    return { ok: false, reason: "network_error", error: "Invalid JSON" };
  }

  const candidates: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.templates)
      ? payload.templates
      : Array.isArray(payload)
        ? payload
        : [];

  const namedMatches = candidates.filter((t) => String(t?.name ?? "").trim() === String(templateName).trim());
  if (namedMatches.length === 0) {
    return { ok: false, reason: "not_found" };
  }

  // Prefer a language match when one was requested; otherwise use the first.
  const wantedLang = String(languageCode ?? "").trim().toLowerCase();
  const langMatch = wantedLang
    ? namedMatches.find((t) => String(t?.language ?? "").trim().toLowerCase() === wantedLang)
    : null;
  const tpl = langMatch || namedMatches[0];

  const components: any[] = Array.isArray(tpl?.components) ? tpl.components : [];
  const body = components.find((c) => String(c?.type ?? "").toUpperCase() === "BODY");
  if (!body) {
    // Some templates legitimately have no BODY (e.g. media-only). Treat as zero variables.
    return { ok: true, expectedVariableCount: 0, matchedLanguage: String(tpl?.language ?? "") };
  }

  // Prefer an explicit example.body_text length when present, fall back to
  // counting {{N}} placeholders in the body text.
  let expected = countBodyPlaceholders(String(body?.text ?? ""));
  const exampleRow: unknown = body?.example?.body_text?.[0];
  if (Array.isArray(exampleRow) && exampleRow.length > expected) {
    expected = exampleRow.length;
  }

  return { ok: true, expectedVariableCount: expected, matchedLanguage: String(tpl?.language ?? "") };
}

/**
 * 5-minute in-memory cache for `fetchApprovedTemplateMetadata`.
 *
 * Keyed by (companyId | wabaId | templateName | languageCode). Both the
 * send path and the `/options` endpoint hit this so that the dialog can
 * render N variable inputs based on Meta's live count without paying a
 * Wauper round-trip on every render.
 *
 * Entries are returned even when `ok: false` so transient failures don't
 * cause a thundering herd, but we use a shorter negative TTL (60s) so we
 * recover quickly once the upstream is healthy again.
 */
const APPROVED_TEMPLATE_META_CACHE = new Map<
  string,
  { expiresAt: number; result: ApprovedTemplateMetadataResult }
>();
const APPROVED_TEMPLATE_META_TTL_OK_MS = 5 * 60 * 1000;
const APPROVED_TEMPLATE_META_TTL_FAIL_MS = 60 * 1000;
const APPROVED_TEMPLATE_META_CACHE_MAX = 500;

export async function fetchApprovedTemplateMetadataCached(
  cacheKey: string,
  config: SailaConfig,
  accessToken: string | null | undefined,
  wabaId: string | null | undefined,
  templateName: string,
  languageCode?: string | null,
): Promise<ApprovedTemplateMetadataResult> {
  const now = Date.now();
  const hit = APPROVED_TEMPLATE_META_CACHE.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.result;
  const result = await fetchApprovedTemplateMetadata(
    config,
    accessToken,
    wabaId,
    templateName,
    languageCode,
  );
  if (APPROVED_TEMPLATE_META_CACHE.size >= APPROVED_TEMPLATE_META_CACHE_MAX) {
    // Drop the oldest 25% so the cache doesn't grow unbounded.
    const drop = Math.ceil(APPROVED_TEMPLATE_META_CACHE.size / 4);
    let i = 0;
    for (const k of APPROVED_TEMPLATE_META_CACHE.keys()) {
      if (i++ >= drop) break;
      APPROVED_TEMPLATE_META_CACHE.delete(k);
    }
  }
  const ttl = result.ok ? APPROVED_TEMPLATE_META_TTL_OK_MS : APPROVED_TEMPLATE_META_TTL_FAIL_MS;
  APPROVED_TEMPLATE_META_CACHE.set(cacheKey, { expiresAt: now + ttl, result });
  return result;
}

export function buildApprovedTemplateMetaCacheKey(
  companyId: string,
  wabaId: string | null | undefined,
  templateName: string,
  languageCode?: string | null,
): string {
  return [
    companyId,
    String(wabaId ?? "").trim(),
    String(templateName ?? "").trim(),
    String(languageCode ?? "").trim().toLowerCase(),
  ].join("|");
}

export async function sendWhatsAppApprovedTemplate(
  config: SailaConfig,
  phoneSetting: SailaPhoneSetting,
  recipientPhone: string,
  templateName: string,
  languageCode: string = "en_US",
  bodyParameters: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = (phoneSetting.access_token || "").trim();
  if (!accessToken) return { success: false, error: `No access token configured for channel ${phoneSetting.display_phone_number}` };
  const phoneNumberId = (phoneSetting.waba_phone_number_id || "").trim();
  if (!phoneNumberId) return { success: false, error: `No phone number ID configured for channel ${phoneSetting.display_phone_number}` };

  const domain = (config.wauper_domain || "https://crmapi.wauper.com").replace(/\/$/, "");
  const version = config.wauper_api_version || "v1";

  try {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    const url = `${domain}/api/meta/${version}/${phoneNumberId}/messages`;
    const components: any[] = [];
    if (bodyParameters.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParameters.map((t) => ({ type: "text", text: String(t) })),
      });
    }
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };
    console.log(`[Saila] Sending Approved Template '${templateName}' to ${cleanPhone}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saila] Wauper template send failed:", response.status, errorText);
      return { success: false, error: `Wauper API error: ${response.status} — ${errorText.slice(0, 200)}` };
    }
    const data = await response.json();
    if (data.success === false) {
      return { success: false, error: `Wauper error: ${data.error || "Unknown error"}` };
    }
    return { success: true, messageId: data.id || data.messageId || data.messages?.[0]?.id };
  } catch (err: any) {
    console.error("[Saila] Wauper template send error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendWhatsAppMessage(
  config: SailaConfig,
  phoneSetting: SailaPhoneSetting,
  recipientPhone: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = (phoneSetting.access_token || "").trim();
  if (!accessToken) {
    console.error(`[Saila] No access token configured for channel ${phoneSetting.display_phone_number}`);
    return { success: false, error: `No access token configured for channel ${phoneSetting.display_phone_number}` };
  }

  const phoneNumberId = (phoneSetting.waba_phone_number_id || "").trim();
  if (!phoneNumberId) {
    console.error(`[Saila] No phone number ID configured for channel ${phoneSetting.display_phone_number}`);
    return { success: false, error: `No phone number ID configured for channel ${phoneSetting.display_phone_number}` };
  }

  const domain = (config.wauper_domain || "https://crmapi.wauper.com").replace(/\/$/, "");
  const version = config.wauper_api_version || "v1";

  try {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    // Wauper Session Messaging - Text Message: POST /api/meta/{version}/{phone_number_id}/messages
    const url = `${domain}/api/meta/${version}/${phoneNumberId}/messages`;

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: messageText },
    };

    console.log(`[Saila] Sending Session Message: POST ${url} → to=${cleanPhone} (channel: ${phoneSetting.display_phone_number})`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saila] Wauper send failed:", response.status, errorText);
      return { success: false, error: `Wauper API error: ${response.status} — ${errorText.slice(0, 200)}` };
    }

    const data = await response.json();
    if (data.success === false) {
      const errMsg = data.error || "Unknown error from Wauper";
      console.error("[Saila] Wauper send failed (body):", errMsg);
      return { success: false, error: `Wauper error: ${errMsg}` };
    }
    console.log("[Saila] Wauper send success:", JSON.stringify(data).slice(0, 200));
    return {
      success: true,
      messageId: data.id || data.messageId || data.messages?.[0]?.id,
    };
  } catch (err: any) {
    console.error("[Saila] Wauper send error:", err);
    return { success: false, error: err.message };
  }
}

function detectBookingIntent(messageText: string): { hasIntent: boolean; date?: string; time?: string } {
  const lowerText = messageText.toLowerCase();

  const bookingIndicators = [
    "call", "meeting", "visit", "appointment", "schedule",
    "tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "kal", "aaj", "parso", "milna", "phone", "baat",
    "am", "pm", "morning", "evening", "afternoon",
    "subah", "sham", "dopahar",
  ];

  const hasIntent = bookingIndicators.some(indicator => lowerText.includes(indicator));
  if (!hasIntent) return { hasIntent: false };

  let date: string | undefined;
  let time: string | undefined;

  const dateMatch = messageText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) date = dateMatch[1];

  const today = new Date();
  if (lowerText.includes("today") || lowerText.includes("aaj")) {
    date = today.toISOString().split("T")[0];
  } else if (lowerText.includes("tomorrow") || lowerText.includes("kal")) {
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    date = tom.toISOString().split("T")[0];
  }

  const timeMatch = messageText.match(/(\d{1,2})\s*(am|pm|AM|PM)/);
  if (timeMatch) time = `${timeMatch[1]} ${timeMatch[2].toUpperCase()}`;

  if (lowerText.includes("morning") || lowerText.includes("subah")) time = time || "10 AM";
  if (lowerText.includes("afternoon") || lowerText.includes("dopahar")) time = time || "2 PM";
  if (lowerText.includes("evening") || lowerText.includes("sham")) time = time || "5 PM";

  if (!date) {
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    date = tom.toISOString().split("T")[0];
  }

  return { hasIntent: true, date, time };
}

export async function generateSailaResponse(
  companyId: string,
  senderPhone: string,
  senderName: string,
  executivePhone: string,
  executiveName: string,
  messageText: string,
  leadId?: string,
  referralData?: Record<string, any>
): Promise<SailaResponse> {
  const config = await storage.getSailaConfig(companyId);
  if (!config || !config.enabled) {
    const reason = !config ? "no_config" : "saila_disabled";
    storage.createSailaErrorLog({
      company_id: companyId,
      sender_phone: senderPhone,
      sender_name: senderName || null,
      executive_phone: executivePhone,
      message_text: messageText,
      reason,
      reason_detail: !config ? "No Saila.AI configuration found for this company" : "Saila.AI is disabled in settings",
    }).catch(() => {});
    return { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };
  }

  const phoneSetting = (await storage.getSailaPhoneSettings(companyId))
    .find(s => s.display_phone_number === executivePhone);
  if (!phoneSetting || !phoneSetting.enabled) {
    const reason = !phoneSetting ? "phone_not_found" : "phone_disabled";
    storage.createSailaErrorLog({
      company_id: companyId,
      sender_phone: senderPhone,
      sender_name: senderName || null,
      executive_phone: executivePhone,
      message_text: messageText,
      reason,
      reason_detail: !phoneSetting
        ? `Business number ${executivePhone} is not configured in Saila.AI phone settings`
        : `Business number ${executivePhone} has Saila.AI toggled off`,
    }).catch(() => {});
    return { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };
  }

  const effectiveExecutiveName = phoneSetting.executive_name || executiveName || "Sales Executive";
  const effectiveDesignation = phoneSetting.designation || undefined;

  // Get or create conversation
  let conversation = await storage.getSailaConversationByPhone(companyId, senderPhone, executivePhone);
  let conversationHistory: SailaConversationMessage[] = [];

  if (conversation) {
    conversationHistory = await storage.getSailaConversationMessages(conversation.id);
    await storage.updateSailaConversation(conversation.id, {
      last_message_at: new Date(),
      sender_name: senderName || conversation.sender_name,
    });
  } else {
    conversation = await storage.createSailaConversation({
      company_id: companyId,
      lead_id: leadId || null,
      sender_phone: senderPhone,
      sender_name: senderName || null,
      executive_phone: executivePhone,
      executive_name: effectiveExecutiveName,
      status: "active",
      booking_status: "none",
      last_message_at: new Date(),
    });
  }

  // Record incoming message
  await storage.createSailaConversationMessage({
    conversation_id: conversation.id,
    direction: "incoming",
    message_text: messageText,
    message_type: "text",
    sent_status: "received",
  });

  // ── Saila Intake (highest precedence) ─────────────────────────────────────
  // Continues an in-progress qualifier flow OR starts one when an admin-defined
  // keyword is matched. When intake handles the message, we short-circuit and
  // do NOT invoke Fixed Reply / keyword fast-path / template / LLM.
  // Strict additivity: when handled=false, the rest of this function runs unchanged.
  if (leadId) {
    try {
      const intakeResult = await processInboundForIntake({
        companyId,
        leadId,
        senderPhone,
        senderName: senderName || "",
        businessNumber: executivePhone,
        messageText,
        config,
        phoneSetting,
      });
      if (intakeResult.handled) {
        // Mirror outgoing into conversation messages so admins see it in chat history
        if (intakeResult.responseText) {
          await storage.createSailaConversationMessage({
            conversation_id: conversation.id,
            direction: "outgoing",
            message_text: intakeResult.responseText,
            message_type: "text",
            sent_status: "sent",
            template_used: `intake:${intakeResult.source}`,
          });
        }
        return {
          shouldRespond: !!intakeResult.responseText,
          responseText: intakeResult.responseText,
          confidenceScore: 100,
          source: "keyword",
          keywordMatched: intakeResult.source,
        };
      }
    } catch (err: any) {
      console.error("[Saila] Intake processing error (non-blocking):", err.message);
      storage.createSailaErrorLog({
        company_id: companyId,
        sender_phone: senderPhone,
        sender_name: senderName || null,
        executive_phone: executivePhone,
        message_text: messageText,
        reason: "intake_engine_error",
        reason_detail: err.message,
      }).catch(() => {});
    }
  }

  // ── Fixed Reply Mode ──────────────────────────────────────────────────────
  // Trigger when: Fixed Reply enabled for this phone + message came from a Meta Ad
  // (referralData non-null) + this is exactly the 2nd incoming message within 3 hours
  if (referralData) {
    const fixedReplyConfig = await storage.getSailaFixedReplyConfig(companyId, executivePhone);
    if (fixedReplyConfig?.enabled && fixedReplyConfig.message_template) {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const recentIncoming = conversationHistory.filter(
        m => m.direction === "incoming" && new Date(m.created_at) >= threeHoursAgo
      );
      // conversationHistory is fetched before this message was recorded,
      // so recentIncoming.length === 1 means this IS the 2nd incoming message
      if (recentIncoming.length === 1) {
        const company = await storage.getCompany(companyId);
        const timezone = getCompanyTimezone(company);
        const currentHour = parseInt(
          new Date().toLocaleString("en-GB", { timeZone: timezone, hour: "2-digit", hour12: false }),
          10
        );
        const callTimeSlots = await storage.getSailaCallTimeSlots(companyId);
        const callTimeSlot = callTimeSlots.find(s => currentHour >= s.hour_start && currentHour < s.hour_end);

        if (!callTimeSlot) {
          storage.createSailaErrorLog({
            company_id: companyId,
            sender_phone: senderPhone,
            sender_name: senderName || null,
            executive_phone: executivePhone,
            message_text: messageText,
            reason: "no_call_time_slot",
            reason_detail: `Fixed Reply Mode: no call time slot configured for hour ${currentHour} (${timezone})`,
          }).catch(() => {});
          console.log(`[Saila] Fixed Reply: no call time slot for hour ${currentHour} — skipping`);
          return { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };
        }

        const greetingSlots = await storage.getSailaGreetingSlots(companyId);
        const greetingSlot = greetingSlots.find(s => currentHour >= s.hour_start && currentHour < s.hour_end);
        const greeting = greetingSlot?.greeting_text || "Hello";

        const responseText = fixedReplyConfig.message_template
          .replace(/\{greeting\}/g, greeting)
          .replace(/\{call_time\}/g, callTimeSlot.call_time_label)
          .replace(/\{executive_name\}/g, effectiveExecutiveName);

        const response: SailaResponse = {
          shouldRespond: true,
          responseText,
          confidenceScore: 100,
          source: "fixed_reply",
        };

        await _finalizeAndSend(config, phoneSetting, conversation, senderPhone, executivePhone, conversationHistory, messageText, response, leadId);

        // Create a call commitment so the executive sees it in Call Schedule
        const todayStr = getTodayDateString(timezone);
        storage.createSailaCallCommitment({
          company_id: companyId,
          lead_id: leadId || null,
          sender_phone: senderPhone,
          sender_name: senderName || null,
          executive_phone: executivePhone,
          executive_name: effectiveExecutiveName,
          call_time_label: callTimeSlot.call_time_label,
          call_date: todayStr,
          status: "pending",
        }).catch(err => console.error("[Saila] Failed to create call commitment:", err));

        console.log(`[Saila] Fixed Reply sent to ${senderPhone} (hour ${currentHour}, call time: ${callTimeSlot.call_time_label})`);
        return response;
      }
    }
  }
  // ── End Fixed Reply Mode ──────────────────────────────────────────────────

  // Fast path: keyword exact/starts_with (score >= 85) → respond immediately, skip LLM
  const keywordMatch = await matchKeyword(companyId, messageText);
  if (keywordMatch && keywordMatch.score >= 85 && keywordMatch.keyword.response_text) {
    const text = keywordMatch.keyword.response_text.replace(/\{executive_name\}/g, effectiveExecutiveName);
    const response: SailaResponse = {
      shouldRespond: true,
      responseText: text,
      confidenceScore: keywordMatch.score,
      source: "keyword",
      keywordMatched: keywordMatch.keyword.keyword,
    };
    await _finalizeAndSend(config, phoneSetting, conversation, senderPhone, executivePhone, conversationHistory, messageText, response, leadId);
    return response;
  }

  // Load ALL enabled templates once
  const allEnabledTemplates = await storage.getSailaTemplates(companyId)
    .then(ts => ts.filter(t => t.enabled));

  const allTemplatesWithMessages: TemplateWithMessages[] = await Promise.all(
    allEnabledTemplates.map(async (template) => ({
      template,
      messages: await storage.getSailaTemplateMessages(template.id),
    }))
  );

  // Identify last template used for continuation bonus
  const lastOutgoing = [...conversationHistory]
    .reverse()
    .find(m => m.direction === "outgoing" && m.template_used);
  const lastTemplateUsed = lastOutgoing?.template_used || undefined;

  // Pre-select top 10 most relevant templates
  const top10Templates = selectTopTemplates(
    allTemplatesWithMessages,
    messageText,
    conversationHistory,
    lastTemplateUsed
  );

  console.log(
    `[Saila] Pre-selected ${top10Templates.length} templates from ${allTemplatesWithMessages.length} total for: "${messageText.substring(0, 60)}"`
  );

  // Call Sarvam LLM with full context
  const llmResult = await callSarvamLLM(
    config,
    messageText,
    effectiveExecutiveName,
    conversationHistory,
    config.language,
    top10Templates,
    config.role_prompt || undefined,
    config.instruction_prompt || undefined,
    effectiveDesignation
  );

  let response: SailaResponse;

  if (llmResult && llmResult.confidence >= config.confidence_threshold) {
    response = {
      shouldRespond: true,
      responseText: llmResult.responseText,
      confidenceScore: llmResult.confidence,
      source: "sarvam_llm",
    };
  } else {
    // Fallback: use keyword contains-match if available, otherwise config fallback
    if (keywordMatch && keywordMatch.keyword.response_text) {
      const text = keywordMatch.keyword.response_text.replace(/\{executive_name\}/g, effectiveExecutiveName);
      response = {
        shouldRespond: true,
        responseText: text,
        confidenceScore: keywordMatch.score,
        source: "keyword",
        keywordMatched: keywordMatch.keyword.keyword,
      };
    } else {
      response = {
        shouldRespond: true,
        responseText: config.fallback_message || "Thank you for your message. Our team will get back to you shortly.",
        confidenceScore: 0,
        source: "fallback",
      };
    }
  }

  await _finalizeAndSend(config, phoneSetting, conversation, senderPhone, executivePhone, conversationHistory, messageText, response, leadId);
  return response;
}

async function _finalizeAndSend(
  config: SailaConfig,
  phoneSetting: SailaPhoneSetting,
  conversation: SailaConversation,
  senderPhone: string,
  executivePhone: string,
  conversationHistory: SailaConversationMessage[],
  incomingMessage: string,
  response: SailaResponse,
  leadId?: string
) {
  // Detect booking intent
  const bookingIntent = detectBookingIntent(incomingMessage);
  if (bookingIntent.hasIntent && bookingIntent.date) {
    try {
      await storage.createSailaBooking({
        company_id: conversation.company_id,
        conversation_id: conversation.id,
        lead_id: leadId || null,
        sender_phone: senderPhone,
        sender_name: conversation.sender_name || null,
        executive_phone: executivePhone,
        executive_name: conversation.executive_name,
        booking_date: bookingIntent.date,
        booking_time: bookingIntent.time || null,
        status: "scheduled",
        notes: `Auto-detected from message: "${incomingMessage.substring(0, 200)}"`,
      });
      await storage.updateSailaConversation(conversation.id, { booking_status: "scheduled" });
      console.log(`[Saila] Booking created for ${senderPhone} on ${bookingIntent.date}`);
    } catch (err) {
      console.error("[Saila] Failed to create booking:", err);
    }
  }

  if (response.shouldRespond && response.responseText) {
    // LLM Test Mode: suppress sending for non-keyword/non-fixed-reply sources, but still store the generated response
    const isKeywordSource = response.source === "keyword" || response.source === "fixed_reply";
    const suppressSend = config.llm_test_mode && !isKeywordSource;

    if (suppressSend) {
      await storage.createSailaConversationMessage({
        conversation_id: conversation.id,
        direction: "outgoing",
        message_text: response.responseText,
        message_type: "text",
        confidence_score: response.confidenceScore,
        template_used: response.templateUsed || null,
        keyword_matched: response.keywordMatched || null,
        sent_status: "dry_run",
        wauper_message_id: null,
        send_error: "LLM Test Mode active — response generated but not sent",
      });
      console.log(`[Saila] LLM Test Mode: response generated for ${senderPhone} via ${response.source} (confidence: ${response.confidenceScore}%) — NOT sent`);
    } else {
      const sendResult = await sendWhatsAppMessage(config, phoneSetting, senderPhone, response.responseText);

      await storage.createSailaConversationMessage({
        conversation_id: conversation.id,
        direction: "outgoing",
        message_text: response.responseText,
        message_type: "text",
        confidence_score: response.confidenceScore,
        template_used: response.templateUsed || null,
        keyword_matched: response.keywordMatched || null,
        sent_status: sendResult.success ? "sent" : "failed",
        wauper_message_id: sendResult.messageId || null,
        send_error: sendResult.success ? null : (sendResult.error || "Unknown send error"),
      });

      // Mirror Saila's outgoing message into the lead's update history so
      // executives can see the AI's reply in the lead drawer / history dialog,
      // tagged with the business number it was sent from.
      if (leadId) {
        try {
          const lead = await storage.getLead(leadId);
          if (lead) {
            const today = new Date().toISOString().slice(0, 10);
            const sourceTag = response.source === "fixed_reply"
              ? "Fixed Reply"
              : response.source === "keyword"
                ? `Keyword${response.keywordMatched ? ` (${response.keywordMatched})` : ""}`
                : response.source === "sarvam_llm"
                  ? "AI"
                  : "AI";
            const remarkText = sendResult.success
              ? `Saila ${sourceTag} sent: ${response.responseText}`
              : `Saila ${sourceTag} send failed (${sendResult.error || "Unknown error"}): ${response.responseText}`;
            // Saila replies are sent by the AI engine, not a specific user.
            // Leave created_by_user_id null so the UI doesn't mis-attribute
            // the message to the lead's owner (who may differ from the
            // executive owning the business number).
            await storage.createLeadUpdate({
              lead_id: lead.id,
              update_via: "whatsapp_outgoing",
              update_on: today,
              remark: remarkText,
              whatsapp_message_id: sendResult.messageId || null,
              whatsapp_status: sendResult.success ? "sent" : "failed",
              whatsapp_status_at: new Date(),
              whatsapp_error: sendResult.success ? null : (sendResult.error || null),
              sent_from_phone: executivePhone,
            });
          }
        } catch (err) {
          console.error("[Saila] Failed to mirror outgoing message into lead history:", err);
        }
      }

      console.log(`[Saila] Response sent to ${senderPhone} via ${response.source} (confidence: ${response.confidenceScore}%, status: ${sendResult.success ? "sent" : "failed"})`);
    }
  }
}
