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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DrilldownResponse, DrilldownFilters } from "@shared/schema";
import { format } from "date-fns";

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
      const res = await fetch(`/api/company/reports/${reportId}/drilldown?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch drilldown data");
      return res.json();
    },
    enabled: open,
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[95vw] md:max-w-[80vw] h-[85vh] flex flex-col p-0"
        data-testid="dialog-report-drilldown"
      >
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Showing {leads.length} of {total} leads
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-drilldown"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[120px]">Mobile No</TableHead>
                    <TableHead className="min-w-[100px]">Language</TableHead>
                    <TableHead className="min-w-[120px]">Occupation</TableHead>
                    <TableHead className="min-w-[120px]">Lead Status</TableHead>
                    <TableHead className="min-w-[120px]">Visit Status</TableHead>
                    <TableHead className="min-w-[150px]">Sheet</TableHead>
                    <TableHead className="min-w-[150px]">Owner</TableHead>
                    <TableHead className="min-w-[100px]">Lead Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} data-testid={`drilldown-lead-${lead.id}`}>
                      <TableCell>{lead.custom_fields?.name || "-"}</TableCell>
                      <TableCell>{lead.custom_fields?.mobile_no || "-"}</TableCell>
                      <TableCell>{lead.custom_fields?.lang || "-"}</TableCell>
                      <TableCell>{lead.custom_fields?.occupation || "-"}</TableCell>
                      <TableCell>{lead.custom_fields?.lead_status || "-"}</TableCell>
                      <TableCell>{lead.custom_fields?.visit_status || "-"}</TableCell>
                      <TableCell className="font-medium">{lead.sheet_name}</TableCell>
                      <TableCell className="font-medium">{lead.owner_name}</TableCell>
                      <TableCell>
                        {lead.custom_fields?.lead_date 
                          ? format(new Date(lead.custom_fields.lead_date), "dd/MM/yy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
