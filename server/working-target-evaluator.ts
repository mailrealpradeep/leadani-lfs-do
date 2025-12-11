import { storage } from "./storage";
import { 
  WorkingTargetRecord, 
  WorkingTargetConfig,
  FixedTargetConfig,
  SingleColumnTargetConfig,
  CompareColumnsTargetConfig,
  Company,
} from "@shared/schema";
import { 
  getCompanyTimezone, 
  getCurrentDateInTimezone,
  getWeekRangeInTimezone,
  getMonthRangeInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getYesterdayRangeInTimezone,
  getLastWeekRangeInTimezone,
  getLastMonthRangeInTimezone
} from "./timezone-utils";
import { db } from "./db";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import * as dbSchema from "@shared/schema";

interface EvaluationResult {
  currentValue: number;
  targetValue: number;
  compliancePercentage: number;
  isAchieved: boolean;
  details: Record<string, any>;
}

export async function getPeriodBoundaries(
  companyId: string,
  periodType: string
): Promise<{ periodStart: Date; periodEnd: Date }> {
  const company = await storage.getCompany(companyId);
  const timezone = getCompanyTimezone(company as Company);
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (periodType === 'daily') {
    const now = getCurrentDateInTimezone(timezone);
    periodStart = getStartOfDayInTimezone(now, timezone);
    periodEnd = getEndOfDayInTimezone(now, timezone);
  } else if (periodType === 'weekly') {
    const range = getWeekRangeInTimezone(timezone);
    periodStart = range.start;
    periodEnd = range.end;
  } else if (periodType === 'monthly') {
    const range = getMonthRangeInTimezone(timezone);
    periodStart = range.start;
    periodEnd = range.end;
  } else {
    const now = getCurrentDateInTimezone(timezone);
    periodStart = getStartOfDayInTimezone(now, timezone);
    periodEnd = getEndOfDayInTimezone(now, timezone);
  }
  
  return { periodStart, periodEnd };
}

async function evaluateFixedTarget(
  target: WorkingTargetRecord,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EvaluationResult> {
  const config = (target.config as { type: 'fixed'; config: FixedTargetConfig }).config;
  const metric = config.metric;
  const targetValue = config.target_value;
  
  let currentValue = 0;
  const details: Record<string, any> = { metric };
  
  const userSheets = await db.select({ sheet_id: dbSchema.sheet_users.sheet_id })
    .from(dbSchema.sheet_users)
    .where(eq(dbSchema.sheet_users.user_id, userId));
  
  let sheetIds = userSheets.map(s => s.sheet_id);
  if (target.sheet_ids && target.sheet_ids.length > 0) {
    sheetIds = sheetIds.filter(id => target.sheet_ids!.includes(id));
  }
  
  if (sheetIds.length === 0) {
    return {
      currentValue: 0,
      targetValue,
      compliancePercentage: 0,
      isAchieved: false,
      details: { noAccess: true, message: "User has no access to target sheets" }
    };
  }
  
  if (metric === 'lead_updates') {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.lead_updates)
      .innerJoin(dbSchema.leads, eq(dbSchema.lead_updates.lead_id, dbSchema.leads.id))
      .where(
        and(
          eq(dbSchema.lead_updates.created_by_user_id, userId),
          inArray(dbSchema.leads.sheet_id, sheetIds),
          gte(dbSchema.lead_updates.created_at, periodStart),
          lte(dbSchema.lead_updates.created_at, periodEnd)
        )
      );
    currentValue = Number(result[0]?.count || 0);
    details.updateCount = currentValue;
  } else if (metric === 'status_transitions') {
    // Status transitions are logged in activity_logs, not lead_updates
    // We need to query activity_logs and count changes where field_key contains 'status'
    const activityLogs = await db.select({
      id: dbSchema.activity_logs.id,
      details: dbSchema.activity_logs.details,
    })
    .from(dbSchema.activity_logs)
    .where(
      and(
        eq(dbSchema.activity_logs.user_id, userId),
        eq(dbSchema.activity_logs.action, 'lead_updated'),
        inArray(dbSchema.activity_logs.sheet_id, sheetIds),
        gte(dbSchema.activity_logs.occurred_at, periodStart),
        lte(dbSchema.activity_logs.occurred_at, periodEnd)
      )
    );
    
    // Count status field changes from activity_logs details
    let transitionCount = 0;
    for (const log of activityLogs) {
      const logDetails = log.details as { changes?: Array<{ field_key: string }> } | null;
      const changes = logDetails?.changes || [];
      for (const change of changes) {
        if (change.field_key.toLowerCase().includes('status')) {
          transitionCount++;
        }
      }
    }
    
    currentValue = transitionCount;
    details.transitionCount = currentValue;
    details.activityLogsChecked = activityLogs.length;
  }
  
  const compliancePercentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
  const isAchieved = currentValue >= targetValue;
  
  return { currentValue, targetValue, compliancePercentage, isAchieved, details };
}

/**
 * Cohort-based Single Column Target Evaluation
 * 
 * For "pending state" operators like "equals" (e.g., Lead Status = New Lead):
 * - Cohort = Leads that had the target value at any point during the period
 * - Progress = How many of those leads have been attended (moved away from target value)
 * 
 * For "desired state" operators like "is_not_empty" (e.g., NFDT is_not_empty):
 * - Progress = How many leads currently match the desired condition
 */
async function evaluateSingleColumnTarget(
  target: WorkingTargetRecord,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EvaluationResult> {
  const config = (target.config as { type: 'single_column'; config: SingleColumnTargetConfig }).config;
  const { column_id, operator, value, target_percentage = 100 } = config;
  
  const userSheets = await db.select({ sheet_id: dbSchema.sheet_users.sheet_id })
    .from(dbSchema.sheet_users)
    .where(eq(dbSchema.sheet_users.user_id, userId));
  
  let sheetIds = userSheets.map(s => s.sheet_id);
  
  if (target.sheet_ids && target.sheet_ids.length > 0) {
    sheetIds = sheetIds.filter(id => target.sheet_ids!.includes(id));
  }
  
  if (sheetIds.length === 0) {
    return {
      currentValue: 0,
      targetValue: 100,
      compliancePercentage: 0,
      isAchieved: false,
      details: { noAccess: true, message: "User has no access to target sheets" }
    };
  }
  
  // Resolve column_id to column_key for matching in activity_logs
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(column_id);
  let columnKey: string = column_id;
  
  if (isUuid) {
    const column = await storage.getCustomColumnById(column_id);
    if (column) {
      columnKey = column.column_key;
    }
  }
  
  // Determine if this operator measures "pending state" (inverted) or "desired state" (normal)
  const isPendingStateOperator = operator === 'equals' || operator === 'is_empty';
  
  // Helper function to check if a value matches the operator condition
  const checkValueMatch = (fieldValue: any): boolean => {
    if (operator === 'equals') {
      return String(fieldValue || '') === String(value);
    } else if (operator === 'not_equals') {
      return String(fieldValue || '') !== String(value);
    } else if (operator === 'is_empty') {
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    } else if (operator === 'is_not_empty') {
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    } else if (operator === 'greater_than') {
      return Number(fieldValue) > Number(value);
    } else if (operator === 'less_than') {
      return Number(fieldValue) < Number(value);
    }
    return false;
  };
  
  // For pending state operators (like "Lead Status = New Lead"), use cohort-based calculation
  if (isPendingStateOperator) {
    return evaluatePendingStateCohort(
      sheetIds, columnKey, column_id, operator, value, target_percentage,
      periodStart, periodEnd, checkValueMatch
    );
  }
  
  // For desired state operators (like "NFDT is_not_empty"), use current state calculation
  // but still respect the period by looking at when changes happened
  return evaluateDesiredStateCohort(
    sheetIds, columnKey, column_id, operator, value, target_percentage,
    periodStart, periodEnd, checkValueMatch
  );
}

/**
 * Evaluate pending state cohort (e.g., "Lead Status = New Lead")
 * 
 * Calculation:
 * 1. Build cohort = leads that had target value during the period
 *    - Leads created during period with target value
 *    - Leads that existed at period start with target value
 *    - Leads that transitioned INTO target value during period
 * 2. Count attended = leads that transitioned AWAY from target value during period
 * 3. Progress = attended / cohort size
 */
async function evaluatePendingStateCohort(
  sheetIds: string[],
  columnKey: string,
  column_id: string,
  operator: string,
  value: string | number | undefined,
  target_percentage: number,
  periodStart: Date,
  periodEnd: Date,
  checkValueMatch: (fieldValue: any) => boolean
): Promise<EvaluationResult> {
  
  // Set to track all leads in the cohort (had target value at any point during period)
  const cohortLeadIds = new Set<string>();
  // Set to track leads that exited the target state during the period
  const exitedLeadIds = new Set<string>();
  // Set to track leads that are still in target state at period end
  const stillPendingLeadIds = new Set<string>();
  
  // 1. Get all leads created during the period with the target value
  const leadsCreatedDuringPeriod = await db.select()
    .from(dbSchema.leads)
    .where(
      and(
        inArray(dbSchema.leads.sheet_id, sheetIds),
        sql`${dbSchema.leads.deleted_at} IS NULL`,
        gte(dbSchema.leads.created_at, periodStart),
        lte(dbSchema.leads.created_at, periodEnd)
      )
    );
  
  for (const lead of leadsCreatedDuringPeriod) {
    const customFields = (lead.custom_fields as Record<string, any>) || {};
    const fieldValue = customFields[columnKey] ?? customFields[column_id];
    
    // Check if lead was created with the target value
    // We need to check activity_logs to see the initial value
    // For now, if current value matches, we'll use activity_logs to verify initial state
  }
  
  // 2. Get activity logs for field changes during the period
  const activityLogs = await db.select({
    id: dbSchema.activity_logs.id,
    details: dbSchema.activity_logs.details,
    occurred_at: dbSchema.activity_logs.occurred_at,
    target_id: dbSchema.activity_logs.target_id,
    action: dbSchema.activity_logs.action,
  })
  .from(dbSchema.activity_logs)
  .where(
    and(
      inArray(dbSchema.activity_logs.sheet_id, sheetIds),
      sql`${dbSchema.activity_logs.action} IN ('lead_updated', 'lead_created')`,
      gte(dbSchema.activity_logs.occurred_at, periodStart),
      lte(dbSchema.activity_logs.occurred_at, periodEnd)
    )
  );
  
  // Process activity logs to build cohort and track exits
  for (const log of activityLogs) {
    const leadId = log.target_id;
    if (!leadId) continue;
    
    if (log.action === 'lead_created') {
      // Check if lead was created with target value
      const details = log.details as { 
        lead_data?: Record<string, any>;
        custom_fields?: Record<string, any>;
      } | null;
      
      const customFields = details?.custom_fields || details?.lead_data || {};
      const fieldValue = customFields[columnKey] ?? customFields[column_id];
      
      if (checkValueMatch(fieldValue)) {
        cohortLeadIds.add(leadId);
      }
    } else if (log.action === 'lead_updated') {
      // Check for transitions in/out of target value
      const details = log.details as { 
        changes?: Array<{ field_key: string; old_value?: any; new_value?: any }> 
      } | null;
      const changes = details?.changes || [];
      
      for (const change of changes) {
        if (change.field_key.toLowerCase() === columnKey.toLowerCase()) {
          const oldVal = change.old_value;
          const newVal = change.new_value;
          
          const oldMatches = checkValueMatch(oldVal);
          const newMatches = checkValueMatch(newVal);
          
          if (oldMatches && !newMatches) {
            // Lead exited target state (attended!)
            cohortLeadIds.add(leadId);
            exitedLeadIds.add(leadId);
          } else if (!oldMatches && newMatches) {
            // Lead entered target state during period
            cohortLeadIds.add(leadId);
          }
        }
      }
    }
  }
  
  // 3. Get current state of all leads to find those still pending
  const allLeads = await db.select()
    .from(dbSchema.leads)
    .where(
      and(
        inArray(dbSchema.leads.sheet_id, sheetIds),
        sql`${dbSchema.leads.deleted_at} IS NULL`
      )
    );
  
  // Check which leads currently have the target value and were created before period end
  for (const lead of allLeads) {
    const customFields = (lead.custom_fields as Record<string, any>) || {};
    const fieldValue = customFields[columnKey] ?? customFields[column_id];
    
    if (checkValueMatch(fieldValue)) {
      // Lead currently has target value
      const createdAt = lead.created_at ? new Date(lead.created_at) : new Date(0);
      
      // If created before or during period, add to cohort
      if (createdAt <= periodEnd) {
        cohortLeadIds.add(lead.id);
        
        // If not already marked as exited, it's still pending
        if (!exitedLeadIds.has(lead.id)) {
          stillPendingLeadIds.add(lead.id);
        }
      }
    }
  }
  
  // Calculate results
  const cohortSize = cohortLeadIds.size;
  const attendedCount = exitedLeadIds.size;
  const stillPendingCount = stillPendingLeadIds.size;
  
  // If cohort is empty, treat as 100% complete (nothing to do)
  if (cohortSize === 0) {
    return {
      currentValue: 0,
      targetValue: 0,
      compliancePercentage: 100,
      isAchieved: true,
      details: {
        cohortSize: 0,
        attendedCount: 0,
        stillPendingCount: 0,
        message: "No leads in target state during this period",
        operator,
        value,
        column_key: columnKey,
        target_percentage,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      }
    };
  }
  
  // Progress = attended / cohort size
  const compliancePercentage = Math.min(100, (attendedCount / cohortSize) * 100);
  const isAchieved = compliancePercentage >= target_percentage;
  
  return {
    currentValue: attendedCount,
    targetValue: cohortSize,
    compliancePercentage,
    isAchieved,
    details: {
      cohortSize,
      attendedCount,
      stillPendingCount,
      cohortLeadIds: Array.from(cohortLeadIds).slice(0, 10),
      exitedLeadIds: Array.from(exitedLeadIds).slice(0, 10),
      stillPendingLeadIds: Array.from(stillPendingLeadIds).slice(0, 10),
      operator,
      value,
      column_id,
      column_key: columnKey,
      target_percentage,
      isPendingStateOperator: true,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    }
  };
}

/**
 * Evaluate desired state cohort (e.g., "NFDT is_not_empty")
 * For these operators, we count leads that achieved the desired state during the period
 */
async function evaluateDesiredStateCohort(
  sheetIds: string[],
  columnKey: string,
  column_id: string,
  operator: string,
  value: string | number | undefined,
  target_percentage: number,
  periodStart: Date,
  periodEnd: Date,
  checkValueMatch: (fieldValue: any) => boolean
): Promise<EvaluationResult> {
  
  // Get all leads in accessible sheets
  const allLeads = await db.select()
    .from(dbSchema.leads)
    .where(
      and(
        inArray(dbSchema.leads.sheet_id, sheetIds),
        sql`${dbSchema.leads.deleted_at} IS NULL`
      )
    );
  
  if (allLeads.length === 0) {
    return {
      currentValue: 0,
      targetValue: 0,
      compliancePercentage: 0,
      isAchieved: false,
      details: { noLeads: true, message: "No leads in accessible sheets" }
    };
  }
  
  // Count leads that transitioned into desired state during the period
  const activityLogs = await db.select({
    id: dbSchema.activity_logs.id,
    details: dbSchema.activity_logs.details,
    target_id: dbSchema.activity_logs.target_id,
  })
  .from(dbSchema.activity_logs)
  .where(
    and(
      inArray(dbSchema.activity_logs.sheet_id, sheetIds),
      eq(dbSchema.activity_logs.action, 'lead_updated'),
      gte(dbSchema.activity_logs.occurred_at, periodStart),
      lte(dbSchema.activity_logs.occurred_at, periodEnd)
    )
  );
  
  const achievedDuringPeriod = new Set<string>();
  
  for (const log of activityLogs) {
    const leadId = log.target_id;
    if (!leadId) continue;
    
    const details = log.details as { 
      changes?: Array<{ field_key: string; old_value?: any; new_value?: any }> 
    } | null;
    const changes = details?.changes || [];
    
    for (const change of changes) {
      if (change.field_key.toLowerCase() === columnKey.toLowerCase()) {
        const oldMatches = checkValueMatch(change.old_value);
        const newMatches = checkValueMatch(change.new_value);
        
        if (!oldMatches && newMatches) {
          // Lead achieved desired state during period
          achievedDuringPeriod.add(leadId);
        }
      }
    }
  }
  
  // Also count leads created during period that already have desired state
  for (const lead of allLeads) {
    const createdAt = lead.created_at ? new Date(lead.created_at) : new Date(0);
    if (createdAt >= periodStart && createdAt <= periodEnd) {
      const customFields = (lead.custom_fields as Record<string, any>) || {};
      const fieldValue = customFields[columnKey] ?? customFields[column_id];
      
      if (checkValueMatch(fieldValue)) {
        achievedDuringPeriod.add(lead.id);
      }
    }
  }
  
  const totalLeads = allLeads.length;
  const currentValue = achievedDuringPeriod.size;
  const targetValue = Math.ceil(totalLeads * target_percentage / 100);
  
  const compliancePercentage = totalLeads > 0 ? Math.min(100, (currentValue / totalLeads) * 100) : 0;
  const isAchieved = compliancePercentage >= target_percentage;
  
  return {
    currentValue,
    targetValue,
    compliancePercentage,
    isAchieved,
    details: {
      totalLeads,
      achievedDuringPeriod: currentValue,
      achievedLeadIds: Array.from(achievedDuringPeriod).slice(0, 10),
      operator,
      value,
      column_id,
      column_key: columnKey,
      target_percentage,
      isPendingStateOperator: false,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    }
  };
}

async function evaluateCompareColumnsTarget(
  target: WorkingTargetRecord,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EvaluationResult> {
  const config = (target.config as { type: 'compare_columns'; config: CompareColumnsTargetConfig }).config;
  const { column_id, from_value, to_value, result_type, target_value } = config;
  
  const fromValues: string[] = Array.isArray(from_value) ? from_value : (from_value ? [from_value] : []);
  const toValues: string[] = Array.isArray(to_value) ? to_value : (to_value ? [to_value] : []);
  
  // The config may store column_id as either a UUID or as a column_key string
  // First try to look up by ID (if it looks like a UUID), otherwise use it directly as column_key
  // Fallback: if UUID lookup fails (deleted column, cross-company), use the column_id as key anyway
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(column_id);
  let columnKey: string;
  
  if (isUuid) {
    const column = await storage.getCustomColumnById(column_id);
    if (column) {
      columnKey = column.column_key;
    } else {
      // UUID lookup failed (column deleted or cross-company) - use column_id as fallback
      // This allows legacy configs to still work by matching field_key directly
      columnKey = column_id;
    }
  } else {
    // column_id is actually the column_key (e.g., "lead_status")
    columnKey = column_id;
  }
  
  const userSheets = await db.select({ sheet_id: dbSchema.sheet_users.sheet_id })
    .from(dbSchema.sheet_users)
    .where(eq(dbSchema.sheet_users.user_id, userId));
  
  let sheetIds = userSheets.map(s => s.sheet_id);
  if (target.sheet_ids && target.sheet_ids.length > 0) {
    sheetIds = sheetIds.filter(id => target.sheet_ids!.includes(id));
  }
  
  if (sheetIds.length === 0) {
    return {
      currentValue: 0,
      targetValue: target_value,
      compliancePercentage: 0,
      isAchieved: false,
      details: { noAccess: true, message: "User has no access to target sheets" }
    };
  }
  
  // Query activity_logs for lead field changes (status transitions are logged here, not in lead_updates)
  // The activity_logs.details.changes array contains field changes with field_key, old_value, new_value
  const activityLogs = await db.select({
    id: dbSchema.activity_logs.id,
    details: dbSchema.activity_logs.details,
    occurred_at: dbSchema.activity_logs.occurred_at,
    target_id: dbSchema.activity_logs.target_id,
  })
  .from(dbSchema.activity_logs)
  .where(
    and(
      eq(dbSchema.activity_logs.user_id, userId),
      eq(dbSchema.activity_logs.action, 'lead_updated'),
      inArray(dbSchema.activity_logs.sheet_id, sheetIds),
      gte(dbSchema.activity_logs.occurred_at, periodStart),
      lte(dbSchema.activity_logs.occurred_at, periodEnd)
    )
  );
  
  let transitionCount = 0;
  const matchingActivityIds: string[] = [];
  let totalFieldChanges = 0;
  
  // Parse each activity log's details to find matching field transitions
  for (const log of activityLogs) {
    const details = log.details as { changes?: Array<{ field_key: string; old_value?: any; new_value?: any }> } | null;
    const changes = details?.changes || [];
    
    for (const change of changes) {
      // Match by column_key (case-insensitive for flexibility across companies)
      if (change.field_key.toLowerCase() === columnKey.toLowerCase()) {
        totalFieldChanges++;
        
        const oldVal = String(change.old_value || '');
        const newVal = String(change.new_value || '');
        
        // Check if this transition matches the configured from_value → to_value
        const matchesFrom = fromValues.length === 0 || fromValues.some(fv => 
          oldVal.toLowerCase().includes(fv.toLowerCase())
        );
        const matchesTo = toValues.length === 0 || toValues.some(tv => 
          newVal.toLowerCase().includes(tv.toLowerCase())
        );
        
        if (matchesFrom && matchesTo) {
          transitionCount++;
          matchingActivityIds.push(log.id);
        }
      }
    }
  }
  
  let currentValue = transitionCount;
  let compliancePercentage = 0;
  let isAchieved = false;
  
  if (result_type === 'count') {
    compliancePercentage = target_value > 0 ? Math.min(100, (transitionCount / target_value) * 100) : 0;
    isAchieved = transitionCount >= target_value;
  } else if (result_type === 'percentage') {
    compliancePercentage = totalFieldChanges > 0 ? (transitionCount / totalFieldChanges) * 100 : 0;
    currentValue = compliancePercentage;
    isAchieved = compliancePercentage >= target_value;
  }
  
  return {
    currentValue,
    targetValue: target_value,
    compliancePercentage,
    isAchieved,
    details: {
      transitionCount,
      totalActivityLogsInPeriod: activityLogs.length,
      totalFieldChangesForColumn: totalFieldChanges,
      matchingActivityIds: matchingActivityIds.slice(0, 10),
      from_values: fromValues,
      to_values: toValues,
      column_id,
      column_key: columnKey,
      result_type
    }
  };
}

export async function evaluateWorkingTarget(
  target: WorkingTargetRecord,
  userId: string
): Promise<EvaluationResult> {
  const { periodStart, periodEnd } = await getPeriodBoundaries(target.company_id, target.period_type);
  
  const targetType = target.target_type;
  
  if (targetType === 'fixed') {
    return evaluateFixedTarget(target, userId, periodStart, periodEnd);
  } else if (targetType === 'single_column') {
    return evaluateSingleColumnTarget(target, userId, periodStart, periodEnd);
  } else if (targetType === 'compare_columns') {
    return evaluateCompareColumnsTarget(target, userId, periodStart, periodEnd);
  }
  
  return {
    currentValue: 0,
    targetValue: 0,
    compliancePercentage: 0,
    isAchieved: false,
    details: { error: "Unknown target type" }
  };
}

export async function evaluateAndStoreWorkingTargetResult(
  target: WorkingTargetRecord,
  userId: string
): Promise<void> {
  const { periodStart, periodEnd } = await getPeriodBoundaries(target.company_id, target.period_type);
  const result = await evaluateWorkingTarget(target, userId);
  
  await storage.createOrUpdateWorkingTargetResult({
    working_target_id: target.id,
    user_id: userId,
    period_start: periodStart,
    period_end: periodEnd,
    current_value: result.currentValue,
    target_value: result.targetValue,
    compliance_percentage: result.compliancePercentage,
    is_achieved: result.isAchieved,
    details: result.details,
  });
}

export async function evaluateAllTargetsForUser(
  companyId: string,
  userId: string
): Promise<Array<{ target: WorkingTargetRecord; result: EvaluationResult }>> {
  const targets = await storage.getWorkingTargetsByCompany(companyId);
  const activeTargets = targets.filter(t => t.is_active);
  const results: Array<{ target: WorkingTargetRecord; result: EvaluationResult }> = [];
  
  for (const target of activeTargets) {
    try {
      const result = await evaluateWorkingTarget(target, userId);
      results.push({ target, result });
    } catch (error) {
      console.error(`Error evaluating target ${target.id} for user ${userId}:`, error);
    }
  }
  
  return results;
}

export async function evaluateAllTargetsForCompany(
  companyId: string
): Promise<void> {
  const users = await storage.getUsersByCompanyId(companyId);
  
  for (const user of users) {
    try {
      const targets = await storage.getWorkingTargetsByCompany(companyId);
      for (const target of targets.filter(t => t.is_active)) {
        await evaluateAndStoreWorkingTargetResult(target, user.id);
      }
    } catch (error) {
      console.error(`Error evaluating targets for user ${user.id}:`, error);
    }
  }
}

interface UserProgress {
  userId: string;
  userName: string;
  currentValue: number;
  targetValue: number;
  compliancePercentage: number;
  isAchieved: boolean;
}

export interface AggregateTargetProgress {
  targetId: string;
  totalCurrentValue: number;
  totalTargetValue: number;
  averageCompliancePercentage: number;
  achievedCount: number;
  totalUsers: number;
  userProgress: UserProgress[];
}

export async function evaluateTargetForAllUsers(
  target: WorkingTargetRecord,
  filterSheetId?: string
): Promise<AggregateTargetProgress> {
  let relevantUserIds: Set<string> = new Set();
  
  const targetSheetIds = target.sheet_ids && target.sheet_ids.length > 0 
    ? target.sheet_ids 
    : null;
  
  if (filterSheetId) {
    if (targetSheetIds && !targetSheetIds.includes(filterSheetId)) {
      return {
        targetId: target.id,
        totalCurrentValue: 0,
        totalTargetValue: 0,
        averageCompliancePercentage: 0,
        achievedCount: 0,
        totalUsers: 0,
        userProgress: []
      };
    }
    const sheetUsers = await storage.getSheetUsers(filterSheetId);
    sheetUsers.forEach(su => relevantUserIds.add(su.user_id));
  } else if (targetSheetIds) {
    for (const sheetId of targetSheetIds) {
      const sheetUsers = await storage.getSheetUsers(sheetId);
      sheetUsers.forEach(su => relevantUserIds.add(su.user_id));
    }
  } else {
    const companyUsers = await storage.getUsersByCompanyId(target.company_id);
    companyUsers.forEach(u => relevantUserIds.add(u.id));
  }
  
  const userProgress: UserProgress[] = [];
  let totalCurrentValue = 0;
  let totalTargetValue = 0;
  let achievedCount = 0;
  let totalCompliance = 0;
  
  const userIdArray = Array.from(relevantUserIds);
  for (const userId of userIdArray) {
    try {
      const user = await storage.getUser(userId);
      if (!user || user.role === 'company_admin' || user.role === 'super_admin') {
        continue;
      }
      
      const result = await evaluateWorkingTarget(target, userId);
      
      // Only skip users who truly have no access to target sheets
      // Users with access but no leads/updates should still show 0 progress
      if (result.details?.noAccess) {
        continue;
      }
      
      const progress: UserProgress = {
        userId,
        userName: user.name,
        currentValue: result.currentValue,
        targetValue: result.targetValue,
        compliancePercentage: result.compliancePercentage,
        isAchieved: result.isAchieved
      };
      
      userProgress.push(progress);
      totalCurrentValue += result.currentValue;
      totalTargetValue += result.targetValue;
      totalCompliance += result.compliancePercentage;
      if (result.isAchieved) achievedCount++;
    } catch (error) {
      console.error(`Error evaluating target ${target.id} for user ${userId}:`, error);
    }
  }
  
  const avgCompliance = userProgress.length > 0 
    ? totalCompliance / userProgress.length 
    : 0;
  
  userProgress.sort((a, b) => b.compliancePercentage - a.compliancePercentage);
  
  return {
    targetId: target.id,
    totalCurrentValue,
    totalTargetValue,
    averageCompliancePercentage: Math.round(avgCompliance * 100) / 100,
    achievedCount,
    totalUsers: userProgress.length,
    userProgress
  };
}

export async function evaluateAllTargetsAggregate(
  companyId: string,
  filterSheetId?: string
): Promise<Map<string, AggregateTargetProgress>> {
  const targets = await storage.getWorkingTargetsByCompany(companyId);
  const activeTargets = targets.filter(t => t.is_active);
  
  const results = new Map<string, AggregateTargetProgress>();
  
  for (const target of activeTargets) {
    try {
      const progress = await evaluateTargetForAllUsers(target, filterSheetId);
      results.set(target.id, progress);
    } catch (error) {
      console.error(`Error evaluating aggregate for target ${target.id}:`, error);
    }
  }
  
  return results;
}

// Leaderboard entry for a user across all working targets
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  rank: number;
  previousRank: number | null;
  totalTargets: number;
  achievedTargets: number;
  averageCompliance: number;
  totalCurrentValue: number;
  totalTargetValue: number;
  targetBreakdown: Array<{
    targetId: string;
    targetName: string;
    targetType: string;
    compliancePercentage: number;
    isAchieved: boolean;
    currentValue: number;
    targetValue: number;
  }>;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  dateRange: {
    start: string;
    end: string;
    preset: string;
  };
  totalUsers: number;
  totalTargets: number;
}

// Get custom date range based on preset or custom dates
export async function getCustomDateRange(
  companyId: string,
  preset: string,
  customStart?: string,
  customEnd?: string
): Promise<{ periodStart: Date; periodEnd: Date }> {
  const company = await storage.getCompany(companyId);
  const timezone = getCompanyTimezone(company as Company);
  const now = new Date();
  
  let periodStart: Date;
  let periodEnd: Date;
  
  switch (preset) {
    case 'today':
      periodStart = getStartOfDayInTimezone(now, timezone);
      periodEnd = getEndOfDayInTimezone(now, timezone);
      break;
    case 'yesterday':
      const yesterdayRange = getYesterdayRangeInTimezone(timezone);
      periodStart = yesterdayRange.start;
      periodEnd = yesterdayRange.end;
      break;
    case 'this_week':
      const weekRange = getWeekRangeInTimezone(timezone);
      periodStart = weekRange.start;
      periodEnd = weekRange.end;
      break;
    case 'last_week':
      const lastWeekRange = getLastWeekRangeInTimezone(timezone);
      periodStart = lastWeekRange.start;
      periodEnd = lastWeekRange.end;
      break;
    case 'this_month':
      const monthRange = getMonthRangeInTimezone(timezone);
      periodStart = monthRange.start;
      periodEnd = monthRange.end;
      break;
    case 'last_month':
      const lastMonthRange = getLastMonthRangeInTimezone(timezone);
      periodStart = lastMonthRange.start;
      periodEnd = lastMonthRange.end;
      break;
    case 'last_7_days':
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 6);
      periodStart = getStartOfDayInTimezone(periodStart, timezone);
      periodEnd = getEndOfDayInTimezone(now, timezone);
      break;
    case 'last_30_days':
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 29);
      periodStart = getStartOfDayInTimezone(periodStart, timezone);
      periodEnd = getEndOfDayInTimezone(now, timezone);
      break;
    case 'custom':
      if (customStart && customEnd) {
        periodStart = new Date(customStart);
        periodEnd = new Date(customEnd);
        periodEnd = getEndOfDayInTimezone(periodEnd, timezone);
      } else {
        periodStart = getStartOfDayInTimezone(now, timezone);
        periodEnd = getEndOfDayInTimezone(now, timezone);
      }
      break;
    default:
      periodStart = getStartOfDayInTimezone(now, timezone);
      periodEnd = getEndOfDayInTimezone(now, timezone);
  }
  
  return { periodStart, periodEnd };
}

// Evaluate a single target for a user with custom date range
async function evaluateTargetWithDateRange(
  target: WorkingTargetRecord,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EvaluationResult> {
  const targetType = target.target_type;
  
  if (targetType === 'fixed') {
    return evaluateFixedTarget(target, userId, periodStart, periodEnd);
  } else if (targetType === 'single_column') {
    return evaluateSingleColumnTarget(target, userId, periodStart, periodEnd);
  } else if (targetType === 'compare_columns') {
    return evaluateCompareColumnsTarget(target, userId, periodStart, periodEnd);
  }
  
  return {
    currentValue: 0,
    targetValue: 0,
    compliancePercentage: 0,
    isAchieved: false,
    details: { error: "Unknown target type" }
  };
}

// Map preset to corresponding time_type for filtering targets
function getTimeTypeForPreset(preset: string): string | null {
  switch (preset) {
    case 'today':
    case 'yesterday':
      return 'daily';
    case 'this_week':
    case 'last_week':
      return 'weekly';
    case 'this_month':
    case 'last_month':
      return 'monthly';
    default:
      return null; // No filtering for custom or legacy presets
  }
}

// Generate leaderboard for all users based on working target progress
export async function generateLeaderboard(
  companyId: string,
  preset: string = 'today',
  customStart?: string,
  customEnd?: string
): Promise<LeaderboardResult> {
  const { periodStart, periodEnd } = await getCustomDateRange(companyId, preset, customStart, customEnd);
  
  // Get all active working targets
  const targets = await storage.getWorkingTargetsByCompany(companyId);
  
  // Filter by period_type based on preset (daily/weekly/monthly targets)
  const requiredPeriodType = getTimeTypeForPreset(preset);
  const activeTargets = targets.filter(t => {
    if (!t.is_active) return false;
    // If preset maps to a specific period_type, only include matching targets
    if (requiredPeriodType && t.period_type !== requiredPeriodType) return false;
    return true;
  });
  
  // Get all company users (excluding admins from ranking)
  const companyUsers = await storage.getUsersByCompanyId(companyId);
  const regularUsers = companyUsers.filter(u => 
    u.is_active && u.role !== 'company_admin' && u.role !== 'super_admin'
  );
  
  const userScores: Map<string, {
    userId: string;
    userName: string;
    userEmail: string;
    totalCompliance: number;
    targetCount: number;
    achievedCount: number;
    totalCurrentValue: number;
    totalTargetValue: number;
    targetBreakdown: LeaderboardEntry['targetBreakdown'];
  }> = new Map();
  
  // Initialize all users
  for (const user of regularUsers) {
    userScores.set(user.id, {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      totalCompliance: 0,
      targetCount: 0,
      achievedCount: 0,
      totalCurrentValue: 0,
      totalTargetValue: 0,
      targetBreakdown: []
    });
  }
  
  // Evaluate each target for each user
  for (const target of activeTargets) {
    // Get users who have access to this target's sheets
    let targetUserIds: Set<string> = new Set();
    
    if (target.sheet_ids && target.sheet_ids.length > 0) {
      for (const sheetId of target.sheet_ids) {
        const sheetUsers = await storage.getSheetUsers(sheetId);
        sheetUsers.forEach(su => targetUserIds.add(su.user_id));
      }
    } else {
      regularUsers.forEach(u => targetUserIds.add(u.id));
    }
    
    for (const userId of Array.from(targetUserIds)) {
      const userScore = userScores.get(userId);
      if (!userScore) continue;
      
      try {
        const result = await evaluateTargetWithDateRange(target, userId, periodStart, periodEnd);
        
        if (result.details?.noAccess) continue;
        
        userScore.targetCount++;
        userScore.totalCompliance += result.compliancePercentage;
        userScore.totalCurrentValue += result.currentValue;
        userScore.totalTargetValue += result.targetValue;
        if (result.isAchieved) userScore.achievedCount++;
        
        userScore.targetBreakdown.push({
          targetId: target.id,
          targetName: target.name,
          targetType: target.target_type,
          compliancePercentage: result.compliancePercentage,
          isAchieved: result.isAchieved,
          currentValue: result.currentValue,
          targetValue: result.targetValue
        });
      } catch (error) {
        console.error(`Leaderboard: Error evaluating target ${target.id} for user ${userId}:`, error);
      }
    }
  }
  
  // Build leaderboard entries
  const entries: LeaderboardEntry[] = [];
  
  userScores.forEach((score) => {
    if (score.targetCount === 0) return; // Skip users with no targets
    
    const averageCompliance = score.targetCount > 0 
      ? Math.round((score.totalCompliance / score.targetCount) * 100) / 100
      : 0;
    
    entries.push({
      userId: score.userId,
      userName: score.userName,
      userEmail: score.userEmail,
      rank: 0, // Will be set after sorting
      previousRank: null, // Could be fetched from historical data
      totalTargets: score.targetCount,
      achievedTargets: score.achievedCount,
      averageCompliance,
      totalCurrentValue: score.totalCurrentValue,
      totalTargetValue: score.totalTargetValue,
      targetBreakdown: score.targetBreakdown.sort((a, b) => b.compliancePercentage - a.compliancePercentage)
    });
  });
  
  // Sort by average compliance (descending), then by achieved targets (descending)
  entries.sort((a, b) => {
    if (b.averageCompliance !== a.averageCompliance) {
      return b.averageCompliance - a.averageCompliance;
    }
    return b.achievedTargets - a.achievedTargets;
  });
  
  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return {
    entries,
    dateRange: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      preset
    },
    totalUsers: entries.length,
    totalTargets: activeTargets.length
  };
}
