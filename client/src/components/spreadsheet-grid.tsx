import { useState, useEffect, useCallback, useRef } from "react";
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
  Eye,
  EyeOff,
  Flame,
  X,
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
  onScroll?: (scrollTop: number, scrollingDown: boolean) => void;
}

export function SpreadsheetGrid({
  sheetId,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onOpenColumnManager,
  onScroll,
}: SpreadsheetGridProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // New features state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [isScrolled, setIsScrolled] = useState(false);

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

  // Load hidden columns for current sheet and reset filters on sheet change
  useEffect(() => {
    const stored = localStorage.getItem(`hiddenColumns_${sheetId}`);
    setHiddenColumns(stored ? new Set(JSON.parse(stored)) : new Set());
    
    // Reset filters when switching sheets
    setColumnFilters({});
    setCategoryFilter("all");
    setSearchQuery("");
    setSortColumn(null);
    setSortDirection("asc");
  }, [sheetId]);

  // Persist hidden columns to localStorage
  useEffect(() => {
    if (hiddenColumns.size === 0 && !localStorage.getItem(`hiddenColumns_${sheetId}`)) {
      return; // Don't persist empty set on initial load
    }
    localStorage.setItem(`hiddenColumns_${sheetId}`, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns, sheetId]);

  // Scroll event handler for header auto-hide
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      setIsScrolled(scrollTop > 50);
      
      // Notify parent about scroll if callback provided
      if (onScroll) {
        const scrollingDown = scrollTop > lastScrollTop;
        onScroll(scrollTop, scrollingDown);
      }
      
      lastScrollTop = scrollTop;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onScroll]);

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
      // Category filter
      if (categoryFilter !== "all" && lead.lead_category !== categoryFilter) {
        return false;
      }
      
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          lead.name?.toLowerCase().includes(query) ||
          lead.mobile_no?.toLowerCase().includes(query) ||
          lead.whatsapp?.toLowerCase().includes(query) ||
          lead.executive?.toLowerCase().includes(query) ||
          lead.address?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Column filters
      for (const [columnKey, filterValue] of Object.entries(columnFilters)) {
        if (!filterValue) continue;
        const cellValue = String((lead as any)[columnKey] || "").toLowerCase();
        const filter = filterValue.toLowerCase();
        if (!cellValue.includes(filter)) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = (a as any)[sortColumn] || "";
      const bVal = (b as any)[sortColumn] || "";
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const columns = [
    { key: "lead_category", label: "Priority", width: "120px", sortable: true, isCategory: true },
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

  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.key));

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const updateCategory = (leadId: string, category: "hot" | "warm" | "cold") => {
    updateLeadMutation.mutate({
      leadId,
      data: { lead_category: category },
    });
  };

  const getCategoryColor = (category: "hot" | "warm" | "cold") => {
    switch (category) {
      case "hot":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
      case "warm":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800";
      case "cold":
      default:
        return "text-muted-foreground";
    }
  };

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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 min-h-[44px]"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
            <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]" data-testid="select-category-filter">
              <SelectValue placeholder="All Leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="hot">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  Hot Leads
                </div>
              </SelectItem>
              <SelectItem value="warm">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Warm Leads
                </div>
              </SelectItem>
              <SelectItem value="cold">Cold Leads</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                className="min-h-[44px]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-toggle-columns" className="min-h-[44px] hidden md:flex">
                <Eye className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {columns.map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  onClick={() => toggleColumnVisibility(col.key)}
                  data-testid={`menuitem-toggle-${col.key}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {hiddenColumns.has(col.key) ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="flex-1">{col.label}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAndSortedLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">📋</div>
            <p>No leads found.</p>
            {categoryFilter !== "all" && <p className="text-sm mt-1">Try changing the filter.</p>}
          </div>
        ) : (
          filteredAndSortedLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-card border rounded-lg p-4 hover-elevate active-elevate-2"
              data-testid={`card-lead-${lead.id}`}
              onClick={() => onOpenLeadDetail(lead.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{lead.name || "Unnamed Lead"}</h3>
                  <p className="text-sm text-muted-foreground truncate">{lead.occupation || lead.executive || "—"}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${getCategoryColor(lead.lead_category)} min-h-[36px]`}
                      data-testid={`button-category-${lead.id}`}
                    >
                      <Flame className="h-3 w-3 mr-1" />
                      {lead.lead_category?.charAt(0).toUpperCase() + lead.lead_category?.slice(1) || "Cold"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => updateCategory(lead.id, "hot")}>
                      <Flame className="h-4 w-4 mr-2 text-red-500" />
                      Hot
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateCategory(lead.id, "warm")}>
                      <Flame className="h-4 w-4 mr-2 text-orange-500" />
                      Warm
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateCategory(lead.id, "cold")}>
                      <Flame className="h-4 w-4 mr-2 text-muted-foreground" />
                      Cold
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Mobile:</span>
                  <p className="truncate">{lead.mobile_no || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <p className="truncate">{lead.whatsapp || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="truncate">{lead.lead_status || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="truncate">{lead.lead_date ? format(new Date(lead.lead_date), "MMM d, yyyy") : "—"}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div ref={containerRef} className="hidden md:block border rounded-lg overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 border-b-2">
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
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ minWidth: col.width }}
                  className="font-medium text-xs uppercase tracking-wide"
                >
                  <div className="flex flex-col gap-1">
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
                    {!col.isCategory && (
                      <div className="relative">
                        <Input
                          placeholder="Filter..."
                          value={columnFilters[col.key] || ""}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="h-7 text-xs"
                          data-testid={`input-filter-${col.key}`}
                        />
                        {columnFilters[col.key] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2"
                            onClick={() =>
                              setColumnFilters((prev) => {
                                const next = { ...prev };
                                delete next[col.key];
                                return next;
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
                <TableCell colSpan={visibleColumns.length + 2} className="text-center py-12 text-muted-foreground">
                  No leads found. {categoryFilter !== "all" ? `Try changing the filter.` : `Add your first lead to get started.`}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={`hover-elevate cursor-pointer ${isScrolled ? "" : ""}`}
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
                  {visibleColumns.map((col) => {
                    const isEditing =
                      editingCell?.leadId === lead.id && editingCell?.field === col.key;
                    const value = (lead as any)[col.key];
                    const isDropdown = dropdownColumns.includes(col.key);
                    const isCategory = col.key === "lead_category";

                    return (
                      <TableCell
                        key={col.key}
                        onDoubleClick={() => !isCategory && handleCellClick(lead.id, col.key, value)}
                        className="px-3 py-2"
                        data-testid={`cell-${lead.id}-${col.key}`}
                        onClick={(e) => isCategory && e.stopPropagation()}
                      >
                        {isCategory ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={getCategoryColor(lead.lead_category)}
                                data-testid={`button-category-${lead.id}`}
                              >
                                <Flame className="h-3 w-3 mr-1" />
                                {lead.lead_category?.charAt(0).toUpperCase() + lead.lead_category?.slice(1) || "Cold"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateCategory(lead.id, "hot")}>
                                <Flame className="h-4 w-4 mr-2 text-red-500" />
                                Hot
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCategory(lead.id, "warm")}>
                                <Flame className="h-4 w-4 mr-2 text-orange-500" />
                                Warm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCategory(lead.id, "cold")}>
                                <Flame className="h-4 w-4 mr-2 text-muted-foreground" />
                                Cold
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : isEditing ? (
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
