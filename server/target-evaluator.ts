import { storage } from './storage';
import { 
  getCompanyTimezone, 
  getCurrentDateInTimezone, 
  getWeekRangeInTimezone,
  getMonthRangeInTimezone 
} from './timezone-utils';
import type { 
  TargetRecord, 
  TargetGoalRecord,
  TargetCondition, 
  TargetGoalConfig,
  RatioConfig,
  RatioNumeratorConfig,
  RatioDenominatorConfig,
  Lead,
  LeadUpdate
} from '@shared/schema';

// Condition evaluation functions
export function evaluateCondition(condition: TargetCondition, leadValue: any): boolean {
  const { operator, value, value2 } = condition;
  
  // Handle null/undefined values - be strict about empty value semantics
  const isNullOrEmpty = leadValue === null || leadValue === undefined || leadValue === '';
  
  // For is_empty operator, null/undefined/empty string should return true
  if (operator === 'is_empty') {
    return isNullOrEmpty;
  }
  
  // For is_not_empty operator, only non-empty values return true
  if (operator === 'is_not_empty') {
    return !isNullOrEmpty && String(leadValue).trim() !== '';
  }
  
  // For all other operators, if the lead value is null/empty, the condition fails
  // (except for specific operators that should handle empty differently)
  // This prevents false positives when fields are missing
  if (isNullOrEmpty) {
    // For not_equals: empty field does NOT automatically match "not equals something"
    // The user should use is_empty if they want to match empty fields
    // For equals with empty condition value: check if condition is looking for empty
    if (operator === 'equals' && (value === null || value === undefined || value === '')) {
      return true; // equals "" matches empty/null
    }
    if (operator === 'not_equals' && (value === null || value === undefined || value === '')) {
      return false; // not_equals "" fails on empty/null
    }
    // For in/not_in operators with empty value
    if (operator === 'in' || operator === 'not_in') {
      return false; // Empty values don't match lists
    }
    // Default: empty values don't satisfy most conditions
    return false;
  }

  // Handle array leadValue (multi-select dropdowns) specially
  // Arrays should check if any element matches the condition
  if (Array.isArray(leadValue)) {
    // Normalize condition values - could be a single value, array, or comma-separated string
    let condValues: string[];
    if (Array.isArray(value)) {
      condValues = value.map(v => String(v).toLowerCase().trim());
    } else if (value !== null && value !== undefined) {
      const valStr = String(value).toLowerCase().trim();
      condValues = valStr.includes(',') ? valStr.split(',').map(v => v.trim()) : [valStr];
    } else {
      condValues = [];
    }
    
    const leadValues = leadValue.map(v => String(v).toLowerCase().trim());
    
    switch (operator) {
      case 'equals':
        // For arrays, equals checks if any condition value is in the selected values
        return condValues.length > 0 && condValues.some(cv => leadValues.includes(cv));
      case 'not_equals':
        // For arrays, not_equals checks if NONE of the condition values are in the selected values
        return condValues.length === 0 || condValues.every(cv => !leadValues.includes(cv));
      case 'contains':
        // For arrays, contains checks if any lead element contains any condition value
        return condValues.some(cv => leadValues.some(lv => lv.includes(cv)));
      case 'not_contains':
        return !condValues.some(cv => leadValues.some(lv => lv.includes(cv)));
      case 'in':
        // For arrays, in checks if any lead value is in the condition values
        return leadValues.some(v => condValues.includes(v));
      case 'not_in':
        // For arrays, not_in checks if none of the lead values are in the condition values
        return !leadValues.some(v => condValues.includes(v));
      default:
        // For other operators on arrays, join and treat as string
        return evaluateCondition({ ...condition }, leadValue.join(', '));
    }
  }

  const strValue = String(leadValue).toLowerCase().trim();
  const condValue = value !== null && value !== undefined ? String(value).toLowerCase().trim() : '';
  
  switch (operator) {
    // Text operators
    case 'equals':
      return strValue === condValue;
    case 'not_equals':
      return strValue !== condValue;
    case 'contains':
      return strValue.includes(condValue);
    case 'not_contains':
      return !strValue.includes(condValue);
    case 'starts_with':
      return strValue.startsWith(condValue);
    case 'ends_with':
      return strValue.endsWith(condValue);
    // Note: is_empty and is_not_empty are handled before the switch statement
    case 'in':
      if (Array.isArray(value)) {
        return value.map(v => String(v).toLowerCase().trim()).includes(strValue);
      }
      return condValue.split(',').map(v => v.trim()).includes(strValue);
    case 'not_in':
      if (Array.isArray(value)) {
        return !value.map(v => String(v).toLowerCase().trim()).includes(strValue);
      }
      return !condValue.split(',').map(v => v.trim()).includes(strValue);
    
    // Number operators (with date fallback for NFDT compliance)
    case 'greater_than': {
      // Try date comparison first for date fields
      const dateA = new Date(leadValue);
      const dateB = new Date(value as string);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() > dateB.getTime();
      }
      // Fall back to numeric comparison
      const numA = parseFloat(String(leadValue));
      const numB = parseFloat(condValue);
      if (isNaN(numA) || isNaN(numB)) return false;
      return numA > numB;
    }
    case 'less_than': {
      // Try date comparison first for date fields
      const dateA = new Date(leadValue);
      const dateB = new Date(value as string);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() < dateB.getTime();
      }
      // Fall back to numeric comparison
      const numA = parseFloat(String(leadValue));
      const numB = parseFloat(condValue);
      if (isNaN(numA) || isNaN(numB)) return false;
      return numA < numB;
    }
    case 'greater_equal': {
      // Try date comparison first for date fields
      const dateA = new Date(leadValue);
      const dateB = new Date(value as string);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() >= dateB.getTime();
      }
      // Fall back to numeric comparison
      return parseFloat(String(leadValue)) >= parseFloat(condValue);
    }
    case 'less_equal': {
      // Try date comparison first for date fields
      const dateA = new Date(leadValue);
      const dateB = new Date(value as string);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() <= dateB.getTime();
      }
      // Fall back to numeric comparison
      return parseFloat(String(leadValue)) <= parseFloat(condValue);
    }
    case 'between': {
      const numVal = parseFloat(String(leadValue));
      const minVal = parseFloat(condValue);
      const maxVal = parseFloat(String(value2));
      return numVal >= minVal && numVal <= maxVal;
    }
    
    // Date operators
    case 'date_equals':
    case 'date_before':
    case 'date_after':
    case 'date_between':
    case 'is_today':
    case 'is_before_today':
    case 'is_after_today':
    case 'is_this_week':
    case 'is_this_month':
    case 'is_overdue':
    case 'within_days':
    case 'days_ago':
      return evaluateDateCondition(operator, leadValue, value, value2);
    
    default:
      return false;
  }
}

function evaluateDateCondition(
  operator: string, 
  leadValue: any, 
  value: any, 
  value2: any
): boolean {
  let leadDate: Date;
  
  try {
    leadDate = new Date(leadValue);
    if (isNaN(leadDate.getTime())) return false;
  } catch {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const leadDateNorm = new Date(leadDate);
  leadDateNorm.setHours(0, 0, 0, 0);
  
  switch (operator) {
    case 'date_equals':
      const compareDate = new Date(value);
      compareDate.setHours(0, 0, 0, 0);
      return leadDateNorm.getTime() === compareDate.getTime();
    
    case 'date_before':
      const beforeDate = new Date(value);
      beforeDate.setHours(0, 0, 0, 0);
      return leadDateNorm.getTime() < beforeDate.getTime();
    
    case 'date_after':
      const afterDate = new Date(value);
      afterDate.setHours(0, 0, 0, 0);
      return leadDateNorm.getTime() > afterDate.getTime();
    
    case 'date_between':
      const startDate = new Date(value);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(value2);
      endDate.setHours(23, 59, 59, 999);
      return leadDateNorm.getTime() >= startDate.getTime() && leadDateNorm.getTime() <= endDate.getTime();
    
    case 'is_today':
      return leadDateNorm.getTime() === today.getTime();
    
    case 'is_before_today':
      return leadDateNorm.getTime() < today.getTime();
    
    case 'is_after_today':
      return leadDateNorm.getTime() > today.getTime();
    
    case 'is_this_week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return leadDateNorm.getTime() >= weekStart.getTime() && leadDateNorm.getTime() <= weekEnd.getTime();
    
    case 'is_this_month':
      return leadDateNorm.getMonth() === today.getMonth() && 
             leadDateNorm.getFullYear() === today.getFullYear();
    
    case 'is_overdue':
      return leadDateNorm.getTime() < today.getTime();
    
    case 'within_days':
      const daysAhead = parseInt(String(value));
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + daysAhead);
      return leadDateNorm.getTime() >= today.getTime() && leadDateNorm.getTime() <= futureDate.getTime();
    
    case 'days_ago':
      const daysBack = parseInt(String(value));
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - daysBack);
      return leadDateNorm.getTime() === pastDate.getTime();
    
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: TargetCondition[], 
  lead: Lead, 
  logicalOperator: 'and' | 'or'
): boolean {
  if (conditions.length === 0) return true;
  
  const results = conditions.map(condition => {
    const columnKey = condition.column_key;
    let leadValue: any;
    
    // Get value from lead - check both fixed fields and custom_fields
    if (columnKey in lead) {
      leadValue = (lead as any)[columnKey];
    } else if (lead.custom_fields && columnKey in lead.custom_fields) {
      leadValue = lead.custom_fields[columnKey];
    } else {
      leadValue = null;
    }
    
    return evaluateCondition(condition, leadValue);
  });
  
  if (logicalOperator === 'and') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

// Get value from a lead's field
function getLeadFieldValue(lead: Lead, columnKey: string): any {
  if (columnKey in lead) {
    return (lead as any)[columnKey];
  }
  if (lead.custom_fields && columnKey in lead.custom_fields) {
    return lead.custom_fields[columnKey];
  }
  return null;
}

// Process special values in conditions (like "now" for date comparisons)
function processConditionValue(condition: TargetCondition): TargetCondition {
  if (condition.value === 'now') {
    return {
      ...condition,
      value: new Date().toISOString(),
    };
  }
  return condition;
}

// Calculate numerator or denominator value for ratio-based goals
function calculateRatioValue(
  leads: Lead[],
  config: RatioNumeratorConfig | RatioDenominatorConfig,
  allLeads: Lead[] // For total_scope mode
): number {
  // Check if this is a denominator config with total_scope mode
  const isDenominator = 'mode' in config;
  if (isDenominator && (config as RatioDenominatorConfig).mode === 'total_scope') {
    // Total leads in scope - support aggregation for total_scope
    if (config.aggregation === 'sum' && config.column_key) {
      return allLeads.reduce((sum, lead) => {
        const val = getLeadFieldValue(lead, config.column_key!);
        return sum + (parseFloat(String(val)) || 0);
      }, 0);
    }
    return allLeads.length;
  }

  // Filter leads by conditions - process special values
  const conditions = config.conditions || [];
  const processedConditions = conditions.map(c => processConditionValue(c as TargetCondition));
  const logicalOp = config.logical_operator || 'and';
  const filteredLeads = processedConditions.length > 0
    ? leads.filter(lead => evaluateConditions(processedConditions, lead, logicalOp))
    : leads;

  // Calculate based on aggregation type
  if (config.aggregation === 'sum' && config.column_key) {
    return filteredLeads.reduce((sum, lead) => {
      const val = getLeadFieldValue(lead, config.column_key!);
      return sum + (parseFloat(String(val)) || 0);
    }, 0);
  }

  // Default to count
  return filteredLeads.length;
}

// Calculate ratio-based goal progress
function calculateRatioGoalProgress(
  leads: Lead[],
  ratioConfig: RatioConfig
): number {
  const numeratorValue = calculateRatioValue(leads, ratioConfig.numerator, leads);
  const denominatorValue = calculateRatioValue(leads, ratioConfig.denominator, leads);

  // Prevent division by zero
  if (denominatorValue === 0) {
    return 0;
  }

  // For average type, the result is the raw ratio (not percentage)
  if (ratioConfig.display_variant === 'average') {
    return numeratorValue / denominatorValue;
  }

  // For percentage, conversion, and compliance, return percentage value
  return (numeratorValue / denominatorValue) * 100;
}

// Calculate progress for a single goal
export async function calculateGoalProgress(
  goal: TargetGoalRecord,
  userId: string,
  target: TargetRecord,
  periodStart: Date,
  periodEnd: Date
): Promise<{ currentValue: number; targetValue: number; isAchieved: boolean }> {
  const config = goal.config as TargetGoalConfig;
  const targetValue = config.target_value;
  
  // Get leads based on target scope
  let leads: Lead[] = [];
  
  if (target.scope_type === 'company_wide') {
    const sheets = await storage.getSheetsByCompanyId(target.company_id);
    for (const sheet of sheets) {
      const sheetLeads = await storage.getLeadsBySheetId(sheet.id);
      leads.push(...sheetLeads);
    }
  } else if (target.scope_sheet_ids && target.scope_sheet_ids.length > 0) {
    for (const sheetId of target.scope_sheet_ids) {
      const sheetLeads = await storage.getLeadsBySheetId(sheetId);
      leads.push(...sheetLeads);
    }
  }
  
  // Filter leads by user if individual target
  if (target.assignment_type === 'individual' || target.assignment_type === 'all_users') {
    leads = leads.filter(lead => lead.owner_user_id === userId);
  }
  
  // Filter by period (created within period)
  leads = leads.filter(lead => {
    if (!lead.created_at) return false;
    const createdAt = new Date(lead.created_at);
    return createdAt >= periodStart && createdAt <= periodEnd;
  });
  
  let currentValue = 0;
  
  switch (config.goal_type) {
    case 'count':
      // Count leads matching conditions
      currentValue = leads.filter(lead => 
        evaluateConditions(config.conditions, lead, config.logical_operator)
      ).length;
      break;
    
    case 'sum':
      // Sum of a numeric column
      if (config.column_key) {
        currentValue = leads
          .filter(lead => evaluateConditions(config.conditions, lead, config.logical_operator))
          .reduce((sum, lead) => {
            const val = getLeadFieldValue(lead, config.column_key!);
            return sum + (parseFloat(String(val)) || 0);
          }, 0);
      }
      break;
    
    case 'average':
      // Average of a numeric column - use ratio_config if available
      if (config.ratio_config) {
        currentValue = calculateRatioGoalProgress(leads, config.ratio_config);
      } else if (config.column_key) {
        // Legacy fallback
        const matchingLeads = leads.filter(lead => 
          evaluateConditions(config.conditions, lead, config.logical_operator)
        );
        if (matchingLeads.length > 0) {
          const total = matchingLeads.reduce((sum, lead) => {
            const val = getLeadFieldValue(lead, config.column_key!);
            return sum + (parseFloat(String(val)) || 0);
          }, 0);
          currentValue = total / matchingLeads.length;
        }
      }
      break;
    
    case 'percentage':
      // Percentage of leads matching numerator vs denominator - use ratio_config if available
      if (config.ratio_config) {
        currentValue = calculateRatioGoalProgress(leads, config.ratio_config);
      } else if (config.numerator_conditions && config.denominator_conditions) {
        // Legacy fallback
        const denominator = leads.filter(lead => 
          evaluateConditions(config.denominator_conditions!, lead, config.logical_operator)
        ).length;
        
        const numerator = leads.filter(lead => 
          evaluateConditions(config.numerator_conditions!, lead, config.logical_operator)
        ).length;
        
        if (denominator > 0) {
          currentValue = (numerator / denominator) * 100;
        }
      }
      break;
    
    case 'updates':
      // Count lead updates within the period
      let totalUpdates = 0;
      for (const lead of leads) {
        const updates = await storage.getLeadUpdates(lead.id);
        const periodUpdates = updates.filter(update => {
          const createdAt = new Date(update.created_at);
          return createdAt >= periodStart && createdAt <= periodEnd;
        });
        totalUpdates += periodUpdates.length;
      }
      currentValue = totalUpdates;
      break;
    
    case 'conversion':
      // Conversion rate from one status to another - use ratio_config if available
      if (config.ratio_config) {
        currentValue = calculateRatioGoalProgress(leads, config.ratio_config);
      } else if (config.numerator_conditions && config.denominator_conditions) {
        // Legacy fallback
        const startLeads = leads.filter(lead => 
          evaluateConditions(config.denominator_conditions!, lead, config.logical_operator)
        );
        
        const convertedLeads = leads.filter(lead => 
          evaluateConditions(config.numerator_conditions!, lead, config.logical_operator)
        );
        
        if (startLeads.length > 0) {
          currentValue = (convertedLeads.length / startLeads.length) * 100;
        }
      }
      break;
    
    case 'compliance':
      // NFDT compliance rate - use ratio_config if available
      if (config.ratio_config) {
        currentValue = calculateRatioGoalProgress(leads, config.ratio_config);
      } else {
        // Legacy fallback
        const leadsWithNFDT = leads.filter(lead => {
          const nfdt = getLeadFieldValue(lead, 'next_follow_up_date_time');
          if (!nfdt) return false;
          const nfdtDate = new Date(nfdt);
          return nfdtDate <= periodEnd;
        });
        
        const compliantLeads = leadsWithNFDT.filter(lead => {
          const nfdt = getLeadFieldValue(lead, 'next_follow_up_date_time');
          const nfdtDate = new Date(nfdt);
          const now = new Date();
          // Lead is compliant if NFDT is in the future or there's a recent update
          return nfdtDate >= now;
        });
        
        if (leadsWithNFDT.length > 0) {
          currentValue = (compliantLeads.length / leadsWithNFDT.length) * 100;
        }
      }
      break;
    
    default:
      currentValue = 0;
  }
  
  return {
    currentValue,
    targetValue,
    isAchieved: currentValue >= targetValue,
  };
}

// Get period dates based on target time type (uses company timezone)
export function getCurrentPeriod(target: TargetRecord, timezone: string = 'Asia/Kolkata'): { start: Date; end: Date } {
  if (target.time_type === 'one_time') {
    return {
      start: new Date(target.start_date),
      end: new Date(target.end_date!),
    };
  }
  
  // Recurring targets - use company timezone
  switch (target.recurring_frequency) {
    case 'daily':
      const today = getCurrentDateInTimezone(timezone);
      const dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);
      return { start: today, end: dayEnd };
    
    case 'weekly':
      const weekRange = getWeekRangeInTimezone(timezone);
      return weekRange;
    
    case 'monthly':
      const monthRange = getMonthRangeInTimezone(timezone);
      return monthRange;
    
    default:
      const defaultToday = getCurrentDateInTimezone(timezone);
      return { start: defaultToday, end: new Date() };
  }
}

// Calculate and update progress for all goals of a target for a user
export async function calculateUserTargetProgress(
  targetId: string,
  userId: string
): Promise<{
  target: TargetRecord;
  goals: { goalId: string; goalName: string; currentValue: number; targetValue: number; percentage: number; isAchieved: boolean }[];
  overallPercentage: number;
  isFullyAchieved: boolean;
}> {
  const target = await storage.getTarget(targetId);
  if (!target) throw new Error('Target not found');
  
  const company = await storage.getCompany(target.company_id);
  const timezone = getCompanyTimezone(company);
  
  const goals = await storage.getTargetGoals(targetId);
  const period = getCurrentPeriod(target, timezone);
  
  const goalProgress: { goalId: string; goalName: string; currentValue: number; targetValue: number; percentage: number; isAchieved: boolean }[] = [];
  
  for (const goal of goals) {
    const progress = await calculateGoalProgress(goal, userId, target, period.start, period.end);
    
    const percentage = progress.targetValue > 0 
      ? Math.round((progress.currentValue / progress.targetValue) * 100) 
      : 0;
    
    goalProgress.push({
      goalId: goal.id,
      goalName: goal.name,
      currentValue: progress.currentValue,
      targetValue: progress.targetValue,
      percentage,
      isAchieved: progress.isAchieved,
    });
    
    // Upsert progress record
    await storage.upsertTargetUserProgress({
      target_id: targetId,
      goal_id: goal.id,
      user_id: userId,
      period_start: period.start,
      period_end: period.end,
      current_value: progress.currentValue,
      target_value: progress.targetValue,
      is_achieved: progress.isAchieved,
      achieved_at: progress.isAchieved ? new Date() : null,
      streak_count: 0, // Will be calculated separately for recurring
      last_calculated_at: new Date(),
    });
  }
  
  const overallPercentage = goalProgress.length > 0
    ? Math.round(goalProgress.reduce((sum, g) => sum + g.percentage, 0) / goalProgress.length)
    : 0;
  
  const isFullyAchieved = goalProgress.every(g => g.isAchieved);
  
  return {
    target,
    goals: goalProgress,
    overallPercentage,
    isFullyAchieved,
  };
}

// Recalculate progress for all users assigned to a target
export async function recalculateTargetProgress(targetId: string): Promise<void> {
  const target = await storage.getTarget(targetId);
  if (!target) return;
  
  if (target.assignment_type === 'all_users') {
    const users = await storage.getUsersByCompanyId(target.company_id);
    for (const user of users.filter(u => u.is_active)) {
      await calculateUserTargetProgress(targetId, user.id);
    }
  } else {
    const assignments = await storage.getTargetUserAssignments(targetId);
    for (const assignment of assignments) {
      await calculateUserTargetProgress(targetId, assignment.user_id);
    }
  }
}

// Check if today is a company holiday
export async function isHoliday(companyId: string, date: Date = new Date()): Promise<boolean> {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(checkDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const holidays = await storage.getCompanyHolidays(companyId, checkDate, nextDay);
  return holidays.length > 0;
}

// Check milestone notifications
export async function checkAndCreateMilestoneNotifications(
  targetId: string,
  userId: string,
  previousPercentage: number,
  currentPercentage: number
): Promise<void> {
  const target = await storage.getTarget(targetId);
  if (!target) return;
  
  const milestones = target.notification_milestones || [20, 40, 60, 80, 100];
  
  for (const milestone of milestones) {
    if (previousPercentage < milestone && currentPercentage >= milestone) {
      await storage.createTargetNotification({
        company_id: target.company_id,
        target_id: targetId,
        user_id: userId,
        notification_type: 'milestone',
        milestone_percentage: milestone,
        message: `You've reached ${milestone}% of your target "${target.name}"!`,
      });
    }
  }
}
