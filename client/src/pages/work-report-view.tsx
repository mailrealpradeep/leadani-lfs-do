import { useState } from "react";
import { useSearch } from "wouter";
import { RefreshCw, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

interface SheetInfo {
  id: string;
  name: string;
  company_id: string;
}

interface SlotLeadsResponse {
  leads: Lead[];
  sheets: SheetInfo[];
  count: number;
}

export default function WorkReportView() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const date = params.get("date") || "";
  const slotStart = parseInt(params.get("slotStart") || "0", 10);
  const slotEnd = parseInt(params.get("slotEnd") || "24", 10);
  const userId = params.get("userId") || undefined;
  const slotLabel = params.get("slotLabel") || `${slotStart}:00–${slotEnd}:00`;
  const userName = params.get("userName") || "";

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const workReportParams = { date, slotStart, slotEnd, userId };

  const queryKey = ["/api/work-report/slot-leads", date, slotStart, slotEnd, userId];

  const { data, refetch } = useQuery<SlotLeadsResponse>({
    queryKey,
    queryFn: async () => {
      const urlParams = new URLSearchParams({
        date,
        slotStart: String(slotStart),
        slotEnd: String(slotEnd),
      });
      if (userId) urlParams.append("userId", userId);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/work-report/slot-leads?${urlParams}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch slot leads");
      return res.json();
    },
    enabled: !!date,
  });

  const handleOpenLeadDetail = (leadId: string) => {
    const lead = data?.leads?.find((l) => l.id === leadId);
    if (lead) {
      setSelectedLeadId(leadId);
      setSelectedSheetId(lead.sheet_id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
    refetch();
  };

  const count = data?.count ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b bg-background">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Link href="/vision-board?tab=work-report">
            <Button variant="ghost" size="icon" aria-label="Back to Vision Board" data-testid="button-back-work-report">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-1 rounded bg-gradient-to-br from-blue-500 to-indigo-600">
            <Clock className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-medium text-sm truncate">
            {userName ? `${userName} — ` : ""}{slotLabel}
            {date && <span className="text-muted-foreground ml-1 text-xs">({date})</span>}
          </span>
          <Badge variant="secondary" className="text-xs shrink-0">
            {count}
          </Badge>
          <span className="text-xs text-muted-foreground shrink-0">
            · {count.toLocaleString()} {count === 1 ? "lead" : "leads"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh"
            data-testid="button-refresh-work-report-view"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SpreadsheetGrid
          workReportParams={workReportParams}
          onOpenLeadDetail={handleOpenLeadDetail}
        />
      </div>

      {selectedLeadId && selectedSheetId && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          sheetId={selectedSheetId}
          open={!!selectedLeadId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLeadId(null);
              setSelectedSheetId(null);
            }
          }}
        />
      )}
    </div>
  );
}
