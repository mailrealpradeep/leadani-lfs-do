import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  Flame,
  Power,
  PowerOff,
  Info
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HotLeadCondition, CustomColumn } from "@shared/schema";

const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  mobile: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "greater_equal", label: "Greater or equal" },
    { value: "less_equal", label: "Less or equal" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  date: [
    { value: "is_today", label: "Is today" },
    { value: "is_tomorrow", label: "Is tomorrow" },
    { value: "is_before_today", label: "Is before today" },
    { value: "is_after_today", label: "Is after today" },
    { value: "is_this_week", label: "Is this week" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains any of" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  thought: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
};

const NO_VALUE_OPERATORS = [
  "is_empty", 
  "is_not_empty", 
  "is_today", 
  "is_tomorrow",
  "is_before_today", 
  "is_after_today",
  "is_this_week",
];

interface HotLeadConfig {
  id?: string;
  company_id: string;
  conditions: HotLeadCondition[];
  logical_operator: "and" | "or";
  is_active: boolean;
}

export function HotLeadsConfigManager() {
  const { toast } = useToast();
  const [conditions, setConditions] = useState<HotLeadCondition[]>([]);
  const [logicalOperator, setLogicalOperator] = useState<"and" | "or">("or");
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing config
  const { data: config, isLoading: configLoading } = useQuery<HotLeadConfig>({
    queryKey: ["/api/company/hot-lead-config"],
  });

  // Fetch company columns (all columns across all sheets in the company)
  const { data: columns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  // Initialize state from config
  // Normalize legacy column keys (e.g., "lead_thought" -> "thought")
  useEffect(() => {
    if (config) {
      const normalizedConditions = (config.conditions || []).map(condition => ({
        ...condition,
        // Normalize lead_thought to thought for display consistency
        column_key: condition.column_key === "lead_thought" ? "thought" : condition.column_key,
      }));
      setConditions(normalizedConditions);
      setLogicalOperator(config.logical_operator || "or");
      setIsActive(config.is_active ?? true);
      setHasChanges(false);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: { conditions: HotLeadCondition[]; logical_operator: "and" | "or"; is_active: boolean }) => {
      return apiRequest("POST", "/api/company/hot-lead-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/hot-lead-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
      setHasChanges(false);
      toast({
        title: "Saved",
        description: "Hot leads configuration has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration.",
        variant: "destructive",
      });
    },
  });

  const handleAddCondition = () => {
    const newCondition: HotLeadCondition = {
      column_key: "",
      operator: "equals",
      value: "",
    };
    setConditions([...conditions, newCondition]);
    setHasChanges(true);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateCondition = (index: number, updates: Partial<HotLeadCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    
    // Reset value when operator changes to a no-value operator
    if (updates.operator && NO_VALUE_OPERATORS.includes(updates.operator)) {
      updated[index].value = "";
    }
    
    // Reset operator and value when column changes
    if (updates.column_key && updates.column_key !== conditions[index].column_key) {
      updated[index].operator = "equals";
      updated[index].value = "";
    }
    
    setConditions(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      conditions,
      logical_operator: logicalOperator,
      is_active: isActive,
    });
  };

  // Standard lead fields that are always available
  const standardFields = [
    { key: "thought", name: "Lead Thought (Sure/May Be)", type: "thought" },
    { key: "name", name: "Full Name", type: "text" },
    { key: "email", name: "Email", type: "text" },
    { key: "mobile_no", name: "Mobile No", type: "mobile" },
    { key: "created_at", name: "Created Date", type: "date" },
  ];

  const getColumnType = (columnKey: string): string => {
    // First check standard fields
    const standardField = standardFields.find(f => f.key === columnKey);
    if (standardField) {
      return standardField.type;
    }
    // Then check company columns from API
    const column = columns.find(c => c.column_key === columnKey);
    return column?.type || "text";
  };

  const getOperatorsForColumn = (columnKey: string) => {
    const type = getColumnType(columnKey);
    return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
  };

  const getDropdownOptionsForColumn = (columnKey: string): string[] => {
    const column = columns.find(c => c.column_key === columnKey);
    if (column?.config?.dropdown_options && Array.isArray(column.config.dropdown_options)) {
      // Handle both string arrays and object arrays ({ id, value } format)
      return column.config.dropdown_options.map((opt: string | { id?: string; value: string }) => {
        if (typeof opt === 'string') return opt;
        if (typeof opt === 'object' && opt !== null && 'value' in opt) return opt.value;
        return String(opt);
      });
    }
    return [];
  };
  
  // Build column options combining standard fields and company columns
  const columnOptions = [
    ...standardFields,
    ...columns
      .filter(c => !standardFields.some(sf => sf.key === c.column_key)) // Avoid duplicates
      .map(c => ({ key: c.column_key, name: c.name, type: c.type })),
  ];

  if (configLoading || columnsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <h3 className="font-medium">Hot Leads Definition</h3>
            <p className="text-sm text-muted-foreground">
              Define conditions to identify high-priority leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="hot-leads-active" className="text-sm">
            {isActive ? "Active" : "Inactive"}
          </Label>
          <Switch
            id="hot-leads-active"
            checked={isActive}
            onCheckedChange={(checked) => {
              setIsActive(checked);
              setHasChanges(true);
            }}
            data-testid="switch-hot-leads-active"
          />
        </div>
      </div>

      {/* Info card */}
      <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="font-medium mb-1">How Hot Leads Work</p>
              <ul className="list-disc list-inside space-y-1 text-orange-700 dark:text-orange-300">
                <li>Leads matching these conditions appear in the Hot Leads section</li>
                <li>Users see a pulsing badge in the sidebar showing hot lead count</li>
                <li>Each user only sees hot leads from sheets they have access to</li>
                <li>Hot leads are shown with their source sheet for easy navigation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logical operator toggle */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm">Match:</Label>
          <ToggleGroup
            type="single"
            value={logicalOperator}
            onValueChange={(value) => {
              if (value) {
                setLogicalOperator(value as "and" | "or");
                setHasChanges(true);
              }
            }}
            className="bg-muted rounded-md"
          >
            <ToggleGroupItem
              value="or"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-4"
              data-testid="toggle-or"
            >
              Any condition (OR)
            </ToggleGroupItem>
            <ToggleGroupItem
              value="and"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-4"
              data-testid="toggle-and"
            >
              All conditions (AND)
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Conditions list */}
      <div className="space-y-3">
        {conditions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Flame className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No conditions defined yet.</p>
                <p className="text-sm">Add conditions to identify hot leads.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          conditions.map((condition, index) => {
            const operators = getOperatorsForColumn(condition.column_key);
            const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator);
            const columnType = getColumnType(condition.column_key);
            const dropdownOpts = columnType === "dropdown" ? getDropdownOptionsForColumn(condition.column_key) : [];
            
            return (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-3 items-start">
                    {/* Column select */}
                    <div className="flex-1 min-w-[180px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Column</Label>
                      <Select
                        value={condition.column_key}
                        onValueChange={(value) => handleUpdateCondition(index, { column_key: value })}
                      >
                        <SelectTrigger data-testid={`select-column-${index}`}>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {columnOptions.map((col) => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator select */}
                    <div className="flex-1 min-w-[160px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => handleUpdateCondition(index, { operator: value as HotLeadCondition["operator"] })}
                        disabled={!condition.column_key}
                      >
                        <SelectTrigger data-testid={`select-operator-${index}`}>
                          <SelectValue placeholder="Select operator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value input */}
                    {needsValue && (
                      <div className="flex-1 min-w-[160px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">Value</Label>
                        {condition.column_key === "thought" || condition.column_key === "lead_thought" ? (
                          <Select
                            value={condition.value as string}
                            onValueChange={(value) => handleUpdateCondition(index, { value })}
                          >
                            <SelectTrigger data-testid={`select-value-${index}`}>
                              <SelectValue placeholder="Select value..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sure">Sure</SelectItem>
                              <SelectItem value="maybe">May Be</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : columnType === "dropdown" && dropdownOpts.length > 0 ? (
                          <Select
                            value={condition.value as string}
                            onValueChange={(value) => handleUpdateCondition(index, { value })}
                          >
                            <SelectTrigger data-testid={`select-value-${index}`}>
                              <SelectValue placeholder="Select value..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownOpts.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={(condition.value as string) || ""}
                            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                            placeholder="Enter value..."
                            data-testid={`input-value-${index}`}
                          />
                        )}
                      </div>
                    )}

                    {/* Delete button */}
                    <div className="pt-5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCondition(index)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-condition-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add condition button */}
      <Button
        variant="outline"
        onClick={handleAddCondition}
        className="w-full"
        data-testid="button-add-condition"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-hot-leads-config"
          >
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      )}
    </div>
  );
}
