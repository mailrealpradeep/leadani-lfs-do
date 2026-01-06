import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquareMore } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";

interface HotLeadsResponse {
  leads: (Lead & { sheet_name: string; sheet_id: string })[];
  count: number;
  config: any;
}

interface CustomViewLeadsResponse {
  leads: (Lead & { sheet_name: string; sheet_id: string })[];
  count: number;
  view: any;
}

interface TransitionExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  columnName: string;
  columnKey: string;
  oldValue: string | null | undefined;
  newValue: string;
  customFields: Record<string, any>;
  onComplete?: () => void;
  queryKeysToInvalidate?: any[][];
  // Query context for optimistic updates
  hotLeadsMode?: boolean;
  customViewMode?: boolean;
  isMultiMode?: boolean;
  activeSheetId?: string;
  customViewId?: string;
}

export function TransitionExplanationDialog({
  open,
  onOpenChange,
  leadId,
  columnName,
  columnKey,
  oldValue,
  newValue,
  customFields,
  onComplete,
  queryKeysToInvalidate = [],
  hotLeadsMode = false,
  customViewMode = false,
  isMultiMode = false,
  activeSheetId,
  customViewId,
}: TransitionExplanationDialogProps) {
  const { toast } = useToast();
  const [explanation, setExplanation] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updatedFields = {
        ...customFields,
        [columnKey]: newValue,
      };
      return await apiRequest("PATCH", `/api/leads/${leadId}`, {
        custom_fields: updatedFields,
        transition_note: `[${columnName}: ${oldValue || 'None'} → ${newValue}] ${explanation}`,
      });
    },
    onMutate: async () => {
      // Use query key prefix matching for infinite queries - only match the base key parts
      const singleSheetQueryKeyPrefix = ["/api/sheets", activeSheetId, "leads-infinite"];
      const multiSheetQueryKeyPrefix = ["/api/leads/query-infinite"];
      const hotLeadsQueryKey = ["/api/hot-leads"];
      const customViewQueryKey = customViewId ? ["/api/custom-views", customViewId, "leads"] : [];
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      if (hotLeadsMode) {
        await queryClient.cancelQueries({ queryKey: hotLeadsQueryKey });
      } else if (customViewMode && customViewId) {
        await queryClient.cancelQueries({ queryKey: customViewQueryKey });
      } else if (isMultiMode) {
        await queryClient.cancelQueries({ queryKey: multiSheetQueryKeyPrefix });
      } else if (activeSheetId) {
        await queryClient.cancelQueries({ queryKey: singleSheetQueryKeyPrefix });
      }

      // Snapshot the previous values for rollback (using prefix matching)
      const previousSingleLeads = activeSheetId ? queryClient.getQueriesData({ queryKey: singleSheetQueryKeyPrefix }) : [];
      const previousMultiLeads = queryClient.getQueriesData({ queryKey: multiSheetQueryKeyPrefix });
      const previousHotLeads = queryClient.getQueryData(hotLeadsQueryKey);
      const previousCustomView = customViewId ? queryClient.getQueryData(customViewQueryKey) : undefined;

      // Optimistically update the lead in the appropriate cache
      // Use the cached lead's custom_fields and apply the new value
      if (hotLeadsMode) {
        queryClient.setQueryData(hotLeadsQueryKey, (old: HotLeadsResponse | undefined) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === leadId
                ? { ...lead, custom_fields: { ...lead.custom_fields, [columnKey]: newValue } }
                : lead
            ),
          };
        });
      } else if (customViewMode && customViewId) {
        queryClient.setQueryData(customViewQueryKey, (old: CustomViewLeadsResponse | undefined) => {
          if (!old?.leads) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === leadId
                ? { ...lead, custom_fields: { ...lead.custom_fields, [columnKey]: newValue } }
                : lead
            ),
          };
        });
      } else if (isMultiMode) {
        // Update all matching multi-sheet queries individually for reliability
        const matchingQueries = queryClient.getQueryCache().findAll({ 
          queryKey: multiSheetQueryKeyPrefix,
          exact: false 
        });
        
        matchingQueries.forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                leads: page.leads.map((lead: Lead) =>
                  lead.id === leadId
                    ? { ...lead, custom_fields: { ...lead.custom_fields, [columnKey]: newValue } }
                    : lead
                ),
              })),
            };
          });
        });
      } else if (activeSheetId) {
        // Update the infinite query pages structure
        // Use findAll to get all matching queries and update them individually
        // This is more reliable than prefix matching, especially in production builds
        const matchingQueries = queryClient.getQueryCache().findAll({ 
          queryKey: singleSheetQueryKeyPrefix,
          exact: false 
        });
        
        matchingQueries.forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!old?.pages) return old;
            // Create a completely new object structure to ensure React Query detects the change
            const updatedPages = old.pages.map((page: any) => {
              const updatedLeads = page.leads.map((lead: Lead) =>
                lead.id === leadId
                  ? { ...lead, custom_fields: { ...lead.custom_fields, [columnKey]: newValue } }
                  : lead
              );
              return {
                ...page,
                leads: updatedLeads,
              };
            });
            return {
              ...old,
              pages: updatedPages,
            };
          });
        });
      }

      // Return context with previous values for rollback
      return { previousSingleLeads, previousMultiLeads, previousHotLeads, previousCustomView };
    },
    onSuccess: () => {
      for (const queryKey of queryKeysToInvalidate) {
        queryClient.invalidateQueries({ queryKey });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead updated",
        description: "The lead has been updated with your explanation.",
      });
      handleClose();
      onComplete?.();
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous values on error
      if (context?.previousHotLeads) {
        queryClient.setQueryData(["/api/hot-leads"], context.previousHotLeads);
      }
      if (context?.previousCustomView && customViewId) {
        queryClient.setQueryData(["/api/custom-views", customViewId, "leads"], context.previousCustomView);
      }
      if (context?.previousSingleLeads) {
        context.previousSingleLeads.forEach(([queryKey, data]: [any, any]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      if (context?.previousMultiLeads) {
        context.previousMultiLeads.forEach(([queryKey, data]: [any, any]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      
      toast({
        variant: "destructive",
        title: "Failed to update lead",
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setExplanation("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!explanation.trim()) {
      toast({
        variant: "destructive",
        title: "Explanation required",
        description: "Please provide an explanation for this change.",
      });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5" />
            Explanation Required
          </DialogTitle>
          <DialogDescription>
            Changing <strong>{columnName}</strong> from "{oldValue || 'None'}" to "{newValue}" requires an explanation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea
              id="explanation"
              placeholder="Please explain why this change is being made..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-transition-explanation"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-transition"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !explanation.trim()}
            data-testid="button-submit-transition"
          >
            {updateMutation.isPending ? "Saving..." : "Save with Explanation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
