import { db } from './db';
import * as dbSchema from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface BackfillResult {
  totalUpdatesProcessed: number;
  totalPointsAwarded: number;
  transactionsCreated: number;
  userBreakdown: Record<string, { points: number; transactions: number }>;
}

// Key format: userId:ruleId:date
type DailyCapKey = string;

export async function backfillPowerScoreForCompany(companyId: string, forceRerun = false): Promise<BackfillResult> {
  console.log(`[PowerScore Backfill] Starting backfill for company: ${companyId}`);
  
  const result: BackfillResult = {
    totalUpdatesProcessed: 0,
    totalPointsAwarded: 0,
    transactionsCreated: 0,
    userBreakdown: {}
  };

  // Check if backfill already ran (look for "(backfill)" in descriptions)
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

  console.log(`[PowerScore Backfill] Found ${rules.length} enabled rules`);

  // Load existing transactions to respect caps (prevents re-running issues)
  const existingTx = await db.execute(sql`
    SELECT user_id, rule_id, score_date, SUM(points) as total_points
    FROM powerscore_transactions
    WHERE company_id = ${companyId}
    GROUP BY user_id, rule_id, score_date
  `);

  // Build cap tracker from existing transactions: key = userId:ruleId:date
  const dailyPointsPerRule: Record<DailyCapKey, number> = {};
  for (const row of existingTx.rows) {
    const key = `${row.user_id}:${row.rule_id}:${row.score_date}`;
    dailyPointsPerRule[key] = Number(row.total_points) || 0;
  }

  console.log(`[PowerScore Backfill] Loaded ${existingTx.rows.length} existing cap records`);

  // Get all lead updates for this company
  const leadUpdates = await db.execute(sql`
    SELECT lu.id, lu.lead_id, lu.remark, lu.created_at, lu.created_by_user_id,
           DATE(lu.created_at) as score_date
    FROM lead_updates lu
    JOIN leads l ON lu.lead_id = l.id
    JOIN sheets s ON l.sheet_id = s.id
    WHERE s.company_id = ${companyId}
    ORDER BY lu.created_at ASC
  `);

  console.log(`[PowerScore Backfill] Found ${leadUpdates.rows.length} lead updates to process`);

  // Process each lead update
  for (const update of leadUpdates.rows) {
    const userId = update.created_by_user_id as string | null;
    
    // Skip updates without a user (system-generated)
    if (!userId) {
      continue;
    }
    
    const leadId = update.lead_id as string;
    const remark = (update.remark as string) || '';
    const scoreDateRaw = update.score_date as string | Date;
    const scoreDate = typeof scoreDateRaw === 'string' ? scoreDateRaw.split('T')[0] : scoreDateRaw.toISOString().split('T')[0];
    const createdAt = new Date(update.created_at as string | Date);

    result.totalUpdatesProcessed++;

    if (!result.userBreakdown[userId]) {
      result.userBreakdown[userId] = { points: 0, transactions: 0 };
    }

    // Process lead_update rules
    for (const rule of rules) {
      if (rule.action_type === 'lead_update') {
        const awarded = await tryAwardPoints({
          companyId,
          userId,
          rule,
          leadId,
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
        }
      }
    }

    // Parse remark for dropdown changes: [Field Name: from → to]
    const dropdownChangePattern = /\[([^:]+):\s*([^→]+)\s*→\s*([^\]]+)\]/g;
    let match;
    
    while ((match = dropdownChangePattern.exec(remark)) !== null) {
      const fieldName = match[1].trim();
      const fromValue = match[2].trim();
      const toValue = match[3].trim();

      // Map field name to column_key
      const columnKey = fieldNameToColumnKey(fieldName);

      // Find matching dropdown_change rules
      for (const rule of rules) {
        if (rule.action_type === 'dropdown_change') {
          const config = rule.config as { column_key?: string; from_values?: string[]; to_values?: string[] } || {};
          
          if (config.column_key === columnKey) {
            const fromMatches = !config.from_values || config.from_values.length === 0 || config.from_values.includes(fromValue);
            const toMatches = !config.to_values || config.to_values.length === 0 || config.to_values.includes(toValue);
            
            if (fromMatches && toMatches) {
              const awarded = await tryAwardPoints({
                companyId,
                userId,
                rule,
                leadId,
                actionType: 'dropdown_change',
                description: `${rule.name}: ${fromValue} → ${toValue} (backfill)`,
                scoreDate,
                createdAt,
                dailyPointsPerRule,
                result
              });
              if (awarded) {
                result.userBreakdown[userId].points += rule.points;
                result.userBreakdown[userId].transactions++;
              }
            }
          }
        }
      }
    }

    // Log progress every 1000 updates
    if (result.totalUpdatesProcessed % 1000 === 0) {
      console.log(`[PowerScore Backfill] Processed ${result.totalUpdatesProcessed} updates, awarded ${result.totalPointsAwarded} points`);
    }
  }

  console.log(`[PowerScore Backfill] Complete! Processed ${result.totalUpdatesProcessed} updates, awarded ${result.totalPointsAwarded} points in ${result.transactionsCreated} transactions`);
  
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

function fieldNameToColumnKey(fieldName: string): string {
  // Map display names to column keys
  const mappings: Record<string, string> = {
    'Lead Status': 'lead_status',
    'Visit Status': 'visit_status',
    'Source': 'source',
    'Assigned To': 'assigned_to',
  };
  
  return mappings[fieldName] || fieldName.toLowerCase().replace(/\s+/g, '_');
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
      console.log('\n=== BACKFILL COMPLETE ===');
      console.log(`Total updates processed: ${result.totalUpdatesProcessed}`);
      console.log(`Total points awarded: ${result.totalPointsAwarded}`);
      console.log(`Transactions created: ${result.transactionsCreated}`);
      console.log('\nUser breakdown:');
      for (const [userId, data] of Object.entries(result.userBreakdown)) {
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
