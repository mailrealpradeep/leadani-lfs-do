import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LeadUpdate } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Phone, MessageSquare, ArrowRightLeft } from "lucide-react";

interface UpdateHistoryHoverCardProps {
  leadId: string;
  onOpenFullDialog: () => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

export function UpdateHistoryHoverCard({ leadId, onOpenFullDialog }: UpdateHistoryHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const clickedRef = useRef(false);
  const { formatInTimezone } = useCompanyTimezone();

  const { data: updates = [], isLoading } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: isOpen && !!leadId,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    clickedRef.current = true;
    setIsOpen(false);
    onOpenFullDialog();
  };

  const handleOpenChange = (open: boolean) => {
    if (clickedRef.current) {
      clickedRef.current = false;
      return;
    }
    setIsOpen(open);
  };

  return (
    <HoverCard openDelay={300} closeDelay={200} open={isOpen} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          data-testid={`button-update-history-${leadId}`}
          aria-label="View update history"
        >
          <History className="h-4 w-4" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 max-h-96 overflow-y-auto bg-popover border shadow-lg z-[9999]"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-semibold text-sm">Update History</span>
            <span className="text-lg font-bold text-primary">
              {isLoading ? "..." : updates.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No updates recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {updates.slice(0, 5).map((update, index) => {
                const serialNo = updates.length - index;
                return (
                  <div
                    key={update.id}
                    className="flex gap-2 border rounded-md p-2 bg-background"
                    data-testid={`hover-update-item-${update.id}`}
                  >
                    <div className="shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {serialNo}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {update.update_via === "call" ? (
                          <Phone className="h-3 w-3 text-blue-500 shrink-0" />
                        ) : update.update_via === "whatsapp" ? (
                          <MessageSquare className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <ArrowRightLeft className="h-3 w-3 text-orange-500 shrink-0" />
                        )}
                        <span className="font-medium capitalize text-xs">
                          {update.update_via}
                        </span>
                        {update.created_by_first_name && (
                          <span className="text-[10px] text-muted-foreground">
                            by {update.created_by_first_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">
                        {formatInTimezone(update.created_at, "MMM dd, yyyy HH:mm")}
                      </div>
                      <p className="text-xs text-foreground line-clamp-2">
                        {update.remark || "No remark"}
                      </p>
                    </div>
                  </div>
                );
              })}
              {updates.length > 5 && (
                <div className="text-center text-xs text-muted-foreground pt-1">
                  +{updates.length - 5} more updates (click for full history)
                </div>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
