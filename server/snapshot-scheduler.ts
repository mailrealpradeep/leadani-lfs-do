import { storage } from "./storage";
import { managedTimeout } from "./shutdown";
import { randomUUID } from "crypto";
import crypto from "crypto";

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_DAYS = 30;

function generateDataHash(data: any): string {
  const jsonStr = JSON.stringify(data);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

async function captureSheetSnapshot(sheet: any): Promise<boolean> {
  try {
    const sheetId = sheet.id;
    const companyId = sheet.company_id;
    const sheetName = sheet.name;
    
    const leads = await storage.getLeadsBySheetId(sheetId);
    const activeLeads = leads.filter(l => !l.deleted_at);
    
    // Hash only lead IDs + updated_at timestamps to detect changes efficiently
    // Avoids loading thousands of lead updates into memory
    const hashableLeads = activeLeads.map(l => ({ id: l.id, updated_at: l.updated_at }));
    const dataHash = generateDataHash(hashableLeads);
    
    const latestSnapshot = await storage.getLatestSheetSnapshot(sheetId);
    if (latestSnapshot && latestSnapshot.data_hash === dataHash) {
      console.log(`[Snapshot] Sheet "${sheetName}" (${sheetId}) - no changes detected, skipping snapshot`);
      return false;
    }
    
    const snapshotData = {
      leads: activeLeads,
      captured_at: new Date().toISOString(),
    };
    
    const snapshot = await storage.createSheetSnapshot({
      id: randomUUID(),
      company_id: companyId,
      sheet_id: sheetId,
      sheet_name: sheetName,
      snapshot_data: snapshotData,
      lead_count: activeLeads.length,
      data_hash: dataHash,
      created_at: new Date(),
    });
    
    console.log(`[Snapshot] Created snapshot for sheet "${sheetName}" - ${activeLeads.length} leads captured`);
    return true;
  } catch (error) {
    console.error(`[Snapshot] Error capturing snapshot for sheet ${sheet.id}:`, error);
    return false;
  }
}

async function runSnapshotCycle(): Promise<void> {
  console.log(`[Snapshot] Starting snapshot cycle at ${new Date().toISOString()}`);
  
  try {
    const companies = await storage.getAllCompanies();
    let totalSnapshots = 0;
    let skippedSnapshots = 0;
    
    for (const company of companies) {
      const sheets = await storage.getSheetsByCompanyId(company.id);
      
      for (const sheet of sheets) {
        const created = await captureSheetSnapshot(sheet);
        if (created) {
          totalSnapshots++;
        } else {
          skippedSnapshots++;
        }
      }
    }
    
    console.log(`[Snapshot] Cycle complete - ${totalSnapshots} snapshots created, ${skippedSnapshots} skipped (no changes)`);
  } catch (error) {
    console.error("[Snapshot] Error in snapshot cycle:", error);
  }
}

async function cleanupOldSnapshots(): Promise<void> {
  console.log(`[Snapshot] Starting cleanup of snapshots older than ${RETENTION_DAYS} days`);
  
  try {
    const deletedCount = await storage.deleteOldSnapshots(RETENTION_DAYS);
    console.log(`[Snapshot] Cleanup complete - ${deletedCount} old snapshots deleted`);
  } catch (error) {
    console.error("[Snapshot] Error in cleanup:", error);
  }
}

let snapshotIntervalId: NodeJS.Timeout | null = null;
let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startSnapshotScheduler(): void {
  console.log("[Snapshot] Starting snapshot scheduler");
  
  // Delay initial snapshot by 2 minutes to let the server stabilise
  // and avoid memory spikes immediately after startup
  managedTimeout(() => {
    runSnapshotCycle().then(() => {
      cleanupOldSnapshots();
    });
  }, 2 * 60 * 1000);
  
  snapshotIntervalId = setInterval(runSnapshotCycle, SNAPSHOT_INTERVAL_MS);
  
  cleanupIntervalId = setInterval(cleanupOldSnapshots, 24 * 60 * 60 * 1000);
  
  console.log(`[Snapshot] Scheduler initialized - snapshots every ${SNAPSHOT_INTERVAL_MS / 60000} minutes, cleanup every 24 hours`);
}

export function stopSnapshotScheduler(): void {
  if (snapshotIntervalId) {
    clearInterval(snapshotIntervalId);
    snapshotIntervalId = null;
  }
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  console.log("[Snapshot] Scheduler stopped");
}

export async function createManualSnapshot(sheetId: string): Promise<boolean> {
  const sheet = await storage.getSheet(sheetId);
  if (!sheet) {
    throw new Error("Sheet not found");
  }
  return captureSheetSnapshot(sheet);
}

export async function getSheetSnapshotStats(): Promise<{
  totalSnapshots: number;
  companiesWithSnapshots: number;
  sheetsWithSnapshots: number;
  oldestSnapshot: Date | null;
  newestSnapshot: Date | null;
}> {
  const snapshots = await storage.getAllSheetSnapshots(10000);
  
  const companyIds = new Set(snapshots.map(s => s.company_id));
  const sheetIds = new Set(snapshots.map(s => s.sheet_id));
  
  let oldestSnapshot: Date | null = null;
  let newestSnapshot: Date | null = null;
  
  for (const snapshot of snapshots) {
    const created = new Date(snapshot.created_at);
    if (!oldestSnapshot || created < oldestSnapshot) {
      oldestSnapshot = created;
    }
    if (!newestSnapshot || created > newestSnapshot) {
      newestSnapshot = created;
    }
  }
  
  return {
    totalSnapshots: snapshots.length,
    companiesWithSnapshots: companyIds.size,
    sheetsWithSnapshots: sheetIds.size,
    oldestSnapshot,
    newestSnapshot,
  };
}
