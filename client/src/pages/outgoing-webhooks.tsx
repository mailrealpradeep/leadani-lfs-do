import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Send,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Settings,
  PlayCircle,
  ClipboardList,
  Copy,
  RefreshCw,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OutgoingWebhook, Sheet, CustomColumn, FieldCondition, OutgoingWebhookEvent } from "@shared/schema";

const EVENT_OPTIONS: { value: OutgoingWebhookEvent; label: string; description: string }[] = [
  { value: "lead_created", label: "Lead Created", description: "When a new lead is added to any sheet" },
  { value: "lead_updated", label: "Lead Updated", description: "When lead fields are modified" },
  { value: "field_changed", label: "Field Value Changed", description: "When a specific dropdown field changes" },
  { value: "lead_update_added", label: "Lead Update Added", description: "When a new update/note is added to a lead" },
  { value: "lead_transferred", label: "Lead Transferred", description: "When a lead is moved to another sheet" },
];

interface LocalFieldCondition {
  field: string;
  from_value?: string | null;
  to_value?: string | null;
}

interface WebhookFormData {
  name: string;
  url: string;
  events: OutgoingWebhookEvent[];
  field_conditions: LocalFieldCondition[];
  sheet_ids: string[];
  selected_fields: string[];
  headers: Record<string, string>;
  is_active: boolean;
}

export default function OutgoingWebhooks() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<OutgoingWebhook | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<OutgoingWebhook | null>(null);
  const [testResultOpen, setTestResultOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState<WebhookFormData>({
    name: "",
    url: "",
    events: [],
    field_conditions: [],
    sheet_ids: [],
    selected_fields: [],
    headers: {},
    is_active: true,
  });

  const { data: webhooks = [], isLoading } = useQuery<OutgoingWebhook[]>({
    queryKey: ["/api/admin/company/outgoing-webhooks"],
  });

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/columns"],
  });

  const dropdownColumns = columns.filter((col) => col.type === "dropdown");

  const createMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      return apiRequest("POST", "/api/admin/company/outgoing-webhooks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/outgoing-webhooks"] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Webhook created",
        description: "Your outgoing webhook has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create webhook",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookFormData> }) => {
      return apiRequest("PUT", `/api/admin/company/outgoing-webhooks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/outgoing-webhooks"] });
      setConfigureDialogOpen(false);
      toast({
        title: "Webhook updated",
        description: "Webhook has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update webhook",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/company/outgoing-webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/outgoing-webhooks"] });
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
      toast({
        title: "Webhook deleted",
        description: "Webhook has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete webhook",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/company/outgoing-webhooks/${id}/test`);
      return response;
    },
    onSuccess: (data: any) => {
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Test webhook sent successfully" : "Test webhook failed"),
      });
      setTestResultOpen(true);
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error.message || "Failed to send test webhook",
      });
      setTestResultOpen(true);
    },
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/company/outgoing-webhooks/${id}/regenerate-secret`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/outgoing-webhooks"] });
      toast({
        title: "Secret regenerated",
        description: "A new signing secret has been generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate secret",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      events: [],
      field_conditions: [],
      sheet_ids: [],
      selected_fields: [],
      headers: {},
      is_active: true,
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a webhook name", variant: "destructive" });
      return;
    }
    if (!formData.url.trim()) {
      toast({ title: "Error", description: "Please enter a webhook URL", variant: "destructive" });
      return;
    }
    if (formData.events.length === 0) {
      toast({ title: "Error", description: "Please select at least one event", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleToggle = (webhook: OutgoingWebhook) => {
    updateMutation.mutate({
      id: webhook.id,
      data: { is_active: !webhook.is_active },
    });
  };

  const handleConfigure = (webhook: OutgoingWebhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events || [],
      field_conditions: webhook.field_conditions || [],
      sheet_ids: webhook.sheet_ids || [],
      selected_fields: webhook.selected_fields || [],
      headers: webhook.headers || {},
      is_active: webhook.is_active,
    });
    setConfigureDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedWebhook) return;
    updateMutation.mutate({
      id: selectedWebhook.id,
      data: formData,
    });
  };

  const handleEventToggle = (event: OutgoingWebhookEvent) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSheetToggle = (sheetId: string) => {
    setFormData((prev) => ({
      ...prev,
      sheet_ids: prev.sheet_ids.includes(sheetId)
        ? prev.sheet_ids.filter((id) => id !== sheetId)
        : [...prev.sheet_ids, sheetId],
    }));
  };

  const handleFieldToggle = (fieldKey: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_fields: prev.selected_fields.includes(fieldKey)
        ? prev.selected_fields.filter((f) => f !== fieldKey)
        : [...prev.selected_fields, fieldKey],
    }));
  };

  const addFieldCondition = () => {
    setFormData((prev) => ({
      ...prev,
      field_conditions: [
        ...prev.field_conditions,
        { field: "", from_value: "", to_value: "" },
      ],
    }));
  };

  const updateFieldCondition = (index: number, updates: Partial<LocalFieldCondition>) => {
    setFormData((prev) => ({
      ...prev,
      field_conditions: prev.field_conditions.map((cond, i) =>
        i === index ? { ...cond, ...updates } : cond
      ),
    }));
  };

  const removeFieldCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      field_conditions: prev.field_conditions.filter((_, i) => i !== index),
    }));
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "Copied",
      description: "Signing secret copied to clipboard",
    });
  };

  const getEventBadge = (event: OutgoingWebhookEvent) => {
    const option = EVENT_OPTIONS.find((o) => o.value === event);
    return option?.label || event;
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-outgoing-webhooks">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Send className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="heading-outgoing-webhooks">Outgoing Webhooks</h1>
            <p className="text-sm text-muted-foreground">Send lead data to external systems automatically</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-outgoing-webhook">
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6 max-w-6xl">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium" data-testid="text-empty-state">No outgoing webhooks yet</p>
                  <p className="text-sm mt-2">
                    Create your first outgoing webhook to send lead data to external systems
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-empty-state">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} data-testid={`card-outgoing-webhook-${webhook.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle className="text-lg truncate" data-testid={`text-webhook-name-${webhook.id}`}>{webhook.name}</CardTitle>
                          <Badge variant={webhook.is_active ? "default" : "secondary"} data-testid={`badge-status-${webhook.id}`}>
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2 truncate">{webhook.url}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(webhook)}
                          data-testid={`button-toggle-outgoing-${webhook.id}`}
                        >
                          {webhook.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                          data-testid={`button-test-${webhook.id}`}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConfigure(webhook)}
                          data-testid={`button-configure-outgoing-${webhook.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setWebhookToDelete(webhook);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-outgoing-${webhook.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Trigger Events</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(webhook.events || []).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {getEventBadge(event)}
                          </Badge>
                        ))}
                        {(webhook.events || []).length === 0 && (
                          <span className="text-xs text-muted-foreground">No events configured</span>
                        )}
                      </div>
                    </div>
                    {webhook.secret && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Signing Secret</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted rounded-md text-xs font-mono truncate">
                            {webhook.secret}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copySecret(webhook.secret!)}
                            data-testid={`button-copy-secret-${webhook.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => regenerateSecretMutation.mutate(webhook.id)}
                            disabled={regenerateSecretMutation.isPending}
                            data-testid={`button-regenerate-secret-${webhook.id}`}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(webhook.created_at), "PPP")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Outgoing Webhook</DialogTitle>
            <DialogDescription>
              Send lead data to external systems when events occur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Webhook Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Notify CRM, WhatsApp Integration"
                data-testid="input-outgoing-webhook-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
                data-testid="input-outgoing-webhook-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Events</Label>
              <div className="grid gap-3">
                {EVENT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => handleEventToggle(option.value)}
                  >
                    <Checkbox
                      checked={formData.events.includes(option.value)}
                      onCheckedChange={() => handleEventToggle(option.value)}
                      data-testid={`checkbox-event-${option.value}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-create-outgoing-webhook-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure: {selectedWebhook?.name}</DialogTitle>
            <DialogDescription>
              Customize when and what data is sent to your webhook
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="events" className="w-full" data-testid="tabs-configure">
            <TabsList className="w-full">
              <TabsTrigger value="events" className="flex-1" data-testid="tab-events">Events</TabsTrigger>
              <TabsTrigger value="conditions" className="flex-1" data-testid="tab-conditions">Conditions</TabsTrigger>
              <TabsTrigger value="sheets" className="flex-1" data-testid="tab-sheets">Sheets</TabsTrigger>
              <TabsTrigger value="fields" className="flex-1" data-testid="tab-fields">Fields</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1" data-testid="tab-settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Trigger Events</Label>
                <div className="grid gap-3">
                  {EVENT_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-start gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => handleEventToggle(option.value)}
                      data-testid={`config-event-${option.value}`}
                    >
                      <Checkbox
                        checked={formData.events.includes(option.value)}
                        onCheckedChange={() => handleEventToggle(option.value)}
                        data-testid={`checkbox-config-event-${option.value}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Field Conditions (for "Field Changed" event)</Label>
                  <Button variant="outline" size="sm" onClick={addFieldCondition} data-testid="button-add-condition">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Specify which field changes should trigger the webhook (e.g., when Status changes to "Qualified").
                  Leave From/To empty to match any value.
                </p>
                {formData.field_conditions.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-sm text-muted-foreground">No field conditions configured</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add conditions to trigger only on specific field changes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="conditions-list">
                    {formData.field_conditions.map((condition, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg" data-testid={`condition-row-${index}`}>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Select
                            value={condition.field}
                            onValueChange={(value) =>
                              updateFieldCondition(index, { field: value })
                            }
                          >
                            <SelectTrigger data-testid={`select-condition-field-${index}`}>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownColumns.map((col) => (
                                <SelectItem key={col.id} value={col.column_key}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="From value (any)"
                            value={condition.from_value || ""}
                            onChange={(e) =>
                              updateFieldCondition(index, { from_value: e.target.value || null })
                            }
                            data-testid={`input-condition-from-${index}`}
                          />
                          <Input
                            placeholder="To value (any)"
                            value={condition.to_value || ""}
                            onChange={(e) =>
                              updateFieldCondition(index, { to_value: e.target.value || null })
                            }
                            data-testid={`input-condition-to-${index}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFieldCondition(index)}
                          data-testid={`button-remove-condition-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sheets" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Filter by Sheets (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Only send webhooks for leads in selected sheets. Leave empty to include all sheets.
                </p>
                <div className="grid gap-2 max-h-60 overflow-y-auto" data-testid="sheets-list">
                  {sheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => handleSheetToggle(sheet.id)}
                      data-testid={`sheet-item-${sheet.id}`}
                    >
                      <Checkbox
                        checked={formData.sheet_ids.includes(sheet.id)}
                        onCheckedChange={() => handleSheetToggle(sheet.id)}
                        data-testid={`checkbox-sheet-${sheet.id}`}
                      />
                      <span className="text-sm">{sheet.name}</span>
                    </div>
                  ))}
                  {sheets.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No sheets available</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Fields to Include (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Choose which lead fields to send in the payload. Leave empty to send all fields.
                </p>
                <div className="grid gap-2 max-h-60 overflow-y-auto" data-testid="fields-list">
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => handleFieldToggle(col.column_key)}
                      data-testid={`field-item-${col.column_key}`}
                    >
                      <Checkbox
                        checked={formData.selected_fields.includes(col.column_key)}
                        onCheckedChange={() => handleFieldToggle(col.column_key)}
                        data-testid={`checkbox-field-${col.column_key}`}
                      />
                      <span className="text-sm">{col.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto" data-testid={`badge-field-type-${col.column_key}`}>
                        {col.type}
                      </Badge>
                    </div>
                  ))}
                  {columns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No columns available</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="config-url">Webhook URL</Label>
                <Input
                  id="config-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  data-testid="input-config-url"
                />
              </div>
              <div className="space-y-2">
                <Label>Active Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                    data-testid="switch-active-status"
                  />
                  <span className="text-sm" data-testid="text-active-status">
                    {formData.is_active ? "Webhook is active" : "Webhook is paused"}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigureDialogOpen(false)} data-testid="button-cancel-configure">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-webhook">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{webhookToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => webhookToDelete && deleteMutation.mutate(webhookToDelete.id)}
              data-testid="button-confirm-delete-outgoing"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={testResultOpen} onOpenChange={setTestResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Trash2 className="h-5 w-5 text-destructive" />
              )}
              Test Result
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">{testResult?.message}</p>
          <DialogFooter>
            <Button onClick={() => setTestResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
