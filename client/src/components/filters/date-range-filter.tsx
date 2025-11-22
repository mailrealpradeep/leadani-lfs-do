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
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export type DateFilterValue = {
  type: "today" | "thisWeek" | "thisMonth" | "last7Days" | "custom";
  from?: Date;
  to?: Date;
} | null;

interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  placeholder?: string;
}

export function DateRangeFilter({ value, onChange, placeholder = "Filter..." }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>(value?.type || "");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value?.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value?.to);

  const applyFilter = (type: string, from?: Date, to?: Date) => {
    if (!type) {
      onChange(null);
      return;
    }

    switch (type) {
      case "today": {
        const today = new Date();
        onChange({ type: "today", from: startOfToday(), to: endOfToday() });
        break;
      }
      case "thisWeek": {
        const today = new Date();
        onChange({ type: "thisWeek", from: startOfWeek(today), to: endOfWeek(today) });
        break;
      }
      case "thisMonth": {
        const today = new Date();
        onChange({ type: "thisMonth", from: startOfMonth(today), to: endOfMonth(today) });
        break;
      }
      case "last7Days": {
        const today = new Date();
        onChange({ type: "last7Days", from: subDays(today, 7), to: today });
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
      case "thisWeek":
        return "This Week";
      case "thisMonth":
        return "This Month";
      case "last7Days":
        return "Last 7 Days";
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
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="last7Days">Last 7 Days</SelectItem>
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
