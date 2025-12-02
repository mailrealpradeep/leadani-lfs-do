import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart3,
  Plus,
  Trash2,
  PieChart,
  BarChart,
  LineChart as LineIcon,
  Pencil,
  ChevronDown,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Report } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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

export function UserReportsManager() {
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
  const [aggregation, setAggregation] = useState("count");
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch only user reports (is_user_report = true)
  const { data: userReports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/company/reports/user-reports"],
  });

  // Fetch all sheets for selection
  const { data: sheets } = useQuery<any[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch columns from company
  const { data: companyColumns } = useQuery<any[]>({
    queryKey: ["/api/company/columns"],
  });

  // Build list of available columns
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
    
    const specialColumns = [
      "sheet_name",
      "user_name",
    ];

    const customColumnKeys = companyColumns?.map((col: any) => col.column_key) || [];
    const allColumns = [...fixedColumns, ...specialColumns, ...customColumnKeys];
    const uniqueColumns = Array.from(new Set(allColumns));
    setAvailableColumns(uniqueColumns);
  }, [companyColumns]);

  const resetBuilder = () => {
    setReportName("");
    setVisualizationType("chart");
    setChartType("bar");
    setXAxis("");
    setYAxis("count");
    setYAxisField("");
    setRowFields([]);
    setColumnField("");
    setAggregation("count");
    setSelectedSheetIds([]);
    setEditingReport(null);
  };

  // Create user report mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest<Report>("POST", "/api/company/reports", {
        ...data,
        is_user_report: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports/user-reports"] });
      toast({ title: "User report created successfully" });
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
      return apiRequest<Report>("PATCH", `/api/company/reports/${id}`, {
        ...data,
        is_user_report: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports/user-reports"] });
      toast({ title: "Report updated successfully" });
      setBuilderOpen(false);
      resetBuilder();
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
      queryClient.invalidateQueries({ queryKey: ["/api/company/reports/user-reports"] });
      toast({ title: "Report deleted successfully" });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setReportName(report.name);
    const config = report.config || {};
    
    if (report.report_type === "pivot_table") {
      setVisualizationType("pivot_table");
      setRowFields(config.row_fields || []);
      setColumnField(config.column_field || "");
      setAggregation(config.aggregation || "count");
    } else {
      setVisualizationType("chart");
      setChartType(config.chart_type || "bar");
      setXAxis(config.x_axis || "");
      setYAxis(config.y_axis || "count");
      setYAxisField(config.y_axis_field || "");
    }
    
    setSelectedSheetIds(report.sheet_ids || []);
    setBuilderOpen(true);
  };

  const handleSaveReport = () => {
    if (!reportName.trim()) {
      toast({ title: "Report name is required", variant: "destructive" });
      return;
    }

    let reportType = "custom";
    let config: any = {};

    if (visualizationType === "chart") {
      if (!xAxis) {
        toast({ title: "X-axis selection is required", variant: "destructive" });
        return;
      }
      config = {
        chart_type: chartType,
        x_axis: xAxis,
        y_axis: yAxis,
        y_axis_field: yAxis !== "count" ? yAxisField : undefined,
      };
    } else {
      if (rowFields.length === 0) {
        toast({ title: "At least one row field is required", variant: "destructive" });
        return;
      }
      reportType = "pivot_table";
      config = {
        row_fields: rowFields,
        column_field: columnField || undefined,
        aggregation: aggregation,
      };
    }

    const data = {
      name: reportName,
      report_type: reportType,
      sheet_ids: selectedSheetIds.length > 0 ? selectedSheetIds : (sheets?.map(s => s.id) || []),
      config,
    };

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRowFieldToggle = (field: string) => {
    setRowFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSheetToggle = (sheetId: string) => {
    setSelectedSheetIds(prev =>
      prev.includes(sheetId)
        ? prev.filter(id => id !== sheetId)
        : [...prev, sheetId]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Reports created here will be visible to all users in your company, showing their own data.
        </div>
        <Button onClick={() => setBuilderOpen(true)} size="sm" data-testid="button-create-user-report">
          <Plus className="h-4 w-4 mr-2" />
          New User Report
        </Button>
      </div>

      {!userReports || userReports.length === 0 ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No user reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create reports that all users can see, filtered to their own data
            </p>
            <Button onClick={() => setBuilderOpen(true)} size="sm" data-testid="button-create-first-user-report">
              <Plus className="h-4 w-4 mr-2" />
              Create First Report
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userReports.map((report) => (
            <Card key={report.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate flex items-center gap-2" data-testid={`user-report-name-${report.id}`}>
                      {report.report_type === "pivot_table" ? (
                        <BarChart className="h-4 w-4 shrink-0" />
                      ) : (
                        <BarChart3 className="h-4 w-4 shrink-0" />
                      )}
                      {report.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {report.report_type === "pivot_table" ? "Pivot Table" : "Chart"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Users className="h-3 w-3 mr-1" />
                    For Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditReport(report)}
                    data-testid={`edit-user-report-${report.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReportToDelete(report);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`delete-user-report-${report.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={(open) => {
        setBuilderOpen(open);
        if (!open) resetBuilder();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit User Report" : "Create User Report"}</DialogTitle>
            <DialogDescription>
              This report will be visible to all users, showing data filtered to their assigned sheets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="user-report-name">Report Name</Label>
              <Input
                id="user-report-name"
                placeholder="My Daily Performance"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                data-testid="input-user-report-name"
              />
            </div>

            {/* Visualization Type */}
            <div className="space-y-2">
              <Label>Visualization Type</Label>
              <Select value={visualizationType} onValueChange={setVisualizationType}>
                <SelectTrigger data-testid="select-user-viz-type">
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
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger data-testid="select-user-chart-type">
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

                <div className="space-y-2">
                  <Label>X-Axis (Group By)</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger data-testid="select-user-x-axis">
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

                <div className="space-y-2">
                  <Label>Y-Axis (Metric)</Label>
                  <Select value={yAxis} onValueChange={setYAxis}>
                    <SelectTrigger data-testid="select-user-y-axis">
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

                {yAxis !== "count" && (
                  <div className="space-y-2">
                    <Label>Field to {yAxis === "sum" ? "Sum" : "Average"}</Label>
                    <Select value={yAxisField} onValueChange={setYAxisField}>
                      <SelectTrigger data-testid="select-user-y-axis-field">
                        <SelectValue placeholder="Select field" />
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
                <div className="space-y-2">
                  <Label>Row Fields (Group By)</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {availableColumns.map((col) => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox
                          id={`row-${col}`}
                          checked={rowFields.includes(col)}
                          onCheckedChange={() => handleRowFieldToggle(col)}
                        />
                        <label htmlFor={`row-${col}`} className="text-sm cursor-pointer">
                          {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                  {rowFields.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Selected: {rowFields.map(f => f.replace(/_/g, " ")).join(", ")}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Column Field (Optional - for cross-tabulation)</Label>
                  <Select value={columnField} onValueChange={setColumnField}>
                    <SelectTrigger data-testid="select-user-column-field">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aggregation</Label>
                  <Select value={aggregation} onValueChange={setAggregation}>
                    <SelectTrigger data-testid="select-user-aggregation">
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
              </>
            )}

            {/* Sheet Selection */}
            <div className="space-y-2">
              <Label>Include Sheets (leave empty for all)</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {sheets?.map((sheet) => (
                  <div key={sheet.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sheet-${sheet.id}`}
                      checked={selectedSheetIds.includes(sheet.id)}
                      onCheckedChange={() => handleSheetToggle(sheet.id)}
                    />
                    <label htmlFor={`sheet-${sheet.id}`} className="text-sm cursor-pointer">
                      {sheet.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedSheetIds.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {selectedSheetIds.length} sheet(s) selected
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBuilderOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveReport}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-user-report"
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingReport ? "Update Report" : "Create Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reportToDelete?.name}"? This report will no longer be available to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && deleteMutation.mutate(reportToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user-report"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
