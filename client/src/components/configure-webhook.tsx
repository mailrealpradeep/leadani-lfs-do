import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle, Check } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CompanyWebhook, Sheet } from "@shared/schema";

interface FieldMapping {
  webhook_field: string;
  sheet_column_key: string;
}

interface AllocationRule {
  sheet_id: string;
  percentage: number;
  condition_field?: string | null;
  condition_operator?: string | null;
  condition_value?: string | null;
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

  // Fetch sheets for allocation
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch current webhook configuration
  const { data: webhookDetails } = useQuery<{
    field_mappings: FieldMapping[];
    allocation_rules: AllocationRule[];
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


  // Load existing configuration when data arrives
  useEffect(() => {
    if (webhookDetails?.field_mappings && webhookDetails.field_mappings.length > 0) {
      setFieldMappings(webhookDetails.field_mappings);
    }
    if (webhookDetails?.allocation_rules && webhookDetails.allocation_rules.length > 0) {
      setAllocationRules(webhookDetails.allocation_rules);
    }
  }, [webhookDetails]);

  const updateMutation = useMutation({
    mutationFn: async (data: { field_mappings?: FieldMapping[]; allocation_rules?: AllocationRule[] }) => {
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

  const updateAllocationRule = (index: number, field: keyof AllocationRule, value: string | number | boolean) => {
    const updated = [...allocationRules];
    if (field === "percentage") {
      updated[index].percentage = Number(value);
    } else if (field === "is_default") {
      updated[index].is_default = Boolean(value);
      // Clear condition fields when marking as default
      if (Boolean(value)) {
        updated[index].condition_field = null;
        updated[index].condition_operator = null;
        updated[index].condition_value = null;
      }
    } else if (field === "condition_field" || field === "condition_operator" || field === "condition_value") {
      updated[index][field] = value as string | null;
    } else if (field === "sheet_id") {
      updated[index].sheet_id = String(value);
    } else if (field === "priority") {
      updated[index].priority = Number(value);
    }
    setAllocationRules(updated);
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

  const validateAllocationRules = () => {
    // Filter to only valid rules (both sheet_id and percentage > 0)
    const validRules = allocationRules.filter((r) => r.sheet_id && r.percentage > 0);
    
    if (validRules.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one allocation rule with a sheet and percentage is required",
        variant: "destructive",
      });
      return false;
    }

    // Validate percentages sum to 100%
    const totalPercentage = validRules.reduce((sum, rule) => sum + rule.percentage, 0);
    if (totalPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: `Allocation percentages must sum to 100% (current: ${totalPercentage}%)`,
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

    const validRules = allocationRules.filter((r) => r.sheet_id && r.percentage > 0);
    updateMutation.mutate({ allocation_rules: validRules });
  };

  // Calculate percentage totals per condition group
  const calculateConditionGroups = () => {
    const groups: Record<string, { rules: AllocationRule[], total: number, label: string }> = {};
    
    allocationRules.forEach(rule => {
      // Create a key for this condition group
      let groupKey: string;
      let groupLabel: string;
      
      if (rule.is_default) {
        groupKey = 'default';
        groupLabel = 'Default/Fallback Rules';
      } else if (rule.condition_field && rule.condition_operator && rule.condition_value) {
        groupKey = `${rule.condition_field}|${rule.condition_operator}|${rule.condition_value}`;
        groupLabel = `${rule.condition_field} ${rule.condition_operator} "${rule.condition_value}"`;
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
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="mappings" data-testid="tab-mappings">
          Field Mappings
        </TabsTrigger>
        <TabsTrigger value="allocation" data-testid="tab-allocation">
          Allocation Rules
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mappings" className="space-y-4 py-2">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Map fields from your webhook payload to CRM fields. Use dot notation for nested fields (e.g., user.contact.email).
          </AlertDescription>
        </Alert>

        {/* Show raw webhook JSON payload */}
        {webhookRequests.length > 0 && webhookRequests[0].payload && (
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-medium">Most Recent Webhook Data</Label>
            <div className="border rounded-md p-3 bg-muted/50 max-h-64 overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(webhookRequests[0].payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Field Mappings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Field Mappings</Label>
          
          {fieldMappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2" data-testid={`mapping-row-${index}`}>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                <Input
                  value={mapping.webhook_field}
                  onChange={(e) => updateFieldMapping(index, "webhook_field", e.target.value)}
                  placeholder="e.g., name, mobile_no"
                  className="w-full"
                  data-testid={`input-webhook-field-${index}`}
                />
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
                  <Label className="text-xs font-medium">Condition (optional)</Label>
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
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                      <Input
                        value={rule.condition_field || ""}
                        onChange={(e) => updateAllocationRule(index, "condition_field", e.target.value)}
                        placeholder="e.g., language, source"
                        className="w-full"
                        data-testid={`input-condition-field-${index}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Operator</Label>
                      <select
                        value={rule.condition_operator || ""}
                        onChange={(e) => updateAllocationRule(index, "condition_operator", e.target.value)}
                        data-testid={`select-condition-operator-${index}`}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="starts_with">Starts With</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Value</Label>
                      <Input
                        value={rule.condition_value || ""}
                        onChange={(e) => updateAllocationRule(index, "condition_value", e.target.value)}
                        placeholder="e.g., Telugu, Odia"
                        className="w-full"
                        data-testid={`input-condition-value-${index}`}
                      />
                    </div>
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
                      {isUnderAllocated && `⚠️ ${100 - group.total}% unallocated - add more rules or adjust percentages`}
                      {isOverAllocated && `⚠️ ${group.total - 100}% over-allocated - reduce percentages`}
                    </div>
                  )}
                  {isIncomplete && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠️ Complete the condition fields or mark as default
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
    </Tabs>
  );
}
