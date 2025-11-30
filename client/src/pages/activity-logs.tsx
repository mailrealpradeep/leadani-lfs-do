import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  Activity,
  User,
  FileSpreadsheet,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ClipboardList,
  Table2,
  Columns,
  Webhook,
  Key,
  Package,
  FileEdit,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  sheet_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  summary: string;
  changes: any;
  extra: any;
  actor_name: string;
  sheet_name: string | null;
  created_at: string;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Sheet {
  id: string;
  name: string;
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_updated", label: "Lead Updated" },
  { value: "lead_deleted", label: "Lead Deleted" },
  { value: "lead_restored", label: "Lead Restored" },
  { value: "lead_transferred", label: "Lead Transferred" },
  { value: "lead_thought_changed", label: "Thought Changed" },
  { value: "lead_update_added", label: "Update Added" },
  { value: "bulk_import", label: "Bulk Import" },
  { value: "bulk_export", label: "Bulk Export" },
  { value: "bulk_transfer", label: "Bulk Transfer" },
  { value: "sheet_created", label: "Sheet Created" },
  { value: "sheet_updated", label: "Sheet Updated" },
  { value: "sheet_deleted", label: "Sheet Deleted" },
  { value: "column_created", label: "Column Created" },
  { value: "column_updated", label: "Column Updated" },
  { value: "column_deleted", label: "Column Deleted" },
  { value: "webhook_created", label: "Webhook Created" },
  { value: "webhook_updated", label: "Webhook Updated" },
  { value: "webhook_deleted", label: "Webhook Deleted" },
];

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes("created") || action.includes("added")) return "default";
  if (action.includes("deleted")) return "destructive";
  if (action.includes("updated") || action.includes("changed")) return "secondary";
  return "outline";
};

const getActionIcon = (action: string): LucideIcon => {
  if (action.includes("lead")) return ClipboardList;
  if (action.includes("sheet")) return Table2;
  if (action.includes("column")) return Columns;
  if (action.includes("webhook")) return Webhook;
  if (action.includes("api_key")) return Key;
  if (action.includes("bulk")) return Package;
  return FileEdit;
};

export default function ActivityLogs() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [sheetFilter, setSheetFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 20;

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
    enabled: isAdmin,
  });

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/admin/company/users"],
    enabled: isCompanyAdmin && !isSuperAdmin,
  });

  const { data: allUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/super-admin/users"],
    enabled: isSuperAdmin,
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/super-admin/companies"],
    enabled: isSuperAdmin,
  });

  const users = isSuperAdmin ? allUsers : companyUsers;

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (sheetFilter !== "all") params.set("sheetId", sheetFilter);
    if (isAdmin && userFilter !== "all") params.set("userId", userFilter);
    if (isSuperAdmin && companyFilter !== "all") params.set("companyId", companyFilter);
    if (searchQuery) params.set("search", searchQuery);
    return params.toString();
  };

  const getApiEndpoint = () => {
    if (isSuperAdmin) return "/api/activity-logs/super-admin";
    if (isCompanyAdmin) return "/api/activity-logs/admin";
    return "/api/activity-logs/my";
  };

  const { data: logsResponse, isLoading, isFetching } = useQuery<ActivityLogsResponse>({
    queryKey: [getApiEndpoint(), page, actionFilter, sheetFilter, userFilter, companyFilter, searchQuery],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiEndpoint()}?${buildQueryParams()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
  });

  const logs = logsResponse?.logs || [];
  const totalPages = logsResponse?.totalPages || 1;
  const total = logsResponse?.total || 0;

  const clearFilters = () => {
    setActionFilter("all");
    setSheetFilter("all");
    setUserFilter("all");
    setCompanyFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = actionFilter !== "all" || sheetFilter !== "all" || 
    userFilter !== "all" || companyFilter !== "all" || searchQuery !== "";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Activity Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin 
                ? "View all system activities across companies" 
                : isCompanyAdmin 
                  ? "View all activities in your company" 
                  : "View your recent activities"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-48"
              data-testid="input-search-activities"
            />
          </div>

          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40" data-testid="select-action-filter">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={sheetFilter} onValueChange={(v) => { setSheetFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40" data-testid="select-sheet-filter">
                <SelectValue placeholder="Sheet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sheets</SelectItem>
                {sheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isAdmin && users.length > 0 && (
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40" data-testid="select-user-filter">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isSuperAdmin && companies.length > 0 && (
            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40" data-testid="select-company-filter">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            {total} {total === 1 ? "activity" : "activities"}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No activities found</p>
                  <p className="text-sm mt-2">
                    {hasActiveFilters 
                      ? "Try adjusting your filters" 
                      : "Activities will appear here as you use the system"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="hover-elevate" data-testid={`activity-log-${log.id}`}>
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {log.actor_name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{log.actor_name}</span>
                            <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                              {(() => {
                                const Icon = getActionIcon(log.action);
                                return <Icon className="h-3 w-3" />;
                              })()}
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">{log.summary}</p>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {log.sheet_name && (
                            <span className="flex items-center gap-1">
                              <FileSpreadsheet className="h-3 w-3" />
                              {log.sheet_name}
                            </span>
                          )}
                          {log.target_name && (
                            <span className="truncate max-w-48">
                              Target: {log.target_name}
                            </span>
                          )}
                        </div>

                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View changes
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="border-t px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
