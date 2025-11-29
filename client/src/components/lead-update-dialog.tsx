import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadUpdateSchema, type InsertLeadUpdate } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface LeadUpdateDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadUpdateDialog({
  leadId,
  open,
  onOpenChange,
}: LeadUpdateDialogProps) {
  const { toast } = useToast();
  
  // CRITICAL FIX: Lock the lead_id ONLY when dialog OPENS (false→true transition)
  // This ref NEVER changes while dialog is open, preventing race conditions
  const lockedLeadIdRef = useRef<string>(leadId);
  
  // Track previous open state to detect false→true transitions
  const prevOpenRef = useRef<boolean>(false);
  
  // Update the locked ref ONLY on false→true transition of open state
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const isNowOpen = open;
    
    // Only lock the lead_id when dialog is OPENING (false → true)
    if (!wasOpen && isNowOpen) {
      lockedLeadIdRef.current = leadId;
    }
    
    // Update previous open state
    prevOpenRef.current = open;
  }, [open, leadId]);

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
    onSuccess: () => {
      // Use the locked lead_id for cache invalidation too
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lockedLeadIdRef.current, "updates"] });
      toast({ title: "Update created successfully" });
      form.reset();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:w-full">
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
                disabled={createUpdateMutation.isPending}
                data-testid="button-save-update"
              >
                {createUpdateMutation.isPending ? "Saving..." : "Save Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
