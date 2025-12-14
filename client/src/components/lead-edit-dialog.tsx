import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Save, X, Calendar as CalendarIcon } from "lucide-react";
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
import type { Lead, CustomColumn } from "@shared/schema";

interface LeadEditDialogProps {
  leadId: string | null;
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadEditDialog({ leadId, sheetId, open, onOpenChange }: LeadEditDialogProps) {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);

  const { data: lead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
  });

  const { data: columns = [], isLoading: isLoadingColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId && open,
  });

  useEffect(() => {
    if (lead && open) {
      setFormValues({ ...lead.custom_fields });
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

  const handleSave = () => {
    updateLeadMutation.mutate(formValues);
  };

  const handleFieldChange = (columnKey: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
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

  const isLoading = isLoadingLead || isLoadingColumns;

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

        <div className="flex-1 overflow-y-auto py-4">
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
