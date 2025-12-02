import { useAuth } from "@/lib/auth";
import { 
  getCompanyTimezone, 
  formatDateInTimezone, 
  formatDateOnlyInTimezone,
  formatTimeOnlyInTimezone,
  formatRelativeDateInTimezone,
  formatWithPatternInTimezone,
  getCurrentDateInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  isSameDayInTimezone,
  isBeforeTodayInTimezone,
  isAfterTodayInTimezone,
  isWithinThisWeekInTimezone,
  isWithinThisMonthInTimezone,
  DEFAULT_TIMEZONE,
} from "@/lib/timezone-utils";

export interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {}

export function useCompanyTimezone() {
  const { company } = useAuth();
  const timezone = getCompanyTimezone(company);
  
  return {
    timezone,
    
    // Core formatting functions
    formatDate: (date: Date | string | null | undefined, options?: DateTimeFormatOptions) => 
      formatDateInTimezone(date, timezone, options),
    formatDateOnly: (date: Date | string | null | undefined) => 
      formatDateOnlyInTimezone(date, timezone),
    formatTimeOnly: (date: Date | string | null | undefined) => 
      formatTimeOnlyInTimezone(date, timezone),
    formatRelativeDate: (date: Date | string | null | undefined) => 
      formatRelativeDateInTimezone(date, timezone),
    
    // Aliases for common use cases (for easier migration)
    formatDateTime: (date: Date | string | null | undefined, options?: DateTimeFormatOptions) => 
      formatDateInTimezone(date, timezone, options),
    formatTime: (date: Date | string | null | undefined) => 
      formatTimeOnlyInTimezone(date, timezone),
    
    // Custom format pattern support (date-fns patterns like "h:mm a", "EEEE, MMM d", etc.)
    formatInTimezone: (date: Date | string | null | undefined, pattern: string) =>
      formatWithPatternInTimezone(date, timezone, pattern),
    
    // Date utilities
    getCurrentDate: () => getCurrentDateInTimezone(timezone),
    getStartOfDay: (date: Date) => getStartOfDayInTimezone(date, timezone),
    getEndOfDay: (date: Date) => getEndOfDayInTimezone(date, timezone),
    
    // Comparison utilities
    isSameDay: (date1: Date, date2: Date) => isSameDayInTimezone(date1, date2, timezone),
    isBeforeToday: (date: Date) => isBeforeTodayInTimezone(date, timezone),
    isAfterToday: (date: Date) => isAfterTodayInTimezone(date, timezone),
    isWithinThisWeek: (date: Date) => isWithinThisWeekInTimezone(date, timezone),
    isWithinThisMonth: (date: Date) => isWithinThisMonthInTimezone(date, timezone),
  };
}

export { DEFAULT_TIMEZONE };
