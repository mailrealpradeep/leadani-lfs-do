import { storage } from "./storage";
import type { 
  WhatsAppMessageLogRecord, 
  WhatsAppTriggerRuleRecord, 
  WhatsAppAllocationRecord,
  Lead
} from "@shared/schema";

export type MessageOutcome = 
  | "new_lead_created" 
  | "transfer_request_created" 
  | "followup_added" 
  | "ignored_no_match" 
  | "ignored_no_trigger" 
  | "error";

export interface ProcessedMessageResult {
  success: boolean;
  outcome: MessageOutcome;
  message: string;
  leadId?: string;
  transferRequestId?: string;
}

export function normalizePhoneNumber(phone: string): string {
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  return digitsOnly.slice(-10);
}

function evaluateCondition(
  operator: string,
  messageText: string,
  matchText: string
): boolean {
  const lowerMessage = (messageText || "").toLowerCase();
  const lowerMatch = matchText.toLowerCase();

  switch (operator) {
    case "contains":
      return lowerMessage.includes(lowerMatch);
    case "not_contains":
      return !lowerMessage.includes(lowerMatch);
    case "equals":
      return lowerMessage === lowerMatch;
    case "not_equals":
      return lowerMessage !== lowerMatch;
    case "starts_with":
      return lowerMessage.startsWith(lowerMatch);
    case "ends_with":
      return lowerMessage.endsWith(lowerMatch);
    default:
      return lowerMessage.includes(lowerMatch);
  }
}

// Helper to extract value from nested object using dot notation path
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export interface TriggerContext {
  messageText: string;
  referral?: {
    source_type?: string;
    source_id?: string;
    source_url?: string;
    headline?: string;
    body?: string;
    media_type?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export function evaluateTriggerRules(
  rules: WhatsAppTriggerRuleRecord[],
  messageText: string,
  context?: TriggerContext
): WhatsAppTriggerRuleRecord | null {
  if (!rules || rules.length === 0) {
    return null;
  }

  const activeRules = rules.filter(r => r.enabled).sort((a, b) => a.order_index - b.order_index);
  if (activeRules.length === 0) {
    return null;
  }

  for (const rule of activeRules) {
    const matchType = (rule as any).match_type || 'text';
    const fieldPath = (rule as any).field_path;
    
    let valueToMatch: string;
    
    if (matchType === 'field' && fieldPath && context) {
      // Field-based matching: extract value from webhook payload context
      const fieldValue = getNestedValue(context, fieldPath);
      
      // If field doesn't exist or is null/undefined, skip this rule (no match)
      // This ensures field-based rules only match when the field actually exists
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }
      
      // Convert to string, preserving falsy values like 0 and false
      valueToMatch = String(fieldValue);
    } else {
      // Text-based matching: use message text
      valueToMatch = messageText;
    }
    
    if (evaluateCondition(rule.operator, valueToMatch, rule.match_text)) {
      return rule;
    }
  }

  return null;
}

export async function findExistingLeadByPhone(
  companyId: string,
  normalizedPhone: string
): Promise<{ lead: Lead; sheetId: string } | null> {
  const sheets = await storage.getCompanySheets(companyId);
  
  for (const sheet of sheets) {
    const leads = await storage.getLeadsForSheet(sheet.id);
    
    for (const lead of leads) {
      if (lead.deleted_at) continue;
      
      // Check multiple common phone field keys
      const phoneFields = ['mobile_no', 'phone', 'mobile', 'contact_number', 'phone_number'];
      let leadPhone = "";
      
      if (lead.custom_fields) {
        for (const field of phoneFields) {
          if (lead.custom_fields[field]) {
            leadPhone = String(lead.custom_fields[field]);
            break;
          }
        }
      }
      
      const normalizedLeadPhone = normalizePhoneNumber(leadPhone);
      
      if (normalizedLeadPhone === normalizedPhone) {
        return { lead, sheetId: sheet.id };
      }
    }
  }
  
  return null;
}

export async function processWhatsAppMessage(
  log: WhatsAppMessageLogRecord
): Promise<ProcessedMessageResult> {
  try {
    const companyId = log.company_id;
    const senderName = log.sender_name || "";
    const senderPhone = log.sender_phone;
    const messageText = log.message_text || "";
    const displayPhoneNumber = log.display_phone_number;
    
    const normalizedPhone = normalizePhoneNumber(senderPhone);
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      await storage.updateWhatsAppMessageLog(log.id, {
        outcome: "error",
        outcome_details: { error: "Invalid or missing phone number" },
        processed_at: new Date()
      });
      return {
        success: false,
        outcome: "error",
        message: "Invalid or missing phone number"
      };
    }

    const triggerRules = await storage.getWhatsAppTriggerRules(companyId);
    
    // Parse referral_data - it may come as a JSON string from the database
    let referralData: Record<string, any> | undefined;
    try {
      const rawReferral = (log as any).referral_data;
      if (rawReferral) {
        referralData = typeof rawReferral === 'string' ? JSON.parse(rawReferral) : rawReferral;
      }
    } catch (e) {
      console.error("[WhatsApp Processor] Failed to parse referral_data:", e);
      referralData = undefined;
    }
    
    // Build context with referral data for field-based trigger matching
    const triggerContext: TriggerContext = {
      messageText,
      referral: referralData,
    };
    
    const matchedRule = evaluateTriggerRules(triggerRules, messageText, triggerContext);
    
    // Check for existing lead first - we need this whether trigger matches or not
    const existingLead = await findExistingLeadByPhone(companyId, normalizedPhone);
    
    if (!matchedRule) {
      // No trigger match, but if there's an existing lead, still add follow-up
      if (existingLead) {
        console.log("[WhatsApp Processor] No trigger match, but existing lead found - adding follow-up");
        const remarkText = `WA Update: ${messageText}`;
        const today = new Date().toISOString().split('T')[0];
        
        await storage.createLeadUpdate({
          lead_id: existingLead.lead.id,
          update_via: "whatsapp",
          update_on: today,
          remark: remarkText,
          created_by_user_id: existingLead.lead.owner_user_id
        });
        
        await storage.updateWhatsAppMessageLog(log.id, {
          outcome: "followup_added",
          trigger_matched: false,
          matched_rule_id: null,
          outcome_details: { 
            lead_id: existingLead.lead.id, 
            action: "followup_added",
            reason: "No trigger match but existing lead found" 
          },
          processed_at: new Date()
        });
        
        return {
          success: true,
          outcome: "followup_added",
          message: "Follow-up added to existing lead (no trigger match)",
          leadId: existingLead.lead.id
        };
      }
      
      // No trigger match and no existing lead - truly ignore
      await storage.updateWhatsAppMessageLog(log.id, {
        outcome: "ignored_no_trigger",
        trigger_matched: false,
        outcome_details: { reason: "No trigger rules matched and no existing lead" },
        processed_at: new Date()
      });
      return {
        success: true,
        outcome: "ignored_no_trigger",
        message: "No trigger rules matched this message"
      };
    }

    // Trigger matched - use existing lead variable (already fetched above)

    if (existingLead) {
      const allocation = await findAllocationByPhone(companyId, displayPhoneNumber);
      
      if (!allocation) {
        const followupResult = await addFollowupToLead(existingLead.lead, log, messageText, senderName, matchedRule.id);
        return followupResult;
      }

      if (existingLead.lead.owner_user_id === allocation.user_id || existingLead.lead.sheet_id === allocation.sheet_id) {
        if (existingLead.lead.sheet_id === allocation.sheet_id && existingLead.lead.owner_user_id !== allocation.user_id) {
          console.log("[WhatsApp Processor] Lead already in same sheet (different owner) - adding follow-up instead of transfer request");
        }
        const followupResult = await addFollowupToLead(existingLead.lead, log, messageText, senderName, matchedRule.id);
        return followupResult;
      } else {
        const transferResult = await createTransferRequest(existingLead, allocation, log, messageText, senderName, matchedRule.id);
        return transferResult;
      }
    } else {
      const allocation = await findAllocationByPhone(companyId, displayPhoneNumber);
      
      if (!allocation) {
        await storage.updateWhatsAppMessageLog(log.id, {
          outcome: "ignored_no_match",
          trigger_matched: true,
          matched_rule_id: matchedRule.id,
          outcome_details: { reason: "No phone allocation found for this WhatsApp number" },
          processed_at: new Date()
        });
        return {
          success: true,
          outcome: "ignored_no_match",
          message: "No phone allocation found for this WhatsApp number"
        };
      }

      const createResult = await createNewLead(companyId, allocation, log, normalizedPhone, messageText, senderName, matchedRule.id);
      return createResult;
    }
  } catch (error: any) {
    console.error("[WhatsApp Processor] Error processing message:", error);
    await storage.updateWhatsAppMessageLog(log.id, {
      outcome: "error",
      outcome_details: { error: error.message || "Unknown error" },
      processed_at: new Date()
    });
    return {
      success: false,
      outcome: "error",
      message: error.message || "Unknown error processing message"
    };
  }
}

async function findAllocationByPhone(
  companyId: string,
  displayPhoneNumber: string
): Promise<WhatsAppAllocationRecord | null> {
  const allocations = await storage.getWhatsAppAllocations(companyId);
  
  const normalizedDisplay = normalizePhoneNumber(displayPhoneNumber);
  
  for (const alloc of allocations) {
    if (!alloc.enabled) continue;
    const normalizedAlloc = normalizePhoneNumber(alloc.display_phone_number);
    if (normalizedAlloc === normalizedDisplay) {
      return alloc;
    }
  }
  
  return null;
}

async function addFollowupToLead(
  lead: Lead,
  log: WhatsAppMessageLogRecord,
  messageText: string,
  senderName: string,
  matchedRuleId: string
): Promise<ProcessedMessageResult> {
  const remarkText = `WA Update: ${messageText}`;
  const today = new Date().toISOString().split('T')[0];
  
  await storage.createLeadUpdate({
    lead_id: lead.id,
    update_via: "whatsapp",
    update_on: today,
    remark: remarkText,
    created_by_user_id: lead.owner_user_id
  });
  
  await storage.updateWhatsAppMessageLog(log.id, {
    outcome: "followup_added",
    trigger_matched: true,
    matched_rule_id: matchedRuleId,
    outcome_details: { lead_id: lead.id, action: "followup_added" },
    processed_at: new Date()
  });
  
  return {
    success: true,
    outcome: "followup_added",
    message: `Follow-up added to existing lead`,
    leadId: lead.id
  };
}

async function createTransferRequest(
  existingLead: { lead: Lead; sheetId: string },
  allocation: WhatsAppAllocationRecord,
  log: WhatsAppMessageLogRecord,
  messageText: string,
  senderName: string,
  matchedRuleId: string
): Promise<ProcessedMessageResult> {
  const fromUser = await storage.getUser(existingLead.lead.owner_user_id);
  const toUser = await storage.getUser(allocation.user_id);
  const companyId = log.company_id;
  
  const transferSettings = await storage.getWhatsAppTransferSettings(companyId);
  
  const columnKey = transferSettings?.column_key || 'status';
  const fieldKey = columnKey === 'status' ? 'lead_status' : columnKey;
  const currentValue = existingLead.lead.custom_fields?.[fieldKey] || "";
  const currentValueLower = String(currentValue).toLowerCase().trim();
  const autoResetStatuses = (transferSettings?.auto_reset_statuses || []).map((s: string) => s.toLowerCase().trim());
  const shouldAutoReset = transferSettings?.enabled && autoResetStatuses.includes(currentValueLower);
  const shouldAutoApprove = transferSettings?.enabled && transferSettings?.auto_approve_enabled && autoResetStatuses.includes(currentValueLower);
  
  if (shouldAutoReset && transferSettings?.reset_to_status) {
    const updatedFields = { ...existingLead.lead.custom_fields, [fieldKey]: transferSettings.reset_to_status };
    await storage.updateLead(existingLead.lead.id, { custom_fields: updatedFields });
    console.log(`[WhatsApp Processor] Auto-reset ${fieldKey} from "${currentValue}" to "${transferSettings.reset_to_status}"`);
  }
  
  const transferRequest = await storage.createLeadTransferRequest({
    lead_id: existingLead.lead.id,
    from_sheet_id: existingLead.sheetId,
    to_sheet_id: allocation.sheet_id,
    requested_by_user_id: allocation.user_id,
    status: shouldAutoApprove ? "approved" : "pending"
  });
  
  if (shouldAutoApprove) {
    await storage.updateLead(existingLead.lead.id, { 
      sheet_id: allocation.sheet_id,
      owner_user_id: allocation.user_id
    });
    
    await storage.approveLeadTransferRequest(transferRequest.id, allocation.user_id);
    
    const fromSheet = await storage.getSheet(existingLead.sheetId);
    const toSheet = await storage.getSheet(allocation.sheet_id);
    const today = new Date().toISOString().split('T')[0];
    
    await storage.createLeadUpdate({
      lead_id: existingLead.lead.id,
      update_via: "transfer",
      update_on: today,
      remark: `Auto-approved WhatsApp transfer from "${fromSheet?.name || 'Unknown'}" to "${toSheet?.name || 'Unknown'}" (${fieldKey} was "${currentValue}")`,
      created_by_user_id: allocation.user_id,
    });
    
    console.log(`[WhatsApp Processor] Auto-approved transfer for lead ${existingLead.lead.id} (${fieldKey}: "${currentValue}")`);
  }
  
  await storage.updateWhatsAppMessageLog(log.id, {
    outcome: "transfer_request_created",
    trigger_matched: true,
    matched_rule_id: matchedRuleId,
    outcome_details: { 
      lead_id: existingLead.lead.id, 
      transfer_request_id: transferRequest.id,
      from_user: fromUser?.name,
      to_user: toUser?.name,
      auto_approved: shouldAutoApprove || false,
      auto_reset: shouldAutoReset || false,
      original_value: currentValue,
      column_key: columnKey,
      reset_to: shouldAutoReset ? transferSettings?.reset_to_status : undefined
    },
    processed_at: new Date()
  });
  
  const autoApproveMsg = shouldAutoApprove ? " (auto-approved)" : "";
  return {
    success: true,
    outcome: "transfer_request_created",
    message: `Transfer request created from ${fromUser?.name || 'Unknown'} to ${toUser?.name || 'Unknown'}${autoApproveMsg}`,
    leadId: existingLead.lead.id,
    transferRequestId: transferRequest.id
  };
}

async function createNewLead(
  companyId: string,
  allocation: WhatsAppAllocationRecord,
  log: WhatsAppMessageLogRecord,
  normalizedPhone: string,
  messageText: string,
  senderName: string,
  matchedRuleId: string
): Promise<ProcessedMessageResult> {
  const fieldMappings = await storage.getWhatsAppFieldMappings(companyId);
  const defaultValues = await storage.getWhatsAppDefaultValues(companyId);
  
  const customFields: Record<string, any> = {};
  
  for (const defaultVal of defaultValues) {
    if (defaultVal.enabled) {
      customFields[defaultVal.column_key] = defaultVal.default_value;
    }
  }
  
  for (const mapping of fieldMappings) {
    if (!mapping.enabled) continue;
    
    let value: any = null;
    
    switch (mapping.whatsapp_field) {
      case "sender_name":
        value = log.sender_name || "";
        break;
      case "sender_phone":
        value = normalizedPhone;
        break;
      case "message_text":
        value = log.message_text || "";
        break;
      case "display_phone_number":
        value = log.display_phone_number || "";
        break;
      default:
        value = "";
    }
    
    if (value) {
      customFields[mapping.column_key] = value;
    }
  }
  
  if (!customFields.mobile_no) {
    customFields.mobile_no = normalizedPhone;
  }
  if (!customFields.name && senderName) {
    customFields.name = senderName;
  }
  
  const lead = await storage.createLead({
    sheet_id: allocation.sheet_id,
    owner_user_id: allocation.user_id,
    custom_fields: customFields,
    meta: { source: "whatsapp" }
  });
  
  const today = new Date().toISOString().split('T')[0];
  const remarkText = `WA Update: ${messageText}`;
  await storage.createLeadUpdate({
    lead_id: lead.id,
    update_via: "whatsapp",
    update_on: today,
    remark: remarkText,
    created_by_user_id: allocation.user_id
  });
  
  await storage.updateWhatsAppMessageLog(log.id, {
    outcome: "new_lead_created",
    trigger_matched: true,
    matched_rule_id: matchedRuleId,
    outcome_details: { lead_id: lead.id, action: "new_lead_created" },
    processed_at: new Date()
  });
  
  return {
    success: true,
    outcome: "new_lead_created",
    message: `New lead created and assigned to user`,
    leadId: lead.id
  };
}

export async function processPendingWhatsAppMessages(companyId: string): Promise<{
  processed: number;
  results: ProcessedMessageResult[];
}> {
  // Get pending logs (status = 'pending') - these are messages that haven't been processed yet
  const { logs: pendingLogs } = await storage.getWhatsAppMessageLogs(companyId, { limit: 1000, status: 'pending' });
  // Also get pending_configuration logs (waiting for config but need to be retried)
  const { logs: pendingConfigLogs } = await storage.getWhatsAppMessageLogs(companyId, { limit: 1000, status: 'pending_configuration' });
  
  const allPendingLogs = [...pendingLogs, ...pendingConfigLogs];
  
  const results: ProcessedMessageResult[] = [];
  
  for (const log of allPendingLogs) {
    const result = await processWhatsAppMessage(log);
    results.push(result);
  }
  
  return {
    processed: allPendingLogs.length,
    results
  };
}
