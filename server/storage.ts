import { randomUUID } from "crypto";
import type {
  Company,
  InsertCompany,
  User,
  InsertUser,
  Sheet,
  InsertSheet,
  SheetUser,
  InsertSheetUser,
  Lead,
  InsertLead,
  DropdownOption,
  InsertDropdownOption,
  CustomColumn,
  InsertCustomColumn,
  ValidationRule,
  InsertValidationRule,
  QuickFilter,
  InsertQuickFilter,
  Audit,
  InsertAudit,
  WebhookLog,
  InsertWebhookLog,
  LeadUpdate,
  InsertLeadUpdate,
  Invite,
  InsertInvite,
  CompanyWebhook,
  InsertCompanyWebhook,
  WebhookFieldMapping,
  InsertWebhookFieldMapping,
  WebhookAllocationRule,
  InsertWebhookAllocationRule,
  WebhookRequest,
  InsertWebhookRequest,
} from "@shared/schema";

export interface IStorage {
  // Companies
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByCompanyId(companyId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Company Signup (Transactional)
  createCompanyWithAdmin(companyName: string, adminName: string, adminEmail: string, passwordHash: string): Promise<{ company: Company; admin: User; token: string }>;

  // Invites (Staff Invitation System)
  getInvite(id: string): Promise<Invite | undefined>;
  getInviteByCode(code: string): Promise<Invite | undefined>;
  getInvitesByCompany(companyId: string): Promise<Invite[]>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  updateInvite(id: string, updates: Partial<Invite>): Promise<Invite | undefined>;
  deleteInvite(id: string): Promise<boolean>;

  // Sheets
  getSheet(id: string): Promise<Sheet | undefined>;
  getSheetsByUserId(userId: string): Promise<Sheet[]>;
  getSheetsByCompanyId(companyId: string): Promise<Sheet[]>;
  getPersonalSheets(userId: string): Promise<Sheet[]>;
  getCompanySheets(companyId: string): Promise<Sheet[]>;
  getAllSheets(): Promise<Sheet[]>;
  createSheet(sheet: InsertSheet): Promise<Sheet>;
  updateSheet(id: string, updates: Partial<Sheet>): Promise<Sheet | undefined>;
  deleteSheet(id: string): Promise<boolean>;
  softDeleteSheet(id: string): Promise<boolean>;

  // Sheet Users (Permissions)
  getSheetUsers(sheetId: string): Promise<SheetUser[]>;
  getSheetUser(sheetId: string, userId: string): Promise<SheetUser | undefined>;
  createSheetUser(sheetUser: InsertSheetUser): Promise<SheetUser>;
  updateSheetUser(id: string, updates: Partial<SheetUser>): Promise<SheetUser | undefined>;
  deleteSheetUser(id: string): Promise<boolean>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsBySheetId(sheetId: string): Promise<Lead[]>;
  getDeletedLeadsBySheetId(sheetId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string, userId: string): Promise<boolean>;
  deleteLeads(ids: string[], userId: string): Promise<number>;
  restoreLead(id: string): Promise<boolean>;
  restoreLeads(ids: string[]): Promise<number>;
  cleanupOldDeletedLeads(): Promise<number>;

  // Dropdown Options (Company-scoped)
  getDropdownOptions(sheetId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByCompany(companyId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByColumn(companyId: string, columnKey: string): Promise<DropdownOption[]>;
  createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption>;
  updateDropdownOption(id: string, updates: Partial<DropdownOption>): Promise<DropdownOption | undefined>;
  deleteDropdownOption(id: string): Promise<boolean>;

  // Custom Columns (Company-scoped)
  getCustomColumns(sheetId: string): Promise<CustomColumn[]>;
  getCustomColumnsByCompany(companyId: string): Promise<CustomColumn[]>;
  getCompanyColumns(companyId: string): Promise<CustomColumn[]>;
  getCustomColumnById(id: string): Promise<CustomColumn | undefined>;
  createCustomColumn(column: InsertCustomColumn): Promise<CustomColumn>;
  updateCustomColumn(id: string, updates: Partial<CustomColumn>): Promise<CustomColumn | undefined>;
  deleteCustomColumn(id: string): Promise<boolean>;

  // Validation Rules (Company-scoped Conditional Validations)
  getValidationRules(companyId: string, sheetId?: string | null): Promise<ValidationRule[]>;
  getValidationRuleById(id: string): Promise<ValidationRule | undefined>;
  createValidationRule(rule: InsertValidationRule): Promise<ValidationRule>;
  updateValidationRule(id: string, updates: Partial<ValidationRule>): Promise<ValidationRule | undefined>;
  deleteValidationRule(id: string): Promise<boolean>;

  // Quick Filters (Company-wide Quick Filters)
  getQuickFilters(companyId: string): Promise<QuickFilter[]>;
  getQuickFilterById(id: string): Promise<QuickFilter | undefined>;
  createQuickFilter(filter: InsertQuickFilter): Promise<QuickFilter>;
  updateQuickFilter(id: string, updates: Partial<QuickFilter>): Promise<QuickFilter | undefined>;
  deleteQuickFilter(id: string): Promise<boolean>;

  // Audit Logs
  getAuditLogs(): Promise<Audit[]>;
  getAuditLogsByCompany(companyId: string): Promise<Audit[]>;
  getAuditLogsByModel(model: string, modelId: string): Promise<Audit[]>;
  createAuditLog(audit: InsertAudit): Promise<Audit>;

  // Webhook Logs
  getWebhookLogs(): Promise<WebhookLog[]>;
  getWebhookLogsByCompany(companyId: string): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;

  // Lead Updates
  getLeadUpdates(leadId: string): Promise<LeadUpdate[]>;
  createLeadUpdate(update: InsertLeadUpdate): Promise<LeadUpdate>;
  updateLeadUpdate(id: string, updates: Partial<LeadUpdate>): Promise<LeadUpdate | undefined>;
  deleteLeadUpdate(id: string): Promise<boolean>;

  // Company Webhooks
  getCompanyWebhook(id: string): Promise<CompanyWebhook | undefined>;
  getCompanyWebhookByToken(token: string): Promise<CompanyWebhook | undefined>;
  getCompanyWebhooksByCompanyId(companyId: string): Promise<CompanyWebhook[]>;
  createCompanyWebhook(webhook: InsertCompanyWebhook): Promise<CompanyWebhook>;
  updateCompanyWebhook(id: string, updates: Partial<CompanyWebhook>): Promise<CompanyWebhook | undefined>;
  deleteCompanyWebhook(id: string): Promise<boolean>;

  // Webhook Field Mappings
  getWebhookFieldMappings(webhookId: string): Promise<WebhookFieldMapping[]>;
  createWebhookFieldMapping(mapping: InsertWebhookFieldMapping): Promise<WebhookFieldMapping>;
  deleteWebhookFieldMappingsByWebhookId(webhookId: string): Promise<boolean>;

  // Webhook Allocation Rules
  getWebhookAllocationRules(webhookId: string): Promise<WebhookAllocationRule[]>;
  createWebhookAllocationRule(rule: InsertWebhookAllocationRule): Promise<WebhookAllocationRule>;
  deleteWebhookAllocationRulesByWebhookId(webhookId: string): Promise<boolean>;

  // Webhook Requests
  getWebhookRequests(webhookId: string): Promise<WebhookRequest[]>;
  getWebhookRequestsByCompanyId(companyId: string): Promise<WebhookRequest[]>;
  createWebhookRequest(request: InsertWebhookRequest): Promise<WebhookRequest>;
}

export class MemStorage implements IStorage {
  private companies: Map<string, Company>;
  private users: Map<string, User>;
  private sheets: Map<string, Sheet>;
  private sheetUsers: Map<string, SheetUser>;
  private leads: Map<string, Lead>;
  private dropdownOptions: Map<string, DropdownOption>;
  private customColumns: Map<string, CustomColumn>;
  private validationRules: Map<string, ValidationRule>;
  private quickFilters: Map<string, QuickFilter>;
  private auditLogs: Map<string, Audit>;
  private webhookLogs: Map<string, WebhookLog>;
  private leadUpdates: Map<string, LeadUpdate>;
  private invites: Map<string, Invite>;

  constructor() {
    this.companies = new Map();
    this.users = new Map();
    this.sheets = new Map();
    this.sheetUsers = new Map();
    this.leads = new Map();
    this.dropdownOptions = new Map();
    this.customColumns = new Map();
    this.validationRules = new Map();
    this.quickFilters = new Map();
    this.auditLogs = new Map();
    this.webhookLogs = new Map();
    this.leadUpdates = new Map();
    this.invites = new Map();
  }

  // Companies
  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find((company) => company.slug === slug);
  }

  async getAllCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const company: Company = {
      ...insertCompany,
      id,
      created_at: now,
      updated_at: now,
    };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    const updated = { ...company, ...updates, updated_at: new Date().toISOString() };
    this.companies.set(id, updated);
    return updated;
  }

  async deleteCompany(id: string): Promise<boolean> {
    return this.companies.delete(id);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByCompanyId(companyId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.company_id === companyId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Note: password_hash should be provided already hashed by the caller (auth layer)
    // The InsertUser has a password field which should be hashed before calling this method
    const id = randomUUID();
    const now = new Date().toISOString();
    const user: User = {
      id,
      company_id: insertUser.company_id ?? null,
      name: insertUser.name,
      email: insertUser.email,
      password_hash: (insertUser as any).password_hash || "", // Will be set by auth layer
      role: insertUser.role,
      invited_by: insertUser.invited_by ?? null,
      last_login: null,
      created_at: now,
      updated_at: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Company Signup (Transactional)
  async createCompanyWithAdmin(
    companyName: string,
    adminName: string,
    adminEmail: string,
    passwordHash: string
  ): Promise<{ company: Company; admin: User; token: string }> {
    // Generate unique slug from company name
    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await this.getCompanyBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create company
    const company = await this.createCompany({
      name: companyName,
      slug,
      settings: {
        timezone: "UTC",
        date_format: "DD/MM/YYYY",
      },
      status: "trial",
    });

    // Create admin user
    const admin = await this.createUser({
      company_id: company.id,
      name: adminName,
      email: adminEmail,
      password: passwordHash, // Already hashed by caller
      role: "company_admin",
      invited_by: null,
    } as any);

    // Create default columns for the company
    const { getDefaultColumnsForCompany } = await import("@shared/schema");
    const defaultColumns = getDefaultColumnsForCompany(company.id);
    for (const columnDef of defaultColumns) {
      await this.createCustomColumn(columnDef);
    }

    // Create default sheet for the company
    await this.createSheet({
      company_id: company.id,
      name: "My First Sheet",
      owner_id: admin.id,
      is_personal: false,
      visibility: "company",
      settings: {},
    });

    // Create audit log
    await this.createAuditLog({
      user_id: admin.id,
      company_id: company.id,
      action: "company_signup",
      model: "Company",
      model_id: company.id,
      payload: { company_name: companyName, admin_email: adminEmail },
    });

    // Generate JWT token (note: in production, this should use proper JWT library)
    // For now, returning a placeholder - the actual token will be generated by auth routes
    const token = "";

    return { company, admin, token };
  }

  // Invites (Staff Invitation System)
  async getInvite(id: string): Promise<Invite | undefined> {
    return this.invites.get(id);
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(invite => invite.code === code);
  }

  async getInvitesByCompany(companyId: string): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(invite => invite.company_id === companyId);
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // Generate unique 8-character invite code
    const code = randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const invite: Invite = {
      ...insertInvite,
      id,
      code,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      accepted_by: null,
      accepted_at: null,
      created_at: now,
    };
    
    this.invites.set(id, invite);
    return invite;
  }

  async updateInvite(id: string, updates: Partial<Invite>): Promise<Invite | undefined> {
    const invite = this.invites.get(id);
    if (!invite) return undefined;
    
    const updated: Invite = {
      ...invite,
      ...updates,
    };
    
    this.invites.set(id, updated);
    return updated;
  }

  async deleteInvite(id: string): Promise<boolean> {
    return this.invites.delete(id);
  }

  // Sheets
  async getSheet(id: string): Promise<Sheet | undefined> {
    return this.sheets.get(id);
  }

  async getSheetsByUserId(userId: string): Promise<Sheet[]> {
    // Get sheets accessible to this user:
    // 1. Sheets with explicit SheetUser permission
    // 2. Personal sheets owned by user
    // 3. Company-wide sheets (visibility: "company") for user's company
    const user = await this.getUser(userId);
    if (!user) return [];

    // 1. Explicitly permissioned sheets
    const userSheets = Array.from(this.sheetUsers.values()).filter(
      (su) => su.user_id === userId
    );
    const permissionedSheets = userSheets
      .map((su) => this.sheets.get(su.sheet_id))
      .filter((s): s is Sheet => s !== undefined && s.deleted_at === null);

    // 2. Personal sheets owned by this user
    const personalSheets = Array.from(this.sheets.values()).filter(
      (sheet) => sheet.owner_id === userId && sheet.is_personal && sheet.deleted_at === null
    );

    // 3. Company-wide sheets (visibility: "company") if user belongs to a company
    const companyWideSheets = user.company_id
      ? Array.from(this.sheets.values()).filter(
          (sheet) =>
            sheet.company_id === user.company_id &&
            sheet.visibility === "company" &&
            !sheet.is_personal &&
            sheet.deleted_at === null
        )
      : [];

    // Combine and deduplicate
    const allSheets = [...permissionedSheets, ...personalSheets, ...companyWideSheets];
    const uniqueSheets = Array.from(new Map(allSheets.map(s => [s.id, s])).values());
    return uniqueSheets;
  }

  async getSheetsByCompanyId(companyId: string): Promise<Sheet[]> {
    return Array.from(this.sheets.values()).filter(
      (sheet) => sheet.company_id === companyId && sheet.deleted_at === null
    );
  }

  async getPersonalSheets(userId: string): Promise<Sheet[]> {
    return Array.from(this.sheets.values()).filter(
      (sheet) => sheet.owner_id === userId && sheet.is_personal && sheet.deleted_at === null
    );
  }

  async getCompanySheets(companyId: string): Promise<Sheet[]> {
    return Array.from(this.sheets.values()).filter(
      (sheet) => sheet.company_id === companyId && !sheet.is_personal && sheet.deleted_at === null
    );
  }

  async getAllSheets(): Promise<Sheet[]> {
    return Array.from(this.sheets.values()).filter(sheet => sheet.deleted_at === null);
  }

  async createSheet(insertSheet: InsertSheet): Promise<Sheet> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const sheet: Sheet = {
      ...insertSheet,
      deleted_at: null,
      id,
      created_at: now,
      updated_at: now,
    };
    this.sheets.set(id, sheet);
    return sheet;
  }

  async updateSheet(id: string, updates: Partial<Sheet>): Promise<Sheet | undefined> {
    const sheet = this.sheets.get(id);
    if (!sheet) return undefined;
    const updated = { ...sheet, ...updates, updated_at: new Date().toISOString() };
    this.sheets.set(id, updated);
    return updated;
  }

  async deleteSheet(id: string): Promise<boolean> {
    return this.sheets.delete(id);
  }

  async softDeleteSheet(id: string): Promise<boolean> {
    const sheet = this.sheets.get(id);
    if (!sheet) return false;
    sheet.deleted_at = new Date().toISOString();
    this.sheets.set(id, sheet);
    return true;
  }

  // Sheet Users
  async getSheetUsers(sheetId: string): Promise<SheetUser[]> {
    return Array.from(this.sheetUsers.values()).filter((su) => su.sheet_id === sheetId);
  }

  async getSheetUser(sheetId: string, userId: string): Promise<SheetUser | undefined> {
    return Array.from(this.sheetUsers.values()).find(
      (su) => su.sheet_id === sheetId && su.user_id === userId
    );
  }

  async createSheetUser(insertSheetUser: InsertSheetUser): Promise<SheetUser> {
    const id = randomUUID();
    const sheetUser: SheetUser = {
      ...insertSheetUser,
      id,
      created_at: new Date().toISOString(),
    };
    this.sheetUsers.set(id, sheetUser);
    return sheetUser;
  }

  async updateSheetUser(id: string, updates: Partial<SheetUser>): Promise<SheetUser | undefined> {
    const sheetUser = this.sheetUsers.get(id);
    if (!sheetUser) return undefined;
    const updated = { ...sheetUser, ...updates };
    this.sheetUsers.set(id, updated);
    return updated;
  }

  async deleteSheetUser(id: string): Promise<boolean> {
    return this.sheetUsers.delete(id);
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeadsBySheetId(sheetId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter((lead) => lead.sheet_id === sheetId && !lead.deleted_at);
  }

  async getDeletedLeadsBySheetId(sheetId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter((lead) => lead.sheet_id === sheetId && lead.deleted_at);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const lead: Lead = {
      id,
      sheet_id: insertLead.sheet_id,
      owner_user_id: insertLead.owner_user_id || "",
      custom_fields: insertLead.custom_fields || {},
      meta: insertLead.meta || {},
      deleted_at: null,
      deleted_by_user_id: null,
      created_at: now,
      updated_at: now,
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    const updated = { ...lead, ...updates, updated_at: new Date().toISOString() };
    this.leads.set(id, updated);
    return updated;
  }

  async deleteLead(id: string, userId: string): Promise<boolean> {
    const lead = this.leads.get(id);
    if (lead) {
      lead.deleted_at = new Date().toISOString();
      lead.deleted_by_user_id = userId;
      this.leads.set(id, lead);
      return true;
    }
    return false;
  }

  async deleteLeads(ids: string[], userId: string): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (await this.deleteLead(id, userId)) count++;
    }
    return count;
  }

  async restoreLead(id: string): Promise<boolean> {
    const lead = this.leads.get(id);
    if (lead) {
      lead.deleted_at = null;
      lead.deleted_by_user_id = null;
      this.leads.set(id, lead);
      return true;
    }
    return false;
  }

  async restoreLeads(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (await this.restoreLead(id)) count++;
    }
    return count;
  }

  async cleanupOldDeletedLeads(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let count = 0;
    for (const [id, lead] of this.leads.entries()) {
      if (lead.deleted_at && new Date(lead.deleted_at) < thirtyDaysAgo) {
        this.leads.delete(id);
        count++;
      }
    }
    return count;
  }

  // Dropdown Options (Company-scoped)
  async getDropdownOptions(sheetId: string): Promise<DropdownOption[]> {
    // Get sheet to find company_id
    const sheet = await this.getSheet(sheetId);
    if (!sheet) return [];
    
    return Array.from(this.dropdownOptions.values()).filter(
      (opt) => opt.company_id === sheet.company_id && (opt.sheet_id === sheetId || opt.sheet_id === null)
    );
  }

  async getDropdownOptionsByCompany(companyId: string): Promise<DropdownOption[]> {
    return Array.from(this.dropdownOptions.values()).filter(
      (opt) => opt.company_id === companyId
    );
  }

  async getDropdownOptionsByColumn(companyId: string, columnKey: string): Promise<DropdownOption[]> {
    return Array.from(this.dropdownOptions.values()).filter(
      (opt) => opt.company_id === companyId && opt.column_key === columnKey
    );
  }

  async createDropdownOption(insertOption: InsertDropdownOption): Promise<DropdownOption> {
    const id = randomUUID();
    const option: DropdownOption = {
      ...insertOption,
      id,
      sheet_id: insertOption.sheet_id ?? null,
      created_at: new Date().toISOString(),
    };
    this.dropdownOptions.set(id, option);
    return option;
  }

  async updateDropdownOption(
    id: string,
    updates: Partial<DropdownOption>
  ): Promise<DropdownOption | undefined> {
    const option = this.dropdownOptions.get(id);
    if (!option) return undefined;
    const updated = { ...option, ...updates };
    this.dropdownOptions.set(id, updated);
    return updated;
  }

  async deleteDropdownOption(id: string): Promise<boolean> {
    return this.dropdownOptions.delete(id);
  }

  // Custom Columns (Company-scoped)
  async getCustomColumns(sheetId: string): Promise<CustomColumn[]> {
    // Get sheet to find company_id
    const sheet = await this.getSheet(sheetId);
    if (!sheet) return [];
    
    // Return company-wide columns and sheet-specific columns
    return Array.from(this.customColumns.values()).filter(
      (col) => col.company_id === sheet.company_id && (col.sheet_id === null || col.sheet_id === sheetId)
    );
  }

  async getCustomColumnsByCompany(companyId: string): Promise<CustomColumn[]> {
    return Array.from(this.customColumns.values()).filter(
      (col) => col.company_id === companyId
    );
  }

  async getCompanyColumns(companyId: string): Promise<CustomColumn[]> {
    return Array.from(this.customColumns.values()).filter(
      (col) => col.company_id === companyId
    );
  }

  async getCustomColumnById(id: string): Promise<CustomColumn | undefined> {
    return this.customColumns.get(id);
  }

  async createCustomColumn(insertColumn: InsertCustomColumn): Promise<CustomColumn> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const column: CustomColumn = {
      ...insertColumn,
      sheet_id: insertColumn.sheet_id ?? null,
      id,
      created_at: now,
      updated_at: now,
    };
    this.customColumns.set(id, column);
    return column;
  }

  async updateCustomColumn(
    id: string,
    updates: Partial<CustomColumn>
  ): Promise<CustomColumn | undefined> {
    const column = this.customColumns.get(id);
    if (!column) return undefined;
    const updated = { ...column, ...updates, updated_at: new Date().toISOString() };
    this.customColumns.set(id, updated);
    return updated;
  }

  async deleteCustomColumn(id: string): Promise<boolean> {
    return this.customColumns.delete(id);
  }

  // Validation Rules (Company-scoped Conditional Validations)
  async getValidationRules(companyId: string, sheetId?: string | null): Promise<ValidationRule[]> {
    return Array.from(this.validationRules.values()).filter(
      (rule) => 
        rule.company_id === companyId && 
        (sheetId === undefined || rule.sheet_id === sheetId || rule.sheet_id === null)
    );
  }

  async getValidationRuleById(id: string): Promise<ValidationRule | undefined> {
    return this.validationRules.get(id);
  }

  async createValidationRule(insertRule: InsertValidationRule): Promise<ValidationRule> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const rule: ValidationRule = {
      ...insertRule,
      sheet_id: insertRule.sheet_id ?? null,
      id,
      created_at: now,
      updated_at: now,
    };
    this.validationRules.set(id, rule);
    return rule;
  }

  async updateValidationRule(
    id: string,
    updates: Partial<ValidationRule>
  ): Promise<ValidationRule | undefined> {
    const rule = this.validationRules.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, ...updates, updated_at: new Date().toISOString() };
    this.validationRules.set(id, updated);
    return updated;
  }

  async deleteValidationRule(id: string): Promise<boolean> {
    return this.validationRules.delete(id);
  }

  // Quick Filters (Company-wide Quick Filters)
  async getQuickFilters(companyId: string): Promise<QuickFilter[]> {
    return Array.from(this.quickFilters.values())
      .filter((filter) => filter.company_id === companyId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async getQuickFilterById(id: string): Promise<QuickFilter | undefined> {
    return this.quickFilters.get(id);
  }

  async createQuickFilter(insertFilter: InsertQuickFilter): Promise<QuickFilter> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const filter: QuickFilter = {
      ...insertFilter,
      icon: insertFilter.icon ?? null,
      color: insertFilter.color ?? null,
      id,
      created_at: now,
      updated_at: now,
    };
    this.quickFilters.set(id, filter);
    return filter;
  }

  async updateQuickFilter(
    id: string,
    updates: Partial<QuickFilter>
  ): Promise<QuickFilter | undefined> {
    const filter = this.quickFilters.get(id);
    if (!filter) return undefined;
    const updated = { ...filter, ...updates, updated_at: new Date().toISOString() };
    this.quickFilters.set(id, updated);
    return updated;
  }

  async deleteQuickFilter(id: string): Promise<boolean> {
    return this.quickFilters.delete(id);
  }

  // Audit Logs
  async getAuditLogs(): Promise<Audit[]> {
    return Array.from(this.auditLogs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getAuditLogsByCompany(companyId: string): Promise<Audit[]> {
    return Array.from(this.auditLogs.values())
      .filter((log) => log.company_id === companyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getAuditLogsByModel(model: string, modelId: string): Promise<Audit[]> {
    return Array.from(this.auditLogs.values())
      .filter((log) => log.model === model && log.model_id === modelId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createAuditLog(insertAudit: InsertAudit): Promise<Audit> {
    const id = randomUUID();
    const audit: Audit = {
      ...insertAudit,
      company_id: insertAudit.company_id ?? null,
      id,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.set(id, audit);
    return audit;
  }

  // Webhook Logs
  async getWebhookLogs(): Promise<WebhookLog[]> {
    return Array.from(this.webhookLogs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getWebhookLogsByCompany(companyId: string): Promise<WebhookLog[]> {
    return Array.from(this.webhookLogs.values())
      .filter((log) => log.company_id === companyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createWebhookLog(insertLog: InsertWebhookLog): Promise<WebhookLog> {
    const id = randomUUID();
    const log: WebhookLog = {
      ...insertLog,
      sheet_id: insertLog.sheet_id ?? null,
      error_message: insertLog.error_message ?? null,
      lead_id: insertLog.lead_id ?? null,
      id,
      created_at: new Date().toISOString(),
    };
    this.webhookLogs.set(id, log);
    return log;
  }

  // Lead Updates
  async getLeadUpdates(leadId: string): Promise<LeadUpdate[]> {
    return Array.from(this.leadUpdates.values())
      .filter((update) => update.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createLeadUpdate(insertUpdate: InsertLeadUpdate): Promise<LeadUpdate> {
    const id = randomUUID();
    const update: LeadUpdate = {
      ...insertUpdate,
      id,
      created_by_user_id: insertUpdate.created_by_user_id || null,
      created_at: new Date().toISOString(),
    };
    this.leadUpdates.set(id, update);
    return update;
  }

  async updateLeadUpdate(id: string, updates: Partial<LeadUpdate>): Promise<LeadUpdate | undefined> {
    const update = this.leadUpdates.get(id);
    if (!update) return undefined;
    const updated = { ...update, ...updates };
    this.leadUpdates.set(id, updated);
    return updated;
  }

  async deleteLeadUpdate(id: string): Promise<boolean> {
    return this.leadUpdates.delete(id);
  }

  // Company Webhooks (stub implementations for MemStorage)
  async getCompanyWebhook(id: string): Promise<CompanyWebhook | undefined> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async getCompanyWebhookByToken(token: string): Promise<CompanyWebhook | undefined> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async getCompanyWebhooksByCompanyId(companyId: string): Promise<CompanyWebhook[]> {
    return [];
  }
  
  async createCompanyWebhook(webhook: InsertCompanyWebhook): Promise<CompanyWebhook> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async updateCompanyWebhook(id: string, updates: Partial<CompanyWebhook>): Promise<CompanyWebhook | undefined> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async deleteCompanyWebhook(id: string): Promise<boolean> {
    throw new Error("Webhook management not supported in MemStorage");
  }

  // Webhook Field Mappings (stub implementations)
  async getWebhookFieldMappings(webhookId: string): Promise<WebhookFieldMapping[]> {
    return [];
  }
  
  async createWebhookFieldMapping(mapping: InsertWebhookFieldMapping): Promise<WebhookFieldMapping> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async deleteWebhookFieldMappingsByWebhookId(webhookId: string): Promise<boolean> {
    return false;
  }

  // Webhook Allocation Rules (stub implementations)
  async getWebhookAllocationRules(webhookId: string): Promise<WebhookAllocationRule[]> {
    return [];
  }
  
  async createWebhookAllocationRule(rule: InsertWebhookAllocationRule): Promise<WebhookAllocationRule> {
    throw new Error("Webhook management not supported in MemStorage");
  }
  
  async deleteWebhookAllocationRulesByWebhookId(webhookId: string): Promise<boolean> {
    return false;
  }

  // Webhook Requests (stub implementations)
  async getWebhookRequests(webhookId: string): Promise<WebhookRequest[]> {
    return [];
  }
  
  async getWebhookRequestsByCompanyId(companyId: string): Promise<WebhookRequest[]> {
    return [];
  }
  
  async createWebhookRequest(request: InsertWebhookRequest): Promise<WebhookRequest> {
    throw new Error("Webhook management not supported in MemStorage");
  }
}

// ============================================================================
// POSTGRESQL STORAGE (Permanent Database)
// ============================================================================
import { db } from "./db";
import { eq, and, or, desc, isNull, isNotNull, sql as drizzleSql } from "drizzle-orm";
import * as dbSchema from "@shared/schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dabluz-crm-secret-key-change-in-production";

function generateToken(userId: string, role: string, companyId: string | null): string {
  return jwt.sign({ userId, role, companyId }, JWT_SECRET, { expiresIn: "7d" });
}

export class PgStorage implements IStorage {
  // Companies
  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(dbSchema.companies).where(eq(dbSchema.companies.id, id));
    if (result.length === 0) return undefined;
    return this.mapCompany(result[0]);
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const result = await db.select().from(dbSchema.companies).where(eq(dbSchema.companies.slug, slug));
    if (result.length === 0) return undefined;
    return this.mapCompany(result[0]);
  }

  async getAllCompanies(): Promise<Company[]> {
    const result = await db.select().from(dbSchema.companies);
    return result.map(this.mapCompany);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const now = new Date();
    const newCompany = {
      id,
      ...company,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.companies).values(newCompany);
    return this.mapCompany(newCompany as any);
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.companies).set(convertedUpdates).where(eq(dbSchema.companies.id, id));
    return this.getCompany(id);
  }

  async deleteCompany(id: string): Promise<boolean> {
    await db.delete(dbSchema.companies).where(eq(dbSchema.companies.id, id));
    return true;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(dbSchema.users).where(eq(dbSchema.users.id, id));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(dbSchema.users).where(eq(dbSchema.users.email, email));
    if (result.length === 0) return undefined;
    return this.mapUser(result[0]);
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(dbSchema.users);
    return result.map(this.mapUser);
  }

  async getUsersByCompanyId(companyId: string): Promise<User[]> {
    const result = await db.select().from(dbSchema.users).where(eq(dbSchema.users.company_id, companyId));
    return result.map(this.mapUser);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const newUser = {
      id,
      ...user,
      password_hash: (user as any).password_hash,
      last_login: null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.users).values(newUser);
    return this.mapUser(newUser as any);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    if (updates.last_login && typeof updates.last_login === 'string') {
      convertedUpdates.last_login = new Date(updates.last_login);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.users).set(convertedUpdates).where(eq(dbSchema.users.id, id));
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(dbSchema.users).where(eq(dbSchema.users.id, id));
    return true;
  }

  // Company Signup (Transactional)
  async createCompanyWithAdmin(companyName: string, adminName: string, adminEmail: string, passwordHash: string): Promise<{ company: Company; admin: User; token: string }> {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const company = await this.createCompany({ name: companyName, slug, settings: {}, status: 'active' });
    const admin = await this.createUser({ 
      company_id: company.id, 
      name: adminName, 
      email: adminEmail, 
      password_hash: passwordHash, 
      role: 'company_admin' 
    } as any);
    const token = generateToken(admin.id, admin.role, admin.company_id);
    return { company, admin, token };
  }

  // Invites
  async getInvite(id: string): Promise<Invite | undefined> {
    const result = await db.select().from(dbSchema.invites).where(eq(dbSchema.invites.id, id));
    if (result.length === 0) return undefined;
    return this.mapInvite(result[0]);
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    const result = await db.select().from(dbSchema.invites).where(eq(dbSchema.invites.code, code));
    if (result.length === 0) return undefined;
    return this.mapInvite(result[0]);
  }

  async getInvitesByCompany(companyId: string): Promise<Invite[]> {
    const result = await db.select().from(dbSchema.invites).where(eq(dbSchema.invites.company_id, companyId));
    return result.map(this.mapInvite);
  }

  async createInvite(invite: InsertInvite): Promise<Invite> {
    const id = randomUUID();
    const code = randomUUID().substring(0, 8);
    const now = new Date();
    const expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newInvite = {
      id,
      ...invite,
      code,
      status: 'pending' as const,
      expires_at,
      accepted_by: null,
      accepted_at: null,
      created_at: now,
    };
    await db.insert(dbSchema.invites).values(newInvite);
    return this.mapInvite(newInvite as any);
  }

  async updateInvite(id: string, updates: Partial<Invite>): Promise<Invite | undefined> {
    const convertedUpdates: any = { ...updates };
    if (updates.expires_at && typeof updates.expires_at === 'string') {
      convertedUpdates.expires_at = new Date(updates.expires_at);
    }
    if (updates.accepted_at && typeof updates.accepted_at === 'string') {
      convertedUpdates.accepted_at = new Date(updates.accepted_at);
    }
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.invites).set(convertedUpdates).where(eq(dbSchema.invites.id, id));
    return this.getInvite(id);
  }

  async deleteInvite(id: string): Promise<boolean> {
    await db.delete(dbSchema.invites).where(eq(dbSchema.invites.id, id));
    return true;
  }

  // Sheets
  async getSheet(id: string): Promise<Sheet | undefined> {
    const result = await db.select().from(dbSchema.sheets).where(eq(dbSchema.sheets.id, id));
    if (result.length === 0) return undefined;
    return this.mapSheet(result[0]);
  }

  async getSheetsByUserId(userId: string): Promise<Sheet[]> {
    // Get sheets accessible to this user:
    // 1. Sheets with explicit SheetUser permission
    // 2. Personal sheets owned by user
    // 3. Company-wide sheets (visibility: "company") for user's company
    const user = await this.getUser(userId);
    if (!user) return [];

    const allSheets: Sheet[] = [];

    // 1. Explicitly permissioned sheets (via sheet_users table)
    const sheetUserRows = await db.select().from(dbSchema.sheet_users).where(eq(dbSchema.sheet_users.user_id, userId));
    for (const su of sheetUserRows) {
      const sheet = await this.getSheet(su.sheet_id);
      if (sheet && sheet.deleted_at === null) {
        allSheets.push(sheet);
      }
    }

    // 2. Personal sheets owned by this user
    const personalSheets = await db.select().from(dbSchema.sheets).where(
      and(
        eq(dbSchema.sheets.owner_id, userId),
        eq(dbSchema.sheets.is_personal, true),
        isNull(dbSchema.sheets.deleted_at)
      )
    );
    allSheets.push(...personalSheets.map(this.mapSheet));

    // 3. Company-wide sheets (visibility: "company") if user belongs to a company
    if (user.company_id) {
      const companyWideSheets = await db.select().from(dbSchema.sheets).where(
        and(
          eq(dbSchema.sheets.company_id, user.company_id),
          eq(dbSchema.sheets.visibility, 'company'),
          eq(dbSchema.sheets.is_personal, false),
          isNull(dbSchema.sheets.deleted_at)
        )
      );
      allSheets.push(...companyWideSheets.map(this.mapSheet));
    }

    // Deduplicate by sheet ID
    const uniqueSheets = Array.from(new Map(allSheets.map(s => [s.id, s])).values());
    return uniqueSheets;
  }

  async getSheetsByCompanyId(companyId: string): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(eq(dbSchema.sheets.company_id, companyId));
    return result.map(this.mapSheet);
  }

  async getPersonalSheets(userId: string): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(and(eq(dbSchema.sheets.owner_id, userId), eq(dbSchema.sheets.is_personal, true)));
    return result.map(this.mapSheet);
  }

  async getCompanySheets(companyId: string): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(and(eq(dbSchema.sheets.company_id, companyId), eq(dbSchema.sheets.is_personal, false)));
    return result.map(this.mapSheet);
  }

  async getAllSheets(): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets);
    return result.map(this.mapSheet);
  }

  async createSheet(sheet: InsertSheet): Promise<Sheet> {
    const id = randomUUID();
    const now = new Date();
    const newSheet = {
      id,
      ...sheet,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.sheets).values(newSheet);
    return this.mapSheet(newSheet as any);
  }

  async updateSheet(id: string, updates: Partial<Sheet>): Promise<Sheet | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    if (updates.deleted_at && typeof updates.deleted_at === 'string') {
      convertedUpdates.deleted_at = new Date(updates.deleted_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.sheets).set(convertedUpdates).where(eq(dbSchema.sheets.id, id));
    return this.getSheet(id);
  }

  async deleteSheet(id: string): Promise<boolean> {
    await db.delete(dbSchema.sheets).where(eq(dbSchema.sheets.id, id));
    return true;
  }

  async softDeleteSheet(id: string): Promise<boolean> {
    const deleted_at = new Date();
    await db.update(dbSchema.sheets).set({ deleted_at }).where(eq(dbSchema.sheets.id, id));
    return true;
  }

  // Sheet Users
  async getSheetUsers(sheetId: string): Promise<SheetUser[]> {
    const result = await db.select().from(dbSchema.sheet_users).where(eq(dbSchema.sheet_users.sheet_id, sheetId));
    return result.map(this.mapSheetUser);
  }

  async getSheetUser(sheetId: string, userId: string): Promise<SheetUser | undefined> {
    const result = await db.select().from(dbSchema.sheet_users).where(and(eq(dbSchema.sheet_users.sheet_id, sheetId), eq(dbSchema.sheet_users.user_id, userId)));
    if (result.length === 0) return undefined;
    return this.mapSheetUser(result[0]);
  }

  async createSheetUser(sheetUser: InsertSheetUser): Promise<SheetUser> {
    const id = randomUUID();
    const now = new Date();
    const newSheetUser = {
      id,
      ...sheetUser,
      created_at: now,
    };
    await db.insert(dbSchema.sheet_users).values(newSheetUser);
    return this.mapSheetUser(newSheetUser as any);
  }

  async updateSheetUser(id: string, updates: Partial<SheetUser>): Promise<SheetUser | undefined> {
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.sheet_users).set(convertedUpdates).where(eq(dbSchema.sheet_users.id, id));
    const result = await db.select().from(dbSchema.sheet_users).where(eq(dbSchema.sheet_users.id, id));
    if (result.length === 0) return undefined;
    return this.mapSheetUser(result[0]);
  }

  async deleteSheetUser(id: string): Promise<boolean> {
    await db.delete(dbSchema.sheet_users).where(eq(dbSchema.sheet_users.id, id));
    return true;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(dbSchema.leads).where(eq(dbSchema.leads.id, id));
    if (result.length === 0) return undefined;
    return this.mapLead(result[0]);
  }

  async getLeadsBySheetId(sheetId: string): Promise<Lead[]> {
    const result = await db.select().from(dbSchema.leads).where(
      and(
        eq(dbSchema.leads.sheet_id, sheetId),
        isNull(dbSchema.leads.deleted_at)
      )
    );
    return result.map(this.mapLead);
  }

  async getDeletedLeadsBySheetId(sheetId: string): Promise<Lead[]> {
    const result = await db.select().from(dbSchema.leads).where(
      and(
        eq(dbSchema.leads.sheet_id, sheetId),
        isNotNull(dbSchema.leads.deleted_at)
      )
    );
    return result.map(this.mapLead);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date();
    const newLead = {
      id,
      sheet_id: lead.sheet_id,
      owner_user_id: lead.owner_user_id || '',
      custom_fields: lead.custom_fields || {},
      meta: lead.meta || {},
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.leads).values(newLead);
    return this.mapLead(newLead as any);
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.leads).set(convertedUpdates).where(eq(dbSchema.leads.id, id));
    return this.getLead(id);
  }

  async deleteLead(id: string, userId: string): Promise<boolean> {
    const deleted_at = new Date();
    await db.update(dbSchema.leads).set({
      deleted_at,
      deleted_by_user_id: userId
    }).where(eq(dbSchema.leads.id, id));
    return true;
  }

  async deleteLeads(ids: string[], userId: string): Promise<number> {
    const deleted_at = new Date();
    for (const id of ids) {
      await db.update(dbSchema.leads).set({
        deleted_at,
        deleted_by_user_id: userId
      }).where(eq(dbSchema.leads.id, id));
    }
    return ids.length;
  }

  async restoreLead(id: string): Promise<boolean> {
    await db.update(dbSchema.leads).set({
      deleted_at: null,
      deleted_by_user_id: null
    }).where(eq(dbSchema.leads.id, id));
    return true;
  }

  async restoreLeads(ids: string[]): Promise<number> {
    for (const id of ids) {
      await db.update(dbSchema.leads).set({
        deleted_at: null,
        deleted_by_user_id: null
      }).where(eq(dbSchema.leads.id, id));
    }
    return ids.length;
  }

  async cleanupOldDeletedLeads(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await db.delete(dbSchema.leads).where(
      and(
        isNotNull(dbSchema.leads.deleted_at),
        drizzleSql`${dbSchema.leads.deleted_at} < ${thirtyDaysAgo}`
      )
    );
    
    return 0;
  }

  // Dropdown Options
  async getDropdownOptions(sheetId: string): Promise<DropdownOption[]> {
    const result = await db.select().from(dbSchema.dropdown_options).where(eq(dbSchema.dropdown_options.sheet_id, sheetId));
    return result.map(this.mapDropdownOption);
  }

  async getDropdownOptionsByCompany(companyId: string): Promise<DropdownOption[]> {
    const result = await db.select().from(dbSchema.dropdown_options).where(eq(dbSchema.dropdown_options.company_id, companyId));
    return result.map(this.mapDropdownOption);
  }

  async getDropdownOptionsByColumn(companyId: string, columnKey: string): Promise<DropdownOption[]> {
    const result = await db.select().from(dbSchema.dropdown_options).where(and(eq(dbSchema.dropdown_options.company_id, companyId), eq(dbSchema.dropdown_options.column_key, columnKey)));
    return result.map(this.mapDropdownOption);
  }

  async createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption> {
    const id = randomUUID();
    const now = new Date();
    const newOption = {
      id,
      ...option,
      created_at: now,
    };
    await db.insert(dbSchema.dropdown_options).values(newOption);
    return this.mapDropdownOption(newOption as any);
  }

  async updateDropdownOption(id: string, updates: Partial<DropdownOption>): Promise<DropdownOption | undefined> {
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.dropdown_options).set(convertedUpdates).where(eq(dbSchema.dropdown_options.id, id));
    const result = await db.select().from(dbSchema.dropdown_options).where(eq(dbSchema.dropdown_options.id, id));
    if (result.length === 0) return undefined;
    return this.mapDropdownOption(result[0]);
  }

  async deleteDropdownOption(id: string): Promise<boolean> {
    await db.delete(dbSchema.dropdown_options).where(eq(dbSchema.dropdown_options.id, id));
    return true;
  }

  // Custom Columns
  async getCustomColumns(sheetId: string): Promise<CustomColumn[]> {
    const sheet = await this.getSheet(sheetId);
    if (!sheet) return [];
    
    // Get both company-wide and sheet-specific columns
    const result = await db.select().from(dbSchema.custom_columns)
      .where(and(
        eq(dbSchema.custom_columns.company_id, sheet.company_id),
        drizzleSql`(${dbSchema.custom_columns.sheet_id} = ${sheetId} OR ${dbSchema.custom_columns.sheet_id} IS NULL)`
      ))
      .orderBy(dbSchema.custom_columns.order_index);
    
    return result.map(this.mapCustomColumn);
  }

  async getCustomColumnsByCompany(companyId: string): Promise<CustomColumn[]> {
    const result = await db.select().from(dbSchema.custom_columns)
      .where(and(
        eq(dbSchema.custom_columns.company_id, companyId),
        isNull(dbSchema.custom_columns.sheet_id)
      ))
      .orderBy(dbSchema.custom_columns.order_index);
    return result.map(this.mapCustomColumn);
  }

  async getCompanyColumns(companyId: string): Promise<CustomColumn[]> {
    return this.getCustomColumnsByCompany(companyId);
  }

  async getCustomColumnById(id: string): Promise<CustomColumn | undefined> {
    const result = await db.select().from(dbSchema.custom_columns).where(eq(dbSchema.custom_columns.id, id));
    if (result.length === 0) return undefined;
    return this.mapCustomColumn(result[0]);
  }

  async createCustomColumn(column: InsertCustomColumn): Promise<CustomColumn> {
    const id = randomUUID();
    const now = new Date();
    const newColumn = {
      id,
      ...column,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.custom_columns).values(newColumn);
    return this.mapCustomColumn(newColumn as any);
  }

  async updateCustomColumn(id: string, updates: Partial<CustomColumn>): Promise<CustomColumn | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.custom_columns).set(convertedUpdates).where(eq(dbSchema.custom_columns.id, id));
    return this.getCustomColumnById(id);
  }

  async deleteCustomColumn(id: string): Promise<boolean> {
    await db.delete(dbSchema.custom_columns).where(eq(dbSchema.custom_columns.id, id));
    return true;
  }

  // Validation Rules (Company-scoped Conditional Validations)
  async getValidationRules(companyId: string, sheetId?: string | null): Promise<ValidationRule[]> {
    if (sheetId === undefined) {
      // Get all rules for company
      const result = await db.select().from(dbSchema.validation_rules).where(eq(dbSchema.validation_rules.company_id, companyId));
      return result.map(this.mapValidationRule);
    } else {
      // Get rules for specific sheet or company-wide rules
      const result = await db.select().from(dbSchema.validation_rules).where(and(
        eq(dbSchema.validation_rules.company_id, companyId),
        or(
          eq(dbSchema.validation_rules.sheet_id, sheetId),
          isNull(dbSchema.validation_rules.sheet_id)
        )
      ));
      return result.map(this.mapValidationRule);
    }
  }

  async getValidationRuleById(id: string): Promise<ValidationRule | undefined> {
    const result = await db.select().from(dbSchema.validation_rules).where(eq(dbSchema.validation_rules.id, id));
    if (result.length === 0) return undefined;
    return this.mapValidationRule(result[0]);
  }

  async createValidationRule(rule: InsertValidationRule): Promise<ValidationRule> {
    const id = randomUUID();
    const now = new Date();
    const newRule = {
      id,
      ...rule,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.validation_rules).values(newRule);
    return this.mapValidationRule(newRule as any);
  }

  async updateValidationRule(id: string, updates: Partial<ValidationRule>): Promise<ValidationRule | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.validation_rules).set(convertedUpdates).where(eq(dbSchema.validation_rules.id, id));
    return this.getValidationRuleById(id);
  }

  async deleteValidationRule(id: string): Promise<boolean> {
    await db.delete(dbSchema.validation_rules).where(eq(dbSchema.validation_rules.id, id));
    return true;
  }

  // Audit Logs
  async getAuditLogs(): Promise<Audit[]> {
    const result = await db.select().from(dbSchema.audit_logs).orderBy(desc(dbSchema.audit_logs.created_at));
    return result.map(this.mapAudit);
  }

  async getAuditLogsByCompany(companyId: string): Promise<Audit[]> {
    const result = await db.select().from(dbSchema.audit_logs).where(eq(dbSchema.audit_logs.company_id, companyId)).orderBy(desc(dbSchema.audit_logs.created_at));
    return result.map(this.mapAudit);
  }

  async getAuditLogsByModel(model: string, modelId: string): Promise<Audit[]> {
    const result = await db.select().from(dbSchema.audit_logs).where(and(eq(dbSchema.audit_logs.model, model), eq(dbSchema.audit_logs.model_id, modelId))).orderBy(desc(dbSchema.audit_logs.created_at));
    return result.map(this.mapAudit);
  }

  async createAuditLog(audit: InsertAudit): Promise<Audit> {
    const id = randomUUID();
    const now = new Date();
    const newAudit = {
      id,
      ...audit,
      created_at: now,
    };
    await db.insert(dbSchema.audit_logs).values(newAudit);
    return this.mapAudit(newAudit as any);
  }

  // Webhook Logs
  async getWebhookLogs(): Promise<WebhookLog[]> {
    const result = await db.select().from(dbSchema.webhook_logs).orderBy(desc(dbSchema.webhook_logs.created_at));
    return result.map(this.mapWebhookLog);
  }

  async getWebhookLogsByCompany(companyId: string): Promise<WebhookLog[]> {
    const result = await db.select().from(dbSchema.webhook_logs).where(eq(dbSchema.webhook_logs.company_id, companyId)).orderBy(desc(dbSchema.webhook_logs.created_at));
    return result.map(this.mapWebhookLog);
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const id = randomUUID();
    const now = new Date();
    const newLog = {
      id,
      ...log,
      created_at: now,
    };
    await db.insert(dbSchema.webhook_logs).values(newLog);
    return this.mapWebhookLog(newLog as any);
  }

  // Lead Updates
  async getLeadUpdates(leadId: string): Promise<LeadUpdate[]> {
    const result = await db
      .select({
        lead_update: dbSchema.lead_updates,
        user: {
          name: dbSchema.users.name,
        },
      })
      .from(dbSchema.lead_updates)
      .leftJoin(dbSchema.users, eq(dbSchema.lead_updates.created_by_user_id, dbSchema.users.id))
      .where(eq(dbSchema.lead_updates.lead_id, leadId))
      .orderBy(desc(dbSchema.lead_updates.created_at));
    
    return result.map((row) => ({
      ...this.mapLeadUpdate(row.lead_update),
      created_by_first_name: row.user?.name || null,
    })) as any;
  }

  async createLeadUpdate(update: InsertLeadUpdate): Promise<LeadUpdate> {
    const id = randomUUID();
    const now = new Date();
    const newUpdate = {
      id,
      ...update,
      created_at: now,
    };
    await db.insert(dbSchema.lead_updates).values(newUpdate);
    return this.mapLeadUpdate(newUpdate as any);
  }

  async updateLeadUpdate(id: string, updates: Partial<LeadUpdate>): Promise<LeadUpdate | undefined> {
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.lead_updates).set(convertedUpdates).where(eq(dbSchema.lead_updates.id, id));
    const result = await db.select().from(dbSchema.lead_updates).where(eq(dbSchema.lead_updates.id, id));
    if (result.length === 0) return undefined;
    return this.mapLeadUpdate(result[0]);
  }

  async deleteLeadUpdate(id: string): Promise<boolean> {
    await db.delete(dbSchema.lead_updates).where(eq(dbSchema.lead_updates.id, id));
    return true;
  }

  // Helper mapping functions to convert timestamps to ISO strings
  private mapCompany(row: any): Company {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapUser(row: any): User {
    return {
      ...row,
      last_login: row.last_login?.toISOString() || row.last_login,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapInvite(row: any): Invite {
    return {
      ...row,
      expires_at: row.expires_at?.toISOString() || row.expires_at,
      accepted_at: row.accepted_at?.toISOString() || row.accepted_at,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapSheet(row: any): Sheet {
    return {
      ...row,
      deleted_at: row.deleted_at?.toISOString() || row.deleted_at,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapSheetUser(row: any): SheetUser {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapLead(row: any): Lead {
    return {
      ...row,
      deleted_at: row.deleted_at?.toISOString() || row.deleted_at,
      deleted_by_user_id: row.deleted_by_user_id || null,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapDropdownOption(row: any): DropdownOption {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapCustomColumn(row: any): CustomColumn {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapValidationRule(row: any): ValidationRule {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapAudit(row: any): Audit {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapWebhookLog(row: any): WebhookLog {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapLeadUpdate(row: any): LeadUpdate {
    return {
      ...row,
      created_by_user_id: row.created_by_user_id || null,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  // Company Webhooks
  async getCompanyWebhook(id: string): Promise<CompanyWebhook | undefined> {
    const result = await db.select().from(dbSchema.company_webhooks).where(eq(dbSchema.company_webhooks.id, id));
    if (result.length === 0) return undefined;
    return this.mapCompanyWebhook(result[0]);
  }

  async getCompanyWebhookByToken(token: string): Promise<CompanyWebhook | undefined> {
    const result = await db.select().from(dbSchema.company_webhooks).where(eq(dbSchema.company_webhooks.token, token));
    if (result.length === 0) return undefined;
    return this.mapCompanyWebhook(result[0]);
  }

  async getCompanyWebhooksByCompanyId(companyId: string): Promise<CompanyWebhook[]> {
    const result = await db.select().from(dbSchema.company_webhooks).where(eq(dbSchema.company_webhooks.company_id, companyId));
    return result.map(this.mapCompanyWebhook.bind(this));
  }

  async createCompanyWebhook(webhook: InsertCompanyWebhook): Promise<CompanyWebhook> {
    const id = randomUUID();
    const now = new Date();
    const newWebhook = {
      id,
      ...webhook,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.company_webhooks).values(newWebhook);
    return this.mapCompanyWebhook(newWebhook as any);
  }

  async updateCompanyWebhook(id: string, updates: Partial<CompanyWebhook>): Promise<CompanyWebhook | undefined> {
    const now = new Date();
    const convertedUpdates: any = { ...updates, updated_at: now };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    await db.update(dbSchema.company_webhooks).set(convertedUpdates).where(eq(dbSchema.company_webhooks.id, id));
    const result = await db.select().from(dbSchema.company_webhooks).where(eq(dbSchema.company_webhooks.id, id));
    if (result.length === 0) return undefined;
    return this.mapCompanyWebhook(result[0]);
  }

  async deleteCompanyWebhook(id: string): Promise<boolean> {
    await db.delete(dbSchema.company_webhooks).where(eq(dbSchema.company_webhooks.id, id));
    return true;
  }

  // Webhook Field Mappings
  async getWebhookFieldMappings(webhookId: string): Promise<WebhookFieldMapping[]> {
    const result = await db.select().from(dbSchema.webhook_field_mappings).where(eq(dbSchema.webhook_field_mappings.webhook_id, webhookId));
    return result.map(this.mapWebhookFieldMapping.bind(this));
  }

  async createWebhookFieldMapping(mapping: InsertWebhookFieldMapping): Promise<WebhookFieldMapping> {
    const id = randomUUID();
    const now = new Date();
    const newMapping = {
      id,
      ...mapping,
      created_at: now,
    };
    await db.insert(dbSchema.webhook_field_mappings).values(newMapping);
    return this.mapWebhookFieldMapping(newMapping as any);
  }

  async deleteWebhookFieldMappingsByWebhookId(webhookId: string): Promise<boolean> {
    await db.delete(dbSchema.webhook_field_mappings).where(eq(dbSchema.webhook_field_mappings.webhook_id, webhookId));
    return true;
  }

  // Webhook Allocation Rules
  async getWebhookAllocationRules(webhookId: string): Promise<WebhookAllocationRule[]> {
    const result = await db.select().from(dbSchema.webhook_allocation_rules).where(eq(dbSchema.webhook_allocation_rules.webhook_id, webhookId));
    return result.map(this.mapWebhookAllocationRule.bind(this));
  }

  async createWebhookAllocationRule(rule: InsertWebhookAllocationRule): Promise<WebhookAllocationRule> {
    const id = randomUUID();
    const now = new Date();
    const newRule = {
      id,
      ...rule,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.webhook_allocation_rules).values(newRule);
    return this.mapWebhookAllocationRule(newRule as any);
  }

  async deleteWebhookAllocationRulesByWebhookId(webhookId: string): Promise<boolean> {
    await db.delete(dbSchema.webhook_allocation_rules).where(eq(dbSchema.webhook_allocation_rules.webhook_id, webhookId));
    return true;
  }

  // Webhook Requests
  async getWebhookRequests(webhookId: string): Promise<WebhookRequest[]> {
    const result = await db.select().from(dbSchema.webhook_requests).where(eq(dbSchema.webhook_requests.webhook_id, webhookId)).orderBy(desc(dbSchema.webhook_requests.created_at));
    return result.map(this.mapWebhookRequest.bind(this));
  }

  async getWebhookRequestsByCompanyId(companyId: string): Promise<WebhookRequest[]> {
    const result = await db
      .select({ request: dbSchema.webhook_requests })
      .from(dbSchema.webhook_requests)
      .innerJoin(dbSchema.company_webhooks, eq(dbSchema.webhook_requests.webhook_id, dbSchema.company_webhooks.id))
      .where(eq(dbSchema.company_webhooks.company_id, companyId))
      .orderBy(desc(dbSchema.webhook_requests.created_at));
    return result.map((row) => this.mapWebhookRequest(row.request));
  }

  async createWebhookRequest(request: InsertWebhookRequest): Promise<WebhookRequest> {
    const id = randomUUID();
    const now = new Date();
    const newRequest = {
      id,
      ...request,
      created_at: now,
    };
    await db.insert(dbSchema.webhook_requests).values(newRequest);
    return this.mapWebhookRequest(newRequest as any);
  }

  // Mapping functions for webhook entities
  private mapCompanyWebhook(row: any): CompanyWebhook {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapWebhookFieldMapping(row: any): WebhookFieldMapping {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  private mapWebhookAllocationRule(row: any): WebhookAllocationRule {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapWebhookRequest(row: any): WebhookRequest {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }
}

// Use PostgreSQL storage if DATABASE_URL is available, otherwise use in-memory
export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();
