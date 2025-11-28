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
import { pgTable, varchar, text, boolean, json, timestamp, integer } from 'drizzle-orm/pg-core';
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
