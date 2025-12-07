import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GripVertical, Calendar, MapPin, Save, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface SiteVisitConfig {
  status_column?: string;
  status_value?: string;
  date_column?: string;
  card_columns?: string[];
}

interface CompanySettings {
  site_visit_config?: SiteVisitConfig;
  [key: string]: any;
}

function SortableColumnItem({ 
  column, 
  isSelected, 
  onToggle 
}: { 
  column: CustomColumn; 
  isSelected: boolean;
  onToggle: () => void;
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
      className={`flex items-center gap-3 p-3 border rounded-md ${
        isSelected ? "bg-primary/5 border-primary" : "bg-background"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Checkbox
        id={`visit-col-${column.column_key}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        data-testid={`checkbox-visit-col-${column.column_key}`}
      />
      <Label 
        htmlFor={`visit-col-${column.column_key}`}
        className="flex-1 cursor-pointer"
      >
        {column.name}
      </Label>
      <span className="text-xs text-muted-foreground">
        {column.type}
      </span>
    </div>
  );
}

interface SiteVisitSettingsProps {
  headless?: boolean;
}

export function SiteVisitSettings({ headless = false }: SiteVisitSettingsProps) {
  const { toast } = useToast();
  const [statusColumn, setStatusColumn] = useState<string>("");
  const [statusValue, setStatusValue] = useState<string>("");
  const [dateColumn, setDateColumn] = useState<string>("");
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const lastServerStateRef = useRef<string>("");

  const { data: companyColumns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  const sortedColumns = useMemo(() => 
    [...companyColumns].sort((a, b) => a.order_index - b.order_index),
    [companyColumns]
  );

  const dropdownColumns = useMemo(() => 
    sortedColumns.filter(c => c.type === "dropdown"),
    [sortedColumns]
  );

  const dateColumns = useMemo(() => 
    sortedColumns.filter(c => c.type === "date"),
    [sortedColumns]
  );

  const selectedDropdownColumn = useMemo(() => 
    dropdownColumns.find(c => c.column_key === statusColumn),
    [dropdownColumns, statusColumn]
  );

  const dropdownOptions = useMemo(() => 
    selectedDropdownColumn?.config?.dropdown_options || [],
    [selectedDropdownColumn]
  );

  const validColumnKeys = useMemo(() => 
    new Set(sortedColumns.map(c => c.column_key)),
    [sortedColumns]
  );

  const serverConfig = settingsData?.settings?.site_visit_config;
  const serverStateKey = JSON.stringify(serverConfig || {});

  useEffect(() => {
    if (sortedColumns.length === 0) return;

    const serverStateChanged = serverStateKey !== lastServerStateRef.current;
    
    if (serverStateChanged) {
      lastServerStateRef.current = serverStateKey;
      
      if (serverConfig) {
        setStatusColumn(serverConfig.status_column || "");
        setStatusValue(serverConfig.status_value || "");
        setDateColumn(serverConfig.date_column || "");
        
        if (serverConfig.card_columns && serverConfig.card_columns.length > 0) {
          const validServerColumns = serverConfig.card_columns.filter(key => validColumnKeys.has(key));
          setSelectedColumnKeys(new Set(validServerColumns));
          
          const remainingColumns = sortedColumns
            .map(col => col.column_key)
            .filter(key => !validServerColumns.includes(key));
          
          setColumnOrder([...validServerColumns, ...remainingColumns]);
        } else {
          const defaultColumns = sortedColumns.slice(0, 4).map(c => c.column_key);
          setSelectedColumnKeys(new Set(defaultColumns));
          setColumnOrder(sortedColumns.map(c => c.column_key));
        }
      } else {
        const defaultColumns = sortedColumns.slice(0, 4).map(c => c.column_key);
        setSelectedColumnKeys(new Set(defaultColumns));
        setColumnOrder(sortedColumns.map(c => c.column_key));
      }
    }
  }, [sortedColumns, serverStateKey, serverConfig, validColumnKeys]);

  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return sortedColumns;
    
    const columnMap = new Map(sortedColumns.map(col => [col.column_key, col]));
    return columnOrder
      .map(key => columnMap.get(key))
      .filter(Boolean) as CustomColumn[];
  }, [columnOrder, sortedColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = (columnKey: string) => {
    setSelectedColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (config: SiteVisitConfig) => {
      const currentSettings = settingsData?.settings || {};
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: {
          ...currentSettings,
          site_visit_config: config,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Site visit configuration updated successfully",
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
    const orderedSelectedColumns = columnOrder.filter(key => selectedColumnKeys.has(key));
    
    updateMutation.mutate({
      status_column: statusColumn || undefined,
      status_value: statusValue || undefined,
      date_column: dateColumn || undefined,
      card_columns: orderedSelectedColumns.length > 0 ? orderedSelectedColumns : undefined,
    });
  };

  const isLoading = columnsLoading || settingsLoading;
  const isConfigured = statusColumn && statusValue && dateColumn;

  const content = (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure which leads appear in the Visit Schedules page. Select a status column and value that indicates a site visit, and the date column for the scheduled visit date.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status Column</Label>
          <Select value={statusColumn} onValueChange={(val) => { setStatusColumn(val); setStatusValue(""); }}>
            <SelectTrigger data-testid="select-status-column">
              <SelectValue placeholder="Select a dropdown column" />
            </SelectTrigger>
            <SelectContent>
              {dropdownColumns.map(col => (
                <SelectItem key={col.column_key} value={col.column_key}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Which column indicates the lead type/status
          </p>
        </div>

        <div className="space-y-2">
          <Label>Site Visit Value</Label>
          <Select value={statusValue} onValueChange={setStatusValue} disabled={!statusColumn}>
            <SelectTrigger data-testid="select-status-value">
              <SelectValue placeholder={statusColumn ? "Select a value" : "Select status column first"} />
            </SelectTrigger>
            <SelectContent>
              {dropdownOptions.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Which value means "site visit scheduled"
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Visit Date Column</Label>
        <Select value={dateColumn} onValueChange={setDateColumn}>
          <SelectTrigger className="max-w-sm" data-testid="select-date-column">
            <SelectValue placeholder="Select a date column" />
          </SelectTrigger>
          <SelectContent>
            {dateColumns.map(col => (
              <SelectItem key={col.column_key} value={col.column_key}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Which column contains the scheduled visit date
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Visit Card Display Columns</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select and order columns to show on visit schedule cards. Drag to reorder.
          </p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading columns...</div>
        ) : orderedColumns.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No columns available</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orderedColumns.map(column => (
                  <SortableColumnItem
                    key={column.column_key}
                    column={column}
                    isSelected={selectedColumnKeys.has(column.column_key)}
                    onToggle={() => toggleColumn(column.column_key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedColumnKeys.size} columns selected for visit cards
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-visit-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {!isConfigured && statusColumn && (
        <Alert variant="destructive">
          <AlertDescription>
            Please complete all required fields (Status Column, Site Visit Value, and Visit Date Column) to enable the Visit Schedules feature.
          </AlertDescription>
        </Alert>
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
          <MapPin className="h-5 w-5" />
          Site Visit Settings
        </CardTitle>
        <CardDescription>
          Configure how site visits are identified and displayed in the Visit Schedules page
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
