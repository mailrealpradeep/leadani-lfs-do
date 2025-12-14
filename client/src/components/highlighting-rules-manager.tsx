import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Palette, 
  Edit2, 
  Power, 
  PowerOff,
  ChevronDown,
  ChevronUp,
  X
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HighlightingRule, HighlightingCondition, CustomColumn, highlightColors } from "@shared/schema";

const HIGHLIGHT_COLORS: typeof highlightColors = [
  // Red variants
  { id: "red_light", label: "Light Red", light: "hsl(0, 86%, 97%)", dark: "hsl(0, 50%, 15%)" },
  { id: "red", label: "Red", light: "hsl(0, 84%, 95%)", dark: "hsl(0, 70%, 20%)" },
  { id: "red_dark", label: "Dark Red", light: "hsl(0, 72%, 91%)", dark: "hsl(0, 80%, 25%)" },
  // Green variants
  { id: "green_light", label: "Light Green", light: "hsl(142, 76%, 95%)", dark: "hsl(142, 40%, 12%)" },
  { id: "green", label: "Green", light: "hsl(142, 69%, 90%)", dark: "hsl(142, 50%, 18%)" },
  { id: "green_dark", label: "Dark Green", light: "hsl(142, 60%, 85%)", dark: "hsl(142, 60%, 22%)" },
  // Blue variants
  { id: "blue_light", label: "Light Blue", light: "hsl(210, 100%, 96%)", dark: "hsl(210, 50%, 15%)" },
  { id: "blue", label: "Blue", light: "hsl(210, 100%, 93%)", dark: "hsl(210, 70%, 20%)" },
  { id: "blue_dark", label: "Dark Blue", light: "hsl(210, 80%, 88%)", dark: "hsl(210, 80%, 28%)" },
  // Other colors
  { id: "yellow", label: "Yellow", light: "hsl(48, 96%, 89%)", dark: "hsl(48, 70%, 20%)" },
  { id: "orange", label: "Orange", light: "hsl(24, 100%, 92%)", dark: "hsl(24, 70%, 20%)" },
  { id: "purple", label: "Purple", light: "hsl(270, 80%, 93%)", dark: "hsl(270, 60%, 22%)" },
  { id: "pink", label: "Pink", light: "hsl(330, 80%, 95%)", dark: "hsl(330, 60%, 20%)" },
  { id: "teal", label: "Teal", light: "hsl(174, 72%, 90%)", dark: "hsl(174, 55%, 18%)" },
];

const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
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
    { value: "between", label: "Between" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  percentage: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  date: [
    { value: "date_equals", label: "Equals date" },
    { value: "date_before", label: "Before date" },
    { value: "date_after", label: "After date" },
    { value: "is_today", label: "Is today" },
    { value: "is_before_today", label: "Is before today" },
    { value: "is_after_today", label: "Is after today" },
    { value: "is_this_week", label: "Is this week" },
    { value: "is_next_week", label: "Is next week" },
    { value: "is_last_week", label: "Is last week" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  datetime: [
    { value: "date_equals", label: "Equals date" },
    { value: "date_before", label: "Before date" },
    { value: "date_after", label: "After date" },
    { value: "is_today", label: "Is today" },
    { value: "is_before_today", label: "Is before today" },
    { value: "is_after_today", label: "Is after today" },
    { value: "is_this_week", label: "Is this week" },
    { value: "is_next_week", label: "Is next week" },
    { value: "is_last_week", label: "Is last week" },
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
  boolean: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
  ],
};

const NO_VALUE_OPERATORS = [
  "is_empty", 
  "is_not_empty", 
  "is_today", 
  "is_before_today", 
  "is_after_today",
  "is_this_week",
  "is_next_week",
  "is_last_week"
];

interface SortableRuleItemProps {
  rule: HighlightingRule;
  columns: CustomColumn[];
  onEdit: (rule: HighlightingRule) => void;
  onDelete: (rule: HighlightingRule) => void;
  onToggle: (ruleId: string, isActive: boolean) => void;
}

function SortableRuleItem({ rule, columns, onEdit, onDelete, onToggle }: SortableRuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const color = HIGHLIGHT_COLORS.find(c => c.id === rule.row_color);
  
  const getConditionSummary = (condition: HighlightingCondition) => {
    const column = columns.find(c => c.column_key === condition.column_key);
    const columnName = column?.name || condition.column_key;
    const operatorLabel = OPERATORS_BY_TYPE[column?.type || "text"]?.find(o => o.value === condition.operator)?.label || condition.operator;
    
    if (NO_VALUE_OPERATORS.includes(condition.operator)) {
      return `${columnName} ${operatorLabel}`;
    }
    return `${columnName} ${operatorLabel} "${condition.value}"`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${!rule.is_active ? 'opacity-60' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab hover:bg-muted rounded p-1"
        data-testid={`drag-handle-rule-${rule.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div 
        className="w-6 h-6 rounded-md border flex-shrink-0" 
        style={{ backgroundColor: color?.light }}
        title={color?.label}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{rule.name}</span>
          <Badge variant="outline" className="text-xs">
            {rule.logical_operator.toUpperCase()}
          </Badge>
          {!rule.is_active && (
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {rule.conditions.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1">{rule.logical_operator}</span>}
              {getConditionSummary(c)}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(rule.id, !rule.is_active)}
          title={rule.is_active ? "Disable rule" : "Enable rule"}
          data-testid={`toggle-rule-${rule.id}`}
        >
          {rule.is_active ? (
            <Power className="h-4 w-4 text-green-600" />
          ) : (
            <PowerOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(rule)}
          data-testid={`edit-rule-${rule.id}`}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(rule)}
          className="text-destructive hover:text-destructive"
          data-testid={`delete-rule-${rule.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface HighlightingRulesManagerProps {
  sheetId: string | null; // null means "All Sheets"
  sheetName?: string;
}

export function HighlightingRulesManager({ sheetId, sheetName }: HighlightingRulesManagerProps) {
  const isGlobalMode = sheetId === null;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<HighlightingRule | null>(null);
  
  const [ruleName, setRuleName] = useState("");
  const [conditions, setConditions] = useState<HighlightingCondition[]>([
    { column_key: "", operator: "is_empty", value: null }
  ]);
  const [logicalOperator, setLogicalOperator] = useState<"and" | "or">("and");
  const [rowColor, setRowColor] = useState<string>("yellow");
  
  // Delete confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<HighlightingRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const rulesQueryKey = isGlobalMode 
    ? ["/api/company/global-highlighting-rules"]
    : ["/api/sheets", sheetId, "highlighting-rules"];
    
  const { data: rules = [], isLoading: rulesLoading } = useQuery<HighlightingRule[]>({
    queryKey: rulesQueryKey,
  });

  const { data: allCompanyColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: isGlobalMode,
  });

  const { data: sheetColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !isGlobalMode && !!sheetId,
  });

  const columns = isGlobalMode ? allCompanyColumns : sheetColumns;

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      conditions: HighlightingCondition[]; 
      logical_operator: "and" | "or";
      row_color: string;
    }) => {
      const endpoint = isGlobalMode 
        ? `/api/company/global-highlighting-rules`
        : `/api/company/sheets/${sheetId}/highlighting-rules`;
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      if (isGlobalMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      }
      resetForm();
      setDialogOpen(false);
      toast({ title: "Highlighting rule created" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create rule", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ ruleId, data }: { ruleId: string; data: Partial<HighlightingRule> }) => {
      return await apiRequest("PATCH", `/api/company/highlighting-rules/${ruleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      if (isGlobalMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      }
      resetForm();
      setDialogOpen(false);
      toast({ title: "Highlighting rule updated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update rule", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest("DELETE", `/api/company/highlighting-rules/${ruleId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      if (isGlobalMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      }
      toast({ title: "Highlighting rule deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete rule", description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ruleIds: string[]) => {
      const endpoint = isGlobalMode 
        ? `/api/company/global-highlighting-rules/reorder`
        : `/api/company/sheets/${sheetId}/highlighting-rules/reorder`;
      return await apiRequest("POST", endpoint, { ruleIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to reorder rules", description: error.message });
    },
  });

  const resetForm = () => {
    setRuleName("");
    setConditions([{ column_key: "", operator: "is_empty", value: null }]);
    setLogicalOperator("and");
    setRowColor("yellow");
    setEditingRule(null);
  };

  const handleEdit = (rule: HighlightingRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setConditions(rule.conditions.length > 0 ? rule.conditions : [{ column_key: "", operator: "is_empty", value: null }]);
    setLogicalOperator(rule.logical_operator);
    setRowColor(rule.row_color);
    setDialogOpen(true);
  };

  const handleToggle = (ruleId: string, isActive: boolean) => {
    updateMutation.mutate({ ruleId, data: { is_active: isActive } });
  };

  const handleDelete = (rule: HighlightingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id);
    }
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex(r => r.id === active.id);
      const newIndex = rules.findIndex(r => r.id === over.id);
      const newOrder = arrayMove(rules, oldIndex, newIndex);
      queryClient.setQueryData(rulesQueryKey, newOrder);
      reorderMutation.mutate(newOrder.map(r => r.id));
    }
  };

  const handleSubmit = () => {
    if (!ruleName.trim()) {
      toast({ variant: "destructive", title: "Rule name is required" });
      return;
    }
    
    const validConditions = conditions.filter(c => c.column_key);
    if (validConditions.length === 0) {
      toast({ variant: "destructive", title: "At least one condition is required" });
      return;
    }

    const data = {
      name: ruleName.trim(),
      conditions: validConditions,
      logical_operator: logicalOperator,
      row_color: rowColor,
    };

    if (editingRule) {
      updateMutation.mutate({ ruleId: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { column_key: "", operator: "is_empty", value: null }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, updates: Partial<HighlightingCondition>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const getColumnType = (columnKey: string): string => {
    const column = columns.find(c => c.column_key === columnKey);
    return column?.type || "text";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Highlighting Rules
          </CardTitle>
          <CardDescription>
            {isGlobalMode 
              ? "These rules will apply to all sheets in your company"
              : sheetName 
                ? `Configure row highlighting for "${sheetName}"` 
                : "Configure row highlighting based on conditions"}
          </CardDescription>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-highlighting-rule">
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </CardHeader>
      <CardContent>
        {rulesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Palette className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No highlighting rules yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isGlobalMode 
                ? "Add rules that will highlight rows across all sheets"
                : "Add rules to highlight rows based on column conditions"}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <SortableRuleItem
                    key={rule.id}
                    rule={rule}
                    columns={columns}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {isGlobalMode 
              ? "Global rules apply to all sheets. Sheet-specific rules take priority over global rules. Rules are evaluated in order (top to bottom) - the first matching rule wins."
              : "Rules are evaluated in order (top to bottom). The first matching rule wins and its color is applied to the row. Drag rules to reorder priority."}
          </p>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Highlighting Rule" : "Create Highlighting Rule"}</DialogTitle>
            <DialogDescription>
              Define conditions to highlight rows. Multiple conditions can be combined with AND/OR logic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Urgent Follow-ups"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                data-testid="input-rule-name"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                {conditions.length > 1 && (
                  <ToggleGroup
                    type="single"
                    value={logicalOperator}
                    onValueChange={(v) => v && setLogicalOperator(v as "and" | "or")}
                    className="border rounded-lg"
                  >
                    <ToggleGroupItem value="and" className="text-xs px-3" data-testid="toggle-and">
                      AND
                    </ToggleGroupItem>
                    <ToggleGroupItem value="or" className="text-xs px-3" data-testid="toggle-or">
                      OR
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </div>

              {conditions.map((condition, index) => {
                const columnType = getColumnType(condition.column_key);
                const operators = OPERATORS_BY_TYPE[columnType] || OPERATORS_BY_TYPE.text;
                const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator);
                const column = columns.find(c => c.column_key === condition.column_key);

                return (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                    {index > 0 && (
                      <Badge variant="outline" className="mt-2 flex-shrink-0">
                        {logicalOperator.toUpperCase()}
                      </Badge>
                    )}
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select
                        value={condition.column_key}
                        onValueChange={(v) => updateCondition(index, { 
                          column_key: v, 
                          operator: "is_empty",
                          value: null 
                        })}
                      >
                        <SelectTrigger data-testid={`select-column-${index}`}>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(v) => updateCondition(index, { operator: v as any })}
                        disabled={!condition.column_key}
                      >
                        <SelectTrigger data-testid={`select-operator-${index}`}>
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

                      {needsValue && (
                        columnType === "dropdown" && column?.config?.dropdown_options ? (
                          <Select
                            value={condition.value as string || ""}
                            onValueChange={(v) => updateCondition(index, { value: v })}
                          >
                            <SelectTrigger data-testid={`select-value-${index}`}>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {column.config.dropdown_options.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : columnType === "boolean" ? (
                          <Select
                            value={condition.value as string || ""}
                            onValueChange={(v) => updateCondition(index, { value: v })}
                          >
                            <SelectTrigger data-testid={`select-value-${index}`}>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : columnType === "date" || columnType === "datetime" ? (
                          <Input
                            type="date"
                            value={condition.value as string || ""}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            data-testid={`input-value-${index}`}
                          />
                        ) : (
                          <Input
                            type={columnType === "number" || columnType === "percentage" ? "number" : "text"}
                            placeholder="Enter value"
                            value={condition.value as string || ""}
                            onChange={(e) => updateCondition(index, { 
                              value: columnType === "number" || columnType === "percentage" 
                                ? parseFloat(e.target.value) || null 
                                : e.target.value 
                            })}
                            data-testid={`input-value-${index}`}
                          />
                        )
                      )}
                    </div>

                    {conditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="flex-shrink-0 mt-0.5"
                        data-testid={`button-remove-condition-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="w-full"
                data-testid="button-add-condition"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Row Highlight Color</Label>
              <div className="flex flex-wrap gap-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setRowColor(color.id)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      rowColor === color.id 
                        ? "border-primary ring-2 ring-primary/30 scale-110" 
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.light }}
                    title={color.label}
                    data-testid={`color-${color.id}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {HIGHLIGHT_COLORS.find(c => c.id === rowColor)?.label}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-rule"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Highlighting Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the highlighting rule "{ruleToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-highlighting-rule">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-highlighting-rule"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
