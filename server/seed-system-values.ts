import { storage } from "./storage";
import type { SystemColumnType, InsertSystemValueDefinition } from "@shared/schema";

const SYSTEM_VALUES: Record<SystemColumnType, string[]> = {
  lead_status: [
    "New Lead",
    "Not Connected",
    "Contacted",
    "Follow Up",
    "Interested",
    "Not Interested",
    "Visit Scheduled",
    "Visited",
    "Revisit Required",
    "Negotiation",
    "Converted",
    "Invalid Data",
    "Final Stage",
    "Lost",
  ],
  visit_status: [
    "Scheduled",
    "Visited",
    "Rescheduled",
    "No Show",
    "Cancelled",
  ],
  visit_type: [
    "Site Visit",
    "Office Visit",
    "Online Meeting",
    "Phone Meeting",
    "Home Visit",
    "Branch Visit",
  ],
  lost_reason: [
    "Financial Issue",
    "Value Issue",
    "Trust Issue",
    "Eligibility Issue",
    "Lost to Competitor",
    "Timing not correct",
    "Location Mismatch",
    "Repeated No Response",
    "Reason not disclosed",
    "Repeat Lead",
  ],
};

export async function seedSystemValueDefinitions(): Promise<{ created: number; skipped: number }> {
  console.log("[Seed] Starting system value definitions seed...");
  
  const existing = await storage.getSystemValueDefinitions();
  const existingMap = new Map(existing.map(v => [`${v.column_type}:${v.value}`, v]));
  
  let created = 0;
  let skipped = 0;
  
  for (const [columnType, values] of Object.entries(SYSTEM_VALUES)) {
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const key = `${columnType}:${value}`;
      
      if (existingMap.has(key)) {
        skipped++;
        continue;
      }
      
      const definition: InsertSystemValueDefinition = {
        column_type: columnType as SystemColumnType,
        value,
        display_order: i,
        is_active: true,
      };
      
      await storage.createSystemValueDefinition(definition);
      created++;
      console.log(`[Seed] Created: ${columnType} -> ${value}`);
    }
  }
  
  console.log(`[Seed] Completed. Created: ${created}, Skipped: ${skipped}`);
  
  // Sync is_system flag for all companies' dropdown options
  await syncIsSystemFlagForAllCompanies();
  
  return { created, skipped };
}

/**
 * Maps system column types (used in SYSTEM_VALUES) to the actual column keys used in dropdown_options table.
 * Verified from database: column_key values are lead_status, lost_reason, visit_status, visit_type
 */
const SYSTEM_COLUMN_KEY_MAP: Record<SystemColumnType, string> = {
  lead_status: 'lead_status',
  visit_status: 'visit_status',
  visit_type: 'visit_type',
  lost_reason: 'lost_reason',
};

/**
 * Ensures all dropdown options that match system values have is_system: true for ALL companies.
 * Only updates options whose value matches the canonical system values - preserves custom user options.
 */
async function syncIsSystemFlagForAllCompanies(): Promise<void> {
  console.log("[Seed] Syncing is_system flag for all companies...");
  
  const companies = await storage.getAllCompanies();
  
  let updatedCount = 0;
  
  for (const company of companies) {
    for (const [columnType, systemValues] of Object.entries(SYSTEM_VALUES)) {
      const columnKey = SYSTEM_COLUMN_KEY_MAP[columnType as SystemColumnType];
      const options = await storage.getDropdownOptionsByColumn(company.id, columnKey);
      
      // Normalize system values to lowercase for case-insensitive matching (same as admin sync endpoint)
      const systemValuesLower = new Set(systemValues.map(v => v.toLowerCase().trim()));
      
      for (const option of options) {
        // Only update if this option's value matches a system value (case-insensitive) AND is not already marked as system
        const optionValueNormalized = option.value.toLowerCase().trim();
        if (systemValuesLower.has(optionValueNormalized) && !option.is_system) {
          await storage.updateDropdownOption(option.id, { is_system: true });
          updatedCount++;
        }
      }
    }
  }
  
  if (updatedCount > 0) {
    console.log(`[Seed] Updated ${updatedCount} dropdown options to is_system: true`);
  } else {
    console.log("[Seed] All dropdown options already have is_system: true");
  }
}

export { SYSTEM_VALUES };
