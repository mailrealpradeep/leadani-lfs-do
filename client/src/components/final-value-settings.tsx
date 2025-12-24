import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2, Lock, GripVertical, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

interface FinalValueRule {
  id: string;
  column_key: string;
  final_values: string[];
  enabled: boolean;
}

interface CompanySettings {
  final_value_settings?: FinalValueRule[];
  [key: string]: any;
}

function generateId(): string {
  return `fvr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function SortableRuleItem({
  rule,
  columns,
  dropdownOptions,
  onUpdate,
  onRemove,
  onToggleEnabled,
}: {
  rule: FinalValueRule;
  columns: CustomColumn[];
  dropdownOptions: Map<string, string[]>;
  onUpdate: (updates: Partial<FinalValueRule>) => void;
  onRemove: () => void;
  onToggleEnabled: () => void;
}) {
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

  const dropdownColumns = columns.filter(c => c.type === "dropdown");
  const selectedColumn = columns.find(c => c.column_key === rule.column_key);
  const availableValues = rule.column_key ? (dropdownOptions.get(rule.column_key) || []) : [];

  const handleValueToggle = (value: string, checked: boolean) => {
    const newValues = checked
      ? [...rule.final_values, value]
      : rule.final_values.filter(v => v !== value);
    onUpdate({ final_values: newValues });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg ${rule.enabled ? 'bg-card' : 'bg-muted/50 opacity-70'}`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Column</span>
            <Select
              value={rule.column_key}
              onValueChange={(value) => onUpdate({ column_key: value, final_values: [] })}
            >
              <SelectTrigger className="w-48" data-testid={`select-column-${rule.id}`}>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {dropdownColumns.map(col => (
                  <SelectItem key={col.column_key} value={col.column_key}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {rule.column_key && availableValues.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Final Values (once set, only Admins can change)
              </Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                {availableValues.map(value => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                      rule.final_values.includes(value)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-background border hover-elevate'
                    }`}
                  >
                    <Checkbox
                      checked={rule.final_values.includes(value)}
                      onCheckedChange={(checked) => handleValueToggle(value, checked === true)}
                      data-testid={`checkbox-value-${rule.id}-${value}`}
                    />
                    <span className="text-sm">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {rule.column_key && rule.final_values.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Shield className="h-4 w-4" />
              <span>
                Users cannot change leads away from: {rule.final_values.join(", ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={rule.enabled}
            onCheckedChange={onToggleEnabled}
            data-testid={`switch-rule-enabled-${rule.id}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
            data-testid={`button-remove-rule-${rule.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FinalValueSettings({ headless = false }: { headless?: boolean }) {
  const { toast } = useToast();
  const [rules, setRules] = useState<FinalValueRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  const { data: columnsData, isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/admin/columns"],
  });

  const { data: dropdownData } = useQuery<{ column_key: string; values: string[] }[]>({
    queryKey: ["/api/admin/dropdown-options"],
  });

  const dropdownOptions = useMemo(() => {
    const map = new Map<string, string[]>();
    dropdownData?.forEach(item => {
      map.set(item.column_key, item.values);
    });
    return map;
  }, [dropdownData]);

  useEffect(() => {
    if (settingsData?.settings?.final_value_settings) {
      setRules(settingsData.settings.final_value_settings);
      setHasChanges(false);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (newRules: FinalValueRule[]) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { final_value_settings: newRules }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Final value settings have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleAddRule = () => {
    const newRule: FinalValueRule = {
      id: generateId(),
      column_key: "",
      final_values: [],
      enabled: true,
    };
    setRules([...rules, newRule]);
    setHasChanges(true);
  };

  const handleUpdateRule = (id: string, updates: Partial<FinalValueRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    setHasChanges(true);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const handleToggleEnabled = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    setHasChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex(r => r.id === active.id);
      const newIndex = rules.findIndex(r => r.id === over.id);
      setRules(arrayMove(rules, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    const validRules = rules.filter(r => r.column_key && r.final_values.length > 0);
    saveMutation.mutate(validRules);
  };

  const isLoading = settingsLoading || columnsLoading;
  const columns = columnsData || [];
  const dropdownColumns = columns.filter(c => c.type === "dropdown");

  const content = (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Final values are "locked" statuses. Once a lead reaches a final value (e.g., "Visited", "Converted"), 
          regular users cannot change it. Only Company Admins can override final values, which will 
          automatically reverse any related PowerScore points and target achievements.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : dropdownColumns.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No dropdown columns available.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add dropdown columns in Company Column Schema first.
          </p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rules.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rules.map(rule => (
                  <SortableRuleItem
                    key={rule.id}
                    rule={rule}
                    columns={columns}
                    dropdownOptions={dropdownOptions}
                    onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                    onRemove={() => handleRemoveRule(rule.id)}
                    onToggleEnabled={() => handleToggleEnabled(rule.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {rules.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No final value rules configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add rules to lock specific status values
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleAddRule}
              data-testid="button-add-final-value-rule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-final-value-settings"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (headless) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Final Value Settings
        </CardTitle>
        <CardDescription>
          Configure which values are considered "final" and cannot be changed by regular users
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
