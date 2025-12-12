import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Settings, 
  RefreshCw,
  AlertCircle,
  Star,
  Zap,
  Target,
  Flag,
  Award,
  Heart,
  Bell,
  Bookmark,
  Check,
  Clock,
  Flame,
  Users,
  TrendingUp,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { Link, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import type { CustomViewConditionGroup } from "@shared/schema";

interface CustomView {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  icon_color: string;
  condition_groups: CustomViewConditionGroup[];
  show_badge: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomViewResponse {
  leads: any[];
  count: number;
  view: CustomView | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  zap: Zap,
  target: Target,
  flag: Flag,
  award: Award,
  heart: Heart,
  bell: Bell,
  bookmark: Bookmark,
  check: Check,
  clock: Clock,
  flame: Flame,
  users: Users,
  "trending-up": TrendingUp,
  "alert-triangle": AlertTriangle,
};

const getGradientColors = (color: string): string => {
  const gradientMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-pink-600",
    yellow: "from-yellow-500 to-yellow-600",
    teal: "from-teal-500 to-teal-600",
    indigo: "from-indigo-500 to-indigo-600",
    gray: "from-gray-500 to-gray-600",
  };
  return gradientMap[color] || "from-blue-500 to-blue-600";
};

export default function CustomViewPage() {
  const params = useParams<{ viewId: string }>();
  const viewId = params.viewId;
  const { isCompanyAdmin, company } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<CustomViewResponse>({
    queryKey: ["/api/custom-views", viewId, "leads"],
    enabled: !!viewId,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !company) return;

    const handleLeadUpdated = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
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
          <AlertTitle>Error loading custom view</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data?.view) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-500" />
              Custom View
            </CardTitle>
            <CardDescription>
              This custom view could not be found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>View Not Found</AlertTitle>
              <AlertDescription className="mt-2">
                The custom view you're looking for doesn't exist or has been deleted.
                {isCompanyAdmin && (
                  <div className="mt-3">
                    <Link href="/admin">
                      <Button size="sm" data-testid="button-go-to-admin">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Custom Views
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

  if (!data.view.is_enabled) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-muted-foreground" />
              {data.view.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>View Disabled</AlertTitle>
              <AlertDescription className="mt-2">
                This custom view is currently disabled.
                {isCompanyAdmin && (
                  <span> Enable it in the Admin Console to start using it.</span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = ICON_MAP[data.view.icon] || Star;
  const gradientColors = getGradientColors(data.view.icon_color);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gradient-to-br ${gradientColors} rounded-lg`}>
            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              {data.view.name}
              <Badge variant="secondary" className="font-normal text-sm">
                {data.count}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Filtered leads based on custom conditions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            data-testid="button-refresh-custom-view"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isCompanyAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-configure-custom-view">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
        <SpreadsheetGrid
          customViewId={viewId}
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
