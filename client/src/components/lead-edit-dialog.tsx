import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Pencil, Save, X, Calendar as CalendarIcon, Clock, AlertCircle, 
  Star, Sparkles, ChevronRight, CheckCircle2, ArrowUp, Check,
  Phone, User, Hash, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
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
import { useAutoFillRules } from "@/hooks/use-auto-fill-rules";
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
  const { applyAutoFillRules } = useAutoFillRules();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  
  // Validation state
  const [triggeredRule, setTriggeredRule] = useState<ValidationRule | null>(null);
  const [triggerChange, setTriggerChange] = useState<{ column_key: string; old_value: any; new_value: any } | null>(null);
  const [validationFieldValues, setValidationFieldValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  
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

  const { data: fetchedValidationRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", sheetId, "validation-rules"],
    enabled: !!sheetId && open,
  });

  const activeValidationRules = fetchedValidationRules.length > 0 ? fetchedValidationRules : validationRules;

  useEffect(() => {
    if (lead && open) {
      const customFields = { ...lead.custom_fields };
      setFormValues(customFields);
      setOriginalValues(customFields);
      setTriggeredRule(null);
      setTriggerChange(null);
      setValidationFieldValues({});
      setValidationErrors({});
      setShowValidationAlert(false);
      setEditingField(null);
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

  const requiredColumns: RequiredColumn[] = useMemo(() => {
    if (!triggeredRule) return [];
    return triggeredRule.required_columns && triggeredRule.required_columns.length > 0
      ? triggeredRule.required_columns
      : (triggeredRule.required_fields || []).map((key: string) => ({ column_key: key, is_required: true }));
  }, [triggeredRule]);

  const checkValidationRules = (columnKey: string, newValue: any, updatedFormValues: Record<string, any>) => {
    if (!activeValidationRules || activeValidationRules.length === 0) return null;
    if (!lead) return null;

    const proposedLead = { 
      ...lead, 
      custom_fields: { ...updatedFormValues } 
    };

    for (const rule of activeValidationRules) {
      if (rule.is_active === false) continue;

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
      
      if (rule.trigger_column_key === columnKey && rule.operator) {
        if (evaluateCondition(newValue, rule.operator, rule.trigger_value)) {
          return rule;
        }
      }
    }
    return null;
  };

  // Scroll to validation section and focus first error field
  const scrollToValidationSection = (errors: Record<string, string>) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setTimeout(() => {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey && fieldRefs.current[firstErrorKey]) {
        fieldRefs.current[firstErrorKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = fieldRefs.current[firstErrorKey]?.querySelector('input, select, textarea, button');
        if (input) (input as HTMLElement).focus();
      }
    }, 300);
  };

  // Jump to specific field handler
  const jumpToField = (columnKey: string) => {
    if (fieldRefs.current[columnKey]) {
      fieldRefs.current[columnKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = fieldRefs.current[columnKey]?.querySelector('input, select, textarea, button');
      if (input) (input as HTMLElement).focus();
    }
  };

  const handleFieldChange = (columnKey: string, value: any) => {
    // Compute all changes before any setState to avoid race conditions
    const baseFormValues = {
      ...formValues,
      [columnKey]: value,
    };

    // Collect auto-fill updates
    let autoFillUpdates: Record<string, any> = {};
    applyAutoFillRules(
      columnKey,
      value,
      baseFormValues,
      (updates) => {
        autoFillUpdates = { ...autoFillUpdates, ...updates };
      },
      { showToast: true }
    );

    // Merge all changes into final form values
    const finalFormValues = { ...baseFormValues, ...autoFillUpdates };
    
    // Single setState with all updates
    setFormValues(finalFormValues);

    // Check validation rules with the fully updated form values
    const triggered = checkValidationRules(columnKey, value, finalFormValues);
    
    if (triggered && !triggeredRule) {
      setTriggeredRule(triggered);
      setTriggerChange({
        column_key: columnKey,
        old_value: originalValues[columnKey],
        new_value: value,
      });
      const initialValues: Record<string, any> = {};
      const cols = triggered.required_columns && triggered.required_columns.length > 0
        ? triggered.required_columns
        : (triggered.required_fields || []).map((key: string) => ({ column_key: key, is_required: true }));
      cols.forEach((rc: RequiredColumn) => {
        initialValues[rc.column_key] = finalFormValues[rc.column_key] ?? "";
      });
      setValidationFieldValues(initialValues);
      setValidationErrors({});
    } else if (!triggered && triggeredRule) {
      setTriggeredRule(null);
      setTriggerChange(null);
      setValidationFieldValues({});
      setValidationErrors({});
    }
  };

  const handleValidationFieldChange = (columnKey: string, value: any) => {
    setValidationFieldValues(prev => ({ ...prev, [columnKey]: value }));
    setFormValues(prev => ({ ...prev, [columnKey]: value }));
    if (validationErrors[columnKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[columnKey];
        return newErrors;
      });
    }
  };

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

  const handleSave = () => {
    if (triggeredRule) {
      const errors = validateRequiredFields();
      if (Object.keys(errors).length > 0) {
        setShowValidationAlert(true);
        scrollToValidationSection(errors);
        return;
      }
    }
    
    setShowValidationAlert(false);
    const finalValues = { ...formValues, ...validationFieldValues };
    updateLeadMutation.mutate(finalValues);
  };

  const handleCancelValidation = () => {
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

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order_index - b.order_index);
  }, [columns]);

  // Group columns by type for better organization
  const groupedColumns = useMemo(() => {
    const groups: Record<string, CustomColumn[]> = {
      status: [],
      contact: [],
      dates: [],
      other: [],
    };

    sortedColumns.forEach(col => {
      const nameLower = col.name?.toLowerCase() || "";
      const keyLower = col.column_key?.toLowerCase() || "";
      
      if (col.type === "dropdown" || nameLower.includes("status") || keyLower.includes("status")) {
        groups.status.push(col);
      } else if (col.type === "mobile" || nameLower.includes("phone") || nameLower.includes("mobile") || 
                 nameLower.includes("email") || keyLower.includes("phone") || keyLower.includes("email")) {
        groups.contact.push(col);
      } else if (col.type === "date" || col.type === "datetime") {
        groups.dates.push(col);
      } else {
        groups.other.push(col);
      }
    });

    return groups;
  }, [sortedColumns]);

  const getFullName = () => {
    if (!formValues) return "Lead";
    const namePatterns = [/^full[_\s]?name/i, /^name$/i];
    for (const pattern of namePatterns) {
      const key = Object.keys(formValues).find((k) => pattern.test(k));
      if (key && formValues[key]) return String(formValues[key]);
    }
    return "Lead";
  };

  const getPhone = () => {
    if (!formValues) return "";
    const phonePatterns = [/mobile/i, /phone/i, /contact/i];
    for (const pattern of phonePatterns) {
      const key = Object.keys(formValues).find((k) => pattern.test(k));
      if (key && formValues[key]) return String(formValues[key]);
    }
    return "";
  };

  const getLeadStatus = () => {
    if (!formValues) return "";
    const statusPatterns = [/^lead[_\s]?status/i, /^status$/i];
    for (const pattern of statusPatterns) {
      const key = Object.keys(formValues).find((k) => pattern.test(k));
      if (key && formValues[key]) return String(formValues[key]);
    }
    return "";
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

  const formatDisplayValue = (column: CustomColumn, value: any): string => {
    if (value === null || value === undefined || value === "") return "—";
    
    if (column.type === "date") {
      const date = normalizeDate(value);
      return date ? format(date, "dd/MM/yy") : String(value);
    }
    
    if (column.type === "datetime") {
      const date = normalizeDate(value);
      return date ? format(date, "dd/MM/yy HH:mm") : String(value);
    }
    
    if (column.type === "boolean") {
      return value === true || value === "true" ? "Yes" : "No";
    }
    
    return String(value);
  };

  const getColumnByKey = (key: string): CustomColumn | undefined => {
    return columns.find(c => c.column_key === key);
  };

  const getColumnLabel = (key: string): string => {
    const col = getColumnByKey(key);
    return col?.name || key;
  };

  // Render inline field editor
  const renderInlineEditor = (column: CustomColumn) => {
    const value = formValues[column.column_key];
    const config = column.config as any;

    switch (column.type) {
      case "dropdown":
        const allOptions = config?.dropdown_options || [];
        const hiddenSystemValues = config?.hidden_system_values || [];
        return (
          <Select
            value={value ?? ""}
            onValueChange={(val) => {
              handleFieldChange(column.column_key, val);
              setEditingField(null);
            }}
          >
            <SelectTrigger className="h-10 border-primary" data-testid={`select-${column.column_key}`}>
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((opt: string) => {
                const isHidden = hiddenSystemValues.includes(opt);
                if (isHidden && opt !== value) return null;
                return (
                  <SelectItem key={opt} value={opt} className={isHidden ? "text-muted-foreground opacity-60" : ""}>
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
          <Popover open={true} onOpenChange={(open) => !open && setEditingField(null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-10 justify-start text-left font-normal border-primary">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "dd/MM/yy") : `Select date`}
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
                  setEditingField(null);
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
          <Popover open={true} onOpenChange={(open) => !open && setEditingField(null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-10 justify-start text-left font-normal border-primary">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeValue ? format(datetimeValue, "dd/MM/yy HH:mm") : `Select date & time`}
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
                    handleFieldChange(column.column_key, date.toISOString());
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="h-8 w-24"
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
                />
                <Button size="sm" onClick={() => setEditingField(null)}>Done</Button>
              </div>
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-3 h-10">
            <Switch
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => {
                handleFieldChange(column.column_key, checked);
                setEditingField(null);
              }}
            />
            <span className="text-sm">{value === true || value === "true" ? "Yes" : "No"}</span>
          </div>
        );

      case "number":
      case "percentage":
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
              className="h-10 flex-1 border-primary"
              autoFocus
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
            />
          </div>
        );

      default:
        const isLongText = column.name?.toLowerCase().includes("remark") || 
                           column.name?.toLowerCase().includes("note") ||
                           column.name?.toLowerCase().includes("comment");
        if (isLongText) {
          return (
            <div className="space-y-2">
              <Textarea
                value={value ?? ""}
                onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
                className="min-h-[80px] border-primary"
                autoFocus
              />
              <Button size="sm" onClick={() => setEditingField(null)} className="w-full">
                <Check className="h-4 w-4 mr-1" /> Done
              </Button>
            </div>
          );
        }
        return (
          <Input
            type={column.type === "mobile" ? "tel" : "text"}
            value={value ?? ""}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            className="h-10 border-primary"
            autoFocus
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
          />
        );
    }
  };

  // Render spreadsheet-style cell
  const renderCell = (column: CustomColumn) => {
    const isEditing = editingField === column.column_key;
    const value = formValues[column.column_key];
    const displayValue = formatDisplayValue(column, value);
    const hasValue = value !== null && value !== undefined && value !== "";

    return (
      <div
        key={column.id}
        ref={(el) => { fieldRefs.current[column.column_key] = el; }}
        className="border-b border-border last:border-b-0"
        data-testid={`cell-${column.column_key}`}
      >
        {isEditing ? (
          <div className="p-3 bg-primary/5">
            <Label className="text-xs text-muted-foreground mb-1.5 block">{column.name}</Label>
            {renderInlineEditor(column)}
          </div>
        ) : (
          <div
            className="flex items-center justify-between p-3 hover-elevate active-elevate-2 cursor-pointer min-h-[52px]"
            onClick={() => setEditingField(column.column_key)}
          >
            <span className="text-sm text-muted-foreground flex-shrink-0 w-[40%]">{column.name}</span>
            <span className={`text-sm text-right flex-1 truncate ${hasValue ? "" : "text-muted-foreground/50"}`}>
              {displayValue}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-2 flex-shrink-0" />
          </div>
        )}
      </div>
    );
  };

  // Render validation field for triggered rules
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
          className={`h-10 ${hasError ? "border-destructive" : ""}`}
        />
      );
    }

    switch (column.type) {
      case "dropdown":
        const config = column.config as any;
        const options = config?.dropdown_options || [];
        return (
          <Select value={value || undefined} onValueChange={(v) => handleValidationFieldChange(columnKey, v)}>
            <SelectTrigger className={`h-10 ${hasError ? "border-destructive" : ""}`}>
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                className={`w-full h-10 justify-start text-left font-normal ${hasError ? "border-destructive" : ""}`}
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
                  if (date) handleValidationFieldChange(columnKey, format(date, "yyyy-MM-dd"));
                  setDatePickerOpen(null);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "datetime":
        const datetimeVal = normalizeDate(value);
        const currentTimeVal = datetimeVal ? format(datetimeVal, "HH:mm") : "09:00";
        return (
          <Popover 
            open={datePickerOpen === `validation-${columnKey}`} 
            onOpenChange={(open) => setDatePickerOpen(open ? `validation-${columnKey}` : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full h-10 justify-start text-left font-normal ${hasError ? "border-destructive" : ""}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeVal ? format(datetimeVal, "dd/MM/yy HH:mm") : `Select ${column.name}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={datetimeVal}
                onSelect={(date) => {
                  if (date) {
                    if (datetimeVal) {
                      date.setHours(datetimeVal.getHours(), datetimeVal.getMinutes());
                    } else {
                      date.setHours(9, 0);
                    }
                    handleValidationFieldChange(columnKey, date.toISOString());
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="h-8 w-24"
                  defaultValue={currentTimeVal}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  onChange={(e) => {
                    const timeValue = e.target.value;
                    if (timeValue) {
                      const [hours, minutes] = timeValue.split(':').map(Number);
                      const newDate = datetimeVal ? new Date(datetimeVal) : new Date();
                      newDate.setHours(hours, minutes);
                      handleValidationFieldChange(columnKey, newDate.toISOString());
                    }
                  }}
                />
                <Button size="sm" onClick={() => setDatePickerOpen(null)}>Done</Button>
              </div>
            </PopoverContent>
          </Popover>
        );

      default:
        return (
          <Input
            type={column.type === "number" ? "number" : column.type === "mobile" ? "tel" : "text"}
            value={value}
            onChange={(e) => handleValidationFieldChange(columnKey, e.target.value)}
            placeholder={`Enter ${column.name}`}
            className={`h-10 ${hasError ? "border-destructive" : ""}`}
          />
        );
    }
  };

  const isLoading = isLoadingLead || isLoadingColumns;
  const hasChanges = JSON.stringify(formValues) !== JSON.stringify(originalValues);
  const requiredCount = requiredColumns.filter(rc => rc.is_required).length;
  const optionalCount = requiredColumns.filter(rc => !rc.is_required).length;
  const leadStatus = getLeadStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] flex flex-col rounded-t-xl p-0"
      >
        {/* Summary Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate" data-testid="text-lead-name">{getFullName()}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getPhone() && (
                  <>
                    <Phone className="h-3.5 w-3.5" />
                    <span data-testid="text-lead-phone">{getPhone()}</span>
                  </>
                )}
              </div>
            </div>
            {leadStatus && (
              <Badge variant="secondary" className="flex-shrink-0" data-testid="badge-lead-status">
                {leadStatus}
              </Badge>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="pb-20">
              {/* Validation Error Alert */}
              <AnimatePresence>
                {showValidationAlert && Object.keys(validationErrors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-4 mt-3 bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2"
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

              {/* Validation Rule Section */}
              <AnimatePresence>
                {triggeredRule && triggerChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-4 mt-3"
                  >
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{triggeredRule.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Update required fields for this change
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                            Required ({requiredCount})
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
                                  <p className="text-xs text-destructive">
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
                            Optional ({optionalCount})
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

              {/* Status Fields Section */}
              {groupedColumns.status.length > 0 && (
                <div className="mt-3">
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                  </div>
                  <div className="bg-background">
                    {groupedColumns.status.map(col => renderCell(col))}
                  </div>
                </div>
              )}

              {/* Contact Fields Section */}
              {groupedColumns.contact.length > 0 && (
                <div className="mt-3">
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</span>
                  </div>
                  <div className="bg-background">
                    {groupedColumns.contact.map(col => renderCell(col))}
                  </div>
                </div>
              )}

              {/* Dates Section */}
              {groupedColumns.dates.length > 0 && (
                <div className="mt-3">
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dates</span>
                  </div>
                  <div className="bg-background">
                    {groupedColumns.dates.map(col => renderCell(col))}
                  </div>
                </div>
              )}

              {/* Other Fields Section */}
              {groupedColumns.other.length > 0 && (
                <div className="mt-3">
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</span>
                  </div>
                  <div className="bg-background">
                    {groupedColumns.other.map(col => renderCell(col))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Bar */}
        <div className="flex-shrink-0 p-4 border-t bg-background flex gap-3 absolute bottom-0 left-0 right-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateLeadMutation.isPending || !hasChanges}
            className="flex-1"
            data-testid="button-save-lead"
          >
            {updateLeadMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
