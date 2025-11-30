import { startOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isValid, isSameDay, isBefore, isAfter, isWithinInterval } from "date-fns";
import type { HighlightingRule, HighlightingCondition, Lead } from "@shared/schema";

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
  const date = parseISO(String(value));
  return isValid(date) ? date : null;
}

function normalizeString(value: any): string {
  return String(value ?? "").toLowerCase().trim();
}

function evaluateCondition(condition: HighlightingCondition, lead: Lead): boolean {
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
      return isSameDay(dateValue, compareDate);
    }
    
    case "date_before": {
      const dateValue = parseDate(fieldValue);
      const compareDate = parseDate(value);
      if (!dateValue || !compareDate) return false;
      return isBefore(dateValue, startOfDay(compareDate));
    }
    
    case "date_after": {
      const dateValue = parseDate(fieldValue);
      const compareDate = parseDate(value);
      if (!dateValue || !compareDate) return false;
      return isAfter(dateValue, startOfDay(compareDate));
    }
    
    case "date_between": {
      const dateValue = parseDate(fieldValue);
      const startDate = parseDate(value);
      const endDate = parseDate(value2);
      if (!dateValue || !startDate || !endDate) return false;
      return isWithinInterval(dateValue, { start: startOfDay(startDate), end: startOfDay(endDate) });
    }
    
    case "is_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isSameDay(dateValue, new Date());
    }
    
    case "is_before_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isBefore(dateValue, startOfDay(new Date()));
    }
    
    case "is_after_today": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      return isAfter(dateValue, startOfDay(new Date()));
    }
    
    case "is_this_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return isWithinInterval(dateValue, { start: weekStart, end: weekEnd });
    }
    
    case "is_next_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const nextWeek = addWeeks(new Date(), 1);
      const weekStart = startOfWeek(nextWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 });
      return isWithinInterval(dateValue, { start: weekStart, end: weekEnd });
    }
    
    case "is_last_week": {
      const dateValue = parseDate(fieldValue);
      if (!dateValue) return false;
      const lastWeek = subWeeks(new Date(), 1);
      const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
      return isWithinInterval(dateValue, { start: weekStart, end: weekEnd });
    }
    
    default:
      return false;
  }
}

function evaluateRule(rule: HighlightingRule, lead: Lead): boolean {
  const { conditions, logical_operator } = rule;
  
  if (!conditions || conditions.length === 0) return false;
  
  if (logical_operator === "and") {
    return conditions.every(condition => evaluateCondition(condition, lead));
  } else {
    return conditions.some(condition => evaluateCondition(condition, lead));
  }
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
  isDarkMode: boolean = false
): HighlightResult | null {
  if (!rules || rules.length === 0) return null;
  
  const activeRules = rules
    .filter(rule => rule.is_active)
    .sort((a, b) => a.priority - b.priority);
  
  for (const rule of activeRules) {
    if (evaluateRule(rule, lead)) {
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
