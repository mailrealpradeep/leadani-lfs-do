import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GripVertical, CheckCircle2, Save, Info } from "lucide-react";
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

interface SiteVisitedConfig {
  status_column?: string;
  status_values?: string[];
  date_column?: string;
  card_columns?: string[];
}

interface CompanySettings {
  site_visited_config?: SiteVisitedConfig;
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
        isSelected ? "bg-green-500/5 border-green-500" : "bg-background"
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
        id={`visited-col-${column.column_key}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        data-testid={`checkbox-visited-col-${column.column_key}`}
      />
      <Label 
        htmlFor={`visited-col-${column.column_key}`}
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

interface SiteVisitedSettingsProps {
  headless?: boolean;
}

export function SiteVisitedSettings({ headless = false }: SiteVisitedSettingsProps) {
  const { toast } = useToast();
  const [statusColumn, setStatusColumn] = useState<string>("");
  const [statusValues, setStatusValues] = useState<Set<string>>(new Set());
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
    sortedColumns.filter(c => c.type === "date" || c.type === "datetime"),
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

  const serverConfig = settingsData?.settings?.site_visited_config;
  const serverStateKey = JSON.stringify(serverConfig || {});

  useEffect(() => {
    if (sortedColumns.length === 0) return;

    const serverStateChanged = serverStateKey !== lastServerStateRef.current;
    
    if (serverStateChanged) {
      lastServerStateRef.current = serverStateKey;
      
      if (serverConfig) {
        setStatusColumn(serverConfig.status_column || "");
        setStatusValues(new Set(serverConfig.status_values || []));
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
    mutationFn: async (config: SiteVisitedConfig) => {
      const currentSettings = settingsData?.settings || {};
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: {
          ...currentSettings,
          site_visited_config: config,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Site visited configuration updated successfully",
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

  const toggleStatusValue = (value: string) => {
    setStatusValues(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleSave = () => {
    const orderedSelectedColumns = columnOrder.filter(key => selectedColumnKeys.has(key));
    const statusValuesArray = Array.from(statusValues);
    
    updateMutation.mutate({
      status_column: statusColumn || undefined,
      status_values: statusValuesArray.length > 0 ? statusValuesArray : undefined,
      date_column: dateColumn || undefined,
      card_columns: orderedSelectedColumns.length > 0 ? orderedSelectedColumns : undefined,
    });
  };

  const isLoading = columnsLoading || settingsLoading;
  const isConfigured = statusColumn && statusValues.size > 0 && dateColumn;

  const content = (
    <div className="space-y-6">
      <Alert className="border-green-500/50 bg-green-500/5">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription>
          Configure which leads appear in the Visited Calendar page. Select a status column and the values that indicate a completed visit, plus the date column.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Status Column</Label>
        <Select value={statusColumn} onValueChange={(val) => { setStatusColumn(val); setStatusValues(new Set()); }}>
          <SelectTrigger className="max-w-sm" data-testid="select-visited-status-column">
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
          Which column indicates if a visit was completed
        </p>
      </div>

      <div className="space-y-2">
        <Label>Visited Status Values</Label>
        {!statusColumn ? (
          <p className="text-sm text-muted-foreground py-2">Select a status column first</p>
        ) : dropdownOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No options available for this column</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dropdownOptions.map(opt => (
              <div 
                key={opt} 
                className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${
                  statusValues.has(opt) ? "bg-green-500/10 border-green-500" : "hover:bg-muted"
                }`}
                onClick={() => toggleStatusValue(opt)}
              >
                <Checkbox
                  id={`visited-value-${opt}`}
                  checked={statusValues.has(opt)}
                  onCheckedChange={() => toggleStatusValue(opt)}
                  data-testid={`checkbox-visited-value-${opt}`}
                />
                <Label htmlFor={`visited-value-${opt}`} className="cursor-pointer text-sm flex-1">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Select one or more values that indicate a completed visit (e.g., "Visited", "Done"). Leads matching any selected value will appear in Visited Calendar.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Visit Date Column</Label>
        <Select value={dateColumn} onValueChange={setDateColumn}>
          <SelectTrigger className="max-w-sm" data-testid="select-visited-date-column">
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
          Which column contains the visit date for grouping in the calendar
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Visited Card Display Columns</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select and order columns to show on visited calendar cards. Drag to reorder.
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
          {selectedColumnKeys.size} columns selected for visited cards
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-visited-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {!isConfigured && statusColumn && (
        <Alert variant="destructive">
          <AlertDescription>
            Please complete all required fields (Status Column, Visited Status Values, and Visit Date Column) to enable the Visited Calendar feature.
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
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Site Visited Settings
        </CardTitle>
        <CardDescription>
          Configure how completed visits are identified and displayed in the Visited Calendar page
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
