import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle, Check, X, ChevronDown } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CompanyWebhook, Sheet } from "@shared/schema";

// Interface for extracted webhook fields with friendly display
interface ExtractedWebhookField {
  path: string;       // The actual path to use (e.g., "user.name" or "fields.0.value")
  label: string;      // Friendly display name (e.g., "Name")
  sampleValue: string; // Sample value for preview
}

// Universal webhook field extraction - handles ANY response type
function extractWebhookFields(payload: any, prefix = "", depth = 0): ExtractedWebhookField[] {
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
    const isRootLevel = depth === 0 && !prefix;
    const value = truncateValue(payload, isRootLevel);
    if (value) {
      fields.push({
        path: prefix || "value",
        label: prefix ? formatLabel(prefix.split(".").pop() || "Value") : "Response Value",
        sampleValue: value
      });
    }
    return fields;
  }

  // Handle arrays - works for root-level arrays or nested arrays
  if (Array.isArray(payload)) {
    // Limit to first 20 items to avoid overwhelming the UI
    const maxItems = Math.min(payload.length, 20);
    
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
            sampleValue: value
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
            fields.push({
              path: `${itemPath}.${valueKey}`,
              label: fieldLabel,
              sampleValue
            });
            
            // Also add key-based access if available
            if (item.key && typeof item.key === "string") {
              fields.push({
                path: item.key,
                label: `${fieldLabel} (by key)`,
                sampleValue
              });
            }
          }
          // Also extract other fields from this object (excluding title/value keys)
          for (const [key, val] of Object.entries(item)) {
            if (key !== titleKey && key !== valueKey && key !== "key") {
              fields.push(...extractWebhookFields(val, `${itemPath}.${key}`, depth + 1));
            }
          }
        } else {
          // Regular object - recurse into all fields
          fields.push(...extractWebhookFields(item, itemPath, depth + 1));
        }
      } else {
        // Nested array - recurse
        fields.push(...extractWebhookFields(item, itemPath, depth + 1));
      }
    }
    
    // Add notice if array was truncated
    if (payload.length > 20) {
      fields.push({
        path: `${prefix || "array"}._info`,
        label: `... and ${payload.length - 20} more items`,
        sampleValue: "(array truncated)"
      });
    }
    
    return fields;
  }

  // Handle objects
  for (const [key, value] of Object.entries(payload)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
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
          sampleValue
        });
      }
    } else if (Array.isArray(value)) {
      // Array - recurse
      fields.push(...extractWebhookFields(value, fieldPath, depth + 1));
    } else {
      // Nested object - recurse
      fields.push(...extractWebhookFields(value, fieldPath, depth + 1));
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
// Note: We're permissive here - booleans and zeros ARE valid webhook data
function isMeaningfulSampleValue(value: any, isRootLevel = false): boolean {
  if (value === null || value === undefined) return false;
  
  // Detect objects that can't be displayed
  if (typeof value === "object" && !Array.isArray(value)) return false;
  
  const str = String(value).trim();
  
  // Filter out only truly unusable values
  const unusableValues = [
    "[object Object]", "null", "undefined", "", "NaN"
  ];
  
  if (unusableValues.includes(str.toLowerCase())) return false;
  
  // For root-level values, always accept booleans and numbers
  if (isRootLevel) return true;
  
  // For nested values, booleans and simple numbers are still valid data
  // Only reject very short single-digit numbers that look like array indices
  // Actually, let's be permissive - "0", "1", "true", "false" can all be valid data
  
  return true;
}

// Truncate long values for display and detect unusable values
function truncateValue(value: any, isRootLevel = false): string {
  if (!isMeaningfulSampleValue(value, isRootLevel)) {
    return "";
  }
  
  const str = String(value).trim();
  
  if (str.length > 30) {
    return str.substring(0, 27) + "...";
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
}

interface UpdateFieldMapping {
  source_field: string;
  target_column: string;
}

type MatchMode = 'create_only' | 'match_and_update' | 'match_and_add_update' | 'match_or_create';
type NoMatchAction = 'create_lead' | 'ignore' | 'log_only';

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
}

interface ConfigureWebhookProps {
  webhook: CompanyWebhook;
  onClose: () => void;
}

const AVAILABLE_CRM_FIELDS = [
  { key: "name", label: "Name" },
  { key: "mobile_no", label: "Mobile Number" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "lang", label: "Language" },
  { key: "occupation", label: "Occupation" },
  { key: "qualification", label: "Qualification" },
  { key: "lead_date", label: "Lead Date" },
  { key: "lead_time", label: "Lead Time" },
  { key: "lead_status", label: "Lead Status" },
  { key: "visit_status", label: "Visit Status" },
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

  // Allocation Rules State
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>([
    { sheet_id: "", percentage: 100 },
  ]);

  // Match Mode State
  const [matchMode, setMatchMode] = useState<MatchMode>('create_only');
  const [matchField, setMatchField] = useState<string>('mobile_no');
  const [updateFieldMappings, setUpdateFieldMappings] = useState<UpdateFieldMapping[]>([
    { source_field: "", target_column: "" },
  ]);
  const [noMatchAction, setNoMatchAction] = useState<NoMatchAction>('create_lead');

  // Fetch sheets for allocation
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch current webhook configuration
  const { data: webhookDetails } = useQuery<{
    field_mappings: FieldMapping[];
    allocation_rules: AllocationRule[];
    match_mode?: MatchMode;
    match_field?: string;
    update_field_mappings?: UpdateFieldMapping[];
    no_match_action?: NoMatchAction;
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

  // Extract available webhook fields from recent payload data (aggregated from multiple requests)
  const availableWebhookFields = useMemo(() => {
    if (webhookRequests.length > 0) {
      return aggregateWebhookFields(webhookRequests);
    }
    return [];
  }, [webhookRequests]);


  // Load existing configuration when data arrives
  useEffect(() => {
    if (webhookDetails?.field_mappings && webhookDetails.field_mappings.length > 0) {
      setFieldMappings(webhookDetails.field_mappings);
    }
    if (webhookDetails?.allocation_rules && webhookDetails.allocation_rules.length > 0) {
      setAllocationRules(webhookDetails.allocation_rules);
    }
    // Load match mode settings
    if (webhookDetails?.match_mode) {
      setMatchMode(webhookDetails.match_mode);
    }
    if (webhookDetails?.match_field) {
      setMatchField(webhookDetails.match_field);
    }
    if (webhookDetails?.update_field_mappings && webhookDetails.update_field_mappings.length > 0) {
      setUpdateFieldMappings(webhookDetails.update_field_mappings);
    }
    if (webhookDetails?.no_match_action) {
      setNoMatchAction(webhookDetails.no_match_action);
    }
  }, [webhookDetails]);

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      field_mappings?: FieldMapping[]; 
      allocation_rules?: AllocationRule[];
      match_mode?: MatchMode;
      match_field?: string;
      update_field_mappings?: UpdateFieldMapping[];
      no_match_action?: NoMatchAction;
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

  // Field Mapping Handlers
  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { webhook_field: "", sheet_column_key: "" }]);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: string) => {
    const updated = [...fieldMappings];
    updated[index][field] = value;
    setFieldMappings(updated);
  };

  // Allocation Rule Handlers
  const addAllocationRule = () => {
    setAllocationRules([...allocationRules, { sheet_id: "", percentage: 0 }]);
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

  const updateUpdateFieldMapping = (index: number, field: keyof UpdateFieldMapping, value: string) => {
    const updated = [...updateFieldMappings];
    updated[index][field] = value;
    setUpdateFieldMappings(updated);
  };

  // Validation
  const validateMappings = () => {
    const validMappings = fieldMappings.filter(
      (m) => m.webhook_field.trim() && m.sheet_column_key.trim()
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

    const validMappings = fieldMappings.filter(
      (m) => m.webhook_field.trim() && m.sheet_column_key.trim()
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
    
    updateMutation.mutate({ allocation_rules: validRules });
  };

  const handleSaveMatchMode = () => {
    // Filter out empty update field mappings - only include complete rows
    const validUpdateMappings = updateFieldMappings.filter(
      (m) => m.source_field.trim() && m.target_column.trim()
    );

    // Note: We allow saving with zero update mappings - the user may rely on
    // default behaviors or configure mappings later. Empty/incomplete rows 
    // are simply filtered out rather than blocking the save.

    updateMutation.mutate({
      match_mode: matchMode,
      match_field: matchField,
      update_field_mappings: validUpdateMappings, // Only send complete mappings, filter out empty rows
      no_match_action: noMatchAction,
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="mappings" data-testid="tab-mappings">
          Field Mappings
        </TabsTrigger>
        <TabsTrigger value="allocation" data-testid="tab-allocation">
          Allocation Rules
        </TabsTrigger>
        <TabsTrigger value="matchmode" data-testid="tab-matchmode">
          Match Mode
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mappings" className="space-y-4 py-2">
        {/* Show helpful message based on webhook data availability */}
        {availableWebhookFields.length > 0 ? (
          <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              We detected {availableWebhookFields.length} fields from your recent webhook data. Select the fields you want to map to your CRM.
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

        {/* Field Mappings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Field Mappings</Label>
          <p className="text-xs text-muted-foreground">
            Select which webhook fields should be saved to your CRM fields.
          </p>
          
          {fieldMappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2" data-testid={`mapping-row-${index}`}>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                {availableWebhookFields.length > 0 ? (
                  <Select
                    value={mapping.webhook_field}
                    onValueChange={(value) => updateFieldMapping(index, "webhook_field", value)}
                  >
                    <SelectTrigger className="w-full" data-testid={`select-webhook-field-${index}`}>
                      <SelectValue placeholder="Select a field" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="max-h-[200px]">
                        {availableWebhookFields.map((field, fieldIndex) => (
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
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={mapping.webhook_field}
                    onChange={(e) => updateFieldMapping(index, "webhook_field", e.target.value)}
                    placeholder="Enter field path (e.g., name, user.email)"
                    className="w-full"
                    data-testid={`input-webhook-field-${index}`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">CRM Field</Label>
                <Select
                  value={mapping.sheet_column_key}
                  onValueChange={(value) => updateFieldMapping(index, "sheet_column_key", value)}
                >
                  <SelectTrigger className="w-full" data-testid={`select-crm-field-${index}`}>
                    <SelectValue placeholder="Select CRM field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCrmFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          ))}
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

        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
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
      </TabsContent>

      <TabsContent value="allocation" className="space-y-4 py-2">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure conditional routing: leads are allocated based on webhook field values. Add conditions to route leads to specific sheets, or mark rules as default for unmatched leads.
          </AlertDescription>
        </Alert>

        {/* Allocation Rules */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Allocation Rules</Label>
          {allocationRules.map((rule, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3" data-testid={`rule-row-${index}`}>
              {/* Condition Configuration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">Conditions</Label>
                  <input
                    type="checkbox"
                    checked={rule.is_default === true}
                    onChange={(e) => updateAllocationRule(index, "is_default", e.target.checked)}
                    className="h-4 w-4"
                    data-testid={`checkbox-is-default-${index}`}
                  />
                  <Label className="text-xs text-muted-foreground">Mark as Default/Fallback</Label>
                </div>
                
                {!rule.is_default && (
                  <div className="space-y-3">
                    {/* AND/OR Toggle */}
                    {(rule.conditions?.length || 0) > 1 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Match:</Label>
                        <ToggleGroup
                          type="single"
                          value={rule.logical_operator || "and"}
                          onValueChange={(value) => {
                            if (value) updateAllocationRule(index, "logical_operator", value as "and" | "or");
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

                    {/* Conditions List */}
                    {(rule.conditions || []).map((condition, condIndex) => (
                      <div key={condIndex} className="flex items-center gap-2">
                        {condIndex > 0 && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {(rule.logical_operator || "and").toUpperCase()}
                          </Badge>
                        )}
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          {availableWebhookFields.length > 0 ? (
                            <Select
                              value={condition.field}
                              onValueChange={(value) => updateConditionInRule(index, condIndex, "field", value)}
                            >
                              <SelectTrigger className="w-full" data-testid={`select-condition-field-${index}-${condIndex}`}>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                <ScrollArea className="max-h-[200px]">
                                  {availableWebhookFields.map((field, fieldIndex) => (
                                    <SelectItem 
                                      key={`${field.path}-${fieldIndex}`} 
                                      value={field.path}
                                    >
                                      <span>{field.label}</span>
                                    </SelectItem>
                                  ))}
                                </ScrollArea>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={condition.field}
                              onChange={(e) => updateConditionInRule(index, condIndex, "field", e.target.value)}
                              placeholder="e.g., language"
                              className="w-full"
                              data-testid={`input-condition-field-${index}-${condIndex}`}
                            />
                          )}
                          <select
                            value={condition.operator}
                            onChange={(e) => updateConditionInRule(index, condIndex, "operator", e.target.value)}
                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                            data-testid={`select-condition-operator-${index}-${condIndex}`}
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
                            onChange={(e) => updateConditionInRule(index, condIndex, "value", e.target.value)}
                            placeholder="Value"
                            className="w-full"
                            data-testid={`input-condition-value-${index}-${condIndex}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeConditionFromRule(index, condIndex)}
                          className="shrink-0 h-8 w-8"
                          data-testid={`button-remove-condition-${index}-${condIndex}`}
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
                      onClick={() => addConditionToRule(index)}
                      data-testid={`button-add-condition-${index}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                )}
              </div>

              {/* Sheet & Percentage */}
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Executive Sheet</Label>
                  <select
                    value={rule.sheet_id}
                    onChange={(e) => updateAllocationRule(index, "sheet_id", e.target.value)}
                    data-testid={`select-sheet-${index}`}
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
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Percentage</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={rule.percentage}
                    onChange={(e) => updateAllocationRule(index, "percentage", e.target.value)}
                    placeholder="0"
                    data-testid={`input-percentage-${index}`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAllocationRule(index)}
                  disabled={allocationRules.length === 1}
                  data-testid={`button-remove-rule-${index}`}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addAllocationRule}
            data-testid="button-add-rule"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

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

        {/* Match Field Selection */}
        {matchMode !== 'create_only' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Match Field</Label>
            <Select value={matchField} onValueChange={setMatchField}>
              <SelectTrigger data-testid="select-match-field">
                <SelectValue placeholder="Select field to match on" />
              </SelectTrigger>
              <SelectContent>
                {availableCrmFields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The CRM field used to find matching leads (e.g., Mobile Number for phone-based matching).
            </p>
          </div>
        )}

        {/* Update Field Mappings */}
        {(matchMode === 'match_and_update' || matchMode === 'match_or_create') && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Update Field Mappings</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select webhook fields to update in your CRM when a matching lead is found.
            </p>
            
            {updateFieldMappings.map((mapping, index) => (
              <div key={index} className="flex items-end gap-2" data-testid={`update-mapping-row-${index}`}>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                  {availableWebhookFields.length > 0 ? (
                    <Select
                      value={mapping.source_field}
                      onValueChange={(value) => updateUpdateFieldMapping(index, "source_field", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-update-source-${index}`}>
                        <SelectValue placeholder="Select a field" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="max-h-[200px]">
                          {availableWebhookFields.map((field, fieldIndex) => (
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
                        </ScrollArea>
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
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">CRM Field to Update</Label>
                  <Select
                    value={mapping.target_column}
                    onValueChange={(value) => updateUpdateFieldMapping(index, "target_column", value)}
                  >
                    <SelectTrigger className="w-full" data-testid={`select-update-target-${index}`}>
                      <SelectValue placeholder="Select CRM field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCrmFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            ))}
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
    </Tabs>
  );
}
