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
  type: "text" | "number" | "date" | "dropdown" | "boolean" | "mobile";
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
  type: z.enum(["text", "number", "date", "dropdown", "boolean", "mobile"]),
  config: z.object({
    default_value: z.any().optional(),
    dropdown_options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  }).default({}),
  order_index: z.number().default(0),
});

export type InsertCustomColumn = z.infer<typeof insertCustomColumnSchema>;

// ============================================================================
// VALIDATION RULES (Company-scoped Conditional Validations)
// ============================================================================
export interface ValidationRule {
  id: string;
  company_id: string; // company-scoped
  sheet_id: string | null; // optional: if specified, rule applies only to specific sheet
  name: string; // descriptive name like "NFDT required when Talked"
  trigger_column_key: string; // column that triggers the rule (e.g., "lead_status")
  operator: "equals" | "in" | "not_equals" | "not_in"; // comparison operator
  trigger_value: string | string[]; // value(s) that trigger the rule (e.g., "Talked" or ["Talked", "Visit Scheduled"])
  required_fields: string[]; // fields that become required when triggered (e.g., ["nfdt", "visit_date"])
  created_at: string;
  updated_at: string;
}

export const insertValidationRuleSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  name: z.string().min(1, "Rule name is required"),
  trigger_column_key: z.string().min(1, "Trigger column is required"),
  operator: z.enum(["equals", "in", "not_equals", "not_in"]),
  trigger_value: z.union([z.string(), z.array(z.string())]),
  required_fields: z.array(z.string()).min(1, "At least one required field must be specified"),
});

export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;

// ============================================================================
// QUICK FILTERS (Company-wide Quick Filters)
// ============================================================================

// Individual filter condition schema
export const filterConditionSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "in", "not_in", "is_empty", "is_not_empty",
    "greater_than", "less_than", "greater_equal", "less_equal",
    "date_equals", "date_before", "date_after", "date_between"
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null()
  ]).optional(),
  value_type: z.enum(["text", "number", "date", "boolean", "array"]).optional(),
  relative_date: z.enum(["today", "tomorrow", "yesterday", "this_week", "next_week", "this_month", "next_month"]).optional(),
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
  created_by_user_id: string;
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
  created_by_user_id: z.string(),
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
export function getDefaultColumnsForCompany(companyId: string): InsertCustomColumn[] {
  return [
    {
      company_id: companyId,
      sheet_id: null,
      name: "Name",
      column_key: "name",
      type: "text" as const,
      config: { required: true },
      order_index: 0,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Mobile No",
      column_key: "mobile_no",
      type: "mobile" as const,
      config: { required: true },
      order_index: 1,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Phone",
      column_key: "phone",
      type: "text" as const,
      config: {},
      order_index: 2,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Email",
      column_key: "email",
      type: "text" as const,
      config: {},
      order_index: 3,
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
      order_index: 4,
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
      order_index: 5,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Notes",
      column_key: "notes",
      type: "text" as const,
      config: {},
      order_index: 6,
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
  trigger_column_key: varchar('trigger_column_key', { length: 255 }).notNull(),
  operator: varchar('operator', { length: 50 }).notNull(),
  trigger_value: json('trigger_value').$type<string | string[]>().notNull(),
  required_fields: json('required_fields').$type<string[]>().notNull(),
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
  created_by_user_id: varchar('created_by_user_id').notNull().references(() => users.id),
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

export const webhook_allocation_rules = pgTable('webhook_allocation_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar('webhook_id').notNull().references(() => company_webhooks.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  percentage: integer('percentage').notNull(),
  condition_field: varchar('condition_field', { length: 255 }), // e.g., "language", "data.0.value"
  condition_operator: varchar('condition_operator', { length: 50 }), // "equals", "contains", "starts_with"
  condition_value: varchar('condition_value', { length: 255 }), // e.g., "Telugu", "Odia"
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
