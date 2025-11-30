import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { FilterConditionBuilder, FilterCondition } from "./filter-condition-builder";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserRowFilterRecord, RowFilterCondition } from "@shared/schema";

interface HideRowsPanelProps {
  sheetId: string;
  onFiltersChange: (filters: UserRowFilterRecord[]) => void;
}

export function HideRowsPanel({ sheetId, onFiltersChange }: HideRowsPanelProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [newFilterName, setNewFilterName] = useState("");
  const [newConditions, setNewConditions] = useState<FilterCondition[]>([]);
  const [newLogicOperator, setNewLogicOperator] = useState<"and" | "or">("and");
  
  const [editFilterName, setEditFilterName] = useState("");
  const [editConditions, setEditConditions] = useState<FilterCondition[]>([]);
  const [editLogicOperator, setEditLogicOperator] = useState<"and" | "or">("and");

  const { data: filters = [], isLoading } = useQuery<UserRowFilterRecord[]>({
    queryKey: ["/api/sheets", sheetId, "row-filters"],
    enabled: !!sheetId,
  });

  useEffect(() => {
    if (filters) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; conditions: RowFilterCondition[]; logic_operator: string }) => {
      return apiRequest("POST", `/api/sheets/${sheetId}/row-filters`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "row-filters"] });
      setIsCreating(false);
      setNewFilterName("");
      setNewConditions([]);
      setNewLogicOperator("and");
      toast({
        title: "Filter Created",
        description: "Your row filter has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create filter",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserRowFilterRecord> }) => {
      return apiRequest("PATCH", `/api/row-filters/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "row-filters"] });
      setEditingId(null);
      toast({
        title: "Filter Updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update filter",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return apiRequest("PATCH", `/api/row-filters/${id}/toggle`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "row-filters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle filter",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/row-filters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "row-filters"] });
      setDeleteConfirmId(null);
      toast({
        title: "Filter Deleted",
        description: "The filter has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete filter",
        variant: "destructive",
      });
    },
  });

  const convertToRowFilterConditions = (conditions: FilterCondition[]): RowFilterCondition[] => {
    return conditions
      .filter(c => c.column_key && c.operator)
      .map(c => ({
        column_key: c.column_key,
        column_type: "text" as const,
        operator: c.operator as any,
        value: c.value ?? null,
      }));
  };

  const convertFromRowFilterConditions = (conditions: RowFilterCondition[]): FilterCondition[] => {
    return conditions.map(c => ({
      id: crypto.randomUUID(),
      column_key: c.column_key,
      operator: c.operator,
      value: c.value,
    }));
  };

  const handleCreate = () => {
    if (!newFilterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your filter.",
        variant: "destructive",
      });
      return;
    }
    if (newConditions.length === 0 || !newConditions.some(c => c.column_key && c.operator)) {
      toast({
        title: "Conditions Required",
        description: "Please add at least one valid condition.",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate({
      name: newFilterName.trim(),
      conditions: convertToRowFilterConditions(newConditions),
      logic_operator: newLogicOperator.toUpperCase(),
    });
  };

  const handleUpdate = (id: string) => {
    if (!editFilterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your filter.",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      id,
      data: {
        name: editFilterName.trim(),
        conditions: convertToRowFilterConditions(editConditions) as any,
        logic_operator: editLogicOperator.toUpperCase() as "AND" | "OR",
      },
    });
  };

  const startEditing = (filter: UserRowFilterRecord) => {
    setEditingId(filter.id);
    setEditFilterName(filter.name);
    setEditConditions(convertFromRowFilterConditions(filter.conditions as RowFilterCondition[]));
    setEditLogicOperator(filter.logic_operator.toLowerCase() as "and" | "or");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFilterName("");
    setEditConditions([]);
    setEditLogicOperator("and");
  };

  const activeFiltersCount = filters.filter(f => f.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-medium">Hide/Show Rows</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create rules to hide rows based on column values
          </p>
        </div>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" data-testid="badge-active-filters">
            {activeFiltersCount} active
          </Badge>
        )}
      </div>

      <Separator />

      {!isCreating && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="w-full"
          data-testid="button-create-row-filter"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Filter
        </Button>
      )}

      {isCreating && (
        <Card className="border-primary/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              New Row Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name" className="text-xs">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., Hide Not Interested"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                data-testid="input-new-filter-name"
              />
            </div>

            <FilterConditionBuilder
              conditions={newConditions}
              onChange={setNewConditions}
              logicalOperator={newLogicOperator}
              onLogicalOperatorChange={setNewLogicOperator}
              showLogicalOperator={true}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewFilterName("");
                  setNewConditions([]);
                  setNewLogicOperator("and");
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-save-filter"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {filters.length === 0 && !isCreating && (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No filters created yet.</p>
              <p className="text-xs mt-1">Create a filter to hide rows based on conditions.</p>
            </div>
          )}

          {filters.map((filter) => (
            <div key={filter.id}>
              {editingId === filter.id ? (
                <Card className="border-primary/50">
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Filter Name</Label>
                      <Input
                        value={editFilterName}
                        onChange={(e) => setEditFilterName(e.target.value)}
                        data-testid="input-edit-filter-name"
                      />
                    </div>

                    <FilterConditionBuilder
                      conditions={editConditions}
                      onChange={setEditConditions}
                      logicalOperator={editLogicOperator}
                      onLogicalOperatorChange={setEditLogicOperator}
                      showLogicalOperator={true}
                    />

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdate(filter.id)}
                        disabled={updateMutation.isPending}
                        data-testid="button-update-filter"
                      >
                        {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className={filter.is_active ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {filter.is_active ? (
                          <EyeOff className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-filter-name-${filter.id}`}>
                            {filter.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(filter.conditions as RowFilterCondition[]).length} condition(s) • {filter.logic_operator}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={filter.is_active}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: filter.id, is_active: checked })
                          }
                          data-testid={`switch-filter-${filter.id}`}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(filter)}
                          data-testid={`button-edit-filter-${filter.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(filter.id)}
                          data-testid={`button-delete-filter-${filter.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this row filter. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
