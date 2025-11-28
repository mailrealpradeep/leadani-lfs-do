import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Lead, CustomColumn, Sheet } from "@shared/schema";

const SYSTEM_COLUMN_KEYS = ["full_name", "mobile_no", "created_at"] as const;

interface AddLeadDialogProps {
  sheetId: string;
  sheetIds?: string[];
  isMultiSheetMode?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ sheetId, sheetIds = [], isMultiSheetMode = false, open, onOpenChange }: AddLeadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedSheetId, setSelectedSheetId] = useState<string>(sheetId);

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
    enabled: open && isMultiSheetMode,
  });

  const availableSheets = sheets.filter(s => sheetIds.includes(s.id));

  useEffect(() => {
    if (isMultiSheetMode && sheetIds.length > 0 && !sheetIds.includes(selectedSheetId)) {
      setSelectedSheetId(sheetIds[0]);
    } else if (!isMultiSheetMode) {
      setSelectedSheetId(sheetId);
    }
  }, [isMultiSheetMode, sheetIds, sheetId, selectedSheetId]);

  useEffect(() => {
    if (open) {
      // Use full ISO timestamp for created_at (with timezone)
      const now = new Date().toISOString();
      setFormData(prev => ({
        ...prev,
        created_at: now,
      }));
    } else {
      setFormData({});
    }
  }, [open]);

  const activeSheetId = isMultiSheetMode ? selectedSheetId : sheetId;

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", activeSheetId, "columns"],
    enabled: open && !!activeSheetId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<Lead>("POST", `/api/sheets/${activeSheetId}/leads`, {
        sheet_id: activeSheetId,
        owner_user_id: user?.id,
        custom_fields: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads"] });
      if (isMultiSheetMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query"] });
      }
      onOpenChange(false);
      setFormData({});
      toast({
        title: "Lead created",
        description: "Lead has been added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Create lead error:", error);
      toast({
        title: "Failed to create lead",
        description: error.message || "An error occurred while creating the lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate mandatory system columns first (Full Name, Mobile No)
    const mandatoryFields = [
      { key: "full_name", name: "Full Name" },
      { key: "mobile_no", name: "Mobile No" },
    ];
    
    const missingMandatory = mandatoryFields.filter(field => {
      const value = formData[field.key];
      if (value === null || value === undefined) return true;
      if (typeof value === "string" && value.trim() === "") return true;
      return false;
    });
    
    if (missingMandatory.length > 0) {
      toast({
        title: "Missing mandatory fields",
        description: `Please fill in: ${missingMandatory.map(f => f.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate other required fields (handle falsy values like false and 0 correctly)
    const requiredColumns = columns.filter(col => 
      col.config.required && 
      !SYSTEM_COLUMN_KEYS.includes(col.column_key as typeof SYSTEM_COLUMN_KEYS[number])
    );
    const missingFields = requiredColumns.filter(col => {
      const value = formData[col.column_key];
      if (value === null || value === undefined) return true;
      if (col.type === "text" && typeof value === "string" && value.trim() === "") return true;
      return false;
    });
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map(col => col.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate();
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderField = (col: CustomColumn) => {
    const value = formData[col.column_key] ?? "";
    const isSystemColumn = SYSTEM_COLUMN_KEYS.includes(col.column_key as typeof SYSTEM_COLUMN_KEYS[number]);
    const isMandatorySystemColumn = col.column_key === "full_name" || col.column_key === "mobile_no";
    const required = col.config.required || isMandatorySystemColumn;

    switch (col.type) {
      case "text":
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={col.column_key}
              value={value}
              onChange={(e) => handleChange(col.column_key, e.target.value)}
              required={required}
              placeholder={isMandatorySystemColumn ? `Enter ${col.name}` : undefined}
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "number":
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={col.column_key}
              type="number"
              value={value}
              onChange={(e) => handleChange(col.column_key, e.target.value)}
              required={required}
              placeholder={isMandatorySystemColumn ? `Enter ${col.name}` : undefined}
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "mobile":
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={col.column_key}
              type="tel"
              value={value}
              onChange={(e) => handleChange(col.column_key, e.target.value)}
              required={required}
              placeholder="Enter mobile number"
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "date":
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name}
            </Label>
            <Input
              id={col.column_key}
              type="date"
              value={value}
              onChange={(e) => handleChange(col.column_key, e.target.value)}
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "datetime":
        const isCreatedAtDatetime = col.column_key === "created_at";
        // Format ISO string to display format
        const displayValue = isCreatedAtDatetime && value ? 
          new Date(value).toLocaleString() : 
          (value ? new Date(value).toLocaleString() : "");
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name} {isCreatedAtDatetime && "(Auto-set)"}
            </Label>
            <Input
              id={col.column_key}
              type="text"
              value={displayValue}
              readOnly={isCreatedAtDatetime}
              disabled={isCreatedAtDatetime}
              className={isCreatedAtDatetime ? "bg-muted cursor-not-allowed" : ""}
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "dropdown":
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleChange(col.column_key, val)}
              required={required}
            >
              <SelectTrigger data-testid={`select-${col.column_key}`}>
                <SelectValue placeholder={`Select ${col.name}`} />
              </SelectTrigger>
              <SelectContent>
                {col.config.dropdown_options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "boolean":
        return (
          <div key={col.id} className="flex items-center space-x-2">
            <Checkbox
              id={col.column_key}
              checked={value === true}
              onCheckedChange={(checked) => {
                // Normalize to boolean: true/false, never "indeterminate"
                const normalizedValue = checked === true;
                handleChange(col.column_key, normalizedValue);
              }}
              data-testid={`checkbox-${col.column_key}`}
            />
            <Label htmlFor={col.column_key}>{col.name}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  const sortedColumns = [...columns].sort((a, b) => {
    const systemOrder = { full_name: 0, mobile_no: 1, created_at: 2 };
    const aIsSystem = SYSTEM_COLUMN_KEYS.includes(a.column_key as typeof SYSTEM_COLUMN_KEYS[number]);
    const bIsSystem = SYSTEM_COLUMN_KEYS.includes(b.column_key as typeof SYSTEM_COLUMN_KEYS[number]);
    
    if (aIsSystem && bIsSystem) {
      return (systemOrder[a.column_key as keyof typeof systemOrder] ?? 99) - 
             (systemOrder[b.column_key as keyof typeof systemOrder] ?? 99);
    }
    if (aIsSystem) return -1;
    if (bIsSystem) return 1;
    return a.order_index - b.order_index;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter lead information based on your company's custom fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {isMultiSheetMode && availableSheets.length > 1 && (
            <div className="space-y-2 pb-4 border-b mb-4">
              <Label htmlFor="sheet-selector">Sheet *</Label>
              <Select
                value={selectedSheetId}
                onValueChange={setSelectedSheetId}
              >
                <SelectTrigger data-testid="select-sheet">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {sortedColumns.map((col) => renderField(col))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add-lead"
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-save-lead"
              className="min-h-[44px] w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
