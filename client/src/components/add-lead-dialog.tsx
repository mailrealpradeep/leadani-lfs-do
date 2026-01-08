import { useState, useEffect, useMemo } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, GitMerge, XCircle, Phone, MessageSquare, MapPin, ArrowRightLeft, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import type { Lead, CustomColumn, Sheet } from "@shared/schema";
import { useAutoFillRules } from "@/hooks/use-auto-fill-rules";

interface AddLeadFormField {
  column_key: string;
  required: boolean;
}

interface CompanySettings {
  add_lead_form_fields?: AddLeadFormField[];
  [key: string]: any;
}

interface DuplicateLeadInfo {
  id: string;
  sheet_id: string;
  sheet_name: string;
  custom_fields: Record<string, any>;
  created_at: string;
  owner_user_id: string;
  // Enriched fields
  lead_name?: string | null;
  lead_status?: string | null;
  visit_status?: string | null;
  last_edit?: string | null;
  last_update?: {
    remark: string;
    update_via: string;
    created_at: string;
    update_on: string;
  } | null;
  lead_user_name?: string | null;
  is_eligible_for_auto_transfer?: boolean;
}

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
  const { applyAutoFillRules } = useAutoFillRules();
  const { formatInTimezone } = useCompanyTimezone();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedSheetId, setSelectedSheetId] = useState<string>(sheetId);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateLeadInfo | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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
      setDuplicateInfo(null);
      setShowDuplicateDialog(false);
    }
  }, [open]);

  const activeSheetId = isMultiSheetMode ? selectedSheetId : sheetId;

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", activeSheetId, "columns"],
    enabled: open && !!activeSheetId,
  });

  const { data: companySettings } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/company/settings"],
    enabled: open,
  });

  const formFieldConfig = companySettings?.settings?.add_lead_form_fields;

  const formFieldMap = useMemo(() => {
    const map = new Map<string, { required: boolean }>();
    if (formFieldConfig && formFieldConfig.length > 0) {
      formFieldConfig.forEach(f => map.set(f.column_key, { required: f.required }));
    }
    return map;
  }, [formFieldConfig]);

  const hasCustomFormConfig = formFieldConfig && formFieldConfig.length > 0;

  // Check for duplicate mobile number
  const checkDuplicateMutation = useMutation({
    mutationFn: async (mobileNo: string) => {
      return await apiRequest<{ isDuplicate: boolean; existingLead?: DuplicateLeadInfo }>(
        "POST", 
        "/api/leads/check-duplicate", 
        { mobile_no: mobileNo, sheet_id: activeSheetId }
      );
    },
  });

  // Merge data into existing lead
  const mergeMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest<{ success: boolean; lead: Lead }>(
        "POST",
        `/api/leads/${leadId}/merge`,
        {
          custom_fields: formData,
          source: "Manual entry (merged)",
          merge_strategy: "update_empty", // Only fill empty fields
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", duplicateInfo?.sheet_id, "leads-infinite"] });
      if (isMultiSheetMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      }
      onOpenChange(false);
      setFormData({});
      setDuplicateInfo(null);
      setShowDuplicateDialog(false);
      toast({
        title: "Lead merged",
        description: "New data has been merged into the existing lead",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to merge lead",
        description: error.message || "An error occurred while merging",
        variant: "destructive",
      });
    },
  });

  // Auto-transfer lead
  const autoTransferMutation = useMutation({
    mutationFn: async () => {
      if (!duplicateInfo) throw new Error("No duplicate lead info");
      return await apiRequest("POST", "/api/leads/transfer", {
        leadIds: [duplicateInfo.id],
        targetSheetId: activeSheetId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", duplicateInfo?.sheet_id, "leads-infinite"] });
      if (isMultiSheetMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
      }
      onOpenChange(false);
      setFormData({});
      setDuplicateInfo(null);
      setShowDuplicateDialog(false);
      toast({
        title: "Lead transferred",
        description: "Lead has been transferred to your sheet",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer lead",
        variant: "destructive",
      });
    },
  });

  // Request transfer
  const requestTransferMutation = useMutation({
    mutationFn: async () => {
      if (!duplicateInfo) throw new Error("No duplicate lead info");
      return await apiRequest("POST", "/api/leads/transfer-request", {
        lead_id: duplicateInfo.id,
        from_sheet_id: duplicateInfo.sheet_id,
        to_sheet_id: activeSheetId,
      });
    },
    onSuccess: () => {
      setShowDuplicateDialog(false);
      setDuplicateInfo(null);
      toast({
        title: "Transfer requested",
        description: "Your transfer request has been submitted for admin approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to create transfer request",
        variant: "destructive",
      });
    },
  });

  const handleAutoTransfer = () => {
    autoTransferMutation.mutate();
  };

  const handleRequestTransfer = () => {
    requestTransferMutation.mutate();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<Lead>("POST", `/api/sheets/${activeSheetId}/leads`, {
        sheet_id: activeSheetId,
        owner_user_id: user?.id,
        custom_fields: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheetId, "leads-infinite"] });
      if (isMultiSheetMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads/query-infinite"] });
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    const requiredColumns = filteredAndSortedColumns.filter(col => {
      if (SYSTEM_COLUMN_KEYS.includes(col.column_key as typeof SYSTEM_COLUMN_KEYS[number])) {
        return false;
      }
      if (hasCustomFormConfig) {
        return formFieldMap.get(col.column_key)?.required ?? false;
      }
      return col.config.required;
    });
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
    
    // Check for duplicate mobile number before creating
    try {
      const result = await checkDuplicateMutation.mutateAsync(formData.mobile_no);
      if (result.isDuplicate && result.existingLead) {
        setDuplicateInfo(result.existingLead);
        setShowDuplicateDialog(true);
        return;
      }
    } catch (error) {
      console.error("Duplicate check failed:", error);
      // Continue with creation if check fails
    }
    
    createMutation.mutate();
  };

  const handleMerge = () => {
    if (duplicateInfo) {
      mergeMutation.mutate(duplicateInfo.id);
    }
  };

  const handleSkip = () => {
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
    toast({
      title: "Lead not added",
      description: "Duplicate lead was skipped",
    });
  };

  const handleChange = (key: string, value: any) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    
    // Apply auto-fill rules if this is a dropdown field change
    applyAutoFillRules(
      key,
      value,
      newFormData,
      (autoFillUpdates) => {
        setFormData(prev => ({ ...prev, ...autoFillUpdates }));
      }
    );
  };

  const renderField = (col: CustomColumn) => {
    const value = formData[col.column_key] ?? "";
    const isSystemColumn = SYSTEM_COLUMN_KEYS.includes(col.column_key as typeof SYSTEM_COLUMN_KEYS[number]);
    const isMandatorySystemColumn = col.column_key === "full_name" || col.column_key === "mobile_no";
    const formFieldRequired = formFieldMap.get(col.column_key)?.required ?? false;
    const required = isMandatorySystemColumn || (hasCustomFormConfig ? formFieldRequired : col.config.required);

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
      case "datetime":
        const isCreatedAt = col.column_key === "created_at";
        // For created_at, display as formatted datetime string
        const displayValue = isCreatedAt && value ? 
          new Date(value).toLocaleString() : 
          (col.type === "datetime" && value ? new Date(value).toLocaleString() : value || "");
        
        // created_at should always be read-only with datetime display
        if (isCreatedAt) {
          return (
            <div key={col.id} className="space-y-2">
              <Label htmlFor={col.column_key}>
                {col.name} (Auto-set)
              </Label>
              <Input
                id={col.column_key}
                type="text"
                value={displayValue}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
                data-testid={`input-${col.column_key}`}
              />
            </div>
          );
        }
        
        // Regular date/datetime fields
        return (
          <div key={col.id} className="space-y-2">
            <Label htmlFor={col.column_key}>
              {col.name}
            </Label>
            <Input
              id={col.column_key}
              type={col.type === "datetime" ? "datetime-local" : "date"}
              value={value}
              onChange={(e) => handleChange(col.column_key, e.target.value)}
              data-testid={`input-${col.column_key}`}
            />
          </div>
        );

      case "dropdown":
        // Filter out hidden system values from dropdown options
        const hiddenSystemValues = col.config?.hidden_system_values || [];
        const visibleOptions = (col.config?.dropdown_options || []).filter(
          (opt: string) => !hiddenSystemValues.includes(opt)
        );
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
                {visibleOptions.map((opt: string) => (
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

  const filteredAndSortedColumns = useMemo(() => {
    const columnMap = new Map(columns.map(c => [c.column_key, c]));
    const MANDATORY_FIELDS = ["full_name", "mobile_no"];
    
    if (hasCustomFormConfig) {
      const orderedKeys = formFieldConfig!.map(f => f.column_key);
      const missingMandatory = MANDATORY_FIELDS.filter(key => !orderedKeys.includes(key) && columnMap.has(key));
      const allKeys = [...missingMandatory, ...orderedKeys];
      return allKeys
        .filter(key => columnMap.has(key))
        .map(key => columnMap.get(key)!);
    }
    return [...columns].sort((a, b) => {
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
  }, [columns, hasCustomFormConfig, formFieldConfig]);

  const isPending = createMutation.isPending || checkDuplicateMutation.isPending;

  return (
    <>
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
              {filteredAndSortedColumns.map((col) => renderField(col))}
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
                disabled={isPending}
                data-testid="button-save-lead"
                className="min-h-[44px] w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {checkDuplicateMutation.isPending ? "Checking..." : "Creating..."}
                  </>
                ) : (
                  "Add Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Lead Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Lead Found
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  A lead with mobile number <strong>{formData.mobile_no}</strong> already exists in your company.
                </p>
                {duplicateInfo && (
                  <div className="bg-muted p-4 rounded-md space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Lead Name:</span>
                        <span>{duplicateInfo.lead_name || duplicateInfo.custom_fields?.full_name || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Lead Status:</span>
                        <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
                          {duplicateInfo.lead_status || "N/A"}
                        </span>
                      </div>
                      {duplicateInfo.visit_status && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Visit Status:</span>
                          <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                            {duplicateInfo.visit_status}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last Edit:
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {duplicateInfo.last_edit ? formatInTimezone(duplicateInfo.last_edit, "MMM dd, yyyy HH:mm") : "N/A"}
                        </span>
                      </div>
                      {duplicateInfo.last_update && (
                        <div className="space-y-1 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last Lead Update:
                            </span>
                            <div className="flex items-center gap-1">
                              {duplicateInfo.last_update.update_via === "call" ? (
                                <Phone className="h-3 w-3 text-blue-500" />
                              ) : duplicateInfo.last_update.update_via === "whatsapp" ? (
                                <MessageSquare className="h-3 w-3 text-green-500" />
                              ) : duplicateInfo.last_update.update_via === "visit" ? (
                                <MapPin className="h-3 w-3 text-purple-500" />
                              ) : (
                                <ArrowRightLeft className="h-3 w-3 text-orange-500" />
                              )}
                              <span className="text-xs text-muted-foreground capitalize">
                                {duplicateInfo.last_update.update_via}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground italic line-clamp-2">
                            "{duplicateInfo.last_update.remark}"
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatInTimezone(duplicateInfo.last_update.created_at, "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-semibold flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Lead User Name:
                        </span>
                        <span className="text-xs">{duplicateInfo.lead_user_name || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Sheet:</span>
                        <span className="text-xs">{duplicateInfo.sheet_name}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-muted-foreground">
                  What would you like to do?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleSkip}
              data-testid="button-skip-duplicate"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Don't Add
            </AlertDialogCancel>
            {duplicateInfo?.is_eligible_for_auto_transfer ? (
              <AlertDialogAction
                onClick={handleAutoTransfer}
                disabled={autoTransferMutation.isPending}
                data-testid="button-auto-transfer"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {autoTransferMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Transfer to My Sheet
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogAction
                  onClick={handleRequestTransfer}
                  disabled={requestTransferMutation.isPending}
                  data-testid="button-request-transfer"
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {requestTransferMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Request Transfer
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={handleMerge}
                  disabled={mergeMutation.isPending}
                  data-testid="button-merge-duplicate"
                  className="flex items-center gap-2 bg-primary"
                >
                  {mergeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitMerge className="h-4 w-4" />
                  )}
                  Merge Data
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
