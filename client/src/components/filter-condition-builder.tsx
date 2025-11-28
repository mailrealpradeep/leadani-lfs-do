import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CustomColumn } from "@shared/schema";

const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "in", label: "Is one of" },
    { value: "not_in", label: "Is not one of" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  mobile: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "in", label: "Is one of" },
    { value: "not_in", label: "Is not one of" },
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
    { value: "between", label: "Between" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  date: [
    { value: "date_equals", label: "Equals" },
    { value: "date_not_equals", label: "Does not equal" },
    { value: "date_before", label: "Before" },
    { value: "date_after", label: "After" },
    { value: "date_between", label: "Between" },
    { value: "date_within", label: "Within" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "in", label: "Is one of" },
    { value: "not_in", label: "Is not one of" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  boolean: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
  ],
};

const RELATIVE_DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "next_month", label: "Next Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
];

export interface FilterCondition {
  id?: string;
  column_key: string;
  operator: string;
  value?: any;
  value2?: any;
  relative_date?: string;
}

interface FilterConditionBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  logicalOperator?: "and" | "or";
  onLogicalOperatorChange?: (operator: "and" | "or") => void;
  showLogicalOperator?: boolean;
}

export function FilterConditionBuilder({ 
  conditions, 
  onChange, 
  logicalOperator = "and",
  onLogicalOperatorChange,
  showLogicalOperator = true
}: FilterConditionBuilderProps) {
  const { data: companyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const allColumns = companyColumns.map((col) => ({
    column_key: col.column_key,
    name: col.name,
    type: col.type,
    config: col.config,
  }));

  const addCondition = () => {
    onChange([
      ...conditions,
      {
        id: crypto.randomUUID(),
        column_key: "",
        operator: "",
        value: undefined,
        value2: undefined,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    
    if (updates.column_key !== undefined) {
      newConditions[index].operator = "";
      newConditions[index].value = undefined;
      newConditions[index].value2 = undefined;
      newConditions[index].relative_date = undefined;
    }
    
    if (updates.operator !== undefined) {
      newConditions[index].value = undefined;
      newConditions[index].value2 = undefined;
      newConditions[index].relative_date = undefined;
    }
    
    onChange(newConditions);
  };

  const getColumnType = (columnKey: string) => {
    const column = allColumns.find((col) => col.column_key === columnKey);
    return column?.type || "text";
  };

  const getOperators = (columnKey: string) => {
    const type = getColumnType(columnKey);
    return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
  };

  const requiresValue = (operator: string) => {
    return !["is_empty", "is_not_empty"].includes(operator);
  };

  const requiresSecondValue = (operator: string) => {
    return ["between", "date_between"].includes(operator);
  };

  const getDropdownOptions = (columnKey: string) => {
    const column = companyColumns.find((col) => col.column_key === columnKey);
    return column?.config?.dropdown_options || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium">Filter Conditions</Label>
        <div className="flex items-center gap-2">
          {showLogicalOperator && conditions.length > 1 && onLogicalOperatorChange && (
            <ToggleGroup
              type="single"
              value={logicalOperator}
              onValueChange={(value) => value && onLogicalOperatorChange(value as "and" | "or")}
              className="border rounded-md"
              data-testid="toggle-logical-operator"
            >
              <ToggleGroupItem 
                value="and" 
                size="sm" 
                className="px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                data-testid="button-logical-and"
              >
                AND
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="or" 
                size="sm" 
                className="px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                data-testid="button-logical-or"
              >
                OR
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCondition}
            data-testid="button-add-condition"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Condition
          </Button>
        </div>
      </div>

      {conditions.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          No conditions added. Click "Add Condition" to start building your filter.
        </div>
      )}

      {conditions.map((condition, index) => {
        const columnType = getColumnType(condition.column_key);
        const operators = getOperators(condition.column_key);
        const needsValue = requiresValue(condition.operator);
        const needsSecondValue = requiresSecondValue(condition.operator);
        const dropdownOptions = getDropdownOptions(condition.column_key);
        const isDateWithRelative = ["date_equals", "date_within"].includes(condition.operator);

        return (
          <div key={condition.id || index}>
            {index > 0 && showLogicalOperator && (
              <div className="flex justify-center py-1">
                <Badge variant="secondary" className="text-xs">
                  {logicalOperator.toUpperCase()}
                </Badge>
              </div>
            )}
            <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Label className="text-xs mb-1">Column</Label>
                  <Select
                    value={condition.column_key}
                    onValueChange={(value) => updateCondition(index, { column_key: value })}
                  >
                    <SelectTrigger data-testid={`select-condition-column-${index}`}>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyColumns.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                          No columns available
                        </div>
                      ) : (
                        companyColumns.map((col) => (
                          <SelectItem key={col.column_key} value={col.column_key}>
                            {col.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {condition.column_key && (
                  <div className="flex-1">
                    <Label className="text-xs mb-1">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value })}
                    >
                      <SelectTrigger data-testid={`select-condition-operator-${index}`}>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem 
                            key={op.value} 
                            value={op.value}
                            data-testid={`option-operator-${op.value}`}
                          >
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCondition(index)}
                  className="mt-5"
                  data-testid={`button-remove-condition-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {condition.operator && needsValue && (
                <div className="space-y-2">
                  {columnType === "date" && isDateWithRelative && (
                    <div>
                      <Label className="text-xs mb-1">Value</Label>
                      <Select
                        value={condition.relative_date || ""}
                        onValueChange={(value) => updateCondition(index, { relative_date: value, value: undefined })}
                      >
                        <SelectTrigger data-testid={`select-condition-relative-date-${index}`}>
                          <SelectValue placeholder="Select date" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIVE_DATE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {columnType === "date" && !isDateWithRelative && (
                    <div className={needsSecondValue ? "flex gap-2 items-end" : ""}>
                      <div className="flex-1">
                        <Label className="text-xs mb-1">{needsSecondValue ? "From" : "Value"}</Label>
                        <Input
                          type="date"
                          value={condition.value || ""}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          data-testid={`input-condition-value-${index}`}
                        />
                      </div>
                      {needsSecondValue && (
                        <div className="flex-1">
                          <Label className="text-xs mb-1">To</Label>
                          <Input
                            type="date"
                            value={condition.value2 || ""}
                            onChange={(e) => updateCondition(index, { value2: e.target.value })}
                            data-testid={`input-condition-value2-${index}`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {columnType === "dropdown" && dropdownOptions.length > 0 && (
                    <div>
                      <Label className="text-xs mb-1">Value</Label>
                      {["in", "not_in"].includes(condition.operator) ? (
                        <div className="space-y-1">
                          <Input
                            type="text"
                            value={Array.isArray(condition.value) ? condition.value.join(", ") : condition.value || ""}
                            onChange={(e) => {
                              const values = e.target.value.split(",").map(v => v.trim()).filter(v => v);
                              updateCondition(index, { value: values });
                            }}
                            placeholder="Enter values separated by commas"
                            data-testid={`input-condition-dropdown-multi-value-${index}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Available: {dropdownOptions.join(", ")}
                          </p>
                        </div>
                      ) : (
                        <Select
                          value={condition.value || ""}
                          onValueChange={(value) => updateCondition(index, { value })}
                        >
                          <SelectTrigger data-testid={`select-condition-dropdown-value-${index}`}>
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {dropdownOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {columnType === "boolean" && (
                    <div>
                      <Label className="text-xs mb-1">Value</Label>
                      <Select
                        value={condition.value?.toString() || ""}
                        onValueChange={(value) => updateCondition(index, { value: value === "true" })}
                      >
                        <SelectTrigger data-testid={`select-condition-boolean-value-${index}`}>
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {columnType === "number" && (
                    <div className={needsSecondValue ? "flex gap-2 items-end" : ""}>
                      <div className="flex-1">
                        <Label className="text-xs mb-1">{needsSecondValue ? "From" : "Value"}</Label>
                        <Input
                          type="number"
                          value={condition.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            updateCondition(index, { value });
                          }}
                          placeholder="Enter value"
                          data-testid={`input-condition-value-${index}`}
                        />
                      </div>
                      {needsSecondValue && (
                        <div className="flex-1">
                          <Label className="text-xs mb-1">To</Label>
                          <Input
                            type="number"
                            value={condition.value2 ?? ""}
                            onChange={(e) => {
                              const value2 = e.target.value ? parseFloat(e.target.value) : undefined;
                              updateCondition(index, { value2 });
                            }}
                            placeholder="Enter value"
                            data-testid={`input-condition-value2-${index}`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!["date", "dropdown", "boolean", "number"].includes(columnType) && (
                    <div>
                      <Label className="text-xs mb-1">Value</Label>
                      {["in", "not_in"].includes(condition.operator) ? (
                        <div className="space-y-1">
                          <Input
                            type="text"
                            value={Array.isArray(condition.value) ? condition.value.join(", ") : condition.value || ""}
                            onChange={(e) => {
                              const values = e.target.value.split(",").map(v => v.trim()).filter(v => v);
                              updateCondition(index, { value: values });
                            }}
                            placeholder="Enter values separated by commas"
                            data-testid={`input-condition-multi-value-${index}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Separate multiple values with commas
                          </p>
                        </div>
                      ) : (
                        <Input
                          type="text"
                          value={condition.value || ""}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="Enter value"
                          data-testid={`input-condition-value-${index}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {conditions.length > 1 && showLogicalOperator && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <span className="font-medium">Logic:</span> Conditions are combined with <Badge variant="outline" className="mx-1 text-xs">{logicalOperator.toUpperCase()}</Badge> - 
          {logicalOperator === "and" 
            ? " all conditions must match" 
            : " any condition can match"}
        </div>
      )}
    </div>
  );
}
