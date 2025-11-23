import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDashboard } from "./dashboard-context";
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
  Edit2,
  History,
  ArrowRightLeft,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isWithinInterval, parseISO } from "date-fns";
import type { Lead, DropdownOption, CustomColumn, ValidationRule } from "@shared/schema";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";
import { DateRangeFilter, type DateFilterValue } from "./filters/date-range-filter";
import { DropdownFilter } from "./filters/dropdown-filter";
import { validateLeadAgainstRules } from "@shared/validator";

interface SpreadsheetGridProps {
  sheetId: string;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenDropdownManager: (columnKey: string) => void;
  onScroll?: (scrollTop: number, scrollingDown: boolean) => void;
}

export function SpreadsheetGrid({
  sheetId,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onScroll,
}: SpreadsheetGridProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { searchQuery, categoryFilter } = useDashboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string; originalValue?: any } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState<{ leadId: string; field: string } | null>(null);
  
  // New features state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string | DateFilterValue | null>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateHistoryDialogOpen, setUpdateHistoryDialogOpen] = useState(false);
  const [selectedLeadForUpdate, setSelectedLeadForUpdate] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetSheetId, setSelectedTargetSheetId] = useState<string>("");

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/sheets", sheetId, "leads"],
    enabled: !!sheetId,
  });

  const { data: customColumns = [], isLoading: isLoadingColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId,
  });

  const { data: allSheets = [] } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: validationRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", sheetId, "validation-rules"],
    enabled: !!sheetId,
  });

  const isLoading = isLoadingLeads || isLoadingColumns;

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, customFields }: { leadId: string; customFields: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { custom_fields: customFields });
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

  const transferLeadsMutation = useMutation({
    mutationFn: async ({ leadIds, targetSheetId }: { leadIds: string[]; targetSheetId: string }) => {
      return await apiRequest("POST", "/api/leads/transfer", { leadIds, targetSheetId });
    },
    onSuccess: (data: any, variables) => {
      // Invalidate both source and target sheets
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", variables.targetSheetId, "leads"] });
      setSelectedRows(new Set());
      setTransferDialogOpen(false);
      toast({
        title: "Leads transferred",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer leads",
        variant: "destructive",
      });
    },
  });

  // Compute which leads are invalid based on validation rules
  // Store validation results with details for each invalid lead
  const leadValidationResults = useMemo(() => {
    const results = new Map<string, { isValid: boolean; missingFields: string[]; triggeredBy?: string }>();
    
    if (validationRules.length === 0) {
      return results;
    }
    
    for (const lead of leads) {
      const result = validateLeadAgainstRules(lead, validationRules);
      if (!result.isValid) {
        results.set(lead.id, result);
      }
    }
    
    return results;
  }, [leads, validationRules]);
  
  const invalidLeadIds = useMemo(() => {
    return new Set(leadValidationResults.keys());
  }, [leadValidationResults]);

  // Load hidden columns for current sheet and reset column filters on sheet change  
  useEffect(() => {
    const stored = localStorage.getItem(`hiddenColumns_${sheetId}`);
    setHiddenColumns(stored ? new Set(JSON.parse(stored)) : new Set());
    
    // Reset filters when switching sheets
    setColumnFilters({});
    setSortColumn(null);
    setSortDirection("asc");
  }, [sheetId]);

  // Reset view-specific state when switching between mobile and desktop
  const prevIsMobileRef = useRef<boolean | null>(null);
  useEffect(() => {
    // Skip on initial mount
    if (prevIsMobileRef.current === null) {
      prevIsMobileRef.current = isMobile;
      return;
    }
    
    // Only reset if layout actually changed (crossed breakpoint)
    if (prevIsMobileRef.current !== isMobile) {
      // Clear editing state when switching views
      setEditingCell(null);
      setEditValue("");
      // Clear selected rows when switching views
      setSelectedRows(new Set());
      // Reset scroll state
      setIsScrolled(false);
      
      prevIsMobileRef.current = isMobile;
    }
  }, [isMobile]);

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

  const handleCellClick = (lead: Lead, columnKey: string, currentValue: any, columnType?: string) => {
    setEditingCell({ leadId: lead.id, field: columnKey, originalValue: currentValue });
    setEditValue(currentValue || "");
    // Automatically open date picker for date fields
    if (columnType === "date") {
      setDatePickerOpen({ leadId: lead.id, field: columnKey });
    }
  };

  const handleCellSave = (lead: Lead) => {
    if (editingCell && editValue !== undefined) {
      // Only save if value has changed
      const originalValue = editingCell.originalValue ?? "";
      if (editValue !== originalValue) {
        const updatedFields = {
          ...lead.custom_fields,
          [editingCell.field]: editValue,
        };
        updateLeadMutation.mutate({
          leadId: editingCell.leadId,
          customFields: updatedFields,
        });
      }
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, lead: Lead) => {
    if (e.key === "Enter") {
      handleCellSave(lead);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const getDropdownOptionsForColumn = (columnKey: string): string[] => {
    const column = customColumns.find((col) => col.column_key === columnKey);
    if (!column || column.type !== "dropdown") return [];
    
    // Extract dropdown options from column config
    const config = column.config as any;
    return config?.dropdown_options || [];
  };

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Get value from lead's custom_fields
  const getLeadValue = (lead: Lead, columnKey: string) => {
    return lead.custom_fields[columnKey];
  };

  // Convert CustomColumn to display columns (must be before filteredAndSortedLeads)
  const columns = customColumns
    .sort((a, b) => a.order_index - b.order_index)
    .map((col) => ({
      key: col.column_key,
      label: col.name,
      width: col.type === "text" ? "120px" : col.type === "number" ? "90px" : col.type === "date" ? "110px" : col.type === "boolean" ? "90px" : col.type === "mobile" ? "130px" : "120px",
      sortable: true,
      dropdown: col.type === "dropdown",
      type: col.type,
      config: col.config,
    }));

  // Set default sort to Lead Date (new to old) on first load
  useEffect(() => {
    if (customColumns.length > 0 && sortColumn === null) {
      // Look for a date column with "lead" and "date" in the name/key
      const leadDateColumn = customColumns.find(col => 
        (col.name.toLowerCase().includes("lead") && col.name.toLowerCase().includes("date")) ||
        (col.column_key.toLowerCase().includes("lead") && col.column_key.toLowerCase().includes("date"))
      );
      
      if (leadDateColumn) {
        setSortColumn(leadDateColumn.column_key);
        setSortDirection("desc"); // New to old
      }
    }
  }, [customColumns, sortColumn]);

  const filteredAndSortedLeads = leads
    .filter((lead) => {
      // Search query filter - search across all custom fields
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = Object.values(lead.custom_fields).some(value => 
          String(value || "").toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Column filters
      for (const [columnKey, filterValue] of Object.entries(columnFilters)) {
        if (!filterValue) continue;
        
        const cellValue = getLeadValue(lead, columnKey);
        const column = columns.find(c => c.key === columnKey);
        
        // Date range filter
        if (typeof filterValue === "object" && "type" in filterValue && filterValue.from && filterValue.to) {
          if (!cellValue) return false;
          
          try {
            // Parse the cell value as a date (supports dd/MM/yyyy, ISO strings, etc.)
            let cellDate: Date;
            if (typeof cellValue === "string") {
              // Try to parse as dd/MM/yyyy first
              const parts = cellValue.split("/");
              if (parts.length === 3) {
                const [day, month, year] = parts;
                cellDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else {
                cellDate = parseISO(cellValue);
              }
            } else {
              cellDate = new Date(cellValue);
            }
            
            if (!isWithinInterval(cellDate, { start: filterValue.from, end: filterValue.to })) {
              return false;
            }
          } catch (e) {
            return false;
          }
        }
        // Dropdown filter (string) - exact match
        else if (typeof filterValue === "string" && column?.type === "dropdown") {
          const cellValueStr = String(cellValue || "");
          if (cellValueStr !== filterValue) {
            return false;
          }
        }
        // Text filter (string) - substring match
        else if (typeof filterValue === "string") {
          const cellValueStr = String(cellValue || "").toLowerCase();
          const filter = filterValue.toLowerCase();
          if (!cellValueStr.includes(filter)) {
            return false;
          }
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = getLeadValue(a, sortColumn) || "";
      const bVal = getLeadValue(b, sortColumn) || "";
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.key));

  // Calculate total table width: checkbox (50px) + all visible columns + actions (150px)
  const calculateTableWidth = () => {
    const checkboxWidth = 50;
    const actionsWidth = 150;
    const columnsWidth = visibleColumns.reduce((sum, col) => {
      return sum + parseInt(col.width);
    }, 0);
    return checkboxWidth + columnsWidth + actionsWidth;
  };

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Update Dialogs */}
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

      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" data-testid="text-selected-count">
            {selectedRows.size} selected
          </Badge>
          <Button
            variant="default"
            size="sm"
            onClick={() => setTransferDialogOpen(true)}
            data-testid="button-transfer-selected"
            className="min-h-[44px]"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
          </Button>
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
        </div>
      )}

      {/* Conditionally render mobile or desktop view based on viewport */}
      {isMobile ? (
        /* Mobile Card View with Scroll Container */
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {filteredAndSortedLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No leads found.</p>
                </div>
              ) : (
                filteredAndSortedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`border rounded-lg p-4 hover-elevate active-elevate-2 ${
                      invalidLeadIds.has(lead.id) 
                        ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800" 
                        : "bg-card"
                    }`}
                    data-testid={`card-lead-${lead.id}`}
                    onClick={() => onOpenLeadDetail(lead.id)}
                    title={invalidLeadIds.has(lead.id) && leadValidationResults.get(lead.id) 
                      ? `Missing required fields: ${leadValidationResults.get(lead.id)?.missingFields.join(', ')}`
                      : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {visibleColumns.slice(0, 2).map((col) => {
                          const value = getLeadValue(lead, col.key);
                          return value ? (
                            <p key={col.key} className="text-sm truncate">
                              <span className="font-medium">{value}</span>
                            </p>
                          ) : null;
                        })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {visibleColumns.slice(2, 6).map((col) => {
                        const value = getLeadValue(lead, col.key);
                        return (
                          <div key={col.key}>
                            <span className="text-muted-foreground">{col.label}:</span>
                            <p className="truncate">
                              {col.type === "date" && value 
                                ? format(new Date(value), "MMM d, yyyy")
                                : value || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-[44px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadForUpdate(lead.id);
                          setUpdateDialogOpen(true);
                        }}
                        data-testid={`button-update-lead-${lead.id}`}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-[44px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadForUpdate(lead.id);
                          setUpdateHistoryDialogOpen(true);
                        }}
                        data-testid={`button-update-history-${lead.id}`}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Grid View with Sticky Header */
        <div className="border rounded-lg h-full flex flex-col">
          {/* Horizontal and Vertical Scroll Container */}
          <div className="overflow-x-auto overflow-y-auto flex-1" ref={containerRef}>
            <div style={{ minWidth: `${calculateTableWidth()}px` }}>
              {/* Sticky Header */}
              <div 
                className="sticky top-0 z-20 bg-background border-b-2 grid"
                style={{ 
                  gridTemplateColumns: `50px ${visibleColumns.map(c => c.width).join(' ')} 150px`
                }}
              >
                {/* Checkbox Column Header */}
                <div className="border-b border-r px-3 py-3 flex items-center justify-center">
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
                </div>
                
                {/* Column Headers */}
                {visibleColumns.map((col) => (
                  <div
                    key={col.key}
                    className="border-b border-r px-3 py-2 font-medium text-xs uppercase tracking-wide"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
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
                      <div className="relative">
                        {col.type === "date" ? (
                          <DateRangeFilter
                            value={columnFilters[col.key] as DateFilterValue}
                            onChange={(value) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [col.key]: value,
                              }))
                            }
                          />
                        ) : col.type === "dropdown" ? (
                          <DropdownFilter
                            value={columnFilters[col.key] as string | null}
                            onChange={(value) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [col.key]: value,
                              }))
                            }
                            options={getDropdownOptionsForColumn(col.key)}
                          />
                        ) : (
                          <>
                            <Input
                              placeholder="Filter..."
                              value={(columnFilters[col.key] as string) || ""}
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Actions Column Header */}
                <div className="border-b px-3 py-2"></div>
              </div>

              {/* Table Body */}
              {filteredAndSortedLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leads found. {categoryFilter !== "all" ? `Try changing the filter.` : `Add your first lead to get started.`}
                </div>
              ) : (
                filteredAndSortedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`hover-elevate grid border-b ${
                      invalidLeadIds.has(lead.id) 
                        ? "bg-red-50 dark:bg-red-950/20" 
                        : ""
                    }`}
                    style={{ 
                      gridTemplateColumns: `50px ${visibleColumns.map(c => c.width).join(' ')} 150px`
                    }}
                    data-testid={`row-lead-${lead.id}`}
                    title={invalidLeadIds.has(lead.id) && leadValidationResults.get(lead.id) 
                      ? `Missing required fields: ${leadValidationResults.get(lead.id)?.missingFields.join(', ')}`
                      : undefined
                    }
                  >
                    {/* Checkbox Cell */}
                    <div className="border-r px-3 py-2 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                    
                    {/* Data Cells */}
                    {visibleColumns.map((col) => {
                      const isEditing =
                        editingCell?.leadId === lead.id && editingCell?.field === col.key;
                      const value = getLeadValue(lead, col.key);
                      const isDropdown = col.dropdown;

                      return (
                        <div
                          key={col.key}
                          onDoubleClick={() => handleCellClick(lead, col.key, value, col.type)}
                          className="border-r px-3 py-2 whitespace-nowrap flex items-center"
                          data-testid={`cell-${lead.id}-${col.key}`}
                        >
                        {isEditing ? (
                          isDropdown ? (
                            <Select
                              value={editValue}
                              onValueChange={(val) => {
                                setEditValue(val);
                                const updatedFields = {
                                  ...lead.custom_fields,
                                  [col.key]: val,
                                };
                                updateLeadMutation.mutate({
                                  leadId: lead.id,
                                  customFields: updatedFields,
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
                                {col.config.dropdown_options?.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : col.type === "date" ? (
                            <Popover 
                              open={datePickerOpen?.leadId === lead.id && datePickerOpen?.field === col.key} 
                              onOpenChange={(open) => {
                                if (!open) {
                                  // Close and exit edit mode
                                  setDatePickerOpen(null);
                                  setEditingCell(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-8 w-full justify-start text-left font-normal"
                                  data-testid={`date-picker-trigger-${col.key}`}
                                >
                                  {editingCell?.originalValue 
                                    ? format(new Date(editingCell.originalValue), "MMM d, yyyy") 
                                    : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-auto p-0" 
                                align="start"
                                onEscapeKeyDown={(e) => {
                                  e.preventDefault();
                                  setDatePickerOpen(null);
                                  setEditingCell(null);
                                }}
                                onInteractOutside={() => {
                                  setDatePickerOpen(null);
                                  setEditingCell(null);
                                }}
                              >
                                <Calendar
                                  mode="single"
                                  selected={editingCell?.originalValue ? new Date(editingCell.originalValue) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const formattedDate = format(date, "yyyy-MM-dd");
                                      const updatedFields = {
                                        ...lead.custom_fields,
                                        [col.key]: formattedDate,
                                      };
                                      updateLeadMutation.mutate({
                                        leadId: lead.id,
                                        customFields: updatedFields,
                                      });
                                      setDatePickerOpen(null);
                                      setEditingCell(null);
                                    }
                                  }}
                                  initialFocus
                                />
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      const updatedFields = { ...lead.custom_fields };
                                      delete updatedFields[col.key];
                                      updateLeadMutation.mutate({
                                        leadId: lead.id,
                                        customFields: updatedFields,
                                      });
                                      setDatePickerOpen(null);
                                      setEditingCell(null);
                                    }}
                                    data-testid={`button-clear-date-${col.key}`}
                                  >
                                    Clear date
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellSave(lead)}
                              onKeyDown={(e) => handleCellKeyDown(e, lead)}
                              className={
                                col.type === "mobile" || 
                                col.label.toLowerCase().includes("whatsapp") || 
                                col.label.toLowerCase().includes("phone") ||
                                col.label.toLowerCase().includes("mobile") ||
                                col.key.toLowerCase().includes("whatsapp") ||
                                col.key.toLowerCase().includes("phone") ||
                                col.key.toLowerCase().includes("mobile")
                                  ? "h-8 min-w-[160px]" 
                                  : "h-8 min-w-[150px]"
                              }
                              autoFocus
                              data-testid={`input-edit-${col.key}`}
                            />
                          )
                        ) : (
                          <span className="text-sm">
                            {col.type === "date" && value
                              ? format(new Date(value), "MMM d, yyyy")
                              : value || "-"}
                          </span>
                        )}
                        </div>
                      );
                    })}
                    
                    {/* Actions Cell */}
                    <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedLeadForUpdate(lead.id);
                          setUpdateDialogOpen(true);
                        }}
                        data-testid={`button-update-lead-${lead.id}`}
                        title="Record update"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedLeadForUpdate(lead.id);
                          setUpdateHistoryDialogOpen(true);
                        }}
                        data-testid={`button-update-history-${lead.id}`}
                        title="View update history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
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
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={(open) => {
        setTransferDialogOpen(open);
        if (!open) {
          setSelectedTargetSheetId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Leads</DialogTitle>
            <DialogDescription>
              Select a sheet to transfer {selectedRows.size} lead(s) to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={selectedTargetSheetId}
              onValueChange={setSelectedTargetSheetId}
              disabled={transferLeadsMutation.isPending}
            >
              <SelectTrigger data-testid="select-target-sheet">
                <SelectValue placeholder="Select target sheet..." />
              </SelectTrigger>
              <SelectContent>
                {allSheets
                  .filter((sheet: any) => sheet.id !== sheetId && !sheet.deleted_at)
                  .map((sheet: any) => (
                    <SelectItem key={sheet.id} value={sheet.id} data-testid={`select-sheet-${sheet.id}`}>
                      {sheet.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {transferLeadsMutation.isPending && (
              <p className="text-sm text-muted-foreground">Transferring leads...</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              disabled={transferLeadsMutation.isPending}
              data-testid="button-cancel-transfer"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (selectedTargetSheetId) {
                  transferLeadsMutation.mutate({
                    leadIds: Array.from(selectedRows),
                    targetSheetId: selectedTargetSheetId,
                  });
                }
              }}
              disabled={!selectedTargetSheetId || transferLeadsMutation.isPending}
              data-testid="button-confirm-transfer"
            >
              {transferLeadsMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
