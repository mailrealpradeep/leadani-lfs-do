import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Eye, 
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";

interface WatchlistLeadsResponse {
  leads: any[];
  count: number;
}

export default function Watchlist() {
  const { company } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<WatchlistLeadsResponse>({
    queryKey: ["/api/watchlist/leads"],
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !company) return;

    const handleLeadUpdated = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
    };

    socket.on("lead.updated", handleLeadUpdated);
    socket.on("lead.created", handleLeadUpdated);
    socket.on("lead.deleted", handleLeadUpdated);

    return () => {
      socket.off("lead.updated", handleLeadUpdated);
      socket.off("lead.created", handleLeadUpdated);
      socket.off("lead.deleted", handleLeadUpdated);
    };
  }, [company, refetch]);

  const handleOpenLeadDetail = (leadId: string) => {
    const lead = data?.leads?.find((l: any) => l.id === leadId);
    if (lead) {
      setSelectedLeadId(leadId);
      setSelectedSheetId(lead.sheet_id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading watchlist</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data?.leads || data.leads.length === 0) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Watchlist
            </CardTitle>
            <CardDescription>
              Track important leads that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertTitle>No leads on watchlist</AlertTitle>
              <AlertDescription className="mt-2">
                Click the eye icon on any lead in the spreadsheet to add it to your watchlist. 
                Watchlist leads are sorted by next follow-up date to help you prioritize your work.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              Watchlist
              <Badge variant="secondary" className="font-normal text-sm">
                {data.count}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Leads you're watching, sorted by next follow-up date
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            data-testid="button-refresh-watchlist"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
        <SpreadsheetGrid
          watchlistMode={true}
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
