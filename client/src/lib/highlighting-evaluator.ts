import { startOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isValid, isSameDay, isBefore, isAfter, isWithinInterval } from "date-fns";
import type { HighlightingRule, HighlightingCondition, Lead } from "@shared/schema";
import { 
  getCurrentDateInTimezone, 
  getStartOfDayInTimezone, 
  isSameDayInTimezone,
  isBeforeTodayInTimezone,
  isAfterTodayInTimezone,
  isWithinThisWeekInTimezone,
  getWeekRangeInTimezone,
} from "./timezone-utils";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

const HIGHLIGHT_COLORS = {
  // Red variants
  red_light: { light: "hsl(0, 86%, 97%)", dark: "hsl(0, 50%, 15%)" },
  red: { light: "hsl(0, 84%, 95%)", dark: "hsl(0, 70%, 20%)" },
  red_dark: { light: "hsl(0, 72%, 91%)", dark: "hsl(0, 80%, 25%)" },
  // Green variants
  green_light: { light: "hsl(142, 76%, 95%)", dark: "hsl(142, 40%, 12%)" },
  green: { light: "hsl(142, 69%, 90%)", dark: "hsl(142, 50%, 18%)" },
  green_dark: { light: "hsl(142, 60%, 85%)", dark: "hsl(142, 60%, 22%)" },
  // Blue variants
  blue_light: { light: "hsl(210, 100%, 96%)", dark: "hsl(210, 50%, 15%)" },
  blue: { light: "hsl(210, 100%, 93%)", dark: "hsl(210, 70%, 20%)" },
  blue_dark: { light: "hsl(210, 80%, 88%)", dark: "hsl(210, 80%, 28%)" },
  // Other colors
  yellow: { light: "hsl(48, 96%, 89%)", dark: "hsl(48, 70%, 20%)" },
  orange: { light: "hsl(24, 100%, 92%)", dark: "hsl(24, 70%, 20%)" },
  purple: { light: "hsl(270, 80%, 93%)", dark: "hsl(270, 60%, 22%)" },
  pink: { light: "hsl(330, 80%, 95%)", dark: "hsl(330, 60%, 20%)" },
  teal: { light: "hsl(174, 72%, 90%)", dark: "hsl(174, 55%, 18%)" },
} as const;

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

function getValue(lead: Lead, columnKey: string): any {
  return lead.custom_fields?.[columnKey] ?? null;
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
}

function parseDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  
  const strValue = String(value);
  
  // Check if this is a date-only string (YYYY-MM-DD format without time)
  // Parse as noon UTC to avoid timezone boundary issues
  const dateOnlyMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const utcDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0));
    return isValid(utcDate) ? utcDate : null;
  }
  
  // For full ISO strings with time, use parseISO
  const date = parseISO(strValue);
  return isValid(date) ? date : null;
}

function normalizeString(value: any): string {
  return String(value ?? "").toLowerCase().trim();
}

function evaluateCondition(condition: HighlightingCondition, lead: Lead, timezone: string = DEFAULT_TIMEZONE): boolean {
  const { column_key, operator, value, value2 } = condition;
  const fieldValue = getValue(lead, column_key);

  switch (operator) {
    case "is_empty":
      return isEmpty(fieldValue);
    
    case "is_not_empty":
      return !isEmpty(fieldValue);
    
    case "equals":
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => normalizeString(v) === normalizeString(value));
      }
      return normalizeString(fieldValue) === normalizeString(value);
    
    case "not_equals":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => normalizeString(v) === normalizeString(value));
      }
      return normalizeString(fieldValue) !== normalizeString(value);
    
    case "contains": {
      const searchValue = normalizeString(value);
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => normalizeString(v).includes(searchValue));
      }
      return normalizeString(fieldValue).includes(searchValue);
    }
    
    case "not_contains": {
      const searchValue = normalizeString(value);
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => normalizeString(v).includes(searchValue));
      }
      return !normalizeString(fieldValue).includes(searchValue);
    }
    
    case "starts_with":
      return normalizeString(fieldValue).startsWith(normalizeString(value));
    
    case "ends_with":
      return normalizeString(fieldValue).endsWith(normalizeString(value));
    
    case "greater_than": {
      const numValue = parseNumber(fieldValue);
      const compareValue = parseNumber(value);
      if (numValue === null || compareValue === null) return false;
      return numValue > compareValue;
    }
    
    case "less_than": {
      const numValue = parseNumber(fieldValue);
      const compareValue = parseNumber(value);
      if (numValue === null || compareValue === null) return false;
      return numValue < compareValue;
    }
    
    case "greater_equal": {
      const numValue = parseNumber(fieldValue);
      const compareValue = parseNumber(value);
      if (numValue === null || compareValue === null) return false;
      return numValue >= compareValue;
    }
    
    case "less_equal": {
      const numValue = parseNumber(fieldValue);
      const compareValue = parseNumber(value);
      if (numValue === null || compareValue === null) return false;
      return numValue <= compareValue;
    }
    
    case "between": {
      const numValue = parseNumber(fieldValue);
      const minValue = parseNumber(value);
      const maxValue = parseNumber(value2);
      if (numValue === null || minValue === null || maxValue === null) return false;
      return numValue >= minValue && numValue <= maxValue;
    }
    
    case "date_equals": {
      const dateValue = parseDate(fieldValue);
      const compareDate = parseDate(value);
      if (!dateValue || !compareDate) return false;
      return isSameDayInTimezone(dateValue, compareDate, timezone);
    }
    
    case "date_before": {
      const dateValue = parseDate(fieldValue);
      const compareDate = parseDate(value);
      if (!dateValue || !compareDate) return false;
      const compareDayStart = getStartOfDayInTimezone(compareDate, timezone);
      return dateValue.getTime() < compareDayStart.getTime();
    }
    
    case "date_after": {
      const dateValue = parseDate(fieldValue);
      const compareDate = parseDate(value);
      if (!dateValue || !compareDate) return false;
      const compareDayStart = getStartOfDayInTimezone(compareDate, timezone);
      return dateValue.getTime() > compareDayStart.getTime();
    }
    
    case "date_between": {
      const dateValue = parseDate(fieldValue);
      const startDate = parseDate(value);
      const endDate = parseDate(value2);
      if (!dateValue || !startDate || !endDate) return false;
      const startDayStart = getStartOfDayInTimezone(startDate, timezone);
      const endDayEnd = new Date(getStartOfDayInTimezone(endDate, timezone).getTime() + 24 * 60 * 60 * 1000 - 1);
      return dateValue.getTime() >= startDayStart.getTime() && dateValue.getTime() <= endDayEnd.getTime();
    }
    
    case "is_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isSameDayInTimezone(dateValue, new Date(), timezone);
    }
    
    case "is_tomorrow": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return isSameDayInTimezone(dateValue, tomorrow, timezone);
    }
    
    case "is_before_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isBeforeTodayInTimezone(dateValue, timezone);
    }
    
    case "is_after_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isAfterTodayInTimezone(dateValue, timezone);
    }
    
    case "is_this_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isWithinThisWeekInTimezone(dateValue, timezone);
    }
    
    case "is_next_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const nextWeek = addWeeks(new Date(), 1);
      const { start, end } = getWeekRangeInTimezone(timezone);
      const nextWeekStart = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dateValue.getTime() >= nextWeekStart.getTime() && dateValue.getTime() <= nextWeekEnd.getTime();
    }
    
    case "is_last_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const { start, end } = getWeekRangeInTimezone(timezone);
      const lastWeekStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return dateValue.getTime() >= lastWeekStart.getTime() && dateValue.getTime() <= lastWeekEnd.getTime();
    }
    
    default:
      return false;
  }
}

// Evaluate rule conditions with per-condition next_operator for mixed AND/OR logic
// Conditions are evaluated left-to-right: each condition's next_operator connects it to the next
function evaluateRule(rule: HighlightingRule, lead: Lead, timezone: string = DEFAULT_TIMEZONE): boolean {
  const { conditions } = rule;
  
  if (!conditions || conditions.length === 0) return false;
  
  // For a single condition, just evaluate it directly
  if (conditions.length === 1) {
    return evaluateCondition(conditions[0], lead, timezone);
  }
  
  // For multiple conditions, use per-condition next_operator (left-to-right evaluation)
  let result = evaluateCondition(conditions[0], lead, timezone);
  
  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1];
    const currentConditionResult = evaluateCondition(conditions[i], lead, timezone);
    
    // Use the previous condition's next_operator to combine with current result
    // Default to "and" if not specified
    const operator = prevCondition.next_operator || "and";
    
    if (operator === "and") {
      result = result && currentConditionResult;
    } else {
      result = result || currentConditionResult;
    }
  }
  
  return result;
}

export interface HighlightResult {
  colorId: HighlightColor;
  colorLight: string;
  colorDark: string;
  ruleName: string;
  ruleId: string;
}

export function evaluateHighlightingRules(
  rules: HighlightingRule[],
  lead: Lead,
  isDarkMode: boolean = false,
  timezone: string = DEFAULT_TIMEZONE
): HighlightResult | null {
  if (!rules || rules.length === 0) return null;
  
  const activeRules = rules
    .filter(rule => rule.is_active)
    .sort((a, b) => a.priority - b.priority);
  
  for (const rule of activeRules) {
    if (evaluateRule(rule, lead, timezone)) {
      const colorId = rule.row_color as HighlightColor;
      const color = HIGHLIGHT_COLORS[colorId];
      return {
        colorId,
        colorLight: color?.light || "",
        colorDark: color?.dark || "",
        ruleName: rule.name,
        ruleId: rule.id,
      };
    }
  }
  
  return null;
}

export function getHighlightColor(colorId: HighlightColor, isDarkMode: boolean): string {
  const color = HIGHLIGHT_COLORS[colorId];
  return isDarkMode ? color.dark : color.light;
}

export function getHighlightColors(colorId: HighlightColor): { light: string; dark: string } {
  return HIGHLIGHT_COLORS[colorId];
}
