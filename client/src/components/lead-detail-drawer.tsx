import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Phone, 
  MessageCircle, 
  Pencil, 
  Plus, 
  History, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  Star,
  Activity,
  TrendingUp,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Lead, CustomColumn, LeadUpdate } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { LeadEditDialog } from "./lead-edit-dialog";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";
import { SendWhatsAppDialog } from "./send-whatsapp-dialog";
import {
  WhatsAppInlineComposer,
  type OptimisticSendMeta,
  type SendWhatsAppPayload,
} from "./whatsapp-inline-composer";
import { useToast } from "@/hooks/use-toast";
import {
  WhatsAppTemplateUpdateCard,
  parseTemplateFromUpdate,
} from "./whatsapp-template-update-card";

interface LeadDetailDrawerProps {
  leadId: string | null;
  sheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

type WhatsAppLeadMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  sender_phone: string;
  sender_name: string | null;
  display_phone_number: string;
  message_text: string | null;
  message_type: string;
  outcome: string;
  processed_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  sent_by_user_id: string | null;
  sent_by_name?: string | null;
  outcome_details?: Record<string, any> | null;
};

function WhatsAppDeliveryPill({
  status,
  statusAt,
  errorText,
  formatInTimezone,
}: {
  status: NonNullable<LeadUpdate["whatsapp_status"]>;
  statusAt: string | null;
  errorText: string | null;
  formatInTimezone: (date: string | Date, fmt: string) => string;
}) {
  const cfg: Record<typeof status, { label: string; variant: "secondary" | "default" | "destructive"; Icon: typeof Check | null; className?: string }> = {
    sent: { label: "Sent", variant: "secondary", Icon: Check },
    delivered: { label: "Delivered", variant: "secondary", Icon: CheckCheck },
    read: { label: "Read", variant: "default", Icon: CheckCheck, className: "bg-blue-600 hover:bg-blue-600 text-white" },
    failed: { label: "Failed", variant: "destructive", Icon: XCircle },
  };
  const c = cfg[status];
  const tooltipText = [
    statusAt ? `${c.label}: ${formatInTimezone(statusAt, "MMM d, h:mm a")}` : c.label,
    status === "failed" && errorText ? errorText : null,
  ].filter(Boolean).join(" — ");
  const badge = (
    <Badge
      variant={c.variant}
      className={`gap-1 h-5 px-1.5 text-[10px] ${c.className ?? ""}`}
      data-testid={`badge-wa-status-${status}`}
    >
      {c.Icon ? <c.Icon className="h-3 w-3" /> : null}
      {c.label}
    </Badge>
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function WhatsAppOutgoingStatusIndicator({
  outcome,
  errorText,
  messageId,
  deliveredAtLabel,
  readAtLabel,
  failedAtLabel,
}: {
  outcome: string;
  errorText: string | null;
  messageId: string;
  deliveredAtLabel?: string | null;
  readAtLabel?: string | null;
  failedAtLabel?: string | null;
}) {
  type Cfg = {
    label: string;
    Icon: typeof Check;
    iconClass: string;
    testId: string;
  };
  const map: Record<string, Cfg> = {
    sent: { label: "Sent", Icon: Check, iconClass: "text-muted-foreground", testId: "sent" },
    delivered: { label: "Delivered", Icon: CheckCheck, iconClass: "text-muted-foreground", testId: "delivered" },
    read: { label: "Read", Icon: CheckCheck, iconClass: "text-blue-500", testId: "read" },
    failed: { label: "Failed", Icon: XCircle, iconClass: "text-destructive", testId: "failed" },
  };
  const cfg = map[outcome];
  if (!cfg) return null;
  const tooltipLines: string[] = [];
  if (outcome === "failed") {
    tooltipLines.push(errorText ? `Failed — ${errorText}` : "Failed");
    if (failedAtLabel) tooltipLines.push(`at ${failedAtLabel}`);
  } else {
    tooltipLines.push(cfg.label);
  }
  if (deliveredAtLabel) tooltipLines.push(`Delivered at ${deliveredAtLabel}`);
  if (readAtLabel) tooltipLines.push(`Read at ${readAtLabel}`);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center ${cfg.iconClass}`}
            data-testid={`wa-message-status-${cfg.testId}-${messageId}`}
            aria-label={cfg.label}
          >
            <cfg.Icon className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5 text-xs" data-testid={`wa-message-status-tooltip-${messageId}`}>
            {tooltipLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type PendingSend = {
  tempId: string;
  status: "pending" | "failed";
  bodyText: string;
  messageType: "text" | "template";
  recipientPhone: string;
  displayPhoneNumber: string;
  payload: SendWhatsAppPayload;
  errorText?: string;
  createdAt: string;
};

export function LeadDetailDrawer({ leadId, sheetId, open, onOpenChange }: LeadDetailDrawerProps) {
  const { formatDateOnly, formatDateTime, formatInTimezone } = useCompanyTimezone();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUpdateDialogOpen, setAddUpdateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [sendWaOpen, setSendWaOpen] = useState(false);
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset pending bubbles when switching leads.
  useEffect(() => {
    setPendingSends([]);
  }, [leadId]);

  const handleOptimisticAdd = (tempId: string, meta: OptimisticSendMeta) => {
    setPendingSends((prev) => [
      ...prev,
      {
        tempId,
        status: "pending",
        bodyText: meta.bodyText,
        messageType: meta.messageType,
        recipientPhone: meta.recipientPhone,
        displayPhoneNumber: meta.displayPhoneNumber,
        payload: meta.payload,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleOptimisticResolve = async (tempId: string) => {
    if (!leadId) {
      setPendingSends((prev) => prev.filter((p) => p.tempId !== tempId));
      return;
    }
    // Wait for the conversation to refetch so the real bubble is in place
    // before we remove the optimistic one — avoids a brief flash where the
    // message disappears and reappears.
    try {
      await queryClient.refetchQueries({
        queryKey: ["/api/leads", leadId, "whatsapp-messages"],
      });
    } finally {
      setPendingSends((prev) => prev.filter((p) => p.tempId !== tempId));
    }
  };

  const handleOptimisticFail = (tempId: string, errorText: string) => {
    setPendingSends((prev) =>
      prev.map((p) =>
        p.tempId === tempId ? { ...p, status: "failed", errorText } : p,
      ),
    );
  };

  const handleRetryPending = async (tempId: string) => {
    if (!leadId) return;
    const target = pendingSends.find((p) => p.tempId === tempId);
    if (!target) return;
    setPendingSends((prev) =>
      prev.map((p) =>
        p.tempId === tempId ? { ...p, status: "pending", errorText: undefined } : p,
      ),
    );
    try {
      await apiRequest("POST", `/api/leads/${leadId}/send-whatsapp`, target.payload);
      setPendingSends((prev) => prev.filter((p) => p.tempId !== tempId));
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "whatsapp-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "send-whatsapp/options"] });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Could not send WhatsApp message";
      setPendingSends((prev) =>
        prev.map((p) =>
          p.tempId === tempId ? { ...p, status: "failed", errorText: message } : p,
        ),
      );
      toast({
        title: "Retry failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDiscardPending = (tempId: string) => {
    setPendingSends((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const { data: lead, isLoading, isError, refetch, isFetching } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
    retry: 2,
  });

  const { data: updates = [] } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: !!leadId && open,
  });

  const { data: waMessages = [], isLoading: waLoading } = useQuery<WhatsAppLeadMessage[]>({
    queryKey: ["/api/leads", leadId, "whatsapp-messages"],
    enabled: !!leadId && open,
    refetchInterval: open ? 15000 : false,
    refetchOnWindowFocus: true,
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId || lead?.sheet_id, "columns"],
    enabled: !!(sheetId || lead?.sheet_id) && open,
  });

  const getLeadValue = (lead: Lead | undefined, key: string) => {
    if (!lead) return undefined;
    const value = lead.custom_fields[key];
    return value !== null && value !== undefined ? value : undefined;
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "-";
    
    if (type === "date") {
      try {
        return formatDateOnly(value);
      } catch {
        return String(value);
      }
    }
    if (type === "datetime") {
      try {
        return formatDateTime(value);
      } catch {
        return String(value);
      }
    }
    if (type === "boolean") {
      return value === true || value === "true" ? "Yes" : "No";
    }
    if (type === "percentage") {
      return `${value}%`;
    }
    return String(value);
  };

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);
  
  // Get full name from lead
  const getFullName = (lead: Lead | undefined, cols: typeof columns) => {
    if (!lead || !lead.custom_fields) return null;
    
    const customFields = lead.custom_fields;
    const fieldKeys = Object.keys(customFields);
    
    const patterns = [
      /^full[_\s]?name/i,
      /^name$/i,
    ];
    
    for (const pattern of patterns) {
      const matchingKey = fieldKeys.find(k => pattern.test(k));
      if (matchingKey && customFields[matchingKey]) {
        return String(customFields[matchingKey]);
      }
    }
    
    if (cols.length > 0) {
      const fullNameColumn = cols.find(col => 
        col.name.toLowerCase().includes("full name") ||
        col.name.toLowerCase() === "name"
      );
      if (fullNameColumn && customFields[fullNameColumn.column_key]) {
        return String(customFields[fullNameColumn.column_key]);
      }
    }
    
    const nameKey = fieldKeys.find(k => 
      k.toLowerCase().includes("name") && 
      typeof customFields[k] === "string" &&
      customFields[k].trim().length > 0
    );
    if (nameKey && customFields[nameKey]) {
      return String(customFields[nameKey]);
    }
    
    return null;
  };

  // Get mobile number from lead
  const getMobileNumber = (lead: Lead | undefined, cols: typeof columns) => {
    if (!lead || !lead.custom_fields) return null;
    
    const customFields = lead.custom_fields;
    const fieldKeys = Object.keys(customFields);
    
    // Priority patterns for mobile number
    const patterns = [
      /^mobile[_\s]?no/i,
      /^mobile$/i,
      /^phone/i,
      /^whatsapp/i,
      /^contact/i,
    ];
    
    for (const pattern of patterns) {
      const matchingKey = fieldKeys.find(k => pattern.test(k));
      if (matchingKey && customFields[matchingKey]) {
        return String(customFields[matchingKey]);
      }
    }
    
    // Check by column name
    if (cols.length > 0) {
      const mobileColumn = cols.find(col => 
        col.name.toLowerCase().includes("mobile") ||
        col.name.toLowerCase().includes("phone") ||
        col.name.toLowerCase().includes("whatsapp")
      );
      if (mobileColumn && customFields[mobileColumn.column_key]) {
        return String(customFields[mobileColumn.column_key]);
      }
    }
    
    return null;
  };

  const leadFullName = getFullName(lead, columns);
  const mobileNumber = getMobileNumber(lead, columns);
  
  // Clean mobile number for tel: and wa.me links
  const cleanMobile = mobileNumber?.replace(/\D/g, "") || "";
  const hasValidMobile = cleanMobile.length >= 10;

  const handleRetry = () => {
    refetch();
  };

  // Auto-scroll the conversation to the latest message when the drawer opens,
  // when a new WhatsApp message arrives, or after a successful reply.
  useEffect(() => {
    if (!open || waLoading) return;
    if (waMessages.length === 0 && pendingSends.length === 0) return;
    const id = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, waLoading, waMessages.length, pendingSends.length]);

  const handleCall = () => {
    if (hasValidMobile) {
      window.open(`tel:${cleanMobile}`, "_self");
    }
  };

  const handleWhatsApp = () => {
    if (hasValidMobile) {
      setSendWaOpen(true);
    }
  };

  const customerDisplayName = String(
    lead?.custom_fields?.full_name ||
      lead?.custom_fields?.name ||
      lead?.custom_fields?.first_name ||
      ""
  );

  const effectiveSheetId = sheetId || lead?.sheet_id || "";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col max-h-[100dvh] p-0">
          {isLoading || isFetching ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load lead</h3>
              <p className="text-sm text-muted-foreground mb-6">
                There was a problem loading the lead details. Please check your connection and try again.
              </p>
              <Button onClick={handleRetry} variant="outline" disabled={isFetching} data-testid="button-retry-load">
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Loading...' : 'Try Again'}
              </Button>
            </div>
          ) : lead ? (
            <>
              {/* Header with name */}
              <SheetHeader className="p-4 pb-0 flex-shrink-0">
                <SheetTitle className="text-lg flex items-center gap-2">
                  {leadFullName || "Lead Details"}
                </SheetTitle>
                {mobileNumber && (
                  <SheetDescription className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    {mobileNumber}
                  </SheetDescription>
                )}
              </SheetHeader>

              {/* Quick Action Buttons */}
              <div className="px-4 py-3 flex gap-2 flex-shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleCall}
                  disabled={!hasValidMobile}
                  data-testid="button-call-lead"
                >
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleWhatsApp}
                  disabled={!hasValidMobile}
                  data-testid="button-whatsapp-lead"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
              </div>

              {/* Secondary Actions */}
              <div className="px-4 pb-3 flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAddUpdateDialogOpen(true)}
                  data-testid="button-add-update"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditDialogOpen(true)}
                  data-testid="button-edit-lead"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit Lead
                </Button>
              </div>

              <Separator />

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* AI Insights Section */}
                  <AIInsightsSection leadId={leadId!} lead={lead} />

                  <Separator />

                  {/* Lead Information - All Fields */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      Lead Information ({sortedColumns.length} fields)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {sortedColumns.map((col) => {
                        const value = getLeadValue(lead, col.column_key);
                        const formattedValue = formatValue(value, col.type);

                        return (
                          <div key={col.id} className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">{col.name}</div>
                            {col.type === "dropdown" ? (
                              <Badge variant="secondary" className="text-xs font-normal">{formattedValue}</Badge>
                            ) : (
                              <div className="text-sm font-medium break-words">{formattedValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Recent Updates */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Recent Updates
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setHistoryDialogOpen(true)}
                        data-testid="button-view-history"
                      >
                        <History className="h-3 w-3 mr-1" />
                        View All
                      </Button>
                    </div>
                    
                    {updates.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No updates recorded yet</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-primary"
                          onClick={() => setAddUpdateDialogOpen(true)}
                        >
                          Add the first update
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {updates.slice(0, 5).map((update) => {
                          const templateInfo = parseTemplateFromUpdate(update);
                          return (
                            <div
                              key={update.id}
                              className="p-3 bg-muted/30 rounded-lg border"
                              data-testid={`update-${update.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {update.update_via === "call" ? (
                                  <Phone className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <MessageCircle className="h-3 w-3 text-green-500" />
                                )}
                                <span className="text-xs font-medium capitalize">
                                  {update.update_via}
                                </span>
                                {update.update_via === "whatsapp_outgoing" && update.whatsapp_status && (
                                  <WhatsAppDeliveryPill
                                    status={update.whatsapp_status}
                                    statusAt={update.whatsapp_status_at ?? null}
                                    errorText={update.whatsapp_error ?? null}
                                    formatInTimezone={formatInTimezone}
                                  />
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatInTimezone(update.created_at, "MMM d, h:mm a")}
                                </span>
                              </div>
                              {templateInfo ? (
                                <WhatsAppTemplateUpdateCard
                                  template={templateInfo.template}
                                  variant="compact"
                                />
                              ) : (
                                update.remark && (
                                  <p className="text-sm text-foreground/80 line-clamp-2">
                                    {update.remark}
                                  </p>
                                )
                              )}
                              {update.created_by_first_name && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  by {update.created_by_first_name}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {updates.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => setHistoryDialogOpen(true)}
                          >
                            View all {updates.length} updates
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* WhatsApp Conversation */}
                  <div data-testid="section-whatsapp-conversation">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                        WhatsApp Conversation
                        {waMessages.length > 0 && (
                          <span className="text-xs text-muted-foreground normal-case font-normal">
                            ({waMessages.length})
                          </span>
                        )}
                      </h3>
                    </div>

                    {waLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-3/4" />
                      </div>
                    ) : waMessages.length === 0 && pendingSends.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No WhatsApp messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waMessages.map((msg) => {
                          const isOutgoing = msg.direction === "outgoing";
                          const bodyText =
                            msg.message_text ||
                            (msg.message_type === "template"
                              ? `[Template: ${msg.outcome_details?.template_name || msg.outcome_details?.approved_template_name || "approved"}]`
                              : `[${msg.message_type}]`);
                          return (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg border ${
                                isOutgoing
                                  ? "bg-green-500/5 border-green-500/20 ml-4"
                                  : "bg-muted/30 mr-4"
                              }`}
                              data-testid={`wa-message-${msg.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isOutgoing ? (
                                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                                ) : (
                                  <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                                )}
                                <span className="text-xs font-medium">
                                  {isOutgoing ? "Sent" : "Received"}
                                </span>
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {msg.message_type}
                                </Badge>
                                {isOutgoing && (
                                  <WhatsAppOutgoingStatusIndicator
                                    outcome={msg.outcome}
                                    errorText={
                                      typeof msg.outcome_details?.error === "string"
                                        ? msg.outcome_details.error
                                        : null
                                    }
                                    messageId={msg.id}
                                    deliveredAtLabel={msg.delivered_at ? formatInTimezone(msg.delivered_at, "MMM d, h:mm a") : null}
                                    readAtLabel={msg.read_at ? formatInTimezone(msg.read_at, "MMM d, h:mm a") : null}
                                    failedAtLabel={msg.failed_at ? formatInTimezone(msg.failed_at, "MMM d, h:mm a") : null}
                                  />
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatInTimezone(msg.processed_at, "MMM d, h:mm a")}
                                </span>
                              </div>
                              {bodyText && (
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                                  {bodyText}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                                {isOutgoing ? (
                                  <>
                                    <div data-testid={`wa-message-meta-${msg.id}`}>
                                      To {msg.sender_phone}
                                      {msg.sent_by_name ? ` · by ${msg.sent_by_name}` : ""}
                                    </div>
                                    <div>From business {msg.display_phone_number}</div>
                                  </>
                                ) : (
                                  <>
                                    <div data-testid={`wa-message-meta-${msg.id}`}>
                                      From {msg.sender_name || msg.sender_phone}
                                    </div>
                                    <div>To business {msg.display_phone_number}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {pendingSends.map((p) => (
                          <div
                            key={p.tempId}
                            className={`p-3 rounded-lg border ml-4 ${
                              p.status === "failed"
                                ? "bg-destructive/5 border-destructive/30"
                                : "bg-green-500/5 border-green-500/20 opacity-80"
                            }`}
                            data-testid={`wa-pending-${p.tempId}`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <ArrowUpRight className="h-3 w-3 text-green-600" />
                              <span className="text-xs font-medium">Sent</span>
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {p.messageType}
                              </Badge>
                              {p.status === "pending" ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                                  data-testid={`wa-pending-status-sending-${p.tempId}`}
                                >
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Sending…
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-destructive"
                                  data-testid={`wa-pending-status-failed-${p.tempId}`}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Failed to send
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatInTimezone(p.createdAt, "MMM d, h:mm a")}
                              </span>
                            </div>
                            {p.bodyText && (
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                                {p.bodyText}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                              <div>To {p.recipientPhone}</div>
                              <div>From business {p.displayPhoneNumber}</div>
                            </div>
                            {p.status === "failed" && (
                              <div className="mt-2 space-y-1.5">
                                {p.errorText && (
                                  <p className="text-xs text-destructive break-words" data-testid={`wa-pending-error-${p.tempId}`}>
                                    {p.errorText}
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRetryPending(p.tempId)}
                                    disabled={p.status !== "failed"}
                                    data-testid={`button-wa-pending-retry-${p.tempId}`}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                    Retry
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDiscardPending(p.tempId)}
                                    data-testid={`button-wa-pending-discard-${p.tempId}`}
                                  >
                                    Discard
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={messagesEndRef} data-testid="anchor-wa-conversation-end" />
                      </div>
                    )}

                    {hasValidMobile && mobileNumber && (
                      <WhatsAppInlineComposer
                        leadId={leadId!}
                        customerName={customerDisplayName}
                        recipientPhone={mobileNumber}
                        onOptimisticAdd={handleOptimisticAdd}
                        onOptimisticResolve={handleOptimisticResolve}
                        onOptimisticFail={handleOptimisticFail}
                      />
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lead not found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The lead could not be found. It may have been deleted.
              </p>
              <Button onClick={() => onOpenChange(false)} variant="outline" data-testid="button-close-drawer">
                Close
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      {leadId && effectiveSheetId && (
        <LeadEditDialog
          leadId={leadId}
          sheetId={effectiveSheetId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Add Update Dialog */}
      {leadId && (
        <LeadUpdateDialog
          leadId={leadId}
          sheetId={effectiveSheetId}
          open={addUpdateDialogOpen}
          onOpenChange={setAddUpdateDialogOpen}
        />
      )}

      {/* Update History Dialog */}
      {leadId && (
        <LeadUpdateHistoryDialog
          leadId={leadId}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}

      {/* Send WhatsApp Dialog */}
      {leadId && mobileNumber && (
        <SendWhatsAppDialog
          open={sendWaOpen}
          onOpenChange={setSendWaOpen}
          leadId={leadId}
          customerName={customerDisplayName}
          recipientPhone={mobileNumber}
        />
      )}
    </>
  );
}

// AI Insights Section Component
function AIInsightsSection({ leadId, lead }: { leadId: string; lead: Lead }) {
  const ratingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/ai-rating`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
    },
  });

  const getRatingColor = (rating: string | null | undefined) => {
    switch (rating) {
      case "Hot": return "text-red-500";
      case "Warm": return "text-orange-500";
      case "Neutral": return "text-yellow-500";
      case "Cold": return "text-blue-500";
      case "Poor": return "text-gray-500";
      default: return "text-muted-foreground";
    }
  };

  const getRatingBg = (rating: string | null | undefined) => {
    switch (rating) {
      case "Hot": return "bg-red-500/10 border-red-500/30";
      case "Warm": return "bg-orange-500/10 border-orange-500/30";
      case "Neutral": return "bg-yellow-500/10 border-yellow-500/30";
      case "Cold": return "bg-blue-500/10 border-blue-500/30";
      case "Poor": return "bg-gray-500/10 border-gray-500/30";
      default: return "bg-muted/30 border-muted";
    }
  };

  const renderStars = (score: number | null | undefined) => {
    const rating = score || 0;
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  const details = lead.ai_rating_details as { engagement?: number; sentiment?: number; progression?: number } | null;
  const hasRating = lead.ai_rating && lead.ai_rating !== "New";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI Insights
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => ratingMutation.mutate()}
          disabled={ratingMutation.isPending}
          data-testid="button-refresh-ai-rating"
        >
          {ratingMutation.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Analyze
        </Button>
      </div>

      <div className={`rounded-lg border p-3 ${getRatingBg(lead.ai_rating)}`}>
        {!lead.ai_rating || lead.ai_rating === "New" ? (
          <div className="text-center py-2">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {lead.ai_rating === "New" 
                ? "New lead - AI analysis requires 3+ follow-ups"
                : "Click Analyze to get AI insights"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Rating Badge and Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`font-semibold ${getRatingColor(lead.ai_rating)} ${getRatingBg(lead.ai_rating)}`}
                >
                  {lead.ai_rating}
                </Badge>
                <div className="flex items-center gap-0.5">
                  {renderStars(lead.ai_rating_score)}
                </div>
              </div>
              {lead.ai_rating_score && (
                <span className="text-sm font-medium">{lead.ai_rating_score.toFixed(1)}/5</span>
              )}
            </div>

            {/* Summary */}
            {lead.ai_rating_summary && (
              <p className="text-sm text-muted-foreground">
                {lead.ai_rating_summary}
              </p>
            )}

            {/* Detail Scores */}
            {details && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-muted/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Activity className="w-3 h-3" />
                    Engagement
                  </div>
                  <div className="text-sm font-semibold">
                    {details.engagement?.toFixed(1) || "-"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Star className="w-3 h-3" />
                    Sentiment
                  </div>
                  <div className="text-sm font-semibold">
                    {details.sentiment?.toFixed(1) || "-"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Progress
                  </div>
                  <div className="text-sm font-semibold">
                    {details.progression?.toFixed(1) || "-"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
