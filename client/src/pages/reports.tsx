import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  PieChart, 
  Plus, 
  Trash2, 
  Edit,
  BarChart,
  LineChart as LineIcon
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Report } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReportDataResponse {
  report: Report;
  data: any;
  total_leads: number;
  generated_at: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

const REPORT_TYPES = [
  { value: "lead_status_distribution", label: "Lead Status Distribution", icon: PieChart },
  { value: "leads_over_time", label: "Leads Over Time", icon: LineIcon },
  { value: "lead_source_analysis", label: "Lead Source Analysis", icon: BarChart3 },
  { value: "conversion_rate", label: "Conversion Rate", icon: TrendingUp },
  { value: "user_performance", label: "User Performance", icon: Users },
  { value: "lead_age_distribution", label: "Lead Age Distribution", icon: BarChart },
  { value: "custom_field_analysis", label: "Custom Field Analysis", icon: BarChart3 },
];

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportType, setNewReportType] = useState("lead_status_distribution");
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);

  // Fetch all reports
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/company/reports"],
  });

  // Fetch all sheets for selection
  const { data: sheets } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch selected report data
  const { data: reportData, isLoading: dataLoading } = useQuery<ReportDataResponse>({
    queryKey: ["/api/company/reports", selectedReportId, "data"],
    enabled: !!selectedReportId,
  });

  // Create report mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest<Report>("POST", "/api/company/reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports"] });
      toast({ title: "Report created successfully" });
      setCreateDialogOpen(false);
      setNewReportName("");
      setSelectedSheetIds([]);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create report", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest("DELETE", `/api/company/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports"] });
      toast({ title: "Report deleted successfully" });
      if (selectedReportId) {
        setSelectedReportId(null);
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete report", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleCreateReport = () => {
    if (!newReportName || selectedSheetIds.length === 0) {
      toast({ 
        title: "Validation error", 
        description: "Please provide report name and select at least one sheet",
        variant: "destructive" 
      });
      return;
    }

    createMutation.mutate({
      name: newReportName,
      report_type: newReportType,
      sheet_ids: selectedSheetIds,
      config: {},
    });
  };

  const renderChart = () => {
    if (!reportData || !reportData.data) return null;

    const report = reportData.report as Report;
    const data = reportData.data;

    switch (report.report_type) {
      case "lead_status_distribution":
      case "lead_source_analysis":
      case "custom_field_analysis":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case "leads_over_time":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case "conversion_rate":
      case "user_performance":
      case "lead_age_distribution":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={report.report_type === "conversion_rate" ? "stage" : 
                              report.report_type === "user_performance" ? "user" : "range"} />
              <YAxis />
              <Tooltip />
              <Legend />
              {report.report_type === "user_performance" ? (
                <>
                  <Bar dataKey="created" fill="#3b82f6" />
                  <Bar dataKey="updated" fill="#10b981" />
                </>
              ) : (
                <Bar dataKey="count" fill="#3b82f6" />
              )}
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-center py-8 text-muted-foreground">Unsupported chart type</div>;
    }
  };

  const selectedReport = reports?.find(r => r.id === selectedReportId);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports</h1>
          {user?.role !== "user" && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-report">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      placeholder="Monthly Sales Report"
                      value={newReportName}
                      onChange={(e) => setNewReportName(e.target.value)}
                      data-testid="input-report-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={newReportType} onValueChange={setNewReportType}>
                      <SelectTrigger data-testid="select-report-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Sheets</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {sheets?.map((sheet) => (
                        <label key={sheet.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSheetIds.includes(sheet.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSheetIds([...selectedSheetIds, sheet.id]);
                              } else {
                                setSelectedSheetIds(selectedSheetIds.filter(id => id !== sheet.id));
                              }
                            }}
                            data-testid={`checkbox-sheet-${sheet.id}`}
                          />
                          <span className="text-sm">{sheet.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateReport} 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create-report"
                  >
                    Create Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Reports List Sidebar */}
        <div className="w-80 border-r overflow-y-auto">
          <div className="p-4 space-y-2">
            <h2 className="font-semibold text-sm text-muted-foreground mb-3">Saved Reports</h2>
            {reportsLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : reports && reports.length > 0 ? (
              reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    selectedReportId === report.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedReportId(report.id)}
                  data-testid={`card-report-${report.id}`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm">{report.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                        </CardDescription>
                      </div>
                      {user?.role !== "user" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this report?")) {
                              deleteMutation.mutate(report.id);
                            }
                          }}
                          data-testid={`button-delete-report-${report.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No reports yet. Create your first report!
              </div>
            )}
          </div>
        </div>

        {/* Report Display Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedReportId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="text-6xl">📊</div>
                <h2 className="text-2xl font-semibold">Select a Report</h2>
                <p className="text-muted-foreground max-w-md">
                  Choose a report from the list to view insights and analytics.
                </p>
              </div>
            </div>
          ) : dataLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-12" />
              <Skeleton className="h-96" />
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedReport?.name}</h2>
                <p className="text-muted-foreground mt-1">
                  {REPORT_TYPES.find(t => t.value === selectedReport?.report_type)?.label}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{reportData.total_leads} leads analyzed</span>
                  <span>•</span>
                  <span>Generated {new Date(reportData.generated_at).toLocaleString()}</span>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderChart()}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
