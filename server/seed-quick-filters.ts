import { db } from "./db";
import { companies, quick_filters } from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Seed default quick filters for all existing companies
 * This script creates 6 default quick filters for each company that doesn't have any filters yet.
 */
async function seedQuickFilters() {
  console.log("Starting quick filter seeding...");

  try {
    // Fetch all companies
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies`);

    for (const company of allCompanies) {
      console.log(`Processing company: ${company.name} (${company.id})`);

      // Check if company already has quick filters
      const existingFilters = await db
        .select()
        .from(quick_filters)
        .where(eq(quick_filters.company_id, company.id));

      if (existingFilters.length > 0) {
        console.log(`  - Skipping (already has ${existingFilters.length} filters)`);
        continue;
      }

      // Create default filters
      const now = new Date();
      const defaultFilters = [
        {
          id: randomUUID(),
          company_id: company.id,
          created_by_user_id: null, // System-created
          name: "Visit Today",
          icon: "calendar",
          color: "blue",
          filter_config: {
            conditions: [
              {
                column_key: "visit_date",
                operator: "date_equals" as const,
                relative_date: "today" as const,
              },
            ],
            logical_operator: "and" as const,
            version: 1,
          },
          order_index: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: randomUUID(),
          company_id: company.id,
          created_by_user_id: null,
          name: "Follow-up",
          icon: "phone",
          color: "green",
          filter_config: {
            conditions: [
              {
                column_key: "followup_date",
                operator: "date_equals" as const,
                relative_date: "today" as const,
              },
            ],
            logical_operator: "and" as const,
            version: 1,
          },
          order_index: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: randomUUID(),
          company_id: company.id,
          created_by_user_id: null,
          name: "Not Attended",
          icon: "flag",
          color: "yellow",
          filter_config: {
            conditions: [
              {
                column_key: "status",
                operator: "equals" as const,
                value: "Not Attended",
              },
            ],
            logical_operator: "and" as const,
            version: 1,
          },
          order_index: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: randomUUID(),
          company_id: company.id,
          created_by_user_id: null,
          name: "Today's Leads",
          icon: "zap",
          color: "purple",
          filter_config: {
            conditions: [
              {
                column_key: "lead_date",
                operator: "date_equals" as const,
                relative_date: "today" as const,
              },
            ],
            logical_operator: "and" as const,
            version: 1,
          },
          order_index: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: randomUUID(),
          company_id: company.id,
          created_by_user_id: null,
          name: "Tomorrow",
          icon: "user-check",
          color: "blue",
          filter_config: {
            conditions: [
              {
                column_key: "visit_date",
                operator: "date_equals" as const,
                relative_date: "tomorrow" as const,
              },
            ],
            logical_operator: "and" as const,
            version: 1,
          },
          order_index: 4,
          created_at: now,
          updated_at: now,
        },
      ];

      // Insert all filters for this company
      await db.insert(quick_filters).values(defaultFilters);
      console.log(`  - Created ${defaultFilters.length} default filters`);
    }

    console.log("Quick filter seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding quick filters:", error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedQuickFilters()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

export { seedQuickFilters };
