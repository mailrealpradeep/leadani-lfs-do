import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { ValidationRule, CustomColumn } from "@shared/schema";

interface ValidationRulesManagerProps {
  sheetId: string;
}

export function ValidationRulesManager({ sheetId }: ValidationRulesManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [triggerColumn, setTriggerColumn] = useState("");
  const [operator, setOperator] = useState<"equals" | "in" | "not_equals" | "not_in">("equals");
  const [triggerValue, setTriggerValue] = useState("");
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [newRequiredField, setNewRequiredField] = useState("");

  const { data: rules = [] } = useQuery<ValidationRule[]>({
    queryKey: ["/api/sheets", sheetId, "validation-rules"],
    enabled: !!sheetId,
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/sheets/${sheetId}/validation-rules`, {
        name: ruleName,
        trigger_column_key: triggerColumn,
        operator,
        trigger_value: triggerValue,
        required_fields: requiredFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "validation-rules"] });
      setRuleName("");
      setTriggerColumn("");
      setOperator("equals");
      setTriggerValue("");
      setRequiredFields([]);
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
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "validation-rules"] });
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

  const handleAddRequiredField = () => {
    if (newRequiredField && !requiredFields.includes(newRequiredField)) {
      setRequiredFields([...requiredFields, newRequiredField]);
      setNewRequiredField("");
    }
  };

  const handleRemoveRequiredField = (field: string) => {
    setRequiredFields(requiredFields.filter(f => f !== field));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !triggerColumn || !triggerValue || requiredFields.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please fill in all fields and add at least one required field",
      });
      return;
    }
    createRuleMutation.mutate();
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
            Create conditional validation rules. When a trigger condition is met, specified fields become required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Rules */}
          {rules.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2">Existing Rules</Label>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`validation-rule-${rule.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        When {rule.trigger_column_key} {rule.operator} "{rule.trigger_value}", 
                        require: {Array.isArray(rule.required_fields) ? rule.required_fields.join(", ") : "N/A"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Rule Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trigger-column">Trigger Column</Label>
                <Select value={triggerColumn} onValueChange={setTriggerColumn}>
                  <SelectTrigger id="trigger-column" data-testid="select-trigger-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.column_key} value={col.column_key}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Select value={operator} onValueChange={(v: any) => setOperator(v)}>
                  <SelectTrigger id="operator" data-testid="select-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="in">Contains</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="not_in">Not Contains</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger-value">Trigger Value</Label>
                <Input
                  id="trigger-value"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="e.g., Hot"
                  data-testid="input-trigger-value"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Fields (when condition is met)</Label>
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
    </Dialog>
  );
}
