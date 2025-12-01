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
    mobile_card_columns?: string[]; // column keys to display in mobile card view
    notification_settings?: {
      lead_assigned?: boolean;
      nfdt_reminder?: boolean;
      lead_updated?: boolean;
      webhook_received?: boolean;
      user_joined?: boolean;
    };
    task_notification_settings?: {
      enabled?: boolean;
      times?: string[]; // Array of times in HH:MM format, e.g., ["09:00", "16:00", "18:00"]
      timezone?: string; // IANA timezone, e.g., "Asia/Kolkata"
    };
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
    mobile_card_columns: z.array(z.string()).optional(),
    notification_settings: z.object({
      lead_assigned: z.boolean().optional(),
      nfdt_reminder: z.boolean().optional(),
      lead_updated: z.boolean().optional(),
      webhook_received: z.boolean().optional(),
      user_joined: z.boolean().optional(),
    }).optional(),
    task_notification_settings: z.object({
      enabled: z.boolean().optional(),
      times: z.array(z.string()).optional(),
      timezone: z.string().optional(),
    }).optional(),
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
  is_active: boolean;
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
// COMPANY SIGNUP (Public Registration)
// ============================================================================
export const companySignupSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  admin_name: z.string().min(1, "Your name is required"),
  admin_email: z.string().email("Invalid email address"),
  admin_password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CompanySignupRequest = z.infer<typeof companySignupSchema>;

// ============================================================================
// INVITES (Staff Invitation System)
// ============================================================================
export interface Invite {
  id: string;
  company_id: string;
  email: string;
  code: string; // unique invite code
  role: "company_admin" | "user";
  inviter_id: string; // user who created the invite
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  accepted_by: string | null; // user_id who accepted
  accepted_at: string | null;
  created_at: string;
}

export const insertInviteSchema = z.object({
  company_id: z.string(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["company_admin", "user"]).default("user"),
  inviter_id: z.string(),
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;

export const acceptInviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AcceptInviteRequest = z.infer<typeof acceptInviteSchema>;

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
// LEADS (Fully Customizable - all business fields defined by CustomColumns)
// ============================================================================
export interface Lead {
  id: string;
  sheet_id: string;
  owner_user_id: string;
  // All business data stored in custom_fields based on company's CustomColumn definitions
  custom_fields: Record<string, any>;
  meta: Record<string, any>;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const insertLeadSchema = z.object({
  sheet_id: z.string(),
  owner_user_id: z.string().optional(),
  // All business data goes into custom_fields - validated dynamically based on company's columns
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
  column_key: string; // matches CustomColumn.column_key
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
  type: "text" | "number" | "date" | "dropdown" | "boolean" | "mobile" | "percentage";
  config: {
    default_value?: any;
    dropdown_options?: string[];
    required?: boolean;
    is_system_column?: boolean; // System columns (Full Name, Mobile No) cannot be deleted
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
  type: z.enum(["text", "number", "date", "dropdown", "boolean", "mobile", "percentage"]),
  config: z.object({
    default_value: z.any().optional(),
    dropdown_options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
    is_system_column: z.boolean().optional(),
  }).default({}),
  order_index: z.number().default(0),
});

export type InsertCustomColumn = z.infer<typeof insertCustomColumnSchema>;

// ============================================================================
// VALIDATION RULES (Company-scoped Conditional Validations)
// ============================================================================
// Validation rule condition (reuses the filter condition format)
export const validationConditionSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "starts_with", "ends_with", "in", "not_in", 
    "is_empty", "is_not_empty",
    "greater_than", "less_than", "greater_equal", "less_equal", "between",
    "date_equals", "date_not_equals", "date_before", "date_after", "date_between"
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
  value2: z.union([z.string(), z.number(), z.null()]).optional(), // For "between" operators
});

export type ValidationCondition = z.infer<typeof validationConditionSchema>;

export interface ValidationRule {
  id: string;
  company_id: string; // company-scoped
  sheet_id: string | null; // optional: if specified, rule applies only to specific sheet
  name: string; // descriptive name like "NFDT required when Talked"
  // Legacy single condition fields (deprecated, kept for backward compatibility)
  trigger_column_key: string; // column that triggers the rule (e.g., "lead_status")
  operator: "equals" | "in" | "not_equals" | "not_in"; // comparison operator
  trigger_value: string | string[]; // value(s) that trigger the rule
  // New multi-condition support
  conditions?: ValidationCondition[]; // Multiple conditions
  logical_operator?: "and" | "or"; // How conditions are combined (default: "and")
  required_fields: string[]; // fields that become required when triggered
  created_at: string;
  updated_at: string;
}

export const insertValidationRuleSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  name: z.string().min(1, "Rule name is required"),
  // Legacy single condition (optional if conditions array is provided)
  trigger_column_key: z.string().optional(),
  operator: z.enum(["equals", "in", "not_equals", "not_in"]).optional(),
  trigger_value: z.union([z.string(), z.array(z.string())]).optional(),
  // New multi-condition support
  conditions: z.array(validationConditionSchema).optional(),
  logical_operator: z.enum(["and", "or"]).default("and"),
  required_fields: z.array(z.string()).min(1, "At least one required field must be specified"),
});

export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;

// ============================================================================
// HIGHLIGHTING RULES (Row Highlighting based on Conditions)
// ============================================================================

// Preset highlight colors (with their CSS variable names for dark/light mode support)
export const highlightColors = [
  // Red variants
  { id: "red_light", label: "Light Red", light: "hsl(0, 86%, 97%)", dark: "hsl(0, 50%, 15%)" },
  { id: "red", label: "Red", light: "hsl(0, 84%, 95%)", dark: "hsl(0, 70%, 20%)" },
  { id: "red_dark", label: "Dark Red", light: "hsl(0, 72%, 91%)", dark: "hsl(0, 80%, 25%)" },
  // Green variants
  { id: "green_light", label: "Light Green", light: "hsl(142, 76%, 95%)", dark: "hsl(142, 40%, 12%)" },
  { id: "green", label: "Green", light: "hsl(142, 69%, 90%)", dark: "hsl(142, 50%, 18%)" },
  { id: "green_dark", label: "Dark Green", light: "hsl(142, 60%, 85%)", dark: "hsl(142, 60%, 22%)" },
  // Blue variants
  { id: "blue_light", label: "Light Blue", light: "hsl(210, 100%, 96%)", dark: "hsl(210, 50%, 15%)" },
  { id: "blue", label: "Blue", light: "hsl(210, 100%, 93%)", dark: "hsl(210, 70%, 20%)" },
  { id: "blue_dark", label: "Dark Blue", light: "hsl(210, 80%, 88%)", dark: "hsl(210, 80%, 28%)" },
  // Other colors
  { id: "yellow", label: "Yellow", light: "hsl(48, 96%, 89%)", dark: "hsl(48, 70%, 20%)" },
  { id: "orange", label: "Orange", light: "hsl(24, 100%, 92%)", dark: "hsl(24, 70%, 20%)" },
  { id: "purple", label: "Purple", light: "hsl(270, 80%, 93%)", dark: "hsl(270, 60%, 22%)" },
  { id: "pink", label: "Pink", light: "hsl(330, 80%, 95%)", dark: "hsl(330, 60%, 20%)" },
  { id: "teal", label: "Teal", light: "hsl(174, 72%, 90%)", dark: "hsl(174, 55%, 18%)" },
] as const;

export type HighlightColorId = typeof highlightColors[number]["id"];

// Highlighting condition schema (column + operator + value)
export const highlightingConditionSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  operator: z.enum([
    // Text/General operators
    "equals", "not_equals", "contains", "not_contains", 
    "starts_with", "ends_with",
    "is_empty", "is_not_empty",
    // Number operators
    "greater_than", "less_than", "greater_equal", "less_equal", "between",
    // Date operators
    "date_equals", "date_before", "date_after", "date_between",
    "is_today", "is_before_today", "is_after_today", 
    "is_this_week", "is_next_week", "is_last_week"
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
  value2: z.union([z.string(), z.number(), z.null()]).optional(), // For "between" operators
});

export type HighlightingCondition = z.infer<typeof highlightingConditionSchema>;

export interface HighlightingRule {
  id: string;
  company_id: string;
  sheet_id: string | null; // null means applies to all sheets
  name: string;
  conditions: HighlightingCondition[];
  logical_operator: "and" | "or"; // How conditions are combined
  row_color: HighlightColorId;
  priority: number; // Lower number = higher priority (evaluated first)
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const insertHighlightingRuleSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(), // null means applies to all sheets
  name: z.string().min(1, "Rule name is required"),
  conditions: z.array(highlightingConditionSchema).min(1, "At least one condition is required"),
  logical_operator: z.enum(["and", "or"]).default("and"),
  row_color: z.enum([
    "red_light", "red", "red_dark",
    "green_light", "green", "green_dark",
    "blue_light", "blue", "blue_dark",
    "yellow", "orange", "purple", "pink", "teal"
  ]),
  priority: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_by_user_id: z.string(),
});

export type InsertHighlightingRule = z.infer<typeof insertHighlightingRuleSchema>;

// ============================================================================
// QUICK FILTERS (Company-wide Quick Filters)
// ============================================================================

// All available operators for conditions - unified across all features
export const conditionOperators = [
  // Text operators
  "equals", "not_equals", "contains", "not_contains", 
  "starts_with", "ends_with",
  "in", "not_in", "is_empty", "is_not_empty",
  // Number operators
  "greater_than", "less_than", "greater_equal", "less_equal", "between",
  // Date operators
  "date_equals", "date_not_equals", "date_before", "date_after", 
  "date_between", "date_within"
] as const;

export type ConditionOperator = typeof conditionOperators[number];

// Relative date options for date filters
export const relativeDateOptions = [
  "today", "tomorrow", "yesterday", 
  "this_week", "next_week", "last_week",
  "this_month", "next_month", "last_month",
  "last_7_days", "last_30_days", "last_90_days"
] as const;

export type RelativeDateOption = typeof relativeDateOptions[number];

// Individual filter condition schema
export const filterConditionSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  operator: z.enum(conditionOperators),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null()
  ]).optional(),
  value2: z.union([  // Secondary value for "between" operators
    z.string(),
    z.number(),
    z.null()
  ]).optional(),
  value_type: z.enum(["text", "number", "date", "boolean", "array"]).optional(),
  relative_date: z.enum(relativeDateOptions).optional(),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

// Quick filter configuration schema
export const quickFilterConfigSchema = z.object({
  conditions: z.array(filterConditionSchema).min(1, "At least one condition is required"),
  logical_operator: z.enum(["and", "or"]).default("and"),
  version: z.number().default(1), // for future schema evolution
});

export type QuickFilterConfig = z.infer<typeof quickFilterConfigSchema>;

export interface QuickFilter {
  id: string;
  company_id: string;
  name: string; // display name like "Hot Leads" or "Visit Today"
  icon: string | null; // optional icon name from lucide-react
  color: string | null; // optional color theme
  filter_config: QuickFilterConfig;
  order_index: number;
  created_by_user_id: string | null; // null for system-created filters
  created_at: string;
  updated_at: string;
}

export const insertQuickFilterSchema = z.object({
  company_id: z.string(),
  name: z.string().min(1, "Filter name is required").max(50, "Name must be 50 characters or less"),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  filter_config: quickFilterConfigSchema,
  order_index: z.number().default(0),
  created_by_user_id: z.string().nullable().optional(), // null for system-created filters, required for user-created
});

export type InsertQuickFilter = z.infer<typeof insertQuickFilterSchema>;

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
  update_via: "whatsapp" | "call" | "transfer";
  update_on: string; // date
  remark: string;
  created_by_user_id?: string | null;
  created_at: string;
}

export const insertLeadUpdateSchema = z.object({
  lead_id: z.string(),
  update_via: z.enum(["whatsapp", "call", "transfer"]),
  update_on: z.string(), // date string
  remark: z.string().min(1, "Remark is required"),
  created_by_user_id: z.string().optional(),
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

// ============================================================================
// UTILITY: Default Columns for New Companies
// ============================================================================
// System column keys that cannot be deleted - these are always present for all companies
export const SYSTEM_COLUMN_KEYS = ["full_name", "mobile_no", "created_at"] as const;

export function getDefaultColumnsForCompany(companyId: string): InsertCustomColumn[] {
  return [
    {
      company_id: companyId,
      sheet_id: null,
      name: "Full Name",
      column_key: "full_name",
      type: "text" as const,
      config: { required: true, is_system_column: true },
      order_index: 0,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Mobile No",
      column_key: "mobile_no",
      type: "mobile" as const,
      config: { required: true, is_system_column: true },
      order_index: 1,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Created At",
      column_key: "created_at",
      type: "date" as const,
      config: { required: true, is_system_column: true },
      order_index: 2,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Phone",
      column_key: "phone",
      type: "text" as const,
      config: {},
      order_index: 3,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Email",
      column_key: "email",
      type: "text" as const,
      config: {},
      order_index: 4,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Status",
      column_key: "status",
      type: "dropdown" as const,
      config: {
        dropdown_options: ["New", "Contacted", "Qualified", "Closed", "Lost"],
      },
      order_index: 5,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Priority",
      column_key: "priority",
      type: "dropdown" as const,
      config: {
        dropdown_options: ["High", "Medium", "Low"],
      },
      order_index: 6,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Notes",
      column_key: "notes",
      type: "text" as const,
      config: {},
      order_index: 7,
    },
  ];
}

// ============================================================================
// DRIZZLE ORM TABLE DEFINITIONS (for PostgreSQL)
// ============================================================================
import { pgTable, varchar, text, boolean, json, jsonb, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  settings: json('settings').$type<{
    timezone?: string;
    date_format?: string;
    custom_branding?: any;
  }>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  invited_by: varchar('invited_by').references(() => users.id, { onDelete: 'set null' }),
  is_active: boolean('is_active').notNull().default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const invites = pgTable('invites', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  inviter_id: varchar('inviter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  expires_at: timestamp('expires_at').notNull(),
  accepted_by: varchar('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  accepted_at: timestamp('accepted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sheets = pgTable('sheets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  owner_id: varchar('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  is_personal: boolean('is_personal').notNull().default(false),
  visibility: varchar('visibility', { length: 50 }).notNull().default('company'),
  settings: json('settings').$type<{
    default_lead_status?: string;
    default_visit_status?: string;
    custom_fields?: any[];
  }>().default({}).notNull(),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const sheet_users = pgTable('sheet_users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('viewer'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  owner_user_id: varchar('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  custom_fields: json('custom_fields').$type<Record<string, any>>().default({}).notNull(),
  meta: json('meta').$type<Record<string, any>>().default({}).notNull(),
  deleted_at: timestamp('deleted_at'),
  deleted_by_user_id: varchar('deleted_by_user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const dropdown_options = pgTable('dropdown_options', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  column_key: varchar('column_key', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const custom_columns = pgTable('custom_columns', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  column_key: varchar('column_key', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  config: json('config').$type<{
    default_value?: any;
    dropdown_options?: string[];
    required?: boolean;
  }>().default({}).notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const validation_rules = pgTable('validation_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  trigger_column_key: varchar('trigger_column_key', { length: 255 }),
  operator: varchar('operator', { length: 50 }),
  trigger_value: json('trigger_value').$type<string | string[]>(),
  required_fields: json('required_fields').$type<string[]>().notNull(),
  conditions: json('conditions').$type<ValidationCondition[]>(),
  logical_operator: varchar('logical_operator', { length: 10 }).default('and'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const highlighting_rules = pgTable('highlighting_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }), // null means applies to all sheets
  name: varchar('name', { length: 255 }).notNull(),
  conditions: json('conditions').$type<HighlightingCondition[]>().notNull(),
  logical_operator: varchar('logical_operator', { length: 10 }).notNull().default('and'),
  row_color: varchar('row_color', { length: 50 }).notNull(),
  priority: integer('priority').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const quick_filters = pgTable('quick_filters', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 50 }),
  filter_config: json('filter_config').$type<QuickFilterConfig>().notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const audit_logs = pgTable('audit_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  model_id: varchar('model_id', { length: 255 }).notNull(),
  payload: json('payload').$type<Record<string, any>>().default({}).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const webhook_logs = pgTable('webhook_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  payload: json('payload').$type<Record<string, any>>().default({}).notNull(),
  headers: json('headers').$type<Record<string, any>>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  error_message: text('error_message'),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const lead_updates = pgTable('lead_updates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  update_via: varchar('update_via', { length: 50 }).notNull(),
  update_on: varchar('update_on', { length: 255 }).notNull(),
  remark: text('remark').notNull(),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const company_webhooks = pgTable('company_webhooks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  secret: varchar('secret', { length: 255 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_allocated_sheet_id: varchar('last_allocated_sheet_id').references(() => sheets.id, { onDelete: 'set null' }),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  // New columns for match-and-update functionality
  match_mode: varchar('match_mode', { length: 50 }).notNull().default('create_only'), // 'create_only', 'match_and_update', 'match_and_add_update', 'match_or_create'
  match_field: varchar('match_field', { length: 255 }).default('mobile_no'), // column_key to match against (e.g., 'mobile_no', 'whatsapp_no')
  update_field_mappings: json('update_field_mappings').$type<Array<{source_field: string; target_column: string}>>().default([]),
  no_match_action: varchar('no_match_action', { length: 50 }).default('create_lead'), // 'create_lead', 'ignore', 'log_only'
  source_label: varchar('source_label', { length: 100 }), // e.g., 'WhatsApp', 'Website', 'Facebook'
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const webhook_field_mappings = pgTable('webhook_field_mappings', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar('webhook_id').notNull().references(() => company_webhooks.id, { onDelete: 'cascade' }),
  webhook_field: varchar('webhook_field', { length: 255 }).notNull(),
  sheet_column_key: varchar('sheet_column_key', { length: 255 }).notNull(),
  use_default_value: boolean('use_default_value').notNull().default(false),
  default_value: varchar('default_value', { length: 500 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Webhook allocation condition schema (for JSON storage)
export const webhookConditionSchema = z.object({
  field: z.string(), // e.g., "language", "data.0.value"
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "starts_with", "ends_with", "in", "not_in",
    "is_empty", "is_not_empty",
    "greater_than", "less_than", "greater_equal", "less_equal"
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
});

export type WebhookCondition = z.infer<typeof webhookConditionSchema>;

export const webhook_allocation_rules = pgTable('webhook_allocation_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar('webhook_id').notNull().references(() => company_webhooks.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  percentage: integer('percentage').notNull(),
  // Legacy single condition fields (kept for backward compatibility)
  condition_field: varchar('condition_field', { length: 255 }), // e.g., "language", "data.0.value"
  condition_operator: varchar('condition_operator', { length: 50 }), // "equals", "contains", "starts_with"
  condition_value: varchar('condition_value', { length: 255 }), // e.g., "Telugu", "Odia"
  // New multi-condition support
  conditions: json('conditions').$type<WebhookCondition[]>().default([]),
  logical_operator: varchar('logical_operator', { length: 10 }).default('and'), // "and" | "or"
  priority: integer('priority').notNull().default(0), // for ordering rules
  is_default: boolean('is_default').notNull().default(false), // fallback if no conditions match
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const webhook_requests = pgTable('webhook_requests', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar('webhook_id').notNull().references(() => company_webhooks.id, { onDelete: 'cascade' }),
  payload: json('payload').$type<Record<string, any>>().default({}).notNull(),
  headers: json('headers').$type<Record<string, any>>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  error_message: text('error_message'),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  allocated_sheet_id: varchar('allocated_sheet_id').references(() => sheets.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
// ============================================================================
// WEBHOOK MANAGEMENT TYPES
// ============================================================================
export type CompanyWebhook = typeof company_webhooks.$inferSelect;
export type InsertCompanyWebhook = typeof company_webhooks.$inferInsert;

export type WebhookFieldMapping = typeof webhook_field_mappings.$inferSelect;
export type InsertWebhookFieldMapping = typeof webhook_field_mappings.$inferInsert;

export type WebhookAllocationRule = typeof webhook_allocation_rules.$inferSelect;
export type InsertWebhookAllocationRule = typeof webhook_allocation_rules.$inferInsert;

export type WebhookRequest = typeof webhook_requests.$inferSelect;
export type InsertWebhookRequest = typeof webhook_requests.$inferInsert;

// ============================================================================
// OUTGOING WEBHOOKS (Send data out when events happen)
// ============================================================================

// Event types that can trigger outgoing webhooks
export type OutgoingWebhookEvent = 
  | "lead_created"
  | "lead_updated"
  | "field_changed"
  | "lead_update_added"
  | "lead_transferred"
  | "lead_deleted";

// Condition for field-based triggers (e.g., when Status changes from Talk to Visit)
export interface FieldCondition {
  field: string;      // column_key of the field to monitor
  from_value?: string | null; // "any" if null/undefined
  to_value?: string | null;   // "any" if null/undefined
}

export const outgoing_webhooks = pgTable('outgoing_webhooks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 255 }), // for signing payloads (HMAC)
  events: json('events').$type<OutgoingWebhookEvent[]>().default([]).notNull(),
  // Field conditions for "field_changed" event - when specific field changes from X to Y
  field_conditions: json('field_conditions').$type<FieldCondition[]>().default([]),
  // Filter to specific sheets (empty = all sheets)
  sheet_ids: json('sheet_ids').$type<string[]>().default([]),
  // Select which fields to include in payload (empty = all fields)
  selected_fields: json('selected_fields').$type<string[]>().default([]),
  // Custom headers for authentication (e.g., {"Authorization": "Bearer xxx"})
  headers: json('headers').$type<Record<string, string>>().default({}),
  is_active: boolean('is_active').notNull().default(true),
  retry_count: integer('retry_count').notNull().default(3),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type OutgoingWebhook = typeof outgoing_webhooks.$inferSelect;
export type InsertOutgoingWebhook = typeof outgoing_webhooks.$inferInsert;

export const insertOutgoingWebhookSchema = createInsertSchema(outgoing_webhooks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertOutgoingWebhookData = z.infer<typeof insertOutgoingWebhookSchema>;

// ============================================================================
// OUTGOING WEBHOOK EXECUTION LOGS
// ============================================================================
export const outgoing_webhook_logs = pgTable('outgoing_webhook_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar('webhook_id').notNull().references(() => outgoing_webhooks.id, { onDelete: 'cascade' }),
  event_type: varchar('event_type', { length: 50 }).notNull(),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  payload_sent: json('payload_sent').$type<Record<string, any>>().default({}).notNull(),
  response_status: integer('response_status'), // HTTP status code
  response_body: text('response_body'),
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'failed', 'pending'
  error_message: text('error_message'),
  retry_attempt: integer('retry_attempt').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type OutgoingWebhookLog = typeof outgoing_webhook_logs.$inferSelect;
export type InsertOutgoingWebhookLog = typeof outgoing_webhook_logs.$inferInsert;

// ============================================================================
// INCOMING WEBHOOK ENHANCEMENT (Match existing leads and update them)
// ============================================================================
// Extend company_webhooks with additional columns for match-and-update functionality

// Match modes for incoming webhooks
export type IncomingWebhookMatchMode = 
  | "create_only"       // Always create new lead (current behavior)
  | "match_and_update"  // Find lead by phone, update fields
  | "match_and_add_update" // Find lead by phone, add Lead Update
  | "match_or_create";  // Find lead, update if found, create if not

// No-match actions
export type NoMatchAction = 
  | "create_lead"  // Create a new lead
  | "ignore"       // Do nothing
  | "log_only";    // Just log the request

// This interface defines the update_field_mappings JSON structure
export interface UpdateFieldMapping {
  source_field: string;    // field from incoming webhook payload
  target_column: string;   // column_key in lead's custom_fields
}

// ============================================================================
// REPORTS
// ============================================================================
export const reports = pgTable('reports', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  report_type: varchar('report_type', { length: 100 }).notNull(),
  sheet_ids: json('sheet_ids').$type<string[]>().notNull().default(sql`'[]'`),
  config: json('config').$type<{
    date_range?: { start?: string; end?: string; preset?: string };
    group_by?: string;
    filters?: any[];
    chart_type?: string;
    metrics?: string[];
    x_axis?: string; // Column key for X-axis (for charts)
    y_axis?: string; // Aggregation type: count, sum, avg, etc. (for charts)
    y_axis_field?: string; // Field to aggregate (for sum/avg) (for charts)
    row_fields?: string[]; // Row grouping columns (for pivot tables)
    column_field?: string; // Column pivot field (for pivot tables)
    value_field?: string; // Field to aggregate (for pivot tables)
    aggregation?: string; // Aggregation type for pivot tables
  }>().default({}).notNull(),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertReportData = z.infer<typeof insertReportSchema>;

// ============================================================================
// USER COLUMN PREFERENCES (Column Width Customization)
// ============================================================================
export const userColumnPreferences = pgTable('user_column_preferences', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  column_key: varchar('column_key').notNull(), // e.g., "name", "mobile", "custom_field_name"
  width: integer('width').notNull(), // width in pixels
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type UserColumnPreference = typeof userColumnPreferences.$inferSelect;
export type InsertUserColumnPreference = typeof userColumnPreferences.$inferInsert;

export const insertUserColumnPreferenceSchema = createInsertSchema(userColumnPreferences).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUserColumnPreferenceData = z.infer<typeof insertUserColumnPreferenceSchema>;

// ============================================================================
// REPORT DRILLDOWN (Click-through to see underlying leads)
// ============================================================================
export interface DrilldownFilters {
  [key: string]: string | number | null; // e.g., { lead_status: "Talked", lang: "Hindi" }
}

export interface DrilldownLead extends Lead {
  sheet_name: string;
  owner_name: string;
}

export interface DrilldownResponse {
  leads: DrilldownLead[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================================================
// PUSH SUBSCRIPTIONS (Web Push Notifications)
// ============================================================================
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(), // Public key for encryption
  auth: text('auth').notNull(), // Auth secret for encryption
  device_type: varchar('device_type', { length: 50 }), // 'mobile' or 'desktop'
  user_agent: text('user_agent'), // Browser/device info
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertPushSubscriptionData = z.infer<typeof insertPushSubscriptionSchema>;

// ============================================================================
// NOTIFICATION SETTINGS (Company-level Configuration)
// ============================================================================
export interface NotificationSettings {
  lead_assigned: boolean; // When a lead is assigned to a user
  nfdt_reminder: boolean; // Daily reminder for leads with NFDT = today
  lead_updated: boolean; // When another user updates your lead
  webhook_received: boolean; // New lead via webhook
  user_joined: boolean; // Team member accepts invite
}

export const defaultNotificationSettings: NotificationSettings = {
  lead_assigned: true,
  nfdt_reminder: true,
  lead_updated: false,
  webhook_received: true,
  user_joined: true,
};

// ============================================================================
// ATTENDANCE SYSTEM
// ============================================================================
export interface AttendanceEntry {
  id: string;
  user_id: string;
  company_id: string;
  entry_time: string;
  entry_location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null;
  entry_selfie_url: string | null;
  exit_time: string | null;
  exit_type: "normal" | "forced" | null; // normal = conditions met, forced = force exit
  force_exit_reason: string | null; // reason provided for force exit
  force_exit_blocking_reasons: string[] | null; // what conditions were blocking
  review_status: "pending" | "approved" | "rejected" | null; // for force exits
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const attendanceEntries = pgTable('attendance_entries', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  entry_time: timestamp('entry_time').notNull(),
  entry_location: json('entry_location').$type<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null>(),
  entry_selfie_url: text('entry_selfie_url'),
  exit_time: timestamp('exit_time'),
  exit_type: varchar('exit_type', { length: 50 }), // 'normal' or 'forced'
  force_exit_reason: text('force_exit_reason'),
  force_exit_blocking_reasons: json('force_exit_blocking_reasons').$type<string[]>(),
  review_status: varchar('review_status', { length: 50 }), // 'pending', 'approved', 'rejected'
  reviewed_by_user_id: varchar('reviewed_by_user_id').references(() => users.id),
  reviewed_at: timestamp('reviewed_at'),
  review_notes: text('review_notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type AttendanceEntryRecord = typeof attendanceEntries.$inferSelect;
export type InsertAttendanceEntry = typeof attendanceEntries.$inferInsert;

export const insertAttendanceEntrySchema = createInsertSchema(attendanceEntries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAttendanceEntryData = z.infer<typeof insertAttendanceEntrySchema>;

// ============================================================================
// ATTENDANCE RULES (Admin-configurable exit conditions)
// ============================================================================
export interface AttendanceRule {
  id: string;
  company_id: string;
  rule_type: "no_past_nfdt" | "all_nfdt_updated" | "tomorrow_visits_scheduled" | "custom";
  name: string;
  description: string | null;
  is_enabled: boolean;
  config: Record<string, any>; // for custom rules or additional configuration
  created_at: string;
  updated_at: string;
}

export const attendanceRules = pgTable('attendance_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  rule_type: varchar('rule_type', { length: 100 }).notNull(), // 'no_past_nfdt', 'all_nfdt_updated', 'tomorrow_visits_scheduled', 'custom'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  is_enabled: boolean('is_enabled').notNull().default(true),
  config: json('config').$type<Record<string, any>>().default({}).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type AttendanceRuleRecord = typeof attendanceRules.$inferSelect;
export type InsertAttendanceRule = typeof attendanceRules.$inferInsert;

export const insertAttendanceRuleSchema = createInsertSchema(attendanceRules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAttendanceRuleData = z.infer<typeof insertAttendanceRuleSchema>;

// Default attendance rules for new companies
export function getDefaultAttendanceRules(companyId: string): InsertAttendanceRule[] {
  return [
    {
      company_id: companyId,
      rule_type: "no_past_nfdt",
      name: "No Past NFDTs",
      description: "All leads with past Next Follow-up Date must be updated before exit",
      is_enabled: true,
      config: {},
    },
    {
      company_id: companyId,
      rule_type: "all_nfdt_updated",
      name: "All NFDTs Updated Today",
      description: "All leads with NFDT = today must have been updated",
      is_enabled: false,
      config: {},
    },
    {
      company_id: companyId,
      rule_type: "tomorrow_visits_scheduled",
      name: "Tomorrow Visits Scheduled",
      description: "All visits for tomorrow must be scheduled before exit",
      is_enabled: false,
      config: {},
    },
  ];
}

// ============================================================================
// TASKS SYSTEM
// ============================================================================
export type TaskStatus = "pending" | "ongoing" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  status: TaskStatus;
  user_remarks: string | null;
  admin_remarks: string | null;
  assigned_to_user_id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const tasks = pgTable('tasks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // 'low', 'medium', 'high'
  start_date: timestamp('start_date'),
  due_date: timestamp('due_date'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'ongoing', 'completed'
  user_remarks: text('user_remarks'),
  admin_remarks: text('admin_remarks'),
  assigned_to_user_id: varchar('assigned_to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TaskRecord = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTaskData = z.infer<typeof insertTaskSchema>;

// ============================================================================
// TASK LEADS (Junction table for linking tasks to leads)
// ============================================================================
export interface TaskLead {
  id: string;
  task_id: string;
  lead_id: string;
  created_at: string;
}

export const taskLeads = pgTable('task_leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  task_id: varchar('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type TaskLeadRecord = typeof taskLeads.$inferSelect;
export type InsertTaskLead = typeof taskLeads.$inferInsert;

export const insertTaskLeadSchema = createInsertSchema(taskLeads).omit({
  id: true,
  created_at: true,
});

export type InsertTaskLeadData = z.infer<typeof insertTaskLeadSchema>;

// ============================================================================
// TASK UPDATES (Activity history with audit trail)
// ============================================================================
export interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  update_type: "status_change" | "remarks_change" | "details_change" | "lead_linked" | "lead_unlinked" | "created" | "comment";
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  description: string | null;
  created_at: string;
  user_name?: string;
}

export const taskUpdates = pgTable('task_updates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  task_id: varchar('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  update_type: varchar('update_type', { length: 50 }).notNull(), // 'status_change', 'remarks_change', 'details_change', 'lead_linked', 'lead_unlinked', 'created'
  old_value: json('old_value').$type<Record<string, any> | null>(),
  new_value: json('new_value').$type<Record<string, any> | null>(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type TaskUpdateRecord = typeof taskUpdates.$inferSelect;
export type InsertTaskUpdate = typeof taskUpdates.$inferInsert;

export const insertTaskUpdateSchema = createInsertSchema(taskUpdates).omit({
  id: true,
  created_at: true,
});

export type InsertTaskUpdateData = z.infer<typeof insertTaskUpdateSchema>;

// ============================================================================
// TASK NOTIFICATION SETTINGS (Company-level Configuration)
// ============================================================================
export interface TaskNotificationSettings {
  enabled: boolean;
  times: string[]; // Array of times in HH:MM format, e.g., ["09:00", "16:00", "18:00"]
  timezone: string; // IANA timezone, e.g., "Asia/Kolkata"
}

// ============================================================================
// USER SHEET VIEWS (Personal Column Order & Visibility Preferences)
// ============================================================================
export interface UserSheetView {
  id: string;
  user_id: string;
  sheet_id: string;
  column_order: string[]; // Array of column_keys in user's preferred order
  hidden_columns: string[]; // Array of column_keys user wants to hide
  created_at: string;
  updated_at: string;
}

export const userSheetViews = pgTable('user_sheet_views', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  column_order: json('column_order').$type<string[]>().default([]),
  hidden_columns: json('hidden_columns').$type<string[]>().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type UserSheetViewRecord = typeof userSheetViews.$inferSelect;
export type InsertUserSheetView = typeof userSheetViews.$inferInsert;

export const insertUserSheetViewSchema = createInsertSchema(userSheetViews).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUserSheetViewData = z.infer<typeof insertUserSheetViewSchema>;

// ============================================================================
// MOBILE CALL INTEGRATION - Call Sessions
// ============================================================================
export type CallDirection = "incoming" | "outgoing";
export type CallSessionStatus = "ringing" | "answered" | "missed" | "rejected" | "completed";

export interface CallSession {
  id: string;
  company_id: string;
  user_id: string; // the app user who made/received the call
  lead_id: string | null; // matched lead (can be null if no match)
  sheet_id: string | null; // sheet of the matched lead
  direction: CallDirection;
  caller_number: string;
  callee_number: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: CallSessionStatus;
  recording_url: string | null;
  notes: Record<string, any> | null;
  lead_update_id: string | null; // reference to lead_update created
  created_at: string;
  updated_at: string;
}

export const call_sessions = pgTable('call_sessions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'set null' }),
  direction: varchar('direction', { length: 20 }).notNull(), // 'incoming' | 'outgoing'
  caller_number: varchar('caller_number', { length: 50 }).notNull(),
  callee_number: varchar('callee_number', { length: 50 }).notNull(),
  started_at: timestamp('started_at').notNull(),
  ended_at: timestamp('ended_at'),
  duration_seconds: integer('duration_seconds'),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // 'ringing', 'answered', 'missed', 'rejected', 'completed'
  recording_url: text('recording_url'),
  notes: json('notes').$type<Record<string, any>>(),
  lead_update_id: varchar('lead_update_id').references(() => lead_updates.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type CallSessionRecord = typeof call_sessions.$inferSelect;
export type InsertCallSession = typeof call_sessions.$inferInsert;

export const insertCallSessionSchema = createInsertSchema(call_sessions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCallSessionData = z.infer<typeof insertCallSessionSchema>;

// ============================================================================
// MOBILE CALL INTEGRATION - Lead Phone Index (for fast lookups)
// ============================================================================
export interface LeadPhoneIndex {
  id: string;
  company_id: string;
  lead_id: string;
  sheet_id: string;
  normalized_phone: string; // normalized phone number (digits only, no country code variance)
  phone_type: string; // 'mobile_no', 'whatsapp_no', 'alternate_mobile', etc.
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const lead_phone_index = pgTable('lead_phone_index', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  normalized_phone: varchar('normalized_phone', { length: 20 }).notNull(),
  phone_type: varchar('phone_type', { length: 50 }).notNull().default('mobile_no'),
  is_primary: boolean('is_primary').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type LeadPhoneIndexRecord = typeof lead_phone_index.$inferSelect;
export type InsertLeadPhoneIndex = typeof lead_phone_index.$inferInsert;

export const insertLeadPhoneIndexSchema = createInsertSchema(lead_phone_index).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertLeadPhoneIndexData = z.infer<typeof insertLeadPhoneIndexSchema>;

// ============================================================================
// MOBILE API SCHEMAS
// ============================================================================

// Phone lookup request/response
export const mobileCallLookupSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

export type MobileCallLookupRequest = z.infer<typeof mobileCallLookupSchema>;

// Lead lookup result with full details for mobile card view
export interface MobileLeadLookupResult {
  lead_id: string;
  sheet_id: string;
  sheet_name: string;
  owner_user_id: string;
  owner_name: string;
  custom_fields: Record<string, any>;
  lead_updates: LeadUpdate[];
  matched_phone: string;
  phone_type: string;
}

// Company-wide search result for quick lead lookup
export interface CompanySearchResult {
  lead_id: string;
  sheet_id: string;
  sheet_name: string;
  owner_user_id: string;
  owner_name: string;
  full_name: string;
  mobile_no: string;
  custom_fields: Record<string, any>;
  match_type: "phone" | "name";
}

// Call session creation from mobile app
export const createCallSessionSchema = z.object({
  direction: z.enum(["incoming", "outgoing"]),
  caller_number: z.string().min(1, "Caller number is required"),
  callee_number: z.string().min(1, "Callee number is required"),
  started_at: z.string(), // ISO timestamp
  ended_at: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  status: z.enum(["ringing", "answered", "missed", "rejected", "completed"]).default("completed"),
  lead_id: z.string().nullable().optional(), // manually linked lead
  notes: z.record(z.any()).nullable().optional(),
  create_lead_update: z.boolean().default(true), // whether to create a LeadUpdate entry
  lead_update_remark: z.string().optional(), // custom remark for lead update
});

export type CreateCallSessionRequest = z.infer<typeof createCallSessionSchema>;

// Update call session
export const updateCallSessionSchema = z.object({
  lead_id: z.string().nullable().optional(), // re-link to different lead
  notes: z.record(z.any()).nullable().optional(),
  recording_url: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  status: z.enum(["ringing", "answered", "missed", "rejected", "completed"]).optional(),
});

export type UpdateCallSessionRequest = z.infer<typeof updateCallSessionSchema>;

// Mobile lead quick update
export const mobileLeadUpdateSchema = z.object({
  custom_fields: z.record(z.any()).optional(),
  update_via: z.enum(["whatsapp", "call", "transfer"]).default("call"),
  remark: z.string().optional(),
});

export type MobileLeadUpdateRequest = z.infer<typeof mobileLeadUpdateSchema>;

// ============================================================================
// API KEYS (For Mobile Developer Access)
// ============================================================================
export interface ApiKey {
  id: string;
  key_prefix: string; // First 8 chars of key for identification (lfs_live_)
  key_hash: string; // bcrypt hash of full key
  name: string; // Descriptive name for the key
  company_id: string;
  created_by: string; // Super Admin who created it
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export const api_keys = pgTable('api_keys', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  key_prefix: varchar('key_prefix', { length: 20 }).notNull(),
  key_hash: varchar('key_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  created_by: varchar('created_by').notNull().references(() => users.id),
  is_active: boolean('is_active').notNull().default(true),
  last_used_at: timestamp('last_used_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  revoked_at: timestamp('revoked_at'),
});

export type ApiKeyRecord = typeof api_keys.$inferSelect;
export type InsertApiKey = typeof api_keys.$inferInsert;

export const insertApiKeySchema = createInsertSchema(api_keys).omit({
  id: true,
  created_at: true,
});

export type InsertApiKeyData = z.infer<typeof insertApiKeySchema>;

// Schema for creating a new API key (user input)
export const createApiKeySchema = z.object({
  name: z.string().min(1, "API key name is required").max(255),
  company_id: z.string().min(1, "Company ID is required"),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

// ============================================================================
// ACTIVITY LOGS (Comprehensive User Action Tracking)
// ============================================================================

// All possible activity actions - plain English descriptions generated from these
export const activityActionTypes = [
  // Lead lifecycle
  "lead_created",
  "lead_updated",
  "cell_cleared",
  "lead_deleted",
  "lead_restored",
  "lead_permanently_deleted",
  "lead_transferred",
  "lead_thought_changed",
  // Lead updates (remarks/follow-up dialog)
  "lead_update_added",
  "lead_nfdt_changed",
  // Bulk operations
  "leads_imported",
  "leads_exported",
  "leads_bulk_transferred",
  "leads_bulk_deleted",
  "leads_bulk_restored",
  // Column management
  "column_created",
  "column_updated",
  "column_deleted",
  "column_reordered",
  // Dropdown management
  "dropdown_option_added",
  "dropdown_option_updated",
  "dropdown_option_deleted",
  // Validation rules
  "validation_rule_created",
  "validation_rule_updated",
  "validation_rule_deleted",
  // Sheet operations
  "sheet_created",
  "sheet_renamed",
  "sheet_deleted",
  // User management
  "user_invited",
  "user_role_changed",
  "user_deactivated",
  "user_reactivated",
  "sheet_access_granted",
  "sheet_access_removed",
  // Webhook management
  "webhook_created",
  "webhook_updated",
  "webhook_deleted",
  "webhook_lead_received",
  // Outgoing webhook
  "outgoing_webhook_created",
  "outgoing_webhook_updated",
  "outgoing_webhook_deleted",
  // Attendance
  "attendance_entry",
  "attendance_exit",
  "force_exit_requested",
  "force_exit_approved",
  "force_exit_rejected",
  // Auth events
  "user_login",
  "user_logout",
  // API key management
  "api_key_created",
  "api_key_revoked",
  // Quick filters
  "quick_filter_created",
  "quick_filter_updated",
  "quick_filter_deleted",
  // Call sessions
  "call_session_created",
  "call_session_updated",
] as const;

export type ActivityAction = typeof activityActionTypes[number];

// Target types for activity logs
export const activityTargetTypes = [
  "lead",
  "leads", // for bulk operations
  "column",
  "dropdown_option",
  "validation_rule",
  "sheet",
  "user",
  "webhook",
  "outgoing_webhook",
  "attendance",
  "api_key",
  "quick_filter",
  "call_session",
  "lead_update",
] as const;

export type ActivityTargetType = typeof activityTargetTypes[number];

// Source of the activity
export const activitySources = [
  "ui",       // Web UI (desktop)
  "mobile",   // Mobile web UI
  "api",      // API call
  "webhook",  // Incoming webhook
  "import",   // Excel/CSV import
  "system",   // System automation
] as const;

export type ActivitySource = typeof activitySources[number];

// Actor roles
export const activityActorRoles = [
  "user",
  "company_admin",
  "super_admin",
  "system",
] as const;

export type ActivityActorRole = typeof activityActorRoles[number];

// Field change structure for storing before/after values
export interface FieldChange {
  field_key: string;      // column_key or field identifier
  field_label: string;    // Human-readable column name (snapshot at log time)
  old_value: any;         // Value before change
  new_value: any;         // Value after change
  old_display?: string;   // Formatted display value (e.g., dropdown label)
  new_display?: string;   // Formatted display value
}

// Bulk operation metadata
export interface BulkMeta {
  count: number;          // Number of items affected
  sample_items?: string[]; // Sample of affected item names (first 5)
  details?: Record<string, any>; // Additional context
}

// Main activity log interface
export interface ActivityLog {
  id: string;
  company_id: string;
  sheet_id: string | null;        // null for company-wide actions
  user_id: string | null;         // null for system actions
  // Snapshot fields - stored as they were at log time
  actor_name: string;             // User name who performed the action
  actor_email: string | null;     // User email
  actor_role: ActivityActorRole;
  // Action details
  action: ActivityAction;
  target_type: ActivityTargetType;
  target_id: string | null;       // ID of affected item
  target_name: string | null;     // Snapshot of lead/item name
  sheet_name: string | null;      // Snapshot of sheet name
  // Human-readable summary
  summary: string;                // Plain English sentence describing the action
  // Detailed change information
  details: {
    changes?: FieldChange[];      // Field-level changes
    bulk_meta?: BulkMeta;         // For bulk operations
    extra?: Record<string, any>;  // Any additional context
  } | null;
  // Metadata
  source: ActivitySource;
  ip_address: string | null;      // Hashed or partial for privacy
  occurred_at: string;
}

export const activity_logs = pgTable('activity_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'set null' }),
  user_id: varchar('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Snapshot fields
  actor_name: varchar('actor_name', { length: 255 }).notNull(),
  actor_email: varchar('actor_email', { length: 255 }),
  actor_role: varchar('actor_role', { length: 50 }).notNull(),
  // Action details
  action: varchar('action', { length: 100 }).notNull(),
  target_type: varchar('target_type', { length: 50 }).notNull(),
  target_id: varchar('target_id'),
  target_name: varchar('target_name', { length: 500 }),
  sheet_name: varchar('sheet_name', { length: 255 }),
  // Summary and details
  summary: text('summary').notNull(),
  details: json('details').$type<{
    changes?: FieldChange[];
    bulk_meta?: BulkMeta;
    extra?: Record<string, any>;
  } | null>(),
  // Metadata
  source: varchar('source', { length: 50 }).notNull().default('ui'),
  ip_address: varchar('ip_address', { length: 100 }),
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
});

export type ActivityLogRecord = typeof activity_logs.$inferSelect;
export type InsertActivityLog = typeof activity_logs.$inferInsert;

export const insertActivityLogSchema = createInsertSchema(activity_logs).omit({
  id: true,
  occurred_at: true,
});

export type InsertActivityLogData = z.infer<typeof insertActivityLogSchema>;

// ============================================================================
// ACTIVITY LOG QUERY HELPERS
// ============================================================================

// Query filters for fetching activity logs
export interface ActivityLogFilters {
  company_id?: string;      // Required for non-super-admin
  sheet_id?: string;        // Filter by sheet
  user_id?: string;         // Filter by user
  action?: ActivityAction | ActivityAction[]; // Filter by action type(s)
  target_type?: ActivityTargetType;
  date_from?: string;       // ISO date string
  date_to?: string;         // ISO date string
  search?: string;          // Search in summary/target_name
  limit?: number;
  page?: number;            // Page number (1-indexed) - converted to offset
  offset?: number;          // Direct offset (takes precedence over page)
}

// Response for paginated activity logs
export interface ActivityLogResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Summary stats for activity logs
export interface ActivityLogStats {
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_user: { user_id: string; user_name: string; count: number }[];
  actions_today: number;
  actions_this_week: number;
}

// ============================================================================
// TARGET MANAGEMENT SYSTEM (TMS)
// ============================================================================

// Goal types for different kinds of targets
export const targetGoalTypes = [
  "count",       // Count leads matching conditions (e.g., "20 Visited leads")
  "sum",         // Sum of a numeric column (e.g., "Total deal value ₹5Cr")
  "average",     // Average of a numeric column (e.g., "Avg deal size ₹2L")
  "percentage",  // Ratio of two counts (e.g., "5% Visit Rate")
  "updates",     // Number of lead updates added (e.g., "2000 updates")
  "conversion",  // Conversion from value A to value B (e.g., "New → Visited %")
  "compliance",  // NFDT/follow-up compliance rate
] as const;

export type TargetGoalType = typeof targetGoalTypes[number];

// Assignment types - who the target is for
export const targetAssignmentTypes = [
  "individual",  // Each assigned user has their own target
  "team",        // Combined total for all assigned users
  "all_users",   // All active company users (individual targets)
] as const;

export type TargetAssignmentType = typeof targetAssignmentTypes[number];

// Scope types - which sheets the target applies to
export const targetScopeTypes = [
  "company_wide",     // All sheets in the company
  "specific_sheets",  // Only selected sheets
] as const;

export type TargetScopeType = typeof targetScopeTypes[number];

// Time types - one-time vs recurring
export const targetTimeTypes = [
  "one_time",   // Fixed date range
  "recurring",  // Daily/Weekly/Monthly recurring
] as const;

export type TargetTimeType = typeof targetTimeTypes[number];

// Recurring frequency
export const targetRecurringFrequencies = [
  "daily",
  "weekly",
  "monthly",
] as const;

export type TargetRecurringFrequency = typeof targetRecurringFrequencies[number];

// Target status
export const targetStatuses = [
  "active",
  "paused",
  "completed",
  "expired",
] as const;

export type TargetStatus = typeof targetStatuses[number];

// Condition operators for target goals (extended version)
export const targetConditionOperators = [
  // Text/General operators
  "equals", "not_equals", "contains", "not_contains",
  "starts_with", "ends_with",
  "in", "not_in",
  "is_empty", "is_not_empty",
  // Number operators
  "greater_than", "less_than", "greater_equal", "less_equal", "between",
  // Date operators
  "date_equals", "date_before", "date_after", "date_between",
  "is_today", "is_before_today", "is_after_today",
  "is_this_week", "is_this_month",
  "is_overdue", "within_days", "days_ago",
] as const;

export type TargetConditionOperator = typeof targetConditionOperators[number];

// Target condition schema for goal conditions
export const targetConditionSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "starts_with", "ends_with",
    "in", "not_in",
    "is_empty", "is_not_empty",
    "greater_than", "less_than", "greater_equal", "less_equal", "between",
    "date_equals", "date_before", "date_after", "date_between",
    "is_today", "is_before_today", "is_after_today",
    "is_this_week", "is_this_month",
    "is_overdue", "within_days", "days_ago",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
  value2: z.union([z.string(), z.number(), z.null()]).optional(), // For "between" operators
});

export type TargetCondition = z.infer<typeof targetConditionSchema>;

// Aggregation types for ratio-based goals
export type RatioAggregationType = "count" | "sum";

// Ratio configuration for percentage, conversion, average, and compliance goals
export interface RatioNumeratorConfig {
  aggregation: RatioAggregationType;        // "count" or "sum"
  column_key?: string;                      // Column for sum aggregation
  conditions: TargetCondition[];            // Conditions to filter leads
  logical_operator: "and" | "or";           // How conditions are combined
}

export interface RatioDenominatorConfig {
  mode: "total_scope" | "filtered";         // Total leads in scope OR filtered leads
  aggregation: RatioAggregationType;        // "count" or "sum" (for filtered mode)
  column_key?: string;                      // Column for sum aggregation
  conditions: TargetCondition[];            // Conditions (only used if mode = "filtered")
  logical_operator: "and" | "or";           // How conditions are combined
}

export interface RatioConfig {
  numerator: RatioNumeratorConfig;
  denominator: RatioDenominatorConfig;
  display_variant: "percentage" | "conversion" | "average" | "compliance";
}

// Target goal configuration
export interface TargetGoalConfig {
  goal_type: TargetGoalType;
  target_value: number;                    // The value to achieve
  column_key?: string;                     // Column for sum/average goals
  conditions: TargetCondition[];           // Conditions to filter leads
  logical_operator: "and" | "or";          // How conditions are combined
  // Unified ratio configuration for percentage/conversion/average/compliance goals
  ratio_config?: RatioConfig;
  // Legacy fields (kept for backward compatibility)
  numerator_conditions?: TargetCondition[];   // What counts as success
  denominator_conditions?: TargetCondition[]; // Total pool
}

// Target goal interface
export interface TargetGoal {
  id: string;
  target_id: string;
  name: string;                            // e.g., "Get 20 Visited leads"
  config: TargetGoalConfig;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Main Target interface
export interface Target {
  id: string;
  company_id: string;
  name: string;                            // e.g., "December Sales Target"
  description: string | null;
  // Assignment
  assignment_type: TargetAssignmentType;
  // Scope
  scope_type: TargetScopeType;
  scope_sheet_ids: string[] | null;        // Only if scope_type = specific_sheets
  // Time configuration
  time_type: TargetTimeType;
  start_date: string;                      // ISO date
  end_date: string | null;                 // ISO date (null for recurring)
  recurring_frequency: TargetRecurringFrequency | null;
  // Status
  status: TargetStatus;
  // Notification settings
  notification_milestones: number[];       // e.g., [20, 40, 60, 80, 100]
  // Metadata
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Target user assignment
export interface TargetUserAssignment {
  id: string;
  target_id: string;
  user_id: string;
  created_at: string;
}

// Target user progress (for tracking)
export interface TargetUserProgress {
  id: string;
  target_id: string;
  goal_id: string;
  user_id: string;
  period_start: string;                    // For recurring targets, tracks which period
  period_end: string;
  current_value: number;
  target_value: number;
  is_achieved: boolean;
  achieved_at: string | null;
  streak_count: number;                    // For recurring targets
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

// Company holidays
export interface CompanyHoliday {
  id: string;
  company_id: string;
  name: string;
  date: string;                            // ISO date
  created_by_user_id: string;
  created_at: string;
}

// Target notification
export interface TargetNotification {
  id: string;
  company_id: string;
  target_id: string;
  user_id: string;
  notification_type: "assigned" | "milestone" | "deadline_approaching" | "achieved" | "expired";
  milestone_percentage: number | null;     // 20, 40, 60, 80, 100
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// ============================================================================
// TARGET MANAGEMENT SYSTEM - DATABASE TABLES
// ============================================================================

export const targets = pgTable('targets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Assignment
  assignment_type: varchar('assignment_type', { length: 50 }).notNull().default('individual'),
  // Scope
  scope_type: varchar('scope_type', { length: 50 }).notNull().default('company_wide'),
  scope_sheet_ids: json('scope_sheet_ids').$type<string[]>(),
  // Time configuration
  time_type: varchar('time_type', { length: 50 }).notNull().default('one_time'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  recurring_frequency: varchar('recurring_frequency', { length: 50 }),
  // Status
  status: varchar('status', { length: 50 }).notNull().default('active'),
  // Notification settings
  notification_milestones: json('notification_milestones').$type<number[]>().default([20, 40, 60, 80, 100]),
  // Metadata
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TargetRecord = typeof targets.$inferSelect;
export type InsertTarget = typeof targets.$inferInsert;

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTargetData = z.infer<typeof insertTargetSchema>;

export const target_goals = pgTable('target_goals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  target_id: varchar('target_id').notNull().references(() => targets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  config: json('config').$type<TargetGoalConfig>().notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TargetGoalRecord = typeof target_goals.$inferSelect;
export type InsertTargetGoal = typeof target_goals.$inferInsert;

export const insertTargetGoalSchema = createInsertSchema(target_goals).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTargetGoalData = z.infer<typeof insertTargetGoalSchema>;

export const target_user_assignments = pgTable('target_user_assignments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  target_id: varchar('target_id').notNull().references(() => targets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type TargetUserAssignmentRecord = typeof target_user_assignments.$inferSelect;
export type InsertTargetUserAssignment = typeof target_user_assignments.$inferInsert;

export const target_user_progress = pgTable('target_user_progress', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  target_id: varchar('target_id').notNull().references(() => targets.id, { onDelete: 'cascade' }),
  goal_id: varchar('goal_id').notNull().references(() => target_goals.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  current_value: doublePrecision('current_value').notNull().default(0),
  target_value: doublePrecision('target_value').notNull(),
  is_achieved: boolean('is_achieved').notNull().default(false),
  achieved_at: timestamp('achieved_at'),
  streak_count: integer('streak_count').notNull().default(0),
  last_calculated_at: timestamp('last_calculated_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TargetUserProgressRecord = typeof target_user_progress.$inferSelect;
export type InsertTargetUserProgress = typeof target_user_progress.$inferInsert;

export const company_holidays = pgTable('company_holidays', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type CompanyHolidayRecord = typeof company_holidays.$inferSelect;
export type InsertCompanyHoliday = typeof company_holidays.$inferInsert;

export const insertCompanyHolidaySchema = createInsertSchema(company_holidays).omit({
  id: true,
  created_at: true,
});

export type InsertCompanyHolidayData = z.infer<typeof insertCompanyHolidaySchema>;

export const target_notifications = pgTable('target_notifications', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  target_id: varchar('target_id').notNull().references(() => targets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notification_type: varchar('notification_type', { length: 50 }).notNull(),
  milestone_percentage: integer('milestone_percentage'),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  is_dismissed: boolean('is_dismissed').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type TargetNotificationRecord = typeof target_notifications.$inferSelect;
export type InsertTargetNotification = typeof target_notifications.$inferInsert;

// ============================================================================
// TARGET MANAGEMENT SYSTEM - API HELPERS
// ============================================================================

// Full target with goals and assignments (for API responses)
export interface TargetWithDetails extends Target {
  goals: TargetGoal[];
  assigned_users: { id: string; name: string; email: string }[];
  scope_sheets?: { id: string; name: string }[];
  created_by_user?: { id: string; name: string };
}

// Target progress for a user
export interface UserTargetProgress {
  target: TargetWithDetails;
  progress: {
    goal_id: string;
    goal_name: string;
    current_value: number;
    target_value: number;
    percentage: number;
    is_achieved: boolean;
    achieved_at: string | null;
  }[];
  overall_percentage: number;
  is_fully_achieved: boolean;
  days_remaining: number | null;
  streak_count: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  total_targets: number;
  achieved_targets: number;
  overall_progress_percentage: number;
  total_streak: number;
  rank: number;
}

// Target filters for API queries
export interface TargetFilters {
  company_id?: string;
  user_id?: string;
  status?: TargetStatus | TargetStatus[];
  time_type?: TargetTimeType;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Ratio config schema for validation
export const ratioNumeratorSchema = z.object({
  aggregation: z.enum(["count", "sum"]),
  column_key: z.string().optional(),
  conditions: z.array(targetConditionSchema).optional().default([]),
  logical_operator: z.enum(["and", "or"]).optional().default("and"),
});

export const ratioDenominatorSchema = z.object({
  mode: z.enum(["total_scope", "filtered"]),
  aggregation: z.enum(["count", "sum"]).optional().default("count"),
  column_key: z.string().optional(),
  conditions: z.array(targetConditionSchema).optional().default([]),
  logical_operator: z.enum(["and", "or"]).optional().default("and"),
});

export const ratioConfigSchema = z.object({
  numerator: ratioNumeratorSchema,
  denominator: ratioDenominatorSchema,
  display_variant: z.enum(["percentage", "conversion", "average", "compliance"]),
});

// Create target request
export const createTargetSchema = z.object({
  name: z.string().min(1, "Target name is required").max(255),
  description: z.string().optional(),
  assignment_type: z.enum(["individual", "team", "all_users"]),
  assigned_user_ids: z.array(z.string()).optional(), // Required if assignment_type is not all_users
  scope_type: z.enum(["company_wide", "specific_sheets"]),
  scope_sheet_ids: z.array(z.string()).optional(), // Required if scope_type is specific_sheets
  time_type: z.enum(["one_time", "recurring"]),
  start_date: z.string(), // ISO date
  end_date: z.string().optional(), // Required for one_time
  recurring_frequency: z.enum(["daily", "weekly", "monthly"]).optional(), // Required for recurring
  notification_milestones: z.array(z.number()).optional().default([20, 40, 60, 80, 100]),
  goals: z.array(z.object({
    name: z.string().min(1, "Goal name is required"),
    goal_type: z.enum(["count", "sum", "average", "percentage", "updates", "conversion", "compliance"]),
    target_value: z.number().positive("Target value must be positive"),
    column_key: z.string().optional(),
    conditions: z.array(targetConditionSchema).optional().default([]),
    logical_operator: z.enum(["and", "or"]).optional().default("and"),
    // Unified ratio config for percentage/conversion/average/compliance
    ratio_config: ratioConfigSchema.optional(),
    // Legacy fields (kept for backward compatibility)
    numerator_conditions: z.array(targetConditionSchema).optional(),
    denominator_conditions: z.array(targetConditionSchema).optional(),
  })).min(1, "At least one goal is required"),
});

export type CreateTargetRequest = z.infer<typeof createTargetSchema>;

// ============================================================================
// GOOGLE SHEETS BACKUP SYSTEM
// ============================================================================

// Backup configuration status
export const backupSyncStatuses = [
  "pending",      // Never synced yet
  "syncing",      // Currently syncing
  "success",      // Last sync succeeded
  "failed",       // Last sync failed
] as const;

export type BackupSyncStatus = typeof backupSyncStatuses[number];

// Backup configuration - links LFS Sheet to Google Sheet
export interface BackupConfig {
  id: string;
  company_id: string;
  sheet_id: string;                    // LFS Sheet ID
  google_sheet_url: string;            // Full Google Sheet URL
  google_sheet_id: string;             // Extracted sheet ID from URL
  is_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: BackupSyncStatus;
  last_sync_rows: number | null;       // Number of rows synced
  last_sync_error: string | null;      // Error message if failed
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const backup_configs = pgTable('backup_configs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  google_sheet_url: text('google_sheet_url').notNull(),
  google_sheet_id: varchar('google_sheet_id', { length: 255 }).notNull(),
  is_enabled: boolean('is_enabled').notNull().default(true),
  last_sync_at: timestamp('last_sync_at'),
  last_sync_status: varchar('last_sync_status', { length: 50 }).notNull().default('pending'),
  last_sync_rows: integer('last_sync_rows'),
  last_sync_error: text('last_sync_error'),
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type BackupConfigRecord = typeof backup_configs.$inferSelect;
export type InsertBackupConfig = typeof backup_configs.$inferInsert;

export const insertBackupConfigSchema = createInsertSchema(backup_configs).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertBackupConfigData = z.infer<typeof insertBackupConfigSchema>;

// Backup sync log - history of sync attempts
export interface BackupSyncLog {
  id: string;
  backup_config_id: string;
  sync_type: "automatic" | "manual";
  status: BackupSyncStatus;
  rows_synced: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  triggered_by_user_id: string | null; // null for automatic syncs
}

export const backup_sync_logs = pgTable('backup_sync_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  backup_config_id: varchar('backup_config_id').notNull().references(() => backup_configs.id, { onDelete: 'cascade' }),
  sync_type: varchar('sync_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  rows_synced: integer('rows_synced'),
  error_message: text('error_message'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  triggered_by_user_id: varchar('triggered_by_user_id').references(() => users.id),
});

export type BackupSyncLogRecord = typeof backup_sync_logs.$inferSelect;
export type InsertBackupSyncLog = typeof backup_sync_logs.$inferInsert;

// Restore history - tracks data restores from Google Sheets
export interface RestoreLog {
  id: string;
  company_id: string;
  sheet_id: string;
  file_name: string;
  restore_type: "full_replace" | "smart_merge";
  leads_created: number;
  leads_updated: number;
  updates_added: number;
  status: "success" | "partial" | "failed";
  error_message: string | null;
  restored_by_user_id: string;
  created_at: string;
}

export const restore_logs = pgTable('restore_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  file_name: varchar('file_name', { length: 500 }).notNull(),
  restore_type: varchar('restore_type', { length: 50 }).notNull(),
  leads_created: integer('leads_created').notNull().default(0),
  leads_updated: integer('leads_updated').notNull().default(0),
  updates_added: integer('updates_added').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull(),
  error_message: text('error_message'),
  restored_by_user_id: varchar('restored_by_user_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type RestoreLogRecord = typeof restore_logs.$inferSelect;
export type InsertRestoreLog = typeof restore_logs.$inferInsert;

// Helper to extract Google Sheet ID from URL
export function extractGoogleSheetId(url: string): string | null {
  // URLs can be like:
  // https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
  // https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// API response types
export interface BackupConfigWithSheet extends BackupConfig {
  sheet_name: string;
}

export interface BackupSystemStatus {
  total_configs: number;
  enabled_configs: number;
  last_sync_time: string | null;
  failed_syncs: number;
  next_sync_in_minutes: number;
}

// ============================================================================
// USER ROW FILTERS (Hide/Show Rows based on conditions)
// ============================================================================

// Operators available for different field types
export type RowFilterOperator = 
  | "equals" 
  | "not_equals" 
  | "contains" 
  | "not_contains" 
  | "is_empty" 
  | "is_not_empty"
  | "greater_than" 
  | "less_than" 
  | "between"
  | "before" 
  | "after";

// Single filter condition
export interface RowFilterCondition {
  column_key: string;        // fixed field or custom column key
  column_type: "text" | "number" | "date" | "dropdown";
  operator: RowFilterOperator;
  value: string | number | string[] | null; // string[] for "between" ranges
}

// User row filter configuration
export interface UserRowFilter {
  id: string;
  user_id: string;
  sheet_id: string;
  name: string;
  conditions: RowFilterCondition[];
  logic_operator: "AND" | "OR";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const user_row_filters = pgTable('user_row_filters', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  conditions: jsonb('conditions').notNull().default([]),
  logic_operator: varchar('logic_operator', { length: 10 }).notNull().default('AND'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type UserRowFilterRecord = typeof user_row_filters.$inferSelect;
export type InsertUserRowFilter = typeof user_row_filters.$inferInsert;

export const insertUserRowFilterSchema = createInsertSchema(user_row_filters).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUserRowFilterData = z.infer<typeof insertUserRowFilterSchema>;

// Helper function to get operators by field type
export function getOperatorsForFieldType(fieldType: "text" | "number" | "date" | "dropdown"): RowFilterOperator[] {
  switch (fieldType) {
    case "text":
      return ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"];
    case "number":
      return ["equals", "not_equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"];
    case "date":
      return ["equals", "not_equals", "before", "after", "between", "is_empty", "is_not_empty"];
    case "dropdown":
      return ["equals", "not_equals", "is_empty", "is_not_empty"];
    default:
      return ["equals", "not_equals", "is_empty", "is_not_empty"];
  }
}

// Human-readable operator labels
export function getOperatorLabel(operator: RowFilterOperator): string {
  const labels: Record<RowFilterOperator, string> = {
    equals: "Equals",
    not_equals: "Not Equals",
    contains: "Contains",
    not_contains: "Does Not Contain",
    is_empty: "Is Empty",
    is_not_empty: "Is Not Empty",
    greater_than: "Greater Than",
    less_than: "Less Than",
    between: "Between",
    before: "Before",
    after: "After",
  };
  return labels[operator] || operator;
}

// ============================================================================
// SHEET SNAPSHOTS (Point-in-Time Recovery for SuperAdmin)
// ============================================================================

// Snapshot contains the complete state of a sheet at a moment in time
export interface SheetSnapshotData {
  leads: Array<{
    id: string;
    owner_user_id: string;
    custom_fields: Record<string, any>;
    meta: Record<string, any>;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  lead_updates: Array<{
    id: string;
    lead_id: string;
    update_via: "whatsapp" | "call" | "transfer";
    update_on: string;
    remark: string;
    created_by_user_id?: string | null;
    created_at: string;
  }>;
  columns: Array<{
    id: string;
    name: string;
    column_key: string;
    type: string;
    config: Record<string, any>;
    order_index: number;
  }>;
}

export interface SheetSnapshot {
  id: string;
  company_id: string;
  sheet_id: string;
  sheet_name: string; // Stored for historical reference (sheet name may change)
  snapshot_data: SheetSnapshotData;
  lead_count: number;
  update_count: number;
  data_hash: string; // MD5 hash to detect changes - skip if same as previous
  created_at: string;
}

export const sheet_snapshots = pgTable('sheet_snapshots', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  sheet_name: varchar('sheet_name', { length: 255 }).notNull(),
  snapshot_data: jsonb('snapshot_data').notNull(), // Compressed JSON of leads + updates + columns
  lead_count: integer('lead_count').notNull().default(0),
  update_count: integer('update_count').notNull().default(0),
  data_hash: varchar('data_hash', { length: 64 }).notNull(), // MD5 hash for change detection
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type SheetSnapshotRecord = typeof sheet_snapshots.$inferSelect;
export type InsertSheetSnapshot = typeof sheet_snapshots.$inferInsert;

export const insertSheetSnapshotSchema = createInsertSchema(sheet_snapshots).omit({
  id: true,
  created_at: true,
});

export type InsertSheetSnapshotData = z.infer<typeof insertSheetSnapshotSchema>;

// Restore log entry for tracking who restored what and when
export interface SnapshotRestoreLog {
  id: string;
  snapshot_id: string;
  company_id: string;
  sheet_id: string;
  restored_by_user_id: string;
  leads_restored: number;
  updates_restored: number;
  restore_type: "full" | "leads_only" | "selective";
  notes: string | null;
  created_at: string;
}

export const snapshot_restore_logs = pgTable('snapshot_restore_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  snapshot_id: varchar('snapshot_id').notNull().references(() => sheet_snapshots.id, { onDelete: 'cascade' }),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  restored_by_user_id: varchar('restored_by_user_id').notNull().references(() => users.id),
  leads_restored: integer('leads_restored').notNull().default(0),
  updates_restored: integer('updates_restored').notNull().default(0),
  restore_type: varchar('restore_type', { length: 50 }).notNull().default('full'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type SnapshotRestoreLogRecord = typeof snapshot_restore_logs.$inferSelect;
export type InsertSnapshotRestoreLog = typeof snapshot_restore_logs.$inferInsert;
