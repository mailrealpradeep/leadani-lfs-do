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
  HighlightingRule,
  InsertHighlightingRule,
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
  Report,
  InsertReport,
  UserColumnPreference,
  PushSubscription,
  InsertPushSubscription,
  AttendanceEntry,
  AttendanceEntryRecord,
  InsertAttendanceEntry,
  AttendanceRule,
  AttendanceRuleRecord,
  InsertAttendanceRule,
  Task,
  TaskRecord,
  InsertTask,
  TaskLead,
  TaskLeadRecord,
  InsertTaskLead,
  TaskUpdate,
  TaskUpdateRecord,
  InsertTaskUpdate,
  UserSheetView,
  UserSheetViewRecord,
  OutgoingWebhook,
  InsertOutgoingWebhook,
  OutgoingWebhookLog,
  InsertOutgoingWebhookLog,
  CallSessionRecord,
  InsertCallSession,
  LeadPhoneIndexRecord,
  InsertLeadPhoneIndex,
  MobileLeadLookupResult,
  CompanySearchResult,
  ApiKeyRecord,
  InsertApiKey,
  ActivityLogRecord,
  InsertActivityLog,
  ActivityLogFilters,
  ActivityLogResponse,
  ActivityLogStats,
  ActivityLog,
  // Target Management System
  TargetRecord,
  InsertTarget,
  TargetGoalRecord,
  InsertTargetGoal,
  TargetGoalConfig,
  TargetUserAssignmentRecord,
  InsertTargetUserAssignment,
  TargetUserProgressRecord,
  InsertTargetUserProgress,
  CompanyHolidayRecord,
  InsertCompanyHoliday,
  TargetNotificationRecord,
  InsertTargetNotification,
  TargetWithDetails,
  UserTargetProgress,
  LeaderboardEntry,
  TargetFilters,
  // Backup System
  BackupConfigRecord,
  InsertBackupConfig,
  BackupSyncLogRecord,
  InsertBackupSyncLog,
  RestoreLogRecord,
  InsertRestoreLog,
  // User Row Filters
  UserRowFilterRecord,
  InsertUserRowFilter,
  UserFilterToggleState,
  InsertUserFilterToggleState,
  // Sheet Snapshots
  SheetSnapshotRecord,
  InsertSheetSnapshot,
  SnapshotRestoreLogRecord,
  InsertSnapshotRestoreLog,
  // Saved Reports
  SavedReport,
  SavedReportRecord,
  InsertSavedReport,
  SavedReportConfig,
  // Company KPIs (New Simplified Target System)
  CompanyKpi,
  CompanyKpiRecord,
  InsertCompanyKpi,
  KpiConfig,
  KpiMetricType,
  // Simple Targets
  SimpleTarget,
  SimpleTargetRecord,
  InsertSimpleTarget,
  SimpleTargetPeriodType,
  SimpleTargetProgress,
  SimpleTargetProgressRecord,
  InsertSimpleTargetProgress,
  // Working Targets
  WorkingTarget,
  WorkingTargetRecord,
  InsertWorkingTarget,
  WorkingTargetConfig,
  WorkingTargetResult,
  WorkingTargetResultRecord,
  InsertWorkingTargetResult,
  // Attendance Exit Conditions
  AttendanceExitCondition,
  AttendanceExitConditionRecord,
  InsertAttendanceExitCondition,
  AttendanceExitScopeType,
  // Transition Explanation Rules
  TransitionExplanationRule,
  TransitionExplanationRuleRecord,
  InsertTransitionExplanationRule,
  transition_explanation_rules,
  // Future Improvements
  FutureImprovement,
  FutureImprovementRecord,
  InsertFutureImprovement,
  future_improvements,
  // Hot Lead Configuration
  HotLeadConfig,
  HotLeadConfigRecord,
  InsertHotLeadConfig,
  hot_lead_config,
  // Custom Views
  CustomView,
  CustomViewRecord,
  InsertCustomView,
  custom_views,
  CustomViewConditionGroup,
  // System Value Definitions
  SystemValueDefinition,
  InsertSystemValueDefinition,
  SystemColumnType,
} from "@shared/schema";

// Pagination result interface
export interface PaginatedLeadsResult {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuickFilterCondition {
  column_key: string;
  operator: string;
  value?: any;
  relative_date?: string;
}

export interface QuickFilterConfig {
  conditions: QuickFilterCondition[];
  logical_operator: 'and' | 'or';
}

export interface LeadsQueryOptions {
  sheetIds: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  quickFilter?: QuickFilterConfig;
  companyTimezone?: string;
}

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
  updateUserPassword(id: string, passwordHash: string): Promise<boolean>;
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
  getLeadsBySheetIds(options: LeadsQueryOptions): Promise<PaginatedLeadsResult>;
  getDeletedLeadsBySheetId(sheetId: string): Promise<Lead[]>;
  findLeadByMobileNo(companyId: string, mobileNo: string, fieldName?: string, includeDeleted?: boolean): Promise<Lead | undefined>;
  findLeadByField(companyId: string, fieldKey: string, fieldValue: string, includeDeleted?: boolean): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  markLeadAttended(leadId: string, userId: string): Promise<boolean>;
  deleteLead(id: string, userId: string): Promise<boolean>;
  deleteLeads(ids: string[], userId: string): Promise<number>;
  restoreLead(id: string): Promise<boolean>;
  restoreLeads(ids: string[]): Promise<number>;
  cleanupOldDeletedLeads(): Promise<number>;

  // Dropdown Options (Company-scoped)
  getDropdownOptions(sheetId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByCompany(companyId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByColumn(companyId: string, columnKey: string): Promise<DropdownOption[]>;
  getDropdownOptionById(id: string): Promise<DropdownOption | undefined>;
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

  // Highlighting Rules (Row Highlighting based on Conditions)
  getHighlightingRules(sheetId: string): Promise<HighlightingRule[]>;
  getHighlightingRuleById(id: string): Promise<HighlightingRule | undefined>;
  createHighlightingRule(rule: InsertHighlightingRule): Promise<HighlightingRule>;
  updateHighlightingRule(id: string, updates: Partial<HighlightingRule>): Promise<HighlightingRule | undefined>;
  deleteHighlightingRule(id: string): Promise<boolean>;
  reorderHighlightingRules(sheetId: string, ruleIds: string[]): Promise<boolean>;
  getGlobalHighlightingRules(companyId: string): Promise<HighlightingRule[]>;
  reorderGlobalHighlightingRules(companyId: string, ruleIds: string[]): Promise<boolean>;

  // Hot Lead Configuration (Company-wide Hot Lead Criteria)
  getHotLeadConfig(companyId: string): Promise<HotLeadConfig | undefined>;
  createHotLeadConfig(config: InsertHotLeadConfig): Promise<HotLeadConfig>;
  updateHotLeadConfig(id: string, updates: Partial<HotLeadConfig>): Promise<HotLeadConfig | undefined>;

  // Custom Views (Industry-specific sidebar menu items with filtered leads)
  getCustomViews(companyId: string): Promise<CustomView[]>;
  getCustomViewById(id: string): Promise<CustomView | undefined>;
  createCustomView(view: InsertCustomView): Promise<CustomView>;
  updateCustomView(id: string, updates: Partial<CustomView>): Promise<CustomView | undefined>;
  deleteCustomView(id: string): Promise<boolean>;
  reorderCustomViews(companyId: string, viewIds: string[]): Promise<boolean>;

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
  getLeadUpdatesBySheetId(sheetId: string): Promise<LeadUpdate[]>;
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
  getWebhookRequest(id: string): Promise<WebhookRequest | undefined>;
  createWebhookRequest(request: InsertWebhookRequest): Promise<WebhookRequest>;
  updateWebhookRequest(id: string, updates: Partial<WebhookRequest>): Promise<WebhookRequest | undefined>;

  // Outgoing Webhooks
  getOutgoingWebhook(id: string): Promise<OutgoingWebhook | undefined>;
  getOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]>;
  getActiveOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]>;
  createOutgoingWebhook(webhook: InsertOutgoingWebhook): Promise<OutgoingWebhook>;
  updateOutgoingWebhook(id: string, updates: Partial<OutgoingWebhook>): Promise<OutgoingWebhook | undefined>;
  deleteOutgoingWebhook(id: string): Promise<boolean>;

  // Outgoing Webhook Logs
  getOutgoingWebhookLogs(webhookId: string, limit?: number): Promise<OutgoingWebhookLog[]>;
  getOutgoingWebhookLogsByCompanyId(companyId: string, limit?: number): Promise<OutgoingWebhookLog[]>;
  createOutgoingWebhookLog(log: InsertOutgoingWebhookLog): Promise<OutgoingWebhookLog>;

  // Lead Search for Webhook Matching
  findLeadsByFieldValue(companyId: string, fieldKey: string, value: string): Promise<Lead[]>;

  // Reports
  getReport(id: string): Promise<Report | undefined>;
  getReportsByCompanyId(companyId: string): Promise<Report[]>;
  getReportsBySheetIds(sheetIds: string[]): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined>;
  deleteReport(id: string): Promise<boolean>;

  // User Column Preferences
  getUserColumnPreferences(userId: string, sheetId: string): Promise<UserColumnPreference[]>;
  saveUserColumnPreferences(userId: string, sheetId: string, preferences: Array<{column_key: string, width: number}>): Promise<void>;

  // Push Subscriptions
  getPushSubscription(userId: string, endpoint: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  getPushSubscriptionsByCompanyId(companyId: string): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  deletePushSubscriptionsByUserId(userId: string): Promise<boolean>;

  // Attendance Entries
  getAttendanceEntry(id: string): Promise<AttendanceEntryRecord | undefined>;
  getTodayAttendanceEntry(userId: string): Promise<AttendanceEntryRecord | undefined>;
  getAttendanceEntriesByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]>;
  getAttendanceEntriesByCompanyId(companyId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]>;
  getPendingForceExitsByCompanyId(companyId: string): Promise<AttendanceEntryRecord[]>;
  createAttendanceEntry(entry: InsertAttendanceEntry): Promise<AttendanceEntryRecord>;
  updateAttendanceEntry(id: string, updates: Partial<AttendanceEntryRecord>): Promise<AttendanceEntryRecord | undefined>;
  deleteAttendanceEntry(id: string): Promise<boolean>;
  cleanupOldSelfieUrls(daysOld: number): Promise<number>;

  // Attendance Rules
  getAttendanceRule(id: string): Promise<AttendanceRuleRecord | undefined>;
  getAttendanceRulesByCompanyId(companyId: string): Promise<AttendanceRuleRecord[]>;
  createAttendanceRule(rule: InsertAttendanceRule): Promise<AttendanceRuleRecord>;
  updateAttendanceRule(id: string, updates: Partial<AttendanceRuleRecord>): Promise<AttendanceRuleRecord | undefined>;
  deleteAttendanceRule(id: string): Promise<boolean>;

  // Tasks
  getTask(id: string): Promise<TaskRecord | undefined>;
  getTasksByCompanyId(companyId: string, options?: { status?: string[]; assignedTo?: string; includeCompleted?: boolean }): Promise<TaskRecord[]>;
  getTasksByUserId(userId: string, options?: { status?: string[]; includeCompleted?: boolean }): Promise<TaskRecord[]>;
  getOverdueAndTodayTasks(companyId: string): Promise<TaskRecord[]>;
  createTask(task: InsertTask): Promise<TaskRecord>;
  updateTask(id: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Task Leads (linking tasks to leads)
  getTaskLeads(taskId: string): Promise<TaskLeadRecord[]>;
  addTaskLead(taskLead: InsertTaskLead): Promise<TaskLeadRecord>;
  removeTaskLead(taskId: string, leadId: string): Promise<boolean>;
  removeAllTaskLeads(taskId: string): Promise<boolean>;

  // Task Updates (activity history)
  getTaskUpdates(taskId: string): Promise<TaskUpdateRecord[]>;
  createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdateRecord>;

  // User Sheet Views (Personal Column Preferences)
  getUserSheetView(userId: string, sheetId: string): Promise<UserSheetViewRecord | undefined>;
  upsertUserSheetView(userId: string, sheetId: string, columnOrder: string[], hiddenColumns: string[]): Promise<UserSheetViewRecord>;

  // Mobile Call Integration - Call Sessions
  getCallSession(id: string): Promise<CallSessionRecord | undefined>;
  getCallSessionsByUserId(userId: string, limit?: number): Promise<CallSessionRecord[]>;
  getCallSessionsByLeadId(leadId: string, limit?: number): Promise<CallSessionRecord[]>;
  getCallSessionsByCompanyId(companyId: string, limit?: number): Promise<CallSessionRecord[]>;
  createCallSession(session: InsertCallSession): Promise<CallSessionRecord>;
  updateCallSession(id: string, updates: Partial<CallSessionRecord>): Promise<CallSessionRecord | undefined>;
  deleteCallSession(id: string): Promise<boolean>;

  // Mobile Call Integration - Lead Phone Index
  getLeadPhoneIndex(id: string): Promise<LeadPhoneIndexRecord | undefined>;
  findLeadsByPhone(companyId: string, normalizedPhone: string): Promise<LeadPhoneIndexRecord[]>;
  getPhoneIndexByLeadId(leadId: string): Promise<LeadPhoneIndexRecord[]>;
  createLeadPhoneIndex(entry: InsertLeadPhoneIndex): Promise<LeadPhoneIndexRecord>;
  deleteLeadPhoneIndexByLeadId(leadId: string): Promise<boolean>;
  syncLeadPhoneIndex(leadId: string, sheetId: string, companyId: string, phoneNumbers: Array<{phone: string; type: string; isPrimary: boolean}>): Promise<void>;

  // Mobile Call Integration - Enhanced lookups
  lookupLeadsByPhone(companyId: string, phone: string): Promise<MobileLeadLookupResult[]>;
  
  // Company-wide search for leads across all sheets (respects sheet access permissions)
  searchCompanyLeads(companyId: string, query: string, limit?: number, requestingUserId?: string, requestingUserRole?: string): Promise<CompanySearchResult[]>;

  // API Keys Management
  getApiKey(id: string): Promise<ApiKeyRecord | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | undefined>;
  getApiKeysByCompanyId(companyId: string): Promise<ApiKeyRecord[]>;
  getAllApiKeys(): Promise<ApiKeyRecord[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKeyRecord>;
  revokeApiKey(id: string): Promise<ApiKeyRecord | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  findApiKeyByPrefix(prefix: string): Promise<ApiKeyRecord | undefined>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLogRecord>;
  getActivityLogs(filters: ActivityLogFilters): Promise<ActivityLogResponse>;
  getActivityLogStats(companyId: string, sheetId?: string, dateFrom?: string, dateTo?: string): Promise<ActivityLogStats>;

  // =========================================================================
  // TARGET MANAGEMENT SYSTEM
  // =========================================================================
  
  // Targets
  getTarget(id: string): Promise<TargetRecord | undefined>;
  getTargetsByCompanyId(companyId: string, filters?: TargetFilters): Promise<TargetRecord[]>;
  getTargetWithDetails(id: string): Promise<TargetWithDetails | undefined>;
  createTarget(target: InsertTarget): Promise<TargetRecord>;
  updateTarget(id: string, updates: Partial<TargetRecord>): Promise<TargetRecord | undefined>;
  deleteTarget(id: string): Promise<boolean>;

  // Target Goals
  getTargetGoals(targetId: string): Promise<TargetGoalRecord[]>;
  createTargetGoal(goal: InsertTargetGoal): Promise<TargetGoalRecord>;
  updateTargetGoal(id: string, updates: Partial<TargetGoalRecord>): Promise<TargetGoalRecord | undefined>;
  deleteTargetGoal(id: string): Promise<boolean>;
  deleteTargetGoalsByTargetId(targetId: string): Promise<number>;

  // Target User Assignments
  getTargetUserAssignments(targetId: string): Promise<TargetUserAssignmentRecord[]>;
  createTargetUserAssignment(assignment: InsertTargetUserAssignment): Promise<TargetUserAssignmentRecord>;
  deleteTargetUserAssignment(id: string): Promise<boolean>;
  deleteTargetUserAssignmentsByTargetId(targetId: string): Promise<number>;
  getTargetsForUser(userId: string, status?: string | string[]): Promise<TargetRecord[]>;

  // Target User Progress
  getTargetUserProgress(targetId: string, userId?: string): Promise<TargetUserProgressRecord[]>;
  getUserProgressForGoal(goalId: string, userId: string, periodStart: Date): Promise<TargetUserProgressRecord | undefined>;
  createTargetUserProgress(progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord>;
  updateTargetUserProgress(id: string, updates: Partial<TargetUserProgressRecord>): Promise<TargetUserProgressRecord | undefined>;
  upsertTargetUserProgress(progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord>;

  // Company Holidays
  getCompanyHolidays(companyId: string, startDate?: Date, endDate?: Date): Promise<CompanyHolidayRecord[]>;
  createCompanyHoliday(holiday: InsertCompanyHoliday): Promise<CompanyHolidayRecord>;
  deleteCompanyHoliday(id: string): Promise<boolean>;

  // Target Notifications
  getTargetNotifications(userId: string, unreadOnly?: boolean): Promise<TargetNotificationRecord[]>;
  createTargetNotification(notification: InsertTargetNotification): Promise<TargetNotificationRecord>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markNotificationAsDismissed(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<number>;

  // Leaderboard
  getLeaderboard(companyId: string, period?: { start: Date; end: Date }): Promise<LeaderboardEntry[]>;

  // =========================================================================
  // BACKUP SYSTEM (Google Sheets)
  // =========================================================================
  
  // Backup Configs
  getBackupConfig(id: string): Promise<BackupConfigRecord | undefined>;
  getBackupConfigBySheetId(sheetId: string): Promise<BackupConfigRecord | undefined>;
  getBackupConfigsByCompanyId(companyId: string): Promise<BackupConfigRecord[]>;
  getEnabledBackupConfigs(): Promise<BackupConfigRecord[]>;
  createBackupConfig(config: InsertBackupConfig): Promise<BackupConfigRecord>;
  updateBackupConfig(id: string, updates: Partial<BackupConfigRecord>): Promise<BackupConfigRecord | undefined>;
  deleteBackupConfig(id: string): Promise<boolean>;

  // Backup Sync Logs
  getBackupSyncLogs(backupConfigId: string, limit?: number): Promise<BackupSyncLogRecord[]>;
  createBackupSyncLog(log: InsertBackupSyncLog): Promise<BackupSyncLogRecord>;
  updateBackupSyncLog(id: string, updates: Partial<BackupSyncLogRecord>): Promise<BackupSyncLogRecord | undefined>;

  // Restore Logs
  getRestoreLogs(companyId: string, sheetId?: string): Promise<RestoreLogRecord[]>;
  createRestoreLog(log: InsertRestoreLog): Promise<RestoreLogRecord>;

  // =========================================================================
  // USER ROW FILTERS (Hide/Show Rows)
  // =========================================================================
  
  getUserRowFilter(id: string): Promise<UserRowFilterRecord | undefined>;
  getUserRowFiltersByUserAndSheet(userId: string, sheetId: string): Promise<UserRowFilterRecord[]>;
  createUserRowFilter(filter: InsertUserRowFilter): Promise<UserRowFilterRecord>;
  updateUserRowFilter(id: string, updates: Partial<UserRowFilterRecord>): Promise<UserRowFilterRecord | undefined>;
  deleteUserRowFilter(id: string): Promise<boolean>;
  toggleUserRowFilter(id: string, isActive: boolean): Promise<UserRowFilterRecord | undefined>;
  
  // User Filter Toggle States (per-user preferences for global filters)
  getUserFilterToggleState(userId: string, filterId: string): Promise<UserFilterToggleState | undefined>;
  getUserFilterToggleStates(userId: string): Promise<UserFilterToggleState[]>;
  upsertUserFilterToggleState(userId: string, filterId: string, isActive: boolean): Promise<UserFilterToggleState>;
  deleteUserFilterToggleState(userId: string, filterId: string): Promise<boolean>;

  // =========================================================================
  // SHEET SNAPSHOTS (Point-in-Time Recovery)
  // =========================================================================
  
  getSheetSnapshot(id: string): Promise<SheetSnapshotRecord | undefined>;
  getSheetSnapshotsBySheet(sheetId: string, limit?: number): Promise<SheetSnapshotRecord[]>;
  getSheetSnapshotsByCompany(companyId: string, limit?: number): Promise<SheetSnapshotRecord[]>;
  getAllSheetSnapshots(limit?: number): Promise<SheetSnapshotRecord[]>;
  getLatestSheetSnapshot(sheetId: string): Promise<SheetSnapshotRecord | undefined>;
  createSheetSnapshot(snapshot: InsertSheetSnapshot): Promise<SheetSnapshotRecord>;
  deleteSheetSnapshot(id: string): Promise<boolean>;
  deleteOldSnapshots(olderThanDays: number): Promise<number>;
  
  // Snapshot Restore Logs
  getSnapshotRestoreLogs(companyId: string, limit?: number): Promise<SnapshotRestoreLogRecord[]>;
  createSnapshotRestoreLog(log: InsertSnapshotRestoreLog): Promise<SnapshotRestoreLogRecord>;

  // =========================================================================
  // SAVED REPORTS (Fixed Reports / Report Library)
  // =========================================================================
  
  getSavedReport(id: string): Promise<SavedReportRecord | undefined>;
  getSavedReportsByCompany(companyId: string, includeGlobal?: boolean): Promise<SavedReportRecord[]>;
  getGlobalSavedReports(): Promise<SavedReportRecord[]>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReportRecord>;
  updateSavedReport(id: string, updates: Partial<SavedReportRecord>): Promise<SavedReportRecord | undefined>;
  deleteSavedReport(id: string): Promise<boolean>;
  duplicateSavedReport(id: string, targetCompanyId: string, userId: string): Promise<SavedReportRecord | undefined>;
  incrementReportRunCount(id: string): Promise<boolean>;

  // =========================================================================
  // COMPANY KPIs (New Simplified Target System)
  // =========================================================================
  
  getCompanyKpi(id: string): Promise<CompanyKpiRecord | undefined>;
  getCompanyKpisByCompany(companyId: string): Promise<CompanyKpiRecord[]>;
  createCompanyKpi(kpi: InsertCompanyKpi): Promise<CompanyKpiRecord>;
  updateCompanyKpi(id: string, updates: Partial<CompanyKpiRecord>): Promise<CompanyKpiRecord | undefined>;
  deleteCompanyKpi(id: string): Promise<boolean>;

  // =========================================================================
  // SIMPLE TARGETS (References KPIs)
  // =========================================================================
  
  getSimpleTarget(id: string): Promise<SimpleTargetRecord | undefined>;
  getSimpleTargetsByCompany(companyId: string): Promise<SimpleTargetRecord[]>;
  getSimpleTargetsByKpi(kpiId: string): Promise<SimpleTargetRecord[]>;
  createSimpleTarget(target: InsertSimpleTarget): Promise<SimpleTargetRecord>;
  updateSimpleTarget(id: string, updates: Partial<SimpleTargetRecord>): Promise<SimpleTargetRecord | undefined>;
  deleteSimpleTarget(id: string): Promise<boolean>;

  // Simple Target Progress
  getSimpleTargetProgress(targetId: string, userId: string, periodStart: Date): Promise<SimpleTargetProgressRecord | undefined>;
  getSimpleTargetProgressByUser(userId: string): Promise<SimpleTargetProgressRecord[]>;
  getSimpleTargetProgressByTarget(targetId: string): Promise<SimpleTargetProgressRecord[]>;
  createOrUpdateSimpleTargetProgress(progress: InsertSimpleTargetProgress): Promise<SimpleTargetProgressRecord>;

  // =========================================================================
  // WORKING TARGETS (Temporary Target System)
  // =========================================================================
  
  getWorkingTarget(id: string): Promise<WorkingTargetRecord | undefined>;
  getWorkingTargetsByCompany(companyId: string): Promise<WorkingTargetRecord[]>;
  createWorkingTarget(target: InsertWorkingTarget): Promise<WorkingTargetRecord>;
  updateWorkingTarget(id: string, updates: Partial<WorkingTargetRecord>): Promise<WorkingTargetRecord | undefined>;
  deleteWorkingTarget(id: string): Promise<boolean>;

  // Working Target Results
  getWorkingTargetResult(targetId: string, userId: string, periodStart: Date): Promise<WorkingTargetResultRecord | undefined>;
  getWorkingTargetResultsByUser(userId: string, periodStart?: Date, periodEnd?: Date): Promise<WorkingTargetResultRecord[]>;
  getWorkingTargetResultsByTarget(targetId: string): Promise<WorkingTargetResultRecord[]>;
  createOrUpdateWorkingTargetResult(result: InsertWorkingTargetResult): Promise<WorkingTargetResultRecord>;

  // =========================================================================
  // ATTENDANCE EXIT CONDITIONS
  // =========================================================================
  
  getAttendanceExitCondition(id: string): Promise<AttendanceExitConditionRecord | undefined>;
  getAttendanceExitConditionsByCompany(companyId: string): Promise<AttendanceExitConditionRecord[]>;
  getActiveExitConditionsForUser(userId: string, companyId: string): Promise<AttendanceExitConditionRecord[]>;
  createAttendanceExitCondition(condition: InsertAttendanceExitCondition): Promise<AttendanceExitConditionRecord>;
  updateAttendanceExitCondition(id: string, updates: Partial<AttendanceExitConditionRecord>): Promise<AttendanceExitConditionRecord | undefined>;
  deleteAttendanceExitCondition(id: string): Promise<boolean>;

  // =========================================================================
  // TRANSITION EXPLANATION RULES
  // =========================================================================
  
  getTransitionExplanationRule(id: string): Promise<TransitionExplanationRuleRecord | undefined>;
  getTransitionExplanationRulesByCompany(companyId: string): Promise<TransitionExplanationRuleRecord[]>;
  getActiveTransitionExplanationRules(companyId: string): Promise<TransitionExplanationRuleRecord[]>;
  createTransitionExplanationRule(rule: InsertTransitionExplanationRule): Promise<TransitionExplanationRuleRecord>;
  updateTransitionExplanationRule(id: string, updates: Partial<TransitionExplanationRuleRecord>): Promise<TransitionExplanationRuleRecord | undefined>;
  deleteTransitionExplanationRule(id: string): Promise<boolean>;
  checkTransitionRequiresExplanation(companyId: string, columnKey: string, newValue: string): Promise<boolean>;

  // Future Improvements
  getFutureImprovements(): Promise<FutureImprovementRecord[]>;
  getFutureImprovement(id: string): Promise<FutureImprovementRecord | undefined>;
  createFutureImprovement(improvement: InsertFutureImprovement): Promise<FutureImprovementRecord>;
  updateFutureImprovement(id: string, updates: Partial<FutureImprovementRecord>): Promise<FutureImprovementRecord | undefined>;
  deleteFutureImprovement(id: string): Promise<boolean>;

  // =========================================================================
  // SYSTEM VALUE DEFINITIONS (Global System Column Values)
  // =========================================================================
  
  getSystemValueDefinitions(): Promise<SystemValueDefinition[]>;
  getSystemValueDefinitionsByType(columnType: SystemColumnType): Promise<SystemValueDefinition[]>;
  getSystemValueDefinition(id: string): Promise<SystemValueDefinition | undefined>;
  createSystemValueDefinition(definition: InsertSystemValueDefinition): Promise<SystemValueDefinition>;
  updateSystemValueDefinition(id: string, updates: Partial<SystemValueDefinition>): Promise<SystemValueDefinition | undefined>;
  deleteSystemValueDefinition(id: string): Promise<boolean>;

  // =========================================================================
  // RAW SQL (For migrations and administrative tasks)
  // =========================================================================
  
  executeRawQuery(query: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
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
  private reports: Map<string, Report>;
  private userColumnPreferences: Map<string, UserColumnPreference>;

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
    this.reports = new Map();
    this.userColumnPreferences = new Map();
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
      attendance_exit_target_id: null,
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

  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    const updated = { ...user, password_hash: passwordHash, updated_at: new Date().toISOString() };
    this.users.set(id, updated);
    return true;
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

  async getLeadsBySheetIds(options: LeadsQueryOptions): Promise<PaginatedLeadsResult> {
    const { sheetIds, page = 1, limit = 50, sortBy, sortOrder = 'desc', filters = {} } = options;
    const sheetIdSet = new Set(sheetIds);
    
    // Filter leads by sheet IDs and not deleted
    let filteredLeads = Array.from(this.leads.values()).filter(
      (lead) => sheetIdSet.has(lead.sheet_id) && !lead.deleted_at
    );
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null || value === undefined || value === '') continue;
          
          const leadValue = lead.custom_fields?.[key];
          if (typeof value === 'string' && typeof leadValue === 'string') {
            if (!leadValue.toLowerCase().includes(value.toLowerCase())) return false;
          } else if (leadValue !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Sort
    if (sortBy) {
      filteredLeads.sort((a, b) => {
        let aVal = sortBy === 'created_at' || sortBy === 'updated_at' 
          ? a[sortBy as keyof Lead] 
          : a.custom_fields?.[sortBy];
        let bVal = sortBy === 'created_at' || sortBy === 'updated_at' 
          ? b[sortBy as keyof Lead] 
          : b.custom_fields?.[sortBy];
        
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Default sort by created_at desc
      filteredLeads.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    const total = filteredLeads.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);
    
    return {
      leads: paginatedLeads,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getDeletedLeadsBySheetId(sheetId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter((lead) => lead.sheet_id === sheetId && lead.deleted_at);
  }

  async findLeadByMobileNo(companyId: string, mobileNo: string, fieldName: string = 'mobile_no', includeDeleted: boolean = false): Promise<Lead | undefined> {
    // Get all sheets for this company
    const companySheets = Array.from(this.sheets.values()).filter((s) => s.company_id === companyId);
    const sheetIds = new Set(companySheets.map((s) => s.id));
    
    // Search for lead with matching mobile number in the specified field in any of the company's sheets
    // By default excludes soft-deleted leads so they don't block new lead creation
    // Set includeDeleted=true to also search deleted leads (for update-only webhook flows)
    return Array.from(this.leads.values()).find((lead) => 
      sheetIds.has(lead.sheet_id) && 
      (includeDeleted || !lead.deleted_at) &&
      lead.custom_fields?.[fieldName] === mobileNo
    );
  }

  async findLeadByField(companyId: string, fieldKey: string, fieldValue: string, includeDeleted: boolean = false): Promise<Lead | undefined> {
    // Get all sheets for this company
    const companySheets = Array.from(this.sheets.values()).filter((s) => s.company_id === companyId);
    const sheetIds = new Set(companySheets.map((s) => s.id));
    
    // Search for lead with matching field value in any of the company's sheets
    // By default excludes soft-deleted leads so they don't block new lead creation
    // Set includeDeleted=true to also search deleted leads (for update-only webhook flows)
    return Array.from(this.leads.values()).find((lead) => 
      sheetIds.has(lead.sheet_id) && 
      (includeDeleted || !lead.deleted_at) &&
      lead.custom_fields?.[fieldKey] === fieldValue
    );
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date().toISOString();
    // Use provided created_at (e.g., from webhook form submission time) or fall back to system time
    const createdAt = insertLead.created_at || now;
    const lead: Lead = {
      id,
      sheet_id: insertLead.sheet_id,
      owner_user_id: insertLead.owner_user_id || "",
      custom_fields: insertLead.custom_fields || {},
      meta: insertLead.meta || {},
      deleted_at: null,
      deleted_by_user_id: null,
      created_at: createdAt,
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

  async markLeadAttended(leadId: string, userId: string): Promise<boolean> {
    const lead = this.leads.get(leadId);
    if (!lead) return false;
    // Only set if not already attended (first-write-wins) - check BOTH fields are null
    if (!lead.attended_at && !lead.attended_by_user_id) {
      lead.attended_at = new Date().toISOString();
      lead.attended_by_user_id = userId;
      lead.updated_at = new Date().toISOString();
      this.leads.set(leadId, lead);
      return true;
    }
    return false;
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

  async getDropdownOptionById(id: string): Promise<DropdownOption | undefined> {
    return this.dropdownOptions.get(id);
  }

  async createDropdownOption(insertOption: InsertDropdownOption): Promise<DropdownOption> {
    const id = randomUUID();
    const option: DropdownOption = {
      ...insertOption,
      id,
      sheet_id: insertOption.sheet_id ?? null,
      is_system: insertOption.is_system ?? false,
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
      is_system: insertColumn.is_system ?? false,
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
      id,
      company_id: insertRule.company_id,
      sheet_id: insertRule.sheet_id ?? null,
      name: insertRule.name,
      trigger_column_key: insertRule.trigger_column_key,
      operator: insertRule.operator as any,
      trigger_value: insertRule.trigger_value,
      required_fields: insertRule.required_fields ?? [],
      conditions: insertRule.conditions ?? [],
      logical_operator: (insertRule.logical_operator as "and" | "or") ?? "and",
      required_columns: insertRule.required_columns ?? [],
      is_active: insertRule.is_active ?? true,
      created_by_user_id: insertRule.created_by_user_id ?? null,
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

  // Highlighting Rules (Row Highlighting based on Conditions)
  private highlightingRules: Map<string, HighlightingRule> = new Map();

  async getHighlightingRules(sheetId: string): Promise<HighlightingRule[]> {
    return Array.from(this.highlightingRules.values())
      .filter((rule) => rule.sheet_id === sheetId && rule.is_active)
      .sort((a, b) => a.priority - b.priority);
  }

  async getHighlightingRuleById(id: string): Promise<HighlightingRule | undefined> {
    return this.highlightingRules.get(id);
  }

  async createHighlightingRule(insertRule: InsertHighlightingRule): Promise<HighlightingRule> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const rule: HighlightingRule = {
      ...insertRule,
      id,
      created_at: now,
      updated_at: now,
    };
    this.highlightingRules.set(id, rule);
    return rule;
  }

  async updateHighlightingRule(
    id: string,
    updates: Partial<HighlightingRule>
  ): Promise<HighlightingRule | undefined> {
    const rule = this.highlightingRules.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, ...updates, updated_at: new Date().toISOString() };
    this.highlightingRules.set(id, updated);
    return updated;
  }

  async deleteHighlightingRule(id: string): Promise<boolean> {
    return this.highlightingRules.delete(id);
  }

  async reorderHighlightingRules(sheetId: string, ruleIds: string[]): Promise<boolean> {
    ruleIds.forEach((id, index) => {
      const rule = this.highlightingRules.get(id);
      if (rule && rule.sheet_id === sheetId) {
        rule.priority = index;
        rule.updated_at = new Date().toISOString();
        this.highlightingRules.set(id, rule);
      }
    });
    return true;
  }

  async getGlobalHighlightingRules(companyId: string): Promise<HighlightingRule[]> {
    return Array.from(this.highlightingRules.values())
      .filter((rule) => rule.company_id === companyId && rule.sheet_id === null)
      .sort((a, b) => a.priority - b.priority);
  }

  async reorderGlobalHighlightingRules(companyId: string, ruleIds: string[]): Promise<boolean> {
    ruleIds.forEach((id, index) => {
      const rule = this.highlightingRules.get(id);
      if (rule && rule.company_id === companyId && rule.sheet_id === null) {
        rule.priority = index;
        rule.updated_at = new Date().toISOString();
        this.highlightingRules.set(id, rule);
      }
    });
    return true;
  }

  // Hot Lead Configuration
  private hotLeadConfigs = new Map<string, HotLeadConfig>();

  async getHotLeadConfig(companyId: string): Promise<HotLeadConfig | undefined> {
    return Array.from(this.hotLeadConfigs.values()).find(c => c.company_id === companyId);
  }

  async createHotLeadConfig(config: InsertHotLeadConfig): Promise<HotLeadConfig> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newConfig: HotLeadConfig = {
      id,
      company_id: config.company_id,
      conditions: config.conditions || [],
      logical_operator: (config.logical_operator as "and" | "or") || "or",
      is_active: config.is_active ?? true,
      created_by_user_id: config.created_by_user_id || null,
      created_at: now,
      updated_at: now,
    };
    this.hotLeadConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateHotLeadConfig(id: string, updates: Partial<HotLeadConfig>): Promise<HotLeadConfig | undefined> {
    const existing = this.hotLeadConfigs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.hotLeadConfigs.set(id, updated);
    return updated;
  }

  // Custom Views (Industry-specific sidebar menu items)
  private customViews = new Map<string, CustomView>();

  async getCustomViews(companyId: string): Promise<CustomView[]> {
    return Array.from(this.customViews.values())
      .filter(v => v.company_id === companyId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async getCustomViewById(id: string): Promise<CustomView | undefined> {
    return this.customViews.get(id);
  }

  async createCustomView(view: InsertCustomView): Promise<CustomView> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newView: CustomView = {
      id,
      company_id: view.company_id,
      name: view.name,
      icon: (view.icon as any) || "star",
      icon_color: (view.icon_color as any) || "blue",
      show_badge: view.show_badge ?? true,
      conditions: view.conditions || [],
      sheet_ids: view.sheet_ids ?? null,
      is_enabled: view.is_enabled ?? true,
      order_index: view.order_index ?? 0,
      created_by_user_id: view.created_by_user_id || null,
      created_at: now,
      updated_at: now,
    };
    this.customViews.set(id, newView);
    return newView;
  }

  async updateCustomView(id: string, updates: Partial<CustomView>): Promise<CustomView | undefined> {
    const existing = this.customViews.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.customViews.set(id, updated);
    return updated;
  }

  async deleteCustomView(id: string): Promise<boolean> {
    return this.customViews.delete(id);
  }

  async reorderCustomViews(companyId: string, viewIds: string[]): Promise<boolean> {
    viewIds.forEach((id, index) => {
      const view = this.customViews.get(id);
      if (view && view.company_id === companyId) {
        view.order_index = index;
        view.updated_at = new Date().toISOString();
        this.customViews.set(id, view);
      }
    });
    return true;
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
      webhook_id: insertLog.webhook_id ?? null,
      sheet_id: insertLog.sheet_id ?? null,
      mapped_data: insertLog.mapped_data ?? null,
      error_message: insertLog.error_message ?? null,
      lead_id: insertLog.lead_id ?? null,
      allocation_issue: insertLog.allocation_issue ?? null,
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

  async getLeadUpdatesBySheetId(sheetId: string): Promise<LeadUpdate[]> {
    const leads = await this.getLeadsBySheetId(sheetId);
    const leadIds = new Set(leads.map(l => l.id));
    return Array.from(this.leadUpdates.values())
      .filter((update) => leadIds.has(update.lead_id))
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

  async getWebhookRequest(id: string): Promise<WebhookRequest | undefined> {
    return undefined;
  }
  
  async createWebhookRequest(request: InsertWebhookRequest): Promise<WebhookRequest> {
    throw new Error("Webhook management not supported in MemStorage");
  }

  async updateWebhookRequest(id: string, updates: Partial<WebhookRequest>): Promise<WebhookRequest | undefined> {
    throw new Error("Webhook management not supported in MemStorage");
  }

  // Outgoing Webhooks (stub implementations)
  async getOutgoingWebhook(id: string): Promise<OutgoingWebhook | undefined> {
    throw new Error("Outgoing webhook management not supported in MemStorage");
  }

  async getOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]> {
    return [];
  }

  async getActiveOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]> {
    return [];
  }

  async createOutgoingWebhook(webhook: InsertOutgoingWebhook): Promise<OutgoingWebhook> {
    throw new Error("Outgoing webhook management not supported in MemStorage");
  }

  async updateOutgoingWebhook(id: string, updates: Partial<OutgoingWebhook>): Promise<OutgoingWebhook | undefined> {
    throw new Error("Outgoing webhook management not supported in MemStorage");
  }

  async deleteOutgoingWebhook(id: string): Promise<boolean> {
    throw new Error("Outgoing webhook management not supported in MemStorage");
  }

  // Outgoing Webhook Logs (stub implementations)
  async getOutgoingWebhookLogs(webhookId: string, limit?: number): Promise<OutgoingWebhookLog[]> {
    return [];
  }

  async getOutgoingWebhookLogsByCompanyId(companyId: string, limit?: number): Promise<OutgoingWebhookLog[]> {
    return [];
  }

  async createOutgoingWebhookLog(log: InsertOutgoingWebhookLog): Promise<OutgoingWebhookLog> {
    throw new Error("Outgoing webhook management not supported in MemStorage");
  }

  // Lead Search for Webhook Matching (stub implementation)
  async findLeadsByFieldValue(companyId: string, fieldKey: string, value: string): Promise<Lead[]> {
    return [];
  }

  // Reports
  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getReportsByCompanyId(companyId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(report => report.company_id === companyId);
  }

  async getReportsBySheetIds(sheetIds: string[]): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(report => {
      const reportSheetIds = Array.isArray(report.sheet_ids) ? report.sheet_ids : [];
      return reportSheetIds.some(sheetId => sheetIds.includes(sheetId));
    });
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const report: Report = {
      ...insertReport,
      id,
      created_at: now,
      updated_at: now,
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updated = { ...report, ...updates, updated_at: new Date().toISOString() };
    this.reports.set(id, updated);
    return updated;
  }

  async deleteReport(id: string): Promise<boolean> {
    return this.reports.delete(id);
  }

  // User Column Preferences
  async getUserColumnPreferences(userId: string, sheetId: string): Promise<UserColumnPreference[]> {
    return Array.from(this.userColumnPreferences.values()).filter(
      pref => pref.user_id === userId && pref.sheet_id === sheetId
    );
  }

  async saveUserColumnPreferences(userId: string, sheetId: string, preferences: Array<{column_key: string, width: number}>): Promise<void> {
    // Delete existing preferences for this user+sheet combo
    const toDelete = Array.from(this.userColumnPreferences.entries())
      .filter(([_, pref]) => pref.user_id === userId && pref.sheet_id === sheetId)
      .map(([id]) => id);
    toDelete.forEach(id => this.userColumnPreferences.delete(id));

    // Insert new preferences
    const now = new Date().toISOString();
    preferences.forEach(pref => {
      const id = randomUUID();
      const preference: UserColumnPreference = {
        id,
        user_id: userId,
        sheet_id: sheetId,
        column_key: pref.column_key,
        width: pref.width,
        created_at: now,
        updated_at: now,
      };
      this.userColumnPreferences.set(id, preference);
    });
  }

  // Push Subscriptions (MemStorage - minimal implementation)
  private pushSubscriptions: Map<string, PushSubscription> = new Map();

  async getPushSubscription(userId: string, endpoint: string): Promise<PushSubscription | undefined> {
    return Array.from(this.pushSubscriptions.values()).find(
      sub => sub.user_id === userId && sub.endpoint === endpoint
    );
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(sub => sub.user_id === userId);
  }

  async getPushSubscriptionsByCompanyId(companyId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(sub => sub.company_id === companyId);
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newSub: PushSubscription = {
      id,
      user_id: subscription.user_id,
      company_id: subscription.company_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      device_type: subscription.device_type ?? null,
      user_agent: subscription.user_agent ?? null,
      created_at: now,
      updated_at: now,
    };
    this.pushSubscriptions.set(id, newSub);
    return newSub;
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const sub = await this.getPushSubscription(userId, endpoint);
    if (!sub) return false;
    return this.pushSubscriptions.delete(sub.id);
  }

  async deletePushSubscriptionsByUserId(userId: string): Promise<boolean> {
    const subs = await this.getPushSubscriptionsByUserId(userId);
    subs.forEach(sub => this.pushSubscriptions.delete(sub.id));
    return true;
  }

  // Attendance Entries (MemStorage - minimal stub implementation)
  private attendanceEntries: Map<string, AttendanceEntryRecord> = new Map();
  private attendanceRules: Map<string, AttendanceRuleRecord> = new Map();

  async getAttendanceEntry(id: string): Promise<AttendanceEntryRecord | undefined> {
    return this.attendanceEntries.get(id);
  }

  async getTodayAttendanceEntry(userId: string): Promise<AttendanceEntryRecord | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from(this.attendanceEntries.values()).find(e => 
      e.user_id === userId && new Date(e.entry_time) >= today
    );
  }

  async getAttendanceEntriesByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]> {
    return Array.from(this.attendanceEntries.values()).filter(e => {
      if (e.user_id !== userId) return false;
      const entryDate = new Date(e.entry_time);
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }

  async getAttendanceEntriesByCompanyId(companyId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]> {
    return Array.from(this.attendanceEntries.values()).filter(e => {
      if (e.company_id !== companyId) return false;
      const entryDate = new Date(e.entry_time);
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }

  async getPendingForceExitsByCompanyId(companyId: string): Promise<AttendanceEntryRecord[]> {
    return Array.from(this.attendanceEntries.values()).filter(e =>
      e.company_id === companyId && e.exit_type === "forced" && e.review_status === "pending"
    );
  }

  async createAttendanceEntry(entry: InsertAttendanceEntry): Promise<AttendanceEntryRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newEntry: AttendanceEntryRecord = {
      id,
      user_id: entry.user_id,
      company_id: entry.company_id,
      entry_time: entry.entry_time.toISOString(),
      entry_location: entry.entry_location ?? null,
      entry_selfie_url: entry.entry_selfie_url ?? null,
      exit_time: entry.exit_time?.toISOString() ?? null,
      exit_type: entry.exit_type ?? null,
      force_exit_reason: entry.force_exit_reason ?? null,
      force_exit_blocking_reasons: entry.force_exit_blocking_reasons ?? null,
      review_status: entry.review_status ?? null,
      reviewed_by_user_id: entry.reviewed_by_user_id ?? null,
      reviewed_at: entry.reviewed_at?.toISOString() ?? null,
      review_notes: entry.review_notes ?? null,
      created_at: now,
      updated_at: now,
    };
    this.attendanceEntries.set(id, newEntry);
    return newEntry;
  }

  async updateAttendanceEntry(id: string, updates: Partial<AttendanceEntryRecord>): Promise<AttendanceEntryRecord | undefined> {
    const existing = this.attendanceEntries.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.attendanceEntries.set(id, updated);
    return updated;
  }

  async deleteAttendanceEntry(id: string): Promise<boolean> {
    return this.attendanceEntries.delete(id);
  }

  async cleanupOldSelfieUrls(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    let count = 0;
    this.attendanceEntries.forEach((entry, id) => {
      if (entry.entry_selfie_url && new Date(entry.entry_time) < cutoffDate) {
        this.attendanceEntries.set(id, { ...entry, entry_selfie_url: null });
        count++;
      }
    });
    return count;
  }

  // Attendance Rules (MemStorage - minimal stub implementation)
  async getAttendanceRule(id: string): Promise<AttendanceRuleRecord | undefined> {
    return this.attendanceRules.get(id);
  }

  async getAttendanceRulesByCompanyId(companyId: string): Promise<AttendanceRuleRecord[]> {
    return Array.from(this.attendanceRules.values()).filter(r => r.company_id === companyId);
  }

  async createAttendanceRule(rule: InsertAttendanceRule): Promise<AttendanceRuleRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newRule: AttendanceRuleRecord = {
      id,
      company_id: rule.company_id,
      rule_type: rule.rule_type,
      name: rule.name,
      description: rule.description ?? null,
      is_enabled: rule.is_enabled ?? true,
      config: rule.config ?? {},
      created_at: now,
      updated_at: now,
    };
    this.attendanceRules.set(id, newRule);
    return newRule;
  }

  async updateAttendanceRule(id: string, updates: Partial<AttendanceRuleRecord>): Promise<AttendanceRuleRecord | undefined> {
    const existing = this.attendanceRules.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.attendanceRules.set(id, updated);
    return updated;
  }

  async deleteAttendanceRule(id: string): Promise<boolean> {
    return this.attendanceRules.delete(id);
  }

  // Tasks (MemStorage - minimal stub implementation)
  private tasksMap = new Map<string, TaskRecord>();
  private taskLeadsMap = new Map<string, TaskLeadRecord>();
  private taskUpdatesMap = new Map<string, TaskUpdateRecord>();

  async getTask(id: string): Promise<TaskRecord | undefined> {
    return this.tasksMap.get(id);
  }

  async getTasksByCompanyId(companyId: string, options?: { status?: string[]; assignedTo?: string; includeCompleted?: boolean }): Promise<TaskRecord[]> {
    let tasks = Array.from(this.tasksMap.values()).filter(t => t.company_id === companyId);
    if (options?.status && options.status.length > 0) {
      tasks = tasks.filter(t => options.status!.includes(t.status));
    } else if (options?.includeCompleted === false) {
      tasks = tasks.filter(t => t.status !== 'completed');
    }
    if (options?.assignedTo) {
      tasks = tasks.filter(t => t.assigned_to_user_id === options.assignedTo);
    }
    return tasks;
  }

  async getTasksByUserId(userId: string, options?: { status?: string[]; includeCompleted?: boolean }): Promise<TaskRecord[]> {
    let tasks = Array.from(this.tasksMap.values()).filter(t => t.assigned_to_user_id === userId);
    if (options?.status && options.status.length > 0) {
      tasks = tasks.filter(t => options.status!.includes(t.status));
    } else if (options?.includeCompleted === false) {
      tasks = tasks.filter(t => t.status !== 'completed');
    }
    return tasks;
  }

  async getOverdueAndTodayTasks(companyId: string): Promise<TaskRecord[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return Array.from(this.tasksMap.values()).filter(t => 
      t.company_id === companyId && 
      (t.status === 'pending' || t.status === 'ongoing') &&
      t.due_date && new Date(t.due_date) <= today
    );
  }

  async createTask(task: InsertTask): Promise<TaskRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newTask: TaskRecord = {
      id,
      company_id: task.company_id,
      title: task.title,
      description: task.description ?? null,
      priority: task.priority ?? 'medium',
      start_date: task.start_date ?? null,
      due_date: task.due_date ?? null,
      status: task.status ?? 'pending',
      user_remarks: task.user_remarks ?? null,
      admin_remarks: task.admin_remarks ?? null,
      assigned_to_user_id: task.assigned_to_user_id,
      created_by_user_id: task.created_by_user_id,
      created_at: now,
      updated_at: now,
    };
    this.tasksMap.set(id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined> {
    const existing = this.tasksMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.tasksMap.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasksMap.delete(id);
  }

  async getTaskLeads(taskId: string): Promise<TaskLeadRecord[]> {
    return Array.from(this.taskLeadsMap.values()).filter(tl => tl.task_id === taskId);
  }

  async addTaskLead(taskLead: InsertTaskLead): Promise<TaskLeadRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newTaskLead: TaskLeadRecord = {
      id,
      task_id: taskLead.task_id,
      lead_id: taskLead.lead_id,
      created_at: now,
    };
    this.taskLeadsMap.set(id, newTaskLead);
    return newTaskLead;
  }

  async removeTaskLead(taskId: string, leadId: string): Promise<boolean> {
    for (const [id, tl] of this.taskLeadsMap.entries()) {
      if (tl.task_id === taskId && tl.lead_id === leadId) {
        this.taskLeadsMap.delete(id);
        return true;
      }
    }
    return false;
  }

  async removeAllTaskLeads(taskId: string): Promise<boolean> {
    for (const [id, tl] of this.taskLeadsMap.entries()) {
      if (tl.task_id === taskId) {
        this.taskLeadsMap.delete(id);
      }
    }
    return true;
  }

  async getTaskUpdates(taskId: string): Promise<TaskUpdateRecord[]> {
    return Array.from(this.taskUpdatesMap.values())
      .filter(u => u.task_id === taskId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdateRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newUpdate: TaskUpdateRecord = {
      id,
      task_id: update.task_id,
      user_id: update.user_id,
      update_type: update.update_type,
      old_value: update.old_value ?? null,
      new_value: update.new_value ?? null,
      description: update.description ?? null,
      created_at: now,
    };
    this.taskUpdatesMap.set(id, newUpdate);
    return newUpdate;
  }

  // User Sheet Views (Personal Column Preferences)
  private userSheetViewsMap: Map<string, UserSheetViewRecord> = new Map();

  async getUserSheetView(userId: string, sheetId: string): Promise<UserSheetViewRecord | undefined> {
    const key = `${userId}_${sheetId}`;
    return this.userSheetViewsMap.get(key);
  }

  async upsertUserSheetView(userId: string, sheetId: string, columnOrder: string[], hiddenColumns: string[]): Promise<UserSheetViewRecord> {
    const key = `${userId}_${sheetId}`;
    const now = new Date().toISOString();
    const existing = this.userSheetViewsMap.get(key);
    
    if (existing) {
      const updated: UserSheetViewRecord = {
        ...existing,
        column_order: columnOrder,
        hidden_columns: hiddenColumns,
        updated_at: now,
      };
      this.userSheetViewsMap.set(key, updated);
      return updated;
    }

    const newView: UserSheetViewRecord = {
      id: randomUUID(),
      user_id: userId,
      sheet_id: sheetId,
      column_order: columnOrder,
      hidden_columns: hiddenColumns,
      created_at: now,
      updated_at: now,
    };
    this.userSheetViewsMap.set(key, newView);
    return newView;
  }

  // ============================================================================
  // MOBILE CALL INTEGRATION - Stub implementations for MemStorage
  // ============================================================================
  private callSessionsMap: Map<string, CallSessionRecord> = new Map();
  private leadPhoneIndexMap: Map<string, LeadPhoneIndexRecord> = new Map();

  async getCallSession(id: string): Promise<CallSessionRecord | undefined> {
    return this.callSessionsMap.get(id);
  }

  async getCallSessionsByUserId(userId: string, limit: number = 50): Promise<CallSessionRecord[]> {
    return Array.from(this.callSessionsMap.values())
      .filter(s => s.user_id === userId)
      .slice(0, limit);
  }

  async getCallSessionsByLeadId(leadId: string, limit: number = 50): Promise<CallSessionRecord[]> {
    return Array.from(this.callSessionsMap.values())
      .filter(s => s.lead_id === leadId)
      .slice(0, limit);
  }

  async getCallSessionsByCompanyId(companyId: string, limit: number = 100): Promise<CallSessionRecord[]> {
    return Array.from(this.callSessionsMap.values())
      .filter(s => s.company_id === companyId)
      .slice(0, limit);
  }

  async createCallSession(session: InsertCallSession): Promise<CallSessionRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newSession: CallSessionRecord = {
      ...session,
      id,
      started_at: session.started_at as any,
      ended_at: session.ended_at as any,
      created_at: now as any,
      updated_at: now as any,
    } as CallSessionRecord;
    this.callSessionsMap.set(id, newSession);
    return newSession;
  }

  async updateCallSession(id: string, updates: Partial<CallSessionRecord>): Promise<CallSessionRecord | undefined> {
    const existing = this.callSessionsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() as any };
    this.callSessionsMap.set(id, updated);
    return updated;
  }

  async deleteCallSession(id: string): Promise<boolean> {
    return this.callSessionsMap.delete(id);
  }

  async getLeadPhoneIndex(id: string): Promise<LeadPhoneIndexRecord | undefined> {
    return this.leadPhoneIndexMap.get(id);
  }

  async findLeadsByPhone(companyId: string, normalizedPhone: string): Promise<LeadPhoneIndexRecord[]> {
    return Array.from(this.leadPhoneIndexMap.values())
      .filter(i => i.company_id === companyId && i.normalized_phone === normalizedPhone);
  }

  async getPhoneIndexByLeadId(leadId: string): Promise<LeadPhoneIndexRecord[]> {
    return Array.from(this.leadPhoneIndexMap.values())
      .filter(i => i.lead_id === leadId);
  }

  async createLeadPhoneIndex(entry: InsertLeadPhoneIndex): Promise<LeadPhoneIndexRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newEntry: LeadPhoneIndexRecord = {
      ...entry,
      id,
      created_at: now as any,
      updated_at: now as any,
    } as LeadPhoneIndexRecord;
    this.leadPhoneIndexMap.set(id, newEntry);
    return newEntry;
  }

  async deleteLeadPhoneIndexByLeadId(leadId: string): Promise<boolean> {
    for (const [id, entry] of this.leadPhoneIndexMap) {
      if (entry.lead_id === leadId) {
        this.leadPhoneIndexMap.delete(id);
      }
    }
    return true;
  }

  async syncLeadPhoneIndex(leadId: string, sheetId: string, companyId: string, phoneNumbers: Array<{phone: string; type: string; isPrimary: boolean}>): Promise<void> {
    await this.deleteLeadPhoneIndexByLeadId(leadId);
    for (const phoneInfo of phoneNumbers) {
      if (phoneInfo.phone && phoneInfo.phone.trim()) {
        await this.createLeadPhoneIndex({
          company_id: companyId,
          lead_id: leadId,
          sheet_id: sheetId,
          normalized_phone: phoneInfo.phone,
          phone_type: phoneInfo.type,
          is_primary: phoneInfo.isPrimary,
        });
      }
    }
  }

  async lookupLeadsByPhone(companyId: string, phone: string): Promise<MobileLeadLookupResult[]> {
    // Simplified implementation for MemStorage
    return [];
  }

  async searchCompanyLeads(companyId: string, query: string, limit: number = 20, requestingUserId?: string, requestingUserRole?: string): Promise<CompanySearchResult[]> {
    // Simplified implementation for MemStorage
    return [];
  }

  // API Keys Management (MemStorage - simplified for testing)
  private apiKeysMap: Map<string, ApiKeyRecord> = new Map();

  async getApiKey(id: string): Promise<ApiKeyRecord | undefined> {
    return this.apiKeysMap.get(id);
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | undefined> {
    return Array.from(this.apiKeysMap.values()).find(k => k.key_hash === keyHash);
  }

  async getApiKeysByCompanyId(companyId: string): Promise<ApiKeyRecord[]> {
    return Array.from(this.apiKeysMap.values()).filter(k => k.company_id === companyId);
  }

  async getAllApiKeys(): Promise<ApiKeyRecord[]> {
    return Array.from(this.apiKeysMap.values());
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKeyRecord> {
    const id = randomUUID();
    const now = new Date();
    const record: ApiKeyRecord = {
      ...apiKey,
      id,
      is_active: apiKey.is_active ?? true,
      last_used_at: null,
      created_at: now,
      revoked_at: null,
    };
    this.apiKeysMap.set(id, record);
    return record;
  }

  async revokeApiKey(id: string): Promise<ApiKeyRecord | undefined> {
    const existing = this.apiKeysMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, is_active: false, revoked_at: new Date() };
    this.apiKeysMap.set(id, updated);
    return updated;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    const existing = this.apiKeysMap.get(id);
    if (existing) {
      this.apiKeysMap.set(id, { ...existing, last_used_at: new Date() });
    }
  }

  async findApiKeyByPrefix(prefix: string): Promise<ApiKeyRecord | undefined> {
    return Array.from(this.apiKeysMap.values()).find(k => k.key_prefix === prefix && k.is_active);
  }

  // Activity Logs (stub - not implemented for MemStorage)
  async createActivityLog(_log: InsertActivityLog): Promise<ActivityLogRecord> {
    throw new Error("Activity logs not implemented in MemStorage");
  }

  async getActivityLogs(_filters: ActivityLogFilters): Promise<ActivityLogResponse> {
    return { logs: [], total: 0, page: 1, limit: 50, total_pages: 0 };
  }

  async getActivityLogStats(_companyId: string, _sheetId?: string, _dateFrom?: string, _dateTo?: string): Promise<ActivityLogStats> {
    return { total_actions: 0, actions_by_type: {}, actions_by_user: [], actions_today: 0, actions_this_week: 0 };
  }

  // =========================================================================
  // TARGET MANAGEMENT SYSTEM (stubs for MemStorage)
  // =========================================================================

  async getTarget(_id: string): Promise<TargetRecord | undefined> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async getTargetsByCompanyId(_companyId: string, _filters?: TargetFilters): Promise<TargetRecord[]> {
    return [];
  }
  async getTargetWithDetails(_id: string): Promise<TargetWithDetails | undefined> {
    return undefined;
  }
  async createTarget(_target: InsertTarget): Promise<TargetRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async updateTarget(_id: string, _updates: Partial<TargetRecord>): Promise<TargetRecord | undefined> {
    return undefined;
  }
  async deleteTarget(_id: string): Promise<boolean> {
    return false;
  }
  async getTargetGoals(_targetId: string): Promise<TargetGoalRecord[]> {
    return [];
  }
  async createTargetGoal(_goal: InsertTargetGoal): Promise<TargetGoalRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async updateTargetGoal(_id: string, _updates: Partial<TargetGoalRecord>): Promise<TargetGoalRecord | undefined> {
    return undefined;
  }
  async deleteTargetGoal(_id: string): Promise<boolean> {
    return false;
  }
  async deleteTargetGoalsByTargetId(_targetId: string): Promise<number> {
    return 0;
  }
  async getTargetUserAssignments(_targetId: string): Promise<TargetUserAssignmentRecord[]> {
    return [];
  }
  async createTargetUserAssignment(_assignment: InsertTargetUserAssignment): Promise<TargetUserAssignmentRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async deleteTargetUserAssignment(_id: string): Promise<boolean> {
    return false;
  }
  async deleteTargetUserAssignmentsByTargetId(_targetId: string): Promise<number> {
    return 0;
  }
  async getTargetsForUser(_userId: string, _status?: string | string[]): Promise<TargetRecord[]> {
    return [];
  }
  async getTargetUserProgress(_targetId: string, _userId?: string): Promise<TargetUserProgressRecord[]> {
    return [];
  }
  async getUserProgressForGoal(_goalId: string, _userId: string, _periodStart: Date): Promise<TargetUserProgressRecord | undefined> {
    return undefined;
  }
  async createTargetUserProgress(_progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async updateTargetUserProgress(_id: string, _updates: Partial<TargetUserProgressRecord>): Promise<TargetUserProgressRecord | undefined> {
    return undefined;
  }
  async upsertTargetUserProgress(_progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async getCompanyHolidays(_companyId: string, _startDate?: Date, _endDate?: Date): Promise<CompanyHolidayRecord[]> {
    return [];
  }
  async createCompanyHoliday(_holiday: InsertCompanyHoliday): Promise<CompanyHolidayRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async deleteCompanyHoliday(_id: string): Promise<boolean> {
    return false;
  }
  async getTargetNotifications(_userId: string, _unreadOnly?: boolean): Promise<TargetNotificationRecord[]> {
    return [];
  }
  async createTargetNotification(_notification: InsertTargetNotification): Promise<TargetNotificationRecord> {
    throw new Error("Targets not implemented in MemStorage");
  }
  async markNotificationAsRead(_id: string): Promise<boolean> {
    return false;
  }
  async markNotificationAsDismissed(_id: string): Promise<boolean> {
    return false;
  }
  async markAllNotificationsAsRead(_userId: string): Promise<number> {
    return 0;
  }
  async getLeaderboard(_companyId: string, _period?: { start: Date; end: Date }): Promise<LeaderboardEntry[]> {
    return [];
  }

  // Backup System (MemStorage stubs)
  async getBackupConfig(_id: string): Promise<BackupConfigRecord | undefined> {
    return undefined;
  }
  async getBackupConfigBySheetId(_sheetId: string): Promise<BackupConfigRecord | undefined> {
    return undefined;
  }
  async getBackupConfigsByCompanyId(_companyId: string): Promise<BackupConfigRecord[]> {
    return [];
  }
  async getEnabledBackupConfigs(): Promise<BackupConfigRecord[]> {
    return [];
  }
  async createBackupConfig(_config: InsertBackupConfig): Promise<BackupConfigRecord> {
    throw new Error("Backup not implemented in MemStorage");
  }
  async updateBackupConfig(_id: string, _updates: Partial<BackupConfigRecord>): Promise<BackupConfigRecord | undefined> {
    return undefined;
  }
  async deleteBackupConfig(_id: string): Promise<boolean> {
    return false;
  }
  async getBackupSyncLogs(_backupConfigId: string, _limit?: number): Promise<BackupSyncLogRecord[]> {
    return [];
  }
  async createBackupSyncLog(_log: InsertBackupSyncLog): Promise<BackupSyncLogRecord> {
    throw new Error("Backup not implemented in MemStorage");
  }
  async updateBackupSyncLog(_id: string, _updates: Partial<BackupSyncLogRecord>): Promise<BackupSyncLogRecord | undefined> {
    return undefined;
  }
  async getRestoreLogs(_companyId: string, _sheetId?: string): Promise<RestoreLogRecord[]> {
    return [];
  }
  async createRestoreLog(_log: InsertRestoreLog): Promise<RestoreLogRecord> {
    throw new Error("Backup not implemented in MemStorage");
  }

  // User Row Filters (not implemented in MemStorage - requires PostgreSQL)
  async getUserRowFilter(_id: string): Promise<UserRowFilterRecord | undefined> {
    return undefined;
  }
  async getUserRowFiltersByUserAndSheet(_userId: string, _sheetId: string): Promise<UserRowFilterRecord[]> {
    return [];
  }
  async createUserRowFilter(_filter: InsertUserRowFilter): Promise<UserRowFilterRecord> {
    throw new Error("User row filters not implemented in MemStorage");
  }
  async updateUserRowFilter(_id: string, _updates: Partial<UserRowFilterRecord>): Promise<UserRowFilterRecord | undefined> {
    return undefined;
  }
  async deleteUserRowFilter(_id: string): Promise<boolean> {
    return false;
  }
  async toggleUserRowFilter(_id: string, _isActive: boolean): Promise<UserRowFilterRecord | undefined> {
    return undefined;
  }

  // Sheet Snapshots (not implemented in MemStorage - requires PostgreSQL)
  async getSheetSnapshot(_id: string): Promise<SheetSnapshotRecord | undefined> {
    return undefined;
  }
  async getSheetSnapshotsBySheet(_sheetId: string, _limit?: number): Promise<SheetSnapshotRecord[]> {
    return [];
  }
  async getSheetSnapshotsByCompany(_companyId: string, _limit?: number): Promise<SheetSnapshotRecord[]> {
    return [];
  }
  async getAllSheetSnapshots(_limit?: number): Promise<SheetSnapshotRecord[]> {
    return [];
  }
  async getLatestSheetSnapshot(_sheetId: string): Promise<SheetSnapshotRecord | undefined> {
    return undefined;
  }
  async createSheetSnapshot(_snapshot: InsertSheetSnapshot): Promise<SheetSnapshotRecord> {
    throw new Error("Sheet snapshots not implemented in MemStorage");
  }
  async deleteSheetSnapshot(_id: string): Promise<boolean> {
    return false;
  }
  async deleteOldSnapshots(_olderThanDays: number): Promise<number> {
    return 0;
  }
  async getSnapshotRestoreLogs(_companyId: string, _limit?: number): Promise<SnapshotRestoreLogRecord[]> {
    return [];
  }
  async createSnapshotRestoreLog(_log: InsertSnapshotRestoreLog): Promise<SnapshotRestoreLogRecord> {
    throw new Error("Snapshot restore logs not implemented in MemStorage");
  }

  // Saved Reports (not implemented in MemStorage - requires PostgreSQL)
  async getSavedReport(_id: string): Promise<SavedReportRecord | undefined> {
    return undefined;
  }
  async getSavedReportsByCompany(_companyId: string, _includeGlobal?: boolean): Promise<SavedReportRecord[]> {
    return [];
  }
  async getGlobalSavedReports(): Promise<SavedReportRecord[]> {
    return [];
  }
  async createSavedReport(_report: InsertSavedReport): Promise<SavedReportRecord> {
    throw new Error("Saved reports not implemented in MemStorage");
  }
  async updateSavedReport(_id: string, _updates: Partial<SavedReportRecord>): Promise<SavedReportRecord | undefined> {
    return undefined;
  }
  async deleteSavedReport(_id: string): Promise<boolean> {
    return false;
  }
  async duplicateSavedReport(_id: string, _targetCompanyId: string, _userId: string): Promise<SavedReportRecord | undefined> {
    return undefined;
  }
  async incrementReportRunCount(_id: string): Promise<boolean> {
    return false;
  }

  // Company KPIs (not implemented in MemStorage - requires PostgreSQL)
  async getCompanyKpi(_id: string): Promise<CompanyKpiRecord | undefined> {
    return undefined;
  }
  async getCompanyKpisByCompany(_companyId: string): Promise<CompanyKpiRecord[]> {
    return [];
  }
  async createCompanyKpi(_kpi: InsertCompanyKpi): Promise<CompanyKpiRecord> {
    throw new Error("Company KPIs not implemented in MemStorage");
  }
  async updateCompanyKpi(_id: string, _updates: Partial<CompanyKpiRecord>): Promise<CompanyKpiRecord | undefined> {
    return undefined;
  }
  async deleteCompanyKpi(_id: string): Promise<boolean> {
    return false;
  }

  // Simple Targets (not implemented in MemStorage - requires PostgreSQL)
  async getSimpleTarget(_id: string): Promise<SimpleTargetRecord | undefined> {
    return undefined;
  }
  async getSimpleTargetsByCompany(_companyId: string): Promise<SimpleTargetRecord[]> {
    return [];
  }
  async getSimpleTargetsByKpi(_kpiId: string): Promise<SimpleTargetRecord[]> {
    return [];
  }
  async createSimpleTarget(_target: InsertSimpleTarget): Promise<SimpleTargetRecord> {
    throw new Error("Simple Targets not implemented in MemStorage");
  }
  async updateSimpleTarget(_id: string, _updates: Partial<SimpleTargetRecord>): Promise<SimpleTargetRecord | undefined> {
    return undefined;
  }
  async deleteSimpleTarget(_id: string): Promise<boolean> {
    return false;
  }

  // Simple Target Progress (not implemented in MemStorage - requires PostgreSQL)
  async getSimpleTargetProgress(_targetId: string, _userId: string, _periodStart: Date): Promise<SimpleTargetProgressRecord | undefined> {
    return undefined;
  }
  async getSimpleTargetProgressByUser(_userId: string): Promise<SimpleTargetProgressRecord[]> {
    return [];
  }
  async getSimpleTargetProgressByTarget(_targetId: string): Promise<SimpleTargetProgressRecord[]> {
    return [];
  }
  async createOrUpdateSimpleTargetProgress(_progress: InsertSimpleTargetProgress): Promise<SimpleTargetProgressRecord> {
    throw new Error("Simple Target Progress not implemented in MemStorage");
  }

  // Working Targets (not implemented in MemStorage - requires PostgreSQL)
  async getWorkingTarget(_id: string): Promise<WorkingTargetRecord | undefined> {
    return undefined;
  }
  async getWorkingTargetsByCompany(_companyId: string): Promise<WorkingTargetRecord[]> {
    return [];
  }
  async createWorkingTarget(_target: InsertWorkingTarget): Promise<WorkingTargetRecord> {
    throw new Error("Working Targets not implemented in MemStorage");
  }
  async updateWorkingTarget(_id: string, _updates: Partial<WorkingTargetRecord>): Promise<WorkingTargetRecord | undefined> {
    return undefined;
  }
  async deleteWorkingTarget(_id: string): Promise<boolean> {
    return false;
  }

  // Working Target Results (not implemented in MemStorage - requires PostgreSQL)
  async getWorkingTargetResult(_targetId: string, _userId: string, _periodStart: Date): Promise<WorkingTargetResultRecord | undefined> {
    return undefined;
  }
  async getWorkingTargetResultsByUser(_userId: string, _periodStart?: Date, _periodEnd?: Date): Promise<WorkingTargetResultRecord[]> {
    return [];
  }
  async getWorkingTargetResultsByTarget(_targetId: string): Promise<WorkingTargetResultRecord[]> {
    return [];
  }
  async createOrUpdateWorkingTargetResult(_result: InsertWorkingTargetResult): Promise<WorkingTargetResultRecord> {
    throw new Error("Working Target Results not implemented in MemStorage");
  }

  // Attendance Exit Conditions (not implemented in MemStorage - requires PostgreSQL)
  async getAttendanceExitCondition(_id: string): Promise<AttendanceExitConditionRecord | undefined> {
    return undefined;
  }
  async getAttendanceExitConditionsByCompany(_companyId: string): Promise<AttendanceExitConditionRecord[]> {
    return [];
  }
  async getActiveExitConditionsForUser(_userId: string, _companyId: string): Promise<AttendanceExitConditionRecord[]> {
    return [];
  }
  async createAttendanceExitCondition(_condition: InsertAttendanceExitCondition): Promise<AttendanceExitConditionRecord> {
    throw new Error("Attendance Exit Conditions not implemented in MemStorage");
  }
  async updateAttendanceExitCondition(_id: string, _updates: Partial<AttendanceExitConditionRecord>): Promise<AttendanceExitConditionRecord | undefined> {
    return undefined;
  }
  async deleteAttendanceExitCondition(_id: string): Promise<boolean> {
    return false;
  }

  // Transition Explanation Rules (not implemented in MemStorage - requires PostgreSQL)
  async getTransitionExplanationRule(_id: string): Promise<TransitionExplanationRuleRecord | undefined> {
    return undefined;
  }
  async getTransitionExplanationRulesByCompany(_companyId: string): Promise<TransitionExplanationRuleRecord[]> {
    return [];
  }
  async getActiveTransitionExplanationRules(_companyId: string): Promise<TransitionExplanationRuleRecord[]> {
    return [];
  }
  async createTransitionExplanationRule(_rule: InsertTransitionExplanationRule): Promise<TransitionExplanationRuleRecord> {
    throw new Error("Transition Explanation Rules not implemented in MemStorage");
  }
  async updateTransitionExplanationRule(_id: string, _updates: Partial<TransitionExplanationRuleRecord>): Promise<TransitionExplanationRuleRecord | undefined> {
    return undefined;
  }
  async deleteTransitionExplanationRule(_id: string): Promise<boolean> {
    return false;
  }
  async checkTransitionRequiresExplanation(_companyId: string, _columnKey: string, _newValue: string): Promise<boolean> {
    return false;
  }

  // Future Improvements (not implemented in MemStorage - requires PostgreSQL)
  async getFutureImprovements(): Promise<FutureImprovementRecord[]> {
    return [];
  }
  async getFutureImprovement(_id: string): Promise<FutureImprovementRecord | undefined> {
    return undefined;
  }
  async createFutureImprovement(_improvement: InsertFutureImprovement): Promise<FutureImprovementRecord> {
    throw new Error("Future Improvements not implemented in MemStorage");
  }
  async updateFutureImprovement(_id: string, _updates: Partial<FutureImprovementRecord>): Promise<FutureImprovementRecord | undefined> {
    return undefined;
  }
  async deleteFutureImprovement(_id: string): Promise<boolean> {
    return false;
  }

  // System Value Definitions (not implemented in MemStorage - requires PostgreSQL)
  async getSystemValueDefinitions(): Promise<SystemValueDefinition[]> {
    return [];
  }
  async getSystemValueDefinitionsByType(_columnType: SystemColumnType): Promise<SystemValueDefinition[]> {
    return [];
  }
  async getSystemValueDefinition(_id: string): Promise<SystemValueDefinition | undefined> {
    return undefined;
  }
  async createSystemValueDefinition(_definition: InsertSystemValueDefinition): Promise<SystemValueDefinition> {
    throw new Error("System Value Definitions not implemented in MemStorage");
  }
  async updateSystemValueDefinition(_id: string, _updates: Partial<SystemValueDefinition>): Promise<SystemValueDefinition | undefined> {
    return undefined;
  }
  async deleteSystemValueDefinition(_id: string): Promise<boolean> {
    return false;
  }

  // Raw SQL (not implemented in MemStorage)
  async executeRawQuery(_query: string, _params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    throw new Error("Raw SQL queries not implemented in MemStorage");
  }
}

// ============================================================================
// POSTGRESQL STORAGE (Permanent Database)
// ============================================================================
import { db } from "./db";
import { eq, and, or, desc, asc, isNull, isNotNull, inArray, gte, lte, sql, ilike } from "drizzle-orm";
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
      attendance_exit_target_id: null,
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

  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const updated_at = new Date();
    await db.update(dbSchema.users)
      .set({ password_hash: passwordHash, updated_at })
      .where(eq(dbSchema.users.id, id));
    return true;
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
    const result = await db.select().from(dbSchema.sheets).where(
      and(
        eq(dbSchema.sheets.company_id, companyId),
        isNull(dbSchema.sheets.deleted_at)
      )
    );
    return result.map(this.mapSheet);
  }

  async getPersonalSheets(userId: string): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(
      and(
        eq(dbSchema.sheets.owner_id, userId),
        eq(dbSchema.sheets.is_personal, true),
        isNull(dbSchema.sheets.deleted_at)
      )
    );
    return result.map(this.mapSheet);
  }

  async getCompanySheets(companyId: string): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(
      and(
        eq(dbSchema.sheets.company_id, companyId),
        eq(dbSchema.sheets.is_personal, false),
        isNull(dbSchema.sheets.deleted_at)
      )
    );
    return result.map(this.mapSheet);
  }

  async getAllSheets(): Promise<Sheet[]> {
    const result = await db.select().from(dbSchema.sheets).where(isNull(dbSchema.sheets.deleted_at));
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
    ).orderBy(desc(dbSchema.leads.created_at));
    return result.map(this.mapLead);
  }

  async getLeadsBySheetIds(options: LeadsQueryOptions): Promise<PaginatedLeadsResult> {
    const { sheetIds, page = 1, limit = 50, sortBy, sortOrder = 'desc', filters, quickFilter, companyTimezone } = options;
    const safeFilters = filters || {};
    const timezone = companyTimezone || 'Asia/Kolkata';
    
    if (sheetIds.length === 0) {
      return { leads: [], total: 0, page, limit, totalPages: 0 };
    }
    
    // Build base conditions
    const conditions: any[] = [
      inArray(dbSchema.leads.sheet_id, sheetIds),
      isNull(dbSchema.leads.deleted_at)
    ];
    
    // Add filter conditions
    for (const [key, value] of Object.entries(safeFilters)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Handle thought filter (meta field)
      if (key === 'thought' && typeof value === 'string') {
        conditions.push(sql`${dbSchema.leads.meta}->>'thought' = ${value}`);
        continue;
      }
      
      // Handle search filter (search across all custom_fields)
      if (key === 'search' && typeof value === 'string') {
        const searchTerm = '%' + value + '%';
        conditions.push(sql`${dbSchema.leads.custom_fields}::text ILIKE ${searchTerm}`);
        continue;
      }
      
      // Handle date range filters (object with from/to)
      if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
        const dateFilter = value as { from: string; to: string; type?: string };
        if (dateFilter.from && dateFilter.to) {
          // Handle created_at and attended_at as native columns on leads table - convert to company timezone before comparing dates
          // Note: These are stored as "timestamp without time zone" but contain UTC values
          // We must first interpret them as UTC, then convert to company timezone
          if (key === 'created_at') {
            conditions.push(sql`(${dbSchema.leads.created_at} AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date >= ${dateFilter.from}::date`);
            conditions.push(sql`(${dbSchema.leads.created_at} AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date <= ${dateFilter.to}::date`);
          } else if (key === 'attended_at') {
            // attended_at can be null, only filter non-null values
            conditions.push(sql`${dbSchema.leads.attended_at} IS NOT NULL`);
            conditions.push(sql`(${dbSchema.leads.attended_at} AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date >= ${dateFilter.from}::date`);
            conditions.push(sql`(${dbSchema.leads.attended_at} AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date <= ${dateFilter.to}::date`);
          } else {
            conditions.push(sql`(${dbSchema.leads.custom_fields}->>${key})::date >= ${dateFilter.from}::date`);
            conditions.push(sql`(${dbSchema.leads.custom_fields}->>${key})::date <= ${dateFilter.to}::date`);
          }
        }
      }
      // Handle dropdown exact match (object with exactMatch flag)
      else if (typeof value === 'object' && value !== null && 'exactMatch' in value) {
        const exactFilter = value as { value: string; exactMatch: boolean };
        conditions.push(sql`${dbSchema.leads.custom_fields}->>${key} = ${exactFilter.value}`);
      }
      // Handle simple string filter (substring match)
      else if (typeof value === 'string') {
        conditions.push(sql`${dbSchema.leads.custom_fields}->>${key} ILIKE ${'%' + value + '%'}`);
      } 
      // Handle other values as exact match
      else {
        conditions.push(sql`${dbSchema.leads.custom_fields}->>${key} = ${String(value)}`);
      }
    }
    
    // Add quick filter conditions with proper OR/AND logic
    if (quickFilter && quickFilter.conditions && quickFilter.conditions.length > 0) {
      const quickFilterConditions: any[] = [];
      
      // Helper to resolve relative date to actual date string (YYYY-MM-DD)
      const resolveRelativeDate = (relativeDate: string): string => {
        const now = new Date();
        // Convert to timezone-aware date
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const parts = formatter.formatToParts(now);
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
        const today = new Date(year, month, day);
        
        switch (relativeDate) {
          case 'today':
            return today.toISOString().split('T')[0];
          case 'tomorrow': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
          }
          case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
          }
          case 'this_week': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            return startOfWeek.toISOString().split('T')[0];
          }
          case 'last_week': {
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            return lastWeekStart.toISOString().split('T')[0];
          }
          case 'this_month': {
            return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          }
          case 'last_month': {
            return new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
          }
          default:
            return today.toISOString().split('T')[0];
        }
      };
      
      for (const condition of quickFilter.conditions) {
        const { column_key, operator, value, relative_date } = condition;
        
        // Resolve target date for comparison
        const targetDate = relative_date ? resolveRelativeDate(relative_date) : (value || '');
        
        switch (operator) {
          case 'is_empty':
            quickFilterConditions.push(
              sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NULL OR ${dbSchema.leads.custom_fields}->>${column_key} = '')`
            );
            break;
            
          case 'is_not_empty':
            quickFilterConditions.push(
              sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NOT NULL AND ${dbSchema.leads.custom_fields}->>${column_key} != '')`
            );
            break;
            
          case 'date_before':
          case 'before':
            // Date is strictly before the target date
            quickFilterConditions.push(
              sql`(${dbSchema.leads.custom_fields}->>${column_key})::date < ${targetDate}::date`
            );
            break;
            
          case 'date_after':
          case 'after':
            // Date is strictly after the target date
            quickFilterConditions.push(
              sql`(${dbSchema.leads.custom_fields}->>${column_key})::date > ${targetDate}::date`
            );
            break;
            
          case 'date_equals':
          case 'equals':
            if (relative_date || (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
              // Date comparison
              quickFilterConditions.push(
                sql`(${dbSchema.leads.custom_fields}->>${column_key})::date = ${targetDate}::date`
              );
            } else {
              // String comparison
              quickFilterConditions.push(
                sql`${dbSchema.leads.custom_fields}->>${column_key} = ${value}`
              );
            }
            break;
            
          case 'contains':
            quickFilterConditions.push(
              sql`${dbSchema.leads.custom_fields}->>${column_key} ILIKE ${'%' + value + '%'}`
            );
            break;
            
          case 'not_contains':
            quickFilterConditions.push(
              sql`${dbSchema.leads.custom_fields}->>${column_key} NOT ILIKE ${'%' + value + '%'}`
            );
            break;
            
          case 'in':
            if (Array.isArray(value) && value.length > 0) {
              quickFilterConditions.push(
                sql`${dbSchema.leads.custom_fields}->>${column_key} = ANY(${value})`
              );
            }
            break;
            
          default:
            // For unknown operators, try basic equals
            if (value !== undefined && value !== null) {
              quickFilterConditions.push(
                sql`${dbSchema.leads.custom_fields}->>${column_key} = ${String(value)}`
              );
            }
        }
      }
      
      // Combine quick filter conditions with specified logic
      if (quickFilterConditions.length > 0) {
        if (quickFilter.logical_operator === 'or') {
          conditions.push(or(...quickFilterConditions));
        } else {
          conditions.push(and(...quickFilterConditions));
        }
      }
    }
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(dbSchema.leads)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    // Build order clause
    let orderClause;
    if (sortBy === 'created_at') {
      orderClause = sortOrder === 'asc' 
        ? asc(dbSchema.leads.created_at) 
        : desc(dbSchema.leads.created_at);
    } else if (sortBy === 'updated_at') {
      orderClause = sortOrder === 'asc' 
        ? asc(dbSchema.leads.updated_at) 
        : desc(dbSchema.leads.updated_at);
    } else if (sortBy) {
      orderClause = sortOrder === 'asc'
        ? asc(sql`${dbSchema.leads.custom_fields}->>${sortBy}`)
        : desc(sql`${dbSchema.leads.custom_fields}->>${sortBy}`);
    } else {
      orderClause = desc(dbSchema.leads.created_at);
    }
    
    // Fetch paginated results
    const result = await db
      .select()
      .from(dbSchema.leads)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);
    
    return {
      leads: result.map(this.mapLead),
      total,
      page,
      limit,
      totalPages,
    };
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

  async findLeadByMobileNo(companyId: string, mobileNo: string, fieldName: string = 'mobile_no', includeDeleted: boolean = false): Promise<Lead | undefined> {
    // Find lead by mobile number in the specified field across all sheets in the company
    // By default excludes soft-deleted leads so they don't block new lead creation
    // Set includeDeleted=true to also search deleted leads (for update-only webhook flows)
    // Uses normalized comparison: strips spaces, dashes, +, (), and takes last 10 digits
    // This matches leads regardless of how the mobile number was formatted when stored
    // Cast json to jsonb for jsonb_extract_path_text function
    const conditions = [
      eq(dbSchema.sheets.company_id, companyId),
      sql`RIGHT(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(jsonb_extract_path_text(${dbSchema.leads.custom_fields}::jsonb, ${fieldName}), ''), '[\\s\\-\\+\\(\\)]', '', 'g'), '^91', ''), 10) = ${mobileNo}`
    ];
    
    if (!includeDeleted) {
      conditions.push(isNull(dbSchema.leads.deleted_at));
    }
    
    const result = await db
      .select({
        lead: dbSchema.leads,
      })
      .from(dbSchema.leads)
      .innerJoin(dbSchema.sheets, eq(dbSchema.leads.sheet_id, dbSchema.sheets.id))
      .where(and(...conditions))
      .limit(1);
    
    if (result.length === 0) return undefined;
    return this.mapLead(result[0].lead);
  }

  async findLeadByField(companyId: string, fieldKey: string, fieldValue: string, includeDeleted: boolean = false): Promise<Lead | undefined> {
    // Find lead by any custom field across all sheets in the company
    // By default excludes soft-deleted leads so they don't block new lead creation
    // Set includeDeleted=true to also search deleted leads (for update-only webhook flows)
    // Use jsonb_extract_path_text for proper key parameterization
    // Cast json to jsonb for jsonb_extract_path_text function
    const conditions = [
      eq(dbSchema.sheets.company_id, companyId),
      sql`jsonb_extract_path_text(${dbSchema.leads.custom_fields}::jsonb, ${fieldKey}) = ${fieldValue}`
    ];
    
    if (!includeDeleted) {
      conditions.push(isNull(dbSchema.leads.deleted_at));
    }
    
    const result = await db
      .select({
        lead: dbSchema.leads,
      })
      .from(dbSchema.leads)
      .innerJoin(dbSchema.sheets, eq(dbSchema.leads.sheet_id, dbSchema.sheets.id))
      .where(and(...conditions))
      .limit(1);
    
    if (result.length === 0) return undefined;
    return this.mapLead(result[0].lead);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date();
    // Use provided created_at (e.g., from webhook form submission time) or fall back to system time
    let createdAt = now;
    if (lead.created_at) {
      try {
        const parsedDate = new Date(lead.created_at);
        if (!isNaN(parsedDate.getTime())) {
          createdAt = parsedDate;
        }
      } catch (e) {
        // If parsing fails, use system time as fallback
        console.log('Failed to parse provided created_at, using system time:', lead.created_at);
      }
    }
    const newLead = {
      id,
      sheet_id: lead.sheet_id,
      owner_user_id: lead.owner_user_id || '',
      custom_fields: lead.custom_fields || {},
      meta: lead.meta || {},
      created_at: createdAt,
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

  async markLeadAttended(leadId: string, userId: string): Promise<boolean> {
    // Only set attended_at/by if BOTH are not already set (first-write-wins)
    // Using a conditional update to avoid race conditions
    const result = await db.update(dbSchema.leads)
      .set({
        attended_at: new Date(),
        attended_by_user_id: userId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(dbSchema.leads.id, leadId),
          isNull(dbSchema.leads.attended_at),
          isNull(dbSchema.leads.attended_by_user_id)
        )
      );
    return true;
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
        sql`${dbSchema.leads.deleted_at} < ${thirtyDaysAgo}`
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

  async getDropdownOptionById(id: string): Promise<DropdownOption | undefined> {
    const result = await db.select().from(dbSchema.dropdown_options).where(eq(dbSchema.dropdown_options.id, id));
    if (result.length === 0) return undefined;
    return this.mapDropdownOption(result[0]);
  }

  async createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption> {
    const id = randomUUID();
    const now = new Date();
    const newOption = {
      id,
      ...option,
      is_system: option.is_system ?? false,
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
        sql`(${dbSchema.custom_columns.sheet_id} = ${sheetId} OR ${dbSchema.custom_columns.sheet_id} IS NULL)`
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
      is_system: column.is_system ?? false,
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

  // Highlighting Rules (Row Highlighting based on Conditions)
  private mapHighlightingRule(row: any): HighlightingRule {
    return {
      id: row.id,
      company_id: row.company_id,
      sheet_id: row.sheet_id,
      name: row.name,
      conditions: row.conditions || [],
      logical_operator: row.logical_operator || 'and',
      row_color: row.row_color,
      priority: row.priority || 0,
      is_active: row.is_active ?? true,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  async getHighlightingRules(sheetId: string): Promise<HighlightingRule[]> {
    const result = await db.select()
      .from(dbSchema.highlighting_rules)
      .where(and(
        eq(dbSchema.highlighting_rules.sheet_id, sheetId),
        eq(dbSchema.highlighting_rules.is_active, true)
      ))
      .orderBy(dbSchema.highlighting_rules.priority);
    return result.map(this.mapHighlightingRule);
  }

  async getHighlightingRuleById(id: string): Promise<HighlightingRule | undefined> {
    const result = await db.select().from(dbSchema.highlighting_rules).where(eq(dbSchema.highlighting_rules.id, id));
    if (result.length === 0) return undefined;
    return this.mapHighlightingRule(result[0]);
  }

  async createHighlightingRule(rule: InsertHighlightingRule): Promise<HighlightingRule> {
    const id = randomUUID();
    const now = new Date();
    const newRule = {
      id,
      ...rule,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.highlighting_rules).values(newRule);
    return this.mapHighlightingRule(newRule as any);
  }

  async updateHighlightingRule(id: string, updates: Partial<HighlightingRule>): Promise<HighlightingRule | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.highlighting_rules).set(convertedUpdates).where(eq(dbSchema.highlighting_rules.id, id));
    return this.getHighlightingRuleById(id);
  }

  async deleteHighlightingRule(id: string): Promise<boolean> {
    await db.delete(dbSchema.highlighting_rules).where(eq(dbSchema.highlighting_rules.id, id));
    return true;
  }

  async reorderHighlightingRules(sheetId: string, ruleIds: string[]): Promise<boolean> {
    for (let i = 0; i < ruleIds.length; i++) {
      await db.update(dbSchema.highlighting_rules)
        .set({ priority: i, updated_at: new Date() })
        .where(and(
          eq(dbSchema.highlighting_rules.id, ruleIds[i]),
          eq(dbSchema.highlighting_rules.sheet_id, sheetId)
        ));
    }
    return true;
  }

  async getGlobalHighlightingRules(companyId: string): Promise<HighlightingRule[]> {
    const result = await db.select()
      .from(dbSchema.highlighting_rules)
      .where(and(
        eq(dbSchema.highlighting_rules.company_id, companyId),
        isNull(dbSchema.highlighting_rules.sheet_id)
      ))
      .orderBy(dbSchema.highlighting_rules.priority);
    return result.map(this.mapHighlightingRule);
  }

  async reorderGlobalHighlightingRules(companyId: string, ruleIds: string[]): Promise<boolean> {
    for (let i = 0; i < ruleIds.length; i++) {
      await db.update(dbSchema.highlighting_rules)
        .set({ priority: i, updated_at: new Date() })
        .where(and(
          eq(dbSchema.highlighting_rules.id, ruleIds[i]),
          eq(dbSchema.highlighting_rules.company_id, companyId),
          isNull(dbSchema.highlighting_rules.sheet_id)
        ));
    }
    return true;
  }

  // Hot Lead Configuration
  private mapHotLeadConfig(record: HotLeadConfigRecord): HotLeadConfig {
    return {
      id: record.id,
      company_id: record.company_id,
      conditions: (record.conditions as any) || [],
      logical_operator: (record.logical_operator as "and" | "or") || "or",
      is_active: record.is_active,
      created_by_user_id: record.created_by_user_id,
      created_at: record.created_at?.toISOString() || new Date().toISOString(),
      updated_at: record.updated_at?.toISOString() || new Date().toISOString(),
    };
  }

  async getHotLeadConfig(companyId: string): Promise<HotLeadConfig | undefined> {
    const result = await db.select()
      .from(dbSchema.hot_lead_config)
      .where(eq(dbSchema.hot_lead_config.company_id, companyId))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapHotLeadConfig(result[0]);
  }

  async createHotLeadConfig(config: InsertHotLeadConfig): Promise<HotLeadConfig> {
    const id = randomUUID();
    const now = new Date();
    const newConfig = {
      id,
      company_id: config.company_id,
      conditions: config.conditions || [],
      logical_operator: config.logical_operator || "or",
      is_active: config.is_active ?? true,
      created_by_user_id: config.created_by_user_id || null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.hot_lead_config).values(newConfig);
    return this.mapHotLeadConfig(newConfig as any);
  }

  async updateHotLeadConfig(id: string, updates: Partial<HotLeadConfig>): Promise<HotLeadConfig | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.hot_lead_config)
      .set(convertedUpdates)
      .where(eq(dbSchema.hot_lead_config.id, id));
    const result = await db.select()
      .from(dbSchema.hot_lead_config)
      .where(eq(dbSchema.hot_lead_config.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapHotLeadConfig(result[0]);
  }

  // Custom Views (Industry-specific sidebar menu items)
  private mapCustomView(record: CustomViewRecord): CustomView {
    return {
      id: record.id,
      company_id: record.company_id,
      name: record.name,
      icon: record.icon as any,
      icon_color: record.icon_color as any,
      show_badge: record.show_badge,
      conditions: (record.conditions as any) || [],
      sheet_ids: (record as any).sheet_ids ?? null,
      is_enabled: record.is_enabled,
      order_index: record.order_index,
      created_by_user_id: record.created_by_user_id,
      created_at: record.created_at?.toISOString() || new Date().toISOString(),
      updated_at: record.updated_at?.toISOString() || new Date().toISOString(),
    };
  }

  async getCustomViews(companyId: string): Promise<CustomView[]> {
    const result = await db.select()
      .from(dbSchema.custom_views)
      .where(eq(dbSchema.custom_views.company_id, companyId))
      .orderBy(dbSchema.custom_views.order_index);
    return result.map(r => this.mapCustomView(r));
  }

  async getCustomViewById(id: string): Promise<CustomView | undefined> {
    const result = await db.select()
      .from(dbSchema.custom_views)
      .where(eq(dbSchema.custom_views.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapCustomView(result[0]);
  }

  async createCustomView(view: InsertCustomView): Promise<CustomView> {
    const id = randomUUID();
    const now = new Date();
    const newView = {
      id,
      company_id: view.company_id,
      name: view.name,
      icon: view.icon || "star",
      icon_color: view.icon_color || "blue",
      show_badge: view.show_badge ?? true,
      conditions: view.conditions || [],
      sheet_ids: view.sheet_ids ?? null,
      is_enabled: view.is_enabled ?? true,
      order_index: view.order_index ?? 0,
      created_by_user_id: view.created_by_user_id || null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.custom_views).values(newView);
    return this.mapCustomView(newView as any);
  }

  async updateCustomView(id: string, updates: Partial<CustomView>): Promise<CustomView | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.custom_views)
      .set(convertedUpdates)
      .where(eq(dbSchema.custom_views.id, id));
    const result = await db.select()
      .from(dbSchema.custom_views)
      .where(eq(dbSchema.custom_views.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapCustomView(result[0]);
  }

  async deleteCustomView(id: string): Promise<boolean> {
    await db.delete(dbSchema.custom_views).where(eq(dbSchema.custom_views.id, id));
    return true;
  }

  async reorderCustomViews(companyId: string, viewIds: string[]): Promise<boolean> {
    for (let i = 0; i < viewIds.length; i++) {
      await db.update(dbSchema.custom_views)
        .set({ order_index: i, updated_at: new Date() })
        .where(and(
          eq(dbSchema.custom_views.id, viewIds[i]),
          eq(dbSchema.custom_views.company_id, companyId)
        ));
    }
    return true;
  }

  // Quick Filters (Company-wide Quick Filters)
  async getQuickFilters(companyId: string): Promise<QuickFilter[]> {
    const result = await db.select()
      .from(dbSchema.quick_filters)
      .where(eq(dbSchema.quick_filters.company_id, companyId))
      .orderBy(dbSchema.quick_filters.order_index);
    return result.map(this.mapQuickFilter);
  }

  async getQuickFilterById(id: string): Promise<QuickFilter | undefined> {
    const result = await db.select().from(dbSchema.quick_filters).where(eq(dbSchema.quick_filters.id, id));
    if (result.length === 0) return undefined;
    return this.mapQuickFilter(result[0]);
  }

  async createQuickFilter(filter: InsertQuickFilter): Promise<QuickFilter> {
    const id = randomUUID();
    const now = new Date();
    const newFilter = {
      id,
      ...filter,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.quick_filters).values(newFilter);
    return this.mapQuickFilter(newFilter as any);
  }

  async updateQuickFilter(id: string, updates: Partial<QuickFilter>): Promise<QuickFilter | undefined> {
    const updated_at = new Date();
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    if (updates.updated_at && typeof updates.updated_at === 'string') {
      convertedUpdates.updated_at = new Date(updates.updated_at);
    }
    convertedUpdates.updated_at = updated_at;
    await db.update(dbSchema.quick_filters).set(convertedUpdates).where(eq(dbSchema.quick_filters.id, id));
    return this.getQuickFilterById(id);
  }

  async deleteQuickFilter(id: string): Promise<boolean> {
    await db.delete(dbSchema.quick_filters).where(eq(dbSchema.quick_filters.id, id));
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

  async getLeadUpdatesBySheetId(sheetId: string): Promise<LeadUpdate[]> {
    const result = await db
      .select({
        lead_update: dbSchema.lead_updates,
        user: {
          name: dbSchema.users.name,
        },
      })
      .from(dbSchema.lead_updates)
      .innerJoin(dbSchema.leads, eq(dbSchema.lead_updates.lead_id, dbSchema.leads.id))
      .leftJoin(dbSchema.users, eq(dbSchema.lead_updates.created_by_user_id, dbSchema.users.id))
      .where(eq(dbSchema.leads.sheet_id, sheetId))
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
      attended_at: row.attended_at?.toISOString() || row.attended_at || null,
      attended_by_user_id: row.attended_by_user_id || null,
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

  private mapQuickFilter(row: any): QuickFilter {
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

  async getWebhookRequest(id: string): Promise<WebhookRequest | undefined> {
    const result = await db.select().from(dbSchema.webhook_requests).where(eq(dbSchema.webhook_requests.id, id));
    if (result.length === 0) return undefined;
    return this.mapWebhookRequest(result[0]);
  }

  async updateWebhookRequest(id: string, updates: Partial<WebhookRequest>): Promise<WebhookRequest | undefined> {
    const convertedUpdates: any = { ...updates };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.webhook_requests).set(convertedUpdates).where(eq(dbSchema.webhook_requests.id, id));
    const result = await db.select().from(dbSchema.webhook_requests).where(eq(dbSchema.webhook_requests.id, id));
    if (result.length === 0) return undefined;
    return this.mapWebhookRequest(result[0]);
  }

  // Outgoing Webhooks
  async getOutgoingWebhook(id: string): Promise<OutgoingWebhook | undefined> {
    const result = await db.select().from(dbSchema.outgoing_webhooks).where(eq(dbSchema.outgoing_webhooks.id, id));
    if (result.length === 0) return undefined;
    return this.mapOutgoingWebhook(result[0]);
  }

  async getOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]> {
    const result = await db.select().from(dbSchema.outgoing_webhooks)
      .where(eq(dbSchema.outgoing_webhooks.company_id, companyId))
      .orderBy(desc(dbSchema.outgoing_webhooks.created_at));
    return result.map(this.mapOutgoingWebhook.bind(this));
  }

  async getActiveOutgoingWebhooksByCompanyId(companyId: string): Promise<OutgoingWebhook[]> {
    const result = await db.select().from(dbSchema.outgoing_webhooks)
      .where(and(
        eq(dbSchema.outgoing_webhooks.company_id, companyId),
        eq(dbSchema.outgoing_webhooks.is_active, true)
      ))
      .orderBy(desc(dbSchema.outgoing_webhooks.created_at));
    return result.map(this.mapOutgoingWebhook.bind(this));
  }

  async createOutgoingWebhook(webhook: InsertOutgoingWebhook): Promise<OutgoingWebhook> {
    const id = randomUUID();
    const now = new Date();
    const newWebhook = {
      id,
      ...webhook,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.outgoing_webhooks).values(newWebhook);
    return this.mapOutgoingWebhook(newWebhook as any);
  }

  async updateOutgoingWebhook(id: string, updates: Partial<OutgoingWebhook>): Promise<OutgoingWebhook | undefined> {
    const now = new Date();
    const convertedUpdates: any = { ...updates, updated_at: now };
    if (updates.created_at && typeof updates.created_at === 'string') {
      convertedUpdates.created_at = new Date(updates.created_at);
    }
    await db.update(dbSchema.outgoing_webhooks).set(convertedUpdates).where(eq(dbSchema.outgoing_webhooks.id, id));
    const result = await db.select().from(dbSchema.outgoing_webhooks).where(eq(dbSchema.outgoing_webhooks.id, id));
    if (result.length === 0) return undefined;
    return this.mapOutgoingWebhook(result[0]);
  }

  async deleteOutgoingWebhook(id: string): Promise<boolean> {
    await db.delete(dbSchema.outgoing_webhooks).where(eq(dbSchema.outgoing_webhooks.id, id));
    return true;
  }

  // Outgoing Webhook Logs
  async getOutgoingWebhookLogs(webhookId: string, limit: number = 100): Promise<OutgoingWebhookLog[]> {
    const result = await db.select().from(dbSchema.outgoing_webhook_logs)
      .where(eq(dbSchema.outgoing_webhook_logs.webhook_id, webhookId))
      .orderBy(desc(dbSchema.outgoing_webhook_logs.created_at))
      .limit(limit);
    return result.map(this.mapOutgoingWebhookLog.bind(this));
  }

  async getOutgoingWebhookLogsByCompanyId(companyId: string, limit: number = 100): Promise<OutgoingWebhookLog[]> {
    const result = await db
      .select({ log: dbSchema.outgoing_webhook_logs })
      .from(dbSchema.outgoing_webhook_logs)
      .innerJoin(dbSchema.outgoing_webhooks, eq(dbSchema.outgoing_webhook_logs.webhook_id, dbSchema.outgoing_webhooks.id))
      .where(eq(dbSchema.outgoing_webhooks.company_id, companyId))
      .orderBy(desc(dbSchema.outgoing_webhook_logs.created_at))
      .limit(limit);
    return result.map((row) => this.mapOutgoingWebhookLog(row.log));
  }

  async createOutgoingWebhookLog(log: InsertOutgoingWebhookLog): Promise<OutgoingWebhookLog> {
    const id = randomUUID();
    const now = new Date();
    const newLog = {
      id,
      ...log,
      created_at: now,
    };
    await db.insert(dbSchema.outgoing_webhook_logs).values(newLog);
    return this.mapOutgoingWebhookLog(newLog as any);
  }

  // Lead Search for Webhook Matching
  async findLeadsByFieldValue(companyId: string, fieldKey: string, value: string): Promise<Lead[]> {
    // First, get all sheets for this company
    const sheets = await db.select().from(dbSchema.sheets)
      .where(and(
        eq(dbSchema.sheets.company_id, companyId),
        isNull(dbSchema.sheets.deleted_at)
      ));
    
    if (sheets.length === 0) return [];
    const sheetIds = sheets.map(s => s.id);

    // Get all leads from these sheets that are not deleted
    const leads = await db.select().from(dbSchema.leads)
      .where(and(
        inArray(dbSchema.leads.sheet_id, sheetIds),
        isNull(dbSchema.leads.deleted_at)
      ));

    // Filter leads where custom_fields[fieldKey] matches value
    // Normalize phone numbers for matching
    const normalizedValue = value.replace(/[\s\-\+]/g, '');
    
    return leads
      .filter(lead => {
        const fieldValue = lead.custom_fields?.[fieldKey];
        if (!fieldValue) return false;
        
        // Normalize for phone number matching
        const normalizedFieldValue = String(fieldValue).replace(/[\s\-\+]/g, '');
        return normalizedFieldValue === normalizedValue || 
               normalizedFieldValue.endsWith(normalizedValue) ||
               normalizedValue.endsWith(normalizedFieldValue);
      })
      .map(this.mapLead.bind(this));
  }

  // Mapping functions for outgoing webhooks
  private mapOutgoingWebhook(row: any): OutgoingWebhook {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapOutgoingWebhookLog(row: any): OutgoingWebhookLog {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
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

  // Reports
  async getReport(id: string): Promise<Report | undefined> {
    const result = await db.select().from(dbSchema.reports).where(eq(dbSchema.reports.id, id)).limit(1);
    return result.length > 0 ? this.mapReport(result[0]) : undefined;
  }

  async getReportsByCompanyId(companyId: string): Promise<Report[]> {
    const result = await db.select().from(dbSchema.reports).where(eq(dbSchema.reports.company_id, companyId)).orderBy(desc(dbSchema.reports.created_at));
    return result.map(this.mapReport.bind(this));
  }

  async getReportsBySheetIds(sheetIds: string[]): Promise<Report[]> {
    if (sheetIds.length === 0) return [];
    // Find reports where sheet_ids array contains any of the provided sheetIds
    const result = await db.select().from(dbSchema.reports).orderBy(desc(dbSchema.reports.created_at));
    // Filter in-memory for array overlap
    return result
      .filter(report => {
        const reportSheetIds = Array.isArray(report.sheet_ids) ? report.sheet_ids : [];
        return reportSheetIds.some(sheetId => sheetIds.includes(sheetId));
      })
      .map(this.mapReport.bind(this));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = randomUUID();
    const now = new Date();
    const newReport = {
      id,
      ...report,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.reports).values(newReport);
    return this.mapReport(newReport as any);
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const now = new Date();
    await db.update(dbSchema.reports)
      .set({ ...updates, updated_at: now })
      .where(eq(dbSchema.reports.id, id));
    return this.getReport(id);
  }

  async deleteReport(id: string): Promise<boolean> {
    await db.delete(dbSchema.reports).where(eq(dbSchema.reports.id, id));
    return true;
  }

  // User Column Preferences
  async getUserColumnPreferences(userId: string, sheetId: string): Promise<UserColumnPreference[]> {
    const result = await db.select()
      .from(dbSchema.userColumnPreferences)
      .where(and(
        eq(dbSchema.userColumnPreferences.user_id, userId),
        eq(dbSchema.userColumnPreferences.sheet_id, sheetId)
      ));
    return result.map(this.mapUserColumnPreference.bind(this));
  }

  async saveUserColumnPreferences(userId: string, sheetId: string, preferences: Array<{column_key: string, width: number}>): Promise<void> {
    // Delete existing preferences for this user+sheet combo
    await db.delete(dbSchema.userColumnPreferences)
      .where(and(
        eq(dbSchema.userColumnPreferences.user_id, userId),
        eq(dbSchema.userColumnPreferences.sheet_id, sheetId)
      ));

    // Insert new preferences
    if (preferences.length > 0) {
      const now = new Date();
      await db.insert(dbSchema.userColumnPreferences).values(
        preferences.map(pref => ({
          id: randomUUID(),
          user_id: userId,
          sheet_id: sheetId,
          column_key: pref.column_key,
          width: pref.width,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  }

  // Push Subscriptions
  async getPushSubscription(userId: string, endpoint: string): Promise<PushSubscription | undefined> {
    const result = await db.select().from(dbSchema.pushSubscriptions)
      .where(and(
        eq(dbSchema.pushSubscriptions.user_id, userId),
        eq(dbSchema.pushSubscriptions.endpoint, endpoint)
      ));
    if (result.length === 0) return undefined;
    return this.mapPushSubscription(result[0]);
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    const result = await db.select().from(dbSchema.pushSubscriptions)
      .where(eq(dbSchema.pushSubscriptions.user_id, userId));
    return result.map(this.mapPushSubscription.bind(this));
  }

  async getPushSubscriptionsByCompanyId(companyId: string): Promise<PushSubscription[]> {
    const result = await db.select().from(dbSchema.pushSubscriptions)
      .where(eq(dbSchema.pushSubscriptions.company_id, companyId));
    return result.map(this.mapPushSubscription.bind(this));
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = randomUUID();
    const now = new Date();
    const newSub = {
      id,
      user_id: subscription.user_id,
      company_id: subscription.company_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      device_type: subscription.device_type ?? null,
      user_agent: subscription.user_agent ?? null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.pushSubscriptions).values(newSub);
    return this.mapPushSubscription(newSub as any);
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    await db.delete(dbSchema.pushSubscriptions)
      .where(and(
        eq(dbSchema.pushSubscriptions.user_id, userId),
        eq(dbSchema.pushSubscriptions.endpoint, endpoint)
      ));
    return true;
  }

  async deletePushSubscriptionsByUserId(userId: string): Promise<boolean> {
    await db.delete(dbSchema.pushSubscriptions)
      .where(eq(dbSchema.pushSubscriptions.user_id, userId));
    return true;
  }

  private mapPushSubscription(row: any): PushSubscription {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapReport(row: any): Report {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  private mapUserColumnPreference(row: any): UserColumnPreference {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // ATTENDANCE ENTRIES
  // ============================================================================
  async getAttendanceEntry(id: string): Promise<AttendanceEntryRecord | undefined> {
    const result = await db.select().from(dbSchema.attendanceEntries)
      .where(eq(dbSchema.attendanceEntries.id, id));
    if (result.length === 0) return undefined;
    return this.mapAttendanceEntry(result[0]);
  }

  async getTodayAttendanceEntry(userId: string): Promise<AttendanceEntryRecord | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.select().from(dbSchema.attendanceEntries)
      .where(and(
        eq(dbSchema.attendanceEntries.user_id, userId),
        gte(dbSchema.attendanceEntries.entry_time, today),
        lte(dbSchema.attendanceEntries.entry_time, tomorrow)
      ))
      .orderBy(desc(dbSchema.attendanceEntries.entry_time))
      .limit(1);
    
    if (result.length === 0) return undefined;
    return this.mapAttendanceEntry(result[0]);
  }

  async getAttendanceEntriesByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]> {
    let conditions = [eq(dbSchema.attendanceEntries.user_id, userId)];
    
    if (startDate) {
      conditions.push(gte(dbSchema.attendanceEntries.entry_time, startDate));
    }
    if (endDate) {
      conditions.push(lte(dbSchema.attendanceEntries.entry_time, endDate));
    }
    
    const result = await db.select().from(dbSchema.attendanceEntries)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.attendanceEntries.entry_time));
    return result.map(this.mapAttendanceEntry.bind(this));
  }

  async getAttendanceEntriesByCompanyId(companyId: string, startDate?: Date, endDate?: Date): Promise<AttendanceEntryRecord[]> {
    let conditions = [eq(dbSchema.attendanceEntries.company_id, companyId)];
    
    if (startDate) {
      conditions.push(gte(dbSchema.attendanceEntries.entry_time, startDate));
    }
    if (endDate) {
      conditions.push(lte(dbSchema.attendanceEntries.entry_time, endDate));
    }
    
    const result = await db.select().from(dbSchema.attendanceEntries)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.attendanceEntries.entry_time));
    return result.map(this.mapAttendanceEntry.bind(this));
  }

  async getPendingForceExitsByCompanyId(companyId: string): Promise<AttendanceEntryRecord[]> {
    const result = await db.select().from(dbSchema.attendanceEntries)
      .where(and(
        eq(dbSchema.attendanceEntries.company_id, companyId),
        eq(dbSchema.attendanceEntries.exit_type, "forced"),
        eq(dbSchema.attendanceEntries.review_status, "pending")
      ))
      .orderBy(desc(dbSchema.attendanceEntries.exit_time));
    return result.map(this.mapAttendanceEntry.bind(this));
  }

  async createAttendanceEntry(entry: InsertAttendanceEntry): Promise<AttendanceEntryRecord> {
    const id = randomUUID();
    const now = new Date();
    const newEntry = {
      id,
      user_id: entry.user_id,
      company_id: entry.company_id,
      entry_time: entry.entry_time,
      entry_location: entry.entry_location ?? null,
      entry_selfie_url: entry.entry_selfie_url ?? null,
      exit_time: entry.exit_time ?? null,
      exit_type: entry.exit_type ?? null,
      force_exit_reason: entry.force_exit_reason ?? null,
      force_exit_blocking_reasons: entry.force_exit_blocking_reasons ?? null,
      review_status: entry.review_status ?? null,
      reviewed_by_user_id: entry.reviewed_by_user_id ?? null,
      reviewed_at: entry.reviewed_at ?? null,
      review_notes: entry.review_notes ?? null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.attendanceEntries).values(newEntry);
    return this.mapAttendanceEntry(newEntry as any);
  }

  async updateAttendanceEntry(id: string, updates: Partial<AttendanceEntryRecord>): Promise<AttendanceEntryRecord | undefined> {
    const now = new Date();
    await db.update(dbSchema.attendanceEntries)
      .set({ ...updates, updated_at: now } as any)
      .where(eq(dbSchema.attendanceEntries.id, id));
    return this.getAttendanceEntry(id);
  }

  async deleteAttendanceEntry(id: string): Promise<boolean> {
    await db.delete(dbSchema.attendanceEntries).where(eq(dbSchema.attendanceEntries.id, id));
    return true;
  }

  async cleanupOldSelfieUrls(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await db.update(dbSchema.attendanceEntries)
      .set({ entry_selfie_url: null })
      .where(and(
        isNotNull(dbSchema.attendanceEntries.entry_selfie_url),
        lte(dbSchema.attendanceEntries.entry_time, cutoffDate)
      ));
    
    return (result as any).rowCount || 0;
  }

  private mapAttendanceEntry(row: any): AttendanceEntryRecord {
    return {
      ...row,
      entry_time: row.entry_time?.toISOString() || row.entry_time,
      exit_time: row.exit_time?.toISOString() || row.exit_time,
      reviewed_at: row.reviewed_at?.toISOString() || row.reviewed_at,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // ATTENDANCE RULES
  // ============================================================================
  async getAttendanceRule(id: string): Promise<AttendanceRuleRecord | undefined> {
    const result = await db.select().from(dbSchema.attendanceRules)
      .where(eq(dbSchema.attendanceRules.id, id));
    if (result.length === 0) return undefined;
    return this.mapAttendanceRule(result[0]);
  }

  async getAttendanceRulesByCompanyId(companyId: string): Promise<AttendanceRuleRecord[]> {
    const result = await db.select().from(dbSchema.attendanceRules)
      .where(eq(dbSchema.attendanceRules.company_id, companyId));
    return result.map(this.mapAttendanceRule.bind(this));
  }

  async createAttendanceRule(rule: InsertAttendanceRule): Promise<AttendanceRuleRecord> {
    const id = randomUUID();
    const now = new Date();
    const newRule = {
      id,
      company_id: rule.company_id,
      rule_type: rule.rule_type,
      name: rule.name,
      description: rule.description ?? null,
      is_enabled: rule.is_enabled ?? true,
      config: rule.config ?? {},
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.attendanceRules).values(newRule);
    return this.mapAttendanceRule(newRule as any);
  }

  async updateAttendanceRule(id: string, updates: Partial<AttendanceRuleRecord>): Promise<AttendanceRuleRecord | undefined> {
    const now = new Date();
    await db.update(dbSchema.attendanceRules)
      .set({ ...updates, updated_at: now } as any)
      .where(eq(dbSchema.attendanceRules.id, id));
    return this.getAttendanceRule(id);
  }

  async deleteAttendanceRule(id: string): Promise<boolean> {
    await db.delete(dbSchema.attendanceRules).where(eq(dbSchema.attendanceRules.id, id));
    return true;
  }

  private mapAttendanceRule(row: any): AttendanceRuleRecord {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // TASKS
  // ============================================================================
  async getTask(id: string): Promise<TaskRecord | undefined> {
    const result = await db.select().from(dbSchema.tasks)
      .where(eq(dbSchema.tasks.id, id));
    if (result.length === 0) return undefined;
    return this.mapTask(result[0]);
  }

  async getTasksByCompanyId(companyId: string, options?: { status?: string[]; assignedTo?: string; includeCompleted?: boolean }): Promise<TaskRecord[]> {
    const conditions = [eq(dbSchema.tasks.company_id, companyId)];
    
    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(dbSchema.tasks.status, options.status));
    } else if (options?.includeCompleted === false) {
      conditions.push(inArray(dbSchema.tasks.status, ['pending', 'ongoing']));
    }
    
    if (options?.assignedTo) {
      conditions.push(eq(dbSchema.tasks.assigned_to_user_id, options.assignedTo));
    }
    
    const result = await db.select().from(dbSchema.tasks)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.tasks.due_date));
    return result.map(this.mapTask.bind(this));
  }

  async getTasksByUserId(userId: string, options?: { status?: string[]; includeCompleted?: boolean }): Promise<TaskRecord[]> {
    const conditions = [eq(dbSchema.tasks.assigned_to_user_id, userId)];
    
    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(dbSchema.tasks.status, options.status));
    } else if (options?.includeCompleted === false) {
      conditions.push(inArray(dbSchema.tasks.status, ['pending', 'ongoing']));
    }
    
    const result = await db.select().from(dbSchema.tasks)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.tasks.due_date));
    return result.map(this.mapTask.bind(this));
  }

  async getOverdueAndTodayTasks(companyId: string): Promise<TaskRecord[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const result = await db.select().from(dbSchema.tasks)
      .where(and(
        eq(dbSchema.tasks.company_id, companyId),
        inArray(dbSchema.tasks.status, ['pending', 'ongoing']),
        lte(dbSchema.tasks.due_date, today)
      ))
      .orderBy(dbSchema.tasks.due_date);
    return result.map(this.mapTask.bind(this));
  }

  async createTask(task: InsertTask): Promise<TaskRecord> {
    const id = randomUUID();
    const now = new Date();
    const newTask = {
      id,
      company_id: task.company_id,
      title: task.title,
      description: task.description ?? null,
      priority: task.priority ?? 'medium',
      start_date: task.start_date ? new Date(task.start_date as any) : null,
      due_date: task.due_date ? new Date(task.due_date as any) : null,
      status: task.status ?? 'pending',
      user_remarks: task.user_remarks ?? null,
      admin_remarks: task.admin_remarks ?? null,
      assigned_to_user_id: task.assigned_to_user_id,
      created_by_user_id: task.created_by_user_id,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.tasks).values(newTask);
    return this.mapTask(newTask as any);
  }

  async updateTask(id: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined> {
    const now = new Date();
    const updateData: any = { ...updates, updated_at: now };
    if (updates.start_date) updateData.start_date = new Date(updates.start_date as any);
    if (updates.due_date) updateData.due_date = new Date(updates.due_date as any);
    
    await db.update(dbSchema.tasks)
      .set(updateData)
      .where(eq(dbSchema.tasks.id, id));
    return this.getTask(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    await db.delete(dbSchema.tasks).where(eq(dbSchema.tasks.id, id));
    return true;
  }

  private mapTask(row: any): TaskRecord {
    return {
      ...row,
      start_date: row.start_date?.toISOString() || row.start_date,
      due_date: row.due_date?.toISOString() || row.due_date,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // TASK LEADS
  // ============================================================================
  async getTaskLeads(taskId: string): Promise<TaskLeadRecord[]> {
    const result = await db.select().from(dbSchema.taskLeads)
      .where(eq(dbSchema.taskLeads.task_id, taskId));
    return result.map(this.mapTaskLead.bind(this));
  }

  async addTaskLead(taskLead: InsertTaskLead): Promise<TaskLeadRecord> {
    const id = randomUUID();
    const now = new Date();
    const newTaskLead = {
      id,
      task_id: taskLead.task_id,
      lead_id: taskLead.lead_id,
      created_at: now,
    };
    await db.insert(dbSchema.taskLeads).values(newTaskLead);
    return this.mapTaskLead(newTaskLead as any);
  }

  async removeTaskLead(taskId: string, leadId: string): Promise<boolean> {
    await db.delete(dbSchema.taskLeads)
      .where(and(
        eq(dbSchema.taskLeads.task_id, taskId),
        eq(dbSchema.taskLeads.lead_id, leadId)
      ));
    return true;
  }

  async removeAllTaskLeads(taskId: string): Promise<boolean> {
    await db.delete(dbSchema.taskLeads)
      .where(eq(dbSchema.taskLeads.task_id, taskId));
    return true;
  }

  private mapTaskLead(row: any): TaskLeadRecord {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  // ============================================================================
  // TASK UPDATES (Activity History)
  // ============================================================================
  async getTaskUpdates(taskId: string): Promise<TaskUpdateRecord[]> {
    const result = await db.select().from(dbSchema.taskUpdates)
      .where(eq(dbSchema.taskUpdates.task_id, taskId))
      .orderBy(desc(dbSchema.taskUpdates.created_at));
    return result.map(this.mapTaskUpdate.bind(this));
  }

  async createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdateRecord> {
    const id = randomUUID();
    const now = new Date();
    const newUpdate = {
      id,
      task_id: update.task_id,
      user_id: update.user_id,
      update_type: update.update_type,
      old_value: update.old_value ?? null,
      new_value: update.new_value ?? null,
      description: update.description ?? null,
      created_at: now,
    };
    await db.insert(dbSchema.taskUpdates).values(newUpdate);
    return this.mapTaskUpdate(newUpdate as any);
  }

  private mapTaskUpdate(row: any): TaskUpdateRecord {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
    };
  }

  // ============================================================================
  // USER SHEET VIEWS (Personal Column Preferences)
  // ============================================================================
  async getUserSheetView(userId: string, sheetId: string): Promise<UserSheetViewRecord | undefined> {
    const result = await db.select().from(dbSchema.userSheetViews)
      .where(and(
        eq(dbSchema.userSheetViews.user_id, userId),
        eq(dbSchema.userSheetViews.sheet_id, sheetId)
      ));
    if (result.length === 0) return undefined;
    return this.mapUserSheetView(result[0]);
  }

  async upsertUserSheetView(userId: string, sheetId: string, columnOrder: string[], hiddenColumns: string[]): Promise<UserSheetViewRecord> {
    const now = new Date();
    const existing = await this.getUserSheetView(userId, sheetId);
    
    if (existing) {
      await db.update(dbSchema.userSheetViews)
        .set({
          column_order: columnOrder,
          hidden_columns: hiddenColumns,
          updated_at: now,
        })
        .where(and(
          eq(dbSchema.userSheetViews.user_id, userId),
          eq(dbSchema.userSheetViews.sheet_id, sheetId)
        ));
      const updated = await this.getUserSheetView(userId, sheetId);
      return updated!;
    }

    const id = randomUUID();
    const newView = {
      id,
      user_id: userId,
      sheet_id: sheetId,
      column_order: columnOrder,
      hidden_columns: hiddenColumns,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.userSheetViews).values(newView);
    return this.mapUserSheetView(newView as any);
  }

  private mapUserSheetView(row: any): UserSheetViewRecord {
    return {
      ...row,
      column_order: row.column_order || [],
      hidden_columns: row.hidden_columns || [],
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // MOBILE CALL INTEGRATION - Call Sessions
  // ============================================================================
  async getCallSession(id: string): Promise<CallSessionRecord | undefined> {
    const result = await db.select().from(dbSchema.call_sessions).where(eq(dbSchema.call_sessions.id, id));
    if (result.length === 0) return undefined;
    return this.mapCallSession(result[0]);
  }

  async getCallSessionsByUserId(userId: string, limit: number = 50): Promise<CallSessionRecord[]> {
    const result = await db.select().from(dbSchema.call_sessions)
      .where(eq(dbSchema.call_sessions.user_id, userId))
      .orderBy(desc(dbSchema.call_sessions.started_at))
      .limit(limit);
    return result.map(r => this.mapCallSession(r));
  }

  async getCallSessionsByLeadId(leadId: string, limit: number = 50): Promise<CallSessionRecord[]> {
    const result = await db.select().from(dbSchema.call_sessions)
      .where(eq(dbSchema.call_sessions.lead_id, leadId))
      .orderBy(desc(dbSchema.call_sessions.started_at))
      .limit(limit);
    return result.map(r => this.mapCallSession(r));
  }

  async getCallSessionsByCompanyId(companyId: string, limit: number = 100): Promise<CallSessionRecord[]> {
    const result = await db.select().from(dbSchema.call_sessions)
      .where(eq(dbSchema.call_sessions.company_id, companyId))
      .orderBy(desc(dbSchema.call_sessions.started_at))
      .limit(limit);
    return result.map(r => this.mapCallSession(r));
  }

  async createCallSession(session: InsertCallSession): Promise<CallSessionRecord> {
    const id = randomUUID();
    const now = new Date();
    const newSession = {
      ...session,
      id,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.call_sessions).values(newSession);
    const created = await this.getCallSession(id);
    return created!;
  }

  async updateCallSession(id: string, updates: Partial<CallSessionRecord>): Promise<CallSessionRecord | undefined> {
    const existing = await this.getCallSession(id);
    if (!existing) return undefined;
    
    await db.update(dbSchema.call_sessions)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(dbSchema.call_sessions.id, id));
    
    return this.getCallSession(id);
  }

  async deleteCallSession(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.call_sessions).where(eq(dbSchema.call_sessions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapCallSession(row: any): CallSessionRecord {
    return {
      ...row,
      started_at: row.started_at?.toISOString() || row.started_at,
      ended_at: row.ended_at?.toISOString() || row.ended_at,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // MOBILE CALL INTEGRATION - Lead Phone Index
  // ============================================================================
  async getLeadPhoneIndex(id: string): Promise<LeadPhoneIndexRecord | undefined> {
    const result = await db.select().from(dbSchema.lead_phone_index).where(eq(dbSchema.lead_phone_index.id, id));
    if (result.length === 0) return undefined;
    return this.mapLeadPhoneIndex(result[0]);
  }

  async findLeadsByPhone(companyId: string, normalizedPhone: string): Promise<LeadPhoneIndexRecord[]> {
    const result = await db.select().from(dbSchema.lead_phone_index)
      .where(and(
        eq(dbSchema.lead_phone_index.company_id, companyId),
        eq(dbSchema.lead_phone_index.normalized_phone, normalizedPhone)
      ));
    return result.map(r => this.mapLeadPhoneIndex(r));
  }

  async getPhoneIndexByLeadId(leadId: string): Promise<LeadPhoneIndexRecord[]> {
    const result = await db.select().from(dbSchema.lead_phone_index)
      .where(eq(dbSchema.lead_phone_index.lead_id, leadId));
    return result.map(r => this.mapLeadPhoneIndex(r));
  }

  async createLeadPhoneIndex(entry: InsertLeadPhoneIndex): Promise<LeadPhoneIndexRecord> {
    const id = randomUUID();
    const now = new Date();
    const newEntry = {
      ...entry,
      id,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.lead_phone_index).values(newEntry);
    const created = await this.getLeadPhoneIndex(id);
    return created!;
  }

  async deleteLeadPhoneIndexByLeadId(leadId: string): Promise<boolean> {
    await db.delete(dbSchema.lead_phone_index).where(eq(dbSchema.lead_phone_index.lead_id, leadId));
    return true;
  }

  async syncLeadPhoneIndex(leadId: string, sheetId: string, companyId: string, phoneNumbers: Array<{phone: string; type: string; isPrimary: boolean}>): Promise<void> {
    // Delete existing entries for this lead
    await this.deleteLeadPhoneIndexByLeadId(leadId);
    
    // Create new entries for each phone number
    for (const phoneInfo of phoneNumbers) {
      if (phoneInfo.phone && phoneInfo.phone.trim()) {
        await this.createLeadPhoneIndex({
          company_id: companyId,
          lead_id: leadId,
          sheet_id: sheetId,
          normalized_phone: phoneInfo.phone,
          phone_type: phoneInfo.type,
          is_primary: phoneInfo.isPrimary,
        });
      }
    }
  }

  private mapLeadPhoneIndex(row: any): LeadPhoneIndexRecord {
    return {
      ...row,
      created_at: row.created_at?.toISOString() || row.created_at,
      updated_at: row.updated_at?.toISOString() || row.updated_at,
    };
  }

  // ============================================================================
  // MOBILE CALL INTEGRATION - Enhanced Lead Lookups
  // ============================================================================
  async lookupLeadsByPhone(companyId: string, phone: string): Promise<MobileLeadLookupResult[]> {
    // Normalize phone number (keep only digits, last 10 for mobile)
    const normalizedPhone = this.normalizePhoneNumber(phone);
    
    // First, try the phone index for fast lookup
    const phoneIndexMatches = await this.findLeadsByPhone(companyId, normalizedPhone);
    
    const results: MobileLeadLookupResult[] = [];
    
    for (const indexEntry of phoneIndexMatches) {
      // Get full lead details
      const lead = await this.getLead(indexEntry.lead_id);
      if (!lead || lead.deleted_at) continue;
      
      // Get sheet info
      const sheet = await this.getSheet(indexEntry.sheet_id);
      if (!sheet) continue;
      
      // Get owner info
      const owner = await this.getUser(lead.owner_user_id);
      
      // Get lead updates
      const leadUpdates = await this.getLeadUpdates(lead.id);
      
      results.push({
        lead_id: lead.id,
        sheet_id: sheet.id,
        sheet_name: sheet.name,
        owner_user_id: lead.owner_user_id,
        owner_name: owner?.name || "Unknown",
        custom_fields: lead.custom_fields,
        lead_updates: leadUpdates,
        matched_phone: normalizedPhone,
        phone_type: indexEntry.phone_type,
      });
    }
    
    // If no matches from index, fallback to direct search in custom_fields
    if (results.length === 0) {
      const fallbackResults = await this.fallbackPhoneLookup(companyId, normalizedPhone);
      results.push(...fallbackResults);
    }
    
    return results;
  }

  private async fallbackPhoneLookup(companyId: string, normalizedPhone: string): Promise<MobileLeadLookupResult[]> {
    // Get all sheets for the company
    const sheets = await this.getSheetsByCompanyId(companyId);
    const results: MobileLeadLookupResult[] = [];
    
    for (const sheet of sheets) {
      // Get leads for this sheet - search for phone numbers in custom_fields
      // This is less efficient but serves as fallback when index isn't populated
      const leads = await db.select().from(dbSchema.leads)
        .where(and(
          eq(dbSchema.leads.sheet_id, sheet.id),
          isNull(dbSchema.leads.deleted_at)
        ));
      
      for (const lead of leads) {
        const customFields = lead.custom_fields as Record<string, any>;
        
        // Check common phone fields
        const phoneFields = ['mobile_no', 'whatsapp_no', 'alternate_mobile', 'phone', 'mobile'];
        for (const field of phoneFields) {
          const fieldValue = customFields[field];
          if (fieldValue) {
            const normalizedFieldValue = this.normalizePhoneNumber(String(fieldValue));
            if (normalizedFieldValue === normalizedPhone || normalizedPhone.endsWith(normalizedFieldValue) || normalizedFieldValue.endsWith(normalizedPhone)) {
              const owner = await this.getUser(lead.owner_user_id);
              const leadUpdates = await this.getLeadUpdates(lead.id);
              
              results.push({
                lead_id: lead.id,
                sheet_id: sheet.id,
                sheet_name: sheet.name,
                owner_user_id: lead.owner_user_id,
                owner_name: owner?.name || "Unknown",
                custom_fields: lead.custom_fields as Record<string, any>,
                lead_updates: leadUpdates,
                matched_phone: normalizedPhone,
                phone_type: field,
              });
              break; // Found match for this lead, move to next
            }
          }
        }
      }
    }
    
    return results;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If number is longer than 10 digits, take the last 10 (mobile number without country code)
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    
    return digits;
  }

  async searchCompanyLeads(companyId: string, query: string, limit: number = 20, requestingUserId?: string, requestingUserRole?: string): Promise<CompanySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const searchTerm = query.trim().toLowerCase();
    const normalizedPhone = this.normalizePhoneNumber(searchTerm);
    const isPhoneSearch = normalizedPhone.length >= 5;
    
    const results: CompanySearchResult[] = [];
    const seenLeadIds = new Set<string>();
    
    // Get all sheets for this company
    const allSheets = await this.getSheetsByCompanyId(companyId);
    
    // Get sheets the user has explicit access to (for regular users)
    let userAccessibleSheetIds: Set<string> | null = null;
    if (requestingUserId && requestingUserRole === "user") {
      const userSheetAccess = await db.select().from(dbSchema.sheet_users)
        .where(eq(dbSchema.sheet_users.user_id, requestingUserId));
      userAccessibleSheetIds = new Set(userSheetAccess.map(a => a.sheet_id));
    }
    
    // Filter sheets based on access permissions:
    // - Super admins and company admins can access all sheets
    // - Regular users can only access sheets they have explicit access to via user_sheet_access
    const sheets = allSheets.filter(sheet => {
      if (requestingUserRole === "super_admin" || requestingUserRole === "company_admin") return true;
      if (sheet.owner_id === requestingUserId) return true; // Sheet owner always has access
      if (userAccessibleSheetIds && userAccessibleSheetIds.has(sheet.id)) return true;
      return false;
    });
    
    const sheetMap = new Map(sheets.map(s => [s.id, s.name]));
    const accessibleSheetIds = new Set(sheets.map(s => s.id));
    
    // 1. First, try phone index search if it looks like a phone number
    if (isPhoneSearch) {
      const phoneIndexMatches = await db.select().from(dbSchema.lead_phone_index)
        .where(and(
          eq(dbSchema.lead_phone_index.company_id, companyId),
          sql`${dbSchema.lead_phone_index.normalized_phone} LIKE ${'%' + normalizedPhone + '%'}`
        ))
        .limit(limit);
      
      for (const indexEntry of phoneIndexMatches) {
        if (seenLeadIds.has(indexEntry.lead_id)) continue;
        
        // Skip leads from inaccessible sheets
        if (!accessibleSheetIds.has(indexEntry.sheet_id)) continue;
        
        seenLeadIds.add(indexEntry.lead_id);
        
        const lead = await this.getLead(indexEntry.lead_id);
        if (!lead || lead.deleted_at) continue;
        
        const owner = await this.getUser(lead.owner_user_id);
        const customFields = lead.custom_fields as Record<string, any>;
        
        results.push({
          lead_id: lead.id,
          sheet_id: lead.sheet_id,
          sheet_name: sheetMap.get(lead.sheet_id) || "Unknown Sheet",
          owner_user_id: lead.owner_user_id,
          owner_name: owner?.name || "Unknown",
          full_name: customFields.full_name || "",
          mobile_no: customFields.mobile_no || "",
          custom_fields: customFields,
          match_type: "phone",
        });
        
        if (results.length >= limit) break;
      }
    }
    
    // 2. Search by name in custom_fields (full_name) across all sheets
    if (results.length < limit) {
      const namePattern = `%${searchTerm}%`;
      
      for (const sheet of sheets) {
        const leads = await db.select().from(dbSchema.leads)
          .where(and(
            eq(dbSchema.leads.sheet_id, sheet.id),
            isNull(dbSchema.leads.deleted_at),
            sql`${dbSchema.leads.custom_fields}->>'full_name' ILIKE ${namePattern}`
          ))
          .limit(limit - results.length);
        
        for (const lead of leads) {
          if (seenLeadIds.has(lead.id)) continue;
          seenLeadIds.add(lead.id);
          
          const owner = await this.getUser(lead.owner_user_id);
          const customFields = lead.custom_fields as Record<string, any>;
          
          results.push({
            lead_id: lead.id,
            sheet_id: lead.sheet_id,
            sheet_name: sheetMap.get(lead.sheet_id) || "Unknown Sheet",
            owner_user_id: lead.owner_user_id,
            owner_name: owner?.name || "Unknown",
            full_name: customFields.full_name || "",
            mobile_no: customFields.mobile_no || "",
            custom_fields: customFields,
            match_type: "name",
          });
          
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
    }
    
    // 3. Fallback: search phone in custom_fields if phone index didn't find it
    if (isPhoneSearch && results.length < limit) {
      const phonePattern = `%${normalizedPhone}%`;
      
      for (const sheet of sheets) {
        const leads = await db.select().from(dbSchema.leads)
          .where(and(
            eq(dbSchema.leads.sheet_id, sheet.id),
            isNull(dbSchema.leads.deleted_at),
            sql`(
              ${dbSchema.leads.custom_fields}->>'mobile_no' LIKE ${phonePattern}
              OR ${dbSchema.leads.custom_fields}->>'whatsapp_no' LIKE ${phonePattern}
              OR ${dbSchema.leads.custom_fields}->>'alternate_mobile' LIKE ${phonePattern}
            )`
          ))
          .limit(limit - results.length);
        
        for (const lead of leads) {
          if (seenLeadIds.has(lead.id)) continue;
          seenLeadIds.add(lead.id);
          
          const owner = await this.getUser(lead.owner_user_id);
          const customFields = lead.custom_fields as Record<string, any>;
          
          results.push({
            lead_id: lead.id,
            sheet_id: lead.sheet_id,
            sheet_name: sheetMap.get(lead.sheet_id) || "Unknown Sheet",
            owner_user_id: lead.owner_user_id,
            owner_name: owner?.name || "Unknown",
            full_name: customFields.full_name || "",
            mobile_no: customFields.mobile_no || "",
            custom_fields: customFields,
            match_type: "phone",
          });
          
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }

  // ============================================================================
  // API KEYS MANAGEMENT
  // ============================================================================
  
  private mapApiKey(row: any): ApiKeyRecord {
    return {
      id: row.id,
      key_prefix: row.key_prefix,
      key_hash: row.key_hash,
      name: row.name,
      company_id: row.company_id,
      created_by: row.created_by,
      is_active: row.is_active,
      last_used_at: row.last_used_at?.toISOString() || null,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      revoked_at: row.revoked_at?.toISOString() || null,
    };
  }

  async getApiKey(id: string): Promise<ApiKeyRecord | undefined> {
    const result = await db.select().from(dbSchema.api_keys)
      .where(eq(dbSchema.api_keys.id, id));
    if (result.length === 0) return undefined;
    return this.mapApiKey(result[0]);
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | undefined> {
    const result = await db.select().from(dbSchema.api_keys)
      .where(eq(dbSchema.api_keys.key_hash, keyHash));
    if (result.length === 0) return undefined;
    return this.mapApiKey(result[0]);
  }

  async getApiKeysByCompanyId(companyId: string): Promise<ApiKeyRecord[]> {
    const result = await db.select().from(dbSchema.api_keys)
      .where(eq(dbSchema.api_keys.company_id, companyId))
      .orderBy(desc(dbSchema.api_keys.created_at));
    return result.map(r => this.mapApiKey(r));
  }

  async getAllApiKeys(): Promise<ApiKeyRecord[]> {
    const result = await db.select().from(dbSchema.api_keys)
      .orderBy(desc(dbSchema.api_keys.created_at));
    return result.map(r => this.mapApiKey(r));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKeyRecord> {
    const id = randomUUID();
    const now = new Date();
    const newKey = {
      id,
      key_prefix: apiKey.key_prefix,
      key_hash: apiKey.key_hash,
      name: apiKey.name,
      company_id: apiKey.company_id,
      created_by: apiKey.created_by,
      is_active: apiKey.is_active ?? true,
      created_at: now,
    };
    await db.insert(dbSchema.api_keys).values(newKey);
    const created = await this.getApiKey(id);
    if (!created) throw new Error("Failed to create API key");
    return created;
  }

  async revokeApiKey(id: string): Promise<ApiKeyRecord | undefined> {
    const existing = await this.getApiKey(id);
    if (!existing) return undefined;
    
    await db.update(dbSchema.api_keys)
      .set({ is_active: false, revoked_at: new Date() })
      .where(eq(dbSchema.api_keys.id, id));
    
    return this.getApiKey(id);
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(dbSchema.api_keys)
      .set({ last_used_at: new Date() })
      .where(eq(dbSchema.api_keys.id, id));
  }

  async findApiKeyByPrefix(prefix: string): Promise<ApiKeyRecord | undefined> {
    const result = await db.select().from(dbSchema.api_keys)
      .where(and(
        eq(dbSchema.api_keys.key_prefix, prefix),
        eq(dbSchema.api_keys.is_active, true)
      ));
    if (result.length === 0) return undefined;
    return this.mapApiKey(result[0]);
  }

  // =========================================================================
  // Activity Logs
  // =========================================================================
  
  private mapActivityLog(row: any): ActivityLogRecord {
    return {
      id: row.id,
      company_id: row.company_id,
      sheet_id: row.sheet_id,
      user_id: row.user_id,
      actor_name: row.actor_name,
      actor_email: row.actor_email,
      actor_role: row.actor_role,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      target_name: row.target_name,
      sheet_name: row.sheet_name,
      summary: row.summary,
      details: row.details,
      source: row.source,
      ip_address: row.ip_address,
      occurred_at: row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at),
    };
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLogRecord> {
    const id = randomUUID();
    const newLog = {
      id,
      company_id: log.company_id,
      sheet_id: log.sheet_id ?? null,
      user_id: log.user_id ?? null,
      actor_name: log.actor_name,
      actor_email: log.actor_email ?? null,
      actor_role: log.actor_role,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id ?? null,
      target_name: log.target_name ?? null,
      sheet_name: log.sheet_name ?? null,
      summary: log.summary,
      details: log.details ?? null,
      source: log.source ?? 'ui',
      ip_address: log.ip_address ?? null,
    };
    await db.insert(dbSchema.activity_logs).values(newLog);
    const result = await db.select().from(dbSchema.activity_logs).where(eq(dbSchema.activity_logs.id, id));
    if (result.length === 0) throw new Error("Failed to create activity log");
    return this.mapActivityLog(result[0]);
  }

  async getActivityLogs(filters: ActivityLogFilters): Promise<ActivityLogResponse> {
    const limit = filters.limit ?? 50;
    // Support both page and offset - page takes precedence if provided
    let offset = filters.offset ?? 0;
    let page = 1;
    if (filters.page !== undefined && filters.page > 0) {
      page = filters.page;
      offset = (page - 1) * limit;
    } else {
      page = Math.floor(offset / limit) + 1;
    }
    
    // Build conditions array
    const conditions: any[] = [];
    
    if (filters.company_id) {
      conditions.push(eq(dbSchema.activity_logs.company_id, filters.company_id));
    }
    if (filters.sheet_id) {
      conditions.push(eq(dbSchema.activity_logs.sheet_id, filters.sheet_id));
    }
    if (filters.user_id) {
      conditions.push(eq(dbSchema.activity_logs.user_id, filters.user_id));
    }
    if (filters.action) {
      if (Array.isArray(filters.action)) {
        conditions.push(inArray(dbSchema.activity_logs.action, filters.action));
      } else {
        conditions.push(eq(dbSchema.activity_logs.action, filters.action));
      }
    }
    if (filters.target_type) {
      conditions.push(eq(dbSchema.activity_logs.target_type, filters.target_type));
    }
    if (filters.date_from) {
      conditions.push(gte(dbSchema.activity_logs.occurred_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(dbSchema.activity_logs.occurred_at, new Date(filters.date_to)));
    }
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(dbSchema.activity_logs.summary, searchTerm),
          ilike(dbSchema.activity_logs.target_name, searchTerm),
          ilike(dbSchema.activity_logs.actor_name, searchTerm)
        )
      );
    }
    
    // Build the query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.activity_logs)
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);
    
    // Get paginated results
    let query = db.select()
      .from(dbSchema.activity_logs)
      .where(whereClause)
      .orderBy(desc(dbSchema.activity_logs.occurred_at))
      .limit(limit)
      .offset(offset);
    
    const rows = await query;
    
    const logs: ActivityLog[] = rows.map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      sheet_id: row.sheet_id,
      user_id: row.user_id,
      actor_name: row.actor_name,
      actor_email: row.actor_email,
      actor_role: row.actor_role,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      target_name: row.target_name,
      sheet_name: row.sheet_name,
      summary: row.summary,
      details: row.details,
      source: row.source,
      ip_address: row.ip_address,
      occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
    }));
    
    return {
      logs,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getActivityLogStats(
    companyId: string, 
    sheetId?: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<ActivityLogStats> {
    const conditions: any[] = [eq(dbSchema.activity_logs.company_id, companyId)];
    
    if (sheetId) {
      conditions.push(eq(dbSchema.activity_logs.sheet_id, sheetId));
    }
    if (dateFrom) {
      conditions.push(gte(dbSchema.activity_logs.occurred_at, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(dbSchema.activity_logs.occurred_at, new Date(dateTo)));
    }
    
    const whereClause = and(...conditions);
    
    // Total actions
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.activity_logs)
      .where(whereClause);
    const total_actions = Number(totalResult[0]?.count ?? 0);
    
    // Actions by type
    const actionsByTypeResult = await db.select({
      action: dbSchema.activity_logs.action,
      count: sql<number>`count(*)`
    })
      .from(dbSchema.activity_logs)
      .where(whereClause)
      .groupBy(dbSchema.activity_logs.action);
    
    const actions_by_type: Record<string, number> = {};
    for (const row of actionsByTypeResult) {
      actions_by_type[row.action] = Number(row.count);
    }
    
    // Actions by user
    const actionsByUserResult = await db.select({
      user_id: dbSchema.activity_logs.user_id,
      user_name: dbSchema.activity_logs.actor_name,
      count: sql<number>`count(*)`
    })
      .from(dbSchema.activity_logs)
      .where(and(whereClause, isNotNull(dbSchema.activity_logs.user_id)))
      .groupBy(dbSchema.activity_logs.user_id, dbSchema.activity_logs.actor_name);
    
    const actions_by_user = actionsByUserResult.map((row: any) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      count: Number(row.count)
    }));
    
    // Actions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResult = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.activity_logs)
      .where(and(whereClause, gte(dbSchema.activity_logs.occurred_at, today)));
    const actions_today = Number(todayResult[0]?.count ?? 0);
    
    // Actions this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekResult = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.activity_logs)
      .where(and(whereClause, gte(dbSchema.activity_logs.occurred_at, weekAgo)));
    const actions_this_week = Number(weekResult[0]?.count ?? 0);
    
    return {
      total_actions,
      actions_by_type,
      actions_by_user,
      actions_today,
      actions_this_week,
    };
  }

  // =========================================================================
  // TARGET MANAGEMENT SYSTEM - PgStorage Implementation
  // =========================================================================

  async getTarget(id: string): Promise<TargetRecord | undefined> {
    const rows = await db.select().from(dbSchema.targets).where(eq(dbSchema.targets.id, id));
    return rows[0];
  }

  async getTargetsByCompanyId(companyId: string, filters?: TargetFilters): Promise<TargetRecord[]> {
    const conditions: any[] = [eq(dbSchema.targets.company_id, companyId)];
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(dbSchema.targets.status, filters.status));
      } else {
        conditions.push(eq(dbSchema.targets.status, filters.status));
      }
    }
    if (filters?.time_type) {
      conditions.push(eq(dbSchema.targets.time_type, filters.time_type));
    }
    if (filters?.date_from) {
      conditions.push(gte(dbSchema.targets.start_date, new Date(filters.date_from)));
    }
    if (filters?.date_to) {
      conditions.push(lte(dbSchema.targets.end_date, new Date(filters.date_to)));
    }
    if (filters?.search) {
      conditions.push(ilike(dbSchema.targets.name, `%${filters.search}%`));
    }
    
    const limitVal = filters?.limit ?? 100;
    const offsetVal = filters?.offset ?? 0;
    
    return await db.select()
      .from(dbSchema.targets)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.targets.created_at))
      .limit(limitVal)
      .offset(offsetVal);
  }

  async getTargetWithDetails(id: string): Promise<TargetWithDetails | undefined> {
    const target = await this.getTarget(id);
    if (!target) return undefined;

    // Get goals
    const goals = await this.getTargetGoals(id);
    
    // Get assignments and user details
    const assignments = await this.getTargetUserAssignments(id);
    const assignedUsers: { id: string; name: string; email: string }[] = [];
    for (const a of assignments) {
      const user = await this.getUser(a.user_id);
      if (user) {
        assignedUsers.push({ id: user.id, name: user.name, email: user.email });
      }
    }
    
    // Get scope sheets if specific sheets
    let scopeSheets: { id: string; name: string }[] | undefined;
    if (target.scope_type === 'specific_sheets' && target.scope_sheet_ids) {
      scopeSheets = [];
      for (const sheetId of target.scope_sheet_ids) {
        const sheet = await this.getSheet(sheetId);
        if (sheet) {
          scopeSheets.push({ id: sheet.id, name: sheet.name });
        }
      }
    }
    
    // Get created by user
    const createdByUser = await this.getUser(target.created_by_user_id);
    
    return {
      id: target.id,
      company_id: target.company_id,
      name: target.name,
      description: target.description,
      assignment_type: target.assignment_type as any,
      scope_type: target.scope_type as any,
      scope_sheet_ids: target.scope_sheet_ids,
      time_type: target.time_type as any,
      start_date: target.start_date instanceof Date ? target.start_date.toISOString() : target.start_date as any,
      end_date: target.end_date ? (target.end_date instanceof Date ? target.end_date.toISOString() : target.end_date as any) : null,
      recurring_frequency: target.recurring_frequency as any,
      status: target.status as any,
      notification_milestones: target.notification_milestones || [20, 40, 60, 80, 100],
      created_by_user_id: target.created_by_user_id,
      created_at: target.created_at instanceof Date ? target.created_at.toISOString() : target.created_at as any,
      updated_at: target.updated_at instanceof Date ? target.updated_at.toISOString() : target.updated_at as any,
      goals: goals.map(g => ({
        id: g.id,
        target_id: g.target_id,
        name: g.name,
        config: g.config,
        order_index: g.order_index,
        created_at: g.created_at instanceof Date ? g.created_at.toISOString() : g.created_at as any,
        updated_at: g.updated_at instanceof Date ? g.updated_at.toISOString() : g.updated_at as any,
      })),
      assigned_users: assignedUsers,
      scope_sheets: scopeSheets,
      created_by_user: createdByUser ? { id: createdByUser.id, name: createdByUser.name } : undefined,
    };
  }

  async createTarget(target: InsertTarget): Promise<TargetRecord> {
    const rows = await db.insert(dbSchema.targets).values(target).returning();
    return rows[0];
  }

  async updateTarget(id: string, updates: Partial<TargetRecord>): Promise<TargetRecord | undefined> {
    const rows = await db.update(dbSchema.targets)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.targets.id, id))
      .returning();
    return rows[0];
  }

  async deleteTarget(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.targets).where(eq(dbSchema.targets.id, id));
    return (result as any).rowCount > 0;
  }

  async getTargetGoals(targetId: string): Promise<TargetGoalRecord[]> {
    return await db.select()
      .from(dbSchema.target_goals)
      .where(eq(dbSchema.target_goals.target_id, targetId))
      .orderBy(asc(dbSchema.target_goals.order_index));
  }

  async createTargetGoal(goal: InsertTargetGoal): Promise<TargetGoalRecord> {
    const rows = await db.insert(dbSchema.target_goals).values(goal).returning();
    return rows[0];
  }

  async updateTargetGoal(id: string, updates: Partial<TargetGoalRecord>): Promise<TargetGoalRecord | undefined> {
    const rows = await db.update(dbSchema.target_goals)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.target_goals.id, id))
      .returning();
    return rows[0];
  }

  async deleteTargetGoal(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.target_goals).where(eq(dbSchema.target_goals.id, id));
    return (result as any).rowCount > 0;
  }

  async deleteTargetGoalsByTargetId(targetId: string): Promise<number> {
    const result = await db.delete(dbSchema.target_goals).where(eq(dbSchema.target_goals.target_id, targetId));
    return (result as any).rowCount || 0;
  }

  async getTargetUserAssignments(targetId: string): Promise<TargetUserAssignmentRecord[]> {
    return await db.select()
      .from(dbSchema.target_user_assignments)
      .where(eq(dbSchema.target_user_assignments.target_id, targetId));
  }

  async createTargetUserAssignment(assignment: InsertTargetUserAssignment): Promise<TargetUserAssignmentRecord> {
    const rows = await db.insert(dbSchema.target_user_assignments).values(assignment).returning();
    return rows[0];
  }

  async deleteTargetUserAssignment(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.target_user_assignments).where(eq(dbSchema.target_user_assignments.id, id));
    return (result as any).rowCount > 0;
  }

  async deleteTargetUserAssignmentsByTargetId(targetId: string): Promise<number> {
    const result = await db.delete(dbSchema.target_user_assignments).where(eq(dbSchema.target_user_assignments.target_id, targetId));
    return (result as any).rowCount || 0;
  }

  async getTargetsForUser(userId: string, status?: string | string[]): Promise<TargetRecord[]> {
    // Get user's company
    const user = await this.getUser(userId);
    if (!user?.company_id) return [];

    // Get targets where user is assigned OR target is for all_users
    const assignedTargetIds = await db.select({ target_id: dbSchema.target_user_assignments.target_id })
      .from(dbSchema.target_user_assignments)
      .where(eq(dbSchema.target_user_assignments.user_id, userId));
    
    const targetIds = assignedTargetIds.map(a => a.target_id);
    
    const conditions: any[] = [
      eq(dbSchema.targets.company_id, user.company_id),
      or(
        targetIds.length > 0 ? inArray(dbSchema.targets.id, targetIds) : sql`false`,
        eq(dbSchema.targets.assignment_type, 'all_users')
      )
    ];
    
    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(dbSchema.targets.status, status));
      } else {
        conditions.push(eq(dbSchema.targets.status, status));
      }
    }
    
    return await db.select()
      .from(dbSchema.targets)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.targets.created_at));
  }

  async getTargetUserProgress(targetId: string, userId?: string): Promise<TargetUserProgressRecord[]> {
    const conditions: any[] = [eq(dbSchema.target_user_progress.target_id, targetId)];
    if (userId) {
      conditions.push(eq(dbSchema.target_user_progress.user_id, userId));
    }
    return await db.select()
      .from(dbSchema.target_user_progress)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.target_user_progress.period_start));
  }

  async getUserProgressForGoal(goalId: string, userId: string, periodStart: Date): Promise<TargetUserProgressRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.target_user_progress)
      .where(and(
        eq(dbSchema.target_user_progress.goal_id, goalId),
        eq(dbSchema.target_user_progress.user_id, userId),
        eq(dbSchema.target_user_progress.period_start, periodStart)
      ));
    return rows[0];
  }

  async createTargetUserProgress(progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord> {
    const rows = await db.insert(dbSchema.target_user_progress).values(progress).returning();
    return rows[0];
  }

  async updateTargetUserProgress(id: string, updates: Partial<TargetUserProgressRecord>): Promise<TargetUserProgressRecord | undefined> {
    const rows = await db.update(dbSchema.target_user_progress)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.target_user_progress.id, id))
      .returning();
    return rows[0];
  }

  async upsertTargetUserProgress(progress: InsertTargetUserProgress): Promise<TargetUserProgressRecord> {
    const existing = await this.getUserProgressForGoal(progress.goal_id, progress.user_id, progress.period_start);
    if (existing) {
      const updated = await this.updateTargetUserProgress(existing.id, {
        current_value: progress.current_value,
        is_achieved: progress.is_achieved ?? false,
        achieved_at: progress.achieved_at,
        streak_count: progress.streak_count,
        last_calculated_at: new Date(),
      });
      return updated!;
    }
    return await this.createTargetUserProgress(progress);
  }

  async getCompanyHolidays(companyId: string, startDate?: Date, endDate?: Date): Promise<CompanyHolidayRecord[]> {
    const conditions: any[] = [eq(dbSchema.company_holidays.company_id, companyId)];
    if (startDate) {
      conditions.push(gte(dbSchema.company_holidays.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(dbSchema.company_holidays.date, endDate));
    }
    return await db.select()
      .from(dbSchema.company_holidays)
      .where(and(...conditions))
      .orderBy(asc(dbSchema.company_holidays.date));
  }

  async createCompanyHoliday(holiday: InsertCompanyHoliday): Promise<CompanyHolidayRecord> {
    const rows = await db.insert(dbSchema.company_holidays).values(holiday).returning();
    return rows[0];
  }

  async deleteCompanyHoliday(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.company_holidays).where(eq(dbSchema.company_holidays.id, id));
    return (result as any).rowCount > 0;
  }

  async getTargetNotifications(userId: string, unreadOnly?: boolean): Promise<TargetNotificationRecord[]> {
    const conditions: any[] = [eq(dbSchema.target_notifications.user_id, userId)];
    if (unreadOnly) {
      conditions.push(eq(dbSchema.target_notifications.is_read, false));
      conditions.push(eq(dbSchema.target_notifications.is_dismissed, false));
    }
    return await db.select()
      .from(dbSchema.target_notifications)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.target_notifications.created_at));
  }

  async createTargetNotification(notification: InsertTargetNotification): Promise<TargetNotificationRecord> {
    const rows = await db.insert(dbSchema.target_notifications).values(notification).returning();
    return rows[0];
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(dbSchema.target_notifications)
      .set({ is_read: true })
      .where(eq(dbSchema.target_notifications.id, id));
    return (result as any).rowCount > 0;
  }

  async markNotificationAsDismissed(id: string): Promise<boolean> {
    const result = await db.update(dbSchema.target_notifications)
      .set({ is_dismissed: true })
      .where(eq(dbSchema.target_notifications.id, id));
    return (result as any).rowCount > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db.update(dbSchema.target_notifications)
      .set({ is_read: true })
      .where(and(
        eq(dbSchema.target_notifications.user_id, userId),
        eq(dbSchema.target_notifications.is_read, false)
      ));
    return (result as any).rowCount || 0;
  }

  async getLeaderboard(companyId: string, period?: { start: Date; end: Date }): Promise<LeaderboardEntry[]> {
    // Get all active users in the company
    const users = await this.getUsersByCompanyId(companyId);
    const activeUsers = users.filter(u => u.is_active);
    
    const leaderboard: LeaderboardEntry[] = [];
    
    for (const user of activeUsers) {
      // Get all targets for this user
      const targets = await this.getTargetsForUser(user.id, ['active', 'completed']);
      
      let totalTargets = 0;
      let achievedTargets = 0;
      let totalProgress = 0;
      let totalStreak = 0;
      let progressCount = 0;
      
      for (const target of targets) {
        const progress = await this.getTargetUserProgress(target.id, user.id);
        
        if (progress.length > 0) {
          totalTargets++;
          
          // Check if all goals are achieved for latest period
          const latestProgress = progress.filter(p => {
            if (!period) return true;
            return new Date(p.period_start) >= period.start && new Date(p.period_end) <= period.end;
          });
          
          if (latestProgress.length > 0) {
            const allAchieved = latestProgress.every(p => p.is_achieved);
            if (allAchieved) achievedTargets++;
            
            for (const p of latestProgress) {
              const percentage = p.target_value > 0 ? (p.current_value / p.target_value) * 100 : 0;
              totalProgress += Math.min(percentage, 100);
              progressCount++;
              totalStreak = Math.max(totalStreak, p.streak_count);
            }
          }
        }
      }
      
      leaderboard.push({
        user_id: user.id,
        user_name: user.name,
        total_targets: totalTargets,
        achieved_targets: achievedTargets,
        overall_progress_percentage: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
        total_streak: totalStreak,
        rank: 0, // Will be set after sorting
      });
    }
    
    // Sort by achieved targets, then progress percentage, then streak
    leaderboard.sort((a, b) => {
      if (b.achieved_targets !== a.achieved_targets) return b.achieved_targets - a.achieved_targets;
      if (b.overall_progress_percentage !== a.overall_progress_percentage) return b.overall_progress_percentage - a.overall_progress_percentage;
      return b.total_streak - a.total_streak;
    });
    
    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return leaderboard;
  }

  // =========================================================================
  // BACKUP SYSTEM (Google Sheets)
  // =========================================================================

  async getBackupConfig(id: string): Promise<BackupConfigRecord | undefined> {
    const rows = await db.select().from(dbSchema.backup_configs).where(eq(dbSchema.backup_configs.id, id));
    return rows[0];
  }

  async getBackupConfigBySheetId(sheetId: string): Promise<BackupConfigRecord | undefined> {
    const rows = await db.select().from(dbSchema.backup_configs).where(eq(dbSchema.backup_configs.sheet_id, sheetId));
    return rows[0];
  }

  async getBackupConfigsByCompanyId(companyId: string): Promise<BackupConfigRecord[]> {
    return await db.select()
      .from(dbSchema.backup_configs)
      .where(eq(dbSchema.backup_configs.company_id, companyId))
      .orderBy(desc(dbSchema.backup_configs.created_at));
  }

  async getEnabledBackupConfigs(): Promise<BackupConfigRecord[]> {
    return await db.select()
      .from(dbSchema.backup_configs)
      .where(eq(dbSchema.backup_configs.is_enabled, true));
  }

  async createBackupConfig(config: InsertBackupConfig): Promise<BackupConfigRecord> {
    const rows = await db.insert(dbSchema.backup_configs).values(config).returning();
    return rows[0];
  }

  async updateBackupConfig(id: string, updates: Partial<BackupConfigRecord>): Promise<BackupConfigRecord | undefined> {
    const rows = await db.update(dbSchema.backup_configs)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.backup_configs.id, id))
      .returning();
    return rows[0];
  }

  async deleteBackupConfig(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.backup_configs).where(eq(dbSchema.backup_configs.id, id));
    return (result as any).rowCount > 0;
  }

  async getBackupSyncLogs(backupConfigId: string, limit: number = 50): Promise<BackupSyncLogRecord[]> {
    return await db.select()
      .from(dbSchema.backup_sync_logs)
      .where(eq(dbSchema.backup_sync_logs.backup_config_id, backupConfigId))
      .orderBy(desc(dbSchema.backup_sync_logs.started_at))
      .limit(limit);
  }

  async createBackupSyncLog(log: InsertBackupSyncLog): Promise<BackupSyncLogRecord> {
    const rows = await db.insert(dbSchema.backup_sync_logs).values(log).returning();
    return rows[0];
  }

  async updateBackupSyncLog(id: string, updates: Partial<BackupSyncLogRecord>): Promise<BackupSyncLogRecord | undefined> {
    const rows = await db.update(dbSchema.backup_sync_logs)
      .set(updates)
      .where(eq(dbSchema.backup_sync_logs.id, id))
      .returning();
    return rows[0];
  }

  async getRestoreLogs(companyId: string, sheetId?: string): Promise<RestoreLogRecord[]> {
    const conditions: any[] = [eq(dbSchema.restore_logs.company_id, companyId)];
    if (sheetId) {
      conditions.push(eq(dbSchema.restore_logs.sheet_id, sheetId));
    }
    return await db.select()
      .from(dbSchema.restore_logs)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.restore_logs.created_at));
  }

  async createRestoreLog(log: InsertRestoreLog): Promise<RestoreLogRecord> {
    const rows = await db.insert(dbSchema.restore_logs).values(log).returning();
    return rows[0];
  }

  // =========================================================================
  // USER ROW FILTERS (Hide/Show Rows)
  // =========================================================================

  async getUserRowFilter(id: string): Promise<UserRowFilterRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.user_row_filters)
      .where(eq(dbSchema.user_row_filters.id, id));
    return rows[0];
  }

  async getUserRowFiltersByUserAndSheet(userId: string, sheetId: string): Promise<UserRowFilterRecord[]> {
    // First, get the sheet to find its company_id
    const sheet = await this.getSheet(sheetId);
    if (!sheet) {
      return [];
    }
    
    // Build query to fetch:
    // 1. User's own filters for this sheet (is_global=false)
    // 2. Global filters for this sheet (is_global=true, sheet_id matches)
    // 3. Global filters for all sheets in the company (is_global=true, applies_to_all_sheets=true, same company)
    
    // Get all sheets in this company to find "applies_to_all_sheets" filters
    const companySheetIds = sheet.company_id 
      ? (await this.getSheetsByCompanyId(sheet.company_id)).map(s => s.id)
      : [sheetId];
    
    const filters = await db.select()
      .from(dbSchema.user_row_filters)
      .where(or(
        // User's own filters for this specific sheet
        and(
          eq(dbSchema.user_row_filters.user_id, userId),
          eq(dbSchema.user_row_filters.sheet_id, sheetId),
          eq(dbSchema.user_row_filters.is_global, false)
        ),
        // Global filters for this specific sheet (created by any admin)
        and(
          eq(dbSchema.user_row_filters.sheet_id, sheetId),
          eq(dbSchema.user_row_filters.is_global, true),
          eq(dbSchema.user_row_filters.applies_to_all_sheets, false)
        ),
        // Global filters that apply to all sheets in the company
        // These are stored with any sheet_id from the company, with applies_to_all_sheets=true
        and(
          eq(dbSchema.user_row_filters.is_global, true),
          eq(dbSchema.user_row_filters.applies_to_all_sheets, true),
          inArray(dbSchema.user_row_filters.sheet_id, companySheetIds)
        )
      ))
      .orderBy(desc(dbSchema.user_row_filters.created_at));
    
    // Deduplicate: applies_to_all_sheets filters may be returned once per company sheet
    // Use filter id to deduplicate
    const seen = new Set<string>();
    const deduplicatedFilters = filters.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    
    // Fetch user's personal toggle states for global filters they don't own
    const userToggleStates = await this.getUserFilterToggleStates(userId);
    const toggleStateMap = new Map(userToggleStates.map(ts => [ts.filter_id, ts.is_active]));
    
    // Apply user's personal toggle states to global filters they don't own
    return deduplicatedFilters.map(filter => {
      // For global filters that the user doesn't own, check for personal toggle state
      if (filter.is_global && filter.user_id !== userId) {
        const userToggleState = toggleStateMap.get(filter.id);
        if (userToggleState !== undefined) {
          // Return a copy with the user's personal toggle state applied
          return { ...filter, is_active: userToggleState };
        }
      }
      return filter;
    });
  }

  async createUserRowFilter(filter: InsertUserRowFilter): Promise<UserRowFilterRecord> {
    const rows = await db.insert(dbSchema.user_row_filters).values(filter).returning();
    return rows[0];
  }

  async updateUserRowFilter(id: string, updates: Partial<UserRowFilterRecord>): Promise<UserRowFilterRecord | undefined> {
    const rows = await db.update(dbSchema.user_row_filters)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.user_row_filters.id, id))
      .returning();
    return rows[0];
  }

  async deleteUserRowFilter(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.user_row_filters).where(eq(dbSchema.user_row_filters.id, id));
    return (result as any).rowCount > 0;
  }

  async toggleUserRowFilter(id: string, isActive: boolean): Promise<UserRowFilterRecord | undefined> {
    const rows = await db.update(dbSchema.user_row_filters)
      .set({ is_active: isActive, updated_at: new Date() })
      .where(eq(dbSchema.user_row_filters.id, id))
      .returning();
    return rows[0];
  }

  // User Filter Toggle States (per-user preferences for global filters)
  async getUserFilterToggleState(userId: string, filterId: string): Promise<UserFilterToggleState | undefined> {
    const rows = await db.select()
      .from(dbSchema.user_filter_toggle_states)
      .where(and(
        eq(dbSchema.user_filter_toggle_states.user_id, userId),
        eq(dbSchema.user_filter_toggle_states.filter_id, filterId)
      ));
    return rows[0];
  }

  async getUserFilterToggleStates(userId: string): Promise<UserFilterToggleState[]> {
    return await db.select()
      .from(dbSchema.user_filter_toggle_states)
      .where(eq(dbSchema.user_filter_toggle_states.user_id, userId));
  }

  async upsertUserFilterToggleState(userId: string, filterId: string, isActive: boolean): Promise<UserFilterToggleState> {
    const existing = await this.getUserFilterToggleState(userId, filterId);
    if (existing) {
      const rows = await db.update(dbSchema.user_filter_toggle_states)
        .set({ is_active: isActive, updated_at: new Date() })
        .where(eq(dbSchema.user_filter_toggle_states.id, existing.id))
        .returning();
      return rows[0];
    } else {
      const rows = await db.insert(dbSchema.user_filter_toggle_states)
        .values({ user_id: userId, filter_id: filterId, is_active: isActive })
        .returning();
      return rows[0];
    }
  }

  async deleteUserFilterToggleState(userId: string, filterId: string): Promise<boolean> {
    const result = await db.delete(dbSchema.user_filter_toggle_states)
      .where(and(
        eq(dbSchema.user_filter_toggle_states.user_id, userId),
        eq(dbSchema.user_filter_toggle_states.filter_id, filterId)
      ));
    return (result as any).rowCount > 0;
  }

  // =========================================================================
  // SHEET SNAPSHOTS (Point-in-Time Recovery)
  // =========================================================================

  async getSheetSnapshot(id: string): Promise<SheetSnapshotRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.sheet_snapshots)
      .where(eq(dbSchema.sheet_snapshots.id, id));
    return rows[0];
  }

  async getSheetSnapshotsBySheet(sheetId: string, limit: number = 100): Promise<SheetSnapshotRecord[]> {
    return await db.select()
      .from(dbSchema.sheet_snapshots)
      .where(eq(dbSchema.sheet_snapshots.sheet_id, sheetId))
      .orderBy(desc(dbSchema.sheet_snapshots.created_at))
      .limit(limit);
  }

  async getSheetSnapshotsByCompany(companyId: string, limit: number = 100): Promise<SheetSnapshotRecord[]> {
    return await db.select()
      .from(dbSchema.sheet_snapshots)
      .where(eq(dbSchema.sheet_snapshots.company_id, companyId))
      .orderBy(desc(dbSchema.sheet_snapshots.created_at))
      .limit(limit);
  }

  async getAllSheetSnapshots(limit: number = 500): Promise<SheetSnapshotRecord[]> {
    return await db.select()
      .from(dbSchema.sheet_snapshots)
      .orderBy(desc(dbSchema.sheet_snapshots.created_at))
      .limit(limit);
  }

  async getLatestSheetSnapshot(sheetId: string): Promise<SheetSnapshotRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.sheet_snapshots)
      .where(eq(dbSchema.sheet_snapshots.sheet_id, sheetId))
      .orderBy(desc(dbSchema.sheet_snapshots.created_at))
      .limit(1);
    return rows[0];
  }

  async createSheetSnapshot(snapshot: InsertSheetSnapshot): Promise<SheetSnapshotRecord> {
    const rows = await db.insert(dbSchema.sheet_snapshots).values(snapshot).returning();
    return rows[0];
  }

  async deleteSheetSnapshot(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.sheet_snapshots).where(eq(dbSchema.sheet_snapshots.id, id));
    return (result as any).rowCount > 0;
  }

  async deleteOldSnapshots(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db.delete(dbSchema.sheet_snapshots)
      .where(lte(dbSchema.sheet_snapshots.created_at, cutoffDate));
    return (result as any).rowCount || 0;
  }

  async getSnapshotRestoreLogs(companyId: string, limit: number = 100): Promise<SnapshotRestoreLogRecord[]> {
    return await db.select()
      .from(dbSchema.snapshot_restore_logs)
      .where(eq(dbSchema.snapshot_restore_logs.company_id, companyId))
      .orderBy(desc(dbSchema.snapshot_restore_logs.created_at))
      .limit(limit);
  }

  async createSnapshotRestoreLog(log: InsertSnapshotRestoreLog): Promise<SnapshotRestoreLogRecord> {
    const rows = await db.insert(dbSchema.snapshot_restore_logs).values(log).returning();
    return rows[0];
  }

  // =========================================================================
  // SAVED REPORTS (Fixed Reports / Report Library)
  // =========================================================================

  async getSavedReport(id: string): Promise<SavedReportRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.saved_reports)
      .where(eq(dbSchema.saved_reports.id, id));
    return rows[0];
  }

  async getSavedReportsByCompany(companyId: string, includeGlobal: boolean = true): Promise<SavedReportRecord[]> {
    if (includeGlobal) {
      return await db.select()
        .from(dbSchema.saved_reports)
        .where(
          and(
            eq(dbSchema.saved_reports.is_active, true),
            or(
              eq(dbSchema.saved_reports.company_id, companyId),
              isNull(dbSchema.saved_reports.company_id)
            )
          )
        )
        .orderBy(desc(dbSchema.saved_reports.created_at));
    }
    return await db.select()
      .from(dbSchema.saved_reports)
      .where(
        and(
          eq(dbSchema.saved_reports.is_active, true),
          eq(dbSchema.saved_reports.company_id, companyId)
        )
      )
      .orderBy(desc(dbSchema.saved_reports.created_at));
  }

  async getGlobalSavedReports(): Promise<SavedReportRecord[]> {
    return await db.select()
      .from(dbSchema.saved_reports)
      .where(
        and(
          eq(dbSchema.saved_reports.is_active, true),
          isNull(dbSchema.saved_reports.company_id)
        )
      )
      .orderBy(desc(dbSchema.saved_reports.created_at));
  }

  async createSavedReport(report: InsertSavedReport): Promise<SavedReportRecord> {
    const rows = await db.insert(dbSchema.saved_reports).values(report).returning();
    return rows[0];
  }

  async updateSavedReport(id: string, updates: Partial<SavedReportRecord>): Promise<SavedReportRecord | undefined> {
    const rows = await db.update(dbSchema.saved_reports)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.saved_reports.id, id))
      .returning();
    return rows[0];
  }

  async deleteSavedReport(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.saved_reports).where(eq(dbSchema.saved_reports.id, id));
    return (result as any).rowCount > 0;
  }

  async duplicateSavedReport(id: string, targetCompanyId: string, userId: string): Promise<SavedReportRecord | undefined> {
    const original = await this.getSavedReport(id);
    if (!original) return undefined;

    const newReport: InsertSavedReport = {
      company_id: targetCompanyId,
      name: original.name,
      description: original.description,
      category: original.category,
      config: original.config,
      is_template: false,
      source_report_id: original.id,
      created_by_user_id: userId,
      is_active: true,
    };

    return await this.createSavedReport(newReport);
  }

  async incrementReportRunCount(id: string): Promise<boolean> {
    const result = await db.update(dbSchema.saved_reports)
      .set({ 
        run_count: sql`${dbSchema.saved_reports.run_count} + 1`,
        last_run_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(dbSchema.saved_reports.id, id));
    return (result as any).rowCount > 0;
  }

  // =========================================================================
  // COMPANY KPIs (New Simplified Target System)
  // =========================================================================

  async getCompanyKpi(id: string): Promise<CompanyKpiRecord | undefined> {
    const rows = await db.select().from(dbSchema.company_kpis).where(eq(dbSchema.company_kpis.id, id));
    return rows[0];
  }

  async getCompanyKpisByCompany(companyId: string): Promise<CompanyKpiRecord[]> {
    return await db.select()
      .from(dbSchema.company_kpis)
      .where(eq(dbSchema.company_kpis.company_id, companyId))
      .orderBy(desc(dbSchema.company_kpis.created_at));
  }

  async createCompanyKpi(kpi: InsertCompanyKpi): Promise<CompanyKpiRecord> {
    const rows = await db.insert(dbSchema.company_kpis).values(kpi).returning();
    return rows[0];
  }

  async updateCompanyKpi(id: string, updates: Partial<CompanyKpiRecord>): Promise<CompanyKpiRecord | undefined> {
    const rows = await db.update(dbSchema.company_kpis)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.company_kpis.id, id))
      .returning();
    return rows[0];
  }

  async deleteCompanyKpi(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.company_kpis).where(eq(dbSchema.company_kpis.id, id));
    return (result as any).rowCount > 0;
  }

  // =========================================================================
  // SIMPLE TARGETS (References KPIs)
  // =========================================================================

  async getSimpleTarget(id: string): Promise<SimpleTargetRecord | undefined> {
    const rows = await db.select().from(dbSchema.simple_targets).where(eq(dbSchema.simple_targets.id, id));
    return rows[0];
  }

  async getSimpleTargetsByCompany(companyId: string): Promise<SimpleTargetRecord[]> {
    return await db.select()
      .from(dbSchema.simple_targets)
      .where(eq(dbSchema.simple_targets.company_id, companyId))
      .orderBy(desc(dbSchema.simple_targets.created_at));
  }

  async getSimpleTargetsByKpi(kpiId: string): Promise<SimpleTargetRecord[]> {
    return await db.select()
      .from(dbSchema.simple_targets)
      .where(eq(dbSchema.simple_targets.kpi_id, kpiId))
      .orderBy(desc(dbSchema.simple_targets.created_at));
  }

  async createSimpleTarget(target: InsertSimpleTarget): Promise<SimpleTargetRecord> {
    const rows = await db.insert(dbSchema.simple_targets).values(target).returning();
    return rows[0];
  }

  async updateSimpleTarget(id: string, updates: Partial<SimpleTargetRecord>): Promise<SimpleTargetRecord | undefined> {
    const rows = await db.update(dbSchema.simple_targets)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.simple_targets.id, id))
      .returning();
    return rows[0];
  }

  async deleteSimpleTarget(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.simple_targets).where(eq(dbSchema.simple_targets.id, id));
    return (result as any).rowCount > 0;
  }

  // =========================================================================
  // SIMPLE TARGET PROGRESS
  // =========================================================================

  async getSimpleTargetProgress(targetId: string, userId: string, periodStart: Date): Promise<SimpleTargetProgressRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.simple_target_progress)
      .where(
        and(
          eq(dbSchema.simple_target_progress.target_id, targetId),
          eq(dbSchema.simple_target_progress.user_id, userId),
          eq(dbSchema.simple_target_progress.period_start, periodStart)
        )
      );
    return rows[0];
  }

  async getSimpleTargetProgressByUser(userId: string): Promise<SimpleTargetProgressRecord[]> {
    return await db.select()
      .from(dbSchema.simple_target_progress)
      .where(eq(dbSchema.simple_target_progress.user_id, userId))
      .orderBy(desc(dbSchema.simple_target_progress.period_start));
  }

  async getSimpleTargetProgressByTarget(targetId: string): Promise<SimpleTargetProgressRecord[]> {
    return await db.select()
      .from(dbSchema.simple_target_progress)
      .where(eq(dbSchema.simple_target_progress.target_id, targetId))
      .orderBy(desc(dbSchema.simple_target_progress.period_start));
  }

  async createOrUpdateSimpleTargetProgress(progress: InsertSimpleTargetProgress): Promise<SimpleTargetProgressRecord> {
    // Try to find existing progress record
    const existing = await db.select()
      .from(dbSchema.simple_target_progress)
      .where(
        and(
          eq(dbSchema.simple_target_progress.target_id, progress.target_id),
          eq(dbSchema.simple_target_progress.user_id, progress.user_id),
          eq(dbSchema.simple_target_progress.period_start, progress.period_start)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const rows = await db.update(dbSchema.simple_target_progress)
        .set({
          current_value: progress.current_value,
          is_achieved: progress.is_achieved,
          achieved_at: progress.achieved_at,
          last_calculated_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(dbSchema.simple_target_progress.id, existing[0].id))
        .returning();
      return rows[0];
    } else {
      // Create new record
      const rows = await db.insert(dbSchema.simple_target_progress).values(progress).returning();
      return rows[0];
    }
  }

  // =========================================================================
  // WORKING TARGETS
  // =========================================================================

  async getWorkingTarget(id: string): Promise<WorkingTargetRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.working_targets)
      .where(eq(dbSchema.working_targets.id, id));
    return rows[0];
  }

  async getWorkingTargetsByCompany(companyId: string): Promise<WorkingTargetRecord[]> {
    return await db.select()
      .from(dbSchema.working_targets)
      .where(eq(dbSchema.working_targets.company_id, companyId))
      .orderBy(desc(dbSchema.working_targets.created_at));
  }

  async createWorkingTarget(target: InsertWorkingTarget): Promise<WorkingTargetRecord> {
    const rows = await db.insert(dbSchema.working_targets).values(target).returning();
    return rows[0];
  }

  async updateWorkingTarget(id: string, updates: Partial<WorkingTargetRecord>): Promise<WorkingTargetRecord | undefined> {
    const rows = await db.update(dbSchema.working_targets)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.working_targets.id, id))
      .returning();
    return rows[0];
  }

  async deleteWorkingTarget(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.working_targets).where(eq(dbSchema.working_targets.id, id));
    return (result as any).rowCount > 0;
  }

  // =========================================================================
  // WORKING TARGET RESULTS
  // =========================================================================

  async getWorkingTargetResult(targetId: string, userId: string, periodStart: Date): Promise<WorkingTargetResultRecord | undefined> {
    const rows = await db.select()
      .from(dbSchema.working_target_results)
      .where(
        and(
          eq(dbSchema.working_target_results.working_target_id, targetId),
          eq(dbSchema.working_target_results.user_id, userId),
          eq(dbSchema.working_target_results.period_start, periodStart)
        )
      );
    return rows[0];
  }

  async getWorkingTargetResultsByUser(userId: string, periodStart?: Date, periodEnd?: Date): Promise<WorkingTargetResultRecord[]> {
    let query = db.select()
      .from(dbSchema.working_target_results)
      .where(eq(dbSchema.working_target_results.user_id, userId));
    
    if (periodStart && periodEnd) {
      query = db.select()
        .from(dbSchema.working_target_results)
        .where(
          and(
            eq(dbSchema.working_target_results.user_id, userId),
            gte(dbSchema.working_target_results.period_start, periodStart),
            lte(dbSchema.working_target_results.period_end, periodEnd)
          )
        );
    }
    
    return await query.orderBy(desc(dbSchema.working_target_results.period_start));
  }

  async getWorkingTargetResultsByTarget(targetId: string): Promise<WorkingTargetResultRecord[]> {
    return await db.select()
      .from(dbSchema.working_target_results)
      .where(eq(dbSchema.working_target_results.working_target_id, targetId))
      .orderBy(desc(dbSchema.working_target_results.period_start));
  }

  async createOrUpdateWorkingTargetResult(result: InsertWorkingTargetResult): Promise<WorkingTargetResultRecord> {
    // Try to find existing result record
    const existing = await db.select()
      .from(dbSchema.working_target_results)
      .where(
        and(
          eq(dbSchema.working_target_results.working_target_id, result.working_target_id),
          eq(dbSchema.working_target_results.user_id, result.user_id),
          eq(dbSchema.working_target_results.period_start, result.period_start)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const rows = await db.update(dbSchema.working_target_results)
        .set({
          current_value: result.current_value,
          target_value: result.target_value,
          compliance_percentage: result.compliance_percentage,
          is_achieved: result.is_achieved,
          details: result.details,
          last_calculated_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(dbSchema.working_target_results.id, existing[0].id))
        .returning();
      return rows[0];
    } else {
      // Create new record
      const rows = await db.insert(dbSchema.working_target_results).values(result).returning();
      return rows[0];
    }
  }

  // =========================================================================
  // ATTENDANCE EXIT CONDITIONS
  // =========================================================================

  async getAttendanceExitCondition(id: string): Promise<AttendanceExitConditionRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.attendance_exit_conditions)
      .where(eq(dbSchema.attendance_exit_conditions.id, id));
    return result[0];
  }

  async getAttendanceExitConditionsByCompany(companyId: string): Promise<AttendanceExitConditionRecord[]> {
    return await db.select()
      .from(dbSchema.attendance_exit_conditions)
      .where(eq(dbSchema.attendance_exit_conditions.company_id, companyId))
      .orderBy(desc(dbSchema.attendance_exit_conditions.created_at));
  }

  async getActiveExitConditionsForUser(userId: string, companyId: string): Promise<AttendanceExitConditionRecord[]> {
    // Get user's sheet assignments
    const userSheets = await db.select()
      .from(dbSchema.sheet_users)
      .where(eq(dbSchema.sheet_users.user_id, userId));
    const userSheetIds = userSheets.map(su => su.sheet_id);

    // Get all active conditions for this company
    const conditions = await db.select()
      .from(dbSchema.attendance_exit_conditions)
      .where(
        and(
          eq(dbSchema.attendance_exit_conditions.company_id, companyId),
          eq(dbSchema.attendance_exit_conditions.is_active, true)
        )
      );

    // Filter conditions that apply to this user
    return conditions.filter(condition => {
      if (condition.scope_type === 'all_users') {
        return true;
      }
      if (condition.scope_type === 'specific_users') {
        return condition.scope_ids?.includes(userId) ?? false;
      }
      if (condition.scope_type === 'specific_sheets') {
        // Check if any of user's sheets match condition's sheets
        return condition.scope_ids?.some(sheetId => userSheetIds.includes(sheetId)) ?? false;
      }
      return false;
    });
  }

  async createAttendanceExitCondition(condition: InsertAttendanceExitCondition): Promise<AttendanceExitConditionRecord> {
    const rows = await db.insert(dbSchema.attendance_exit_conditions).values(condition).returning();
    return rows[0];
  }

  async updateAttendanceExitCondition(id: string, updates: Partial<AttendanceExitConditionRecord>): Promise<AttendanceExitConditionRecord | undefined> {
    const rows = await db.update(dbSchema.attendance_exit_conditions)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.attendance_exit_conditions.id, id))
      .returning();
    return rows[0];
  }

  async deleteAttendanceExitCondition(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.attendance_exit_conditions)
      .where(eq(dbSchema.attendance_exit_conditions.id, id))
      .returning();
    return result.length > 0;
  }

  // =========================================================================
  // TRANSITION EXPLANATION RULES
  // =========================================================================

  async getTransitionExplanationRule(id: string): Promise<TransitionExplanationRuleRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.transition_explanation_rules)
      .where(eq(dbSchema.transition_explanation_rules.id, id));
    return result[0];
  }

  async getTransitionExplanationRulesByCompany(companyId: string): Promise<TransitionExplanationRuleRecord[]> {
    return await db.select()
      .from(dbSchema.transition_explanation_rules)
      .where(eq(dbSchema.transition_explanation_rules.company_id, companyId))
      .orderBy(desc(dbSchema.transition_explanation_rules.created_at));
  }

  async getActiveTransitionExplanationRules(companyId: string): Promise<TransitionExplanationRuleRecord[]> {
    return await db.select()
      .from(dbSchema.transition_explanation_rules)
      .where(
        and(
          eq(dbSchema.transition_explanation_rules.company_id, companyId),
          eq(dbSchema.transition_explanation_rules.is_active, true)
        )
      );
  }

  async createTransitionExplanationRule(rule: InsertTransitionExplanationRule): Promise<TransitionExplanationRuleRecord> {
    const rows = await db.insert(dbSchema.transition_explanation_rules).values(rule).returning();
    return rows[0];
  }

  async updateTransitionExplanationRule(id: string, updates: Partial<TransitionExplanationRuleRecord>): Promise<TransitionExplanationRuleRecord | undefined> {
    const rows = await db.update(dbSchema.transition_explanation_rules)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.transition_explanation_rules.id, id))
      .returning();
    return rows[0];
  }

  async deleteTransitionExplanationRule(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.transition_explanation_rules)
      .where(eq(dbSchema.transition_explanation_rules.id, id))
      .returning();
    return result.length > 0;
  }

  async checkTransitionRequiresExplanation(companyId: string, columnKey: string, newValue: string): Promise<boolean> {
    const rules = await db.select()
      .from(dbSchema.transition_explanation_rules)
      .where(
        and(
          eq(dbSchema.transition_explanation_rules.company_id, companyId),
          eq(dbSchema.transition_explanation_rules.column_key, columnKey),
          eq(dbSchema.transition_explanation_rules.dropdown_value, newValue),
          eq(dbSchema.transition_explanation_rules.is_active, true)
        )
      );
    return rules.length > 0;
  }

  // =========================================================================
  // FUTURE IMPROVEMENTS
  // =========================================================================

  async getFutureImprovements(): Promise<FutureImprovementRecord[]> {
    return await db.select()
      .from(dbSchema.future_improvements)
      .orderBy(asc(dbSchema.future_improvements.order_index), desc(dbSchema.future_improvements.created_at));
  }

  async getFutureImprovement(id: string): Promise<FutureImprovementRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.future_improvements)
      .where(eq(dbSchema.future_improvements.id, id));
    return result[0];
  }

  async createFutureImprovement(improvement: InsertFutureImprovement): Promise<FutureImprovementRecord> {
    const rows = await db.insert(dbSchema.future_improvements).values(improvement).returning();
    return rows[0];
  }

  async updateFutureImprovement(id: string, updates: Partial<FutureImprovementRecord>): Promise<FutureImprovementRecord | undefined> {
    const rows = await db.update(dbSchema.future_improvements)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(dbSchema.future_improvements.id, id))
      .returning();
    return rows[0];
  }

  async deleteFutureImprovement(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.future_improvements)
      .where(eq(dbSchema.future_improvements.id, id))
      .returning();
    return result.length > 0;
  }

  // =========================================================================
  // SYSTEM VALUE DEFINITIONS (Global System Column Values)
  // =========================================================================

  private mapSystemValueDefinition(row: any): SystemValueDefinition {
    return {
      id: row.id,
      column_type: row.column_type as SystemColumnType,
      value: row.value,
      display_order: row.display_order,
      is_active: row.is_active,
      deprecated_at: row.deprecated_at ? row.deprecated_at.toISOString() : null,
      replaced_by: row.replaced_by,
      created_at: row.created_at.toISOString(),
    };
  }

  async getSystemValueDefinitions(): Promise<SystemValueDefinition[]> {
    const result = await db.select()
      .from(dbSchema.system_value_definitions)
      .orderBy(asc(dbSchema.system_value_definitions.column_type), asc(dbSchema.system_value_definitions.display_order));
    return result.map(this.mapSystemValueDefinition);
  }

  async getSystemValueDefinitionsByType(columnType: SystemColumnType): Promise<SystemValueDefinition[]> {
    const result = await db.select()
      .from(dbSchema.system_value_definitions)
      .where(eq(dbSchema.system_value_definitions.column_type, columnType))
      .orderBy(asc(dbSchema.system_value_definitions.display_order));
    return result.map(this.mapSystemValueDefinition);
  }

  async getSystemValueDefinition(id: string): Promise<SystemValueDefinition | undefined> {
    const result = await db.select()
      .from(dbSchema.system_value_definitions)
      .where(eq(dbSchema.system_value_definitions.id, id));
    if (result.length === 0) return undefined;
    return this.mapSystemValueDefinition(result[0]);
  }

  async createSystemValueDefinition(definition: InsertSystemValueDefinition): Promise<SystemValueDefinition> {
    const rows = await db.insert(dbSchema.system_value_definitions).values(definition).returning();
    return this.mapSystemValueDefinition(rows[0]);
  }

  async updateSystemValueDefinition(id: string, updates: Partial<SystemValueDefinition>): Promise<SystemValueDefinition | undefined> {
    const dbUpdates: any = { ...updates };
    if (updates.deprecated_at) {
      dbUpdates.deprecated_at = new Date(updates.deprecated_at);
    }
    const rows = await db.update(dbSchema.system_value_definitions)
      .set(dbUpdates)
      .where(eq(dbSchema.system_value_definitions.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    return this.mapSystemValueDefinition(rows[0]);
  }

  async deleteSystemValueDefinition(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.system_value_definitions)
      .where(eq(dbSchema.system_value_definitions.id, id))
      .returning();
    return result.length > 0;
  }

  // =========================================================================
  // RAW SQL (For migrations and administrative tasks)
  // =========================================================================

  async executeRawQuery(query: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const { pool } = await import("./db");
    const result = await pool.query(query, params);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    };
  }
}

// Use PostgreSQL storage if DATABASE_URL is available, otherwise use in-memory
export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();
