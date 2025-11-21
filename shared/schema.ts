import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// USERS
// ============================================================================
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: string;
}

export const insertUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).default("user"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// ============================================================================
// SHEETS (Workspaces)
// ============================================================================
export interface Sheet {
  id: string;
  name: string;
  owner_id: string;
  settings: {
    default_lead_status?: string;
    default_visit_status?: string;
    custom_fields?: CustomColumn[];
  };
  created_at: string;
}

export const insertSheetSchema = z.object({
  name: z.string().min(1, "Sheet name is required"),
  owner_id: z.string(),
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
// DROPDOWN OPTIONS
// ============================================================================
export interface DropdownOption {
  id: string;
  sheet_id: string | null; // null for global/default options
  column_key: "lang" | "occupation" | "qualification" | "lead_status" | "visit_status" | string;
  value: string;
  order_index: number;
  created_at: string;
}

export const insertDropdownOptionSchema = z.object({
  sheet_id: z.string().nullable().optional(),
  column_key: z.string(),
  value: z.string().min(1, "Value is required"),
  order_index: z.number(),
});

export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;

// ============================================================================
// CUSTOM COLUMNS
// ============================================================================
export interface CustomColumn {
  id: string;
  sheet_id: string;
  name: string;
  type: "text" | "number" | "date" | "dropdown" | "boolean";
  config: {
    default_value?: any;
    dropdown_options?: string[];
  };
  created_at: string;
}

export const insertCustomColumnSchema = z.object({
  sheet_id: z.string(),
  name: z.string().min(1, "Column name is required"),
  type: z.enum(["text", "number", "date", "dropdown", "boolean"]),
  config: z.object({
    default_value: z.any().optional(),
    dropdown_options: z.array(z.string()).optional(),
  }).default({}),
});

export type InsertCustomColumn = z.infer<typeof insertCustomColumnSchema>;

// ============================================================================
// AUDIT LOGS
// ============================================================================
export interface Audit {
  id: string;
  user_id: string;
  action: string;
  model: string;
  model_id: string;
  payload: Record<string, any>;
  created_at: string;
}

export const insertAuditSchema = z.object({
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
  sheet_id: string | null;
  payload: Record<string, any>;
  headers: Record<string, any>;
  status: "success" | "error";
  error_message: string | null;
  lead_id: string | null;
  created_at: string;
}

export const insertWebhookLogSchema = z.object({
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

export interface GlobalReportSummary {
  total_sheets: number;
  total_leads: number;
  total_users: number;
  leads_by_sheet: { sheet_id: string; sheet_name: string; count: number }[];
  recent_activity: Audit[];
}
