import { db } from './db';
import * as dbSchema from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface BackfillResult {
  totalLogsProcessed: number;
  totalPointsAwarded: number;
  transactionsCreated: number;
  userBreakdown: Record<string, { points: number; transactions: number }>;
  ruleBreakdown: Record<string, { points: number; transactions: number }>;
}

type DailyCapKey = string;

interface FieldChange {
  field_key: string;
  field_label: string;
  old_value: any;
  new_value: any;
  old_display?: string;
  new_display?: string;
}

interface ActivityLogDetails {
  changes?: FieldChange[];
  bulk_meta?: any;
  extra?: Record<string, any>;
}

export async function backfillPowerScoreForCompany(companyId: string, forceRerun = false): Promise<BackfillResult> {
  console.log(`[PowerScore Backfill] Starting backfill for company: ${companyId}`);
  
  const result: BackfillResult = {
    totalLogsProcessed: 0,
    totalPointsAwarded: 0,
    transactionsCreated: 0,
    userBreakdown: {},
    ruleBreakdown: {}
  };

  // Check if backfill already ran
  const existingBackfill = await db.execute(sql`
    SELECT COUNT(*) as count FROM powerscore_transactions 
    WHERE company_id = ${companyId} AND description LIKE '%(backfill)%'
    LIMIT 1
  `);
  
  const backfillCount = Number(existingBackfill.rows[0]?.count) || 0;
  if (backfillCount > 0 && !forceRerun) {
    console.log(`[PowerScore Backfill] Already found ${backfillCount} backfilled transactions for this company.`);
    console.log('[PowerScore Backfill] Use --force flag to run anyway. Exiting.');
    return result;
  }

  // Get all enabled rules for this company
  const rules = await db.select()
    .from(dbSchema.powerscore_rules)
    .where(and(
      eq(dbSchema.powerscore_rules.company_id, companyId),
      eq(dbSchema.powerscore_rules.is_enabled, true)
    ));

  if (rules.length === 0) {
    console.log('[PowerScore Backfill] No enabled rules found for company');
    return result;
  }

  console.log(`[PowerScore Backfill] Found ${rules.length} enabled rules:`);
  for (const rule of rules) {
    const config = rule.config as { column_key?: string; from_values?: string[]; to_values?: string[] } || {};
    console.log(`  - ${rule.name} (${rule.action_type}): ${rule.points} pts, cap: ${rule.daily_cap || 'none'}`);
    if (rule.action_type === 'dropdown_change') {
      console.log(`    column_key: ${config.column_key}`);
      console.log(`    from_values: ${config.from_values?.join(', ') || 'any'}`);
      console.log(`    to_values: ${config.to_values?.join(', ') || 'any'}`);
    }
    result.ruleBreakdown[rule.id] = { points: 0, transactions: 0 };
  }

  // Load existing transactions to respect caps
  const existingTx = await db.execute(sql`
    SELECT user_id, rule_id, score_date, SUM(points) as total_points
    FROM powerscore_transactions
    WHERE company_id = ${companyId}
    GROUP BY user_id, rule_id, score_date
  `);

  const dailyPointsPerRule: Record<DailyCapKey, number> = {};
  for (const row of existingTx.rows) {
    const key = `${row.user_id}:${row.rule_id}:${row.score_date}`;
    dailyPointsPerRule[key] = Number(row.total_points) || 0;
  }

  console.log(`[PowerScore Backfill] Loaded ${existingTx.rows.length} existing cap records`);

  // Get activity_logs for lead_updated actions (this has structured field changes)
  const activityLogs = await db.execute(sql`
    SELECT 
      al.id,
      al.user_id,
      al.target_id as lead_id,
      al.details,
      al.occurred_at,
      DATE(al.occurred_at) as score_date
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.company_id = ${companyId}
      AND al.action = 'lead_updated'
      AND al.user_id IS NOT NULL
      AND u.role = 'user'
    ORDER BY al.occurred_at ASC
  `);

  console.log(`[PowerScore Backfill] Found ${activityLogs.rows.length} activity logs to process`);

  // Process each activity log
  for (const log of activityLogs.rows) {
    const userId = log.user_id as string;
    const leadId = log.lead_id as string | null;
    const details = log.details as ActivityLogDetails | null;
    const scoreDateRaw = log.score_date as string | Date;
    const scoreDate = typeof scoreDateRaw === 'string' ? scoreDateRaw.split('T')[0] : scoreDateRaw.toISOString().split('T')[0];
    const createdAt = new Date(log.occurred_at as string | Date);

    result.totalLogsProcessed++;

    if (!result.userBreakdown[userId]) {
      result.userBreakdown[userId] = { points: 0, transactions: 0 };
    }

    // Skip if no details or no changes
    if (!details?.changes || details.changes.length === 0) {
      continue;
    }

    // Process each field change in this activity log
    for (const change of details.changes) {
      const fieldKey = change.field_key;
      const oldValue = String(change.old_value || '');
      const newValue = String(change.new_value || '');

      // Find matching dropdown_change rules
      for (const rule of rules) {
        if (rule.action_type === 'dropdown_change') {
          const config = rule.config as { column_key?: string; from_values?: string[]; to_values?: string[] } || {};
          
          // Check if column_key matches
          if (config.column_key !== fieldKey) {
            continue;
          }

          // Check from_values constraint
          const fromMatches = !config.from_values || 
                             config.from_values.length === 0 || 
                             config.from_values.includes(oldValue);

          // Check to_values constraint
          const toMatches = !config.to_values || 
                           config.to_values.length === 0 || 
                           config.to_values.includes(newValue);
          
          if (fromMatches && toMatches) {
            const awarded = await tryAwardPoints({
              companyId,
              userId,
              rule,
              leadId: leadId || '',
              actionType: 'dropdown_change',
              description: `${rule.name}: ${oldValue || '(empty)'} → ${newValue} (backfill)`,
              scoreDate,
              createdAt,
              dailyPointsPerRule,
              result
            });
            
            if (awarded) {
              result.userBreakdown[userId].points += rule.points;
              result.userBreakdown[userId].transactions++;
              result.ruleBreakdown[rule.id].points += rule.points;
              result.ruleBreakdown[rule.id].transactions++;
            }
          }
        }
      }
    }

    // Process lead_update rules (any lead update awards points)
    for (const rule of rules) {
      if (rule.action_type === 'lead_update') {
        const awarded = await tryAwardPoints({
          companyId,
          userId,
          rule,
          leadId: leadId || '',
          actionType: 'lead_update',
          description: `Lead update (backfill)`,
          scoreDate,
          createdAt,
          dailyPointsPerRule,
          result
        });
        
        if (awarded) {
          result.userBreakdown[userId].points += rule.points;
          result.userBreakdown[userId].transactions++;
          result.ruleBreakdown[rule.id].points += rule.points;
          result.ruleBreakdown[rule.id].transactions++;
        }
      }
    }

    // Log progress every 1000 logs
    if (result.totalLogsProcessed % 1000 === 0) {
      console.log(`[PowerScore Backfill] Processed ${result.totalLogsProcessed} logs, awarded ${result.totalPointsAwarded} points`);
    }
  }

  // ==========================================
  // PHASE 2: Process lead_created activity logs
  // ==========================================
  const leadCreatedRules = rules.filter(r => r.action_type === 'lead_created');
  
  if (leadCreatedRules.length > 0) {
    console.log(`\n[PowerScore Backfill] Processing lead_created events...`);
    
    // Get lead_created activity logs (only UI source, not webhook/import)
    const leadCreatedLogs = await db.execute(sql`
      SELECT 
        al.id,
        al.user_id,
        al.target_id as lead_id,
        al.details,
        al.occurred_at,
        DATE(al.occurred_at) as score_date
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.company_id = ${companyId}
        AND al.action = 'lead_created'
        AND al.user_id IS NOT NULL
        AND u.role = 'user'
        AND (al.details->>'source' = 'ui' OR al.details->>'source' IS NULL)
      ORDER BY al.occurred_at ASC
    `);

    console.log(`[PowerScore Backfill] Found ${leadCreatedLogs.rows.length} lead_created logs to process`);

    for (const log of leadCreatedLogs.rows) {
      const userId = log.user_id as string;
      const leadId = log.lead_id as string | null;
      const scoreDateRaw = log.score_date as string | Date;
      const scoreDate = typeof scoreDateRaw === 'string' ? scoreDateRaw.split('T')[0] : scoreDateRaw.toISOString().split('T')[0];
      const createdAt = new Date(log.occurred_at as string | Date);

      result.totalLogsProcessed++;

      if (!result.userBreakdown[userId]) {
        result.userBreakdown[userId] = { points: 0, transactions: 0 };
      }

      // Process each lead_created rule
      for (const rule of leadCreatedRules) {
        const awarded = await tryAwardPoints({
          companyId,
          userId,
          rule,
          leadId: leadId || '',
          actionType: 'lead_created',
          description: `Lead created manually (backfill)`,
          scoreDate,
          createdAt,
          dailyPointsPerRule,
          result
        });
        
        if (awarded) {
          result.userBreakdown[userId].points += rule.points;
          result.userBreakdown[userId].transactions++;
          result.ruleBreakdown[rule.id].points += rule.points;
          result.ruleBreakdown[rule.id].transactions++;
        }
      }
    }
  }

  console.log(`\n[PowerScore Backfill] Complete!`);
  console.log(`  Processed ${result.totalLogsProcessed} activity logs`);
  console.log(`  Awarded ${result.totalPointsAwarded} points`);
  console.log(`  Created ${result.transactionsCreated} transactions`);
  
  return result;
}

async function tryAwardPoints(params: {
  companyId: string;
  userId: string;
  rule: typeof dbSchema.powerscore_rules.$inferSelect;
  leadId: string;
  actionType: string;
  description: string;
  scoreDate: string;
  createdAt: Date;
  dailyPointsPerRule: Record<DailyCapKey, number>;
  result: BackfillResult;
}): Promise<boolean> {
  const { companyId, userId, rule, leadId, actionType, description, scoreDate, createdAt, dailyPointsPerRule, result } = params;
  
  const capKey = `${userId}:${rule.id}:${scoreDate}`;
  const dailyCap = rule.daily_cap || Infinity;
  const currentDayPoints = dailyPointsPerRule[capKey] || 0;
  
  // Check if awarding would exceed cap
  if (currentDayPoints + rule.points > dailyCap) {
    return false;
  }
  
  // Award points
  await createTransaction({
    companyId,
    userId,
    ruleId: rule.id,
    leadId,
    actionType,
    points: rule.points,
    description,
    scoreDate,
    createdAt
  });
  
  // Update tracker
  dailyPointsPerRule[capKey] = currentDayPoints + rule.points;
  result.totalPointsAwarded += rule.points;
  result.transactionsCreated++;
  
  return true;
}

async function createTransaction(params: {
  companyId: string;
  userId: string;
  ruleId: string;
  leadId: string;
  actionType: string;
  points: number;
  description: string;
  scoreDate: string;
  createdAt: Date;
}) {
  const id = randomUUID();
  
  await db.insert(dbSchema.powerscore_transactions).values({
    id,
    company_id: params.companyId,
    user_id: params.userId,
    rule_id: params.ruleId,
    lead_id: params.leadId,
    action_type: params.actionType,
    points: params.points,
    description: params.description,
    score_date: params.scoreDate,
    created_at: params.createdAt,
  });
}

// CLI: Run with company ID as argument
// Usage: npx tsx server/powerscore-backfill.ts <company_id> [--force]
const companyIdArg = process.argv[2];
const forceFlag = process.argv.includes('--force');

if (companyIdArg && companyIdArg !== '--force') {
  backfillPowerScoreForCompany(companyIdArg, forceFlag)
    .then(result => {
      console.log('\n=== BACKFILL SUMMARY ===');
      console.log(`Total activity logs processed: ${result.totalLogsProcessed}`);
      console.log(`Total points awarded: ${result.totalPointsAwarded}`);
      console.log(`Transactions created: ${result.transactionsCreated}`);
      
      console.log('\n--- Rule Breakdown ---');
      for (const [ruleId, data] of Object.entries(result.ruleBreakdown)) {
        if (data.transactions > 0) {
          console.log(`  ${ruleId}: ${data.points} points (${data.transactions} transactions)`);
        }
      }
      
      console.log('\n--- User Breakdown (Top 10) ---');
      const sortedUsers = Object.entries(result.userBreakdown)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 10);
      for (const [userId, data] of sortedUsers) {
        console.log(`  ${userId}: ${data.points} points (${data.transactions} transactions)`);
      }
      
      process.exit(0);
    })
    .catch(err => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
} else {
  console.log('Usage: npx tsx server/powerscore-backfill.ts <company_id> [--force]');
  console.log('Example: npx tsx server/powerscore-backfill.ts 2d955a5e-4673-4df6-9860-041c4f8e9e91');
  console.log('Use --force to run even if backfill was already done for this company');
  process.exit(0);
}
