import { useQuery, useMutation } from "@tanstack/react-query";
import type { LeadUpdate } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Phone, MessageSquare, ArrowRightLeft, MapPin } from "lucide-react";
import {
  WhatsAppTemplateUpdateCard,
  parseTemplateFromUpdate,
} from "./whatsapp-template-update-card";
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
  const { formatInTimezone } = useCompanyTimezone();
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
              {/* Total update count summary */}
              <div className="flex items-center justify-between px-1 pb-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Total Updates
                </span>
                <span className="text-2xl font-bold text-primary" data-testid="text-total-updates">
                  {updates.length}
                </span>
              </div>
              
              {updates.map((update, index) => {
                // Serial number: most recent (top) has highest number
                const serialNo = updates.length - index;
                const templateInfo = parseTemplateFromUpdate(update);
                
                return (
                  <div
                    key={update.id}
                    className="flex gap-3 border rounded-lg p-3"
                    data-testid={`update-item-${update.id}`}
                  >
                    {/* Serial Number Badge */}
                    <div className="shrink-0 flex items-start pt-0.5">
                      <div 
                        className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold"
                        title={`Update #${serialNo}`}
                        data-testid={`badge-update-number-${serialNo}`}
                      >
                        {serialNo}
                      </div>
                    </div>
                    
                    {/* Update Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {update.update_via === "call" ? (
                          <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : update.update_via === "whatsapp" ? (
                          <MessageSquare className="h-4 w-4 text-green-500 shrink-0" />
                        ) : update.update_via === "visit" ? (
                          <MapPin className="h-4 w-4 text-purple-500 shrink-0" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        <span className="font-semibold capitalize text-sm">
                          {update.update_via}
                        </span>
                        {update.created_by_first_name && (
                          <span className="text-xs text-muted-foreground">
                            by {update.created_by_first_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1.5">
                        {formatInTimezone(update.created_at, "MMM dd, yyyy HH:mm")}
                        {update.update_on && (
                          <span className="ml-2">
                            (Updated on: {formatInTimezone(update.update_on, "MMM dd, yyyy")})
                          </span>
                        )}
                      </div>
                      {templateInfo ? (
                        <WhatsAppTemplateUpdateCard template={templateInfo.template} />
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {update.remark}
                        </p>
                      )}
                    </div>
                    
                    {/* Delete Button */}
                    {isAdmin && (
                      <div className="shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUpdateMutation.mutate(update.id)}
                          disabled={deleteUpdateMutation.isPending}
                          data-testid={`button-delete-update-${update.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
