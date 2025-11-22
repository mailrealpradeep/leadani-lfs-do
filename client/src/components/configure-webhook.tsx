import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle } from "lucide-react";
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
import type { CompanyWebhook, Sheet } from "@shared/schema";

interface FieldMapping {
  webhook_field: string;
  sheet_column_key: string;
}

interface AllocationRule {
  sheet_id: string;
  percentage: number;
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

  // Field picker state
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);

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

  // Helper function to flatten nested objects into dot-notation paths with values
  const flattenObject = (obj: Record<string, any>, prefix = ''): Array<{path: string, value: any}> => {
    const fields: Array<{path: string, value: any}> = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      
      // Add the current field with its value
      fields.push({ path: fullPath, value });
      
      // If value is a nested object (not array, not null), recurse
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        fields.push(...flattenObject(value, fullPath));
      }
    }
    
    return fields;
  };

  // Extract webhook fields with values from the most recent webhook request
  const webhookFieldsWithValues = (() => {
    if (webhookRequests.length === 0) return [];
    
    // Backend returns requests ordered by created_at DESC, so first is most recent
    const mostRecentRequest = webhookRequests[0];
    if (!mostRecentRequest.payload) return [];
    
    // Flatten nested objects to extract all possible field paths with their values
    return flattenObject(mostRecentRequest.payload);
  })();

  // Just the field paths for autocomplete
  const availableWebhookFields = webhookFieldsWithValues.map(f => f.path);

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

  // Insert webhook field path into active field input
  const insertFieldPath = (path: string) => {
    if (activeFieldIndex !== null) {
      updateFieldMapping(activeFieldIndex, "webhook_field", path);
      setActiveFieldIndex(null); // Clear active index after insertion
    }
  };

  // Filter webhook fields based on search query
  const filteredWebhookFields = webhookFieldsWithValues.filter(field =>
    field.path.toLowerCase().includes(fieldSearchQuery.toLowerCase()) ||
    String(field.value).toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

  // Allocation Rule Handlers
  const addAllocationRule = () => {
    setAllocationRules([...allocationRules, { sheet_id: "", percentage: 0 }]);
  };

  const removeAllocationRule = (index: number) => {
    setAllocationRules(allocationRules.filter((_, i) => i !== index));
  };

  const updateAllocationRule = (index: number, field: keyof AllocationRule, value: string | number) => {
    const updated = [...allocationRules];
    if (field === "percentage") {
      updated[index].percentage = Number(value);
    } else {
      updated[index].sheet_id = String(value);
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

      <TabsContent value="mappings" className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Map fields from your webhook payload to CRM fields. {webhookFieldsWithValues.length > 0 ? "Select from detected fields or type custom field names." : "Send a test webhook to see available fields."}
          </AlertDescription>
        </Alert>

        {/* Field Mappings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Field Mappings</Label>
          
          {/* Show detected webhook data inline */}
          {webhookFieldsWithValues.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <Label className="text-sm font-medium">Detected Webhook Data</Label>
              <div className="text-xs text-muted-foreground mb-2">
                {webhookFieldsWithValues.length} field{webhookFieldsWithValues.length !== 1 ? 's' : ''} detected from your most recent webhook
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {webhookFieldsWithValues.map((field, idx) => {
                  const isObject = typeof field.value === 'object' && field.value !== null;
                  const valueStr = isObject ? '[Object]' : String(field.value);
                  const valueType = Array.isArray(field.value) ? 'array' : typeof field.value;
                  
                  return (
                    <div key={idx} className="text-xs pl-2 border-l-2 border-muted">
                      <div className="font-medium text-foreground">{field.path} Key: <span className="font-mono text-primary">{field.path}</span></div>
                      <div className="text-muted-foreground">Value: <span className="font-mono">{valueStr}</span></div>
                      <div className="text-muted-foreground">Type: <span className="font-mono">{valueType}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {fieldMappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2" data-testid={`mapping-row-${index}`}>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                <Input
                  value={mapping.webhook_field}
                  onChange={(e) => updateFieldMapping(index, "webhook_field", e.target.value)}
                  placeholder={availableWebhookFields.length > 0 ? "Type or select field key" : "e.g., phone, email, name"}
                  list={`webhook-fields-${index}`}
                  data-testid={`input-webhook-field-${index}`}
                />
                {/* Native HTML datalist for autocomplete suggestions */}
                {availableWebhookFields.length > 0 && (
                  <datalist id={`webhook-fields-${index}`}>
                    {availableWebhookFields.map((field) => (
                      <option key={field} value={field} />
                    ))}
                  </datalist>
                )}
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">CRM Field</Label>
                <Select
                  value={mapping.sheet_column_key}
                  onValueChange={(value) => updateFieldMapping(index, "sheet_column_key", value)}
                >
                  <SelectTrigger data-testid={`select-crm-field-${index}`}>
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
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
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

      <TabsContent value="allocation" className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure how incoming leads are distributed across sheets. Percentages must sum to 100%.
          </AlertDescription>
        </Alert>

        {/* Allocation Rules */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Allocation Rules</Label>
          {allocationRules.map((rule, index) => (
            <div key={index} className="flex items-end gap-2" data-testid={`rule-row-${index}`}>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Sheet</Label>
                <select
                  value={rule.sheet_id}
                  onChange={(e) => updateAllocationRule(index, "sheet_id", e.target.value)}
                  data-testid={`select-sheet-${index}`}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select sheet</option>
                  {sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
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
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addAllocationRule}
            data-testid="button-add-rule"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Percentage Summary */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Allocation</span>
            <span
              className={`text-lg font-semibold ${
                totalPercentage === 100 ? "text-green-600" : "text-destructive"
              }`}
            >
              {totalPercentage}%
            </span>
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Percentages must sum to 100% for the webhook to work correctly
            </p>
          )}
        </div>

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
