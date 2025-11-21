import bcrypt from "bcryptjs";
import { storage } from "./storage";

export async function seedData() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("Passw0rd!", 10);
  const admin = await storage.createUser({
    name: "Admin User",
    email: "admin@example.com",
    password_hash: adminPasswordHash,
    role: "admin",
  });
  console.log("✓ Created admin user: admin@example.com / Passw0rd!");

  // Create regular users
  const user1PasswordHash = await bcrypt.hash("password123", 10);
  const user1 = await storage.createUser({
    name: "John Doe",
    email: "user1@example.com",
    password_hash: user1PasswordHash,
    role: "user",
  });
  console.log("✓ Created user: user1@example.com / password123");

  const user2PasswordHash = await bcrypt.hash("password123", 10);
  const user2 = await storage.createUser({
    name: "Jane Smith",
    email: "user2@example.com",
    password_hash: user2PasswordHash,
    role: "user",
  });
  console.log("✓ Created user: user2@example.com / password123");

  // Create sheets
  const salesNorth = await storage.createSheet({
    name: "Sales North",
    owner_id: user1.id,
    settings: {},
  });
  console.log("✓ Created sheet: Sales North");

  const salesSouth = await storage.createSheet({
    name: "Sales South",
    owner_id: user2.id,
    settings: {},
  });
  console.log("✓ Created sheet: Sales South");

  // Add sheet permissions
  await storage.createSheetUser({
    sheet_id: salesNorth.id,
    user_id: user1.id,
    role: "owner",
  });

  await storage.createSheetUser({
    sheet_id: salesNorth.id,
    user_id: user2.id,
    role: "editor",
  });

  await storage.createSheetUser({
    sheet_id: salesSouth.id,
    user_id: user2.id,
    role: "owner",
  });

  await storage.createSheetUser({
    sheet_id: salesSouth.id,
    user_id: user1.id,
    role: "viewer",
  });

  // Create dropdown options for Sales North
  const dropdownColumns = [
    { key: "lang", values: ["English", "Hindi", "Odia", "Telugu", "Tamil"] },
    { key: "occupation", values: ["Student", "Working Professional", "Business Owner", "Unemployed"] },
    { key: "qualification", values: ["10th Pass", "12th Pass", "Graduate", "Post Graduate", "Doctorate"] },
    { key: "lead_status", values: ["New", "Contacted", "Qualified", "Converted", "Lost"] },
    { key: "visit_status", values: ["Not Visited", "Scheduled", "Visited", "Cancelled"] },
  ];

  for (const sheet of [salesNorth, salesSouth]) {
    for (const col of dropdownColumns) {
      for (let i = 0; i < col.values.length; i++) {
        await storage.createDropdownOption({
          sheet_id: sheet.id,
          column_key: col.key,
          value: col.values[i],
          order_index: i,
        });
      }
    }
  }
  console.log("✓ Created dropdown options");

  // Create sample leads for Sales North
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
    },
  ];

  for (const leadData of sampleLeadsNorth) {
    await storage.createLead({
      ...leadData,
      sheet_id: salesNorth.id,
      owner_user_id: user1.id,
      lead_date: new Date().toISOString().split("T")[0],
      lead_time: "10:30",
      address: "123 Main St",
      custom_fields: {},
      meta: {},
    });
  }
  console.log(`✓ Created ${sampleLeadsNorth.length} leads for Sales North`);

  // Create sample leads for Sales South
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
    },
  ];

  for (const leadData of sampleLeadsSouth) {
    await storage.createLead({
      ...leadData,
      sheet_id: salesSouth.id,
      owner_user_id: user2.id,
      lead_date: new Date().toISOString().split("T")[0],
      lead_time: "14:00",
      address: "456 Park Ave",
      custom_fields: {},
      meta: {},
    });
  }
  console.log(`✓ Created ${sampleLeadsSouth.length} leads for Sales South`);

  console.log("✅ Seed data created successfully!");
}
