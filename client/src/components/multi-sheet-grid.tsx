import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDashboard } from "./dashboard-context";
import { Pagination } from "./pagination";
import {
  Loader2,
  MoreHorizontal,
  Eye,
  MessageCircle,
  History,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import type { Lead, CustomColumn } from "@shared/schema";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";

interface MultiSheetGridProps {
  sheetIds: string[];
  onOpenLeadDetail: (leadId: string) => void;
}

interface PaginatedLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sheetNames: Record<string, string>;
}

export function MultiSheetGrid({ sheetIds, onOpenLeadDetail }: MultiSheetGridProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { searchQuery, pagination, setPagination } = useDashboard();

  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateHistoryDialogOpen, setUpdateHistoryDialogOpen] = useState(false);
  const [selectedLeadForUpdate, setSelectedLeadForUpdate] = useState<string | null>(null);

  const { data: companyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const {
    data: paginatedData,
    isLoading,
    isFetching,
  } = useQuery<PaginatedLeadsResponse>({
    queryKey: ["/api/leads/query", sheetIds, pagination.page, pagination.limit, sortColumn, sortDirection, searchQuery],
    queryFn: async () => {
      const response = await apiRequest<PaginatedLeadsResponse>("POST", "/api/leads/query", {
        sheetIds,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortColumn,
        sortOrder: sortDirection,
        filters: searchQuery ? { search: searchQuery } : {},
      });
      return response;
    },
    enabled: sheetIds.length > 0,
  });

  useEffect(() => {
    if (paginatedData) {
      setPagination({
        page: paginatedData.page,
        limit: paginatedData.limit,
        total: paginatedData.total,
        totalPages: paginatedData.totalPages,
      });
    }
  }, [paginatedData, setPagination]);

  useEffect(() => {
    setPagination({ ...pagination, page: 1 });
  }, [sheetIds.length, searchQuery]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  }, [pagination, setPagination]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination({ ...pagination, page: 1, limit: newLimit });
  }, [pagination, setPagination]);

  const columns = useMemo(() => {
    const baseColumns = companyColumns
      .sort((a, b) => a.order_index - b.order_index)
      .map(col => ({
        key: col.column_key,
        label: col.name,
        type: col.type,
        width: col.type === "text" ? "150px" : col.type === "date" ? "110px" : "120px",
      }));

    return [
      { key: "__sheet_name__", label: "Sheet", type: "text", width: "140px" },
      ...baseColumns,
    ];
  }, [companyColumns]);

  const getLeadValue = (lead: Lead, columnKey: string) => {
    if (columnKey === "__sheet_name__") {
      return paginatedData?.sheetNames?.[lead.sheet_id] || "Unknown";
    }
    return lead.custom_fields?.[columnKey];
  };

  const formatCellValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">—</span>;
    }

    if (type === "date") {
      try {
        return format(new Date(value), "dd/MM/yyyy");
      } catch {
        return value;
      }
    }

    if (type === "percentage") {
      return `${value}%`;
    }

    if (type === "boolean") {
      return value ? "Yes" : "No";
    }

    if (type === "dropdown") {
      return <Badge variant="secondary">{value}</Badge>;
    }

    return String(value);
  };

  const handleOpenUpdate = (leadId: string) => {
    setSelectedLeadForUpdate(leadId);
    setUpdateDialogOpen(true);
  };

  const handleOpenHistory = (leadId: string) => {
    setSelectedLeadForUpdate(leadId);
    setUpdateHistoryDialogOpen(true);
  };

  if (sheetIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">No sheets selected</h2>
          <p className="text-muted-foreground">
            Select one or more sheets from the sidebar to view combined lead data.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading leads from {sheetIds.length} sheets...
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const leads = paginatedData?.leads || [];
  const total = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total.toLocaleString()} leads from {sheetIds.length} sheets
          </div>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No leads found matching your criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => {
              const fullName = lead.custom_fields?.full_name || lead.custom_fields?.name || "Unnamed";
              const sheetName = paginatedData?.sheetNames?.[lead.sheet_id] || "Unknown";
              const mobileNo = lead.custom_fields?.mobile_no || "";

              return (
                <div
                  key={lead.id}
                  className="bg-card border rounded-lg p-3 space-y-2"
                  onClick={() => onOpenLeadDetail(lead.id)}
                  data-testid={`lead-card-${lead.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{fullName}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {sheetName}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenLeadDetail(lead.id); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenUpdate(lead.id); }}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Add Update
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenHistory(lead.id); }}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {mobileNo && (
                    <p className="text-sm text-muted-foreground">{mobileNo}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={totalPages}
            total={total}
            limit={pagination.limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}

        {selectedLeadForUpdate && (
          <>
            <LeadUpdateDialog
              leadId={selectedLeadForUpdate}
              open={updateDialogOpen}
              onOpenChange={setUpdateDialogOpen}
            />
            <LeadUpdateHistoryDialog
              leadId={selectedLeadForUpdate}
              open={updateHistoryDialogOpen}
              onOpenChange={setUpdateHistoryDialogOpen}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          {total.toLocaleString()} leads from {sheetIds.length} sheets
        </div>
        {isFetching && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </div>
        )}
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort(col.key)}
                    data-testid={`header-${col.key}`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[60px]" data-testid="header-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">
                    No leads found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onOpenLeadDetail(lead.id)}
                    data-testid={`lead-row-${lead.id}`}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        style={{ width: col.width, minWidth: col.width }}
                        className="truncate"
                        data-testid={`cell-${lead.id}-${col.key}`}
                      >
                        {col.key === "__sheet_name__" ? (
                          <Badge variant="outline" className="text-xs">
                            {getLeadValue(lead, col.key)}
                          </Badge>
                        ) : (
                          formatCellValue(getLeadValue(lead, col.key), col.type)
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenLeadDetail(lead.id); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenUpdate(lead.id); }}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Add Update
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenHistory(lead.id); }}>
                            <History className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={totalPages}
          total={total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {selectedLeadForUpdate && (
        <>
          <LeadUpdateDialog
            leadId={selectedLeadForUpdate}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
          />
          <LeadUpdateHistoryDialog
            leadId={selectedLeadForUpdate}
            open={updateHistoryDialogOpen}
            onOpenChange={setUpdateHistoryDialogOpen}
          />
        </>
      )}
    </div>
  );
}
