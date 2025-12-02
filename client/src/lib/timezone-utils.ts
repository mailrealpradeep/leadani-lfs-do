import type { Company } from "@shared/schema";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getCompanyTimezone(company: Company | null | undefined): string {
  return company?.settings?.timezone || DEFAULT_TIMEZONE;
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

export function formatRelativeDateInTimezone(
  date: Date | string | null | undefined,
  timezone: string
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return formatDateOnlyInTimezone(d, timezone);
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

export function isBeforeTodayInTimezone(date: Date, timezone: string): boolean {
  const today = getCurrentDateInTimezone(timezone);
  const dateStart = getStartOfDayInTimezone(date, timezone);
  return dateStart.getTime() < today.getTime();
}

export function isAfterTodayInTimezone(date: Date, timezone: string): boolean {
  const today = getCurrentDateInTimezone(timezone);
  const dateStart = getStartOfDayInTimezone(date, timezone);
  return dateStart.getTime() > today.getTime();
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

export function isWithinThisWeekInTimezone(date: Date, timezone: string): boolean {
  const { start, end } = getWeekRangeInTimezone(timezone);
  const dateStart = getStartOfDayInTimezone(date, timezone);
  return dateStart.getTime() >= start.getTime() && dateStart.getTime() <= end.getTime();
}

export function isWithinThisMonthInTimezone(date: Date, timezone: string): boolean {
  const today = getCurrentDateInTimezone(timezone);
  const dateStart = getStartOfDayInTimezone(date, timezone);
  return dateStart.getMonth() === today.getMonth() && dateStart.getFullYear() === today.getFullYear();
}

export function formatDateISO(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}
