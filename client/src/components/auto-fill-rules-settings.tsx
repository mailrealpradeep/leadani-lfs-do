import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2, ArrowRight, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
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

interface AutoFillRule {
  id: string;
  trigger_column_key: string;
  trigger_value: string;
  target_column_key: string;
  target_value: string;
  priority: number;
  enabled: boolean;
}

interface CompanySettings {
  auto_fill_rules?: AutoFillRule[];
  [key: string]: any;
}

function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function SortableRuleItem({
  rule,
  columns,
  dropdownOptions,
  onUpdate,
  onRemove,
  onToggleEnabled,
}: {
  rule: AutoFillRule;
  columns: CustomColumn[];
  dropdownOptions: Map<string, string[]>;
  onUpdate: (updates: Partial<AutoFillRule>) => void;
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
  
  const triggerColumn = columns.find(c => c.column_key === rule.trigger_column_key);
  const targetColumn = columns.find(c => c.column_key === rule.target_column_key);
  
  const triggerOptions = rule.trigger_column_key ? (dropdownOptions.get(rule.trigger_column_key) || []) : [];
  const targetOptions = rule.target_column_key ? (dropdownOptions.get(rule.target_column_key) || []) : [];

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
          {/* Trigger Section */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">When</span>
            <Select
              value={rule.trigger_column_key}
              onValueChange={(value) => onUpdate({ trigger_column_key: value, trigger_value: "" })}
            >
              <SelectTrigger className="w-40" data-testid={`select-trigger-column-${rule.id}`}>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {dropdownColumns.map(col => (
                  <SelectItem key={col.column_key} value={col.column_key}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-sm text-muted-foreground">=</span>
            
            <Select
              value={rule.trigger_value}
              onValueChange={(value) => onUpdate({ trigger_value: value })}
              disabled={!rule.trigger_column_key}
            >
              <SelectTrigger className="w-40" data-testid={`select-trigger-value-${rule.id}`}>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Target Section */}
          <div className="flex flex-wrap items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Set</span>
            <Select
              value={rule.target_column_key}
              onValueChange={(value) => onUpdate({ target_column_key: value, target_value: "" })}
            >
              <SelectTrigger className="w-40" data-testid={`select-target-column-${rule.id}`}>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {dropdownColumns
                  .filter(col => col.column_key !== rule.trigger_column_key)
                  .map(col => (
                    <SelectItem key={col.column_key} value={col.column_key}>
                      {col.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            <span className="text-sm text-muted-foreground">to</span>
            
            <Select
              value={rule.target_value}
              onValueChange={(value) => onUpdate({ target_value: value })}
              disabled={!rule.target_column_key}
            >
              <SelectTrigger className="w-40" data-testid={`select-target-value-${rule.id}`}>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

interface AutoFillRulesSettingsProps {
  headless?: boolean;
}

export function AutoFillRulesSettings({ headless = false }: AutoFillRulesSettingsProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutoFillRule[]>([]);
  const lastServerStateRef = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: companyColumns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  // Build dropdown options map from columns
  const dropdownOptions = useMemo(() => {
    const optionsMap = new Map<string, string[]>();
    companyColumns.forEach(col => {
      if (col.type === "dropdown" && col.config?.dropdown_options) {
        optionsMap.set(col.column_key, col.config.dropdown_options);
      }
    });
    return optionsMap;
  }, [companyColumns]);

  const serverConfig = settingsData?.settings?.auto_fill_rules;
  const serverStateKey = JSON.stringify(serverConfig || []);

  useEffect(() => {
    if (serverStateKey !== lastServerStateRef.current && companyColumns.length > 0) {
      lastServerStateRef.current = serverStateKey;
      
      if (serverConfig && Array.isArray(serverConfig) && serverConfig.length > 0) {
        setRules(serverConfig.map((r, idx) => ({ ...r, priority: idx })));
      } else {
        setRules([]);
      }
    }
  }, [serverStateKey, serverConfig, companyColumns]);

  const saveMutation = useMutation({
    mutationFn: async (newRules: AutoFillRule[]) => {
      const rulesWithPriority = newRules.map((r, idx) => ({ ...r, priority: idx }));
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        auto_fill_rules: rulesWithPriority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Auto-fill rules have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save auto-fill rules.",
        variant: "destructive",
      });
    },
  });

  const handleAddRule = () => {
    const newRule: AutoFillRule = {
      id: generateId(),
      trigger_column_key: "",
      trigger_value: "",
      target_column_key: "",
      target_value: "",
      priority: rules.length,
      enabled: true,
    };
    setRules(prev => [...prev, newRule]);
  };

  const handleUpdateRule = (id: string, updates: Partial<AutoFillRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleEnabled = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRules(prev => {
        const oldIndex = prev.findIndex(r => r.id === active.id);
        const newIndex = prev.findIndex(r => r.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    // Validate that all rules are complete
    const incompleteRules = rules.filter(
      r => !r.trigger_column_key || !r.trigger_value || !r.target_column_key || !r.target_value
    );
    
    if (incompleteRules.length > 0) {
      toast({
        title: "Incomplete rules",
        description: "Please fill in all fields for each rule before saving.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(rules);
  };

  const isLoading = columnsLoading || settingsLoading;

  const content = (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Auto-fill rules automatically set field values when a trigger condition is met. 
          For example, when Lead Status is set to "Visit Scheduled", Visit Status can be automatically set to "Scheduled".
          Rules are processed in order from top to bottom.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
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
                    columns={companyColumns}
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
            <div className="text-center py-8 text-muted-foreground">
              No auto-fill rules configured. Click "Add Rule" to create one.
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleAddRule}
              data-testid="button-add-auto-fill-rule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-auto-fill-rules"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Rules"}
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
        <CardTitle>Auto-Fill Rules</CardTitle>
        <CardDescription>
          Configure automatic field updates based on trigger conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
