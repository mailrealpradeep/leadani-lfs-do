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
    onError: (error: any) => {
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
