import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import type { CustomColumn } from "@shared/schema";

interface LeadTransferConfig {
  enabled: boolean;
  auto_transfer_enabled: boolean;
  auto_transfer_conditions: {
    lead_statuses: string[];
    date_field: "created_at" | "last_edit" | "last_update_date";
    days_threshold: number;
    condition_logic: "or" | "and";
  };
  visit_status_column_key?: string;
}

interface CompanySettings {
  lead_transfer_config?: LeadTransferConfig;
  [key: string]: any;
}

export function LeadTransferConfig({ headless = false }: { headless?: boolean }) {
  const { company } = useAuth();
  const { toast } = useToast();
  
  const { data: companyData } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/company/settings"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", company?.default_sheet_id, "columns"],
    enabled: !!company?.default_sheet_id,
  });

  const config = companyData?.settings?.lead_transfer_config || {
    enabled: false,
    auto_transfer_enabled: false,
    auto_transfer_conditions: {
      lead_statuses: [],
      date_field: "created_at",
      days_threshold: 30,
      condition_logic: "or",
    },
  };

  const [enabled, setEnabled] = useState(config.enabled);
  const [autoTransferEnabled, setAutoTransferEnabled] = useState(config.auto_transfer_enabled);
  const [leadStatuses, setLeadStatuses] = useState<string[]>(config.auto_transfer_conditions.lead_statuses || []);
  const [dateField, setDateField] = useState<"created_at" | "last_edit" | "last_update_date">(
    config.auto_transfer_conditions.date_field || "created_at"
  );
  const [daysThreshold, setDaysThreshold] = useState(config.auto_transfer_conditions.days_threshold || 30);
  const [conditionLogic, setConditionLogic] = useState<"or" | "and">(
    config.auto_transfer_conditions.condition_logic || "or"
  );
  const [visitStatusColumn, setVisitStatusColumn] = useState(config.visit_status_column_key || "");

  useEffect(() => {
    setEnabled(config.enabled);
    setAutoTransferEnabled(config.auto_transfer_enabled);
    setLeadStatuses(config.auto_transfer_conditions.lead_statuses || []);
    setDateField(config.auto_transfer_conditions.date_field || "created_at");
    setDaysThreshold(config.auto_transfer_conditions.days_threshold || 30);
    setConditionLogic(config.auto_transfer_conditions.condition_logic || "or");
    setVisitStatusColumn(config.visit_status_column_key || "");
  }, [config]);

  // Get available lead status values
  const leadStatusColumn = columns.find(col => col.column_key === "lead_status" || col.name.toLowerCase().includes("lead status"));
  const availableLeadStatuses = leadStatusColumn?.dropdown_options?.map(opt => opt.value) || [];

  // Get available visit status columns
  const visitStatusColumns = columns.filter(col => 
    col.column_type === "dropdown" && 
    (col.column_key.toLowerCase().includes("visit") || col.name.toLowerCase().includes("visit"))
  );

  const updateMutation = useMutation({
    mutationFn: async (newConfig: LeadTransferConfig) => {
      const currentSettings = companyData?.settings || {};
      return await apiRequest("PATCH", "/api/company/settings", {
        settings: {
          ...currentSettings,
          lead_transfer_config: newConfig,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Lead transfer configuration has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      enabled,
      auto_transfer_enabled: autoTransferEnabled,
      auto_transfer_conditions: {
        lead_statuses: leadStatuses,
        date_field: dateField,
        days_threshold: daysThreshold,
        condition_logic: conditionLogic,
      },
      visit_status_column_key: visitStatusColumn || undefined,
    });
  };

  const toggleLeadStatus = (status: string) => {
    setLeadStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Lead Transfer Requests</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to request lead transfers when duplicates are found
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Auto-Transfer</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically transfer leads when conditions are met
                </p>
              </div>
              <Switch checked={autoTransferEnabled} onCheckedChange={setAutoTransferEnabled} />
            </div>

            {autoTransferEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Auto-Transfer Conditions</CardTitle>
                  <CardDescription>
                    Configure when leads should be automatically transferred
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lead Statuses</Label>
                    <p className="text-sm text-muted-foreground">
                      Select statuses that qualify for auto-transfer
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableLeadStatuses.map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={leadStatuses.includes(status)}
                            onCheckedChange={() => toggleLeadStatus(status)}
                          />
                          <Label
                            htmlFor={`status-${status}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {status}
                          </Label>
                        </div>
                      ))}
                      {availableLeadStatuses.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No lead status column found. Create a dropdown column with key "lead_status".
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Field</Label>
                    <Select value={dateField} onValueChange={(v: any) => setDateField(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Created At</SelectItem>
                        <SelectItem value="last_edit">Last Edit</SelectItem>
                        <SelectItem value="last_update_date">Last Update Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Days Threshold</Label>
                    <Input
                      type="number"
                      min="1"
                      value={daysThreshold}
                      onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 30)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Leads older than this many days qualify for auto-transfer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition Logic</Label>
                    <Select value={conditionLogic} onValueChange={(v: any) => setConditionLogic(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="or">OR (Status matches OR date threshold met)</SelectItem>
                        <SelectItem value="and">AND (Status matches AND date threshold met)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Visit Status Column</Label>
                    <Select value={visitStatusColumn} onValueChange={setVisitStatusColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visit status column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {visitStatusColumns.map(col => (
                          <SelectItem key={col.id} value={col.column_key}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Column to use for visit status display in duplicate dialog
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </>
        )}
      </Button>
    </div>
  );

  if (headless) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Transfer Configuration</CardTitle>
        <CardDescription>
          Configure automatic lead transfer rules and transfer request settings
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

