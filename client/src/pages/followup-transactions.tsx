import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  History, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  User as UserIcon,
  Clock,
  FileText,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

interface FollowupEventWithDetails {
  id: string;
  company_id: string;
  sheet_id: string;
  lead_id: string;
  user_id: string;
  event_types: string[];
  triggered_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  lead_name: string | null;
  lead_mobile: string | null;
  sheet_name: string | null;
}

interface FollowupTransactionsResponse {
  transactions: FollowupEventWithDetails[];
  total: number;
  page: number;
  limit: number;
}

interface SimpleUser {
  id: string;
  name: string;
}

interface Sheet {
  id: string;
  name: string;
}

type DateRangeFilter = "today" | "yesterday" | "this_week" | "this_month" | "last_7_days" | "all";

export default function FollowupTransactions() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedSheetId, setSelectedSheetId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("today");

  const { data: usersData } = useQuery<SimpleUser[]>({
    queryKey: ["/api/users/simple"],
    enabled: isAdmin,
  });

  const { data: sheetsData } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
    enabled: isAdmin,
  });

  const getDateRangeParams = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { startDate: startOfDay(yesterday).toISOString(), endDate: endOfDay(yesterday).toISOString() };
      case "this_week":
        return { startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), endDate: endOfDay(now).toISOString() };
      case "this_month":
        return { startDate: startOfMonth(now).toISOString(), endDate: endOfDay(now).toISOString() };
      case "last_7_days":
        return { startDate: startOfDay(subDays(now, 7)).toISOString(), endDate: endOfDay(now).toISOString() };
      case "all":
      default:
        return {};
    }
  };

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "25");
    if (selectedUserId !== "all") params.set("userId", selectedUserId);
    if (selectedSheetId !== "all") params.set("sheetId", selectedSheetId);
    
    const dateParams = getDateRangeParams();
    if (dateParams.startDate) params.set("startDate", dateParams.startDate);
    if (dateParams.endDate) params.set("endDate", dateParams.endDate);
    
    return `/api/followups/transactions?${params.toString()}`;
  };

  const transactionsQueryUrl = buildQueryUrl();
  
  const { 
    data: transactionsData, 
    isLoading, 
    isError,
    refetch 
  } = useQuery<FollowupTransactionsResponse>({
    queryKey: [transactionsQueryUrl],
    enabled: isAdmin,
  });

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return dateString;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    const styles: Record<string, string> = {
      remark: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      dropdown_change: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      date_change: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      field_update: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return styles[eventType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const formatEventType = (eventType: string): string => {
    const labels: Record<string, string> = {
      remark: "Remark",
      dropdown_change: "Dropdown",
      date_change: "Date",
      field_update: "Field",
    };
    return labels[eventType] || eventType;
  };

  const totalPages = transactionsData ? Math.ceil(transactionsData.total / 25) : 0;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Only admins can access followup transactions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
              <History className="h-6 w-6" />
              Follow-up Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              View all follow-up events from your team
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-filter">User</Label>
                <Select 
                  value={selectedUserId} 
                  onValueChange={(v) => { setSelectedUserId(v); setPage(1); }}
                >
                  <SelectTrigger id="user-filter" data-testid="select-user-filter">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {usersData?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sheet-filter">Sheet</Label>
                <Select 
                  value={selectedSheetId} 
                  onValueChange={(v) => { setSelectedSheetId(v); setPage(1); }}
                >
                  <SelectTrigger id="sheet-filter" data-testid="select-sheet-filter">
                    <SelectValue placeholder="All sheets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sheets</SelectItem>
                    {sheetsData?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-filter">Date Range</Label>
                <Select 
                  value={dateRange} 
                  onValueChange={(v) => { setDateRange(v as DateRangeFilter); setPage(1); }}
                >
                  <SelectTrigger id="date-filter" data-testid="select-date-filter">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 gap-2">
            <div>
              <CardTitle className="text-lg">Transactions</CardTitle>
              <CardDescription>
                {transactionsData?.total ?? 0} follow-up events found
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-muted-foreground">
                Error loading transactions. Please try again.
              </div>
            ) : !transactionsData?.transactions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No follow-up transactions found for the selected filters.</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Time
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            User
                          </div>
                        </TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Sheet</TableHead>
                        <TableHead>Event Types</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsData.transactions.map((tx) => (
                        <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                          <TableCell className="font-mono text-xs">
                            {formatDate(tx.triggered_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.user_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.lead_name || "Unknown Lead"}</div>
                              <div className="text-xs text-muted-foreground">{tx.lead_mobile || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {tx.sheet_name || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tx.event_types?.map((et, i) => (
                                <Badge 
                                  key={i} 
                                  variant="secondary"
                                  className={getEventTypeBadge(et)}
                                >
                                  {formatEventType(et)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
