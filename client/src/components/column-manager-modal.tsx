import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface ColumnManagerModalProps {
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnManagerModal({ sheetId, open, onOpenChange }: ColumnManagerModalProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<"text" | "number" | "date" | "dropdown" | "boolean">("text");

  const { data: customColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: open,
  });

  const addColumnMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<CustomColumn>("POST", `/api/sheets/${sheetId}/columns`, {
        name: newColumnName,
        type: newColumnType,
        sheet_id: sheetId,
        config: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "columns"] });
      setNewColumnName("");
      setNewColumnType("text");
      setIsAdding(false);
      toast({
        title: "Column added",
        description: "Custom column has been added successfully",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      return await apiRequest("DELETE", `/api/sheets/${sheetId}/columns/${columnId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "columns"] });
      toast({
        title: "Column deleted",
        description: "Custom column has been deleted successfully",
      });
    },
  });

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColumnName.trim()) {
      addColumnMutation.mutate();
    }
  };

  const typeLabels: Record<string, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    dropdown: "Dropdown",
    boolean: "Yes/No",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>
            Add custom columns to capture additional information. Standard columns cannot be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Standard Columns</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Lead Date",
                "Time",
                "Executive",
                "Lang",
                "Address",
                "Name",
                "Mobile No",
                "WhatsApp",
                "Occupation",
                "Qualification",
                "Age",
                "Exam End",
                "Exam Mark",
                "Lead Status",
                "Visit Status",
                "Visit Date",
                "NFDT",
                "Call 1",
                "Feedback 1",
              ].map((col) => (
                <Badge key={col} variant="secondary">
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Custom Columns</h3>
              {!isAdding && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  data-testid="button-show-add-column"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              )}
            </div>

            {isAdding && (
              <form onSubmit={handleAddColumn} className="p-4 border rounded-lg space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="column-name">Column Name</Label>
                    <Input
                      id="column-name"
                      placeholder="e.g., Source, Budget"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      data-testid="input-column-name"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="column-type">Type</Label>
                    <Select value={newColumnType} onValueChange={(val: any) => setNewColumnType(val)}>
                      <SelectTrigger data-testid="select-column-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!newColumnName.trim() || addColumnMutation.isPending}
                    data-testid="button-save-column"
                  >
                    {addColumnMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Column"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewColumnName("");
                    }}
                    data-testid="button-cancel-add-column"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {customColumns.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                No custom columns yet. Add your first custom column above.
              </div>
            ) : (
              <div className="space-y-2">
                {customColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`custom-column-${column.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{column.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Type: {typeLabels[column.type]}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteColumnMutation.mutate(column.id)}
                      data-testid={`button-delete-column-${column.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
