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

export function getCurrentDateInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1");
  
  return new Date(year, month, day, 0, 0, 0, 0);
}

export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1");
  
  return new Date(year, month, day, 0, 0, 0, 0);
}

export function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  const startOfDay = getStartOfDayInTimezone(date, timezone);
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
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

export function getWeekRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const today = getCurrentDateInTimezone(timezone);
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getMonthRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const today = getCurrentDateInTimezone(timezone);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
