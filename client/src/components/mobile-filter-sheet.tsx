import { useState, useMemo, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Calendar, ListFilter, Trash2 } from "lucide-react";
import { DateRangeFilter, type DateFilterValue } from "./filters/date-range-filter";

interface Column {
  key: string;
  name: string;
  type: string;
  config?: {
    dropdown_options?: string[];
  };
}

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  columnFilters: Record<string, string | DateFilterValue | null>;
  onSortChange: (column: string | null, direction: "asc" | "desc") => void;
  onFilterChange: (filters: Record<string, string | DateFilterValue | null>) => void;
}

export function MobileFilterSheet({
  open,
  onOpenChange,
  columns,
  sortColumn,
  sortDirection,
  columnFilters,
  onSortChange,
  onFilterChange,
}: MobileFilterSheetProps) {
  const [localSortColumn, setLocalSortColumn] = useState<string | null>(sortColumn);
  const [localSortDirection, setLocalSortDirection] = useState<"asc" | "desc">(sortDirection);
  const [localFilters, setLocalFilters] = useState<Record<string, string | DateFilterValue | null>>(columnFilters);

  // Reset local state to committed values
  const resetToCommitted = useCallback(() => {
    setLocalSortColumn(sortColumn);
    setLocalSortDirection(sortDirection);
    setLocalFilters(columnFilters);
  }, [sortColumn, sortDirection, columnFilters]);

  // Sync local state with committed values whenever sheet opens
  // This handles both external toggles and internal opens
  useEffect(() => {
    if (open) {
      resetToCommitted();
    }
  }, [open, resetToCommitted]);

  // Handle Cancel button - reset and close
  const handleCancel = () => {
    resetToCommitted();
    onOpenChange(false);
  };

  // Get filterable columns (dropdowns and dates)
  const filterableColumns = useMemo(() => {
    return columns.filter(col => col.type === "dropdown" || col.type === "date");
  }, [columns]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(localFilters).filter(v => v !== null && v !== undefined).length;
  }, [localFilters]);

  const handleApply = () => {
    onSortChange(localSortColumn, localSortDirection);
    onFilterChange(localFilters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setLocalSortColumn(null);
    setLocalSortDirection("asc");
    setLocalFilters({});
  };

  const handleRemoveFilter = (columnKey: string) => {
    setLocalFilters(prev => {
      const updated = { ...prev };
      delete updated[columnKey];
      return updated;
    });
  };

  const getFilterDisplayValue = (columnKey: string, value: string | DateFilterValue | null): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && "type" in value) {
      switch (value.type) {
        case "today": return "Today";
        case "thisWeek": return "This Week";
        case "thisMonth": return "This Month";
        case "last7Days": return "Last 7 Days";
        case "custom": return "Custom Range";
        default: return "";
      }
    }
    return "";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Sort & Filter
              </SheetTitle>
              <SheetDescription>
                Customize how leads are displayed
              </SheetDescription>
            </div>
            {(localSortColumn || activeFilterCount > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-muted-foreground"
                data-testid="button-clear-all-filters"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 py-4">
          <div className="space-y-6 px-1">
            {/* Sort Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Sort By</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Column</Label>
                  <Select
                    value={localSortColumn || "none"}
                    onValueChange={(val) => setLocalSortColumn(val === "none" ? null : val)}
                  >
                    <SelectTrigger className="min-h-[44px]" data-testid="select-sort-column">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col.key} value={col.key}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Direction</Label>
                  <Select
                    value={localSortDirection}
                    onValueChange={(val) => setLocalSortDirection(val as "asc" | "desc")}
                    disabled={!localSortColumn}
                  >
                    <SelectTrigger className="min-h-[44px]" data-testid="select-sort-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4" />
                          Ascending
                        </div>
                      </SelectItem>
                      <SelectItem value="desc">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4" />
                          Descending
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Filter Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Label>
              </div>

              {/* Active Filters */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {Object.entries(localFilters).map(([key, value]) => {
                    if (!value) return null;
                    const column = columns.find(c => c.key === key);
                    return (
                      <Badge 
                        key={key} 
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">
                          {column?.name}: {getFilterDisplayValue(key, value)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveFilter(key)}
                          data-testid={`button-remove-filter-${key}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Filter Options */}
              {filterableColumns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No filterable columns available
                </p>
              ) : (
                <div className="space-y-4">
                  {filterableColumns.map((column) => (
                    <div key={column.key} className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        {column.type === "date" ? (
                          <Calendar className="h-3 w-3" />
                        ) : (
                          <ListFilter className="h-3 w-3" />
                        )}
                        {column.name}
                      </Label>
                      
                      {column.type === "dropdown" && (
                        <Select
                          value={(localFilters[column.key] as string) || "all"}
                          onValueChange={(val) => 
                            setLocalFilters(prev => ({
                              ...prev,
                              [column.key]: val === "all" ? null : val
                            }))
                          }
                        >
                          <SelectTrigger className="min-h-[44px]" data-testid={`select-filter-${column.key}`}>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {(column.config?.dropdown_options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {column.type === "date" && (
                        <DateRangeFilter
                          value={localFilters[column.key] as DateFilterValue}
                          onChange={(val) => 
                            setLocalFilters(prev => ({
                              ...prev,
                              [column.key]: val
                            }))
                          }
                          placeholder="Select date range"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Apply Button */}
        <div className="flex-shrink-0 pt-4 border-t space-y-2">
          <Button 
            className="w-full min-h-[44px]" 
            onClick={handleApply}
            data-testid="button-apply-filters"
          >
            Apply
            {(localSortColumn || activeFilterCount > 0) && (
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20">
                {(localSortColumn ? 1 : 0) + activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full min-h-[44px]" 
            onClick={handleCancel}
            data-testid="button-cancel-filters"
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
