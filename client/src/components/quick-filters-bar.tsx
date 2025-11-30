import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const { data: quickFilters = [], isLoading } = useQuery<QuickFilter[]>({
    queryKey: ["/api/company/quick-filters"],
  });

  useEffect(() => {
    if (isLoading && isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  }, [isLoading, isPopoverOpen]);

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

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleFilterClick = (filterId: string, filterConfig: any) => {
    onApplyFilter(filterId, filterConfig);
    if (isMobile) {
      closePopover();
    }
  };

  const handleThoughtFilterClickMobile = (thought: "sure" | "maybe") => {
    handleThoughtFilter(thought);
  };

  const handleClearAllMobile = () => {
    handleClearAll();
    closePopover();
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

  // Mobile view - single button that opens a dropdown popover
  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Quick Filters</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllMobile}
              className="h-7 px-2 text-xs text-muted-foreground"
              data-testid="button-clear-filters-mobile"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-3">
            {/* Lead Thoughts Section */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground px-1">Lead Thoughts</h4>
              <div className="space-y-1">
                <Button
                  variant={thoughtFilter === "sure" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThoughtFilterClickMobile("sure")}
                  data-testid="button-filter-sure-mobile"
                  className="w-full h-9 justify-start gap-2"
                >
                  <Star className={`h-4 w-4 ${thoughtFilter === "sure" ? "fill-current" : ""} text-emerald-500`} />
                  Sure
                </Button>
                
                <Button
                  variant={thoughtFilter === "maybe" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThoughtFilterClickMobile("maybe")}
                  data-testid="button-filter-maybe-mobile"
                  className="w-full h-9 justify-start gap-2"
                >
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  May Be
                </Button>
              </div>
            </div>

            {/* Custom Quick Filters */}
            {quickFilters.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground px-1">Custom Filters</h4>
                  <div className="space-y-1">
                    {quickFilters.map((filter) => {
                      const IconComponent = filter.icon && ICON_MAP[filter.icon] ? ICON_MAP[filter.icon] : Filter;
                      const iconColor = filter.color && COLOR_MAP[filter.color] ? COLOR_MAP[filter.color] : "";

                      return (
                        <Button
                          key={filter.id}
                          variant={activeQuickFilter === filter.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleFilterClick(filter.id, filter.filter_config)}
                          data-testid={`button-filter-${filter.id}-mobile`}
                          className="w-full h-9 justify-start gap-2"
                        >
                          <IconComponent className={`h-4 w-4 ${iconColor}`} />
                          <span className="truncate">{filter.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
