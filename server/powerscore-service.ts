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

  // Multi-sheet users (access to >1 company sheet) don't participate in PowerScore
  const isMultiSheet = await storage.isMultiSheetUser(context.userId);
  if (isMultiSheet) {
    return { awarded: 0, pending: 0 };
  }

  let totalAwarded = 0;
  let totalPending = 0;

  const rules = await storage.getPowerScoreRules(context.companyId);
  if (rules.length === 0) return { awarded: 0, pending: 0 };

  const today = getScoreDate(context.companyTimezone);

  // Award login bonus if not yet awarded today (for users with persistent sessions)
  // This ensures users get their daily login bonus even if they stayed logged in
  const loginResult = await awardLoginBonusInternal(context.userId, context.companyId, context.companyTimezone, rules, today);
  totalAwarded += loginResult.awarded;
  totalPending += loginResult.pending;

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
    allow_empty_from?: boolean;
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
      const normalizedOldValue = change.oldValue?.trim() || "";
      if (normalizedOldValue === "") {
        // Allow empty/null old values by default (SaaS-wide)
        // Use allow_empty_from: false to explicitly block empty→value transitions
        return config.allow_empty_from !== false;
      }
      return config.from_values.includes(normalizedOldValue);
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

async function awardLoginBonusInternal(
  userId: string,
  companyId: string,
  companyTimezone: string,
  rules: PowerScoreRule[],
  scoreDate: string
): Promise<{ awarded: number; pending: number }> {
  const loginRule = rules.find(r => r.action_type === "login" && r.is_enabled);
  if (!loginRule) return { awarded: 0, pending: 0 };

  const { pointsAwarded, hasPending } = await getDailyPointsAndPending(userId, loginRule.id, scoreDate);
  
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

export async function awardLoginBonus(
  userId: string,
  companyId: string,
  companyTimezone: string
): Promise<{ awarded: number; pending: number }> {
  const user = await storage.getUser(userId);
  if (!user || user.role === 'super_admin' || user.role === 'company_admin') {
    return { awarded: 0, pending: 0 };
  }

  // Multi-sheet users (access to >1 company sheet) don't participate in PowerScore
  const isMultiSheet = await storage.isMultiSheetUser(userId);
  if (isMultiSheet) {
    return { awarded: 0, pending: 0 };
  }

  const rules = await storage.getPowerScoreRules(companyId);
  const scoreDate = getScoreDate(companyTimezone);
  
  return awardLoginBonusInternal(userId, companyId, companyTimezone, rules, scoreDate);
}

export async function awardLeadCreatedPoints(
  context: ScoringContext
): Promise<{ awarded: number; pending: number }> {
  // Admin accounts don't participate in PowerScore
  const user = await storage.getUser(context.userId);
  if (!user || user.role === 'super_admin' || user.role === 'company_admin') {
    return { awarded: 0, pending: 0 };
  }

  // Multi-sheet users (access to >1 company sheet) don't participate in PowerScore
  const isMultiSheet = await storage.isMultiSheetUser(context.userId);
  if (isMultiSheet) {
    return { awarded: 0, pending: 0 };
  }

  const rules = await storage.getPowerScoreRules(context.companyId);
  if (rules.length === 0) return { awarded: 0, pending: 0 };

  const today = getScoreDate(context.companyTimezone);
  let totalAwarded = 0;
  let totalPending = 0;

  for (const rule of rules) {
    if (!rule.is_enabled || rule.action_type !== "lead_created") continue;

    const { pointsAwarded, hasPending } = await getDailyPointsAndPending(context.userId, rule.id, today);
    
    // Check daily cap - if exceeded, skip this rule
    if (rule.daily_cap && pointsAwarded + rule.points > rule.daily_cap) {
      continue;
    }

    if (rule.requires_approval) {
      // Skip if already has a pending approval for this rule today
      if (hasPending) continue;
      await storage.createPowerScorePendingApproval({
        company_id: context.companyId,
        user_id: context.userId,
        rule_id: rule.id,
        action_type: rule.action_type,
        points: rule.points,
        lead_id: context.leadId || null,
        description: "Lead created manually",
        score_date: today,
      });
      totalPending += rule.points;
    } else {
      // Award points - no deduplication here since each lead creation is a unique action
      // Daily cap check above handles limiting total points per day
      await storage.createPowerScoreTransaction({
        company_id: context.companyId,
        user_id: context.userId,
        rule_id: rule.id,
        action_type: rule.action_type,
        points: rule.points,
        lead_id: context.leadId || null,
        description: "Lead created manually",
        score_date: today,
        approval_id: null,
        is_approved: null,
      });
      totalAwarded += rule.points;
    }
  }

  return { awarded: totalAwarded, pending: totalPending };
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

// Reversal Protection: Auto-cancel pending approvals if status changes back within 5 minutes
const REVERSAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function checkAndCancelReversedApprovals(
  leadId: string,
  columnKey: string,
  newValue: string | null
): Promise<{ cancelledCount: number }> {
  const pendingApprovals = await storage.getPendingApprovalsByLeadId(leadId);
  if (pendingApprovals.length === 0) {
    return { cancelledCount: 0 };
  }

  const now = new Date();
  let cancelledCount = 0;

  for (const approval of pendingApprovals) {
    // Check if within the 5-minute reversal window
    const createdAt = new Date(approval.created_at);
    const ageMs = now.getTime() - createdAt.getTime();
    
    if (ageMs > REVERSAL_WINDOW_MS) {
      // Approval is older than 5 minutes, don't auto-cancel
      continue;
    }

    // Get the rule to check if the new value still matches the bonus criteria
    const rule = await storage.getPowerScoreRule(approval.rule_id);
    if (!rule) continue;

    const config = rule.config as {
      column_key?: string;
      to_values?: string[];
    };

    // Only check dropdown_change rules with to_values that match this column
    if (rule.action_type !== 'dropdown_change' || !config.to_values || config.column_key !== columnKey) {
      continue;
    }

    // Check if the new value is NOT in the rule's to_values (meaning it was reversed)
    // Normalize the value - handle both plain strings and object { value: "X" } shapes
    let normalizedNewValue = newValue?.trim() || "";
    if (typeof newValue === 'object' && newValue !== null && 'value' in (newValue as any)) {
      normalizedNewValue = ((newValue as any).value || "").trim();
    }
    const stillMatches = config.to_values.includes(normalizedNewValue);

    if (!stillMatches) {
      // Value was reversed away from the bonus-triggering value
      await storage.autoCancelPendingApproval(
        approval.id,
        `${columnKey} changed from "${config.to_values.join('/')}" to "${normalizedNewValue}" within ${Math.round(ageMs / 1000)}s`
      );
      cancelledCount++;
      console.log(`[PowerScore] Auto-cancelled pending approval ${approval.id} for lead ${leadId} - ${columnKey} reversed to "${normalizedNewValue}"`);
    }
  }

  return { cancelledCount };
}
