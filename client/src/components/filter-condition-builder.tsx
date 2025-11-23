import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomColumn } from "@shared/schema";

// Fixed columns available in the CRM
const FIXED_COLUMNS = [
  { column_key: "name", name: "Name", type: "text" },
  { column_key: "email", name: "Email", type: "text" },
  { column_key: "phone", name: "Phone", type: "mobile" },
  { column_key: "source", name: "Source", type: "text" },
  { column_key: "status", name: "Status", type: "text" },
] as const;

// Operators available for each field type
const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "in", label: "Is one of" },
    { value: "is_empty", label: "Is empty" },
  ],
  mobile: [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "in", label: "Is one of" },
    { value: "is_empty", label: "Is empty" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "greater_equal", label: "Greater or equal" },
    { value: "less_equal", label: "Less or equal" },
    { value: "is_empty", label: "Is empty" },
  ],
  date: [
    { value: "date_equals", label: "Equals" },
    { value: "date_before", label: "Before" },
    { value: "date_after", label: "After" },
    { value: "is_empty", label: "Is empty" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "in", label: "Is one of" },
    { value: "is_empty", label: "Is empty" },
  ],
  boolean: [
    { value: "equals", label: "Equals" },
  ],
};

// Relative date options
const RELATIVE_DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
  { value: "this_month", label: "This Month" },
  { value: "next_month", label: "Next Month" },
];

export interface FilterCondition {
  column_key: string;
  operator: string;
  value?: any;
  relative_date?: string;
}

interface FilterConditionBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

export function FilterConditionBuilder({ conditions, onChange }: FilterConditionBuilderProps) {
  const { data: customColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  // Combine fixed and custom columns
  const allColumns = [
    ...FIXED_COLUMNS,
    ...customColumns.map((col) => ({
      column_key: col.column_key,
      name: col.name,
      type: col.type,
      config: col.config,
    })),
  ];

  const addCondition = () => {
    onChange([
      ...conditions,
      {
        column_key: "",
        operator: "",
        value: undefined,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    
    // If column changed, reset operator and value
    if (updates.column_key !== undefined) {
      newConditions[index].operator = "";
      newConditions[index].value = undefined;
      newConditions[index].relative_date = undefined;
    }
    
    // If operator changed, reset value
    if (updates.operator !== undefined) {
      newConditions[index].value = undefined;
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

  const getDropdownOptions = (columnKey: string) => {
    const column = customColumns.find((col) => col.column_key === columnKey);
    return column?.config?.dropdown_options || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Filter Conditions</Label>
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

      {conditions.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          No conditions added. Click "Add Condition" to start building your filter.
        </div>
      )}

      {conditions.map((condition, index) => {
        const columnType = getColumnType(condition.column_key);
        const operators = getOperators(condition.column_key);
        const needsValue = requiresValue(condition.operator);
        const dropdownOptions = getDropdownOptions(condition.column_key);
        const isDateEquals = condition.operator === "date_equals";

        return (
          <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
            <div className="flex items-start gap-2">
              {/* Column Selector */}
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
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Fixed Columns
                    </div>
                    {FIXED_COLUMNS.map((col) => (
                      <SelectItem key={col.column_key} value={col.column_key}>
                        {col.name}
                      </SelectItem>
                    ))}
                    {customColumns.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                          Custom Columns
                        </div>
                        {customColumns.map((col) => (
                          <SelectItem key={col.column_key} value={col.column_key}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator Selector */}
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
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Remove Button */}
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

            {/* Value Input */}
            {condition.operator && needsValue && (
              <div>
                {/* Date field with relative date option */}
                {columnType === "date" && isDateEquals && (
                  <div className="space-y-2">
                    <Label className="text-xs">Value</Label>
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

                {/* Date field with specific date input */}
                {columnType === "date" && !isDateEquals && (
                  <div>
                    <Label className="text-xs mb-1">Value</Label>
                    <Input
                      type="date"
                      value={condition.value || ""}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      data-testid={`input-condition-value-${index}`}
                    />
                  </div>
                )}

                {/* Dropdown field */}
                {columnType === "dropdown" && dropdownOptions.length > 0 && (
                  <div>
                    <Label className="text-xs mb-1">Value</Label>
                    {condition.operator === "in" ? (
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

                {/* Boolean field */}
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

                {/* Text/Mobile/Number fields */}
                {!["date", "dropdown", "boolean"].includes(columnType) && (
                  <div>
                    <Label className="text-xs mb-1">Value</Label>
                    {condition.operator === "in" ? (
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
                        type={columnType === "number" ? "number" : "text"}
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
        );
      })}

      {conditions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Note:</span> All conditions will be combined with AND logic.
        </div>
      )}
    </div>
  );
}
