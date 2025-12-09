import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LeadUpdate } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { History, Phone, MessageSquare, ArrowRightLeft, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadUpdateHistoryHoverProps {
  leadId: string;
  variant?: "icon" | "full";
  className?: string;
  onOpenFullHistory?: () => void;
}

type LeadUpdateWithUser = LeadUpdate & {
  created_by_first_name?: string | null;
};

export function LeadUpdateHistoryHover({
  leadId,
  variant = "icon",
  className,
  onOpenFullHistory,
}: LeadUpdateHistoryHoverProps) {
  const { formatInTimezone } = useCompanyTimezone();
  const [isOpen, setIsOpen] = useState(false);

  const { data: updates = [], isLoading } = useQuery<LeadUpdateWithUser[]>({
    queryKey: ["/api/leads", leadId, "updates"],
    enabled: isOpen && !!leadId,
    staleTime: 30000,
  });

  return (
    <HoverCard openDelay={200} closeDelay={100} open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={className || "h-8 w-8"}
            data-testid={`button-update-history-${leadId}`}
            title="View update history"
          >
            <History className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={className || "flex-1 min-h-[44px]"}
            data-testid={`button-update-history-${leadId}`}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        )}
      </HoverCardTrigger>
      <HoverCardContent 
        side="left" 
        align="start" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Update History</h4>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {updates.length} update{updates.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : updates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No updates recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {updates.slice(0, 10).map((update, index) => {
                  const serialNo = updates.length - index;
                  
                  return (
                    <div
                      key={update.id}
                      className="flex gap-2 border rounded-md p-2 bg-muted/30"
                      data-testid={`hover-update-item-${update.id}`}
                    >
                      <div className="shrink-0">
                        <div 
                          className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold"
                        >
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
                            <span className="text-xs text-muted-foreground">
                              by {update.created_by_first_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-0.5">
                          {formatInTimezone(update.created_at, "MMM dd, yyyy HH:mm")}
                        </div>
                        <p className="text-xs text-foreground line-clamp-2">
                          {update.remark}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {updates.length > 10 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    +{updates.length - 10} more updates
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {onOpenFullHistory && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false);
                onOpenFullHistory();
              }}
              data-testid={`button-view-full-history-${leadId}`}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              View Full History
            </Button>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
