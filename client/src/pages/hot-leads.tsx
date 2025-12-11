import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Flame, 
  Settings, 
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import type { HotLeadCondition } from "@shared/schema";

interface HotLeadConfig {
  id: string;
  company_id: string;
  conditions: HotLeadCondition[];
  logical_operator: "and" | "or";
  is_active: boolean;
}

interface HotLeadsResponse {
  leads: any[];
  count: number;
  config: HotLeadConfig | null;
}

export default function HotLeads() {
  const { isCompanyAdmin, company } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<HotLeadsResponse>({
    queryKey: ["/api/hot-leads"],
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !company) return;

    const handleHotLeadConfigUpdated = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
    };

    const handleLeadUpdated = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/hot-leads/count"] });
    };

    socket.on("hot_lead_config.updated", handleHotLeadConfigUpdated);
    socket.on("lead.updated", handleLeadUpdated);
    socket.on("lead.created", handleLeadUpdated);
    socket.on("lead.deleted", handleLeadUpdated);

    return () => {
      socket.off("hot_lead_config.updated", handleHotLeadConfigUpdated);
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
          <AlertTitle>Error loading hot leads</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data?.config) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Hot Leads
            </CardTitle>
            <CardDescription>
              Configure hot lead conditions to identify high-priority leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription className="mt-2">
                Hot lead conditions are not configured yet. Set up conditions in the Admin Console to identify your most important leads.
                {isCompanyAdmin && (
                  <div className="mt-3">
                    <Link href="/admin">
                      <Button size="sm" data-testid="button-go-to-admin">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Hot Leads
                      </Button>
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data.config.is_active) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-muted-foreground" />
              Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hot Leads Disabled</AlertTitle>
              <AlertDescription className="mt-2">
                Hot leads tracking is currently disabled.
                {isCompanyAdmin && (
                  <span> Enable it in the Admin Console to start tracking high-priority leads.</span>
                )}
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
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              Hot Leads
              <Badge variant="secondary" className="font-normal text-sm">
                {data.count}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              High-priority leads requiring immediate attention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            data-testid="button-refresh-hot-leads"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isCompanyAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-configure-hot-leads">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
        <SpreadsheetGrid
          hotLeadsMode={true}
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
