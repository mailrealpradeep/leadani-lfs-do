import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// COMPANIES (Multi-Tenant Organizations)
// ============================================================================
export interface Company {
  id: string;
  name: string;
  slug: string; // unique identifier for URL
  settings: {
    timezone?: string;
    date_format?: string;
    custom_branding?: any;
  };
  status: "active" | "suspended" | "trial";
  created_at: string;
  updated_at: string;
}

export const insertCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  settings: z.object({
    timezone: z.string().optional(),
    date_format: z.string().optional(),
    custom_branding: z.any().optional(),
  }).default({}),
  status: z.enum(["active", "suspended", "trial"]).default("active"),
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;

// ============================================================================
// USERS
// ============================================================================
export interface User {
  id: string;
  company_id: string | null; // null for super admin
  name: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "company_admin" | "user";
  invited_by: string | null; // user_id of who invited them
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export const insertUserSchema = z.object({
  company_id: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["super_admin", "company_admin", "user"]).default("user"),
  invited_by: z.string().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// ============================================================================
// SHEETS (Workspaces)
// ============================================================================
export interface Sheet {
  id: string;
  company_id: string;
  name: string;
  owner_id: string; // user who created it
  is_personal: boolean; // true = personal sheet (only owner can delete), false = company sheet (company_admin can delete)
  visibility: "company" | "restricted" | "personal"; // company = all company users, restricted = specific users via permissions, personal = owner only
  settings: {
    default_lead_status?: string;
    default_visit_status?: string;
    custom_fields?: CustomColumn[];
  };
  deleted_at: string | null; // soft delete
  created_at: string;
  updated_at: string;
}

export const insertSheetSchema = z.object({
  company_id: z.string(),
  name: z.string().min(1, "Sheet name is required"),
  owner_id: z.string(),
  is_personal: z.boolean().default(false),
  visibility: z.enum(["company", "restricted", "personal"]).default("company"),
  settings: z.object({
    default_lead_status: z.string().optional(),
    default_visit_status: z.string().optional(),
    custom_fields: z.array(z.any()).optional(),
  }).default({}),
});

export type InsertSheet = z.infer<typeof insertSheetSchema>;

// ============================================================================
// SHEET USERS (Permissions)
// ============================================================================
export interface SheetUser {
  id: string;
  sheet_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
}

export const insertSheetUserSchema = z.object({
  sheet_id: z.string(),
  user_id: z.string(),
  role: z.enum(["owner", "editor", "viewer"]),
});

export type InsertSheetUser = z.infer<typeof insertSheetUserSchema>;

// ============================================================================
// LEADS
// ============================================================================
export interface Lead {
  id: string;
  sheet_id: string;
  owner_user_id: string;
  lead_date: string | null;
  lead_time: string | null;
  executive: string | null;
  lang: string | null;
  address: string | null;
  name: string | null;
  mobile_no: string | null;
  whatsapp: string | null;
  occupation: string | null;
  qualification: string | null;
  age: number | null;
  exam_end: string | null;
  exam_mark: string | null;
  lead_status: string | null;
  visit_status: string | null;
  visit_date: string | null;
  nfdt: string | null;
  call_1: string | null;
  feedback_1: string | null;
  lead_category: "hot" | "warm" | "cold";
  custom_fields: Record<string, any>;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const insertLeadSchema = z.object({
  sheet_id: z.string(),
  owner_user_id: z.string().optional(),
  lead_date: z.string().nullable().optional(),
  lead_time: z.string().nullable().optional(),
  executive: z.string().nullable().optional(),
  lang: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  mobile_no: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  exam_end: z.string().nullable().optional(),
  exam_mark: z.string().nullable().optional(),
  lead_status: z.string().nullable().optional(),
  visit_status: z.string().nullable().optional(),
  visit_date: z.string().nullable().optional(),
  nfdt: z.string().nullable().optional(),
  call_1: z.string().nullable().optional(),
  feedback_1: z.string().nullable().optional(),
  lead_category: z.enum(["hot", "warm", "cold"]).default("cold"),
  custom_fields: z.record(z.any()).default({}),
  meta: z.record(z.any()).default({}),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;

// ============================================================================
// DROPDOWN OPTIONS (Company-scoped)
// ============================================================================
export interface DropdownOption {
  id: string;
  company_id: string;
  sheet_id: string | null; // null for company-wide options, specific sheet_id for sheet-specific
  column_key: "lang" | "occupation" | "qualification" | "lead_status" | "visit_status" | string;
  value: string;
  order_index: number;
  created_at: string;
}

export const insertDropdownOptionSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  column_key: z.string(),
  value: z.string().min(1, "Value is required"),
  order_index: z.number(),
});

export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;

// ============================================================================
// CUSTOM COLUMNS (Company-scoped)
// ============================================================================
export interface CustomColumn {
  id: string;
  company_id: string; // columns are now company-wide
  sheet_id: string | null; // optional: if specified, column is sheet-specific override
  name: string;
  column_key: string; // unique key for this column within the company
  type: "text" | "number" | "date" | "dropdown" | "boolean";
  config: {
    default_value?: any;
    dropdown_options?: string[];
    required?: boolean;
  };
  order_index: number; // for column ordering
  created_at: string;
  updated_at: string;
}

export const insertCustomColumnSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  name: z.string().min(1, "Column name is required"),
  column_key: z.string().min(1, "Column key is required"),
  type: z.enum(["text", "number", "date", "dropdown", "boolean"]),
  config: z.object({
    default_value: z.any().optional(),
    dropdown_options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  }).default({}),
  order_index: z.number().default(0),
});

export type InsertCustomColumn = z.infer<typeof insertCustomColumnSchema>;

// ============================================================================
// AUDIT LOGS
// ============================================================================
export interface Audit {
  id: string;
  company_id: string | null; // null for super admin actions
  user_id: string;
  action: string;
  model: string;
  model_id: string;
  payload: Record<string, any>;
  created_at: string;
}

export const insertAuditSchema = z.object({
  company_id: z.string().nullable().optional(),
  user_id: z.string(),
  action: z.string(),
  model: z.string(),
  model_id: z.string(),
  payload: z.record(z.any()).default({}),
});

export type InsertAudit = z.infer<typeof insertAuditSchema>;

// ============================================================================
// WEBHOOK LOGS
// ============================================================================
export interface WebhookLog {
  id: string;
  company_id: string;
  sheet_id: string | null;
  payload: Record<string, any>;
  headers: Record<string, any>;
  status: "success" | "error";
  error_message: string | null;
  lead_id: string | null;
  created_at: string;
}

export const insertWebhookLogSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  payload: z.record(z.any()),
  headers: z.record(z.any()),
  status: z.enum(["success", "error"]),
  error_message: z.string().nullable().optional(),
  lead_id: z.string().nullable().optional(),
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;

// ============================================================================
// LEAD UPDATES
// ============================================================================
export interface LeadUpdate {
  id: string;
  lead_id: string;
  update_via: "whatsapp" | "call";
  update_on: string; // date
  remark: string;
  created_at: string;
}

export const insertLeadUpdateSchema = z.object({
  lead_id: z.string(),
  update_via: z.enum(["whatsapp", "call"]),
  update_on: z.string(), // date string
  remark: z.string().min(1, "Remark is required"),
});

export type InsertLeadUpdate = z.infer<typeof insertLeadUpdateSchema>;

// ============================================================================
// AUTH
// ============================================================================
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export interface AuthResponse {
  user: Omit<User, "password_hash">;
  token: string;
  company?: Company | null; // included for company_admin and user roles
}

// ============================================================================
// REPORTS
// ============================================================================
export interface SheetReportSummary {
  total_leads: number;
  leads_by_status: Record<string, number>;
  leads_by_executive: Record<string, number>;
  daily_trends: { date: string; count: number }[];
  conversion_rate: number;
  visits_scheduled: number;
  nfdt_count: number;
}

export interface CompanyReportSummary {
  company_id: string;
  company_name: string;
  total_sheets: number;
  total_leads: number;
  total_users: number;
  leads_by_sheet: { sheet_id: string; sheet_name: string; count: number }[];
  recent_activity: Audit[];
}

export interface GlobalReportSummary {
  total_companies: number;
  total_sheets: number;
  total_leads: number;
  total_users: number;
  companies: { company_id: string; company_name: string; user_count: number; sheet_count: number; lead_count: number }[];
  recent_activity: Audit[];
}
