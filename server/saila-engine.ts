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

async function matchTemplate(
  companyId: string,
  messageText: string,
  conversationContext?: ConversationContext
): Promise<{ template: SailaTemplate; response: SailaTemplateMessage; score: number } | null> {
  const templates = await storage.getSailaTemplates(companyId);
  const enabledTemplates = templates.filter(t => t.enabled);
  if (enabledTemplates.length === 0) return null;

  let bestMatch: { template: SailaTemplate; response: SailaTemplateMessage; score: number } | null = null;

  for (const template of enabledTemplates) {
    const messages = await storage.getSailaTemplateMessages(template.id);
    const incomingMessages = messages.filter(m => m.direction === "incoming").sort((a, b) => a.order_index - b.order_index);
    const outgoingMessages = messages.filter(m => m.direction === "outgoing").sort((a, b) => a.order_index - b.order_index);

    if (incomingMessages.length === 0 || outgoingMessages.length === 0) continue;

    if (conversationContext && conversationContext.messages.length > 0) {
      const prevMessages = conversationContext.messages;
      const lastIncomingIdx = prevMessages.filter(m => m.direction === "incoming").length;

      if (lastIncomingIdx < incomingMessages.length) {
        const expectedIncoming = incomingMessages[lastIncomingIdx];
        const score = computeStringSimilarity(messageText, expectedIncoming.message_text);
        if (score > 30 && outgoingMessages.length > lastIncomingIdx) {
          const responseMsg = outgoingMessages[lastIncomingIdx];
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { template, response: responseMsg, score };
          }
        }
      }
    }

    for (const incoming of incomingMessages) {
      const score = computeStringSimilarity(messageText, incoming.message_text);
      if (score > 40) {
        const idx = incomingMessages.indexOf(incoming);
        const responseMsg = idx < outgoingMessages.length ? outgoingMessages[idx] : outgoingMessages[0];
        if (responseMsg && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { template, response: responseMsg, score };
        }
      }
    }
  }

  return bestMatch;
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
  conversationHistory: string[],
  language: string
): Promise<{ responseText: string; confidence: number } | null> {
  if (!config.sarvam_api_key) {
    console.log("[Saila] No Sarvam API key configured, skipping LLM");
    return null;
  }

  try {
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

    const conversationContext = conversationHistory.length > 0
      ? `\nPrevious conversation:\n${conversationHistory.slice(-6).join("\n")}`
      : "";

    const systemPrompt = `You are ${executiveName}, a friendly and professional sales executive for a real estate/construction company. Your goal is to engage with potential customers, understand their needs, and schedule a call or site visit. ${languageInstruction}

Key guidelines:
- Be warm, professional, and conversational
- Always try to move the conversation towards booking a call or visit
- If the customer asks about pricing, say you'd love to discuss details on a call
- If they seem interested, suggest specific dates/times for a call
- Never be pushy, be helpful and informative
- Keep responses concise (2-3 sentences max)
- If someone mentions a date/time for a call, confirm it enthusiastically${conversationContext}`;

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

    const confidence = 65;
    return { responseText: text, confidence };
  } catch (err) {
    console.error("[Saila] Sarvam API call failed:", err);
    return null;
  }
}

export async function sendWhatsAppMessage(
  config: SailaConfig,
  recipientPhone: string,
  messageText: string,
  fromPhoneNumber?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.wauper_api_key) {
    console.error("[Saila] No Wauper API key configured");
    return { success: false, error: "No Wauper API key configured" };
  }

  const domain = config.wauper_domain || "https://live-mt-server.wati.io";
  const version = config.wauper_api_version || "v2";

  try {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    let url = `${domain}/api/${version}/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(messageText)}`;
    if (fromPhoneNumber) {
      const cleanFrom = fromPhoneNumber.replace(/\D/g, "");
      url += `&whatsappNumber=${encodeURIComponent(cleanFrom)}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.wauper_api_key}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saila] Wauper send failed:", response.status, errorText);
      return { success: false, error: `Wauper API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id || data.messageId || data.result?.id,
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
    return { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };
  }

  const phoneSetting = (await storage.getSailaPhoneSettings(companyId))
    .find(s => s.display_phone_number === executivePhone);
  if (!phoneSetting || !phoneSetting.enabled) {
    return { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };
  }

  const effectiveExecutiveName = phoneSetting.executive_name || executiveName || "Sales Executive";

  let conversation = await storage.getSailaConversationByPhone(companyId, senderPhone, executivePhone);
  let conversationContext: ConversationContext | undefined;

  if (conversation) {
    const messages = await storage.getSailaConversationMessages(conversation.id);
    conversationContext = { messages, conversation };
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
    conversationContext = { messages: [], conversation };
  }

  await storage.createSailaConversationMessage({
    conversation_id: conversation.id,
    direction: "incoming",
    message_text: messageText,
    message_type: "text",
    sent_status: "received",
  });

  const conversationHistory = conversationContext
    ? conversationContext.messages.slice(-10).map(m => `${m.direction === "incoming" ? "Customer" : effectiveExecutiveName}: ${m.message_text}`)
    : [];

  let response: SailaResponse = { shouldRespond: false, responseText: "", confidenceScore: 0, source: "none" };

  const keywordMatch = await matchKeyword(companyId, messageText);
  if (keywordMatch && keywordMatch.keyword.response_text) {
    const text = keywordMatch.keyword.response_text.replace(/\{executive_name\}/g, effectiveExecutiveName);
    response = {
      shouldRespond: true,
      responseText: text,
      confidenceScore: keywordMatch.score,
      source: "keyword",
      keywordMatched: keywordMatch.keyword.keyword,
    };
  }

  if (!response.shouldRespond || response.confidenceScore < 70) {
    const templateMatch = await matchTemplate(companyId, messageText, conversationContext);
    if (templateMatch && templateMatch.score > (response.confidenceScore || 0)) {
      const text = templateMatch.response.message_text.replace(/\{executive_name\}/g, effectiveExecutiveName);
      response = {
        shouldRespond: true,
        responseText: text,
        confidenceScore: templateMatch.score,
        source: "template",
        templateUsed: templateMatch.template.name,
      };
    }
  }

  if (!response.shouldRespond || response.confidenceScore < config.confidence_threshold) {
    const llmResult = await callSarvamLLM(
      config,
      messageText,
      effectiveExecutiveName,
      conversationHistory,
      config.language
    );
    if (llmResult) {
      const combinedConfidence = response.shouldRespond
        ? Math.max(response.confidenceScore, llmResult.confidence)
        : llmResult.confidence;

      if (combinedConfidence >= (response.confidenceScore || 0)) {
        response = {
          shouldRespond: true,
          responseText: llmResult.responseText,
          confidenceScore: combinedConfidence,
          source: "sarvam_llm",
        };
      }
    }
  }

  if (response.confidenceScore < config.confidence_threshold) {
    response = {
      shouldRespond: true,
      responseText: config.fallback_message || "Thank you for your message. Our team will get back to you shortly.",
      confidenceScore: config.confidence_threshold - 1,
      source: "fallback",
    };
  }

  const bookingIntent = detectBookingIntent(messageText);
  if (bookingIntent.hasIntent && bookingIntent.date) {
    try {
      await storage.createSailaBooking({
        company_id: companyId,
        conversation_id: conversation.id,
        lead_id: leadId || null,
        sender_phone: senderPhone,
        sender_name: senderName || null,
        executive_phone: executivePhone,
        executive_name: effectiveExecutiveName,
        booking_date: bookingIntent.date,
        booking_time: bookingIntent.time || null,
        status: "scheduled",
        notes: `Auto-detected from message: "${messageText.substring(0, 200)}"`,
      });
      await storage.updateSailaConversation(conversation.id, {
        booking_status: "scheduled",
      });
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
    });

    console.log(`[Saila] Response sent to ${senderPhone} via ${response.source} (confidence: ${response.confidenceScore}%, status: ${sendResult.success ? "sent" : "failed"})`);
  }

  return response;
}