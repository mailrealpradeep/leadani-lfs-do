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

function evaluateTriggerCondition(
  value: any,
  operator: string,
  triggerValue: any
): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const stringValue = String(value).toLowerCase();
  const triggerString = String(triggerValue).toLowerCase();

  switch (operator) {
    case 'equals':
      return stringValue === triggerString;
    
    case 'in':
      if (Array.isArray(triggerValue)) {
        return triggerValue.some(tv => 
          String(tv).toLowerCase() === stringValue
        );
      }
      return stringValue.includes(triggerString);
    
    case 'not_equals':
      return stringValue !== triggerString;
    
    case 'not_in':
      if (Array.isArray(triggerValue)) {
        return !triggerValue.some(tv => 
          String(tv).toLowerCase() === stringValue
        );
      }
      return !stringValue.includes(triggerString);
    
    default:
      return false;
  }
}

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

export function validateLead(
  lead: Lead,
  rule: ValidationRule
): ValidationResult {
  const triggerValue = getLeadFieldValue(lead, rule.trigger_column_key);
  
  const isTriggered = evaluateTriggerCondition(
    triggerValue,
    rule.operator,
    rule.trigger_value
  );

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
