import { randomUUID } from "crypto";
import type {
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Sheets
  getSheet(id: string): Promise<Sheet | undefined>;
  getSheetsByUserId(userId: string): Promise<Sheet[]>;
  getAllSheets(): Promise<Sheet[]>;
  createSheet(sheet: InsertSheet): Promise<Sheet>;
  updateSheet(id: string, updates: Partial<Sheet>): Promise<Sheet | undefined>;
  deleteSheet(id: string): Promise<boolean>;

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

  // Dropdown Options
  getDropdownOptions(sheetId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByColumn(sheetId: string, columnKey: string): Promise<DropdownOption[]>;
  createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption>;
  updateDropdownOption(id: string, updates: Partial<DropdownOption>): Promise<DropdownOption | undefined>;
  deleteDropdownOption(id: string): Promise<boolean>;

  // Custom Columns
  getCustomColumns(sheetId: string): Promise<CustomColumn[]>;
  createCustomColumn(column: InsertCustomColumn): Promise<CustomColumn>;
  updateCustomColumn(id: string, updates: Partial<CustomColumn>): Promise<CustomColumn | undefined>;
  deleteCustomColumn(id: string): Promise<boolean>;

  // Audit Logs
  getAuditLogs(): Promise<Audit[]>;
  getAuditLogsByModel(model: string, modelId: string): Promise<Audit[]>;
  createAuditLog(audit: InsertAudit): Promise<Audit>;

  // Webhook Logs
  getWebhookLogs(): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sheets: Map<string, Sheet>;
  private sheetUsers: Map<string, SheetUser>;
  private leads: Map<string, Lead>;
  private dropdownOptions: Map<string, DropdownOption>;
  private customColumns: Map<string, CustomColumn>;
  private auditLogs: Map<string, Audit>;
  private webhookLogs: Map<string, WebhookLog>;

  constructor() {
    this.users = new Map();
    this.sheets = new Map();
    this.sheetUsers = new Map();
    this.leads = new Map();
    this.dropdownOptions = new Map();
    this.customColumns = new Map();
    this.auditLogs = new Map();
    this.webhookLogs = new Map();
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      created_at: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
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
    const userSheets = Array.from(this.sheetUsers.values()).filter(
      (su) => su.user_id === userId
    );
    return userSheets
      .map((su) => this.sheets.get(su.sheet_id))
      .filter((s): s is Sheet => s !== undefined);
  }

  async getAllSheets(): Promise<Sheet[]> {
    return Array.from(this.sheets.values());
  }

  async createSheet(insertSheet: InsertSheet): Promise<Sheet> {
    const id = randomUUID();
    const sheet: Sheet = {
      ...insertSheet,
      id,
      created_at: new Date().toISOString(),
    };
    this.sheets.set(id, sheet);
    return sheet;
  }

  async updateSheet(id: string, updates: Partial<Sheet>): Promise<Sheet | undefined> {
    const sheet = this.sheets.get(id);
    if (!sheet) return undefined;
    const updated = { ...sheet, ...updates };
    this.sheets.set(id, updated);
    return updated;
  }

  async deleteSheet(id: string): Promise<boolean> {
    return this.sheets.delete(id);
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

  // Dropdown Options
  async getDropdownOptions(sheetId: string): Promise<DropdownOption[]> {
    return Array.from(this.dropdownOptions.values()).filter(
      (opt) => opt.sheet_id === sheetId || opt.sheet_id === null
    );
  }

  async getDropdownOptionsByColumn(sheetId: string, columnKey: string): Promise<DropdownOption[]> {
    return Array.from(this.dropdownOptions.values()).filter(
      (opt) => opt.column_key === columnKey && (opt.sheet_id === sheetId || opt.sheet_id === null)
    );
  }

  async createDropdownOption(insertOption: InsertDropdownOption): Promise<DropdownOption> {
    const id = randomUUID();
    const option: DropdownOption = {
      ...insertOption,
      id,
      sheet_id: insertOption.sheet_id || null,
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

  // Custom Columns
  async getCustomColumns(sheetId: string): Promise<CustomColumn[]> {
    return Array.from(this.customColumns.values()).filter((col) => col.sheet_id === sheetId);
  }

  async createCustomColumn(insertColumn: InsertCustomColumn): Promise<CustomColumn> {
    const id = randomUUID();
    const column: CustomColumn = {
      ...insertColumn,
      id,
      created_at: new Date().toISOString(),
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
    const updated = { ...column, ...updates };
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

  async getAuditLogsByModel(model: string, modelId: string): Promise<Audit[]> {
    return Array.from(this.auditLogs.values())
      .filter((log) => log.model === model && log.model_id === modelId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createAuditLog(insertAudit: InsertAudit): Promise<Audit> {
    const id = randomUUID();
    const audit: Audit = {
      ...insertAudit,
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

  async createWebhookLog(insertLog: InsertWebhookLog): Promise<WebhookLog> {
    const id = randomUUID();
    const log: WebhookLog = {
      ...insertLog,
      id,
      created_at: new Date().toISOString(),
    };
    this.webhookLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
