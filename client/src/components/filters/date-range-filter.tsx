import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  getCurrentDateInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getWeekRangeInTimezone,
  getMonthRangeInTimezone,
  DEFAULT_TIMEZONE,
} from "@/lib/timezone-utils";

export type DateFilterValue = {
  type: "today" | "yesterday" | "thisWeek" | "thisMonth" | "last7Days" | "last30Days" | "custom" | "tomorrow";
  from?: Date;
  to?: Date;
} | null;

interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  placeholder?: string;
  timezone?: string;
}

export function DateRangeFilter({ value, onChange, placeholder = "Filter...", timezone = DEFAULT_TIMEZONE }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>(value?.type || "");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value?.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value?.to);

  const applyFilter = (type: string, from?: Date, to?: Date) => {
    if (!type) {
      onChange(null);
      return;
    }

    // Use company timezone for all date calculations to ensure consistency
    const today = getCurrentDateInTimezone(timezone);
    const todayEnd = getEndOfDayInTimezone(today, timezone);

    switch (type) {
      case "today": {
        onChange({ type: "today", from: today, to: todayEnd });
        break;
      }
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStart = getStartOfDayInTimezone(yesterday, timezone);
        const yesterdayEnd = getEndOfDayInTimezone(yesterday, timezone);
        onChange({ type: "yesterday", from: yesterdayStart, to: yesterdayEnd });
        break;
      }
      case "thisWeek": {
        const weekRange = getWeekRangeInTimezone(timezone);
        onChange({ type: "thisWeek", from: weekRange.start, to: weekRange.end });
        break;
      }
      case "thisMonth": {
        const monthRange = getMonthRangeInTimezone(timezone);
        onChange({ type: "thisMonth", from: monthRange.start, to: monthRange.end });
        break;
      }
      case "last7Days": {
        const last7Start = new Date(today);
        last7Start.setDate(today.getDate() - 7);
        onChange({ type: "last7Days", from: getStartOfDayInTimezone(last7Start, timezone), to: todayEnd });
        break;
      }
      case "last30Days": {
        const last30Start = new Date(today);
        last30Start.setDate(today.getDate() - 30);
        onChange({ type: "last30Days", from: getStartOfDayInTimezone(last30Start, timezone), to: todayEnd });
        break;
      }
      case "custom": {
        if (from && to) {
          onChange({ type: "custom", from, to });
        }
        break;
      }
    }
  };

  const handleFilterTypeChange = (newType: string) => {
    setFilterType(newType);
    if (newType !== "custom") {
      applyFilter(newType);
      setIsOpen(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (customFrom && customTo) {
      applyFilter("custom", customFrom, customTo);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setFilterType("");
    setCustomFrom(undefined);
    setCustomTo(undefined);
    onChange(null);
  };

  const getFilterLabel = () => {
    if (!value) return placeholder;

    switch (value.type) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "tomorrow":
        return "Tomorrow";
      case "thisWeek":
        return "This Week";
      case "thisMonth":
        return "This Month";
      case "last7Days":
        return "Last 7 Days";
      case "last30Days":
        return "Last 30 Days";
      case "custom":
        if (value.from && value.to) {
          return `${format(value.from, "dd/MM/yy")} - ${format(value.to, "dd/MM/yy")}`;
        }
        return "Custom Range";
      default:
        return placeholder;
    }
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full justify-start text-left font-normal text-xs"
            data-testid="button-date-filter"
          >
            <Filter className="h-3 w-3 mr-1" />
            <span className="flex-1 truncate">{getFilterLabel()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <Select value={filterType} onValueChange={handleFilterTypeChange}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-date-filter-type">
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="last7Days">Last 7 Days</SelectItem>
                <SelectItem value="last30Days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {filterType === "custom" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start text-left font-normal text-xs"
                        data-testid="button-date-from"
                      >
                        <CalendarIcon className="h-3 w-3 mr-2" />
                        {customFrom ? format(customFrom, "dd/MM/yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customFrom}
                        onSelect={setCustomFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start text-left font-normal text-xs"
                        data-testid="button-date-to"
                      >
                        <CalendarIcon className="h-3 w-3 mr-2" />
                        {customTo ? format(customTo, "dd/MM/yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customTo}
                        onSelect={setCustomTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!customFrom || !customTo}
                  size="sm"
                  className="w-full h-8 text-xs"
                  data-testid="button-apply-custom-range"
                >
                  Apply Range
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          data-testid="button-clear-date-filter"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
