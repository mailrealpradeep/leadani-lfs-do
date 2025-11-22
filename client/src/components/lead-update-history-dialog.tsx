import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import type { LeadUpdate } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

interface LeadUpdateHistoryDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

export function LeadUpdateHistoryDialog({
  leadId,
  open,
  onOpenChange,
}: LeadUpdateHistoryDialogProps) {
  const { toast } = useToast();
  const { isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin || isCompanyAdmin;

  const { data: updates = [], isLoading } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: open && !!leadId,
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: async (updateId: string) => {
      return await apiRequest("DELETE", `/api/lead-updates/${updateId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "updates"] });
      toast({ title: "Update deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Update History</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No updates recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="border rounded-lg p-4 space-y-2"
                  data-testid={`update-item-${update.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {update.update_via === "call" ? (
                          <Phone className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-semibold capitalize">
                          {update.update_via}
                        </span>
                        {update.created_by_first_name && (
                          <span className="text-xs text-muted-foreground">
                            by {update.created_by_first_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {format(new Date(update.created_at), "MMM dd, yyyy HH:mm")}
                        {update.update_on && (
                          <span className="ml-2">
                            (Updated on: {format(new Date(update.update_on), "MMM dd, yyyy")})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {update.remark}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUpdateMutation.mutate(update.id)}
                        disabled={deleteUpdateMutation.isPending}
                        data-testid={`button-delete-update-${update.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
