import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Lead, LeadUpdate, CustomColumn } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageSquare, MapPin, ArrowRightLeft, Clock } from "lucide-react";

interface TransferRequestLeadDetailsDialogProps {
  leadId: string;
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

export function TransferRequestLeadDetailsDialog({
  leadId,
  sheetId,
  open,
  onOpenChange,
}: TransferRequestLeadDetailsDialogProps) {
  const { formatDateOnly, formatDateTime, formatInTimezone } = useCompanyTimezone();
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  const { data: lead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
    retry: 2,
  });

  const { data: updates = [], isLoading: isLoadingUpdates } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: !!leadId && open,
  });

  const { data: columns = [], isLoading: isLoadingColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId && open,
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

  const getUpdateViaIcon = (updateVia: string) => {
    switch (updateVia) {
      case "call":
        return <Phone className="h-4 w-4 text-blue-500 shrink-0" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-green-500 shrink-0" />;
      case "visit":
        return <MapPin className="h-4 w-4 text-purple-500 shrink-0" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-orange-500 shrink-0" />;
    }
  };

  const getFullName = (): string => {
    if (!lead?.custom_fields) return "Lead Details";
    const namePatterns = [/^full[_\s]?name/i, /^name$/i];
    for (const pattern of namePatterns) {
      const key = Object.keys(lead.custom_fields).find((k) => pattern.test(k));
      if (key && lead.custom_fields[key]) return String(lead.custom_fields[key]);
    }
    return "Lead Details";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getFullName()}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "history")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Lead Details</TabsTrigger>
            <TabsTrigger value="history">Update History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              {isLoadingLead || isLoadingColumns ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="p-4 space-y-4">
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

                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      System Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">Lead ID</div>
                        <div className="text-sm font-medium font-mono">{lead?.id || "-"}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">Created At</div>
                        <div className="text-sm font-medium">
                          {lead?.created_at ? formatInTimezone(lead.created_at, "MMM dd, yyyy HH:mm") : "-"}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">Updated At</div>
                        <div className="text-sm font-medium">
                          {lead?.updated_at ? formatInTimezone(lead.updated_at, "MMM dd, yyyy HH:mm") : "-"}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">Owner User ID</div>
                        <div className="text-sm font-medium font-mono">{lead?.owner_user_id || "-"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              {isLoadingUpdates ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">No update history found</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {updates.map((update, index) => {
                    const serialNo = updates.length - index;

                    return (
                      <div
                        key={update.id}
                        className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {/* Serial Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{serialNo}</span>
                        </div>

                        {/* Update Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getUpdateViaIcon(update.update_via)}
                            <span className="font-semibold capitalize text-sm">
                              {update.update_via}
                            </span>
                            {update.created_by_first_name && (
                              <span className="text-xs text-muted-foreground">
                                by {update.created_by_first_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mb-1.5">
                            {formatInTimezone(update.created_at, "MMM dd, yyyy HH:mm")}
                            {update.update_on && (
                              <span className="ml-2">
                                (Updated on: {formatInTimezone(update.update_on, "MMM dd, yyyy")})
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {update.remark}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

