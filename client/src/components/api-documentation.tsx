import { useState, useRef } from "react";
import { 
  Code, 
  Copy, 
  Check, 
  Download,
  Key,
  Phone,
  PhoneCall,
  Upload,
  Link2,
  User,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Lock,
  Globe,
  Smartphone,
  Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  auth: boolean;
  adminOnly?: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example?: { request?: string; response: string };
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
};

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/login",
    title: "User Authentication",
    description: "Authenticate user and receive JWT token for API access. Token expires in 7 days.",
    auth: false,
    body: [
      { name: "email", type: "string", required: true, description: "User's email address" },
      { name: "password", type: "string", required: true, description: "User's password" },
    ],
    response: "{ token: string, user: { id, name, email, role, company_id } }",
    example: {
      request: `{
  "email": "user@company.com",
  "password": "your-password"
}`,
      response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "user@company.com",
    "role": "user",
    "company_id": "company-uuid"
  }
}`
    }
  },
  {
    method: "GET",
    path: "/api/mobile/call-lookup",
    title: "Call Lookup (Truecaller-style)",
    description: "Look up leads by phone number during incoming/outgoing calls. Returns matching leads from all accessible sheets. Supports partial number matching.",
    auth: true,
    params: [
      { name: "phone", type: "string", required: true, description: "Phone number to look up (any format - will be normalized)" },
    ],
    response: "{ matches: Lead[], matched_count: number, phone_normalized: string }",
    example: {
      response: `{
  "matches": [
    {
      "lead_id": "lead-uuid",
      "sheet_id": "sheet-uuid",
      "sheet_name": "Sales Leads",
      "full_name": "Jane Smith",
      "mobile_no": "9876543210",
      "custom_fields": { ... },
      "owner_name": "John Doe"
    }
  ],
  "matched_count": 1,
  "phone_normalized": "9876543210"
}`
    }
  },
  {
    method: "POST",
    path: "/api/mobile/call-sessions",
    title: "Log Call Session",
    description: "Create a record of a phone call (incoming or outgoing). Auto-matches to a lead if single match found. Use this after each call ends.",
    auth: true,
    body: [
      { name: "phone_number", type: "string", required: true, description: "The phone number called/received" },
      { name: "direction", type: "string", required: true, description: "'incoming' or 'outgoing'" },
      { name: "lead_id", type: "string", required: false, description: "Optional - Link to specific lead (auto-matched if not provided)" },
      { name: "started_at", type: "ISO string", required: false, description: "Call start timestamp" },
      { name: "ended_at", type: "ISO string", required: false, description: "Call end timestamp" },
      { name: "duration_seconds", type: "number", required: false, description: "Call duration in seconds" },
      { name: "status", type: "string", required: false, description: "'completed', 'missed', 'declined', 'no_answer'" },
      { name: "notes", type: "string", required: false, description: "Any notes about the call" },
    ],
    response: "{ call_session: CallSession, auto_matched: boolean, matched_lead?: Lead }",
    example: {
      request: `{
  "phone_number": "9876543210",
  "direction": "outgoing",
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": "2025-01-15T10:35:00Z",
  "duration_seconds": 300,
  "status": "completed",
  "notes": "Discussed pricing options"
}`,
      response: `{
  "call_session": {
    "id": "session-uuid",
    "phone_number": "9876543210",
    "direction": "outgoing",
    "lead_id": "lead-uuid",
    "duration_seconds": 300,
    "status": "completed"
  },
  "auto_matched": true,
  "matched_lead": {
    "id": "lead-uuid",
    "custom_fields": { "full_name": "Jane Smith" }
  }
}`
    }
  },
  {
    method: "GET",
    path: "/api/mobile/call-sessions/:id",
    title: "Get Call Session",
    description: "Retrieve details of a specific call session by ID.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Call session ID (UUID)" },
    ],
    response: "CallSession object",
    example: {
      response: `{
  "id": "session-uuid",
  "company_id": "company-uuid",
  "user_id": "user-uuid",
  "phone_number": "9876543210",
  "direction": "incoming",
  "lead_id": "lead-uuid",
  "sheet_id": "sheet-uuid",
  "caller_number": "9876543210",
  "callee_number": "user",
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": "2025-01-15T10:35:00Z",
  "duration_seconds": 300,
  "status": "completed",
  "recording_url": null,
  "notes": "Follow up required"
}`
    }
  },
  {
    method: "POST",
    path: "/api/mobile/call-sessions/:id/recording",
    title: "Upload Call Recording",
    description: "Upload a call recording (audio file) for a specific call session. Recording is stored securely and linked to the session.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Call session ID (UUID)" },
    ],
    body: [
      { name: "recording_data", type: "string", required: true, description: "Base64 encoded audio data" },
      { name: "filename", type: "string", required: false, description: "Optional filename (e.g., 'call_recording.wav')" },
    ],
    response: "{ call_session: CallSession, recording_url: string }",
    example: {
      request: `{
  "recording_data": "UklGRiQA...(base64 audio data)",
  "filename": "call_2025-01-15_103000.wav"
}`,
      response: `{
  "call_session": {
    "id": "session-uuid",
    "recording_url": "https://storage.example.com/recordings/call_uuid.wav"
  },
  "recording_url": "https://storage.example.com/recordings/call_uuid.wav"
}`
    }
  },
  {
    method: "POST",
    path: "/api/mobile/call-sessions/:id/link-lead",
    title: "Link Call to Lead",
    description: "Manually link a call session to a specific lead. Use when auto-matching failed or user needs to select from multiple matches.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Call session ID (UUID)" },
    ],
    body: [
      { name: "lead_id", type: "string", required: true, description: "Lead ID to link to" },
    ],
    response: "Updated CallSession object",
    example: {
      request: `{
  "lead_id": "lead-uuid-to-link"
}`,
      response: `{
  "id": "session-uuid",
  "lead_id": "lead-uuid-to-link",
  "sheet_id": "sheet-uuid",
  "linked_at": "2025-01-15T10:40:00Z"
}`
    }
  },
  {
    method: "GET",
    path: "/api/mobile/leads/:id",
    title: "Get Lead Details",
    description: "Get complete lead details including update history and call sessions. Ideal for showing lead details screen in mobile app.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Lead ID (UUID)" },
    ],
    response: "{ lead: Lead, sheet_name: string, owner_name: string, lead_updates: LeadUpdate[], call_sessions: CallSession[] }",
    example: {
      response: `{
  "lead": {
    "id": "lead-uuid",
    "sheet_id": "sheet-uuid",
    "owner_user_id": "user-uuid",
    "custom_fields": {
      "full_name": "Jane Smith",
      "mobile_no": "9876543210",
      "email": "jane@example.com"
    },
    "created_at": "2025-01-10T09:00:00Z"
  },
  "sheet_name": "Sales Leads",
  "owner_name": "John Doe",
  "lead_updates": [
    {
      "id": "update-uuid",
      "remark": "Called, will follow up tomorrow",
      "update_via": "call",
      "update_on": "2025-01-15T10:35:00Z"
    }
  ],
  "call_sessions": [
    {
      "id": "session-uuid",
      "direction": "outgoing",
      "duration_seconds": 300,
      "status": "completed"
    }
  ]
}`
    }
  },
  {
    method: "PATCH",
    path: "/api/mobile/leads/:id",
    title: "Update Lead Fields",
    description: "Quick update to lead's custom fields from mobile app. Automatically creates a lead update entry and triggers outgoing webhooks.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Lead ID (UUID)" },
    ],
    body: [
      { name: "custom_fields", type: "object", required: true, description: "Key-value pairs of fields to update" },
      { name: "update_note", type: "string", required: false, description: "Optional note about the update" },
    ],
    response: "{ lead: Lead, lead_update: LeadUpdate }",
    example: {
      request: `{
  "custom_fields": {
    "lead_status": "Interested",
    "next_follow_up_date_time": "2025-01-20T14:00:00Z"
  },
  "update_note": "Customer interested in premium package"
}`,
      response: `{
  "lead": {
    "id": "lead-uuid",
    "custom_fields": {
      "full_name": "Jane Smith",
      "lead_status": "Interested",
      "next_follow_up_date_time": "2025-01-20T14:00:00Z"
    }
  },
  "lead_update": {
    "id": "update-uuid",
    "remark": "lead_status: New → Interested; Customer interested in premium package",
    "update_via": "call"
  }
}`
    }
  },
  {
    method: "POST",
    path: "/api/mobile/leads/:id/quick-update",
    title: "Add Quick Note",
    description: "Add a quick remark/note to a lead without changing any fields. Perfect for post-call notes.",
    auth: true,
    params: [
      { name: "id", type: "string", required: true, description: "Lead ID (UUID)" },
    ],
    body: [
      { name: "note", type: "string", required: true, description: "The note/remark to add" },
      { name: "update_type", type: "string", required: false, description: "Type of update (default: 'call')" },
    ],
    response: "LeadUpdate object",
    example: {
      request: `{
  "note": "Customer requested callback after 5 PM"
}`,
      response: `{
  "id": "update-uuid",
  "lead_id": "lead-uuid",
  "remark": "Customer requested callback after 5 PM",
  "update_via": "call",
  "update_on": "2025-01-15T10:36:00Z",
  "created_by_user_id": "user-uuid"
}`
    }
  },
  {
    method: "GET",
    path: "/api/mobile/user-call-sessions",
    title: "Get User's Call History",
    description: "Get recent call sessions for the authenticated user. Sorted by most recent first.",
    auth: true,
    params: [
      { name: "limit", type: "number", required: false, description: "Number of records (default: 50, max: 100)" },
    ],
    response: "CallSession[] with lead info",
    example: {
      response: `[
  {
    "id": "session-uuid",
    "phone_number": "9876543210",
    "direction": "outgoing",
    "duration_seconds": 300,
    "status": "completed",
    "lead_name": "Jane Smith",
    "sheet_name": "Sales Leads",
    "created_at": "2025-01-15T10:30:00Z"
  }
]`
    }
  },
  {
    method: "POST",
    path: "/api/mobile/sync-phone-index",
    title: "Rebuild Phone Index",
    description: "Admin-only endpoint to rebuild the phone number index for faster call lookups. Run after bulk imports.",
    auth: true,
    adminOnly: true,
    response: "{ success: boolean, message: string, processed_leads: number, indexed_phones: number }",
    example: {
      response: `{
  "success": true,
  "message": "Rebuilt phone index: 1500 leads processed, 1480 phone numbers indexed",
  "processed_leads": 1500,
  "indexed_phones": 1480
}`
    }
  },
];

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 rounded-md p-3 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate py-3">
            <div className="flex items-center gap-3">
              <Badge className={`${methodColors[endpoint.method]} font-mono text-xs px-2`}>
                {endpoint.method}
              </Badge>
              <code className="text-sm font-mono flex-1">{endpoint.path}</code>
              {endpoint.adminOnly && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <CardDescription className="mt-1">{endpoint.title}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
            
            {endpoint.params && endpoint.params.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Query/Path Parameters</h4>
                <div className="space-y-1">
                  {endpoint.params.map((param) => (
                    <div key={param.name} className="flex items-start gap-2 text-sm">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{param.name}</code>
                      <span className="text-muted-foreground text-xs">{param.type}</span>
                      {param.required && <Badge variant="outline" className="text-xs py-0 h-5">Required</Badge>}
                      <span className="text-muted-foreground text-xs flex-1">{param.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {endpoint.body && endpoint.body.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Request Body</h4>
                <div className="space-y-1">
                  {endpoint.body.map((field) => (
                    <div key={field.name} className="flex items-start gap-2 text-sm">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{field.name}</code>
                      <span className="text-muted-foreground text-xs">{field.type}</span>
                      {field.required && <Badge variant="outline" className="text-xs py-0 h-5">Required</Badge>}
                      <span className="text-muted-foreground text-xs flex-1">{field.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2">Response</h4>
              <code className="text-xs text-muted-foreground">{endpoint.response}</code>
            </div>

            {endpoint.example && (
              <div className="space-y-3">
                {endpoint.example.request && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Example Request</h4>
                    <CodeBlock code={endpoint.example.request} />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium mb-2">Example Response</h4>
                  <CodeBlock code={endpoint.example.response} />
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ApiDocumentation() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const pdfContent = generatePdfContent();
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const generatePdfContent = () => {
    const baseUrl = window.location.origin;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LeadAni LFS - Mobile API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #0f172a; }
    h2 { font-size: 20px; margin: 32px 0 16px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h3 { font-size: 16px; margin: 24px 0 12px; color: #334155; }
    h4 { font-size: 14px; margin: 16px 0 8px; color: #475569; }
    p { margin-bottom: 12px; color: #475569; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .endpoint { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; font-weight: 600; margin-right: 8px; }
    .method-get { background: #d1fae5; color: #047857; }
    .method-post { background: #dbeafe; color: #1d4ed8; }
    .method-patch { background: #fef3c7; color: #b45309; }
    .method-delete { background: #fee2e2; color: #dc2626; }
    .path { font-family: monospace; font-size: 13px; }
    .badge { display: inline-block; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 11px; color: #64748b; margin-left: 8px; }
    code { font-family: 'SF Mono', Monaco, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 8px 0; }
    .params { margin: 12px 0; }
    .param { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
    .param code { background: #e2e8f0; }
    .required { color: #dc2626; font-size: 11px; }
    .section { margin-bottom: 32px; }
    .auth-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
    @media print {
      body { padding: 20px; }
      .endpoint { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>LeadAni LFS - Mobile API Documentation</h1>
  <p class="subtitle">Base URL: ${baseUrl}/api</p>
  
  <div class="section">
    <h2>Authentication</h2>
    <p>All API requests (except login) require a Bearer token in the Authorization header:</p>
    <pre>Authorization: Bearer eyJhbGciOiJIUzI1NiIs...</pre>
    <p>Obtain the token by calling the login endpoint. Token expires in 7 days.</p>
  </div>

  <div class="section">
    <h2>Endpoints</h2>
    
    ${endpoints.map(ep => `
    <div class="endpoint">
      <div style="margin-bottom: 8px;">
        <span class="method method-${ep.method.toLowerCase()}">${ep.method}</span>
        <span class="path">${ep.path}</span>
        ${ep.adminOnly ? '<span class="badge">Admin Only</span>' : ''}
      </div>
      <h3>${ep.title}</h3>
      <p>${ep.description}</p>
      
      ${ep.params ? `
      <h4>Parameters</h4>
      <div class="params">
        ${ep.params.map(p => `
        <div class="param">
          <code>${p.name}</code>
          <span>${p.type}</span>
          ${p.required ? '<span class="required">required</span>' : ''}
          <span>${p.description}</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${ep.body ? `
      <h4>Request Body</h4>
      <div class="params">
        ${ep.body.map(b => `
        <div class="param">
          <code>${b.name}</code>
          <span>${b.type}</span>
          ${b.required ? '<span class="required">required</span>' : ''}
          <span>${b.description}</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <h4>Response</h4>
      <p><code>${ep.response}</code></p>
      
      ${ep.example ? `
      ${ep.example.request ? `
      <h4>Example Request</h4>
      <pre>${ep.example.request}</pre>
      ` : ''}
      <h4>Example Response</h4>
      <pre>${ep.example.response}</pre>
      ` : ''}
    </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Error Codes</h2>
    <div class="params">
      <div class="param"><code>400</code> Bad Request - Missing or invalid parameters</div>
      <div class="param"><code>401</code> Unauthorized - Invalid or expired token</div>
      <div class="param"><code>403</code> Forbidden - Access denied (wrong company or role)</div>
      <div class="param"><code>404</code> Not Found - Resource doesn't exist</div>
      <div class="param"><code>500</code> Server Error - Something went wrong</div>
    </div>
  </div>

  <div class="section">
    <h2>Integration Workflow</h2>
    <ol style="padding-left: 20px; color: #475569;">
      <li>Call <code>/api/login</code> to get JWT token</li>
      <li>When phone rings, call <code>/api/mobile/call-lookup</code> with the number</li>
      <li>Display lead info if found, or "Unknown Caller"</li>
      <li>After call ends, call <code>/api/mobile/call-sessions</code> to log it</li>
      <li>If user adds notes, call <code>/api/mobile/leads/:id/quick-update</code></li>
      <li>If recording available, upload via <code>/api/mobile/call-sessions/:id/recording</code></li>
    </ol>
  </div>

  <p style="margin-top: 40px; color: #94a3b8; font-size: 12px; text-align: center;">
    Generated on ${new Date().toLocaleDateString()} | LeadAni LFS v1.0
  </p>
</body>
</html>`;
  };

  return (
    <div className="space-y-6" ref={contentRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            Mobile API Documentation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            REST API endpoints for mobile app integration
          </p>
        </div>
        <Button 
          onClick={handleDownloadPdf} 
          disabled={downloadingPdf}
          data-testid="button-download-api-docs"
        >
          {downloadingPdf ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download PDF
        </Button>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints" data-testid="tab-endpoints">
            <Server className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="quickstart" data-testid="tab-quickstart">
            <Smartphone className="h-4 w-4 mr-2" />
            Quick Start
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <FileText className="h-4 w-4 mr-2" />
            Error Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-3">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Authentication Required</CardTitle>
              </div>
              <CardDescription>
                All endpoints (except /api/login) require: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization: Bearer YOUR_TOKEN</code>
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            {endpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quickstart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Base URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`${window.location.origin}/api`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Step 1: Get Auth Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Call the login endpoint to get a JWT token that's valid for 7 days.
              </p>
              <CodeBlock code={`curl -X POST ${window.location.origin}/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@company.com", "password": "your-password"}'`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Step 2: Caller ID Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                When a call comes in, look up the number to display lead info (Truecaller-style).
              </p>
              <CodeBlock code={`curl ${window.location.origin}/api/mobile/call-lookup?phone=9876543210 \\
  -H "Authorization: Bearer YOUR_TOKEN"`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Step 3: Log Call Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                After each call ends, log it to track call history and link to leads.
              </p>
              <CodeBlock code={`curl -X POST ${window.location.origin}/api/mobile/call-sessions \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone_number": "9876543210",
    "direction": "outgoing",
    "duration_seconds": 180,
    "status": "completed"
  }'`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Step 4: Add Notes (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add quick notes to leads after calls.
              </p>
              <CodeBlock code={`curl -X POST ${window.location.origin}/api/mobile/leads/LEAD_ID/quick-update \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"note": "Customer interested in premium package"}'`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HTTP Status Codes</CardTitle>
              <CardDescription>Standard error responses from the API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="outline" className="font-mono">200</Badge>
                  <div>
                    <p className="font-medium text-sm">OK</p>
                    <p className="text-xs text-muted-foreground">Request successful</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="outline" className="font-mono">201</Badge>
                  <div>
                    <p className="font-medium text-sm">Created</p>
                    <p className="text-xs text-muted-foreground">Resource created successfully</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="destructive" className="font-mono">400</Badge>
                  <div>
                    <p className="font-medium text-sm">Bad Request</p>
                    <p className="text-xs text-muted-foreground">Missing required parameters or invalid format</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="destructive" className="font-mono">401</Badge>
                  <div>
                    <p className="font-medium text-sm">Unauthorized</p>
                    <p className="text-xs text-muted-foreground">Missing or invalid authentication token</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="destructive" className="font-mono">403</Badge>
                  <div>
                    <p className="font-medium text-sm">Forbidden</p>
                    <p className="text-xs text-muted-foreground">Access denied - wrong company, role, or permissions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="destructive" className="font-mono">404</Badge>
                  <div>
                    <p className="font-medium text-sm">Not Found</p>
                    <p className="text-xs text-muted-foreground">Requested resource doesn't exist</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Badge variant="destructive" className="font-mono">500</Badge>
                  <div>
                    <p className="font-medium text-sm">Server Error</p>
                    <p className="text-xs text-muted-foreground">Something went wrong on our end</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Response Format</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "error": "Description of what went wrong"
}`} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
