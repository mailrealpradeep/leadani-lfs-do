import { db } from "./db";
import { sql } from "drizzle-orm";
import { calculateAndUpdateLeadRating } from "./ai-lead-rating-service";
import { emitAIRatingUpdate, emitAIRatingJobProgress } from "./socket-manager";
import {
  AIRatingJob,
  getJob,
  updateJob,
  getJobProgress,
} from "./ai-rating-job-registry";

const BATCH_SIZE = 100;
const DELAY_BETWEEN_LEADS_MS = 300;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const STALENESS_HOURS = 24;

interface LeadToRate {
  leadId: string;
  sheetId: string;
}

async function getEligibleLeads(companyId: string, limit: number): Promise<LeadToRate[]> {
  const stalenessThreshold = new Date(Date.now() - (STALENESS_HOURS * 60 * 60 * 1000));
  
  const result = await db.execute(sql`
    SELECT l.id as "leadId", l.sheet_id as "sheetId"
    FROM leads l
    INNER JOIN sheets s ON l.sheet_id = s.id
    WHERE s.company_id = ${companyId}
      AND l.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND (
        l.ai_rating IS NULL
        OR l.ai_rating = 'New'
        OR l.ai_rating_updated_at IS NULL
        OR l.ai_rating_updated_at < ${stalenessThreshold}
      )
      AND (SELECT COUNT(*) FROM lead_updates WHERE lead_id = l.id) >= 3
    LIMIT ${limit}
  `);
  
  return (result.rows || []) as unknown as LeadToRate[];
}

async function getTotalEligibleCount(companyId: string): Promise<number> {
  const stalenessThreshold = new Date(Date.now() - (STALENESS_HOURS * 60 * 60 * 1000));
  
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM leads l
    INNER JOIN sheets s ON l.sheet_id = s.id
    WHERE s.company_id = ${companyId}
      AND l.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND (
        l.ai_rating IS NULL
        OR l.ai_rating = 'New'
        OR l.ai_rating_updated_at IS NULL
        OR l.ai_rating_updated_at < ${stalenessThreshold}
      )
      AND (SELECT COUNT(*) FROM lead_updates WHERE lead_id = l.id) >= 3
  `);
  
  return Number((result.rows?.[0] as any)?.count || 0);
}

export async function runAIRatingJob(jobId: string, apiKey: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  updateJob(jobId, { status: "running", message: "Starting batch processing..." });
  emitJobProgress(jobId);

  let batchNumber = 0;
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let consecutiveEmptyBatches = 0;

  try {
    while (true) {
      const currentJob = getJob(jobId);
      if (!currentJob) break;

      if (currentJob.cancelRequested) {
        updateJob(jobId, {
          status: "cancelled",
          message: `Cancelled after processing ${totalProcessed} leads`,
          completedAt: new Date(),
        });
        emitJobProgress(jobId);
        return;
      }

      batchNumber++;
      const leads = await getEligibleLeads(currentJob.companyId, BATCH_SIZE);

      if (leads.length === 0) {
        consecutiveEmptyBatches++;
        if (consecutiveEmptyBatches >= 2) {
          updateJob(jobId, {
            status: "completed",
            message: `All done! Processed ${totalProcessed} leads, ${totalSuccessful} successfully rated.`,
            completedAt: new Date(),
            processedLeads: totalProcessed,
            successfulRatings: totalSuccessful,
            failedRatings: totalFailed,
          });
          emitJobProgress(jobId);
          return;
        }
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      consecutiveEmptyBatches = 0;
      
      updateJob(jobId, {
        currentBatch: batchNumber,
        message: `Processing batch ${batchNumber}... (${totalProcessed} leads done so far)`,
      });
      emitJobProgress(jobId);

      for (const { leadId, sheetId } of leads) {
        const latestJob = getJob(jobId);
        if (latestJob?.cancelRequested) break;

        try {
          const result = await calculateAndUpdateLeadRating(leadId, apiKey);
          totalProcessed++;

          if (result && result.rating && result.score !== undefined) {
            totalSuccessful++;
            emitAIRatingUpdate({
              leadId,
              sheetId,
              companyId: currentJob.companyId,
              rating: result.rating,
              score: result.score,
              summary: result.summary || '',
              details: result.details || {},
              updatedAt: new Date()
            });
          } else {
            totalFailed++;
          }

          updateJob(jobId, {
            processedLeads: totalProcessed,
            successfulRatings: totalSuccessful,
            failedRatings: totalFailed,
          });

          if (totalProcessed % 10 === 0) {
            const remaining = await getTotalEligibleCount(currentJob.companyId);
            updateJob(jobId, {
              totalLeads: remaining + totalProcessed,
              message: `Processing... ${totalProcessed} done, ${remaining} remaining`,
            });
            emitJobProgress(jobId);
          }

          await new Promise(r => setTimeout(r, DELAY_BETWEEN_LEADS_MS));
        } catch (err) {
          console.error(`Job ${jobId} - Error rating lead ${leadId}:`, err);
          totalProcessed++;
          totalFailed++;
        }
      }

      updateJob(jobId, {
        message: `Completed batch ${batchNumber}. ${totalProcessed} leads processed so far.`,
      });
      emitJobProgress(jobId);

      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    updateJob(jobId, {
      status: "failed",
      message: `Job failed: ${error.message || 'Unknown error'}`,
      error: error.message || 'Unknown error',
      completedAt: new Date(),
    });
    emitJobProgress(jobId);
  }
}

function emitJobProgress(jobId: string): void {
  const job = getJob(jobId);
  if (job) {
    emitAIRatingJobProgress(getJobProgress(job));
  }
}
