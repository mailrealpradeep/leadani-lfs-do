import { storage } from "./storage";
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
  source: "template" | "keyword" | "sarvam_llm" | "fallback" | "none";
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

export async function sendWhatsAppMessage(
  config: SailaConfig,
  recipientPhone: string,
  messageText: string,
  _fromPhoneNumber?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const keySource = process.env.WAUPER_API_KEY ? "env" : "db-config";
  const apiKey = (process.env.WAUPER_API_KEY || config.wauper_api_key || "").trim();
  if (!apiKey) {
    console.error("[Saila] No Wauper API key configured (checked env + db)");
    return { success: false, error: "No Wauper API key configured" };
  }

  const domain = (config.wauper_domain || "https://crmapi.wauper.com").replace(/\/$/, "");
  const version = config.wauper_api_version || "v1";

  try {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    // Wauper Omni Channel API: POST /api/v1/messages
    const url = `${domain}/api/${version}/messages`;

    const body = {
      to: cleanPhone,
      type: "text",
      text: { body: messageText },
    };

    console.log(`[Saila] Sending to Wauper: POST ${url} → to=${cleanPhone} (key source: ${keySource})`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saila] Wauper send failed:", response.status, errorText);
      return { success: false, error: `Wauper API error: ${response.status} — ${errorText.slice(0, 200)}` };
    }

    const data = await response.json();
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
  leadId?: string
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
    await _finalizeAndSend(config, conversation, senderPhone, executivePhone, conversationHistory, messageText, response, leadId);
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

  await _finalizeAndSend(config, conversation, senderPhone, executivePhone, conversationHistory, messageText, response, leadId);
  return response;
}

async function _finalizeAndSend(
  config: SailaConfig,
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
    const sendResult = await sendWhatsAppMessage(config, senderPhone, response.responseText, executivePhone);

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

    console.log(`[Saila] Response sent to ${senderPhone} via ${response.source} (confidence: ${response.confidenceScore}%, status: ${sendResult.success ? "sent" : "failed"})`);
  }
}
