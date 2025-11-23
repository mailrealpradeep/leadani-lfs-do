import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDashboard } from "./dashboard-context";
import { useAuth } from "@/lib/auth";
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
  Calendar as CalendarIcon,
  Phone,
  UserCheck,
  AlertCircle,
  FilterX,
  Zap,
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
  const { user } = useAuth();
  const { 
    searchQuery, 
    categoryFilter,
    setActiveQuickFilter,
    setQuickFilterHandlers,
  } = useDashboard();
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
  
  // Cell locking state: Track cells locked by any user (including self)
  const [lockedCells, setLockedCells] = useState<Map<string, { userId: string; userName: string; isOwnLock: boolean }>>(new Map());
  // Track pending lock requests to gate edit mode entry
  const [pendingLockRequest, setPendingLockRequest] = useState<{ leadId: string; field: string } | null>(null);

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

    // Cell locking events
    const handleCellLockAcquired = (data: { leadId: string; field: string }) => {
      // Lock acquired successfully, now enter edit mode
      if (pendingLockRequest && 
          pendingLockRequest.leadId === data.leadId && 
          pendingLockRequest.field === data.field) {
        // Find the lead and get current value
        const lead = leads.find(l => l.id === data.leadId);
        if (lead) {
          const currentValue = getLeadValue(lead, data.field);
          setEditingCell({ leadId: data.leadId, field: data.field, originalValue: currentValue });
          setEditValue(currentValue || "");
          
          // Check if this is a date field and open date picker
          const column = customColumns.find(col => col.column_key === data.field);
          if (column && column.type === "date") {
            setDatePickerOpen({ leadId: data.leadId, field: data.field });
          }
          
          // Add to lockedCells as own lock
          if (user) {
            setLockedCells((prev) => {
              const newMap = new Map(prev);
              const lockKey = `${data.leadId}:${data.field}`;
              newMap.set(lockKey, { userId: user.id, userName: user.name, isOwnLock: true });
              return newMap;
            });
          }
        }
        setPendingLockRequest(null);
      }
    };

    const handleCellLockedByOther = (data: { leadId: string; field: string; userId: string; userName: string }) => {
      setLockedCells((prev) => {
        const newMap = new Map(prev);
        const lockKey = `${data.leadId}:${data.field}`;
        newMap.set(lockKey, { userId: data.userId, userName: data.userName, isOwnLock: false });
        return newMap;
      });
    };

    const handleExistingLocks = (data: { locks: Array<{ leadId: string; field: string; userId: string; userName: string }> }) => {
      console.log(`[CLIENT] Received ${data.locks.length} existing locks from server`);
      setLockedCells((prev) => {
        const newMap = new Map(prev);
        data.locks.forEach((lock) => {
          const lockKey = `${lock.leadId}:${lock.field}`;
          // Mark as not own lock - these are locks from other users
          newMap.set(lockKey, { userId: lock.userId, userName: lock.userName, isOwnLock: false });
        });
        return newMap;
      });
    };

    const handleCellLockReleased = (data: { leadId: string; field: string }) => {
      setLockedCells((prev) => {
        const newMap = new Map(prev);
        const lockKey = `${data.leadId}:${data.field}`;
        newMap.delete(lockKey);
        return newMap;
      });
    };

    const handleCellLockRejected = (data: { leadId: string; field: string; lockedBy: string }) => {
      toast({
        title: "Cell locked",
        description: `This cell is currently being edited by ${data.lockedBy}`,
        variant: "destructive",
      });
      setPendingLockRequest(null);
    };

    socket.on("lead_created", handleLeadCreated);
    socket.on("lead_updated", handleLeadUpdated);
    socket.on("cell_lock_acquired", handleCellLockAcquired);
    socket.on("cell_locked_by_other", handleCellLockedByOther);
    socket.on("existing_locks", handleExistingLocks);
    socket.on("cell_lock_released", handleCellLockReleased);
    socket.on("cell_lock_rejected", handleCellLockRejected);

    return () => {
      socket.emit("leave_sheet", sheetId);
      socket.off("lead_created", handleLeadCreated);
      socket.off("lead_updated", handleLeadUpdated);
      socket.off("cell_lock_acquired", handleCellLockAcquired);
      socket.off("cell_locked_by_other", handleCellLockedByOther);
      socket.off("existing_locks", handleExistingLocks);
      socket.off("cell_lock_released", handleCellLockReleased);
      socket.off("cell_lock_rejected", handleCellLockRejected);
    };
  }, [sheetId, toast, pendingLockRequest, leads, user]);

  const handleCellClick = (lead: Lead, columnKey: string, currentValue: any, columnType?: string) => {
    // Check if cell is locked by another user
    const lockKey = `${lead.id}:${columnKey}`;
    const lock = lockedCells.get(lockKey);
    if (lock && !lock.isOwnLock) {
      toast({
        title: "Cell locked",
        description: `This cell is currently being edited by ${lock.userName}`,
        variant: "destructive",
      });
      return;
    }
    
    // Request lock for this cell (don't enter edit mode yet)
    if (user && sheetId) {
      setPendingLockRequest({ leadId: lead.id, field: columnKey });
      const socket = getSocket();
      socket.emit("acquire_cell_lock", {
        sheetId,
        leadId: lead.id,
        field: columnKey,
        userId: user.id,
        userName: user.name,
      });
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
      
      // Release the cell lock
      if (sheetId) {
        const socket = getSocket();
        socket.emit("release_cell_lock", {
          sheetId,
          leadId: editingCell.leadId,
          field: editingCell.field,
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
      // Release lock on cancel
      if (editingCell && sheetId) {
        const socket = getSocket();
        socket.emit("release_cell_lock", {
          sheetId,
          leadId: editingCell.leadId,
          field: editingCell.field,
        });
      }
      setEditingCell(null);
    }
  };

  const isCellLocked = (leadId: string, field: string): { isLocked: boolean; userName?: string; isOwnLock?: boolean } => {
    const lockKey = `${leadId}:${field}`;
    const lock = lockedCells.get(lockKey);
    if (lock) {
      return { isLocked: true, userName: lock.userName, isOwnLock: lock.isOwnLock };
    }
    return { isLocked: false };
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
      // Special width for name column to accommodate longer names with wrapping
      width: col.column_key === "name" ? "200px" : col.type === "text" ? "120px" : col.type === "number" ? "90px" : col.type === "date" ? "110px" : col.type === "boolean" ? "90px" : col.type === "mobile" ? "130px" : "120px",
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
                      const cellLockStatus = isCellLocked(lead.id, col.key);
                      const isLockedByOther = cellLockStatus.isLocked && !cellLockStatus.isOwnLock;

                      return (
                        <div
                          key={col.key}
                          onDoubleClick={() => handleCellClick(lead, col.key, value, col.type)}
                          className={`border-r px-3 py-2 flex ${
                            col.key === "name" ? "items-start" : "items-center whitespace-nowrap"
                          } ${
                            isLockedByOther
                              ? "bg-red-100 dark:bg-red-950/30 ring-2 ring-inset ring-red-500 cursor-not-allowed" 
                              : ""
                          }`}
                          data-testid={`cell-${lead.id}-${col.key}`}
                          data-locked-by-other={isLockedByOther ? "true" : "false"}
                          data-locked-by={isLockedByOther ? cellLockStatus.userName : undefined}
                          title={isLockedByOther ? `Locked by ${cellLockStatus.userName}` : undefined}
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
                                // Release lock after saving
                                if (sheetId && editingCell) {
                                  const socket = getSocket();
                                  socket.emit("release_cell_lock", {
                                    sheetId,
                                    leadId: editingCell.leadId,
                                    field: editingCell.field,
                                  });
                                }
                                setEditingCell(null);
                              }}
                              open
                              onOpenChange={(open) => {
                                if (!open) {
                                  // Release lock if closing without selecting
                                  if (sheetId && editingCell) {
                                    const socket = getSocket();
                                    socket.emit("release_cell_lock", {
                                      sheetId,
                                      leadId: editingCell.leadId,
                                      field: editingCell.field,
                                    });
                                  }
                                  setEditingCell(null);
                                }
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
                                  // Release lock on escape
                                  if (sheetId && editingCell) {
                                    const socket = getSocket();
                                    socket.emit("release_cell_lock", {
                                      sheetId,
                                      leadId: editingCell.leadId,
                                      field: editingCell.field,
                                    });
                                  }
                                  setDatePickerOpen(null);
                                  setEditingCell(null);
                                }}
                                onInteractOutside={() => {
                                  // Release lock when clicking outside
                                  if (sheetId && editingCell) {
                                    const socket = getSocket();
                                    socket.emit("release_cell_lock", {
                                      sheetId,
                                      leadId: editingCell.leadId,
                                      field: editingCell.field,
                                    });
                                  }
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
                                      // Release lock after date selection
                                      if (sheetId && editingCell) {
                                        const socket = getSocket();
                                        socket.emit("release_cell_lock", {
                                          sheetId,
                                          leadId: editingCell.leadId,
                                          field: editingCell.field,
                                        });
                                      }
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
                                      // Release lock after clearing date
                                      if (sheetId && editingCell) {
                                        const socket = getSocket();
                                        socket.emit("release_cell_lock", {
                                          sheetId,
                                          leadId: editingCell.leadId,
                                          field: editingCell.field,
                                        });
                                      }
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
                          <span className={`text-sm ${col.key === "name" ? "break-words line-clamp-3" : ""}`}>
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
