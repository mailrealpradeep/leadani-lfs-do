import { useRef, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadUpdateSchema, type InsertLeadUpdate, type CustomColumn } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

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

const SYSTEM_COLUMNS: ColumnInfo[] = [
  { column_key: "status", name: "Lead Status", type: "dropdown" },
  { column_key: "name", name: "Name", type: "text" },
  { column_key: "email", name: "Email", type: "text" },
  { column_key: "mobile", name: "Mobile", type: "mobile" },
  { column_key: "address", name: "Address", type: "text" },
];

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
  
  // CRITICAL FIX: Lock the lead_id ONLY when dialog OPENS (false→true transition)
  // This ref NEVER changes while dialog is open, preventing race conditions
  const lockedLeadIdRef = useRef<string>(leadId);
  const lockedSheetIdRef = useRef<string | undefined>(sheetId);
  
  // Track previous open state to detect false→true transitions
  const prevOpenRef = useRef<boolean>(false);
  
  // Update the locked ref ONLY on false→true transition of open state
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const isNowOpen = open;
    
    // Only lock the lead_id when dialog is OPENING (false → true)
    if (!wasOpen && isNowOpen) {
      lockedLeadIdRef.current = leadId;
      lockedSheetIdRef.current = sheetId;
      setQuickFieldValues({});
    }
    
    // Update previous open state
    prevOpenRef.current = open;
  }, [open, leadId, sheetId]);

  // Fetch company settings for quick_update_fields
  const { data: settingsData } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
    enabled: open,
  });

  // Fetch company columns
  const { data: companyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: open,
  });

  // Build column map from system + custom columns
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnInfo>();
    SYSTEM_COLUMNS.forEach(col => map.set(col.column_key, col));
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

  // Get configured quick update fields
  const quickUpdateFields = useMemo(() => {
    const configuredKeys = settingsData?.settings?.quick_update_fields || [];
    return configuredKeys
      .map(key => columnMap.get(key))
      .filter((col): col is ColumnInfo => !!col);
  }, [settingsData, columnMap]);

  const form = useForm<InsertLeadUpdate>({
    resolver: zodResolver(insertLeadUpdateSchema),
    defaultValues: {
      lead_id: leadId,
      update_via: "call",
      update_on: new Date().toISOString().split("T")[0],
      remark: "",
    },
  });

  // Reset form ONLY when dialog opens (false→true transition)
  // Use a separate ref to track this for form reset
  const prevOpenForFormRef = useRef<boolean>(false);
  
  useEffect(() => {
    const wasOpen = prevOpenForFormRef.current;
    const isNowOpen = open;
    
    // Reset form only when dialog is OPENING (false → true)
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

  // Mutation to update the lead with quick field values
  const updateLeadMutation = useMutation({
    mutationFn: async (fieldValues: Record<string, any>) => {
      const safeLeadId = lockedLeadIdRef.current;
      if (!safeLeadId || Object.keys(fieldValues).length === 0) return null;
      
      // Build update payload - separate system fields from custom fields
      const updatePayload: Record<string, any> = {};
      const customFieldUpdates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(fieldValues)) {
        if (value === undefined || value === "" || value === null) continue;
        
        // System columns go to root level
        if (SYSTEM_COLUMNS.some(c => c.column_key === key)) {
          updatePayload[key] = value;
        } else {
          // Custom columns go to custom_fields
          customFieldUpdates[key] = value;
        }
      }
      
      if (Object.keys(customFieldUpdates).length > 0) {
        updatePayload.custom_fields = customFieldUpdates;
      }
      
      if (Object.keys(updatePayload).length === 0) return null;
      
      return await apiRequest("PATCH", `/api/leads/${safeLeadId}`, updatePayload);
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: InsertLeadUpdate) => {
      // CRITICAL: Always use the locked lead_id, never the form's potentially stale value
      const safeLeadId = lockedLeadIdRef.current;
      
      // Safety validation: Ensure we have a valid lead_id
      if (!safeLeadId) {
        throw new Error("No lead selected for update");
      }
      
      // Override the form's lead_id with the locked value to guarantee correctness
      const safeData = {
        ...data,
        lead_id: safeLeadId,
      };
      
      return await apiRequest("POST", `/api/leads/${safeLeadId}/updates`, safeData);
    },
    onSuccess: async () => {
      const safeLeadId = lockedLeadIdRef.current;
      const safeSheetId = lockedSheetIdRef.current;
      
      // If there are quick field values, update the lead
      const filledFields = Object.fromEntries(
        Object.entries(quickFieldValues).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
      );
      
      if (Object.keys(filledFields).length > 0) {
        try {
          await updateLeadMutation.mutateAsync(filledFields);
        } catch (error) {
          // Log error but don't fail the whole operation
          console.error("Failed to update lead fields:", error);
        }
      }
      
      // Invalidate relevant caches
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

  const renderQuickField = (column: ColumnInfo) => {
    const value = quickFieldValues[column.column_key] ?? "";
    
    if (column.type === "dropdown") {
      const hiddenValues = column.config?.hidden_system_values || [];
      const options = (column.config?.dropdown_options || []).filter(
        opt => !hiddenValues.includes(opt)
      );
      
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
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Input
            type="date"
            value={value}
            onChange={(e) => handleQuickFieldChange(column.column_key, e.target.value)}
            data-testid={`quick-field-${column.column_key}`}
          />
        </div>
      );
    }
    
    if (column.type === "datetime") {
      return (
        <div key={column.column_key} className="space-y-2">
          <Label className="text-sm text-muted-foreground">{column.name}</Label>
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => handleQuickFieldChange(column.column_key, e.target.value)}
            data-testid={`quick-field-${column.column_key}`}
          />
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
    
    // Default: text input
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

            {/* Quick Update Fields Section */}
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
