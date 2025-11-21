import bcrypt from "bcryptjs";
import { storage } from "./storage";

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

  // ===== CREATE COMPANY-WIDE DROPDOWN OPTIONS =====
  // These are shared across all sheets in the company
  const dropdownColumns = [
    { key: "lang", values: ["English", "Hindi", "Odia", "Telugu", "Tamil"] },
    { key: "occupation", values: ["Student", "Working Professional", "Business Owner", "Unemployed"] },
    { key: "qualification", values: ["10th Pass", "12th Pass", "Graduate", "Post Graduate", "Doctorate"] },
    { key: "lead_status", values: ["New", "Contacted", "Qualified", "Converted", "Lost"] },
    { key: "visit_status", values: ["Not Visited", "Scheduled", "Visited", "Cancelled"] },
  ];

  for (const col of dropdownColumns) {
    for (let i = 0; i < col.values.length; i++) {
      await storage.createDropdownOption({
        company_id: demoCompany.id,
        sheet_id: null, // null = company-wide
        column_key: col.key,
        value: col.values[i],
        order_index: i,
      });
    }
  }
  console.log("✓ Created company-wide dropdown options");

  // ===== CREATE SAMPLE LEADS FOR SALES NORTH =====
  const sampleLeadsNorth = [
    {
      name: "Ramesh Kumar",
      mobile_no: "9123456789",
      whatsapp: "9123456789",
      lang: "Hindi",
      occupation: "Student",
      qualification: "12th Pass",
      age: 19,
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "John Doe",
      lead_category: "cold" as const,
    },
    {
      name: "Priya Sharma",
      mobile_no: "9234567890",
      whatsapp: "9234567890",
      lang: "English",
      occupation: "Working Professional",
      qualification: "Graduate",
      age: 26,
      lead_status: "Contacted",
      visit_status: "Scheduled",
      executive: "John Doe",
      lead_category: "warm" as const,
    },
    {
      name: "Amit Patel",
      mobile_no: "9345678901",
      whatsapp: "9345678901",
      lang: "Odia",
      occupation: "Student",
      qualification: "10th Pass",
      age: 17,
      lead_status: "Qualified",
      visit_status: "Visited",
      executive: "Jane Smith",
      lead_category: "hot" as const,
    },
    {
      name: "Sneha Reddy",
      mobile_no: "9456789012",
      whatsapp: "9456789012",
      lang: "Telugu",
      occupation: "Business Owner",
      qualification: "Graduate",
      age: 32,
      lead_status: "Converted",
      visit_status: "Visited",
      executive: "John Doe",
      lead_category: "hot" as const,
    },
    {
      name: "Vikram Singh",
      mobile_no: "9567890123",
      whatsapp: "9567890123",
      lang: "Hindi",
      occupation: "Student",
      qualification: "12th Pass",
      age: 18,
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "Jane Smith",
      lead_category: "cold" as const,
    },
  ];

  for (const leadData of sampleLeadsNorth) {
    await storage.createLead({
      ...leadData,
      sheet_id: salesNorth.id,
      owner_user_id: user1.id,
      lead_date: new Date().toISOString().split("T")[0],
      lead_time: "10:30",
      address: "123 Main St, Delhi",
      custom_fields: {},
      meta: {},
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
      age: 28,
      lead_status: "Contacted",
      visit_status: "Not Visited",
      executive: "Jane Smith",
      lead_category: "warm" as const,
    },
    {
      name: "Karthik Menon",
      mobile_no: "9789012345",
      whatsapp: "9789012345",
      lang: "English",
      occupation: "Student",
      qualification: "Graduate",
      age: 22,
      lead_status: "New",
      visit_status: "Not Visited",
      executive: "John Doe",
      lead_category: "cold" as const,
    },
    {
      name: "Deepa Nair",
      mobile_no: "9890123456",
      whatsapp: "9890123456",
      lang: "Tamil",
      occupation: "Business Owner",
      qualification: "Graduate",
      age: 35,
      lead_status: "Qualified",
      visit_status: "Scheduled",
      executive: "Jane Smith",
      lead_category: "hot" as const,
    },
    {
      name: "Arjun Rao",
      mobile_no: "9901234567",
      whatsapp: "9901234567",
      lang: "Telugu",
      occupation: "Student",
      qualification: "12th Pass",
      age: 19,
      lead_status: "Lost",
      visit_status: "Cancelled",
      executive: "John Doe",
      lead_category: "cold" as const,
    },
    {
      name: "Meera Krishnan",
      mobile_no: "9012345678",
      whatsapp: "9012345678",
      lang: "English",
      occupation: "Working Professional",
      qualification: "Post Graduate",
      age: 30,
      lead_status: "Converted",
      visit_status: "Visited",
      executive: "Jane Smith",
      lead_category: "hot" as const,
    },
  ];

  for (const leadData of sampleLeadsSouth) {
    await storage.createLead({
      ...leadData,
      sheet_id: salesSouth.id,
      owner_user_id: user2.id,
      lead_date: new Date().toISOString().split("T")[0],
      lead_time: "14:00",
      address: "456 Park Ave, Bangalore",
      custom_fields: {},
      meta: {},
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
