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
  getEndOfDayInTimezone
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
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dbSchema.lead_updates)
      .innerJoin(dbSchema.leads, eq(dbSchema.lead_updates.lead_id, dbSchema.leads.id))
      .where(
        and(
          eq(dbSchema.lead_updates.created_by_user_id, userId),
          inArray(dbSchema.leads.sheet_id, sheetIds),
          sql`${dbSchema.lead_updates.update_on} ILIKE '%status%'`,
          gte(dbSchema.lead_updates.created_at, periodStart),
          lte(dbSchema.lead_updates.created_at, periodEnd)
        )
      );
    currentValue = Number(result[0]?.count || 0);
    details.transitionCount = currentValue;
  }
  
  const compliancePercentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
  const isAchieved = currentValue >= targetValue;
  
  return { currentValue, targetValue, compliancePercentage, isAchieved, details };
}

async function evaluateSingleColumnTarget(
  target: WorkingTargetRecord,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EvaluationResult> {
  const config = (target.config as { type: 'single_column'; config: SingleColumnTargetConfig }).config;
  const { column_id, operator, value } = config;
  
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
  
  const allLeads = await db.select()
    .from(dbSchema.leads)
    .where(
      and(
        inArray(dbSchema.leads.sheet_id, sheetIds),
        sql`${dbSchema.leads.deleted_at} IS NULL`
      )
    );
  
  const totalLeads = allLeads.length;
  let matchingLeads = 0;
  const nonCompliantLeadIds: string[] = [];
  
  for (const lead of allLeads) {
    const customFields = (lead.custom_fields as Record<string, any>) || {};
    const fieldValue = customFields[column_id];
    
    let matches = false;
    
    if (operator === 'equals') {
      matches = String(fieldValue || '') === String(value);
    } else if (operator === 'not_equals') {
      matches = String(fieldValue || '') !== String(value);
    } else if (operator === 'is_empty') {
      matches = fieldValue === null || fieldValue === undefined || fieldValue === '';
    } else if (operator === 'is_not_empty') {
      matches = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    } else if (operator === 'greater_than') {
      matches = Number(fieldValue) > Number(value);
    } else if (operator === 'less_than') {
      matches = Number(fieldValue) < Number(value);
    }
    
    if (matches) {
      matchingLeads++;
    } else {
      nonCompliantLeadIds.push(lead.id);
    }
  }
  
  const compliancePercentage = totalLeads > 0 ? (matchingLeads / totalLeads) * 100 : 0;
  const isAchieved = compliancePercentage >= 100;
  
  return {
    currentValue: matchingLeads,
    targetValue: totalLeads,
    compliancePercentage,
    isAchieved,
    details: {
      totalLeads,
      matchingLeads,
      nonCompliantCount: totalLeads - matchingLeads,
      nonCompliantLeadIds: nonCompliantLeadIds.slice(0, 10),
      operator,
      value,
      column_id
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
  
  const updates = await db.select({
    id: dbSchema.lead_updates.id,
    lead_id: dbSchema.lead_updates.lead_id,
    update_on: dbSchema.lead_updates.update_on,
    remark: dbSchema.lead_updates.remark,
    created_at: dbSchema.lead_updates.created_at,
  })
  .from(dbSchema.lead_updates)
  .innerJoin(dbSchema.leads, eq(dbSchema.lead_updates.lead_id, dbSchema.leads.id))
  .where(
    and(
      eq(dbSchema.lead_updates.created_by_user_id, userId),
      inArray(dbSchema.leads.sheet_id, sheetIds),
      eq(dbSchema.lead_updates.update_on, column_id),
      gte(dbSchema.lead_updates.created_at, periodStart),
      lte(dbSchema.lead_updates.created_at, periodEnd)
    )
  );
  
  let transitionCount = 0;
  const matchingUpdates: string[] = [];
  
  for (const update of updates) {
    const remark = update.remark || '';
    if (remark.includes(`${from_value}`) && remark.includes(`${to_value}`)) {
      transitionCount++;
      matchingUpdates.push(update.id);
    }
  }
  
  let currentValue = transitionCount;
  let compliancePercentage = 0;
  let isAchieved = false;
  
  if (result_type === 'count') {
    compliancePercentage = target_value > 0 ? Math.min(100, (transitionCount / target_value) * 100) : 0;
    isAchieved = transitionCount >= target_value;
  } else if (result_type === 'percentage') {
    const totalUpdates = updates.length;
    compliancePercentage = totalUpdates > 0 ? (transitionCount / totalUpdates) * 100 : 0;
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
      totalUpdatesInPeriod: updates.length,
      matchingUpdateIds: matchingUpdates.slice(0, 10),
      from_value,
      to_value,
      column_id,
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
