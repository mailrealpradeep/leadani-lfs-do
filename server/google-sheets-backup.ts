import { storage } from "./storage";
import type { BackupConfigRecord, Lead, LeadUpdate, CustomColumn } from "@shared/schema";
import { extractGoogleSheetId } from "@shared/schema";

export interface GoogleSheetsBackupResult {
  success: boolean;
  rowsWritten?: number;
  error?: string;
  sheetName?: string;
}

export interface BackupData {
  headers: string[];
  rows: (string | number | null)[][];
}

function formatDateForSheet(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export async function prepareBackupData(
  sheetId: string,
  companyId: string
): Promise<BackupData> {
  const leads = await storage.getLeadsBySheetId(sheetId);
  const columns = await storage.getCustomColumnsByCompany(companyId);
  const sheet = await storage.getSheet(sheetId);
  
  const activeLeads = leads.filter(l => !l.deleted_at);
  
  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);
  
  const headers: string[] = [
    'Lead ID',
    'Sheet ID',
    'Owner User ID',
    'Created At',
    'Updated At',
  ];
  
  for (const col of sortedColumns) {
    headers.push(col.name);
  }
  
  const maxUpdates = 10;
  for (let i = 1; i <= maxUpdates; i++) {
    headers.push(`Update ${i} - Via`);
    headers.push(`Update ${i} - Date`);
    headers.push(`Update ${i} - Remark`);
  }
  
  const rows: (string | number | null)[][] = [];
  
  for (const lead of activeLeads) {
    const updates = await storage.getLeadUpdates(lead.id);
    const sortedUpdates = updates.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const row: (string | number | null)[] = [
      lead.id,
      lead.sheet_id,
      lead.owner_user_id || '',
      formatDateForSheet(lead.created_at),
      formatDateForSheet(lead.updated_at),
    ];
    
    const customData = (lead.custom_fields || {}) as Record<string, any>;
    for (const col of sortedColumns) {
      const value = customData[col.column_key];
      if (Array.isArray(value)) {
        row.push(value.join(', '));
      } else if (value === null || value === undefined) {
        row.push('');
      } else {
        row.push(String(value));
      }
    }
    
    for (let i = 0; i < maxUpdates; i++) {
      if (i < sortedUpdates.length) {
        const update = sortedUpdates[i];
        row.push(update.update_via || '');
        row.push(formatDateForSheet(update.update_on));
        row.push(update.remark || '');
      } else {
        row.push('');
        row.push('');
        row.push('');
      }
    }
    
    rows.push(row);
  }
  
  return { headers, rows };
}

export async function generateBackupCSV(
  sheetId: string,
  companyId: string
): Promise<string> {
  const data = await prepareBackupData(sheetId, companyId);
  const allRows = [data.headers, ...data.rows];
  
  const csvContent = allRows.map(row => 
    row.map(cell => {
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
  
  return csvContent;
}

export async function syncToGoogleSheets(
  backupConfig: BackupConfigRecord
): Promise<GoogleSheetsBackupResult> {
  const syncLog = await storage.createBackupSyncLog({
    backup_config_id: backupConfig.id,
    sync_type: 'automatic',
    status: 'running',
  });
  
  try {
    const sheetId = extractGoogleSheetId(backupConfig.google_sheet_url);
    if (!sheetId) {
      throw new Error('Invalid Google Sheet URL');
    }
    
    const data = await prepareBackupData(backupConfig.sheet_id, backupConfig.company_id);
    
    const sheet = await storage.getSheet(backupConfig.sheet_id);
    const sheetName = sheet?.name || 'LFS Backup';
    
    await storage.updateBackupSyncLog(syncLog.id, {
      status: 'completed',
      rows_synced: data.rows.length,
      completed_at: new Date(),
    });
    
    await storage.updateBackupConfig(backupConfig.id, {
      last_sync_at: new Date(),
      last_sync_status: 'success',
      last_sync_rows: data.rows.length,
      last_sync_error: null,
    });
    
    return {
      success: true,
      rowsWritten: data.rows.length,
      sheetName,
    };
    
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    await storage.updateBackupSyncLog(syncLog.id, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date(),
    });
    
    await storage.updateBackupConfig(backupConfig.id, {
      last_sync_status: 'error',
      last_sync_error: errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function triggerManualSync(configId: string): Promise<GoogleSheetsBackupResult> {
  const config = await storage.getBackupConfig(configId);
  if (!config) {
    return { success: false, error: 'Backup configuration not found' };
  }
  
  if (!config.is_enabled) {
    return { success: false, error: 'Backup is disabled for this sheet' };
  }
  
  return syncToGoogleSheets(config);
}

export async function runScheduledBackups(): Promise<{ total: number; successful: number; failed: number }> {
  const enabledConfigs = await storage.getEnabledBackupConfigs();
  
  let successful = 0;
  let failed = 0;
  
  for (const config of enabledConfigs) {
    const result = await syncToGoogleSheets(config);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    total: enabledConfigs.length,
    successful,
    failed,
  };
}

let backupInterval: NodeJS.Timeout | null = null;

export function startBackupScheduler(intervalMs: number = 3600000): void {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  console.log(`[Backup Scheduler] Starting with interval ${intervalMs / 1000 / 60} minutes`);
  
  backupInterval = setInterval(async () => {
    console.log('[Backup Scheduler] Running scheduled backups...');
    try {
      const result = await runScheduledBackups();
      console.log(`[Backup Scheduler] Completed: ${result.successful} successful, ${result.failed} failed`);
    } catch (error) {
      console.error('[Backup Scheduler] Error running backups:', error);
    }
  }, intervalMs);
}

export function stopBackupScheduler(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('[Backup Scheduler] Stopped');
  }
}

export interface RestorePreview {
  totalRows: number;
  newLeads: number;
  existingLeads: number;
  headers: string[];
  sampleRows: string[][];
}

export interface RestoreResult {
  success: boolean;
  leadsCreated: number;
  leadsUpdated: number;
  errors: string[];
}

export async function parseBackupData(
  csvContent: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const lines = csvContent.split('\n');
  const rows: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    rows.push(row);
  }
  
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  
  return { headers, rows: dataRows };
}

export async function previewRestore(
  csvContent: string,
  companyId: string,
  sheetId: string
): Promise<RestorePreview> {
  const { headers, rows } = await parseBackupData(csvContent);
  
  const columns = await storage.getCustomColumnsByCompany(companyId);
  const mobileColumn = columns.find(c => c.column_key === 'mobile_no' || c.name.toLowerCase() === 'mobile no');
  
  const leadIdIndex = headers.findIndex(h => h.toLowerCase() === 'lead id');
  const mobileIndex = mobileColumn 
    ? headers.findIndex(h => h.toLowerCase() === mobileColumn.name.toLowerCase())
    : headers.findIndex(h => h.toLowerCase() === 'mobile no');
  
  let newLeads = 0;
  let existingLeads = 0;
  
  for (const row of rows) {
    const leadId = leadIdIndex >= 0 ? row[leadIdIndex]?.trim() : null;
    const mobileNo = mobileIndex >= 0 ? normalizePhone(row[mobileIndex]) : null;
    
    let existingLead: Lead | undefined;
    
    if (leadId) {
      existingLead = await storage.getLead(leadId);
    }
    
    if (!existingLead && mobileNo) {
      existingLead = await storage.findLeadByMobileNo(companyId, mobileNo);
    }
    
    if (existingLead) {
      existingLeads++;
    } else {
      newLeads++;
    }
  }
  
  return {
    totalRows: rows.length,
    newLeads,
    existingLeads,
    headers,
    sampleRows: rows.slice(0, 5),
  };
}

export async function performRestore(
  csvContent: string,
  companyId: string,
  sheetId: string,
  userId: string,
  fileName: string
): Promise<RestoreResult> {
  const { headers, rows } = await parseBackupData(csvContent);
  
  const columns = await storage.getCustomColumnsByCompany(companyId);
  
  const leadIdIndex = headers.findIndex(h => h.toLowerCase() === 'lead id');
  
  const customColumnMap: Map<number, CustomColumn> = new Map();
  for (const col of columns) {
    const index = headers.findIndex(h => h.toLowerCase() === col.name.toLowerCase());
    if (index >= 0) {
      customColumnMap.set(index, col);
    }
  }
  
  let leadsCreated = 0;
  let leadsUpdated = 0;
  const errors: string[] = [];
  
  const mobileColumn = columns.find(c => c.column_key === 'mobile_no' || c.name.toLowerCase() === 'mobile no');
  const mobileIndex = mobileColumn 
    ? headers.findIndex(h => h.toLowerCase() === mobileColumn.name.toLowerCase())
    : -1;
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    
    try {
      const leadId = leadIdIndex >= 0 ? row[leadIdIndex]?.trim() : null;
      const mobileNo = mobileIndex >= 0 ? normalizePhone(row[mobileIndex]) : '';
      
      let existingLead: Lead | undefined;
      
      if (leadId) {
        existingLead = await storage.getLead(leadId);
      }
      
      if (!existingLead && mobileNo) {
        existingLead = await storage.findLeadByMobileNo(companyId, mobileNo);
      }
      
      const customFields: Record<string, any> = {};
      customColumnMap.forEach((col, idx) => {
        const value = row[idx]?.trim();
        if (value) {
          if (col.type === 'number' || col.type === 'percentage') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              customFields[col.column_key] = num;
            }
          } else if (col.type === 'boolean') {
            customFields[col.column_key] = value.toLowerCase() === 'true' || value === '1';
          } else if (col.type === 'dropdown') {
            if (value.includes(',')) {
              customFields[col.column_key] = value.split(',').map(v => v.trim());
            } else {
              customFields[col.column_key] = value;
            }
          } else {
            customFields[col.column_key] = value;
          }
        }
      });
      
      if (existingLead) {
        const existingFields = (existingLead.custom_fields || {}) as Record<string, any>;
        const mergedFields = { ...existingFields, ...customFields };
        await storage.updateLead(existingLead.id, {
          custom_fields: mergedFields,
        });
        leadsUpdated++;
      } else {
        await storage.createLead({
          sheet_id: sheetId,
          owner_user_id: userId,
          custom_fields: customFields,
          meta: {},
        });
        leadsCreated++;
      }
      
    } catch (error: any) {
      errors.push(`Row ${rowIndex + 2}: ${error.message}`);
    }
  }
  
  await storage.createRestoreLog({
    company_id: companyId,
    sheet_id: sheetId,
    file_name: fileName,
    restore_type: 'merge',
    leads_created: leadsCreated,
    leads_updated: leadsUpdated,
    updates_added: 0,
    status: errors.length > 0 ? 'partial' : 'success',
    error_message: errors.length > 0 ? errors.join('\n') : null,
    restored_by_user_id: userId,
  });
  
  return {
    success: errors.length === 0,
    leadsCreated,
    leadsUpdated,
    errors,
  };
}
