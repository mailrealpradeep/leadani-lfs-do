import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Clock
} from "lucide-react";
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

interface LeadDetailDrawerProps {
  leadId: string | null;
  sheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

export function LeadDetailDrawer({ leadId, sheetId, open, onOpenChange }: LeadDetailDrawerProps) {
  const { formatDateOnly, formatDateTime, formatInTimezone } = useCompanyTimezone();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUpdateDialogOpen, setAddUpdateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  const { data: lead, isLoading, isError, refetch, isFetching } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
    retry: 2,
  });

  const { data: updates = [] } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: !!leadId && open,
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

  const handleCall = () => {
    if (hasValidMobile) {
      window.open(`tel:${cleanMobile}`, "_self");
    }
  };

  const handleWhatsApp = () => {
    if (hasValidMobile) {
      // Add country code if not present (assuming India +91)
      const waNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
      window.open(`https://wa.me/${waNumber}`, "_blank");
    }
  };

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
                  {/* Lead Information */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      Lead Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {sortedColumns.slice(0, 8).map((col) => {
                        const value = getLeadValue(lead, col.column_key);
                        const formattedValue = formatValue(value, col.type);

                        return (
                          <div key={col.id} className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">{col.name}</div>
                            {col.type === "dropdown" ? (
                              <Badge variant="secondary" className="text-xs font-normal">{formattedValue}</Badge>
                            ) : (
                              <div className="text-sm font-medium truncate">{formattedValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sortedColumns.length > 8 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-muted-foreground"
                        onClick={() => setEditDialogOpen(true)}
                        data-testid="button-view-all-fields"
                      >
                        View all {sortedColumns.length} fields
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
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
                        {updates.slice(0, 5).map((update) => (
                          <div
                            key={update.id}
                            className="p-3 bg-muted/30 rounded-lg border"
                            data-testid={`update-${update.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {update.update_via === "call" ? (
                                <Phone className="h-3 w-3 text-blue-500" />
                              ) : (
                                <MessageCircle className="h-3 w-3 text-green-500" />
                              )}
                              <span className="text-xs font-medium capitalize">
                                {update.update_via}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatInTimezone(update.created_at, "MMM d, h:mm a")}
                              </span>
                            </div>
                            {update.remark && (
                              <p className="text-sm text-foreground/80 line-clamp-2">
                                {update.remark}
                              </p>
                            )}
                            {update.created_by_first_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                by {update.created_by_first_name}
                              </p>
                            )}
                          </div>
                        ))}
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
    </>
  );
}
