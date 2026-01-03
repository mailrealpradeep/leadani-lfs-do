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
    site_visit_config?: {
      status_column?: string; // column_key that indicates visit type (e.g., "lead_status")
      status_value?: string; // LEGACY: single value (kept for backward compatibility)
      status_values?: string[]; // NEW: array of values for multi-select (OR logic) - for SCHEDULED visits
      date_column?: string; // column_key for visit date (e.g., "nfdt")
      card_columns?: string[]; // column keys to display in visit schedule card
    };
    site_visited_config?: {
      status_column?: string; // column_key that indicates visit type
      status_values?: string[]; // Values indicating COMPLETED visits
      date_column?: string; // column_key for visit date
      card_columns?: string[]; // column keys to display in visited calendar card
    };
    add_lead_form_fields?: {
      column_key: string;
      required: boolean;
    }[]; // Configurable fields for Add Lead form with required/optional setting
    auto_fill_rules?: {
      id: string; // unique identifier for the rule
      trigger_column_key: string; // which field triggers the rule
      trigger_value: string; // what value activates the rule
      target_column_key: string; // which field to auto-fill
      target_value: string; // what value to set
      priority: number; // order for conflict resolution (lower = higher priority)
      enabled: boolean; // whether the rule is active
    }[]; // Auto-fill rules for automatically setting field values
    quality_check_settings?: {
      // Standard check (instant, no API)
      standard_check_enabled?: boolean; // Whether instant blacklist check is enabled
      blacklist_words?: string[]; // Words/phrases to reject immediately
      standard_warning_message?: string; // Warning shown when blacklist match found
      // AI check (optional enhancement)
      enabled?: boolean; // Whether AI remark quality check is enabled
      sarvam_api_key?: string; // Company's Sarvam AI API key
      acceptance_level?: 'lenient' | 'moderate' | 'strict'; // How strict the AI validation is
      warning_message?: string; // Custom warning message shown when AI rejects remark
    };
    final_value_settings?: {
      id: string; // unique identifier for the rule
      column_key: string; // which column has final values (e.g., "visit_status", "lead_status")
      final_values: string[]; // array of values that are considered final (e.g., ["Visited", "Converted"])
      enabled: boolean; // whether the rule is active
    }[]; // Final value rules - once a field reaches a final value, only admins can change it
  };
  status: "active" | "suspended" | "trial";
  attendance_exit_target_id: string | null; // Links to working_targets for attendance exit condition
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
    site_visit_config: z.object({
      status_column: z.string().optional(),
      status_value: z.string().optional(), // LEGACY: kept for backward compatibility
      status_values: z.array(z.string()).optional(), // NEW: multi-select values for scheduled visits
      date_column: z.string().optional(),
      card_columns: z.array(z.string()).optional(),
    }).optional(),
    site_visited_config: z.object({
      status_column: z.string().optional(),
      status_values: z.array(z.string()).optional(), // Values for completed visits
      date_column: z.string().optional(),
      card_columns: z.array(z.string()).optional(),
    }).optional(),
    add_lead_form_fields: z.array(z.object({
      column_key: z.string(),
      required: z.boolean(),
    })).optional(),
    auto_fill_rules: z.array(z.object({
      id: z.string(),
      trigger_column_key: z.string(),
      trigger_value: z.string(),
      target_column_key: z.string(),
      target_value: z.string(),
      priority: z.number(),
      enabled: z.boolean(),
    })).optional(),
    weekly_off_days: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sunday through 6=Saturday
    quality_check_settings: z.object({
      // Standard check (instant, no API)
      standard_check_enabled: z.boolean().optional(),
      blacklist_words: z.array(z.string()).optional(),
      standard_warning_message: z.string().optional(),
      // AI check (optional enhancement)
      enabled: z.boolean().optional(),
      sarvam_api_key: z.string().optional(), // Stored securely, never exposed to frontend
      acceptance_level: z.enum(['lenient', 'moderate', 'strict']).optional(),
      warning_message: z.string().optional(),
    }).optional(),
    final_value_settings: z.array(z.object({
      id: z.string(),
      column_key: z.string(),
      final_values: z.array(z.string()),
      enabled: z.boolean(),
    })).optional(),
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
  attended_at: string | null; // First user action timestamp (null until attended)
  attended_by_user_id: string | null; // User ID who first attended (null until attended)
  created_at: string;
  updated_at: string;
}

export const insertLeadSchema = z.object({
  sheet_id: z.string(),
  owner_user_id: z.string().optional(),
  // All business data goes into custom_fields - validated dynamically based on company's columns
  custom_fields: z.record(z.any()).default({}),
  meta: z.record(z.any()).default({}),
  // Optional: allows overriding the created_at timestamp (e.g., from webhook form submission time)
  created_at: z.string().optional(),
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
  is_system: boolean; // true = system-defined value that cannot be deleted
  created_at: string;
}

export const insertDropdownOptionSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  column_key: z.string(),
  value: z.string().min(1, "Value is required"),
  order_index: z.number(),
  is_system: z.boolean().optional(), // Defaults to false in storage layer
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
  type: "text" | "number" | "date" | "datetime" | "dropdown" | "boolean" | "mobile" | "percentage";
  config: {
    default_value?: any;
    dropdown_options?: string[];
    required?: boolean;
    is_system_column?: boolean; // System columns (Full Name, Mobile No) cannot be deleted
    system_values?: string[]; // Values defined by Super Admin (locked, can't be deleted)
    hidden_system_values?: string[]; // System values this company has chosen to hide
  };
  order_index: number; // for column ordering
  is_system: boolean; // true = system-defined column that cannot be deleted
  created_at: string;
  updated_at: string;
}

export const insertCustomColumnSchema = z.object({
  company_id: z.string(),
  sheet_id: z.string().nullable().optional(),
  name: z.string().min(1, "Column name is required"),
  column_key: z.string().min(1, "Column key is required"),
  type: z.enum(["text", "number", "date", "datetime", "dropdown", "boolean", "mobile", "percentage"]),
  config: z.object({
    default_value: z.any().optional(),
    dropdown_options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
    is_system_column: z.boolean().optional(),
    system_values: z.array(z.string()).optional(),
    hidden_system_values: z.array(z.string()).optional(),
  }).default({}),
  order_index: z.number().default(0),
  is_system: z.boolean().optional(), // Defaults to false in storage layer
});

export type InsertCustomColumn = z.infer<typeof insertCustomColumnSchema>;

// ============================================================================
// SYSTEM VALUE DEFINITIONS (Global System Column Values)
// ============================================================================
export type SystemColumnType = 'lead_status' | 'visit_status' | 'visit_type' | 'lost_reason';

export interface SystemValueDefinition {
  id: string;
  column_type: SystemColumnType;
  value: string;
  display_order: number;
  is_active: boolean;
  deprecated_at: string | null;
  replaced_by: string | null;
  created_at: string;
}

export const insertSystemValueDefinitionSchema = z.object({
  column_type: z.enum(['lead_status', 'visit_status', 'visit_type', 'lost_reason']),
  value: z.string().min(1, "Value is required"),
  display_order: z.number().default(0),
  is_active: z.boolean().default(true),
});

export type InsertSystemValueDefinition = z.infer<typeof insertSystemValueDefinitionSchema>;

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

// Zod schema for ValidationRequiredColumn
export const validationRequiredColumnSchema = z.object({
  column_key: z.string().min(1, "Column key is required"),
  is_required: z.boolean().default(true),
  label: z.string().optional(),
});

export interface ValidationRule {
  id: string;
  company_id: string; // company-scoped
  sheet_id: string | null; // optional: if specified, rule applies only to specific sheet
  name: string; // descriptive name like "NFDT required when Talked"
  // Legacy single condition fields (deprecated, kept for backward compatibility)
  trigger_column_key?: string; // column that triggers the rule (e.g., "lead_status")
  operator?: "equals" | "in" | "not_equals" | "not_in"; // comparison operator
  trigger_value?: string | string[]; // value(s) that trigger the rule
  required_fields: string[]; // Legacy: simple array of field keys
  // New multi-condition support
  conditions: ValidationCondition[]; // Multiple conditions
  logical_operator: "and" | "or"; // How conditions are combined (default: "and")
  required_columns: ValidationRequiredColumn[]; // Enhanced: fields with is_required flag
  is_active: boolean;
  created_by_user_id: string | null;
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
  required_fields: z.array(z.string()).default([]),
  // New multi-condition support
  conditions: z.array(validationConditionSchema).default([]),
  logical_operator: z.enum(["and", "or"]).default("and"),
  required_columns: z.array(validationRequiredColumnSchema).default([]),
  is_active: z.boolean().default(true),
  created_by_user_id: z.string().nullable().optional(),
});

export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;

// Form schema for creating/updating validation rules (used by Admin UI)
export const validationRuleFormSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  conditions: z.array(validationConditionSchema).min(1, "At least one trigger condition is required"),
  logical_operator: z.enum(["and", "or"]).default("and"),
  required_columns: z.array(validationRequiredColumnSchema).min(1, "At least one field to prompt is required"),
  is_active: z.boolean().default(true),
});

export type ValidationRuleFormData = z.infer<typeof validationRuleFormSchema>;

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
// Each condition can have next_operator to connect it to the following condition (mixed AND/OR logic)
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
  next_operator: z.enum(["and", "or"]).optional(), // Operator connecting this condition to the next (undefined for last condition)
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
  next_operator: z.enum(["and", "or"]).optional(), // Operator connecting this condition to the next (undefined for last condition)
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
  webhook_id: string | null;
  sheet_id: string | null;
  payload: Record<string, any>;
  mapped_data: Record<string, any> | null;
  headers: Record<string, any>;
  status: "success" | "error" | "pending";
  error_message: string | null;
  lead_id: string | null;
  allocation_issue: string | null;
  created_at: string;
}

export const insertWebhookLogSchema = z.object({
  company_id: z.string(),
  webhook_id: z.string().nullable().optional(),
  sheet_id: z.string().nullable().optional(),
  payload: z.record(z.any()),
  mapped_data: z.record(z.any()).nullable().optional(),
  headers: z.record(z.any()),
  status: z.enum(["success", "error", "pending"]),
  error_message: z.string().nullable().optional(),
  lead_id: z.string().nullable().optional(),
  allocation_issue: z.string().nullable().optional(),
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;

// ============================================================================
// LEAD UPDATES
// ============================================================================
export interface LeadUpdate {
  id: string;
  lead_id: string;
  update_via: "whatsapp" | "call" | "transfer" | "web" | "webhook" | "merge" | "import";
  update_on: string; // date
  remark: string;
  created_by_user_id?: string | null;
  created_at: string;
}

export const insertLeadUpdateSchema = z.object({
  lead_id: z.string(),
  update_via: z.enum(["whatsapp", "call", "transfer", "web", "webhook", "merge", "import"]),
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
export const SYSTEM_COLUMN_KEYS = ["full_name", "mobile_no", "created_at", "attended_at", "closing_value"] as const;

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
      type: "datetime" as const,
      config: { required: true, is_system_column: true },
      order_index: 2,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Attended At",
      column_key: "attended_at",
      type: "datetime" as const,
      config: { is_system_column: true },
      order_index: 3,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Closing Value",
      column_key: "closing_value",
      type: "number" as const,
      config: { is_system_column: true, default_value: 0 },
      order_index: 4,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Phone",
      column_key: "phone",
      type: "text" as const,
      config: {},
      order_index: 5,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Email",
      column_key: "email",
      type: "text" as const,
      config: {},
      order_index: 6,
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
      order_index: 7,
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
      order_index: 8,
    },
    {
      company_id: companyId,
      sheet_id: null,
      name: "Notes",
      column_key: "notes",
      type: "text" as const,
      config: {},
      order_index: 9,
    },
  ];
}

// ============================================================================
// DRIZZLE ORM TABLE DEFINITIONS (for PostgreSQL)
// ============================================================================
import { pgTable, varchar, text, boolean, json, jsonb, timestamp, integer, doublePrecision, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  settings: json('settings').$type<{
    timezone?: string;
    date_format?: string;
    custom_branding?: any;
    weekly_off_days?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  }>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  attendance_exit_target_id: varchar('attendance_exit_target_id'), // Links to working_targets for attendance exit condition
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
  deleted_by_user_id: varchar('deleted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  attended_at: timestamp('attended_at'), // First user action timestamp (nullable until attended)
  attended_by_user_id: varchar('attended_by_user_id').references(() => users.id, { onDelete: 'set null' }), // User who first attended (nullable)
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
  is_system: boolean('is_system').default(false).notNull(),
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
    system_values?: string[];
    hidden_system_values?: string[];
  }>().default({}).notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Enhanced required column structure for validation rules
export interface ValidationRequiredColumn {
  column_key: string;
  is_required: boolean; // true = must fill, false = optional prompt
  label?: string; // Custom label to show in dialog
}

export const validation_rules = pgTable('validation_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Legacy single condition fields (deprecated, kept for backward compatibility)
  trigger_column_key: varchar('trigger_column_key', { length: 255 }),
  operator: varchar('operator', { length: 50 }),
  trigger_value: json('trigger_value').$type<string | string[]>(),
  required_fields: json('required_fields').$type<string[]>().notNull().default([]),
  // New multi-condition support with enhanced required columns
  conditions: json('conditions').$type<ValidationCondition[]>().default([]),
  logical_operator: varchar('logical_operator', { length: 10 }).notNull().default('and'),
  required_columns: json('required_columns').$type<ValidationRequiredColumn[]>().default([]),
  is_active: boolean('is_active').notNull().default(true),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Type for tracking weighted round-robin allocation counts per condition group
// Key format: "conditionGroupKey" -> { sheetId: count }
export type AllocationCounts = Record<string, Record<string, number>>;

// Match rule for webhook lead matching - webhook field can match against multiple CRM fields (OR logic)
export interface WebhookMatchRule {
  webhookField: string;  // The webhook field to check (e.g., "mobile_no", "whatsapp_no")
  crmFields: string[];   // CRM fields to match against (OR logic) - e.g., ["mobile_no", "whatsapp_no"]
}

// Zod schema for match rules validation
export const webhookMatchRuleSchema = z.object({
  webhookField: z.string().min(1),
  crmFields: z.array(z.string().min(1)).min(1),
});

export const webhookMatchRulesSchema = z.array(webhookMatchRuleSchema);

export const company_webhooks = pgTable('company_webhooks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  secret: varchar('secret', { length: 255 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_allocated_sheet_id: varchar('last_allocated_sheet_id').references(() => sheets.id, { onDelete: 'set null' }),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  // New columns for match-and-update functionality
  match_mode: varchar('match_mode', { length: 50 }).notNull().default('create_only'), // 'create_only', 'match_and_update', 'match_and_add_update', 'match_or_create'
  match_field: varchar('match_field', { length: 255 }).default('mobile_no'), // DEPRECATED: Use match_rules instead
  match_rules: json('match_rules').$type<WebhookMatchRule[]>().default([]), // Multi-field matching rules (OR logic within each rule)
  update_field_mappings: json('update_field_mappings').$type<Array<{source_field: string; target_column: string}>>().default([]),
  no_match_action: varchar('no_match_action', { length: 50 }).default('create_lead'), // 'create_lead', 'ignore', 'log_only'
  skip_allocation_on_match: boolean('skip_allocation_on_match').notNull().default(false), // Skip allocation rules when a match is found
  source_label: varchar('source_label', { length: 100 }), // e.g., 'WhatsApp', 'Website', 'Facebook'
  // Weighted round-robin allocation tracking: { conditionGroupKey: { sheetId: count } }
  allocation_counts: json('allocation_counts').$type<AllocationCounts>().default({}),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  display_order: integer('display_order').default(0), // For ordering reports in the list
  is_user_report: boolean('is_user_report').default(false).notNull(), // true = visible to all users (filtered by their data), false = admin-only
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  reviewed_by_user_id: varchar('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
export type TaskRecurrenceType = "none" | "daily" | "weekly" | "monthly";

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
  recurrence_type: TaskRecurrenceType;
  parent_task_id: string | null;
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
  recurrence_type: varchar('recurrence_type', { length: 20 }).notNull().default('none'), // 'none', 'daily', 'weekly', 'monthly'
  parent_task_id: varchar('parent_task_id'), // Reference to original task for recurring chain
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
  created_by: varchar('created_by').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  triggered_by_user_id: varchar('triggered_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  restored_by_user_id: varchar('restored_by_user_id').references(() => users.id, { onDelete: 'set null' }),
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
  is_global: boolean;
  applies_to_all_sheets: boolean;
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
  is_global: boolean('is_global').notNull().default(false),
  applies_to_all_sheets: boolean('applies_to_all_sheets').notNull().default(false),
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

// User's personal toggle state for global filters they don't own
// This allows users to toggle admin-created global filters on/off for their own view
export const user_filter_toggle_states = pgTable('user_filter_toggle_states', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filter_id: varchar('filter_id').notNull().references(() => user_row_filters.id, { onDelete: 'cascade' }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type UserFilterToggleState = typeof user_filter_toggle_states.$inferSelect;
export type InsertUserFilterToggleState = typeof user_filter_toggle_states.$inferInsert;

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
  restored_by_user_id: varchar('restored_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  leads_restored: integer('leads_restored').notNull().default(0),
  updates_restored: integer('updates_restored').notNull().default(0),
  restore_type: varchar('restore_type', { length: 50 }).notNull().default('full'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type SnapshotRestoreLogRecord = typeof snapshot_restore_logs.$inferSelect;
export type InsertSnapshotRestoreLog = typeof snapshot_restore_logs.$inferInsert;

// ============================================================================
// SAVED REPORTS (Fixed Reports / Report Library)
// ============================================================================
export interface SavedReportConfig {
  // Report type determines how to execute
  type: "column_based" | "sql_query" | "aggregation";
  
  // For column-based reports
  columns?: string[]; // Column keys to include
  filters?: {
    column: string;
    operator: "equals" | "not_equals" | "contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "between" | "in" | "is_empty" | "is_not_empty";
    value: any;
  }[];
  groupBy?: string; // Column key to group by
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateRange?: {
    field: string; // Which date field to use (created_at, nfdt, etc.)
    preset?: "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";
    startDate?: string;
    endDate?: string;
  };
  
  // For aggregation reports
  aggregations?: {
    column: string;
    function: "count" | "sum" | "avg" | "min" | "max";
    alias: string;
  }[];
  
  // For SQL query reports (advanced - Super Admin only)
  sqlQuery?: string;
  
  // Display options
  displayOptions?: {
    showTotals?: boolean;
    chartType?: "bar" | "pie" | "line" | "table";
    pivotColumn?: string;
  };
}

export interface SavedReport {
  id: string;
  company_id: string | null; // null = global template available to all
  name: string;
  description: string | null;
  category: string | null; // e.g., "Daily", "Weekly", "Performance", "Compliance"
  config: SavedReportConfig;
  is_template: boolean; // true = can be duplicated by other companies
  source_report_id: string | null; // if duplicated from another report
  created_by_user_id: string;
  is_active: boolean;
  run_count: number; // track usage
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export const saved_reports = pgTable('saved_reports', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  config: jsonb('config').notNull(),
  is_template: boolean('is_template').notNull().default(true),
  source_report_id: varchar('source_report_id').references(() => saved_reports.id, { onDelete: 'set null' }),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  is_active: boolean('is_active').notNull().default(true),
  run_count: integer('run_count').notNull().default(0),
  last_run_at: timestamp('last_run_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type SavedReportRecord = typeof saved_reports.$inferSelect;
export type InsertSavedReport = typeof saved_reports.$inferInsert;

export const insertSavedReportSchema = createInsertSchema(saved_reports).omit({
  id: true,
  run_count: true,
  last_run_at: true,
  created_at: true,
  updated_at: true,
});

export type InsertSavedReportData = z.infer<typeof insertSavedReportSchema>;

// ============================================================================
// COMPANY KPIs (New Simplified Target System)
// ============================================================================

// KPI Metric Types
export const kpiMetricTypes = [
  "lead_count",           // Count leads matching criteria
  "field_sum",            // Sum of a numeric column
  "field_average",        // Average of a numeric column
  "status_transition",    // Count leads that changed TO a specific status on a date
  "lead_updates",         // Count of lead updates made
  "hours_worked",         // Hours from attendance tracking
  "conversion_rate",      // Ratio of two lead counts (e.g., Admission/Total)
] as const;

export type KpiMetricType = typeof kpiMetricTypes[number];

// KPI filter condition for lead-based metrics
export interface KpiFilterCondition {
  column_key: string;                // Which column to filter on
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string | number | null;     // The value to compare against (stores option_id for dropdowns)
}

// KPI Configuration based on metric type
export interface KpiConfig {
  // For lead_count, status_transition metrics
  column_key?: string;               // The column to measure (e.g., "lead_status")
  target_value?: string;             // The value to match (e.g., option_id for "Admission")
  
  // For field_sum, field_average metrics
  numeric_column_key?: string;       // The numeric column to aggregate
  
  // For conversion_rate metric
  numerator_column_key?: string;     // Column for numerator count
  numerator_value?: string;          // Value to count for numerator
  denominator_column_key?: string;   // Column for denominator count (optional, defaults to all leads)
  denominator_value?: string;        // Value to count for denominator
  
  // Optional filters applied to all metrics
  filters?: KpiFilterCondition[];
  logical_operator?: "and" | "or";   // How filters are combined
}

// Company KPI definition
export interface CompanyKpi {
  id: string;
  company_id: string;
  name: string;                      // e.g., "Admissions", "Revenue", "Lead Updates"
  description: string | null;
  metric_type: KpiMetricType;
  config: KpiConfig;
  
  // Scope
  scope_type: "company_wide" | "specific_sheets";
  scope_sheet_ids: string[] | null;  // Only if scope_type = "specific_sheets"
  
  // Display settings
  display_format?: string;           // e.g., "number", "currency", "percentage"
  display_prefix?: string;           // e.g., "₹" for currency
  display_suffix?: string;           // e.g., "%" for percentage
  
  // Metadata
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Database table for Company KPIs
export const company_kpis = pgTable('company_kpis', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  metric_type: varchar('metric_type', { length: 50 }).notNull(),
  config: jsonb('config').notNull().$type<KpiConfig>(),
  
  // Scope
  scope_type: varchar('scope_type', { length: 50 }).notNull().default('company_wide'),
  scope_sheet_ids: jsonb('scope_sheet_ids').$type<string[]>(),
  
  // Display settings
  display_format: varchar('display_format', { length: 50 }),
  display_prefix: varchar('display_prefix', { length: 20 }),
  display_suffix: varchar('display_suffix', { length: 20 }),
  
  // Metadata
  is_active: boolean('is_active').notNull().default(true),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type CompanyKpiRecord = typeof company_kpis.$inferSelect;
export type InsertCompanyKpi = typeof company_kpis.$inferInsert;

export const insertCompanyKpiSchema = createInsertSchema(company_kpis).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCompanyKpiData = z.infer<typeof insertCompanyKpiSchema>;

// ============================================================================
// SIMPLIFIED TARGETS (References KPIs)
// ============================================================================

// Target period types
export const simpleTargetPeriodTypes = [
  "daily",
  "weekly", 
  "monthly",
  "custom",      // Custom date range
] as const;

export type SimpleTargetPeriodType = typeof simpleTargetPeriodTypes[number];

// Simple Target definition
export interface SimpleTarget {
  id: string;
  company_id: string;
  kpi_id: string;                    // References the KPI to measure
  name: string;                      // e.g., "Daily Admissions Target"
  description: string | null;
  
  // Target value
  target_value: number;              // The value to achieve
  
  // Time period
  period_type: SimpleTargetPeriodType;
  start_date: string;                // ISO date - when target starts
  end_date: string | null;           // ISO date - null for recurring
  
  // Assignment
  assignment_type: "all_users" | "specific_users";
  assigned_user_ids: string[] | null; // Only if assignment_type = "specific_users"
  
  // Status
  is_active: boolean;
  
  // Metadata
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Database table for Simple Targets
export const simple_targets = pgTable('simple_targets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  kpi_id: varchar('kpi_id').notNull().references(() => company_kpis.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Target value
  target_value: doublePrecision('target_value').notNull(),
  
  // Time period
  period_type: varchar('period_type', { length: 50 }).notNull().default('daily'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  
  // Assignment
  assignment_type: varchar('assignment_type', { length: 50 }).notNull().default('all_users'),
  assigned_user_ids: jsonb('assigned_user_ids').$type<string[]>(),
  
  // Status
  is_active: boolean('is_active').notNull().default(true),
  
  // Metadata
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type SimpleTargetRecord = typeof simple_targets.$inferSelect;
export type InsertSimpleTarget = typeof simple_targets.$inferInsert;

export const insertSimpleTargetSchema = createInsertSchema(simple_targets).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertSimpleTargetData = z.infer<typeof insertSimpleTargetSchema>;

// Simple Target Progress (tracking per user per period)
export interface SimpleTargetProgress {
  id: string;
  target_id: string;
  user_id: string;
  period_start: string;              // ISO date - start of the period
  period_end: string;                // ISO date - end of the period
  current_value: number;             // Current progress
  target_value: number;              // Target to achieve
  is_achieved: boolean;
  achieved_at: string | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export const simple_target_progress = pgTable('simple_target_progress', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  target_id: varchar('target_id').notNull().references(() => simple_targets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  current_value: doublePrecision('current_value').notNull().default(0),
  target_value: doublePrecision('target_value').notNull(),
  is_achieved: boolean('is_achieved').notNull().default(false),
  achieved_at: timestamp('achieved_at'),
  last_calculated_at: timestamp('last_calculated_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type SimpleTargetProgressRecord = typeof simple_target_progress.$inferSelect;
export type InsertSimpleTargetProgress = typeof simple_target_progress.$inferInsert;

// ============================================================================
// WORKING TARGETS (Temporary Target System)
// ============================================================================

// Fixed Target Metrics
export type FixedTargetMetric = 'lead_updates' | 'status_transitions' | 'leads_created';

// Operators for Single Column targets
export type SingleColumnOperator = 
  | 'equals'           // Field equals specific value
  | 'not_equals'       // Field does not equal value
  | 'is_empty'         // Field is empty/null
  | 'is_not_empty'     // Field has a value
  | 'is_future_date'   // Date field is in the future
  | 'is_today'         // Date field is today
  | 'is_tomorrow'      // Date field is tomorrow
  | 'greater_than'     // Numeric comparison
  | 'less_than';       // Numeric comparison

// Result type for Compare Columns (transition) targets
export type TransitionResultType = 'count' | 'sum' | 'percentage';

// Configuration for Fixed targets
export interface FixedTargetConfig {
  metric: FixedTargetMetric;
  target_value: number;
}

// Configuration for Single Column targets (compliance check)
export interface SingleColumnTargetConfig {
  column_id: string;
  column_key: string;
  column_name: string;
  operator: SingleColumnOperator;
  value?: string | number;           // The value to compare against (for equals, not_equals, etc.)
  dropdown_option_id?: string;       // If comparing to a dropdown value
  target_percentage?: number;        // Required compliance percentage (default 100)
}

// Configuration for Compare Columns (transition) targets
export interface CompareColumnsTargetConfig {
  column_id: string;
  column_key: string;
  column_name: string;
  from_value?: string;               // "any" if not specified
  from_dropdown_option_id?: string;
  to_value: string;                  // Required - the target value to transition TO
  to_dropdown_option_id?: string;
  result_type: TransitionResultType;
  target_value: number;
}

// Union type for all config types
export type WorkingTargetConfig = 
  | { type: 'fixed'; config: FixedTargetConfig }
  | { type: 'single_column'; config: SingleColumnTargetConfig }
  | { type: 'compare_columns'; config: CompareColumnsTargetConfig };

// Working Target interface
export interface WorkingTarget {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  target_type: 'fixed' | 'single_column' | 'compare_columns';
  period_type: 'daily' | 'weekly' | 'monthly';
  config: WorkingTargetConfig;
  sheet_ids: string[] | null; // Restrict to specific sheets, null = all sheets
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Database table for Working Targets
export const working_targets = pgTable('working_targets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  target_type: varchar('target_type', { length: 50 }).notNull(), // 'fixed' | 'single_column' | 'compare_columns'
  period_type: varchar('period_type', { length: 50 }).notNull().default('daily'), // 'daily' | 'weekly' | 'monthly'
  config: jsonb('config').notNull().$type<WorkingTargetConfig>(),
  sheet_ids: text('sheet_ids').array(), // Optional: restrict to specific sheets, null = all sheets
  is_active: boolean('is_active').notNull().default(true),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type WorkingTargetRecord = typeof working_targets.$inferSelect;
export type InsertWorkingTarget = typeof working_targets.$inferInsert;

export const insertWorkingTargetSchema = createInsertSchema(working_targets).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertWorkingTargetData = z.infer<typeof insertWorkingTargetSchema>;

// Working Target Result - stores evaluation results per user per period
export interface WorkingTargetResult {
  id: string;
  working_target_id: string;
  user_id: string;
  period_start: string;              // ISO date - start of the period
  period_end: string;                // ISO date - end of the period
  current_value: number;             // Current progress value
  target_value: number;              // Target to achieve (for fixed/compare) or 100 for compliance
  compliance_percentage: number;     // For single_column: % of leads that comply
  is_achieved: boolean;
  details: Record<string, any>;      // Additional details (non-compliant leads, transition details, etc.)
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

// Database table for Working Target Results
export const working_target_results = pgTable('working_target_results', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  working_target_id: varchar('working_target_id').notNull().references(() => working_targets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  current_value: doublePrecision('current_value').notNull().default(0),
  target_value: doublePrecision('target_value').notNull(),
  compliance_percentage: doublePrecision('compliance_percentage').notNull().default(0),
  is_achieved: boolean('is_achieved').notNull().default(false),
  details: jsonb('details').$type<Record<string, any>>().default({}),
  last_calculated_at: timestamp('last_calculated_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type WorkingTargetResultRecord = typeof working_target_results.$inferSelect;
export type InsertWorkingTargetResult = typeof working_target_results.$inferInsert;

export const insertWorkingTargetResultSchema = createInsertSchema(working_target_results).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertWorkingTargetResultData = z.infer<typeof insertWorkingTargetResultSchema>;

// ============================================================================
// ATTENDANCE EXIT CONDITIONS
// ============================================================================

// Scope type for exit conditions
export type AttendanceExitScopeType = 'all_users' | 'specific_users' | 'specific_sheets';

// Attendance Exit Condition interface
export interface AttendanceExitCondition {
  id: string;
  company_id: string;
  working_target_id: string;
  scope_type: AttendanceExitScopeType;
  scope_ids: string[] | null; // User IDs or Sheet IDs depending on scope_type
  min_percentage: number; // 1-100, minimum % of target to achieve for exit
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Database table for Attendance Exit Conditions
export const attendance_exit_conditions = pgTable('attendance_exit_conditions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  working_target_id: varchar('working_target_id').notNull().references(() => working_targets.id, { onDelete: 'cascade' }),
  scope_type: varchar('scope_type', { length: 50 }).notNull().$type<AttendanceExitScopeType>(), // 'all_users' | 'specific_users' | 'specific_sheets'
  scope_ids: text('scope_ids').array(), // User IDs or Sheet IDs depending on scope_type, null for 'all_users'
  min_percentage: integer('min_percentage').notNull().default(100), // 1-100
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type AttendanceExitConditionRecord = typeof attendance_exit_conditions.$inferSelect;
export type InsertAttendanceExitCondition = typeof attendance_exit_conditions.$inferInsert;

export const insertAttendanceExitConditionSchema = createInsertSchema(attendance_exit_conditions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAttendanceExitConditionData = z.infer<typeof insertAttendanceExitConditionSchema>;

// ============================================================================
// TRANSITION EXPLANATION RULES (Require Explanation for Dropdown Transitions)
// ============================================================================

// When a user changes a dropdown column to a specific value,
// the system can require an explanation which is stored in lead_updates

export interface TransitionExplanationRule {
  id: string;
  company_id: string;
  column_key: string; // The dropdown column to monitor
  dropdown_value: string; // The specific value that triggers explanation requirement
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Database table for Transition Explanation Rules
export const transition_explanation_rules = pgTable('transition_explanation_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  column_key: varchar('column_key', { length: 255 }).notNull(),
  dropdown_value: varchar('dropdown_value', { length: 500 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TransitionExplanationRuleRecord = typeof transition_explanation_rules.$inferSelect;
export type InsertTransitionExplanationRule = typeof transition_explanation_rules.$inferInsert;

export const insertTransitionExplanationRuleSchema = createInsertSchema(transition_explanation_rules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTransitionExplanationRuleData = z.infer<typeof insertTransitionExplanationRuleSchema>;

// ============================================================================
// FUTURE IMPROVEMENTS (System Backlog for Development)
// ============================================================================

export interface FutureImprovementTechnicalDetails {
  affected_files?: string[];
  architecture_notes?: string;
  implementation_steps?: string[];
  dependencies?: string[];
}

export interface FutureImprovement {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'ready' | 'completed';
  priority: 'high' | 'medium' | 'low';
  estimated_effort: string | null;
  cost_estimate: string | null;
  discussion_notes: string | null;
  technical_details: FutureImprovementTechnicalDetails;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const future_improvements = pgTable('future_improvements', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('planned'),
  priority: varchar('priority', { length: 50 }).notNull().default('medium'),
  estimated_effort: varchar('estimated_effort', { length: 100 }),
  cost_estimate: varchar('cost_estimate', { length: 100 }),
  discussion_notes: text('discussion_notes'),
  technical_details: json('technical_details').$type<FutureImprovementTechnicalDetails>().default({}),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type FutureImprovementRecord = typeof future_improvements.$inferSelect;
export type InsertFutureImprovement = typeof future_improvements.$inferInsert;

export const insertFutureImprovementSchema = createInsertSchema(future_improvements).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertFutureImprovementData = z.infer<typeof insertFutureImprovementSchema>;

// ============================================================================
// SYSTEM VALUE DEFINITIONS TABLE (Global System Column Values)
// ============================================================================

export const system_value_definitions = pgTable('system_value_definitions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  column_type: varchar('column_type', { length: 50 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  display_order: integer('display_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  deprecated_at: timestamp('deprecated_at'),
  replaced_by: varchar('replaced_by'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// HOT LEAD CONDITIONS (Define what makes a lead "hot" for priority attention)
// ============================================================================

// Hot lead condition uses same structure as highlighting conditions
export type HotLeadCondition = HighlightingCondition;

export interface HotLeadConfig {
  id: string;
  company_id: string;
  conditions: HotLeadCondition[];
  logical_operator: "and" | "or"; // How conditions are combined
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Database table for Hot Lead Configuration (one per company)
export const hot_lead_config = pgTable('hot_lead_config', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  conditions: json('conditions').$type<HotLeadCondition[]>().notNull().default([]),
  logical_operator: varchar('logical_operator', { length: 10 }).notNull().default('or'),
  is_active: boolean('is_active').notNull().default(true),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type HotLeadConfigRecord = typeof hot_lead_config.$inferSelect;
export type InsertHotLeadConfig = typeof hot_lead_config.$inferInsert;

export const insertHotLeadConfigSchema = createInsertSchema(hot_lead_config).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertHotLeadConfigData = z.infer<typeof insertHotLeadConfigSchema>;

// Schema for updating hot lead config
export const updateHotLeadConfigSchema = z.object({
  conditions: z.array(highlightingConditionSchema).min(1, "At least one condition is required"),
  logical_operator: z.enum(["and", "or"]).default("or"),
  is_active: z.boolean().optional(),
});

// ============================================================================
// CUSTOM VIEWS (Industry-specific sidebar menu items with filtered leads)
// ============================================================================

// Custom View condition with per-condition operator for chaining
// Each condition can have next_operator to connect it to the following condition
export const customViewConditionSchema = highlightingConditionSchema.extend({
  next_operator: z.enum(["and", "or"]).optional(), // Operator connecting this condition to the next (undefined for last condition)
});

export type CustomViewCondition = z.infer<typeof customViewConditionSchema>;

// Available icon colors for custom views
export const customViewIconColors = [
  { id: "red", label: "Red", color: "hsl(0, 84%, 60%)" },
  { id: "orange", label: "Orange", color: "hsl(24, 95%, 53%)" },
  { id: "amber", label: "Amber", color: "hsl(45, 93%, 47%)" },
  { id: "green", label: "Green", color: "hsl(142, 71%, 45%)" },
  { id: "teal", label: "Teal", color: "hsl(174, 72%, 40%)" },
  { id: "blue", label: "Blue", color: "hsl(210, 100%, 50%)" },
  { id: "indigo", label: "Indigo", color: "hsl(239, 84%, 67%)" },
  { id: "purple", label: "Purple", color: "hsl(270, 70%, 60%)" },
  { id: "pink", label: "Pink", color: "hsl(330, 80%, 60%)" },
  { id: "gray", label: "Gray", color: "hsl(220, 9%, 46%)" },
] as const;

export type CustomViewIconColorId = typeof customViewIconColors[number]["id"];

// Available icons for custom views (subset of Lucide icons)
export const customViewIcons = [
  "flame", "star", "heart", "zap", "target", "trophy", "flag", "bookmark",
  "bell", "calendar", "clock", "check-circle", "alert-circle", "info",
  "user", "users", "briefcase", "building", "home", "map-pin",
  "phone", "mail", "message-circle", "send", "inbox",
  "dollar-sign", "credit-card", "shopping-cart", "package", "gift",
  "file", "folder", "clipboard", "list", "grid", "layers",
  "trending-up", "bar-chart", "pie-chart", "activity",
  "eye", "search", "filter", "settings", "tool", "wrench",
] as const;

export type CustomViewIconId = typeof customViewIcons[number];

// Custom View section types
export type CustomViewSection = 'custom_views' | 'data_mismatch' | 'action_today' | 'overdue_actions' | 'achievement';

// Custom View interface
export interface CustomView {
  id: string;
  company_id: string;
  name: string;
  icon: CustomViewIconId;
  icon_color: CustomViewIconColorId;
  show_badge: boolean; // Show count badge in sidebar
  conditions: CustomViewCondition[]; // Flat list of conditions with per-condition AND/OR operators
  sheet_ids: string[] | null; // null = all sheets, array = selected sheets only
  section: CustomViewSection; // Which sidebar section to display in
  is_enabled: boolean;
  order_index: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Database table for Custom Views
export const custom_views = pgTable('custom_views', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }).notNull().default('star'),
  icon_color: varchar('icon_color', { length: 20 }).notNull().default('blue'),
  show_badge: boolean('show_badge').notNull().default(true),
  conditions: json('conditions').$type<CustomViewCondition[]>().notNull().default([]),
  sheet_ids: json('sheet_ids').$type<string[] | null>().default(null), // null = all sheets, array = selected sheets
  section: varchar('section', { length: 50 }).notNull().default('custom_views'), // 'custom_views', 'data_mismatch', 'action_today', 'overdue_actions', 'achievement'
  is_enabled: boolean('is_enabled').notNull().default(true),
  order_index: integer('order_index').notNull().default(0),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type CustomViewRecord = typeof custom_views.$inferSelect;
export type InsertCustomView = typeof custom_views.$inferInsert;

export const insertCustomViewSchema = createInsertSchema(custom_views).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCustomViewData = z.infer<typeof insertCustomViewSchema>;

// Schema for creating/updating custom views
export const customViewFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  icon: z.enum(customViewIcons).default("star"),
  icon_color: z.enum(customViewIconColors.map(c => c.id) as [string, ...string[]]).default("blue"),
  show_badge: z.boolean().default(true),
  conditions: z.array(customViewConditionSchema).min(1, "At least one condition is required"),
  sheet_ids: z.array(z.string()).nullable().default(null), // null = all sheets, array = selected sheets
  section: z.enum(['custom_views', 'data_mismatch', 'action_today', 'overdue_actions', 'achievement']).default('custom_views'),
  is_enabled: z.boolean().default(true),
  order_index: z.number().int().default(0),
});

export type CustomViewFormData = z.infer<typeof customViewFormSchema>;

// ============================================================================
// CUSTOM VIEW COLUMN PREFERENCES (Column Width Customization for Custom Views)
// ============================================================================
export const customViewColumnPreferences = pgTable('custom_view_column_preferences', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  custom_view_id: varchar('custom_view_id').notNull().references(() => custom_views.id, { onDelete: 'cascade' }),
  column_key: varchar('column_key').notNull(), // e.g., "name", "mobile", "custom_field_name"
  width: integer('width').notNull(), // width in pixels
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type CustomViewColumnPreference = typeof customViewColumnPreferences.$inferSelect;
export type InsertCustomViewColumnPreference = typeof customViewColumnPreferences.$inferInsert;

export const insertCustomViewColumnPreferenceSchema = createInsertSchema(customViewColumnPreferences).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCustomViewColumnPreferenceData = z.infer<typeof insertCustomViewColumnPreferenceSchema>;

// ============================================================================
// WATCHLIST LEADS (User's personal lead watchlist)
// ============================================================================
export const watchlist_leads = pgTable('watchlist_leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type WatchlistLead = typeof watchlist_leads.$inferSelect;
export type InsertWatchlistLead = typeof watchlist_leads.$inferInsert;

export const insertWatchlistLeadSchema = createInsertSchema(watchlist_leads).omit({
  id: true,
  created_at: true,
});

export type InsertWatchlistLeadData = z.infer<typeof insertWatchlistLeadSchema>;

// ============================================================================
// FOLLOWUP EVENTS (Unified tracking for all lead follow-up actions)
// ============================================================================

// Event types that constitute a follow-up
export const followupEventTypes = [
  "remark",           // Added a remark/note to lead history
  "dropdown_change",  // Changed a dropdown field value
  "date_change",      // Changed a date field (NFDT, visit date, etc.)
  "field_update",     // General field update
] as const;

export type FollowupEventType = typeof followupEventTypes[number];

// Followup Events table - tracks all follow-up actions with 1-minute deduplication
// Uses a window_key column to enforce uniqueness within the same minute window
export const followup_events = pgTable('followup_events', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  event_types: json('event_types').$type<FollowupEventType[]>().notNull().default([]), // Array of event types in this follow-up
  window_key: varchar('window_key', { length: 50 }).notNull(), // Minute-truncated key: "lead_id:user_id:YYYY-MM-DD-HH-MM"
  triggered_at: timestamp('triggered_at').defaultNow().notNull(), // When the follow-up started
  updated_at: timestamp('updated_at').defaultNow().notNull(), // Last update within the dedup window
}, (table) => [
  // Unique constraint to prevent race conditions - one event per lead+user per minute
  uniqueIndex('idx_followup_events_window').on(table.window_key),
]);

export type FollowupEvent = typeof followup_events.$inferSelect;
export type InsertFollowupEvent = typeof followup_events.$inferInsert;

export const insertFollowupEventSchema = createInsertSchema(followup_events).omit({
  id: true,
  triggered_at: true,
  updated_at: true,
});

export type InsertFollowupEventData = z.infer<typeof insertFollowupEventSchema>;

// ============================================================================
// POWERSCORE - Gamified Scoring System
// ============================================================================

// PowerScore Action Types (predefined action categories)
export const powerScoreActionTypes = [
  "lead_update",      // Points for any lead record update (adds to lead history)
  "login",            // Points for logging in (once per 24 hours)
  "dropdown_change",  // Points when a dropdown field value changes
  "lead_created",     // Points for adding a new lead manually (excludes webhook/import)
  "followup",         // Points for each followup event (uses 1-minute dedup window, matches Vision Board)
] as const;

export type PowerScoreActionType = typeof powerScoreActionTypes[number];

// Animation visibility options for PowerScore rules
export const powerScoreAnimationVisibility = [
  "user_only",    // Only the user who earned sees the animation
  "all_users",    // All users in company see (with earner's name)
  "admins_only",  // Only company admins see
  "none",         // No animation (silent points)
] as const;

export type PowerScoreAnimationVisibility = typeof powerScoreAnimationVisibility[number];

// PowerScore Rules - Company-configurable point values for actions
export const powerscore_rules = pgTable('powerscore_rules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // Rule name for identification
  action_type: varchar('action_type', { length: 50 }).notNull(), // lead_update, login, dropdown_change
  // For dropdown_change, specify column and from/to values (arrays for multi-select)
  config: json('config').$type<{
    column_key?: string; // e.g., "lead_status" or "visit_status"
    from_values?: string[]; // Array of "from" values (multi-select)
    to_values?: string[]; // Array of "to" values (multi-select)
  }>().default({}).notNull(),
  points: integer('points').notNull().default(0),
  daily_cap: integer('daily_cap'), // null = no cap
  requires_approval: boolean('requires_approval').notNull().default(false), // For high-value actions
  is_enabled: boolean('is_enabled').notNull().default(true),
  show_animation_to: varchar('show_animation_to', { length: 20 }).notNull().default('user_only'), // user_only, all_users, admins_only, none
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type PowerScoreRule = typeof powerscore_rules.$inferSelect;
export type InsertPowerScoreRule = typeof powerscore_rules.$inferInsert;

export const insertPowerScoreRuleSchema = createInsertSchema(powerscore_rules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertPowerScoreRuleData = z.infer<typeof insertPowerScoreRuleSchema>;

// PowerScore Transactions - Log of every point earned/deducted
export const powerscore_transactions = pgTable('powerscore_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rule_id: varchar('rule_id').references(() => powerscore_rules.id, { onDelete: 'set null' }), // Which rule triggered this
  action_type: varchar('action_type', { length: 50 }).notNull(),
  points: integer('points').notNull(), // Can be negative for deductions
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }), // Related lead if applicable
  description: varchar('description', { length: 500 }), // e.g., "Status changed to Converted"
  // For tracking daily caps
  score_date: varchar('score_date', { length: 10 }).notNull(), // YYYY-MM-DD format (based on freeze time)
  // Approval tracking
  approval_id: varchar('approval_id'), // Reference to pending approval if applicable
  is_approved: boolean('is_approved'), // null = no approval needed, true/false = approved/rejected
  // Void tracking (for admin reversals)
  voided_at: timestamp('voided_at'), // When the transaction was voided
  voided_by_user_id: varchar('voided_by_user_id').references(() => users.id, { onDelete: 'set null' }), // Admin who voided
  void_reason: varchar('void_reason', { length: 500 }), // Required reason for voiding
  voided_by_transaction_id: varchar('voided_by_transaction_id'), // Links original to the adjustment transaction
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreTransaction = typeof powerscore_transactions.$inferSelect;
export type InsertPowerScoreTransaction = typeof powerscore_transactions.$inferInsert;

export const insertPowerScoreTransactionSchema = createInsertSchema(powerscore_transactions).omit({
  id: true,
  created_at: true,
});

export type InsertPowerScoreTransactionData = z.infer<typeof insertPowerScoreTransactionSchema>;

// PowerScore Pending Approvals - Queue for high-value actions (Visit/Conversion)
export const powerscore_pending_approvals = pgTable('powerscore_pending_approvals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'cascade' }), // Nullable for login bonuses
  rule_id: varchar('rule_id').notNull().references(() => powerscore_rules.id, { onDelete: 'cascade' }),
  action_type: varchar('action_type', { length: 50 }).notNull(),
  points: integer('points').notNull(),
  description: varchar('description', { length: 500 }),
  score_date: varchar('score_date', { length: 10 }).notNull(), // YYYY-MM-DD
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  reviewed_by_user_id: varchar('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewed_at: timestamp('reviewed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScorePendingApproval = typeof powerscore_pending_approvals.$inferSelect;
export type InsertPowerScorePendingApproval = typeof powerscore_pending_approvals.$inferInsert;

export const insertPowerScorePendingApprovalSchema = createInsertSchema(powerscore_pending_approvals).omit({
  id: true,
  reviewed_by_user_id: true,
  reviewed_at: true,
  created_at: true,
});

export type InsertPowerScorePendingApprovalData = z.infer<typeof insertPowerScorePendingApprovalSchema>;

// PowerScore Badges - Configurable badge thresholds
export const powerscore_badges = pgTable('powerscore_badges', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // e.g., "Rising Star", "Top Performer"
  icon: varchar('icon', { length: 50 }).notNull().default('star'), // Lucide icon name
  color: varchar('color', { length: 20 }).notNull().default('blue'), // Color theme
  min_score: integer('min_score').notNull(), // Minimum score to earn badge
  period: varchar('period', { length: 20 }).notNull().default('daily'), // daily, weekly, monthly, all_time
  is_enabled: boolean('is_enabled').notNull().default(true),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreBadge = typeof powerscore_badges.$inferSelect;
export type InsertPowerScoreBadge = typeof powerscore_badges.$inferInsert;

export const insertPowerScoreBadgeSchema = createInsertSchema(powerscore_badges).omit({
  id: true,
  created_at: true,
});

export type InsertPowerScoreBadgeData = z.infer<typeof insertPowerScoreBadgeSchema>;

// PowerScore Milestone Bonuses - Auto-bonus when hitting targets
export const powerscore_milestone_bonuses = pgTable('powerscore_milestone_bonuses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // e.g., "Double Visit Day"
  action_type: varchar('action_type', { length: 50 }).notNull(), // Which action to count
  threshold: integer('threshold').notNull(), // How many to trigger bonus
  period: varchar('period', { length: 20 }).notNull().default('daily'), // daily, weekly
  bonus_points: integer('bonus_points').notNull(),
  message: varchar('message', { length: 255 }), // Celebration message
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreMilestoneBonus = typeof powerscore_milestone_bonuses.$inferSelect;
export type InsertPowerScoreMilestoneBonus = typeof powerscore_milestone_bonuses.$inferInsert;

export const insertPowerScoreMilestoneBonusSchema = createInsertSchema(powerscore_milestone_bonuses).omit({
  id: true,
  created_at: true,
});

export type InsertPowerScoreMilestoneBonusData = z.infer<typeof insertPowerScoreMilestoneBonusSchema>;

// PowerScore Login Bonus - Time-window based login rewards
export const powerscore_login_bonuses = pgTable('powerscore_login_bonuses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // e.g., "Early Bird Bonus"
  start_time: varchar('start_time', { length: 5 }).notNull(), // HH:MM format
  end_time: varchar('end_time', { length: 5 }).notNull(), // HH:MM format
  points: integer('points').notNull(),
  message: varchar('message', { length: 255 }), // Welcome message
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreLoginBonus = typeof powerscore_login_bonuses.$inferSelect;
export type InsertPowerScoreLoginBonus = typeof powerscore_login_bonuses.$inferInsert;

export const insertPowerScoreLoginBonusSchema = createInsertSchema(powerscore_login_bonuses).omit({
  id: true,
  created_at: true,
});

export type InsertPowerScoreLoginBonusData = z.infer<typeof insertPowerScoreLoginBonusSchema>;

// PowerScore Appreciation - Admin-given manual rewards
export const powerscore_appreciations = pgTable('powerscore_appreciations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Recipient
  given_by_user_id: varchar('given_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Admin who gave
  points: integer('points').notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  is_seen: boolean('is_seen').notNull().default(false), // For gamified reveal
  score_date: varchar('score_date', { length: 10 }).notNull(), // YYYY-MM-DD
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreAppreciation = typeof powerscore_appreciations.$inferSelect;
export type InsertPowerScoreAppreciation = typeof powerscore_appreciations.$inferInsert;

export const insertPowerScoreAppreciationSchema = createInsertSchema(powerscore_appreciations).omit({
  id: true,
  is_seen: true,
  created_at: true,
});

export type InsertPowerScoreAppreciationData = z.infer<typeof insertPowerScoreAppreciationSchema>;

// PowerScore Notification Thresholds - Messages at point milestones
export const powerscore_notification_thresholds = pgTable('powerscore_notification_thresholds', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  min_points: integer('min_points').notNull(), // Trigger when reaching this many points
  max_points: integer('max_points').notNull(), // Up to this many points
  message: varchar('message', { length: 255 }).notNull(), // e.g., "Great work! Keep it up!"
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreNotificationThreshold = typeof powerscore_notification_thresholds.$inferSelect;
export type InsertPowerScoreNotificationThreshold = typeof powerscore_notification_thresholds.$inferInsert;

export const insertPowerScoreNotificationThresholdSchema = createInsertSchema(powerscore_notification_thresholds).omit({
  id: true,
  created_at: true,
});

export type InsertPowerScoreNotificationThresholdData = z.infer<typeof insertPowerScoreNotificationThresholdSchema>;

// PowerScore Config - Company-level settings
export interface PowerScoreConfig {
  freeze_time: string; // HH:MM format - when daily scores freeze
  is_enabled: boolean; // Master switch for PowerScore
}

// Add to Company settings interface extension
export const powerScoreConfigSchema = z.object({
  freeze_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)").default("19:00"),
  is_enabled: z.boolean().default(true),
});

export type PowerScoreConfigData = z.infer<typeof powerScoreConfigSchema>;

// Login bonus tracking - To prevent multiple claims per day
export const powerscore_login_claims = pgTable('powerscore_login_claims', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  login_bonus_id: varchar('login_bonus_id').notNull().references(() => powerscore_login_bonuses.id, { onDelete: 'cascade' }),
  claim_date: varchar('claim_date', { length: 10 }).notNull(), // YYYY-MM-DD
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreLoginClaim = typeof powerscore_login_claims.$inferSelect;
export type InsertPowerScoreLoginClaim = typeof powerscore_login_claims.$inferInsert;

// Milestone bonus tracking - To prevent multiple claims
export const powerscore_milestone_claims = pgTable('powerscore_milestone_claims', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  milestone_id: varchar('milestone_id').notNull().references(() => powerscore_milestone_bonuses.id, { onDelete: 'cascade' }),
  claim_date: varchar('claim_date', { length: 10 }).notNull(), // YYYY-MM-DD
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PowerScoreMilestoneClaim = typeof powerscore_milestone_claims.$inferSelect;
export type InsertPowerScoreMilestoneClaim = typeof powerscore_milestone_claims.$inferInsert;

// ============================================================================
// POWERSCORE API TYPES (For frontend use)
// ============================================================================

export interface PowerScoreLeaderboardEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  score: number;
  rank: number;
  points_to_top_3: number | null; // null for top 3
  badges: PowerScoreBadge[];
  avatar_url?: string;
}

export interface PowerScorePersonalStats {
  today: number;
  yesterday: number;
  this_week: number;
  last_week: number;
  this_month: number;
  last_month: number;
  today_vs_yesterday_percent: number; // e.g., +10 or -5
  this_week_vs_last_week_percent: number;
}

export interface PowerScoreHistoryEntry {
  id: string;
  action_type: string;
  points: number;
  description: string | null;
  created_at: string;
  lead_id: string | null;
}

// ============================================================================
// POWERFLOW (Pipeline Analytics & Simulation)
// ============================================================================

// PowerFlow Config - Company-level pipeline stage configuration
export const powerflow_configs = pgTable('powerflow_configs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull().default('Default Pipeline'), // Pipeline name
  stages: json('stages').$type<PowerFlowStage[]>().notNull().default([]),
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export interface PowerFlowStage {
  id: string; // Unique stage identifier
  name: string; // Display name (e.g., "Lead", "Scheduled", "Visited", "Converted")
  column_key: string; // Which column to track (e.g., "visit_status", "lead_status")
  column_values: string[]; // Values that indicate this stage (e.g., ["Scheduled"])
  order: number; // Stage order in pipeline
  color: string; // Stage color for visualization
}

export type PowerFlowConfig = typeof powerflow_configs.$inferSelect;
export type InsertPowerFlowConfig = typeof powerflow_configs.$inferInsert;

export const insertPowerFlowConfigSchema = createInsertSchema(powerflow_configs).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertPowerFlowConfigData = z.infer<typeof insertPowerFlowConfigSchema>;

// PowerFlow Analytics API Types
export interface PowerFlowStageMetrics {
  stage_id: string;
  stage_name: string;
  count: number;
  conversion_rate: number; // Percentage converted to next stage
  color: string;
}

export interface PowerFlowAnalytics {
  pipeline_name: string;
  stages: PowerFlowStageMetrics[];
  total_leads: number;
  overall_conversion_rate: number; // First stage to last stage
  period: string; // e.g., "this_month", "last_7_days"
}

export interface PowerFlowSimulation {
  target_conversions: number;
  required_stages: {
    stage_name: string;
    required_count: number;
    daily_count: number;
  }[];
  working_days: number;
}

// ============================================================================
// VISION BOARD (Personal Goal Tracking & Motivation)
// ============================================================================

// Vision Board - User's personal goal with dream images and targets
export const vision_boards = pgTable('vision_boards', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  goal_amount: doublePrecision('goal_amount').notNull(), // Target money goal
  currency: varchar('currency', { length: 10 }).notNull().default('INR'), // Currency code (INR, USD, etc.)
  goal_description: text('goal_description').notNull(), // What they'll do with the money
  start_date: timestamp('start_date'), // Goal start date (optional, defaults to created_at)
  target_date: timestamp('target_date').notNull(), // Goal end date
  images: json('images').$type<VisionBoardImage[]>().notNull().default([]), // Dream images gallery
  effort_targets: json('effort_targets').$type<VisionBoardEffortTargets>().notNull().default({
    sales: 0,
    visits: 0,
    leads_attended: 0,
    followups: 0,
  }), // Yearly effort targets set by user
  effort_overrides: json('effort_overrides').$type<VisionBoardEffortOverrides | null>(), // User overrides for period breakdowns
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'set null' }), // User's primary sheet for tracking
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vision Board Images Structure
export interface VisionBoardImage {
  id: string;
  url: string; // Image URL or base64
  caption?: string; // Optional caption
  order: number; // Display order
}

// Vision Board Effort Targets (Yearly totals)
export interface VisionBoardEffortTargets {
  sales: number; // Target converted leads
  visits: number; // Target visit done
  leads_attended: number; // Target new leads
  followups: number; // Target remarks/followups
}

// Vision Board Effort Overrides (User can override auto-calculated breakdowns)
export interface VisionBoardEffortOverrides {
  monthly?: Partial<VisionBoardEffortTargets>;
  half_monthly?: Partial<VisionBoardEffortTargets>;
  weekly?: Partial<VisionBoardEffortTargets>;
  daily?: Partial<VisionBoardEffortTargets>;
}

export type VisionBoard = typeof vision_boards.$inferSelect;
export type InsertVisionBoard = typeof vision_boards.$inferInsert;

export const insertVisionBoardSchema = createInsertSchema(vision_boards).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertVisionBoardData = z.infer<typeof insertVisionBoardSchema>;

// Vision Board Earnings - Track each earning entry
export const vision_board_earnings = pgTable('vision_board_earnings', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  vision_board_id: varchar('vision_board_id').notNull().references(() => vision_boards.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: doublePrecision('amount').notNull(), // Earning amount
  source_type: varchar('source_type', { length: 50 }).notNull(), // 'closing' | 'incentive' | 'bonus' | 'other'
  source_lead_id: varchar('source_lead_id').references(() => leads.id, { onDelete: 'set null' }), // Optional link to lead
  description: text('description'), // Description of earning
  earned_at: timestamp('earned_at').notNull(), // When the earning was made
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type VisionBoardEarning = typeof vision_board_earnings.$inferSelect;
export type InsertVisionBoardEarning = typeof vision_board_earnings.$inferInsert;

export const insertVisionBoardEarningSchema = createInsertSchema(vision_board_earnings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertVisionBoardEarningData = z.infer<typeof insertVisionBoardEarningSchema>;

// Vision Board Progress API Types
export interface VisionBoardProgress {
  earnings: {
    total: number;
    target: number;
    percentage: number;
    breakdown: {
      yearly: { earned: number; target: number };
      monthly: { earned: number; target: number };
      half_monthly: { earned: number; target: number };
      weekly: { earned: number; target: number };
      daily: { earned: number; target: number };
    };
  };
  efforts: {
    sales: VisionBoardMetricProgress;
    visits: VisionBoardMetricProgress;
    leads_attended: VisionBoardMetricProgress;
    followups: VisionBoardMetricProgress;
  };
  days_remaining: number;
  days_elapsed: number;
  total_days: number;
  on_track: boolean; // Whether user is on track to meet goal
  motivational_message: string;
}

export interface VisionBoardMetricProgress {
  yearly: { current: number; target: number; percentage: number };
  monthly: { current: number; target: number; percentage: number };
  half_monthly: { current: number; target: number; percentage: number };
  weekly: { current: number; target: number; percentage: number };
  daily: { current: number; target: number; percentage: number };
}

// Admin Vision Dashboard Types
export interface VisionBoardAdminOverview {
  total_goal: number;
  total_earned: number;
  overall_percentage: number;
  active_boards: number;
  total_users: number;
  currency: string;
}

export interface VisionBoardContribution {
  user_id: string;
  user_name: string;
  goal_amount: number;
  earned_amount: number;
  percentage: number;
  contribution_to_company: number; // Percentage of company total
}

// ============================================================================
// CONVERSION SETTINGS (Pipeline Stage Management)
// ============================================================================

// Conversion Config - Company-level configuration for pipeline stages
export const conversion_configs = pgTable('conversion_configs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull().default('Default Pipeline'),
  is_active: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1), // For tracking config changes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type ConversionConfig = typeof conversion_configs.$inferSelect;
export type InsertConversionConfig = typeof conversion_configs.$inferInsert;

export const insertConversionConfigSchema = createInsertSchema(conversion_configs).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionConfigData = z.infer<typeof insertConversionConfigSchema>;

// Conversion Stages - Individual pipeline stages
export const conversion_stages = pgTable('conversion_stages', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  stage_number: integer('stage_number').notNull(), // 1, 2, 3, 4...
  stage_name: varchar('stage_name', { length: 100 }).notNull(), // e.g., "New Lead", "Visited"
  trigger_type: varchar('trigger_type', { length: 50 }).notNull().default('lead_status'), // 'all_leads' | 'lead_status' | 'visit_status' | 'combined'
  trigger_values: json('trigger_values').$type<string[]>().notNull().default([]), // Dropdown values that activate this stage
  color: varchar('color', { length: 20 }).notNull().default('#3B82F6'), // Stage color for visualization
  expected_conversion_percent: doublePrecision('expected_conversion_percent'), // Expected % from previous stage (null for Stage 1)
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type ConversionStage = typeof conversion_stages.$inferSelect;
export type InsertConversionStage = typeof conversion_stages.$inferInsert;

export const insertConversionStageSchema = createInsertSchema(conversion_stages).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionStageData = z.infer<typeof insertConversionStageSchema>;

// Conversion Values - How conversion value is determined
export const conversion_values = pgTable('conversion_values', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  value_type: varchar('value_type', { length: 50 }).notNull().default('fixed'), // 'fixed' | 'from_field' | 'manual'
  fixed_amount: doublePrecision('fixed_amount').default(0), // Used when value_type is 'fixed'
  source_column_key: varchar('source_column_key', { length: 100 }), // Column key when value_type is 'from_field'
  default_amount: doublePrecision('default_amount').default(0), // Default if field is empty
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type ConversionValue = typeof conversion_values.$inferSelect;
export type InsertConversionValue = typeof conversion_values.$inferInsert;

export const insertConversionValueSchema = createInsertSchema(conversion_values).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionValueData = z.infer<typeof insertConversionValueSchema>;

// Conversion Incentives - How incentives are calculated
export const conversion_incentives = pgTable('conversion_incentives', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  incentive_type: varchar('incentive_type', { length: 50 }).notNull().default('fixed'), // 'percentage' | 'fixed' | 'manual' | 'tiered'
  percentage_value: doublePrecision('percentage_value').default(0), // Used when incentive_type is 'percentage'
  fixed_amount: doublePrecision('fixed_amount').default(0), // Used when incentive_type is 'fixed'
  tier_rules: json('tier_rules').$type<ConversionIncentiveTier[]>().default([]), // Used when incentive_type is 'tiered'
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Incentive tier structure for tiered incentives
export interface ConversionIncentiveTier {
  min_conversions: number;
  max_conversions: number | null; // null for unlimited
  amount: number; // Amount per conversion in this tier
}

export type ConversionIncentive = typeof conversion_incentives.$inferSelect;
export type InsertConversionIncentive = typeof conversion_incentives.$inferInsert;

export const insertConversionIncentiveSchema = createInsertSchema(conversion_incentives).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionIncentiveData = z.infer<typeof insertConversionIncentiveSchema>;

// Conversion Approvals - Optional approval workflow settings
export const conversion_approvals = pgTable('conversion_approvals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  is_enabled: boolean('is_enabled').notNull().default(false),
  transitions_requiring_approval: json('transitions_requiring_approval').$type<ConversionTransitionApproval[]>().default([]),
  auto_approve_hours: integer('auto_approve_hours'), // null means never auto-approve
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transition approval structure
export interface ConversionTransitionApproval {
  from_stage_number: number;
  to_stage_number: number;
  requires_approval: boolean;
}

export type ConversionApproval = typeof conversion_approvals.$inferSelect;
export type InsertConversionApproval = typeof conversion_approvals.$inferInsert;

export const insertConversionApprovalSchema = createInsertSchema(conversion_approvals).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionApprovalData = z.infer<typeof insertConversionApprovalSchema>;

// Pending Approvals - Queue of stage transitions awaiting approval
export const conversion_pending_approvals = pgTable('conversion_pending_approvals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  from_stage_number: integer('from_stage_number').notNull(),
  to_stage_number: integer('to_stage_number').notNull(),
  requested_by: varchar('requested_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  approved_by: varchar('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approved_at: timestamp('approved_at'),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type ConversionPendingApproval = typeof conversion_pending_approvals.$inferSelect;
export type InsertConversionPendingApproval = typeof conversion_pending_approvals.$inferInsert;

export const insertConversionPendingApprovalSchema = createInsertSchema(conversion_pending_approvals).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertConversionPendingApprovalData = z.infer<typeof insertConversionPendingApprovalSchema>;

// Conversion History - Audit log of stage transitions
export const conversion_history = pgTable('conversion_history', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  config_id: varchar('config_id').notNull().references(() => conversion_configs.id, { onDelete: 'cascade' }),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  from_stage_number: integer('from_stage_number'),
  to_stage_number: integer('to_stage_number').notNull(),
  conversion_value: doublePrecision('conversion_value'), // Value at time of conversion (only for final stage)
  incentive_amount: doublePrecision('incentive_amount'), // Incentive at time of conversion
  triggered_by: varchar('triggered_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type ConversionHistory = typeof conversion_history.$inferSelect;
export type InsertConversionHistory = typeof conversion_history.$inferInsert;

export const insertConversionHistorySchema = createInsertSchema(conversion_history).omit({
  id: true,
  created_at: true,
});

export type InsertConversionHistoryData = z.infer<typeof insertConversionHistorySchema>;

// ============================================================================
// CONVERSION SETTINGS API TYPES
// ============================================================================

// Full conversion settings for a company (for API response)
export interface ConversionSettingsComplete {
  config: ConversionConfig;
  stages: ConversionStage[];
  value: ConversionValue | null;
  incentive: ConversionIncentive | null;
  approval: ConversionApproval | null;
}

// Pipeline stage metrics for display
export interface ConversionStageMetrics {
  stage_number: number;
  stage_name: string;
  color: string;
  lead_count: number;
  expected_percent: number;
  actual_percent: number;
  diff_percent: number; // actual - expected (positive = above target)
}

// Pipeline overview for date range
export interface ConversionPipelineOverview {
  stages: ConversionStageMetrics[];
  total_leads: number;
  total_conversions: number;
  total_value: number;
  total_incentives: number;
  period_comparison: {
    conversions_change_percent: number;
    value_change_percent: number;
  };
}

// Summary stats for conversion settings page
export interface ConversionSummaryStats {
  total_conversions: number;
  total_value: number;
  total_incentives: number;
  average_value: number;
  working_days: number;
}
