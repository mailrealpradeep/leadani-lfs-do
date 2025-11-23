import { Button } from "@/components/ui/button";
import { Flame, CalendarIcon, Phone, AlertCircle, Zap, UserCheck, FilterX } from "lucide-react";
import type { CustomColumn } from "@shared/schema";

interface QuickFiltersBarProps {
  customColumns: CustomColumn[];
  activeQuickFilter: string | null;
  onApplyFilter: (filterType: string) => void;
  onClearFilters: () => void;
  isMobile?: boolean;
}

export function QuickFiltersBar({
  customColumns,
  activeQuickFilter,
  onApplyFilter,
  onClearFilters,
  isMobile = false,
}: QuickFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant={activeQuickFilter === "hot_cold_warm" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("hot_cold_warm")}
        data-testid="button-filter-lead-type"
        title="Lead Type (Hot/Cold/Warm)"
        className="h-8"
      >
        <Flame className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Lead Type</span>}
      </Button>

      <Button
        variant={activeQuickFilter === "visit_today" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("visit_today")}
        data-testid="button-filter-visit-today"
        title="Visit Scheduled Today"
        className="h-8"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Visit Today</span>}
      </Button>

      <Button
        variant={activeQuickFilter === "followup_today" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("followup_today")}
        data-testid="button-filter-followup-today"
        title="Follow-up Today"
        className="h-8"
      >
        <Phone className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Follow-up</span>}
      </Button>

      <Button
        variant={activeQuickFilter === "not_attended" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("not_attended")}
        data-testid="button-filter-not-attended"
        title="Not Attended Leads"
        className="h-8"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Not Attended</span>}
      </Button>

      <Button
        variant={activeQuickFilter === "todays_leads" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("todays_leads")}
        data-testid="button-filter-todays-leads"
        title="Today's Leads"
        className="h-8"
      >
        <Zap className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Today's Leads</span>}
      </Button>

      <Button
        variant={activeQuickFilter === "visit_tomorrow" ? "default" : "outline"}
        size="sm"
        onClick={() => onApplyFilter("visit_tomorrow")}
        data-testid="button-filter-visit-tomorrow"
        title="Visit Scheduled Tomorrow"
        className="h-8"
      >
        <UserCheck className="h-3.5 w-3.5" />
        {!isMobile && <span className="ml-1.5 text-xs">Tomorrow</span>}
      </Button>

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
