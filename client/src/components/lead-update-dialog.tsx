import { useState } from "react";
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

  const form = useForm<InsertLeadUpdate>({
    resolver: zodResolver(insertLeadUpdateSchema),
    defaultValues: {
      lead_id: leadId,
      update_via: "call",
      update_on: new Date().toISOString().split("T")[0],
      remark: "",
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: InsertLeadUpdate) => {
      return await apiRequest("POST", `/api/leads/${leadId}/updates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "updates"] });
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
