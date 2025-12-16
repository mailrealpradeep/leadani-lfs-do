import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GripVertical, Plus, Save, Info, X, Check, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

interface AddLeadFormField {
  column_key: string;
  required: boolean;
}

interface CompanySettings {
  add_lead_form_fields?: AddLeadFormField[];
  [key: string]: any;
}

function SortableFieldItem({ 
  column, 
  isRequired,
  onToggleRequired,
  onRemove,
  isMandatorySystem,
}: { 
  column: { column_key: string; name: string; type: string };
  isRequired: boolean;
  onToggleRequired: () => void;
  onRemove: () => void;
  isMandatorySystem: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.column_key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-primary/5 border-primary"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 font-medium">{column.name}</span>
      <Badge variant="secondary" className="text-xs">
        {column.type}
      </Badge>
      {isMandatorySystem ? (
        <Badge variant="default" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Always Required
        </Badge>
      ) : (
        <div className="flex items-center gap-2">
          <Switch 
            checked={isRequired}
            onCheckedChange={onToggleRequired}
            id={`required-${column.column_key}`}
            data-testid={`switch-required-${column.column_key}`}
          />
          <Label htmlFor={`required-${column.column_key}`} className="text-xs cursor-pointer">
            {isRequired ? "Required" : "Optional"}
          </Label>
        </div>
      )}
      {!isMandatorySystem && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
          data-testid={`button-remove-form-field-${column.column_key}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface AddLeadFormSettingsProps {
  headless?: boolean;
}

const MANDATORY_SYSTEM_FIELDS = ["full_name", "mobile_no"];

export function AddLeadFormSettings({ headless = false }: AddLeadFormSettingsProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<AddLeadFormField[]>([]);
  const lastServerStateRef = useRef<string>("");

  const { data: companyColumns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  const allColumns = useMemo(() => {
    return companyColumns.map(c => ({
      column_key: c.column_key,
      name: c.name,
      type: c.type,
    }));
  }, [companyColumns]);

  const columnMap = useMemo(() => 
    new Map(allColumns.map(c => [c.column_key, c])),
    [allColumns]
  );

  const selectedColumnKeys = useMemo(() => 
    selectedFields.map(f => f.column_key),
    [selectedFields]
  );

  const availableColumns = useMemo(() => 
    allColumns.filter(c => 
      !selectedColumnKeys.includes(c.column_key) && 
      !MANDATORY_SYSTEM_FIELDS.includes(c.column_key)
    ),
    [allColumns, selectedColumnKeys]
  );

  const serverConfig = settingsData?.settings?.add_lead_form_fields;
  const serverStateKey = JSON.stringify(serverConfig || []);

  useEffect(() => {
    if (serverStateKey !== lastServerStateRef.current && allColumns.length > 0) {
      lastServerStateRef.current = serverStateKey;
      
      const mandatoryFields: AddLeadFormField[] = MANDATORY_SYSTEM_FIELDS
        .filter(key => columnMap.has(key))
        .map(key => ({ column_key: key, required: true }));
      
      if (serverConfig && Array.isArray(serverConfig) && serverConfig.length > 0) {
        const nonMandatoryConfig = serverConfig.filter(
          f => !MANDATORY_SYSTEM_FIELDS.includes(f.column_key) && columnMap.has(f.column_key)
        );
        setSelectedFields([...mandatoryFields, ...nonMandatoryConfig]);
      } else {
        setSelectedFields(mandatoryFields);
      }
    }
  }, [serverStateKey, serverConfig, columnMap, allColumns.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedFields((items) => {
        const oldIndex = items.findIndex(f => f.column_key === active.id);
        const newIndex = items.findIndex(f => f.column_key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (columnKey: string) => {
    setSelectedFields(prev => [...prev, { column_key: columnKey, required: false }]);
  };

  const removeField = (columnKey: string) => {
    if (MANDATORY_SYSTEM_FIELDS.includes(columnKey)) return;
    setSelectedFields(prev => prev.filter(f => f.column_key !== columnKey));
  };

  const toggleRequired = (columnKey: string) => {
    if (MANDATORY_SYSTEM_FIELDS.includes(columnKey)) return;
    setSelectedFields(prev => prev.map(f => 
      f.column_key === columnKey ? { ...f, required: !f.required } : f
    ));
  };

  const updateMutation = useMutation({
    mutationFn: async (fields: AddLeadFormField[]) => {
      const currentSettings = settingsData?.settings || {};
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: {
          ...currentSettings,
          add_lead_form_fields: fields,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Add Lead form configuration updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Could not update settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(selectedFields);
  };

  const isLoading = columnsLoading || settingsLoading;

  const requiredCount = selectedFields.filter(f => f.required).length;
  const optionalCount = selectedFields.filter(f => !f.required).length;

  const content = (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure which fields appear when adding a new lead. Full Name and Mobile No are always required. Other fields can be marked as Required or Optional.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Form Fields ({selectedFields.length})</div>
          <div className="flex gap-2">
            <Badge variant="default" className="text-xs">
              {requiredCount} Required
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {optionalCount} Optional
            </Badge>
          </div>
        </div>

        {selectedFields.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
            No fields configured. Add fields from the list below.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedFields.map(f => f.column_key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedFields.map(field => {
                  const column = columnMap.get(field.column_key);
                  if (!column) return null;
                  const isMandatory = MANDATORY_SYSTEM_FIELDS.includes(field.column_key);
                  return (
                    <SortableFieldItem
                      key={field.column_key}
                      column={column}
                      isRequired={field.required}
                      onToggleRequired={() => toggleRequired(field.column_key)}
                      onRemove={() => removeField(field.column_key)}
                      isMandatorySystem={isMandatory}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="space-y-3">
        <div className="font-medium">Available Fields</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading columns...</div>
        ) : availableColumns.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">All fields have been added</div>
        ) : (
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {availableColumns.map(column => (
              <div
                key={column.column_key}
                className="flex items-center justify-between p-2 border rounded-md hover-elevate cursor-pointer transition-colors"
                onClick={() => addField(column.column_key)}
                data-testid={`button-add-form-field-${column.column_key}`}
              >
                <span>{column.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {column.type}
                  </Badge>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedFields.length === 0 
            ? "Form will use all columns by default" 
            : `${selectedFields.length} field${selectedFields.length > 1 ? 's' : ''} will appear in Add Lead form`}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-add-lead-form-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );

  if (headless) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Lead Form Configuration
        </CardTitle>
        <CardDescription>
          Configure which fields appear in the Add Lead form and mark them as required or optional
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
