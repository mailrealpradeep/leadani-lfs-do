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
  LeadTransferRequest,
  InsertLeadTransferRequestData,
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
  CustomViewColumnPreference,
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
  VisionBoardMessageRecord,
  InsertVisionBoardMessage,
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
  // Watchlist Leads
  WatchlistLead,
  watchlist_leads,
  // Followup Events (Unified follow-up tracking)
  FollowupEvent,
  FollowupEventType,
  followup_events,
  // PowerScore (Gamified Leaderboard System)
  PowerScoreRule,
  powerscore_rules,
  PowerScoreTransaction,
  powerscore_transactions,
  PowerScorePendingApproval,
  powerscore_pending_approvals,
  PowerScoreBadge,
  powerscore_badges,
  PowerScoreMilestoneBonus,
  powerscore_milestone_bonuses,
  PowerScoreLoginBonus,
  powerscore_login_bonuses,
  PowerScoreAppreciation,
  powerscore_appreciations,
  PowerScoreNotificationThreshold,
  powerscore_notification_thresholds,
  PowerScoreLoginClaim,
  powerscore_login_claims,
  PowerScoreMilestoneClaim,
  powerscore_milestone_claims,
  PowerScoreLeaderboardEntry,
  PowerScorePersonalStats,
  PowerScoreHistoryEntry,
  PowerScoreActionType,
  // PowerFlow (Pipeline Analytics)
  PowerFlowConfig,
  powerflow_configs,
  PowerFlowStage,
  PowerFlowStageMetrics,
  // Vision Board (Personal Goal Tracking)
  VisionBoard,
  InsertVisionBoard,
  vision_boards,
  VisionBoardEarning,
  InsertVisionBoardEarning,
  vision_board_earnings,
  VisionBoardImage,
  VisionBoardEffortTargets,
  VisionBoardEffortOverrides,
  // Vision Board Admin Management
  CompanyVisionBoard,
  InsertCompanyVisionBoard,
  company_vision_boards,
  CompanyVisionMonthlyTarget,
  InsertCompanyVisionMonthlyTarget,
  company_vision_monthly_targets,
  UserVisionAdminTarget,
  InsertUserVisionAdminTarget,
  user_vision_admin_targets,
  UserVisionMonthlyTarget,
  InsertUserVisionMonthlyTarget,
  user_vision_monthly_targets,
  AdminActualIncentive,
  InsertAdminActualIncentive,
  admin_actual_incentives,
  // Conversion Settings (Pipeline Stage Management)
  ConversionConfig,
  InsertConversionConfig,
  conversion_configs,
  ConversionStage,
  InsertConversionStage,
  conversion_stages,
  ConversionValue,
  InsertConversionValue,
  conversion_values,
  ConversionIncentive,
  InsertConversionIncentive,
  conversion_incentives,
  ConversionApproval,
  InsertConversionApproval,
  conversion_approvals,
  ConversionPendingApproval,
  InsertConversionPendingApproval,
  conversion_pending_approvals,
  ConversionHistory,
  InsertConversionHistory,
  conversion_history,
  ConversionSettingsComplete,
  ConversionStageMetrics,
  ConversionPipelineOverview,
  ConversionSummaryStats,
  ConversionIncentiveTier,
  ConversionTransitionApproval,
  // WhatsApp Lead Management System
  WhatsAppAllocationRecord,
  InsertWhatsAppAllocationData,
  WhatsAppTriggerRuleRecord,
  InsertWhatsAppTriggerRuleData,
  WhatsAppFieldMappingRecord,
  InsertWhatsAppFieldMappingData,
  WhatsAppDefaultValueRecord,
  InsertWhatsAppDefaultValueData,
  WhatsAppMessageLogRecord,
  InsertWhatsAppMessageLogData,
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
  ownerUserId?: string;
}

// Followup Event with joined user/lead/sheet details for admin panel
export interface FollowupEventWithDetails extends FollowupEvent {
  user_name: string | null;
  user_email: string | null;
  lead_name: string | null;
  lead_mobile: string | null;
  sheet_name: string | null;
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
  getUsersByIds(ids: string[]): Promise<User[]>;
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
  deleteWebhookLogs(ids: string[], webhookId: string): Promise<number>;

  // Lead Updates
  getLeadUpdates(leadId: string): Promise<LeadUpdate[]>;
  getLeadUpdatesBySheetId(sheetId: string): Promise<LeadUpdate[]>;
  getLastUpdatesForLeads(leadIds: string[]): Promise<Map<string, LeadUpdate>>;
  createLeadUpdate(update: InsertLeadUpdate): Promise<LeadUpdate>;
  updateLeadUpdate(id: string, updates: Partial<LeadUpdate>): Promise<LeadUpdate | undefined>;
  deleteLeadUpdate(id: string): Promise<boolean>;

  // Lead Transfer Requests
  createLeadTransferRequest(request: InsertLeadTransferRequestData): Promise<LeadTransferRequest>;
  getLeadTransferRequests(companyId: string, filters?: { status?: "pending" | "approved" | "rejected" }): Promise<LeadTransferRequest[]>;
  getLeadTransferRequest(id: string): Promise<LeadTransferRequest | undefined>;
  approveLeadTransferRequest(requestId: string, approvedBy: string): Promise<LeadTransferRequest | undefined>;
  rejectLeadTransferRequest(requestId: string, rejectedBy: string, reason: string): Promise<LeadTransferRequest | undefined>;

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
  deleteWebhookRequests(ids: string[], webhookId: string): Promise<number>;

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

  // Custom View Column Preferences
  getCustomViewColumnPreferences(userId: string, customViewId: string): Promise<CustomViewColumnPreference[]>;
  saveCustomViewColumnPreferences(userId: string, customViewId: string, preferences: Array<{column_key: string, width: number}>): Promise<void>;

  // Followup Events (Unified follow-up tracking with 1-minute deduplication)
  recordFollowupEvent(params: {
    companyId: string;
    sheetId: string;
    leadId: string;
    userId: string;
    eventTypes: FollowupEventType[];
  }): Promise<{ isNew: boolean; eventId: string }>;
  getRecentFollowupEvent(leadId: string, userId: string, windowSeconds?: number): Promise<FollowupEvent | undefined>;
  getFollowupStats(userId: string, startDate: Date, endDate: Date): Promise<{ count: number }>;
  getFollowupTransactions(companyId: string, options: {
    page?: number;
    limit?: number;
    userId?: string;
    sheetId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ transactions: FollowupEventWithDetails[]; total: number; page: number; limit: number }>;

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
  
  // Vision Board Messages
  getVisionBoardMessages(companyId: string, userId: string, includeArchived?: boolean): Promise<VisionBoardMessageRecord[]>;
  getAllVisionBoardMessages(companyId: string, includeArchived?: boolean): Promise<VisionBoardMessageRecord[]>;
  createVisionBoardMessage(message: InsertVisionBoardMessage): Promise<VisionBoardMessageRecord>;
  updateVisionBoardMessage(id: string, updates: Partial<InsertVisionBoardMessage>): Promise<VisionBoardMessageRecord>;
  deleteVisionBoardMessage(id: string): Promise<boolean>;
  archiveVisionBoardMessage(id: string): Promise<VisionBoardMessageRecord>;

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

  // =========================================================================
  // WATCHLIST LEADS (User's personal lead watchlist)
  // =========================================================================
  
  getWatchlistByUserId(userId: string): Promise<WatchlistLead[]>;
  getWatchlistLeadIds(userId: string): Promise<string[]>;
  getWatchlistLeadsBySheetAccess(userId: string, sheetIds: string[]): Promise<Lead[]>;
  addToWatchlist(userId: string, leadId: string): Promise<WatchlistLead>;
  removeFromWatchlist(userId: string, leadId: string): Promise<boolean>;
  isOnWatchlist(userId: string, leadId: string): Promise<boolean>;

  // =========================================================================
  // POWERSCORE (Gamified Leaderboard System)
  // =========================================================================

  // PowerScore Rules (Action -> Points Configuration)
  getPowerScoreRules(companyId: string): Promise<PowerScoreRule[]>;
  getPowerScoreRule(id: string): Promise<PowerScoreRule | undefined>;
  createPowerScoreRule(rule: Omit<PowerScoreRule, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreRule>;
  updatePowerScoreRule(id: string, updates: Partial<PowerScoreRule>): Promise<PowerScoreRule | undefined>;
  deletePowerScoreRule(id: string): Promise<boolean>;

  // PowerScore Transactions (Score History)
  getPowerScoreTransactions(userId: string, limit?: number): Promise<PowerScoreTransaction[]>;
  getPowerScoreTransactionsByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<PowerScoreTransaction[]>;
  getPowerScoreTransactionsByRuleAndDate(userId: string, ruleId: string, scoreDate: string): Promise<PowerScoreTransaction[]>;
  getPowerScoreTransactionsByLeadId(leadId: string): Promise<PowerScoreTransaction[]>;
  getPowerScoreTransaction(id: string): Promise<PowerScoreTransaction | undefined>;
  createPowerScoreTransaction(transaction: Omit<PowerScoreTransaction, 'id' | 'created_at'>): Promise<PowerScoreTransaction>;
  getDailyActionCount(userId: string, actionType: PowerScoreActionType, date: Date): Promise<number>;
  
  // PowerScore Transaction Admin Management
  getPowerScoreTransactionFilterValues(companyId: string, userId?: string): Promise<{
    actionTypes: string[];
    descriptions: string[];
    points: number[];
  }>;

  getPowerScoreTransactionsWithDetails(
    companyId: string,
    options?: {
      userId?: string;
      page?: number;
      limit?: number;
      actionType?: string;
      description?: string;
      points?: number;
    }
  ): Promise<{
    transactions: (PowerScoreTransaction & { user_name: string; voided_by_name?: string })[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  voidPowerScoreTransaction(
    transactionId: string,
    voidedByUserId: string,
    reason: string
  ): Promise<{ originalTransaction: PowerScoreTransaction; adjustmentTransaction: PowerScoreTransaction }>;

  // PowerScore Leaderboard & Stats
  getPowerScoreLeaderboard(companyId: string, startDate: Date, endDate: Date): Promise<PowerScoreLeaderboardEntry[]>;
  getUserPowerScore(userId: string, startDate: Date, endDate: Date): Promise<number>;
  
  // Multi-sheet user detection (for excluding from PowerScore/PowerFlow)
  getMultiSheetUserIds(companyId: string): Promise<string[]>;
  isMultiSheetUser(userId: string): Promise<boolean>;
  getUserPowerScorePersonalStats(userId: string, companyTimezone: string): Promise<PowerScorePersonalStats>;
  getUserPowerScoreHistory(userId: string, limit?: number): Promise<PowerScoreHistoryEntry[]>;
  getUserPowerScoreBreakdown(userId: string, startDate: Date, endDate: Date): Promise<{ rule_id: string; rule_name: string; action_type: string; points_earned: number; transaction_count: number; daily_cap: number | null; details?: { description: string; points: number; created_at: string }[] }[]>;

  // PowerScore Pending Approvals (For high-value actions)
  getPowerScorePendingApprovals(companyId: string): Promise<PowerScorePendingApproval[]>;
  getPowerScorePendingApproval(id: string): Promise<PowerScorePendingApproval | undefined>;
  getPendingApprovalsByRuleAndDate(userId: string, ruleId: string, scoreDate: string): Promise<PowerScorePendingApproval[]>;
  getPendingApprovalsByLeadId(leadId: string): Promise<PowerScorePendingApproval[]>;
  createPowerScorePendingApproval(approval: Omit<PowerScorePendingApproval, 'id' | 'status' | 'reviewed_by_user_id' | 'reviewed_at' | 'created_at'>): Promise<PowerScorePendingApproval>;
  approvePowerScoreApproval(id: string, reviewedBy: string): Promise<PowerScorePendingApproval | undefined>;
  rejectPowerScoreApproval(id: string, reviewedBy: string): Promise<PowerScorePendingApproval | undefined>;
  autoCancelPendingApproval(id: string, reason: string): Promise<PowerScorePendingApproval | undefined>;

  // PowerScore Badges
  getPowerScoreBadges(companyId: string): Promise<PowerScoreBadge[]>;
  createPowerScoreBadge(badge: Omit<PowerScoreBadge, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreBadge>;
  updatePowerScoreBadge(id: string, updates: Partial<PowerScoreBadge>): Promise<PowerScoreBadge | undefined>;
  deletePowerScoreBadge(id: string): Promise<boolean>;

  // PowerScore Milestone Bonuses
  getPowerScoreMilestones(companyId: string): Promise<PowerScoreMilestoneBonus[]>;
  createPowerScoreMilestone(milestone: Omit<PowerScoreMilestoneBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreMilestoneBonus>;
  updatePowerScoreMilestone(id: string, updates: Partial<PowerScoreMilestoneBonus>): Promise<PowerScoreMilestoneBonus | undefined>;
  deletePowerScoreMilestone(id: string): Promise<boolean>;

  // PowerScore Login Bonuses
  getPowerScoreLoginBonuses(companyId: string): Promise<PowerScoreLoginBonus[]>;
  createPowerScoreLoginBonus(bonus: Omit<PowerScoreLoginBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreLoginBonus>;
  updatePowerScoreLoginBonus(id: string, updates: Partial<PowerScoreLoginBonus>): Promise<PowerScoreLoginBonus | undefined>;
  deletePowerScoreLoginBonus(id: string): Promise<boolean>;

  // PowerScore Appreciations (Admin -> User rewards)
  getPowerScoreAppreciations(userId: string, unseenOnly?: boolean): Promise<PowerScoreAppreciation[]>;
  createPowerScoreAppreciation(appreciation: Omit<PowerScoreAppreciation, 'id' | 'seen' | 'created_at'>): Promise<PowerScoreAppreciation>;
  markPowerScoreAppreciationSeen(id: string): Promise<boolean>;

  // PowerScore Notification Thresholds
  getPowerScoreNotificationThresholds(companyId: string): Promise<PowerScoreNotificationThreshold[]>;
  createPowerScoreNotificationThreshold(threshold: Omit<PowerScoreNotificationThreshold, 'id' | 'created_at'>): Promise<PowerScoreNotificationThreshold>;
  deletePowerScoreNotificationThreshold(id: string): Promise<boolean>;

  // PowerScore Login/Milestone Claims (to prevent double-claiming)
  hasClaimedLoginBonus(userId: string, bonusId: string, date: Date): Promise<boolean>;
  createLoginBonusClaim(userId: string, bonusId: string, date: Date): Promise<PowerScoreLoginClaim>;
  hasClaimedMilestone(userId: string, milestoneId: string): Promise<boolean>;
  createMilestoneClaim(userId: string, milestoneId: string, score: number): Promise<PowerScoreMilestoneClaim>;

  // PowerFlow (Pipeline Analytics)
  getPowerFlowConfig(companyId: string): Promise<PowerFlowConfig | null>;
  savePowerFlowConfig(companyId: string, config: { name: string; stages: PowerFlowStage[]; is_enabled: boolean }): Promise<PowerFlowConfig>;
  getPowerFlowAnalytics(companyId: string, sheetIds: string[], stages: PowerFlowStage[], startDate: Date, endDate: Date): Promise<{ stages: PowerFlowStageMetrics[]; total_leads: number; overall_conversion_rate: number }>;

  // Vision Board (Personal Goal Tracking)
  getVisionBoard(userId: string): Promise<VisionBoard | null>;
  getVisionBoardsByCompany(companyId: string): Promise<VisionBoard[]>;
  createVisionBoard(board: InsertVisionBoard): Promise<VisionBoard>;
  updateVisionBoard(id: string, updates: Partial<VisionBoard>): Promise<VisionBoard | undefined>;
  deleteVisionBoard(id: string): Promise<boolean>;

  // Vision Board Earnings
  getVisionBoardEarnings(visionBoardId: string): Promise<VisionBoardEarning[]>;
  getVisionBoardEarningsByDateRange(visionBoardId: string, startDate: Date, endDate: Date): Promise<VisionBoardEarning[]>;
  createVisionBoardEarning(earning: InsertVisionBoardEarning): Promise<VisionBoardEarning>;
  updateVisionBoardEarning(id: string, updates: Partial<VisionBoardEarning>): Promise<VisionBoardEarning | undefined>;
  deleteVisionBoardEarning(id: string): Promise<boolean>;

  // Vision Board Admin Management - Company Vision
  getCompanyVisionBoard(companyId: string, year: number): Promise<CompanyVisionBoard | null>;
  createCompanyVisionBoard(board: InsertCompanyVisionBoard): Promise<CompanyVisionBoard>;
  updateCompanyVisionBoard(id: string, updates: Partial<CompanyVisionBoard>): Promise<CompanyVisionBoard | undefined>;
  deleteCompanyVisionBoard(id: string): Promise<boolean>;
  
  // Company Vision Monthly Targets
  getCompanyVisionMonthlyTargets(companyVisionId: string): Promise<CompanyVisionMonthlyTarget[]>;
  upsertCompanyVisionMonthlyTarget(target: InsertCompanyVisionMonthlyTarget): Promise<CompanyVisionMonthlyTarget>;
  updateCompanyVisionMonthlyTarget(id: string, updates: Partial<CompanyVisionMonthlyTarget>): Promise<CompanyVisionMonthlyTarget | undefined>;
  deleteCompanyVisionMonthlyTargets(companyVisionId: string): Promise<boolean>;
  
  // User Vision Admin Targets
  getUserVisionAdminTarget(userId: string, year: number): Promise<UserVisionAdminTarget | null>;
  getUserVisionAdminTargetsByCompany(companyId: string, year: number): Promise<UserVisionAdminTarget[]>;
  createUserVisionAdminTarget(target: InsertUserVisionAdminTarget): Promise<UserVisionAdminTarget>;
  updateUserVisionAdminTarget(id: string, updates: Partial<UserVisionAdminTarget>): Promise<UserVisionAdminTarget | undefined>;
  deleteUserVisionAdminTarget(id: string): Promise<boolean>;
  
  // User Vision Monthly Targets
  getUserVisionMonthlyTargets(userVisionId: string): Promise<UserVisionMonthlyTarget[]>;
  getUserVisionMonthlyTargetsByUser(userId: string, year: number): Promise<UserVisionMonthlyTarget[]>;
  upsertUserVisionMonthlyTarget(target: InsertUserVisionMonthlyTarget): Promise<UserVisionMonthlyTarget>;
  updateUserVisionMonthlyTarget(id: string, updates: Partial<UserVisionMonthlyTarget>): Promise<UserVisionMonthlyTarget | undefined>;
  deleteUserVisionMonthlyTargets(userVisionId: string): Promise<boolean>;
  
  // Admin Actual Incentives
  getAdminActualIncentives(companyId: string, year: number, userId?: string): Promise<AdminActualIncentive[]>;
  getAdminActualIncentivesByUser(userId: string, year: number): Promise<AdminActualIncentive[]>;
  createAdminActualIncentive(incentive: InsertAdminActualIncentive): Promise<AdminActualIncentive>;
  updateAdminActualIncentive(id: string, updates: Partial<AdminActualIncentive>): Promise<AdminActualIncentive | undefined>;
  deleteAdminActualIncentive(id: string): Promise<boolean>;

  // Conversion Settings (Pipeline Stage Management)
  getConversionConfig(companyId: string): Promise<ConversionConfig | null>;
  createConversionConfig(config: Omit<InsertConversionConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionConfig>;
  updateConversionConfig(id: string, updates: Partial<ConversionConfig>): Promise<ConversionConfig | undefined>;
  deleteConversionConfig(id: string): Promise<boolean>;
  
  // Conversion Stages
  getConversionStages(configId: string): Promise<ConversionStage[]>;
  createConversionStage(stage: Omit<InsertConversionStage, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionStage>;
  updateConversionStage(id: string, updates: Partial<ConversionStage>): Promise<ConversionStage | undefined>;
  deleteConversionStage(id: string): Promise<boolean>;
  reorderConversionStages(configId: string, stageIds: string[]): Promise<boolean>;
  
  // Conversion Values
  getConversionValue(configId: string): Promise<ConversionValue | null>;
  saveConversionValue(configId: string, value: Omit<InsertConversionValue, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionValue>;
  
  // Conversion Incentives
  getConversionIncentive(configId: string): Promise<ConversionIncentive | null>;
  saveConversionIncentive(configId: string, incentive: Omit<InsertConversionIncentive, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionIncentive>;
  
  // Conversion Approvals
  getConversionApproval(configId: string): Promise<ConversionApproval | null>;
  saveConversionApproval(configId: string, approval: Omit<InsertConversionApproval, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionApproval>;
  
  // Conversion Pending Approvals
  getConversionPendingApprovals(configId: string): Promise<ConversionPendingApproval[]>;
  createConversionPendingApproval(approval: Omit<InsertConversionPendingApproval, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionPendingApproval>;
  updateConversionPendingApproval(id: string, updates: Partial<ConversionPendingApproval>): Promise<ConversionPendingApproval | undefined>;
  
  // Conversion History
  getConversionHistory(configId: string, startDate?: Date, endDate?: Date): Promise<ConversionHistory[]>;
  createConversionHistory(history: Omit<InsertConversionHistory, 'id' | 'created_at'>): Promise<ConversionHistory>;
  
  // Conversion Settings Complete (aggregate fetch)
  getConversionSettingsComplete(companyId: string): Promise<ConversionSettingsComplete | null>;

  // WhatsApp Allocations (Phone number to user mapping)
  getWhatsAppAllocations(companyId: string): Promise<WhatsAppAllocationRecord[]>;
  getWhatsAppAllocationByPhone(companyId: string, displayPhoneNumber: string): Promise<WhatsAppAllocationRecord | undefined>;
  createWhatsAppAllocation(allocation: InsertWhatsAppAllocationData): Promise<WhatsAppAllocationRecord>;
  updateWhatsAppAllocation(id: string, updates: Partial<WhatsAppAllocationRecord>): Promise<WhatsAppAllocationRecord | undefined>;
  deleteWhatsAppAllocation(id: string): Promise<boolean>;

  // WhatsApp Trigger Rules (New lead detection rules)
  getWhatsAppTriggerRules(companyId: string): Promise<WhatsAppTriggerRuleRecord[]>;
  getWhatsAppTriggerRule(id: string): Promise<WhatsAppTriggerRuleRecord | undefined>;
  createWhatsAppTriggerRule(rule: InsertWhatsAppTriggerRuleData): Promise<WhatsAppTriggerRuleRecord>;
  updateWhatsAppTriggerRule(id: string, updates: Partial<WhatsAppTriggerRuleRecord>): Promise<WhatsAppTriggerRuleRecord | undefined>;
  deleteWhatsAppTriggerRule(id: string): Promise<boolean>;
  reorderWhatsAppTriggerRules(companyId: string, ruleIds: string[]): Promise<boolean>;

  // WhatsApp Field Mappings (Map WhatsApp fields to LFS columns)
  getWhatsAppFieldMappings(companyId: string): Promise<WhatsAppFieldMappingRecord[]>;
  createWhatsAppFieldMapping(mapping: InsertWhatsAppFieldMappingData): Promise<WhatsAppFieldMappingRecord>;
  updateWhatsAppFieldMapping(id: string, updates: Partial<WhatsAppFieldMappingRecord>): Promise<WhatsAppFieldMappingRecord | undefined>;
  deleteWhatsAppFieldMapping(id: string): Promise<boolean>;

  // WhatsApp Default Values (Fixed values for new leads)
  getWhatsAppDefaultValues(companyId: string): Promise<WhatsAppDefaultValueRecord[]>;
  createWhatsAppDefaultValue(value: InsertWhatsAppDefaultValueData): Promise<WhatsAppDefaultValueRecord>;
  updateWhatsAppDefaultValue(id: string, updates: Partial<WhatsAppDefaultValueRecord>): Promise<WhatsAppDefaultValueRecord | undefined>;
  deleteWhatsAppDefaultValue(id: string): Promise<boolean>;

  // WhatsApp Message Logs (Track processed messages)
  getWhatsAppMessageLogs(companyId: string, options?: { 
    limit?: number; 
    offset?: number;
    businessNumber?: string;
    outcome?: string;
    status?: string;
    search?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ logs: WhatsAppMessageLogRecord[]; total: number }>;
  getWhatsAppMessageLogByMessageId(companyId: string, messageId: string): Promise<WhatsAppMessageLogRecord | undefined>;
  createWhatsAppMessageLog(log: InsertWhatsAppMessageLogData): Promise<WhatsAppMessageLogRecord>;
  updateWhatsAppMessageLog(id: string, updates: Partial<WhatsAppMessageLogRecord>): Promise<WhatsAppMessageLogRecord | undefined>;
  
  // Helper methods for WhatsApp processing
  getLeadsForSheet(sheetId: string): Promise<Lead[]>;
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
  private leadTransferRequests: Map<string, LeadTransferRequest>;
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
    this.leadTransferRequests = new Map();
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

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return ids.map(id => this.users.get(id)).filter((u): u is User => u !== undefined);
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
    const defaultSheet = await this.createSheet({
      company_id: company.id,
      name: "My First Sheet",
      owner_id: admin.id,
      is_personal: false,
      visibility: "company",
      settings: {},
    });

    // Create company-wide system dropdown values
    const systemValues = await this.getSystemValueDefinitions();
    const activeSystemValues = systemValues.filter(sv => !sv.is_deprecated);
    
    // Group values by column type
    const valuesByColumn: Record<string, typeof activeSystemValues> = {};
    for (const sv of activeSystemValues) {
      if (!valuesByColumn[sv.column_type]) {
        valuesByColumn[sv.column_type] = [];
      }
      valuesByColumn[sv.column_type].push(sv);
    }
    
    // Create dropdown options for each system column type (company-wide, not sheet-specific)
    for (const [columnType, values] of Object.entries(valuesByColumn)) {
      // Sort values by order_index
      values.sort((a, b) => a.order_index - b.order_index);
      
      for (const systemValue of values) {
        await this.createDropdownOption({
          company_id: company.id,
          sheet_id: null, // Company-wide, not sheet-specific
          column_key: columnType,
          value: systemValue.value,
          order_index: systemValue.order_index,
          is_system: true,
        });
      }
    }

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
    const { sheetIds, page = 1, limit = 50, sortBy, sortOrder = 'desc', filters = {}, ownerUserId } = options;
    const sheetIdSet = new Set(sheetIds);
    
    // Filter leads by sheet IDs and not deleted
    let filteredLeads = Array.from(this.leads.values()).filter(
      (lead) => sheetIdSet.has(lead.sheet_id) && !lead.deleted_at
    );
    
    // Filter by owner user ID if provided
    if (ownerUserId) {
      filteredLeads = filteredLeads.filter(lead => lead.owner_user_id === ownerUserId);
    }
    
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
      section: (view.section as any) || "custom_views",
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

  async deleteWebhookLogs(ids: string[], webhookId: string): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const log = this.webhookLogs.get(id);
      // Only delete if it belongs to the webhook and is pending
      if (log && log.webhook_id === webhookId && 
          (log.status === 'pending_allocation' || log.status === 'pending_configuration')) {
        this.webhookLogs.delete(id);
        count++;
      }
    }
    return count;
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

  async getLastUpdatesForLeads(leadIds: string[]): Promise<Map<string, LeadUpdate>> {
    const result = new Map<string, LeadUpdate>();
    const leadIdSet = new Set(leadIds);
    
    // Get all updates for the requested leads
    const updates = Array.from(this.leadUpdates.values())
      .filter((update) => leadIdSet.has(update.lead_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Keep only the most recent update for each lead
    for (const update of updates) {
      if (!result.has(update.lead_id)) {
        result.set(update.lead_id, update);
      }
    }
    
    return result;
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

  // Lead Transfer Requests
  async createLeadTransferRequest(request: InsertLeadTransferRequestData): Promise<LeadTransferRequest> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const transferRequest: LeadTransferRequest = {
      ...request,
      id,
      status: request.status || "pending",
      approved_by_user_id: null,
      rejected_by_user_id: null,
      rejection_reason: null,
      approved_at: null,
      rejected_at: null,
      created_at: now,
      updated_at: now,
    };
    this.leadTransferRequests.set(id, transferRequest);
    return transferRequest;
  }

  async getLeadTransferRequests(companyId: string, filters?: { status?: "pending" | "approved" | "rejected" }): Promise<LeadTransferRequest[]> {
    // Get all sheets for the company
    const companySheets = Array.from(this.sheets.values()).filter(s => s.company_id === companyId);
    const sheetIds = new Set(companySheets.map(s => s.id));
    
    // Get all transfer requests for leads in company sheets
    let requests = Array.from(this.leadTransferRequests.values())
      .filter(req => {
        const lead = this.leads.get(req.lead_id);
        return lead && sheetIds.has(lead.sheet_id);
      });
    
    if (filters?.status) {
      requests = requests.filter(req => req.status === filters.status);
    }
    
    return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getLeadTransferRequest(id: string): Promise<LeadTransferRequest | undefined> {
    return this.leadTransferRequests.get(id);
  }

  async approveLeadTransferRequest(requestId: string, approvedBy: string): Promise<LeadTransferRequest | undefined> {
    const request = this.leadTransferRequests.get(requestId);
    if (!request) return undefined;
    
    const now = new Date().toISOString();
    const updated: LeadTransferRequest = {
      ...request,
      status: "approved",
      approved_by_user_id: approvedBy,
      approved_at: now,
      updated_at: now,
    };
    this.leadTransferRequests.set(requestId, updated);
    return updated;
  }

  async rejectLeadTransferRequest(requestId: string, rejectedBy: string, reason: string): Promise<LeadTransferRequest | undefined> {
    const request = this.leadTransferRequests.get(requestId);
    if (!request) return undefined;
    
    const now = new Date().toISOString();
    const updated: LeadTransferRequest = {
      ...request,
      status: "rejected",
      rejected_by_user_id: rejectedBy,
      rejection_reason: reason,
      rejected_at: now,
      updated_at: now,
    };
    this.leadTransferRequests.set(requestId, updated);
    return updated;
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

  async deleteWebhookRequests(ids: string[], webhookId: string): Promise<number> {
    return 0;
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

  // Custom View Column Preferences (MemStorage)
  private customViewColumnPreferences: Map<string, CustomViewColumnPreference> = new Map();

  async getCustomViewColumnPreferences(userId: string, customViewId: string): Promise<CustomViewColumnPreference[]> {
    return Array.from(this.customViewColumnPreferences.values()).filter(
      pref => pref.user_id === userId && pref.custom_view_id === customViewId
    );
  }

  async saveCustomViewColumnPreferences(userId: string, customViewId: string, preferences: Array<{column_key: string, width: number}>): Promise<void> {
    // Delete existing preferences for this user+custom view combo
    const toDelete = Array.from(this.customViewColumnPreferences.entries())
      .filter(([_, pref]) => pref.user_id === userId && pref.custom_view_id === customViewId)
      .map(([id]) => id);
    toDelete.forEach(id => this.customViewColumnPreferences.delete(id));

    // Insert new preferences
    const now = new Date().toISOString();
    preferences.forEach(pref => {
      const id = randomUUID();
      const preference: CustomViewColumnPreference = {
        id,
        user_id: userId,
        custom_view_id: customViewId,
        column_key: pref.column_key,
        width: pref.width,
        created_at: now,
        updated_at: now,
      };
      this.customViewColumnPreferences.set(id, preference);
    });
  }

  // Followup Events (MemStorage - unified follow-up tracking with 60-second sliding window)
  private followupEvents: Map<string, FollowupEvent> = new Map();
  private readonly FOLLOWUP_DEDUP_SECONDS = 60;

  // Generate a unique window key for deduplication: "leadId:userId:YYYY-MM-DD-HH-MM"
  private generateWindowKey(leadId: string, userId: string, timestamp: Date): string {
    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hour = String(timestamp.getUTCHours()).padStart(2, '0');
    const minute = String(timestamp.getUTCMinutes()).padStart(2, '0');
    const shortLeadId = leadId.slice(-8);
    const shortUserId = userId.slice(-8);
    return `${shortLeadId}:${shortUserId}:${year}${month}${day}${hour}${minute}`;
  }

  async recordFollowupEvent(params: {
    companyId: string;
    sheetId: string;
    leadId: string;
    userId: string;
    eventTypes: FollowupEventType[];
  }): Promise<{ isNew: boolean; eventId: string }> {
    const { companyId, sheetId, leadId, userId, eventTypes } = params;
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.FOLLOWUP_DEDUP_SECONDS * 1000);
    
    // First, check for any existing event within the true 60-second sliding window
    // Use updated_at (not triggered_at) so merged events keep the row alive for 60s
    const recentEvent = Array.from(this.followupEvents.values()).find(
      event => event.lead_id === leadId && 
               event.user_id === userId && 
               new Date(event.updated_at) >= cutoff
    );
    
    if (recentEvent) {
      // Update existing event - merge event types
      const existingTypes = recentEvent.event_types || [];
      const mergedTypes = [...new Set([...existingTypes, ...eventTypes])] as FollowupEventType[];
      const updated: FollowupEvent = {
        ...recentEvent,
        event_types: mergedTypes,
        updated_at: now,
      };
      this.followupEvents.set(recentEvent.id, updated);
      return { isNew: false, eventId: recentEvent.id };
    }
    
    // Create new event
    const id = randomUUID();
    const windowKey = this.generateWindowKey(leadId, userId, now);
    const newEvent: FollowupEvent = {
      id,
      company_id: companyId,
      sheet_id: sheetId,
      lead_id: leadId,
      user_id: userId,
      event_types: eventTypes,
      window_key: windowKey,
      triggered_at: now,
      updated_at: now,
    };
    this.followupEvents.set(id, newEvent);
    return { isNew: true, eventId: id };
  }

  async getRecentFollowupEvent(leadId: string, userId: string, windowSeconds: number = 60): Promise<FollowupEvent | undefined> {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    return Array.from(this.followupEvents.values()).find(
      event => event.lead_id === leadId && 
               event.user_id === userId && 
               new Date(event.triggered_at) >= cutoff
    );
  }

  async getFollowupStats(userId: string, startDate: Date, endDate: Date): Promise<{ count: number }> {
    const events = Array.from(this.followupEvents.values()).filter(
      event => event.user_id === userId &&
               new Date(event.triggered_at) >= startDate &&
               new Date(event.triggered_at) <= endDate
    );
    return { count: events.length };
  }

  async getFollowupTransactions(companyId: string, options: {
    page?: number;
    limit?: number;
    userId?: string;
    sheetId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ transactions: FollowupEventWithDetails[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, userId, sheetId, startDate, endDate } = options;
    
    let events = Array.from(this.followupEvents.values()).filter(e => e.company_id === companyId);
    
    if (userId) events = events.filter(e => e.user_id === userId);
    if (sheetId) events = events.filter(e => e.sheet_id === sheetId);
    if (startDate) events = events.filter(e => new Date(e.triggered_at) >= startDate);
    if (endDate) events = events.filter(e => new Date(e.triggered_at) <= endDate);
    
    // Sort by triggered_at desc
    events.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
    
    const total = events.length;
    const offset = (page - 1) * limit;
    const paginatedEvents = events.slice(offset, offset + limit);
    
    // For MemStorage, we'll just return minimal details
    const transactions: FollowupEventWithDetails[] = paginatedEvents.map(e => ({
      ...e,
      user_name: null,
      user_email: null,
      lead_name: null,
      lead_mobile: null,
      sheet_name: null,
    }));
    
    return { transactions, total, page, limit };
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

  // Watchlist Leads (not implemented in MemStorage - requires PostgreSQL)
  async getWatchlistByUserId(_userId: string): Promise<WatchlistLead[]> {
    return [];
  }
  async getWatchlistLeadIds(_userId: string): Promise<string[]> {
    return [];
  }
  async getWatchlistLeadsBySheetAccess(_userId: string, _sheetIds: string[]): Promise<Lead[]> {
    return [];
  }
  async addToWatchlist(_userId: string, _leadId: string): Promise<WatchlistLead> {
    throw new Error("Watchlist not implemented in MemStorage");
  }
  async removeFromWatchlist(_userId: string, _leadId: string): Promise<boolean> {
    return false;
  }
  async isOnWatchlist(_userId: string, _leadId: string): Promise<boolean> {
    return false;
  }

  // PowerScore (not implemented in MemStorage - requires PostgreSQL)
  async getPowerScoreRules(_companyId: string): Promise<PowerScoreRule[]> { return []; }
  async getPowerScoreRule(_id: string): Promise<PowerScoreRule | undefined> { return undefined; }
  async createPowerScoreRule(_rule: Omit<PowerScoreRule, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreRule> { throw new Error("PowerScore not implemented in MemStorage"); }
  async updatePowerScoreRule(_id: string, _updates: Partial<PowerScoreRule>): Promise<PowerScoreRule | undefined> { return undefined; }
  async deletePowerScoreRule(_id: string): Promise<boolean> { return false; }
  async getPowerScoreTransactions(_userId: string, _limit?: number): Promise<PowerScoreTransaction[]> { return []; }
  async getPowerScoreTransactionsByCompany(_companyId: string, _startDate?: Date, _endDate?: Date): Promise<PowerScoreTransaction[]> { return []; }
  async getPowerScoreTransactionsByRuleAndDate(_userId: string, _ruleId: string, _scoreDate: string): Promise<PowerScoreTransaction[]> { return []; }
  async getPowerScoreTransactionsByLeadId(_leadId: string): Promise<PowerScoreTransaction[]> { return []; }
  async getPowerScoreTransaction(_id: string): Promise<PowerScoreTransaction | undefined> { return undefined; }
  async createPowerScoreTransaction(_transaction: Omit<PowerScoreTransaction, 'id' | 'created_at'>): Promise<PowerScoreTransaction> { throw new Error("PowerScore not implemented in MemStorage"); }
  async getDailyActionCount(_userId: string, _actionType: PowerScoreActionType, _date: Date): Promise<number> { return 0; }
  async getPowerScoreTransactionFilterValues(_companyId: string, _userId?: string): Promise<{ actionTypes: string[]; descriptions: string[]; points: number[] }> { return { actionTypes: [], descriptions: [], points: [] }; }
  async getPowerScoreTransactionsWithDetails(_companyId: string, _options?: { userId?: string; page?: number; limit?: number; actionType?: string; description?: string; points?: number }): Promise<{ transactions: (PowerScoreTransaction & { user_name: string; voided_by_name?: string })[]; total: number; page: number; totalPages: number }> { return { transactions: [], total: 0, page: 1, totalPages: 0 }; }
  async voidPowerScoreTransaction(_transactionId: string, _voidedByUserId: string, _reason: string): Promise<{ originalTransaction: PowerScoreTransaction; adjustmentTransaction: PowerScoreTransaction }> { throw new Error("PowerScore not implemented in MemStorage"); }
  async getPowerScoreLeaderboard(_companyId: string, _startDate: Date, _endDate: Date): Promise<PowerScoreLeaderboardEntry[]> { return []; }
  async getUserPowerScore(_userId: string, _startDate: Date, _endDate: Date): Promise<number> { return 0; }
  async getMultiSheetUserIds(_companyId: string): Promise<string[]> { return []; }
  async isMultiSheetUser(_userId: string): Promise<boolean> { return false; }
  async getUserPowerScorePersonalStats(_userId: string, _companyTimezone: string): Promise<PowerScorePersonalStats> { return { today: 0, yesterday: 0, this_week: 0, last_week: 0, this_month: 0, last_month: 0, today_vs_yesterday_percent: 0, this_week_vs_last_week_percent: 0 }; }
  async getUserPowerScoreHistory(_userId: string, _limit?: number): Promise<PowerScoreHistoryEntry[]> { return []; }
  async getUserPowerScoreBreakdown(_userId: string, _startDate: Date, _endDate: Date): Promise<{ rule_id: string; rule_name: string; action_type: string; points_earned: number; transaction_count: number; daily_cap: number | null; details?: { description: string; points: number; created_at: string }[] }[]> { return []; }
  async getPowerScorePendingApprovals(_companyId: string): Promise<PowerScorePendingApproval[]> { return []; }
  async getPowerScorePendingApproval(_id: string): Promise<PowerScorePendingApproval | undefined> { return undefined; }
  async getPendingApprovalsByRuleAndDate(_userId: string, _ruleId: string, _scoreDate: string): Promise<PowerScorePendingApproval[]> { return []; }
  async getPendingApprovalsByLeadId(_leadId: string): Promise<PowerScorePendingApproval[]> { return []; }
  async createPowerScorePendingApproval(_approval: Omit<PowerScorePendingApproval, 'id' | 'status' | 'reviewed_by_user_id' | 'reviewed_at' | 'created_at'>): Promise<PowerScorePendingApproval> { throw new Error("PowerScore not implemented in MemStorage"); }
  async approvePowerScoreApproval(_id: string, _reviewedBy: string): Promise<PowerScorePendingApproval | undefined> { return undefined; }
  async rejectPowerScoreApproval(_id: string, _reviewedBy: string): Promise<PowerScorePendingApproval | undefined> { return undefined; }
  async autoCancelPendingApproval(_id: string, _reason: string): Promise<PowerScorePendingApproval | undefined> { return undefined; }
  async getPowerScoreBadges(_companyId: string): Promise<PowerScoreBadge[]> { return []; }
  async createPowerScoreBadge(_badge: Omit<PowerScoreBadge, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreBadge> { throw new Error("PowerScore not implemented in MemStorage"); }
  async updatePowerScoreBadge(_id: string, _updates: Partial<PowerScoreBadge>): Promise<PowerScoreBadge | undefined> { return undefined; }
  async deletePowerScoreBadge(_id: string): Promise<boolean> { return false; }
  async getPowerScoreMilestones(_companyId: string): Promise<PowerScoreMilestoneBonus[]> { return []; }
  async createPowerScoreMilestone(_milestone: Omit<PowerScoreMilestoneBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreMilestoneBonus> { throw new Error("PowerScore not implemented in MemStorage"); }
  async updatePowerScoreMilestone(_id: string, _updates: Partial<PowerScoreMilestoneBonus>): Promise<PowerScoreMilestoneBonus | undefined> { return undefined; }
  async deletePowerScoreMilestone(_id: string): Promise<boolean> { return false; }
  async getPowerScoreLoginBonuses(_companyId: string): Promise<PowerScoreLoginBonus[]> { return []; }
  async createPowerScoreLoginBonus(_bonus: Omit<PowerScoreLoginBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreLoginBonus> { throw new Error("PowerScore not implemented in MemStorage"); }
  async updatePowerScoreLoginBonus(_id: string, _updates: Partial<PowerScoreLoginBonus>): Promise<PowerScoreLoginBonus | undefined> { return undefined; }
  async deletePowerScoreLoginBonus(_id: string): Promise<boolean> { return false; }
  async getPowerScoreAppreciations(_userId: string, _unseenOnly?: boolean): Promise<PowerScoreAppreciation[]> { return []; }
  async createPowerScoreAppreciation(_appreciation: Omit<PowerScoreAppreciation, 'id' | 'seen' | 'created_at'>): Promise<PowerScoreAppreciation> { throw new Error("PowerScore not implemented in MemStorage"); }
  async markPowerScoreAppreciationSeen(_id: string): Promise<boolean> { return false; }
  async getPowerScoreNotificationThresholds(_companyId: string): Promise<PowerScoreNotificationThreshold[]> { return []; }
  async createPowerScoreNotificationThreshold(_threshold: Omit<PowerScoreNotificationThreshold, 'id' | 'created_at'>): Promise<PowerScoreNotificationThreshold> { throw new Error("PowerScore not implemented in MemStorage"); }
  async deletePowerScoreNotificationThreshold(_id: string): Promise<boolean> { return false; }
  async hasClaimedLoginBonus(_userId: string, _bonusId: string, _date: Date): Promise<boolean> { return false; }
  async createLoginBonusClaim(_userId: string, _bonusId: string, _date: Date): Promise<PowerScoreLoginClaim> { throw new Error("PowerScore not implemented in MemStorage"); }
  async hasClaimedMilestone(_userId: string, _milestoneId: string): Promise<boolean> { return false; }
  async createMilestoneClaim(_userId: string, _milestoneId: string, _score: number): Promise<PowerScoreMilestoneClaim> { throw new Error("PowerScore not implemented in MemStorage"); }

  // PowerFlow (Pipeline Analytics) - stubs
  async getPowerFlowConfig(_companyId: string): Promise<PowerFlowConfig | null> { return null; }
  async savePowerFlowConfig(_companyId: string, _config: { name: string; stages: PowerFlowStage[]; is_enabled: boolean }): Promise<PowerFlowConfig> { throw new Error("PowerFlow not implemented in MemStorage"); }
  async getPowerFlowAnalytics(_companyId: string, _sheetIds: string[], _stages: PowerFlowStage[], _startDate: Date, _endDate: Date): Promise<{ stages: PowerFlowStageMetrics[]; total_leads: number; overall_conversion_rate: number }> { return { stages: [], total_leads: 0, overall_conversion_rate: 0 }; }

  // Vision Board (Personal Goal Tracking) - stubs
  private visionBoards = new Map<string, VisionBoard>();
  private visionBoardEarnings = new Map<string, VisionBoardEarning>();

  async getVisionBoard(_userId: string): Promise<VisionBoard | null> { return null; }
  async getVisionBoardsByCompany(_companyId: string): Promise<VisionBoard[]> { return []; }
  async createVisionBoard(_board: InsertVisionBoard): Promise<VisionBoard> { throw new Error("Vision Board not implemented in MemStorage"); }
  async updateVisionBoard(_id: string, _updates: Partial<VisionBoard>): Promise<VisionBoard | undefined> { return undefined; }
  async deleteVisionBoard(_id: string): Promise<boolean> { return false; }
  async getVisionBoardEarnings(_visionBoardId: string): Promise<VisionBoardEarning[]> { return []; }
  async getVisionBoardEarningsByDateRange(_visionBoardId: string, _startDate: Date, _endDate: Date): Promise<VisionBoardEarning[]> { return []; }
  async createVisionBoardEarning(_earning: InsertVisionBoardEarning): Promise<VisionBoardEarning> { throw new Error("Vision Board not implemented in MemStorage"); }
  async updateVisionBoardEarning(_id: string, _updates: Partial<VisionBoardEarning>): Promise<VisionBoardEarning | undefined> { return undefined; }
  async deleteVisionBoardEarning(_id: string): Promise<boolean> { return false; }
  
  // Vision Board Admin Management - stubs
  async getCompanyVisionBoard(_companyId: string, _year: number): Promise<CompanyVisionBoard | null> { return null; }
  async createCompanyVisionBoard(_board: InsertCompanyVisionBoard): Promise<CompanyVisionBoard> { throw new Error("Vision Board Admin not implemented in MemStorage"); }
  async updateCompanyVisionBoard(_id: string, _updates: Partial<CompanyVisionBoard>): Promise<CompanyVisionBoard | undefined> { return undefined; }
  async deleteCompanyVisionBoard(_id: string): Promise<boolean> { return false; }
  async getCompanyVisionMonthlyTargets(_companyVisionId: string): Promise<CompanyVisionMonthlyTarget[]> { return []; }
  async upsertCompanyVisionMonthlyTarget(_target: InsertCompanyVisionMonthlyTarget): Promise<CompanyVisionMonthlyTarget> { throw new Error("Vision Board Admin not implemented in MemStorage"); }
  async updateCompanyVisionMonthlyTarget(_id: string, _updates: Partial<CompanyVisionMonthlyTarget>): Promise<CompanyVisionMonthlyTarget | undefined> { return undefined; }
  async deleteCompanyVisionMonthlyTargets(_companyVisionId: string): Promise<boolean> { return false; }
  async getUserVisionAdminTarget(_userId: string, _year: number): Promise<UserVisionAdminTarget | null> { return null; }
  async getUserVisionAdminTargetsByCompany(_companyId: string, _year: number): Promise<UserVisionAdminTarget[]> { return []; }
  async createUserVisionAdminTarget(_target: InsertUserVisionAdminTarget): Promise<UserVisionAdminTarget> { throw new Error("Vision Board Admin not implemented in MemStorage"); }
  async updateUserVisionAdminTarget(_id: string, _updates: Partial<UserVisionAdminTarget>): Promise<UserVisionAdminTarget | undefined> { return undefined; }
  async deleteUserVisionAdminTarget(_id: string): Promise<boolean> { return false; }
  async getUserVisionMonthlyTargets(_userVisionId: string): Promise<UserVisionMonthlyTarget[]> { return []; }
  async getUserVisionMonthlyTargetsByUser(_userId: string, _year: number): Promise<UserVisionMonthlyTarget[]> { return []; }
  async upsertUserVisionMonthlyTarget(_target: InsertUserVisionMonthlyTarget): Promise<UserVisionMonthlyTarget> { throw new Error("Vision Board Admin not implemented in MemStorage"); }
  async updateUserVisionMonthlyTarget(_id: string, _updates: Partial<UserVisionMonthlyTarget>): Promise<UserVisionMonthlyTarget | undefined> { return undefined; }
  async deleteUserVisionMonthlyTargets(_userVisionId: string): Promise<boolean> { return false; }
  async getAdminActualIncentives(_companyId: string, _year: number, _userId?: string): Promise<AdminActualIncentive[]> { return []; }
  async getAdminActualIncentivesByUser(_userId: string, _year: number): Promise<AdminActualIncentive[]> { return []; }
  async createAdminActualIncentive(_incentive: InsertAdminActualIncentive): Promise<AdminActualIncentive> { throw new Error("Vision Board Admin not implemented in MemStorage"); }
  async updateAdminActualIncentive(_id: string, _updates: Partial<AdminActualIncentive>): Promise<AdminActualIncentive | undefined> { return undefined; }
  async deleteAdminActualIncentive(_id: string): Promise<boolean> { return false; }

  // Conversion Settings (Pipeline Stage Management) - stubs
  async getConversionConfig(_companyId: string): Promise<ConversionConfig | null> { return null; }
  async createConversionConfig(_config: Omit<InsertConversionConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionConfig> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async updateConversionConfig(_id: string, _updates: Partial<ConversionConfig>): Promise<ConversionConfig | undefined> { return undefined; }
  async deleteConversionConfig(_id: string): Promise<boolean> { return false; }
  async getConversionStages(_configId: string): Promise<ConversionStage[]> { return []; }
  async createConversionStage(_stage: Omit<InsertConversionStage, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionStage> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async updateConversionStage(_id: string, _updates: Partial<ConversionStage>): Promise<ConversionStage | undefined> { return undefined; }
  async deleteConversionStage(_id: string): Promise<boolean> { return false; }
  async reorderConversionStages(_configId: string, _stageIds: string[]): Promise<boolean> { return false; }
  async getConversionValue(_configId: string): Promise<ConversionValue | null> { return null; }
  async saveConversionValue(_configId: string, _value: Omit<InsertConversionValue, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionValue> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async getConversionIncentive(_configId: string): Promise<ConversionIncentive | null> { return null; }
  async saveConversionIncentive(_configId: string, _incentive: Omit<InsertConversionIncentive, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionIncentive> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async getConversionApproval(_configId: string): Promise<ConversionApproval | null> { return null; }
  async saveConversionApproval(_configId: string, _approval: Omit<InsertConversionApproval, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionApproval> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async getConversionPendingApprovals(_configId: string): Promise<ConversionPendingApproval[]> { return []; }
  async createConversionPendingApproval(_approval: Omit<InsertConversionPendingApproval, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionPendingApproval> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async updateConversionPendingApproval(_id: string, _updates: Partial<ConversionPendingApproval>): Promise<ConversionPendingApproval | undefined> { return undefined; }
  async getConversionHistory(_configId: string, _startDate?: Date, _endDate?: Date): Promise<ConversionHistory[]> { return []; }
  async createConversionHistory(_history: Omit<InsertConversionHistory, 'id' | 'created_at'>): Promise<ConversionHistory> { throw new Error("Conversion Settings not implemented in MemStorage"); }
  async getConversionSettingsComplete(_companyId: string): Promise<ConversionSettingsComplete | null> { return null; }

  // WhatsApp Lead Management - stubs
  async getWhatsAppAllocations(_companyId: string): Promise<WhatsAppAllocationRecord[]> { return []; }
  async getWhatsAppAllocationByPhone(_companyId: string, _displayPhoneNumber: string): Promise<WhatsAppAllocationRecord | undefined> { return undefined; }
  async createWhatsAppAllocation(_allocation: InsertWhatsAppAllocationData): Promise<WhatsAppAllocationRecord> { throw new Error("WhatsApp not implemented in MemStorage"); }
  async updateWhatsAppAllocation(_id: string, _updates: Partial<WhatsAppAllocationRecord>): Promise<WhatsAppAllocationRecord | undefined> { return undefined; }
  async deleteWhatsAppAllocation(_id: string): Promise<boolean> { return false; }
  async getWhatsAppTriggerRules(_companyId: string): Promise<WhatsAppTriggerRuleRecord[]> { return []; }
  async getWhatsAppTriggerRule(_id: string): Promise<WhatsAppTriggerRuleRecord | undefined> { return undefined; }
  async createWhatsAppTriggerRule(_rule: InsertWhatsAppTriggerRuleData): Promise<WhatsAppTriggerRuleRecord> { throw new Error("WhatsApp not implemented in MemStorage"); }
  async updateWhatsAppTriggerRule(_id: string, _updates: Partial<WhatsAppTriggerRuleRecord>): Promise<WhatsAppTriggerRuleRecord | undefined> { return undefined; }
  async deleteWhatsAppTriggerRule(_id: string): Promise<boolean> { return false; }
  async reorderWhatsAppTriggerRules(_companyId: string, _ruleIds: string[]): Promise<boolean> { return false; }
  async getWhatsAppFieldMappings(_companyId: string): Promise<WhatsAppFieldMappingRecord[]> { return []; }
  async createWhatsAppFieldMapping(_mapping: InsertWhatsAppFieldMappingData): Promise<WhatsAppFieldMappingRecord> { throw new Error("WhatsApp not implemented in MemStorage"); }
  async updateWhatsAppFieldMapping(_id: string, _updates: Partial<WhatsAppFieldMappingRecord>): Promise<WhatsAppFieldMappingRecord | undefined> { return undefined; }
  async deleteWhatsAppFieldMapping(_id: string): Promise<boolean> { return false; }
  async getWhatsAppDefaultValues(_companyId: string): Promise<WhatsAppDefaultValueRecord[]> { return []; }
  async createWhatsAppDefaultValue(_value: InsertWhatsAppDefaultValueData): Promise<WhatsAppDefaultValueRecord> { throw new Error("WhatsApp not implemented in MemStorage"); }
  async updateWhatsAppDefaultValue(_id: string, _updates: Partial<WhatsAppDefaultValueRecord>): Promise<WhatsAppDefaultValueRecord | undefined> { return undefined; }
  async deleteWhatsAppDefaultValue(_id: string): Promise<boolean> { return false; }
  async getWhatsAppMessageLogs(_companyId: string, _options?: { limit?: number; offset?: number; businessNumber?: string; outcome?: string; status?: string; search?: string; fromDate?: Date; toDate?: Date; }): Promise<{ logs: WhatsAppMessageLogRecord[]; total: number }> { return { logs: [], total: 0 }; }
  async getWhatsAppMessageLogByMessageId(_companyId: string, _messageId: string): Promise<WhatsAppMessageLogRecord | undefined> { return undefined; }
  async createWhatsAppMessageLog(_log: InsertWhatsAppMessageLogData): Promise<WhatsAppMessageLogRecord> { throw new Error("WhatsApp not implemented in MemStorage"); }
  async updateWhatsAppMessageLog(_id: string, _updates: Partial<WhatsAppMessageLogRecord>): Promise<WhatsAppMessageLogRecord | undefined> { return undefined; }
  async getLeadsForSheet(sheetId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.sheet_id === sheetId && !lead.is_deleted);
  }
}

// ============================================================================
// POSTGRESQL STORAGE (Permanent Database)
// ============================================================================
import { db } from "./db";
import { eq, and, or, desc, asc, isNull, isNotNull, inArray, notInArray, gte, lte, gt, lt, sql, ilike } from "drizzle-orm";
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

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const result = await db.select().from(dbSchema.users).where(inArray(dbSchema.users.id, ids));
    return result.map(u => this.mapUser(u));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email lookup to handle user typing "John@Example.com" vs "john@example.com"
    const result = await db.select().from(dbSchema.users).where(ilike(dbSchema.users.email, email));
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

    // Create default columns for the company
    const { getDefaultColumnsForCompany } = await import("@shared/schema");
    const defaultColumns = getDefaultColumnsForCompany(company.id);
    for (const columnDef of defaultColumns) {
      await this.createCustomColumn(columnDef);
    }

    // Create default sheet for the company
    const defaultSheet = await this.createSheet({
      company_id: company.id,
      name: "My First Sheet",
      owner_id: admin.id,
      is_personal: false,
      visibility: "company",
      settings: {},
    });

    // Create company-wide system dropdown values
    const systemValues = await this.getSystemValueDefinitions();
    const activeSystemValues = systemValues.filter(sv => !sv.is_deprecated);
    
    // Group values by column type
    const valuesByColumn: Record<string, typeof activeSystemValues> = {};
    for (const sv of activeSystemValues) {
      if (!valuesByColumn[sv.column_type]) {
        valuesByColumn[sv.column_type] = [];
      }
      valuesByColumn[sv.column_type].push(sv);
    }
    
    // Create dropdown options for each system column type (company-wide, not sheet-specific)
    for (const [columnType, values] of Object.entries(valuesByColumn)) {
      // Sort values by order_index
      values.sort((a, b) => a.order_index - b.order_index);
      
      for (const systemValue of values) {
        await this.createDropdownOption({
          company_id: company.id,
          sheet_id: null, // Company-wide, not sheet-specific
          column_key: columnType,
          value: systemValue.value,
          order_index: systemValue.order_index,
          is_system: true,
        });
      }
    }

    // Create audit log
    await this.createAuditLog({
      user_id: admin.id,
      company_id: company.id,
      action: "company_signup",
      model: "Company",
      model_id: company.id,
      payload: { company_name: companyName, admin_email: adminEmail },
    });

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
    const { sheetIds, page = 1, limit = 50, sortBy, sortOrder = 'desc', filters, quickFilter, companyTimezone, ownerUserId } = options;
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
    
    // Filter by owner user ID if provided
    if (ownerUserId) {
      conditions.push(eq(dbSchema.leads.owner_user_id, ownerUserId));
    }
    
    // Add filter conditions
    for (const [key, value] of Object.entries(safeFilters)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Handle thought filter (meta field)
      if (key === 'thought' && typeof value === 'string') {
        conditions.push(sql`${dbSchema.leads.meta}->>'thought' = ${value}`);
        continue;
      }
      
      // Handle ai_rating filter (native column on leads table, not custom_fields)
      if (key === 'ai_rating') {
        if (typeof value === 'object' && value !== null && 'exactMatch' in value) {
          const exactFilter = value as { value: string; exactMatch: boolean };
          // Handle "New" specially - it means NULL or "New" in the database
          if (exactFilter.value === 'New') {
            conditions.push(sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = 'New')`);
          } else {
            conditions.push(sql`${dbSchema.leads.ai_rating} = ${exactFilter.value}`);
          }
        } else if (typeof value === 'string') {
          if (value === 'New') {
            conditions.push(sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = 'New')`);
          } else {
            conditions.push(sql`${dbSchema.leads.ai_rating} = ${value}`);
          }
        }
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
            // Check that the custom field value is not NULL and not an empty string before casting to date
            // Use NULLIF to convert empty strings to NULL, then check for NULL before casting
            conditions.push(sql`(
              NULLIF(${dbSchema.leads.custom_fields}->>${key}, '') IS NOT NULL 
              AND (NULLIF(${dbSchema.leads.custom_fields}->>${key}, '')::date >= ${dateFilter.from}::date)
              AND (NULLIF(${dbSchema.leads.custom_fields}->>${key}, '')::date <= ${dateFilter.to}::date)
            )`);
          }
        }
      }
      // Handle dropdown exact match (object with exactMatch flag)
      else if (typeof value === 'object' && value !== null && 'exactMatch' in value) {
        const exactFilter = value as { value: string; exactMatch: boolean };
        conditions.push(sql`${dbSchema.leads.custom_fields}->>${key} = ${exactFilter.value}`);
      }
      // Handle 'in' operator for multiple values (OR logic)
      else if (typeof value === 'object' && value !== null && 'operator' in value && (value as any).operator === 'in' && Array.isArray((value as any).values)) {
        const inFilter = value as { values: string[]; operator: string };
        if (inFilter.values.length > 0) {
          // Build OR conditions for each value (PostgreSQL ANY with proper array syntax)
          const orConditions = inFilter.values.map(v => sql`${dbSchema.leads.custom_fields}->>${key} = ${v}`);
          conditions.push(or(...orConditions)!);
        }
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
      
      // Store tuples of {sql, nextOperator} to keep indices aligned
      // This is important because some operators may skip adding SQL (e.g., 'in' with empty array)
      const quickFilterTuples: { sqlExpr: any; nextOperator: string }[] = [];
      
      for (const condition of quickFilter.conditions) {
        const { column_key, operator, value, relative_date } = condition;
        const conditionNextOp = (condition as any).next_operator || quickFilter.logical_operator || 'and';
        
        // Resolve target date for comparison
        const targetDate = relative_date ? resolveRelativeDate(relative_date) : (value || '');
        
        let sqlExpr: any = null;
        
        // Special handling for ai_rating (native column, not custom_fields)
        if (column_key === 'ai_rating') {
          switch (operator) {
            case 'is_empty':
              sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = '')`;
              break;
            case 'is_not_empty':
              sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NOT NULL AND ${dbSchema.leads.ai_rating} != '')`;
              break;
            case 'equals':
              if (value === 'New') {
                sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = 'New')`;
              } else {
                sqlExpr = sql`${dbSchema.leads.ai_rating} = ${value}`;
              }
              break;
            case 'not_equals':
              if (value === 'New') {
                sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NOT NULL AND ${dbSchema.leads.ai_rating} != 'New')`;
              } else {
                sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} != ${value})`;
              }
              break;
            case 'in':
              if (Array.isArray(value) && value.length > 0) {
                // Handle "New" specially in the array
                if (value.includes('New')) {
                  const otherValues = value.filter((v: string) => v !== 'New');
                  if (otherValues.length > 0) {
                    sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = ANY(${value}))`;
                  } else {
                    sqlExpr = sql`(${dbSchema.leads.ai_rating} IS NULL OR ${dbSchema.leads.ai_rating} = 'New')`;
                  }
                } else {
                  sqlExpr = sql`${dbSchema.leads.ai_rating} = ANY(${value})`;
                }
              }
              break;
            default:
              if (value !== undefined && value !== null) {
                sqlExpr = sql`${dbSchema.leads.ai_rating} = ${String(value)}`;
              }
          }
        } else {
          // Standard custom_fields handling
          switch (operator) {
            case 'is_empty':
              sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NULL OR ${dbSchema.leads.custom_fields}->>${column_key} = '')`;
              break;
              
            case 'is_not_empty':
              sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NOT NULL AND ${dbSchema.leads.custom_fields}->>${column_key} != '')`;
              break;
              
            case 'date_before':
            case 'before':
              // Check that the custom field value is not NULL and not an empty string before casting to date
              sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NOT NULL AND ${dbSchema.leads.custom_fields}->>${column_key} != '' AND (${dbSchema.leads.custom_fields}->>${column_key})::date < ${targetDate}::date)`;
              break;
              
            case 'date_after':
            case 'after':
              // Check that the custom field value is not NULL and not an empty string before casting to date
              sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NOT NULL AND ${dbSchema.leads.custom_fields}->>${column_key} != '' AND (${dbSchema.leads.custom_fields}->>${column_key})::date > ${targetDate}::date)`;
              break;
              
            case 'date_equals':
            case 'equals':
              if (relative_date || (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
                // Check that the custom field value is not NULL and not an empty string before casting to date
                sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NOT NULL AND ${dbSchema.leads.custom_fields}->>${column_key} != '' AND (${dbSchema.leads.custom_fields}->>${column_key})::date = ${targetDate}::date)`;
              } else {
                sqlExpr = sql`${dbSchema.leads.custom_fields}->>${column_key} = ${value}`;
              }
              break;
            
            case 'not_equals':
              sqlExpr = sql`(${dbSchema.leads.custom_fields}->>${column_key} IS NULL OR ${dbSchema.leads.custom_fields}->>${column_key} != ${value})`;
              break;
              
            case 'contains':
              sqlExpr = sql`${dbSchema.leads.custom_fields}->>${column_key} ILIKE ${'%' + value + '%'}`;
              break;
              
            case 'not_contains':
              sqlExpr = sql`${dbSchema.leads.custom_fields}->>${column_key} NOT ILIKE ${'%' + value + '%'}`;
              break;
              
            case 'in':
              if (Array.isArray(value) && value.length > 0) {
                sqlExpr = sql`${dbSchema.leads.custom_fields}->>${column_key} = ANY(${value})`;
              }
              break;
              
            default:
              if (value !== undefined && value !== null) {
                sqlExpr = sql`${dbSchema.leads.custom_fields}->>${column_key} = ${String(value)}`;
              }
          }
        }
        
        // Only add to tuples if SQL was generated
        if (sqlExpr !== null) {
          quickFilterTuples.push({ sqlExpr, nextOperator: conditionNextOp });
        }
      }
      
      // Combine quick filter conditions with per-condition next_operator logic
      // Supports mixed AND/OR operators between conditions (left-to-right evaluation)
      if (quickFilterTuples.length > 0) {
        if (quickFilterTuples.length === 1) {
          conditions.push(quickFilterTuples[0].sqlExpr);
        } else {
          // Build the SQL expression tree with per-condition operators
          let combined = quickFilterTuples[0].sqlExpr;
          for (let i = 1; i < quickFilterTuples.length; i++) {
            // Use the PREVIOUS tuple's nextOperator to join with current
            const op = quickFilterTuples[i - 1].nextOperator;
            if (op === 'or') {
              combined = or(combined, quickFilterTuples[i].sqlExpr);
            } else {
              combined = and(combined, quickFilterTuples[i].sqlExpr);
            }
          }
          conditions.push(combined);
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
      section: (record as any).section || "custom_views",
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
      section: view.section || "custom_views",
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

  async deleteWebhookLogs(ids: string[], webhookId: string): Promise<number> {
    if (ids.length === 0) return 0;
    // Only delete logs that belong to the specified webhook and are in pending status
    const result = await db.delete(dbSchema.webhook_logs).where(
      and(
        inArray(dbSchema.webhook_logs.id, ids),
        eq(dbSchema.webhook_logs.webhook_id, webhookId),
        inArray(dbSchema.webhook_logs.status, ['pending_allocation', 'pending_configuration'])
      )
    );
    return result.rowCount || 0;
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

  async getLastUpdatesForLeads(leadIds: string[]): Promise<Map<string, LeadUpdate>> {
    const result = new Map<string, LeadUpdate>();
    if (leadIds.length === 0) return result;

    // Use a subquery to get the latest update for each lead efficiently
    // Using DISTINCT ON for PostgreSQL to get only the latest update per lead
    const updates = await db
      .select({
        lead_update: dbSchema.lead_updates,
        user: {
          name: dbSchema.users.name,
        },
      })
      .from(dbSchema.lead_updates)
      .leftJoin(dbSchema.users, eq(dbSchema.lead_updates.created_by_user_id, dbSchema.users.id))
      .where(inArray(dbSchema.lead_updates.lead_id, leadIds))
      .orderBy(desc(dbSchema.lead_updates.created_at));

    // Keep only the most recent update for each lead
    for (const row of updates) {
      const leadId = row.lead_update.lead_id;
      if (!result.has(leadId)) {
        result.set(leadId, {
          ...this.mapLeadUpdate(row.lead_update),
          created_by_first_name: row.user?.name || null,
        } as any);
      }
    }

    return result;
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

  // Lead Transfer Requests
  async createLeadTransferRequest(request: InsertLeadTransferRequestData): Promise<LeadTransferRequest> {
    const [result] = await db.insert(dbSchema.lead_transfer_requests)
      .values({
        ...request,
        status: request.status || "pending",
      })
      .returning();
    
    return {
      id: result.id,
      lead_id: result.lead_id,
      from_sheet_id: result.from_sheet_id,
      to_sheet_id: result.to_sheet_id,
      requested_by_user_id: result.requested_by_user_id,
      status: result.status as "pending" | "approved" | "rejected",
      approved_by_user_id: result.approved_by_user_id,
      rejected_by_user_id: result.rejected_by_user_id,
      rejection_reason: result.rejection_reason,
      approved_at: result.approved_at?.toISOString() || null,
      rejected_at: result.rejected_at?.toISOString() || null,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async getLeadTransferRequests(companyId: string, filters?: { status?: "pending" | "approved" | "rejected" }): Promise<LeadTransferRequest[]> {
    // Get all sheets for the company
    const companySheets = await db.select({ id: dbSchema.sheets.id })
      .from(dbSchema.sheets)
      .where(eq(dbSchema.sheets.company_id, companyId));
    const sheetIds = companySheets.map(s => s.id);
    
    if (sheetIds.length === 0) return [];
    
    // Get all leads in company sheets
    const companyLeads = await db.select({ id: dbSchema.leads.id })
      .from(dbSchema.leads)
      .where(inArray(dbSchema.leads.sheet_id, sheetIds));
    const leadIds = companyLeads.map(l => l.id);
    
    if (leadIds.length === 0) return [];
    
    // Build conditions
    const conditions = [inArray(dbSchema.lead_transfer_requests.lead_id, leadIds)];
    if (filters?.status) {
      conditions.push(eq(dbSchema.lead_transfer_requests.status, filters.status));
    }
    
    const results = await db.select()
      .from(dbSchema.lead_transfer_requests)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.lead_transfer_requests.created_at));
    
    return results.map((row: any) => ({
      id: row.id,
      lead_id: row.lead_id,
      from_sheet_id: row.from_sheet_id,
      to_sheet_id: row.to_sheet_id,
      requested_by_user_id: row.requested_by_user_id,
      status: row.status as "pending" | "approved" | "rejected",
      approved_by_user_id: row.approved_by_user_id,
      rejected_by_user_id: row.rejected_by_user_id,
      rejection_reason: row.rejection_reason,
      approved_at: row.approved_at?.toISOString() || null,
      rejected_at: row.rejected_at?.toISOString() || null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));
  }

  async getLeadTransferRequest(id: string): Promise<LeadTransferRequest | undefined> {
    const [result] = await db.select()
      .from(dbSchema.lead_transfer_requests)
      .where(eq(dbSchema.lead_transfer_requests.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      lead_id: result.lead_id,
      from_sheet_id: result.from_sheet_id,
      to_sheet_id: result.to_sheet_id,
      requested_by_user_id: result.requested_by_user_id,
      status: result.status as "pending" | "approved" | "rejected",
      approved_by_user_id: result.approved_by_user_id,
      rejected_by_user_id: result.rejected_by_user_id,
      rejection_reason: result.rejection_reason,
      approved_at: result.approved_at?.toISOString() || null,
      rejected_at: result.rejected_at?.toISOString() || null,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async approveLeadTransferRequest(requestId: string, approvedBy: string): Promise<LeadTransferRequest | undefined> {
    const now = new Date();
    const [result] = await db.update(dbSchema.lead_transfer_requests)
      .set({
        status: "approved",
        approved_by_user_id: approvedBy,
        approved_at: now,
        updated_at: now,
      })
      .where(eq(dbSchema.lead_transfer_requests.id, requestId))
      .returning();
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      lead_id: result.lead_id,
      from_sheet_id: result.from_sheet_id,
      to_sheet_id: result.to_sheet_id,
      requested_by_user_id: result.requested_by_user_id,
      status: result.status as "pending" | "approved" | "rejected",
      approved_by_user_id: result.approved_by_user_id,
      rejected_by_user_id: result.rejected_by_user_id,
      rejection_reason: result.rejection_reason,
      approved_at: result.approved_at?.toISOString() || null,
      rejected_at: result.rejected_at?.toISOString() || null,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async rejectLeadTransferRequest(requestId: string, rejectedBy: string, reason: string): Promise<LeadTransferRequest | undefined> {
    const now = new Date();
    const [result] = await db.update(dbSchema.lead_transfer_requests)
      .set({
        status: "rejected",
        rejected_by_user_id: rejectedBy,
        rejection_reason: reason,
        rejected_at: now,
        updated_at: now,
      })
      .where(eq(dbSchema.lead_transfer_requests.id, requestId))
      .returning();
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      lead_id: result.lead_id,
      from_sheet_id: result.from_sheet_id,
      to_sheet_id: result.to_sheet_id,
      requested_by_user_id: result.requested_by_user_id,
      status: result.status as "pending" | "approved" | "rejected",
      approved_by_user_id: result.approved_by_user_id,
      rejected_by_user_id: result.rejected_by_user_id,
      rejection_reason: result.rejection_reason,
      approved_at: result.approved_at?.toISOString() || null,
      rejected_at: result.rejected_at?.toISOString() || null,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
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
    const result = await db.select().from(dbSchema.webhook_allocation_rules)
      .where(eq(dbSchema.webhook_allocation_rules.webhook_id, webhookId))
      .orderBy(dbSchema.webhook_allocation_rules.created_at);
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

  async deleteWebhookRequests(ids: string[], webhookId: string): Promise<number> {
    if (ids.length === 0) return 0;
    // Only delete requests that belong to the specified webhook and are in pending status
    const result = await db.delete(dbSchema.webhook_requests).where(
      and(
        inArray(dbSchema.webhook_requests.id, ids),
        eq(dbSchema.webhook_requests.webhook_id, webhookId),
        inArray(dbSchema.webhook_requests.status, ['pending_allocation', 'pending_configuration'])
      )
    );
    return result.rowCount || 0;
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

  // Custom View Column Preferences
  async getCustomViewColumnPreferences(userId: string, customViewId: string): Promise<CustomViewColumnPreference[]> {
    const result = await db.select()
      .from(dbSchema.customViewColumnPreferences)
      .where(and(
        eq(dbSchema.customViewColumnPreferences.user_id, userId),
        eq(dbSchema.customViewColumnPreferences.custom_view_id, customViewId)
      ));
    return result.map(this.mapCustomViewColumnPreference.bind(this));
  }

  async saveCustomViewColumnPreferences(userId: string, customViewId: string, preferences: Array<{column_key: string, width: number}>): Promise<void> {
    // Delete existing preferences for this user+custom view combo
    await db.delete(dbSchema.customViewColumnPreferences)
      .where(and(
        eq(dbSchema.customViewColumnPreferences.user_id, userId),
        eq(dbSchema.customViewColumnPreferences.custom_view_id, customViewId)
      ));

    // Insert new preferences
    if (preferences.length > 0) {
      const now = new Date();
      await db.insert(dbSchema.customViewColumnPreferences).values(
        preferences.map(pref => ({
          id: randomUUID(),
          user_id: userId,
          custom_view_id: customViewId,
          column_key: pref.column_key,
          width: pref.width,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  }

  private mapCustomViewColumnPreference(row: any): CustomViewColumnPreference {
    return {
      id: row.id,
      user_id: row.user_id,
      custom_view_id: row.custom_view_id,
      column_key: row.column_key,
      width: row.width,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Followup Events (Unified follow-up tracking with 1-minute deduplication)
  private readonly FOLLOWUP_DEDUP_SECONDS = 60;
  
  // Generate a unique window key for deduplication: "leadId:userId:YYYY-MM-DD-HH-MM"
  private generateWindowKey(leadId: string, userId: string, timestamp: Date): string {
    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hour = String(timestamp.getUTCHours()).padStart(2, '0');
    const minute = String(timestamp.getUTCMinutes()).padStart(2, '0');
    // Use last 8 chars of each ID to keep key under 50 chars
    const shortLeadId = leadId.slice(-8);
    const shortUserId = userId.slice(-8);
    return `${shortLeadId}:${shortUserId}:${year}${month}${day}${hour}${minute}`;
  }

  async recordFollowupEvent(params: {
    companyId: string;
    sheetId: string;
    leadId: string;
    userId: string;
    eventTypes: FollowupEventType[];
  }): Promise<{ isNew: boolean; eventId: string }> {
    const { companyId, sheetId, leadId, userId, eventTypes } = params;
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.FOLLOWUP_DEDUP_SECONDS * 1000);
    
    // First, check for any existing event within the true 60-second sliding window
    // Use updated_at (not triggered_at) so merged events keep the row alive for 60s
    // This handles the minute-boundary edge case (e.g., 12:00:59 vs 12:01:10)
    const recentEvents = await db.select()
      .from(dbSchema.followup_events)
      .where(and(
        eq(dbSchema.followup_events.lead_id, leadId),
        eq(dbSchema.followup_events.user_id, userId),
        gte(dbSchema.followup_events.updated_at, cutoff)
      ))
      .orderBy(desc(dbSchema.followup_events.updated_at))
      .limit(1);
    
    if (recentEvents.length > 0) {
      // Existing event found within 60 seconds - merge event types
      const existingEvent = recentEvents[0];
      const existingTypes = (existingEvent.event_types || []) as FollowupEventType[];
      const mergedTypes = [...new Set([...existingTypes, ...eventTypes])] as FollowupEventType[];
      
      await db.update(dbSchema.followup_events)
        .set({
          event_types: mergedTypes,
          updated_at: now,
        })
        .where(eq(dbSchema.followup_events.id, existingEvent.id));
      
      return { isNew: false, eventId: existingEvent.id };
    }
    
    // No recent event - try to insert new one (window_key provides race condition protection)
    const windowKey = this.generateWindowKey(leadId, userId, now);
    const id = randomUUID();
    
    try {
      await db.insert(dbSchema.followup_events)
        .values({
          id,
          company_id: companyId,
          sheet_id: sheetId,
          lead_id: leadId,
          user_id: userId,
          event_types: eventTypes,
          window_key: windowKey,
          triggered_at: now,
          updated_at: now,
        })
        .onConflictDoNothing({ target: dbSchema.followup_events.window_key });
      
      // Check if our insert succeeded by looking up the row
      const result = await db.select()
        .from(dbSchema.followup_events)
        .where(eq(dbSchema.followup_events.window_key, windowKey))
        .limit(1);
      
      if (result.length > 0) {
        const existingEvent = result[0];
        // If the ID matches, it's a new insert
        if (existingEvent.id === id) {
          return { isNew: true, eventId: id };
        }
        
        // Otherwise, another concurrent request won - merge event types
        const existingTypes = (existingEvent.event_types || []) as FollowupEventType[];
        const mergedTypes = [...new Set([...existingTypes, ...eventTypes])] as FollowupEventType[];
        
        await db.update(dbSchema.followup_events)
          .set({
            event_types: mergedTypes,
            updated_at: now,
          })
          .where(eq(dbSchema.followup_events.id, existingEvent.id));
        
        return { isNew: false, eventId: existingEvent.id };
      }
      
      // Should not happen, but return as new if we can't find the row
      return { isNew: true, eventId: id };
    } catch (error: any) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') { // PostgreSQL unique_violation
        const result = await db.select()
          .from(dbSchema.followup_events)
          .where(eq(dbSchema.followup_events.window_key, windowKey))
          .limit(1);
        
        if (result.length > 0) {
          const existingEvent = result[0];
          const existingTypes = (existingEvent.event_types || []) as FollowupEventType[];
          const mergedTypes = [...new Set([...existingTypes, ...eventTypes])] as FollowupEventType[];
          
          await db.update(dbSchema.followup_events)
            .set({
              event_types: mergedTypes,
              updated_at: now,
            })
            .where(eq(dbSchema.followup_events.id, existingEvent.id));
          
          return { isNew: false, eventId: existingEvent.id };
        }
      }
      throw error;
    }
  }

  async getRecentFollowupEvent(leadId: string, userId: string, windowSeconds: number = 60): Promise<FollowupEvent | undefined> {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    const result = await db.select()
      .from(dbSchema.followup_events)
      .where(and(
        eq(dbSchema.followup_events.lead_id, leadId),
        eq(dbSchema.followup_events.user_id, userId),
        gte(dbSchema.followup_events.triggered_at, cutoff)
      ))
      .orderBy(desc(dbSchema.followup_events.triggered_at))
      .limit(1);
    
    if (result.length === 0) return undefined;
    return this.mapFollowupEvent(result[0]);
  }

  async getFollowupStats(userId: string, startDate: Date, endDate: Date): Promise<{ count: number }> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.followup_events)
      .where(and(
        eq(dbSchema.followup_events.user_id, userId),
        gte(dbSchema.followup_events.triggered_at, startDate),
        lte(dbSchema.followup_events.triggered_at, endDate)
      ));
    
    return { count: result[0]?.count || 0 };
  }

  async getFollowupTransactions(companyId: string, options: {
    page?: number;
    limit?: number;
    userId?: string;
    sheetId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ transactions: FollowupEventWithDetails[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, userId, sheetId, startDate, endDate } = options;
    
    // Build conditions
    const conditions = [eq(dbSchema.followup_events.company_id, companyId)];
    if (userId) conditions.push(eq(dbSchema.followup_events.user_id, userId));
    if (sheetId) conditions.push(eq(dbSchema.followup_events.sheet_id, sheetId));
    if (startDate) conditions.push(gte(dbSchema.followup_events.triggered_at, startDate));
    if (endDate) conditions.push(lte(dbSchema.followup_events.triggered_at, endDate));
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.followup_events)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;
    
    // Get paginated results with joins
    const offset = (page - 1) * limit;
    const result = await db.select({
      event: dbSchema.followup_events,
      user_name: dbSchema.users.name,
      user_email: dbSchema.users.email,
      sheet_name: dbSchema.sheets.name,
    })
      .from(dbSchema.followup_events)
      .leftJoin(dbSchema.users, eq(dbSchema.followup_events.user_id, dbSchema.users.id))
      .leftJoin(dbSchema.sheets, eq(dbSchema.followup_events.sheet_id, dbSchema.sheets.id))
      .where(and(...conditions))
      .orderBy(desc(dbSchema.followup_events.triggered_at))
      .limit(limit)
      .offset(offset);
    
    // Get lead details separately
    const leadIds = [...new Set(result.map(r => r.event.lead_id))];
    const leads = leadIds.length > 0 
      ? await db.select().from(dbSchema.leads).where(inArray(dbSchema.leads.id, leadIds))
      : [];
    const leadMap = new Map(leads.map(l => [l.id, l]));
    
    const transactions: FollowupEventWithDetails[] = result.map(r => {
      const lead = leadMap.get(r.event.lead_id);
      const leadName = lead?.custom_fields?.full_name || lead?.custom_fields?.name || null;
      const leadMobile = lead?.custom_fields?.mobile || lead?.custom_fields?.mobile_no || null;
      
      return {
        ...this.mapFollowupEvent(r.event),
        user_name: r.user_name,
        user_email: r.user_email,
        lead_name: leadName,
        lead_mobile: leadMobile,
        sheet_name: r.sheet_name,
      };
    });
    
    return { transactions, total, page, limit };
  }

  private mapFollowupEvent(row: any): FollowupEvent {
    return {
      id: row.id,
      company_id: row.company_id,
      sheet_id: row.sheet_id,
      lead_id: row.lead_id,
      user_id: row.user_id,
      event_types: row.event_types || [],
      triggered_at: row.triggered_at,
      updated_at: row.updated_at,
    };
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

  // Vision Board Messages
  async getVisionBoardMessages(companyId: string, userId: string, includeArchived: boolean = false): Promise<VisionBoardMessageRecord[]> {
    const now = new Date();
    const conditions: any[] = [
      eq(dbSchema.vision_board_messages.company_id, companyId),
      or(
        isNull(dbSchema.vision_board_messages.target_user_ids), // All users
        sql`${dbSchema.vision_board_messages.target_user_ids}::jsonb @> ${sql.raw(`'["${userId}"]'::jsonb`)}` // User in target list (JSONB contains)
      ),
      or(
        isNull(dbSchema.vision_board_messages.expires_at),
        gt(dbSchema.vision_board_messages.expires_at, now)
      ),
    ];
    
    if (!includeArchived) {
      conditions.push(eq(dbSchema.vision_board_messages.is_archived, false));
    }
    
    const messages = await db.select()
      .from(dbSchema.vision_board_messages)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.vision_board_messages.created_at))
      .limit(3);
    
    return messages;
  }

  async getAllVisionBoardMessages(companyId: string, includeArchived: boolean = false): Promise<VisionBoardMessageRecord[]> {
    const conditions: any[] = [eq(dbSchema.vision_board_messages.company_id, companyId)];
    
    if (!includeArchived) {
      conditions.push(eq(dbSchema.vision_board_messages.is_archived, false));
    }
    
    const messages = await db.select()
      .from(dbSchema.vision_board_messages)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.vision_board_messages.created_at));
    
    return messages;
  }

  async createVisionBoardMessage(message: InsertVisionBoardMessage): Promise<VisionBoardMessageRecord> {
    const rows = await db.insert(dbSchema.vision_board_messages)
      .values({
        ...message,
        updated_at: new Date(),
      })
      .returning();
    return rows[0];
  }

  async updateVisionBoardMessage(id: string, updates: Partial<InsertVisionBoardMessage>): Promise<VisionBoardMessageRecord> {
    const rows = await db.update(dbSchema.vision_board_messages)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(dbSchema.vision_board_messages.id, id))
      .returning();
    
    if (rows.length === 0) {
      throw new Error("Vision Board message not found");
    }
    return rows[0];
  }

  async deleteVisionBoardMessage(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.vision_board_messages)
      .where(eq(dbSchema.vision_board_messages.id, id));
    return (result as any).rowCount > 0;
  }

  async archiveVisionBoardMessage(id: string): Promise<VisionBoardMessageRecord> {
    // Toggle archive status
    const existing = await db.select()
      .from(dbSchema.vision_board_messages)
      .where(eq(dbSchema.vision_board_messages.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      throw new Error("Vision Board message not found");
    }
    
    const rows = await db.update(dbSchema.vision_board_messages)
      .set({
        is_archived: !existing[0].is_archived,
        updated_at: new Date(),
      })
      .where(eq(dbSchema.vision_board_messages.id, id))
      .returning();
    
    return rows[0];
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

  // =========================================================================
  // WATCHLIST LEADS (User's personal lead watchlist)
  // =========================================================================

  async getWatchlistByUserId(userId: string): Promise<WatchlistLead[]> {
    const result = await db.select()
      .from(dbSchema.watchlist_leads)
      .where(eq(dbSchema.watchlist_leads.user_id, userId))
      .orderBy(desc(dbSchema.watchlist_leads.created_at));
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      lead_id: row.lead_id,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async getWatchlistLeadIds(userId: string): Promise<string[]> {
    const result = await db.select({ lead_id: dbSchema.watchlist_leads.lead_id })
      .from(dbSchema.watchlist_leads)
      .where(eq(dbSchema.watchlist_leads.user_id, userId));
    return result.map(row => row.lead_id);
  }

  async getWatchlistLeadsBySheetAccess(userId: string, sheetIds: string[]): Promise<Lead[]> {
    if (sheetIds.length === 0) return [];
    
    // Get all watchlist lead IDs from any user (collaborative watchlist)
    const watchlistEntries = await db.select({ lead_id: dbSchema.watchlist_leads.lead_id })
      .from(dbSchema.watchlist_leads);
    
    if (watchlistEntries.length === 0) return [];
    
    const watchlistLeadIds = watchlistEntries.map(w => w.lead_id);
    
    // Get leads that are on any watchlist AND belong to accessible sheets
    const result = await db.select()
      .from(dbSchema.leads)
      .where(
        and(
          inArray(dbSchema.leads.id, watchlistLeadIds),
          inArray(dbSchema.leads.sheet_id, sheetIds),
          isNull(dbSchema.leads.deleted_at)
        )
      );
    
    return result.map(this.mapLead);
  }

  async addToWatchlist(userId: string, leadId: string): Promise<WatchlistLead> {
    const id = randomUUID();
    const now = new Date();
    
    // Check if already exists
    const existing = await db.select()
      .from(dbSchema.watchlist_leads)
      .where(
        and(
          eq(dbSchema.watchlist_leads.user_id, userId),
          eq(dbSchema.watchlist_leads.lead_id, leadId)
        )
      );
    
    if (existing.length > 0) {
      return {
        id: existing[0].id,
        user_id: existing[0].user_id,
        lead_id: existing[0].lead_id,
        created_at: existing[0].created_at?.toISOString() || now.toISOString(),
      };
    }
    
    const rows = await db.insert(dbSchema.watchlist_leads)
      .values({ id, user_id: userId, lead_id: leadId, created_at: now })
      .returning();
    
    return {
      id: rows[0].id,
      user_id: rows[0].user_id,
      lead_id: rows[0].lead_id,
      created_at: rows[0].created_at?.toISOString() || now.toISOString(),
    };
  }

  async removeFromWatchlist(userId: string, leadId: string): Promise<boolean> {
    const result = await db.delete(dbSchema.watchlist_leads)
      .where(
        and(
          eq(dbSchema.watchlist_leads.user_id, userId),
          eq(dbSchema.watchlist_leads.lead_id, leadId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async isOnWatchlist(userId: string, leadId: string): Promise<boolean> {
    const result = await db.select({ id: dbSchema.watchlist_leads.id })
      .from(dbSchema.watchlist_leads)
      .where(
        and(
          eq(dbSchema.watchlist_leads.user_id, userId),
          eq(dbSchema.watchlist_leads.lead_id, leadId)
        )
      );
    return result.length > 0;
  }

  // =========================================================================
  // POWERSCORE (Gamified Leaderboard System)
  // =========================================================================

  async getPowerScoreRules(companyId: string): Promise<PowerScoreRule[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_rules)
      .where(eq(dbSchema.powerscore_rules.company_id, companyId))
      .orderBy(dbSchema.powerscore_rules.action_type);
    return result.map(row => ({
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      action_type: row.action_type as PowerScoreActionType,
      config: row.config as { column_key?: string; from_values?: string[]; to_values?: string[] },
      points: row.points,
      daily_cap: row.daily_cap,
      requires_approval: row.requires_approval ?? false,
      is_enabled: row.is_enabled ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async getPowerScoreRule(id: string): Promise<PowerScoreRule | undefined> {
    const result = await db.select()
      .from(dbSchema.powerscore_rules)
      .where(eq(dbSchema.powerscore_rules.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    const row = result[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      action_type: row.action_type as PowerScoreActionType,
      config: row.config as { column_key?: string; from_values?: string[]; to_values?: string[] },
      points: row.points,
      daily_cap: row.daily_cap,
      requires_approval: row.requires_approval ?? false,
      is_enabled: row.is_enabled ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async createPowerScoreRule(rule: Omit<PowerScoreRule, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreRule> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_rules)
      .values({
        id,
        company_id: rule.company_id,
        name: rule.name,
        action_type: rule.action_type,
        config: rule.config || {},
        points: rule.points,
        daily_cap: rule.daily_cap,
        requires_approval: rule.requires_approval,
        is_enabled: rule.is_enabled,
        created_at: now,
        updated_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      action_type: row.action_type as PowerScoreActionType,
      config: row.config as { column_key?: string; from_values?: string[]; to_values?: string[] },
      points: row.points,
      daily_cap: row.daily_cap,
      requires_approval: row.requires_approval ?? false,
      is_enabled: row.is_enabled ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async updatePowerScoreRule(id: string, updates: Partial<PowerScoreRule>): Promise<PowerScoreRule | undefined> {
    const now = new Date();
    const dbUpdates: any = { updated_at: now };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.config !== undefined) dbUpdates.config = updates.config;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.daily_cap !== undefined) dbUpdates.daily_cap = updates.daily_cap;
    if (updates.requires_approval !== undefined) dbUpdates.requires_approval = updates.requires_approval;
    if (updates.is_enabled !== undefined) dbUpdates.is_enabled = updates.is_enabled;
    
    const rows = await db.update(dbSchema.powerscore_rules)
      .set(dbUpdates)
      .where(eq(dbSchema.powerscore_rules.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      action_type: row.action_type as PowerScoreActionType,
      config: row.config as { column_key?: string; from_values?: string[]; to_values?: string[] },
      points: row.points,
      daily_cap: row.daily_cap,
      requires_approval: row.requires_approval ?? false,
      is_enabled: row.is_enabled ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async deletePowerScoreRule(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.powerscore_rules)
      .where(eq(dbSchema.powerscore_rules.id, id))
      .returning();
    return result.length > 0;
  }

  async getPowerScoreTransactions(userId: string, limit: number = 50): Promise<PowerScoreTransaction[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_transactions)
      .where(eq(dbSchema.powerscore_transactions.user_id, userId))
      .orderBy(desc(dbSchema.powerscore_transactions.created_at))
      .limit(limit);
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      reference_id: row.reference_id,
      reference_type: row.reference_type,
      description: row.description,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async getPowerScoreTransactionsByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<PowerScoreTransaction[]> {
    let query = db.select()
      .from(dbSchema.powerscore_transactions)
      .where(eq(dbSchema.powerscore_transactions.company_id, companyId))
      .orderBy(desc(dbSchema.powerscore_transactions.created_at));
    
    if (startDate && endDate) {
      const result = await db.select()
        .from(dbSchema.powerscore_transactions)
        .where(
          and(
            eq(dbSchema.powerscore_transactions.company_id, companyId),
            gte(dbSchema.powerscore_transactions.created_at, startDate),
            lte(dbSchema.powerscore_transactions.created_at, endDate)
          )
        )
        .orderBy(desc(dbSchema.powerscore_transactions.created_at));
      return result.map(row => ({
        id: row.id,
        user_id: row.user_id,
        company_id: row.company_id,
        action_type: row.action_type as PowerScoreActionType,
        points: row.points,
        reference_id: row.reference_id,
        reference_type: row.reference_type,
        description: row.description,
        created_at: row.created_at?.toISOString() || new Date().toISOString(),
      }));
    }
    
    const result = await query;
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      reference_id: row.reference_id,
      reference_type: row.reference_type,
      description: row.description,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async getPowerScoreTransactionsByRuleAndDate(userId: string, ruleId: string, scoreDate: string): Promise<PowerScoreTransaction[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_transactions)
      .where(
        and(
          eq(dbSchema.powerscore_transactions.user_id, userId),
          eq(dbSchema.powerscore_transactions.rule_id, ruleId),
          eq(dbSchema.powerscore_transactions.score_date, scoreDate)
        )
      );
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      lead_id: row.lead_id,
      description: row.description,
      score_date: row.score_date,
      approval_id: row.approval_id,
      is_approved: row.is_approved,
      created_at: row.created_at,
    }));
  }

  async getPowerScoreTransactionsByLeadId(leadId: string): Promise<PowerScoreTransaction[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_transactions)
      .where(eq(dbSchema.powerscore_transactions.lead_id, leadId))
      .orderBy(desc(dbSchema.powerscore_transactions.created_at));
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      lead_id: row.lead_id,
      description: row.description,
      score_date: row.score_date,
      approval_id: row.approval_id,
      is_approved: row.is_approved,
      voided_at: row.voided_at,
      voided_by_user_id: row.voided_by_user_id,
      void_reason: row.void_reason,
      voided_by_transaction_id: row.voided_by_transaction_id,
      created_at: row.created_at,
    }));
  }

  async getPowerScoreTransaction(id: string): Promise<PowerScoreTransaction | undefined> {
    const result = await db.select()
      .from(dbSchema.powerscore_transactions)
      .where(eq(dbSchema.powerscore_transactions.id, id));
    if (result.length === 0) return undefined;
    const row = result[0];
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      lead_id: row.lead_id,
      description: row.description,
      score_date: row.score_date,
      approval_id: row.approval_id,
      is_approved: row.is_approved,
      voided_at: row.voided_at,
      voided_by_user_id: row.voided_by_user_id,
      void_reason: row.void_reason,
      voided_by_transaction_id: row.voided_by_transaction_id,
      created_by_user_id: (row as any).created_by_user_id || null, // Handle missing column gracefully
      created_at: row.created_at,
    };
  }

  async getPowerScoreTransactionFilterValues(companyId: string, userId?: string): Promise<{
    actionTypes: string[];
    descriptions: string[];
    points: number[];
  }> {
    const conditions: any[] = [eq(dbSchema.powerscore_transactions.company_id, companyId)];
    if (userId) {
      conditions.push(eq(dbSchema.powerscore_transactions.user_id, userId));
    }

    const actionTypesResult = await db.selectDistinct({ action_type: dbSchema.powerscore_transactions.action_type })
      .from(dbSchema.powerscore_transactions)
      .where(and(...conditions))
      .orderBy(dbSchema.powerscore_transactions.action_type);

    const descriptionsResult = await db.selectDistinct({ description: dbSchema.powerscore_transactions.description })
      .from(dbSchema.powerscore_transactions)
      .where(and(...conditions))
      .orderBy(dbSchema.powerscore_transactions.description);

    const pointsResult = await db.selectDistinct({ points: dbSchema.powerscore_transactions.points })
      .from(dbSchema.powerscore_transactions)
      .where(and(...conditions))
      .orderBy(dbSchema.powerscore_transactions.points);

    return {
      actionTypes: actionTypesResult.map(r => r.action_type).filter(Boolean) as string[],
      descriptions: descriptionsResult.map(r => r.description).filter(Boolean) as string[],
      points: pointsResult.map(r => r.points).filter(p => p !== null && p !== undefined) as number[],
    };
  }

  async getPowerScoreTransactionsWithDetails(
    companyId: string,
    options?: { userId?: string; page?: number; limit?: number; actionType?: string; description?: string; points?: number }
  ): Promise<{
    transactions: (PowerScoreTransaction & { user_name: string; voided_by_name?: string })[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions: any[] = [eq(dbSchema.powerscore_transactions.company_id, companyId)];
    if (options?.userId) {
      conditions.push(eq(dbSchema.powerscore_transactions.user_id, options.userId));
    }
    if (options?.actionType) {
      conditions.push(eq(dbSchema.powerscore_transactions.action_type, options.actionType));
    }
    if (options?.description) {
      conditions.push(eq(dbSchema.powerscore_transactions.description, options.description));
    }
    if (options?.points !== undefined && options?.points !== null) {
      conditions.push(eq(dbSchema.powerscore_transactions.points, options.points));
    }

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.powerscore_transactions)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    // Get transactions with user, rule, and lead joins
    const result = await db.select({
      transaction: dbSchema.powerscore_transactions,
      user_name: dbSchema.users.name,
      rule_name: dbSchema.powerscore_rules.name,
      lead_sheet_id: dbSchema.leads.sheet_id,
    })
      .from(dbSchema.powerscore_transactions)
      .leftJoin(dbSchema.users, eq(dbSchema.powerscore_transactions.user_id, dbSchema.users.id))
      .leftJoin(dbSchema.powerscore_rules, eq(dbSchema.powerscore_transactions.rule_id, dbSchema.powerscore_rules.id))
      .leftJoin(dbSchema.leads, eq(dbSchema.powerscore_transactions.lead_id, dbSchema.leads.id))
      .where(and(...conditions))
      .orderBy(desc(dbSchema.powerscore_transactions.created_at))
      .limit(limit)
      .offset(offset);

    // Get voided_by user names
    const voidedByUserIds = result
      .filter(r => r.transaction.voided_by_user_id)
      .map(r => r.transaction.voided_by_user_id!);
    
    const voidedByUsers = voidedByUserIds.length > 0
      ? await db.select({ id: dbSchema.users.id, name: dbSchema.users.name })
          .from(dbSchema.users)
          .where(inArray(dbSchema.users.id, voidedByUserIds))
      : [];
    const voidedByMap = new Map(voidedByUsers.map(u => [u.id, u.name]));

    const transactions = result.map(row => {
      const isAdjustment = row.transaction.action_type === 'admin_void' || 
                           row.transaction.action_type === 'reversal' ||
                           row.transaction.points < 0;
      const status = row.transaction.voided_at 
        ? 'voided' 
        : (row.transaction.is_approved === false 
            ? 'pending' 
            : 'awarded');
      
      // Determine rule name: use actual rule name, or "Manual Points" for admin_manual, or null as fallback
      let ruleName = row.rule_name;
      if (!ruleName && row.transaction.action_type === 'admin_manual') {
        ruleName = 'Manual Points';
      }
      
      return {
        id: row.transaction.id,
        user_id: row.transaction.user_id,
        company_id: row.transaction.company_id,
        rule_id: row.transaction.rule_id,
        rule_name: ruleName || null,
        action_type: row.transaction.action_type as PowerScoreActionType,
        points: row.transaction.points,
        lead_id: row.transaction.lead_id,
        lead_sheet_id: row.lead_sheet_id || null,
        description: row.transaction.description,
        score_date: row.transaction.score_date,
        approval_id: row.transaction.approval_id,
        is_approved: row.transaction.is_approved,
        status,
        is_adjustment: isAdjustment,
        voided_at: row.transaction.voided_at,
        voided_by_user_id: row.transaction.voided_by_user_id,
        void_reason: row.transaction.void_reason,
        voided_by_transaction_id: row.transaction.voided_by_transaction_id,
        created_at: row.transaction.created_at,
        user_name: row.user_name || 'Unknown User',
        voided_by_user_name: row.transaction.voided_by_user_id ? voidedByMap.get(row.transaction.voided_by_user_id) : undefined,
      };
    });

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async voidPowerScoreTransaction(
    transactionId: string,
    voidedByUserId: string,
    reason: string
  ): Promise<{ originalTransaction: PowerScoreTransaction; adjustmentTransaction: PowerScoreTransaction }> {
    const original = await this.getPowerScoreTransaction(transactionId);
    if (!original) {
      throw new Error("Transaction not found");
    }
    if (original.voided_at) {
      throw new Error("Transaction already voided");
    }
    if (original.points < 0) {
      throw new Error("Cannot void a reversal/adjustment transaction");
    }

    const now = new Date();
    const adjustmentId = randomUUID();

    // Create the negative adjustment transaction
    const adjustmentRows = await db.insert(dbSchema.powerscore_transactions)
      .values({
        id: adjustmentId,
        user_id: original.user_id,
        company_id: original.company_id,
        rule_id: original.rule_id,
        action_type: 'admin_void' as PowerScoreActionType,
        points: -original.points,
        lead_id: original.lead_id,
        description: `VOIDED: ${original.description || 'Transaction'} - ${reason}`,
        score_date: original.score_date,
        approval_id: null,
        is_approved: null,
        created_at: now,
      })
      .returning();

    // Mark the original as voided
    await db.update(dbSchema.powerscore_transactions)
      .set({
        voided_at: now,
        voided_by_user_id: voidedByUserId,
        void_reason: reason,
        voided_by_transaction_id: adjustmentId,
      })
      .where(eq(dbSchema.powerscore_transactions.id, transactionId));

    const updatedOriginal = await this.getPowerScoreTransaction(transactionId);
    const adjustment = adjustmentRows[0];

    return {
      originalTransaction: updatedOriginal!,
      adjustmentTransaction: {
        id: adjustment.id,
        user_id: adjustment.user_id,
        company_id: adjustment.company_id,
        rule_id: adjustment.rule_id,
        action_type: adjustment.action_type as PowerScoreActionType,
        points: adjustment.points,
        lead_id: adjustment.lead_id,
        description: adjustment.description,
        score_date: adjustment.score_date,
        approval_id: adjustment.approval_id,
        is_approved: adjustment.is_approved,
        voided_at: adjustment.voided_at,
        voided_by_user_id: adjustment.voided_by_user_id,
        void_reason: adjustment.void_reason,
        voided_by_transaction_id: adjustment.voided_by_transaction_id,
        created_by_user_id: adjustment.created_by_user_id,
        created_at: adjustment.created_at,
      },
    };
  }

  async createPowerScoreTransaction(transaction: Omit<PowerScoreTransaction, 'id' | 'created_at'>): Promise<PowerScoreTransaction> {
    const id = randomUUID();
    const now = new Date();
    
    // Build base values object
    const baseValues: any = {
      id,
      user_id: transaction.user_id,
      company_id: transaction.company_id,
      rule_id: transaction.rule_id,
      action_type: transaction.action_type,
      points: transaction.points,
      lead_id: transaction.lead_id,
      description: transaction.description,
      score_date: transaction.score_date,
      approval_id: transaction.approval_id,
      is_approved: transaction.is_approved,
      created_at: now,
    };
    
    // Try to include created_by_user_id if provided, but handle case where column doesn't exist yet
    let values = baseValues;
    if (transaction.created_by_user_id !== undefined) {
      values = { ...baseValues, created_by_user_id: transaction.created_by_user_id };
    }
    
    try {
      const rows = await db.insert(dbSchema.powerscore_transactions)
        .values(values)
        .returning();
      const row = rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        company_id: row.company_id,
        rule_id: row.rule_id,
        action_type: row.action_type as PowerScoreActionType,
        points: row.points,
        lead_id: row.lead_id,
        description: row.description,
        score_date: row.score_date,
        approval_id: row.approval_id,
        is_approved: row.is_approved,
        created_by_user_id: row.created_by_user_id || null,
        created_at: row.created_at,
      };
    } catch (error: any) {
      // If column doesn't exist, retry without created_by_user_id
      if (error.message?.includes('created_by_user_id') || error.code === '42703') {
        const rows = await db.insert(dbSchema.powerscore_transactions)
          .values(baseValues)
          .returning();
        const row = rows[0];
        return {
          id: row.id,
          user_id: row.user_id,
          company_id: row.company_id,
          rule_id: row.rule_id,
          action_type: row.action_type as PowerScoreActionType,
          points: row.points,
          lead_id: row.lead_id,
          description: row.description,
          score_date: row.score_date,
          approval_id: row.approval_id,
          is_approved: row.is_approved,
          created_by_user_id: null, // Column doesn't exist, return null
          created_at: row.created_at,
        };
      }
      throw error;
    }
  }

  async markTransactionAsReversed(transactionId: string, reversalTransactionId: string): Promise<void> {
    await db.update(dbSchema.powerscore_transactions)
      .set({
        voided_by_transaction_id: reversalTransactionId,
      })
      .where(eq(dbSchema.powerscore_transactions.id, transactionId));
  }

  async getDailyActionCount(userId: string, actionType: PowerScoreActionType, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.powerscore_transactions)
      .where(
        and(
          eq(dbSchema.powerscore_transactions.user_id, userId),
          eq(dbSchema.powerscore_transactions.action_type, actionType),
          gte(dbSchema.powerscore_transactions.created_at, startOfDay),
          lte(dbSchema.powerscore_transactions.created_at, endOfDay)
        )
      );
    return Number(result[0]?.count || 0);
  }

  async getPowerScoreLeaderboard(companyId: string, startDate: Date, endDate: Date): Promise<PowerScoreLeaderboardEntry[]> {
    // First, get multi-sheet user IDs to exclude from leaderboard
    const multiSheetUserIds = await this.getMultiSheetUserIds(companyId);
    
    const result = await db.select({
      user_id: dbSchema.powerscore_transactions.user_id,
      total_points: sql<number>`sum(${dbSchema.powerscore_transactions.points})`,
    })
      .from(dbSchema.powerscore_transactions)
      .where(
        and(
          eq(dbSchema.powerscore_transactions.company_id, companyId),
          gte(dbSchema.powerscore_transactions.created_at, startDate),
          lte(dbSchema.powerscore_transactions.created_at, endDate),
          // Exclude voided transactions (those that have been reversed)
          isNull(dbSchema.powerscore_transactions.voided_by_transaction_id),
          // Exclude reversal transactions (those whose ID appears as voided_by_transaction_id in another transaction)
          sql`${dbSchema.powerscore_transactions.id} NOT IN (SELECT voided_by_transaction_id FROM powerscore_transactions WHERE voided_by_transaction_id IS NOT NULL)`,
          // Exclude multi-sheet users from leaderboard
          ...(multiSheetUserIds.length > 0 ? [notInArray(dbSchema.powerscore_transactions.user_id, multiSheetUserIds)] : [])
        )
      )
      .groupBy(dbSchema.powerscore_transactions.user_id)
      .orderBy(sql`sum(${dbSchema.powerscore_transactions.points}) desc`);
    
    // Fetch user details for leaderboard entries
    const userIds = result.map(r => r.user_id);
    if (userIds.length === 0) return [];
    
    const users = await db.select({ id: dbSchema.users.id, name: dbSchema.users.name })
      .from(dbSchema.users)
      .where(inArray(dbSchema.users.id, userIds));
    
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    // Get badges for each user
    const badges = await db.select()
      .from(dbSchema.powerscore_badges)
      .where(eq(dbSchema.powerscore_badges.company_id, companyId));
    
    return result.map((row, index) => ({
      user_id: row.user_id,
      user_name: userMap.get(row.user_id) || 'Unknown User',
      avatar_url: undefined,
      score: Number(row.total_points || 0),
      rank: index + 1,
      badges: badges.filter(b => b.enabled).map(b => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        color: b.color,
        description: b.description,
      })),
    }));
  }

  async getUserPowerScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({
      total: sql<number>`coalesce(sum(${dbSchema.powerscore_transactions.points}), 0)`,
    })
      .from(dbSchema.powerscore_transactions)
      .where(
        and(
          eq(dbSchema.powerscore_transactions.user_id, userId),
          gte(dbSchema.powerscore_transactions.created_at, startDate),
          lte(dbSchema.powerscore_transactions.created_at, endDate),
          // Exclude voided transactions (those that have been reversed)
          isNull(dbSchema.powerscore_transactions.voided_by_transaction_id),
          // Exclude reversal transactions (those whose ID appears as voided_by_transaction_id in another transaction)
          sql`${dbSchema.powerscore_transactions.id} NOT IN (SELECT voided_by_transaction_id FROM powerscore_transactions WHERE voided_by_transaction_id IS NOT NULL)`
        )
      );
    return Number(result[0]?.total || 0);
  }

  // Get user IDs that have access to more than 1 company sheet (excludes personal sheets)
  // These users are excluded from PowerScore, Leaderboard, and PowerFlow analytics
  async getMultiSheetUserIds(companyId: string): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT su.user_id
      FROM sheet_users su
      JOIN sheets s ON su.sheet_id = s.id
      JOIN users u ON su.user_id = u.id
      WHERE u.company_id = ${companyId}
        AND u.is_active = true
        AND s.is_personal = false
        AND s.deleted_at IS NULL
      GROUP BY su.user_id
      HAVING COUNT(DISTINCT su.sheet_id) > 1
    `);
    return (result.rows as any[]).map(row => row.user_id);
  }

  // Check if a specific user has access to more than 1 company sheet
  async isMultiSheetUser(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.company_id) return false;
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT s.id) as sheet_count
      FROM sheet_users su
      JOIN sheets s ON su.sheet_id = s.id
      WHERE su.user_id = ${userId}
        AND s.is_personal = false
        AND s.deleted_at IS NULL
    `);
    const count = Number((result.rows as any[])[0]?.sheet_count || 0);
    return count > 1;
  }

  async getUserPowerScorePersonalStats(userId: string, companyTimezone: string): Promise<PowerScorePersonalStats> {
    const now = new Date();
    
    // Helper to get date ranges in company timezone
    const getDateRange = (type: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month') => {
      const start = new Date(now);
      const end = new Date(now);
      
      switch (type) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this_week':
          const dayOfWeek = start.getDay();
          start.setDate(start.getDate() - dayOfWeek);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'last_week':
          const dow = start.getDay();
          start.setDate(start.getDate() - dow - 7);
          start.setHours(0, 0, 0, 0);
          end.setDate(end.getDate() - dow - 1);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this_month':
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          break;
        case 'last_month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
      }
      return { start, end };
    };

    const [today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
      this.getUserPowerScore(userId, getDateRange('today').start, getDateRange('today').end),
      this.getUserPowerScore(userId, getDateRange('yesterday').start, getDateRange('yesterday').end),
      this.getUserPowerScore(userId, getDateRange('this_week').start, getDateRange('this_week').end),
      this.getUserPowerScore(userId, getDateRange('last_week').start, getDateRange('last_week').end),
      this.getUserPowerScore(userId, getDateRange('this_month').start, getDateRange('this_month').end),
      this.getUserPowerScore(userId, getDateRange('last_month').start, getDateRange('last_month').end),
    ]);

    // Calculate percentage changes
    const todayVsYesterdayPercent = yesterday === 0 
      ? (today > 0 ? 100 : 0)
      : Math.round(((today - yesterday) / yesterday) * 100);
    
    const thisWeekVsLastWeekPercent = lastWeek === 0 
      ? (thisWeek > 0 ? 100 : 0)
      : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    
    return {
      today,
      yesterday,
      this_week: thisWeek,
      last_week: lastWeek,
      this_month: thisMonth,
      last_month: lastMonth,
      today_vs_yesterday_percent: todayVsYesterdayPercent,
      this_week_vs_last_week_percent: thisWeekVsLastWeekPercent,
    };
  }

  async getUserPowerScoreHistory(userId: string, limit: number = 50): Promise<PowerScoreHistoryEntry[]> {
    const transactions = await this.getPowerScoreTransactions(userId, limit);
    return transactions.map(t => ({
      id: t.id,
      action_type: t.action_type,
      points: t.points,
      description: t.description || '',
      created_at: t.created_at,
    }));
  }

  async getUserPowerScoreBreakdown(userId: string, startDate: Date, endDate: Date): Promise<{ rule_id: string; rule_name: string; action_type: string; points_earned: number; transaction_count: number; daily_cap: number | null; details?: { description: string; points: number; created_at: string }[] }[]> {
    const result = await db
      .select({
        rule_id: dbSchema.powerscore_transactions.rule_id,
        rule_name: dbSchema.powerscore_rules.name,
        action_type: dbSchema.powerscore_transactions.action_type,
        daily_cap: dbSchema.powerscore_rules.daily_cap,
        points: dbSchema.powerscore_transactions.points,
        description: dbSchema.powerscore_transactions.description,
        created_at: dbSchema.powerscore_transactions.created_at,
      })
      .from(dbSchema.powerscore_transactions)
      .leftJoin(
        dbSchema.powerscore_rules,
        eq(dbSchema.powerscore_transactions.rule_id, dbSchema.powerscore_rules.id)
      )
      .where(
        and(
          eq(dbSchema.powerscore_transactions.user_id, userId),
          gte(dbSchema.powerscore_transactions.created_at, startDate),
          lte(dbSchema.powerscore_transactions.created_at, endDate),
          isNull(dbSchema.powerscore_transactions.voided_by_transaction_id),
          sql`${dbSchema.powerscore_transactions.id} NOT IN (SELECT voided_by_transaction_id FROM powerscore_transactions WHERE voided_by_transaction_id IS NOT NULL)`
        )
      );

    const breakdown = new Map<string, { rule_id: string; rule_name: string; action_type: string; points_earned: number; transaction_count: number; daily_cap: number | null; details?: { description: string; points: number; created_at: string }[] }>();
    
    for (const row of result) {
      const isManual = row.action_type === 'admin_manual';
      const groupKey = isManual ? 'admin_manual_all' : (row.rule_id || 'unknown');
      
      const existing = breakdown.get(groupKey);
      
      let ruleName = row.rule_name;
      if (!ruleName) {
        if (isManual) {
          ruleName = 'Manual Points';
        } else {
          ruleName = 'Unknown Rule';
        }
      }
      
      if (existing) {
        existing.points_earned += row.points;
        existing.transaction_count += 1;
        if (isManual && existing.details) {
          existing.details.push({
            description: row.description || 'Manual adjustment',
            points: row.points,
            created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          });
        }
      } else {
        const entry: { rule_id: string; rule_name: string; action_type: string; points_earned: number; transaction_count: number; daily_cap: number | null; details?: { description: string; points: number; created_at: string }[] } = {
          rule_id: row.rule_id || 'unknown',
          rule_name: ruleName,
          action_type: row.action_type,
          points_earned: row.points,
          transaction_count: 1,
          daily_cap: row.daily_cap ?? null,
        };
        if (isManual) {
          entry.details = [{
            description: row.description || 'Manual adjustment',
            points: row.points,
            created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          }];
        }
        breakdown.set(groupKey, entry);
      }
    }
    
    return Array.from(breakdown.values()).sort((a, b) => b.points_earned - a.points_earned);
  }

  async getPowerScorePendingApprovals(companyId: string): Promise<PowerScorePendingApproval[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_pending_approvals)
      .where(
        and(
          eq(dbSchema.powerscore_pending_approvals.company_id, companyId),
          eq(dbSchema.powerscore_pending_approvals.status, 'pending')
        )
      )
      .orderBy(desc(dbSchema.powerscore_pending_approvals.created_at));
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      lead_id: row.lead_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewed_by_user_id: row.reviewed_by_user_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    }));
  }

  async getPowerScorePendingApproval(id: string): Promise<PowerScorePendingApproval | undefined> {
    const result = await db.select()
      .from(dbSchema.powerscore_pending_approvals)
      .where(eq(dbSchema.powerscore_pending_approvals.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    const row = result[0];
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      lead_id: row.lead_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewed_by_user_id: row.reviewed_by_user_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    };
  }

  async getPendingApprovalsByRuleAndDate(userId: string, ruleId: string, scoreDate: string): Promise<PowerScorePendingApproval[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_pending_approvals)
      .where(
        and(
          eq(dbSchema.powerscore_pending_approvals.user_id, userId),
          eq(dbSchema.powerscore_pending_approvals.rule_id, ruleId),
          eq(dbSchema.powerscore_pending_approvals.score_date, scoreDate),
          eq(dbSchema.powerscore_pending_approvals.status, 'pending')
        )
      );
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      lead_id: row.lead_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewed_by_user_id: row.reviewed_by_user_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    }));
  }

  async createPowerScorePendingApproval(approval: Omit<PowerScorePendingApproval, 'id' | 'status' | 'reviewed_by_user_id' | 'reviewed_at' | 'created_at'>): Promise<PowerScorePendingApproval> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_pending_approvals)
      .values({
        id,
        user_id: approval.user_id,
        company_id: approval.company_id,
        rule_id: approval.rule_id,
        lead_id: approval.lead_id,
        action_type: approval.action_type,
        points: approval.points,
        description: approval.description,
        score_date: approval.score_date,
        status: 'pending',
        created_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      lead_id: row.lead_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewed_by_user_id: row.reviewed_by_user_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    };
  }

  async approvePowerScoreApproval(id: string, reviewedBy: string): Promise<PowerScorePendingApproval | undefined> {
    const now = new Date();
    const rows = await db.update(dbSchema.powerscore_pending_approvals)
      .set({ status: 'approved', reviewed_by_user_id: reviewedBy, reviewed_at: now })
      .where(eq(dbSchema.powerscore_pending_approvals.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    
    const row = rows[0];
    
    // Create the actual transaction now that it's approved
    await this.createPowerScoreTransaction({
      company_id: row.company_id,
      user_id: row.user_id,
      rule_id: row.rule_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      lead_id: row.lead_id,
      description: row.description,
      score_date: row.score_date,
      approval_id: row.id,
      is_approved: true,
    });
    
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      lead_id: row.lead_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: 'approved',
      reviewed_by_user_id: reviewedBy,
      reviewed_at: now,
      created_at: row.created_at,
    };
  }

  async rejectPowerScoreApproval(id: string, reviewedBy: string): Promise<PowerScorePendingApproval | undefined> {
    const now = new Date();
    const rows = await db.update(dbSchema.powerscore_pending_approvals)
      .set({ status: 'rejected', reviewed_by_user_id: reviewedBy, reviewed_at: now })
      .where(eq(dbSchema.powerscore_pending_approvals.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      lead_id: row.lead_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: 'rejected',
      reviewed_by_user_id: reviewedBy,
      reviewed_at: now,
      created_at: row.created_at,
    };
  }

  async getPendingApprovalsByLeadId(leadId: string): Promise<PowerScorePendingApproval[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_pending_approvals)
      .where(
        and(
          eq(dbSchema.powerscore_pending_approvals.lead_id, leadId),
          eq(dbSchema.powerscore_pending_approvals.status, 'pending')
        )
      );
    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      lead_id: row.lead_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description,
      score_date: row.score_date,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewed_by_user_id: row.reviewed_by_user_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    }));
  }

  async autoCancelPendingApproval(id: string, reason: string): Promise<PowerScorePendingApproval | undefined> {
    const now = new Date();
    
    // First get the current description to append to it
    const current = await db.select({ description: dbSchema.powerscore_pending_approvals.description })
      .from(dbSchema.powerscore_pending_approvals)
      .where(eq(dbSchema.powerscore_pending_approvals.id, id))
      .limit(1);
    
    if (current.length === 0) return undefined;
    
    const updatedDescription = `${current[0].description || ''} [AUTO-CANCELLED: ${reason}]`;
    
    const rows = await db.update(dbSchema.powerscore_pending_approvals)
      .set({ 
        status: 'rejected', 
        reviewed_by_user_id: null, 
        reviewed_at: now,
        description: updatedDescription
      })
      .where(eq(dbSchema.powerscore_pending_approvals.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      rule_id: row.rule_id,
      lead_id: row.lead_id,
      action_type: row.action_type as PowerScoreActionType,
      points: row.points,
      description: row.description, // Now contains the updated description
      score_date: row.score_date,
      status: 'rejected',
      reviewed_by_user_id: null,
      reviewed_at: now,
      created_at: row.created_at,
    };
  }

  async getPowerScoreBadges(companyId: string): Promise<PowerScoreBadge[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_badges)
      .where(eq(dbSchema.powerscore_badges.company_id, companyId))
      .orderBy(dbSchema.powerscore_badges.name);
    return result.map(row => ({
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async createPowerScoreBadge(badge: Omit<PowerScoreBadge, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreBadge> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_badges)
      .values({
        id,
        company_id: badge.company_id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        enabled: badge.enabled,
        created_at: now,
        updated_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || now.toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async updatePowerScoreBadge(id: string, updates: Partial<PowerScoreBadge>): Promise<PowerScoreBadge | undefined> {
    const now = new Date();
    const dbUpdates: any = { updated_at: now };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    
    const rows = await db.update(dbSchema.powerscore_badges)
      .set(dbUpdates)
      .where(eq(dbSchema.powerscore_badges.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async deletePowerScoreBadge(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.powerscore_badges)
      .where(eq(dbSchema.powerscore_badges.id, id))
      .returning();
    return result.length > 0;
  }

  async getPowerScoreMilestones(companyId: string): Promise<PowerScoreMilestoneBonus[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_milestone_bonuses)
      .where(eq(dbSchema.powerscore_milestone_bonuses.company_id, companyId))
      .orderBy(dbSchema.powerscore_milestone_bonuses.threshold_score);
    return result.map(row => ({
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      threshold_score: row.threshold_score,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async createPowerScoreMilestone(milestone: Omit<PowerScoreMilestoneBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreMilestoneBonus> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_milestone_bonuses)
      .values({
        id,
        company_id: milestone.company_id,
        name: milestone.name,
        threshold_score: milestone.threshold_score,
        bonus_points: milestone.bonus_points,
        enabled: milestone.enabled,
        created_at: now,
        updated_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      threshold_score: row.threshold_score,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || now.toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async updatePowerScoreMilestone(id: string, updates: Partial<PowerScoreMilestoneBonus>): Promise<PowerScoreMilestoneBonus | undefined> {
    const now = new Date();
    const dbUpdates: any = { updated_at: now };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.threshold_score !== undefined) dbUpdates.threshold_score = updates.threshold_score;
    if (updates.bonus_points !== undefined) dbUpdates.bonus_points = updates.bonus_points;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    
    const rows = await db.update(dbSchema.powerscore_milestone_bonuses)
      .set(dbUpdates)
      .where(eq(dbSchema.powerscore_milestone_bonuses.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      threshold_score: row.threshold_score,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async deletePowerScoreMilestone(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.powerscore_milestone_bonuses)
      .where(eq(dbSchema.powerscore_milestone_bonuses.id, id))
      .returning();
    return result.length > 0;
  }

  async getPowerScoreLoginBonuses(companyId: string): Promise<PowerScoreLoginBonus[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_login_bonuses)
      .where(eq(dbSchema.powerscore_login_bonuses.company_id, companyId))
      .orderBy(dbSchema.powerscore_login_bonuses.consecutive_days);
    return result.map(row => ({
      id: row.id,
      company_id: row.company_id,
      consecutive_days: row.consecutive_days,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async createPowerScoreLoginBonus(bonus: Omit<PowerScoreLoginBonus, 'id' | 'created_at' | 'updated_at'>): Promise<PowerScoreLoginBonus> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_login_bonuses)
      .values({
        id,
        company_id: bonus.company_id,
        consecutive_days: bonus.consecutive_days,
        bonus_points: bonus.bonus_points,
        enabled: bonus.enabled,
        created_at: now,
        updated_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      consecutive_days: row.consecutive_days,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || now.toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async updatePowerScoreLoginBonus(id: string, updates: Partial<PowerScoreLoginBonus>): Promise<PowerScoreLoginBonus | undefined> {
    const now = new Date();
    const dbUpdates: any = { updated_at: now };
    if (updates.consecutive_days !== undefined) dbUpdates.consecutive_days = updates.consecutive_days;
    if (updates.bonus_points !== undefined) dbUpdates.bonus_points = updates.bonus_points;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    
    const rows = await db.update(dbSchema.powerscore_login_bonuses)
      .set(dbUpdates)
      .where(eq(dbSchema.powerscore_login_bonuses.id, id))
      .returning();
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      consecutive_days: row.consecutive_days,
      bonus_points: row.bonus_points,
      enabled: row.enabled ?? true,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || now.toISOString(),
    };
  }

  async deletePowerScoreLoginBonus(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.powerscore_login_bonuses)
      .where(eq(dbSchema.powerscore_login_bonuses.id, id))
      .returning();
    return result.length > 0;
  }

  async getPowerScoreAppreciations(userId: string, unseenOnly: boolean = false): Promise<PowerScoreAppreciation[]> {
    let query = db.select()
      .from(dbSchema.powerscore_appreciations)
      .where(eq(dbSchema.powerscore_appreciations.recipient_id, userId))
      .orderBy(desc(dbSchema.powerscore_appreciations.created_at));
    
    if (unseenOnly) {
      const result = await db.select()
        .from(dbSchema.powerscore_appreciations)
        .where(
          and(
            eq(dbSchema.powerscore_appreciations.recipient_id, userId),
            eq(dbSchema.powerscore_appreciations.seen, false)
          )
        )
        .orderBy(desc(dbSchema.powerscore_appreciations.created_at));
      return result.map(row => ({
        id: row.id,
        giver_id: row.giver_id,
        recipient_id: row.recipient_id,
        points: row.points,
        message: row.message,
        seen: row.seen ?? false,
        created_at: row.created_at?.toISOString() || new Date().toISOString(),
      }));
    }
    
    const result = await query;
    return result.map(row => ({
      id: row.id,
      giver_id: row.giver_id,
      recipient_id: row.recipient_id,
      points: row.points,
      message: row.message,
      seen: row.seen ?? false,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async createPowerScoreAppreciation(appreciation: Omit<PowerScoreAppreciation, 'id' | 'seen' | 'created_at'>): Promise<PowerScoreAppreciation> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_appreciations)
      .values({
        id,
        giver_id: appreciation.giver_id,
        recipient_id: appreciation.recipient_id,
        points: appreciation.points,
        message: appreciation.message,
        seen: false,
        created_at: now,
      })
      .returning();
    
    // Also create a transaction for the appreciation points
    const user = await this.getUser(appreciation.recipient_id);
    if (user?.company_id) {
      await this.createPowerScoreTransaction({
        user_id: appreciation.recipient_id,
        company_id: user.company_id,
        action_type: 'admin_appreciation',
        points: appreciation.points,
        reference_id: id,
        reference_type: 'appreciation',
        description: `Admin appreciation: ${appreciation.message}`,
      });
    }
    
    const row = rows[0];
    return {
      id: row.id,
      giver_id: row.giver_id,
      recipient_id: row.recipient_id,
      points: row.points,
      message: row.message,
      seen: false,
      created_at: row.created_at?.toISOString() || now.toISOString(),
    };
  }

  async markPowerScoreAppreciationSeen(id: string): Promise<boolean> {
    const result = await db.update(dbSchema.powerscore_appreciations)
      .set({ seen: true })
      .where(eq(dbSchema.powerscore_appreciations.id, id))
      .returning();
    return result.length > 0;
  }

  async getPowerScoreNotificationThresholds(companyId: string): Promise<PowerScoreNotificationThreshold[]> {
    const result = await db.select()
      .from(dbSchema.powerscore_notification_thresholds)
      .where(eq(dbSchema.powerscore_notification_thresholds.company_id, companyId))
      .orderBy(dbSchema.powerscore_notification_thresholds.threshold_score);
    return result.map(row => ({
      id: row.id,
      company_id: row.company_id,
      threshold_score: row.threshold_score,
      message: row.message,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async createPowerScoreNotificationThreshold(threshold: Omit<PowerScoreNotificationThreshold, 'id' | 'created_at'>): Promise<PowerScoreNotificationThreshold> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_notification_thresholds)
      .values({
        id,
        company_id: threshold.company_id,
        threshold_score: threshold.threshold_score,
        message: threshold.message,
        created_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      threshold_score: row.threshold_score,
      message: row.message,
      created_at: row.created_at?.toISOString() || now.toISOString(),
    };
  }

  async deletePowerScoreNotificationThreshold(id: string): Promise<boolean> {
    const result = await db.delete(dbSchema.powerscore_notification_thresholds)
      .where(eq(dbSchema.powerscore_notification_thresholds.id, id))
      .returning();
    return result.length > 0;
  }

  async hasClaimedLoginBonus(userId: string, bonusId: string, date: Date): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db.select({ id: dbSchema.powerscore_login_claims.id })
      .from(dbSchema.powerscore_login_claims)
      .where(
        and(
          eq(dbSchema.powerscore_login_claims.user_id, userId),
          eq(dbSchema.powerscore_login_claims.bonus_id, bonusId),
          gte(dbSchema.powerscore_login_claims.claimed_at, startOfDay),
          lte(dbSchema.powerscore_login_claims.claimed_at, endOfDay)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async createLoginBonusClaim(userId: string, bonusId: string, date: Date): Promise<PowerScoreLoginClaim> {
    const id = randomUUID();
    const rows = await db.insert(dbSchema.powerscore_login_claims)
      .values({
        id,
        user_id: userId,
        bonus_id: bonusId,
        claimed_at: date,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      bonus_id: row.bonus_id,
      claimed_at: row.claimed_at?.toISOString() || date.toISOString(),
    };
  }

  async hasClaimedMilestone(userId: string, milestoneId: string): Promise<boolean> {
    const result = await db.select({ id: dbSchema.powerscore_milestone_claims.id })
      .from(dbSchema.powerscore_milestone_claims)
      .where(
        and(
          eq(dbSchema.powerscore_milestone_claims.user_id, userId),
          eq(dbSchema.powerscore_milestone_claims.milestone_id, milestoneId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async createMilestoneClaim(userId: string, milestoneId: string, score: number): Promise<PowerScoreMilestoneClaim> {
    const id = randomUUID();
    const now = new Date();
    const rows = await db.insert(dbSchema.powerscore_milestone_claims)
      .values({
        id,
        user_id: userId,
        milestone_id: milestoneId,
        score_at_claim: score,
        claimed_at: now,
      })
      .returning();
    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      milestone_id: row.milestone_id,
      score_at_claim: row.score_at_claim,
      claimed_at: row.claimed_at?.toISOString() || now.toISOString(),
    };
  }

  // ============================================================================
  // POWERFLOW (Pipeline Analytics)
  // ============================================================================

  async getPowerFlowConfig(companyId: string): Promise<PowerFlowConfig | null> {
    const result = await db.select()
      .from(dbSchema.powerflow_configs)
      .where(eq(dbSchema.powerflow_configs.company_id, companyId))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      stages: row.stages as PowerFlowStage[],
      is_enabled: row.is_enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async savePowerFlowConfig(companyId: string, config: { name: string; stages: PowerFlowStage[]; is_enabled: boolean }): Promise<PowerFlowConfig> {
    const existing = await this.getPowerFlowConfig(companyId);
    const now = new Date();
    
    if (existing) {
      // Update existing config
      const result = await db.update(dbSchema.powerflow_configs)
        .set({
          name: config.name,
          stages: config.stages,
          is_enabled: config.is_enabled,
          updated_at: now,
        })
        .where(eq(dbSchema.powerflow_configs.id, existing.id))
        .returning();
      
      const row = result[0];
      return {
        id: row.id,
        company_id: row.company_id,
        name: row.name,
        stages: row.stages as PowerFlowStage[],
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } else {
      // Create new config
      const id = randomUUID();
      const result = await db.insert(dbSchema.powerflow_configs)
        .values({
          id,
          company_id: companyId,
          name: config.name,
          stages: config.stages,
          is_enabled: config.is_enabled,
          created_at: now,
          updated_at: now,
        })
        .returning();
      
      const row = result[0];
      return {
        id: row.id,
        company_id: row.company_id,
        name: row.name,
        stages: row.stages as PowerFlowStage[],
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }
  }

  async getPowerFlowAnalytics(
    companyId: string, 
    sheetIds: string[], 
    stages: PowerFlowStage[], 
    startDate: Date, 
    endDate: Date
  ): Promise<{ stages: PowerFlowStageMetrics[]; total_leads: number; overall_conversion_rate: number }> {
    if (stages.length === 0 || sheetIds.length === 0) {
      return { stages: [], total_leads: 0, overall_conversion_rate: 0 };
    }

    // Note: PowerFlow counts ALL leads regardless of owner (no multi-sheet exclusion)
    // Multi-sheet exclusion is only applied to PowerScore and Working Targets leaderboards

    // Sort stages by order
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    
    // Build sheet IDs condition
    const sheetIdPlaceholders = sql.join(sheetIds.map(id => sql`${id}`), sql`, `);
    
    // Count total leads created in the period
    const totalLeadsResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM leads l
      WHERE l.sheet_id IN (${sheetIdPlaceholders})
        AND l.created_at >= ${startDate}
        AND l.created_at <= ${endDate}
        AND l.deleted_at IS NULL
    `);
    const totalLeadsRows = (totalLeadsResult as any).rows ?? totalLeadsResult;
    const totalLeads = Number(totalLeadsRows[0]?.count || 0);

    // For each stage, count leads by their CURRENT status (not transitions)
    const stageMetrics: PowerFlowStageMetrics[] = [];
    
    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      let count = 0;
      
      if (i === 0) {
        // First stage (Leads) - count total leads created in the period
        count = totalLeads;
      } else {
        // For other stages, count leads whose CURRENT custom_fields value matches the stage values
        const columnValueStrings: string[] = (stage.column_values || []).map(v => String(v));
        
        if (columnValueStrings.length === 0) {
          count = 0;
        } else {
          const columnValuePlaceholders = sql.join(columnValueStrings.map(v => sql`${v}`), sql`, `);
          
          // Count leads by current status in custom_fields (within the date period)
          // Use COALESCE to handle both object-shaped values (dropdown: {"value": "X"}) and plain strings
          const statusResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM leads l
            WHERE l.sheet_id IN (${sheetIdPlaceholders})
              AND l.created_at >= ${startDate}
              AND l.created_at <= ${endDate}
              AND l.deleted_at IS NULL
              AND COALESCE(l.custom_fields->${stage.column_key}->>'value', l.custom_fields->>${stage.column_key}) IN (${columnValuePlaceholders})
          `);
          
          const resultRows = (statusResult as any).rows ?? statusResult;
          count = Number(resultRows[0]?.count || 0);
        }
      }
      
      // Calculate conversion rate to next stage
      let conversionRate = 0;
      if (i < sortedStages.length - 1 && count > 0) {
        // We'll calculate this after we have all counts
        conversionRate = 0; // Placeholder
      }
      
      stageMetrics.push({
        stage_id: stage.id,
        stage_name: stage.name,
        count,
        conversion_rate: conversionRate,
        color: stage.color,
      });
    }
    
    // Calculate conversion rates (current stage -> next stage)
    for (let i = 0; i < stageMetrics.length - 1; i++) {
      const current = stageMetrics[i];
      const next = stageMetrics[i + 1];
      if (current.count > 0) {
        current.conversion_rate = Math.round((next.count / current.count) * 100 * 10) / 10;
      }
    }
    
    // Overall conversion rate (first stage to last stage)
    const firstStage = stageMetrics[0];
    const lastStage = stageMetrics[stageMetrics.length - 1];
    const overallConversionRate = firstStage?.count > 0 
      ? Math.round((lastStage.count / firstStage.count) * 100 * 10) / 10 
      : 0;

    return {
      stages: stageMetrics,
      total_leads: totalLeads,
      overall_conversion_rate: overallConversionRate,
    };
  }

  // ============================================================================
  // VISION BOARD (Personal Goal Tracking)
  // ============================================================================

  private mapVisionBoard(record: any): VisionBoard {
    return {
      id: record.id,
      user_id: record.user_id,
      company_id: record.company_id,
      goal_amount: Number(record.goal_amount),
      currency: record.currency,
      goal_description: record.goal_description,
      start_date: record.start_date ? (record.start_date instanceof Date ? record.start_date : new Date(record.start_date)) : null,
      target_date: record.target_date instanceof Date ? record.target_date : new Date(record.target_date),
      images: (record.images as VisionBoardImage[]) || [],
      effort_targets: (record.effort_targets as VisionBoardEffortTargets) || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      effort_overrides: record.effort_overrides as VisionBoardEffortOverrides | null,
      sheet_id: record.sheet_id,
      is_active: record.is_active,
      created_at: record.created_at instanceof Date ? record.created_at : new Date(record.created_at),
      updated_at: record.updated_at instanceof Date ? record.updated_at : new Date(record.updated_at),
    };
  }

  private mapVisionBoardEarning(record: any): VisionBoardEarning {
    return {
      id: record.id,
      vision_board_id: record.vision_board_id,
      user_id: record.user_id,
      amount: Number(record.amount),
      source_type: record.source_type,
      source_lead_id: record.source_lead_id,
      description: record.description,
      earned_at: record.earned_at instanceof Date ? record.earned_at : new Date(record.earned_at),
      created_at: record.created_at instanceof Date ? record.created_at : new Date(record.created_at),
      updated_at: record.updated_at instanceof Date ? record.updated_at : new Date(record.updated_at),
    };
  }

  async getVisionBoard(userId: string): Promise<VisionBoard | null> {
    const result = await db.select()
      .from(dbSchema.vision_boards)
      .where(and(
        eq(dbSchema.vision_boards.user_id, userId),
        eq(dbSchema.vision_boards.is_active, true)
      ))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapVisionBoard(result[0]);
  }

  async getVisionBoardsByCompany(companyId: string): Promise<VisionBoard[]> {
    const result = await db.select()
      .from(dbSchema.vision_boards)
      .where(and(
        eq(dbSchema.vision_boards.company_id, companyId),
        eq(dbSchema.vision_boards.is_active, true)
      ));
    return result.map(r => this.mapVisionBoard(r));
  }

  async createVisionBoard(board: InsertVisionBoard): Promise<VisionBoard> {
    const id = randomUUID();
    const now = new Date();
    const newBoard = {
      id,
      user_id: board.user_id,
      company_id: board.company_id,
      goal_amount: board.goal_amount,
      currency: board.currency || 'INR',
      goal_description: board.goal_description,
      start_date: board.start_date ? (board.start_date instanceof Date ? board.start_date : new Date(board.start_date)) : now,
      target_date: board.target_date instanceof Date ? board.target_date : new Date(board.target_date),
      images: board.images || [],
      effort_targets: board.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      effort_overrides: board.effort_overrides || null,
      sheet_id: board.sheet_id || null,
      is_active: board.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.vision_boards).values(newBoard);
    return this.mapVisionBoard(newBoard);
  }

  async updateVisionBoard(id: string, updates: Partial<VisionBoard>): Promise<VisionBoard | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    if (updates.start_date && typeof updates.start_date === 'string') {
      convertedUpdates.start_date = new Date(updates.start_date);
    }
    if (updates.target_date && typeof updates.target_date === 'string') {
      convertedUpdates.target_date = new Date(updates.target_date);
    }
    await db.update(dbSchema.vision_boards)
      .set(convertedUpdates)
      .where(eq(dbSchema.vision_boards.id, id));
    const result = await db.select()
      .from(dbSchema.vision_boards)
      .where(eq(dbSchema.vision_boards.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapVisionBoard(result[0]);
  }

  async deleteVisionBoard(id: string): Promise<boolean> {
    await db.delete(dbSchema.vision_boards).where(eq(dbSchema.vision_boards.id, id));
    return true;
  }

  async getVisionBoardEarnings(visionBoardId: string): Promise<VisionBoardEarning[]> {
    const result = await db.select()
      .from(dbSchema.vision_board_earnings)
      .where(eq(dbSchema.vision_board_earnings.vision_board_id, visionBoardId))
      .orderBy(desc(dbSchema.vision_board_earnings.earned_at));
    return result.map(r => this.mapVisionBoardEarning(r));
  }

  async getVisionBoardEarningsByDateRange(visionBoardId: string, startDate: Date, endDate: Date): Promise<VisionBoardEarning[]> {
    const result = await db.select()
      .from(dbSchema.vision_board_earnings)
      .where(and(
        eq(dbSchema.vision_board_earnings.vision_board_id, visionBoardId),
        gte(dbSchema.vision_board_earnings.earned_at, startDate),
        lte(dbSchema.vision_board_earnings.earned_at, endDate)
      ))
      .orderBy(desc(dbSchema.vision_board_earnings.earned_at));
    return result.map(r => this.mapVisionBoardEarning(r));
  }

  async createVisionBoardEarning(earning: InsertVisionBoardEarning): Promise<VisionBoardEarning> {
    const id = randomUUID();
    const now = new Date();
    const newEarning = {
      id,
      vision_board_id: earning.vision_board_id,
      user_id: earning.user_id,
      amount: earning.amount,
      source_type: earning.source_type,
      source_lead_id: earning.source_lead_id || null,
      description: earning.description || null,
      earned_at: earning.earned_at instanceof Date ? earning.earned_at : new Date(earning.earned_at),
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.vision_board_earnings).values(newEarning);
    return this.mapVisionBoardEarning(newEarning);
  }

  async updateVisionBoardEarning(id: string, updates: Partial<VisionBoardEarning>): Promise<VisionBoardEarning | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    if (updates.earned_at && typeof updates.earned_at === 'string') {
      convertedUpdates.earned_at = new Date(updates.earned_at);
    }
    await db.update(dbSchema.vision_board_earnings)
      .set(convertedUpdates)
      .where(eq(dbSchema.vision_board_earnings.id, id));
    const result = await db.select()
      .from(dbSchema.vision_board_earnings)
      .where(eq(dbSchema.vision_board_earnings.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapVisionBoardEarning(result[0]);
  }

  async deleteVisionBoardEarning(id: string): Promise<boolean> {
    await db.delete(dbSchema.vision_board_earnings).where(eq(dbSchema.vision_board_earnings.id, id));
    return true;
  }

  // ============================================================================
  // VISION BOARD ADMIN MANAGEMENT
  // ============================================================================

  private mapCompanyVisionBoard(row: any): CompanyVisionBoard {
    return {
      id: row.id,
      company_id: row.company_id,
      year: row.year,
      goal_amount: row.goal_amount,
      currency: row.currency,
      goal_description: row.goal_description,
      images: row.images || [],
      annual_targets: row.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapCompanyVisionMonthlyTarget(row: any): CompanyVisionMonthlyTarget {
    return {
      id: row.id,
      company_vision_id: row.company_vision_id,
      company_id: row.company_id,
      year: row.year,
      month: row.month,
      targets: row.targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_auto_calculated: row.is_auto_calculated,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapUserVisionAdminTarget(row: any): UserVisionAdminTarget {
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      year: row.year,
      goal_amount: row.goal_amount,
      currency: row.currency,
      goal_description: row.goal_description,
      images: row.images || [],
      annual_targets: row.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapUserVisionMonthlyTarget(row: any): UserVisionMonthlyTarget {
    return {
      id: row.id,
      user_vision_id: row.user_vision_id,
      user_id: row.user_id,
      company_id: row.company_id,
      year: row.year,
      month: row.month,
      targets: row.targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_auto_calculated: row.is_auto_calculated,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapAdminActualIncentive(row: any): AdminActualIncentive {
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      year: row.year,
      month: row.month,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      payment_date: row.payment_date instanceof Date ? row.payment_date : (row.payment_date ? new Date(row.payment_date) : null),
      added_by: row.added_by,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  async getCompanyVisionBoard(companyId: string, year: number): Promise<CompanyVisionBoard | null> {
    const result = await db.select()
      .from(dbSchema.company_vision_boards)
      .where(and(
        eq(dbSchema.company_vision_boards.company_id, companyId),
        eq(dbSchema.company_vision_boards.year, year),
        eq(dbSchema.company_vision_boards.is_active, true)
      ))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapCompanyVisionBoard(result[0]);
  }

  async createCompanyVisionBoard(board: InsertCompanyVisionBoard): Promise<CompanyVisionBoard> {
    const id = randomUUID();
    const now = new Date();
    const newBoard = {
      id,
      company_id: board.company_id,
      year: board.year,
      goal_amount: board.goal_amount || 0,
      currency: board.currency || 'INR',
      goal_description: board.goal_description || null,
      images: board.images || [],
      annual_targets: board.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_active: board.is_active ?? true,
      created_by: board.created_by || null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.company_vision_boards).values(newBoard);
    return this.mapCompanyVisionBoard(newBoard);
  }

  async updateCompanyVisionBoard(id: string, updates: Partial<CompanyVisionBoard>): Promise<CompanyVisionBoard | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.company_vision_boards)
      .set(convertedUpdates)
      .where(eq(dbSchema.company_vision_boards.id, id));
    const result = await db.select()
      .from(dbSchema.company_vision_boards)
      .where(eq(dbSchema.company_vision_boards.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapCompanyVisionBoard(result[0]);
  }

  async deleteCompanyVisionBoard(id: string): Promise<boolean> {
    await db.delete(dbSchema.company_vision_boards).where(eq(dbSchema.company_vision_boards.id, id));
    return true;
  }

  async getCompanyVisionMonthlyTargets(companyVisionId: string): Promise<CompanyVisionMonthlyTarget[]> {
    const result = await db.select()
      .from(dbSchema.company_vision_monthly_targets)
      .where(eq(dbSchema.company_vision_monthly_targets.company_vision_id, companyVisionId))
      .orderBy(dbSchema.company_vision_monthly_targets.month);
    return result.map(r => this.mapCompanyVisionMonthlyTarget(r));
  }

  async upsertCompanyVisionMonthlyTarget(target: InsertCompanyVisionMonthlyTarget): Promise<CompanyVisionMonthlyTarget> {
    const existing = await db.select()
      .from(dbSchema.company_vision_monthly_targets)
      .where(and(
        eq(dbSchema.company_vision_monthly_targets.company_vision_id, target.company_vision_id),
        eq(dbSchema.company_vision_monthly_targets.year, target.year),
        eq(dbSchema.company_vision_monthly_targets.month, target.month)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return this.updateCompanyVisionMonthlyTarget(existing[0].id, target) as Promise<CompanyVisionMonthlyTarget>;
    }
    
    const id = randomUUID();
    const now = new Date();
    const newTarget = {
      id,
      company_vision_id: target.company_vision_id,
      company_id: target.company_id,
      year: target.year,
      month: target.month,
      targets: target.targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_auto_calculated: target.is_auto_calculated ?? true,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.company_vision_monthly_targets).values(newTarget);
    return this.mapCompanyVisionMonthlyTarget(newTarget);
  }

  async updateCompanyVisionMonthlyTarget(id: string, updates: Partial<CompanyVisionMonthlyTarget>): Promise<CompanyVisionMonthlyTarget | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.company_vision_monthly_targets)
      .set(convertedUpdates)
      .where(eq(dbSchema.company_vision_monthly_targets.id, id));
    const result = await db.select()
      .from(dbSchema.company_vision_monthly_targets)
      .where(eq(dbSchema.company_vision_monthly_targets.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapCompanyVisionMonthlyTarget(result[0]);
  }

  async deleteCompanyVisionMonthlyTargets(companyVisionId: string): Promise<boolean> {
    await db.delete(dbSchema.company_vision_monthly_targets)
      .where(eq(dbSchema.company_vision_monthly_targets.company_vision_id, companyVisionId));
    return true;
  }

  async getUserVisionAdminTarget(userId: string, year: number): Promise<UserVisionAdminTarget | null> {
    const result = await db.select()
      .from(dbSchema.user_vision_admin_targets)
      .where(and(
        eq(dbSchema.user_vision_admin_targets.user_id, userId),
        eq(dbSchema.user_vision_admin_targets.year, year),
        eq(dbSchema.user_vision_admin_targets.is_active, true)
      ))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapUserVisionAdminTarget(result[0]);
  }

  async getUserVisionAdminTargetsByCompany(companyId: string, year: number): Promise<UserVisionAdminTarget[]> {
    const result = await db.select()
      .from(dbSchema.user_vision_admin_targets)
      .where(and(
        eq(dbSchema.user_vision_admin_targets.company_id, companyId),
        eq(dbSchema.user_vision_admin_targets.year, year),
        eq(dbSchema.user_vision_admin_targets.is_active, true)
      ));
    return result.map(r => this.mapUserVisionAdminTarget(r));
  }

  async createUserVisionAdminTarget(target: InsertUserVisionAdminTarget): Promise<UserVisionAdminTarget> {
    const id = randomUUID();
    const now = new Date();
    const newTarget = {
      id,
      user_id: target.user_id,
      company_id: target.company_id,
      year: target.year,
      goal_amount: target.goal_amount || 0,
      currency: target.currency || 'INR',
      goal_description: target.goal_description || null,
      images: target.images || [],
      annual_targets: target.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_active: target.is_active ?? true,
      created_by: target.created_by || null,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.user_vision_admin_targets).values(newTarget);
    return this.mapUserVisionAdminTarget(newTarget);
  }

  async updateUserVisionAdminTarget(id: string, updates: Partial<UserVisionAdminTarget>): Promise<UserVisionAdminTarget | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.user_vision_admin_targets)
      .set(convertedUpdates)
      .where(eq(dbSchema.user_vision_admin_targets.id, id));
    const result = await db.select()
      .from(dbSchema.user_vision_admin_targets)
      .where(eq(dbSchema.user_vision_admin_targets.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapUserVisionAdminTarget(result[0]);
  }

  async deleteUserVisionAdminTarget(id: string): Promise<boolean> {
    await db.delete(dbSchema.user_vision_admin_targets).where(eq(dbSchema.user_vision_admin_targets.id, id));
    return true;
  }

  async getUserVisionMonthlyTargets(userVisionId: string): Promise<UserVisionMonthlyTarget[]> {
    const result = await db.select()
      .from(dbSchema.user_vision_monthly_targets)
      .where(eq(dbSchema.user_vision_monthly_targets.user_vision_id, userVisionId))
      .orderBy(dbSchema.user_vision_monthly_targets.month);
    return result.map(r => this.mapUserVisionMonthlyTarget(r));
  }

  async getUserVisionMonthlyTargetsByUser(userId: string, year: number): Promise<UserVisionMonthlyTarget[]> {
    const result = await db.select()
      .from(dbSchema.user_vision_monthly_targets)
      .where(and(
        eq(dbSchema.user_vision_monthly_targets.user_id, userId),
        eq(dbSchema.user_vision_monthly_targets.year, year)
      ))
      .orderBy(dbSchema.user_vision_monthly_targets.month);
    return result.map(r => this.mapUserVisionMonthlyTarget(r));
  }

  async upsertUserVisionMonthlyTarget(target: InsertUserVisionMonthlyTarget): Promise<UserVisionMonthlyTarget> {
    const existing = await db.select()
      .from(dbSchema.user_vision_monthly_targets)
      .where(and(
        eq(dbSchema.user_vision_monthly_targets.user_vision_id, target.user_vision_id),
        eq(dbSchema.user_vision_monthly_targets.year, target.year),
        eq(dbSchema.user_vision_monthly_targets.month, target.month)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return this.updateUserVisionMonthlyTarget(existing[0].id, target) as Promise<UserVisionMonthlyTarget>;
    }
    
    const id = randomUUID();
    const now = new Date();
    const newTarget = {
      id,
      user_vision_id: target.user_vision_id,
      user_id: target.user_id,
      company_id: target.company_id,
      year: target.year,
      month: target.month,
      targets: target.targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      is_auto_calculated: target.is_auto_calculated ?? true,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.user_vision_monthly_targets).values(newTarget);
    return this.mapUserVisionMonthlyTarget(newTarget);
  }

  async updateUserVisionMonthlyTarget(id: string, updates: Partial<UserVisionMonthlyTarget>): Promise<UserVisionMonthlyTarget | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.user_vision_monthly_targets)
      .set(convertedUpdates)
      .where(eq(dbSchema.user_vision_monthly_targets.id, id));
    const result = await db.select()
      .from(dbSchema.user_vision_monthly_targets)
      .where(eq(dbSchema.user_vision_monthly_targets.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapUserVisionMonthlyTarget(result[0]);
  }

  async deleteUserVisionMonthlyTargets(userVisionId: string): Promise<boolean> {
    await db.delete(dbSchema.user_vision_monthly_targets)
      .where(eq(dbSchema.user_vision_monthly_targets.user_vision_id, userVisionId));
    return true;
  }

  async getAdminActualIncentives(companyId: string, year: number, userId?: string): Promise<AdminActualIncentive[]> {
    const conditions = [
      eq(dbSchema.admin_actual_incentives.company_id, companyId),
      eq(dbSchema.admin_actual_incentives.year, year)
    ];
    if (userId) {
      conditions.push(eq(dbSchema.admin_actual_incentives.user_id, userId));
    }
    const result = await db.select()
      .from(dbSchema.admin_actual_incentives)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.admin_actual_incentives.created_at));
    return result.map(r => this.mapAdminActualIncentive(r));
  }

  async getAdminActualIncentivesByUser(userId: string, year: number): Promise<AdminActualIncentive[]> {
    const result = await db.select()
      .from(dbSchema.admin_actual_incentives)
      .where(and(
        eq(dbSchema.admin_actual_incentives.user_id, userId),
        eq(dbSchema.admin_actual_incentives.year, year)
      ))
      .orderBy(desc(dbSchema.admin_actual_incentives.created_at));
    return result.map(r => this.mapAdminActualIncentive(r));
  }

  async createAdminActualIncentive(incentive: InsertAdminActualIncentive): Promise<AdminActualIncentive> {
    const id = randomUUID();
    const now = new Date();
    const newIncentive = {
      id,
      user_id: incentive.user_id,
      company_id: incentive.company_id,
      year: incentive.year,
      month: incentive.month,
      amount: incentive.amount,
      currency: incentive.currency || 'INR',
      description: incentive.description || null,
      payment_date: incentive.payment_date ? (incentive.payment_date instanceof Date ? incentive.payment_date : new Date(incentive.payment_date)) : null,
      added_by: incentive.added_by,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.admin_actual_incentives).values(newIncentive);
    return this.mapAdminActualIncentive(newIncentive);
  }

  async updateAdminActualIncentive(id: string, updates: Partial<AdminActualIncentive>): Promise<AdminActualIncentive | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    if (updates.payment_date && typeof updates.payment_date === 'string') {
      convertedUpdates.payment_date = new Date(updates.payment_date);
    }
    await db.update(dbSchema.admin_actual_incentives)
      .set(convertedUpdates)
      .where(eq(dbSchema.admin_actual_incentives.id, id));
    const result = await db.select()
      .from(dbSchema.admin_actual_incentives)
      .where(eq(dbSchema.admin_actual_incentives.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapAdminActualIncentive(result[0]);
  }

  async deleteAdminActualIncentive(id: string): Promise<boolean> {
    await db.delete(dbSchema.admin_actual_incentives).where(eq(dbSchema.admin_actual_incentives.id, id));
    return true;
  }

  // ============================================================================
  // CONVERSION SETTINGS (Pipeline Stage Management)
  // ============================================================================

  private mapConversionConfig(row: any): ConversionConfig {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      is_active: row.is_active,
      version: row.version,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionStage(row: any): ConversionStage {
    return {
      id: row.id,
      config_id: row.config_id,
      stage_number: row.stage_number,
      stage_name: row.stage_name,
      trigger_type: row.trigger_type,
      trigger_values: row.trigger_values || [],
      color: row.color,
      expected_conversion_percent: row.expected_conversion_percent,
      sort_order: row.sort_order,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionValue(row: any): ConversionValue {
    return {
      id: row.id,
      config_id: row.config_id,
      value_type: row.value_type,
      fixed_amount: row.fixed_amount,
      source_column_key: row.source_column_key,
      default_amount: row.default_amount,
      currency: row.currency,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionIncentive(row: any): ConversionIncentive {
    return {
      id: row.id,
      config_id: row.config_id,
      incentive_type: row.incentive_type,
      percentage_value: row.percentage_value,
      fixed_amount: row.fixed_amount,
      tier_rules: row.tier_rules || [],
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionApproval(row: any): ConversionApproval {
    return {
      id: row.id,
      config_id: row.config_id,
      is_enabled: row.is_enabled,
      transitions_requiring_approval: row.transitions_requiring_approval || [],
      auto_approve_hours: row.auto_approve_hours,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionPendingApproval(row: any): ConversionPendingApproval {
    return {
      id: row.id,
      config_id: row.config_id,
      lead_id: row.lead_id,
      from_stage_number: row.from_stage_number,
      to_stage_number: row.to_stage_number,
      requested_by: row.requested_by,
      status: row.status,
      approved_by: row.approved_by,
      approved_at: row.approved_at ? (row.approved_at instanceof Date ? row.approved_at : new Date(row.approved_at)) : null,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConversionHistory(row: any): ConversionHistory {
    return {
      id: row.id,
      config_id: row.config_id,
      lead_id: row.lead_id,
      from_stage_number: row.from_stage_number,
      to_stage_number: row.to_stage_number,
      conversion_value: row.conversion_value,
      incentive_amount: row.incentive_amount,
      triggered_by: row.triggered_by,
      occurred_at: row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at),
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    };
  }

  async getConversionConfig(companyId: string): Promise<ConversionConfig | null> {
    const result = await db.select()
      .from(dbSchema.conversion_configs)
      .where(eq(dbSchema.conversion_configs.company_id, companyId))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapConversionConfig(result[0]);
  }

  async createConversionConfig(config: Omit<InsertConversionConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionConfig> {
    const id = randomUUID();
    const now = new Date();
    const newConfig = {
      id,
      ...config,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.conversion_configs).values(newConfig);
    return this.mapConversionConfig(newConfig);
  }

  async updateConversionConfig(id: string, updates: Partial<ConversionConfig>): Promise<ConversionConfig | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.conversion_configs)
      .set(convertedUpdates)
      .where(eq(dbSchema.conversion_configs.id, id));
    const result = await db.select()
      .from(dbSchema.conversion_configs)
      .where(eq(dbSchema.conversion_configs.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapConversionConfig(result[0]);
  }

  async deleteConversionConfig(id: string): Promise<boolean> {
    await db.delete(dbSchema.conversion_configs).where(eq(dbSchema.conversion_configs.id, id));
    return true;
  }

  async getConversionStages(configId: string): Promise<ConversionStage[]> {
    const result = await db.select()
      .from(dbSchema.conversion_stages)
      .where(eq(dbSchema.conversion_stages.config_id, configId))
      .orderBy(asc(dbSchema.conversion_stages.sort_order));
    return result.map(row => this.mapConversionStage(row));
  }

  async createConversionStage(stage: Omit<InsertConversionStage, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionStage> {
    const id = randomUUID();
    const now = new Date();
    const newStage = {
      id,
      ...stage,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.conversion_stages).values(newStage);
    return this.mapConversionStage(newStage);
  }

  async updateConversionStage(id: string, updates: Partial<ConversionStage>): Promise<ConversionStage | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    await db.update(dbSchema.conversion_stages)
      .set(convertedUpdates)
      .where(eq(dbSchema.conversion_stages.id, id));
    const result = await db.select()
      .from(dbSchema.conversion_stages)
      .where(eq(dbSchema.conversion_stages.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapConversionStage(result[0]);
  }

  async deleteConversionStage(id: string): Promise<boolean> {
    await db.delete(dbSchema.conversion_stages).where(eq(dbSchema.conversion_stages.id, id));
    return true;
  }

  async reorderConversionStages(configId: string, stageIds: string[]): Promise<boolean> {
    for (let i = 0; i < stageIds.length; i++) {
      await db.update(dbSchema.conversion_stages)
        .set({ 
          sort_order: i, 
          stage_number: i + 1, // Update stage_number to match display order (1-based)
          updated_at: new Date() 
        })
        .where(and(
          eq(dbSchema.conversion_stages.id, stageIds[i]),
          eq(dbSchema.conversion_stages.config_id, configId)
        ));
    }
    return true;
  }

  async getConversionValue(configId: string): Promise<ConversionValue | null> {
    const result = await db.select()
      .from(dbSchema.conversion_values)
      .where(eq(dbSchema.conversion_values.config_id, configId))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapConversionValue(result[0]);
  }

  async saveConversionValue(configId: string, value: Omit<InsertConversionValue, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionValue> {
    const existing = await this.getConversionValue(configId);
    const now = new Date();
    
    if (existing) {
      await db.update(dbSchema.conversion_values)
        .set({ ...value, updated_at: now })
        .where(eq(dbSchema.conversion_values.config_id, configId));
      const result = await db.select()
        .from(dbSchema.conversion_values)
        .where(eq(dbSchema.conversion_values.config_id, configId))
        .limit(1);
      return this.mapConversionValue(result[0]);
    } else {
      const id = randomUUID();
      const newValue = {
        id,
        config_id: configId,
        ...value,
        created_at: now,
        updated_at: now,
      };
      await db.insert(dbSchema.conversion_values).values(newValue);
      return this.mapConversionValue(newValue);
    }
  }

  async getConversionIncentive(configId: string): Promise<ConversionIncentive | null> {
    const result = await db.select()
      .from(dbSchema.conversion_incentives)
      .where(eq(dbSchema.conversion_incentives.config_id, configId))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapConversionIncentive(result[0]);
  }

  async saveConversionIncentive(configId: string, incentive: Omit<InsertConversionIncentive, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionIncentive> {
    const existing = await this.getConversionIncentive(configId);
    const now = new Date();
    
    if (existing) {
      await db.update(dbSchema.conversion_incentives)
        .set({ ...incentive, updated_at: now })
        .where(eq(dbSchema.conversion_incentives.config_id, configId));
      const result = await db.select()
        .from(dbSchema.conversion_incentives)
        .where(eq(dbSchema.conversion_incentives.config_id, configId))
        .limit(1);
      return this.mapConversionIncentive(result[0]);
    } else {
      const id = randomUUID();
      const newIncentive = {
        id,
        config_id: configId,
        ...incentive,
        created_at: now,
        updated_at: now,
      };
      await db.insert(dbSchema.conversion_incentives).values(newIncentive);
      return this.mapConversionIncentive(newIncentive);
    }
  }

  async getConversionApproval(configId: string): Promise<ConversionApproval | null> {
    const result = await db.select()
      .from(dbSchema.conversion_approvals)
      .where(eq(dbSchema.conversion_approvals.config_id, configId))
      .limit(1);
    if (result.length === 0) return null;
    return this.mapConversionApproval(result[0]);
  }

  async saveConversionApproval(configId: string, approval: Omit<InsertConversionApproval, 'id' | 'config_id' | 'created_at' | 'updated_at'>): Promise<ConversionApproval> {
    const existing = await this.getConversionApproval(configId);
    const now = new Date();
    
    if (existing) {
      await db.update(dbSchema.conversion_approvals)
        .set({ ...approval, updated_at: now })
        .where(eq(dbSchema.conversion_approvals.config_id, configId));
      const result = await db.select()
        .from(dbSchema.conversion_approvals)
        .where(eq(dbSchema.conversion_approvals.config_id, configId))
        .limit(1);
      return this.mapConversionApproval(result[0]);
    } else {
      const id = randomUUID();
      const newApproval = {
        id,
        config_id: configId,
        ...approval,
        created_at: now,
        updated_at: now,
      };
      await db.insert(dbSchema.conversion_approvals).values(newApproval);
      return this.mapConversionApproval(newApproval);
    }
  }

  async getConversionPendingApprovals(configId: string): Promise<ConversionPendingApproval[]> {
    const result = await db.select()
      .from(dbSchema.conversion_pending_approvals)
      .where(and(
        eq(dbSchema.conversion_pending_approvals.config_id, configId),
        eq(dbSchema.conversion_pending_approvals.status, 'pending')
      ))
      .orderBy(desc(dbSchema.conversion_pending_approvals.created_at));
    return result.map(row => this.mapConversionPendingApproval(row));
  }

  async createConversionPendingApproval(approval: Omit<InsertConversionPendingApproval, 'id' | 'created_at' | 'updated_at'>): Promise<ConversionPendingApproval> {
    const id = randomUUID();
    const now = new Date();
    const newApproval = {
      id,
      ...approval,
      created_at: now,
      updated_at: now,
    };
    await db.insert(dbSchema.conversion_pending_approvals).values(newApproval);
    return this.mapConversionPendingApproval(newApproval);
  }

  async updateConversionPendingApproval(id: string, updates: Partial<ConversionPendingApproval>): Promise<ConversionPendingApproval | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    if (updates.approved_at && typeof updates.approved_at === 'string') {
      convertedUpdates.approved_at = new Date(updates.approved_at);
    }
    await db.update(dbSchema.conversion_pending_approvals)
      .set(convertedUpdates)
      .where(eq(dbSchema.conversion_pending_approvals.id, id));
    const result = await db.select()
      .from(dbSchema.conversion_pending_approvals)
      .where(eq(dbSchema.conversion_pending_approvals.id, id))
      .limit(1);
    if (result.length === 0) return undefined;
    return this.mapConversionPendingApproval(result[0]);
  }

  async getConversionHistory(configId: string, startDate?: Date, endDate?: Date): Promise<ConversionHistory[]> {
    let query = db.select()
      .from(dbSchema.conversion_history)
      .where(eq(dbSchema.conversion_history.config_id, configId));
    
    if (startDate && endDate) {
      query = db.select()
        .from(dbSchema.conversion_history)
        .where(and(
          eq(dbSchema.conversion_history.config_id, configId),
          gte(dbSchema.conversion_history.occurred_at, startDate),
          lte(dbSchema.conversion_history.occurred_at, endDate)
        ));
    }
    
    const result = await query.orderBy(desc(dbSchema.conversion_history.occurred_at));
    return result.map(row => this.mapConversionHistory(row));
  }

  async createConversionHistory(history: Omit<InsertConversionHistory, 'id' | 'created_at'>): Promise<ConversionHistory> {
    const id = randomUUID();
    const now = new Date();
    const newHistory = {
      id,
      ...history,
      occurred_at: history.occurred_at instanceof Date ? history.occurred_at : new Date(history.occurred_at as any),
      created_at: now,
    };
    await db.insert(dbSchema.conversion_history).values(newHistory);
    return this.mapConversionHistory(newHistory);
  }

  async getConversionSettingsComplete(companyId: string): Promise<ConversionSettingsComplete | null> {
    const config = await this.getConversionConfig(companyId);
    if (!config) return null;
    
    const stages = await this.getConversionStages(config.id);
    const value = await this.getConversionValue(config.id);
    const incentive = await this.getConversionIncentive(config.id);
    const approval = await this.getConversionApproval(config.id);
    
    return {
      config,
      stages,
      value,
      incentive,
      approval,
    };
  }

  // ============================================================================
  // WHATSAPP LEAD MANAGEMENT STORAGE
  // ============================================================================

  // WhatsApp Allocations
  async getWhatsAppAllocations(companyId: string): Promise<WhatsAppAllocationRecord[]> {
    return await db.select()
      .from(dbSchema.whatsapp_allocations)
      .where(eq(dbSchema.whatsapp_allocations.company_id, companyId))
      .orderBy(desc(dbSchema.whatsapp_allocations.created_at));
  }

  async getWhatsAppAllocationByPhone(companyId: string, displayPhoneNumber: string): Promise<WhatsAppAllocationRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.whatsapp_allocations)
      .where(and(
        eq(dbSchema.whatsapp_allocations.company_id, companyId),
        eq(dbSchema.whatsapp_allocations.display_phone_number, displayPhoneNumber),
        eq(dbSchema.whatsapp_allocations.enabled, true)
      ))
      .limit(1);
    return result[0];
  }

  async createWhatsAppAllocation(allocation: InsertWhatsAppAllocationData): Promise<WhatsAppAllocationRecord> {
    const id = randomUUID();
    const now = new Date();
    const newAllocation = {
      id,
      ...allocation,
      created_at: now,
      updated_at: now,
    };
    const result = await db.insert(dbSchema.whatsapp_allocations).values(newAllocation).returning();
    return result[0];
  }

  async updateWhatsAppAllocation(id: string, updates: Partial<WhatsAppAllocationRecord>): Promise<WhatsAppAllocationRecord | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    const result = await db.update(dbSchema.whatsapp_allocations)
      .set(convertedUpdates)
      .where(eq(dbSchema.whatsapp_allocations.id, id))
      .returning();
    return result[0];
  }

  async deleteWhatsAppAllocation(id: string): Promise<boolean> {
    await db.delete(dbSchema.whatsapp_allocations).where(eq(dbSchema.whatsapp_allocations.id, id));
    return true;
  }

  // WhatsApp Trigger Rules
  async getWhatsAppTriggerRules(companyId: string): Promise<WhatsAppTriggerRuleRecord[]> {
    return await db.select()
      .from(dbSchema.whatsapp_trigger_rules)
      .where(eq(dbSchema.whatsapp_trigger_rules.company_id, companyId))
      .orderBy(asc(dbSchema.whatsapp_trigger_rules.order_index));
  }

  async getWhatsAppTriggerRule(id: string): Promise<WhatsAppTriggerRuleRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.whatsapp_trigger_rules)
      .where(eq(dbSchema.whatsapp_trigger_rules.id, id))
      .limit(1);
    return result[0];
  }

  async createWhatsAppTriggerRule(rule: InsertWhatsAppTriggerRuleData): Promise<WhatsAppTriggerRuleRecord> {
    const id = randomUUID();
    const now = new Date();
    const newRule = {
      id,
      ...rule,
      created_at: now,
      updated_at: now,
    };
    const result = await db.insert(dbSchema.whatsapp_trigger_rules).values(newRule).returning();
    return result[0];
  }

  async updateWhatsAppTriggerRule(id: string, updates: Partial<WhatsAppTriggerRuleRecord>): Promise<WhatsAppTriggerRuleRecord | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    const result = await db.update(dbSchema.whatsapp_trigger_rules)
      .set(convertedUpdates)
      .where(eq(dbSchema.whatsapp_trigger_rules.id, id))
      .returning();
    return result[0];
  }

  async deleteWhatsAppTriggerRule(id: string): Promise<boolean> {
    await db.delete(dbSchema.whatsapp_trigger_rules).where(eq(dbSchema.whatsapp_trigger_rules.id, id));
    return true;
  }

  async reorderWhatsAppTriggerRules(companyId: string, ruleIds: string[]): Promise<boolean> {
    for (let i = 0; i < ruleIds.length; i++) {
      await db.update(dbSchema.whatsapp_trigger_rules)
        .set({ order_index: i, updated_at: new Date() })
        .where(and(
          eq(dbSchema.whatsapp_trigger_rules.id, ruleIds[i]),
          eq(dbSchema.whatsapp_trigger_rules.company_id, companyId)
        ));
    }
    return true;
  }

  // WhatsApp Field Mappings
  async getWhatsAppFieldMappings(companyId: string): Promise<WhatsAppFieldMappingRecord[]> {
    return await db.select()
      .from(dbSchema.whatsapp_field_mappings)
      .where(eq(dbSchema.whatsapp_field_mappings.company_id, companyId))
      .orderBy(desc(dbSchema.whatsapp_field_mappings.created_at));
  }

  async createWhatsAppFieldMapping(mapping: InsertWhatsAppFieldMappingData): Promise<WhatsAppFieldMappingRecord> {
    const id = randomUUID();
    const now = new Date();
    const newMapping = {
      id,
      ...mapping,
      created_at: now,
      updated_at: now,
    };
    const result = await db.insert(dbSchema.whatsapp_field_mappings).values(newMapping).returning();
    return result[0];
  }

  async updateWhatsAppFieldMapping(id: string, updates: Partial<WhatsAppFieldMappingRecord>): Promise<WhatsAppFieldMappingRecord | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    const result = await db.update(dbSchema.whatsapp_field_mappings)
      .set(convertedUpdates)
      .where(eq(dbSchema.whatsapp_field_mappings.id, id))
      .returning();
    return result[0];
  }

  async deleteWhatsAppFieldMapping(id: string): Promise<boolean> {
    await db.delete(dbSchema.whatsapp_field_mappings).where(eq(dbSchema.whatsapp_field_mappings.id, id));
    return true;
  }

  // WhatsApp Default Values
  async getWhatsAppDefaultValues(companyId: string): Promise<WhatsAppDefaultValueRecord[]> {
    return await db.select()
      .from(dbSchema.whatsapp_default_values)
      .where(eq(dbSchema.whatsapp_default_values.company_id, companyId))
      .orderBy(desc(dbSchema.whatsapp_default_values.created_at));
  }

  async createWhatsAppDefaultValue(value: InsertWhatsAppDefaultValueData): Promise<WhatsAppDefaultValueRecord> {
    const id = randomUUID();
    const now = new Date();
    const newValue = {
      id,
      ...value,
      created_at: now,
      updated_at: now,
    };
    const result = await db.insert(dbSchema.whatsapp_default_values).values(newValue).returning();
    return result[0];
  }

  async updateWhatsAppDefaultValue(id: string, updates: Partial<WhatsAppDefaultValueRecord>): Promise<WhatsAppDefaultValueRecord | undefined> {
    const convertedUpdates: any = { ...updates, updated_at: new Date() };
    delete convertedUpdates.id;
    delete convertedUpdates.created_at;
    const result = await db.update(dbSchema.whatsapp_default_values)
      .set(convertedUpdates)
      .where(eq(dbSchema.whatsapp_default_values.id, id))
      .returning();
    return result[0];
  }

  async deleteWhatsAppDefaultValue(id: string): Promise<boolean> {
    await db.delete(dbSchema.whatsapp_default_values).where(eq(dbSchema.whatsapp_default_values.id, id));
    return true;
  }

  // WhatsApp Message Logs
  async getWhatsAppMessageLogs(companyId: string, options?: { 
    limit?: number; 
    offset?: number;
    businessNumber?: string;
    outcome?: string;
    status?: string;
    search?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ logs: WhatsAppMessageLogRecord[]; total: number }> {
    const limitVal = options?.limit ?? 25;
    const offsetVal = options?.offset ?? 0;
    
    // Build conditions array
    const conditions: any[] = [eq(dbSchema.whatsapp_message_logs.company_id, companyId)];
    
    if (options?.businessNumber) {
      conditions.push(eq(dbSchema.whatsapp_message_logs.display_phone_number, options.businessNumber));
    }
    
    if (options?.outcome) {
      conditions.push(eq(dbSchema.whatsapp_message_logs.outcome, options.outcome));
    }
    
    if (options?.status) {
      conditions.push(eq(dbSchema.whatsapp_message_logs.status, options.status));
    }
    
    if (options?.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(dbSchema.whatsapp_message_logs.sender_name, searchPattern),
          ilike(dbSchema.whatsapp_message_logs.sender_phone, searchPattern),
          ilike(dbSchema.whatsapp_message_logs.message_text, searchPattern)
        )
      );
    }
    
    if (options?.fromDate) {
      conditions.push(gte(dbSchema.whatsapp_message_logs.processed_at, options.fromDate));
    }
    
    if (options?.toDate) {
      // Add one day to include the entire end date
      const endDate = new Date(options.toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lt(dbSchema.whatsapp_message_logs.processed_at, endDate));
    }
    
    const whereClause = and(...conditions);
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.whatsapp_message_logs)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;
    
    // Get paginated results
    const logs = await db.select()
      .from(dbSchema.whatsapp_message_logs)
      .where(whereClause)
      .orderBy(desc(dbSchema.whatsapp_message_logs.processed_at))
      .limit(limitVal)
      .offset(offsetVal);
    
    return { logs, total };
  }

  async getWhatsAppMessageLogByMessageId(companyId: string, messageId: string): Promise<WhatsAppMessageLogRecord | undefined> {
    const result = await db.select()
      .from(dbSchema.whatsapp_message_logs)
      .where(and(
        eq(dbSchema.whatsapp_message_logs.company_id, companyId),
        eq(dbSchema.whatsapp_message_logs.message_id, messageId)
      ))
      .limit(1);
    return result[0];
  }

  async createWhatsAppMessageLog(log: InsertWhatsAppMessageLogData): Promise<WhatsAppMessageLogRecord> {
    const id = randomUUID();
    const now = new Date();
    const newLog = {
      id,
      ...log,
      processed_at: log.processed_at ? new Date(log.processed_at as any) : now,
      created_at: now,
    };
    const result = await db.insert(dbSchema.whatsapp_message_logs).values(newLog).returning();
    return result[0];
  }

  async updateWhatsAppMessageLog(id: string, updates: Partial<WhatsAppMessageLogRecord>): Promise<WhatsAppMessageLogRecord | undefined> {
    const result = await db.update(dbSchema.whatsapp_message_logs)
      .set(updates)
      .where(eq(dbSchema.whatsapp_message_logs.id, id))
      .returning();
    return result[0];
  }

  async getLeadsForSheet(sheetId: string): Promise<Lead[]> {
    const result = await db.select().from(dbSchema.leads)
      .where(and(
        eq(dbSchema.leads.sheet_id, sheetId),
        isNull(dbSchema.leads.deleted_at)
      ));
    return result.map(this.mapLead);
  }
}

// Use PostgreSQL storage if DATABASE_URL is available, otherwise use in-memory
export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();
