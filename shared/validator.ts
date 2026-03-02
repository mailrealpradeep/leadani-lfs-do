import type { ValidationRule, Lead, CustomColumn } from "./schema";

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  triggeredBy?: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateMobileNumber(value: any): FieldValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true };
  }

  const stringValue = String(value).trim();
  
  if (!/^\d{10}$/.test(stringValue)) {
    return {
      isValid: false,
      error: "Mobile number must be exactly 10 digits"
    };
  }

  return { isValid: true };
}

export function validatePercentage(value: any): FieldValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true };
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: "Percentage must be a valid number"
    };
  }

  if (numValue < 0 || numValue > 100) {
    return {
      isValid: false,
      error: "Percentage must be between 0 and 100"
    };
  }

  return { isValid: true };
}

export function validateFieldValue(
  value: any,
  column: CustomColumn
): FieldValidationResult {
  if (column.type === 'mobile') {
    const isEmpty = value === null || value === undefined || value === '';
    
    if (isEmpty && column.config.required) {
      return {
        isValid: false,
        error: `${column.name} is required`
      };
    }
    
    return validateMobileNumber(value);
  }

  if (column.type === 'percentage') {
    const isEmpty = value === null || value === undefined || value === '';
    
    if (isEmpty && column.config.required) {
      return {
        isValid: false,
        error: `${column.name} is required`
      };
    }
    
    return validatePercentage(value);
  }

  if (column.config.required && isFieldEmpty(value)) {
    return {
      isValid: false,
      error: `${column.name} is required`
    };
  }

  return { isValid: true };
}

function getLeadFieldValue(lead: Lead, fieldKey: string): any {
  if (fieldKey in lead) {
    return (lead as any)[fieldKey];
  }
  
  if (lead.custom_fields && typeof lead.custom_fields === 'object') {
    return (lead.custom_fields as any)[fieldKey];
  }
  
  return undefined;
}

/**
 * Helper to check if a field value is empty.
 * Correctly treats numeric 0 and boolean false as valid (non-empty) values.
 */
function isFieldEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  
  return false;
}

/**
 * Evaluate a condition against a lead field value.
 * Supports all operators including text, number, date, and range operators.
 * Exported for reuse on frontend to ensure parity with server-side validation.
 */
export function evaluateCondition(
  leadValue: any,
  operator: string,
  conditionValue: any,
  conditionValue2?: any
): boolean {
  const strLeadValue = String(leadValue || "").toLowerCase().trim();
  const strCondValue = String(conditionValue || "").toLowerCase().trim();

  switch (operator) {
    // Text/dropdown operators
    case 'equals':
      return strLeadValue === strCondValue;
    case 'not_equals':
      return strLeadValue !== strCondValue;
    case 'contains':
      return strLeadValue.includes(strCondValue);
    case 'not_contains':
      return !strLeadValue.includes(strCondValue);
    case 'starts_with':
      return strLeadValue.startsWith(strCondValue);
    case 'ends_with':
      return strLeadValue.endsWith(strCondValue);
    case 'is_empty':
      // Use isFieldEmpty helper to correctly handle numeric 0 and boolean false as valid values
      return isFieldEmpty(leadValue);
    case 'is_not_empty':
      return !isFieldEmpty(leadValue);
    case 'in':
      const inValues = Array.isArray(conditionValue)
        ? conditionValue.map(v => String(v).toLowerCase().trim())
        : String(conditionValue).split(",").map(v => v.trim().toLowerCase());
      return inValues.includes(strLeadValue);
    case 'not_in':
      const notInValues = Array.isArray(conditionValue)
        ? conditionValue.map(v => String(v).toLowerCase().trim())
        : String(conditionValue).split(",").map(v => v.trim().toLowerCase());
      return !notInValues.includes(strLeadValue);
    
    // Number operators
    case 'greater_than':
      return Number(leadValue) > Number(conditionValue);
    case 'less_than':
      return Number(leadValue) < Number(conditionValue);
    case 'greater_equal':
      return Number(leadValue) >= Number(conditionValue);
    case 'less_equal':
      return Number(leadValue) <= Number(conditionValue);
    case 'between':
      const numVal = Number(leadValue);
      return numVal >= Number(conditionValue) && numVal <= Number(conditionValue2 || conditionValue);
    
    // Date operators
    case 'date_equals':
      return evaluateDateHelper(leadValue, conditionValue, (a, b) => Math.abs(a - b) < 86400000);
    case 'date_not_equals':
      return evaluateDateHelper(leadValue, conditionValue, (a, b) => Math.abs(a - b) >= 86400000);
    case 'date_before':
      return evaluateDateHelper(leadValue, conditionValue, (a, b) => a < b);
    case 'date_after':
      return evaluateDateHelper(leadValue, conditionValue, (a, b) => a > b);
    case 'date_between':
      if (!leadValue || !conditionValue || !conditionValue2) return false;
      try {
        const leadDate = new Date(leadValue).getTime();
        const fromDate = new Date(conditionValue).getTime();
        const toDate = new Date(conditionValue2).getTime();
        return !isNaN(leadDate) && !isNaN(fromDate) && !isNaN(toDate) && leadDate >= fromDate && leadDate <= toDate;
      } catch { return false; }
    
    default:
      return strLeadValue === strCondValue;
  }
}

function evaluateDateHelper(leadValue: any, conditionValue: any, compareFn: (a: number, b: number) => boolean): boolean {
  if (!leadValue || !conditionValue) return false;
  try {
    const leadDate = new Date(leadValue).getTime();
    const condDate = new Date(conditionValue).getTime();
    if (isNaN(leadDate) || isNaN(condDate)) return false;
    return compareFn(leadDate, condDate);
  } catch { return false; }
}

export function validateLead(
  lead: Lead,
  rule: ValidationRule
): ValidationResult {
  let isTriggered = false;

  // Skip if rule is explicitly inactive
  if (rule.is_active === false) {
    return { isValid: true, missingFields: [] };
  }

  // Check new multi-condition format first
  if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    const results = rule.conditions.map(condition => {
      const leadValue = getLeadFieldValue(lead, condition.column_key);
      return evaluateCondition(leadValue, condition.operator, condition.value, condition.value2);
    });
    // Default to "and" if logical_operator is undefined
    const logicalOp = rule.logical_operator || "and";
    isTriggered = logicalOp === "or" 
      ? results.some(r => r)
      : results.every(r => r);
  } 
  // Fall back to legacy single-condition format
  else if (rule.trigger_column_key && rule.operator) {
    const triggerValue = getLeadFieldValue(lead, rule.trigger_column_key);
    isTriggered = evaluateCondition(triggerValue, rule.operator, rule.trigger_value);
  }

  if (!isTriggered) {
    return {
      isValid: true,
      missingFields: [],
    };
  }

  const missingFields: string[] = [];
  const requiredFields = Array.isArray(rule.required_fields) 
    ? rule.required_fields 
    : [];

  for (const fieldKey of requiredFields) {
    const fieldValue = getLeadFieldValue(lead, fieldKey);
    if (isFieldEmpty(fieldValue)) {
      missingFields.push(fieldKey);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    triggeredBy: rule.name,
  };
}

/**
 * Returns the column keys that are declared as "optional" (is_required: false)
 * by any matching validation rule for the given lead.
 * Used to waive normally-required fields (e.g. NFDT) when conditions are met.
 */
export function getOptionalFieldKeys(lead: Lead, rules: ValidationRule[]): string[] {
  const optionalKeys: string[] = [];

  for (const rule of rules) {
    // Skip inactive rules
    if (rule.is_active === false) continue;

    // Skip rules with no optional columns
    if (!rule.required_columns || !Array.isArray(rule.required_columns) || rule.required_columns.length === 0) continue;
    const optionalCols = rule.required_columns.filter(c => c.is_required === false);
    if (optionalCols.length === 0) continue;

    // Evaluate conditions (same logic as validateLead)
    let isTriggered = false;
    if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
      const results = rule.conditions.map(condition => {
        const leadValue = getLeadFieldValue(lead, condition.column_key);
        return evaluateCondition(leadValue, condition.operator, condition.value, condition.value2);
      });
      const logicalOp = rule.logical_operator || "and";
      isTriggered = logicalOp === "or" ? results.some(r => r) : results.every(r => r);
    } else if (rule.trigger_column_key && rule.operator) {
      const triggerValue = getLeadFieldValue(lead, rule.trigger_column_key);
      isTriggered = evaluateCondition(triggerValue, rule.operator, rule.trigger_value);
    }

    if (isTriggered) {
      for (const col of optionalCols) {
        optionalKeys.push(col.column_key);
      }
    }
  }

  return Array.from(new Set(optionalKeys));
}

export function validateLeadAgainstRules(
  lead: Lead,
  rules: ValidationRule[]
): ValidationResult {
  const allMissingFields: string[] = [];
  const triggeredRules: string[] = [];

  for (const rule of rules) {
    const result = validateLead(lead, rule);
    if (!result.isValid) {
      allMissingFields.push(...result.missingFields);
      if (result.triggeredBy) {
        triggeredRules.push(result.triggeredBy);
      }
    }
  }

  const uniqueMissingFields = Array.from(new Set(allMissingFields));

  return {
    isValid: uniqueMissingFields.length === 0,
    missingFields: uniqueMissingFields,
    triggeredBy: triggeredRules.length > 0 
      ? triggeredRules.join(', ') 
      : undefined,
  };
}
