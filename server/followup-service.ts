import { storage } from "./storage";
import type { FollowupEventType } from "@shared/schema";
import { awardLeadUpdatePoints } from "./powerscore-service";

interface FollowupContext {
  userId: string;
  companyId: string;
  companyTimezone: string;
  sheetId: string;
  leadId: string;
}

interface DropdownChange {
  columnKey: string;
  oldValue: string | null;
  newValue: string | null;
}

interface FinalValueRule {
  id: string;
  column_key: string;
  final_values: string[];
  enabled: boolean;
}

/**
 * Check if a dropdown change is to a final stage value (major scoring point).
 * Final stage values are configured in Admin Console → Final Value Settings.
 * These should always award points, ignoring the 1-minute deduplication window.
 */
function isFinalStageChange(change: DropdownChange, finalValueSettings: FinalValueRule[]): boolean {
  if (!change.newValue || !finalValueSettings || finalValueSettings.length === 0) {
    return false;
  }

  // Find enabled rule for this column
  const rule = finalValueSettings.find(r => 
    r.enabled && r.column_key === change.columnKey
  );

  if (!rule || !rule.final_values || rule.final_values.length === 0) {
    return false;
  }

  // Case-insensitive comparison against configured final values
  return rule.final_values.some(finalValue => 
    finalValue.toLowerCase().trim() === change.newValue?.toLowerCase().trim()
  );
}

/**
 * Check if any dropdown change in the array is a final stage change.
 * Uses company's Final Value Settings from Admin Console.
 */
function hasFinalStageChange(dropdownChanges: DropdownChange[], finalValueSettings: FinalValueRule[]): boolean {
  return dropdownChanges.some(change => isFinalStageChange(change, finalValueSettings));
}

export async function recordFollowupAndAwardPoints(
  context: FollowupContext,
  eventTypes: FollowupEventType[],
  dropdownChanges: DropdownChange[] = []
): Promise<{ isNew: boolean; eventId: string; pointsAwarded: number; pointsPending: number }> {
  const { userId, companyId, companyTimezone, sheetId, leadId } = context;

  const result = await storage.recordFollowupEvent({
    companyId,
    sheetId,
    leadId,
    userId,
    eventTypes,
  });

  // Fetch company's Final Value Settings from Admin Console to determine which values bypass deduplication
  let finalValueSettings: FinalValueRule[] = [];
  try {
    const company = await storage.getCompany(companyId);
    const rawSettings = company?.settings?.final_value_settings;
    if (Array.isArray(rawSettings)) {
      // Validate each rule has required fields before using
      finalValueSettings = rawSettings.filter((rule: unknown): rule is FinalValueRule => {
        if (!rule || typeof rule !== 'object') return false;
        const r = rule as Record<string, unknown>;
        return (
          typeof r.column_key === 'string' &&
          Array.isArray(r.final_values) &&
          typeof r.enabled === 'boolean'
        );
      });
    }
  } catch (err) {
    console.error("Error fetching final value settings:", err);
  }

  // Always award points for dropdown changes to final stage values (configured in Admin Console),
  // even if the followup event was deduplicated. These are major scoring points, not regular updates.
  const shouldAwardPoints = result.isNew || hasFinalStageChange(dropdownChanges, finalValueSettings);

  if (shouldAwardPoints) {
    const { awarded, pending } = await awardLeadUpdatePoints(
      {
        userId,
        companyId,
        companyTimezone,
        leadId,
        sheetId,
      },
      dropdownChanges,
      { isFollowupEvent: result.isNew }  // Only process followup rules for new deduped events
    );
    return { isNew: result.isNew, eventId: result.eventId, pointsAwarded: awarded, pointsPending: pending };
  }

  return { isNew: false, eventId: result.eventId, pointsAwarded: 0, pointsPending: 0 };
}

export function detectFollowupEventTypes(params: {
  hasRemarkUpdate: boolean;
  hasDropdownChanges: boolean;
  hasDateFieldChanges: boolean;
  hasFieldUpdate: boolean;
}): FollowupEventType[] {
  const types: FollowupEventType[] = [];
  
  if (params.hasRemarkUpdate) types.push("remark");
  if (params.hasDropdownChanges) types.push("dropdown_change");
  if (params.hasDateFieldChanges) types.push("date_change");
  if (params.hasFieldUpdate) types.push("field_update");
  
  if (types.length === 0) {
    types.push("field_update");
  }
  
  return types;
}
