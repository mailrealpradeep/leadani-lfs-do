import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  Pencil,
  GripVertical,
  Eye,
  EyeOff,
  Star,
  Zap,
  Target,
  Flag,
  Award,
  Heart,
  Bell,
  Bookmark,
  Check,
  Clock,
  Flame,
  Users,
  TrendingUp,
  AlertTriangle,
  X,
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { CustomColumn } from "@shared/schema";

interface CustomViewCondition {
  column_key: string;
  operator: string;
  value?: any;
}

interface CustomViewConditionGroup {
  id: string;
  conditions: CustomViewCondition[];
}

interface CustomView {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  icon_color: string;
  show_badge: boolean;
  condition_groups: CustomViewConditionGroup[];
  is_enabled: boolean;
  order_index: number;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: "star", label: "Star", icon: Star },
  { value: "zap", label: "Lightning", icon: Zap },
  { value: "target", label: "Target", icon: Target },
  { value: "flag", label: "Flag", icon: Flag },
  { value: "award", label: "Award", icon: Award },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "bell", label: "Bell", icon: Bell },
  { value: "bookmark", label: "Bookmark", icon: Bookmark },
  { value: "check", label: "Check", icon: Check },
  { value: "clock", label: "Clock", icon: Clock },
  { value: "flame", label: "Flame", icon: Flame },
  { value: "users", label: "Users", icon: Users },
  { value: "trending-up", label: "Trending", icon: TrendingUp },
  { value: "alert-triangle", label: "Alert", icon: AlertTriangle },
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", class: "text-blue-500" },
  { value: "green", label: "Green", class: "text-green-500" },
  { value: "orange", label: "Orange", class: "text-orange-500" },
  { value: "red", label: "Red", class: "text-red-500" },
  { value: "purple", label: "Purple", class: "text-purple-500" },
  { value: "pink", label: "Pink", class: "text-pink-500" },
  { value: "yellow", label: "Yellow", class: "text-yellow-500" },
  { value: "teal", label: "Teal", class: "text-teal-500" },
  { value: "indigo", label: "Indigo", class: "text-indigo-500" },
  { value: "gray", label: "Gray", class: "text-gray-500" },
];

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
    { value: "is_before_today", label: "Is before today" },
    { value: "is_after_today", label: "Is after today" },
    { value: "is_this_week", label: "Is this week" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
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
  "is_before_today", 
  "is_after_today",
  "is_this_week",
];

function getIconComponent(iconName: string) {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption?.icon || Star;
}

function getColorClass(colorName: string) {
  const colorOption = COLOR_OPTIONS.find(opt => opt.value === colorName);
  return colorOption?.class || "text-blue-500";
}

function SortableViewItem({ 
  view, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  view: CustomView; 
  onEdit: () => void; 
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(view.icon);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
      data-testid={`custom-view-item-${view.id}`}
    >
      <button
        className="cursor-grab hover:bg-muted rounded p-1"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${view.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className={`${getColorClass(view.icon_color)}`}>
        <IconComponent className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{view.name}</span>
          {view.show_badge && (
            <Badge variant="secondary" className="text-xs">Badge</Badge>
          )}
          {!view.is_enabled && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Disabled
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {view.condition_groups.length} group{view.condition_groups.length !== 1 ? "s" : ""} • 
          {view.condition_groups.reduce((sum, g) => sum + g.conditions.length, 0)} condition{view.condition_groups.reduce((sum, g) => sum + g.conditions.length, 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Switch
          checked={view.is_enabled}
          onCheckedChange={onToggle}
          data-testid={`toggle-view-${view.id}`}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          data-testid={`edit-view-${view.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          data-testid={`delete-view-${view.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function CustomViewsManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<CustomView | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<CustomView | null>(null);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("star");
  const [iconColor, setIconColor] = useState("blue");
  const [showBadge, setShowBadge] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [conditionGroups, setConditionGroups] = useState<CustomViewConditionGroup[]>([
    { id: crypto.randomUUID(), conditions: [{ column_key: "", operator: "equals", value: "" }] }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: views = [], isLoading: viewsLoading } = useQuery<CustomView[]>({
    queryKey: ["/api/custom-views"],
  });

  const { data: columns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const standardFields = [
    { key: "thought", name: "Lead Thought (Sure/May Be)", type: "thought" },
    { key: "name", name: "Full Name", type: "text" },
    { key: "email", name: "Email", type: "text" },
    { key: "mobile_no", name: "Mobile No", type: "mobile" },
    { key: "created_at", name: "Created Date", type: "date" },
  ];

  const columnOptions = [
    ...standardFields,
    ...columns
      .filter(c => !standardFields.some(sf => sf.key === c.column_key))
      .map(c => ({ key: c.column_key, name: c.name, type: c.type })),
  ];

  const getColumnType = (columnKey: string): string => {
    const standardField = standardFields.find(f => f.key === columnKey);
    if (standardField) return standardField.type;
    const column = columns.find(c => c.column_key === columnKey);
    return column?.type || "text";
  };

  const getOperatorsForColumn = (columnKey: string) => {
    const type = getColumnType(columnKey);
    return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
  };

  const getDropdownOptions = (columnKey: string): string[] => {
    const column = columns.find(c => c.column_key === columnKey);
    if (column?.config?.dropdown_options && Array.isArray(column.config.dropdown_options)) {
      return column.config.dropdown_options.map((opt: string | { value: string }) => {
        if (typeof opt === 'string') return opt;
        if (typeof opt === 'object' && opt !== null && 'value' in opt) return opt.value;
        return String(opt);
      });
    }
    return [];
  };

  const createMutation = useMutation({
    mutationFn: async (data: Omit<CustomView, 'id' | 'company_id' | 'order_index' | 'created_at'>) => {
      return apiRequest("POST", "/api/custom-views", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Custom view created" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create view", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomView> }) => {
      return apiRequest("PUT", `/api/custom-views/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Custom view updated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update view", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/custom-views/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
      setDeleteDialogOpen(false);
      setViewToDelete(null);
      toast({ title: "Custom view deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete view", description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (view_ids: string[]) => {
      return apiRequest("POST", "/api/custom-views/reorder", { view_ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views"] });
    },
  });

  const resetForm = () => {
    setName("");
    setIcon("star");
    setIconColor("blue");
    setShowBadge(true);
    setIsEnabled(true);
    setConditionGroups([
      { id: crypto.randomUUID(), conditions: [{ column_key: "", operator: "equals", value: "" }] }
    ]);
    setEditingView(null);
  };

  const openEditDialog = (view: CustomView) => {
    setEditingView(view);
    setName(view.name);
    setIcon(view.icon);
    setIconColor(view.icon_color);
    setShowBadge(view.show_badge);
    setIsEnabled(view.is_enabled);
    setConditionGroups(view.condition_groups.length > 0 
      ? view.condition_groups 
      : [{ id: crypto.randomUUID(), conditions: [{ column_key: "", operator: "equals", value: "" }] }]
    );
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }

    const validGroups = conditionGroups.filter(group => 
      group.conditions.some(c => c.column_key && c.operator)
    );

    if (validGroups.length === 0) {
      toast({ variant: "destructive", title: "At least one condition is required" });
      return;
    }

    const payload = {
      name: name.trim(),
      icon,
      icon_color: iconColor,
      show_badge: showBadge,
      is_enabled: isEnabled,
      condition_groups: validGroups,
    };

    if (editingView) {
      updateMutation.mutate({ id: editingView.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addGroup = () => {
    setConditionGroups([
      ...conditionGroups,
      { id: crypto.randomUUID(), conditions: [{ column_key: "", operator: "equals", value: "" }] }
    ]);
  };

  const removeGroup = (groupIndex: number) => {
    if (conditionGroups.length > 1) {
      setConditionGroups(conditionGroups.filter((_, i) => i !== groupIndex));
    }
  };

  const addConditionToGroup = (groupIndex: number) => {
    const updated = [...conditionGroups];
    updated[groupIndex].conditions.push({ column_key: "", operator: "equals", value: "" });
    setConditionGroups(updated);
  };

  const removeConditionFromGroup = (groupIndex: number, condIndex: number) => {
    const updated = [...conditionGroups];
    if (updated[groupIndex].conditions.length > 1) {
      updated[groupIndex].conditions.splice(condIndex, 1);
      setConditionGroups(updated);
    }
  };

  const updateCondition = (groupIndex: number, condIndex: number, updates: Partial<CustomViewCondition>) => {
    const updated = [...conditionGroups];
    const condition = updated[groupIndex].conditions[condIndex];
    
    if (updates.column_key !== undefined && updates.column_key !== condition.column_key) {
      updated[groupIndex].conditions[condIndex] = {
        column_key: updates.column_key,
        operator: "equals",
        value: "",
      };
    } else if (updates.operator !== undefined && NO_VALUE_OPERATORS.includes(updates.operator)) {
      updated[groupIndex].conditions[condIndex] = {
        ...condition,
        operator: updates.operator,
        value: "",
      };
    } else {
      updated[groupIndex].conditions[condIndex] = { ...condition, ...updates };
    }
    
    setConditionGroups(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = views.findIndex((v) => v.id === active.id);
      const newIndex = views.findIndex((v) => v.id === over.id);
      const reordered = arrayMove(views, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map(v => v.id));
    }
  };

  const handleToggleView = (view: CustomView, enabled: boolean) => {
    updateMutation.mutate({ id: view.id, data: { is_enabled: enabled } });
  };

  if (viewsLoading || columnsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Custom Views
          </CardTitle>
          <CardDescription>
            Create filtered views that appear in the sidebar menu
          </CardDescription>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-view">
          <Plus className="h-4 w-4 mr-2" />
          Add View
        </Button>
      </CardHeader>
      <CardContent>
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">How Custom Views Work</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li>Views appear as menu items in the sidebar with custom icons</li>
                  <li>Groups are joined by OR - leads matching ANY group are shown</li>
                  <li>Conditions within a group are joined by AND - ALL must match</li>
                  <li>Enable badge to show matching lead count next to the menu item</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {views.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom views yet</p>
            <p className="text-sm">Create your first view to filter leads by specific conditions</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={views.map(v => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {views.map((view) => (
                  <SortableViewItem
                    key={view.id}
                    view={view}
                    onEdit={() => openEditDialog(view)}
                    onDelete={() => { setViewToDelete(view); setDeleteDialogOpen(true); }}
                    onToggle={(enabled) => handleToggleView(view, enabled)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingView ? "Edit Custom View" : "Create Custom View"}</DialogTitle>
            <DialogDescription>
              Define conditions to filter leads. Groups are combined with OR, conditions within groups with AND.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-name">View Name</Label>
                <Input
                  id="view-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Hot Prospects"
                  data-testid="input-view-name"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-badge"
                    checked={showBadge}
                    onCheckedChange={setShowBadge}
                    data-testid="switch-show-badge"
                  />
                  <Label htmlFor="show-badge" className="text-sm">Show badge count</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-enabled"
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    data-testid="switch-is-enabled"
                  />
                  <Label htmlFor="is-enabled" className="text-sm">Enabled</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setIcon(opt.value)}
                        className={`p-2 rounded-md border-2 transition-all ${
                          icon === opt.value 
                            ? "border-primary bg-primary/10" 
                            : "border-transparent hover:border-muted"
                        }`}
                        title={opt.label}
                        data-testid={`icon-${opt.value}`}
                      >
                        <IconComp className={`h-5 w-5 ${getColorClass(iconColor)}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Icon Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setIconColor(opt.value)}
                      className={`w-8 h-8 rounded-md border-2 transition-all ${
                        iconColor === opt.value 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-transparent hover:border-muted"
                      }`}
                      style={{ 
                        backgroundColor: opt.value === 'gray' ? '#6b7280' : 
                          opt.value === 'blue' ? '#3b82f6' :
                          opt.value === 'green' ? '#22c55e' :
                          opt.value === 'orange' ? '#f97316' :
                          opt.value === 'red' ? '#ef4444' :
                          opt.value === 'purple' ? '#a855f7' :
                          opt.value === 'pink' ? '#ec4899' :
                          opt.value === 'yellow' ? '#eab308' :
                          opt.value === 'teal' ? '#14b8a6' :
                          opt.value === 'indigo' ? '#6366f1' : '#3b82f6'
                      }}
                      title={opt.label}
                      data-testid={`color-${opt.value}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Condition Groups</Label>
                <Button variant="outline" size="sm" onClick={addGroup} data-testid="button-add-group">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Group
                </Button>
              </div>

              <div className="space-y-4">
                {conditionGroups.map((group, groupIndex) => (
                  <Card key={group.id} className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Group {groupIndex + 1}</Badge>
                          <span className="text-xs text-muted-foreground">
                            All conditions must match (AND)
                          </span>
                        </div>
                        {conditionGroups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGroup(groupIndex)}
                            data-testid={`remove-group-${groupIndex}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {group.conditions.map((condition, condIndex) => (
                          <div key={condIndex} className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={condition.column_key}
                              onValueChange={(value) => updateCondition(groupIndex, condIndex, { column_key: value })}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-column-${groupIndex}-${condIndex}`}>
                                <SelectValue placeholder="Column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columnOptions.map((col) => (
                                  <SelectItem key={col.key} value={col.key}>{col.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={condition.operator}
                              onValueChange={(value) => updateCondition(groupIndex, condIndex, { operator: value })}
                            >
                              <SelectTrigger className="w-36" data-testid={`select-operator-${groupIndex}-${condIndex}`}>
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {getOperatorsForColumn(condition.column_key).map((op) => (
                                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {!NO_VALUE_OPERATORS.includes(condition.operator) && (
                              getColumnType(condition.column_key) === 'dropdown' ? (
                                <Select
                                  value={condition.value || ""}
                                  onValueChange={(value) => updateCondition(groupIndex, condIndex, { value })}
                                >
                                  <SelectTrigger className="flex-1 min-w-32" data-testid={`select-value-${groupIndex}-${condIndex}`}>
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getDropdownOptions(condition.column_key).map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : getColumnType(condition.column_key) === 'thought' ? (
                                <Select
                                  value={condition.value || ""}
                                  onValueChange={(value) => updateCondition(groupIndex, condIndex, { value })}
                                >
                                  <SelectTrigger className="flex-1 min-w-32" data-testid={`select-value-${groupIndex}-${condIndex}`}>
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Sure">Sure</SelectItem>
                                    <SelectItem value="May Be">May Be</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={condition.value || ""}
                                  onChange={(e) => updateCondition(groupIndex, condIndex, { value: e.target.value })}
                                  placeholder="Value"
                                  className="flex-1 min-w-32"
                                  data-testid={`input-value-${groupIndex}-${condIndex}`}
                                />
                              )
                            )}

                            {group.conditions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeConditionFromGroup(groupIndex, condIndex)}
                                data-testid={`remove-condition-${groupIndex}-${condIndex}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addConditionToGroup(groupIndex)}
                          className="w-full border-dashed border"
                          data-testid={`add-condition-${groupIndex}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Condition
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {conditionGroups.length > 1 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Groups are combined with <Badge variant="outline">OR</Badge> - leads matching ANY group are shown
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-view"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingView ? "Update View" : "Create View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom View</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{viewToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => viewToDelete && deleteMutation.mutate(viewToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
