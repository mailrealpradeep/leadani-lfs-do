import {
  getCurrentDateInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  isSameDayInTimezone,
  getWeekRangeInTimezone,
  getMonthRangeInTimezone,
} from "./timezone-utils";

export type PeriodType = "daily" | "yesterday" | "weekly" | "monthly" | "last_month" | "yearly";

/**
 * Get the first working day of the week based on weekly off days
 * @param weeklyOffDays Array of day numbers (0=Sunday, 6=Saturday) that are off
 * @returns Day number (0-6) of the first working day
 */
export function getFirstWorkingDayOfWeek(weeklyOffDays: number[]): number {
  // If no weekly off days, week starts on Sunday (0)
  if (weeklyOffDays.length === 0) {
    return 0;
  }

  // Find the first day that is not in weeklyOffDays
  for (let day = 0; day < 7; day++) {
    if (!weeklyOffDays.includes(day)) {
      return day;
    }
  }

  // Fallback: if all days are off, return 0
  return 0;
}

/**
 * Check if a date is a working day (not weekly off day and not a holiday)
 * @param date Date to check
 * @param weeklyOffDays Array of day numbers (0-6) that are weekly off days
 * @param holidays Array of holiday dates (dates normalized to start of day)
 * @param timezone Company timezone
 * @returns true if the date is a working day
 */
export function isWorkingDay(
  date: Date,
  weeklyOffDays: number[],
  holidays: Date[],
  timezone: string
): boolean {
  // Normalize date to start of day in timezone for comparison
  const normalizedDate = getStartOfDayInTimezone(date, timezone);
  
  // Check if it's a weekly off day
  const dayOfWeek = normalizedDate.getDay();
  if (weeklyOffDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if it's a holiday
  for (const holiday of holidays) {
    if (isSameDayInTimezone(normalizedDate, holiday, timezone)) {
      return false;
    }
  }

  return true;
}

/**
 * Count working days between start and end dates (inclusive)
 * Excludes weekly off days and holidays
 * @param startDate Start date
 * @param endDate End date (inclusive)
 * @param weeklyOffDays Array of day numbers (0-6) that are weekly off days
 * @param holidays Array of holiday dates
 * @param timezone Company timezone
 * @returns Number of working days
 */
export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  weeklyOffDays: number[],
  holidays: Date[],
  timezone: string
): number {
  const start = getStartOfDayInTimezone(startDate, timezone);
  const end = getStartOfDayInTimezone(endDate, timezone);
  
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (isWorkingDay(current, weeklyOffDays, holidays, timezone)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get week start date based on first working day
 * @param timezone Company timezone
 * @param weeklyOffDays Array of day numbers (0-6) that are weekly off days
 * @returns Start date of the current week (first working day)
 */
function getWeekStartBasedOnWorkingDays(
  timezone: string,
  weeklyOffDays: number[]
): Date {
  // Get the standard week range (Sunday to Saturday)
  const weekRange = getWeekRangeInTimezone(timezone);
  const weekStart = weekRange.start;
  
  // Find the first working day in this week
  let current = new Date(weekStart);
  let foundWorkingDay = false;
  
  // Iterate through the week to find the first working day
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = current.getDay();
    if (!weeklyOffDays.includes(dayOfWeek)) {
      foundWorkingDay = true;
      break;
    }
    current.setDate(current.getDate() + 1);
  }
  
  // If no working day found (all days are off), return the standard week start
  if (!foundWorkingDay) {
    return getStartOfDayInTimezone(weekStart, timezone);
  }
  
  return getStartOfDayInTimezone(current, timezone);
}

/**
 * Get year start and end dates
 * @param timezone Company timezone
 * @returns Start and end dates of the current year
 */
function getYearRangeInTimezone(timezone: string): { start: Date; end: Date } {
  const today = getCurrentDateInTimezone(timezone);
  const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Calculate expected completion percentage based on period type
 * @param periodType Period type (daily, weekly, monthly, yearly)
 * @param weeklyOffDays Array of day numbers (0-6) that are weekly off days
 * @param holidays Array of holiday dates (ISO strings or Date objects)
 * @param timezone Company timezone
 * @param visionBoardStartDate Vision Board start date (optional, used for yearly period)
 * @returns Expected completion percentage (0-100, with 1 decimal for yearly)
 */
export function calculateExpectedPercentage(
  periodType: PeriodType,
  weeklyOffDays: number[],
  holidays: (Date | string)[],
  timezone: string,
  visionBoardStartDate?: Date
): number {
  const today = getCurrentDateInTimezone(timezone);
  const todayStart = getStartOfDayInTimezone(today, timezone);

  // Normalize holidays to Date objects and start of day
  const normalizedHolidays = holidays.map((h) =>
    getStartOfDayInTimezone(typeof h === "string" ? new Date(h) : h, timezone)
  );

  let periodStart: Date;
  let periodEnd: Date;
  let daysCompleted: number;
  let totalWorkingDays: number;

  switch (periodType) {
    case "daily": {
      // For daily: if today is a working day, expected is 100%, else 0%
      if (isWorkingDay(today, weeklyOffDays, normalizedHolidays, timezone)) {
        return 100;
      }
      return 0;
    }

    case "yesterday": {
      // For yesterday: past period, so expected is always 100%
      return 100;
    }

    case "last_month": {
      // For last month: past period, so expected is always 100%
      return 100;
    }

    case "weekly": {
      // Week starts on first working day
      periodStart = getWeekStartBasedOnWorkingDays(timezone, weeklyOffDays);
      // Week ends on the last day of the standard week (Saturday)
      const weekRange = getWeekRangeInTimezone(timezone);
      periodEnd = weekRange.end;

      // Count working days from week start to today (inclusive)
      daysCompleted = countWorkingDays(
        periodStart,
        today,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      // Total working days in the week
      totalWorkingDays = countWorkingDays(
        periodStart,
        periodEnd,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      if (totalWorkingDays === 0) return 0;
      return Math.round((daysCompleted / totalWorkingDays) * 100);
    }

    case "monthly": {
      const monthRange = getMonthRangeInTimezone(timezone);
      periodStart = monthRange.start;
      periodEnd = monthRange.end;

      // Count working days from month start to today (inclusive)
      daysCompleted = countWorkingDays(
        periodStart,
        today,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      // Total working days in the month
      totalWorkingDays = countWorkingDays(
        periodStart,
        periodEnd,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      if (totalWorkingDays === 0) return 0;
      return Math.round((daysCompleted / totalWorkingDays) * 100);
    }

    case "yearly": {
      // Use Vision Board start date to start_date + 1 year (not calendar year)
      if (visionBoardStartDate) {
        periodStart = getStartOfDayInTimezone(visionBoardStartDate, timezone);
        
        // Calculate 1 year from Vision Board start date
        const oneYearLater = new Date(visionBoardStartDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        periodEnd = getEndOfDayInTimezone(oneYearLater, timezone);
      } else {
        // Fallback to calendar year if no start date provided
        const yearRange = getYearRangeInTimezone(timezone);
        periodStart = yearRange.start;
        periodEnd = yearRange.end;
      }

      // Count working days from Vision Board start to today (inclusive)
      // Cap today to periodEnd if it's beyond the Vision Board year
      const effectiveToday = todayStart > periodEnd ? periodEnd : todayStart;
      daysCompleted = countWorkingDays(
        periodStart,
        effectiveToday,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      // Total working days in the Vision Board year (start to start+1year)
      totalWorkingDays = countWorkingDays(
        periodStart,
        periodEnd,
        weeklyOffDays,
        normalizedHolidays,
        timezone
      );

      if (totalWorkingDays === 0) return 0;
      // For yearly: round to 1 decimal place instead of whole number
      const percentage = (daysCompleted / totalWorkingDays) * 100;
      return Math.round(percentage * 10) / 10;
    }

    default:
      return 0;
  }
}

