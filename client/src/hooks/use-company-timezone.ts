import { useAuth } from "@/lib/auth";
import { 
  getCompanyTimezone, 
  formatDateInTimezone, 
  formatDateOnlyInTimezone,
  formatTimeOnlyInTimezone,
  formatRelativeDateInTimezone,
  getCurrentDateInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  isSameDayInTimezone,
  isBeforeTodayInTimezone,
  isAfterTodayInTimezone,
  isWithinThisWeekInTimezone,
  isWithinThisMonthInTimezone,
} from "@/lib/timezone-utils";

export function useCompanyTimezone() {
  const { company } = useAuth();
  const timezone = getCompanyTimezone(company);
  
  return {
    timezone,
    formatDate: (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => 
      formatDateInTimezone(date, timezone, options),
    formatDateOnly: (date: Date | string | null | undefined) => 
      formatDateOnlyInTimezone(date, timezone),
    formatTimeOnly: (date: Date | string | null | undefined) => 
      formatTimeOnlyInTimezone(date, timezone),
    formatRelativeDate: (date: Date | string | null | undefined) => 
      formatRelativeDateInTimezone(date, timezone),
    getCurrentDate: () => getCurrentDateInTimezone(timezone),
    getStartOfDay: (date: Date) => getStartOfDayInTimezone(date, timezone),
    getEndOfDay: (date: Date) => getEndOfDayInTimezone(date, timezone),
    isSameDay: (date1: Date, date2: Date) => isSameDayInTimezone(date1, date2, timezone),
    isBeforeToday: (date: Date) => isBeforeTodayInTimezone(date, timezone),
    isAfterToday: (date: Date) => isAfterTodayInTimezone(date, timezone),
    isWithinThisWeek: (date: Date) => isWithinThisWeekInTimezone(date, timezone),
    isWithinThisMonth: (date: Date) => isWithinThisMonthInTimezone(date, timezone),
  };
}
