import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GripVertical, Smartphone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CustomColumn } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

interface CompanySettings {
  mobile_card_columns?: string[];
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
        id={`col-${column.column_key}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        data-testid={`checkbox-mobile-col-${column.column_key}`}
      />
      <Label 
        htmlFor={`col-${column.column_key}`}
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

export function MobileCardSettings() {
  const { toast } = useToast();
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

  const validColumnKeys = useMemo(() => 
    new Set(sortedColumns.map(c => c.column_key)),
    [sortedColumns]
  );

  const serverMobileColumns = settingsData?.settings?.mobile_card_columns;
  const serverStateKey = JSON.stringify(serverMobileColumns || []);

  useEffect(() => {
    if (sortedColumns.length === 0) return;

    const serverStateChanged = serverStateKey !== lastServerStateRef.current;
    
    if (serverStateChanged) {
      lastServerStateRef.current = serverStateKey;
      
      if (serverMobileColumns && serverMobileColumns.length > 0) {
        const validServerColumns = serverMobileColumns.filter(key => validColumnKeys.has(key));
        setSelectedColumnKeys(new Set(validServerColumns));
        
        const remainingColumns = sortedColumns
          .map(col => col.column_key)
          .filter(key => !validServerColumns.includes(key));
        
        setColumnOrder([...validServerColumns, ...remainingColumns]);
      } else {
        const defaultColumns = sortedColumns.slice(0, 6).map(c => c.column_key);
        setSelectedColumnKeys(new Set(defaultColumns));
        setColumnOrder(sortedColumns.map(c => c.column_key));
      }
    } else {
      setSelectedColumnKeys(prev => {
        const validSelected = new Set([...prev].filter(key => validColumnKeys.has(key)));
        if (validSelected.size !== prev.size) return validSelected;
        return prev;
      });
      
      const validOrder = columnOrder.filter(key => validColumnKeys.has(key));
      const newColumns = sortedColumns
        .map(c => c.column_key)
        .filter(key => !columnOrder.includes(key));
      
      if (newColumns.length > 0 || validOrder.length !== columnOrder.length) {
        setColumnOrder([...validOrder, ...newColumns]);
      } else if (columnOrder.length === 0) {
        setColumnOrder(sortedColumns.map(c => c.column_key));
      }
    }
  }, [sortedColumns, serverStateKey, serverMobileColumns, validColumnKeys]);

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

  const updateMutation = useMutation({
    mutationFn: async (columns: string[]) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { mobile_card_columns: columns }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Mobile card columns have been updated.",
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
      const activeKey = active.id as string;
      const overKey = over.id as string;
      
      const oldIndex = columnOrder.indexOf(activeKey);
      const newIndex = columnOrder.indexOf(overKey);

      if (oldIndex !== -1 && newIndex !== -1) {
        setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
      }
    }
  };

  const handleToggle = (columnKey: string) => {
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

  const handleSave = () => {
    const orderedSelected = columnOrder
      .filter(key => selectedColumnKeys.has(key) && validColumnKeys.has(key));
    updateMutation.mutate(orderedSelected);
  };

  const isLoading = columnsLoading || settingsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Card Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Card Display
            </CardTitle>
            <CardDescription>
              Select and order columns to display in mobile lead cards. First 2 columns show as title, next 4 show as details.
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-mobile-columns"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
          Drag to reorder columns. Selected columns will appear in mobile card view.
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedColumns.map(c => c.column_key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedColumns.map((column) => (
                <SortableColumnItem
                  key={column.column_key}
                  column={column}
                  isSelected={selectedColumnKeys.has(column.column_key)}
                  onToggle={() => handleToggle(column.column_key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
