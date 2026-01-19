import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle, Check, Settings, Phone, MessageSquare, Zap, FileText, GripVertical, ToggleLeft, ToggleRight, RefreshCw, Eye, Clock, Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  match_type: string; // 'text' or 'field'
  field_path?: string | null; // For field matching: 'referral.source_type'
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

interface CompanyWebhook {
  id: string;
  company_id: string;
  name: string;
  token: string;
  secret: string;
  is_active: boolean;
  created_at: string;
}

interface WebhookRequest {
  id: string;
  webhook_id: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  status: string;
  error_message: string | null;
  lead_id: string | null;
  allocated_sheet_id: string | null;
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

interface CompanySettings {
  id?: string;
  company_id?: string;
}

export function WhatsAppSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("allocations");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>("");

  // Fetch company settings to get company ID and selected webhook
  const { data: companySettings } = useQuery<{ settings: CompanySettings & { whatsapp_webhook_id?: string }; company_id?: string }>({
    queryKey: ["/api/admin/company/settings"],
  });
  
  // Get company ID from settings response
  const companyId = companySettings?.company_id || companySettings?.settings?.company_id || "";
  
  // Set selected webhook from company settings on load
  useEffect(() => {
    if (companySettings?.settings?.whatsapp_webhook_id && !selectedWebhookId) {
      setSelectedWebhookId(companySettings.settings.whatsapp_webhook_id);
    }
  }, [companySettings?.settings?.whatsapp_webhook_id, selectedWebhookId]);

  // Fetch company webhooks for selection
  const { data: companyWebhooks = [], isLoading: webhooksLoading } = useQuery<CompanyWebhook[]>({
    queryKey: ["/api/admin/company/webhooks"],
  });

  // Fetch webhook requests for selected webhook (pending ones)
  const { data: webhookRequests = [], isLoading: webhookRequestsLoading, refetch: refetchWebhookRequests } = useQuery<WebhookRequest[]>({
    queryKey: ["/api/admin/company/webhooks", selectedWebhookId, "logs"],
    enabled: !!selectedWebhookId,
  });

  // Get selected webhook details
  const selectedWebhook = companyWebhooks.find(w => w.id === selectedWebhookId);
  
  // State for viewing payload in dialog
  const [viewingPayload, setViewingPayload] = useState<Record<string, any> | null>(null);
  
  // State for selected webhook requests (for processing)
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  
  // State for referral filter on pending requests
  const [pendingReferralFilter, setPendingReferralFilter] = useState<"all" | "ad" | "organic">("all");
  
  // Message logs filter state
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(25);
  const [logsBusinessFilter, setLogsBusinessFilter] = useState<string>("");
  const [logsOutcomeFilter, setLogsOutcomeFilter] = useState<string>("");
  const [logsSearchText, setLogsSearchText] = useState("");
  const [logsFromDate, setLogsFromDate] = useState<string>("");
  const [logsToDate, setLogsToDate] = useState<string>("");
  
  // Helper function to check if a webhook payload contains ad referral data
  const hasAdReferral = (payload: any): boolean => {
    try {
      // Check WhatsApp webhook format: entry[].changes[].value.messages[].referral.source_type
      if (payload?.entry) {
        for (const entry of payload.entry) {
          for (const change of entry.changes || []) {
            if (change.value?.messages) {
              for (const msg of change.value.messages) {
                if (msg.referral?.source_type === 'ad') {
                  return true;
                }
              }
            }
          }
        }
      }
      // Also check top-level referral for simplified formats
      if (payload?.referral?.source_type === 'ad') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

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

  // Fetch WhatsApp message logs with filters
  const logsQueryParams = new URLSearchParams();
  logsQueryParams.set("limit", logsPageSize.toString());
  logsQueryParams.set("offset", ((logsPage - 1) * logsPageSize).toString());
  if (logsBusinessFilter) logsQueryParams.set("businessNumber", logsBusinessFilter);
  if (logsOutcomeFilter) logsQueryParams.set("outcome", logsOutcomeFilter);
  if (logsSearchText) logsQueryParams.set("search", logsSearchText);
  if (logsFromDate) logsQueryParams.set("fromDate", logsFromDate);
  if (logsToDate) logsQueryParams.set("toDate", logsToDate);
  
  const { data: messageLogsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: WhatsAppMessageLog[]; total: number }>({
    queryKey: ["/api/admin/company/whatsapp/message-logs", logsPage, logsPageSize, logsBusinessFilter, logsOutcomeFilter, logsSearchText, logsFromDate, logsToDate],
    queryFn: () => fetch(`/api/admin/company/whatsapp/message-logs?${logsQueryParams.toString()}`, { credentials: "include" }).then(r => r.json()),
  });
  
  const messageLogs = messageLogsData?.logs ?? [];
  const totalLogs = messageLogsData?.total ?? 0;
  const totalPages = Math.ceil(totalLogs / logsPageSize);
  
  // Get unique business numbers from allocations for the filter dropdown
  const uniqueBusinessNumbers = Array.from(new Set(allocations.map(a => a.display_phone_number)));
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setLogsPage(1);
  }, [logsBusinessFilter, logsOutcomeFilter, logsSearchText, logsFromDate, logsToDate, logsPageSize]);

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
    mutationFn: async (data: { match_type: string; field_path?: string; operator: string; match_text: string; logic: string }) => {
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

  // Save selected webhook mutation
  const saveWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { whatsapp_webhook_id: webhookId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({ title: "Saved", description: "Webhook selection has been saved." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Process pending webhook requests mutation  
  const processWebhookRequestsMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      return await apiRequest("POST", `/api/admin/company/webhooks/${selectedWebhookId}/requests/reprocess`, {
        request_ids: requestIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks", selectedWebhookId, "logs"] });
      refetchWebhookRequests();
      toast({ title: "Processing Complete", description: "Pending webhook requests have been processed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleWebhookChange = (webhookId: string) => {
    setSelectedWebhookId(webhookId);
    setSelectedRequestIds(new Set()); // Clear selection when webhook changes
    saveWebhookMutation.mutate(webhookId);
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

      {/* Webhook Selection Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Select an existing webhook to receive WhatsApp messages. Configure your WhatsApp provider to send messages to the webhook URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Webhook</Label>
            <Select 
              value={selectedWebhookId} 
              onValueChange={handleWebhookChange}
              data-testid="select-webhook"
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a webhook..." />
              </SelectTrigger>
              <SelectContent>
                {companyWebhooks.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name} {webhook.is_active ? "" : "(Inactive)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyWebhooks.length === 0 && !webhooksLoading && (
              <p className="text-xs text-muted-foreground">
                No webhooks found. Create a webhook in the Webhooks page first.
              </p>
            )}
            {selectedWebhook && (
              <p className="text-xs text-muted-foreground">
                Webhook URL is available on the Webhooks page. Configure your WhatsApp provider to send messages to that URL.
              </p>
            )}
          </div>

          {/* Pending Webhook Requests Section */}
          {selectedWebhookId && (() => {
            // Get all pending requests (unfiltered)
            const allPendingRequests = webhookRequests.filter(r => r.status === "pending" || r.status === "pending_configuration");
            
            // Apply referral filter
            let pendingRequests = allPendingRequests;
            if (pendingReferralFilter === 'ad') {
              pendingRequests = allPendingRequests.filter(r => hasAdReferral(r.payload));
            } else if (pendingReferralFilter === 'organic') {
              pendingRequests = allPendingRequests.filter(r => !hasAdReferral(r.payload));
            }
            
            // Count for filter labels
            const adCount = allPendingRequests.filter(r => hasAdReferral(r.payload)).length;
            const organicCount = allPendingRequests.length - adCount;
            
            const allPendingIds = pendingRequests.map(r => r.id);
            const allSelected = pendingRequests.length > 0 && pendingRequests.every(r => selectedRequestIds.has(r.id));
            const someSelected = pendingRequests.some(r => selectedRequestIds.has(r.id));
            
            const toggleSelectAll = () => {
              if (allSelected) {
                setSelectedRequestIds(new Set());
              } else {
                setSelectedRequestIds(new Set(allPendingIds));
              }
            };
            
            const toggleSelectOne = (id: string) => {
              const newSet = new Set(selectedRequestIds);
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
              setSelectedRequestIds(newSet);
            };
            
            const idsToProcess = selectedRequestIds.size > 0 
              ? Array.from(selectedRequestIds).filter(id => allPendingIds.includes(id))
              : [];
            
            return (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending Webhook Requests
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {pendingReferralFilter === 'all' 
                        ? `${allPendingRequests.length} pending requests`
                        : `${pendingRequests.length} of ${allPendingRequests.length} pending requests`
                      }
                      {selectedRequestIds.size > 0 && ` (${idsToProcess.length} selected)`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={pendingReferralFilter} onValueChange={(v) => setPendingReferralFilter(v as "all" | "ad" | "organic")}>
                      <SelectTrigger className="w-[160px]" data-testid="select-referral-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ({allPendingRequests.length})</SelectItem>
                        <SelectItem value="ad">From Ads ({adCount})</SelectItem>
                        <SelectItem value="organic">Organic ({organicCount})</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchWebhookRequests()}
                      data-testid="button-refresh-webhook-requests"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (idsToProcess.length > 0) {
                          processWebhookRequestsMutation.mutate(idsToProcess);
                          setSelectedRequestIds(new Set());
                        }
                      }}
                      disabled={processWebhookRequestsMutation.isPending || idsToProcess.length === 0}
                      data-testid="button-process-pending-requests"
                    >
                      {processWebhookRequestsMutation.isPending 
                        ? "Processing..." 
                        : idsToProcess.length > 0 
                          ? `Process Selected (${idsToProcess.length})`
                          : "Select to Process"}
                    </Button>
                  </div>
                </div>
                
                {webhookRequestsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading webhook requests...</p>
                ) : pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {pendingReferralFilter !== 'all' && allPendingRequests.length > 0
                      ? `No ${pendingReferralFilter === 'ad' ? 'ad' : 'organic'} requests. Try a different filter.`
                      : 'No pending webhook requests.'}
                  </p>
                ) : (
                  <ScrollArea className="h-[250px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                              data-testid="checkbox-select-all"
                            />
                          </TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests
                          .slice(0, 20)
                          .map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRequestIds.has(request.id)}
                                  onCheckedChange={() => toggleSelectOne(request.id)}
                                  aria-label={`Select request ${request.id}`}
                                  data-testid={`checkbox-select-${request.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(request.created_at), "MMM d, HH:mm")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{request.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setViewingPayload(request.payload)}
                                  data-testid={`button-view-payload-${request.id}`}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Payload
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
                      <TableHead>Match Type</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Match Value</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading trigger rules...
                        </TableCell>
                      </TableRow>
                    ) : triggerRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                            {rule.match_type === "field" ? (
                              <div className="flex flex-col">
                                <Badge variant="outline" className="w-fit">Field</Badge>
                                <span className="text-xs text-muted-foreground mt-1 font-mono">
                                  {rule.field_path || "N/A"}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="w-fit">Text</Badge>
                            )}
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Message Logs
                      {totalLogs > 0 && (
                        <Badge variant="secondary" className="ml-2">{totalLogs} total</Badge>
                      )}
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
                
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sender or message..."
                      value={logsSearchText}
                      onChange={(e) => setLogsSearchText(e.target.value)}
                      className="pl-8"
                      data-testid="logs-search"
                    />
                  </div>
                  
                  {/* Business Number Filter */}
                  <Select value={logsBusinessFilter || "all"} onValueChange={(v) => setLogsBusinessFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]" data-testid="logs-business-filter">
                      <SelectValue placeholder="All Numbers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Numbers</SelectItem>
                      {uniqueBusinessNumbers.map((num) => (
                        <SelectItem key={num} value={num}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Outcome Filter */}
                  <Select value={logsOutcomeFilter || "all"} onValueChange={(v) => setLogsOutcomeFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]" data-testid="logs-outcome-filter">
                      <SelectValue placeholder="All Outcomes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Outcomes</SelectItem>
                      <SelectItem value="new_lead_created">Lead Created</SelectItem>
                      <SelectItem value="followup_added">Followup Added</SelectItem>
                      <SelectItem value="transfer_request_created">Transfer Request</SelectItem>
                      <SelectItem value="ignored_no_trigger">No Trigger Match</SelectItem>
                      <SelectItem value="ignored_no_match">No Allocation</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Date Filters */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={logsFromDate}
                        onChange={(e) => setLogsFromDate(e.target.value)}
                        className="w-[140px]"
                        placeholder="From"
                        data-testid="logs-from-date"
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={logsToDate}
                      onChange={(e) => setLogsToDate(e.target.value)}
                      className="w-[140px]"
                      placeholder="To"
                      data-testid="logs-to-date"
                    />
                  </div>
                  
                  {/* Clear Filters */}
                  {(logsSearchText || logsBusinessFilter || logsOutcomeFilter || logsFromDate || logsToDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLogsSearchText("");
                        setLogsBusinessFilter("");
                        setLogsOutcomeFilter("");
                        setLogsFromDate("");
                        setLogsToDate("");
                      }}
                      data-testid="clear-logs-filters"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                          {logsSearchText || logsBusinessFilter || logsOutcomeFilter || logsFromDate || logsToDate
                            ? "No messages match your filters."
                            : "No messages have been processed yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      messageLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.processed_at), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell>{log.sender_name || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{log.sender_phone}</TableCell>
                          <TableCell className="font-mono text-sm">{log.display_phone_number}</TableCell>
                          <TableCell className="max-w-[200px]">
                            {log.message_text ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-help">{log.message_text}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[400px] whitespace-pre-wrap">
                                  {log.message_text}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground italic">[{log.message_type}]</span>
                            )}
                          </TableCell>
                          <TableCell>{getOutcomeBadge(log.outcome)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalLogs > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing {Math.min((logsPage - 1) * logsPageSize + 1, totalLogs)}-{Math.min(logsPage * logsPageSize, totalLogs)} of {totalLogs}</span>
                    <Select value={logsPageSize.toString()} onValueChange={(v) => setLogsPageSize(parseInt(v))}>
                      <SelectTrigger className="w-[100px]" data-testid="logs-page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                      data-testid="logs-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {logsPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.min(totalPages, p + 1))}
                      disabled={logsPage >= totalPages}
                      data-testid="logs-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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

      {/* Payload Viewer Dialog */}
      <Dialog open={viewingPayload !== null} onOpenChange={(open) => !open && setViewingPayload(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Webhook Payload
            </DialogTitle>
            <DialogDescription>
              Full JSON payload received from the webhook
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {viewingPayload ? JSON.stringify(viewingPayload, null, 2) : ""}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
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

// Field path options for webhook field matching
const FIELD_PATH_OPTIONS = [
  { value: "referral.source_type", label: "Referral Source Type", description: "e.g., ad, organic, direct" },
  { value: "referral.source_id", label: "Referral Source ID", description: "Ad campaign ID" },
  { value: "referral.source_url", label: "Referral Source URL", description: "Ad URL" },
  { value: "referral.headline", label: "Referral Headline", description: "Ad headline text" },
  { value: "referral.body", label: "Referral Body", description: "Ad body text" },
];

// Trigger Rule Form Component
function TriggerRuleForm({ 
  onSubmit, 
  isPending 
}: { 
  onSubmit: (data: { match_type: string; field_path?: string; operator: string; match_text: string; logic: string }) => void;
  isPending: boolean;
}) {
  const [matchType, setMatchType] = useState("text");
  const [fieldPath, setFieldPath] = useState("");
  const [operator, setOperator] = useState("contains");
  const [matchText, setMatchText] = useState("");
  const [logic, setLogic] = useState("or");

  const handleSubmit = () => {
    if (!matchText) return;
    if (matchType === "field" && !fieldPath) return;
    
    onSubmit({ 
      match_type: matchType,
      field_path: matchType === "field" ? fieldPath : undefined,
      operator, 
      match_text: matchText, 
      logic 
    });
    setMatchText("");
    setFieldPath("");
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-md bg-muted/30">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-32">
          <Label htmlFor="match-type-select" className="text-xs">Match Type</Label>
          <Select value={matchType} onValueChange={setMatchType}>
            <SelectTrigger className="mt-1" id="match-type-select" data-testid="select-match-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Message Text</SelectItem>
              <SelectItem value="field">Webhook Field</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        {matchType === "field" && (
          <div className="flex-1">
            <Label htmlFor="field-path-select" className="text-xs">Field Path</Label>
            <Select value={fieldPath} onValueChange={setFieldPath}>
              <SelectTrigger className="mt-1" id="field-path-select" data-testid="select-field-path">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_PATH_OPTIONS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
          <Label htmlFor="match-text" className="text-xs">
            {matchType === "text" ? "Match Text" : "Match Value"}
          </Label>
          <Input
            id="match-text"
            placeholder={matchType === "text" ? "e.g., Property Enquiry, New Lead" : "e.g., ad, ctwa"}
            value={matchText}
            onChange={(e) => setMatchText(e.target.value)}
            className="mt-1"
            data-testid="input-match-text"
          />
        </div>
        <div className="flex items-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!matchText || (matchType === "field" && !fieldPath) || isPending}
            data-testid="button-add-rule"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>
      {matchType === "field" && (
        <p className="text-xs text-muted-foreground">
          <strong>Ad Source Filtering:</strong> Match messages based on their referral data from Facebook/Instagram ads. 
          Use "Referral Source Type equals ad" to only trigger for leads coming from paid advertisements (Click-to-WhatsApp ads).
          Messages without referral data will not match field-based rules.
        </p>
      )}
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
