import { useQuery } from "@tanstack/react-query";
import { Users, LayoutGrid, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User, Sheet, GlobalReportSummary } from "@shared/schema";

export default function Admin() {
  const { data: globalReport, isLoading } = useQuery<GlobalReportSummary>({
    queryKey: ["/api/reports/global"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide overview and management
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-users">
                  {globalReport?.total_users || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-sheets">
                  {globalReport?.total_sheets || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active workspaces
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-leads-global">
                  {globalReport?.total_leads || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all sheets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {globalReport?.recent_activity.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recent actions
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>System users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                      data-testid={`user-${user.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads by Sheet</CardTitle>
                <CardDescription>Distribution across workspaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {globalReport?.leads_by_sheet.map((item) => (
                    <div
                      key={item.sheet_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span className="text-sm font-medium">{item.sheet_name}</span>
                      <span className="text-lg font-bold">{item.count}</span>
                    </div>
                  ))}
                  {(!globalReport?.leads_by_sheet || globalReport.leads_by_sheet.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
