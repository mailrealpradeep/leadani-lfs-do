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
} from "lucide-react";
import type { CustomColumn, QuickFilter } from "@shared/schema";
import { useAuth } from "@/lib/auth";

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
  const { company } = useAuth();

  // Fetch quick filters for the company
  const { data: quickFilters = [], isLoading } = useQuery<QuickFilter[]>({
    queryKey: ["/api/company/quick-filters", company?.id],
    enabled: !!company,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="text-xs text-muted-foreground">Loading filters...</div>
      </div>
    );
  }

  if (quickFilters.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="text-xs text-muted-foreground">
          No quick filters configured. Add them from the Admin Console.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {quickFilters.map((filter) => {
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
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
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
