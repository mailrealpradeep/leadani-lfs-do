import { storage } from "./storage";
import type { 
  WhatsAppMessageLogRecord, 
  WhatsAppTriggerRuleRecord, 
  WhatsAppAllocationRecord,
  WhatsAppAllocationSplit,
  Lead
} from "@shared/schema";
import { generateSailaResponse } from "./saila-engine";
import { getTodayDateString } from "./timezone-utils";

// Helper: get column keys protected by final value settings with block_automations enabled
function getAutomationBlockedFinalValues(companySettings: any): Map<string, Set<string>> {
  const blocked = new Map<string, Set<string>>();
  const rules = companySettings?.final_value_settings || [];
  for (const rule of rules) {
    if (rule.enabled && rule.block_automations && rule.column_key && rule.final_values?.length > 0) {
      blocked.set(rule.column_key, new Set(rule.final_values));
    }
  }
  return blocked;
}

// Helper: check if a specific field change is blocked by final value automation protection
function isFieldChangeBlocked(
  existingCustomFields: Record<string, any>,
  columnKey: string,
  newValue: string,
  blockedMap: Map<string, Set<string>>
): boolean {
  const finalValues = blockedMap.get(columnKey);
  if (!finalValues) return false;
  const currentValue = existingCustomFields?.[columnKey];
  return currentValue && finalValues.has(currentValue) && newValue !== currentValue;
}

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

async function triggerSailaAI(
  companyId: string,
  senderPhone: string,
  senderName: string,
  displayPhoneNumber: string,
  messageText: string,
  leadId?: string,
  referralData?: Record<string, any>,
  inboundMessageTimestamp?: Date | null
): Promise<void> {
  try {
    await generateSailaResponse(
      companyId,
      senderPhone,
      senderName,
      displayPhoneNumber,
      "",
      messageText,
      leadId,
      referralData,
      inboundMessageTimestamp || null
    );
  } catch (err) {
    console.error("[WhatsApp Processor] Saila.AI error (non-blocking):", err);
  }
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

    // WhatsApp-reported send time (parsed from messages[].timestamp by the webhook).
    // Plumbed into Saila Intake so rapid follow-ups typed BEFORE the bot's most recent
    // question can be detected and not mis-attributed to the next question.
    const waInboundTs: Date | null = (log as any).wa_message_timestamp
      ? new Date((log as any).wa_message_timestamp)
      : null;

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
      // No trigger match, but if there's an existing lead, check allocation before deciding what to do
      if (existingLead) {
        // Check if the existing lead is assigned to a user/sheet that is NOT in the allocation
        // config for this WA business number. If so, create a transfer request to the correct
        // allocated user/sheet instead of blindly adding a follow-up in the wrong place.
        const allocationForNoTrigger = await findAllocationByPhone(companyId, displayPhoneNumber);

        if (
          allocationForNoTrigger &&
          existingLead.lead.owner_user_id !== allocationForNoTrigger.user_id &&
          existingLead.lead.sheet_id !== allocationForNoTrigger.sheet_id
        ) {
          // Existing lead is NOT in the allocated sheet/user — re-route via transfer request.
          // Pass an empty string as matchedRuleId (no rule matched); createTransferRequest
          // accepts this for the message log.
          console.log(
            "[WhatsApp Processor] No trigger match, existing lead not in allocation — creating transfer request"
          );
          const transferResult = await createTransferRequest(
            existingLead,
            allocationForNoTrigger,
            log,
            messageText,
            senderName,
            null // no matched rule
          );
          // Override outcome_details reason for observability
          await storage.updateWhatsAppMessageLog(log.id, {
            outcome_details: {
              ...((transferResult as { transferRequestId?: string }).transferRequestId
                ? { transfer_request_id: (transferResult as { transferRequestId?: string }).transferRequestId }
                : {}),
              lead_id: existingLead.lead.id,
              reason: "No trigger match — existing lead not in allocation config",
            },
          });
          triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, existingLead.lead.id, referralData, waInboundTs).catch(() => {});
          return transferResult;
        }

        // Existing lead IS in the allocated sheet/user (or no allocation configured) — add follow-up as before.
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
        
        triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, existingLead.lead.id, referralData, waInboundTs).catch(() => {});

        return {
          success: true,
          outcome: "followup_added",
          message: "Follow-up added to existing lead (no trigger match)",
          leadId: existingLead.lead.id
        };
      }

      // No existing lead — check if the allocation for this phone has catch-all enabled
      const catchAllAllocation = await findAllocationByPhone(companyId, displayPhoneNumber);
      if (catchAllAllocation?.catch_all_enabled) {
        console.log("[WhatsApp Processor] No trigger match, no existing lead, but catch-all enabled — creating new lead");
        const createResult = await createNewLead(companyId, catchAllAllocation, log, normalizedPhone, messageText, senderName, null);
        return createResult;
      }
      
      // Saila Intake fallback: if the message matches an intake keyword AND there's an
      // allocation for the business number, auto-create the lead so intake can run on it.
      try {
        const intakeStore = await import("./saila-intake-storage");
        const { pickMatchingTrigger } = await import("./saila-intake-engine");
        const triggers = await intakeStore.listAllIntakeTriggersForCompany(companyId);
        const matchedTrig = pickMatchingTrigger(triggers, messageText, displayPhoneNumber);
        if (matchedTrig) {
          const allocation = await findAllocationByPhone(companyId, displayPhoneNumber);
          if (allocation) {
            console.log(`[WhatsApp Processor] No trigger rule, but intake keyword "${matchedTrig.keyword}" matched — auto-creating lead`);
            const createResult = await createNewLead(companyId, allocation, log, normalizedPhone, messageText, senderName, null);
            return createResult;
          }
        }
      } catch (intakeErr) {
        console.error("[WhatsApp Processor] Intake auto-create check failed (non-fatal):", intakeErr);
      }

      triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, undefined, referralData, waInboundTs).catch(() => {});

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
        triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, existingLead.lead.id, referralData, waInboundTs).catch(() => {});
        return followupResult;
      }

      if (existingLead.lead.owner_user_id === allocation.user_id || existingLead.lead.sheet_id === allocation.sheet_id) {
        if (existingLead.lead.sheet_id === allocation.sheet_id && existingLead.lead.owner_user_id !== allocation.user_id) {
          console.log("[WhatsApp Processor] Lead already in same sheet (different owner) - adding follow-up instead of transfer request");
        }
        const followupResult = await addFollowupToLead(existingLead.lead, log, messageText, senderName, matchedRule.id);
        triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, existingLead.lead.id, referralData, waInboundTs).catch(() => {});
        return followupResult;
      } else {
        const transferResult = await createTransferRequest(existingLead, allocation, log, messageText, senderName, matchedRule.id);
        triggerSailaAI(companyId, senderPhone, senderName, displayPhoneNumber, messageText, existingLead.lead.id, referralData, waInboundTs).catch(() => {});
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

// Weighted round-robin: pick the split entry most under its target percentage for today
async function pickSplitAllocation(
  companyId: string,
  displayPhoneNumber: string,
  splits: WhatsAppAllocationSplit[],
  timezone: string
): Promise<WhatsAppAllocationSplit> {
  const today = getTodayDateString(timezone);
  const dailyCount = await storage.getWhatsAppAllocationDailyCount(companyId, displayPhoneNumber, today);
  const counts: Record<string, number> = dailyCount?.counts ? { ...dailyCount.counts } : {};

  // Total leads assigned today
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Find which split is most under its target ratio (weighted round-robin)
  // deficit = target_ratio - actual_ratio; pick the user with the highest deficit
  // When total=0, all actual_ratios are 0 so highest-target user wins first
  let bestSplit = splits[0];
  let bestDeficit = -Infinity;
  for (const split of splits) {
    const assigned = counts[split.user_id] ?? 0;
    const target = split.percentage / 100;
    const currentRatio = total === 0 ? 0 : assigned / total;
    const deficit = target - currentRatio;
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      bestSplit = split;
    }
  }

  // Increment and persist
  counts[bestSplit.user_id] = (counts[bestSplit.user_id] ?? 0) + 1;
  await storage.upsertWhatsAppAllocationDailyCount(companyId, displayPhoneNumber, today, counts);

  return bestSplit;
}

async function findAllocationByPhone(
  companyId: string,
  displayPhoneNumber: string
): Promise<WhatsAppAllocationRecord | null> {
  const normalizedDisplay = normalizePhoneNumber(displayPhoneNumber);

  // Check for split allocation first
  // We need to match by normalized phone - find the canonical display_phone_number used for splits
  const allAllocations = await storage.getWhatsAppAllocations(companyId);
  const matchingAlloc = allAllocations.find(a => {
    if (!a.enabled) return false;
    return normalizePhoneNumber(a.display_phone_number) === normalizedDisplay;
  });

  if (!matchingAlloc) return null;

  // Check if this phone has split rules configured
  const splits = await storage.getWhatsAppAllocationSplits(companyId, matchingAlloc.display_phone_number);
  if (splits.length >= 2) {
    // Use split mode: weighted round-robin
    const company = await storage.getCompany(companyId);
    const timezone = (company?.settings as any)?.timezone || "UTC";
    const chosen = await pickSplitAllocation(companyId, matchingAlloc.display_phone_number, splits, timezone);
    // Return a WhatsAppAllocationRecord-compatible object using the split's user/sheet
    return {
      ...matchingAlloc,
      user_id: chosen.user_id,
      sheet_id: chosen.sheet_id,
    };
  }

  // Single mode: return the allocation as-is
  return matchingAlloc;
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
  
  const followupOwner = await storage.getUser(lead.owner_user_id);
  await storage.updateWhatsAppMessageLog(log.id, {
    outcome: "followup_added",
    trigger_matched: true,
    matched_rule_id: matchedRuleId,
    outcome_details: {
      lead_id: lead.id,
      action: "followup_added",
      allocated_to_name: followupOwner?.name || null,
      allocated_to_user_id: lead.owner_user_id
    },
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
  matchedRuleId: string | null
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
    // Check final value protection before auto-resetting
    const company = await storage.getCompany(companyId);
    const blockedMap = getAutomationBlockedFinalValues(company?.settings);
    if (!isFieldChangeBlocked(existingLead.lead.custom_fields || {}, fieldKey, transferSettings.reset_to_status, blockedMap)) {
      const updatedFields = { ...existingLead.lead.custom_fields, [fieldKey]: transferSettings.reset_to_status };
      await storage.updateLead(existingLead.lead.id, { custom_fields: updatedFields });
      console.log(`[WhatsApp Processor] Auto-reset ${fieldKey} from "${currentValue}" to "${transferSettings.reset_to_status}"`);
    } else {
      console.log(`[WhatsApp Processor] Skipped auto-reset of ${fieldKey} - value "${currentValue}" is protected by final value settings`);
    }
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
    trigger_matched: matchedRuleId !== null && matchedRuleId !== "",
    matched_rule_id: matchedRuleId || null,
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
  matchedRuleId: string | null
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
      case "referral_source_id":
        try {
          const rawRef = (log as any).referral_data;
          if (rawRef) {
            const refData = typeof rawRef === 'string' ? JSON.parse(rawRef) : rawRef;
            value = refData?.source_id || "";
          }
        } catch (e) {
          value = "";
        }
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
  
  const allocatedUser = await storage.getUser(allocation.user_id);
  await storage.updateWhatsAppMessageLog(log.id, {
    outcome: "new_lead_created",
    trigger_matched: matchedRuleId !== null,
    matched_rule_id: matchedRuleId,
    outcome_details: {
      lead_id: lead.id,
      action: "new_lead_created",
      via: matchedRuleId === null ? 'catch_all' : 'trigger',
      allocated_to_name: allocatedUser?.name || null,
      allocated_to_user_id: allocation.user_id
    },
    processed_at: new Date()
  });
  
  triggerSailaAI(
    companyId,
    log.sender_phone || normalizedPhone,
    senderName,
    log.display_phone_number || "",
    messageText,
    lead.id,
    undefined,
    (log as any).wa_message_timestamp ? new Date((log as any).wa_message_timestamp) : null,
  ).catch(() => {});

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
  // Get pending logs (outcome = 'pending') - these are messages that haven't been processed yet
  const { logs: pendingLogs } = await storage.getWhatsAppMessageLogs(companyId, { limit: 1000, outcome: 'pending' });
  // Also get pending_configuration logs (waiting for config but need to be retried)
  const { logs: pendingConfigLogs } = await storage.getWhatsAppMessageLogs(companyId, { limit: 1000, outcome: 'pending_configuration' });
  
  const allPendingLogs = [...pendingLogs, ...pendingConfigLogs];

  // Check if any allocation for this company has catch-all enabled
  // If so, also retry previously-ignored "ignored_no_trigger" logs for phones covered by catch-all allocations
  const allocations = await storage.getWhatsAppAllocations(companyId);
  const catchAllDisplayPhones = new Set(
    allocations
      .filter(a => a.enabled && a.catch_all_enabled)
      .map(a => normalizePhoneNumber(a.display_phone_number))
  );

  if (catchAllDisplayPhones.size > 0) {
    const { logs: ignoredLogs } = await storage.getWhatsAppMessageLogs(companyId, { limit: 1000, outcome: 'ignored_no_trigger' });
    const existingIds = new Set(allPendingLogs.map(l => l.id));
    for (const log of ignoredLogs) {
      const normalizedDisplay = normalizePhoneNumber(log.display_phone_number);
      if (catchAllDisplayPhones.has(normalizedDisplay) && !existingIds.has(log.id)) {
        // Include this log for reprocessing — processWhatsAppMessage will re-evaluate catch-all eligibility
        allPendingLogs.push(log);
        existingIds.add(log.id);
      }
    }
  }
  
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
