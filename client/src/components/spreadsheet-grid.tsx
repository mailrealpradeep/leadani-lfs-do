import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Lead, DropdownOption } from "@shared/schema";

interface SpreadsheetGridProps {
  sheetId: string;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenDropdownManager: (columnKey: string) => void;
  onOpenColumnManager: () => void;
}

export function SpreadsheetGrid({
  sheetId,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onOpenColumnManager,
}: SpreadsheetGridProps) {
  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/sheets", sheetId, "leads"],
    enabled: !!sheetId,
  });

  const { data: dropdownOptions = [] } = useQuery<DropdownOption[]>({
    queryKey: ["/api/sheets", sheetId, "dropdowns"],
    enabled: !!sheetId,
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: Partial<Lead> }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      await Promise.all(leadIds.map((id) => apiRequest("DELETE", `/api/leads/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      setSelectedRows(new Set());
      toast({
        title: "Leads deleted",
        description: `${selectedRows.size} lead(s) deleted successfully`,
      });
    },
  });

  // Socket.io realtime updates
  useEffect(() => {
    if (!sheetId) return;
    
    const socket = getSocket();
    
    // Join the sheet room
    socket.emit("join_sheet", sheetId);

    // Listen for realtime events
    const handleLeadCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
    };

    const handleLeadUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
    };

    socket.on("lead_created", handleLeadCreated);
    socket.on("lead_updated", handleLeadUpdated);

    return () => {
      socket.emit("leave_sheet", sheetId);
      socket.off("lead_created", handleLeadCreated);
      socket.off("lead_updated", handleLeadUpdated);
    };
  }, [sheetId]);

  const handleCellClick = (leadId: string, field: string, currentValue: any) => {
    setEditingCell({ leadId, field });
    setEditValue(currentValue || "");
  };

  const handleCellSave = () => {
    if (editingCell) {
      updateLeadMutation.mutate({
        leadId: editingCell.leadId,
        data: { [editingCell.field]: editValue },
      });
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const getDropdownOptionsForColumn = (columnKey: string) => {
    return dropdownOptions
      .filter((opt) => opt.column_key === columnKey && opt.sheet_id === sheetId)
      .sort((a, b) => a.order_index - b.order_index);
  };

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedLeads = leads
    .filter((lead) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(query) ||
        lead.mobile_no?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.executive?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = (a as any)[sortColumn] || "";
      const bVal = (b as any)[sortColumn] || "";
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const columns = [
    { key: "lead_date", label: "Lead Date", width: "120px", sortable: true },
    { key: "lead_time", label: "Time", width: "100px", sortable: false },
    { key: "executive", label: "Executive", width: "140px", sortable: true },
    { key: "lang", label: "Lang", width: "120px", sortable: true, dropdown: true },
    { key: "address", label: "Address", width: "200px", sortable: false },
    { key: "name", label: "Name", width: "150px", sortable: true },
    { key: "mobile_no", label: "Mobile No", width: "130px", sortable: false },
    { key: "whatsapp", label: "WhatsApp", width: "130px", sortable: false },
    { key: "occupation", label: "Occupation", width: "140px", sortable: true, dropdown: true },
    { key: "qualification", label: "Qualification", width: "140px", sortable: true, dropdown: true },
    { key: "age", label: "Age", width: "80px", sortable: true },
    { key: "exam_end", label: "Exam End", width: "120px", sortable: false },
    { key: "exam_mark", label: "Exam Mark", width: "100px", sortable: false },
    { key: "lead_status", label: "Lead Status", width: "130px", sortable: true, dropdown: true },
    { key: "visit_status", label: "Visit Status", width: "130px", sortable: true, dropdown: true },
    { key: "visit_date", label: "Visit Date", width: "120px", sortable: false },
    { key: "nfdt", label: "NFDT", width: "100px", sortable: false },
    { key: "call_1", label: "Call 1", width: "150px", sortable: false },
    { key: "feedback_1", label: "Feedback 1", width: "200px", sortable: false },
  ];

  const dropdownColumns = ["lang", "occupation", "qualification", "lead_status", "visit_status"];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <>
              <Badge variant="secondary" data-testid="text-selected-count">
                {selectedRows.size} selected
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteLeadsMutation.mutate(Array.from(selectedRows))}
                data-testid="button-delete-selected"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenColumnManager}
            data-testid="button-manage-columns"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/sheets/${sheetId}/export?format=csv`, "_blank")}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRows.size === leads.length && leads.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRows(new Set(leads.map((l) => l.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ minWidth: col.width }}
                  className="font-medium text-xs uppercase tracking-wide"
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.dropdown && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onOpenDropdownManager(col.key)}
                        data-testid={`button-manage-dropdown-${col.key}`}
                      >
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    )}
                    {col.sortable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => toggleSort(col.key)}
                        data-testid={`button-sort-${col.key}`}
                      >
                        {sortColumn === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-30" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-12 text-muted-foreground">
                  No leads found. Add your first lead to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`row-lead-${lead.id}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.has(lead.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedRows);
                        if (checked) {
                          newSelected.add(lead.id);
                        } else {
                          newSelected.delete(lead.id);
                        }
                        setSelectedRows(newSelected);
                      }}
                      data-testid={`checkbox-select-${lead.id}`}
                    />
                  </TableCell>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.leadId === lead.id && editingCell?.field === col.key;
                    const value = (lead as any)[col.key];
                    const isDropdown = dropdownColumns.includes(col.key);

                    return (
                      <TableCell
                        key={col.key}
                        onDoubleClick={() => handleCellClick(lead.id, col.key, value)}
                        className="px-3 py-2"
                        data-testid={`cell-${lead.id}-${col.key}`}
                      >
                        {isEditing ? (
                          isDropdown ? (
                            <Select
                              value={editValue}
                              onValueChange={(val) => {
                                setEditValue(val);
                                updateLeadMutation.mutate({
                                  leadId: lead.id,
                                  data: { [col.key]: val },
                                });
                                setEditingCell(null);
                              }}
                              open
                              onOpenChange={(open) => {
                                if (!open) setEditingCell(null);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getDropdownOptionsForColumn(col.key).map((opt) => (
                                  <SelectItem key={opt.id} value={opt.value}>
                                    {opt.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleCellKeyDown}
                              className="h-8"
                              autoFocus
                              data-testid={`input-edit-${col.key}`}
                            />
                          )
                        ) : (
                          <span className="text-sm">{value || "-"}</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-actions-${lead.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onOpenLeadDetail(lead.id)}
                          data-testid={`button-view-details-${lead.id}`}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteLeadsMutation.mutate([lead.id])}
                          className="text-destructive"
                          data-testid={`button-delete-${lead.id}`}
                        >
                          Delete
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
  );
}
