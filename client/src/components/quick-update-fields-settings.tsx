import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GripVertical, Pencil, Save, Info, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface CompanySettings {
  quick_update_fields?: string[];
  [key: string]: any;
}

const SYSTEM_COLUMNS = [
  { column_key: "status", name: "Lead Status", type: "dropdown" },
  { column_key: "name", name: "Name", type: "text" },
  { column_key: "email", name: "Email", type: "text" },
  { column_key: "mobile", name: "Mobile", type: "mobile" },
  { column_key: "address", name: "Address", type: "text" },
];

function SortableFieldItem({ 
  column, 
  onRemove 
}: { 
  column: { column_key: string; name: string; type: string };
  onRemove: () => void;
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
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onRemove}
        data-testid={`button-remove-quick-field-${column.column_key}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface QuickUpdateFieldsSettingsProps {
  headless?: boolean;
}

export function QuickUpdateFieldsSettings({ headless = false }: QuickUpdateFieldsSettingsProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const lastServerStateRef = useRef<string>("");

  const { data: companyColumns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  const allColumns = useMemo(() => {
    const customCols = companyColumns.map(c => ({
      column_key: c.column_key,
      name: c.name,
      type: c.type,
    }));
    return [...SYSTEM_COLUMNS, ...customCols];
  }, [companyColumns]);

  const columnMap = useMemo(() => 
    new Map(allColumns.map(c => [c.column_key, c])),
    [allColumns]
  );

  const availableColumns = useMemo(() => 
    allColumns.filter(c => !selectedFields.includes(c.column_key)),
    [allColumns, selectedFields]
  );

  const serverConfig = settingsData?.settings?.quick_update_fields;
  const serverStateKey = JSON.stringify(serverConfig || []);

  useEffect(() => {
    if (serverStateKey !== lastServerStateRef.current) {
      lastServerStateRef.current = serverStateKey;
      if (serverConfig && Array.isArray(serverConfig)) {
        const validFields = serverConfig.filter(key => columnMap.has(key));
        setSelectedFields(validFields);
      } else {
        setSelectedFields([]);
      }
    }
  }, [serverStateKey, serverConfig, columnMap]);

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
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (columnKey: string) => {
    if (selectedFields.length >= 5) {
      toast({
        title: "Maximum reached",
        description: "You can add up to 5 quick update fields",
        variant: "destructive",
      });
      return;
    }
    setSelectedFields(prev => [...prev, columnKey]);
  };

  const removeField = (columnKey: string) => {
    setSelectedFields(prev => prev.filter(k => k !== columnKey));
  };

  const updateMutation = useMutation({
    mutationFn: async (fields: string[]) => {
      const currentSettings = settingsData?.settings || {};
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: {
          ...currentSettings,
          quick_update_fields: fields,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Quick update fields configuration updated successfully",
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

  const content = (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select up to 5 fields to display in the Record Lead Update dialog. These fields appear below the Remark area for quick access - they're optional, not mandatory.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Selected Fields ({selectedFields.length}/5)</div>
          {selectedFields.length > 0 && (
            <Badge variant="secondary">{selectedFields.length} selected</Badge>
          )}
        </div>

        {selectedFields.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
            No fields selected. Add fields from the list below.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedFields}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedFields.map(key => {
                  const column = columnMap.get(key);
                  if (!column) return null;
                  return (
                    <SortableFieldItem
                      key={key}
                      column={column}
                      onRemove={() => removeField(key)}
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
          <div className="text-sm text-muted-foreground py-4">All fields have been selected</div>
        ) : (
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {availableColumns.map(column => (
              <div
                key={column.column_key}
                className="flex items-center justify-between p-2 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                onClick={() => addField(column.column_key)}
                data-testid={`button-add-quick-field-${column.column_key}`}
              >
                <span>{column.name}</span>
                <Badge variant="outline" className="text-xs">
                  {column.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedFields.length === 0 
            ? "No fields will appear in the update dialog" 
            : `${selectedFields.length} field${selectedFields.length > 1 ? 's' : ''} will appear below Remark`}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-quick-update-fields"
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
          <Pencil className="h-5 w-5" />
          Quick Update Fields
        </CardTitle>
        <CardDescription>
          Configure which fields appear in the Record Lead Update dialog for quick access
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
