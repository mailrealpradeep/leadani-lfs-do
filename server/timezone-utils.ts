import type { Company } from "@shared/schema";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

const IANA_TO_OFFSET: Record<string, string> = {
  "Pacific/Midway": "-11:00",
  "Pacific/Honolulu": "-10:00",
  "America/Anchorage": "-09:00",
  "America/Los_Angeles": "-08:00",
  "America/Denver": "-07:00",
  "America/Chicago": "-06:00",
  "America/New_York": "-05:00",
  "America/Caracas": "-04:00",
  "America/Sao_Paulo": "-03:00",
  "Atlantic/South_Georgia": "-02:00",
  "Atlantic/Azores": "-01:00",
  "UTC": "+00:00",
  "Europe/London": "+00:00",
  "Europe/Paris": "+01:00",
  "Europe/Berlin": "+01:00",
  "Africa/Cairo": "+02:00",
  "Europe/Moscow": "+03:00",
  "Asia/Dubai": "+04:00",
  "Asia/Karachi": "+05:00",
  "Asia/Kolkata": "+05:30",
  "Asia/Dhaka": "+06:00",
  "Asia/Bangkok": "+07:00",
  "Asia/Shanghai": "+08:00",
  "Asia/Singapore": "+08:00",
  "Asia/Tokyo": "+09:00",
  "Australia/Sydney": "+11:00",
  "Pacific/Auckland": "+12:00",
};

export function getCompanyTimezone(company: Company | undefined | null): string {
  return company?.settings?.timezone || DEFAULT_TIMEZONE;
}

export function getTimezoneOffset(timezone: string): string {
  return IANA_TO_OFFSET[timezone] || "+05:30";
}

export function formatDateInTimezone(
  date: Date | string | null | undefined,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  
  return d.toLocaleString("en-IN", { ...defaultOptions, ...options });
}

export function formatDateOnlyInTimezone(
  date: Date | string | null | undefined,
  timezone: string
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimeOnlyInTimezone(
  date: Date | string | null | undefined,
  timezone: string
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleTimeString("en-IN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateForSheet(
  date: Date | string | null | undefined,
  timezone: string
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  const dateStr = d.toLocaleDateString("en-CA", { timeZone: timezone });
  const timeStr = d.toLocaleTimeString("en-GB", { 
    timeZone: timezone, 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });
  
  return `${dateStr} ${timeStr}`;
}

/**
 * Get the current date components (year, month, day) in the specified timezone.
 * Returns a Date object representing midnight of TODAY in the company timezone,
 * converted to the correct UTC instant.
 */
export function getCurrentDateInTimezone(timezone: string): Date {
  return getStartOfDayInTimezone(new Date(), timezone);
}

/**
 * Convert a date to the start of day (midnight) in the specified timezone,
 * returning the correct UTC instant.
 * 
 * Example: If timezone is Asia/Kolkata (+05:30) and the date is Dec 11, 2024:
 * - Midnight in IST is Dec 11, 2024 00:00:00 IST
 * - Which equals Dec 10, 2024 18:30:00 UTC
 * - The returned Date object will represent this UTC instant
 */
export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  // Get the date components as they appear in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1");
  
  // Create an ISO string for midnight in the target timezone
  // Format: YYYY-MM-DDTHH:MM:SS+HH:MM
  const offsetStr = getTimezoneOffset(timezone);
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00${offsetStr}`;
  
  return new Date(isoString);
}

/**
 * Get the end of day (23:59:59.999) in the specified timezone,
 * returning the correct UTC instant.
 */
export function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  // Get the date components as they appear in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1");
  
  // Create an ISO string for end of day in the target timezone
  const offsetStr = getTimezoneOffset(timezone);
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999${offsetStr}`;
  
  return new Date(isoString);
}

export function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  return formatter.format(date1) === formatter.format(date2);
}

/**
 * Get the date range for the current week (Sunday to Saturday) in the specified timezone.
 * Returns UTC instants for the start and end of the week.
 */
export function getWeekRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = getStartOfDayInTimezone(now, timezone);
  
  // Get day of week in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayName = formatter.format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[dayName] || 0;
  
  // Calculate start of week (Sunday)
  const startMs = todayStart.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000);
  const start = new Date(startMs);
  
  // Calculate end of week (Saturday 23:59:59.999)
  const endMs = startMs + (6 * 24 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000) - 1;
  const end = new Date(endMs);
  
  return { start, end };
}

/**
 * Get the date range for the current month in the specified timezone.
 * Returns UTC instants for the start and end of the month.
 */
export function getMonthRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const now = new Date();
  
  // Get year and month in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
  
  // Get offset for the timezone
  const offsetStr = getTimezoneOffset(timezone);
  
  // Start of month: 1st day at midnight
  const startIso = `${year}-${String(month).padStart(2, '0')}-01T00:00:00${offsetStr}`;
  const start = new Date(startIso);
  
  // End of month: last day at 23:59:59.999
  // Calculate last day by going to next month and subtracting 1 day
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDayDate = new Date(Date.UTC(nextYear, nextMonth - 1, 0));
  const lastDay = lastDayDate.getUTCDate();
  
  const endIso = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999${offsetStr}`;
  const end = new Date(endIso);
  
  return { start, end };
}

/**
 * Get date range for yesterday in the specified timezone.
 */
export function getYesterdayRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = getStartOfDayInTimezone(now, timezone);
  
  // Yesterday starts 24 hours before today's start
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);
  
  return { start: yesterdayStart, end: yesterdayEnd };
}

/**
 * Get the date range for last week (Sunday to Saturday) in the specified timezone.
 */
export function getLastWeekRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const thisWeek = getWeekRangeInTimezone(timezone);
  
  // Last week ends just before this week starts
  const lastWeekEnd = new Date(thisWeek.start.getTime() - 1);
  // Last week starts 7 days before this week
  const lastWeekStart = new Date(thisWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return { start: lastWeekStart, end: lastWeekEnd };
}

/**
 * Get the date range for last month in the specified timezone.
 */
export function getLastMonthRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const now = new Date();
  
  // Get year and month in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
  
  // Calculate last month
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastMonthYear = month === 1 ? year - 1 : year;
  
  // Get offset for the timezone
  const offsetStr = getTimezoneOffset(timezone);
  
  // Start of last month
  const startIso = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01T00:00:00${offsetStr}`;
  const start = new Date(startIso);
  
  // End of last month (last day at 23:59:59.999)
  const lastDayDate = new Date(Date.UTC(year, month - 1, 0)); // Day 0 of current month = last day of previous
  const lastDay = lastDayDate.getUTCDate();
  
  const endIso = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999${offsetStr}`;
  const end = new Date(endIso);
  
  return { start, end };
}
