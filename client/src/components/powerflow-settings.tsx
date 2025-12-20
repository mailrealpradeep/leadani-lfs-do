import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, Activity, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PowerFlowConfig, PowerFlowStage, CustomColumn } from "@shared/schema";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STAGE_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#eab308", label: "Yellow" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#6b7280", label: "Gray" },
];

interface StageFormData {
  id: string;
  name: string;
  column_key: string;
  column_values: string[];
  color: string;
}

function SortableStageItem({
  stage,
  onEdit,
  onDelete,
  dropdownColumns,
}: {
  stage: PowerFlowStage;
  onEdit: () => void;
  onDelete: () => void;
  dropdownColumns: CustomColumn[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const column = dropdownColumns.find(c => c.column_key === stage.column_key);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover-elevate"
      data-testid={`powerflow-stage-${stage.id}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
        data-testid={`drag-handle-${stage.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{stage.name}</div>
        <div className="text-xs text-muted-foreground">
          {column?.name || stage.column_key}: {stage.column_values.join(", ")}
        </div>
      </div>
      
      <Badge variant="secondary" className="text-xs">
        #{stage.order + 1}
      </Badge>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        data-testid={`edit-stage-${stage.id}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        data-testid={`delete-stage-${stage.id}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function PowerFlowSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PowerFlowStage | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [stages, setStages] = useState<PowerFlowStage[]>([]);
  const [pipelineName, setPipelineName] = useState("Default Pipeline");
  const [isEnabled, setIsEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [formData, setFormData] = useState<StageFormData>({
    id: "",
    name: "",
    column_key: "",
    column_values: [],
    color: "#3b82f6",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: config, isLoading: configLoading } = useQuery<PowerFlowConfig | null>({
    queryKey: ["/api/powerflow/config"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const dropdownColumns = columns.filter(col => col.type === "dropdown");

  useEffect(() => {
    if (config) {
      setStages(config.stages || []);
      setPipelineName(config.name || "Default Pipeline");
      setIsEnabled(config.is_enabled ?? true);
      setHasChanges(false);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/powerflow/config", {
        name: pipelineName,
        stages: stages,
        is_enabled: isEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerflow/config"] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "PowerFlow pipeline configuration updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex(s => s.id === active.id);
      const newIndex = stages.findIndex(s => s.id === over.id);
      
      const newStages = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i,
      }));
      
      setStages(newStages);
      setHasChanges(true);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingStage(null);
    setFormData({
      id: crypto.randomUUID(),
      name: "",
      column_key: "",
      column_values: [],
      color: STAGE_COLORS[stages.length % STAGE_COLORS.length].value,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (stage: PowerFlowStage) => {
    setEditingStage(stage);
    setFormData({
      id: stage.id,
      name: stage.name,
      column_key: stage.column_key,
      column_values: stage.column_values,
      color: stage.color,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStage(null);
    setFormData({
      id: "",
      name: "",
      column_key: "",
      column_values: [],
      color: "#3b82f6",
    });
  };

  const handleSaveStage = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Stage name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.column_key) {
      toast({
        title: "Error",
        description: "Please select a column to track",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.column_values.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one value for this stage",
        variant: "destructive",
      });
      return;
    }

    const newStage: PowerFlowStage = {
      id: formData.id,
      name: formData.name,
      column_key: formData.column_key,
      column_values: formData.column_values,
      order: editingStage ? editingStage.order : stages.length,
      color: formData.color,
    };

    if (editingStage) {
      setStages(stages.map(s => s.id === editingStage.id ? newStage : s));
    } else {
      setStages([...stages, newStage]);
    }
    
    setHasChanges(true);
    handleCloseDialog();
  };

  const handleDeleteStage = () => {
    if (!deleteStageId) return;
    
    const newStages = stages
      .filter(s => s.id !== deleteStageId)
      .map((s, i) => ({ ...s, order: i }));
    
    setStages(newStages);
    setHasChanges(true);
    setDeleteStageId(null);
  };

  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabled(checked);
    setHasChanges(true);
  };

  const handlePipelineNameChange = (value: string) => {
    setPipelineName(value);
    setHasChanges(true);
  };

  const selectedColumn = dropdownColumns.find(c => c.column_key === formData.column_key);
  const columnOptions = selectedColumn?.config?.dropdown_options || [];

  const handleValueToggle = (value: string) => {
    if (formData.column_values.includes(value)) {
      setFormData({
        ...formData,
        column_values: formData.column_values.filter(v => v !== value),
      });
    } else {
      setFormData({
        ...formData,
        column_values: [...formData.column_values, value],
      });
    }
  };

  if (configLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Enable toggle and Pipeline name */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="powerflow-enabled"
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              data-testid="switch-powerflow-enabled"
            />
            <Label htmlFor="powerflow-enabled" className="text-sm font-medium">
              Enable PowerFlow
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            value={pipelineName}
            onChange={(e) => handlePipelineNameChange(e.target.value)}
            placeholder="Pipeline name"
            className="w-48"
            data-testid="input-pipeline-name"
          />
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-muted-foreground">
        Configure your sales pipeline stages to track lead progression and calculate conversion rates.
        Each stage represents a step in your sales funnel.
      </div>

      {/* Stages List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Pipeline Stages</h4>
          <Button
            size="sm"
            onClick={handleOpenAddDialog}
            data-testid="button-add-stage"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>

        {stages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No pipeline stages configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add stages to track your lead progression (e.g., Lead → Scheduled → Visited → Converted)
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {stages.sort((a, b) => a.order - b.order).map((stage) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    onEdit={() => handleOpenEditDialog(stage)}
                    onDelete={() => setDeleteStageId(stage.id)}
                    dropdownColumns={dropdownColumns}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-powerflow"
          >
            {saveMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Add/Edit Stage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStage ? "Edit Stage" : "Add Pipeline Stage"}
            </DialogTitle>
            <DialogDescription>
              {editingStage
                ? "Update this pipeline stage configuration"
                : "Add a new stage to your sales pipeline"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Stage Name */}
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Visited, Converted"
                data-testid="input-stage-name"
              />
            </div>

            {/* Column Selection */}
            <div className="space-y-2">
              <Label>Track Column</Label>
              <Select
                value={formData.column_key}
                onValueChange={(value) => setFormData({ ...formData, column_key: value, column_values: [] })}
              >
                <SelectTrigger data-testid="select-stage-column">
                  <SelectValue placeholder="Select a dropdown column" />
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

            {/* Value Selection */}
            {formData.column_key && (
              <div className="space-y-2">
                <Label>Stage Values</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which values indicate a lead has reached this stage
                </p>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {columnOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No options available</p>
                  ) : (
                    columnOptions.map((option: string) => (
                      <div key={option} className="flex items-center gap-2">
                        <Checkbox
                          id={`value-${option}`}
                          checked={formData.column_values.includes(option)}
                          onCheckedChange={() => handleValueToggle(option)}
                          data-testid={`checkbox-value-${option}`}
                        />
                        <Label
                          htmlFor={`value-${option}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Color Selection */}
            <div className="space-y-2">
              <Label>Stage Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger data-testid="select-stage-color">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                      {STAGE_COLORS.find(c => c.value === formData.color)?.label || "Custom"}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveStage} data-testid="button-confirm-stage">
              {editingStage ? "Update Stage" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStageId} onOpenChange={() => setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this pipeline stage? 
              This won't affect your lead data, only the pipeline configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-stage"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
