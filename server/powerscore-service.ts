import { storage } from "./storage";
import type { PowerScoreRule, PowerScoreActionType } from "@shared/schema";
import { format, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface ScoringContext {
  userId: string;
  companyId: string;
  companyTimezone: string;
  leadId?: string;
  sheetId?: string;
}

interface DropdownChange {
  columnKey: string;
  oldValue: string | null;
  newValue: string | null;
}

export async function awardLeadUpdatePoints(
  context: ScoringContext,
  changes: DropdownChange[]
): Promise<{ awarded: number; pending: number }> {
  // Admin accounts don't participate in PowerScore
  const user = await storage.getUser(context.userId);
  if (!user || user.role === 'super_admin' || user.role === 'company_admin') {
    return { awarded: 0, pending: 0 };
  }

  let totalAwarded = 0;
  let totalPending = 0;

  const rules = await storage.getPowerScoreRules(context.companyId);
  if (rules.length === 0) return { awarded: 0, pending: 0 };

  const today = getScoreDate(context.companyTimezone);

  for (const rule of rules) {
    if (!rule.is_enabled) continue;

    if (rule.action_type === "lead_update") {
      const result = await processLeadUpdateRule(context, rule, today);
      totalAwarded += result.awarded;
      totalPending += result.pending;
    }

    if (rule.action_type === "dropdown_change" && changes.length > 0) {
      const result = await processDropdownChangeRule(context, rule, changes, today);
      totalAwarded += result.awarded;
      totalPending += result.pending;
    }
  }

  return { awarded: totalAwarded, pending: totalPending };
}

async function processLeadUpdateRule(
  context: ScoringContext,
  rule: PowerScoreRule,
  scoreDate: string
): Promise<{ awarded: number; pending: number }> {
  const { pointsAwarded, hasPending } = await getDailyPointsAndPending(context.userId, rule.id, scoreDate);
  
  // Check daily cap - ensure adding this award won't exceed the cap
  if (rule.daily_cap && pointsAwarded + rule.points > rule.daily_cap) {
    return { awarded: 0, pending: 0 };
  }

  if (rule.requires_approval) {
    // If already has pending approval for this rule today, skip to prevent duplicates
    if (hasPending) {
      return { awarded: 0, pending: 0 };
    }
    await storage.createPowerScorePendingApproval({
      company_id: context.companyId,
      user_id: context.userId,
      rule_id: rule.id,
      action_type: rule.action_type,
      points: rule.points,
      lead_id: context.leadId || null,
      description: `Lead update`,
      score_date: scoreDate,
    });
    return { awarded: 0, pending: rule.points };
  }

  await storage.createPowerScoreTransaction({
    company_id: context.companyId,
    user_id: context.userId,
    rule_id: rule.id,
    action_type: rule.action_type,
    points: rule.points,
    lead_id: context.leadId || null,
    description: `Lead update`,
    score_date: scoreDate,
    approval_id: null,
    is_approved: null,
  });

  return { awarded: rule.points, pending: 0 };
}

async function processDropdownChangeRule(
  context: ScoringContext,
  rule: PowerScoreRule,
  changes: DropdownChange[],
  scoreDate: string
): Promise<{ awarded: number; pending: number }> {
  const config = rule.config as {
    column_key?: string;
    from_values?: string[];
    to_values?: string[];
  };

  if (!config.column_key || !config.to_values || config.to_values.length === 0) {
    return { awarded: 0, pending: 0 };
  }

  const matchingChange = changes.find(change => {
    if (change.columnKey !== config.column_key) return false;
    if (!change.newValue) return false;
    
    const toMatch = config.to_values!.includes(change.newValue);
    if (!toMatch) return false;
    
    if (config.from_values && config.from_values.length > 0) {
      if (!change.oldValue) return false;
      return config.from_values.includes(change.oldValue);
    }
    
    return true;
  });

  if (!matchingChange) return { awarded: 0, pending: 0 };

  const { pointsAwarded, hasPending } = await getDailyPointsAndPending(context.userId, rule.id, scoreDate);
  
  // Check daily cap - ensure adding this award won't exceed the cap
  if (rule.daily_cap && pointsAwarded + rule.points > rule.daily_cap) {
    return { awarded: 0, pending: 0 };
  }

  const description = `${config.column_key}: ${matchingChange.oldValue || 'any'} → ${matchingChange.newValue}`;

  if (rule.requires_approval) {
    // If already has pending approval for this rule today, skip to prevent duplicates
    if (hasPending) {
      return { awarded: 0, pending: 0 };
    }
    await storage.createPowerScorePendingApproval({
      company_id: context.companyId,
      user_id: context.userId,
      rule_id: rule.id,
      action_type: rule.action_type,
      points: rule.points,
      lead_id: context.leadId || null,
      description,
      score_date: scoreDate,
    });
    return { awarded: 0, pending: rule.points };
  }

  await storage.createPowerScoreTransaction({
    company_id: context.companyId,
    user_id: context.userId,
    rule_id: rule.id,
    action_type: rule.action_type,
    points: rule.points,
    lead_id: context.leadId || null,
    description,
    score_date: scoreDate,
    approval_id: null,
    is_approved: null,
  });

  return { awarded: rule.points, pending: 0 };
}

export async function awardLoginBonus(
  userId: string,
  companyId: string,
  companyTimezone: string
): Promise<{ awarded: number; pending: number }> {
  // Admin accounts don't participate in PowerScore
  const user = await storage.getUser(userId);
  if (!user || user.role === 'super_admin' || user.role === 'company_admin') {
    return { awarded: 0, pending: 0 };
  }

  const rules = await storage.getPowerScoreRules(companyId);
  const loginRule = rules.find(r => r.action_type === "login" && r.is_enabled);
  
  if (!loginRule) return { awarded: 0, pending: 0 };

  const scoreDate = getScoreDate(companyTimezone);

  // Check both transactions and pending approvals for idempotency
  const { pointsAwarded, hasPending } = await getDailyPointsAndPending(userId, loginRule.id, scoreDate);
  
  // Already has points or pending approval for today - skip
  if (pointsAwarded > 0 || hasPending) {
    return { awarded: 0, pending: 0 };
  }

  if (loginRule.requires_approval) {
    await storage.createPowerScorePendingApproval({
      company_id: companyId,
      user_id: userId,
      rule_id: loginRule.id,
      action_type: loginRule.action_type,
      points: loginRule.points,
      lead_id: null,
      description: "Login bonus",
      score_date: scoreDate,
    });
    return { awarded: 0, pending: loginRule.points };
  }

  await storage.createPowerScoreTransaction({
    company_id: companyId,
    user_id: userId,
    rule_id: loginRule.id,
    action_type: loginRule.action_type,
    points: loginRule.points,
    lead_id: null,
    description: "Login bonus",
    score_date: scoreDate,
    approval_id: null,
    is_approved: null,
  });

  return { awarded: loginRule.points, pending: 0 };
}

async function getDailyPointsAndPending(userId: string, ruleId: string, scoreDate: string): Promise<{ pointsAwarded: number; hasPending: boolean }> {
  const [transactions, pendingApprovals] = await Promise.all([
    storage.getPowerScoreTransactionsByRuleAndDate(userId, ruleId, scoreDate),
    storage.getPendingApprovalsByRuleAndDate(userId, ruleId, scoreDate),
  ]);
  
  const pointsAwarded = transactions.reduce((sum, t) => sum + t.points, 0);
  const pendingPoints = pendingApprovals.reduce((sum, p) => sum + p.points, 0);
  
  return { 
    pointsAwarded: pointsAwarded + pendingPoints, 
    hasPending: pendingApprovals.length > 0 
  };
}

function getScoreDate(timezone: string): string {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  return format(zonedNow, "yyyy-MM-dd");
}
