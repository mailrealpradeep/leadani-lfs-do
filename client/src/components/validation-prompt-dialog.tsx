import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, ChevronRight, Sparkles, Star, X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import type { CustomColumn, ValidationRule, DropdownOption } from "@shared/schema";

interface RequiredColumn {
  column_key: string;
  is_required: boolean;
}

interface ValidationPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ValidationRule;
  columns: CustomColumn[];
  dropdownOptions: Record<string, DropdownOption[]>;
  currentValues: Record<string, any>;
  triggerChange: {
    column_key: string;
    old_value: any;
    new_value: any;
  };
  onConfirm: (fieldValues: Record<string, any>) => void;
  onCancel: () => void;
}

export function ValidationPromptDialog({
  open,
  onOpenChange,
  rule,
  columns,
  dropdownOptions,
  currentValues,
  triggerChange,
  onConfirm,
  onCancel,
}: ValidationPromptDialogProps) {
  const { toast } = useToast();
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredColumns: RequiredColumn[] = rule.required_columns && rule.required_columns.length > 0
    ? rule.required_columns
    : (rule.required_fields || []).map((key: string) => ({ column_key: key, is_required: true }));

  useEffect(() => {
    if (open) {
      const initialValues: Record<string, any> = {};
      requiredColumns.forEach((rc) => {
        const existingValue = currentValues[rc.column_key];
        initialValues[rc.column_key] = existingValue ?? "";
      });
      setFieldValues(initialValues);
      setErrors({});
    }
  }, [open, rule, currentValues]);

  const getColumnByKey = (key: string): CustomColumn | undefined => {
    return columns.find(c => c.column_key === key);
  };

  const getColumnLabel = (key: string): string => {
    const col = getColumnByKey(key);
    return col?.name || key;
  };

  const handleFieldChange = (columnKey: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [columnKey]: value }));
    if (errors[columnKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[columnKey];
        return newErrors;
      });
    }
  };

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    requiredColumns.forEach((rc) => {
      if (rc.is_required) {
        const value = fieldValues[rc.column_key];
        const isEmpty = value === undefined || value === null || value === "";
        if (isEmpty) {
          newErrors[rc.column_key] = `${getColumnLabel(rc.column_key)} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please fill in all required fields before continuing",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredValues: Record<string, any> = {};
      Object.entries(fieldValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          filteredValues[key] = value;
        }
      });
      onConfirm(filteredValues);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const renderFieldInput = (columnKey: string, isRequired: boolean) => {
    const column = getColumnByKey(columnKey);
    const value = fieldValues[columnKey] ?? "";
    const hasError = !!errors[columnKey];

    if (!column) {
      return (
        <Input
          value={value}
          onChange={(e) => handleFieldChange(columnKey, e.target.value)}
          placeholder={`Enter ${columnKey}`}
          className={hasError ? "border-destructive" : ""}
          data-testid={`input-validation-${columnKey}`}
        />
      );
    }

    switch (column.type) {
      case "dropdown":
        const options = dropdownOptions[columnKey] || [];
        return (
          <Select
            value={value || undefined}
            onValueChange={(v) => handleFieldChange(columnKey, v)}
          >
            <SelectTrigger 
              className={hasError ? "border-destructive" : ""}
              data-testid={`select-validation-${columnKey}`}
            >
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.value}>
                  {opt.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        const parseDateValue = (val: string) => {
          if (!val) return undefined;
          try {
            // Handle YYYY-MM-DD format as local date (not UTC)
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
              const [year, month, day] = val.split("-").map(Number);
              return new Date(year, month - 1, day);
            }
            return parseISO(val);
          } catch {
            return undefined;
          }
        };
        const dateValue = parseDateValue(value);
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${hasError ? "border-destructive" : ""} ${!value ? "text-muted-foreground" : ""}`}
                data-testid={`date-picker-validation-${columnKey}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "dd/MM/yyyy") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="top" sideOffset={5}>
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    handleFieldChange(columnKey, format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleFieldChange(columnKey, "")}
                >
                  Clear date
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );

      case "datetime":
        const parseDateTimeValue = (val: string) => {
          if (!val) return undefined;
          try {
            return parseISO(val);
          } catch {
            return undefined;
          }
        };
        const datetimeValue = parseDateTimeValue(value);
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${hasError ? "border-destructive" : ""} ${!value ? "text-muted-foreground" : ""}`}
                data-testid={`datetime-picker-validation-${columnKey}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeValue ? format(datetimeValue, "dd/MM/yyyy HH:mm") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="top" sideOffset={5}>
              <Calendar
                mode="single"
                selected={datetimeValue}
                onSelect={(date) => {
                  if (date) {
                    if (datetimeValue) {
                      date.setHours(datetimeValue.getHours(), datetimeValue.getMinutes());
                    }
                    handleFieldChange(columnKey, date.toISOString());
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Time:</Label>
                  <Input
                    type="time"
                    value={datetimeValue ? format(datetimeValue, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      const currentDate = datetimeValue ? new Date(datetimeValue) : new Date();
                      currentDate.setHours(hours, minutes);
                      handleFieldChange(columnKey, currentDate.toISOString());
                    }}
                    className="w-24 h-8"
                    data-testid={`time-input-validation-${columnKey}`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleFieldChange(columnKey, "")}
                >
                  Clear
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );

      case "number":
      case "percentage":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(columnKey, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className={hasError ? "border-destructive" : ""}
            data-testid={`input-validation-${columnKey}`}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => handleFieldChange(columnKey, checked)}
              data-testid={`switch-validation-${columnKey}`}
            />
            <span className="text-sm text-muted-foreground">
              {value === true || value === "true" ? "Yes" : "No"}
            </span>
          </div>
        );

      case "mobile":
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleFieldChange(columnKey, e.target.value)}
            placeholder="Enter phone number"
            className={hasError ? "border-destructive" : ""}
            data-testid={`input-validation-${columnKey}`}
          />
        );

      case "text":
      default:
        const isLongText = column.name?.toLowerCase().includes("remark") || 
                           column.name?.toLowerCase().includes("note") ||
                           column.name?.toLowerCase().includes("comment") ||
                           column.name?.toLowerCase().includes("description");
        if (isLongText) {
          return (
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(columnKey, e.target.value)}
              placeholder={`Enter ${column.name}`}
              className={`min-h-[80px] ${hasError ? "border-destructive" : ""}`}
              data-testid={`textarea-validation-${columnKey}`}
            />
          );
        }
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(columnKey, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className={hasError ? "border-destructive" : ""}
            data-testid={`input-validation-${columnKey}`}
          />
        );
    }
  };

  const triggerColumnLabel = getColumnLabel(triggerChange.column_key);
  const requiredCount = requiredColumns.filter(rc => rc.is_required).length;
  const optionalCount = requiredColumns.filter(rc => !rc.is_required).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </motion.div>
              <div>
                <DialogTitle className="text-lg">{rule.name}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm">
              <span className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                Changing <strong>{triggerColumnLabel}</strong> to <Badge variant="secondary" className="mx-1">{triggerChange.new_value}</Badge>
              </span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(60vh-10rem)] max-h-[400px] px-6 overflow-y-auto">
            <div className="py-4 space-y-4">
              {requiredCount > 0 && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Required Fields ({requiredCount})
                  </div>
                  {requiredColumns
                    .filter(rc => rc.is_required)
                    .map((rc, index) => (
                      <motion.div
                        key={rc.column_key}
                        className="space-y-1.5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                      >
                        <Label className="flex items-center gap-1.5 text-sm">
                          {getColumnLabel(rc.column_key)}
                          <Star className="h-3 w-3 text-destructive fill-destructive" />
                        </Label>
                        {renderFieldInput(rc.column_key, true)}
                        {errors[rc.column_key] && (
                          <motion.p 
                            className="text-xs text-destructive"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                          >
                            {errors[rc.column_key]}
                          </motion.p>
                        )}
                      </motion.div>
                    ))}
                </motion.div>
              )}

              {optionalCount > 0 && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Optional Fields ({optionalCount})
                  </div>
                  {requiredColumns
                    .filter(rc => !rc.is_required)
                    .map((rc, index) => (
                      <motion.div
                        key={rc.column_key}
                        className="space-y-1.5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <Label className="text-sm text-muted-foreground">
                          {getColumnLabel(rc.column_key)}
                        </Label>
                        {renderFieldInput(rc.column_key, false)}
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 pt-4 border-t gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid="button-validation-cancel"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="button-validation-confirm"
            >
              <motion.div
                className="flex items-center gap-1.5"
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Confirm & Save"}
              </motion.div>
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export function useValidationRuleChecker(
  validationRules: ValidationRule[],
  columns: CustomColumn[],
  currentLead: Record<string, any> | null
) {
  const checkForTriggeredRules = (
    columnKey: string,
    oldValue: any,
    newValue: any
  ): ValidationRule | null => {
    if (!validationRules || validationRules.length === 0) return null;
    if (!currentLead) return null;

    for (const rule of validationRules) {
      if (!rule.is_active && rule.is_active !== undefined && rule.is_active !== null) continue;

      const proposedLead = { ...currentLead, [columnKey]: newValue };

      if (rule.conditions && rule.conditions.length > 0) {
        const results = rule.conditions.map(condition => 
          evaluateCondition(condition, proposedLead, columns)
        );
        
        const allMatch = rule.logical_operator === "or" 
          ? results.some(r => r)
          : results.every(r => r);
        
        if (allMatch) {
          return rule;
        }
      } else if (rule.trigger_column_key === columnKey && rule.operator) {
        if (evaluateSingleCondition(rule.operator, newValue, rule.trigger_value)) {
          return rule;
        }
      }
    }
    return null;
  };

  return { checkForTriggeredRules };
}

function evaluateCondition(
  condition: { column_key: string; operator: string; value?: any; value2?: any },
  lead: Record<string, any>,
  columns: CustomColumn[]
): boolean {
  const leadValue = lead[condition.column_key];
  return evaluateSingleCondition(condition.operator, leadValue, condition.value, condition.value2);
}

function evaluateSingleCondition(
  operator: string,
  leadValue: any,
  conditionValue: any,
  conditionValue2?: any
): boolean {
  const strLeadValue = String(leadValue || "").toLowerCase();
  const strCondValue = String(conditionValue || "").toLowerCase();

  switch (operator) {
    case "equals":
      return strLeadValue === strCondValue;
    case "not_equals":
      return strLeadValue !== strCondValue;
    case "contains":
      return strLeadValue.includes(strCondValue);
    case "not_contains":
      return !strLeadValue.includes(strCondValue);
    case "starts_with":
      return strLeadValue.startsWith(strCondValue);
    case "ends_with":
      return strLeadValue.endsWith(strCondValue);
    case "is_empty":
      return !leadValue || leadValue === "";
    case "is_not_empty":
      return !!leadValue && leadValue !== "";
    case "in":
      const inValues = Array.isArray(conditionValue) 
        ? conditionValue.map(v => String(v).toLowerCase())
        : String(conditionValue).split(",").map(v => v.trim().toLowerCase());
      return inValues.includes(strLeadValue);
    case "not_in":
      const notInValues = Array.isArray(conditionValue)
        ? conditionValue.map(v => String(v).toLowerCase())
        : String(conditionValue).split(",").map(v => v.trim().toLowerCase());
      return !notInValues.includes(strLeadValue);
    case "greater_than":
      return Number(leadValue) > Number(conditionValue);
    case "less_than":
      return Number(leadValue) < Number(conditionValue);
    case "greater_equal":
      return Number(leadValue) >= Number(conditionValue);
    case "less_equal":
      return Number(leadValue) <= Number(conditionValue);
    case "between":
      const numVal = Number(leadValue);
      return numVal >= Number(conditionValue) && numVal <= Number(conditionValue2);
    case "date_equals":
    case "date_not_equals":
    case "date_before":
    case "date_after":
      return evaluateDateCondition(operator, leadValue, conditionValue);
    default:
      return false;
  }
}

function evaluateDateCondition(operator: string, leadValue: any, conditionValue: any): boolean {
  if (!leadValue || !conditionValue) return operator === "date_equals" ? false : true;
  
  const leadDate = new Date(leadValue).getTime();
  const condDate = new Date(conditionValue).getTime();
  
  if (isNaN(leadDate) || isNaN(condDate)) return false;

  switch (operator) {
    case "date_equals":
      return Math.abs(leadDate - condDate) < 86400000;
    case "date_not_equals":
      return Math.abs(leadDate - condDate) >= 86400000;
    case "date_before":
      return leadDate < condDate;
    case "date_after":
      return leadDate > condDate;
    default:
      return false;
  }
}
