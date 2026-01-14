import { randomUUID } from "crypto";

export type AIRatingJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface AIRatingJob {
  id: string;
  companyId: string;
  status: AIRatingJobStatus;
  totalLeads: number;
  processedLeads: number;
  successfulRatings: number;
  failedRatings: number;
  currentBatch: number;
  message: string;
  startedAt: Date;
  completedAt: Date | null;
  cancelRequested: boolean;
  error: string | null;
}

export interface AIRatingJobProgress {
  jobId: string;
  companyId: string;
  status: AIRatingJobStatus;
  totalLeads: number;
  processedLeads: number;
  successfulRatings: number;
  failedRatings: number;
  currentBatch: number;
  message: string;
  percentComplete: number;
}

const jobs = new Map<string, AIRatingJob>();
const companyActiveJobs = new Map<string, string>();

export function createJob(companyId: string, totalLeads: number): AIRatingJob {
  const existingJobId = companyActiveJobs.get(companyId);
  if (existingJobId) {
    const existingJob = jobs.get(existingJobId);
    if (existingJob && (existingJob.status === "pending" || existingJob.status === "running")) {
      throw new Error("A job is already running for this company");
    }
  }

  const job: AIRatingJob = {
    id: randomUUID(),
    companyId,
    status: "pending",
    totalLeads,
    processedLeads: 0,
    successfulRatings: 0,
    failedRatings: 0,
    currentBatch: 0,
    message: "Job created, starting soon...",
    startedAt: new Date(),
    completedAt: null,
    cancelRequested: false,
    error: null,
  };

  jobs.set(job.id, job);
  companyActiveJobs.set(companyId, job.id);
  return job;
}

export function getJob(jobId: string): AIRatingJob | undefined {
  return jobs.get(jobId);
}

export function getActiveJobForCompany(companyId: string): AIRatingJob | undefined {
  const jobId = companyActiveJobs.get(companyId);
  if (!jobId) return undefined;
  
  const job = jobs.get(jobId);
  if (job && (job.status === "pending" || job.status === "running")) {
    return job;
  }
  return undefined;
}

export function updateJob(jobId: string, updates: Partial<AIRatingJob>): AIRatingJob | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  const updatedJob = { ...job, ...updates };
  jobs.set(jobId, updatedJob);
  return updatedJob;
}

export function requestCancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  
  if (job.status === "pending" || job.status === "running") {
    job.cancelRequested = true;
    job.message = "Cancellation requested...";
    jobs.set(jobId, job);
    return true;
  }
  return false;
}

export function getJobProgress(job: AIRatingJob): AIRatingJobProgress {
  const percentComplete = job.totalLeads > 0 
    ? Math.round((job.processedLeads / job.totalLeads) * 100) 
    : 0;

  return {
    jobId: job.id,
    companyId: job.companyId,
    status: job.status,
    totalLeads: job.totalLeads,
    processedLeads: job.processedLeads,
    successfulRatings: job.successfulRatings,
    failedRatings: job.failedRatings,
    currentBatch: job.currentBatch,
    message: job.message,
    percentComplete,
  };
}

export function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  Array.from(jobs.entries()).forEach(([jobId, job]) => {
    if (job.completedAt && now - job.completedAt.getTime() > maxAgeMs) {
      jobs.delete(jobId);
      if (companyActiveJobs.get(job.companyId) === jobId) {
        companyActiveJobs.delete(job.companyId);
      }
    }
  });
}
