import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, GripVertical, Filter } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { QuickFilter } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// Icon options for quick filters
const ICON_OPTIONS = [
  { value: "filter", label: "Filter" },
  { value: "phone", label: "Phone" },
  { value: "calendar", label: "Calendar" },
  { value: "clock", label: "Clock" },
  { value: "star", label: "Star" },
  { value: "user", label: "User" },
  { value: "users", label: "Users" },
  { value: "trending-up", label: "Trending Up" },
  { value: "flag", label: "Flag" },
  { value: "target", label: "Target" },
];

// Color options for quick filters
const COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "gray", label: "Gray" },
];

export function QuickFilterManager() {
  const { toast } = useToast();
  
  // Add mode state
  const [isAdding, setIsAdding] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterIcon, setNewFilterIcon] = useState<string | null>(null);
  const [newFilterColor, setNewFilterColor] = useState<string | null>(null);
  const [newFilterConfig, setNewFilterConfig] = useState("");

  // Edit mode state
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editFilterName, setEditFilterName] = useState("");
  const [editFilterIcon, setEditFilterIcon] = useState<string | null>(null);
  const [editFilterColor, setEditFilterColor] = useState<string | null>(null);
  const [editFilterConfig, setEditFilterConfig] = useState("");

  const { data: quickFilters = [], isLoading } = useQuery<QuickFilter[]>({
    queryKey: ["/api/company/quick-filters"],
  });

  const addFilterMutation = useMutation({
    mutationFn: async () => {
      let parsedConfig;
      try {
        parsedConfig = newFilterConfig.trim() ? JSON.parse(newFilterConfig) : { conditions: [] };
      } catch (error) {
        throw new Error("Invalid filter configuration JSON");
      }

      // Get the maximum order_index and add 1
      const maxOrder = quickFilters.reduce((max, f) => Math.max(max, f.order_index), -1);
      
      return await apiRequest<QuickFilter>("POST", "/api/company/quick-filters", {
        name: newFilterName,
        icon: newFilterIcon,
        color: newFilterColor,
        filter_config: parsedConfig,
        order_index: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/quick-filters"] });
      resetAddForm();
      toast({
        title: "Quick filter created",
        description: "New quick filter has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create quick filter",
        description: error.message,
      });
    },
  });

  const updateFilterMutation = useMutation({
    mutationFn: async ({ filterId, updates }: { filterId: string; updates: any }) => {
      return await apiRequest("PATCH", `/api/company/quick-filters/${filterId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/quick-filters"] });
      cancelEditing();
      toast({
        title: "Quick filter updated",
        description: "Filter has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update filter",
        description: error.message,
      });
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      return await apiRequest("DELETE", `/api/company/quick-filters/${filterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/quick-filters"] });
      toast({
        title: "Quick filter deleted",
        description: "Filter has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete filter",
        description: error.message,
      });
    },
  });

  const moveFilterMutation = useMutation({
    mutationFn: async ({ filterId, direction }: { filterId: string; direction: "up" | "down" }) => {
      const currentIndex = quickFilters.findIndex((f) => f.id === filterId);
      if (currentIndex === -1) return;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= quickFilters.length) return;

      const reorderedFilters = [...quickFilters];
      const [movedFilter] = reorderedFilters.splice(currentIndex, 1);
      reorderedFilters.splice(targetIndex, 0, movedFilter);

      // Update order_index for all affected filters
      const updates = reorderedFilters.map((filter, index) => ({
        id: filter.id,
        order_index: index,
      }));

      return await apiRequest("PATCH", "/api/company/quick-filters/reorder", { filters: updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/quick-filters"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reorder filters",
        description: error.message,
      });
    },
  });

  const resetAddForm = () => {
    setNewFilterName("");
    setNewFilterIcon(null);
    setNewFilterColor(null);
    setNewFilterConfig("");
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingFilterId(null);
    setEditFilterName("");
    setEditFilterIcon(null);
    setEditFilterColor(null);
    setEditFilterConfig("");
  };

  const startEditing = (filter: QuickFilter) => {
    setEditingFilterId(filter.id);
    setEditFilterName(filter.name);
    setEditFilterIcon(filter.icon);
    setEditFilterColor(filter.color);
    setEditFilterConfig(JSON.stringify(filter.filter_config, null, 2));
  };

  const handleSaveEdit = () => {
    if (!editingFilterId) return;

    let parsedConfig;
    try {
      parsedConfig = editFilterConfig.trim() ? JSON.parse(editFilterConfig) : { conditions: [] };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "Filter configuration must be valid JSON",
      });
      return;
    }

    updateFilterMutation.mutate({
      filterId: editingFilterId,
      updates: {
        name: editFilterName,
        icon: editFilterIcon,
        color: editFilterColor,
        filter_config: parsedConfig,
      },
    });
  };

  const handleAddFilter = () => {
    if (!newFilterName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Filter name is required",
      });
      return;
    }

    addFilterMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quick Filters</CardTitle>
            <CardDescription>
              Manage company-wide quick filters for all sheets
            </CardDescription>
          </div>
          {!isAdding && (
            <Button 
              size="sm"
              onClick={() => setIsAdding(true)}
              data-testid="button-add-quick-filter"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new filter form */}
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">New Quick Filter</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetAddForm}
                data-testid="button-cancel-add-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="new-filter-name">Filter Name</Label>
                <Input
                  id="new-filter-name"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  placeholder="e.g., Hot Leads"
                  data-testid="input-new-filter-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-filter-icon">Icon (Optional)</Label>
                  <Select value={newFilterIcon || undefined} onValueChange={setNewFilterIcon}>
                    <SelectTrigger id="new-filter-icon" data-testid="select-new-filter-icon">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="new-filter-color">Color (Optional)</Label>
                  <Select value={newFilterColor || undefined} onValueChange={setNewFilterColor}>
                    <SelectTrigger id="new-filter-color" data-testid="select-new-filter-color">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="new-filter-config">Filter Configuration (JSON)</Label>
                <Textarea
                  id="new-filter-config"
                  value={newFilterConfig}
                  onChange={(e) => setNewFilterConfig(e.target.value)}
                  placeholder='{"conditions": [{"column": "status", "operator": "equals", "value": "Hot"}]}'
                  className="font-mono text-xs"
                  rows={4}
                  data-testid="textarea-new-filter-config"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: {"{"}"conditions": [{"{"}"column": "status", "operator": "equals", "value": "Hot"{"}"}]{"}"}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetAddForm}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={addFilterMutation.isPending}
                  data-testid="button-save-new-filter"
                >
                  {addFilterMutation.isPending ? "Creating..." : "Create Filter"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Existing filters */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading filters...
          </div>
        ) : quickFilters.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No quick filters created yet. Click "Add Filter" to create one.
          </div>
        ) : (
          quickFilters.map((filter, index) => (
            <div
              key={filter.id}
              className="p-3 border rounded-lg hover-elevate"
              data-testid={`quick-filter-${filter.id}`}
            >
              {editingFilterId === filter.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Edit Filter</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      data-testid="button-cancel-edit-filter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`edit-filter-name-${filter.id}`}>Filter Name</Label>
                      <Input
                        id={`edit-filter-name-${filter.id}`}
                        value={editFilterName}
                        onChange={(e) => setEditFilterName(e.target.value)}
                        data-testid="input-edit-filter-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`edit-filter-icon-${filter.id}`}>Icon</Label>
                        <Select value={editFilterIcon || undefined} onValueChange={setEditFilterIcon}>
                          <SelectTrigger id={`edit-filter-icon-${filter.id}`} data-testid="select-edit-filter-icon">
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-filter-color-${filter.id}`}>Color</Label>
                        <Select value={editFilterColor || undefined} onValueChange={setEditFilterColor}>
                          <SelectTrigger id={`edit-filter-color-${filter.id}`} data-testid="select-edit-filter-color">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`edit-filter-config-${filter.id}`}>Filter Configuration (JSON)</Label>
                      <Textarea
                        id={`edit-filter-config-${filter.id}`}
                        value={editFilterConfig}
                        onChange={(e) => setEditFilterConfig(e.target.value)}
                        className="font-mono text-xs"
                        rows={4}
                        data-testid="textarea-edit-filter-config"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateFilterMutation.isPending}
                        data-testid="button-save-edit-filter"
                      >
                        {updateFilterMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveFilterMutation.mutate({ filterId: filter.id, direction: "up" })}
                          disabled={index === 0 || moveFilterMutation.isPending}
                          data-testid={`button-move-up-${filter.id}`}
                          className="h-6 w-6 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveFilterMutation.mutate({ filterId: filter.id, direction: "down" })}
                          disabled={index === quickFilters.length - 1 || moveFilterMutation.isPending}
                          data-testid={`button-move-down-${filter.id}`}
                          className="h-6 w-6 p-0"
                        >
                          ↓
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {filter.name}
                          {filter.icon && (
                            <Badge variant="secondary" className="text-xs">
                              {filter.icon}
                            </Badge>
                          )}
                          {filter.color && (
                            <Badge variant="secondary" className="text-xs">
                              {filter.color}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {filter.filter_config.conditions?.length || 0} condition(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(filter)}
                        data-testid={`button-edit-filter-${filter.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteFilterMutation.mutate(filter.id)}
                        disabled={deleteFilterMutation.isPending}
                        data-testid={`button-delete-filter-${filter.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
