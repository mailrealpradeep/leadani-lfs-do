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
  return { created, skipped };
}

export { SYSTEM_VALUES };
