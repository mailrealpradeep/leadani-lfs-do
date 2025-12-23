import { storage } from "./storage";

// Feature domain types
type FeatureDomain = 
  | 'lead' 
  | 'powerscore' 
  | 'powerflow'
  | 'targets'
  | 'filters' 
  | 'highlighting' 
  | 'webhooks' 
  | 'permissions'
  | 'autofill'
  | 'validation'
  | 'attendance'
  | 'hotleads'
  | 'customviews'
  | 'sheets'
  | 'users'
  | 'settings'
  | 'general';

type UserRole = 'super_admin' | 'company_admin' | 'user';

interface FeatureManifest {
  domain: FeatureDomain;
  keywords: string[];
  adminOnly: boolean;
  documentation: string;
}

// Feature manifests - defines what each domain needs
const FEATURE_MANIFESTS: FeatureManifest[] = [
  {
    domain: 'lead',
    keywords: ['lead', 'phone', 'mobile', 'duplicate', 'transfer', 'owner', 'assigned'],
    adminOnly: false,
    documentation: `Lead Management: Leads are stored in sheets. Each lead has a phone number (unique within company), owner, and custom fields. Leads can be transferred between users. Duplicate detection prevents same phone number across company. Soft delete moves leads to trash.`
  },
  {
    domain: 'powerscore',
    keywords: ['powerscore', 'points', 'bonus', 'leaderboard', 'approval', 'pending', 'score', 'rank', 'excluded'],
    adminOnly: false,
    documentation: `PowerScore: Gamified points system. Users earn points for actions (login, lead updates, dropdown changes). Some bonuses require admin approval. Multi-sheet users (access to >1 company sheet) are EXCLUDED from earning points and appearing in leaderboard. Daily caps limit points per rule. Rules can target specific dropdown values (e.g., "Converted" triggers 500 points).`
  },
  {
    domain: 'powerflow',
    keywords: ['powerflow', 'pipeline', 'funnel', 'conversion', 'stage', 'analytics'],
    adminOnly: true,
    documentation: `PowerFlow: Pipeline analytics showing lead progression through stages. Counts leads by CURRENT status (not transitions). Shows conversion rates between stages. Period-based filtering available. Multi-sheet users are NOT excluded from PowerFlow counts.`
  },
  {
    domain: 'targets',
    keywords: ['target', 'working target', 'goal', 'metrics', 'performance', 'achievement'],
    adminOnly: false,
    documentation: `Working Targets: Performance tracking with multi-goal targets. Users are assigned targets with specific metrics. Multi-sheet users are excluded from leaderboard rankings. Progress is tracked against defined goals.`
  },
  {
    domain: 'filters',
    keywords: ['filter', 'quick filter', 'saved filter', 'row filter', 'showing zero', 'no leads', 'pending', 'search'],
    adminOnly: false,
    documentation: `Filters: Quick filters (preset status filters), saved row filters (user-created with multiple conditions), and search. Filters apply to visible columns. "Pending" filter shows leads where Lead Status = Pending. Zero results means no leads match the filter conditions.`
  },
  {
    domain: 'highlighting',
    keywords: ['highlight', 'pink', 'color', 'background', 'row color', 'conditional', 'rule'],
    adminOnly: false,
    documentation: `Highlighting Rules: Conditional row coloring based on lead field values. Admins configure rules like "If Lead Status = Lost, show pink background". Rules can have multiple conditions with AND/OR logic. Higher priority rules take precedence.`
  },
  {
    domain: 'webhooks',
    keywords: ['webhook', 'integration', 'api', 'incoming', 'allocation', 'round robin', 'not receiving', 'lead source'],
    adminOnly: true,
    documentation: `Webhooks: External systems send leads via HTTP POST. Configurable field mapping, conditional allocation (based on field values), multi-sheet allocation with weighted round-robin. Duplicate detection can update existing leads or add updates. Webhook logs track all incoming requests.`
  },
  {
    domain: 'permissions',
    keywords: ['permission', 'access', 'can\'t see', 'cannot see', 'role', 'admin', 'sheet access'],
    adminOnly: false,
    documentation: `Permissions: Three roles - Super Admin (all companies), Company Admin (full company access + settings), User (assigned sheets only). Sheet access is explicit - users only see sheets they're assigned to. Personal sheets are private to their owner.`
  },
  {
    domain: 'autofill',
    keywords: ['auto-fill', 'autofill', 'automatic', 'auto fill', 'automatically set', 'trigger'],
    adminOnly: true,
    documentation: `Auto-Fill Rules: Automatically populate fields when conditions are met. Example: When Lead Status = "Visit Scheduled", set Visit Status = "Scheduled". Rules have priority order. Works in Add Lead, Lead Update, and grid editing.`
  },
  {
    domain: 'validation',
    keywords: ['validation', 'required', 'prompt', 'must update', 'validation rule'],
    adminOnly: true,
    documentation: `Validation Rules: Prompt users to update related fields when conditions are met. Example: When changing to "Visit Scheduled", prompt to fill visit date. Multi-condition logic with AND/OR. Enforced on UI, imports, and webhooks.`
  },
  {
    domain: 'attendance',
    keywords: ['attendance', 'check in', 'check out', 'entry', 'exit', 'late', 'working hours'],
    adminOnly: false,
    documentation: `Attendance: Mobile PWA for daily entry/exit tracking. Configurable rules for expected times, grace periods. Late marking if entry after grace period. Location tracking optional.`
  },
  {
    domain: 'hotleads',
    keywords: ['hot lead', 'hot leads', 'priority', 'high value'],
    adminOnly: true,
    documentation: `Hot Leads: Company-wide feature to identify high-value leads based on configurable conditions. Displayed in unified view with real-time updates. Badge shows count in sidebar.`
  },
  {
    domain: 'customviews',
    keywords: ['custom view', 'sidebar', 'menu item', 'view'],
    adminOnly: true,
    documentation: `Custom Views: Configurable sidebar menu items showing filtered leads. Conditions use group-based logic (AND within groups, OR between groups). Customizable icons and badge counts.`
  },
  {
    domain: 'sheets',
    keywords: ['sheet', 'workspace', 'column', 'custom column', 'dropdown', 'field'],
    adminOnly: false,
    documentation: `Sheets: Workspaces containing leads. Each sheet has custom columns (text, dropdown, date, etc.). Dropdown columns have configurable options. Personal sheets are private. Company sheets are shared based on access.`
  },
  {
    domain: 'users',
    keywords: ['user', 'team', 'invite', 'member', 'deactivate'],
    adminOnly: true,
    documentation: `Users: Team members with roles. Invited via email. Can be deactivated (preserves data). Each user can access assigned sheets. Audit trail tracks user actions.`
  },
  {
    domain: 'settings',
    keywords: ['setting', 'configure', 'setup', 'how to', 'enable', 'disable'],
    adminOnly: true,
    documentation: `Settings: Company configuration including timezone, quality check, Google Sheets backup, site visit settings, and more. Accessed via Admin Console.`
  },
  {
    domain: 'general',
    keywords: [],
    adminOnly: false,
    documentation: `Leadani LFS is a multi-tenant lead management system with spreadsheet-like interface, real-time collaboration, and comprehensive reporting.`
  }
];

// Classify the question to identify domain
function classifyQuestion(question: string): { domain: FeatureDomain; intent: 'why' | 'how' | 'what' | 'who' | 'when' } {
  const lowerQ = question.toLowerCase();
  
  // Detect intent
  let intent: 'why' | 'how' | 'what' | 'who' | 'when' = 'what';
  if (lowerQ.startsWith('why') || lowerQ.includes('why ') || lowerQ.includes('reason')) intent = 'why';
  else if (lowerQ.startsWith('how') || lowerQ.includes('how to') || lowerQ.includes('how do')) intent = 'how';
  else if (lowerQ.startsWith('who') || lowerQ.includes('who ')) intent = 'who';
  else if (lowerQ.startsWith('when') || lowerQ.includes('when ')) intent = 'when';
  
  // Find matching domain by keywords
  let bestMatch: FeatureDomain = 'general';
  let maxMatches = 0;
  
  for (const manifest of FEATURE_MANIFESTS) {
    let matches = 0;
    for (const keyword of manifest.keywords) {
      if (lowerQ.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = manifest.domain;
    }
  }
  
  return { domain: bestMatch, intent };
}

// Extract entities from question (phone numbers, names, etc.)
function extractEntities(question: string): { phoneNumbers: string[]; userNames: string[]; sheetNames: string[] } {
  const phoneNumbers: string[] = [];
  const userNames: string[] = [];
  const sheetNames: string[] = [];
  
  // Extract phone numbers (10 digits)
  const phoneRegex = /\b\d{10}\b/g;
  const phones = question.match(phoneRegex);
  if (phones) phoneNumbers.push(...phones);
  
  // Extract quoted strings (potential names)
  const quotedRegex = /"([^"]+)"|'([^']+)'/g;
  let match;
  while ((match = quotedRegex.exec(question)) !== null) {
    const name = match[1] || match[2];
    if (name) userNames.push(name);
  }
  
  return { phoneNumbers, userNames, sheetNames };
}

// Redact PII from context before sending to AI
function redactPII(text: string): string {
  // Redact phone numbers (keep last 4 digits)
  return text.replace(/\b(\d{6})(\d{4})\b/g, 'XXXXXX$2');
}

// Context fetcher functions using existing storage methods
async function fetchLeadContext(companyId: string, phoneNumbers: string[], userRole: UserRole, userId?: string) {
  const context: string[] = [];
  
  for (const phone of phoneNumbers) {
    const lead = await storage.findLeadByMobileNo(companyId, phone);
    if (lead) {
      const sheet = await storage.getSheet(lead.sheet_id);
      const leadAny = lead as any;
      const owner = leadAny.owner_id ? await storage.getUser(leadAny.owner_id) : null;
      
      // Check if user has access (for non-admins)
      if (userRole === 'user' && userId) {
        const userSheets = await storage.getSheetsByUserId(userId);
        if (!userSheets.some((s: { id: string }) => s.id === lead.sheet_id)) {
          context.push(`Lead ${phone}: You don't have access to view this lead's details.`);
          continue;
        }
      }
      
      context.push(`Lead ${phone}:
- Sheet: ${sheet?.name || 'Unknown'}
- Owner: ${owner?.name || 'Unassigned'}
- Status: ${(lead.custom_fields as Record<string, any>)?.lead_status || 'Not set'}
- Created: ${lead.created_at}
- Custom Fields: ${JSON.stringify(lead.custom_fields || {})}`);
      
      // Get recent updates
      const updates = await storage.getLeadUpdates(lead.id);
      if (updates.length > 0) {
        const recent = updates.slice(0, 3);
        context.push(`Recent Updates (last 3):
${recent.map((u: any) => `- ${u.created_at}: ${u.remark || 'No remark'}`).join('\n')}`);
      }
    } else {
      context.push(`Lead ${phone}: Not found in this company.`);
    }
  }
  
  return context.join('\n\n');
}

async function fetchHighlightingContext(companyId: string, phoneNumbers: string[]) {
  const rules = await storage.getHighlightingRules(companyId);
  const context: string[] = [];
  
  context.push(`Highlighting Rules (${rules.length} configured):`);
  for (const rule of rules) {
    const ruleAny = rule as any;
    context.push(`- "${rule.name}": If ${JSON.stringify(rule.conditions)} → Background: ${ruleAny.background_color || 'default'}, Text: ${ruleAny.text_color || 'default'}`);
  }
  
  // If phone number provided, check which rule applies
  for (const phone of phoneNumbers) {
    const lead = await storage.findLeadByMobileNo(companyId, phone);
    if (lead) {
      const customFields = lead.custom_fields as Record<string, any> || {};
      for (const rule of rules.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
        // Check if rule conditions match lead
        let matches = true;
        const conditions = rule.conditions as any[] || [];
        for (const condition of conditions) {
          const fieldValue = customFields[condition.column_key];
          const normalizedValue = typeof fieldValue === 'object' && fieldValue?.value 
            ? fieldValue.value 
            : fieldValue;
          
          if (condition.operator === 'equals' && normalizedValue !== condition.value) {
            matches = false;
          } else if (condition.operator === 'contains' && !String(normalizedValue || '').includes(condition.value)) {
            matches = false;
          }
        }
        if (matches && conditions.length > 0) {
          context.push(`\nLead ${phone} is highlighted with "${rule.name}" rule because: ${JSON.stringify(conditions)}`);
          break;
        }
      }
    }
  }
  
  return context.join('\n');
}

async function fetchPowerScoreContext(companyId: string, userNames: string[], userId?: string) {
  const context: string[] = [];
  
  // Get rules
  const rules = await storage.getPowerScoreRules(companyId);
  context.push(`PowerScore Rules (${rules.length}):`);
  for (const rule of rules.filter(r => r.is_enabled)) {
    const config = rule.config as any;
    context.push(`- ${rule.name}: ${rule.points} points for ${rule.action_type}${config?.to_values ? ` (when value = ${config.to_values.join(' or ')})` : ''}${rule.requires_approval ? ' [REQUIRES APPROVAL]' : ''}`);
  }
  
  // Get multi-sheet users
  const multiSheetUserIds = await storage.getMultiSheetUserIds(companyId);
  context.push(`\nMulti-sheet users (excluded from PowerScore): ${multiSheetUserIds.length} users`);
  
  // If user ID provided, check their status
  if (userId) {
    const isMultiSheet = multiSheetUserIds.includes(userId);
    const user = await storage.getUser(userId);
    context.push(`\n${user?.name || 'User'} is ${isMultiSheet ? 'EXCLUDED (multi-sheet user)' : 'INCLUDED (single-sheet user)'} from PowerScore.`);
    
    // Get pending approvals for this user
    const pendingApprovals = await storage.getPendingApprovalsByLeadId('');
    // Note: This returns empty since we don't have a leadId - the actual method checks by lead
    if (pendingApprovals.length > 0) {
      context.push(`\nPending approvals: ${pendingApprovals.length}`);
    }
  }
  
  return context.join('\n');
}

async function fetchFilterContext(companyId: string, userId?: string) {
  const context: string[] = [];
  
  // Explain quick filters
  context.push(`Quick Filters: Preset filters based on Lead Status field. "Pending" shows leads where lead_status = "Pending". Zero results means no leads currently have that status.`);
  context.push(`\nSaved Row Filters: Users can create and save custom filters with multiple conditions. These persist across sessions.`);
  
  return context.join('\n');
}

async function fetchWebhookContext(companyId: string) {
  const context: string[] = [];
  
  const webhooks = await storage.getCompanyWebhooksByCompanyId(companyId);
  context.push(`Webhooks (${webhooks.length}):`);
  for (const webhook of webhooks) {
    const webhookAny = webhook as any;
    context.push(`- ${webhook.name}: ${webhookAny.is_active || webhookAny.enabled ? 'ENABLED' : 'DISABLED'}`);
    if (webhookAny.allocation_config || webhookAny.allocation_counts) {
      const config = webhookAny.allocation_config || webhookAny.allocation_counts || {};
      context.push(`  Allocation: ${config.type || 'configured'}`);
    }
  }
  
  // Get recent webhook logs
  const allLogs = await storage.getWebhookLogs(companyId);
  if (allLogs.length > 0) {
    const recentLogs = allLogs.slice(0, 10);
    context.push(`\nRecent Webhook Activity (last 10):`);
    for (const log of recentLogs) {
      const logAny = log as any;
      context.push(`- ${log.created_at}: ${log.status} - ${logAny.response_message || logAny.error || 'Processed'}`);
    }
  }
  
  return context.join('\n');
}

async function fetchPermissionContext(companyId: string, userNames: string[]) {
  const context: string[] = [];
  
  // Get company users
  const users = await storage.getUsersByCompanyId(companyId);
  context.push(`Company Users (${users.length}):`);
  for (const user of users.slice(0, 20)) { // Limit to first 20
    const userSheets = await storage.getSheetsByUserId(user.id);
    context.push(`- ${user.name} (${user.role}): Access to ${userSheets.length} sheets`);
  }
  
  return context.join('\n');
}

async function fetchCompanySettings(companyId: string) {
  const company = await storage.getCompany(companyId);
  const settings = company?.settings as any || {};
  
  return `Company Settings:
- Timezone: ${(company as any)?.timezone || 'Not set'}
- Quality Check: ${settings.quality_check_settings?.enabled ? 'Enabled' : 'Disabled'}
- Google Sheets Backup: ${settings.google_sheets_backup?.enabled ? 'Enabled' : 'Disabled'}`;
}

// Main function to gather context based on domain
async function gatherContext(
  domain: FeatureDomain,
  companyId: string,
  entities: { phoneNumbers: string[]; userNames: string[]; sheetNames: string[] },
  userRole: UserRole,
  userId?: string
): Promise<{ context: string; blockedByRole: boolean }> {
  const manifest = FEATURE_MANIFESTS.find(m => m.domain === domain) || FEATURE_MANIFESTS.find(m => m.domain === 'general')!;
  const contextParts: string[] = [];
  
  // SECURITY: Block admin-only domains for regular users
  if (manifest.adminOnly && userRole === 'user') {
    return {
      context: `${manifest.documentation}\n\nNote: Detailed information about this feature is only available to admins. Please contact your admin for more details.`,
      blockedByRole: true
    };
  }
  
  // Add feature documentation
  contextParts.push(`=== Feature Documentation ===\n${manifest.documentation}`);
  
  // Fetch context based on domain
  try {
    switch (domain) {
      case 'lead':
      case 'highlighting':
        if (entities.phoneNumbers.length > 0) {
          contextParts.push(`\n=== Lead Data ===\n${await fetchLeadContext(companyId, entities.phoneNumbers, userRole, userId)}`);
        }
        if (domain === 'highlighting') {
          contextParts.push(`\n=== Highlighting Rules ===\n${await fetchHighlightingContext(companyId, entities.phoneNumbers)}`);
        }
        break;
        
      case 'powerscore':
        contextParts.push(`\n=== PowerScore Data ===\n${await fetchPowerScoreContext(companyId, entities.userNames, userId)}`);
        break;
        
      case 'filters':
        contextParts.push(`\n=== Filter Data ===\n${await fetchFilterContext(companyId, userId)}`);
        break;
        
      case 'webhooks':
        contextParts.push(`\n=== Webhook Data ===\n${await fetchWebhookContext(companyId)}`);
        break;
        
      case 'permissions':
        contextParts.push(`\n=== Permission Data ===\n${await fetchPermissionContext(companyId, entities.userNames)}`);
        break;
        
      case 'settings':
        contextParts.push(`\n=== Company Settings ===\n${await fetchCompanySettings(companyId)}`);
        break;
        
      default:
        // General context
        contextParts.push(`\n=== Company Info ===\n${await fetchCompanySettings(companyId)}`);
    }
  } catch (error) {
    console.error('Error fetching context:', error);
    contextParts.push('\n=== Note: Some context could not be loaded ===');
  }
  
  return { context: contextParts.join('\n'), blockedByRole: false };
}

// Call Sarvam AI
async function callSarvamAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Sarvam API error:', error);
      return 'Sorry, I could not process your question right now. Please try again.';
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Sarvam AI call failed:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

// Get Sarvam API key for company (server-side only, never exposed)
async function getSarvamApiKey(companyId: string): Promise<string | null> {
  const company = await storage.getCompany(companyId);
  const settings = company?.settings as any;
  return settings?.quality_check_settings?.sarvam_api_key || process.env.SARVAM_API_KEY || null;
}

// Main Insta Support function
export async function processInstaSupportQuery(
  question: string,
  companyId: string,
  userId: string,
  userRole: UserRole
): Promise<{ answer: string; domain: FeatureDomain; intent: string; error?: string }> {
  // Get API key securely on server-side
  const sarvamApiKey = await getSarvamApiKey(companyId);
  if (!sarvamApiKey) {
    return {
      answer: 'Insta Support is not configured. Please ask your admin to add a Sarvam AI API key in Quality Check Settings.',
      domain: 'general',
      intent: 'what',
      error: 'NO_API_KEY'
    };
  }
  
  // 1. Classify the question
  const { domain, intent } = classifyQuestion(question);
  
  // 2. Extract entities
  const entities = extractEntities(question);
  
  // 3. Gather context (with role-based access control)
  const { context, blockedByRole } = await gatherContext(domain, companyId, entities, userRole, userId);
  
  // If blocked by role, return limited response without calling AI
  if (blockedByRole) {
    return {
      answer: context, // Contains the limited documentation + access denied message
      domain,
      intent,
      error: 'ADMIN_ONLY'
    };
  }
  
  // 4. Redact PII
  const redactedContext = redactPII(context);
  const redactedQuestion = redactPII(question);
  
  // 5. Build prompts
  const systemPrompt = `You are Insta Support, an AI assistant for Leadani LFS - a lead management system. 
You help ${userRole === 'user' ? 'users' : 'admins'} understand how the system works and why things happen.

Your role:
- Answer questions clearly in simple language
- Explain system behavior based on configured rules and data
- If you don't have enough information, say so
- Keep responses concise but complete
- Support Hindi, English, and regional Indian languages based on the question language

Current context from the system:
${redactedContext}`;

  const userPrompt = `Question: ${redactedQuestion}

Based on the context provided, please answer this question. If the answer involves configured rules, explain which specific rule is causing the behavior.`;

  // 6. Call Sarvam AI
  const answer = await callSarvamAI(systemPrompt, userPrompt, sarvamApiKey);
  
  return { answer, domain, intent };
}
