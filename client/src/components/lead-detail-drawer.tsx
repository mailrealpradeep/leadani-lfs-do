import { useQuery } from "@tanstack/react-query";
import { X, Calendar, User, Phone, Mail, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead, Audit } from "@shared/schema";
import { format } from "date-fns";

interface LeadDetailDrawerProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDrawer({ leadId, open, onOpenChange }: LeadDetailDrawerProps) {
  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
  });

  const { data: auditLogs = [] } = useQuery<Audit[]>({
    queryKey: ["/api/leads", leadId, "audit"],
    enabled: !!leadId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : lead ? (
          <>
            <SheetHeader className="pb-6">
              <SheetTitle className="text-xl">{lead.name || "Unnamed Lead"}</SheetTitle>
              <SheetDescription>
                Lead details and activity history
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Mobile</div>
                      <div className="text-sm text-muted-foreground">
                        {lead.mobile_no || "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">WhatsApp</div>
                      <div className="text-sm text-muted-foreground">
                        {lead.whatsapp || "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Address</div>
                      <div className="text-sm text-muted-foreground">
                        {lead.address || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3">Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Language</div>
                    <div className="text-sm">{lead.lang || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Age</div>
                    <div className="text-sm">{lead.age || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Occupation</div>
                    <div className="text-sm">{lead.occupation || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Qualification</div>
                    <div className="text-sm">{lead.qualification || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Lead Status</div>
                    <Badge variant="secondary">{lead.lead_status || "Unknown"}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Visit Status</div>
                    <Badge variant="secondary">{lead.visit_status || "Unknown"}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3">Important Dates</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lead Date</span>
                    <span>{lead.lead_date || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Visit Date</span>
                    <span>{lead.visit_date || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Exam End</span>
                    <span>{lead.exam_end || "-"}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3">Notes & Feedback</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Call 1</div>
                    <div className="text-sm p-3 bg-muted rounded-md">
                      {lead.call_1 || "No notes"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Feedback 1</div>
                    <div className="text-sm p-3 bg-muted rounded-md">
                      {lead.feedback_1 || "No feedback"}
                    </div>
                  </div>
                </div>
              </div>

              {auditLogs.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Activity History</h3>
                    <div className="space-y-2">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="text-xs p-2 border rounded-md"
                          data-testid={`audit-log-${log.id}`}
                        >
                          <div className="font-medium">{log.action}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(log.created_at), "PPpp")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
