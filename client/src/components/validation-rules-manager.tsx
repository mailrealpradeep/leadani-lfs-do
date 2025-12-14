import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { ValidationRule, CustomColumn, ValidationCondition } from "@shared/schema";
import { FilterConditionBuilder, type FilterCondition } from "@/components/filter-condition-builder";

interface ValidationRulesManagerProps {
  sheetId: string | null;
  isGlobal?: boolean;
}

export function ValidationRulesManager({ sheetId, isGlobal = false }: ValidationRulesManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logicalOperator, setLogicalOperator] = useState<"and" | "or">("and");
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [newRequiredField, setNewRequiredField] = useState("");
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [ruleToDelete, setRuleToDelete] = useState<ValidationRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: rules = [] } = useQuery<ValidationRule[]>({
    queryKey: isGlobal ? ["/api/company/global-validation-rules"] : ["/api/sheets", sheetId, "validation-rules"],
    enabled: isGlobal || !!sheetId,
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: isGlobal ? ["/api/company/columns"] : ["/api/sheets", sheetId, "columns"],
    enabled: isGlobal || !!sheetId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const validationConditions: ValidationCondition[] = conditions.map(c => ({
        column_key: c.column_key,
        operator: c.operator as ValidationCondition["operator"],
        value: c.value,
        value2: c.value2,
      }));

      const endpoint = isGlobal 
        ? "/api/company/global-validation-rules"
        : `/api/sheets/${sheetId}/validation-rules`;

      return await apiRequest("POST", endpoint, {
        name: ruleName,
        conditions: validationConditions,
        logical_operator: logicalOperator,
        required_fields: requiredFields,
      });
    },
    onSuccess: () => {
      const queryKey = isGlobal ? ["/api/company/global-validation-rules"] : ["/api/sheets", sheetId, "validation-rules"];
      queryClient.invalidateQueries({ queryKey });
      resetForm();
      setOpen(false);
      toast({
        title: "Validation rule created",
        description: "The validation rule has been created successfully",
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

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest("DELETE", `/api/company/validation-rules/${ruleId}`, {});
    },
    onSuccess: () => {
      const queryKey = isGlobal ? ["/api/company/global-validation-rules"] : ["/api/sheets", sheetId, "validation-rules"];
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Rule deleted",
        description: "Validation rule has been deleted successfully",
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

  const resetForm = () => {
    setRuleName("");
    setConditions([]);
    setLogicalOperator("and");
    setRequiredFields([]);
    setNewRequiredField("");
  };

  const handleAddRequiredField = () => {
    if (newRequiredField && !requiredFields.includes(newRequiredField)) {
      setRequiredFields([...requiredFields, newRequiredField]);
      setNewRequiredField("");
    }
  };

  const handleRemoveRequiredField = (field: string) => {
    setRequiredFields(requiredFields.filter(f => f !== field));
  };

  const toggleRuleExpanded = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ruleName) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Rule name is required",
      });
      return;
    }

    if (conditions.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "At least one condition is required",
      });
      return;
    }

    for (const condition of conditions) {
      if (!condition.column_key || !condition.operator) {
        toast({
          variant: "destructive",
          title: "Validation error",
          description: "All conditions must have a column and operator selected",
        });
        return;
      }
    }

    if (requiredFields.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "At least one required field must be added",
      });
      return;
    }

    createRuleMutation.mutate();
  };

  const getOperatorLabel = (operator: string): string => {
    const labels: Record<string, string> = {
      equals: "equals",
      not_equals: "does not equal",
      contains: "contains",
      not_contains: "does not contain",
      starts_with: "starts with",
      ends_with: "ends with",
      in: "is one of",
      not_in: "is not one of",
      is_empty: "is empty",
      is_not_empty: "is not empty",
      greater_than: "is greater than",
      less_than: "is less than",
      greater_equal: "is at least",
      less_equal: "is at most",
      between: "is between",
      date_equals: "equals",
      date_not_equals: "does not equal",
      date_before: "is before",
      date_after: "is after",
      date_between: "is between",
    };
    return labels[operator] || operator;
  };

  const formatConditionDisplay = (rule: ValidationRule): string => {
    if (rule.conditions && rule.conditions.length > 0) {
      const parts = rule.conditions.map(c => {
        const colName = columns.find(col => col.column_key === c.column_key)?.name || c.column_key;
        const opLabel = getOperatorLabel(c.operator);
        const valueStr = c.value !== undefined && c.value !== null ? `"${c.value}"` : "";
        return `${colName} ${opLabel} ${valueStr}`.trim();
      });
      const joinWord = (rule.logical_operator || "and").toUpperCase();
      return parts.join(` ${joinWord} `);
    }
    const colName = columns.find(c => c.column_key === rule.trigger_column_key)?.name || rule.trigger_column_key;
    return `${colName} ${getOperatorLabel(rule.operator)} "${rule.trigger_value}"`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-manage-validation-rules">
          <Plus className="h-4 w-4 mr-2" />
          Validation Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validation Rules</DialogTitle>
          <DialogDescription>
            Create conditional validation rules. When conditions are met, specified fields become required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {rules.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2">Existing Rules</Label>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <Collapsible
                    key={rule.id}
                    open={expandedRules.has(rule.id)}
                    onOpenChange={() => toggleRuleExpanded(rule.id)}
                  >
                    <div
                      className="p-3 border rounded-lg"
                      data-testid={`validation-rule-${rule.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {rule.name}
                            {rule.conditions && rule.conditions.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {rule.conditions.length} conditions
                              </Badge>
                            )}
                            {rule.logical_operator && rule.conditions && rule.conditions.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {rule.logical_operator.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            When: {formatConditionDisplay(rule)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {expandedRules.has(rule.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
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
                      <CollapsibleContent className="mt-2 pt-2 border-t">
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">Required fields: </span>
                            {Array.isArray(rule.required_fields) 
                              ? rule.required_fields.map(f => 
                                  columns.find(c => c.column_key === f)?.name || f
                                ).join(", ")
                              : "N/A"}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-semibold">Create New Rule</Label>
            
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., Require details for hot leads"
                data-testid="input-rule-name"
              />
            </div>

            <FilterConditionBuilder
              conditions={conditions}
              onChange={setConditions}
              logicalOperator={logicalOperator}
              onLogicalOperatorChange={setLogicalOperator}
              showLogicalOperator={true}
            />

            <div className="space-y-2">
              <Label>Required Fields (when conditions are met)</Label>
              <div className="flex gap-2">
                <Select value={newRequiredField} onValueChange={setNewRequiredField}>
                  <SelectTrigger data-testid="select-required-field">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.column_key} value={col.column_key}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddRequiredField}
                  variant="outline"
                  data-testid="button-add-required-field"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredFields.map((field) => (
                  <Badge
                    key={field}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveRequiredField(field)}
                    data-testid={`badge-required-field-${field}`}
                  >
                    {columns.find(c => c.column_key === field)?.name || field}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createRuleMutation.isPending} data-testid="button-create-rule">
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Validation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the validation rule "{ruleToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-validation-rule">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ruleToDelete) {
                  deleteRuleMutation.mutate(ruleToDelete.id);
                }
                setDeleteDialogOpen(false);
                setRuleToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-validation-rule"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
