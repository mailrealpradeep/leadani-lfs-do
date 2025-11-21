import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, GripVertical, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { DropdownOption } from "@shared/schema";

interface DropdownManagerModalProps {
  sheetId: string;
  columnKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DropdownManagerModal({
  sheetId,
  columnKey,
  open,
  onOpenChange,
}: DropdownManagerModalProps) {
  const { toast } = useToast();
  const [newOptionValue, setNewOptionValue] = useState("");

  const { data: options = [], isLoading } = useQuery<DropdownOption[]>({
    queryKey: ["/api/sheets", sheetId, "dropdowns", columnKey],
    enabled: !!columnKey && open,
  });

  const addOptionMutation = useMutation({
    mutationFn: async (value: string) => {
      return await apiRequest<DropdownOption>("POST", `/api/sheets/${sheetId}/dropdowns/${columnKey}`, {
        value,
        order_index: options.length,
        sheet_id: sheetId,
        column_key: columnKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "dropdowns"] });
      setNewOptionValue("");
      toast({
        title: "Option added",
        description: "Dropdown option has been added successfully",
      });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest("DELETE", `/api/sheets/${sheetId}/dropdowns/${columnKey}/${optionId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "dropdowns"] });
      toast({
        title: "Option deleted",
        description: "Dropdown option has been deleted successfully",
      });
    },
  });

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOptionValue.trim()) {
      addOptionMutation.mutate(newOptionValue.trim());
    }
  };

  const columnLabels: Record<string, string> = {
    lang: "Language",
    occupation: "Occupation",
    qualification: "Qualification",
    lead_status: "Lead Status",
    visit_status: "Visit Status",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage {columnLabels[columnKey || ""] || columnKey} Options</DialogTitle>
          <DialogDescription>
            Add, edit, or remove dropdown options for this column. Changes apply to all leads in this sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {options.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No options yet. Add your first option below.
                  </div>
                ) : (
                  options
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card hover-elevate"
                        data-testid={`dropdown-option-${option.id}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <span className="flex-1 text-sm">{option.value}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteOptionMutation.mutate(option.id)}
                          data-testid={`button-delete-option-${option.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                )}
              </div>

              <form onSubmit={handleAddOption} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-option">Add new option</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-option"
                      placeholder="Enter option value"
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      data-testid="input-new-option"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newOptionValue.trim() || addOptionMutation.isPending}
                      data-testid="button-add-option"
                    >
                      {addOptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
