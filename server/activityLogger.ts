import { storage } from "./storage";
import { getCompanyTimezone, formatDateInTimezone, formatDateOnlyInTimezone } from "./timezone-utils";
import type { 
  User, 
  Sheet,
  Lead,
  CustomColumn,
  ActivityAction, 
  ActivityTargetType, 
  ActivityActorRole, 
  ActivitySource,
  FieldChange,
  BulkMeta,
  InsertActivityLog,
} from "@shared/schema";

interface ActorContext {
  user: User;
  source?: ActivitySource;
  ipAddress?: string;
}

interface LogActivityParams {
  actor: ActorContext;
  companyId: string;
  sheetId?: string | null;
  sheetName?: string | null;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId?: string | null;
  targetName?: string | null;
  changes?: FieldChange[];
  bulkMeta?: BulkMeta;
  extra?: Record<string, any>;
}

function getActorRole(user: User): ActivityActorRole {
  if (user.role === "super_admin") return "super_admin";
  if (user.role === "company_admin") return "company_admin";
  return "user";
}

function generateSummary(params: LogActivityParams): string {
  const { actor, action, targetName, targetType, changes, bulkMeta, sheetName, extra } = params;
  const actorName = actor.user.name;
  const target = targetName || "item";
  const sheet = sheetName ? ` in ${sheetName}` : "";

  const summaryTemplates: Record<ActivityAction, () => string> = {
    lead_created: () => `${actorName} added lead ${target}${sheet}`,
    lead_updated: () => {
      if (changes && changes.length > 0) {
        const changeList = changes.slice(0, 3).map(c => c.field_label).join(", ");
        const more = changes.length > 3 ? ` and ${changes.length - 3} more` : "";
        return `${actorName} updated ${target}: ${changeList}${more}`;
      }
      return `${actorName} updated ${target}`;
    },
    cell_cleared: () => {
      if (changes && changes.length > 0) {
        const clearedFields = changes.slice(0, 3).map(c => c.field_label).join(", ");
        const more = changes.length > 3 ? ` and ${changes.length - 3} more` : "";
        return `${actorName} cleared ${clearedFields}${more} for ${target}`;
      }
      return `${actorName} cleared field for ${target}`;
    },
    lead_deleted: () => `${actorName} moved ${target} to trash`,
    lead_restored: () => `${actorName} restored ${target} from trash`,
    lead_permanently_deleted: () => `${actorName} permanently deleted ${target}`,
    lead_transferred: () => {
      const from = extra?.from_user || "previous owner";
      const to = extra?.to_user || "new owner";
      return `${actorName} transferred ${target} from ${from} to ${to}`;
    },
    lead_thought_changed: () => {
      const thought = extra?.thought || "marked";
      return `${actorName} marked ${target} as ${thought}`;
    },
    lead_update_added: () => {
      const remark = extra?.remark_preview ? `: ${extra.remark_preview.substring(0, 50)}...` : "";
      return `${actorName} recorded update for ${target}${remark}`;
    },
    lead_nfdt_changed: () => {
      const nfdt = extra?.nfdt || "new date";
      return `${actorName} set next follow-up for ${target} to ${nfdt}`;
    },
    leads_imported: () => {
      const count = bulkMeta?.count || 0;
      return `${actorName} imported ${count} leads${sheet}`;
    },
    leads_exported: () => {
      const count = bulkMeta?.count || 0;
      return `${actorName} exported ${count} leads${sheet}`;
    },
    leads_bulk_transferred: () => {
      const count = bulkMeta?.count || 0;
      const from = extra?.from_user || "previous owner";
      const to = extra?.to_user || "new owner";
      return `${actorName} transferred ${count} leads from ${from} to ${to}`;
    },
    leads_bulk_deleted: () => {
      const count = bulkMeta?.count || 0;
      return `${actorName} moved ${count} leads to trash`;
    },
    leads_bulk_restored: () => {
      const count = bulkMeta?.count || 0;
      return `${actorName} restored ${count} leads from trash`;
    },
    column_created: () => `${actorName} added column ${target}${sheet}`,
    column_updated: () => {
      if (extra?.old_name && extra?.new_name) {
        return `${actorName} renamed column ${extra.old_name} to ${extra.new_name}`;
      }
      return `${actorName} updated column ${target}`;
    },
    column_deleted: () => `${actorName} removed column ${target}${sheet}`,
    column_reordered: () => `${actorName} changed column order${sheet}`,
    dropdown_option_added: () => {
      const column = extra?.column_name || "column";
      return `${actorName} added option ${target} to ${column}`;
    },
    dropdown_option_updated: () => {
      const column = extra?.column_name || "column";
      return `${actorName} updated option in ${column}`;
    },
    dropdown_option_deleted: () => {
      const column = extra?.column_name || "column";
      return `${actorName} removed option ${target} from ${column}`;
    },
    validation_rule_created: () => `${actorName} created validation rule ${target}`,
    validation_rule_updated: () => `${actorName} updated validation rule ${target}`,
    validation_rule_deleted: () => `${actorName} deleted validation rule ${target}`,
    sheet_created: () => `${actorName} created sheet ${target}`,
    sheet_renamed: () => {
      if (extra?.old_name && extra?.new_name) {
        return `${actorName} renamed sheet from ${extra.old_name} to ${extra.new_name}`;
      }
      return `${actorName} renamed sheet ${target}`;
    },
    sheet_deleted: () => `${actorName} deleted sheet ${target}`,
    user_invited: () => {
      const role = extra?.role || "user";
      return `${actorName} invited ${target} as ${role}`;
    },
    user_role_changed: () => {
      const from = extra?.old_role || "previous role";
      const to = extra?.new_role || "new role";
      return `${actorName} changed ${target}'s role from ${from} to ${to}`;
    },
    user_deactivated: () => `${actorName} deactivated user ${target}`,
    user_reactivated: () => `${actorName} reactivated user ${target}`,
    sheet_access_granted: () => `${actorName} gave ${target} access${sheet}`,
    sheet_access_removed: () => `${actorName} removed ${target}'s access${sheet}`,
    webhook_created: () => `${actorName} created webhook ${target}`,
    webhook_updated: () => `${actorName} updated webhook ${target}`,
    webhook_deleted: () => `${actorName} deleted webhook ${target}`,
    webhook_lead_received: () => {
      const webhook = extra?.webhook_name || "webhook";
      return `New lead ${target} created via ${webhook}`;
    },
    outgoing_webhook_created: () => `${actorName} created outgoing webhook ${target}`,
    outgoing_webhook_updated: () => `${actorName} updated outgoing webhook ${target}`,
    outgoing_webhook_deleted: () => `${actorName} deleted outgoing webhook ${target}`,
    attendance_entry: () => `${actorName} marked attendance entry`,
    attendance_exit: () => `${actorName} marked attendance exit`,
    force_exit_requested: () => {
      const reason = extra?.reason ? `: ${extra.reason}` : "";
      return `${actorName} requested force exit${reason}`;
    },
    force_exit_approved: () => `${actorName} approved ${target}'s force exit`,
    force_exit_rejected: () => `${actorName} rejected ${target}'s force exit`,
    user_login: () => `${actorName} logged in`,
    user_logout: () => `${actorName} logged out`,
    api_key_created: () => `${actorName} created API key ${target}`,
    api_key_revoked: () => `${actorName} revoked API key ${target}`,
    quick_filter_created: () => `${actorName} created quick filter ${target}`,
    quick_filter_updated: () => `${actorName} updated quick filter ${target}`,
    quick_filter_deleted: () => `${actorName} deleted quick filter ${target}`,
    call_session_created: () => {
      const direction = extra?.direction || "call";
      return `${actorName} logged ${direction} call${target ? ` with ${target}` : ""}`;
    },
    call_session_updated: () => `${actorName} updated call session`,
  };

  const template = summaryTemplates[action];
  return template ? template() : `${actorName} performed ${action}`;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const summary = generateSummary(params);
    
    const log: InsertActivityLog = {
      company_id: params.companyId,
      sheet_id: params.sheetId || null,
      user_id: params.actor.user.id,
      actor_name: params.actor.user.name,
      actor_email: params.actor.user.email,
      actor_role: getActorRole(params.actor.user),
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      target_name: params.targetName || null,
      sheet_name: params.sheetName || null,
      summary,
      details: {
        changes: params.changes,
        bulk_meta: params.bulkMeta,
        extra: params.extra,
      },
      source: params.actor.source || "ui",
      ip_address: params.actor.ipAddress || null,
    };
    
    await storage.createActivityLog(log);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export function computeFieldChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  columns: CustomColumn[],
  timezone?: string
): FieldChange[] {
  const changes: FieldChange[] = [];
  const columnMap = new Map(columns.map(c => [c.column_key, c]));
  const tz = timezone || "Asia/Kolkata";
  
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  
  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      const column = columnMap.get(key);
      const fieldLabel = column?.name || key;
      
      let oldDisplay = formatValue(oldValue, column, tz);
      let newDisplay = formatValue(newValue, column, tz);
      
      changes.push({
        field_key: key,
        field_label: fieldLabel,
        old_value: oldValue,
        new_value: newValue,
        old_display: oldDisplay,
        new_display: newDisplay,
      });
    }
  }
  
  return changes;
}

function formatValue(value: any, column?: CustomColumn, timezone?: string): string {
  if (value === null || value === undefined || value === "") {
    return "(empty)";
  }
  
  const tz = timezone || "Asia/Kolkata";
  
  if (column?.type === "date" && value) {
    try {
      return formatDateOnlyInTimezone(value, tz);
    } catch {
      return String(value);
    }
  }
  
  if (column?.type === "datetime" && value) {
    try {
      return formatDateInTimezone(value, tz);
    } catch {
      return String(value);
    }
  }
  
  if (column?.type === "boolean") {
    return value ? "Yes" : "No";
  }
  
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  
  return String(value);
}

export async function logLeadCreated(
  actor: ActorContext,
  lead: Lead,
  sheet: Sheet,
  columns: CustomColumn[]
): Promise<void> {
  const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "New Lead";
  
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "lead_created",
    targetType: "lead",
    targetId: lead.id,
    targetName: leadName,
  });
}

function isEmptyValue(value: any): boolean {
  return value === null || value === undefined || value === "" || 
    (Array.isArray(value) && value.length === 0);
}

export async function logLeadUpdated(
  actor: ActorContext,
  lead: Lead,
  oldCustomFields: Record<string, any>,
  newCustomFields: Record<string, any>,
  sheet: Sheet,
  columns: CustomColumn[]
): Promise<void> {
  const company = await storage.getCompany(sheet.company_id);
  const timezone = getCompanyTimezone(company);
  const changes = computeFieldChanges(oldCustomFields, newCustomFields, columns, timezone);
  
  if (changes.length === 0) return;
  
  const leadName = newCustomFields.full_name || newCustomFields.name || lead.custom_fields?.full_name || "Lead";
  
  const clearedChanges = changes.filter(c => !isEmptyValue(c.old_value) && isEmptyValue(c.new_value));
  const updatedChanges = changes.filter(c => isEmptyValue(c.old_value) || !isEmptyValue(c.new_value));
  
  if (clearedChanges.length > 0) {
    await logActivity({
      actor,
      companyId: sheet.company_id,
      sheetId: sheet.id,
      sheetName: sheet.name,
      action: "cell_cleared",
      targetType: "lead",
      targetId: lead.id,
      targetName: leadName,
      changes: clearedChanges,
    });
  }
  
  if (updatedChanges.length > 0) {
    await logActivity({
      actor,
      companyId: sheet.company_id,
      sheetId: sheet.id,
      sheetName: sheet.name,
      action: "lead_updated",
      targetType: "lead",
      targetId: lead.id,
      targetName: leadName,
      changes: updatedChanges,
    });
  }
}

export async function logLeadDeleted(
  actor: ActorContext,
  lead: Lead,
  sheet: Sheet
): Promise<void> {
  const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Lead";
  
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "lead_deleted",
    targetType: "lead",
    targetId: lead.id,
    targetName: leadName,
  });
}

export async function logLeadRestored(
  actor: ActorContext,
  lead: Lead,
  sheet: Sheet
): Promise<void> {
  const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Lead";
  
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "lead_restored",
    targetType: "lead",
    targetId: lead.id,
    targetName: leadName,
  });
}

export async function logLeadUpdateAdded(
  actor: ActorContext,
  lead: Lead,
  remark: string,
  sheet: Sheet
): Promise<void> {
  const leadName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Lead";
  
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "lead_update_added",
    targetType: "lead_update",
    targetId: lead.id,
    targetName: leadName,
    extra: {
      remark_preview: remark.substring(0, 100),
    },
  });
}

export async function logBulkImport(
  actor: ActorContext,
  companyId: string,
  sheetId: string,
  sheetName: string,
  count: number,
  sampleLeadNames: string[]
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId,
    sheetName,
    action: "leads_imported",
    targetType: "leads",
    bulkMeta: {
      count,
      sample_items: sampleLeadNames.slice(0, 5),
    },
  });
}

export async function logBulkExport(
  actor: ActorContext,
  companyId: string,
  sheetId: string,
  sheetName: string,
  count: number
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId,
    sheetName,
    action: "leads_exported",
    targetType: "leads",
    bulkMeta: {
      count,
    },
  });
}

export async function logBulkTransfer(
  actor: ActorContext,
  companyId: string,
  sheetId: string,
  sheetName: string,
  count: number,
  fromUserName: string,
  toUserName: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId,
    sheetName,
    action: "leads_bulk_transferred",
    targetType: "leads",
    bulkMeta: {
      count,
    },
    extra: {
      from_user: fromUserName,
      to_user: toUserName,
    },
  });
}

export async function logBulkDelete(
  actor: ActorContext,
  companyId: string,
  sheetId: string,
  sheetName: string,
  count: number,
  sampleLeadNames: string[]
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId,
    sheetName,
    action: "leads_bulk_deleted",
    targetType: "leads",
    bulkMeta: {
      count,
      sample_items: sampleLeadNames.slice(0, 5),
    },
  });
}

export async function logColumnCreated(
  actor: ActorContext,
  companyId: string,
  column: CustomColumn,
  sheetName?: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId: column.sheet_id,
    sheetName,
    action: "column_created",
    targetType: "column",
    targetId: column.id,
    targetName: column.name,
  });
}

export async function logColumnUpdated(
  actor: ActorContext,
  companyId: string,
  column: CustomColumn,
  oldName?: string,
  sheetName?: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    sheetId: column.sheet_id,
    sheetName,
    action: "column_updated",
    targetType: "column",
    targetId: column.id,
    targetName: column.name,
    extra: oldName ? { old_name: oldName, new_name: column.name } : undefined,
  });
}

export async function logColumnDeleted(
  actor: ActorContext,
  companyId: string,
  columnName: string,
  columnId: string,
  sheetName?: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "column_deleted",
    targetType: "column",
    targetId: columnId,
    targetName: columnName,
    sheetName,
  });
}

export async function logSheetCreated(
  actor: ActorContext,
  sheet: Sheet
): Promise<void> {
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "sheet_created",
    targetType: "sheet",
    targetId: sheet.id,
    targetName: sheet.name,
  });
}

export async function logSheetDeleted(
  actor: ActorContext,
  sheet: Sheet
): Promise<void> {
  await logActivity({
    actor,
    companyId: sheet.company_id,
    sheetId: sheet.id,
    sheetName: sheet.name,
    action: "sheet_deleted",
    targetType: "sheet",
    targetId: sheet.id,
    targetName: sheet.name,
  });
}

export async function logUserInvited(
  actor: ActorContext,
  companyId: string,
  invitedEmail: string,
  role: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "user_invited",
    targetType: "user",
    targetName: invitedEmail,
    extra: { role },
  });
}

export async function logUserRoleChanged(
  actor: ActorContext,
  companyId: string,
  targetUser: User,
  oldRole: string,
  newRole: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "user_role_changed",
    targetType: "user",
    targetId: targetUser.id,
    targetName: targetUser.name,
    extra: { old_role: oldRole, new_role: newRole },
  });
}

export async function logAttendanceEntry(
  actor: ActorContext,
  companyId: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "attendance_entry",
    targetType: "attendance",
    targetName: actor.user.name,
  });
}

export async function logAttendanceExit(
  actor: ActorContext,
  companyId: string,
  exitType: "normal" | "forced"
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "attendance_exit",
    targetType: "attendance",
    targetName: actor.user.name,
    extra: { exit_type: exitType },
  });
}

export async function logForceExitRequested(
  actor: ActorContext,
  companyId: string,
  reason: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "force_exit_requested",
    targetType: "attendance",
    targetName: actor.user.name,
    extra: { reason },
  });
}

export async function logApiKeyCreated(
  actor: ActorContext,
  companyId: string,
  keyName: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "api_key_created",
    targetType: "api_key",
    targetName: keyName,
  });
}

export async function logApiKeyRevoked(
  actor: ActorContext,
  companyId: string,
  keyName: string
): Promise<void> {
  await logActivity({
    actor,
    companyId,
    action: "api_key_revoked",
    targetType: "api_key",
    targetName: keyName,
  });
}

export async function logWebhookLeadReceived(
  companyId: string,
  sheetId: string,
  sheetName: string,
  leadName: string,
  leadId: string,
  webhookName: string
): Promise<void> {
  const log: InsertActivityLog = {
    company_id: companyId,
    sheet_id: sheetId,
    user_id: null,
    actor_name: "System",
    actor_email: null,
    actor_role: "system",
    action: "webhook_lead_received",
    target_type: "lead",
    target_id: leadId,
    target_name: leadName,
    sheet_name: sheetName,
    summary: `New lead ${leadName} created via ${webhookName}`,
    details: {
      extra: { webhook_name: webhookName },
    },
    source: "webhook",
    ip_address: null,
  };
  
  try {
    await storage.createActivityLog(log);
  } catch (error) {
    console.error("Failed to log webhook lead:", error);
  }
}

export async function logUserLogin(
  actor: ActorContext,
  companyId: string | null
): Promise<void> {
  if (!companyId) return;
  
  await logActivity({
    actor,
    companyId,
    action: "user_login",
    targetType: "user",
    targetId: actor.user.id,
    targetName: actor.user.name,
  });
}
