import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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

// Icon mapping for quick filters
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

// Color mapping for quick filters (Tailwind variants)
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
  
  // Fetch quick filters for the company
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Built-in Sure and May Be thought filters */}
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

      {/* Divider if there are quick filters */}
      {quickFilters.length > 0 && (
        <div className="h-6 w-px bg-border mx-1" />
      )}

      {/* User-defined quick filters */}
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
              {!isMobile && <span className="ml-1.5 text-xs">{filter.name}</span>}
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
        {!isMobile && <span className="ml-1.5 text-xs">Clear</span>}
      </Button>
    </div>
  );
}
