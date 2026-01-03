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

  if (result.isNew) {
    const { awarded, pending } = await awardLeadUpdatePoints(
      {
        userId,
        companyId,
        companyTimezone,
        leadId,
        sheetId,
      },
      dropdownChanges,
      { isFollowupEvent: true }  // Enable followup rule processing for new deduped events
    );
    return { isNew: true, eventId: result.eventId, pointsAwarded: awarded, pointsPending: pending };
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
