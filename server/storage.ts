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
  Audit,
  InsertAudit,
  WebhookLog,
  InsertWebhookLog,
  LeadUpdate,
  InsertLeadUpdate,
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
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  deleteLeads(ids: string[]): Promise<number>;

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
}

export class MemStorage implements IStorage {
  private companies: Map<string, Company>;
  private users: Map<string, User>;
  private sheets: Map<string, Sheet>;
  private sheetUsers: Map<string, SheetUser>;
  private leads: Map<string, Lead>;
  private dropdownOptions: Map<string, DropdownOption>;
  private customColumns: Map<string, CustomColumn>;
  private auditLogs: Map<string, Audit>;
  private webhookLogs: Map<string, WebhookLog>;
  private leadUpdates: Map<string, LeadUpdate>;

  constructor() {
    this.companies = new Map();
    this.users = new Map();
    this.sheets = new Map();
    this.sheetUsers = new Map();
    this.leads = new Map();
    this.dropdownOptions = new Map();
    this.customColumns = new Map();
    this.auditLogs = new Map();
    this.webhookLogs = new Map();
    this.leadUpdates = new Map();
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
    return Array.from(this.leads.values()).filter((lead) => lead.sheet_id === sheetId);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const lead: Lead = {
      id,
      sheet_id: insertLead.sheet_id,
      owner_user_id: insertLead.owner_user_id || "",
      lead_date: insertLead.lead_date || null,
      lead_time: insertLead.lead_time || null,
      executive: insertLead.executive || null,
      lang: insertLead.lang || null,
      address: insertLead.address || null,
      name: insertLead.name || null,
      mobile_no: insertLead.mobile_no || null,
      whatsapp: insertLead.whatsapp || null,
      occupation: insertLead.occupation || null,
      qualification: insertLead.qualification || null,
      age: insertLead.age || null,
      exam_end: insertLead.exam_end || null,
      exam_mark: insertLead.exam_mark || null,
      lead_status: insertLead.lead_status || null,
      visit_status: insertLead.visit_status || null,
      visit_date: insertLead.visit_date || null,
      nfdt: insertLead.nfdt || null,
      call_1: insertLead.call_1 || null,
      feedback_1: insertLead.feedback_1 || null,
      lead_category: insertLead.lead_category || "cold",
      custom_fields: insertLead.custom_fields || {},
      meta: insertLead.meta || {},
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

  async deleteLead(id: string): Promise<boolean> {
    return this.leads.delete(id);
  }

  async deleteLeads(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (this.leads.delete(id)) count++;
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
}

export const storage = new MemStorage();
