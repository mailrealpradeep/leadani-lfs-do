import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { LeadUpdateHistoryDialog } from "@/components/lead-update-history-dialog";
import type { DrilldownResponse, DrilldownFilters, CustomColumn } from "@shared/schema";
import { format, parse } from "date-fns";

interface ReportDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  filters: DrilldownFilters;
  title: string; // e.g., "Talked - Hindi (5 leads)"
  sheetIds?: string[];
}

export function ReportDrilldownModal({
  open,
  onOpenChange,
  reportId,
  filters,
  title,
  sheetIds,
}: ReportDrilldownModalProps) {
  const [page, setPage] = useState(1);
  const limit = 50;
  const prevOpenRef = useRef(false);
  const prevContextRef = useRef<string>("");
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<string>("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch company columns with authentication
  const { data: companyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/company/columns", {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch company columns");
      return res.json();
    },
  });

  // Sort columns by order_index
  const sortedColumns = [...companyColumns].sort((a, b) => a.order_index - b.order_index);

  // Reset page to 1 when modal opens OR when the drilldown context changes
  useEffect(() => {
    const currentContext = JSON.stringify({ reportId, filters, sheetIds });
    const contextChanged = prevContextRef.current !== currentContext;
    const modalOpened = !prevOpenRef.current && open;

    if (modalOpened || (open && contextChanged)) {
      setPage(1);
    }

    prevOpenRef.current = open;
    prevContextRef.current = currentContext;
  }, [open, reportId, filters, sheetIds]);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set("filters", JSON.stringify(filters));
  queryParams.set("page", page.toString());
  queryParams.set("limit", limit.toString());
  if (sheetIds && sheetIds.length > 0) {
    sheetIds.forEach(id => queryParams.append("sheet_ids", id));
  }

  const { data, isLoading } = useQuery<DrilldownResponse>({
    queryKey: ["/api/company/reports", reportId, "drilldown", filters, page, sheetIds],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/company/reports/${reportId}/drilldown?${queryParams.toString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch drilldown data");
      return res.json();
    },
    enabled: open,
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  // Shared helper to format dates consistently
  const formatDateForDisplay = (value: any): string => {
    if (!value) return "-";
    
    try {
      // Try parsing as dd/MM/yy first
      const parsedDate = parse(String(value), "dd/MM/yy", new Date());
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, "dd/MM/yy");
      }
      // Try ISO format
      const isoDate = new Date(value);
      if (!isNaN(isoDate.getTime())) {
        return format(isoDate, "dd/MM/yy");
      }
      return String(value);
    } catch {
      return String(value);
    }
  };

  // Helper function to render cell value based on column type
  const renderCellValue = (lead: any, column: CustomColumn) => {
    const value = lead.custom_fields?.[column.column_key];
    
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    switch (column.type) {
      case "date":
        return formatDateForDisplay(value);
      case "percentage":
        // Only append % if not already present
        return String(value).endsWith("%") ? value : `${value}%`;
      case "boolean":
        // Handle both boolean and string boolean values
        const boolValue = typeof value === "string" 
          ? value.toLowerCase() === "true" || value === "1"
          : Boolean(value);
        return boolValue ? "Yes" : "No";
      default:
        return value;
    }
  };

  // Helper to get a specific column value by column key
  const getColumnValue = (lead: any, columnKey: string): string => {
    const column = sortedColumns.find(col => col.column_key === columnKey);
    if (!column) return "-";
    return String(renderCellValue(lead, column) || "-");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[95vw] md:max-w-[80vw] h-[85vh] flex flex-col p-0"
        data-testid="dialog-report-drilldown"
      >
        <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b">
          <DialogTitle className="text-base md:text-lg truncate">{title}</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Showing {leads.length} of {total} leads
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-2 md:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm md:text-base text-muted-foreground">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm md:text-base text-muted-foreground">No leads found</p>
            </div>
          ) : isMobile ? (
            // Mobile card view
            <div className="space-y-3 py-3">
              {leads.map((lead) => (
                <Card 
                  key={lead.id} 
                  className="hover-elevate"
                  data-testid={`drilldown-card-${lead.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {getColumnValue(lead, "name")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lead.sheet_name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setSelectedLeadForHistory(lead.id);
                          setHistoryDialogOpen(true);
                        }}
                        data-testid={`button-history-${lead.id}`}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Mobile:</span>
                          <p className="font-medium mt-0.5">{getColumnValue(lead, "mobile_no")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">WhatsApp:</span>
                          <p className="font-medium mt-0.5">{getColumnValue(lead, "phone")}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {getColumnValue(lead, "status")}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <p className="font-medium mt-0.5">{getColumnValue(lead, "language")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop table view
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Dynamically render company columns */}
                    {sortedColumns.map((column) => (
                      <TableHead 
                        key={column.id} 
                        className="min-w-[120px] text-xs md:text-sm whitespace-nowrap"
                      >
                        {column.name}
                      </TableHead>
                    ))}
                    {/* Fixed system columns */}
                    <TableHead className="min-w-[140px] text-xs md:text-sm whitespace-nowrap">Sheet Name</TableHead>
                    <TableHead className="min-w-[140px] text-xs md:text-sm whitespace-nowrap">Owner</TableHead>
                    <TableHead className="min-w-[100px] text-xs md:text-sm whitespace-nowrap">Lead Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} data-testid={`drilldown-lead-${lead.id}`}>
                      {/* Dynamically render company column values */}
                      {sortedColumns.map((column) => (
                        <TableCell 
                          key={column.id} 
                          className="text-xs md:text-sm"
                        >
                          {renderCellValue(lead, column)}
                        </TableCell>
                      ))}
                      {/* Fixed system column values */}
                      <TableCell className="font-medium text-xs md:text-sm">{lead.sheet_name}</TableCell>
                      <TableCell className="font-medium text-xs md:text-sm">{lead.owner_name}</TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {formatDateForDisplay(lead.custom_fields?.lead_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t px-3 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs md:text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                data-testid="button-prev-page"
                className="text-xs md:text-sm"
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                data-testid="button-next-page"
                className="text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Lead Update History Dialog */}
      {selectedLeadForHistory && (
        <LeadUpdateHistoryDialog
          leadId={selectedLeadForHistory}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}
    </Dialog>
  );
}
