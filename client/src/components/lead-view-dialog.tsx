import { useQuery } from "@tanstack/react-query";
import { Eye, Phone, MessageCircle, User, MapPin, Calendar, X, Building } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Lead, CustomColumn } from "@shared/schema";

interface LeadViewDialogProps {
  leadId: string | null;
  sheetId: string;
  sheetName: string;
  ownerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadViewDialog({ 
  leadId, 
  sheetId, 
  sheetName, 
  ownerName, 
  open, 
  onOpenChange 
}: LeadViewDialogProps) {
  const { data: lead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId && open,
  });

  const { data: columns = [], isLoading: isLoadingColumns } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId && open,
  });

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);

  const getFieldValue = (key: string): string => {
    if (!lead?.custom_fields) return "-";
    const value = lead.custom_fields[key];
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const getFullName = (): string => {
    if (!lead?.custom_fields) return "Lead Details";
    const namePatterns = [/^full[_\s]?name/i, /^name$/i];
    for (const pattern of namePatterns) {
      const key = Object.keys(lead.custom_fields).find((k) => pattern.test(k));
      if (key && lead.custom_fields[key]) return String(lead.custom_fields[key]);
    }
    return "Lead Details";
  };

  const getMobileNumber = (): string | null => {
    if (!lead?.custom_fields) return null;
    const mobilePatterns = [/^mobile[_\s]?no/i, /^phone/i, /^mobile$/i, /^whatsapp/i];
    for (const pattern of mobilePatterns) {
      const key = Object.keys(lead.custom_fields).find((k) => pattern.test(k));
      if (key && lead.custom_fields[key]) return String(lead.custom_fields[key]);
    }
    return null;
  };

  const handleCall = () => {
    const mobile = getMobileNumber();
    if (mobile) {
      window.location.href = `tel:${mobile}`;
    }
  };

  const handleWhatsApp = () => {
    const mobile = getMobileNumber();
    if (mobile) {
      const cleanNumber = mobile.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanNumber}`, "_blank");
    }
  };

  const isLoading = isLoadingLead || isLoadingColumns;
  const mobileNumber = getMobileNumber();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="flex items-center gap-2 text-left">
                <Eye className="h-5 w-5 shrink-0" />
                <span className="truncate">{getFullName()}</span>
              </SheetTitle>
              <SheetDescription className="text-left mt-1">
                View-only - This lead belongs to another user
              </SheetDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Building className="h-3 w-3" />
              {sheetName}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {ownerName}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 py-4">
          {isLoading ? (
            <div className="space-y-4 px-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 px-1">
              {sortedColumns.map((column, index) => {
                const value = getFieldValue(column.column_key);
                const isMobileField = /mobile|phone|whatsapp/i.test(column.column_key);
                
                return (
                  <div key={column.id}>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {column.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${value === "-" ? "text-muted-foreground" : ""}`}>
                          {value}
                        </span>
                        {isMobileField && value !== "-" && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={handleCall}
                              data-testid={`button-call-${column.column_key}`}
                            >
                              <Phone className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={handleWhatsApp}
                              data-testid={`button-whatsapp-${column.column_key}`}
                            >
                              <MessageCircle className="h-3 w-3 text-green-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < sortedColumns.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex gap-2 w-full">
            {mobileNumber && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCall}
                  className="flex-1 min-h-[44px] gap-2"
                  data-testid="button-call-lead"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="flex-1 min-h-[44px] gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                  data-testid="button-whatsapp-lead"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 min-h-[44px]"
              data-testid="button-close-view"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
