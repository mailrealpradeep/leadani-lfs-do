import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import type { Lead, CustomColumn, ValidationRule } from "@shared/schema";
import { getOptionalFieldKeys } from "@shared/validator";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const HARDCODED_OPTIONAL_STATUSES = ["Not Interested", "Invalid Data", "Lost"];

const createNextFollowupDateSchema = (isNFDTOptionalByRule: boolean) => {
  return z.object({
    remark: z.string().min(1, "Discussion details are required"),
    update_via: z.enum(["call", "whatsapp", "visit"], {
      required_error: "Please select how it was discussed",
    }),
    lead_status: z.string().optional(),
    next_followup_date: z.string().optional(),
  }).superRefine((data, ctx) => {
    // Conditional validation: next_followup_date is required unless:
    // 1. lead_status is one of the hardcoded optional statuses, OR
    // 2. A validation rule declares NFDT optional for this lead
    const leadStatus = data.lead_status || "";
    const isOptionalByStatus = HARDCODED_OPTIONAL_STATUSES.includes(leadStatus);

    if (!isOptionalByStatus && !isNFDTOptionalByRule && !data.next_followup_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Next Followup Date is required",
        path: ["next_followup_date"],
      });
    }
  });
};

type NextFollowupDateFormData = z.infer<ReturnType<typeof createNextFollowupDateSchema>>;

interface NextFollowupDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  lead?: Lead | null; // Lead object with custom_fields
  sheetId?: string; // Sheet ID to fetch columns
  currentDate?: string | null; // ISO datetime string or null
  onSave: (data: {
    update_via: "call" | "whatsapp" | "visit";
    remark: string;
    lead_status?: string | null;
    next_followup_date?: string | null; // ISO datetime string, optional
  }) => Promise<void>;
}

export function NextFollowupDateDialog({
  open,
  onOpenChange,
  leadId,
  lead,
  sheetId,
  currentDate,
  onSave,
}: NextFollowupDateDialogProps) {
  const { getCurrentDate } = useCompanyTimezone();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch columns to get lead_status column and its dropdown options
  const effectiveSheetId = sheetId || lead?.sheet_id;
  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: effectiveSheetId ? ["/api/sheets", effectiveSheetId, "columns"] : ["/api/company/columns"],
    enabled: open,
  });

  // Fetch validation rules (sheet-level + global) to determine if NFDT is optional
  const { data: sheetRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", effectiveSheetId, "validation-rules"],
    enabled: open && !!effectiveSheetId,
  });
  const { data: globalRules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/company/global-validation-rules"],
    enabled: open,
  });

  // Find lead_status column
  const leadStatusColumn = useMemo(() => {
    return columns.find((col) => col.column_key === "lead_status");
  }, [columns]);

  // Get dropdown options for lead_status
  const leadStatusOptions = useMemo(() => {
    if (!leadStatusColumn?.config?.dropdown_options) return [];
    return leadStatusColumn.config.dropdown_options;
  }, [leadStatusColumn]);

  // Get current lead status from lead object
  const currentLeadStatus = useMemo(() => {
    return lead?.custom_fields?.lead_status || "";
  }, [lead]);

  // Determine if NFDT is declared optional by any matching validation rule
  const isNFDTOptionalByRule = useMemo(() => {
    if (!lead) return false;
    const allRules = [...sheetRules, ...globalRules];
    const optionalKeys = getOptionalFieldKeys(lead, allRules);
    return optionalKeys.includes("next_followup_date");
  }, [lead, sheetRules, globalRules]);

  // Recompute schema whenever rule-based optionality changes
  const nextFollowupDateSchema = useMemo(
    () => createNextFollowupDateSchema(isNFDTOptionalByRule),
    [isNFDTOptionalByRule]
  );

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

  const form = useForm<NextFollowupDateFormData>({
    resolver: zodResolver(nextFollowupDateSchema),
    defaultValues: {
      remark: "",
      update_via: "call",
      lead_status: currentLeadStatus || "",
      next_followup_date: currentDate || "",
    },
  });

  // Reset form when dialog opens/closes or currentDate/lead changes
  useEffect(() => {
    if (open) {
      const dateValue = currentDate || "";
      const statusValue = currentLeadStatus || "";
      form.reset({
        remark: "",
        update_via: "call",
        lead_status: statusValue,
        next_followup_date: dateValue,
      });
      setDatePickerOpen(false);
    }
  }, [open, currentDate, currentLeadStatus, form]);

  const datetimeValue = normalizeDate(form.watch("next_followup_date"));
  const currentTime = datetimeValue ? format(datetimeValue, "HH:mm") : "09:00";

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date.getTime());
      if (datetimeValue) {
        newDate.setHours(datetimeValue.getHours(), datetimeValue.getMinutes());
      } else {
        newDate.setHours(9, 0);
      }
      form.setValue("next_followup_date", newDate.toISOString());
    }
  };

  const handleTimeChange = (timeValue: string) => {
    if (timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const baseDate = datetimeValue ? new Date(datetimeValue) : getCurrentDate();
      baseDate.setHours(hours, minutes);
      form.setValue("next_followup_date", baseDate.toISOString());
    }
  };

  const onSubmit = async (data: NextFollowupDateFormData) => {
    setIsSaving(true);
    try {
      await onSave({
        update_via: data.update_via,
        remark: data.remark,
        lead_status: data.lead_status || null,
        next_followup_date: data.next_followup_date || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save next followup date:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Watch lead_status to trigger validation when it changes
  const watchedLeadStatus = form.watch("lead_status");
  
  // Trigger validation when lead_status changes
  useEffect(() => {
    if (watchedLeadStatus !== undefined) {
      form.trigger("next_followup_date");
    }
  }, [watchedLeadStatus, form]);

  // Also re-trigger validation when rule-based optionality changes
  useEffect(() => {
    form.trigger("next_followup_date");
  }, [isNFDTOptionalByRule, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Discussion Details</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter discussion details..."
                      {...field}
                      className="min-h-24"
                      data-testid="input-discussion-details"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="update_via"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Via</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-update-via">
                        <SelectValue placeholder="Select how it was discussed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {leadStatusColumn && (
              <FormField
                control={form.control}
                name="lead_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Status</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-status">
                          <SelectValue placeholder="Select lead status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="next_followup_date"
              render={({ field }) => {
                const currentStatus = form.watch("lead_status");
                const isOptionalByStatus = currentStatus ? HARDCODED_OPTIONAL_STATUSES.includes(currentStatus) : false;
                const isOptional = isOptionalByStatus || isNFDTOptionalByRule;
                
                return (
                <FormItem>
                  <FormLabel>
                    Next Followup Date
                    {isOptional && <span className="text-muted-foreground font-normal ml-1">(Optional)</span>}
                  </FormLabel>
                  <FormControl>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          type="button"
                          data-testid="button-next-followup-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {datetimeValue ? (
                            format(datetimeValue, "dd/MM/yyyy HH:mm")
                          ) : (
                            <span className="text-muted-foreground">Select date & time</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={datetimeValue}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                        <div className="p-3 border-t flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">Time:</span>
                          <Input
                            type="time"
                            className="h-9 w-28 cursor-pointer"
                            value={currentTime}
                            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                            onChange={(e) => handleTimeChange(e.target.value)}
                            data-testid="input-time"
                          />
                        </div>
                        <div className="px-3 pb-3 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-muted-foreground"
                            type="button"
                            onClick={() => {
                              form.setValue("next_followup_date", "");
                              setDatePickerOpen(false);
                            }}
                            data-testid="button-clear-date"
                          >
                            Clear
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            type="button"
                            onClick={() => setDatePickerOpen(false)}
                            data-testid="button-done-date"
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
              }}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="button-save-next-followup"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
