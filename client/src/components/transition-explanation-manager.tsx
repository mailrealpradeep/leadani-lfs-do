import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, MessageSquareMore } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import type { TransitionExplanationRuleRecord, CustomColumn, DropdownOption } from "@shared/schema";

interface TransitionExplanationManagerProps {
  headless?: boolean;
}

export function TransitionExplanationManager({ headless = false }: TransitionExplanationManagerProps) {
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnKey, setNewColumnKey] = useState<string>("");
  const [newDropdownValue, setNewDropdownValue] = useState<string>("");
  
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editColumnKey, setEditColumnKey] = useState<string>("");
  const [editDropdownValue, setEditDropdownValue] = useState<string>("");
  
  const [ruleToDelete, setRuleToDelete] = useState<TransitionExplanationRuleRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: rules = [], isLoading: rulesLoading } = useQuery<TransitionExplanationRuleRecord[]>({
    queryKey: ["/api/company/transition-explanations"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const { data: dropdownOptions = [] } = useQuery<DropdownOption[]>({
    queryKey: ["/api/company/dropdown-options"],
  });

  const dropdownColumns = columns.filter(col => col.type === "dropdown");

  const getOptionsForColumn = (columnKey: string) => {
    return dropdownOptions.filter(opt => opt.column_key === columnKey);
  };

  const getColumnLabel = (columnKey: string) => {
    const col = columns.find(c => c.column_key === columnKey);
    return col?.name || columnKey;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<TransitionExplanationRuleRecord>("POST", "/api/company/transition-explanations", {
        column_key: newColumnKey,
        dropdown_value: newDropdownValue,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/transition-explanations"] });
      resetAddForm();
      toast({
        title: "Rule created",
        description: "Transition explanation rule has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create rule",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string; updates: any }) => {
      return await apiRequest("PATCH", `/api/company/transition-explanations/${ruleId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/transition-explanations"] });
      cancelEditing();
      toast({
        title: "Rule updated",
        description: "Rule has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update rule",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest("DELETE", `/api/company/transition-explanations/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/transition-explanations"] });
      toast({
        title: "Rule deleted",
        description: "Rule has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete rule",
        description: error.message,
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, is_active }: { ruleId: string; is_active: boolean }) => {
      return await apiRequest("PATCH", `/api/company/transition-explanations/${ruleId}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/transition-explanations"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to toggle rule",
        description: error.message,
      });
    },
  });

  const resetAddForm = () => {
    setNewColumnKey("");
    setNewDropdownValue("");
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setEditColumnKey("");
    setEditDropdownValue("");
  };

  const startEditing = (rule: TransitionExplanationRuleRecord) => {
    setEditingRuleId(rule.id);
    setEditColumnKey(rule.column_key);
    setEditDropdownValue(rule.dropdown_value);
  };

  const handleAdd = () => {
    if (!newColumnKey) {
      toast({ variant: "destructive", title: "Please select a column" });
      return;
    }
    if (!newDropdownValue) {
      toast({ variant: "destructive", title: "Please select a dropdown value" });
      return;
    }
    createMutation.mutate();
  };

  const handleSaveEdit = () => {
    if (!editingRuleId) return;
    if (!editColumnKey || !editDropdownValue) {
      toast({ variant: "destructive", title: "Column and value are required" });
      return;
    }
    updateMutation.mutate({
      ruleId: editingRuleId,
      updates: {
        column_key: editColumnKey,
        dropdown_value: editDropdownValue,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id);
      setRuleToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {!isAdding && (
        <div className="flex justify-end">
          <Button 
            size="sm"
            onClick={() => setIsAdding(true)}
            data-testid="button-add-transition-rule"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">New Transition Explanation Rule</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetAddForm}
              data-testid="button-cancel-add-rule"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dropdown Column</Label>
              <Select value={newColumnKey} onValueChange={(val) => {
                setNewColumnKey(val);
                setNewDropdownValue("");
              }}>
                <SelectTrigger data-testid="select-new-rule-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownColumns.map((col) => (
                    <SelectItem key={col.column_key} value={col.column_key}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trigger Value</Label>
              <Select 
                value={newDropdownValue} 
                onValueChange={setNewDropdownValue}
                disabled={!newColumnKey}
              >
                <SelectTrigger data-testid="select-new-rule-value">
                  <SelectValue placeholder={newColumnKey ? "Select value" : "Select column first"} />
                </SelectTrigger>
                <SelectContent>
                  {getOptionsForColumn(newColumnKey).map((opt) => (
                    <SelectItem key={opt.id} value={opt.value}>
                      {opt.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            When a lead's "{getColumnLabel(newColumnKey) || 'column'}" is changed to "{newDropdownValue || 'value'}", 
            the user will be prompted to provide an explanation.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetAddForm}
              data-testid="button-cancel-add-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createMutation.isPending || !newColumnKey || !newDropdownValue}
              data-testid="button-save-new-rule"
            >
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </div>
      )}

      {rulesLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
          <MessageSquareMore className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p>No transition explanation rules configured yet.</p>
          <p className="text-xs mt-1">Click "Add Rule" to require explanations when specific dropdown values are selected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 border rounded-lg hover-elevate"
              data-testid={`transition-rule-${rule.id}`}
            >
              {editingRuleId === rule.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Edit Rule</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      data-testid="button-cancel-edit-rule"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dropdown Column</Label>
                      <Select value={editColumnKey} onValueChange={(val) => {
                        setEditColumnKey(val);
                        setEditDropdownValue("");
                      }}>
                        <SelectTrigger data-testid="select-edit-rule-column">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {dropdownColumns.map((col) => (
                            <SelectItem key={col.column_key} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Trigger Value</Label>
                      <Select 
                        value={editDropdownValue} 
                        onValueChange={setEditDropdownValue}
                        disabled={!editColumnKey}
                      >
                        <SelectTrigger data-testid="select-edit-rule-value">
                          <SelectValue placeholder={editColumnKey ? "Select value" : "Select column first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getOptionsForColumn(editColumnKey).map((opt) => (
                            <SelectItem key={opt.id} value={opt.value}>
                              {opt.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      data-testid="button-cancel-edit-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                      data-testid="button-save-edit-rule"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getColumnLabel(rule.column_key)}</span>
                        <span className="text-muted-foreground">=</span>
                        <Badge variant="secondary">{rule.dropdown_value}</Badge>
                        {!rule.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires explanation when this value is selected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ ruleId: rule.id, is_active: checked })}
                      data-testid={`toggle-rule-${rule.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditing(rule)}
                      data-testid={`button-edit-rule-${rule.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setRuleToDelete(rule);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-rule-${rule.id}`}
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
  );

  const deleteDialog = (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transition explanation rule? 
            Users will no longer be prompted for explanations when selecting "{ruleToDelete?.dropdown_value}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete-rule"
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5" />
            Transition Explanations
          </CardTitle>
          <CardDescription>
            Require users to provide explanations when changing dropdown values to specific options
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
