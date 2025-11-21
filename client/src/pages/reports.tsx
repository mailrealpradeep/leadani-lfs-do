import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetSelector } from "@/components/sheet-selector";
import { Skeleton } from "@/components/ui/skeleton";
import type { Sheet, SheetReportSummary } from "@shared/schema";

export default function Reports() {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: reportData, isLoading } = useQuery<SheetReportSummary>({
    queryKey: ["/api/sheets", selectedSheetId, "reports"],
    enabled: !!selectedSheetId,
  });

  // Auto-select first sheet (use useEffect to avoid render-phase setState)
  useEffect(() => {
    if (!selectedSheetId && sheets && sheets.length > 0) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [selectedSheetId, sheets]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <SheetSelector
            selectedSheetId={selectedSheetId}
            onSheetSelect={setSelectedSheetId}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {!selectedSheetId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="text-6xl">📈</div>
              <h2 className="text-2xl font-semibold">Select a sheet</h2>
              <p className="text-muted-foreground max-w-md">
                Choose a sheet from the dropdown above to view analytics and insights.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-total-leads">
                    {reportData.total_leads}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All leads in this sheet
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visits Scheduled</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-visits-scheduled">
                    {reportData.visits_scheduled}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upcoming visits
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-conversion-rate">
                    {reportData.conversion_rate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Converted leads
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">No Follow-ups</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-nfdt-count">
                    {reportData.nfdt_count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    NFDT leads
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Leads by Status</CardTitle>
                  <CardDescription>Distribution across lead statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData.leads_by_status).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status}</span>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    ))}
                    {Object.keys(reportData.leads_by_status).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leads by Executive</CardTitle>
                  <CardDescription>Performance by team member</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData.leads_by_executive).map(([executive, count]) => (
                      <div key={executive} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{executive || "Unassigned"}</span>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    ))}
                    {Object.keys(reportData.leads_by_executive).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Trends</CardTitle>
                <CardDescription>Lead creation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportData.daily_trends.slice(0, 7).map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{trend.date}</span>
                      <span className="text-lg font-bold">{trend.count} leads</span>
                    </div>
                  ))}
                  {reportData.daily_trends.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
