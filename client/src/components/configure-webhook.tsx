import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle, Check, X, ChevronDown, Eye, Clock, ChevronUp, Search, Filter, AlertTriangle, GitMerge, XCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CompanyWebhook, Sheet, Lead } from "@shared/schema";

// Duplicate lead info interface
interface DuplicateLeadInfo {
  id: string;
  sheet_id: string;
  sheet_name: string;
  custom_fields: Record<string, any>;
  created_at: string;
  owner_user_id: string;
}

// Interface for extracted webhook fields with friendly display
interface ExtractedWebhookField {
  path: string;       // The actual path to use (e.g., "user.name" or "fields.0.value")
  label: string;      // Friendly display name (e.g., "Name")
  sampleValue: string; // Sample value for preview
  fieldType: 'value' | 'metadata'; // 'value' = actual user data, 'metadata' = technical fields like type, key
}

// Metadata field keys that should be hidden in "Values Only" mode
const METADATA_KEYS = ['type', 'key', 'description', 'custom_key', 'id', '_id', 'field_type', 'fieldType'];

// Universal webhook field extraction - handles ANY response type
function extractWebhookFields(payload: any, prefix = "", depth = 0, isMetadataContext = false): ExtractedWebhookField[] {
  const fields: ExtractedWebhookField[] = [];
  const MAX_DEPTH = 10; // Prevent infinite recursion
  
  if (depth > MAX_DEPTH) {
    return fields;
  }
  
  // Handle null/undefined
  if (payload === null || payload === undefined) {
    return fields;
  }
  
  // Handle root-level primitives (string, number, boolean)
  if (typeof payload !== "object") {
    const value = truncateValue(payload);
    if (value) {
      const lastKey = prefix.split(".").pop() || "value";
      const isMetadata = isMetadataContext || METADATA_KEYS.includes(lastKey.toLowerCase());
      fields.push({
        path: prefix || "value",
        label: prefix ? formatLabel(lastKey) : "Response Value",
        sampleValue: value,
        fieldType: isMetadata ? 'metadata' : 'value'
      });
    }
    return fields;
  }

  // Handle arrays - works for root-level arrays or nested arrays
  if (Array.isArray(payload)) {
    // Process all items - no artificial limit
    const maxItems = payload.length;
    
    for (let index = 0; index < maxItems; index++) {
      const item = payload[index];
      const itemPath = prefix ? `${prefix}.${index}` : `${index}`;
      
      if (item === null || item === undefined) {
        continue;
      }
      
      // Primitive value in array
      if (typeof item !== "object") {
        const value = truncateValue(item);
        if (value) {
          fields.push({
            path: itemPath,
            label: prefix ? `${formatLabel(prefix.split(".").pop() || "Item")} ${index + 1}` : `Item ${index + 1}`,
            sampleValue: value,
            fieldType: 'value'
          });
        }
        continue;
      }
      
      // Object in array - check for common patterns
      if (!Array.isArray(item)) {
        // Pattern 1: Form fields with title/label/name + value
        const titleKey = findTitleKey(item);
        const valueKey = findValueKey(item);
        
        if (titleKey && valueKey && item[valueKey] !== undefined) {
          const fieldLabel = String(item[titleKey] || `Field ${index + 1}`);
          const sampleValue = truncateValue(item[valueKey]);
          
          if (sampleValue) {
            // This is the actual user-entered VALUE - mark as 'value'
            fields.push({
              path: `${itemPath}.${valueKey}`,
              label: fieldLabel,
              sampleValue,
              fieldType: 'value'
            });
            
            // Key-based access is metadata (duplicate access method)
            if (item.key && typeof item.key === "string") {
              fields.push({
                path: item.key,
                label: `${fieldLabel} (by key)`,
                sampleValue,
                fieldType: 'metadata'
              });
            }
          }
          // Extract other fields from this object as METADATA (type, description, etc.)
          for (const [key, val] of Object.entries(item)) {
            if (key !== titleKey && key !== valueKey && key !== "key") {
              // These are metadata fields within form field objects
              fields.push(...extractWebhookFields(val, `${itemPath}.${key}`, depth + 1, true));
            }
          }
        } else {
          // Regular object - recurse into all fields (maintain current context)
          fields.push(...extractWebhookFields(item, itemPath, depth + 1, isMetadataContext));
        }
      } else {
        // Nested array - recurse
        fields.push(...extractWebhookFields(item, itemPath, depth + 1, isMetadataContext));
      }
    }
    
    return fields;
  }

  // Handle objects
  for (const [key, value] of Object.entries(payload)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const isMetadataKey = METADATA_KEYS.includes(key.toLowerCase());
    
    if (value === null || value === undefined) {
      continue;
    }
    
    if (typeof value !== "object") {
      // Simple value - add as field
      const sampleValue = truncateValue(value);
      if (sampleValue) {
        fields.push({
          path: fieldPath,
          label: formatLabel(key),
          sampleValue,
          fieldType: isMetadataContext || isMetadataKey ? 'metadata' : 'value'
        });
      }
    } else if (Array.isArray(value)) {
      // Array - recurse (pass metadata context for nested arrays)
      fields.push(...extractWebhookFields(value, fieldPath, depth + 1, isMetadataContext || isMetadataKey));
    } else {
      // Nested object - recurse
      fields.push(...extractWebhookFields(value, fieldPath, depth + 1, isMetadataContext || isMetadataKey));
    }
  }

  return fields;
}

// Helper: Find a title-like key in an object
function findTitleKey(obj: Record<string, any>): string | null {
  const titleKeys = ["title", "label", "name", "field_name", "fieldName", "question", "header"];
  for (const key of titleKeys) {
    if (key in obj && typeof obj[key] === "string" && obj[key].trim()) {
      return key;
    }
  }
  return null;
}

// Helper: Find a value-like key in an object
function findValueKey(obj: Record<string, any>): string | null {
  const valueKeys = ["value", "answer", "response", "data", "content", "text"];
  for (const key of valueKeys) {
    if (key in obj) {
      return key;
    }
  }
  return null;
}

// Aggregate fields from multiple webhook payloads and deduplicate
// Accepts ANY payload type: object, array, string, number, boolean, null
function aggregateWebhookFields(requests: Array<{ payload: any; created_at?: string }>): ExtractedWebhookField[] {
  const seenPaths = new Set<string>();
  const allFields: ExtractedWebhookField[] = [];
  
  // Sort by created_at descending (most recent first) then take first 5
  const sortedRequests = [...requests]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Descending
    })
    .slice(0, 5);
  
  // First pass: collect all fields with unique paths that have meaningful labels/values
  for (const request of sortedRequests) {
    // Handle any payload type (null/undefined will return empty array from extractWebhookFields)
    const payload = request.payload;
    if (payload !== null && payload !== undefined) {
      const fields = extractWebhookFields(payload);
      for (const field of fields) {
        // Skip info fields (like truncation notices)
        if (field.path.endsWith("._info")) {
          continue;
        }
        // Skip fields with non-meaningful labels or empty sample values
        if (!isMeaningfulLabel(field.label) || !field.sampleValue.trim()) {
          continue;
        }
        
        if (!seenPaths.has(field.path)) {
          seenPaths.add(field.path);
          allFields.push(field);
        }
      }
    }
  }
  
  // Second pass: detect duplicate labels using normalized comparison
  const labelCounts = new Map<string, number>();
  for (const field of allFields) {
    const normalized = normalizeLabel(field.label);
    labelCounts.set(normalized, (labelCounts.get(normalized) || 0) + 1);
  }
  
  // Add friendly path suffix to any label that appears more than once (all duplicates get the suffix)
  return allFields.map(field => {
    const normalized = normalizeLabel(field.label);
    if ((labelCounts.get(normalized) || 0) > 1) {
      return {
        ...field,
        label: `${field.label} (${formatPathSuffix(field.path)})`
      };
    }
    return field;
  });
}

// Format a key into a readable label
function formatLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

// Check if a label is meaningful (not empty, not object serialization, etc.)
function isMeaningfulLabel(label: string): boolean {
  if (!label) return false;
  
  // Normalize: trim and collapse internal whitespace
  const normalized = label.trim().replace(/\s+/g, " ");
  
  if (!normalized) return false;
  
  // Reject serialized object/function representations
  const unusablePatterns = [
    /^\[object\s+\w+\]$/i,  // [object Object], [object Array], etc.
    /^function\s*\(/i,      // function() declarations
    /^null$/i,
    /^undefined$/i,
    /^NaN$/i,
  ];
  
  for (const pattern of unusablePatterns) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  
  return true;
}

// Normalize label for deduplication comparison
function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

// Check if a sample value is meaningful for display
// Note: We're permissive here - booleans, zeros, objects, and arrays ARE valid webhook data
function isMeaningfulSampleValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  return true; // Everything else is valid
}

// Truncate long values for display - shows useful previews for all types
function truncateValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  // Handle arrays - show preview of contents
  if (Array.isArray(value)) {
    if (value.length === 0) return "(empty array)";
    // Show first element as preview
    const firstItem = value[0];
    if (typeof firstItem === "object" && firstItem !== null) {
      return `[${value.length} items]`;
    }
    const preview = value.slice(0, 3).map(v => String(v)).join(", ");
    return value.length > 3 ? `${preview}...` : preview;
  }
  
  // Handle objects - show key count or first few keys
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "(empty object)";
    const preview = keys.slice(0, 2).join(", ");
    return keys.length > 2 ? `{${preview}...}` : `{${preview}}`;
  }
  
  const str = String(value).trim();
  
  // Filter out only truly unusable string representations
  if (str === "" || str === "NaN") {
    return "";
  }
  
  if (str.length > 40) {
    return str.substring(0, 37) + "...";
  }
  return str;
}

// Format a path suffix for user display (make it friendlier than raw JSON path)
function formatPathSuffix(path: string): string {
  // Convert array indices to more readable format
  // "fields.0.value" -> "Field 1"
  // "data.contacts.2.email" -> "Contact 3 Email"
  
  const parts = path.split(".");
  const friendlyParts: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\d+$/.test(part)) {
      // It's an array index - convert to "Item N" or use parent context
      const num = parseInt(part, 10) + 1; // 1-indexed for users
      if (friendlyParts.length > 0) {
        // Append to previous part
        friendlyParts[friendlyParts.length - 1] += ` #${num}`;
      } else {
        friendlyParts.push(`Item ${num}`);
      }
    } else if (part !== "value" && part !== "data") {
      // Skip common noise like "value" at the end
      friendlyParts.push(formatLabel(part));
    }
  }
  
  return friendlyParts.join(" > ") || path;
}

interface FieldMapping {
  webhook_field: string;
  sheet_column_key: string;
  use_default_value?: boolean;
  default_value?: string;
}

interface UpdateFieldMapping {
  source_field: string;
  target_column: string;
  use_default_value?: boolean;
  default_value?: string;
}

type MatchMode = 'create_only' | 'match_and_update' | 'match_and_add_update' | 'match_or_create';
type NoMatchAction = 'create_lead' | 'ignore' | 'log_only';

// Multi-field matching rule - webhook field can match against multiple CRM fields (OR logic)
interface MatchRule {
  webhookField: string;  // The webhook field to check (e.g., "mobile_no", "whatsapp_no")
  crmFields: string[];   // CRM fields to match against (OR logic) - e.g., ["mobile_no", "whatsapp_no"]
}

interface WebhookCondition {
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

interface AllocationRule {
  sheet_id: string;
  percentage: number;
  condition_field?: string | null;
  condition_operator?: string | null;
  condition_value?: string | null;
  conditions?: WebhookCondition[];
  logical_operator?: "and" | "or";
  is_default?: boolean;
  priority?: number;
  _clientId?: string; // Client-side only ID for stable UI identification
}

// Generate unique client ID for allocation rules
let clientIdCounter = 0;
const generateClientId = () => `rule_${Date.now()}_${++clientIdCounter}`;

// Ensure all rules have client IDs
const ensureClientIds = (rules: AllocationRule[]): AllocationRule[] => {
  return rules.map(rule => ({
    ...rule,
    _clientId: rule._clientId || generateClientId()
  }));
};

// Strip client IDs before saving to backend
const stripClientIds = (rules: AllocationRule[]): AllocationRule[] => {
  return rules.map(({ _clientId, ...rule }) => rule);
};

interface ConfigureWebhookProps {
  webhook: CompanyWebhook;
  onClose: () => void;
}

// System columns with their actual column_key values (as defined in backend SYSTEM_COLUMNS)
const AVAILABLE_CRM_FIELDS = [
  { key: "full_name", label: "Full Name" },
  { key: "mobile_no", label: "Mobile No" },
  { key: "created_at", label: "Created At" },
];

// Default sample payload (used as fallback when API fails)
const DEFAULT_SAMPLE_PAYLOAD = {
  name: "John Doe",
  mobile_no: "9876543210",
  whatsapp: "9876543210",
  lang: "English",
  occupation: "Software Engineer",
  qualification: "Bachelor's Degree",
  lead_date: new Date().toISOString().split('T')[0],
  lead_time: "14:30",
  lead_status: "New",
  visit_status: "Not Visited",
};

export function ConfigureWebhook({ webhook, onClose }: ConfigureWebhookProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mappings");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  
  // Field filtering state
  const [fieldSearch, setFieldSearch] = useState("");
  const [showValuesOnly, setShowValuesOnly] = useState(true); // Default ON for cleaner UX

  // Fetch dynamic sample payload and available fields based on company's custom columns
  const { data: sampleData, isLoading: isLoadingSample, error: sampleError } = useQuery<{
    samplePayload: Record<string, string>;
    availableFields: Array<{ key: string; label: string }>;
  }>({
    queryKey: ["/api/admin/company/webhooks/sample-payload"],
    retry: 2, // Retry on failure
  });
  
  // Extract sample payload and available fields from the response with proper fallbacks
  const samplePayload = sampleData?.samplePayload || (sampleError ? DEFAULT_SAMPLE_PAYLOAD : null);
  // Always include fixed CRM fields and merge with custom fields from backend
  const customFieldsFromBackend = sampleData?.availableFields?.filter(
    field => !AVAILABLE_CRM_FIELDS.some(f => f.key === field.key)
  ) || [];
  const availableCrmFields = [...AVAILABLE_CRM_FIELDS, ...customFieldsFromBackend];
  
  // Field Mappings State
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    { webhook_field: "", sheet_column_key: "" },
  ]);

  // Allocation Rules State - with client IDs for stable identification
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>(
    ensureClientIds([{ sheet_id: "", percentage: 100 }])
  );

  // Match Mode State
  const [matchMode, setMatchMode] = useState<MatchMode>('create_only');
  const [matchField, setMatchField] = useState<string>('mobile_no'); // DEPRECATED: For backward compatibility
  const [matchRules, setMatchRules] = useState<MatchRule[]>([
    { webhookField: 'mobile_no', crmFields: ['mobile_no'] }
  ]);
  const [updateFieldMappings, setUpdateFieldMappings] = useState<UpdateFieldMapping[]>([
    { source_field: "", target_column: "" },
  ]);
  const [noMatchAction, setNoMatchAction] = useState<NoMatchAction>('create_lead');
  const [skipAllocationOnMatch, setSkipAllocationOnMatch] = useState<boolean>(false);

  // Duplicate detection state for Push to CRM
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateLeadInfo | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingCustomFields, setPendingCustomFields] = useState<Record<string, any> | null>(null);

  // Pending allocations state
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const [allocateToSheetId, setAllocateToSheetId] = useState<string>("");
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);

  // Fetch sheets for allocation
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });
  
  // Fetch custom columns to determine field types (dropdown, checkbox, text)
  const { data: customColumns = [] } = useQuery<Array<{
    id: string;
    name: string;
    column_key: string;
    type: string;
    config: { dropdown_options?: string[]; required?: boolean };
  }>>({
    queryKey: ["/api/admin/company/custom-columns"],
  });
  
  // Fetch dropdown options for the company (all sheets)
  const firstSheet = sheets[0];
  const { data: dropdownOptions = [] } = useQuery<Array<{
    id: string;
    column_key: string;
    value: string;
    sheet_id: string | null;
  }>>({
    queryKey: ["/api/sheets", firstSheet?.id, "dropdowns"],
    enabled: !!firstSheet?.id,
  });
  
  // Build a map of CRM field types and their dropdown options
  const crmFieldInfo = useMemo(() => {
    const info: Record<string, { 
      type: 'text' | 'dropdown' | 'checkbox' | 'date' | 'number';
      options: string[];
    }> = {};
    
    // Fixed field defaults (using actual column_key values from backend SYSTEM_COLUMNS)
    const fixedFields: Record<string, { type: 'text' | 'dropdown' | 'checkbox' | 'date' | 'number'; options: string[] }> = {
      'full_name': { type: 'text', options: [] },
      'mobile_no': { type: 'text', options: [] },
      'created_at': { type: 'date', options: [] },
      'lead_status': { type: 'dropdown', options: [] }, // Will be populated from dropdown_options
      'visit_status': { type: 'dropdown', options: [] }, // Will be populated from dropdown_options
    };
    
    // Initialize with fixed fields
    Object.entries(fixedFields).forEach(([key, val]) => {
      info[key] = { ...val };
    });
    
    // Add custom columns
    customColumns.forEach(col => {
      const type = col.type === 'dropdown' ? 'dropdown' :
                   col.type === 'checkbox' ? 'checkbox' :
                   col.type === 'date' ? 'date' :
                   col.type === 'number' ? 'number' : 'text';
      info[col.column_key] = { 
        type, 
        options: col.config?.dropdown_options || [] 
      };
    });
    
    // Populate dropdown options from the API
    dropdownOptions.forEach(opt => {
      if (info[opt.column_key]) {
        if (!info[opt.column_key].options.includes(opt.value)) {
          info[opt.column_key].options.push(opt.value);
        }
      } else {
        info[opt.column_key] = { type: 'dropdown', options: [opt.value] };
      }
    });
    
    return info;
  }, [customColumns, dropdownOptions]);

  // Fetch current webhook configuration
  const { data: webhookDetails } = useQuery<{
    field_mappings: FieldMapping[];
    allocation_rules: AllocationRule[];
    match_mode?: MatchMode;
    match_field?: string;
    match_rules?: MatchRule[];
    update_field_mappings?: UpdateFieldMapping[];
    no_match_action?: NoMatchAction;
    skip_allocation_on_match?: boolean;
  }>({
    queryKey: ["/api/admin/company/webhooks", webhook.id],
    enabled: !!webhook.id,
  });

  // Fetch webhook requests to extract available field names from actual payloads
  const { data: webhookRequests = [] } = useQuery<Array<{
    id: string;
    webhook_id: string;
    status: string;
    payload: Record<string, any>;
    created_at: string;
  }>>({
    queryKey: ["/api/admin/company/webhooks", webhook.id, "requests"],
    enabled: !!webhook.id,
  });

  // Auto-select the most recent request when data loads
  useEffect(() => {
    if (webhookRequests.length > 0 && !selectedRequestId) {
      // Sort by created_at descending and select the most recent
      const sorted = [...webhookRequests].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSelectedRequestId(sorted[0].id);
    }
  }, [webhookRequests, selectedRequestId]);

  // Get the selected request object
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return webhookRequests.find(r => r.id === selectedRequestId) || null;
  }, [webhookRequests, selectedRequestId]);

  // Extract available webhook fields from the SELECTED request (no aggregation/deduplication)
  const availableWebhookFields = useMemo(() => {
    if (selectedRequest?.payload) {
      // Extract ALL fields from the single selected request
      const fields = extractWebhookFields(selectedRequest.payload);
      // Only filter out truly empty fields, keep everything else
      return fields.filter(f => f.sampleValue.trim() !== "" || f.label.trim() !== "");
    }
    return [];
  }, [selectedRequest]);

  // Filtered webhook fields based on search and "values only" toggle, sorted alphabetically
  const filteredWebhookFields = useMemo(() => {
    let filtered = availableWebhookFields;
    
    // Apply "values only" filter
    if (showValuesOnly) {
      filtered = filtered.filter(f => f.fieldType === 'value');
    }
    
    // Apply search filter
    if (fieldSearch.trim()) {
      const searchLower = fieldSearch.toLowerCase();
      filtered = filtered.filter(f => 
        f.label.toLowerCase().includes(searchLower) ||
        f.sampleValue.toLowerCase().includes(searchLower) ||
        f.path.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort alphabetically by label
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  }, [availableWebhookFields, showValuesOnly, fieldSearch]);
  
  // Sorted CRM fields (alphabetically by label)
  const sortedCrmFields = useMemo(() => {
    return [...availableCrmFields].sort((a, b) => a.label.localeCompare(b.label));
  }, [availableCrmFields]);

  // Count stats for display
  const fieldStats = useMemo(() => {
    const valueCount = availableWebhookFields.filter(f => f.fieldType === 'value').length;
    const metadataCount = availableWebhookFields.filter(f => f.fieldType === 'metadata').length;
    return { total: availableWebhookFields.length, values: valueCount, metadata: metadataCount };
  }, [availableWebhookFields]);

  // Format recent requests for the selector dropdown
  const recentRequestsForSelector = useMemo(() => {
    return [...webhookRequests]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10) // Show last 10 requests
      .map(request => {
        const date = new Date(request.created_at);
        const timeAgo = formatTimeAgo(date);
        // Try to get a preview of the payload
        const payloadKeys = Object.keys(request.payload || {}).slice(0, 3);
        const preview = payloadKeys.length > 0 
          ? `Fields: ${payloadKeys.join(", ")}${Object.keys(request.payload).length > 3 ? "..." : ""}`
          : "Empty payload";
        
        return {
          id: request.id,
          label: `${timeAgo} (${request.status})`,
          preview,
          fieldCount: Object.keys(request.payload || {}).length,
          status: request.status,
          date,
          payload: request.payload,
        };
      });
  }, [webhookRequests]);

  // Get pending allocation requests
  const pendingRequests = useMemo(() => {
    return webhookRequests
      .filter(r => r.status === 'pending_allocation')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [webhookRequests]);

  // Helper function to format time ago
  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  }


  // Load existing configuration when data arrives
  useEffect(() => {
    if (webhookDetails?.field_mappings && webhookDetails.field_mappings.length > 0) {
      setFieldMappings(webhookDetails.field_mappings);
    }
    if (webhookDetails?.allocation_rules && webhookDetails.allocation_rules.length > 0) {
      // Ensure client IDs are added for stable UI identification
      setAllocationRules(ensureClientIds(webhookDetails.allocation_rules));
    }
    // Load match mode settings
    if (webhookDetails?.match_mode) {
      setMatchMode(webhookDetails.match_mode);
    }
    // Load match rules - if available, use them; otherwise migrate from legacy match_field
    if (webhookDetails?.match_rules && webhookDetails.match_rules.length > 0) {
      setMatchRules(webhookDetails.match_rules);
    } else if (webhookDetails?.match_field) {
      // Backward compatibility: convert legacy match_field to new match_rules format
      setMatchRules([{ webhookField: webhookDetails.match_field, crmFields: [webhookDetails.match_field] }]);
      setMatchField(webhookDetails.match_field);
    }
    if (webhookDetails?.update_field_mappings && webhookDetails.update_field_mappings.length > 0) {
      setUpdateFieldMappings(webhookDetails.update_field_mappings);
    }
    if (webhookDetails?.no_match_action) {
      setNoMatchAction(webhookDetails.no_match_action);
    }
    if (webhookDetails?.skip_allocation_on_match !== undefined) {
      setSkipAllocationOnMatch(webhookDetails.skip_allocation_on_match);
    }
  }, [webhookDetails]);

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      field_mappings?: FieldMapping[]; 
      allocation_rules?: AllocationRule[];
      match_mode?: MatchMode;
      match_field?: string;
      match_rules?: MatchRule[];
      update_field_mappings?: UpdateFieldMapping[];
      no_match_action?: NoMatchAction;
      skip_allocation_on_match?: boolean;
    }) => {
      return apiRequest("PUT", `/api/admin/company/webhooks/${webhook.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks", webhook.id] });
      toast({
        title: "Configuration saved",
        description: "Webhook configuration has been updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update webhook configuration",
        variant: "destructive",
      });
    },
  });
  
  // Helper to coerce default value based on field type
  const coerceDefaultValue = (value: string, fieldKey: string): any => {
    const fieldInfo = crmFieldInfo[fieldKey];
    if (!fieldInfo) return value;
    
    switch (fieldInfo.type) {
      case 'checkbox':
        // Convert string to boolean
        return value === 'true' || value === '1' || value === 'yes';
      case 'number':
        // Convert to number
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'date':
        // Ensure YYYY-MM-DD format
        if (value.includes('T')) {
          return value.split('T')[0];
        }
        return value;
      case 'dropdown':
        // Validate against available options
        if (fieldInfo.options.length > 0 && !fieldInfo.options.includes(value)) {
          console.warn(`Value "${value}" not in dropdown options for ${fieldKey}`);
        }
        return value;
      default:
        return value;
    }
  };

  // Check for duplicate mobile number
  const checkDuplicateMutation = useMutation({
    mutationFn: async (mobileNo: string) => {
      const targetSheetId = allocationRules[0]?.sheet_id;
      return await apiRequest<{ isDuplicate: boolean; existingLead?: DuplicateLeadInfo }>(
        "POST", 
        "/api/leads/check-duplicate", 
        { mobile_no: mobileNo, sheet_id: targetSheetId }
      );
    },
  });

  // Merge data into existing lead
  const mergeMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest<{ success: boolean; lead: Lead }>(
        "POST",
        `/api/leads/${leadId}/merge`,
        {
          custom_fields: pendingCustomFields,
          source: `Webhook: ${webhook.name} (Manual Push - Merged)`,
          merge_strategy: "update_empty",
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setShowDuplicateDialog(false);
      setDuplicateInfo(null);
      setPendingCustomFields(null);
      toast({
        title: "Lead Merged",
        description: "New data has been merged into the existing lead",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "Failed to merge lead data",
        variant: "destructive",
      });
    },
  });

  // Allocate single pending request to a sheet
  const allocatePendingMutation = useMutation({
    mutationFn: async ({ requestId, sheetId }: { requestId: string; sheetId: string }) => {
      return await apiRequest<{ success: boolean; lead_id: string }>(
        "POST",
        `/api/admin/company/webhooks/${webhook.id}/requests/${requestId}/allocate`,
        { sheet_id: sheetId }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks", webhook.id, "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setSelectedPendingIds(new Set());
      toast({
        title: "Lead Allocated",
        description: "Pending lead has been allocated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Allocation Failed",
        description: error.message || "Failed to allocate pending lead",
        variant: "destructive",
      });
    },
  });

  // Bulk allocate pending requests to a sheet
  const bulkAllocatePendingMutation = useMutation({
    mutationFn: async ({ requestIds, sheetId }: { requestIds: string[]; sheetId: string }) => {
      return await apiRequest<{ success: boolean; message: string; results: Array<{ request_id: string; success: boolean; lead_id?: string; error?: string }> }>(
        "POST",
        `/api/admin/company/webhooks/${webhook.id}/requests/bulk-allocate`,
        { request_ids: requestIds, sheet_id: sheetId }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks", webhook.id, "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setSelectedPendingIds(new Set());
      setAllocateToSheetId("");
      
      const successCount = data.results?.filter(r => r.success).length || 0;
      const failedResults = data.results?.filter(r => !r.success) || [];
      
      if (failedResults.length > 0) {
        const failedMessages = failedResults.slice(0, 3).map(r => r.error).join(", ");
        toast({
          title: "Partial Success",
          description: `${successCount} allocated. ${failedResults.length} failed: ${failedMessages}${failedResults.length > 3 ? '...' : ''}`,
          variant: failedResults.length === data.results?.length ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Leads Allocated",
          description: data.message || "Pending leads have been allocated successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Allocation Failed",
        description: error.message || "Failed to allocate pending leads",
        variant: "destructive",
      });
    },
  });

  // Re-process pending requests through current allocation rules
  const reprocessPendingMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      return await apiRequest<{ success: boolean; message: string; results: Array<{ request_id: string; success: boolean; lead_id?: string; sheet_id?: string; error?: string }> }>(
        "POST",
        `/api/admin/company/webhooks/${webhook.id}/requests/reprocess`,
        { request_ids: requestIds }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks", webhook.id, "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setSelectedPendingIds(new Set());
      
      const successCount = data.results?.filter(r => r.success).length || 0;
      const failedResults = data.results?.filter(r => !r.success) || [];
      
      if (failedResults.length > 0) {
        const stillPendingCount = failedResults.filter(r => r.error === "No matching allocation rules").length;
        const otherErrors = failedResults.filter(r => r.error !== "No matching allocation rules");
        
        let description = `${successCount} allocated.`;
        if (stillPendingCount > 0) {
          description += ` ${stillPendingCount} still have no matching rules.`;
        }
        if (otherErrors.length > 0) {
          description += ` ${otherErrors.length} failed: ${otherErrors.slice(0, 2).map(r => r.error).join(", ")}`;
        }
        
        toast({
          title: successCount > 0 ? "Partial Success" : "No Matching Rules",
          description,
          variant: failedResults.length === data.results?.length ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Leads Processed",
          description: data.message || "All pending leads have been allocated successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Re-process Failed",
        description: error.message || "Failed to re-process pending leads",
        variant: "destructive",
      });
    },
  });

  // Build custom fields from field mappings (reusable helper)
  const buildCustomFieldsFromMappings = () => {
    if (!selectedRequest?.payload) {
      throw new Error("No webhook payload selected");
    }
    
    const customFields: Record<string, any> = {};
    
    for (const mapping of fieldMappings) {
      if (!mapping.sheet_column_key) continue;
      
      if (mapping.use_default_value && mapping.default_value !== undefined && mapping.default_value !== '') {
        customFields[mapping.sheet_column_key] = coerceDefaultValue(mapping.default_value, mapping.sheet_column_key);
      } else if (mapping.webhook_field) {
        const value = getValueFromPath(selectedRequest.payload, mapping.webhook_field);
        if (value !== undefined && value !== null) {
          customFields[mapping.sheet_column_key] = coerceDefaultValue(String(value), mapping.sheet_column_key);
        }
      }
    }
    
    if (!customFields.created_at) {
      customFields.created_at = new Date().toISOString().split('T')[0] + ' ' + 
        new Date().toTimeString().split(' ')[0];
    }
    
    return customFields;
  };

  // Push to CRM mutation - manually create a lead from current webhook payload
  const pushToCrmMutation = useMutation({
    mutationFn: async () => {
      const customFields = buildCustomFieldsFromMappings();
      
      // Validate required system fields
      const hasFullName = customFields.full_name && String(customFields.full_name).trim();
      const hasMobileNo = customFields.mobile_no && String(customFields.mobile_no).trim();
      
      const missingRequired: string[] = [];
      if (!hasFullName) missingRequired.push('Full Name');
      if (!hasMobileNo) missingRequired.push('Mobile No');
      
      if (missingRequired.length > 0) {
        throw new Error(`Required fields missing: ${missingRequired.join(', ')}. Please map these fields or set default values.`);
      }
      
      const targetSheetId = allocationRules[0]?.sheet_id;
      if (!targetSheetId) {
        throw new Error("No sheet selected for allocation. Please configure an allocation rule first.");
      }
      
      // Check for duplicate before creating
      const duplicateResult = await checkDuplicateMutation.mutateAsync(customFields.mobile_no);
      if (duplicateResult.isDuplicate && duplicateResult.existingLead) {
        setPendingCustomFields(customFields);
        setDuplicateInfo(duplicateResult.existingLead);
        setShowDuplicateDialog(true);
        return { skipped: true };
      }
      
      return apiRequest("POST", `/api/sheets/${targetSheetId}/leads`, {
        custom_fields: customFields,
        source: `Webhook: ${webhook.name} (Manual Push)`,
      });
    },
    onSuccess: (result: any) => {
      if (result?.skipped) return; // Duplicate detected, dialog shown
      toast({
        title: "Lead Created",
        description: "Lead has been successfully pushed to CRM from webhook data",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Push Failed",
        description: error.message || "Failed to create lead from webhook data",
        variant: "destructive",
      });
    },
  });

  // Handle merge action from duplicate dialog
  const handleMergeDuplicate = () => {
    if (duplicateInfo) {
      mergeMutation.mutate(duplicateInfo.id);
    }
  };

  // Handle skip action from duplicate dialog
  const handleSkipDuplicate = () => {
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
    setPendingCustomFields(null);
    toast({
      title: "Lead Not Added",
      description: "Duplicate lead was skipped",
    });
  };
  
  // Helper function to get value from nested path
  const getValueFromPath = (obj: any, path: string): any => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  };

  // Field Mapping Handlers
  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { webhook_field: "", sheet_column_key: "" }]);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: string | boolean) => {
    const updated = [...fieldMappings];
    (updated[index] as any)[field] = value;
    setFieldMappings(updated);
  };

  // Allocation Rule Handlers
  const addAllocationRule = () => {
    setAllocationRules([...allocationRules, { 
      sheet_id: "", 
      percentage: 0,
      _clientId: generateClientId() 
    }]);
  };

  const removeAllocationRule = (index: number) => {
    setAllocationRules(allocationRules.filter((_, i) => i !== index));
  };

  const updateAllocationRule = (index: number, field: keyof AllocationRule, value: string | number | boolean | WebhookCondition[] | "and" | "or") => {
    const updated = [...allocationRules];
    if (field === "percentage") {
      updated[index].percentage = Number(value);
    } else if (field === "is_default") {
      updated[index].is_default = Boolean(value);
      if (Boolean(value)) {
        updated[index].condition_field = null;
        updated[index].condition_operator = null;
        updated[index].condition_value = null;
        updated[index].conditions = [];
      }
    } else if (field === "condition_field" || field === "condition_operator" || field === "condition_value") {
      updated[index][field] = value as string | null;
    } else if (field === "conditions") {
      updated[index].conditions = value as WebhookCondition[];
    } else if (field === "logical_operator") {
      updated[index].logical_operator = value as "and" | "or";
    } else if (field === "sheet_id") {
      updated[index].sheet_id = String(value);
    } else if (field === "priority") {
      updated[index].priority = Number(value);
    }
    setAllocationRules(updated);
  };

  const addConditionToRule = (ruleIndex: number) => {
    const updated = [...allocationRules];
    if (!updated[ruleIndex].conditions) {
      updated[ruleIndex].conditions = [];
    }
    updated[ruleIndex].conditions!.push({ field: "", operator: "", value: "" });
    setAllocationRules(updated);
  };

  const removeConditionFromRule = (ruleIndex: number, conditionIndex: number) => {
    const updated = [...allocationRules];
    if (updated[ruleIndex].conditions) {
      updated[ruleIndex].conditions = updated[ruleIndex].conditions!.filter((_, i) => i !== conditionIndex);
    }
    setAllocationRules(updated);
  };

  const updateConditionInRule = (ruleIndex: number, conditionIndex: number, field: keyof WebhookCondition, value: string) => {
    const updated = [...allocationRules];
    if (updated[ruleIndex].conditions && updated[ruleIndex].conditions![conditionIndex]) {
      updated[ruleIndex].conditions![conditionIndex][field] = value;
    }
    setAllocationRules(updated);
  };

  // Update Field Mapping Handlers (for match mode)
  const addUpdateFieldMapping = () => {
    setUpdateFieldMappings([...updateFieldMappings, { source_field: "", target_column: "" }]);
  };

  const removeUpdateFieldMapping = (index: number) => {
    setUpdateFieldMappings(updateFieldMappings.filter((_, i) => i !== index));
  };

  const updateUpdateFieldMapping = (index: number, field: keyof UpdateFieldMapping, value: string | boolean) => {
    const updated = [...updateFieldMappings];
    (updated[index] as any)[field] = value;
    setUpdateFieldMappings(updated);
  };

  // Validation
  const validateMappings = () => {
    // A valid mapping has a sheet_column_key AND either:
    // 1. A webhook_field to map from, OR
    // 2. A default value set (use_default_value=true with default_value)
    const validMappings = fieldMappings.filter(
      (m) => m.sheet_column_key.trim() && (m.webhook_field.trim() || (m.use_default_value && m.default_value))
    );
    if (validMappings.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one field mapping is required",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const VALUE_LESS_OPERATORS = ['is_empty', 'is_not_empty'];
  const BETWEEN_OPERATORS = ['between', 'date_between'];
  
  const hasValidConditions = (rule: AllocationRule): boolean => {
    if (rule.conditions && rule.conditions.length > 0) {
      return rule.conditions.every(c => {
        if (!c.field || !c.operator) return false;
        if (VALUE_LESS_OPERATORS.includes(c.operator)) return true;
        if (BETWEEN_OPERATORS.includes(c.operator)) return !!(c.value && c.value2);
        return !!c.value;
      });
    }
    if (rule.condition_field && rule.condition_operator) {
      if (VALUE_LESS_OPERATORS.includes(rule.condition_operator)) return true;
      return !!rule.condition_value;
    }
    return false;
  };
  
  const getConditionGroupKey = (rule: AllocationRule): { key: string; label: string } => {
    if (rule.is_default) {
      return { key: 'default', label: 'Default/Fallback Rules' };
    }
    if (rule.conditions && rule.conditions.length > 0) {
      const parts = rule.conditions.map(c => {
        const baseKey = `${c.field}|${c.operator}|${c.value || ''}`;
        return BETWEEN_OPERATORS.includes(c.operator) && c.value2 
          ? `${baseKey}|${c.value2}` 
          : baseKey;
      });
      const label = rule.conditions.map(c => {
        if (VALUE_LESS_OPERATORS.includes(c.operator)) {
          return `${c.field} ${c.operator}`;
        }
        if (BETWEEN_OPERATORS.includes(c.operator) && c.value2) {
          return `${c.field} ${c.operator} "${c.value}" and "${c.value2}"`;
        }
        return `${c.field} ${c.operator} "${c.value}"`;
      }).join(` ${(rule.logical_operator || 'and').toUpperCase()} `);
      return { key: parts.join('::') + '::' + (rule.logical_operator || 'and'), label };
    }
    const condLabel = VALUE_LESS_OPERATORS.includes(rule.condition_operator || '')
      ? `${rule.condition_field} ${rule.condition_operator}`
      : `${rule.condition_field} ${rule.condition_operator} "${rule.condition_value}"`;
    return {
      key: `${rule.condition_field}|${rule.condition_operator}|${rule.condition_value || ''}`,
      label: condLabel
    };
  };

  const validateAllocationRules = () => {
    const validRules = allocationRules.filter((r) => {
      if (!r.sheet_id || r.percentage <= 0) return false;
      if (!r.is_default && !hasValidConditions(r)) return false;
      return true;
    });
    
    if (validRules.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one complete allocation rule is required",
        variant: "destructive",
      });
      return false;
    }

    const groups: Record<string, { total: number, label: string }> = {};
    
    validRules.forEach(rule => {
      const { key, label } = getConditionGroupKey(rule);
      if (!groups[key]) {
        groups[key] = { total: 0, label };
      }
      groups[key].total += rule.percentage || 0;
    });

    const invalidGroups = Object.entries(groups).filter(([_, group]) => group.total !== 100);
    
    if (invalidGroups.length > 0) {
      const errorMessages = invalidGroups.map(([_, group]) => 
        `${group.label}: ${group.total}% (must be 100%)`
      ).join(', ');
      
      toast({
        title: "Invalid Allocation",
        description: `Each condition group must total exactly 100%. Issues: ${errorMessages}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveMappings = () => {
    if (!validateMappings()) return;

    // Include mappings that either:
    // 1. Have a webhook_field mapped to a sheet_column_key, OR
    // 2. Have use_default_value=true with a default_value set
    const validMappings = fieldMappings.filter(
      (m) => m.sheet_column_key.trim() && (m.webhook_field.trim() || (m.use_default_value && m.default_value))
    );
    updateMutation.mutate({ field_mappings: validMappings });
  };

  const handleSaveAllocation = () => {
    if (!validateAllocationRules()) return;

    const validRules = allocationRules.filter((r) => {
      if (!r.sheet_id || r.percentage <= 0) return false;
      if (!r.is_default && !hasValidConditions(r)) return false;
      return true;
    });
    
    // Strip client IDs before saving to backend
    updateMutation.mutate({ allocation_rules: stripClientIds(validRules) });
  };

  const handleSaveMatchMode = () => {
    // Filter out empty update field mappings - only include complete rows
    const validUpdateMappings = updateFieldMappings.filter(
      (m) => m.source_field.trim() && m.target_column.trim()
    );

    // Filter out empty/incomplete match rules - at least one valid rule required
    const validMatchRules = matchRules.filter(
      (rule) => rule.webhookField.trim() && rule.crmFields.length > 0
    );

    // Note: We allow saving with zero update mappings - the user may rely on
    // default behaviors or configure mappings later. Empty/incomplete rows 
    // are simply filtered out rather than blocking the save.

    updateMutation.mutate({
      match_mode: matchMode,
      match_rules: validMatchRules.length > 0 ? validMatchRules : undefined,
      update_field_mappings: validUpdateMappings, // Only send complete mappings, filter out empty rows
      no_match_action: noMatchAction,
      skip_allocation_on_match: skipAllocationOnMatch,
    });
  };

  const calculateConditionGroups = () => {
    const groups: Record<string, { rules: AllocationRule[], total: number, label: string }> = {};
    
    allocationRules.forEach(rule => {
      let groupKey: string;
      let groupLabel: string;
      
      if (rule.is_default) {
        groupKey = 'default';
        groupLabel = 'Default/Fallback Rules';
      } else if (hasValidConditions(rule)) {
        const { key, label } = getConditionGroupKey(rule);
        groupKey = key;
        groupLabel = label;
      } else {
        groupKey = 'incomplete';
        groupLabel = 'Incomplete Rules';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { rules: [], total: 0, label: groupLabel };
      }
      
      groups[groupKey].rules.push(rule);
      groups[groupKey].total += rule.percentage || 0;
    });
    
    return groups;
  };

  const conditionGroups = calculateConditionGroups();
  const totalPercentage = allocationRules.reduce((sum, rule) => sum + rule.percentage, 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="mappings" data-testid="tab-mappings">
          Field Mappings
        </TabsTrigger>
        <TabsTrigger value="allocation" data-testid="tab-allocation">
          Allocation Rules
        </TabsTrigger>
        <TabsTrigger value="matchmode" data-testid="tab-matchmode">
          Match Mode
        </TabsTrigger>
        <TabsTrigger value="pending" data-testid="tab-pending" className="relative">
          Pending
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mappings" className="space-y-4 py-2">
        {/* Recent Webhook Requests Selector */}
        {recentRequestsForSelector.length > 0 && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Select Webhook Data Source</Label>
              </div>
              {selectedRequest && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                  className="text-xs"
                  data-testid="button-toggle-payload-preview"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showPayloadPreview ? "Hide" : "View"} Raw Data
                  {showPayloadPreview ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              )}
            </div>
            
            <Select
              value={selectedRequestId || ""}
              onValueChange={(value) => setSelectedRequestId(value)}
            >
              <SelectTrigger className="w-full" data-testid="select-webhook-request">
                <SelectValue placeholder="Choose a recent webhook request" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                  {recentRequestsForSelector.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      <div className="flex flex-col py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.label}</span>
                          <Badge 
                            variant={request.status === "success" ? "default" : "destructive"}
                            className="text-xs h-5"
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {request.preview}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Payload Preview Panel */}
            {showPayloadPreview && selectedRequest && (
              <div className="mt-2 p-3 rounded-md bg-background border">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Raw Payload Data</Label>
                <ScrollArea className="max-h-[150px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedRequest.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Show helpful message based on webhook data availability */}
        {availableWebhookFields.length > 0 ? (
          <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Found {fieldStats.values} value fields{!showValuesOnly && ` and ${fieldStats.metadata} technical fields`} from the webhook.
              {showValuesOnly && fieldStats.metadata > 0 && (
                <span className="text-xs opacity-75"> ({fieldStats.metadata} technical fields hidden)</span>
              )}
            </AlertDescription>
          </Alert>
        ) : webhookRequests.length > 0 ? (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              No extractable fields found in the selected webhook. Try selecting a different request above, or configure manually.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No webhook data received yet. Send a test webhook to see available fields here, or configure manually.
            </AlertDescription>
          </Alert>
        )}

        {/* Field Search and Filter Controls */}
        {availableWebhookFields.length > 0 && (
          <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search fields by name or value..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-field-search"
                />
              </div>
              
              {/* Values Only Toggle */}
              <div className="flex items-center gap-2 shrink-0 px-3 py-2 border rounded-md bg-background">
                <Switch
                  id="values-only"
                  checked={showValuesOnly}
                  onCheckedChange={setShowValuesOnly}
                  data-testid="switch-values-only"
                />
                <Label htmlFor="values-only" className="text-sm cursor-pointer whitespace-nowrap">
                  Values Only
                </Label>
                <span className="text-xs text-muted-foreground">
                  ({showValuesOnly ? fieldStats.values : fieldStats.total})
                </span>
              </div>
            </div>
            
            {/* Show result count when filtering */}
            {(fieldSearch || !showValuesOnly) && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredWebhookFields.length} of {fieldStats.total} fields
                {fieldSearch && ` matching "${fieldSearch}"`}
              </p>
            )}
          </div>
        )}

        {/* Field Mappings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Field Mappings</Label>
          <p className="text-xs text-muted-foreground">
            Map your CRM fields to incoming webhook data, or set a default value. Green checkmark shows configured fields.
          </p>
          
          {fieldMappings.map((mapping, index) => {
            const isCrmMapped = mapping.sheet_column_key && (mapping.webhook_field || (mapping.use_default_value && mapping.default_value));
            const fieldInfo = crmFieldInfo[mapping.sheet_column_key];
            const isUsingDefault = mapping.use_default_value;
            
            return (
            <div key={index} className="flex items-end gap-2" data-testid={`mapping-row-${index}`}>
              {/* CRM Field - LEFT side */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  CRM Field
                  {isCrmMapped && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                </Label>
                <Select
                  value={mapping.sheet_column_key}
                  onValueChange={(value) => {
                    updateFieldMapping(index, "sheet_column_key", value);
                    // Reset default value when changing CRM field
                    if (mapping.use_default_value) {
                      updateFieldMapping(index, "default_value", "");
                    }
                  }}
                >
                  <SelectTrigger 
                    className={`w-full ${isCrmMapped ? 'border-green-500 ring-1 ring-green-500/20' : ''}`} 
                    data-testid={`select-crm-field-${index}`}
                  >
                    <SelectValue placeholder="Select CRM field" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {sortedCrmFields.map((field) => {
                      const isFieldMapped = fieldMappings.some(
                        (m, i) => i !== index && m.sheet_column_key === field.key && (m.webhook_field || (m.use_default_value && m.default_value))
                      );
                      return (
                        <SelectItem key={field.key} value={field.key}>
                          <div className="flex items-center gap-2">
                            {isFieldMapped && (
                              <Check className="h-3 w-3 text-green-600 shrink-0" />
                            )}
                            <span>{field.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Source Value - RIGHT side (Webhook Field OR Default Value) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">
                    {isUsingDefault ? "Default Value" : "Webhook Field"}
                  </Label>
                  {mapping.sheet_column_key && (
                    <button
                      type="button"
                      onClick={() => {
                        updateFieldMapping(index, "use_default_value", !isUsingDefault);
                        if (!isUsingDefault) {
                          // Switching to default mode - clear webhook field
                          updateFieldMapping(index, "webhook_field", "");
                        } else {
                          // Switching to webhook mode - clear default value
                          updateFieldMapping(index, "default_value", "");
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                      data-testid={`toggle-default-${index}`}
                    >
                      {isUsingDefault ? "Use Webhook Field" : "Set Default Value"}
                    </button>
                  )}
                </div>
                
                {isUsingDefault ? (
                  // Default Value Mode - show appropriate input based on field type
                  fieldInfo?.type === 'dropdown' && fieldInfo.options.length > 0 ? (
                    <Select
                      value={mapping.default_value || ""}
                      onValueChange={(value) => updateFieldMapping(index, "default_value", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-default-value-${index}`}>
                        <SelectValue placeholder="Select default value" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {fieldInfo.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : fieldInfo?.type === 'checkbox' ? (
                    <div className="flex items-center h-9 px-3 border rounded-md bg-background">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mapping.default_value === "true"}
                          onChange={(e) => updateFieldMapping(index, "default_value", e.target.checked ? "true" : "false")}
                          className="w-4 h-4"
                          data-testid={`checkbox-default-value-${index}`}
                        />
                        <span className="text-sm">{mapping.default_value === "true" ? "Checked" : "Unchecked"}</span>
                      </label>
                    </div>
                  ) : (
                    <Input
                      value={mapping.default_value || ""}
                      onChange={(e) => updateFieldMapping(index, "default_value", e.target.value)}
                      placeholder="Enter default value"
                      type={fieldInfo?.type === 'number' ? 'number' : fieldInfo?.type === 'date' ? 'date' : 'text'}
                      className="w-full"
                      data-testid={`input-default-value-${index}`}
                    />
                  )
                ) : (
                  // Webhook Field Mode
                  filteredWebhookFields.length > 0 ? (
                    <Select
                      value={mapping.webhook_field}
                      onValueChange={(value) => updateFieldMapping(index, "webhook_field", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-webhook-field-${index}`}>
                        <SelectValue placeholder="Select a field" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                          {filteredWebhookFields.map((field, fieldIndex) => (
                            <SelectItem 
                              key={`${field.path}-${fieldIndex}`} 
                              value={field.path}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{field.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {field.sampleValue}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : availableWebhookFields.length > 0 ? (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                      No fields match your search. Try different keywords or disable "Values Only" filter.
                    </div>
                  ) : (
                    <Input
                      value={mapping.webhook_field}
                      onChange={(e) => updateFieldMapping(index, "webhook_field", e.target.value)}
                      placeholder="Enter field path (e.g., name, user.email)"
                      className="w-full"
                      data-testid={`input-webhook-field-${index}`}
                    />
                  )
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFieldMapping(index)}
                disabled={fieldMappings.length === 1}
                data-testid={`button-remove-mapping-${index}`}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );})}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFieldMapping}
            data-testid="button-add-mapping"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-6">
          {/* Push to CRM - only show when we have a payload and mappings */}
          <div>
            {selectedRequest?.payload && fieldMappings.some(m => m.sheet_column_key && (m.webhook_field || (m.use_default_value && m.default_value))) && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => pushToCrmMutation.mutate()}
                disabled={pushToCrmMutation.isPending || !allocationRules[0]?.sheet_id}
                data-testid="button-push-to-crm"
                className="gap-2"
              >
                {pushToCrmMutation.isPending ? (
                  "Pushing..."
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Push to CRM
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-mappings">
              Cancel
            </Button>
            <Button
              onClick={handleSaveMappings}
              disabled={updateMutation.isPending}
              data-testid="button-save-mappings"
            >
              {updateMutation.isPending ? "Saving..." : "Save Mappings"}
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="allocation" className="space-y-4 py-2">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure conditional routing: leads are allocated based on webhook field values. Add conditions to route leads to specific sheets, or mark rules as default for unmatched leads.
          </AlertDescription>
        </Alert>

        {/* Allocation Rules - Grouped by Condition */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Allocation Rules</Label>
          
          {/* Group rules by condition signature for display */}
          {(() => {
            // Build condition groups with their rule client IDs (stable identifiers)
            const groups: Array<{
              key: string;
              label: string;
              isDefault: boolean;
              conditions: WebhookCondition[];
              logicalOperator: "and" | "or";
              ruleClientIds: string[];
            }> = [];
            
            allocationRules.forEach((rule) => {
              const { key, label } = getConditionGroupKey(rule);
              const existingGroup = groups.find(g => g.key === key);
              
              // Use existing client ID or generate one for grouping purposes only
              const clientId = rule._clientId || generateClientId();
              
              if (existingGroup) {
                existingGroup.ruleClientIds.push(clientId);
              } else {
                groups.push({
                  key,
                  label,
                  isDefault: rule.is_default === true,
                  conditions: rule.conditions ? [...rule.conditions] : [],
                  logicalOperator: rule.logical_operator || "and",
                  ruleClientIds: [clientId]
                });
              }
            });
            
            
            // Helper to get rule by client ID
            const getRuleByClientId = (clientId: string) => 
              allocationRules.find(r => r._clientId === clientId);
            
            // Helper to add a new sheet to a condition group (using functional update)
            const addSheetToGroup = (groupKey: string) => {
              setAllocationRules(prev => {
                const group = groups.find(g => g.key === groupKey);
                if (!group || group.ruleClientIds.length === 0) return prev;
                
                const firstRule = prev.find(r => r._clientId === group.ruleClientIds[0]);
                if (!firstRule) return prev;
                
                // Create a new rule with the same conditions but empty sheet
                const newRule: AllocationRule = {
                  sheet_id: "",
                  percentage: 0,
                  is_default: firstRule.is_default,
                  conditions: firstRule.conditions ? [...firstRule.conditions.map(c => ({ ...c }))] : [],
                  logical_operator: firstRule.logical_operator,
                  _clientId: generateClientId()
                };
                
                return [...prev, newRule];
              });
            };
            
            // Helper to delete entire condition group (using functional update)
            const deleteConditionGroup = (ruleClientIds: string[]) => {
              setAllocationRules(prev => {
                if (prev.length <= 1) return prev;
                const newRules = prev.filter(r => !ruleClientIds.includes(r._clientId || ''));
                if (newRules.length === 0) {
                  return ensureClientIds([{ sheet_id: "", percentage: 100 }]);
                }
                return newRules;
              });
            };
            
            // Helper to update a field on a rule by client ID (with defensive fallback)
            const updateRuleByClientId = (clientId: string, field: keyof AllocationRule, value: any) => {
              if (!clientId) return; // Guard against empty client IDs
              setAllocationRules(prev => prev.map(rule => {
                // Match by _clientId, or ensure rules have IDs
                if (rule._clientId === clientId) {
                  return { ...rule, [field]: field === "percentage" ? Number(value) : value };
                }
                // Ensure all rules have client IDs
                return rule._clientId ? rule : { ...rule, _clientId: generateClientId() };
              }));
            };
            
            // Helper to remove a rule by client ID (with defensive fallback)
            const removeRuleByClientId = (clientId: string) => {
              if (!clientId) return; // Guard against empty client IDs
              setAllocationRules(prev => {
                if (prev.length <= 1) return prev;
                return prev.filter(r => r._clientId !== clientId);
              });
            };
            
            // Helper to update all rules in a group (for condition sync)
            const updateGroupRules = (ruleClientIds: string[], updater: (rule: AllocationRule) => AllocationRule) => {
              const validClientIds = ruleClientIds.filter(Boolean);
              if (validClientIds.length === 0) return; // Guard against empty IDs
              setAllocationRules(prev => prev.map(rule => {
                if (validClientIds.includes(rule._clientId || '')) {
                  return updater(rule);
                }
                // Ensure all rules have client IDs
                return rule._clientId ? rule : { ...rule, _clientId: generateClientId() };
              }));
            };
            
            return groups.map((group, groupIndex) => {
              const rulesInGroup = group.ruleClientIds.map(id => getRuleByClientId(id)).filter(Boolean) as AllocationRule[];
              const firstRule = rulesInGroup[0];
              const groupTotal = rulesInGroup.reduce((sum, rule) => sum + (rule?.percentage || 0), 0);
              
              if (!firstRule) return null;
              
              // Use the first rule's client ID as a stable React key (not the condition-based key which changes on value edits)
              const stableGroupKey = group.ruleClientIds[0] || `group-${groupIndex}`;
              
              return (
                <div key={stableGroupKey} className="border rounded-lg p-4 space-y-4" data-testid={`condition-group-${groupIndex}`}>
                  {/* Condition Configuration - shown once per group */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">Conditions</Label>
                        <input
                          type="checkbox"
                          checked={group.isDefault}
                          onChange={(e) => {
                            // Update is_default for all rules in this group using stable IDs
                            updateGroupRules(group.ruleClientIds, rule => ({
                              ...rule,
                              is_default: e.target.checked
                            }));
                          }}
                          className="h-4 w-4"
                          data-testid={`checkbox-is-default-group-${groupIndex}`}
                        />
                        <Label className="text-xs text-muted-foreground">Mark as Default/Fallback</Label>
                      </div>
                      {groups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConditionGroup(group.ruleClientIds)}
                          className="text-destructive hover:text-destructive h-7 px-2"
                          data-testid={`button-delete-group-${groupIndex}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Group
                        </Button>
                      )}
                    </div>
                    
                    {!group.isDefault && (
                      <div className="space-y-3">
                        {/* AND/OR Toggle */}
                        {(firstRule.conditions?.length || 0) > 1 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Match:</Label>
                            <ToggleGroup
                              type="single"
                              value={firstRule.logical_operator || "and"}
                              onValueChange={(value) => {
                                if (value) {
                                  // Update logical_operator for all rules in this group
                                  updateGroupRules(group.ruleClientIds, rule => ({
                                    ...rule,
                                    logical_operator: value as "and" | "or"
                                  }));
                                }
                              }}
                              className="h-7"
                            >
                              <ToggleGroupItem value="and" className="h-7 px-3 text-xs">
                                All (AND)
                              </ToggleGroupItem>
                              <ToggleGroupItem value="or" className="h-7 px-3 text-xs">
                                Any (OR)
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                        )}

                        {/* Conditions List - edit syncs across all rules in group */}
                        {(firstRule.conditions || []).map((condition, condIndex) => (
                          <div key={condIndex} className="flex items-center gap-2">
                            {condIndex > 0 && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {(firstRule.logical_operator || "and").toUpperCase()}
                              </Badge>
                            )}
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              {filteredWebhookFields.length > 0 ? (
                                <Select
                                  value={condition.field}
                                  onValueChange={(value) => {
                                    // Update condition in all rules of this group
                                    updateGroupRules(group.ruleClientIds, rule => {
                                      if (!rule.conditions) return rule;
                                      const newConditions = [...rule.conditions];
                                      if (newConditions[condIndex]) {
                                        newConditions[condIndex] = { ...newConditions[condIndex], field: value };
                                      }
                                      return { ...rule, conditions: newConditions };
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-full" data-testid={`select-condition-field-${groupIndex}-${condIndex}`}>
                                    <SelectValue placeholder="Select field" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] overflow-y-auto">
                                      {filteredWebhookFields.map((field, fieldIndex) => (
                                        <SelectItem 
                                          key={`${field.path}-${fieldIndex}`} 
                                          value={field.path}
                                        >
                                          <span>{field.label}</span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={condition.field}
                                  onChange={(e) => {
                                    updateGroupRules(group.ruleClientIds, rule => {
                                      if (!rule.conditions) return rule;
                                      const newConditions = [...rule.conditions];
                                      if (newConditions[condIndex]) {
                                        newConditions[condIndex] = { ...newConditions[condIndex], field: e.target.value };
                                      }
                                      return { ...rule, conditions: newConditions };
                                    });
                                  }}
                                  placeholder="e.g., language"
                                  className="w-full"
                                  data-testid={`input-condition-field-${groupIndex}-${condIndex}`}
                                />
                              )}
                              <select
                                value={condition.operator}
                                onChange={(e) => {
                                  updateGroupRules(group.ruleClientIds, rule => {
                                    if (!rule.conditions) return rule;
                                    const newConditions = [...rule.conditions];
                                    if (newConditions[condIndex]) {
                                      newConditions[condIndex] = { ...newConditions[condIndex], operator: e.target.value };
                                    }
                                    return { ...rule, conditions: newConditions };
                                  });
                                }}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                data-testid={`select-condition-operator-${groupIndex}-${condIndex}`}
                              >
                                <option value="">Operator</option>
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="not_contains">Not Contains</option>
                                <option value="starts_with">Starts With</option>
                                <option value="ends_with">Ends With</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                              </select>
                              <Input
                                value={condition.value}
                                onChange={(e) => {
                                  updateGroupRules(group.ruleClientIds, rule => {
                                    if (!rule.conditions) return rule;
                                    const newConditions = [...rule.conditions];
                                    if (newConditions[condIndex]) {
                                      newConditions[condIndex] = { ...newConditions[condIndex], value: e.target.value };
                                    }
                                    return { ...rule, conditions: newConditions };
                                  });
                                }}
                                placeholder="Value"
                                className="w-full"
                                data-testid={`input-condition-value-${groupIndex}-${condIndex}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Remove condition from all rules in this group
                                updateGroupRules(group.ruleClientIds, rule => {
                                  if (!rule.conditions) return rule;
                                  return {
                                    ...rule,
                                    conditions: rule.conditions.filter((_, i) => i !== condIndex)
                                  };
                                });
                              }}
                              className="shrink-0 h-8 w-8"
                              data-testid={`button-remove-condition-${groupIndex}-${condIndex}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Add Condition Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Add condition to all rules in this group
                            updateGroupRules(group.ruleClientIds, rule => ({
                              ...rule,
                              conditions: [...(rule.conditions || []), { field: "", operator: "", value: "" }]
                            }));
                          }}
                          data-testid={`button-add-condition-${groupIndex}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Condition
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sheet Allocations - Multiple sheets per condition group */}
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Sheet Allocations</Label>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium",
                          groupTotal === 100 ? "text-green-600 dark:text-green-400" : 
                          groupTotal > 100 ? "text-destructive" : "text-yellow-600 dark:text-yellow-500"
                        )}>
                          Total: {groupTotal}%
                        </span>
                        {groupTotal === 100 && <Check className="h-3 w-3 text-green-600 dark:text-green-400" />}
                        {groupTotal !== 100 && <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />}
                      </div>
                    </div>
                    
                    {rulesInGroup.map((rule, sheetIndex) => {
                      const clientId = rule._clientId || '';
                      return (
                        <div key={clientId} className="flex items-center gap-2" data-testid={`sheet-row-${groupIndex}-${sheetIndex}`}>
                          <div className="flex-1 min-w-0">
                            <select
                              value={rule.sheet_id}
                              onChange={(e) => updateRuleByClientId(clientId, "sheet_id", e.target.value)}
                              data-testid={`select-sheet-${groupIndex}-${sheetIndex}`}
                              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Select sheet</option>
                              {sheets.map((sheet) => (
                                <option key={sheet.id} value={sheet.id}>
                                  {sheet.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={rule.percentage}
                              onChange={(e) => updateRuleByClientId(clientId, "percentage", e.target.value)}
                              placeholder="0"
                              className="text-center"
                              data-testid={`input-percentage-${groupIndex}-${sheetIndex}`}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-4">%</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (rulesInGroup.length === 1 && groups.length === 1) {
                                // Can't remove the last sheet of the last group
                                return;
                              }
                              removeRuleByClientId(clientId);
                            }}
                            disabled={rulesInGroup.length === 1 && groups.length === 1}
                            data-testid={`button-remove-sheet-${groupIndex}-${sheetIndex}`}
                            className="flex-shrink-0 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    
                    {/* Add Sheet Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSheetToGroup(group.key)}
                      data-testid={`button-add-sheet-${groupIndex}`}
                      className="w-full mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Sheet
                    </Button>
                  </div>
                </div>
              );
            });
          })()}
          
          {/* Add New Condition Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addAllocationRule}
            data-testid="button-add-rule"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition Group
          </Button>
        </div>

        {/* Overall Allocation Health Summary */}
        {allocationRules.length > 0 && (() => {
          // Calculate overall allocation health
          const hasDefaultGroup = 'default' in conditionGroups;
          const defaultTotal = hasDefaultGroup ? conditionGroups.default.total : 0;
          const conditionalGroups = Object.entries(conditionGroups).filter(([key]) => key !== 'default' && key !== 'incomplete');
          const incompleteGroup = conditionGroups.incomplete;
          
          // Check if all leads are fully allocated:
          // - If default/fallback exists at 100%, all unmatched leads are covered
          // - Each conditional group should also be at 100% for matched leads
          const isDefaultFullyCovered = hasDefaultGroup && defaultTotal === 100;
          const allConditionalsFullyCovered = conditionalGroups.every(([_, group]) => group.total === 100);
          const hasIncompleteRules = incompleteGroup && incompleteGroup.rules.length > 0;
          
          // Calculate worst-case unallocated percentage considering ALL groups
          // Each conditional group is mutually exclusive - a lead matches at most one condition
          // But we need to show the WORST case across any path a lead could take
          let worstCaseUnallocated = 0;
          
          if (!hasDefaultGroup && conditionalGroups.length === 0) {
            // No rules at all = 100% unallocated
            worstCaseUnallocated = 100;
          } else {
            // Check each path a lead could take
            const gaps: number[] = [];
            
            // Default/fallback gap (for leads that don't match any condition)
            if (!isDefaultFullyCovered) {
              gaps.push(100 - defaultTotal);
            }
            
            // Conditional group gaps (for leads that match each condition)
            conditionalGroups.forEach(([_, group]) => {
              if (group.total < 100) {
                gaps.push(100 - group.total);
              }
            });
            
            // The worst case is the maximum gap across all possible paths
            if (gaps.length > 0) {
              worstCaseUnallocated = Math.max(...gaps);
            }
          }
          
          // Final determination: fully allocated if no gaps anywhere
          const isFullyAllocated = isDefaultFullyCovered && allConditionalsFullyCovered && !hasIncompleteRules;
          
          return (
            <div
              className={cn(
                "border rounded-lg p-4 mb-4",
                isFullyAllocated 
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50" 
                  : "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/50"
              )}
              data-testid="allocation-health-summary"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isFullyAllocated ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">
                      {isFullyAllocated ? (
                        "All Webhook Leads Fully Allocated"
                      ) : (
                        "Allocation Incomplete"
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isFullyAllocated ? (
                        "Every incoming lead will be assigned to a sheet"
                      ) : worstCaseUnallocated > 0 ? (
                        `Up to ${worstCaseUnallocated}% of leads may not be allocated`
                      ) : hasIncompleteRules ? (
                        "Some rules have incomplete conditions"
                      ) : !allConditionalsFullyCovered ? (
                        "Some condition groups don't add up to 100%"
                      ) : (
                        "Review the breakdown below"
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-bold",
                    isFullyAllocated ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-500"
                  )}>
                    {isFullyAllocated ? "100%" : `${100 - worstCaseUnallocated}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isFullyAllocated ? "coverage" : "minimum coverage"}
                  </div>
                </div>
              </div>
              {!isFullyAllocated && !isDefaultFullyCovered && (
                <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Tip: Add a Default/Fallback rule with 100% allocation to catch all leads that don't match other conditions.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Percentage Summary with Condition Breakdown */}
        {allocationRules.length > 0 && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium mb-2">Allocation Breakdown</div>
            
            {Object.entries(conditionGroups).map(([groupKey, group]) => {
              const isValid = group.total === 100;
              const isIncomplete = groupKey === 'incomplete';
              const isUnderAllocated = group.total < 100;
              const isOverAllocated = group.total > 100;
              
              return (
                <div
                  key={groupKey}
                  className={cn(
                    "p-3 rounded-md border",
                    isValid && !isIncomplete ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "",
                    !isValid && !isIncomplete ? "border-destructive bg-destructive/10" : "",
                    isIncomplete ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950" : ""
                  )}
                  data-testid={`allocation-group-${groupKey}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{group.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {group.rules.length} rule{group.rules.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          isValid && !isIncomplete ? "text-green-600 dark:text-green-400" : "",
                          !isValid && !isIncomplete ? "text-destructive" : "",
                          isIncomplete ? "text-yellow-600 dark:text-yellow-400" : ""
                        )}
                        data-testid={`allocation-total-${groupKey}`}
                      >
                        {group.total}%
                      </span>
                      {isValid && !isIncomplete && (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                      {!isValid && !isIncomplete && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      {isIncomplete && (
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                  </div>
                  {!isValid && !isIncomplete && (
                    <div className="text-xs text-destructive mt-2" data-testid={`allocation-error-${groupKey}`}>
                      {isUnderAllocated && `${100 - group.total}% unallocated - add more rules or adjust percentages`}
                      {isOverAllocated && `${group.total - 100}% over-allocated - reduce percentages`}
                    </div>
                  )}
                  {isIncomplete && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      Complete the condition fields or mark as default
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAllocation}
            disabled={updateMutation.isPending}
            data-testid="button-save-allocation"
          >
            {updateMutation.isPending ? "Saving..." : "Save Allocation"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="matchmode" className="space-y-4 py-2">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure how the webhook handles duplicate leads. Match mode allows updating existing leads instead of creating duplicates.
          </AlertDescription>
        </Alert>

        {/* Match Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Match Mode</Label>
          <Select value={matchMode} onValueChange={(value) => setMatchMode(value as MatchMode)}>
            <SelectTrigger data-testid="select-match-mode">
              <SelectValue placeholder="Select match mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create_only">Create Only (default)</SelectItem>
              <SelectItem value="match_and_update">Match and Update Fields</SelectItem>
              <SelectItem value="match_and_add_update">Match and Add Lead Update</SelectItem>
              <SelectItem value="match_or_create">Match or Create New</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {matchMode === 'create_only' && "Always create a new lead, even if a matching lead exists."}
            {matchMode === 'match_and_update' && "Find a matching lead and update its fields. Optionally create if no match."}
            {matchMode === 'match_and_add_update' && "Find a matching lead and add a Lead Update note. Optionally create if no match."}
            {matchMode === 'match_or_create' && "Find a matching lead and update, or create new if no match found."}
          </p>
        </div>

        {/* Match Rules Builder - Multi-field matching */}
        {matchMode !== 'create_only' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Match Rules</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Define how to find matching leads. Webhook field matches if it equals ANY of the selected CRM fields.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMatchRules([...matchRules, { webhookField: '', crmFields: [] }])}
                data-testid="button-add-match-rule"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>

            {matchRules.length === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/30">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  No match rules configured. Add at least one rule to enable lead matching.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {matchRules.map((rule, ruleIndex) => (
                <div 
                  key={ruleIndex} 
                  className="border rounded-lg p-4 space-y-3 bg-muted/20"
                  data-testid={`match-rule-${ruleIndex}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Rule {ruleIndex + 1}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const newRules = matchRules.filter((_, i) => i !== ruleIndex);
                        setMatchRules(newRules.length > 0 ? newRules : [{ webhookField: '', crmFields: [] }]);
                      }}
                      data-testid={`button-delete-rule-${ruleIndex}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Webhook Field - LEFT side */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                      {filteredWebhookFields.length > 0 ? (
                        <Select
                          value={rule.webhookField}
                          onValueChange={(value) => {
                            const newRules = [...matchRules];
                            newRules[ruleIndex] = { ...newRules[ruleIndex], webhookField: value };
                            setMatchRules(newRules);
                          }}
                        >
                          <SelectTrigger data-testid={`select-webhook-field-${ruleIndex}`}>
                            <SelectValue placeholder="Select webhook field" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {filteredWebhookFields.map((field, fieldIndex) => (
                              <SelectItem 
                                key={`${field.path}-${fieldIndex}`} 
                                value={field.path}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{field.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({field.sampleValue})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={rule.webhookField}
                          onValueChange={(value) => {
                            const newRules = [...matchRules];
                            newRules[ruleIndex] = { ...newRules[ruleIndex], webhookField: value };
                            setMatchRules(newRules);
                          }}
                        >
                          <SelectTrigger data-testid={`select-webhook-field-${ruleIndex}`}>
                            <SelectValue placeholder="Select webhook field" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {sortedCrmFields.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* CRM Fields - RIGHT side (Multi-select) */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Matches if equals ANY of these CRM fields (OR logic)
                      </Label>
                      <div className="border rounded-md p-2 min-h-[40px] bg-background">
                        {/* Selected CRM fields as badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rule.crmFields.map((crmField, cfIndex) => {
                            const fieldLabel = sortedCrmFields.find(f => f.key === crmField)?.label || crmField;
                            return (
                              <Badge 
                                key={cfIndex} 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-destructive/20"
                                onClick={() => {
                                  const newRules = [...matchRules];
                                  newRules[ruleIndex] = {
                                    ...newRules[ruleIndex],
                                    crmFields: newRules[ruleIndex].crmFields.filter((_, i) => i !== cfIndex)
                                  };
                                  setMatchRules(newRules);
                                }}
                                data-testid={`badge-crm-field-${ruleIndex}-${cfIndex}`}
                              >
                                {fieldLabel}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                        </div>
                        {/* Add CRM field dropdown */}
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && !rule.crmFields.includes(value)) {
                              const newRules = [...matchRules];
                              newRules[ruleIndex] = {
                                ...newRules[ruleIndex],
                                crmFields: [...newRules[ruleIndex].crmFields, value]
                              };
                              setMatchRules(newRules);
                            }
                          }}
                        >
                          <SelectTrigger 
                            className="h-8 text-xs" 
                            data-testid={`select-add-crm-field-${ruleIndex}`}
                          >
                            <SelectValue placeholder="+ Add CRM field to match" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {sortedCrmFields
                              .filter(f => !rule.crmFields.includes(f.key))
                              .map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Rule preview */}
                  {rule.webhookField && rule.crmFields.length > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <span className="font-medium">Match logic:</span> If webhook's "{rule.webhookField}" equals CRM's{' '}
                      {rule.crmFields.map((cf, i) => {
                        const label = sortedCrmFields.find(f => f.key === cf)?.label || cf;
                        return (
                          <span key={i}>
                            {i > 0 && <span className="text-primary font-medium"> OR </span>}
                            "{label}"
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {matchRules.length > 1 && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Multiple rules work with OR logic - a lead matches if ANY rule matches.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Skip Allocation Rules Option */}
        {matchMode !== 'create_only' && (
          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
            <Switch
              id="skip-allocation"
              checked={skipAllocationOnMatch}
              onCheckedChange={setSkipAllocationOnMatch}
              data-testid="switch-skip-allocation"
            />
            <div className="flex-1">
              <Label htmlFor="skip-allocation" className="text-sm font-medium cursor-pointer">
                Skip Allocation Rules
              </Label>
              <p className="text-xs text-muted-foreground">
                When a matching lead is found, keep it in its current sheet instead of applying allocation rules.
              </p>
            </div>
          </div>
        )}

        {/* Update Field Mappings */}
        {(matchMode === 'match_and_update' || matchMode === 'match_or_create') && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Update Field Mappings</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Map CRM fields to webhook data for updating matched leads. Green checkmark shows mapped fields.
            </p>
            
            {updateFieldMappings.map((mapping, index) => {
              const isUpdateMapped = mapping.target_column && mapping.source_field;
              return (
              <div key={index} className="flex items-end gap-2" data-testid={`update-mapping-row-${index}`}>
                {/* CRM Field to Update - LEFT side */}
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    CRM Field to Update
                    {isUpdateMapped && (
                      <Check className="h-3 w-3 text-green-600" />
                    )}
                  </Label>
                  <Select
                    value={mapping.target_column}
                    onValueChange={(value) => updateUpdateFieldMapping(index, "target_column", value)}
                  >
                    <SelectTrigger 
                      className={`w-full ${isUpdateMapped ? 'border-green-500 ring-1 ring-green-500/20' : ''}`} 
                      data-testid={`select-update-target-${index}`}
                    >
                      <SelectValue placeholder="Select CRM field" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {sortedCrmFields.map((field) => {
                        const isFieldMapped = updateFieldMappings.some(
                          (m, i) => i !== index && m.target_column === field.key && m.source_field
                        );
                        return (
                          <SelectItem key={field.key} value={field.key}>
                            <div className="flex items-center gap-2">
                              {isFieldMapped && (
                                <Check className="h-3 w-3 text-green-600 shrink-0" />
                              )}
                              <span>{field.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* Webhook Field - RIGHT side */}
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                  {filteredWebhookFields.length > 0 ? (
                    <Select
                      value={mapping.source_field}
                      onValueChange={(value) => updateUpdateFieldMapping(index, "source_field", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-update-source-${index}`}>
                        <SelectValue placeholder="Select a field" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                          {filteredWebhookFields.map((field, fieldIndex) => (
                            <SelectItem 
                              key={`${field.path}-${fieldIndex}`} 
                              value={field.path}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{field.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {field.sampleValue}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={mapping.source_field}
                      onChange={(e) => updateUpdateFieldMapping(index, "source_field", e.target.value)}
                      placeholder="e.g., status, notes"
                      className="w-full"
                      data-testid={`input-update-source-${index}`}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUpdateFieldMapping(index)}
                  disabled={updateFieldMappings.length === 1}
                  data-testid={`button-remove-update-mapping-${index}`}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );})}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addUpdateFieldMapping}
              data-testid="button-add-update-mapping"
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Update Mapping
            </Button>
          </div>
        )}

        {/* No Match Action */}
        {matchMode !== 'create_only' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">When No Match Found</Label>
            <Select value={noMatchAction} onValueChange={(value) => setNoMatchAction(value as NoMatchAction)}>
              <SelectTrigger data-testid="select-no-match-action">
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create_lead">Create New Lead</SelectItem>
                <SelectItem value="ignore">Ignore (Skip)</SelectItem>
                <SelectItem value="log_only">Log Only (No Action)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {noMatchAction === 'create_lead' && "If no matching lead is found, create a new lead with the webhook data."}
              {noMatchAction === 'ignore' && "If no matching lead is found, silently ignore the webhook request."}
              {noMatchAction === 'log_only' && "If no matching lead is found, log the request but take no action."}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-matchmode">
            Cancel
          </Button>
          <Button
            onClick={handleSaveMatchMode}
            disabled={updateMutation.isPending}
            data-testid="button-save-matchmode"
          >
            {updateMutation.isPending ? "Saving..." : "Save Match Mode"}
          </Button>
        </div>
      </TabsContent>

      {/* Pending Allocations Tab */}
      <TabsContent value="pending" className="space-y-4 py-2">
        {pendingRequests.length === 0 ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              No pending allocations. All webhook requests have been processed.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {pendingRequests.length} lead{pendingRequests.length !== 1 ? 's' : ''} waiting to be allocated. 
                These came in when no allocation rules matched.
              </AlertDescription>
            </Alert>

            {/* Bulk Actions */}
            <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Bulk Actions</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedPendingIds.size === pendingRequests.length) {
                        setSelectedPendingIds(new Set());
                      } else {
                        setSelectedPendingIds(new Set(pendingRequests.map(r => r.id)));
                      }
                    }}
                    data-testid="button-select-all-pending"
                  >
                    {selectedPendingIds.size === pendingRequests.length ? "Deselect All" : "Select All"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {selectedPendingIds.size} selected
                  </span>
                </div>
              </div>

              {selectedPendingIds.size > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={allocateToSheetId} onValueChange={setAllocateToSheetId}>
                    <SelectTrigger className="flex-1" data-testid="select-allocate-sheet">
                      <SelectValue placeholder="Select sheet to allocate to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    disabled={!allocateToSheetId || bulkAllocatePendingMutation.isPending}
                    onClick={() => {
                      bulkAllocatePendingMutation.mutate({
                        requestIds: Array.from(selectedPendingIds),
                        sheetId: allocateToSheetId,
                      });
                    }}
                    data-testid="button-bulk-allocate"
                    className="shrink-0"
                  >
                    {bulkAllocatePendingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Allocate to Sheet
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reprocessPendingMutation.isPending}
                    onClick={() => {
                      reprocessPendingMutation.mutate(Array.from(selectedPendingIds));
                    }}
                    data-testid="button-reprocess"
                    className="shrink-0"
                  >
                    {reprocessPendingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Re-process with Rules
                  </Button>
                </div>
              )}
            </div>

            {/* Pending Requests List */}
            <ScrollArea className="h-[350px] border rounded-lg">
              <div className="p-3 space-y-2">
                {pendingRequests.map((request) => {
                  const date = new Date(request.created_at);
                  const isSelected = selectedPendingIds.has(request.id);
                  const isExpanded = expandedPendingId === request.id;
                  const payloadKeys = Object.keys(request.payload || {});
                  
                  return (
                    <div 
                      key={request.id} 
                      className={cn(
                        "border rounded-md p-3 transition-colors",
                        isSelected && "bg-primary/5 border-primary/30"
                      )}
                      data-testid={`pending-request-${request.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedPendingIds);
                            if (e.target.checked) {
                              newSet.add(request.id);
                            } else {
                              newSet.delete(request.id);
                            }
                            setSelectedPendingIds(newSet);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          data-testid={`checkbox-pending-${request.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              pending_allocation
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(date)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {payloadKeys.length} fields: {payloadKeys.slice(0, 4).join(", ")}{payloadKeys.length > 4 ? "..." : ""}
                          </p>
                          
                          {/* Expandable payload preview */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-6 px-2 text-xs"
                            onClick={() => setExpandedPendingId(isExpanded ? null : request.id)}
                            data-testid={`button-toggle-pending-${request.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                            {isExpanded ? "Hide Data" : "View Data"}
                          </Button>
                          
                          {isExpanded && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <ScrollArea className="max-h-[150px]">
                                <pre className="font-mono whitespace-pre-wrap break-all">
                                  {JSON.stringify(request.payload, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick allocate for single item */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Select
                            value=""
                            onValueChange={(sheetId) => {
                              allocatePendingMutation.mutate({ requestId: request.id, sheetId });
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-quick-allocate-${request.id}`}>
                              <SelectValue placeholder="Allocate to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {sheets.map(sheet => (
                                <SelectItem key={sheet.id} value={sheet.id}>
                                  {sheet.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="flex justify-end pt-4 border-t mt-6">
          <Button variant="outline" onClick={onClose} data-testid="button-close-pending">
            Close
          </Button>
        </div>
      </TabsContent>

      {/* Duplicate Lead Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Lead Found
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  A lead with mobile number <strong>{pendingCustomFields?.mobile_no}</strong> already exists in your company.
                </p>
                {duplicateInfo && (
                  <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                    <p><strong>Existing Lead:</strong></p>
                    <p>Name: {duplicateInfo.custom_fields?.full_name || "N/A"}</p>
                    <p>Mobile: {duplicateInfo.custom_fields?.mobile_no || "N/A"}</p>
                    <p>Sheet: {duplicateInfo.sheet_name}</p>
                    <p>Created: {new Date(duplicateInfo.created_at).toLocaleDateString()}</p>
                  </div>
                )}
                <p className="text-muted-foreground">
                  What would you like to do?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleSkipDuplicate}
              data-testid="button-skip-duplicate-webhook"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Don't Add
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMergeDuplicate}
              disabled={mergeMutation.isPending}
              data-testid="button-merge-duplicate-webhook"
              className="flex items-center gap-2 bg-primary"
            >
              {mergeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4" />
              )}
              Merge Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
