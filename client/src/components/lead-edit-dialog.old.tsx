import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Save, X, Calendar as CalendarIcon, Clock, AlertCircle, Star, Sparkles, ChevronRight, CheckCircle2, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parse } from "date-fns";
import type { Lead, CustomColumn, ValidationRule, DropdownOption } from "@shared/schema";
import { evaluateCondition } from "@shared/validator";

interface RequiredColumn {
  column_key: string;
  is_required: boolean;
}

interface LeadEditDialogProps {
  leadId: string | null;
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationRules?: ValidationRule[];
}

export function LeadEditDialog({ leadId, sheetId, open, onOpenChange, validationRules = [] }: LeadEditDialogProps) {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  
  // Validation state
  const [triggeredRule, setTriggeredRule] = useState<ValidationRule | null>(null);
  const [triggerChange, setTriggerChange] = useState<{ column_key: string; old_value: any; new_value: any } | null>(null);
  const [validationFieldValues, setValidationFieldValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  
  // Refs for scrolling and focusing
  const validationSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: lead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
  });

  const { data: columns = [], isLoading: isLoadingColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId && open,
  });

  // Fetch dropdown options for validation fields
  const { data: dropdownOptions = {} } = useQuery<Record<string, DropdownOption[]>>({
    queryKey: ["/api/sheets", sheetId, "dropdown-options"],
    enabled: !!sheetId && open,
  });

  // Fetch validation rules for this sheet (includes company-wide rules where sheet_id is NULL)
  const { data: fetchedValidationRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", sheetId, "validation-rules"],
    enabled: !!sheetId && open,
  });

  // Use fetched validation rules, with prop as fallback for backwards compatibility
  const activeValidationRules = fetchedValidationRules.length > 0 ? fetchedValidationRules : validationRules;

  useEffect(() => {
    if (lead && open) {
      const customFields = { ...lead.custom_fields };
      setFormValues(customFields);
      setOriginalValues(customFields);
      // Reset validation state when dialog opens
      setTriggeredRule(null);
      setTriggerChange(null);
      setValidationFieldValues({});
      setValidationErrors({});
      setShowValidationAlert(false);
    }
  }, [lead, open]);

  const updateLeadMutation = useMutation({
    mutationFn: async (customFields: Record<string, any>) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { custom_fields: customFields });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ title: "Lead updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get required columns from triggered rule
  const requiredColumns: RequiredColumn[] = useMemo(() => {
    if (!triggeredRule) return [];
    return triggeredRule.required_columns && triggeredRule.required_columns.length > 0
      ? triggeredRule.required_columns
      : (triggeredRule.required_fields || []).map((key: string) => ({ column_key: key, is_required: true }));
  }, [triggeredRule]);

  // Check if any validation rule is triggered
  const checkValidationRules = (columnKey: string, newValue: any, updatedFormValues: Record<string, any>) => {
    console.log('[LeadEditDialog] checkValidationRules called:', {
      columnKey,
      newValue,
      activeValidationRulesCount: activeValidationRules?.length,
      activeValidationRules: activeValidationRules?.map(r => ({ name: r.name, conditions: r.conditions })),
    });
    if (!activeValidationRules || activeValidationRules.length === 0) return null;
    if (!lead) return null;

    // Build proposed lead with full lead object + updated custom_fields (matching desktop logic)
    const proposedLead = { 
      ...lead, 
      custom_fields: { ...updatedFormValues } 
    };

    for (const rule of activeValidationRules) {
      if (rule.is_active === false) continue;

      // Check new multi-condition format
      if (rule.conditions && rule.conditions.length > 0) {
        const results = rule.conditions.map(condition => {
          const leadValue = proposedLead.custom_fields?.[condition.column_key];
          return evaluateCondition(leadValue, condition.operator, condition.value, condition.value2);
        });
        const logicalOp = rule.logical_operator || "and";
        const matches = logicalOp === "or" 
          ? results.some(r => r)
          : results.every(r => r);
        
        if (matches) return rule;
      }
      
      // Check legacy single-condition format using evaluateCondition
      if (rule.trigger_column_key === columnKey && rule.operator) {
        if (evaluateCondition(newValue, rule.operator, rule.trigger_value)) {
          return rule;
        }
      }
    }
    return null;
  };

  const handleFieldChange = (columnKey: string, value: any) => {
    const newFormValues = {
      ...formValues,
      [columnKey]: value,
    };
    setFormValues(newFormValues);

    // Check if this change triggers a validation rule (use newFormValues for up-to-date state)
    const triggered = checkValidationRules(columnKey, value, newFormValues);
    
    if (triggered && !triggeredRule) {
      // New rule triggered
      setTriggeredRule(triggered);
      setTriggerChange({
        column_key: columnKey,
        old_value: originalValues[columnKey],
        new_value: value,
      });
      // Initialize validation field values from current form values
      const initialValues: Record<string, any> = {};
      const cols = triggered.required_columns && triggered.required_columns.length > 0
        ? triggered.required_columns
        : (triggered.required_fields || []).map((key: string) => ({ column_key: key, is_required: true }));
      cols.forEach((rc: RequiredColumn) => {
        initialValues[rc.column_key] = newFormValues[rc.column_key] ?? "";
      });
      setValidationFieldValues(initialValues);
      setValidationErrors({});
    } else if (!triggered && triggeredRule) {
      // Rule no longer triggered (user changed the triggering field back)
      setTriggeredRule(null);
      setTriggerChange(null);
      setValidationFieldValues({});
      setValidationErrors({});
    }
  };

  const handleValidationFieldChange = (columnKey: string, value: any) => {
    setValidationFieldValues(prev => ({ ...prev, [columnKey]: value }));
    // Also update main form values
    setFormValues(prev => ({ ...prev, [columnKey]: value }));
    // Clear error for this field
    if (validationErrors[columnKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[columnKey];
        return newErrors;
      });
    }
  };

  // Returns newErrors object so we can use it immediately (avoids stale state issue)
  const validateRequiredFields = (): Record<string, string> => {
    if (!triggeredRule) return {};
    
    const newErrors: Record<string, string> = {};
    requiredColumns.forEach((rc) => {
      if (rc.is_required) {
        const value = validationFieldValues[rc.column_key];
        const isEmpty = value === undefined || value === null || value === "";
        if (isEmpty) {
          const column = columns.find(c => c.column_key === rc.column_key);
          newErrors[rc.column_key] = `${column?.name || rc.column_key} is required`;
        }
      }
    });

    setValidationErrors(newErrors);
    return newErrors;
  };

  // Scroll to validation section and focus first error field
  // Accepts errors directly to avoid stale state from async React updates
  const scrollToValidationSection = (errors: Record<string, string>) => {
    // First scroll the container to top to show validation section
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Find first error field and focus it after scroll
    setTimeout(() => {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey && fieldRefs.current[firstErrorKey]) {
        fieldRefs.current[firstErrorKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Try to focus the input inside
        const input = fieldRefs.current[firstErrorKey]?.querySelector('input, select, textarea, button');
        if (input) (input as HTMLElement).focus();
      }
    }, 300);
  };

  const handleSave = () => {
    // If validation rule is triggered, validate required fields first
    if (triggeredRule) {
      const errors = validateRequiredFields();
      if (Object.keys(errors).length > 0) {
        setShowValidationAlert(true);
        scrollToValidationSection(errors);
        return;
      }
    }
    
    // Clear alert on successful validation
    setShowValidationAlert(false);
    
    // Merge validation field values into form values
    const finalValues = { ...formValues, ...validationFieldValues };
    updateLeadMutation.mutate(finalValues);
  };

  const handleCancelValidation = () => {
    // Revert the triggering change and clear validation state
    if (triggerChange) {
      setFormValues(prev => ({
        ...prev,
        [triggerChange.column_key]: triggerChange.old_value,
      }));
    }
    setTriggeredRule(null);
    setTriggerChange(null);
    setValidationFieldValues({});
    setValidationErrors({});
    setShowValidationAlert(false);
  };

  // Jump to specific field handler
  const jumpToField = (columnKey: string) => {
    if (fieldRefs.current[columnKey]) {
      fieldRefs.current[columnKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = fieldRefs.current[columnKey]?.querySelector('input, select, textarea, button');
      if (input) (input as HTMLElement).focus();
    }
  };

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);

  const getFullName = () => {
    if (!formValues) return "Edit Lead";
    const namePatterns = [/^full[_\s]?name/i, /^name$/i];
    for (const pattern of namePatterns) {
      const key = Object.keys(formValues).find((k) => pattern.test(k));
      if (key && formValues[key]) return String(formValues[key]);
    }
    return "Edit Lead";
  };

  const normalizeDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    const strValue = String(value);
    
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(strValue)) {
      try {
        return parse(strValue, "dd/MM/yy", new Date());
      } catch {
        return undefined;
      }
    }
    
    try {
      return new Date(strValue);
    } catch {
      return undefined;
    }
  };

  const getColumnByKey = (key: string): CustomColumn | undefined => {
    return columns.find(c => c.column_key === key);
  };

  const getColumnLabel = (key: string): string => {
    const col = getColumnByKey(key);
    return col?.name || key;
  };

  const renderField = (column: CustomColumn) => {
    const value = formValues[column.column_key];
    const config = column.config as any;

    switch (column.type) {
      case "dropdown":
        const allOptions = config?.dropdown_options || [];
        const hiddenSystemValues = config?.hidden_system_values || [];
        const currentValue = value;
        return (
          <Select
            value={value ?? ""}
            onValueChange={(val) => handleFieldChange(column.column_key, val)}
          >
            <SelectTrigger className="min-h-[44px]" data-testid={`select-${column.column_key}`}>
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((opt: string) => {
                const isHidden = hiddenSystemValues.includes(opt);
                // Show hidden values only if they are the current value
                if (isHidden && opt !== currentValue) return null;
                return (
                  <SelectItem 
                    key={opt} 
                    value={opt}
                    className={isHidden ? "text-muted-foreground opacity-60" : ""}
                  >
                    {opt}{isHidden ? " (disabled)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "date":
        const dateValue = normalizeDate(value);
        return (
          <Popover 
            open={datePickerOpen === column.column_key} 
            onOpenChange={(open) => setDatePickerOpen(open ? column.column_key : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-h-[44px] justify-start text-left font-normal"
                data-testid={`date-picker-${column.column_key}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "dd/MM/yy") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    handleFieldChange(column.column_key, format(date, "yyyy-MM-dd"));
                  }
                  setDatePickerOpen(null);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "datetime":
        const datetimeValue = normalizeDate(value);
        const currentTime = datetimeValue ? format(datetimeValue, "HH:mm") : "09:00";
        return (
          <Popover 
            open={datePickerOpen === column.column_key} 
            onOpenChange={(open) => setDatePickerOpen(open ? column.column_key : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-h-[44px] justify-start text-left font-normal"
                data-testid={`datetime-picker-${column.column_key}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeValue ? format(datetimeValue, "dd/MM/yy HH:mm") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={datetimeValue}
                onSelect={(date) => {
                  if (date) {
                    // Preserve existing time or default to 09:00
                    if (datetimeValue) {
                      date.setHours(datetimeValue.getHours(), datetimeValue.getMinutes());
                    } else {
                      date.setHours(9, 0);
                    }
                    handleFieldChange(column.column_key, date.toISOString());
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Time:</span>
                <Input
                  type="time"
                  className="h-9 w-28 cursor-pointer"
                  defaultValue={currentTime}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  onChange={(e) => {
                    const timeValue = e.target.value;
                    if (timeValue) {
                      const [hours, minutes] = timeValue.split(':').map(Number);
                      const newDate = datetimeValue ? new Date(datetimeValue) : new Date();
                      newDate.setHours(hours, minutes);
                      handleFieldChange(column.column_key, newDate.toISOString());
                    }
                  }}
                  data-testid={`time-input-${column.column_key}`}
                />
              </div>
              <div className="px-3 pb-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={() => {
                    handleFieldChange(column.column_key, null);
                    setDatePickerOpen(null);
                  }}
                  data-testid={`button-clear-datetime-${column.column_key}`}
                >
                  Clear
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDatePickerOpen(null)}
                  data-testid={`button-done-datetime-${column.column_key}`}
                >
                  Done
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
            value={value ?? ""}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className="min-h-[44px]"
            data-testid={`input-${column.column_key}`}
          />
        );

      case "mobile":
        return (
          <Input
            type="tel"
            value={value ?? ""}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className="min-h-[44px]"
            data-testid={`input-${column.column_key}`}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value ?? ""}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className="min-h-[44px]"
            data-testid={`input-${column.column_key}`}
          />
        );
    }
  };

  // Render validation field input (similar to ValidationPromptDialog)
  const renderValidationFieldInput = (columnKey: string, isRequired: boolean) => {
    const column = getColumnByKey(columnKey);
    const value = validationFieldValues[columnKey] ?? "";
    const hasError = !!validationErrors[columnKey];

    if (!column) {
      return (
        <Input
          value={value}
          onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
          placeholder={`Enter ${columnKey}`}
          className={`min-h-[44px] ${hasError ? "border-destructive" : ""}`}
          data-testid={`input-validation-${columnKey}`}
        />
      );
    }

    switch (column.type) {
      case "dropdown":
        const config = column.config as any;
        const options = config?.dropdown_options || [];
        return (
          <Select
            value={value || undefined}
            onValueChange={(v) => handleValidationFieldChange(columnKey, v)}
          >
            <SelectTrigger 
              className={`min-h-[44px] ${hasError ? "border-destructive" : ""}`}
              data-testid={`select-validation-${columnKey}`}
            >
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        const dateValue = normalizeDate(value);
        return (
          <Popover 
            open={datePickerOpen === `validation-${columnKey}`} 
            onOpenChange={(open) => setDatePickerOpen(open ? `validation-${columnKey}` : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full min-h-[44px] justify-start text-left font-normal ${hasError ? "border-destructive" : ""} ${!value ? "text-muted-foreground" : ""}`}
                data-testid={`date-picker-validation-${columnKey}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "dd/MM/yy") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    handleValidationFieldChange(columnKey, format(date, "yyyy-MM-dd"));
                  }
                  setDatePickerOpen(null);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "datetime":
        const datetimeValue = normalizeDate(value);
        const currentTime = datetimeValue ? format(datetimeValue, "HH:mm") : "09:00";
        return (
          <Popover 
            open={datePickerOpen === `validation-${columnKey}`} 
            onOpenChange={(open) => setDatePickerOpen(open ? `validation-${columnKey}` : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full min-h-[44px] justify-start text-left font-normal ${hasError ? "border-destructive" : ""} ${!value ? "text-muted-foreground" : ""}`}
                data-testid={`datetime-picker-validation-${columnKey}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeValue ? format(datetimeValue, "dd/MM/yy HH:mm") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={datetimeValue}
                onSelect={(date) => {
                  if (date) {
                    if (datetimeValue) {
                      date.setHours(datetimeValue.getHours(), datetimeValue.getMinutes());
                    } else {
                      date.setHours(9, 0);
                    }
                    handleValidationFieldChange(columnKey, date.toISOString());
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Time:</span>
                <Input
                  type="time"
                  className="h-9 w-28 cursor-pointer"
                  defaultValue={currentTime}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  onChange={(e) => {
                    const timeValue = e.target.value;
                    if (timeValue) {
                      const [hours, minutes] = timeValue.split(':').map(Number);
                      const newDate = datetimeValue ? new Date(datetimeValue) : new Date();
                      newDate.setHours(hours, minutes);
                      handleValidationFieldChange(columnKey, newDate.toISOString());
                    }
                  }}
                  data-testid={`time-input-validation-${columnKey}`}
                />
              </div>
              <div className="px-3 pb-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={() => {
                    handleValidationFieldChange(columnKey, null);
                    setDatePickerOpen(null);
                  }}
                  data-testid={`button-clear-datetime-validation-${columnKey}`}
                >
                  Clear
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDatePickerOpen(null)}
                  data-testid={`button-done-datetime-validation-${columnKey}`}
                >
                  Done
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
            onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className={`min-h-[44px] ${hasError ? "border-destructive" : ""}`}
            data-testid={`input-validation-${columnKey}`}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2 min-h-[44px]">
            <Switch
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => handleValidationFieldChange(columnKey, checked)}
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
            onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
            placeholder="Enter phone number"
            className={`min-h-[44px] ${hasError ? "border-destructive" : ""}`}
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
              onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
              placeholder={`Enter ${column.name}`}
              className={`min-h-[80px] ${hasError ? "border-destructive" : ""}`}
              data-testid={`textarea-validation-${columnKey}`}
            />
          );
        }
        return (
          <Input
            value={value}
            onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className={`min-h-[44px] ${hasError ? "border-destructive" : ""}`}
            data-testid={`input-validation-${columnKey}`}
          />
        );
    }
  };

  const isLoading = isLoadingLead || isLoadingColumns;
  const requiredCount = requiredColumns.filter(rc => rc.is_required).length;
  const optionalCount = requiredColumns.filter(rc => !rc.is_required).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="flex-shrink-0 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {getFullName()}
          </SheetTitle>
          <SheetDescription>
            Edit lead information
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Inline Validation Error Alert - Shown when save fails validation */}
              <AnimatePresence>
                {showValidationAlert && Object.keys(validationErrors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2"
                    data-testid="validation-error-alert"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <span className="text-sm font-medium text-destructive">
                        Missing required fields
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(validationErrors).map((key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="cursor-pointer border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
                          onClick={() => jumpToField(key)}
                          data-testid={`badge-jump-to-${key}`}
                        >
                          <ArrowUp className="h-3 w-3 mr-1" />
                          {getColumnLabel(key)}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validation Rule Section - Shown when a rule is triggered */}
              <AnimatePresence>
                {triggeredRule && triggerChange && (
                  <motion.div
                    ref={validationSectionRef}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{triggeredRule.name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 flex-wrap">
                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                            <span>Changing</span>
                            <strong className="truncate">{getColumnLabel(triggerChange.column_key)}</strong>
                            <span>to</span>
                            <Badge variant="secondary" className="text-xs">{String(triggerChange.new_value)}</Badge>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={handleCancelValidation}
                          data-testid="button-cancel-validation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Required Fields */}
                      {requiredCount > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Required Fields ({requiredCount})
                          </div>
                          {requiredColumns
                            .filter(rc => rc.is_required)
                            .map((rc) => (
                              <div 
                                key={rc.column_key} 
                                className="space-y-1.5"
                                ref={(el) => { fieldRefs.current[rc.column_key] = el; }}
                              >
                                <Label className="flex items-center gap-1.5 text-sm">
                                  {getColumnLabel(rc.column_key)}
                                  <Star className="h-3 w-3 text-destructive fill-destructive" />
                                </Label>
                                {renderValidationFieldInput(rc.column_key, true)}
                                {validationErrors[rc.column_key] && (
                                  <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {validationErrors[rc.column_key]}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Optional Fields */}
                      {optionalCount > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4" />
                            Optional Fields ({optionalCount})
                          </div>
                          {requiredColumns
                            .filter(rc => !rc.is_required)
                            .map((rc) => (
                              <div 
                                key={rc.column_key} 
                                className="space-y-1.5"
                                ref={(el) => { fieldRefs.current[rc.column_key] = el; }}
                              >
                                <Label className="text-sm text-muted-foreground">
                                  {getColumnLabel(rc.column_key)}
                                </Label>
                                {renderValidationFieldInput(rc.column_key, false)}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Regular Fields */}
              {sortedColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <Label 
                    htmlFor={column.column_key}
                    className="text-sm font-medium"
                  >
                    {column.name}
                    {column.config?.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {renderField(column)}
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="flex-shrink-0 pt-4 border-t gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 min-h-[44px]"
            data-testid="button-cancel-edit"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateLeadMutation.isPending}
            className="flex-1 min-h-[44px]"
            data-testid="button-save-lead"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateLeadMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
