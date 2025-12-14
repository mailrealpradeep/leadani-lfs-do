import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Edit2, X, Check, Lightbulb, GripVertical, Lock } from "lucide-react";
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
import { SYSTEM_COLUMN_KEYS } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CompanyColumnManagerProps {
  headless?: boolean;
}

export function CompanyColumnManager({ headless = false }: CompanyColumnManagerProps) {
  const { toast } = useToast();
  
  // Add mode state
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnKey, setNewColumnKey] = useState("");
  const [newColumnType, setNewColumnType] = useState<"text" | "number" | "date" | "dropdown" | "boolean" | "mobile" | "percentage">("text");
  const [newDropdownOptions, setNewDropdownOptions] = useState<string[]>([]);
  const [newDropdownInput, setNewDropdownInput] = useState("");

  // Edit mode state (completely separate)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [editColumnKey, setEditColumnKey] = useState(""); // Read-only, for display
  const [editColumnType, setEditColumnType] = useState<"text" | "number" | "date" | "dropdown" | "boolean" | "mobile" | "percentage">("text");
  const [editDropdownOptions, setEditDropdownOptions] = useState<string[]>([]);
  const [editDropdownInput, setEditDropdownInput] = useState("");
  const [editColumnConfig, setEditColumnConfig] = useState<any>({}); // Store full config
  
  // Delete confirmation state
  const [columnToDelete, setColumnToDelete] = useState<CustomColumn | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: companyColumns = [], isLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  // Sort columns by order_index
  const sortedColumns = [...companyColumns].sort((a, b) => a.order_index - b.order_index);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderColumnsMutation = useMutation({
    mutationFn: async (columnOrders: { id: string; order_index: number }[]) => {
      return await apiRequest("PATCH", "/api/company/columns/reorder", { columnOrders });
    },
    onSuccess: () => {
      // Don't invalidate - we already optimistically updated the cache
      toast({
        title: "Columns reordered",
        description: "Column order has been updated successfully",
      });
    },
    onError: (error: any) => {
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["/api/company/columns"] });
      toast({
        variant: "destructive",
        title: "Failed to reorder columns",
        description: error.message,
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedColumns.findIndex((col) => col.id === active.id);
      const newIndex = sortedColumns.findIndex((col) => col.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        console.error("Invalid drag indices", { oldIndex, newIndex, active: active.id, over: over.id });
        return;
      }

      const reorderedColumns = arrayMove(sortedColumns, oldIndex, newIndex);
      
      // Update order_index for all columns with new values
      const updatedColumns = reorderedColumns.map((col, index) => ({
        ...col,
        order_index: index,
      }));

      // Filter out any columns without valid IDs
      const columnOrders = updatedColumns
        .filter((col) => col.id && typeof col.id === 'string')
        .map((col) => ({
          id: col.id,
          order_index: col.order_index,
        }));

      if (columnOrders.length === 0) {
        console.error("No valid columns to reorder");
        return;
      }

      // Optimistically update the query cache with updated order_index values
      queryClient.setQueryData(["/api/company/columns"], updatedColumns);

      // Send update to server (error rollback handled in mutation)
      reorderColumnsMutation.mutate(columnOrders);
    }
  };

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
    // Don't allow removal of system values
    const systemVals = (editColumnConfig?.system_values || []).map((v: string) => v.toLowerCase());
    if (systemVals.includes(option.toLowerCase())) {
      return;
    }
    setEditDropdownOptions(editDropdownOptions.filter(o => o !== option));
  };
  
  // Helper to check if an option is a system value
  const isSystemValue = (option: string) => {
    const systemVals = (editColumnConfig?.system_values || []).map((v: string) => v.toLowerCase());
    return systemVals.includes(option.toLowerCase());
  };

  const typeLabels: Record<string, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    dropdown: "Dropdown",
    boolean: "Yes/No",
    mobile: "Mobile No",
    percentage: "Percentage (%)",
  };

  const content = (
    <div className="space-y-6">
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
                    <SelectItem value="mobile">Mobile No</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedColumns.map(col => col.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedColumns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      editingColumnId={editingColumnId}
                      editColumnName={editColumnName}
                      editColumnKey={editColumnKey}
                      editColumnType={editColumnType}
                      editDropdownOptions={editDropdownOptions}
                      editDropdownInput={editDropdownInput}
                      setEditColumnName={setEditColumnName}
                      setEditColumnType={setEditColumnType}
                      setEditDropdownOptions={setEditDropdownOptions}
                      setEditDropdownInput={setEditDropdownInput}
                      handleUpdateColumn={handleUpdateColumn}
                      handleAddEditDropdownOption={handleAddEditDropdownOption}
                      handleRemoveEditDropdownOption={handleRemoveEditDropdownOption}
                      isSystemValue={isSystemValue}
                      startEditingColumn={startEditingColumn}
                      cancelEditing={cancelEditing}
                      onDeleteClick={(col) => {
                        setColumnToDelete(col);
                        setDeleteDialogOpen(true);
                      }}
                      updateColumnMutation={updateColumnMutation}
                      typeLabels={typeLabels}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Company-Wide Column Management</p>
            <p className="text-blue-700 dark:text-blue-200">
              Custom columns defined here are automatically available across all sheets in your company.
              Any changes to column names, types, or dropdown options will update everywhere instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const deleteDialog = (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Column</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the column "{columnToDelete?.name}"? 
            This will remove it from all sheets in your company. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-company-column">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (columnToDelete) {
                deleteColumnMutation.mutate(columnToDelete.id);
              }
              setDeleteDialogOpen(false);
              setColumnToDelete(null);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete-company-column"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (headless) {
    return (
      <>
        {content}
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Company Column Schema</CardTitle>
          <CardDescription>
            Define custom columns that will be available across all company sheets. Changes affect all sheets immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
      {deleteDialog}
    </>
  );
}

// Sortable column item component
function SortableColumnItem({
  column,
  editingColumnId,
  editColumnName,
  editColumnKey,
  editColumnType,
  editDropdownOptions,
  editDropdownInput,
  setEditColumnName,
  setEditColumnType,
  setEditDropdownOptions,
  setEditDropdownInput,
  handleUpdateColumn,
  handleAddEditDropdownOption,
  handleRemoveEditDropdownOption,
  isSystemValue,
  startEditingColumn,
  cancelEditing,
  onDeleteClick,
  updateColumnMutation,
  typeLabels,
}: {
  column: CustomColumn;
  editingColumnId: string | null;
  editColumnName: string;
  editColumnKey: string;
  editColumnType: "text" | "number" | "date" | "dropdown" | "boolean" | "mobile" | "percentage";
  editDropdownOptions: string[];
  editDropdownInput: string;
  setEditColumnName: (value: string) => void;
  setEditColumnType: (value: "text" | "number" | "date" | "dropdown" | "boolean" | "mobile" | "percentage") => void;
  setEditDropdownOptions: (value: string[]) => void;
  setEditDropdownInput: (value: string) => void;
  handleUpdateColumn: (e: React.FormEvent, columnId: string) => void;
  handleAddEditDropdownOption: () => void;
  handleRemoveEditDropdownOption: (option: string) => void;
  isSystemValue: (option: string) => boolean;
  startEditingColumn: (column: CustomColumn) => void;
  cancelEditing: () => void;
  onDeleteClick: (column: CustomColumn) => void;
  updateColumnMutation: any;
  typeLabels: Record<string, string>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
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
                <SelectItem value="mobile">Mobile No</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
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
                      {isSystemValue(option) ? (
                        <span title="System value - cannot be deleted" data-testid={`icon-lock-system-value-${index}`}>
                          <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditDropdownOption(option)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-edit-remove-option-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
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
          <div className="flex items-start gap-2 flex-1">
            <div {...listeners} className="cursor-grab active:cursor-grabbing pt-1">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium">{column.name}</div>
                <Badge variant="outline" className="text-xs">
                  {typeLabels[column.type]}
                </Badge>
                {((SYSTEM_COLUMN_KEYS as readonly string[]).includes(column.column_key) || column.config?.is_system_column) && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    System
                  </Badge>
                )}
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
            {!((SYSTEM_COLUMN_KEYS as readonly string[]).includes(column.column_key) || column.config?.is_system_column) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteClick(column)}
                data-testid={`button-delete-column-${column.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
