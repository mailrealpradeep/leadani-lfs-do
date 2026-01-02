import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { getDefaultColumnsForCompany } from "@shared/schema";

export async function seedData() {
  console.log("🌱 Seeding multi-tenant database...");

  // ===== CREATE DEMO COMPANY =====
  const demoCompany = await storage.createCompany({
    name: "Acme Corporation",
    slug: "acme-corp",
    settings: {
      timezone: "Asia/Kolkata",
      date_format: "DD/MM/YYYY",
    },
    status: "active",
  });
  console.log("✓ Created company: Acme Corporation (acme-corp)");

  // ===== CREATE CUSTOM COLUMNS FOR DEMO COMPANY =====
  const customColumns = [
    { name: "Name", column_key: "name", type: "text" as const, config: { required: true }, order_index: 0 },
    { name: "Mobile No", column_key: "mobile_no", type: "text" as const, config: {}, order_index: 1 },
    { name: "WhatsApp", column_key: "whatsapp", type: "text" as const, config: {}, order_index: 2 },
    { name: "Language", column_key: "lang", type: "dropdown" as const, config: { dropdown_options: ["English", "Hindi", "Odia", "Telugu", "Tamil"] }, order_index: 3 },
    { name: "Occupation", column_key: "occupation", type: "dropdown" as const, config: { dropdown_options: ["Student", "Working Professional", "Business Owner", "Unemployed"] }, order_index: 4 },
    { name: "Qualification", column_key: "qualification", type: "dropdown" as const, config: { dropdown_options: ["10th Pass", "12th Pass", "Graduate", "Post Graduate", "Doctorate"] }, order_index: 5 },
    { name: "Age", column_key: "age", type: "number" as const, config: {}, order_index: 6 },
    { name: "Lead Status", column_key: "lead_status", type: "dropdown" as const, config: { dropdown_options: ["New", "Contacted", "Qualified", "Converted", "Lost"] }, order_index: 7 },
    { name: "Visit Status", column_key: "visit_status", type: "dropdown" as const, config: { dropdown_options: ["Not Visited", "Scheduled", "Visited", "Cancelled"] }, order_index: 8 },
    { name: "Executive", column_key: "executive", type: "text" as const, config: {}, order_index: 9 },
  ];

  for (const col of customColumns) {
    await storage.createCustomColumn({
      company_id: demoCompany.id,
      sheet_id: null, // company-wide
      ...col,
    });
  }
  console.log("✓ Created custom columns for Acme Corporation");

  // ===== CREATE SUPER ADMIN (No company affiliation) =====
  const superAdminPasswordHash = await bcrypt.hash("password123", 10);
  const superAdmin = await storage.createUser({
    name: "Super Admin",
    email: "admin@acme.com",
    password_hash: superAdminPasswordHash,
    role: "super_admin",
    company_id: null,
  } as any);
  console.log("✓ Created super admin: admin@acme.com / password123");

  // ===== CREATE COMPANY ADMIN for Acme =====
  const companyAdminPasswordHash = await bcrypt.hash("password123", 10);
  const companyAdmin = await storage.createUser({
    name: "Company Admin",
    email: "company-admin@acme.com",
    password_hash: companyAdminPasswordHash,
    role: "company_admin",
    company_id: demoCompany.id,
  } as any);
  console.log("✓ Created company admin: company-admin@acme.com / password123");

  // ===== CREATE REGULAR USERS for Acme =====
  const user1PasswordHash = await bcrypt.hash("password123", 10);
  const user1 = await storage.createUser({
    name: "Alice Johnson",
    email: "alice@acme.com",
    password_hash: user1PasswordHash,
    role: "user",
    company_id: demoCompany.id,
    invited_by: companyAdmin.id,
  } as any);
  console.log("✓ Created user: alice@acme.com / password123");

  const user2PasswordHash = await bcrypt.hash("password123", 10);
  const user2 = await storage.createUser({
    name: "Bob Smith",
    email: "bob@acme.com",
    password_hash: user2PasswordHash,
    role: "user",
    company_id: demoCompany.id,
    invited_by: companyAdmin.id,
  } as any);
  console.log("✓ Created user: bob@acme.com / password123");

  // ===== CREATE COMPANY-WIDE SHEETS =====
  const salesNorth = await storage.createSheet({
    name: "Sales - North Region",
    owner_id: companyAdmin.id,
    company_id: demoCompany.id,
    is_personal: false,
    visibility: "company", // All company users can see this
    settings: {},
  });
  console.log("✓ Created company sheet: Sales - North Region");

  const salesSouth = await storage.createSheet({
    name: "Sales - South Region",
    owner_id: companyAdmin.id,
    company_id: demoCompany.id,
    is_personal: false,
    visibility: "company", // All company users can see this
    settings: {},
  });
  console.log("✓ Created company sheet: Sales - South Region");

  // ===== CREATE PERSONAL SHEET =====
  const johnPersonal = await storage.createSheet({
    name: "John's Personal Leads",
    owner_id: user1.id,
    company_id: demoCompany.id,
    is_personal: true,
    visibility: "personal", // Only John can see this
    settings: {},
  });
  console.log("✓ Created personal sheet: John's Personal Leads");

  // ===== ADD SHEET PERMISSIONS (for company sheets with restricted access) =====
  // Company-wide sheets are automatically accessible, but we can add explicit permissions too
  await storage.createSheetUser({
    sheet_id: salesNorth.id,
    user_id: companyAdmin.id,
    role: "owner",
  });

  await storage.createSheetUser({
    sheet_id: salesNorth.id,
    user_id: user1.id,
    role: "editor",
  });

  await storage.createSheetUser({
    sheet_id: salesNorth.id,
    user_id: user2.id,
    role: "viewer",
  });

  await storage.createSheetUser({
    sheet_id: salesSouth.id,
    user_id: companyAdmin.id,
    role: "owner",
  });

  await storage.createSheetUser({
    sheet_id: salesSouth.id,
    user_id: user2.id,
    role: "editor",
  });

  // ===== CREATE SAMPLE LEADS FOR SALES NORTH =====
  const sampleLeadsNorth = [
    {
      name: "Ramesh Kumar",
      mobile_no: "9123456789",
      whatsapp: "9123456789",
      lang: "Hindi",
      occupation: "Student",
      qualification: "12th Pass",
      age: "19",
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "John Doe",
    },
    {
      name: "Priya Sharma",
      mobile_no: "9234567890",
      whatsapp: "9234567890",
      lang: "English",
      occupation: "Working Professional",
      qualification: "Graduate",
      age: "26",
      lead_status: "Contacted",
      visit_status: "Scheduled",
      executive: "John Doe",
    },
    {
      name: "Amit Patel",
      mobile_no: "9345678901",
      whatsapp: "9345678901",
      lang: "Odia",
      occupation: "Student",
      qualification: "10th Pass",
      age: "17",
      lead_status: "Qualified",
      visit_status: "Visited",
      executive: "Jane Smith",
    },
    {
      name: "Sneha Reddy",
      mobile_no: "9456789012",
      whatsapp: "9456789012",
      lang: "Telugu",
      occupation: "Business Owner",
      qualification: "Graduate",
      age: "32",
      lead_status: "Converted",
      visit_status: "Visited",
      executive: "John Doe",
    },
    {
      name: "Vikram Singh",
      mobile_no: "9567890123",
      whatsapp: "9567890123",
      lang: "Hindi",
      occupation: "Student",
      qualification: "12th Pass",
      age: "18",
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "Jane Smith",
    },
  ];

  for (const leadData of sampleLeadsNorth) {
    await storage.createLead({
      sheet_id: salesNorth.id,
      owner_user_id: user1.id,
      custom_fields: leadData,
    });
  }
  console.log(`✓ Created ${sampleLeadsNorth.length} leads for Sales - North Region`);

  // ===== CREATE SAMPLE LEADS FOR SALES SOUTH =====
  const sampleLeadsSouth = [
    {
      name: "Lakshmi Iyer",
      mobile_no: "9678901234",
      whatsapp: "9678901234",
      lang: "Tamil",
      occupation: "Working Professional",
      qualification: "Post Graduate",
      age: "28",
      lead_status: "Contacted",
      visit_status: "Not Visited",
      executive: "Jane Smith",
    },
    {
      name: "Karthik Menon",
      mobile_no: "9789012345",
      whatsapp: "9789012345",
      lang: "English",
      occupation: "Student",
      qualification: "Graduate",
      age: "22",
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "John Doe",
    },
    {
      name: "Deepa Nair",
      mobile_no: "9890123456",
      whatsapp: "9890123456",
      lang: "Tamil",
      occupation: "Business Owner",
      qualification: "Graduate",
      age: "35",
      lead_status: "Qualified",
      visit_status: "Scheduled",
      executive: "Jane Smith",
    },
    {
      name: "Arjun Rao",
      mobile_no: "9901234567",
      whatsapp: "9901234567",
      lang: "Telugu",
      occupation: "Student",
      qualification: "12th Pass",
      age: "19",
      lead_status: "Lost",
      visit_status: "Cancelled",
      executive: "John Doe",
    },
    {
      name: "Meera Krishnan",
      mobile_no: "9012345678",
      whatsapp: "9012345678",
      lang: "English",
      occupation: "Working Professional",
      qualification: "Post Graduate",
      age: "30",
      lead_status: "Converted",
      visit_status: "Visited",
      executive: "Jane Smith",
    },
  ];

  for (const leadData of sampleLeadsSouth) {
    await storage.createLead({
      sheet_id: salesSouth.id,
      owner_user_id: user2.id,
      custom_fields: leadData,
    });
  }
  console.log(`✓ Created ${sampleLeadsSouth.length} leads for Sales - South Region`);

  console.log("✅ Multi-tenant seed data created successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("  Super Admin: admin@acme.com / password123");
  console.log("  Company Admin (Acme): company-admin@acme.com / password123");
  console.log("  User 1 (Acme): alice@acme.com / password123");
  console.log("  User 2 (Acme): bob@acme.com / password123");
}

// Function to add closing_value system column to all existing companies
export async function seedClosingValueColumn() {
  console.log("[Seed] Adding closing_value system column to existing companies...");
  
  // Get all companies
  const companies = await storage.getAllCompanies();
  let created = 0;
  let skipped = 0;
  
  for (const company of companies) {
    // Check if closing_value column already exists for this company
    const existingColumns = await storage.getCustomColumnsByCompany(company.id);
    const hasClosingValue = existingColumns.some(col => col.column_key === 'closing_value');
    
    if (hasClosingValue) {
      skipped++;
      continue;
    }
    
    // Find the highest order_index to append the new column
    const maxOrderIndex = existingColumns.reduce((max, col) => Math.max(max, col.order_index || 0), 0);
    
    // Create the closing_value column for this company
    await storage.createCustomColumn({
      company_id: company.id,
      sheet_id: null, // company-wide
      name: "Closing Value",
      column_key: "closing_value",
      type: "number" as const,
      config: { is_system_column: true, default_value: 0 },
      order_index: maxOrderIndex + 1,
    });
    created++;
  }
  
  console.log(`[Seed] Closing Value column: Created for ${created} companies, Skipped ${skipped} (already exists)`);
}

// Function to add last_edit and conversion_date system columns to all existing companies
export async function seedSystemDateColumns() {
  console.log("[Seed] Adding last_edit and conversion_date system columns to existing companies...");
  
  const companies = await storage.getAllCompanies();
  let lastEditCreated = 0;
  let lastEditSkipped = 0;
  let conversionDateCreated = 0;
  let conversionDateSkipped = 0;
  
  for (const company of companies) {
    const existingColumns = await storage.getCustomColumnsByCompany(company.id);
    const maxOrderIndex = existingColumns.reduce((max, col) => Math.max(max, col.order_index || 0), 0);
    
    // Add last_edit column if not exists
    const hasLastEdit = existingColumns.some(col => col.column_key === 'last_edit');
    if (!hasLastEdit) {
      await storage.createCustomColumn({
        company_id: company.id,
        sheet_id: null,
        name: "Last Edit",
        column_key: "last_edit",
        type: "datetime" as const,
        config: { 
          is_system_column: true, 
          is_readonly: true,
          auto_update: true,
          description: "Automatically updated when any field is edited"
        },
        order_index: maxOrderIndex + 1,
      });
      lastEditCreated++;
    } else {
      lastEditSkipped++;
    }
    
    // Add conversion_date column if not exists
    const hasConversionDate = existingColumns.some(col => col.column_key === 'conversion_date');
    if (!hasConversionDate) {
      await storage.createCustomColumn({
        company_id: company.id,
        sheet_id: null,
        name: "Conversion Date",
        column_key: "conversion_date",
        type: "datetime" as const,
        config: { 
          is_system_column: true, 
          is_readonly: true,
          auto_update: true,
          description: "Automatically set when lead status is marked as Converted"
        },
        order_index: maxOrderIndex + 2,
      });
      conversionDateCreated++;
    } else {
      conversionDateSkipped++;
    }
  }
  
  console.log(`[Seed] Last Edit column: Created for ${lastEditCreated} companies, Skipped ${lastEditSkipped} (already exists)`);
  console.log(`[Seed] Conversion Date column: Created for ${conversionDateCreated} companies, Skipped ${conversionDateSkipped} (already exists)`);
}

// Backfill conversion_date for existing leads that are already in Converted status
export async function backfillConversionDates() {
  console.log("[Seed] Backfilling conversion_date for existing Converted leads...");
  
  const companies = await storage.getAllCompanies();
  let updatedCount = 0;
  
  for (const company of companies) {
    const sheets = await storage.getSheetsByCompanyId(company.id);
    
    for (const sheet of sheets) {
      const leads = await storage.getLeadsBySheetId(sheet.id);
      
      for (const lead of leads) {
        if (lead.deleted_at) continue;
        
        // Check if lead status is "Converted" (case-insensitive)
        const leadStatus = lead.custom_fields?.lead_status;
        const isConverted = leadStatus && 
          typeof leadStatus === 'string' && 
          leadStatus.toLowerCase() === 'converted';
        
        // Only backfill if converted and no conversion_date set
        if (isConverted && !lead.custom_fields?.conversion_date) {
          // Use updated_at as the conversion date (best available approximation)
          const conversionDate = lead.updated_at || lead.created_at;
          
          await storage.updateLead(lead.id, {
            custom_fields: {
              ...lead.custom_fields,
              conversion_date: conversionDate,
            }
          });
          updatedCount++;
        }
      }
    }
  }
  
  console.log(`[Seed] Backfilled conversion_date for ${updatedCount} leads`);
}
