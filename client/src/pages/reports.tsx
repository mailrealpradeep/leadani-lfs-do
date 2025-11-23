import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart3,
  Plus,
  Trash2,
  PieChart,
  BarChart,
  LineChart as LineIcon,
  X,
  Pencil,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";

interface ReportDataResponse {
  report: Report;
  data: any;
  total_leads: number;
  generated_at: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

const VISUALIZATION_TYPES = [
  { value: "chart", label: "Chart", icon: BarChart3 },
  { value: "pivot_table", label: "Pivot Table", icon: BarChart },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart },
  { value: "line", label: "Line Chart", icon: LineIcon },
  { value: "pie", label: "Pie Chart", icon: PieChart },
];

const Y_AXIS_TYPES = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
];

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [reportName, setReportName] = useState("");
  const [visualizationType, setVisualizationType] = useState("chart");
  const [chartType, setChartType] = useState("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("count");
  const [yAxisField, setYAxisField] = useState("");
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnField, setColumnField] = useState("");
  const [valueField, setValueField] = useState("");
  const [aggregation, setAggregation] = useState("count");
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Fetch all reports
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/company/reports"],
  });

  // Fetch all sheets for selection
  const { data: sheets } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch columns from company
  const { data: companyColumns } = useQuery<any[]>({
    queryKey: ["/api/company/columns"],
  });

  // Build list of available columns (fixed + custom)
  useEffect(() => {
    const fixedColumns = [
      "full_name",
      "phone_number",
      "alternative_phone",
      "email",
      "lead_status",
      "lead_type",
      "lead_source",
      "occupation",
      "company",
      "address",
      "city",
      "state",
      "country",
      "pincode",
    ];

    const customColumnKeys = companyColumns?.map((col: any) => col.column_key) || [];
    // Deduplicate columns to avoid React key warnings
    const allColumns = [...fixedColumns, ...customColumnKeys];
    const uniqueColumns = Array.from(new Set(allColumns));
    setAvailableColumns(uniqueColumns);
  }, [companyColumns]);

  // Create report mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest<Report>("POST", "/api/company/reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports"] });
      toast({ title: "Report created successfully" });
      setBuilderOpen(false);
      resetBuilder();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update report mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest<Report>("PATCH", `/api/company/reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports"] });
      toast({ title: "Report updated successfully" });
      setBuilderOpen(false);
      resetBuilder();
      setEditingReport(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update report",
        description: error.message,
        variant: "destructive",
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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetBuilder = () => {
    setReportName("");
    setVisualizationType("chart");
    setChartType("bar");
    setXAxis("");
    setYAxis("count");
    setYAxisField("");
    setRowFields([]);
    setColumnField("");
    setValueField("");
    setAggregation("count");
    setSelectedSheetIds([]);
    setEditingReport(null);
  };

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setReportName(report.name);
    setSelectedSheetIds(report.sheet_ids || []);

    if (report.report_type === "pivot_table") {
      setVisualizationType("pivot_table");
      const config = report.config || {};
      setRowFields(config.row_fields || []);
      setColumnField(config.column_field || "");
      setAggregation(config.aggregation || "count");
      setValueField(config.value_field || "");
    } else {
      setVisualizationType("chart");
      const config = report.config || {};
      setChartType(config.chart_type || "bar");
      setXAxis(config.x_axis || "");
      setYAxis(config.y_axis || "count");
      setYAxisField(config.y_axis_field || "");
    }

    setBuilderOpen(true);
  };

  const handleSaveReport = () => {
    if (!reportName || selectedSheetIds.length === 0) {
      toast({
        title: "Validation error",
        description: "Please provide report name and select at least one sheet",
        variant: "destructive",
      });
      return;
    }

    let config: any = {};
    let reportType = "custom";

    if (visualizationType === "chart") {
      if (!xAxis) {
        toast({
          title: "Validation error",
          description: "Please select an X-axis for the chart",
          variant: "destructive",
        });
        return;
      }

      config = {
        chart_type: chartType,
        x_axis: xAxis,
        y_axis: yAxis,
      };

      if (yAxis !== "count" && yAxisField) {
        config.y_axis_field = yAxisField;
      }
    } else {
      // Pivot table
      if (rowFields.length === 0) {
        toast({
          title: "Validation error",
          description: "Please select at least one row field for the pivot table",
          variant: "destructive",
        });
        return;
      }

      reportType = "pivot_table";
      config = {
        row_fields: rowFields,
        column_field: columnField || undefined,
        aggregation,
      };

      if (aggregation !== "count" && valueField) {
        config.value_field = valueField;
      }
    }

    const reportData = {
      name: reportName,
      report_type: reportType,
      sheet_ids: selectedSheetIds,
      config,
    };

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data: reportData });
    } else {
      createMutation.mutate(reportData);
    }
  };

  const handleSheetToggle = (sheetId: string) => {
    setSelectedSheetIds((prev) =>
      prev.includes(sheetId)
        ? prev.filter((id) => id !== sheetId)
        : [...prev, sheetId]
    );
  };

  if (reportsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Reports</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build custom reports with dynamic axis selection
          </p>
        </div>
        {user?.role !== "user" && (
          <Button onClick={() => setBuilderOpen(true)} data-testid="button-create-report">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        )}
      </div>

      {/* Empty State */}
      {!reports || reports.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first custom report to visualize your data
            </p>
            {user?.role !== "user" && (
              <Button onClick={() => setBuilderOpen(true)} data-testid="button-create-first-report">
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-6">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={() => handleEditReport(report)}
              onDelete={() => deleteMutation.mutate(report.id)}
              canEdit={user?.role !== "user"}
              canDelete={user?.role !== "user"}
            />
          ))}
        </div>
      )}

      {/* Report Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={(open) => {
        setBuilderOpen(open);
        if (!open) {
          resetBuilder();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit Report" : "Build Custom Report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="Sales by Status"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                data-testid="input-report-name"
              />
            </div>

            {/* Visualization Type */}
            <div className="space-y-2">
              <Label htmlFor="viz-type">Visualization Type</Label>
              <Select value={visualizationType} onValueChange={setVisualizationType}>
                <SelectTrigger id="viz-type" data-testid="select-viz-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISUALIZATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Configuration */}
            {visualizationType === "chart" && (
              <>
                {/* Chart Type */}
                <div className="space-y-2">
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger id="chart-type" data-testid="select-chart-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* X-Axis */}
                <div className="space-y-2">
                  <Label htmlFor="x-axis">X-Axis (Group By)</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger id="x-axis" data-testid="select-x-axis">
                      <SelectValue placeholder="Select column to group by" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Y-Axis */}
                <div className="space-y-2">
                  <Label htmlFor="y-axis">Y-Axis (Aggregation)</Label>
                  <Select value={yAxis} onValueChange={setYAxis}>
                    <SelectTrigger id="y-axis" data-testid="select-y-axis">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Y_AXIS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Y-Axis Field (for sum/avg) */}
                {(yAxis === "sum" || yAxis === "avg") && (
                  <div className="space-y-2">
                    <Label htmlFor="y-axis-field">Field to {yAxis === "sum" ? "Sum" : "Average"}</Label>
                    <Select value={yAxisField} onValueChange={setYAxisField}>
                      <SelectTrigger id="y-axis-field" data-testid="select-y-axis-field">
                        <SelectValue placeholder="Select numeric field" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Pivot Table Configuration */}
            {visualizationType === "pivot_table" && (
              <>
                {/* Row Fields (Multi-select) */}
                <div className="space-y-2">
                  <Label>Row Fields (select multiple)</Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                    {availableColumns.length > 0 ? (
                      availableColumns.map((col) => (
                        <div key={col} className="flex items-center space-x-2">
                          <Checkbox
                            id={`row-${col}`}
                            checked={rowFields.includes(col)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRowFields([...rowFields, col]);
                              } else {
                                setRowFields(rowFields.filter((f) => f !== col));
                              }
                            }}
                            data-testid={`checkbox-row-${col}`}
                          />
                          <label htmlFor={`row-${col}`} className="text-sm cursor-pointer">
                            {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading columns...</p>
                    )}
                  </div>
                  {rowFields.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {rowFields.map((f) => f.replace(/_/g, " ")).join(", ")}
                    </p>
                  )}
                </div>

                {/* Column Field (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="column-field">Column Field (optional)</Label>
                  <Select value={columnField || undefined} onValueChange={(val) => setColumnField(val || "")}>
                    <SelectTrigger id="column-field" data-testid="select-column-field">
                      <SelectValue placeholder="None (select to add column pivot)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columnField && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setColumnField("")}
                      className="w-full"
                    >
                      Clear Column Field
                    </Button>
                  )}
                </div>

                {/* Aggregation */}
                <div className="space-y-2">
                  <Label htmlFor="aggregation">Aggregation</Label>
                  <Select value={aggregation} onValueChange={setAggregation}>
                    <SelectTrigger id="aggregation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Y_AXIS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Field (for sum/avg) */}
                {(aggregation === "sum" || aggregation === "avg") && (
                  <div className="space-y-2">
                    <Label htmlFor="value-field">Value Field</Label>
                    <Select value={valueField} onValueChange={setValueField}>
                      <SelectTrigger id="value-field">
                        <SelectValue placeholder="Select field to aggregate" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Sheet Selection */}
            <div className="space-y-2">
              <Label>Select Sheets</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {sheets && sheets.length > 0 ? (
                  sheets.map((sheet) => (
                    <div key={sheet.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sheet-${sheet.id}`}
                        checked={selectedSheetIds.includes(sheet.id)}
                        onCheckedChange={() => handleSheetToggle(sheet.id)}
                        data-testid={`checkbox-sheet-${sheet.id}`}
                      />
                      <label
                        htmlFor={`sheet-${sheet.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {sheet.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No sheets available</p>
                )}
              </div>
              {selectedSheetIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSheetIds.length} sheet{selectedSheetIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBuilderOpen(false);
                resetBuilder();
              }}
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReport}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-report"
            >
              {editingReport
                ? updateMutation.isPending ? "Updating..." : "Update Report"
                : createMutation.isPending ? "Creating..." : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Report Card Component
function ReportCard({
  report,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  report: Report;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { data: reportData, isLoading } = useQuery<ReportDataResponse>({
    queryKey: ["/api/company/reports", report.id, "data"],
  });

  const renderVisualization = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">Loading data...</div>
        </div>
      );
    }

    if (!reportData || !reportData.data) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">No data available</div>
        </div>
      );
    }

    const data = reportData.data;

    // Render pivot table
    if (report.report_type === "pivot_table") {
      if (!data.rows || data.rows.length === 0) {
        return <div className="text-sm text-muted-foreground p-4">No data</div>;
      }

      // Simple table (no column pivot)
      if (data.type === "simple") {
        return (
          <div className="overflow-x-auto max-h-96">
            <table className="text-sm" style={{ width: "auto", minWidth: "100%" }}>
              <thead className="bg-muted">
                <tr>
                  {data.rowFields.map((field: string, i: number) => (
                    <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {field.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {data.aggregation === "count" ? "Count" : data.aggregation === "sum" ? "Sum" : "Average"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any, i: number) => (
                  <tr key={i} className="border-b hover-elevate">
                    {row.keys.map((key: string, j: number) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap">{key}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Full pivot table (with column pivot)
      return (
        <div className="overflow-x-auto max-h-96">
          <table className="text-sm" style={{ width: "auto", minWidth: "100%" }}>
            <thead className="bg-muted">
              <tr>
                {data.rowFields.map((field: string, i: number) => (
                  <th key={i} className="px-3 py-2 text-left font-medium sticky left-0 bg-muted whitespace-nowrap z-10">
                    {field.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </th>
                ))}
                {data.columns.map((col: string) => (
                  <th key={col} className="px-3 py-2 text-right font-medium whitespace-nowrap">{col}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row: any, i: number) => (
                <tr key={i} className="border-b hover-elevate">
                  {row.keys.map((key: string, j: number) => (
                    <td key={j} className="px-3 py-2 sticky left-0 bg-background whitespace-nowrap z-10">{key}</td>
                  ))}
                  {data.columns.map((col: string) => (
                    <td key={col} className="px-3 py-2 text-right whitespace-nowrap">{row[col] || 0}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Render charts
    const chartType = report.config?.chart_type || "bar";

    switch (chartType) {
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case "bar":
      default:
        return (
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card 
      data-testid={`card-report-${report.id}`}
      className="w-fit min-w-[300px] max-w-full"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg">{report.name}</CardTitle>
          {reportData && (
            <CardDescription className="text-xs mt-1">
              {reportData.total_leads} total leads
            </CardDescription>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-report-${report.id}`}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-report-${report.id}`}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{renderVisualization()}</CardContent>
    </Card>
  );
}
