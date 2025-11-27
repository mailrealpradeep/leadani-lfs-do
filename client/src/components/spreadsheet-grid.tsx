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
  Pencil,
  History,
  ArrowRightLeft,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Phone,
  UserCheck,
  AlertCircle,
  FilterX,
  Zap,
  MessageCircle,
  Clock,
  Loader2,
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
import { format, isWithinInterval, parseISO, isBefore, startOfDay } from "date-fns";
import type { Lead, DropdownOption, CustomColumn, ValidationRule } from "@shared/schema";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";
import { LeadEditDialog } from "./lead-edit-dialog";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { DateRangeFilter, type DateFilterValue } from "./filters/date-range-filter";
import { DropdownFilter } from "./filters/dropdown-filter";
import { validateLeadAgainstRules } from "@shared/validator";
import { Pagination } from "./pagination";

interface SpreadsheetGridProps {
  sheetId?: string;
  sheetIds?: string[];
  onOpenLeadDetail: (leadId: string) => void;
  onOpenDropdownManager: (columnKey: string) => void;
  onScroll?: (scrollTop: number, scrollingDown: boolean) => void;
}

interface PaginatedLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sheetNames: Record<string, string>;
}

export function SpreadsheetGrid({
  sheetId,
  sheetIds,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onScroll,
}: SpreadsheetGridProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { 
    searchQuery, 
    categoryFilter,
    setActiveQuickFilter,
    setQuickFilterHandlers,
    isMultiSheetMode,
    selectedSheetIds,
    pagination,
    setPagination,
  } = useDashboard();
  
  const isMultiMode = isMultiSheetMode && selectedSheetIds.length > 0;
  const activeSheetId = sheetId || "";
  const activeSheetIds = isMultiMode ? selectedSheetIds : [];
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetSheetId, setSelectedTargetSheetId] = useState<string>("");
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Single-sheet mode data fetching
  const { data: singleSheetLeads = [], isLoading: isLoadingSingleLeads } = useQuery<Lead[]>({
    queryKey: ["/api/sheets", activeSheetId, "leads"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  const { data: singleSheetColumns = [], isLoading: isLoadingSingleColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", activeSheetId, "columns"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Multi-sheet mode data fetching - server-side filtering, sorting, and pagination
  // Build filters object for backend - convert frontend filter format to backend format
  const buildBackendFilters = () => {
    const filters: Record<string, any> = {};
    for (const [key, value] of Object.entries(columnFilters)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Handle date range filters
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        const dateFilter = value as DateFilterValue | null;
        if (dateFilter && dateFilter.from && dateFilter.to) {
          filters[key] = { from: dateFilter.from, to: dateFilter.to, type: 'date_range' };
        }
      } 
      // Handle dropdown exact match filters
      else if (typeof value === 'string') {
        // Check if this column is a dropdown type
        const col = customColumns.find(c => c.column_key === key);
        if (col?.type === 'dropdown') {
          filters[key] = { value: value, exactMatch: true };
        } else {
          filters[key] = value; // String filter (ILIKE search)
        }
      }
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    return filters;
  };
  
  const { 
    data: multiSheetData, 
    isLoading: isLoadingMultiLeads,
    isFetching: isFetchingMultiLeads,
  } = useQuery<PaginatedLeadsResponse>({
    queryKey: ["/api/leads/query", activeSheetIds, pagination.page, pagination.limit, searchQuery, columnFilters, sortColumn, sortDirection],
    queryFn: async () => {
      const response = await apiRequest<PaginatedLeadsResponse>("POST", "/api/leads/query", {
        sheetIds: activeSheetIds,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortColumn || "created_at",
        sortOrder: sortColumn ? sortDirection : "desc",
        filters: buildBackendFilters(),
      });
      return response;
    },
    enabled: isMultiMode && activeSheetIds.length > 0,
  });

  // Company-level columns for multi-sheet mode
  const { data: companyColumns = [], isLoading: isLoadingCompanyColumns, error: companyColumnsError } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: isMultiMode,
    staleTime: 30000,
    retry: 2,
  });

  // Update pagination state when multi-sheet data changes
  useEffect(() => {
    if (multiSheetData && isMultiMode) {
      setPagination({
        page: multiSheetData.page,
        limit: multiSheetData.limit,
        total: multiSheetData.total,
        totalPages: multiSheetData.totalPages,
      });
    }
  }, [multiSheetData, isMultiMode, setPagination]);

  // Reset to page 1 when sheet selection, search, filters, or sort changes in multi-mode
  // Use JSON.stringify for stable dependency reference of columnFilters
  const columnFiltersKey = JSON.stringify(columnFilters);
  useEffect(() => {
    if (isMultiMode) {
      setPagination({
        page: 1,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      });
    }
  }, [activeSheetIds.length, searchQuery, columnFiltersKey, sortColumn, sortDirection, isMultiMode]);

  // Unified data access
  const leads = isMultiMode ? (multiSheetData?.leads || []) : singleSheetLeads;
  const customColumns = isMultiMode ? companyColumns : singleSheetColumns;
  const sheetNamesMap = multiSheetData?.sheetNames || {};

  // Debug logging for column rendering issue
  if (isMultiMode) {
    console.log('[SpreadsheetGrid Debug]', {
      isMultiMode,
      companyColumnsLength: companyColumns.length,
      customColumnsLength: customColumns.length,
      companyColumnsError: companyColumnsError?.message,
      isLoadingCompanyColumns,
      sampleColumn: customColumns[0],
    });
  }

  const { data: allSheets = [] } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: validationRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", activeSheetId, "validation-rules"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Load company settings (for mobile card columns)
  const { data: companySettingsData } = useQuery<{ settings: { mobile_card_columns?: string[] } }>({
    queryKey: ["/api/company/settings"],
    enabled: isMobile,
  });

  // Load column width preferences (only in single-sheet mode)
  const { data: columnPreferences = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/sheets", activeSheetId, "column-preferences"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Save column width preferences mutation (only in single-sheet mode)
  const saveColumnPreferencesMutation = useMutation({
    mutationFn: async (preferences: Record<string, number>) => {
      return await apiRequest("POST", `/api/sheets/${activeSheetId}/column-preferences`, { preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "column-preferences"] });
    },
    onError: (error: any) => {
      console.error("Failed to save column preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save column width preferences",
        variant: "destructive",
      });
    },
  });

  const isLoading = isMultiMode 
    ? (isLoadingMultiLeads || isLoadingCompanyColumns)
    : (isLoadingSingleLeads || isLoadingSingleColumns);

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, customFields }: { leadId: string; customFields: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { custom_fields: customFields });
    },
    onSuccess: () => {
      if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads"] });
      }
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      await Promise.all(leadIds.map((id) => apiRequest("DELETE", `/api/leads/${id}`, {})));
    },
    onSuccess: () => {
      if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads"] });
      }
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
      if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads"] });
      }
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

  // Check for NFDT (Next Follow-up Date Time) columns with past dates
  // This creates a Map of lead ID -> column keys that have past NFDT dates
  const leadsWithPastNFDT = useMemo(() => {
    const results = new Map<string, string[]>();
    const today = startOfDay(new Date());
    
    // Find NFDT columns (match common naming patterns)
    const nfdtColumns = customColumns.filter(col => 
      col.type === "date" && (
        col.column_key.toLowerCase() === "nfdt" ||
        col.column_key.toLowerCase().includes("nfdt") ||
        col.column_key.toLowerCase().includes("next_follow") ||
        col.column_key.toLowerCase().includes("followup_date") ||
        col.name.toLowerCase().includes("nfdt") ||
        col.name.toLowerCase().includes("next follow")
      )
    );
    
    if (nfdtColumns.length === 0) {
      return results;
    }
    
    for (const lead of leads) {
      const pastColumns: string[] = [];
      
      for (const col of nfdtColumns) {
        const value = lead.custom_fields?.[col.column_key];
        if (value) {
          try {
            const dateValue = parseISO(value);
            if (isBefore(startOfDay(dateValue), today)) {
              pastColumns.push(col.column_key);
            }
          } catch {
            // Invalid date format, skip
          }
        }
      }
      
      if (pastColumns.length > 0) {
        results.set(lead.id, pastColumns);
      }
    }
    
    return results;
  }, [leads, customColumns]);

  // Load hidden columns for current sheet and reset column filters on sheet change  
  useEffect(() => {
    if (!isMultiMode && activeSheetId) {
      const stored = localStorage.getItem(`hiddenColumns_${activeSheetId}`);
      setHiddenColumns(stored ? new Set(JSON.parse(stored)) : new Set());
    } else {
      setHiddenColumns(new Set()); // No hidden columns in multi-mode
    }
    
    // Reset filters when switching sheets
    setColumnFilters({});
    setSortColumn(null);
    setSortDirection("asc");
  }, [activeSheetId, isMultiMode]);

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
    // For percentage fields, show the raw number without % symbol
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
      
      // Get the column type
      const column = customColumns.find(col => col.column_key === editingCell.field);
      let valueToSave = editValue;
      
      // For percentage fields, strip % symbol and validate
      if (column?.type === "percentage" && editValue) {
        const cleanedValue = String(editValue).replace(/%/g, '').trim();
        valueToSave = cleanedValue;
      }
      
      if (valueToSave !== originalValue) {
        const updatedFields = {
          ...lead.custom_fields,
          [editingCell.field]: valueToSave,
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

  // Get value from lead's custom_fields (or sheet name for multi-mode)
  const getLeadValue = (lead: Lead, columnKey: string) => {
    if (columnKey === "__sheet_name__") {
      return sheetNamesMap[lead.sheet_id] || "Unknown";
    }
    return lead.custom_fields[columnKey];
  };

  // Sync column preferences into local state when loaded or sheet changes
  useEffect(() => {
    // Always sync preferences from backend (could be empty object for sheets without saved prefs)
    setColumnWidths(columnPreferences);
  }, [columnPreferences, sheetId]);

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    hasMovedRef.current = false;
    
    // Get current width - use saved width or parse default width for the column type
    const column = columns.find(c => c.key === columnKey);
    const defaultWidth = column ? parseInt(column.width) : 120;
    const currentWidth = columnWidths[columnKey] || defaultWidth;
    resizeStartWidth.current = currentWidth;
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const deltaX = e.clientX - resizeStartX.current;
    if (Math.abs(deltaX) > 2) {
      hasMovedRef.current = true;
    }
    
    const newWidth = Math.max(60, resizeStartWidth.current + deltaX); // Min width 60px
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [resizingColumn]);

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn && hasMovedRef.current) {
      const newWidth = columnWidths[resizingColumn];
      // Only save if we have a valid width (use explicit numeric check, not truthiness)
      if (Number.isFinite(newWidth) && newWidth >= 60) {
        // Filter to only include defined widths in the payload
        const updatedPreferences: Record<string, number> = {};
        Object.entries(columnWidths).forEach(([key, value]) => {
          if (Number.isFinite(value) && value >= 60) {
            updatedPreferences[key] = value;
          }
        });
        saveColumnPreferencesMutation.mutate(updatedPreferences);
      }
    }
    setResizingColumn(null);
    hasMovedRef.current = false;
  }, [resizingColumn, columnWidths, saveColumnPreferencesMutation]);

  // Add/remove event listeners for column resizing
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

  // Helper to get column width (from saved preferences or defaults)
  const getColumnWidth = (columnKey: string, colType: string): string => {
    const savedWidth = columnWidths[columnKey];
    if (savedWidth) return `${savedWidth}px`;
    
    // Default widths
    if (columnKey === "name") return "260px";
    if (colType === "text") return "120px";
    if (colType === "number") return "90px";
    if (colType === "date") return "110px";
    if (colType === "boolean") return "90px";
    if (colType === "mobile") return "130px";
    if (colType === "percentage") return "100px";
    return "120px";
  };

  // Convert CustomColumn to display columns (must be before filteredAndSortedLeads)
  const baseColumns = customColumns
    .sort((a, b) => a.order_index - b.order_index)
    .map((col) => ({
      key: col.column_key,
      label: col.name,
      width: getColumnWidth(col.column_key, col.type),
      sortable: true,
      dropdown: col.type === "dropdown",
      type: col.type,
      config: col.config,
    }));

  // Add Sheet column as first column in multi-mode
  const columns = isMultiMode
    ? [
        {
          key: "__sheet_name__",
          label: "Sheet",
          width: "140px",
          sortable: true,
          dropdown: false,
          type: "text" as const,
          config: {},
        },
        ...baseColumns,
      ]
    : baseColumns;

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

  // In multi-mode, server handles filtering/sorting; in single-mode, do it client-side
  const filteredAndSortedLeads = isMultiMode
    ? leads // Server already filtered and sorted
    : leads
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
          const aVal = getLeadValue(a, sortColumn);
          const bVal = getLeadValue(b, sortColumn);
          
          // Get the column to check its type
          const column = customColumns.find(col => col.column_key === sortColumn);
          const columnType = column?.type;
          
          // Handle numeric types (number and percentage)
          if (columnType === "number" || columnType === "percentage") {
            const aNum = aVal != null && aVal !== "" ? parseFloat(String(aVal)) : -Infinity;
            const bNum = bVal != null && bVal !== "" ? parseFloat(String(bVal)) : -Infinity;
            const comparison = aNum > bNum ? 1 : aNum < bNum ? -1 : 0;
            return sortDirection === "asc" ? comparison : -comparison;
          }
          
          // Handle date types
          if (columnType === "date") {
            const aDate = aVal ? new Date(aVal).getTime() : -Infinity;
            const bDate = bVal ? new Date(bVal).getTime() : -Infinity;
            const comparison = aDate > bDate ? 1 : aDate < bDate ? -1 : 0;
            return sortDirection === "asc" ? comparison : -comparison;
          }
          
          // Handle other types as strings
          const aStr = String(aVal || "");
          const bStr = String(bVal || "");
          const comparison = aStr > bStr ? 1 : aStr < bStr ? -1 : 0;
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

  // Pagination handlers for multi-sheet mode
  const handlePageChange = useCallback((newPage: number) => {
    setPagination({
      ...pagination,
      page: newPage,
    });
  }, [pagination, setPagination]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination({
      ...pagination,
      page: 1,
      limit: newLimit,
    });
  }, [pagination, setPagination]);

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

  // Quick filter handlers - comprehensive implementation supporting all operators and logical operations
  const applyQuickFilter = useCallback((filterId: string, filterConfig: any) => {
    if (!filterConfig || !filterConfig.conditions || filterConfig.conditions.length === 0) {
      // Empty filter - just clear all filters
      setColumnFilters({});
      setActiveQuickFilter(filterId);
      return;
    }

    // Date utilities with relative date support
    const getRelativeDate = (relativeDate: string): { from: Date; to: Date } | null => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      switch (relativeDate) {
        case "today":
          return { from: today, to: endOfDay };
        
        case "tomorrow": {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const endOfTomorrow = new Date(tomorrow);
          endOfTomorrow.setHours(23, 59, 59, 999);
          return { from: tomorrow, to: endOfTomorrow };
        }
        
        case "yesterday": {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const endOfYesterday = new Date(yesterday);
          endOfYesterday.setHours(23, 59, 59, 999);
          return { from: yesterday, to: endOfYesterday };
        }
        
        case "this_week": {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return { from: startOfWeek, to: endOfWeek };
        }
        
        case "next_week": {
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
          nextWeekEnd.setHours(23, 59, 59, 999);
          return { from: nextWeekStart, to: nextWeekEnd };
        }
        
        case "this_month": {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          return { from: startOfMonth, to: endOfMonth };
        }
        
        case "next_month": {
          const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          endOfNextMonth.setHours(23, 59, 59, 999);
          return { from: startOfNextMonth, to: endOfNextMonth };
        }
        
        default:
          return null;
      }
    };

    // Process each condition and validate columns
    const newFilters: any = {};
    const missingColumns: string[] = [];
    const unsupportedOperators: string[] = [];

    for (const condition of filterConfig.conditions) {
      const { column_key, operator, value, relative_date } = condition;

      // Find the column in customColumns or fixed columns
      const customColumn = customColumns.find((col) => col.column_key === column_key);
      const isFixedColumn = ["name", "email", "phone", "source", "status"].includes(column_key);

      if (!customColumn && !isFixedColumn) {
        missingColumns.push(column_key);
        continue;
      }

      // Note: The current column filter system has limitations:
      // - Doesn't support OR logic (can only AND filters together)
      // - Doesn't support negation operators (not_equals, not_in, not_contains)
      // - Limited support for comparison operators
      // For now, we'll apply what we can and warn about unsupported operators

      // Translate operator and value to column filter format
      switch (operator) {
        case "equals":
          newFilters[column_key] = value;
          break;

        case "in":
          // Multi-select filter
          if (Array.isArray(value)) {
            newFilters[column_key] = value;
          } else {
            newFilters[column_key] = [value];
          }
          break;

        case "contains":
          // Text search - the column filter system supports this natively
          newFilters[column_key] = value;
          break;

        case "is_empty":
          // Filter for empty/null values
          newFilters[column_key] = "";
          break;

        case "date_equals":
          if (relative_date) {
            const dateRange = getRelativeDate(relative_date);
            if (dateRange) {
              newFilters[column_key] = {
                type: "custom",
                from: dateRange.from,
                to: dateRange.to,
              };
            }
          } else if (value) {
            // Specific date
            const date = new Date(value);
            const endOfDate = new Date(date);
            endOfDate.setHours(23, 59, 59, 999);
            newFilters[column_key] = {
              type: "custom",
              from: date,
              to: endOfDate,
            };
          }
          break;

        case "date_before":
          if (value) {
            const beforeDate = new Date(value);
            newFilters[column_key] = {
              type: "custom",
              from: new Date(0), // Beginning of time
              to: beforeDate,
            };
          }
          break;

        case "date_after":
          if (value) {
            const afterDate = new Date(value);
            newFilters[column_key] = {
              type: "custom",
              from: afterDate,
              to: new Date(2100, 0, 1), // Far future
            };
          }
          break;

        case "date_between":
          // Expects value as {from: date, to: date}
          if (value && typeof value === "object" && value.from && value.to) {
            newFilters[column_key] = {
              type: "custom",
              from: new Date(value.from),
              to: new Date(value.to),
            };
          }
          break;

        // Operators not supported by current column filter system
        case "not_equals":
        case "not_contains":
        case "not_in":
        case "is_not_empty":
        case "greater_than":
        case "less_than":
        case "greater_equal":
        case "less_equal":
          unsupportedOperators.push(`${operator} on ${column_key}`);
          break;

        default:
          unsupportedOperators.push(`unknown operator "${operator}" on ${column_key}`);
          break;
      }
    }

    // Check if any required columns were missing
    if (missingColumns.length > 0) {
      setActiveQuickFilter(null);
      toast({
        title: "Columns not found",
        description: `The following columns are missing: ${missingColumns.join(", ")}. Please add them to use this filter.`,
        variant: "destructive",
      });
      return;
    }

    // Apply the filters (always using AND logic due to column filter limitations)
    setColumnFilters(newFilters);
    setActiveQuickFilter(filterId);

    // Show warnings AFTER applying filters (non-blocking)
    if (unsupportedOperators.length > 0) {
      toast({
        title: "Some filter conditions skipped",
        description: `The following operators are not supported: ${unsupportedOperators.slice(0, 3).join(", ")}${unsupportedOperators.length > 3 ? ` and ${unsupportedOperators.length - 3} more` : ""}. Supported conditions have been applied.`,
        variant: "default",
      });
    }

    // Note: logical_operator (and/or) limitation
    // The current column filter system only supports AND logic between conditions
    // When OR is specified, we still apply all conditions with AND logic and warn the user
    if (filterConfig.logical_operator === "or" && filterConfig.conditions.length > 1) {
      toast({
        title: "OR logic limitation",
        description: "Multiple conditions are combined with AND logic. Full OR support requires filter system enhancements.",
        variant: "default",
      });
    }
  }, [customColumns, setActiveQuickFilter, setColumnFilters, toast]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setActiveQuickFilter(null);
  }, [setActiveQuickFilter]);

  // Register quick filter handlers with dashboard context
  useEffect(() => {
    setQuickFilterHandlers({
      onApplyFilter: applyQuickFilter,
      onClearAllFilters: clearAllFilters,
    });
    
    // Cleanup on unmount
    return () => {
      setQuickFilterHandlers({});
      setActiveQuickFilter(null);
    };
  }, [applyQuickFilter, clearAllFilters, setQuickFilterHandlers, setActiveQuickFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show error state if company columns failed to load in multi-sheet mode
  if (isMultiMode && companyColumnsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <div className="text-muted-foreground">
          Failed to load column configuration for combined view.
        </div>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/company/columns"] })}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Ensure columns are loaded before rendering the grid in multi-sheet mode
  if (isMultiMode && companyColumns.length === 0 && !isLoadingCompanyColumns) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <div className="text-muted-foreground">
          No columns configured for combined view. Please set up columns in Admin Console.
        </div>
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

      {/* Lead Edit Dialog for Mobile */}
      {selectedLeadForEdit && (
        <LeadEditDialog
          leadId={selectedLeadForEdit}
          sheetId={leads.find(l => l.id === selectedLeadForEdit)?.sheet_id || activeSheetId}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedLeadForEdit(null);
          }}
        />
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
        (() => {
          // Get mobile card columns from company settings
          const mobileCardColumnKeys = companySettingsData?.settings?.mobile_card_columns;
          
          // If company has configured mobile columns, use those in order; otherwise fallback to first 6 visible columns
          const mobileCardColumns = mobileCardColumnKeys && mobileCardColumnKeys.length > 0
            ? mobileCardColumnKeys
                .map(key => visibleColumns.find(col => col.key === key))
                .filter(Boolean) as typeof visibleColumns
            : visibleColumns.slice(0, 6);
          
          // Split into title columns (first 2) and detail columns (next 4)
          const titleColumns = mobileCardColumns.slice(0, 2);
          const detailColumns = mobileCardColumns.slice(2, 6);
          
          // Count active filters for badge
          const activeFilterCount = Object.values(columnFilters).filter(v => v !== null && v !== undefined).length;
          const hasActiveFiltersOrSort = sortColumn || activeFilterCount > 0;

          // Helper to get filter display text
          const getFilterLabel = (key: string, value: any): string => {
            const col = columns.find(c => c.key === key);
            if (!value) return "";
            if (typeof value === "string") return `${col?.label || key}: ${value}`;
            if (typeof value === "object" && "type" in value) {
              const typeLabels: Record<string, string> = {
                today: "Today",
                thisWeek: "This Week", 
                thisMonth: "This Month",
                last7Days: "Last 7 Days",
                custom: "Custom",
              };
              return `${col?.label || key}: ${typeLabels[value.type] || value.type}`;
            }
            return "";
          };

          return (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Mobile Filter Header */}
              <div className="flex-shrink-0 pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground">
                      {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? 's' : ''}
                    </span>
                    {hasActiveFiltersOrSort && (
                      <Badge variant="secondary" className="text-xs">
                        {sortColumn ? 1 : 0} sort, {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant={hasActiveFiltersOrSort ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px] gap-2"
                    onClick={() => setMobileFilterSheetOpen(true)}
                    data-testid="button-mobile-filter"
                  >
                    <Filter className="h-4 w-4" />
                    Sort & Filter
                    {hasActiveFiltersOrSort && (
                      <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-xs">
                        {(sortColumn ? 1 : 0) + activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Active Filters Display */}
                {hasActiveFiltersOrSort && (
                  <div className="flex flex-wrap gap-1.5">
                    {sortColumn && (
                      <Badge 
                        variant="outline" 
                        className="text-xs flex items-center gap-1 pr-1"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        {columns.find(c => c.key === sortColumn)?.label || sortColumn}
                        {sortDirection === "asc" ? " ↑" : " ↓"}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-0.5 hover:bg-transparent"
                          onClick={() => {
                            setSortColumn(null);
                            setSortDirection("asc");
                          }}
                          data-testid="button-clear-sort"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {Object.entries(columnFilters).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <Badge 
                          key={key}
                          variant="outline" 
                          className="text-xs flex items-center gap-1 pr-1"
                        >
                          {getFilterLabel(key, value)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-0.5 hover:bg-transparent"
                            onClick={() => {
                              setColumnFilters(prev => {
                                const updated = { ...prev };
                                delete updated[key];
                                return updated;
                              });
                            }}
                            data-testid={`button-clear-filter-${key}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                    {hasActiveFiltersOrSort && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setSortColumn(null);
                          setSortDirection("asc");
                          setColumnFilters({});
                        }}
                        data-testid="button-clear-all-mobile"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {filteredAndSortedLeads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p>No leads found.</p>
                      {hasActiveFiltersOrSort && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-primary"
                          onClick={() => {
                            setSortColumn(null);
                            setSortDirection("asc");
                            setColumnFilters({});
                          }}
                          data-testid="button-clear-filters-empty"
                        >
                          Clear filters
                        </Button>
                      )}
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
                            {titleColumns.map((col) => {
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
                          {detailColumns.map((col) => {
                            const value = getLeadValue(lead, col.key);
                            const isPastNFDT = leadsWithPastNFDT.get(lead.id)?.includes(col.key);
                            return (
                              <div 
                                key={col.key}
                                className={isPastNFDT ? "px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30" : ""}
                                title={isPastNFDT ? "Past follow-up date" : undefined}
                              >
                                <span className="text-muted-foreground">{col.label}:</span>
                                <p className={`truncate ${isPastNFDT ? "text-amber-700 dark:text-amber-400 font-medium" : ""}`}>
                                  {col.type === "date" && value 
                                    ? format(new Date(value), "dd/MM/yy")
                                    : value || "—"}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 pt-3 border-t space-y-2" onClick={(e) => e.stopPropagation()}>
                          {/* Primary Edit Button */}
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full min-h-[44px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadForEdit(lead.id);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-lead-${lead.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Lead
                          </Button>
                          {/* Secondary Actions Row */}
                          <div className="flex gap-2">
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
                            <Button
                              variant="outline"
                              size="icon"
                              className="min-h-[44px] min-w-[44px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                const mobileNo = lead.custom_fields?.mobile_no || lead.custom_fields?.mobile || lead.custom_fields?.phone;
                                if (mobileNo) {
                                  window.location.href = `tel:${mobileNo}`;
                                }
                              }}
                              data-testid={`button-call-lead-${lead.id}`}
                              title="Call"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="min-h-[44px] min-w-[44px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                const whatsappNo = lead.custom_fields?.whatsapp_no || lead.custom_fields?.whatsapp || lead.custom_fields?.mobile_no || lead.custom_fields?.mobile;
                                if (whatsappNo) {
                                  const cleanNumber = String(whatsappNo).replace(/[\s-]/g, '');
                                  const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : (cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`);
                                  window.open(`https://wa.me/${formattedNumber}`, '_blank');
                                }
                              }}
                              data-testid={`button-whatsapp-lead-${lead.id}`}
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        /* Desktop Grid View with Sticky Header */
        <div className="flex flex-col h-full">
          {/* Multi-sheet mode header */}
          {isMultiMode && (
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                {pagination.total.toLocaleString()} leads from {activeSheetIds.length} sheets
              </div>
              {isFetchingMultiLeads && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          )}
          
          <div className="border rounded-lg flex-1 flex flex-col overflow-hidden">
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
                    className="border-b border-r px-3 py-2 font-medium text-xs uppercase tracking-wide relative"
                  >
                    {/* Resize Handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-30 group"
                      onMouseDown={(e) => handleResizeStart(e, col.key)}
                      data-testid={`resize-handle-${col.key}`}
                    >
                      <div className="w-full h-full group-hover:bg-primary transition-colors" />
                    </div>
                    
                    <div className="flex flex-col gap-1" data-testid={`column-header-${col.key}`}>
                      <div className="flex items-center gap-1">
                        <span data-testid={`column-label-${col.key}`}>{col.label}</span>
                        {/* Sort button - works in both single and multi-sheet mode */}
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
                      {/* Column filters - works in both single and multi-sheet mode */}
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
                      const isPastNFDT = leadsWithPastNFDT.get(lead.id)?.includes(col.key);

                      return (
                        <div
                          key={col.key}
                          onDoubleClick={() => handleCellClick(lead, col.key, value, col.type)}
                          className={`border-r px-3 py-2 wrap-text-cell ${
                            isPastNFDT ? "bg-amber-100 dark:bg-amber-900/30" : ""
                          }`}
                          data-testid={`cell-${lead.id}-${col.key}`}
                          title={isPastNFDT ? "Past follow-up date" : undefined}
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
                                    ? format(new Date(editingCell.originalValue), "dd/MM/yy") 
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
                          <span className={`text-sm flex items-center gap-1 ${col.width === "260px" || col.key === "name" ? "break-words w-full" : ""} ${isPastNFDT ? "text-amber-700 dark:text-amber-400 font-medium" : ""}`}>
                            {isPastNFDT && <Clock className="h-3 w-3 flex-shrink-0" />}
                            {col.type === "date" && value
                              ? format(new Date(value), "dd/MM/yy")
                              : col.type === "percentage" && value != null && value !== ""
                              ? `${value}%`
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
          
          {/* Pagination for multi-sheet mode */}
          {isMultiMode && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  data-testid="select-page-size"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    data-testid="button-first-page"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                    data-testid="button-last-page"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
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

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={mobileFilterSheetOpen}
        onOpenChange={setMobileFilterSheetOpen}
        columns={columns.map(col => ({
          key: col.key,
          name: col.label,
          type: customColumns.find(c => c.column_key === col.key)?.type || "text",
          config: customColumns.find(c => c.column_key === col.key)?.config as { dropdown_options?: string[] } | undefined,
        }))}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        columnFilters={columnFilters}
        onSortChange={(column, direction) => {
          setSortColumn(column);
          setSortDirection(direction);
        }}
        onFilterChange={setColumnFilters}
      />
    </>
  );
}
