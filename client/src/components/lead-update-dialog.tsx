import { useRef, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadUpdateSchema, type InsertLeadUpdate, type CustomColumn, type Lead } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery, useQueries } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";

interface CompanySettings {
  quick_update_fields?: string[];
  [key: string]: any;
}

interface ColumnInfo {
  column_key: string;
  name: string;
  type: string;
  config?: {
    dropdown_options?: string[];
    hidden_system_values?: string[];
  };
}

interface DropdownOption {
  id: string;
  value: string;
  order_index: number;
}


interface LeadUpdateDialogProps {
  leadId: string;
  sheetId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadUpdateDialog({
  leadId,
  sheetId,
  open,
  onOpenChange,
}: LeadUpdateDialogProps) {
  const { toast } = useToast();
  const [quickFieldValues, setQuickFieldValues] = useState<Record<string, any>>({});
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  
  const lockedLeadIdRef = useRef<string>(leadId);
  const lockedSheetIdRef = useRef<string | undefined>(sheetId);
  const prevOpenRef = useRef<boolean>(false);
  
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const isNowOpen = open;
    
    if (!wasOpen && isNowOpen) {
      lockedLeadIdRef.current = leadId;
      lockedSheetIdRef.current = sheetId;
      setQuickFieldValues({});
      setDatePickerOpen(null);
    }
    
    prevOpenRef.current = open;
  }, [open, leadId, sheetId]);

  const hasInitializedQuickFields = useRef<boolean>(false);

  const { data: settingsData } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/company/settings"],
    enabled: open,
  });

  const { data: companyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: open,
  });

  const { data: leadData } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: open && !!leadId,
  });

  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnInfo>();
    companyColumns.forEach(col => {
      map.set(col.column_key, {
        column_key: col.column_key,
        name: col.name,
        type: col.type,
        config: col.config as any,
      });
    });
    return map;
  }, [companyColumns]);

  const quickUpdateFields = useMemo(() => {
    const configuredKeys = settingsData?.settings?.quick_update_fields || [];
    return configuredKeys
      .map(key => columnMap.get(key))
      .filter((col): col is ColumnInfo => !!col);
  }, [settingsData, columnMap]);

  const dropdownColumns = useMemo(() => 
    quickUpdateFields.filter(col => col.type === "dropdown"),
    [quickUpdateFields]
  );

  const dropdownQueries = useQueries({
    queries: dropdownColumns.map(col => ({
      queryKey: ["/api/company/dropdown-options", col.column_key],
      queryFn: async () => {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/company/dropdown-options/${col.column_key}`, {
          credentials: 'include',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        if (!res.ok) throw new Error('Failed to fetch dropdown options');
        return res.json();
      },
      enabled: open && dropdownColumns.length > 0,
    })),
  });

  const dropdownOptionsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    dropdownColumns.forEach((col, index) => {
      const queryResult = dropdownQueries[index];
      if (queryResult?.data) {
        const data = queryResult.data as DropdownOption[];
        const hiddenValues = col.config?.hidden_system_values || [];
        const options = data
          .map((opt) => opt.value)
          .filter((val) => !hiddenValues.includes(val));
        map.set(col.column_key, options);
      }
    });
    return map;
  }, [dropdownQueries, dropdownColumns]);

  useEffect(() => {
    if (!open) {
      hasInitializedQuickFields.current = false;
      return;
    }
    
    if (hasInitializedQuickFields.current) return;
    if (!leadData) return;
    if (quickUpdateFields.length === 0) return;
    
    const initialValues: Record<string, any> = {};
    const customFields = leadData.custom_fields as Record<string, any> | null;
    
    for (const field of quickUpdateFields) {
      const value = customFields?.[field.column_key];
      if (value !== undefined && value !== null && value !== "") {
        initialValues[field.column_key] = value;
      }
    }
    
    if (Object.keys(initialValues).length > 0) {
      setQuickFieldValues(initialValues);
    }
    hasInitializedQuickFields.current = true;
  }, [open, leadData, quickUpdateFields]);

  const form = useForm<InsertLeadUpdate>({
    resolver: zodResolver(insertLeadUpdateSchema),
    defaultValues: {
      lead_id: leadId,
      update_via: "call",
      update_on: new Date().toISOString().split("T")[0],
      remark: "",
    },
  });

  const prevOpenForFormRef = useRef<boolean>(false);
  
  useEffect(() => {
    const wasOpen = prevOpenForFormRef.current;
    const isNowOpen = open;
    
    if (!wasOpen && isNowOpen) {
      form.reset({
        lead_id: lockedLeadIdRef.current,
        update_via: "call",
        update_on: new Date().toISOString().split("T")[0],
        remark: "",
      });
    }
    
    prevOpenForFormRef.current = open;
  }, [open, form]);

  const updateLeadMutation = useMutation({
    mutationFn: async (fieldValues: Record<string, any>) => {
      const safeLeadId = lockedLeadIdRef.current;
      if (!safeLeadId || Object.keys(fieldValues).length === 0) return null;
      
      const customFieldUpdates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(fieldValues)) {
        if (value === undefined || value === "" || value === null) continue;
        customFieldUpdates[key] = value;
      }
      
      if (Object.keys(customFieldUpdates).length === 0) return null;
      
      return await apiRequest("PATCH", `/api/leads/${safeLeadId}`, { custom_fields: customFieldUpdates });
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: InsertLeadUpdate) => {
      const safeLeadId = lockedLeadIdRef.current;
      
      if (!safeLeadId) {
        throw new Error("No lead selected for update");
      }
      
      const safeData = {
        ...data,
        lead_id: safeLeadId,
      };
      
      return await apiRequest("POST", `/api/leads/${safeLeadId}/updates`, safeData);
    },
    onSuccess: async () => {
      const safeLeadId = lockedLeadIdRef.current;
      const safeSheetId = lockedSheetIdRef.current;
      
      const filledFields = Object.fromEntries(
        Object.entries(quickFieldValues).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
      );
      
      if (Object.keys(filledFields).length > 0) {
        try {
          await updateLeadMutation.mutateAsync(filledFields);
        } catch (error) {
          console.error("Failed to update lead fields:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/leads", safeLeadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", safeLeadId, "updates"] });
      if (safeSheetId) {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", safeSheetId, "leads"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      
      toast({ title: "Update created successfully" });
      form.reset();
      setQuickFieldValues({});
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLeadUpdate) => {
    createUpdateMutation.mutate(data);
  };

  const handleQuickFieldChange = (columnKey: string, value: any) => {
    setQuickFieldValues(prev => ({ ...prev, [columnKey]: value }));
  };

  const normalizeDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date && isValid(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = parseISO(value);
        if (isValid(parsed)) return parsed;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const renderQuickField = (column: ColumnInfo) => {
    const value = quickFieldValues[column.column_key] ?? "";
    
    if (column.type === "dropdown") {
      const options = dropdownOptionsMap.get(column.column_key) || [];
      
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Select
            value={value}
            onValueChange={(val) => handleQuickFieldChange(column.column_key, val)}
          >
            <SelectTrigger data-testid={`quick-field-${column.column_key}`}>
              <SelectValue placeholder={`Select ${column.name}...`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    if (column.type === "date") {
      const dateValue = normalizeDate(value);
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Popover 
            open={datePickerOpen === column.column_key} 
            onOpenChange={(isOpen) => setDatePickerOpen(isOpen ? column.column_key : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                data-testid={`quick-field-${column.column_key}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "dd/MM/yyyy") : `Select ${column.name}...`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    handleQuickFieldChange(column.column_key, format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
              <div className="px-3 pb-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={() => {
                    handleQuickFieldChange(column.column_key, null);
                    setDatePickerOpen(null);
                  }}
                  data-testid={`button-clear-date-${column.column_key}`}
                >
                  Clear
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDatePickerOpen(null)}
                  data-testid={`button-done-date-${column.column_key}`}
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    }
    
    if (column.type === "datetime") {
      const datetimeValue = normalizeDate(value);
      const currentTime = datetimeValue ? format(datetimeValue, "HH:mm") : "09:00";
      
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Popover 
            open={datePickerOpen === column.column_key} 
            onOpenChange={(isOpen) => setDatePickerOpen(isOpen ? column.column_key : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                data-testid={`quick-field-${column.column_key}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetimeValue ? format(datetimeValue, "dd/MM/yyyy HH:mm") : `Select ${column.name}...`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={datetimeValue}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date.getTime());
                    if (datetimeValue) {
                      newDate.setHours(datetimeValue.getHours(), datetimeValue.getMinutes());
                    } else {
                      newDate.setHours(9, 0);
                    }
                    handleQuickFieldChange(column.column_key, newDate.toISOString());
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
                    const [hours, minutes] = e.target.value.split(":").map(Number);
                    const baseDate = new Date(datetimeValue?.getTime() ?? Date.now());
                    baseDate.setHours(hours, minutes);
                    handleQuickFieldChange(column.column_key, baseDate.toISOString());
                  }}
                />
              </div>
              <div className="px-3 pb-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={() => {
                    handleQuickFieldChange(column.column_key, null);
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
        </div>
      );
    }
    
    if (column.type === "number") {
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Input
            type="number"
            value={value}
            onChange={(e) => handleQuickFieldChange(column.column_key, e.target.value)}
            placeholder={`Enter ${column.name}...`}
            data-testid={`quick-field-${column.column_key}`}
          />
        </div>
      );
    }
    
    return (
      <div key={column.column_key} className="space-y-2">
        <Label className="text-sm text-muted-foreground">{column.name}</Label>
        <Input
          type="text"
          value={value}
          onChange={(e) => handleQuickFieldChange(column.column_key, e.target.value)}
          placeholder={`Enter ${column.name}...`}
          data-testid={`quick-field-${column.column_key}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Lead Update</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="update_via"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Via</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="update_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-update-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remark</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter update details..."
                      {...field}
                      data-testid="input-update-remark"
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {quickUpdateFields.length > 0 && (
              <div className="space-y-4 pt-2 border-t">
                <div className="text-sm font-medium text-muted-foreground">
                  Quick Update (Optional)
                </div>
                <div className="grid gap-3">
                  {quickUpdateFields.map(renderQuickField)}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUpdateMutation.isPending || updateLeadMutation.isPending}
                data-testid="button-save-update"
              >
                {createUpdateMutation.isPending || updateLeadMutation.isPending ? "Saving..." : "Save Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
