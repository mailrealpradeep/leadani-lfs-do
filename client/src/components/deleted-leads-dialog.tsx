import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trash2, RotateCcw, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { Lead, CustomColumn } from "@shared/schema";

interface DeletedLeadsDialogProps {
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletedLeadsDialog({ sheetId, open, onOpenChange }: DeletedLeadsDialogProps) {
  const { toast } = useToast();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const { data: deletedLeads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/sheets", sheetId, "deleted-leads"],
    enabled: open && !!sheetId,
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: open && !!sheetId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      return apiRequest("POST", "/api/leads/restore", { leadIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "deleted-leads"] });
      setSelectedLeads(new Set());
      toast({
        title: "Leads restored",
        description: "Selected leads have been restored successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleAll = () => {
    if (selectedLeads.size === deletedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(deletedLeads.map((lead) => lead.id)));
    }
  };

  const handleToggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleRestore = () => {
    if (selectedLeads.size === 0) {
      toast({
        title: "No leads selected",
        description: "Please select at least one lead to restore.",
        variant: "destructive",
      });
      return;
    }

    restoreMutation.mutate(Array.from(selectedLeads));
  };

  const getDisplayValue = (lead: Lead, columnKey: string) => {
    const value = lead.custom_fields?.[columnKey];
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const primaryColumn = columns.find((col) => col.order_index === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Deleted Leads (30-day retention)
          </DialogTitle>
          <DialogDescription>
            View and restore leads that have been deleted. Leads are permanently removed after 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading deleted leads...</div>
            </div>
          ) : deletedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No deleted leads</h3>
              <p className="text-sm text-muted-foreground mt-1">
                There are no deleted leads in this sheet.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedLeads.size === deletedLeads.length && deletedLeads.length > 0}
                    onCheckedChange={handleToggleAll}
                    data-testid="checkbox-select-all-deleted"
                  />
                  <span className="text-sm font-medium">
                    {selectedLeads.size} of {deletedLeads.length} selected
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleRestore}
                  disabled={selectedLeads.size === 0 || restoreMutation.isPending}
                  data-testid="button-restore-selected"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Restore Selected
                </Button>
              </div>

              <div className="overflow-auto max-h-[400px] border rounded-md">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="w-12 p-2"></th>
                      <th className="text-left p-2 text-sm font-medium">
                        {primaryColumn?.name || "Lead"}
                      </th>
                      <th className="text-left p-2 text-sm font-medium">Deleted By</th>
                      <th className="text-left p-2 text-sm font-medium">Deleted At</th>
                      <th className="w-24 p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-t hover-elevate"
                        data-testid={`row-deleted-lead-${lead.id}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => handleToggleLead(lead.id)}
                            data-testid={`checkbox-lead-${lead.id}`}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-medium">
                            {primaryColumn
                              ? getDisplayValue(lead, primaryColumn.column_key)
                              : lead.id.substring(0, 8)}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{lead.deleted_by_user_id || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {lead.deleted_at
                                ? format(new Date(lead.deleted_at), "MMM d, yyyy h:mm a")
                                : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLeads(new Set([lead.id]));
                              restoreMutation.mutate([lead.id]);
                            }}
                            disabled={restoreMutation.isPending}
                            data-testid={`button-restore-${lead.id}`}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
