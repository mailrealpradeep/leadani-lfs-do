import { pgTable, varchar, text, boolean, json, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// COMPANIES
// ============================================================================
export const companies = pgTable('companies', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  settings: json('settings').$type<{
    timezone?: string;
    date_format?: string;
    custom_branding?: any;
  }>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, suspended, trial
  attendance_exit_target_id: varchar('attendance_exit_target_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// USERS
// ============================================================================
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'), // super_admin, company_admin, user
  invited_by: varchar('invited_by').references(() => users.id, { onDelete: 'set null' }),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// INVITES
// ============================================================================
export const invites = pgTable('invites', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('user'), // company_admin, user
  inviter_id: varchar('inviter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, accepted, expired
  expires_at: timestamp('expires_at').notNull(),
  accepted_by: varchar('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  accepted_at: timestamp('accepted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// SHEETS
// ============================================================================
export const sheets = pgTable('sheets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  owner_id: varchar('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  is_personal: boolean('is_personal').notNull().default(false),
  visibility: varchar('visibility', { length: 50 }).notNull().default('company'), // company, restricted, personal
  settings: json('settings').$type<{
    default_lead_status?: string;
    default_visit_status?: string;
    custom_fields?: any[];
  }>().default({}).notNull(),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// SHEET USERS
// ============================================================================
export const sheet_users = pgTable('sheet_users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('viewer'), // owner, editor, viewer
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// LEADS
// ============================================================================
export const leads = pgTable('leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  sheet_id: varchar('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  owner_user_id: varchar('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  custom_fields: json('custom_fields').$type<Record<string, any>>().default({}).notNull(),
  meta: json('meta').$type<Record<string, any>>().default({}).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// DROPDOWN OPTIONS
// ============================================================================
export const dropdown_options = pgTable('dropdown_options', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  column_key: varchar('column_key', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// CUSTOM COLUMNS
// ============================================================================
export const custom_columns = pgTable('custom_columns', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  column_key: varchar('column_key', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // text, number, date, dropdown, boolean
  config: json('config').$type<{
    default_value?: any;
    dropdown_options?: string[];
    required?: boolean;
  }>().default({}).notNull(),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// AUDIT LOGS
// ============================================================================
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

// ============================================================================
// WEBHOOK LOGS
// ============================================================================
export const webhook_logs = pgTable('webhook_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  company_id: varchar('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  webhook_id: varchar('webhook_id'),
  sheet_id: varchar('sheet_id').references(() => sheets.id, { onDelete: 'cascade' }),
  payload: json('payload').$type<Record<string, any>>().default({}).notNull(),
  mapped_data: json('mapped_data').$type<Record<string, any>>(),
  headers: json('headers').$type<Record<string, any>>().default({}).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // success, error, pending
  error_message: text('error_message'),
  lead_id: varchar('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  allocation_issue: text('allocation_issue'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// LEAD UPDATES
// ============================================================================
export const lead_updates = pgTable('lead_updates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  lead_id: varchar('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  update_via: varchar('update_via', { length: 50 }).notNull(), // whatsapp, call, transfer
  update_on: varchar('update_on', { length: 255 }).notNull(), // date string
  remark: text('remark').notNull(),
  created_by_user_id: varchar('created_by_user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// FUTURE IMPROVEMENTS
// ============================================================================
export const future_improvements = pgTable('future_improvements', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('planned'), // planned, in_progress, ready, completed
  priority: varchar('priority', { length: 50 }).notNull().default('medium'), // high, medium, low
  estimated_effort: varchar('estimated_effort', { length: 100 }),
  cost_estimate: varchar('cost_estimate', { length: 100 }),
  discussion_notes: text('discussion_notes'), // Store all discussion context
  technical_details: json('technical_details').$type<{
    affected_files?: string[];
    architecture_notes?: string;
    implementation_steps?: string[];
    dependencies?: string[];
  }>().default({}),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
