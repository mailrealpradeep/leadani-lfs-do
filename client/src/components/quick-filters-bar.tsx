import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Filter,
  FilterX,
  Flame,
  CalendarIcon,
  Phone,
  AlertCircle,
  Zap,
  UserCheck,
  Clock,
  Star,
  User,
  Users,
  TrendingUp,
  Flag,
  Target,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import type { CustomColumn, QuickFilter } from "@shared/schema";
import { useDashboard } from "./dashboard-context";

interface QuickFiltersBarProps {
  customColumns: CustomColumn[];
  activeQuickFilter: string | null;
  onApplyFilter: (filterId: string, filterConfig: any) => void;
  onClearFilters: () => void;
  isMobile?: boolean;
}

const ICON_MAP: Record<string, any> = {
  filter: Filter,
  phone: Phone,
  calendar: CalendarIcon,
  clock: Clock,
  star: Star,
  user: User,
  users: Users,
  "trending-up": TrendingUp,
  flag: Flag,
  target: Target,
  flame: Flame,
  alert: AlertCircle,
  zap: Zap,
  "user-check": UserCheck,
};

const COLOR_MAP: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400",
  gray: "text-gray-600 dark:text-gray-400",
};

export function QuickFiltersBar({
  customColumns,
  activeQuickFilter,
  onApplyFilter,
  onClearFilters,
  isMobile = false,
}: QuickFiltersBarProps) {
  const { thoughtFilter, setThoughtFilter } = useDashboard();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { data: quickFilters = [], isLoading } = useQuery<QuickFilter[]>({
    queryKey: ["/api/company/quick-filters"],
  });

  const handleThoughtFilter = (thought: "sure" | "maybe") => {
    if (thoughtFilter === thought) {
      setThoughtFilter(null);
    } else {
      setThoughtFilter(thought);
    }
  };

  const handleClearAll = () => {
    setThoughtFilter(null);
    onClearFilters();
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
  };

  const handleFilterClick = (filterId: string, filterConfig: any) => {
    onApplyFilter(filterId, filterConfig);
    if (isMobile) {
      setTimeout(closeSheet, 0);
    }
  };

  const handleThoughtFilterClick = (thought: "sure" | "maybe") => {
    handleThoughtFilter(thought);
    if (isMobile) {
      setTimeout(closeSheet, 0);
    }
  };

  const handleClearAllMobile = () => {
    handleClearAll();
    setTimeout(closeSheet, 0);
  };

  // Count active filters for badge
  const activeFilterCount = 
    (thoughtFilter ? 1 : 0) + 
    (activeQuickFilter ? 1 : 0);

  // Desktop view - show all filters inline
  if (!isMobile) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant={thoughtFilter === "sure" ? "default" : "outline"}
          size="icon"
          onClick={() => handleThoughtFilter("sure")}
          data-testid="button-filter-sure"
          title="Sure Leads"
          className="h-8 w-8"
        >
          <Star className={`h-4 w-4 ${thoughtFilter === "sure" ? "fill-current" : ""} text-emerald-500`} />
        </Button>
        
        <Button
          variant={thoughtFilter === "maybe" ? "default" : "outline"}
          size="icon"
          onClick={() => handleThoughtFilter("maybe")}
          data-testid="button-filter-maybe"
          title="May Be Leads"
          className="h-8 w-8"
        >
          <HelpCircle className={`h-4 w-4 text-amber-500`} />
        </Button>

        {quickFilters.length > 0 && (
          <div className="h-6 w-px bg-border mx-1" />
        )}

        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : (
          quickFilters.map((filter) => {
            const IconComponent = filter.icon && ICON_MAP[filter.icon] ? ICON_MAP[filter.icon] : Filter;
            const iconColor = filter.color && COLOR_MAP[filter.color] ? COLOR_MAP[filter.color] : "";

            return (
              <Button
                key={filter.id}
                variant={activeQuickFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => onApplyFilter(filter.id, filter.filter_config)}
                data-testid={`button-filter-${filter.id}`}
                title={filter.name}
                className="h-8"
              >
                <IconComponent className={`h-3.5 w-3.5 ${iconColor}`} />
                <span className="ml-1.5 text-xs">{filter.name}</span>
              </Button>
            );
          })
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          data-testid="button-clear-filters"
          title="Clear All Filters"
          className="h-8"
        >
          <FilterX className="h-3.5 w-3.5" />
          <span className="ml-1.5 text-xs">Clear</span>
        </Button>
      </div>
    );
  }

  // Mobile view - single button that opens a sheet
  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 relative"
          data-testid="button-quick-filters-mobile"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[60vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Quick Filters</span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllMobile}
                className="h-8 text-muted-foreground"
                data-testid="button-clear-filters-mobile"
              >
                <FilterX className="h-4 w-4 mr-1.5" />
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 pb-4">
          {/* Lead Thoughts Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Lead Thoughts</h4>
            <div className="flex gap-2">
              <Button
                variant={thoughtFilter === "sure" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThoughtFilterClick("sure")}
                data-testid="button-filter-sure-mobile"
                className="flex-1 h-10"
              >
                <Star className={`h-4 w-4 mr-2 ${thoughtFilter === "sure" ? "fill-current" : ""} text-emerald-500`} />
                Sure
              </Button>
              
              <Button
                variant={thoughtFilter === "maybe" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThoughtFilterClick("maybe")}
                data-testid="button-filter-maybe-mobile"
                className="flex-1 h-10"
              >
                <HelpCircle className="h-4 w-4 mr-2 text-amber-500" />
                May Be
              </Button>
            </div>
          </div>

          {/* Custom Quick Filters */}
          {quickFilters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Custom Filters</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickFilters.map((filter) => {
                  const IconComponent = filter.icon && ICON_MAP[filter.icon] ? ICON_MAP[filter.icon] : Filter;
                  const iconColor = filter.color && COLOR_MAP[filter.color] ? COLOR_MAP[filter.color] : "";

                  return (
                    <Button
                      key={filter.id}
                      variant={activeQuickFilter === filter.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterClick(filter.id, filter.filter_config)}
                      data-testid={`button-filter-${filter.id}-mobile`}
                      className="h-10 justify-start"
                    >
                      <IconComponent className={`h-4 w-4 mr-2 ${iconColor}`} />
                      <span className="truncate">{filter.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
