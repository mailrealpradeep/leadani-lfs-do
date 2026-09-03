import { storage } from "./storage";
import type { BackupConfigRecord, Lead, LeadUpdate, CustomColumn } from "@shared/schema";
import { extractGoogleSheetId } from "@shared/schema";
import { google } from 'googleapis';
import { getCompanyTimezone, formatDateForSheet as formatDateWithTimezone } from "./timezone-utils";

// ============================================================================
// Google Sheets API Client
//
// Two auth providers, chosen at runtime:
//   1. Google service account — portable, used when GOOGLE_SERVICE_ACCOUNT_JSON
//      is set. Spreadsheets must be shared (Editor) with the service account
//      email for backups to work.
//   2. Replit Google Sheets connector — legacy fallback, only works on Replit.
// ============================================================================

import { GOOGLE_SERVICE_ACCOUNT_JSON } from "./config";

let connectionSettings: any;

let serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;
let serviceAccountEmail: string | null = null;

function parseServiceAccountCredentials(): any {
  const raw = GOOGLE_SERVICE_ACCOUNT_JSON.trim();
  // Accept raw JSON or base64-encoded JSON (easier to paste into env UIs)
  const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text);
}

// Cached is fine here: GoogleAuth refreshes service-account tokens itself.
function getServiceAccountAuth() {
  if (!serviceAccountAuth) {
    const credentials = parseServiceAccountCredentials();
    serviceAccountEmail = credentials.client_email || null;
    serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    console.log(`[Google Sheets] Using service account auth (${serviceAccountEmail})`);
  }
  return serviceAccountAuth;
}

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (connectionSettings && connectionSettings.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    // No service account configured and no Replit connector available — on any
    // host other than Replit this is always the former.
    throw new Error(
      'Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or base64 of the service-account key) and share each backup spreadsheet with the service account address as Editor.',
    );
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Google Sheets connection: ${response.status}`);
  }

  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error(
      'Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or base64 of the service-account key) and share each backup spreadsheet with the service account address as Editor.',
    );
  }
  
  return accessToken;
}

// WARNING (connector path): never cache the OAuth2 client - access tokens expire
async function getGoogleSheetsClient() {
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Cast: googleapis' Options type wants GoogleAuth<JSONClient>; the runtime accepts any GoogleAuth
    return google.sheets({ version: 'v4', auth: getServiceAccountAuth() as any });
  }

  const accessToken = await getAccessToken();
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Get connected account email for debugging
export async function getConnectedAccountEmail(): Promise<string | null> {
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      getServiceAccountAuth();
      return serviceAccountEmail;
    } catch (error) {
      console.error('[Google Sheets] Invalid GOOGLE_SERVICE_ACCOUNT_JSON:', error);
      return null;
    }
  }
  try {
    const accessToken = await getAccessToken();
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data.email || null;
    }
    return null;
  } catch (error) {
    console.error('[Google Sheets] Error getting account info:', error);
    return null;
  }
}

// ============================================================================
// Write Data to Google Sheets
// ============================================================================

async function writeToGoogleSheet(
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  rows: (string | number | null)[][]
): Promise<{ success: boolean; rowsWritten: number }> {
  const sheets = await getGoogleSheetsClient();
  
  // Convert all data to strings for the API
  const allData = [
    headers,
    ...rows.map(row => row.map(cell => String(cell ?? '')))
  ];
  
  try {
    // First, verify we can access the spreadsheet (this will fail with 403/404 if not shared)
    console.log(`[Google Sheets] Verifying access to spreadsheet: ${spreadsheetId}`);
    let spreadsheet;
    try {
      spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      console.log(`[Google Sheets] Spreadsheet title: "${spreadsheet.data.properties?.title}"`);
    } catch (accessError: any) {
      const connectedEmail = await getConnectedAccountEmail();
      if (accessError.code === 403 || accessError.message?.includes('403')) {
        throw new Error(`Permission denied. Please share the Google Sheet with: ${connectedEmail || 'the connected Google account'}`);
      }
      if (accessError.code === 404 || accessError.message?.includes('404') || accessError.message?.includes('not found')) {
        throw new Error(`Spreadsheet not found. Please check the Google Sheet URL is correct.`);
      }
      throw accessError;
    }
    
    const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    const safeTabName = tabName.substring(0, 100).replace(/[^\w\s-]/g, '');
    
    // If the tab doesn't exist, create it
    if (!existingTabs.includes(safeTabName)) {
      console.log(`[Google Sheets] Creating new tab: "${safeTabName}"`);
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: safeTabName }
              }
            }]
          }
        });
      } catch (addError: any) {
        // If tab already exists (race condition), just continue
        if (!addError.message?.includes('already exists')) {
          console.error('[Google Sheets] Error creating tab:', addError.message);
        }
      }
    } else {
      console.log(`[Google Sheets] Tab "${safeTabName}" already exists, will update`);
    }
    
    // Clear existing content in the tab
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${safeTabName}'!A:ZZ`,
      });
      console.log(`[Google Sheets] Cleared existing content in tab`);
    } catch (clearError: any) {
      // If sheet is empty, clear might fail - that's ok
      console.log('[Google Sheets] Clear result:', clearError.message);
    }
    
    // Write the data
    console.log(`[Google Sheets] Writing ${allData.length} rows to tab "${safeTabName}"...`);
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${safeTabName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: allData,
      },
    });
    
    // Verify the write by reading back the first row
    const verifyResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${safeTabName}'!A1:E1`,
    });
    
    if (!verifyResult.data.values || verifyResult.data.values.length === 0) {
      throw new Error('Write verification failed - no data found after write');
    }
    
    console.log(`[Google Sheets] Successfully wrote and verified ${allData.length} rows to ${safeTabName}`);
    console.log(`[Google Sheets] First row verification: ${JSON.stringify(verifyResult.data.values[0]?.slice(0, 3))}`);
    
    return { 
      success: true, 
      rowsWritten: rows.length 
    };
    
  } catch (error: any) {
    console.error('[Google Sheets] Write error:', error.message);
    
    // Provide helpful error messages
    if (error.message?.includes('not found') || error.code === 404) {
      throw new Error(`Spreadsheet not found. Please check the Google Sheet URL is correct.`);
    }
    if (error.message?.includes('permission') || error.message?.includes('403') || error.code === 403) {
      const connectedEmail = await getConnectedAccountEmail();
      throw new Error(`Permission denied. Please share the Google Sheet with edit access to: ${connectedEmail || 'the connected Google account'}`);
    }
    if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
      // Reset cached token so next call gets fresh one
      connectionSettings = null;
      throw new Error(`Authentication expired. Please try again or reconnect Google Sheets.`);
    }
    
    throw error;
  }
}

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

function formatDateForSheetLocal(date: Date | string | null | undefined, timezone: string): string {
  return formatDateWithTimezone(date, timezone);
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
  const company = await storage.getCompany(companyId);
  const timezone = getCompanyTimezone(company);
  
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
      formatDateForSheetLocal(lead.created_at, timezone),
      formatDateForSheetLocal(lead.updated_at, timezone),
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
        row.push(formatDateForSheetLocal(update.update_on, timezone));
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
    // Extract the Google Sheet ID from the URL
    const googleSpreadsheetId = extractGoogleSheetId(backupConfig.google_sheet_url);
    if (!googleSpreadsheetId) {
      throw new Error('Invalid Google Sheet URL');
    }
    
    // Prepare the backup data (leads, columns, updates)
    const data = await prepareBackupData(backupConfig.sheet_id, backupConfig.company_id);
    
    // Get the LFS sheet name to use as tab name in Google Sheets
    const sheet = await storage.getSheet(backupConfig.sheet_id);
    const tabName = sheet?.name || 'LFS Backup';
    
    // Log connected account for debugging
    const connectedEmail = await getConnectedAccountEmail();
    console.log(`[Google Sheets] Connected as: ${connectedEmail || 'unknown'}`);
    console.log(`[Google Sheets] Syncing ${data.rows.length} leads to spreadsheet ${googleSpreadsheetId}, tab "${tabName}"`);
    
    // Actually write to Google Sheets
    const writeResult = await writeToGoogleSheet(
      googleSpreadsheetId,
      tabName,
      data.headers,
      data.rows
    );
    
    // Update sync log as successful
    await storage.updateBackupSyncLog(syncLog.id, {
      status: 'completed',
      rows_synced: writeResult.rowsWritten,
      completed_at: new Date(),
    });
    
    // Update backup config with last sync info
    await storage.updateBackupConfig(backupConfig.id, {
      last_sync_at: new Date(),
      last_sync_status: 'success',
      last_sync_rows: writeResult.rowsWritten,
      last_sync_error: null,
    });
    
    console.log(`[Google Sheets] Sync completed successfully: ${writeResult.rowsWritten} rows written`);
    
    return {
      success: true,
      rowsWritten: writeResult.rowsWritten,
      sheetName: tabName,
    };
    
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error(`[Google Sheets] Sync failed:`, errorMessage);
    
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
