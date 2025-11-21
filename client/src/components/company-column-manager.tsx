import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Edit2, X, Check, Lightbulb } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CompanyColumnManager() {
  const { toast } = useToast();
  
  // Add mode state
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnKey, setNewColumnKey] = useState("");
  const [newColumnType, setNewColumnType] = useState<"text" | "number" | "date" | "dropdown" | "boolean">("text");
  const [newDropdownOptions, setNewDropdownOptions] = useState<string[]>([]);
  const [newDropdownInput, setNewDropdownInput] = useState("");

  // Edit mode state (completely separate)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [editColumnKey, setEditColumnKey] = useState(""); // Read-only, for display
  const [editColumnType, setEditColumnType] = useState<"text" | "number" | "date" | "dropdown" | "boolean">("text");
  const [editDropdownOptions, setEditDropdownOptions] = useState<string[]>([]);
  const [editDropdownInput, setEditDropdownInput] = useState("");
  const [editColumnConfig, setEditColumnConfig] = useState<any>({}); // Store full config

  const { data: companyColumns = [], isLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const addColumnMutation = useMutation({
    mutationFn: async () => {
      const config: any = {};
      if (newColumnType === "dropdown") {
        if (newDropdownOptions.length === 0) {
          throw new Error("Dropdown columns must have at least one option");
        }
        config.dropdown_options = newDropdownOptions;
      }

      return await apiRequest<CustomColumn>("POST", "/api/company/columns", {
        name: newColumnName,
        column_key: newColumnKey || newColumnName.toLowerCase().replace(/\s+/g, "_"),
        type: newColumnType,
        config,
        sheet_id: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/columns"] });
      setNewColumnName("");
      setNewColumnKey("");
      setNewColumnType("text");
      setNewDropdownOptions([]);
      setNewDropdownInput("");
      setIsAdding(false);
      toast({
        title: "Column added",
        description: "Company-wide column has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to add column",
        description: error.message,
      });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnId, updates }: { columnId: string; updates: any }) => {
      return await apiRequest("PATCH", `/api/company/columns/${columnId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/columns"] });
      cancelEditing();
      toast({
        title: "Column updated",
        description: "Column has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update column",
        description: error.message,
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      return await apiRequest("DELETE", `/api/company/columns/${columnId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/columns"] });
      toast({
        title: "Column deleted",
        description: "Column has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete column",
        description: error.message,
      });
    },
  });

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColumnName.trim()) {
      addColumnMutation.mutate();
    }
  };

  const handleUpdateColumn = (e: React.FormEvent, columnId: string) => {
    e.preventDefault();
    if (editColumnName.trim()) {
      // Preserve existing config and merge with new values
      const config = { ...editColumnConfig };
      
      if (editColumnType === "dropdown") {
        if (editDropdownOptions.length === 0) {
          toast({
            variant: "destructive",
            title: "Validation error",
            description: "Dropdown columns must have at least one option",
          });
          return;
        }
        config.dropdown_options = editDropdownOptions;
      } else {
        // If type changed away from dropdown, remove dropdown_options
        delete config.dropdown_options;
      }

      updateColumnMutation.mutate({
        columnId,
        updates: {
          name: editColumnName,
          type: editColumnType,
          config,
        },
      });
    }
  };

  const startEditingColumn = (column: CustomColumn) => {
    setEditingColumnId(column.id);
    setEditColumnName(column.name);
    setEditColumnKey(column.column_key);
    setEditColumnType(column.type as any);
    setEditColumnConfig(column.config || {});
    
    if (column.type === "dropdown" && column.config?.dropdown_options) {
      setEditDropdownOptions(column.config.dropdown_options as string[]);
    } else {
      setEditDropdownOptions([]);
    }
    setEditDropdownInput("");
  };

  const cancelEditing = () => {
    setEditingColumnId(null);
    setEditColumnName("");
    setEditColumnKey("");
    setEditColumnType("text");
    setEditDropdownOptions([]);
    setEditDropdownInput("");
    setEditColumnConfig({});
  };

  const handleAddNewDropdownOption = () => {
    if (newDropdownInput.trim() && !newDropdownOptions.includes(newDropdownInput.trim())) {
      setNewDropdownOptions([...newDropdownOptions, newDropdownInput.trim()]);
      setNewDropdownInput("");
    }
  };

  const handleRemoveNewDropdownOption = (option: string) => {
    setNewDropdownOptions(newDropdownOptions.filter(o => o !== option));
  };

  const handleAddEditDropdownOption = () => {
    if (editDropdownInput.trim() && !editDropdownOptions.includes(editDropdownInput.trim())) {
      setEditDropdownOptions([...editDropdownOptions, editDropdownInput.trim()]);
      setEditDropdownInput("");
    }
  };

  const handleRemoveEditDropdownOption = (option: string) => {
    setEditDropdownOptions(editDropdownOptions.filter(o => o !== option));
  };

  const typeLabels: Record<string, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    dropdown: "Dropdown",
    boolean: "Yes/No",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Column Schema</CardTitle>
        <CardDescription>
          Define custom columns that will be available across all company sheets. Changes affect all sheets immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Company-Wide Columns</h3>
            {!isAdding && !editingColumnId && (
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
                  <Label htmlFor="column-key">Column Key (optional)</Label>
                  <Input
                    id="column-key"
                    placeholder="Auto-generated if empty"
                    value={newColumnKey}
                    onChange={(e) => setNewColumnKey(e.target.value)}
                    data-testid="input-column-key"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="column-type">Type</Label>
                <Select value={newColumnType} onValueChange={(val: any) => {
                  setNewColumnType(val);
                  if (val !== "dropdown") {
                    setNewDropdownOptions([]);
                  }
                }}>
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

              {newColumnType === "dropdown" && (
                <div className="space-y-2">
                  <Label>Dropdown Options</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter option"
                      value={newDropdownInput}
                      onChange={(e) => setNewDropdownInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewDropdownOption();
                        }
                      }}
                      data-testid="input-dropdown-option"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNewDropdownOption}
                      disabled={!newDropdownInput.trim()}
                      data-testid="button-add-dropdown-option"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newDropdownOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newDropdownOptions.map((option, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {option}
                          <button
                            type="button"
                            onClick={() => handleRemoveNewDropdownOption(option)}
                            className="ml-1 hover:text-destructive"
                            data-testid={`button-remove-option-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {newColumnType === "dropdown" && newDropdownOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Add at least one option for dropdown columns</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!newColumnName.trim() || (newColumnType === "dropdown" && newDropdownOptions.length === 0) || addColumnMutation.isPending}
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
                    setNewColumnKey("");
                    setNewDropdownOptions([]);
                    setNewDropdownInput("");
                  }}
                  data-testid="button-cancel-add-column"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : companyColumns.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
              No company-wide columns yet. Add your first column above.
            </div>
          ) : (
            <div className="space-y-2">
              {companyColumns.map((column) => (
                <div key={column.id}>
                  {editingColumnId === column.id ? (
                    <form onSubmit={(e) => handleUpdateColumn(e, column.id)} className="p-4 border rounded-lg space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-column-name">Column Name</Label>
                          <Input
                            id="edit-column-name"
                            placeholder="e.g., Source, Budget"
                            value={editColumnName}
                            onChange={(e) => setEditColumnName(e.target.value)}
                            data-testid="input-edit-column-name"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-column-key">Column Key (read-only)</Label>
                          <Input
                            id="edit-column-key"
                            value={editColumnKey}
                            disabled
                            data-testid="input-edit-column-key"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-column-type">Type</Label>
                        <Select value={editColumnType} onValueChange={(val: any) => {
                          setEditColumnType(val);
                          if (val !== "dropdown") {
                            setEditDropdownOptions([]);
                          }
                        }}>
                          <SelectTrigger data-testid="select-edit-column-type">
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

                      {editColumnType === "dropdown" && (
                        <div className="space-y-2">
                          <Label>Dropdown Options</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter option"
                              value={editDropdownInput}
                              onChange={(e) => setEditDropdownInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddEditDropdownOption();
                                }
                              }}
                              data-testid="input-edit-dropdown-option"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddEditDropdownOption}
                              disabled={!editDropdownInput.trim()}
                              data-testid="button-edit-add-dropdown-option"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {editDropdownOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editDropdownOptions.map((option, index) => (
                                <Badge key={index} variant="secondary" className="gap-1">
                                  {option}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditDropdownOption(option)}
                                    className="ml-1 hover:text-destructive"
                                    data-testid={`button-edit-remove-option-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          {editColumnType === "dropdown" && editDropdownOptions.length === 0 && (
                            <p className="text-xs text-muted-foreground">Add at least one option for dropdown columns</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={!editColumnName.trim() || (editColumnType === "dropdown" && editDropdownOptions.length === 0) || updateColumnMutation.isPending}
                          data-testid="button-update-column"
                        >
                          {updateColumnMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEditing}
                          data-testid="button-cancel-edit-column"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`company-column-${column.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{column.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[column.type]}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Key: {column.column_key}
                        </div>
                        {column.type === "dropdown" && column.config?.dropdown_options && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(column.config.dropdown_options as string[]).map((option, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingColumn(column)}
                          data-testid={`button-edit-column-${column.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Delete column "${column.name}"? This will remove it from all sheets.`)) {
                              deleteColumnMutation.mutate(column.id);
                            }
                          }}
                          data-testid={`button-delete-column-${column.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium mb-2">How it works</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Company-wide columns are available in all company sheets automatically</li>
                <li>• Changes to column schema apply to all existing and new sheets</li>
                <li>• Dropdown options can be extended or modified any time</li>
                <li>• Deleting a column removes it from all sheets (use with caution)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
