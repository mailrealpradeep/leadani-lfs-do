import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDashboard } from "./dashboard-context";
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
import { format, isWithinInterval, parseISO, isBefore, startOfDay } from "date-fns";
import type { Lead, DropdownOption, CustomColumn, ValidationRule, HighlightingRule, UserRowFilterRecord, RowFilterCondition } from "@shared/schema";
import { evaluateHighlightingRules } from "@/lib/highlighting-evaluator";
import { LeadUpdateDialog } from "./lead-update-dialog";
import { LeadUpdateHistoryDialog } from "./lead-update-history-dialog";
import { LeadEditDialog } from "./lead-edit-dialog";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { DateRangeFilter, type DateFilterValue } from "./filters/date-range-filter";
import { DropdownFilter } from "./filters/dropdown-filter";
import { validateLeadAgainstRules } from "@shared/validator";
import { Pagination } from "./pagination";

// Custom hook to stabilize array references - prevents SortableContext re-initialization
// Only returns new reference when content actually changes
function useStableArray<T>(array: T[], compareFn: (a: T, b: T) => boolean): T[] {
  const ref = useRef<T[]>(array);
  
  // Check if arrays are equal by length and content
  const areEqual = ref.current.length === array.length && 
    ref.current.every((item, index) => compareFn(item, array[index]));
  
  if (!areEqual) {
    ref.current = array;
  }
  
  return ref.current;
}

// Compare two column objects for equality (used by useStableArray)
function areColumnsEqual(
  a: { key: string; label: string; type: string; width: string; sortable: boolean; dropdown?: boolean; config: any },
  b: { key: string; label: string; type: string; width: string; sortable: boolean; dropdown?: boolean; config: any }
): boolean {
  return a.key === b.key && 
    a.label === b.label && 
    a.type === b.type && 
    a.width === b.width && 
    a.sortable === b.sortable && 
    a.dropdown === b.dropdown;
}

// Compare two string arrays for equality
function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Hook to stabilize visibleColumnKeys array reference
function useStableColumnKeys(keys: string[]): string[] {
  const ref = useRef<string[]>(keys);
  
  if (!areStringArraysEqual(ref.current, keys)) {
    ref.current = keys;
  }
  
  return ref.current;
}

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
  });
  
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

// Memoized column headers - prevents header re-render when data changes
// Only re-renders when columns structure, sort state, or filter values change
// NOTE: Checkbox and actions columns are rendered separately outside this component
interface MemoizedColumnHeadersProps {
  visibleColumns: Array<{
    key: string;
    label: string;
    type: string;
    width: string;
    sortable: boolean;
    dropdown?: boolean;
    config: any;
  }>;
  visibleColumnKeys: string[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  isMultiMode: boolean;
  onToggleSort: (columnKey: string) => void;
  onResizeStart: (e: React.MouseEvent, columnKey: string) => void;
  onFilterChange: (columnKey: string, value: string) => void;
  onFilterClear: (columnKey: string) => void;
  onDateFilterChange: (columnKey: string, value: DateFilterValue | null) => void;
  onDropdownFilterChange: (columnKey: string, value: string | null) => void;
  getDropdownOptionsForColumn: (columnKey: string) => string[];
  columnFilters: Record<string, string | DateFilterValue | null>;
}

// Custom comparison function for MemoizedColumnHeaders
// ONLY compares data that affects visual output - NOT callback references
// Callbacks don't affect visual state, so changes to them shouldn't trigger re-render
function areColumnHeadersEqual(
  prevProps: MemoizedColumnHeadersProps,
  nextProps: MemoizedColumnHeadersProps
): boolean {
  // Compare primitive props that affect visual state
  if (prevProps.sortColumn !== nextProps.sortColumn) return false;
  if (prevProps.sortDirection !== nextProps.sortDirection) return false;
  if (prevProps.isMultiMode !== nextProps.isMultiMode) return false;
  
  // NOTE: We intentionally DO NOT compare callback references!
  // Callbacks change frequently due to closure updates but don't affect visual output.
  // The header only needs to re-render when actual displayed data changes.
  
  // Compare visibleColumnKeys array using reference equality (already stabilized)
  if (prevProps.visibleColumnKeys !== nextProps.visibleColumnKeys) {
    // If references differ, do content comparison as fallback
    if (prevProps.visibleColumnKeys.length !== nextProps.visibleColumnKeys.length) return false;
    for (let i = 0; i < prevProps.visibleColumnKeys.length; i++) {
      if (prevProps.visibleColumnKeys[i] !== nextProps.visibleColumnKeys[i]) return false;
    }
  }
  
  // Compare visibleColumns array using reference equality (already stabilized)
  if (prevProps.visibleColumns !== nextProps.visibleColumns) {
    // If references differ, do content comparison as fallback
    if (prevProps.visibleColumns.length !== nextProps.visibleColumns.length) return false;
    for (let i = 0; i < prevProps.visibleColumns.length; i++) {
      const prev = prevProps.visibleColumns[i];
      const next = nextProps.visibleColumns[i];
      if (prev.key !== next.key) return false;
      if (prev.label !== next.label) return false;
      if (prev.type !== next.type) return false;
      if (prev.width !== next.width) return false;
      if (prev.sortable !== next.sortable) return false;
      if (prev.dropdown !== next.dropdown) return false;
    }
  }
  
  // Deep compare columnFilters object
  const prevFilterKeys = Object.keys(prevProps.columnFilters);
  const nextFilterKeys = Object.keys(nextProps.columnFilters);
  if (prevFilterKeys.length !== nextFilterKeys.length) return false;
  for (const key of prevFilterKeys) {
    const prevVal = prevProps.columnFilters[key];
    const nextVal = nextProps.columnFilters[key];
    // Handle date range filters (objects with from/to)
    if (typeof prevVal === 'object' && prevVal !== null && typeof nextVal === 'object' && nextVal !== null) {
      const prevDate = prevVal as DateFilterValue | null;
      const nextDate = nextVal as DateFilterValue | null;
      if (prevDate?.from !== nextDate?.from || prevDate?.to !== nextDate?.to) return false;
    } else if (prevVal !== nextVal) {
      return false;
    }
  }
  
  return true;
}

const MemoizedColumnHeaders = memo(function MemoizedColumnHeaders({
  visibleColumns,
  visibleColumnKeys,
  sortColumn,
  sortDirection,
  isMultiMode,
  onToggleSort,
  onResizeStart,
  onFilterChange,
  onFilterClear,
  onDateFilterChange,
  onDropdownFilterChange,
  getDropdownOptionsForColumn,
  columnFilters,
}: MemoizedColumnHeadersProps) {
  return (
    <SortableContext 
      items={visibleColumnKeys} 
      strategy={horizontalListSortingStrategy}
    >
      {visibleColumns.map((col) => (
        <SortableColumnHeader
          key={col.key}
          columnKey={col.key}
          width={col.width}
          onResizeStart={onResizeStart}
          isDraggingEnabled={!isMultiMode}
        >
          <div className="flex flex-col gap-1" data-testid={`column-header-${col.key}`}>
            <div className="flex items-center gap-1">
              <span data-testid={`column-label-${col.key}`}>{col.label}</span>
              {col.sortable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onToggleSort(col.key)}
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
                  onChange={(value) => onDateFilterChange(col.key, value)}
                />
              ) : col.type === "dropdown" ? (
                <DropdownFilter
                  value={columnFilters[col.key] as string | null}
                  onChange={(value) => onDropdownFilterChange(col.key, value)}
                  options={getDropdownOptionsForColumn(col.key)}
                />
              ) : (
                <DebouncedFilterInput
                  value={(columnFilters[col.key] as string) || ""}
                  onFilterChange={onFilterChange}
                  columnKey={col.key}
                  onFilterClear={onFilterClear}
                />
              )}
            </div>
          </div>
        </SortableColumnHeader>
      ))}
    </SortableContext>
  );
}, areColumnHeadersEqual);

// Memoized data row - prevents re-render when other rows or headers change
interface MemoizedDataRowProps {
  lead: Lead;
  visibleColumns: Array<{
    key: string;
    label: string;
    type: string;
    width: string;
    sortable: boolean;
    dropdown?: boolean;
    config: any;
  }>;
  gridTemplateStyle: string;
  selectedRows: Set<string>;
  onSelectRow: (leadId: string, checked: boolean) => void;
  editingCell: { leadId: string; field: string; originalValue?: any } | null;
  editValue: string;
  datePickerOpen: { leadId: string; field: string } | null;
  onCellClick: (lead: Lead, field: string, value: any, type: string) => void;
  onCellSave: (lead: Lead) => void;
  onCellKeyDown: (e: React.KeyboardEvent, lead: Lead) => void;
  onEditValueChange: (value: string) => void;
  onSetEditingCell: (cell: { leadId: string; field: string; originalValue?: any } | null) => void;
  onSetDatePickerOpen: (open: { leadId: string; field: string } | null) => void;
  onUpdateLead: (data: { leadId: string; customFields: any }) => void;
  invalidLeadIds: Set<string>;
  leadValidationResults: Map<string, { missingFields: string[] }>;
  highlightingRules: HighlightingRule[];
  isDarkMode: boolean;
  timezone: string;
  leadsWithPastNFDT: Map<string, string[]>;
  formatInTimezone: (date: string | Date, pattern: string) => string;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenUpdateDialog: (leadId: string) => void;
  onOpenUpdateHistoryDialog: (leadId: string) => void;
  onDeleteLead: (leadIds: string[]) => void;
  updateDialogOpen: boolean;
  updateHistoryDialogOpen: boolean;
  onSetThought: (leadId: string, thought: string | null) => void;
}

const MemoizedDataRow = memo(function MemoizedDataRow({
  lead,
  visibleColumns,
  gridTemplateStyle,
  selectedRows,
  onSelectRow,
  editingCell,
  editValue,
  datePickerOpen,
  onCellClick,
  onCellSave,
  onCellKeyDown,
  onEditValueChange,
  onSetEditingCell,
  onSetDatePickerOpen,
  onUpdateLead,
  invalidLeadIds,
  leadValidationResults,
  highlightingRules,
  isDarkMode,
  timezone,
  leadsWithPastNFDT,
  formatInTimezone,
  onOpenLeadDetail,
  onOpenUpdateDialog,
  onOpenUpdateHistoryDialog,
  onDeleteLead,
  updateDialogOpen,
  updateHistoryDialogOpen,
  onSetThought,
}: MemoizedDataRowProps) {
  const leadThought = lead.meta?.thought as "sure" | "maybe" | undefined;
  const thoughtRowClass = leadThought === "sure" 
    ? "bg-emerald-50 dark:bg-emerald-950/20" 
    : leadThought === "maybe" 
    ? "bg-amber-50 dark:bg-amber-950/20" 
    : "";
  
  const highlightResult = evaluateHighlightingRules(highlightingRules, lead, isDarkMode, timezone);
  
  const getRowStyle = () => {
    if (invalidLeadIds.has(lead.id)) return {};
    if (highlightResult) {
      return { backgroundColor: isDarkMode ? highlightResult.colorDark : highlightResult.colorLight };
    }
    return {};
  };
  
  const getRowClass = () => {
    if (invalidLeadIds.has(lead.id)) return "bg-red-50 dark:bg-red-950/20";
    if (highlightResult) return "";
    return thoughtRowClass;
  };

  const getLeadValue = (lead: Lead, key: string): string => {
    if (key === "__sheet_name__") return (lead as any).sheetName || "";
    return lead.custom_fields?.[key] ?? "";
  };

  return (
    <ContextMenu>
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
          {/* Checkbox Cell with Thought Icon */}
          <div className="border-r px-2 py-2 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {leadThought === "sure" && (
              <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
            )}
            {leadThought === "maybe" && (
              <HelpCircle className="h-4 w-4 text-amber-500" />
            )}
            <Checkbox
              checked={selectedRows.has(lead.id)}
              onCheckedChange={(checked) => onSelectRow(lead.id, !!checked)}
              data-testid={`checkbox-select-${lead.id}`}
            />
          </div>
      
          {/* Data Cells */}
          {visibleColumns.map((col) => {
            const isEditing = editingCell?.leadId === lead.id && editingCell?.field === col.key;
            const value = getLeadValue(lead, col.key);
            const isDropdown = col.dropdown;
            const isPastNFDT = leadsWithPastNFDT.get(lead.id)?.includes(col.key);

            return (
              <div
                key={col.key}
                onDoubleClick={() => onCellClick(lead, col.key, value, col.type)}
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
                      onEditValueChange(val);
                      const updatedFields = {
                        ...lead.custom_fields,
                        [col.key]: val,
                      };
                      onUpdateLead({
                        leadId: lead.id,
                        customFields: updatedFields,
                      });
                      onSetEditingCell(null);
                    }}
                    open
                    onOpenChange={(open) => {
                      if (!open) onSetEditingCell(null);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {col.config.dropdown_options?.map((opt: string) => (
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
                        onSetDatePickerOpen(null);
                        onSetEditingCell(null);
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
                        onSetDatePickerOpen(null);
                        onSetEditingCell(null);
                      }}
                      onInteractOutside={() => {
                        onSetDatePickerOpen(null);
                        onSetEditingCell(null);
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
                            onUpdateLead({
                              leadId: lead.id,
                              customFields: updatedFields,
                            });
                            onSetDatePickerOpen(null);
                            onSetEditingCell(null);
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
                            onUpdateLead({
                              leadId: lead.id,
                              customFields: updatedFields,
                            });
                            onSetDatePickerOpen(null);
                            onSetEditingCell(null);
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
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onBlur={() => onCellSave(lead)}
                    onKeyDown={(e) => onCellKeyDown(e, lead)}
                    className={
                      col.type === "mobile"
                        ? "h-8 min-w-[160px]" 
                        : "h-8 min-w-[150px]"
                    }
                    autoFocus
                    data-testid={`input-edit-${col.key}`}
                  />
                )
              ) : (
                <div className="flex items-center gap-1.5 w-full">
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
          
          {/* Actions Cell */}
          <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (updateDialogOpen) return;
                onOpenUpdateDialog(lead.id);
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
                if (updateHistoryDialogOpen) return;
                onOpenUpdateHistoryDialog(lead.id);
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
                  onClick={() => onDeleteLead([lead.id])}
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenLeadDetail(lead.id)}>
          View Details
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onSetThought(lead.id, "sure")}>
          <Star className="h-4 w-4 mr-2 text-emerald-500" />
          Mark as Sure
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSetThought(lead.id, "maybe")}>
          <HelpCircle className="h-4 w-4 mr-2 text-amber-500" />
          Mark as May Be
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSetThought(lead.id, null)}>
          <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
          Clear Thought
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDeleteLead([lead.id])} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export function SpreadsheetGrid({
  sheetId,
  sheetIds,
  onOpenLeadDetail,
  onOpenDropdownManager,
  onScroll,
}: SpreadsheetGridProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { timezone, formatInTimezone } = useCompanyTimezone();
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
  
  const isMultiMode = isMultiSheetMode && selectedSheetIds.length > 0;
  const activeSheetId = sheetId || "";
  const activeSheetIds = isMultiMode ? selectedSheetIds : [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string; originalValue?: any } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState<{ leadId: string; field: string } | null>(null);
  
  // New features state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string | DateFilterValue | null>>({});
  
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
  
  // Stable callbacks for date and dropdown filters
  const handleDateFilterChange = useCallback((columnKey: string, value: DateFilterValue | null) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  }, []);
  
  const handleDropdownFilterChange = useCallback((columnKey: string, value: string | null) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  }, []);
  
  
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

  // Column data fetching - needed first for buildBackendFilters
  const { data: singleSheetColumns = [], isLoading: isLoadingSingleColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", activeSheetId, "columns"],
    enabled: !!activeSheetId && !isMultiMode,
  });

  // Company-level columns for multi-sheet mode
  const { data: companyColumns = [], isLoading: isLoadingCompanyColumns, error: companyColumnsError } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: isMultiMode,
    staleTime: 30000,
    retry: 2,
  });

  // Use appropriate columns based on mode
  const activeColumns = isMultiMode ? companyColumns : singleSheetColumns;

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

  // Single-sheet mode data fetching - now with server-side pagination
  interface SingleSheetPaginatedResponse {
    leads: Lead[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  const { 
    data: singleSheetData, 
    isLoading: isLoadingSingleLeads,
    isFetching: isFetchingSingleLeads,
  } = useQuery<SingleSheetPaginatedResponse>({
    queryKey: ["/api/sheets", activeSheetId, "leads", pagination.page, pagination.limit, sortColumn, sortDirection, columnFilters, searchQuery, thoughtFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sortBy: sortColumn || "created_at",
        sortOrder: sortColumn ? sortDirection : "desc",
        filters: JSON.stringify(buildBackendFilters()),
      });
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
    enabled: !!activeSheetId && !isMultiMode && !isLoadingSingleColumns,
  });

  // Multi-sheet mode data fetching - server-side filtering, sorting, and pagination
  const { 
    data: multiSheetData, 
    isLoading: isLoadingMultiLeads,
    isFetching: isFetchingMultiLeads,
  } = useQuery<PaginatedLeadsResponse>({
    queryKey: ["/api/leads/query", activeSheetIds, pagination.page, pagination.limit, searchQuery, columnFilters, sortColumn, sortDirection, thoughtFilter],
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
    enabled: isMultiMode && activeSheetIds.length > 0 && companyColumns.length > 0,
  });

  // Update pagination state when data changes (both single and multi-sheet mode)
  useEffect(() => {
    if (isMultiMode && multiSheetData) {
      setPagination({
        page: multiSheetData.page,
        limit: multiSheetData.limit,
        total: multiSheetData.total,
        totalPages: multiSheetData.totalPages,
      });
    } else if (!isMultiMode && singleSheetData) {
      setPagination({
        page: singleSheetData.page,
        limit: singleSheetData.limit,
        total: singleSheetData.total,
        totalPages: singleSheetData.totalPages,
      });
    }
  }, [multiSheetData, singleSheetData, isMultiMode, setPagination]);

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

  // Unified data access
  const leads = isMultiMode ? (multiSheetData?.leads || []) : (singleSheetData?.leads || []);
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

  const { data: sheetHighlightingRules = [] } = useQuery<HighlightingRule[]>({
    queryKey: ["/api/sheets", activeSheetId, "highlighting-rules"],
    enabled: !!activeSheetId,
  });

  // Fetch global highlighting rules (apply to all sheets)
  const { data: globalHighlightingRules = [] } = useQuery<HighlightingRule[]>({
    queryKey: ["/api/company/global-highlighting-rules"],
  });

  // Merge global and sheet-specific rules, sheet-specific take precedence (evaluated first)
  const highlightingRules = useMemo(() => {
    // Sheet-specific rules are evaluated first (have higher effective priority)
    // Then global rules are evaluated for any rows not matched by sheet-specific rules
    return [...sheetHighlightingRules, ...globalHighlightingRules];
  }, [sheetHighlightingRules, globalHighlightingRules]);

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
      setCustomColumnOrder(userSheetView.column_order);
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

  const isLoading = isMultiMode 
    ? (isLoadingMultiLeads || isLoadingCompanyColumns)
    : (isLoadingSingleLeads || isLoadingSingleColumns);

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, customFields }: { leadId: string; customFields: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { custom_fields: customFields });
    },
    onMutate: async ({ leadId, customFields }) => {
      // Build the exact paginated query key for single-sheet mode
      const singleSheetQueryKey = ["/api/sheets", activeSheetId, "leads", pagination.page, pagination.limit, sortColumn, sortDirection, columnFilters, searchQuery, thoughtFilter];
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      if (isMultiMode) {
        await queryClient.cancelQueries({ queryKey: ["/api/leads/query"] });
      } else {
        await queryClient.cancelQueries({ queryKey: singleSheetQueryKey });
      }

      // Snapshot the previous value with correct types
      const previousSingleLeads = queryClient.getQueryData<SingleSheetPaginatedResponse>(singleSheetQueryKey);
      const previousMultiLeads = queryClient.getQueriesData<PaginatedLeadsResponse>({ queryKey: ["/api/leads/query"] });

      // Optimistically update the lead in the cache
      if (isMultiMode) {
        queryClient.setQueriesData<PaginatedLeadsResponse>(
          { queryKey: ["/api/leads/query"] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              leads: old.leads.map((lead) =>
                lead.id === leadId
                  ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                  : lead
              ),
            };
          }
        );
      } else {
        // Update the paginated response structure
        queryClient.setQueryData<SingleSheetPaginatedResponse>(
          singleSheetQueryKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              leads: old.leads.map((lead) =>
                lead.id === leadId
                  ? { ...lead, custom_fields: { ...lead.custom_fields, ...customFields } }
                  : lead
              ),
            };
          }
        );
      }

      // Return context with previous values for rollback
      return { previousSingleLeads, previousMultiLeads, singleSheetQueryKey };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousSingleLeads && context?.singleSheetQueryKey) {
        queryClient.setQueryData(context.singleSheetQueryKey, context.previousSingleLeads);
      }
      if (context?.previousMultiLeads) {
        context.previousMultiLeads.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      toast({
        title: "Error saving",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state is synced
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

  // Lead thought mutation - for marking leads as "sure" or "maybe"
  const updateLeadThoughtMutation = useMutation({
    mutationFn: async ({ leadId, thought }: { leadId: string; thought: "sure" | "maybe" | null }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/thought`, { thought });
    },
    onSuccess: () => {
      if (isMultiMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads"] });
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
    
    // Reset filters and sort to defaults when switching sheets
    setColumnFilters({});
    // Default sort: created_at descending (newest leads first)
    setSortColumn("created_at");
    setSortDirection("desc");
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

    const handleHighlightingRulesUpdated = (data: { sheetId: string | null; global?: boolean }) => {
      if (data.global) {
        // Global rules updated - invalidate global rules cache
        queryClient.invalidateQueries({ queryKey: ["/api/company/global-highlighting-rules"] });
      } else if (data.sheetId === sheetId) {
        // Sheet-specific rules updated
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "highlighting-rules"] });
      }
    };

    socket.on("lead_created", handleLeadCreated);
    socket.on("lead_updated", handleLeadUpdated);
    socket.on("highlighting_rules.updated", handleHighlightingRulesUpdated);

    return () => {
      socket.emit("leave_sheet", sheetId);
      socket.off("lead_created", handleLeadCreated);
      socket.off("lead_updated", handleLeadUpdated);
      socket.off("highlighting_rules.updated", handleHighlightingRulesUpdated);
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

  // Stable callback for getting dropdown options - used by memoized header
  const getDropdownOptionsForColumn = useCallback((columnKey: string): string[] => {
    const column = customColumns.find((col) => col.column_key === columnKey);
    if (!column || column.type !== "dropdown") return [];
    
    // Extract dropdown options from column config
    const config = column.config as any;
    return config?.dropdown_options || [];
  }, [customColumns]);

  // Stable callback for toggling sort - used by memoized header
  const toggleSort = useCallback((column: string) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => d === "asc" ? "desc" : "asc");
        return prev;
      } else {
        setSortDirection("asc");
        return column;
      }
    });
  }, []);

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

  // Stable callback for column resize start - used by memoized header
  // NOTE: Does not depend on `columns` to avoid temporal dead zone issues
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    hasMovedRef.current = false;
    
    // Get current width from saved preferences or use default (120px)
    const currentWidth = columnWidths[columnKey] || 120;
    resizeStartWidth.current = currentWidth;
  }, [columnWidths]);

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
  // Memoize to prevent re-creating array on every render (fixes filter input focus loss)
  const baseColumns = useMemo(() => {
    return [...customColumns]
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
    const orderedArr: typeof columns = [];
    const usedKeys = new Set<string>();
    
    for (const key of customColumnOrder) {
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

  // Stable callback for column drag end - used by DndContext
  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setCustomColumnOrder(prevOrder => {
        // Use current orderedColumns derived from state
        const currentColumns = orderedColumns;
        const oldIndex = currentColumns.findIndex((col) => col.key === active.id);
        const newIndex = currentColumns.findIndex((col) => col.key === over.id);
        
        const newOrder = arrayMove(currentColumns.map(c => c.key), oldIndex, newIndex);
        
        // Save to backend
        saveUserSheetViewMutation.mutate({
          columnOrder: newOrder,
          hiddenColumns: Array.from(hiddenColumns),
        });
        
        return newOrder;
      });
    }
  }, [orderedColumns, hiddenColumns, saveUserSheetViewMutation]);

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

  // Server handles filtering/sorting for both modes now
  // Only apply user row filters (Hide/Show Rows) client-side as they're per-user settings
  const filteredAndSortedLeads = leads.filter((lead) => {
    // User row filters - hide rows that match any active filter (client-side only)
    if (!evaluateRowFilters(lead)) {
      return false;
    }
    return true;
  });

  // Use ordered columns for visible columns (respecting user's custom order)
  // Memoize to keep stable reference when only filters change (fixes filter input focus loss)
  // Compute visible columns from ordered columns
  const computedVisibleColumns = useMemo(() => {
    return orderedColumns.filter((col) => !hiddenColumns.has(col.key));
  }, [orderedColumns, hiddenColumns]);
  
  // CRITICAL: Stabilize visibleColumns reference to prevent SortableContext re-initialization
  // React Query returns new array references even when content is the same
  // This causes SortableContext to see "new" items and fully re-render all headers
  const visibleColumns = useStableArray(computedVisibleColumns, areColumnsEqual);

  // Compute column keys for SortableContext
  const computedVisibleColumnKeys = useMemo(() => {
    return visibleColumns.map(c => c.key);
  }, [visibleColumns]);
  
  // CRITICAL: Stabilize visibleColumnKeys reference for SortableContext
  // SortableContext treats new array reference as topology change and reinitializes
  const visibleColumnKeys = useStableColumnKeys(computedVisibleColumnKeys);

  // Memoize grid template style to prevent header re-renders on filter changes
  const gridTemplateStyle = useMemo(() => {
    return `50px ${visibleColumns.map(c => c.width).join(' ')} 150px`;
  }, [visibleColumns]);

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
      {/* Update Dialogs - Using key prop to force complete remount when lead changes */}
      {/* This ensures each dialog instance is completely fresh with no stale state */}
      {selectedLeadForUpdate && (
        <>
          <LeadUpdateDialog
            key={`update-dialog-${selectedLeadForUpdate}`}
            leadId={selectedLeadForUpdate}
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
              // Clear the selected lead when dialog closes to ensure clean state
              if (!open) {
                setSelectedLeadForUpdate(null);
              }
            }}
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
                        if (invalidLeadIds.has(lead.id)) {
                          return "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800";
                        }
                        if (mobileHighlightResult) {
                          return "border";
                        }
                        return mobileThoughtClass;
                      };
                      
                      return (
                      <div
                        key={lead.id}
                        className={`border rounded-lg p-4 hover-elevate active-elevate-2 ${getMobileCardClass()}`}
                        style={getMobileCardStyle()}
                        data-testid={`card-lead-${lead.id}`}
                        onClick={() => onOpenLeadDetail(lead.id)}
                        title={invalidLeadIds.has(lead.id) && leadValidationResults.get(lead.id) 
                          ? `Missing required fields: ${leadValidationResults.get(lead.id)?.missingFields.join(', ')}`
                          : mobileHighlightResult
                          ? `Highlighted by rule: ${mobileHighlightResult.ruleName}`
                          : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {mobileLeadThought === "sure" && (
                              <Star className="h-5 w-5 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                            )}
                            {mobileLeadThought === "maybe" && (
                              <HelpCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
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
                                  {(col.type === "date" || col.type === "datetime") && value 
                                    ? formatInTimezone(value, col.type === "datetime" ? "dd/MM/yy HH:mm" : "dd/MM/yy")
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
                                // Prevent switching leads while dialog is already open
                                if (updateDialogOpen) return;
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
                                // Prevent switching leads while dialog is already open
                                if (updateHistoryDialogOpen) return;
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
                      );
                    })
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
            <div className="overflow-x-scroll overflow-y-auto flex-1 spreadsheet-scroll-container" ref={containerRef}>
            <div style={{ minWidth: `${calculateTableWidth()}px` }}>
              {/* Sticky Header Row with DnD Context */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <div 
                  className="sticky top-0 z-20 bg-background border-b-2 grid"
                  style={{ gridTemplateColumns: gridTemplateStyle }}
                >
                  {/* Checkbox Column Header - NOT memoized, updates when selection changes */}
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
                  
                  {/* Memoized Column Headers - only re-renders when columns/sort/filters change, NOT on data changes */}
                  <MemoizedColumnHeaders
                    visibleColumns={visibleColumns}
                    visibleColumnKeys={visibleColumnKeys}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    isMultiMode={isMultiMode}
                    onToggleSort={toggleSort}
                    onResizeStart={handleResizeStart}
                    onFilterChange={handleColumnFilterChange}
                    onFilterClear={handleColumnFilterClear}
                    onDateFilterChange={handleDateFilterChange}
                    onDropdownFilterChange={handleDropdownFilterChange}
                    getDropdownOptionsForColumn={getDropdownOptionsForColumn}
                    columnFilters={columnFilters}
                  />
                  
                  {/* Actions Column Header */}
                  <div className="border-b px-3 py-2"></div>
                </div>
              </DndContext>

              {/* Table Body */}
              {filteredAndSortedLeads.length === 0 ? (
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
                    if (invalidLeadIds.has(lead.id)) {
                      return "bg-red-50 dark:bg-red-950/20";
                    }
                    if (highlightResult) {
                      return "";
                    }
                    return thoughtRowClass;
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
                          {/* Checkbox Cell with Thought Icon */}
                          <div className="border-r px-2 py-2 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                                col.type === "mobile"
                                  ? "h-8 min-w-[160px]" 
                                  : "h-8 min-w-[150px]"
                              }
                              autoFocus
                              data-testid={`input-edit-${col.key}`}
                            />
                          )
                        ) : (
                          <div className="flex items-center gap-1.5 w-full">
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
                    
                    {/* Actions Cell */}
                    <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          // Prevent switching leads while dialog is already open
                          if (updateDialogOpen) return;
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
                          // Prevent switching leads while dialog is already open
                          if (updateHistoryDialogOpen) return;
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
          
          {/* Pagination controls - show for both single and multi-sheet modes */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between border-t bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  data-testid="select-page-size"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-muted-foreground ml-2">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} leads
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {pagination.totalPages > 1 && (
                  <>
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
                  </>
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
