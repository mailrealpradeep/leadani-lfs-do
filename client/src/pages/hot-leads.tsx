import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  Flame, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  Settings, 
  Search,
  RefreshCw,
  ChevronRight,
  Clock,
  Building2,
  Edit2,
  X,
  AlertCircle,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, CustomColumn, HotLeadCondition } from "@shared/schema";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { getSocket } from "@/lib/socket";

interface HotLeadConfig {
  id: string;
  company_id: string;
  conditions: HotLeadCondition[];
  logical_operator: "and" | "or";
  is_active: boolean;
}

interface EnrichedHotLead extends Lead {
  sheet_name: string;
  sheet_id: string;
}

interface HotLeadsResponse {
  leads: EnrichedHotLead[];
  count: number;
  config: HotLeadConfig | null;
}

const sheetColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
];

function getSheetColor(sheetName: string): string {
  let hash = 0;
  for (let i = 0; i < sheetName.length; i++) {
    hash = sheetName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return sheetColors[Math.abs(hash) % sheetColors.length];
}

function formatMobileNumber(mobile: string | null | undefined): string {
  if (!mobile) return "";
  const cleaned = mobile.replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
}

export default function HotLeads() {
  const { isCompanyAdmin, company } = useAuth();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<HotLeadsResponse>({
    queryKey: ["/api/hot-leads"],
  });

  const { data: columnsData } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  // Real-time updates
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

  const columnsMap = useMemo(() => {
    const map = new Map<string, CustomColumn>();
    columnsData?.forEach(col => map.set(col.column_key, col));
    return map;
  }, [columnsData]);

  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    if (!searchTerm.trim()) return data.leads;
    
    const term = searchTerm.toLowerCase();
    return data.leads.filter(lead => {
      const fullName = lead.custom_fields?.full_name?.toString().toLowerCase() || "";
      const mobileNo = lead.custom_fields?.mobile_no?.toString().toLowerCase() || "";
      const sheetName = lead.sheet_name.toLowerCase();
      
      return fullName.includes(term) || mobileNo.includes(term) || sheetName.includes(term);
    });
  }, [data?.leads, searchTerm]);

  const handleLeadClick = (lead: EnrichedHotLead) => {
    setSelectedLeadId(lead.id);
    setSelectedSheetId(lead.sheet_id);
  };

  const handleCall = (mobile: string) => {
    window.location.href = `tel:${formatMobileNumber(mobile)}`;
  };

  const handleWhatsApp = (mobile: string) => {
    const formatted = formatMobileNumber(mobile);
    window.open(`https://wa.me/91${formatted}`, "_blank");
  };

  const getLeadDisplayValue = (lead: EnrichedHotLead, columnKey: string): string => {
    const value = lead.custom_fields?.[columnKey];
    if (value === null || value === undefined || value === "") return "-";
    
    const column = columnsMap.get(columnKey);
    if (column?.type === "date" && value) {
      try {
        return format(parseISO(value.toString()), "dd MMM yyyy");
      } catch {
        return value.toString();
      }
    }
    
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 pb-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, mobile, or sheet..."
            className="pl-9"
            data-testid="input-search-hot-leads"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4 sm:p-6">
        {filteredLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                {searchTerm ? (
                  <>
                    <h3 className="font-medium mb-1">No matching leads</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search term
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-medium mb-1">No hot leads found</h3>
                    <p className="text-sm text-muted-foreground">
                      No leads currently match your hot lead conditions
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLeads.map((lead) => {
              const fullName = lead.custom_fields?.full_name?.toString() || "Unknown";
              const mobileNo = lead.custom_fields?.mobile_no?.toString() || "";
              const thought = (lead.meta as any)?.thought;
              
              return (
                <Card
                  key={lead.id}
                  className={cn(
                    "group cursor-pointer transition-all duration-200",
                    "hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700",
                    "border-l-4 border-l-orange-500"
                  )}
                  onClick={() => handleLeadClick(lead)}
                  data-testid={`hot-lead-card-${lead.id}`}
                >
                  <CardContent className="p-4">
                    {/* Header with name and sheet */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate text-base">
                          {fullName}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs font-normal mt-1",
                            getSheetColor(lead.sheet_name)
                          )}
                        >
                          {lead.sheet_name}
                        </Badge>
                      </div>
                      {thought && (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "shrink-0",
                            thought === "sure" 
                              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                              : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                          )}
                        >
                          {thought === "sure" ? "Sure" : "May Be"}
                        </Badge>
                      )}
                    </div>

                    {/* Mobile number */}
                    {mobileNo && (
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {mobileNo}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {mobileNo && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCall(mobileNo);
                            }}
                            data-testid={`button-call-${lead.id}`}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-green-600 hover:text-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(mobileNo);
                            }}
                            data-testid={`button-whatsapp-${lead.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeadClick(lead);
                        }}
                        data-testid={`button-view-${lead.id}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Lead Detail Drawer */}
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
