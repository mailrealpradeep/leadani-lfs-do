import { storage } from "./storage";
import { Lead, OutgoingWebhook, InsertOutgoingWebhookLog } from "@shared/schema";
import { createHmac } from "crypto";
import { outboundSuppressed } from "./outbound";

export type WebhookEventType = 
  | "lead_created"
  | "lead_updated"
  | "field_changed"
  | "lead_update_added"
  | "lead_transferred";

interface WebhookEventData {
  lead: Lead;
  sheetId: string;
  companyId: string;
  userId?: string;
  beforeFields?: Record<string, any>;
  afterFields?: Record<string, any>;
  changedFields?: string[];
  updateText?: string;
  transferredFromUserId?: string;
  transferredToUserId?: string;
}

interface FieldCondition {
  field: string;
  operator: "equals" | "not_equals" | "changed_from" | "changed_to" | "changed_from_to" | "any_change";
  value?: string;
  fromValue?: string;
  toValue?: string;
}

export function triggerOutgoingWebhooks(
  eventType: WebhookEventType,
  eventData: WebhookEventData
): void {
  processWebhooksInBackground(eventType, eventData).catch(error => {
    console.error("[WebhookTrigger] Error in background webhook processing:", error);
  });
}

async function processWebhooksInBackground(
  eventType: WebhookEventType,
  eventData: WebhookEventData
): Promise<void> {
  try {
    const webhooks = await storage.getActiveOutgoingWebhooksByCompanyId(eventData.companyId);
    
    if (webhooks.length === 0) {
      return;
    }

    const matchingWebhooks = webhooks.filter(webhook => 
      shouldTriggerWebhook(webhook, eventType, eventData)
    );

    if (matchingWebhooks.length === 0) {
      return;
    }

    console.log(`[WebhookTrigger] Firing ${matchingWebhooks.length} webhook(s) for ${eventType} event`);

    await Promise.allSettled(
      matchingWebhooks.map(webhook => 
        executeWebhookWithRetry(webhook, eventType, eventData, 0)
      )
    );
    
    console.log(`[WebhookTrigger] Completed processing ${matchingWebhooks.length} webhook(s) for ${eventType}`);
  } catch (error) {
    console.error("[WebhookTrigger] Error processing webhooks:", error);
  }
}

function shouldTriggerWebhook(
  webhook: OutgoingWebhook,
  eventType: WebhookEventType,
  eventData: WebhookEventData
): boolean {
  const events = webhook.events as string[];
  if (!events || !events.includes(eventType)) {
    return false;
  }

  const sheetIds = webhook.sheet_ids as string[];
  if (sheetIds && sheetIds.length > 0) {
    if (!sheetIds.includes(eventData.sheetId)) {
      return false;
    }
  }

  if (eventType === "field_changed" || eventType === "lead_updated") {
    const fieldConditions = webhook.field_conditions as FieldCondition[];
    if (fieldConditions && fieldConditions.length > 0) {
      const conditionsMet = evaluateFieldConditions(
        fieldConditions,
        eventData.beforeFields || {},
        eventData.afterFields || {},
        eventData.changedFields || []
      );
      if (!conditionsMet) {
        return false;
      }
    }
  }

  return true;
}

function evaluateFieldConditions(
  conditions: FieldCondition[],
  beforeFields: Record<string, any>,
  afterFields: Record<string, any>,
  changedFields: string[]
): boolean {
  return conditions.some(condition => {
    const { field, operator, value, fromValue, toValue } = condition;
    const fieldBefore = beforeFields[field];
    const fieldAfter = afterFields[field];
    const fieldChanged = changedFields.includes(field);

    switch (operator) {
      case "equals":
        return String(fieldAfter) === String(value);
      
      case "not_equals":
        return String(fieldAfter) !== String(value);
      
      case "changed_from":
        return fieldChanged && String(fieldBefore) === String(fromValue);
      
      case "changed_to":
        return fieldChanged && String(fieldAfter) === String(toValue);
      
      case "changed_from_to":
        return fieldChanged && 
               String(fieldBefore) === String(fromValue) && 
               String(fieldAfter) === String(toValue);
      
      case "any_change":
        return changedFields.includes(field);
      
      default:
        return false;
    }
  });
}

async function executeWebhookWithRetry(
  webhook: OutgoingWebhook,
  eventType: WebhookEventType,
  eventData: WebhookEventData,
  attempt: number = 0
): Promise<void> {
  const maxRetries = webhook.retry_count || 3;
  const payload = buildWebhookPayload(webhook, eventType, eventData);
  
  try {
    const result = await sendWebhookRequest(webhook, payload);
    
    await logWebhookExecution(
      webhook.id,
      eventType,
      eventData.lead.id,
      payload,
      result.status,
      result.body,
      result.success ? "success" : "failed",
      result.error || null,
      attempt
    );

    if (!result.success && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[WebhookTrigger] Retrying webhook ${webhook.id} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      await executeWebhookWithRetry(webhook, eventType, eventData, attempt + 1);
    }
  } catch (error: any) {
    console.error(`[WebhookTrigger] Webhook execution error:`, error);
    
    await logWebhookExecution(
      webhook.id,
      eventType,
      eventData.lead.id,
      payload,
      0,
      "",
      "failed",
      error.message,
      attempt
    );

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await executeWebhookWithRetry(webhook, eventType, eventData, attempt + 1);
    }
  }
}

function buildWebhookPayload(
  webhook: OutgoingWebhook,
  eventType: WebhookEventType,
  eventData: WebhookEventData
): Record<string, any> {
  const lead = eventData.lead;
  const customFields = lead.custom_fields as Record<string, any> || {};
  const meta = lead.meta as Record<string, any> || {};
  
  let leadData: Record<string, any> = {
    id: lead.id,
    sheet_id: lead.sheet_id,
    owner_user_id: lead.owner_user_id,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    ...customFields,
    ...meta,
  };

  const selectedFields = webhook.selected_fields as string[];
  if (selectedFields && selectedFields.length > 0) {
    const filteredData: Record<string, any> = { id: lead.id };
    selectedFields.forEach(field => {
      if (field in leadData) {
        filteredData[field] = leadData[field];
      }
    });
    leadData = filteredData;
  }

  const payload: Record<string, any> = {
    event: eventType,
    timestamp: new Date().toISOString(),
    webhook_id: webhook.id,
    webhook_name: webhook.name,
    data: {
      lead: leadData,
    }
  };

  if (eventType === "field_changed" && eventData.changedFields) {
    payload.data.changed_fields = eventData.changedFields;
    payload.data.before = {};
    payload.data.after = {};
    
    eventData.changedFields.forEach(field => {
      if (eventData.beforeFields) {
        payload.data.before[field] = eventData.beforeFields[field];
      }
      if (eventData.afterFields) {
        payload.data.after[field] = eventData.afterFields[field];
      }
    });
  }

  if (eventType === "lead_update_added" && eventData.updateText) {
    payload.data.update_text = eventData.updateText;
  }

  if (eventType === "lead_transferred") {
    payload.data.transferred_from_user_id = eventData.transferredFromUserId;
    payload.data.transferred_to_user_id = eventData.transferredToUserId;
  }

  return payload;
}

async function sendWebhookRequest(
  webhook: OutgoingWebhook,
  payload: Record<string, any>
): Promise<{ success: boolean; status: number; body: string; error?: string }> {
  if (outboundSuppressed("webhook", webhook.url)) {
    return { success: false, status: 0, body: "", error: "Outbound integrations are disabled on this deployment" };
  }

  const payloadString = JSON.stringify(payload);
  
  const signature = webhook.secret 
    ? createHmac("sha256", webhook.secret).update(payloadString).digest("hex")
    : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "LeadAni-Webhook/1.0",
    ...((webhook.headers as Record<string, string>) || {}),
  };
  
  if (signature) {
    headers["X-LeadAni-Signature"] = signature;
    headers["X-LeadAni-Timestamp"] = new Date().toISOString();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text();
    
    return {
      success: response.ok,
      status: response.status,
      body: responseBody.substring(0, 5000),
      error: response.ok ? undefined : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 0,
      body: "",
      error: error.name === "AbortError" ? "Request timeout (30s)" : error.message,
    };
  }
}

async function logWebhookExecution(
  webhookId: string,
  eventType: string,
  leadId: string,
  payload: Record<string, any>,
  responseStatus: number,
  responseBody: string,
  status: "success" | "failed",
  errorMessage: string | null,
  retryAttempt: number
): Promise<void> {
  try {
    await storage.createOutgoingWebhookLog({
      webhook_id: webhookId,
      event_type: eventType,
      lead_id: leadId,
      payload_sent: payload,
      response_status: responseStatus,
      response_body: responseBody,
      status,
      error_message: errorMessage,
      retry_attempt: retryAttempt,
    });
  } catch (error) {
    console.error("[WebhookTrigger] Failed to log webhook execution:", error);
  }
}

export function getChangedFields(
  beforeFields: Record<string, any>,
  afterFields: Record<string, any>
): string[] {
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)]);
  
  allKeys.forEach(key => {
    const beforeValue = beforeFields[key];
    const afterValue = afterFields[key];
    
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
}

export function flattenLeadFields(lead: Lead): Record<string, any> {
  const customFields = lead.custom_fields as Record<string, any> || {};
  const meta = lead.meta as Record<string, any> || {};
  
  return {
    id: lead.id,
    sheet_id: lead.sheet_id,
    owner_user_id: lead.owner_user_id,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    ...customFields,
    ...meta,
  };
}
