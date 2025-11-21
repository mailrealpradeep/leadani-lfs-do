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
import type { Lead, Audit, CustomColumn } from "@shared/schema";
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

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", lead?.sheet_id, "columns"],
    enabled: !!lead?.sheet_id && open,
  });

  const getLeadValue = (lead: Lead | undefined, key: string) => {
    if (!lead) return undefined;
    const value = lead.custom_fields[key];
    return value !== null && value !== undefined ? value : undefined;
  };

  const formatValue = (value: any, type: string) => {
    // Handle nullish values
    if (value === null || value === undefined) return "-";
    
    // Handle different types
    if (type === "date") {
      try {
        return format(new Date(value), "PPP");
      } catch {
        return String(value);
      }
    }
    if (type === "boolean") {
      return value === true || value === "true" ? "Yes" : "No";
    }
    // For numbers and other values, convert to string but preserve 0 and false
    return String(value);
  };

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);
  const nameField = sortedColumns.find(col => col.column_key === "name");

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
              <SheetTitle className="text-xl">
                {getLeadValue(lead, nameField?.column_key || "name") || "Unnamed Lead"}
              </SheetTitle>
              <SheetDescription>
                Lead details and activity history
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Lead Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {sortedColumns.map((col) => {
                    const value = getLeadValue(lead, col.column_key);
                    const formattedValue = formatValue(value, col.type);

                    return (
                      <div key={col.id} className="space-y-1">
                        <div className="text-xs text-muted-foreground">{col.name}</div>
                        {col.type === "dropdown" ? (
                          <Badge variant="secondary" className="text-xs">{formattedValue}</Badge>
                        ) : (
                          <div className="text-sm">{formattedValue}</div>
                        )}
                      </div>
                    );
                  })}
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
