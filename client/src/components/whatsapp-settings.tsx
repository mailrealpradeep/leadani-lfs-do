import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle, Check, Settings, Phone, MessageSquare, Zap, FileText, GripVertical, ToggleLeft, ToggleRight, RefreshCw, Eye, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { Sheet, User, CustomColumn } from "@shared/schema";
import { format } from "date-fns";

interface WhatsAppAllocation {
  id: string;
  company_id: string;
  display_phone_number: string;
  user_id: string;
  sheet_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppTriggerRule {
  id: string;
  company_id: string;
  operator: string;
  match_text: string;
  logic: string;
  order_index: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppFieldMapping {
  id: string;
  company_id: string;
  whatsapp_field: string;
  column_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppDefaultValue {
  id: string;
  company_id: string;
  column_key: string;
  default_value: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppMessageLog {
  id: string;
  company_id: string;
  webhook_request_id: string;
  sender_phone: string;
  sender_name: string | null;
  sender_wa_id: string;
  display_phone_number: string;
  message_id: string;
  message_text: string | null;
  message_type: string;
  outcome: string;
  outcome_details: Record<string, any> | null;
  trigger_matched: boolean;
  matched_rule_id: string | null;
  processed_at: string;
  created_at: string;
}

const WHATSAPP_FIELDS = [
  { value: "sender_name", label: "Sender Name" },
  { value: "sender_phone", label: "Sender Phone (Last 10 Digits)" },
  { value: "message_text", label: "Message Text" },
  { value: "display_phone_number", label: "Business Phone Number" },
];

const TRIGGER_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "not_contains", label: "Not Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
];

export function WhatsAppSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("allocations");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);

  // Fetch sheets and users for selection
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/admin/company/columns"],
  });

  // Fetch WhatsApp allocations
  const { data: allocations = [], isLoading: allocationsLoading, refetch: refetchAllocations } = useQuery<WhatsAppAllocation[]>({
    queryKey: ["/api/admin/company/whatsapp/allocations"],
  });

  // Fetch WhatsApp trigger rules
  const { data: triggerRules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery<WhatsAppTriggerRule[]>({
    queryKey: ["/api/admin/company/whatsapp/trigger-rules"],
  });

  // Fetch WhatsApp field mappings
  const { data: fieldMappings = [], isLoading: mappingsLoading, refetch: refetchMappings } = useQuery<WhatsAppFieldMapping[]>({
    queryKey: ["/api/admin/company/whatsapp/field-mappings"],
  });

  // Fetch WhatsApp default values
  const { data: defaultValues = [], isLoading: valuesLoading, refetch: refetchValues } = useQuery<WhatsAppDefaultValue[]>({
    queryKey: ["/api/admin/company/whatsapp/default-values"],
  });

  // Fetch WhatsApp message logs
  const { data: messageLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery<WhatsAppMessageLog[]>({
    queryKey: ["/api/admin/company/whatsapp/message-logs"],
  });

  // Create allocation mutation
  const createAllocationMutation = useMutation({
    mutationFn: async (data: { display_phone_number: string; user_id: string; sheet_id: string }) => {
      return await apiRequest("POST", "/api/admin/company/whatsapp/allocations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/allocations"] });
      toast({ title: "Allocation created", description: "Phone allocation has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Update allocation mutation
  const updateAllocationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WhatsAppAllocation> }) => {
      return await apiRequest("PUT", `/api/admin/company/whatsapp/allocations/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/allocations"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Delete allocation mutation
  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/company/whatsapp/allocations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/allocations"] });
      toast({ title: "Deleted", description: "Allocation has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Create trigger rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: { operator: string; match_text: string; logic: string }) => {
      return await apiRequest("POST", "/api/admin/company/whatsapp/trigger-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/trigger-rules"] });
      toast({ title: "Rule created", description: "Trigger rule has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Update trigger rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WhatsAppTriggerRule> }) => {
      return await apiRequest("PUT", `/api/admin/company/whatsapp/trigger-rules/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/trigger-rules"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Delete trigger rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/company/whatsapp/trigger-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/trigger-rules"] });
      toast({ title: "Deleted", description: "Trigger rule has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Create field mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: { whatsapp_field: string; column_key: string }) => {
      return await apiRequest("POST", "/api/admin/company/whatsapp/field-mappings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/field-mappings"] });
      toast({ title: "Mapping created", description: "Field mapping has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Update field mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WhatsAppFieldMapping> }) => {
      return await apiRequest("PUT", `/api/admin/company/whatsapp/field-mappings/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/field-mappings"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Delete field mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/company/whatsapp/field-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/field-mappings"] });
      toast({ title: "Deleted", description: "Field mapping has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Create default value mutation
  const createDefaultMutation = useMutation({
    mutationFn: async (data: { column_key: string; default_value: string }) => {
      return await apiRequest("POST", "/api/admin/company/whatsapp/default-values", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/default-values"] });
      toast({ title: "Default value created", description: "Default value has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Update default value mutation
  const updateDefaultMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WhatsAppDefaultValue> }) => {
      return await apiRequest("PUT", `/api/admin/company/whatsapp/default-values/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/default-values"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Delete default value mutation
  const deleteDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/company/whatsapp/default-values/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/default-values"] });
      toast({ title: "Deleted", description: "Default value has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Process pending messages mutation
  const processPendingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/company/whatsapp/process-pending");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/whatsapp/message-logs"] });
      toast({ 
        title: "Processing Complete", 
        description: `Processed ${data.processed} messages: ${data.new_leads} new leads, ${data.followups} followups, ${data.transfers} transfers.` 
      });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleDelete = () => {
    if (!itemToDelete) return;

    switch (itemToDelete.type) {
      case "allocation":
        deleteAllocationMutation.mutate(itemToDelete.id);
        break;
      case "rule":
        deleteRuleMutation.mutate(itemToDelete.id);
        break;
      case "mapping":
        deleteMappingMutation.mutate(itemToDelete.id);
        break;
      case "default":
        deleteDefaultMutation.mutate(itemToDelete.id);
        break;
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "new_lead_created":
        return <Badge variant="default" className="bg-green-500">New Lead Created</Badge>;
      case "transfer_request_created":
        return <Badge variant="secondary">Transfer Request</Badge>;
      case "followup_added":
        return <Badge className="bg-blue-500">Follow-up Added</Badge>;
      case "ignored_no_match":
        return <Badge variant="outline">No Match</Badge>;
      case "ignored_no_trigger":
        return <Badge variant="outline">No Trigger Match</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || user?.email || "Unknown User";
  };

  const getSheetName = (sheetId: string) => {
    const sheet = sheets.find((s) => s.id === sheetId);
    return sheet?.name || "Unknown Sheet";
  };

  const getColumnLabel = (columnKey: string) => {
    const column = columns.find((c) => c.column_key === columnKey);
    return column?.name || columnKey;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Lead Settings</h2>
          <p className="text-muted-foreground">
            Configure how WhatsApp messages are processed and converted into leads.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="allocations" className="flex items-center gap-2" data-testid="tab-allocations">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Phone Allocations</span>
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2" data-testid="tab-triggers">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Trigger Rules</span>
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2" data-testid="tab-mappings">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Field Mappings</span>
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2" data-testid="tab-defaults">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Default Values</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2" data-testid="tab-logs">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Message Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Phone Allocations Tab */}
        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Number Allocations
              </CardTitle>
              <CardDescription>
                Map WhatsApp business phone numbers to users and sheets. Messages from a phone number will be allocated to the assigned user and sheet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AllocationForm 
                sheets={sheets} 
                users={users} 
                onSubmit={(data) => createAllocationMutation.mutate(data)} 
                isPending={createAllocationMutation.isPending}
              />

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Assigned User</TableHead>
                      <TableHead>Target Sheet</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading allocations...
                        </TableCell>
                      </TableRow>
                    ) : allocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No phone allocations configured. Add one above to start receiving WhatsApp leads.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-mono">{allocation.display_phone_number}</TableCell>
                          <TableCell>{getUserName(allocation.user_id)}</TableCell>
                          <TableCell>{getSheetName(allocation.sheet_id)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={allocation.enabled}
                              onCheckedChange={(checked) => 
                                updateAllocationMutation.mutate({ id: allocation.id, updates: { enabled: checked } })
                              }
                              data-testid={`toggle-allocation-${allocation.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete({ type: "allocation", id: allocation.id });
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-allocation-${allocation.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trigger Rules Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                New Lead Trigger Rules
              </CardTitle>
              <CardDescription>
                Define conditions that identify when a message should create a new lead. Messages that match these rules will trigger new lead creation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TriggerRuleForm 
                onSubmit={(data) => createRuleMutation.mutate(data)} 
                isPending={createRuleMutation.isPending}
              />

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Order</TableHead>
                      <TableHead>Logic</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Match Text</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading trigger rules...
                        </TableCell>
                      </TableRow>
                    ) : triggerRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No trigger rules configured. Without rules, no new leads will be created from WhatsApp messages.
                        </TableCell>
                      </TableRow>
                    ) : (
                      triggerRules.map((rule, index) => (
                        <TableRow key={rule.id}>
                          <TableCell className="text-center font-mono">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant={rule.logic === "and" ? "default" : "secondary"}>
                              {rule.logic.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {TRIGGER_OPERATORS.find((op) => op.value === rule.operator)?.label || rule.operator}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{rule.match_text}</TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(checked) => 
                                updateRuleMutation.mutate({ id: rule.id, updates: { enabled: checked } })
                              }
                              data-testid={`toggle-rule-${rule.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete({ type: "rule", id: rule.id });
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-rule-${rule.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {triggerRules.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Rules are evaluated in order. For a message to trigger lead creation, it must match the combined rule logic.
                    Use "OR" for any-match conditions and "AND" for all-must-match conditions.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Field Mappings
              </CardTitle>
              <CardDescription>
                Map WhatsApp message fields to your lead columns. This determines which data gets extracted from incoming messages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldMappingForm 
                columns={columns}
                existingMappings={fieldMappings}
                onSubmit={(data) => createMappingMutation.mutate(data)} 
                isPending={createMappingMutation.isPending}
              />

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WhatsApp Field</TableHead>
                      <TableHead>Maps To Column</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappingsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading field mappings...
                        </TableCell>
                      </TableRow>
                    ) : fieldMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No field mappings configured. Add mappings to extract data from WhatsApp messages into lead fields.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fieldMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            {WHATSAPP_FIELDS.find((f) => f.value === mapping.whatsapp_field)?.label || mapping.whatsapp_field}
                          </TableCell>
                          <TableCell>{getColumnLabel(mapping.column_key)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={mapping.enabled}
                              onCheckedChange={(checked) => 
                                updateMappingMutation.mutate({ id: mapping.id, updates: { enabled: checked } })
                              }
                              data-testid={`toggle-mapping-${mapping.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete({ type: "mapping", id: mapping.id });
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-mapping-${mapping.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Values Tab */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Default Values
              </CardTitle>
              <CardDescription>
                Set fixed values that will be applied to all new leads created from WhatsApp messages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DefaultValueForm 
                columns={columns}
                existingDefaults={defaultValues}
                onSubmit={(data) => createDefaultMutation.mutate(data)} 
                isPending={createDefaultMutation.isPending}
              />

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading default values...
                        </TableCell>
                      </TableRow>
                    ) : defaultValues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No default values configured. Add defaults to automatically populate lead fields.
                        </TableCell>
                      </TableRow>
                    ) : (
                      defaultValues.map((value) => (
                        <TableRow key={value.id}>
                          <TableCell>{getColumnLabel(value.column_key)}</TableCell>
                          <TableCell className="font-mono">{value.default_value}</TableCell>
                          <TableCell>
                            <Switch
                              checked={value.enabled}
                              onCheckedChange={(checked) => 
                                updateDefaultMutation.mutate({ id: value.id, updates: { enabled: checked } })
                              }
                              data-testid={`toggle-default-${value.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete({ type: "default", id: value.id });
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-default-${value.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Logs
                  </CardTitle>
                  <CardDescription>
                    View all processed WhatsApp messages and their outcomes.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => processPendingMutation.mutate()} 
                    disabled={processPendingMutation.isPending}
                    data-testid="process-pending"
                  >
                    {processPendingMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Process Pending
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => refetchLogs()} data-testid="refresh-logs">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Business Number</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Loading message logs...
                          </TableCell>
                        </TableRow>
                      ) : messageLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No messages have been processed yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        messageLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(log.processed_at), "MMM d, h:mm a")}
                            </TableCell>
                            <TableCell>{log.sender_name || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{log.sender_phone}</TableCell>
                            <TableCell className="font-mono text-sm">{log.display_phone_number}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {log.message_text || <span className="text-muted-foreground italic">[{log.message_type}]</span>}
                            </TableCell>
                            <TableCell>{getOutcomeBadge(log.outcome)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" data-testid="confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Allocation Form Component
function AllocationForm({ 
  sheets, 
  users, 
  onSubmit, 
  isPending 
}: { 
  sheets: Sheet[]; 
  users: User[]; 
  onSubmit: (data: { display_phone_number: string; user_id: string; sheet_id: string }) => void;
  isPending: boolean;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState("");
  const [sheetId, setSheetId] = useState("");

  const handleSubmit = () => {
    if (!phoneNumber || !userId || !sheetId) return;
    onSubmit({ display_phone_number: phoneNumber, user_id: userId, sheet_id: sheetId });
    setPhoneNumber("");
    setUserId("");
    setSheetId("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-md bg-muted/30">
      <div className="flex-1">
        <Label htmlFor="phone-number" className="text-xs">WhatsApp Business Number</Label>
        <Input
          id="phone-number"
          placeholder="e.g., 918249344757"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mt-1"
          data-testid="input-phone-number"
        />
      </div>
      <div className="flex-1">
        <Label htmlFor="user-select" className="text-xs">Assign to User</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="mt-1" id="user-select" data-testid="select-user">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="sheet-select" className="text-xs">Target Sheet</Label>
        <Select value={sheetId} onValueChange={setSheetId}>
          <SelectTrigger className="mt-1" id="sheet-select" data-testid="select-sheet">
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
      <div className="flex items-end">
        <Button 
          onClick={handleSubmit} 
          disabled={!phoneNumber || !userId || !sheetId || isPending}
          data-testid="button-add-allocation"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  );
}

// Trigger Rule Form Component
function TriggerRuleForm({ 
  onSubmit, 
  isPending 
}: { 
  onSubmit: (data: { operator: string; match_text: string; logic: string }) => void;
  isPending: boolean;
}) {
  const [operator, setOperator] = useState("contains");
  const [matchText, setMatchText] = useState("");
  const [logic, setLogic] = useState("or");

  const handleSubmit = () => {
    if (!matchText) return;
    onSubmit({ operator, match_text: matchText, logic });
    setMatchText("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-md bg-muted/30">
      <div className="w-24">
        <Label htmlFor="logic-select" className="text-xs">Logic</Label>
        <Select value={logic} onValueChange={setLogic}>
          <SelectTrigger className="mt-1" id="logic-select" data-testid="select-logic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="or">OR</SelectItem>
            <SelectItem value="and">AND</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="operator-select" className="text-xs">Operator</Label>
        <Select value={operator} onValueChange={setOperator}>
          <SelectTrigger className="mt-1" id="operator-select" data-testid="select-operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-[2]">
        <Label htmlFor="match-text" className="text-xs">Match Text</Label>
        <Input
          id="match-text"
          placeholder="e.g., Property Enquiry, New Lead"
          value={matchText}
          onChange={(e) => setMatchText(e.target.value)}
          className="mt-1"
          data-testid="input-match-text"
        />
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleSubmit} 
          disabled={!matchText || isPending}
          data-testid="button-add-rule"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>
    </div>
  );
}

// Field Mapping Form Component
function FieldMappingForm({ 
  columns,
  existingMappings,
  onSubmit, 
  isPending 
}: { 
  columns: CustomColumn[];
  existingMappings: WhatsAppFieldMapping[];
  onSubmit: (data: { whatsapp_field: string; column_key: string }) => void;
  isPending: boolean;
}) {
  const [whatsappField, setWhatsappField] = useState("");
  const [columnKey, setColumnKey] = useState("");

  const availableWhatsAppFields = WHATSAPP_FIELDS.filter(
    (f) => !existingMappings.some((m) => m.whatsapp_field === f.value)
  );

  const handleSubmit = () => {
    if (!whatsappField || !columnKey) return;
    onSubmit({ whatsapp_field: whatsappField, column_key: columnKey });
    setWhatsappField("");
    setColumnKey("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-md bg-muted/30">
      <div className="flex-1">
        <Label htmlFor="whatsapp-field" className="text-xs">WhatsApp Field</Label>
        <Select value={whatsappField} onValueChange={setWhatsappField}>
          <SelectTrigger className="mt-1" id="whatsapp-field" data-testid="select-whatsapp-field">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {availableWhatsAppFields.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="column-key" className="text-xs">Maps to Column</Label>
        <Select value={columnKey} onValueChange={setColumnKey}>
          <SelectTrigger className="mt-1" id="column-key" data-testid="select-column-key">
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col.column_key} value={col.column_key}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleSubmit} 
          disabled={!whatsappField || !columnKey || isPending}
          data-testid="button-add-mapping"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
      </div>
    </div>
  );
}

// Default Value Form Component
function DefaultValueForm({ 
  columns,
  existingDefaults,
  onSubmit, 
  isPending 
}: { 
  columns: CustomColumn[];
  existingDefaults: WhatsAppDefaultValue[];
  onSubmit: (data: { column_key: string; default_value: string }) => void;
  isPending: boolean;
}) {
  const [columnKey, setColumnKey] = useState("");
  const [defaultValue, setDefaultValue] = useState("");

  const availableColumns = columns.filter(
    (col) => !existingDefaults.some((d) => d.column_key === col.column_key)
  );

  const handleSubmit = () => {
    if (!columnKey || !defaultValue) return;
    onSubmit({ column_key: columnKey, default_value: defaultValue });
    setColumnKey("");
    setDefaultValue("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-md bg-muted/30">
      <div className="flex-1">
        <Label htmlFor="default-column" className="text-xs">Column</Label>
        <Select value={columnKey} onValueChange={setColumnKey}>
          <SelectTrigger className="mt-1" id="default-column" data-testid="select-default-column">
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            {availableColumns.map((col) => (
              <SelectItem key={col.column_key} value={col.column_key}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="default-value" className="text-xs">Default Value</Label>
        <Input
          id="default-value"
          placeholder="Value to set for new leads"
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
          className="mt-1"
          data-testid="input-default-value"
        />
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleSubmit} 
          disabled={!columnKey || !defaultValue || isPending}
          data-testid="button-add-default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Default
        </Button>
      </div>
    </div>
  );
}

export default WhatsAppSettings;
