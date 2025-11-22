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

const DEMO_WEBHOOK_DATA = {
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  source: "Website",
  campaign: "Summer2025",
  interest: "Product Demo",
};

export function ConfigureWebhook({ webhook, onClose }: ConfigureWebhookProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mappings");
  
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
            Map fields from your webhook payload to CRM fields. Sample webhook data is shown below.
          </AlertDescription>
        </Alert>

        {/* Demo Data Preview */}
        <div className="border rounded-lg p-4 bg-muted">
          <Label className="text-sm font-medium mb-2 block">Sample Webhook Payload</Label>
          <pre className="text-xs font-mono overflow-x-auto">
            {JSON.stringify(DEMO_WEBHOOK_DATA, null, 2)}
          </pre>
        </div>

        {/* Field Mappings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Field Mappings</Label>
          {fieldMappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2" data-testid={`mapping-row-${index}`}>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Webhook Field</Label>
                <Input
                  value={mapping.webhook_field}
                  onChange={(e) => updateFieldMapping(index, "webhook_field", e.target.value)}
                  placeholder="e.g., phone, email, name"
                  data-testid={`input-webhook-field-${index}`}
                />
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
                    {AVAILABLE_CRM_FIELDS.map((field) => (
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
                <Select
                  value={rule.sheet_id}
                  onValueChange={(value) => updateAllocationRule(index, "sheet_id", value)}
                >
                  <SelectTrigger data-testid={`select-sheet-${index}`}>
                    <SelectValue placeholder="Select sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
