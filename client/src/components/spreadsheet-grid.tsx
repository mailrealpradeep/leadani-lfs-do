import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useDashboard } from "./dashboard-context";
import { useAuth } from "@/lib/auth";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
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
  Star,
  HelpCircle,
  XCircle,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { useAutoFillRules } from "@/hooks/use-auto-fill-rules";
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { useTheme } from "@/components/theme-provider";
import { format, isWithinInterval, parseISO, isBefore, startOfDay, isValid } from "date-fns";
import type { Lead, DropdownOption, CustomColumn, ValidationRule, HighlightingRule, UserRowFilterRecord, RowFilterCondition, TransitionExplanationRuleRecord } from "@shared/schema";
import { evaluateHighlightingRules } from "@/lib/highlighting-evaluator";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";
import { AIRatingCell } from "./ai-rating-badge";
import { NextFollowupDateDialog } from "./next-followup-date-dialog";
import { UpdateHistoryHoverCard } from "./update-history-hover-card";
import { LeadEditDialog } from "./lead-edit-dialog";
import { TransitionExplanationDialog } from "./transition-explanation-dialog";
import { ValidationPromptDialog, useValidationRuleChecker } from "./validation-prompt-dialog";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { DateRangeFilter, type DateFilterValue } from "./filters/date-range-filter";
import { DropdownFilter } from "./filters/dropdown-filter";
import { validateLeadAgainstRules, evaluateCondition } from "@shared/validator";
import { Pagination } from "./pagination";

// Helper to safely format dates, handling both ISO strings and legacy dd/MM/yy formats
const safeFormatDate = (value: string | Date | null | undefined, formatPattern: string, formatInTimezoneFn: (date: string | Date, pattern: string) => string): string => {
  if (!value) return "-";
  try {
    const strValue = String(value);
    // If it's already in dd/MM/yy or similar local format, return as-is
    if (strValue.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
      return strValue;
    }
    // Check if it's a valid ISO string or parseable date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return formatInTimezoneFn(value, formatPattern);
    }
  } catch (e) {}
  return String(value);
};


interface SpreadsheetGridProps {
  sheetId?: string;
  sheetIds?: string[];
  onOpenLeadDetail: (leadId: string) => void;
  onOpenDropdownManager?: (columnKey: string) => void; // Optional for hot leads mode
  onScroll?: (scrollTop: number, scrollingDown: boolean) => void;
  hotLeadsMode?: boolean;
  watchlistMode?: boolean;
  customViewId?: string; // For custom view mode
}

interface WatchlistLeadsResponse {
  leads: (Lead & { sheet_name: string; sheet_id: string })[];
  count: number;
}

interface CustomViewLeadsResponse {
  leads: (Lead & { sheet_name: string; sheet_id: string })[];
  count: number;
  view: any;
}

interface HotLeadsResponse {
  leads: (Lead & { sheet_name: string; sheet_id: string })[];
  count: number;
  config: any;
}

interface PaginatedLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sheetNames: Record<string, string>;
}

// Sortable Column Header component for drag-and-drop reordering
interface SortableColumnHeaderProps {
  columnKey: string;
  children: React.ReactNode;
  width: string;
  onResizeStart: (e: React.MouseEvent, columnKey: string) => void;
  isDraggingEnabled: boolean;
}

function SortableColumnHeader({ columnKey, children, width, onResizeStart, isDraggingEnabled }: SortableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey, disabled: !isDraggingEnabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    width,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-b border-r px-3 py-2 font-medium text-xs uppercase tracking-wide relative"
    >
      {/* Drag Handle */}
      {isDraggingEnabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-muted/50 z-10"
          data-testid={`drag-handle-${columnKey}`}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      
      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-30 group"
        onMouseDown={(e) => onResizeStart(e, columnKey)}
        data-testid={`resize-handle-${columnKey}`}
      >
        <div className="w-full h-full group-hover:bg-primary transition-colors" />
      </div>
      
      <div className={isDraggingEnabled ? "pl-4" : ""}>
        {children}
      </div>
    </div>
  );
}

// Global focus tracker for column filter inputs - persists across re-renders
let focusedFilterColumnKey: string | null = null;

// Debounced filter input to prevent focus loss during server refetches
interface DebouncedFilterInputProps {
  value: string;
  onFilterChange: (columnKey: string, value: string) => void;
  columnKey: string;
  onFilterClear: (columnKey: string) => void;
}

const DebouncedFilterInput = memo(function DebouncedFilterInput({ 
  value, 
  onFilterChange, 
  columnKey, 
  onFilterClear 
}: DebouncedFilterInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Sync local value when parent value changes externally (e.g., clear all filters)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Restore focus if this column was the last focused one
  useEffect(() => {
    if (focusedFilterColumnKey === columnKey && inputRef.current) {
      inputRef.current.focus();
    }
  }, [columnKey]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the parent update to prevent refetch on every keystroke
    debounceRef.current = setTimeout(() => {
      onFilterChange(columnKey, newValue);
    }, 300);
  }, [onFilterChange, columnKey]);
  
  const handleFocus = useCallback(() => {
    focusedFilterColumnKey = columnKey;
  }, [columnKey]);
  
  const handleBlur = useCallback(() => {
    // Only clear if this column was the focused one
    if (focusedFilterColumnKey === columnKey) {
      focusedFilterColumnKey = null;
    }
  }, [columnKey]);
  
  const handleClear = useCallback(() => {
    // Cancel any pending debounce to prevent stale update after clear
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setLocalValue("");
    onFilterClear(columnKey);
  }, [onFilterClear, columnKey]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  return (
    <>
      <Input
        ref={inputRef}
        placeholder="Filter..."
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="h-7 text-xs"
        data-testid={`input-filter-${columnKey}`}
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </>
  );
});

export function SpreadsheetGrid({
  sheetId,
  sheetIds,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onScroll,
  hotLeadsMode = false,
  watchlistMode = false,
  customViewId,
}: SpreadsheetGridProps) {
  // Custom view mode operates similarly to hot leads mode
  const customViewMode = !!customViewId;
  const { toast } = useToast();
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdminUser = isCompanyAdmin || isSuperAdmin;
  const { applyAutoFillRules } = useAutoFillRules();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { timezone, formatInTimezone, getCurrentDate, getStartOfDay, getEndOfDay, isSameDay, isBeforeToday, isAfterToday } = useCompanyTimezone();
  const isDarkMode = theme === "dark";
  const { 
    searchQuery, 
    categoryFilter,
    setActiveQuickFilter,
    setQuickFilterHandlers,
    isMultiSheetMode,
    selectedSheetIds,
    pagination,
    setPagination,
    thoughtFilter,
    setColumnVisibilityConfig,
  } = useDashboard();
  
  // Hot leads mode, watchlist mode, and custom view mode act like multi-mode (shows sheet column, uses company columns)
  // But these modes don't rely on selectedSheetIds - they use their own data source
  const isMultiMode = hotLeadsMode || watchlistMode || customViewMode || (isMultiSheetMode && selectedSheetIds.length > 0);
  const activeSheetId = sheetId || "";
  // For hot leads/watchlist/custom view mode, we don't need activeSheetIds - data comes from their own APIs
  const activeSheetIds = (hotLeadsMode || watchlistMode || customViewMode) ? [] : (isMultiSheetMode ? selectedSheetIds : []);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string; originalValue?: any } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState<{ leadId: string; field: string } | null>(null);
  
  // New features state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string | DateFilterValue | null>>({});
  
  // Quick filter config for client-side evaluation (used when OR logic is needed)
  const [activeQuickFilterConfig, setActiveQuickFilterConfig] = useState<{
    conditions: Array<{
      column_key: string;
      operator: string;
      value?: any;
      relative_date?: string;
      next_operator?: string;
    }>;
    logical_operator: "and" | "or";
  } | null>(null);
  
  // Stable callbacks for filter inputs - prevents re-creation on every render
  const handleColumnFilterChange = useCallback((columnKey: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  }, []);
  
  const handleColumnFilterClear = useCallback((columnKey: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  }, []);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileFilterHidden, setMobileFilterHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateHistoryDialogOpen, setUpdateHistoryDialogOpen] = useState(false);
  const [selectedLeadForUpdate, setSelectedLeadForUpdate] = useState<string | null>(null);
  const [nextFollowupDialogOpen, setNextFollowupDialogOpen] = useState(false);
  const [selectedLeadForNextFollowup, setSelectedLeadForNextFollowup] = useState<Lead | null>(null);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache for the currently editing/highlighted lead - persists even if filters would hide it
  // This ensures the row stays visible while being edited until user clicks another row
  const [editingLeadCache, setEditingLeadCache] = useState<Lead | null>(null);
  
  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);
  
  // Clear editingLeadCache when sheet/mode changes (not during filter changes)
  useEffect(() => {
    setEditingLeadCache(null);
    setHighlightedLeadId(null);
  }, [activeSheetId, isMultiMode, hotLeadsMode, customViewMode]);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetSheetId, setSelectedTargetSheetId] = useState<string>("");
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  
  // Transition explanation dialog state
  const [transitionExplanationDialogOpen, setTransitionExplanationDialogOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    leadId: string;
    columnKey: string;
    columnName: string;
    oldValue: string | null | undefined;
    newValue: string;
    customFields: Record<string, any>;
  } | null>(null);

  // Validation prompt dialog state (for field-level validation rules)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [pendingValidation, setPendingValidation] = useState<{
    leadId: string;
    columnKey: string;
    oldValue: any;
    newValue: any;
    rule: ValidationRule;
    lead: Lead;
  } | null>(null);

  // Final value confirmation dialog state
  const [finalValueConfirmOpen, setFinalValueConfirmOpen] = useState(false);
  const [pendingFinalValue, setPendingFinalValue] = useState<{
    leadId: string;
    columnKey: string;
    columnName: string;
    newValue: string;
    customFields: Record<string, any>;
  } | null>(null);

  // Admin override confirmation dialog state (for changing AWAY from final values)
  const [adminOverrideConfirmOpen, setAdminOverrideConfirmOpen] = useState(false);
  const [pendingAdminOverride, setPendingAdminOverride] = useState<{
    leadId: string;
    columnKey: string;
    columnName: string;
    oldValue: string;
    newValue: string;
    customFields: Record<string, any>;
    reversalInfo: {
      pendingApprovals: { id: string; points: number; description: string; userName?: string }[];
      awardedTransactions: { id: string; points: number; description: string; userName?: string }[];
      pendingPointsTotal: number; // Points that will be prevented (not yet awarded)
      awardedPointsTotal: number; // Points that will be deducted (already awarded)
    } | null;
  } | null>(null);
  const [isCheckingReversal, setIsCheckingReversal] = useState(false);

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);
  const isResizingOrSaving = useRef<boolean>(false); // Prevents preference sync during resize/save
  const columnWidthsRef = useRef<Record<string, number>>({}); // Always-current columnWidths for event handlers
  
  // Persistent columnsReady state - once true, stays true to prevent header unmounting during refetches
  const [columnsReady, setColumnsReady] = useState(false);

  // Column data fetching - needed first for buildBackendFilters
  const { data: singleSheetColumns = [], isLoading: isLoadingSingleColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", activeSheetId, "columns"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Company-level columns for multi-sheet mode (includes hot leads mode)
  const { data: companyColumns = [], isLoading: isLoadingCompanyColumns, error: companyColumnsError } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: isMultiMode, // isMultiMode already includes hotLeadsMode
    staleTime: 30000,
    retry: 2,
  });

  // Use appropriate columns based on mode
  const activeColumns = isMultiMode ? companyColumns : singleSheetColumns;
  
  // Set columnsReady to true once columns have loaded (stays true to prevent skeleton during refetches)
  // Also immediately set to true if columns are already available (cached)
  useEffect(() => {
    if (activeColumns.length > 0) {
      setColumnsReady(true);
    }
  }, [activeColumns.length]);
  
  // Reset columnsReady ONLY when switching to a mode with different column source
  // Don't reset if columns are already available for the new mode
  const prevModeRef = useRef({ isMultiMode: false, activeSheetId: "" });
  useEffect(() => {
    const prev = prevModeRef.current;
    const modeChanged = prev.isMultiMode !== isMultiMode;
    const sheetChanged = !isMultiMode && prev.activeSheetId !== activeSheetId;
    
    // Only reset if mode or sheet actually changed AND columns for new mode aren't already loaded
    if (modeChanged || sheetChanged) {
      // Check if we already have columns for the new mode
      const newModeColumns = isMultiMode ? companyColumns : singleSheetColumns;
      if (newModeColumns.length === 0) {
        setColumnsReady(false);
      } else {
        // Columns already available, keep columnsReady true
        setColumnsReady(true);
      }
    }
    
    prevModeRef.current = { isMultiMode, activeSheetId };
  }, [isMultiMode, activeSheetId, companyColumns.length, singleSheetColumns.length]);

  // Build filters object for backend - convert frontend filter format to backend format
  const buildBackendFilters = () => {
    const filters: Record<string, any> = {};
    for (const [key, value] of Object.entries(columnFilters)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Handle date range filters - format as YYYY-MM-DD strings to avoid timezone issues
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        const dateFilter = value as DateFilterValue | null;
        if (dateFilter && dateFilter.from && dateFilter.to) {
          // Format dates as YYYY-MM-DD strings (local timezone dates, not UTC ISO strings)
          const fromStr = dateFilter.from instanceof Date 
            ? `${dateFilter.from.getFullYear()}-${String(dateFilter.from.getMonth() + 1).padStart(2, '0')}-${String(dateFilter.from.getDate()).padStart(2, '0')}`
            : String(dateFilter.from);
          const toStr = dateFilter.to instanceof Date 
            ? `${dateFilter.to.getFullYear()}-${String(dateFilter.to.getMonth() + 1).padStart(2, '0')}-${String(dateFilter.to.getDate()).padStart(2, '0')}`
            : String(dateFilter.to);
          filters[key] = { from: fromStr, to: toStr, type: 'date_range' };
        }
      } 
      // Handle dropdown exact match filters
      else if (typeof value === 'string') {
        // Check if this column is a dropdown type
        const col = activeColumns.find(c => c.column_key === key);
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
    // Add thought filter for Sure/May Be leads
    if (thoughtFilter) {
      filters.thought = thoughtFilter;
    }
    return filters;
  };

  // Single-sheet mode data fetching - infinite scroll
  interface SingleSheetPaginatedResponse {
    leads: Lead[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  const INFINITE_SCROLL_LIMIT = 50;

  const { 
    data: singleSheetInfiniteData, 
    isLoading: isLoadingSingleLeads,
    isFetching: isFetchingSingleLeads,
    fetchNextPage: fetchNextSinglePage,
    hasNextPage: hasNextSinglePage,
    isFetchingNextPage: isFetchingNextSinglePage,
  } = useInfiniteQuery<SingleSheetPaginatedResponse>({
    queryKey: ["/api/sheets", activeSheetId, "leads-infinite", sortColumn, sortDirection, columnFilters, searchQuery, thoughtFilter, activeQuickFilterConfig],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(INFINITE_SCROLL_LIMIT),
        sortBy: sortColumn || "created_at",
        sortOrder: sortColumn ? sortDirection : "desc",
        filters: JSON.stringify(buildBackendFilters()),
      });
      // Pass quick filter config to server for proper OR/AND filtering
      if (activeQuickFilterConfig) {
        params.append('quickFilter', JSON.stringify(activeQuickFilterConfig));
      }
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/sheets/${activeSheetId}/leads?${params}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      // Calculate total loaded so far
      const totalLoaded = allPages.reduce((sum, page) => sum + page.leads.length, 0);
      // Use first page's total as fallback if lastPage.total is missing
      const total = lastPage.total ?? allPages[0]?.total ?? 0;
      // Check if there are more leads to load
      if (total > totalLoaded) {
        return allPages.length + 1; // Next page number
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!activeSheetId && !isMultiMode && !isLoadingSingleColumns,
  });

  // Flatten single-sheet infinite data
  const singleSheetLeads = useMemo(() => {
    if (!singleSheetInfiniteData?.pages) return [];
    return singleSheetInfiniteData.pages.flatMap(page => page.leads);
  }, [singleSheetInfiniteData]);

  const singleSheetTotal = singleSheetInfiniteData?.pages?.[0]?.total ?? 0;

  // Multi-sheet mode data fetching - infinite scroll
  const { 
    data: multiSheetInfiniteData, 
    isLoading: isLoadingMultiLeads,
    isFetching: isFetchingMultiLeads,
    fetchNextPage: fetchNextMultiPage,
    hasNextPage: hasNextMultiPage,
    isFetchingNextPage: isFetchingNextMultiPage,
  } = useInfiniteQuery<PaginatedLeadsResponse>({
    queryKey: ["/api/leads/query-infinite", activeSheetIds, searchQuery, columnFilters, sortColumn, sortDirection, thoughtFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiRequest<PaginatedLeadsResponse>("POST", "/api/leads/query", {
        sheetIds: activeSheetIds,
        page: pageParam,
        limit: INFINITE_SCROLL_LIMIT,
        sortBy: sortColumn || "created_at",
        sortOrder: sortColumn ? sortDirection : "desc",
        filters: buildBackendFilters(),
      });
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Calculate total loaded so far
      const totalLoaded = allPages.reduce((sum, page) => sum + page.leads.length, 0);
      // Use first page's total as fallback if lastPage.total is missing
      const total = lastPage.total ?? allPages[0]?.total ?? 0;
      // Check if there are more leads to load
      if (total > totalLoaded) {
        return allPages.length + 1; // Next page number
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isMultiMode && !hotLeadsMode && !customViewMode && activeSheetIds.length > 0 && companyColumns.length > 0,
  });

  // Flatten multi-sheet infinite data
  const multiSheetLeads = useMemo(() => {
    if (!multiSheetInfiniteData?.pages) return [];
    return multiSheetInfiniteData.pages.flatMap(page => page.leads);
  }, [multiSheetInfiniteData]);

  const multiSheetTotal = multiSheetInfiniteData?.pages?.[0]?.total ?? 0;
  const multiSheetNames = multiSheetInfiniteData?.pages?.[0]?.sheetNames ?? {};

  // Hot leads mode data fetching - uses /api/hot-leads endpoint
  const { 
    data: hotLeadsData,
    isLoading: isLoadingHotLeads,
    isFetching: isFetchingHotLeads,
    refetch: refetchHotLeads,
  } = useQuery<HotLeadsResponse>({
    queryKey: ["/api/hot-leads"],
    enabled: hotLeadsMode,
  });

  // Process hot leads data with client-side filtering/sorting
  const hotLeadsProcessed = useMemo(() => {
    if (!hotLeadsData?.leads) return [];
    let filtered = [...hotLeadsData.leads];
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => {
        const name = lead.custom_fields?.full_name?.toString().toLowerCase() || "";
        const mobile = lead.custom_fields?.mobile_no?.toString().toLowerCase() || "";
        const sheetName = lead.sheet_name?.toLowerCase() || "";
        return name.includes(searchLower) || mobile.includes(searchLower) || sheetName.includes(searchLower);
      });
    }
    
    // Apply column filters
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      
      // Handle date range filters (DateFilterValue objects)
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        const dateFilter = value as DateFilterValue;
        if (dateFilter && dateFilter.from && dateFilter.to) {
          filtered = filtered.filter(lead => {
            const fieldValue = lead.custom_fields?.[key];
            if (!fieldValue) return false;
            
            const dateValue = new Date(fieldValue);
            if (isNaN(dateValue.getTime())) return false;
            
            const fromDate = new Date(dateFilter.from!);
            const toDate = new Date(dateFilter.to!);
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
            
            return dateValue >= fromDate && dateValue <= toDate;
          });
        }
      }
      // Handle string filters
      else if (typeof value === 'string' && value.trim()) {
        const filterLower = value.toLowerCase().trim();
        filtered = filtered.filter(lead => {
          // Special handling for sheet name filter in hot leads mode (text input -> substring match)
          if (key === "__sheet_name__") {
            const sheetName = (lead.sheet_name || "").toLowerCase().trim();
            return sheetName.includes(filterLower);
          }
          const fieldValue = lead.custom_fields?.[key]?.toString().toLowerCase() || "";
          return fieldValue.includes(filterLower);
        });
      }
    }
    
    // Apply thought filter
    if (thoughtFilter) {
      filtered = filtered.filter(lead => {
        const thought = (lead.meta as any)?.thought;
        return thought === thoughtFilter;
      });
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (sortColumn === "__sheet_name__") {
          aVal = a.sheet_name || "";
          bVal = b.sheet_name || "";
        } else if (sortColumn === "created_at") {
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
          aVal = a.custom_fields?.[sortColumn] || "";
          bVal = b.custom_fields?.[sortColumn] || "";
        }
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [hotLeadsData?.leads, searchQuery, columnFilters, thoughtFilter, sortColumn, sortDirection]);

  const hotLeadsSheetNames = useMemo(() => {
    if (!hotLeadsData?.leads) return {};
    const names: Record<string, string> = {};
    hotLeadsData.leads.forEach(lead => {
      if (lead.sheet_id && lead.sheet_name) {
        names[lead.sheet_id] = lead.sheet_name;
      }
    });
    return names;
  }, [hotLeadsData?.leads]);

  // Watchlist mode data fetching - uses /api/watchlist/leads endpoint
  const { 
    data: watchlistData,
    isLoading: isLoadingWatchlist,
    isFetching: isFetchingWatchlist,
    refetch: refetchWatchlist,
  } = useQuery<WatchlistLeadsResponse>({
    queryKey: ["/api/watchlist/leads"],
    enabled: watchlistMode,
  });

  // Process watchlist data with client-side filtering/sorting (similar to hot leads)
  const watchlistProcessed = useMemo(() => {
    if (!watchlistData?.leads) return [];
    let filtered = [...watchlistData.leads];
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => {
        const name = lead.custom_fields?.full_name?.toString().toLowerCase() || "";
        const mobile = lead.custom_fields?.mobile_no?.toString().toLowerCase() || "";
        const sheetName = lead.sheet_name?.toLowerCase() || "";
        return name.includes(searchLower) || mobile.includes(searchLower) || sheetName.includes(searchLower);
      });
    }
    
    // Apply column filters
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      
      // Handle date range filters (DateFilterValue objects)
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        const dateFilter = value as DateFilterValue;
        if (dateFilter && dateFilter.from && dateFilter.to) {
          filtered = filtered.filter(lead => {
            const fieldValue = lead.custom_fields?.[key];
            if (!fieldValue) return false;
            
            const dateValue = new Date(fieldValue);
            if (isNaN(dateValue.getTime())) return false;
            
            const fromDate = new Date(dateFilter.from!);
            const toDate = new Date(dateFilter.to!);
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
            
            return dateValue >= fromDate && dateValue <= toDate;
          });
        }
      }
      // Handle string filters
      else if (typeof value === 'string' && value.trim()) {
        const filterLower = value.toLowerCase().trim();
        filtered = filtered.filter(lead => {
          if (key === "__sheet_name__") {
            const sheetName = (lead.sheet_name || "").toLowerCase().trim();
            return sheetName.includes(filterLower);
          }
          const fieldValue = lead.custom_fields?.[key]?.toString().toLowerCase() || "";
          return fieldValue.includes(filterLower);
        });
      }
    }
    
    // Apply thought filter
    if (thoughtFilter) {
      filtered = filtered.filter(lead => {
        const thought = (lead.meta as any)?.thought;
        return thought === thoughtFilter;
      });
    }
    
    // Default sort by next follow-up date (upcoming first) for watchlist
    // This makes it easy to prioritize leads needing attention soon
    filtered.sort((a, b) => {
      // Find the next follow-up date field key by searching the lead's custom_fields
      const findNfdtKey = (lead: any) => {
        if (!lead.custom_fields) return null;
        return Object.keys(lead.custom_fields).find(key => 
          key.includes('next_follow') || key.includes('nfdt') || key.includes('follow_up')
        );
      };
      
      const nfdtKeyA = findNfdtKey(a);
      const nfdtKeyB = findNfdtKey(b);
      const nfdtKey = nfdtKeyA || nfdtKeyB; // Use whichever key we find
      
      if (nfdtKey) {
        const aDate = a.custom_fields?.[nfdtKey];
        const bDate = b.custom_fields?.[nfdtKey];
        
        // Leads with dates come before those without
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;
        if (aDate && bDate) {
          const aTime = new Date(aDate).getTime();
          const bTime = new Date(bDate).getTime();
          if (!isNaN(aTime) && !isNaN(bTime)) {
            return aTime - bTime; // Upcoming first
          }
        }
      }
      
      // Fallback to created_at descending
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
    
    // Apply user's custom sorting if specified
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (sortColumn === "__sheet_name__") {
          aVal = a.sheet_name || "";
          bVal = b.sheet_name || "";
        } else if (sortColumn === "created_at") {
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
          aVal = a.custom_fields?.[sortColumn] || "";
          bVal = b.custom_fields?.[sortColumn] || "";
        }
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [watchlistData?.leads, searchQuery, columnFilters, thoughtFilter, sortColumn, sortDirection]);

  const watchlistSheetNames = useMemo(() => {
    if (!watchlistData?.leads) return {};
    const names: Record<string, string> = {};
    watchlistData.leads.forEach(lead => {
      if (lead.sheet_id && lead.sheet_name) {
        names[lead.sheet_id] = lead.sheet_name;
      }
    });
    return names;
  }, [watchlistData?.leads]);

  // Custom view mode data fetching - uses /api/custom-views/:id/leads endpoint
  const { 
    data: customViewData,
    isLoading: isLoadingCustomView,
    isFetching: isFetchingCustomView,
    refetch: refetchCustomView,
  } = useQuery<CustomViewLeadsResponse>({
    queryKey: ["/api/custom-views", customViewId, "leads"],
    enabled: customViewMode && !!customViewId,
  });

  // Process custom view data with client-side filtering/sorting
  const customViewProcessed = useMemo(() => {
    if (!customViewData?.leads) return [];
    let filtered = [...customViewData.leads];
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => {
        const name = lead.custom_fields?.full_name?.toString().toLowerCase() || "";
        const mobile = lead.custom_fields?.mobile_no?.toString().toLowerCase() || "";
        const sheetName = lead.sheet_name?.toLowerCase() || "";
        return name.includes(searchLower) || mobile.includes(searchLower) || sheetName.includes(searchLower);
      });
    }
    
    // Apply column filters
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      
      // Handle date range filters (DateFilterValue objects)
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        const dateFilter = value as DateFilterValue;
        if (dateFilter && dateFilter.from && dateFilter.to) {
          filtered = filtered.filter(lead => {
            const fieldValue = lead.custom_fields?.[key];
            if (!fieldValue) return false;
            
            // Parse the date value from the lead
            const dateValue = new Date(fieldValue);
            if (isNaN(dateValue.getTime())) return false;
            
            // Compare dates (using start of day for from, end of day for to)
            const fromDate = new Date(dateFilter.from!);
            const toDate = new Date(dateFilter.to!);
            
            // Set from to start of day and to to end of day for inclusive comparison
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
            
            return dateValue >= fromDate && dateValue <= toDate;
          });
        }
      }
      // Handle string filters
      else if (typeof value === 'string' && value.trim()) {
        const filterLower = value.toLowerCase().trim();
        filtered = filtered.filter(lead => {
          // Special handling for sheet name filter in custom view mode (exact match)
          if (key === "__sheet_name__") {
            const sheetName = (lead.sheet_name || "").toLowerCase().trim();
            return sheetName === filterLower;
          }
          const fieldValue = lead.custom_fields?.[key]?.toString().toLowerCase() || "";
          return fieldValue.includes(filterLower);
        });
      }
    }
    
    // Apply thought filter
    if (thoughtFilter) {
      filtered = filtered.filter(lead => {
        const thought = (lead.meta as any)?.thought;
        return thought === thoughtFilter;
      });
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (sortColumn === "__sheet_name__") {
          aVal = a.sheet_name || "";
          bVal = b.sheet_name || "";
        } else if (sortColumn === "created_at") {
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
          aVal = a.custom_fields?.[sortColumn] || "";
          bVal = b.custom_fields?.[sortColumn] || "";
        }
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [customViewData?.leads, searchQuery, columnFilters, thoughtFilter, sortColumn, sortDirection]);

  const customViewSheetNames = useMemo(() => {
    if (!customViewData?.leads) return {};
    const names: Record<string, string> = {};
    customViewData.leads.forEach(lead => {
      if (lead.sheet_id && lead.sheet_name) {
        names[lead.sheet_id] = lead.sheet_name;
      }
    });
    return names;
  }, [customViewData?.leads]);

  // Update pagination state for display purposes (infinite scroll mode)
  // Use ref to track previous values and prevent unnecessary updates that cause infinite loops
  const prevPaginationRef = useRef({ total: 0, mode: "" });
  useEffect(() => {
    let newTotal = 0;
    let newMode = "";
    let newLimit = 50;
    let newTotalPages = 1;
    
    if (hotLeadsMode) {
      newTotal = hotLeadsProcessed.length;
      newMode = "hotLeads";
      newLimit = hotLeadsProcessed.length || 50;
    } else if (watchlistMode) {
      newTotal = watchlistProcessed.length;
      newMode = "watchlist";
      newLimit = watchlistProcessed.length || 50;
    } else if (customViewMode) {
      newTotal = customViewProcessed.length;
      newMode = "customView";
      newLimit = customViewProcessed.length || 50;
    } else if (isMultiMode && multiSheetTotal > 0) {
      newTotal = multiSheetTotal;
      newMode = "multiSheet";
      newLimit = INFINITE_SCROLL_LIMIT;
      newTotalPages = Math.ceil(multiSheetTotal / INFINITE_SCROLL_LIMIT);
    } else if (!isMultiMode && singleSheetTotal > 0) {
      newTotal = singleSheetTotal;
      newMode = "singleSheet";
      newLimit = INFINITE_SCROLL_LIMIT;
      newTotalPages = Math.ceil(singleSheetTotal / INFINITE_SCROLL_LIMIT);
    }
    
    // Only update pagination if values actually changed to prevent infinite loops
    if (prevPaginationRef.current.total !== newTotal || prevPaginationRef.current.mode !== newMode) {
      prevPaginationRef.current = { total: newTotal, mode: newMode };
      setPagination({
        page: 1,
        limit: newLimit,
        total: newTotal,
        totalPages: newTotalPages,
      });
    }
  }, [multiSheetTotal, singleSheetTotal, isMultiMode, hotLeadsMode, watchlistMode, customViewMode, hotLeadsProcessed.length, watchlistProcessed.length, customViewProcessed.length, setPagination]);

  // Reset to page 1 when sheet selection, search, filters, or sort changes
  // Use JSON.stringify for stable dependency reference of columnFilters
  const columnFiltersKey = JSON.stringify(columnFilters);
  const prevDepsRef = useRef({ activeSheetId: "", activeSheetIdsLength: 0, searchQuery: "", columnFiltersKey: "", sortColumn: "", sortDirection: "", thoughtFilter: "" });
  useEffect(() => {
    const prevDeps = prevDepsRef.current;
    // Only reset page if dependencies actually changed (not on mount)
    const depsChanged = 
      prevDeps.activeSheetId !== activeSheetId ||
      prevDeps.activeSheetIdsLength !== activeSheetIds.length ||
      prevDeps.searchQuery !== searchQuery ||
      prevDeps.columnFiltersKey !== columnFiltersKey ||
      prevDeps.sortColumn !== (sortColumn || "") ||
      prevDeps.sortDirection !== sortDirection ||
      prevDeps.thoughtFilter !== (thoughtFilter || "");
    
    if (depsChanged && pagination.page !== 1) {
      // Use a stable default limit from context
      setPagination({
        page: 1,
        limit: pagination.limit || 50,
        total: 0,
        totalPages: 1,
      });
    }
    
    prevDepsRef.current = {
      activeSheetId: activeSheetId || "",
      activeSheetIdsLength: activeSheetIds.length,
      searchQuery: searchQuery || "",
      columnFiltersKey,
      sortColumn: sortColumn || "",
      sortDirection,
      thoughtFilter: thoughtFilter || "",
    };
  }, [activeSheetId, activeSheetIds.length, searchQuery, columnFiltersKey, sortColumn, sortDirection, thoughtFilter, pagination.page, pagination.limit, setPagination]);

  // Unified data access - using infinite scroll data, hot leads data, watchlist data, or custom view data
  const leads = hotLeadsMode 
    ? hotLeadsProcessed 
    : watchlistMode
      ? watchlistProcessed
      : customViewMode
        ? customViewProcessed
        : (isMultiMode ? multiSheetLeads : singleSheetLeads);
  const customColumns = isMultiMode ? companyColumns : singleSheetColumns;
  const sheetNamesMap = hotLeadsMode 
    ? hotLeadsSheetNames 
    : watchlistMode 
      ? watchlistSheetNames
      : customViewMode 
        ? customViewSheetNames 
        : multiSheetNames;
  
  // Unified infinite scroll helpers (hot leads/watchlist/custom view mode doesn't use infinite scroll)
  const hasNextPage = (hotLeadsMode || watchlistMode || customViewMode) ? false : (isMultiMode ? hasNextMultiPage : hasNextSinglePage);
  const isFetchingNextPage = (hotLeadsMode || watchlistMode || customViewMode) ? false : (isMultiMode ? isFetchingNextMultiPage : isFetchingNextSinglePage);
  const fetchNextPage = (hotLeadsMode || watchlistMode || customViewMode) ? (() => Promise.resolve()) : (isMultiMode ? fetchNextMultiPage : fetchNextSinglePage);
  const totalLeads = hotLeadsMode 
    ? hotLeadsProcessed.length 
    : watchlistMode
      ? watchlistProcessed.length
      : customViewMode 
        ? customViewProcessed.length 
        : (isMultiMode ? multiSheetTotal : singleSheetTotal);


  const { data: allSheets = [] } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: validationRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", activeSheetId, "validation-rules"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  const { data: sheetHighlightingRules = [] } = useQuery<HighlightingRule[]>({
    queryKey: ["/api/sheets", activeSheetId, "highlighting-rules"],
    enabled: !!activeSheetId,
  });

  // Fetch global highlighting rules (apply to all sheets)
  const { data: globalHighlightingRules = [] } = useQuery<HighlightingRule[]>({
    queryKey: ["/api/company/global-highlighting-rules"],
  });
  
  // Fetch active transition explanation rules (company-wide)
  const { data: transitionExplanationRules = [] } = useQuery<TransitionExplanationRuleRecord[]>({
    queryKey: ["/api/company/transition-explanations/active"],
  });

  // Merge global and sheet-specific rules, sheet-specific take precedence (evaluated first)
  // Disable highlighting rules for Custom Views
  const highlightingRules = useMemo(() => {
    if (customViewMode) {
      return []; // No highlighting in Custom Views
    }
    // Sheet-specific rules are evaluated first (have higher effective priority)
    // Then global rules are evaluated for any rows not matched by sheet-specific rules
    return [...sheetHighlightingRules, ...globalHighlightingRules];
  }, [sheetHighlightingRules, globalHighlightingRules, customViewMode]);

  // Load company settings (for mobile card columns and final value settings)
  const { data: companySettingsData } = useQuery<{ 
    settings: { 
      mobile_card_columns?: string[];
      final_value_settings?: {
        id: string;
        column_key: string;
        final_values: string[];
        enabled: boolean;
      }[];
    } 
  }>({
    queryKey: ["/api/company/settings"],
  });

  // Helper to check if a cell value is in a "final" locked state
  const finalValueMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const settings = companySettingsData?.settings?.final_value_settings || [];
    for (const rule of settings) {
      if (rule.enabled && rule.final_values.length > 0) {
        map.set(rule.column_key, new Set(rule.final_values));
      }
    }
    return map;
  }, [companySettingsData?.settings?.final_value_settings]);

  const isFinalValue = useCallback((columnKey: string, value: any): boolean => {
    if (!value) return false;
    const finalValues = finalValueMap.get(columnKey);
    return finalValues ? finalValues.has(String(value)) : false;
  }, [finalValueMap]);

  // Load column width preferences (only in single-sheet mode)
  const { data: sheetColumnPreferences = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/sheets", activeSheetId, "column-preferences"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Load column width preferences for Custom Views
  const { data: customViewColumnPreferences = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/custom-views", customViewId, "column-preferences"],
    enabled: customViewMode && !!customViewId,
  });

  // Combined column preferences based on mode
  const columnPreferences = customViewMode ? customViewColumnPreferences : sheetColumnPreferences;

  // Save column width preferences mutation (only in single-sheet mode)
  const saveSheetColumnPreferencesMutation = useMutation({
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
    onSettled: () => {
      // Clear the flag after mutation completes (after cache invalidation settles)
      setTimeout(() => {
        isResizingOrSaving.current = false;
      }, 500);
    },
  });

  // Save column width preferences mutation for Custom Views
  const saveCustomViewColumnPreferencesMutation = useMutation({
    mutationFn: async (preferences: Record<string, number>) => {
      return await apiRequest("POST", `/api/custom-views/${customViewId}/column-preferences`, { preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views", customViewId, "column-preferences"] });
    },
    onError: (error: any) => {
      console.error("Failed to save custom view column preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save column width preferences",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Clear the flag after mutation completes (after cache invalidation settles)
      setTimeout(() => {
        isResizingOrSaving.current = false;
      }, 500);
    },
  });

  // Use the appropriate mutation based on mode
  const saveColumnPreferencesMutation = customViewMode ? saveCustomViewColumnPreferencesMutation : saveSheetColumnPreferencesMutation;

  // User sheet view (column order and hidden columns) - only in single-sheet mode
  const { data: userSheetView } = useQuery<{ column_order: string[]; hidden_columns: string[] }>({
    queryKey: ["/api/sheets", activeSheetId, "view"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // User row filters - only in single-sheet mode
  const { data: userRowFilters = [] } = useQuery<UserRowFilterRecord[]>({
    queryKey: ["/api/sheets", activeSheetId, "row-filters"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Watchlist - user's watched lead IDs for quick lookup
  const { data: watchlistIds = [] } = useQuery<string[]>({
    queryKey: ["/api/watchlist/ids"],
  });
  const watchlistSet = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  // Toggle watchlist mutation
  const toggleWatchlistMutation = useMutation({
    mutationFn: async ({ leadId, isOnWatchlist }: { leadId: string; isOnWatchlist: boolean }) => {
      if (isOnWatchlist) {
        return await apiRequest("DELETE", `/api/watchlist/${leadId}`);
      } else {
        return await apiRequest("POST", `/api/watchlist/${leadId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/leads"] });
    },
    onError: (error: any) => {
      console.error("Failed to toggle watchlist:", error);
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive",
      });
    },
  });

  // Column order state (derived from user sheet view or default)
  const [customColumnOrder, setCustomColumnOrder] = useState<string[]>([]);

  // Reset column order and hidden columns when sheet changes
  const prevSheetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSheetId && activeSheetId !== prevSheetIdRef.current) {
      // Reset to empty state when navigating to a new sheet
      // The actual values will be loaded from userSheetView query
      setCustomColumnOrder([]);
      setHiddenColumns(new Set());
      prevSheetIdRef.current = activeSheetId;
    }
  }, [activeSheetId]);

  // Sync column order from user sheet view when it loads
  useEffect(() => {
    if (userSheetView?.column_order && userSheetView.column_order.length > 0) {
      // De-duplicate column order to prevent duplicate columns from corrupted view data
      const uniqueOrder = Array.from(new Set(userSheetView.column_order));
      setCustomColumnOrder(uniqueOrder);
    } else if (userSheetView) {
      // User has view but no custom order - reset to empty
      setCustomColumnOrder([]);
    }
  }, [userSheetView?.column_order, activeSheetId]);

  // Sync hidden columns from user sheet view when it loads
  useEffect(() => {
    if (userSheetView?.hidden_columns && userSheetView.hidden_columns.length > 0) {
      setHiddenColumns(new Set(userSheetView.hidden_columns));
    } else if (userSheetView) {
      // User has view but no hidden columns - reset to empty
      setHiddenColumns(new Set());
    }
  }, [userSheetView?.hidden_columns, activeSheetId]);

  // Save user sheet view mutation
  const saveUserSheetViewMutation = useMutation({
    mutationFn: async ({ columnOrder, hiddenColumns }: { columnOrder: string[]; hiddenColumns: string[] }) => {
      return await apiRequest("PUT", `/api/sheets/${activeSheetId}/view`, { 
        column_order: columnOrder, 
        hidden_columns: hiddenColumns 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "view"] });
    },
    onError: (error: any) => {
      console.error("Failed to save column view:", error);
      toast({
        title: "Error",
        description: "Failed to save column view preferences",
        variant: "destructive",
      });
    },
  });

  // dnd-kit sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // isInitialLoading: true ONLY when columns have never been loaded (show full skeleton)
  // Uses persistent columnsReady flag so refetches don't re-trigger the skeleton
  // Once columns are loaded, the header stays mounted regardless of lead fetching state
  const isInitialLoading = !columnsReady;
  
  // isFetchingLeads: true when leads data is being fetched (for row-level loading indicator)
  const isFetchingLeads = hotLeadsMode
    ? isFetchingHotLeads
    : customViewMode
      ? isFetchingCustomView
      : isMultiMode 
        ? isFetchingMultiLeads
        : isFetchingSingleLeads;
  
  // Legacy isLoading for backward compatibility with other parts of the component
  const isLoading = hotLeadsMode
    ? (isLoadingHotLeads || isLoadingCompanyColumns)
    : customViewMode
      ? (isLoadingCustomView || isLoadingCompanyColumns)
      : isMultiMode 
        ? (isLoadingMultiLeads || isLoadingCompanyColumns)
        : (isLoadingSingleLeads || isLoadingSingleColumns);

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, customFields }: { leadId: string; customFields: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { custom_fields: customFields });
    },
    onMutate: async ({ leadId, customFields }) => {
      // Use query key prefix matching for infinite queries - only match the base key parts
      const singleSheetQueryKeyPrefix = ["/api/sheets", activeSheetId, "leads-infinite"];
      const multiSheetQueryKeyPrefix = ["/api/leads/query-infinite"];
      const hotLeadsQueryKey = ["/api/hot-leads"];
      const customViewQueryKey = customViewId ? ["/api/custom-views", customViewId, "leads"] : [];
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      if (hotLeadsMode) {
        await queryClient.cancelQueries({ queryKey: hotLeadsQueryKey });
      } else if (customViewMode && customViewId) {
        await queryClient.cancelQueries({ queryKey: customViewQueryKey });
      } else if (isMultiMode) {
        await queryClient.cancelQueries({ queryKey: multiSheetQueryKeyPrefix });
      } else {
        await queryClient.cancelQueries({ queryKey: singleSheetQueryKeyPrefix });
      }

      // Snapshot the previous values for rollback (using prefix matching)
      const previousSingleLeads = queryClient.getQueriesData({ queryKey: singleSheetQueryKeyPrefix });
      const previousMultiLeads = queryClient.getQueriesData({ queryKey: multiSheetQueryKeyPrefix });
      const previousHotLeads = queryClient.getQueryData(hotLeadsQueryKey);
      const previousCustomView = customViewId ? queryClient.getQueryData(customViewQueryKey) : undefined;

      // Optimistically update the lead in the appropriate cache
      if (hotLeadsMode) {
        queryClient.setQueryData(hotLeadsQueryKey, (old: HotLeadsResponse | undefined) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === leadId
                ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                : lead
            ),
          };
        });
      } else if (customViewMode && customViewId) {
        queryClient.setQueryData(customViewQueryKey, (old: CustomViewLeadsResponse | undefined) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === leadId
                ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                : lead
            ),
          };
        });
      } else if (isMultiMode) {
        queryClient.setQueriesData(
          { queryKey: multiSheetQueryKeyPrefix },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                leads: page.leads.map((lead: Lead) =>
                  lead.id === leadId
                    ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                    : lead
                ),
              })),
            };
          }
        );
      } else {
        // Update the infinite query pages structure
        queryClient.setQueriesData(
          { queryKey: singleSheetQueryKeyPrefix },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                leads: page.leads.map((lead: Lead) =>
                  lead.id === leadId
                    ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                    : lead
                ),
              })),
            };
          }
        );
      }

      // Also update the editingLeadCache if the lead being updated is the cached one
      // This ensures the pinned row shows the updated data immediately
      if (editingLeadCache && editingLeadCache.id === leadId) {
        setEditingLeadCache({
          ...editingLeadCache,
          custom_fields: { ...editingLeadCache.custom_fields, ...customFields }
        });
      }

      // Return context with previous values for rollback
      return { previousSingleLeads, previousMultiLeads, previousHotLeads };
    },
    onError: (err: any, variables, context) => {
      // Rollback to previous values on error
      if (context?.previousHotLeads) {
        queryClient.setQueryData(["/api/hot-leads"], context.previousHotLeads);
      }
      if (context?.previousSingleLeads) {
        context.previousSingleLeads.forEach(([queryKey, data]: [any, any]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      if (context?.previousMultiLeads) {
        context.previousMultiLeads.forEach(([queryKey, data]: [any, any]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      
      // Check if this is a final value protection error
      if (err?.error === "Final value protection") {
        toast({
          title: "Value is Locked",
          description: err.message || "This value cannot be changed. Only Admins can modify final values.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error saving",
          description: err?.message || "Failed to save changes. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state is synced
      if (hotLeadsMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
      } else if (customViewMode && customViewId) {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views", customViewId, "leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      } else if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      }
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      await Promise.all(leadIds.map((id) => apiRequest("DELETE", `/api/leads/${id}`, {})));
    },
    onSuccess: () => {
      if (hotLeadsMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
      } else if (customViewMode && customViewId) {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views", customViewId, "leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      } else if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
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
      if (hotLeadsMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
      } else if (customViewMode && customViewId) {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views", customViewId, "leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      } else if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", variables.targetSheetId, "leads-infinite"] });
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

  // Lead thought mutation - for marking leads as "sure" or "maybe"
  const updateLeadThoughtMutation = useMutation({
    mutationFn: async ({ leadId, thought }: { leadId: string; thought: "sure" | "maybe" | null }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/thought`, { thought });
    },
    onSuccess: () => {
      if (hotLeadsMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
      } else if (customViewMode && customViewId) {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views", customViewId, "leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      } else if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead thought",
        variant: "destructive",
      });
    },
  });

  // Handler for next followup date dialog save
  const handleNextFollowupDateSave = async (data: {
    update_via: "call" | "whatsapp" | "visit";
    remark: string;
    lead_status?: string | null;
    next_followup_date?: string | null;
  }) => {
    if (!selectedLeadForNextFollowup) return;

    try {
      // Get today's date in company timezone for update_on
      const today = getCurrentDate();
      const updateOn = format(today, "yyyy-MM-dd");

      // Create lead update
      await apiRequest("POST", `/api/leads/${selectedLeadForNextFollowup.id}/updates`, {
        update_via: data.update_via,
        remark: data.remark,
        update_on: updateOn,
      });

      // Update next_followup_date and lead_status (always update, even if empty to clear the field)
      const updatedFields = {
        ...selectedLeadForNextFollowup.custom_fields,
        next_followup_date: data.next_followup_date || null,
      };
      
      // Update lead_status if provided
      if (data.lead_status !== undefined) {
        updatedFields.lead_status = data.lead_status || null;
      }
      
      await updateLeadMutation.mutateAsync({
        leadId: selectedLeadForNextFollowup.id,
        customFields: updatedFields,
      });

      toast({ title: "Next followup date updated successfully" });
      setNextFollowupDialogOpen(false);
      setSelectedLeadForNextFollowup(null);
    } catch (error: any) {
      toast({
        title: "Failed to update next followup date",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

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
    const today = getStartOfDay(getCurrentDate());  // Use company timezone
    
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
    
    // Reset filters and sort to defaults when switching sheets
    setColumnFilters({});
    // Default sort: created_at descending (newest leads first)
    setSortColumn("created_at");
    setSortDirection("desc");
    // Clear active row highlight when switching sheets
    setHighlightedLeadId(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
    };

    const handleLeadUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
    };

    const handleHighlightingRulesUpdated = (data: { sheetId: string | null; global?: boolean }) => {
      if (data.global) {
        // Global rules updated - invalidate global rules cache
        queryClient.invalidateQueries({ queryKey: ["/api/company/global-highlighting-rules"] });
      } else if (data.sheetId === sheetId) {
        // Sheet-specific rules updated
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "highlighting-rules"] });
      }
    };

    const handleAIRatingUpdated = (data: { leadId: string }) => {
      // Invalidate leads to refresh AI rating display
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
      // Also invalidate specific lead query for the drawer
      queryClient.invalidateQueries({ queryKey: ["/api/leads", data.leadId] });
    };

    socket.on("lead_created", handleLeadCreated);
    socket.on("lead_updated", handleLeadUpdated);
    socket.on("highlighting_rules.updated", handleHighlightingRulesUpdated);
    socket.on("ai_rating_updated", handleAIRatingUpdated);

    return () => {
      socket.emit("leave_sheet", sheetId);
      socket.off("lead_created", handleLeadCreated);
      socket.off("lead_updated", handleLeadUpdated);
      socket.off("highlighting_rules.updated", handleHighlightingRulesUpdated);
      socket.off("ai_rating_updated", handleAIRatingUpdated);
    };
  }, [sheetId]);

  // Socket.io realtime updates for hot leads mode
  useEffect(() => {
    if (!hotLeadsMode) return;
    
    const socket = getSocket();

    const handleHotLeadUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
    };

    socket.on("lead.created", handleHotLeadUpdate);
    socket.on("lead.updated", handleHotLeadUpdate);
    socket.on("lead.deleted", handleHotLeadUpdate);
    socket.on("hot_lead_config.updated", handleHotLeadUpdate);

    return () => {
      socket.off("lead.created", handleHotLeadUpdate);
      socket.off("lead.updated", handleHotLeadUpdate);
      socket.off("lead.deleted", handleHotLeadUpdate);
      socket.off("hot_lead_config.updated", handleHotLeadUpdate);
    };
  }, [hotLeadsMode]);

  const handleCellClick = (lead: Lead, columnKey: string, currentValue: any, columnType?: string) => {
    // Check if this is a final value that non-admin users cannot edit
    if (!isAdminUser && isFinalValue(columnKey, currentValue)) {
      toast({
        title: "Value is Locked",
        description: `The value "${currentValue}" is protected. Only Admins can modify final values.`,
        variant: "destructive",
      });
      return;
    }
    
    // Special handling for next_followup_date - open dialog instead of date picker
    if (columnKey === "next_followup_date") {
      setSelectedLeadForNextFollowup(lead);
      setNextFollowupDialogOpen(true);
      return;
    }
    
    setEditingCell({ leadId: lead.id, field: columnKey, originalValue: currentValue });
    // For percentage fields, show the raw number without % symbol
    setEditValue(currentValue || "");
    // Set this row as the active highlighted row
    setHighlightedLeadId(lead.id);
    // Cache the lead data so it persists even if filters would hide it
    // Only update cache if clicking a different row (preserve existing cache for same row)
    if (editingLeadCache?.id !== lead.id) {
      setEditingLeadCache(lead);
    }
    // Automatically open date picker for date and datetime fields
    if (columnType === "date" || columnType === "datetime") {
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

  // Build a list of unique sheet names for filtering in Custom View mode
  const getSheetNamesForFilter = (): string[] => {
    if (!customViewData?.leads || !customViewMode) return [];
    const uniqueNames = new Set<string>();
    for (const lead of customViewData.leads) {
      if (lead.sheet_name) {
        uniqueNames.add(lead.sheet_name.trim());
      }
    }
    return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b));
  };

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      // Default to descending (newest/highest first) when switching to a new column
      setSortDirection("desc");
    }
  };

  // Get value from lead's custom_fields (or sheet name for multi-mode, or system fields)
  const getLeadValue = (lead: Lead, columnKey: string) => {
    if (columnKey === "__sheet_name__") {
      return sheetNamesMap[lead.sheet_id] || "Unknown";
    }
    // Handle system columns that are direct properties on the lead object
    if (columnKey === "created_at") {
      return lead.created_at;
    }
    if (columnKey === "attended_at") {
      return lead.attended_at;
    }
    // Handle AI rating column - returns the rating category for filtering
    if (columnKey === "ai_rating") {
      return lead.ai_rating || "New";
    }
    return lead.custom_fields[columnKey];
  };

  // Sync column preferences into local state when loaded or sheet/custom view changes
  useEffect(() => {
    // Skip sync if user is actively resizing or mutation is in progress
    // This prevents the newly set widths from being overwritten by stale/refetched data
    if (isResizingOrSaving.current) {
      return;
    }
    // Always sync preferences from backend (could be empty object for sheets without saved prefs)
    setColumnWidths(columnPreferences);
  }, [columnPreferences, sheetId, customViewId]);

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    hasMovedRef.current = false;
    isResizingOrSaving.current = true; // Block preference sync during resize
    
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
    
    setColumnWidths(prev => {
      const updated = {
        ...prev,
        [resizingColumn]: newWidth
      };
      // Keep ref in sync for handleResizeEnd to access latest values
      columnWidthsRef.current = updated;
      return updated;
    });
  }, [resizingColumn]);

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn && hasMovedRef.current) {
      // Use ref to get latest column widths (avoids stale closure issue)
      const latestWidths = columnWidthsRef.current;
      const newWidth = latestWidths[resizingColumn];
      // Only save if we have a valid width (use explicit numeric check, not truthiness)
      if (Number.isFinite(newWidth) && newWidth >= 60) {
        // Filter to only include defined widths in the payload
        const updatedPreferences: Record<string, number> = {};
        Object.entries(latestWidths).forEach(([key, value]) => {
          if (Number.isFinite(value) && value >= 60) {
            updatedPreferences[key] = value;
          }
        });
        saveColumnPreferencesMutation.mutate(updatedPreferences);
      }
    }
    setResizingColumn(null);
    hasMovedRef.current = false;
  }, [resizingColumn, saveColumnPreferencesMutation]);

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
  // Memoize to prevent re-creating array on every render (fixes filter input focus loss)
  const baseColumns = useMemo(() => {
    const customCols = [...customColumns]
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
    
    // Check which system columns already exist in customCols to avoid duplicates
    const existingKeys = new Set(customCols.map(c => c.key));
    const systemColumnsToAdd: typeof customCols = [];
    
    // Add created_at as a system column with datetime type for filtering (if not already present)
    if (!existingKeys.has("created_at")) {
      systemColumnsToAdd.push({
        key: "created_at",
        label: "Created Date",
        width: getColumnWidth("created_at", "datetime"),
        sortable: true,
        dropdown: false,
        type: "datetime" as const,
        config: {},
      });
    }
    
    // Add attended_at as a system column with datetime type for filtering (if not already present)
    if (!existingKeys.has("attended_at")) {
      systemColumnsToAdd.push({
        key: "attended_at",
        label: "Attended At",
        width: getColumnWidth("attended_at", "datetime"),
        sortable: true,
        dropdown: false,
        type: "datetime" as const,
        config: {},
      });
    }
    
    // Add AI Insights as a system column for AI-powered lead quality rating
    if (!existingKeys.has("ai_rating")) {
      systemColumnsToAdd.push({
        key: "ai_rating",
        label: "AI Insights",
        width: "100px",
        sortable: true,
        dropdown: true,
        type: "dropdown" as const, // Use dropdown for filtering support
        config: {
          dropdown_options: ["New", "Hot", "Warm", "Neutral", "Cold", "Poor"],
          is_ai_rating: true, // Mark as AI rating column for special rendering
        },
      });
    }
    
    return [...customCols, ...systemColumnsToAdd];
  }, [customColumns, columnWidths]);

  // Add Sheet column as first column in multi-mode
  // Memoize to keep stable reference when only filters change
  const columns = useMemo(() => {
    return isMultiMode
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
  }, [baseColumns, isMultiMode]);

  // Apply custom column ordering (only in single-sheet mode)
  const orderedColumns = useMemo(() => {
    if (isMultiMode || customColumnOrder.length === 0) {
      return columns;
    }
    
    // Create a map for quick lookup
    const columnMap = new Map(columns.map(col => [col.key, col]));
    
    // Build ordered array from custom order, then append any new columns not in the order
    // IMPORTANT: Skip duplicate keys in customColumnOrder to prevent duplicate columns
    const orderedArr: typeof columns = [];
    const usedKeys = new Set<string>();
    
    for (const key of customColumnOrder) {
      // Skip if this key was already added (prevents duplicates in saved order)
      if (usedKeys.has(key)) {
        continue;
      }
      const col = columnMap.get(key);
      if (col) {
        orderedArr.push(col);
        usedKeys.add(key);
      }
    }
    
    // Append any columns not in custom order
    for (const col of columns) {
      if (!usedKeys.has(col.key)) {
        orderedArr.push(col);
      }
    }
    
    return orderedArr;
  }, [columns, customColumnOrder, isMultiMode]);

  // Handle column drag end
  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = orderedColumns.findIndex((col) => col.key === active.id);
      const newIndex = orderedColumns.findIndex((col) => col.key === over.id);
      
      const newOrder = arrayMove(orderedColumns.map(c => c.key), oldIndex, newIndex);
      setCustomColumnOrder(newOrder);
      
      // Save to backend
      saveUserSheetViewMutation.mutate({
        columnOrder: newOrder,
        hiddenColumns: Array.from(hiddenColumns),
      });
    }
  };

  // Evaluate if a lead should be hidden based on user row filters
  const evaluateRowFilters = useCallback((lead: Lead): boolean => {
    // Get active filters only
    const activeFilters = userRowFilters.filter(f => f.is_active);
    if (activeFilters.length === 0) return true; // No filters = show all

    // For each active filter, check if the lead matches the filter's conditions
    // If a lead matches ANY active filter's conditions, it should be hidden
    for (const filter of activeFilters) {
      const conditions = filter.conditions as RowFilterCondition[];
      const logicOperator = filter.logic_operator; // "AND" or "OR"
      
      let filterMatches: boolean;
      
      if (logicOperator === "AND") {
        // All conditions must match
        filterMatches = conditions.every(condition => {
          const leadValue = getLeadValue(lead, condition.column_key);
          return evaluateCondition(leadValue, condition.operator, condition.value);
        });
      } else {
        // Any condition must match (OR)
        filterMatches = conditions.some(condition => {
          const leadValue = getLeadValue(lead, condition.column_key);
          return evaluateCondition(leadValue, condition.operator, condition.value);
        });
      }
      
      // If this filter's conditions match, hide the lead
      if (filterMatches) return false;
    }
    
    // No filters matched, show the lead
    return true;
  }, [userRowFilters]);

  // Helper function to evaluate a single condition
  const evaluateCondition = (cellValue: any, operator: string, filterValue: any): boolean => {
    const cellStr = String(cellValue ?? "").toLowerCase();
    const filterStr = String(filterValue ?? "").toLowerCase();
    
    switch (operator) {
      case "equals":
        return cellStr === filterStr;
      case "not_equals":
        return cellStr !== filterStr;
      case "contains":
        return cellStr.includes(filterStr);
      case "not_contains":
        return !cellStr.includes(filterStr);
      case "starts_with":
        return cellStr.startsWith(filterStr);
      case "ends_with":
        return cellStr.endsWith(filterStr);
      case "is_empty":
        return cellStr === "" || cellValue === null || cellValue === undefined;
      case "is_not_empty":
        return cellStr !== "" && cellValue !== null && cellValue !== undefined;
      case "greater_than": {
        const numCell = parseFloat(String(cellValue));
        const numFilter = parseFloat(String(filterValue));
        return !isNaN(numCell) && !isNaN(numFilter) && numCell > numFilter;
      }
      case "less_than": {
        const numCell = parseFloat(String(cellValue));
        const numFilter = parseFloat(String(filterValue));
        return !isNaN(numCell) && !isNaN(numFilter) && numCell < numFilter;
      }
      case "greater_or_equal": {
        const numCell = parseFloat(String(cellValue));
        const numFilter = parseFloat(String(filterValue));
        return !isNaN(numCell) && !isNaN(numFilter) && numCell >= numFilter;
      }
      case "less_or_equal": {
        const numCell = parseFloat(String(cellValue));
        const numFilter = parseFloat(String(filterValue));
        return !isNaN(numCell) && !isNaN(numFilter) && numCell <= numFilter;
      }
      case "between": {
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length !== 2) return false;
        const numCell = parseFloat(String(cellValue));
        const [min, max] = filterValue.map((v: any) => parseFloat(String(v)));
        return !isNaN(numCell) && !isNaN(min) && !isNaN(max) && numCell >= min && numCell <= max;
      }
      case "before": {
        try {
          const dateCell = new Date(cellValue);
          const dateFilter = new Date(filterValue);
          return dateCell < dateFilter;
        } catch {
          return false;
        }
      }
      case "after": {
        try {
          const dateCell = new Date(cellValue);
          const dateFilter = new Date(filterValue);
          return dateCell > dateFilter;
        } catch {
          return false;
        }
      }
      default:
        return false;
    }
  };

  // Helper function to resolve relative dates to a date range (from/to) - timezone aware
  // Note: timezone-aware utilities (getCurrentDate, getStartOfDay, etc.) are now extracted from useCompanyTimezone at the top of the component
  const resolveRelativeDateRange = useCallback((relativeDate: string): { from: Date; to: Date } => {
    const today = getCurrentDate();
    const todayStart = getStartOfDay(today);
    const todayEnd = getEndOfDay(today);

    switch (relativeDate) {
      case "today":
        return { from: todayStart, to: todayEnd };
      case "tomorrow": {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { from: getStartOfDay(tomorrow), to: getEndOfDay(tomorrow) };
      }
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: getStartOfDay(yesterday), to: getEndOfDay(yesterday) };
      }
      case "this_week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { from: getStartOfDay(startOfWeek), to: getEndOfDay(endOfWeek) };
      }
      case "last_week": {
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return { from: getStartOfDay(lastWeekStart), to: getEndOfDay(lastWeekEnd) };
      }
      case "next_week": {
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        return { from: getStartOfDay(nextWeekStart), to: getEndOfDay(nextWeekEnd) };
      }
      case "this_month": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: getStartOfDay(startOfMonth), to: getEndOfDay(endOfMonth) };
      }
      case "last_month": {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: getStartOfDay(lastMonthStart), to: getEndOfDay(lastMonthEnd) };
      }
      case "next_month": {
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        return { from: getStartOfDay(nextMonthStart), to: getEndOfDay(nextMonthEnd) };
      }
      default:
        return { from: todayStart, to: todayEnd };
    }
  }, [getCurrentDate, getStartOfDay, getEndOfDay]);

  // Helper to parse date values consistently (matches highlighting-evaluator pattern)
  // For date-only strings like "2025-12-15", we parse them as noon UTC to avoid
  // timezone edge cases where different browser timezones would create different dates
  const parseDateValue = useCallback((value: any): Date | null => {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return value;
    
    const strValue = String(value);
    
    // Check if this is a date-only string (YYYY-MM-DD format without time)
    const dateOnlyMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      // Parse date-only strings at noon UTC to avoid timezone boundary issues
      // This ensures "2025-12-15" always represents December 15 regardless of browser timezone
      const [, year, month, day] = dateOnlyMatch;
      const utcDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0));
      return isValid(utcDate) ? utcDate : null;
    }
    
    // For full ISO strings with time, use parseISO as before
    const date = parseISO(strValue);
    return isValid(date) ? date : null;
  }, []);

  // Evaluate a single quick filter condition against a lead (supports relative dates)
  // Uses the same timezone-aware utilities as highlighting rules for consistency
  const evaluateQuickFilterCondition = useCallback((
    lead: Lead,
    condition: { column_key: string; operator: string; value?: any; relative_date?: string }
  ): boolean => {
    const cellValue = getLeadValue(lead, condition.column_key);
    const { operator, value, relative_date } = condition;
    
    // Handle date operators with relative date support
    if (operator.startsWith("date_") || operator === "before" || operator === "after") {
      // Parse the cell value using the same method as highlighting evaluator
      const cellDate = parseDateValue(cellValue);
      if (!cellDate) return false;
      
      // For simple "today" comparisons, use the timezone-aware utilities directly
      // This matches the behavior of highlighting rules
      if (relative_date === "today") {
        switch (operator) {
          case "date_equals":
            return isSameDay(cellDate, getCurrentDate());
          case "date_before":
          case "before":
            return isBeforeToday(cellDate);
          case "date_after":
          case "after":
            return isAfterToday(cellDate);
          case "date_within":
            return isSameDay(cellDate, getCurrentDate());
        }
      }
      
      // For other relative dates or specific dates, use range comparison
      // Get date range (timezone-aware)
      let dateRange: { from: Date; to: Date };
      if (relative_date) {
        dateRange = resolveRelativeDateRange(relative_date);
      } else if (value) {
        const specificDate = parseDateValue(value);
        if (!specificDate) return false;
        // Use timezone-aware start/end of day
        dateRange = { 
          from: getStartOfDay(specificDate), 
          to: getEndOfDay(specificDate) 
        };
      } else {
        return false;
      }
      
      // Normalize cell date to start of day in timezone for comparison
      const cellDateStart = getStartOfDay(cellDate);
      
      switch (operator) {
        case "date_equals":
          // Date equals: cell date's day falls within the range
          return cellDateStart.getTime() >= dateRange.from.getTime() && 
                 cellDateStart.getTime() <= dateRange.to.getTime();
        case "date_before":
        case "before":
          // Before: cell date's day is before the start of the range
          return cellDateStart.getTime() < dateRange.from.getTime();
        case "date_after":
        case "after":
          // After: cell date's day is after the end of the range
          return cellDateStart.getTime() > dateRange.to.getTime();
        case "date_within":
          // Within: cell date falls within the range
          return cellDateStart.getTime() >= dateRange.from.getTime() && 
                 cellDateStart.getTime() <= dateRange.to.getTime();
        default:
          return false;
      }
    }
    
    // For non-date operators, use the existing evaluateCondition
    return evaluateCondition(cellValue, operator, value);
  }, [parseDateValue, resolveRelativeDateRange, getStartOfDay, getEndOfDay, getCurrentDate, isSameDay, isBeforeToday, isAfterToday]);

  // Evaluate all quick filter conditions against a lead
  // Uses per-condition next_operator for sequential evaluation (supports mixed AND/OR)
  const evaluateQuickFilter = useCallback((lead: Lead): boolean => {
    if (!activeQuickFilterConfig) return true; // No filter = show all
    
    const { conditions, logical_operator } = activeQuickFilterConfig;
    if (!conditions || conditions.length === 0) return true;
    
    // Evaluate first condition
    let result = evaluateQuickFilterCondition(lead, conditions[0]);
    
    // Sequentially evaluate remaining conditions using each condition's next_operator
    for (let i = 1; i < conditions.length; i++) {
      // Use the previous condition's next_operator, falling back to logical_operator or 'and'
      const op = (conditions[i - 1] as any).next_operator || logical_operator || 'and';
      const currentResult = evaluateQuickFilterCondition(lead, conditions[i]);
      result = op === 'or' ? result || currentResult : result && currentResult;
    }
    
    return result;
  }, [activeQuickFilterConfig, evaluateQuickFilterCondition]);

  // Server handles filtering/sorting for both modes now
  // Only apply user row filters (Hide/Show Rows) client-side as they're per-user settings
  // Also apply quick filter conditions client-side when OR logic is used
  const filteredAndSortedLeads = useMemo(() => {
    // First apply standard filtering
    const filtered = leads.filter((lead) => {
      // User row filters - hide rows that match any active filter (client-side only)
      if (!evaluateRowFilters(lead)) {
        return false;
      }
      // Quick filter evaluation (for OR logic support)
      if (!evaluateQuickFilter(lead)) {
        return false;
      }
      return true;
    });
    
    // If there's an editing lead cached and it's not in the filtered results, inject it
    // This ensures the row stays visible while being edited even if filters would hide it
    if (editingLeadCache && highlightedLeadId === editingLeadCache.id) {
      const isInFilteredResults = filtered.some(lead => lead.id === editingLeadCache.id);
      if (!isInFilteredResults) {
        // Inject the cached lead at the beginning so it's always visible
        return [editingLeadCache, ...filtered];
      }
    }
    
    return filtered;
  }, [leads, evaluateRowFilters, evaluateQuickFilter, editingLeadCache, highlightedLeadId]);

  // Sync editingLeadCache with latest data from server (websocket updates trigger query refetch)
  // This ensures the pinned row shows fresh data when the backend updates
  useEffect(() => {
    if (editingLeadCache && highlightedLeadId === editingLeadCache.id) {
      // Look for the updated version of this lead in the leads array
      const updatedLead = leads.find(lead => lead.id === editingLeadCache.id);
      if (updatedLead) {
        // Compare entire lead objects to catch all field changes (not just custom_fields)
        // Using JSON stringify for deep comparison - includes all rendered fields
        const cachedStr = JSON.stringify(editingLeadCache);
        const updatedStr = JSON.stringify(updatedLead);
        if (cachedStr !== updatedStr) {
          setEditingLeadCache(updatedLead);
        }
      }
    }
  }, [leads, editingLeadCache, highlightedLeadId]);

  // Use ordered columns for visible columns (respecting user's custom order)
  // Memoize to keep stable reference when only filters change (fixes filter input focus loss)
  const visibleColumns = useMemo(() => {
    return orderedColumns.filter((col) => !hiddenColumns.has(col.key));
  }, [orderedColumns, hiddenColumns]);

  // Memoize column keys for SortableContext to prevent re-renders on filter changes
  const visibleColumnKeys = useMemo(() => {
    return visibleColumns.map(c => c.key);
  }, [visibleColumns]);

  // Memoize grid template style to prevent header re-renders on filter changes
  // First column (140px): Checkbox + Edit + History icons (size="icon" = 36px each)
  // Last column (50px): Actions dropdown menu only
  const gridTemplateStyle = useMemo(() => {
    return `140px ${visibleColumns.map(c => c.width).join(' ')} 50px`;
  }, [visibleColumns]);

  // Calculate total table width: first col (140px) + all visible columns + actions (50px)
  const calculateTableWidth = () => {
    const firstColumnWidth = 140; // Checkbox + Edit + History
    const actionsWidth = 50; // Just dropdown menu
    const columnsWidth = visibleColumns.reduce((sum, col) => {
      return sum + parseInt(col.width);
    }, 0);
    return firstColumnWidth + columnsWidth + actionsWidth;
  };

  // Infinite scroll handler - load more when near bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Trigger loading when 80% scrolled
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener for desktop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Mobile scroll handler - same logic but for mobile container + hide/show filter on scroll
  const handleMobileScroll = useCallback(() => {
    const container = mobileContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    
    // Hide filter row on scroll down, show on scroll up
    const scrollDelta = scrollTop - lastScrollTop.current;
    if (scrollDelta > 10 && scrollTop > 50) {
      setMobileFilterHidden(true);
    } else if (scrollDelta < -10 || scrollTop < 20) {
      setMobileFilterHidden(false);
    }
    lastScrollTop.current = scrollTop;
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener for mobile (depends on isMobile to re-attach when view changes)
  useEffect(() => {
    if (!isMobile) return; // Only attach when in mobile view
    
    const container = mobileContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleMobileScroll);
    return () => container.removeEventListener('scroll', handleMobileScroll);
  }, [handleMobileScroll, isMobile]);

  // Toggle column visibility and save to backend
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      
      // Save to backend (only in single-sheet mode)
      if (!isMultiMode && activeSheetId) {
        saveUserSheetViewMutation.mutate({
          columnOrder: customColumnOrder.length > 0 ? customColumnOrder : orderedColumns.map(c => c.key),
          hiddenColumns: Array.from(next),
        });
      }
      
      return next;
    });
  }, [isMultiMode, activeSheetId, customColumnOrder, orderedColumns, saveUserSheetViewMutation]);

  // Pass column visibility config to dashboard context for sidebar
  useEffect(() => {
    if (!isMultiMode && orderedColumns.length > 0) {
      setColumnVisibilityConfig({
        columns: orderedColumns.map(col => ({ key: col.key, label: col.label })),
        hiddenColumns,
        toggleColumn: toggleColumnVisibility,
      });
    } else if (isMultiMode) {
      setColumnVisibilityConfig(null);
    }
    return () => {
      setColumnVisibilityConfig(null);
    };
  }, [orderedColumns, hiddenColumns, isMultiMode, setColumnVisibilityConfig, toggleColumnVisibility]);

  // Quick filter handlers - comprehensive implementation supporting all operators and logical operations
  const applyQuickFilter = useCallback((filterId: string, filterConfig: any) => {
    // Always start with clean filter state to prevent interference between filter modes
    setColumnFilters({});
    setActiveQuickFilterConfig(null);
    
    if (!filterConfig || !filterConfig.conditions || filterConfig.conditions.length === 0) {
      // Empty filter - mark as active but no filtering
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
        
        case "last_week": {
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
          lastWeekEnd.setHours(23, 59, 59, 999);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
          lastWeekStart.setHours(0, 0, 0, 0);
          return { from: lastWeekStart, to: lastWeekEnd };
        }
        
        case "last_month": {
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          lastMonthEnd.setHours(23, 59, 59, 999);
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return { from: lastMonthStart, to: lastMonthEnd };
        }
        
        case "last_7_days": {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return { from: sevenDaysAgo, to: endOfDay };
        }
        
        case "last_30_days": {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return { from: thirtyDaysAgo, to: endOfDay };
        }
        
        case "last_90_days": {
          const ninetyDaysAgo = new Date(today);
          ninetyDaysAgo.setDate(today.getDate() - 90);
          return { from: ninetyDaysAgo, to: endOfDay };
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
          if (relative_date) {
            const dateRange = getRelativeDate(relative_date);
            if (dateRange) {
              // Subtract 1ms from the start to create exclusive upper bound
              const beforeBound = new Date(dateRange.from.getTime() - 1);
              newFilters[column_key] = {
                type: "custom",
                from: new Date(0), // Beginning of time
                to: beforeBound, // Before the start of the relative date range (exclusive)
              };
            }
          } else if (value) {
            const beforeDate = new Date(value);
            beforeDate.setHours(0, 0, 0, 0);
            // Subtract 1ms to create exclusive upper bound
            const beforeBound = new Date(beforeDate.getTime() - 1);
            newFilters[column_key] = {
              type: "custom",
              from: new Date(0), // Beginning of time
              to: beforeBound,
            };
          }
          break;

        case "date_after":
          if (relative_date) {
            const dateRange = getRelativeDate(relative_date);
            if (dateRange) {
              // Add 1ms to the end to create exclusive lower bound
              const afterBound = new Date(dateRange.to.getTime() + 1);
              newFilters[column_key] = {
                type: "custom",
                from: afterBound, // After the end of the relative date range (exclusive)
                to: new Date(2100, 0, 1), // Far future
              };
            }
          } else if (value) {
            const afterDate = new Date(value);
            afterDate.setHours(23, 59, 59, 999);
            // Add 1ms to create exclusive lower bound
            const afterBound = new Date(afterDate.getTime() + 1);
            newFilters[column_key] = {
              type: "custom",
              from: afterBound,
              to: new Date(2100, 0, 1), // Far future
            };
          }
          break;
        
        case "date_not_equals":
          // For not equals, we can't easily do this with the current filter system
          // This would require excluding a specific date range, which column filters don't support
          if (relative_date || value) {
            unsupportedOperators.push(`date_not_equals on ${column_key}`);
          }
          break;

        case "date_within":
          // Date within a relative period (e.g., "within this week", "within last 30 days")
          // or within a custom date range
          if (relative_date) {
            const dateRange = getRelativeDate(relative_date);
            if (dateRange) {
              newFilters[column_key] = {
                type: "custom",
                from: dateRange.from,
                to: dateRange.to,
              };
            }
          } else if (value && typeof value === "object" && value.from) {
            // Custom date range - works like date_between
            const fromDate = new Date(value.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = value.to ? new Date(value.to) : new Date(value.from);
            toDate.setHours(23, 59, 59, 999);
            newFilters[column_key] = {
              type: "custom",
              from: fromDate,
              to: toDate,
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
      setActiveQuickFilterConfig(null);
      toast({
        title: "Columns not found",
        description: `The following columns are missing: ${missingColumns.join(", ")}. Please add them to use this filter.`,
        variant: "destructive",
      });
      return;
    }

    // Check if OR logic is needed (multiple conditions on same column or explicit OR)
    const hasOrLogic = filterConfig.logical_operator === "or";
    const hasSameColumnConditions = filterConfig.conditions.length > 1 && 
      new Set(filterConfig.conditions.map((c: any) => c.column_key)).size < filterConfig.conditions.length;
    const useClientSideFiltering = hasOrLogic || hasSameColumnConditions;

    if (useClientSideFiltering) {
      // Use client-side filtering for OR logic or same-column conditions
      // (columnFilters already cleared at start of function)
      setActiveQuickFilterConfig({
        conditions: filterConfig.conditions.map((c: any) => ({
          column_key: c.column_key,
          operator: c.operator,
          value: c.value,
          relative_date: c.relative_date,
          next_operator: c.next_operator,
        })),
        logical_operator: hasOrLogic ? "or" : "and",
      });
    } else {
      // Use server-side filtering for simple AND logic
      // (activeQuickFilterConfig already cleared at start of function)
      setColumnFilters(newFilters);
    }
    
    setActiveQuickFilter(filterId);

    // Show warnings AFTER applying filters (non-blocking)
    if (unsupportedOperators.length > 0 && !useClientSideFiltering) {
      toast({
        title: "Some filter conditions skipped",
        description: `The following operators are not supported: ${unsupportedOperators.slice(0, 3).join(", ")}${unsupportedOperators.length > 3 ? ` and ${unsupportedOperators.length - 3} more` : ""}. Supported conditions have been applied.`,
        variant: "default",
      });
    }
  }, [customColumns, setActiveQuickFilter, setColumnFilters, toast]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setActiveQuickFilterConfig(null);
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

  // Only show full skeleton on initial load (when columns are not yet loaded)
  // Once columns are loaded, the header stays mounted and only rows show loading state
  if (isInitialLoading) {
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
      {/* Update Dialogs - Using key prop to force complete remount when lead changes */}
      {/* This ensures each dialog instance is completely fresh with no stale state */}
      {selectedLeadForUpdate && (
        <>
          <LeadUpdateDialog
            key={`update-dialog-${selectedLeadForUpdate}`}
            leadId={selectedLeadForUpdate}
            sheetId={leads.find(l => l.id === selectedLeadForUpdate)?.sheet_id || activeSheetId}
            open={updateDialogOpen}
            onOpenChange={(open) => {
              setUpdateDialogOpen(open);
              // Clear the selected lead when dialog closes to ensure clean state
              if (!open) {
                setSelectedLeadForUpdate(null);
              }
            }}
          />
          <LeadUpdateHistoryDialog
            key={`history-dialog-${selectedLeadForUpdate}`}
            leadId={selectedLeadForUpdate}
            open={updateHistoryDialogOpen}
            onOpenChange={(open) => {
              setUpdateHistoryDialogOpen(open);
              if (open) {
                // Clear any pending timeout when reopening
                if (highlightTimeoutRef.current) {
                  clearTimeout(highlightTimeoutRef.current);
                  highlightTimeoutRef.current = null;
                }
                // Set highlight for current lead
                setHighlightedLeadId(selectedLeadForUpdate);
              } else {
                // Clear the selected lead when dialog closes
                // Keep highlightedLeadId - it will persist until user edits another row
                setSelectedLeadForUpdate(null);
              }
            }}
          />
        </>
      )}
      {selectedLeadForNextFollowup && (
        <NextFollowupDateDialog
          key={`next-followup-dialog-${selectedLeadForNextFollowup.id}`}
          leadId={selectedLeadForNextFollowup.id}
          lead={selectedLeadForNextFollowup}
          sheetId={activeSheetId || undefined}
          currentDate={selectedLeadForNextFollowup.custom_fields?.next_followup_date || null}
          open={nextFollowupDialogOpen}
          onOpenChange={(open) => {
            setNextFollowupDialogOpen(open);
            if (!open) {
              setSelectedLeadForNextFollowup(null);
            }
          }}
          onSave={handleNextFollowupDateSave}
        />
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
          validationRules={validationRules}
        />
      )}
      
      {/* Transition Explanation Dialog */}
      {pendingTransition && (
        <TransitionExplanationDialog
          open={transitionExplanationDialogOpen}
          onOpenChange={(open) => {
            setTransitionExplanationDialogOpen(open);
            if (!open) setPendingTransition(null);
          }}
          leadId={pendingTransition.leadId}
          columnName={pendingTransition.columnName}
          columnKey={pendingTransition.columnKey}
          oldValue={pendingTransition.oldValue}
          newValue={pendingTransition.newValue}
          customFields={pendingTransition.customFields}
          queryKeysToInvalidate={[
            ["/api/sheets", activeSheetId, "leads-infinite"],
            ["/api/leads/query-infinite"],
            ...(customViewId ? [["/api/custom-views", customViewId, "leads"]] : []),
          ]}
          hotLeadsMode={hotLeadsMode}
          customViewMode={customViewMode}
          isMultiMode={isMultiMode}
          activeSheetId={activeSheetId}
          customViewId={customViewId}
          onComplete={() => {
            setPendingTransition(null);
          }}
        />
      )}

      {/* Validation Prompt Dialog */}
      {pendingValidation && (
        <ValidationPromptDialog
          open={validationDialogOpen}
          onOpenChange={(open) => {
            setValidationDialogOpen(open);
            if (!open) setPendingValidation(null);
          }}
          rule={pendingValidation.rule}
          columns={customColumns.map(c => ({
            id: c.id || c.column_key,
            column_key: c.column_key,
            name: c.name || c.column_key,
            type: c.type || "text",
            company_id: c.company_id || "",
            order_index: c.order_index || 0,
            is_system: false,
            created_at: "",
            updated_at: "",
          })) as any}
          dropdownOptions={customColumns.reduce((acc, col) => {
            if (col.type === "dropdown" && col.config?.dropdown_options) {
              const hiddenSystemValues = col.config?.hidden_system_values || [];
              // Filter out hidden system values for validation prompts
              const visibleOptions = col.config.dropdown_options.filter(
                (opt: string) => !hiddenSystemValues.includes(opt)
              );
              acc[col.column_key] = visibleOptions.map((opt: string, idx: number) => ({
                id: `${col.column_key}-${idx}`,
                value: opt,
                column_key: col.column_key,
                company_id: "",
                sheet_id: null,
                order_index: idx,
                created_at: "",
                updated_at: "",
              }));
            }
            return acc;
          }, {} as Record<string, any[]>)}
          currentValues={pendingValidation.lead.custom_fields || {}}
          triggerChange={{
            column_key: pendingValidation.columnKey,
            old_value: pendingValidation.oldValue,
            new_value: pendingValidation.newValue,
          }}
          onConfirm={(fieldValues) => {
            const updatedFields = {
              ...pendingValidation.lead.custom_fields,
              [pendingValidation.columnKey]: pendingValidation.newValue,
              ...fieldValues,
            };
            updateLeadMutation.mutate({
              leadId: pendingValidation.leadId,
              customFields: updatedFields,
            });
            setValidationDialogOpen(false);
            setPendingValidation(null);
          }}
          onCancel={() => {
            setValidationDialogOpen(false);
            setPendingValidation(null);
          }}
        />
      )}

      {/* Final Value Confirmation Dialog */}
      <AlertDialog open={finalValueConfirmOpen} onOpenChange={setFinalValueConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Confirm Final Value
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to set <strong>{pendingFinalValue?.columnName}</strong> to{" "}
                  <strong className="text-amber-600 dark:text-amber-400">"{pendingFinalValue?.newValue}"</strong>.
                </p>
                <p className="text-amber-600 dark:text-amber-400">
                  This value is protected and will be locked once set. Regular users will not be able to change it afterwards.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setFinalValueConfirmOpen(false);
                setPendingFinalValue(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingFinalValue) {
                  let updatedFields = {
                    ...pendingFinalValue.customFields,
                    [pendingFinalValue.columnKey]: pendingFinalValue.newValue,
                  };
                  
                  // Apply auto-fill rules
                  applyAutoFillRules(
                    pendingFinalValue.columnKey,
                    pendingFinalValue.newValue,
                    updatedFields,
                    (autoFillUpdates) => {
                      updatedFields = { ...updatedFields, ...autoFillUpdates };
                    },
                    { showToast: true }
                  );
                  
                  updateLeadMutation.mutate({
                    leadId: pendingFinalValue.leadId,
                    customFields: updatedFields,
                  });
                }
                setFinalValueConfirmOpen(false);
                setPendingFinalValue(null);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Confirm & Lock Value
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Override Confirmation Dialog (for changing AWAY from final values) */}
      <AlertDialog open={adminOverrideConfirmOpen} onOpenChange={setAdminOverrideConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Admin Override - Point Reversal
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are changing <strong>{pendingAdminOverride?.columnName}</strong> from{" "}
                  <strong className="text-amber-600 dark:text-amber-400">"{pendingAdminOverride?.oldValue}"</strong> to{" "}
                  <strong className="text-muted-foreground">"{pendingAdminOverride?.newValue}"</strong>.
                </p>
                
                {pendingAdminOverride?.reversalInfo && (pendingAdminOverride.reversalInfo.pendingPointsTotal > 0 || pendingAdminOverride.reversalInfo.awardedPointsTotal > 0) ? (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 space-y-2">
                    <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      PowerScore Points Will Be Affected
                    </p>
                    
                    {pendingAdminOverride.reversalInfo.awardedPointsTotal > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>{pendingAdminOverride.reversalInfo.awardedPointsTotal} points</strong> will be <strong>deducted</strong> from users
                      </p>
                    )}
                    
                    {pendingAdminOverride.reversalInfo.pendingPointsTotal > 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>{pendingAdminOverride.reversalInfo.pendingPointsTotal} pending points</strong> will be <strong>cancelled</strong> (not yet awarded)
                      </p>
                    )}
                    
                    {pendingAdminOverride.reversalInfo.pendingApprovals.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-amber-600 dark:text-amber-400">Pending Approvals to Cancel (not yet awarded):</p>
                        <ul className="list-disc list-inside text-amber-500 dark:text-amber-400">
                          {pendingAdminOverride.reversalInfo.pendingApprovals.map((a, i) => (
                            <li key={i}>{a.userName || 'User'}: {a.points} pts ({a.description})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {pendingAdminOverride.reversalInfo.awardedTransactions.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-red-600 dark:text-red-400">Awarded Points to Deduct:</p>
                        <ul className="list-disc list-inside text-red-500 dark:text-red-400">
                          {pendingAdminOverride.reversalInfo.awardedTransactions.map((t, i) => (
                            <li key={i}>{t.userName || 'User'}: -{t.points} pts ({t.description})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {pendingAdminOverride.reversalInfo.awardedPointsTotal > 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                        Deducted points will affect PowerScore Leaderboard rankings.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No PowerScore points are associated with this change.
                  </p>
                )}
                
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  This is an admin override of a protected value.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAdminOverrideConfirmOpen(false);
                setPendingAdminOverride(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAdminOverride) {
                  let updatedFields = {
                    ...pendingAdminOverride.customFields,
                    [pendingAdminOverride.columnKey]: pendingAdminOverride.newValue,
                  };
                  
                  applyAutoFillRules(
                    pendingAdminOverride.columnKey,
                    pendingAdminOverride.newValue,
                    updatedFields,
                    (autoFillUpdates) => {
                      updatedFields = { ...updatedFields, ...autoFillUpdates };
                    },
                    { showToast: true }
                  );
                  
                  updateLeadMutation.mutate({
                    leadId: pendingAdminOverride.leadId,
                    customFields: updatedFields,
                  });
                }
                setAdminOverrideConfirmOpen(false);
                setPendingAdminOverride(null);
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-confirm-admin-override"
            >
              {pendingAdminOverride?.reversalInfo?.awardedPointsTotal 
                ? `Confirm & Deduct ${pendingAdminOverride.reversalInfo.awardedPointsTotal} Points`
                : pendingAdminOverride?.reversalInfo?.pendingPointsTotal
                  ? `Confirm & Cancel ${pendingAdminOverride.reversalInfo.pendingPointsTotal} Pending Points`
                  : "Confirm Override"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toolbar with actions - only render when selections exist */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
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
                tomorrow: "Tomorrow",
                thisWeek: "This Week", 
                thisMonth: "This Month",
                last7Days: "Last 7 Days",
                last30Days: "Last 30 Days",
                custom: "Custom",
              };
              return `${col?.label || key}: ${typeLabels[value.type] || value.type}`;
            }
            return "";
          };

          return (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Mobile Filter Header - Compact with hide on scroll */}
              <div 
                className={`flex-shrink-0 pb-2 transition-all duration-200 ${mobileFilterHidden ? 'max-h-0 opacity-0 overflow-hidden pb-0' : 'max-h-24 opacity-100'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground font-medium" data-testid="text-mobile-leads-count">
                      {leads.length}/{totalLeads}
                    </span>
                    {sortColumn && (
                      <Badge 
                        variant="outline" 
                        className="text-xs flex items-center gap-0.5 h-5 px-1.5"
                      >
                        {columns.find(c => c.key === sortColumn)?.label?.slice(0, 8) || sortColumn.slice(0, 8)}
                        {sortDirection === "asc" ? "↑" : "↓"}
                        <X 
                          className="h-3 w-3 ml-0.5 cursor-pointer" 
                          onClick={() => { setSortColumn(null); setSortDirection("asc"); }}
                        />
                      </Badge>
                    )}
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {hasActiveFiltersOrSort && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-xs text-muted-foreground"
                        onClick={() => { setSortColumn(null); setSortDirection("asc"); setColumnFilters({}); }}
                        data-testid="button-clear-all-mobile"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Button
                    variant={hasActiveFiltersOrSort ? "default" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5"
                    onClick={() => setMobileFilterSheetOpen(true)}
                    data-testid="button-mobile-filter"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs">Filter</span>
                    {hasActiveFiltersOrSort && (
                      <Badge variant="secondary" className="ml-0.5 bg-primary-foreground/20 text-xs h-4 px-1">
                        {(sortColumn ? 1 : 0) + activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto" ref={mobileContainerRef}>
                <div className="space-y-2">
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
                    filteredAndSortedLeads.map((lead) => {
                      const mobileLeadThought = lead.meta?.thought as "sure" | "maybe" | undefined;
                      const mobileThoughtClass = mobileLeadThought === "sure" 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800" 
                        : mobileLeadThought === "maybe" 
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800" 
                        : "bg-card";
                      
                      const mobileHighlightResult = evaluateHighlightingRules(highlightingRules, lead, isDarkMode, timezone);
                      
                      const getMobileCardStyle = () => {
                        if (invalidLeadIds.has(lead.id)) return {};
                        if (mobileHighlightResult) {
                          return { backgroundColor: isDarkMode ? mobileHighlightResult.colorDark : mobileHighlightResult.colorLight };
                        }
                        return {};
                      };
                      
                      const getMobileCardClass = () => {
                        // Active row highlight takes priority for border styling
                        const isActiveHighlight = highlightedLeadId === lead.id;
                        const activeClass = isActiveHighlight ? "ring-2 ring-primary ring-inset bg-primary/10" : "";
                        
                        if (invalidLeadIds.has(lead.id)) {
                          return `bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 ${activeClass}`;
                        }
                        if (mobileHighlightResult) {
                          return `border ${activeClass}`;
                        }
                        return `${mobileThoughtClass} ${activeClass}`;
                      };
                      
                      return (
                      <ContextMenu key={lead.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className={`border rounded-lg p-2.5 hover-elevate active-elevate-2 ${getMobileCardClass()}`}
                            style={getMobileCardStyle()}
                            data-testid={`card-lead-${lead.id}`}
                            onClick={() => {
                              setHighlightedLeadId(lead.id);
                              onOpenLeadDetail(lead.id);
                            }}
                            title={invalidLeadIds.has(lead.id) && leadValidationResults.get(lead.id) 
                              ? `Missing required fields: ${leadValidationResults.get(lead.id)?.missingFields.join(', ')}`
                              : mobileHighlightResult
                              ? `Highlighted by rule: ${mobileHighlightResult.ruleName}`
                              : undefined
                            }
                          >
                        {/* Title Row - Name & Phone */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {mobileLeadThought === "sure" && (
                            <Star className="h-4 w-4 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                          )}
                          {mobileLeadThought === "maybe" && (
                            <HelpCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            {titleColumns.map((col, idx) => {
                              const value = getLeadValue(lead, col.key);
                              return value ? (
                                <span key={col.key} className={`text-sm truncate ${idx === 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                                  {value}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                        
                        {/* Detail Row - Compact inline display */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mb-2">
                          {detailColumns.map((col) => {
                            const value = getLeadValue(lead, col.key);
                            const isPastNFDT = leadsWithPastNFDT.get(lead.id)?.includes(col.key);
                            if (value === null || value === undefined || value === "") return null;
                            const displayValue = (col.type === "date" || col.type === "datetime") && value 
                              ? formatInTimezone(value, col.type === "datetime" ? "dd/MM HH:mm" : "dd/MM/yy")
                              : value;
                            return (
                              <span 
                                key={col.key}
                                className={isPastNFDT ? "px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium" : ""}
                                title={`${col.label}: ${displayValue}`}
                              >
                                {displayValue}
                              </span>
                            );
                          })}
                        </div>

                        {/* Compact Action Row - All icon buttons */}
                        <div className="flex items-center gap-1.5 pt-1.5 border-t" onClick={(e) => e.stopPropagation()}>
                          {/* AI Rating Badge */}
                          {lead.ai_rating && lead.ai_rating !== "New" && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs h-6 px-1.5 flex-shrink-0 ${
                                lead.ai_rating === "Hot" ? "text-red-500 border-red-500/30" :
                                lead.ai_rating === "Warm" ? "text-orange-500 border-orange-500/30" :
                                lead.ai_rating === "Neutral" ? "text-yellow-500 border-yellow-500/30" :
                                lead.ai_rating === "Cold" ? "text-blue-500 border-blue-500/30" :
                                "text-gray-500 border-gray-500/30"
                              }`}
                              title={`AI Rating: ${lead.ai_rating}${lead.ai_rating_score ? ` (${lead.ai_rating_score.toFixed(1)}/5)` : ""}`}
                              data-testid={`badge-ai-rating-${lead.id}`}
                            >
                              <Sparkles className="w-3 h-3 mr-0.5" />
                              {lead.ai_rating}
                            </Badge>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadForEdit(lead.id);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-lead-${lead.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (updateDialogOpen) return;
                              if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                              setHighlightedLeadId(lead.id);
                              setSelectedLeadForUpdate(lead.id);
                              setUpdateDialogOpen(true);
                            }}
                            data-testid={`button-update-lead-${lead.id}`}
                            title="Quick Update"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (updateHistoryDialogOpen) return;
                              if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                              setHighlightedLeadId(lead.id);
                              setSelectedLeadForUpdate(lead.id);
                              setUpdateHistoryDialogOpen(true);
                            }}
                            data-testid={`button-update-history-${lead.id}`}
                            title="History"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              const mobileNo = lead.custom_fields?.mobile_no || lead.custom_fields?.mobile || lead.custom_fields?.phone;
                              if (mobileNo) window.location.href = `tel:${mobileNo}`;
                            }}
                            data-testid={`button-call-lead-${lead.id}`}
                            title="Call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
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
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={watchlistSet.has(lead.id) ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOnWatchlist = watchlistSet.has(lead.id);
                              toggleWatchlistMutation.mutate({ leadId: lead.id, isOnWatchlist });
                            }}
                            disabled={toggleWatchlistMutation.isPending}
                            data-testid={`button-watchlist-mobile-${lead.id}`}
                            title={watchlistSet.has(lead.id) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            {watchlistSet.has(lead.id) ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => {
                              const isOnWatchlist = watchlistSet.has(lead.id);
                              toggleWatchlistMutation.mutate({ leadId: lead.id, isOnWatchlist });
                            }}
                            disabled={toggleWatchlistMutation.isPending}
                            data-testid={`context-watchlist-${lead.id}`}
                          >
                            {watchlistSet.has(lead.id) ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Remove from Watchlist
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Add to Watchlist
                              </>
                            )}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      );
                    })
                  )}
                  
                  {/* Mobile Load More / Status Section */}
                  {leads.length > 0 && (
                    <div className="flex items-center justify-center py-3 gap-2">
                      {isFetchingNextPage && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      )}
                      {hasNextPage && !isFetchingNextPage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchNextPage()}
                          data-testid="button-mobile-load-more"
                          className="h-8 text-xs"
                        >
                          Load more
                        </Button>
                      )}
                      {!hasNextPage && leads.length >= totalLeads && (
                        <span className="text-xs text-muted-foreground">
                          All loaded
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        /* Desktop Grid View with Sticky Header */
        <div className="flex flex-col h-full">
          {/* Multi-sheet mode header - hidden for custom views since they show this in their own header */}
          {isMultiMode && !customViewMode && (
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
            <div className="overflow-x-scroll overflow-y-auto flex-1 spreadsheet-scroll-container" ref={containerRef}>
            <div style={{ minWidth: `${calculateTableWidth()}px` }}>
              {/* Sticky Header with Drag and Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <div 
                  className="sticky top-0 z-20 bg-background border-b-2 grid"
                  style={{ 
                    gridTemplateColumns: gridTemplateStyle
                  }}
                >
                  {/* First Column Header - Checkbox + Edit + History (Sticky) */}
                  <div className="border-b border-r px-2 py-3 flex items-center justify-center gap-2 sticky left-0 z-30 bg-background dark:bg-muted">
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
                    <span className="text-xs text-muted-foreground">Actions</span>
                  </div>
                  
                  {/* Column Headers - Sortable */}
                  <SortableContext 
                    items={visibleColumnKeys} 
                    strategy={horizontalListSortingStrategy}
                  >
                    {visibleColumns.map((col) => (
                      <SortableColumnHeader
                        key={col.key}
                        columnKey={col.key}
                        width={col.width}
                        onResizeStart={handleResizeStart}
                        isDraggingEnabled={!isMultiMode}
                      >
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
                            {col.key === "__sheet_name__" && customViewMode ? (
                              <DropdownFilter
                                value={columnFilters[col.key] as string | null}
                                onChange={(value) =>
                                  setColumnFilters((prev) => ({
                                    ...prev,
                                    [col.key]: value,
                                  }))
                                }
                                options={getSheetNamesForFilter()}
                                placeholder="Select sheet..."
                              />
                            ) : (col.type === "date" || col.type === "datetime") ? (
                              <DateRangeFilter
                                value={columnFilters[col.key] as DateFilterValue}
                                onChange={(value) =>
                                  setColumnFilters((prev) => ({
                                    ...prev,
                                    [col.key]: value,
                                  }))
                                }
                                timezone={timezone}
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
                              <DebouncedFilterInput
                                value={(columnFilters[col.key] as string) || ""}
                                onFilterChange={handleColumnFilterChange}
                                columnKey={col.key}
                                onFilterClear={handleColumnFilterClear}
                              />
                            )}
                          </div>
                        </div>
                      </SortableColumnHeader>
                    ))}
                  </SortableContext>
                  
                  {/* Actions Column Header */}
                  <div className="border-b px-3 py-2"></div>
                </div>
              </DndContext>

              {/* Table Body */}
              {/* Show loading state while fetching leads (after initial load) */}
              {isFetchingLeads && filteredAndSortedLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Loading leads...</span>
                  </div>
                </div>
              ) : filteredAndSortedLeads.length === 0 && !isFetchingLeads ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leads found. {categoryFilter !== "all" ? `Try changing the filter.` : `Add your first lead to get started.`}
                </div>
              ) : (
                filteredAndSortedLeads.map((lead) => {
                  const leadThought = lead.meta?.thought as "sure" | "maybe" | undefined;
                  const thoughtRowClass = leadThought === "sure" 
                    ? "bg-emerald-50 dark:bg-emerald-950/20" 
                    : leadThought === "maybe" 
                    ? "bg-amber-50 dark:bg-amber-950/20" 
                    : "";
                  
                  const highlightResult = evaluateHighlightingRules(highlightingRules, lead, isDarkMode, timezone);
                  
                  const getRowStyle = () => {
                    if (invalidLeadIds.has(lead.id)) {
                      return {};
                    }
                    if (highlightResult) {
                      return { backgroundColor: isDarkMode ? highlightResult.colorDark : highlightResult.colorLight };
                    }
                    return {};
                  };
                  
                  const getRowClass = () => {
                    // Highlight when: dialog is open for this lead OR during delayed fade-out period
                    const isActiveHighlight = (updateHistoryDialogOpen && selectedLeadForUpdate === lead.id) || 
                                              highlightedLeadId === lead.id;
                    const highlightClass = isActiveHighlight
                      ? "ring-2 ring-primary ring-inset bg-primary/10 transition-all duration-300" 
                      : "transition-all duration-300";
                    if (invalidLeadIds.has(lead.id)) {
                      return `bg-red-50 dark:bg-red-950/20 ${highlightClass}`;
                    }
                    if (highlightResult) {
                      return highlightClass;
                    }
                    return `${thoughtRowClass} ${highlightClass}`;
                  };
                  
                  return (
                    <ContextMenu key={lead.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={`hover-elevate grid border-b ${getRowClass()}`}
                          style={{ 
                            gridTemplateColumns: gridTemplateStyle,
                            ...getRowStyle()
                          }}
                          data-testid={`row-lead-${lead.id}`}
                          title={invalidLeadIds.has(lead.id) && leadValidationResults.get(lead.id) 
                            ? `Missing required fields: ${leadValidationResults.get(lead.id)?.missingFields.join(', ')}`
                            : highlightResult 
                            ? `Highlighted by rule: ${highlightResult.ruleName}`
                            : undefined
                          }
                        >
                          {/* First Column Cell - Checkbox + Edit + History (Sticky) */}
                          <div 
                            className={`border-r px-2 py-2 flex items-center justify-center gap-1 sticky left-0 z-10 ${
                              highlightResult 
                                ? '' 
                                : invalidLeadIds.has(lead.id) 
                                  ? 'bg-red-50 dark:bg-red-950/20' 
                                  : 'bg-background dark:bg-muted'
                            }`}
                            style={highlightResult ? { backgroundColor: isDarkMode ? highlightResult.colorDark : highlightResult.colorLight } : undefined}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {leadThought === "sure" && (
                              <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                            )}
                            {leadThought === "maybe" && (
                              <HelpCircle className="h-4 w-4 text-amber-500" />
                            )}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (updateDialogOpen) return;
                                if (highlightTimeoutRef.current) {
                                  clearTimeout(highlightTimeoutRef.current);
                                }
                                setHighlightedLeadId(lead.id);
                                setSelectedLeadForUpdate(lead.id);
                                setUpdateDialogOpen(true);
                              }}
                              data-testid={`button-update-lead-${lead.id}`}
                              title="Record update"
                              aria-label="Record update"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <UpdateHistoryHoverCard 
                              leadId={lead.id} 
                              onOpenFullDialog={() => {
                                if (updateHistoryDialogOpen) return;
                                if (highlightTimeoutRef.current) {
                                  clearTimeout(highlightTimeoutRef.current);
                                }
                                setHighlightedLeadId(lead.id);
                                setSelectedLeadForUpdate(lead.id);
                                setUpdateHistoryDialogOpen(true);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isOnWatchlist = watchlistSet.has(lead.id);
                                toggleWatchlistMutation.mutate({ leadId: lead.id, isOnWatchlist });
                              }}
                              disabled={toggleWatchlistMutation.isPending}
                              data-testid={`button-watchlist-${lead.id}`}
                              title={watchlistSet.has(lead.id) ? "Remove from watchlist" : "Add to watchlist"}
                              aria-label={watchlistSet.has(lead.id) ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              {watchlistSet.has(lead.id) ? (
                                <Eye className="h-4 w-4 text-primary" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
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
                              onValueChange={(rawVal) => {
                                const val = rawVal === "__clear__" ? "" : rawVal;
                                setEditValue(val);
                                const oldValue = lead.custom_fields?.[col.key] || null;
                                
                                // Check if this transition requires an explanation
                                const requiresExplanation = transitionExplanationRules.some(
                                  rule => rule.column_key === col.key && rule.dropdown_value === val
                                );
                                
                                if (requiresExplanation) {
                                  // Show explanation dialog instead of directly updating
                                  setPendingTransition({
                                    leadId: lead.id,
                                    columnKey: col.key,
                                    columnName: col.label,
                                    oldValue: oldValue,
                                    newValue: val,
                                    customFields: lead.custom_fields || {},
                                  });
                                  setTransitionExplanationDialogOpen(true);
                                  setEditingCell(null);
                                  return;
                                }
                                
                                // Check if any validation rule is triggered
                                const proposedLead = { ...lead, custom_fields: { ...lead.custom_fields, [col.key]: val } };
                                const triggeredRule = validationRules.find(rule => {
                                  // Skip if rule is explicitly inactive
                                  if (rule.is_active === false) return false;
                                  
                                  // Check new multi-condition format
                                  if (rule.conditions && rule.conditions.length > 0) {
                                    const results = rule.conditions.map(condition => {
                                      const leadValue = proposedLead.custom_fields?.[condition.column_key];
                                      return evaluateCondition(leadValue, condition.operator, condition.value);
                                    });
                                    const logicalOp = rule.logical_operator || "and";
                                    return logicalOp === "or" 
                                      ? results.some(r => r)
                                      : results.every(r => r);
                                  }
                                  
                                  // Check legacy single-condition format
                                  if (rule.trigger_column_key === col.key && rule.operator) {
                                    return evaluateCondition(val, rule.operator, rule.trigger_value);
                                  }
                                  return false;
                                });
                                
                                if (triggeredRule) {
                                  // Show validation dialog to collect required fields
                                  setPendingValidation({
                                    leadId: lead.id,
                                    columnKey: col.key,
                                    oldValue: oldValue,
                                    newValue: val,
                                    rule: triggeredRule,
                                    lead: lead,
                                  });
                                  setValidationDialogOpen(true);
                                  setEditingCell(null);
                                  return;
                                }
                                
                                // Check if admin is changing AWAY from a final value - show reversal confirmation
                                const currentValue = lead.custom_fields?.[col.key];
                                if (isAdminUser && isFinalValue(col.key, currentValue) && currentValue !== val) {
                                  // Admin is changing away from a final value - check for point reversals
                                  setIsCheckingReversal(true);
                                  apiRequest<{
                                    pendingApprovals: { id: string; points: number; description: string; userName?: string }[];
                                    awardedTransactions: { id: string; points: number; description: string; userName?: string }[];
                                    pendingPointsTotal: number;
                                    awardedPointsTotal: number;
                                  }>("POST", "/api/powerscore/check-reversal", {
                                    leadId: lead.id,
                                    columnKey: col.key,
                                    oldValue: currentValue,
                                    newValue: val
                                  }).then((reversalInfo) => {
                                    setPendingAdminOverride({
                                      leadId: lead.id,
                                      columnKey: col.key,
                                      columnName: col.label,
                                      oldValue: currentValue,
                                      newValue: val,
                                      customFields: lead.custom_fields || {},
                                      reversalInfo
                                    });
                                    setAdminOverrideConfirmOpen(true);
                                  }).catch((err) => {
                                    console.error("Failed to check point reversal:", err);
                                    // Still show dialog but without reversal info
                                    setPendingAdminOverride({
                                      leadId: lead.id,
                                      columnKey: col.key,
                                      columnName: col.label,
                                      oldValue: currentValue,
                                      newValue: val,
                                      customFields: lead.custom_fields || {},
                                      reversalInfo: null
                                    });
                                    setAdminOverrideConfirmOpen(true);
                                  }).finally(() => {
                                    setIsCheckingReversal(false);
                                  });
                                  setEditingCell(null);
                                  return;
                                }
                                
                                // Check if this value is a final value - show confirmation
                                if (isFinalValue(col.key, val)) {
                                  setPendingFinalValue({
                                    leadId: lead.id,
                                    columnKey: col.key,
                                    columnName: col.label,
                                    newValue: val,
                                    customFields: lead.custom_fields || {},
                                  });
                                  setFinalValueConfirmOpen(true);
                                  setEditingCell(null);
                                  return;
                                }
                                
                                let updatedFields = {
                                  ...lead.custom_fields,
                                  [col.key]: val,
                                };
                                
                                // Apply auto-fill rules silently (updates are batched into single mutation)
                                applyAutoFillRules(
                                  col.key,
                                  val,
                                  updatedFields,
                                  (autoFillUpdates) => {
                                    updatedFields = { ...updatedFields, ...autoFillUpdates };
                                  },
                                  { showToast: true }
                                );
                                
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
                                {(() => {
                                  const allOptions = col.config?.dropdown_options || [];
                                  const hiddenSystemValues = col.config?.hidden_system_values || [];
                                  const currentValue = lead.custom_fields?.[col.key];
                                  return (
                                    <>
                                      {currentValue && (
                                        <SelectItem value="__clear__" className="text-muted-foreground italic">
                                          Clear selection
                                        </SelectItem>
                                      )}
                                      {allOptions.map((opt: string) => {
                                        const isHidden = hiddenSystemValues.includes(opt);
                                        if (isHidden && opt !== currentValue) return null;
                                        return (
                                          <SelectItem 
                                            key={opt} 
                                            value={opt}
                                            className={isHidden ? "text-muted-foreground opacity-60" : ""}
                                          >
                                            {opt}{isHidden ? " (disabled)" : ""}
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
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
                                    ? safeFormatDate(editingCell.originalValue, "dd/MM/yy", formatInTimezone) 
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
                                      const updatedFields = { ...lead.custom_fields, [col.key]: null };
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
                          ) : col.type === "datetime" ? (
                            <Popover 
                              open={datePickerOpen?.leadId === lead.id && datePickerOpen?.field === col.key} 
                              onOpenChange={(open) => {
                                if (!open) {
                                  setDatePickerOpen(null);
                                  setEditingCell(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-8 w-full justify-start text-left font-normal"
                                  data-testid={`datetime-picker-trigger-${col.key}`}
                                >
                                  {editingCell?.originalValue 
                                    ? safeFormatDate(editingCell.originalValue, "dd/MM/yy HH:mm", formatInTimezone) 
                                    : "Pick date & time"}
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
                              >
                                <Calendar
                                  mode="single"
                                  selected={editingCell?.originalValue ? new Date(editingCell.originalValue) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      // Preserve existing time or default to 09:00
                                      const existingDate = editingCell?.originalValue ? new Date(editingCell.originalValue) : null;
                                      if (existingDate) {
                                        date.setHours(existingDate.getHours(), existingDate.getMinutes());
                                      } else {
                                        date.setHours(9, 0);
                                      }
                                      const isoDateTime = date.toISOString();
                                      const updatedFields = {
                                        ...lead.custom_fields,
                                        [col.key]: isoDateTime,
                                      };
                                      updateLeadMutation.mutate({
                                        leadId: lead.id,
                                        customFields: updatedFields,
                                      });
                                      // Update editingCell to reflect new value for time input
                                      setEditingCell({ ...editingCell!, originalValue: isoDateTime });
                                    }
                                  }}
                                  initialFocus
                                />
                                <div className="p-3 border-t flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">Time:</span>
                                  <Input
                                    type="time"
                                    className="h-8 w-24 cursor-pointer"
                                    defaultValue={editingCell?.originalValue 
                                      ? format(new Date(editingCell.originalValue), "HH:mm")
                                      : "09:00"}
                                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                    onBlur={(e) => {
                                      const timeValue = e.target.value;
                                      if (timeValue && editingCell?.originalValue) {
                                        const [hours, minutes] = timeValue.split(':').map(Number);
                                        const existingDate = new Date(editingCell.originalValue);
                                        existingDate.setHours(hours, minutes);
                                        const isoDateTime = existingDate.toISOString();
                                        const updatedFields = {
                                          ...lead.custom_fields,
                                          [col.key]: isoDateTime,
                                        };
                                        updateLeadMutation.mutate({
                                          leadId: lead.id,
                                          customFields: updatedFields,
                                        });
                                      }
                                    }}
                                    data-testid={`time-input-${col.key}`}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setDatePickerOpen(null);
                                      setEditingCell(null);
                                    }}
                                    data-testid={`button-done-datetime-${col.key}`}
                                  >
                                    Done
                                  </Button>
                                </div>
                                <div className="px-3 pb-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground"
                                    onClick={() => {
                                      const updatedFields = { ...lead.custom_fields, [col.key]: null };
                                      updateLeadMutation.mutate({
                                        leadId: lead.id,
                                        customFields: updatedFields,
                                      });
                                      setDatePickerOpen(null);
                                      setEditingCell(null);
                                    }}
                                    data-testid={`button-clear-datetime-${col.key}`}
                                  >
                                    Clear
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
                                col.type === "mobile"
                                  ? "h-8 min-w-[160px]" 
                                  : "h-8 min-w-[150px]"
                              }
                              autoFocus
                              data-testid={`input-edit-${col.key}`}
                            />
                          )
                        ) : col.key === "ai_rating" ? (
                          <AIRatingCell
                            leadId={lead.id}
                            rating={lead.ai_rating as any}
                            score={lead.ai_rating_score}
                            summary={lead.ai_rating_summary}
                            details={lead.ai_rating_details as any}
                            updatedAt={lead.ai_rating_updated_at as any}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 w-full">
                            {/* Lock icon for final values (non-admin users) */}
                            {!isAdminUser && isFinalValue(col.key, value) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 flex-shrink-0 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent side="top">This value is locked. Only Admins can modify it.</TooltipContent>
                              </Tooltip>
                            )}
                            <span className={`text-sm flex items-center gap-1 flex-1 min-w-0 ${col.width === "260px" || col.key === "name" ? "break-words" : ""} ${isPastNFDT ? "text-amber-700 dark:text-amber-400 font-medium" : ""}`}>
                              {isPastNFDT && <Clock className="h-3 w-3 flex-shrink-0" />}
                              {(col.type === "date" || col.type === "datetime") && value
                                ? safeFormatDate(value, col.type === "datetime" ? "dd/MM/yy HH:mm" : "dd/MM/yy", formatInTimezone)
                                : col.type === "percentage" && value != null && value !== ""
                                ? `${value}%`
                                : value || "-"}
                            </span>
                            {/* WhatsApp icon for Mobile No field type only */}
                            {col.type === "mobile" && value && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const cleanNumber = String(value).replace(/[\s-]/g, '');
                                      const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : (cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`);
                                      window.open(`https://wa.me/${formattedNumber}`, '_blank');
                                    }}
                                    data-testid={`button-whatsapp-${lead.id}-${col.key}`}
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">WhatsApp</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                        </div>
                      );
                    })}
                    
                    {/* Actions Cell - Just dropdown menu */}
                    <div className="px-2 py-2 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
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
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => updateLeadThoughtMutation.mutate({ leadId: lead.id, thought: "sure" })}
                    data-testid={`context-mark-sure-${lead.id}`}
                  >
                    <Star className="h-4 w-4 mr-2 text-emerald-500" />
                    Mark as Sure
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => updateLeadThoughtMutation.mutate({ leadId: lead.id, thought: "maybe" })}
                    data-testid={`context-mark-maybe-${lead.id}`}
                  >
                    <HelpCircle className="h-4 w-4 mr-2 text-amber-500" />
                    Mark as May Be
                  </ContextMenuItem>
                  {leadThought && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => updateLeadThoughtMutation.mutate({ leadId: lead.id, thought: null })}
                        data-testid={`context-clear-thought-${lead.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        Clear Thought
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
              );
            })
          )}
            </div>
          </div>
          
          {/* Infinite scroll status bar */}
          {totalLeads > 0 && (
            <div className="flex items-center justify-between border-t bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground" data-testid="text-leads-count">
                  Showing {leads.length.toLocaleString()} of {totalLeads.toLocaleString()} leads
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="loading-more">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
                {hasNextPage && !isFetchingNextPage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    data-testid="button-load-more"
                  >
                    Load more
                  </Button>
                )}
                {!hasNextPage && leads.length > 0 && leads.length >= totalLeads && (
                  <span className="text-sm text-muted-foreground" data-testid="text-all-loaded">
                    All leads loaded
                  </span>
                )}
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
