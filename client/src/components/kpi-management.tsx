import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  Target,
  Plus,
  Trash2,
  Users,
  TrendingUp,
  Calendar,
  Edit,
  BarChart3,
  AlertCircle,
  Check,
  Hash,
  Sigma,
  Percent,
  RefreshCw,
  Activity,
  Clock,
  Award,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  CompanyKpiRecord,
  SimpleTargetRecord,
  Sheet,
  User,
  CustomColumn,
} from "@shared/schema";

const METRIC_TYPES = [
  { value: "lead_count", label: "Lead Count", icon: Hash, description: "Count leads matching conditions", requiresColumn: false },
  { value: "status_transition", label: "Status Transition", icon: RefreshCw, description: "Track status changes (e.g., Lead → Admission)", requiresColumn: true, columnType: "dropdown" },
  { value: "field_sum", label: "Field Sum", icon: Sigma, description: "Sum of a numeric field", requiresColumn: true, columnType: "number" },
  { value: "field_average", label: "Field Average", icon: BarChart3, description: "Average of a numeric field", requiresColumn: true, columnType: "number" },
  { value: "updates_count", label: "Update Count", icon: Activity, description: "Number of lead updates", requiresColumn: false },
  { value: "hours_worked", label: "Hours Worked", icon: Clock, description: "Attendance hours", requiresColumn: false },
  { value: "conversion_rate", label: "Conversion Rate", icon: Percent, description: "Conversion percentage", requiresColumn: true, columnType: "dropdown" },
] as const;

const PERIOD_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time" },
] as const;

const kpiFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  metric_type: z.string().min(1, "Metric type is required"),
  column_id: z.string().optional(), // For metrics that require column selection
  sheet_scope: z.enum(["all", "specific"]),
  sheet_ids: z.array(z.string()).optional(),
  config: z.any().optional(),
  is_active: z.boolean().default(true),
});

type KpiFormData = z.infer<typeof kpiFormSchema>;

const targetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kpi_id: z.string().min(1, "KPI is required"),
  target_value: z.number().min(0, "Target must be a positive number"),
  period_type: z.string().min(1, "Period is required"),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  assignment_type: z.enum(["all_users", "specific_users"]),
  user_ids: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

interface EnrichedTarget extends SimpleTargetRecord {
  kpi_name?: string;
  kpi_metric_type?: string;
}

export function KpiManagement() {
  const { toast } = useToast();
  const { formatDateTime } = useCompanyTimezone();
  const [activeTab, setActiveTab] = useState("kpis");
  
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<CompanyKpiRecord | null>(null);
  const [deleteKpiId, setDeleteKpiId] = useState<string | null>(null);
  
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<EnrichedTarget | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: kpis = [], isLoading: kpisLoading } = useQuery<CompanyKpiRecord[]>({
    queryKey: ["/api/kpis"],
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery<EnrichedTarget[]>({
    queryKey: ["/api/simple-targets"],
  });

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all company columns for dynamic column picker
  const { data: allColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const kpiForm = useForm<KpiFormData>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      name: "",
      description: "",
      metric_type: "",
      column_id: "",
      sheet_scope: "all",
      sheet_ids: [],
      is_active: true,
    },
  });

  const targetForm = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      kpi_id: "",
      target_value: 0,
      period_type: "monthly",
      assignment_type: "all_users",
      user_ids: [],
      is_active: true,
    },
  });

  // Watch for metric type changes to filter columns
  const watchedMetricType = kpiForm.watch("metric_type");
  const selectedMetric = METRIC_TYPES.find(m => m.value === watchedMetricType);
  
  const filteredColumns = allColumns.filter(col => {
    if (!selectedMetric?.requiresColumn) return false;
    if (selectedMetric.columnType === "dropdown") {
      return col.type === "dropdown";
    }
    if (selectedMetric.columnType === "number") {
      return col.type === "number" || col.type === "percentage";
    }
    return false;
  });

  const createKpiMutation = useMutation({
    mutationFn: async (data: KpiFormData) => {
      // Find the selected column to include its details in config
      const selectedColumn = allColumns.find(col => col.id === data.column_id);
      const config: Record<string, any> = data.config || {};
      
      // If metric requires a column, add column reference to config
      if (data.column_id && selectedColumn) {
        config.column_id = selectedColumn.id;
        config.column_key = selectedColumn.column_key;
        config.column_name = selectedColumn.name;
      }
      
      const payload = {
        name: data.name,
        description: data.description || null,
        metric_type: data.metric_type,
        scope_type: data.sheet_scope === "specific" ? "sheet_specific" : "company_wide",
        scope_sheet_ids: data.sheet_scope === "specific" ? data.sheet_ids : null,
        config,
        is_active: data.is_active,
      };
      return apiRequest("POST", "/api/kpis", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      setKpiDialogOpen(false);
      kpiForm.reset();
      toast({ title: "KPI Created", description: "The KPI has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KpiFormData> }) => {
      // Find the selected column to include its details in config
      const selectedColumn = allColumns.find(col => col.id === data.column_id);
      const config: Record<string, any> = data.config || {};
      
      // If metric requires a column, add column reference to config
      if (data.column_id && selectedColumn) {
        config.column_id = selectedColumn.id;
        config.column_key = selectedColumn.column_key;
        config.column_name = selectedColumn.name;
      }
      
      const payload = {
        name: data.name,
        description: data.description || null,
        metric_type: data.metric_type,
        scope_type: data.sheet_scope === "specific" ? "sheet_specific" : "company_wide",
        scope_sheet_ids: data.sheet_scope === "specific" ? data.sheet_ids : null,
        config,
        is_active: data.is_active,
      };
      return apiRequest("PATCH", `/api/kpis/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/simple-targets"] });
      setKpiDialogOpen(false);
      setEditingKpi(null);
      kpiForm.reset();
      toast({ title: "KPI Updated", description: "The KPI has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/kpis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      setDeleteKpiId(null);
      toast({ title: "KPI Deleted", description: "The KPI has been deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const payload = {
        name: data.name,
        kpi_id: data.kpi_id,
        target_value: data.target_value,
        period_type: data.period_type,
        start_date: data.start_date?.toISOString() || new Date().toISOString(),
        end_date: data.end_date?.toISOString(),
        assignment_type: data.assignment_type === "specific_users" ? "specific_users" : "all_users",
        assigned_user_ids: data.assignment_type === "specific_users" ? data.user_ids : null,
        is_active: data.is_active,
      };
      return apiRequest("POST", "/api/simple-targets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simple-targets"] });
      setTargetDialogOpen(false);
      targetForm.reset();
      toast({ title: "Target Created", description: "The target has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TargetFormData> }) => {
      const payload = {
        name: data.name,
        kpi_id: data.kpi_id,
        target_value: data.target_value,
        period_type: data.period_type,
        start_date: data.start_date?.toISOString(),
        end_date: data.end_date?.toISOString(),
        assignment_type: data.assignment_type === "specific_users" ? "specific_users" : "all_users",
        assigned_user_ids: data.assignment_type === "specific_users" ? data.user_ids : null,
        is_active: data.is_active,
      };
      return apiRequest("PATCH", `/api/simple-targets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simple-targets"] });
      setTargetDialogOpen(false);
      setEditingTarget(null);
      targetForm.reset();
      toast({ title: "Target Updated", description: "The target has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/simple-targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simple-targets"] });
      setDeleteTargetId(null);
      toast({ title: "Target Deleted", description: "The target has been deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditKpi = (kpi: CompanyKpiRecord) => {
    setEditingKpi(kpi);
    const config = kpi.config as Record<string, any> || {};
    kpiForm.reset({
      name: kpi.name,
      description: kpi.description || "",
      metric_type: kpi.metric_type,
      column_id: config.column_id || "",
      sheet_scope: kpi.scope_type === "sheet_specific" ? "specific" : "all",
      sheet_ids: kpi.scope_sheet_ids || [],
      is_active: kpi.is_active ?? true,
    });
    setKpiDialogOpen(true);
  };

  const openEditTarget = (target: EnrichedTarget) => {
    setEditingTarget(target);
    targetForm.reset({
      name: target.name,
      kpi_id: target.kpi_id,
      target_value: target.target_value,
      period_type: target.period_type,
      start_date: target.start_date ? new Date(target.start_date) : undefined,
      end_date: target.end_date ? new Date(target.end_date) : undefined,
      assignment_type: target.assigned_user_ids ? "specific_users" : "all_users",
      user_ids: target.assigned_user_ids || [],
      is_active: target.is_active ?? true,
    });
    setTargetDialogOpen(true);
  };

  const handleKpiSubmit = (data: KpiFormData) => {
    if (editingKpi) {
      updateKpiMutation.mutate({ id: editingKpi.id, data });
    } else {
      createKpiMutation.mutate(data);
    }
  };

  const handleTargetSubmit = (data: TargetFormData) => {
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const getMetricIcon = (type: string) => {
    const metric = METRIC_TYPES.find(m => m.value === type);
    return metric?.icon || Target;
  };

  const getMetricLabel = (type: string) => {
    const metric = METRIC_TYPES.find(m => m.value === type);
    return metric?.label || type;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kpis" className="flex items-center gap-2" data-testid="tab-kpis">
            <BarChart3 className="h-4 w-4" />
            Define KPIs
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2" data-testid="tab-targets">
            <Target className="h-4 w-4" />
            Assign Targets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
              <p className="text-sm text-muted-foreground">
                Define what metrics to track for your team
              </p>
            </div>
            <Button onClick={() => { setEditingKpi(null); kpiForm.reset(); setKpiDialogOpen(true); }} data-testid="button-create-kpi">
              <Plus className="h-4 w-4 mr-2" />
              Create KPI
            </Button>
          </div>

          {kpisLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : kpis.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">No KPIs defined yet</h3>
                  <p className="text-muted-foreground">
                    Create your first KPI to start tracking team performance
                  </p>
                </div>
                <Button onClick={() => setKpiDialogOpen(true)} data-testid="button-create-first-kpi">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First KPI
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => {
                const Icon = getMetricIcon(kpi.metric_type);
                const targetCount = targets.filter(t => t.kpi_id === kpi.id).length;
                const kpiConfig = kpi.config as Record<string, any> || {};
                const metricInfo = METRIC_TYPES.find(m => m.value === kpi.metric_type);
                return (
                  <Card key={kpi.id} className="hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{kpi.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {getMetricLabel(kpi.metric_type)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditKpi(kpi)} data-testid={`button-edit-kpi-${kpi.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteKpiId(kpi.id)} data-testid={`button-delete-kpi-${kpi.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {kpi.description && (
                        <p className="text-sm text-muted-foreground">{kpi.description}</p>
                      )}
                      {/* Show tracked column if metric requires one */}
                      {metricInfo?.requiresColumn && kpiConfig.column_name && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tracking Column:</span>
                          <Badge variant="outline" className="font-medium">
                            {kpiConfig.column_name}
                          </Badge>
                        </div>
                      )}
                      {/* Warning if column is required but not set */}
                      {metricInfo?.requiresColumn && !kpiConfig.column_id && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>No column selected - edit to configure</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Scope:</span>
                        <span>{kpi.scope_sheet_ids ? `${kpi.scope_sheet_ids.length} sheets` : "All sheets"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Targets using this KPI:</span>
                        <Badge variant="outline">{targetCount}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={kpi.is_active ? "default" : "secondary"}>
                          {kpi.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="targets" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Target Assignments</h3>
              <p className="text-sm text-muted-foreground">
                Assign KPIs to users with specific target values
              </p>
            </div>
            <Button 
              onClick={() => { setEditingTarget(null); targetForm.reset(); setTargetDialogOpen(true); }} 
              disabled={kpis.length === 0}
              data-testid="button-create-target"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Target
            </Button>
          </div>

          {kpis.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <div>
                  <h3 className="font-semibold text-lg">Create KPIs first</h3>
                  <p className="text-muted-foreground">
                    You need to define at least one KPI before you can create targets
                  </p>
                </div>
                <Button onClick={() => setActiveTab("kpis")}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Go to KPI Tab
                </Button>
              </div>
            </Card>
          ) : targetsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : targets.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Target className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">No targets assigned yet</h3>
                  <p className="text-muted-foreground">
                    Assign KPIs to your team with specific target values
                  </p>
                </div>
                <Button onClick={() => setTargetDialogOpen(true)} data-testid="button-create-first-target">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Target
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {targets.map((target) => (
                <Card key={target.id} className="hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{target.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Award className="h-3 w-3" />
                          {target.kpi_name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTarget(target)} data-testid={`button-edit-target-${target.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(target.id)} data-testid={`button-delete-target-${target.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{target.target_value}</span>
                      <Badge variant="outline">
                        {PERIOD_TYPES.find(p => p.value === target.period_type)?.label || target.period_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Assigned to:
                      </span>
                      <span>{target.assigned_user_ids ? `${target.assigned_user_ids.length} users` : "All users"}</span>
                    </div>
                    {(target.start_date || target.end_date) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Period:
                        </span>
                        <span className="text-xs">
                          {target.start_date && format(new Date(target.start_date), "MMM d, yy")}
                          {target.start_date && target.end_date && " - "}
                          {target.end_date && format(new Date(target.end_date), "MMM d, yy")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={target.is_active ? "default" : "secondary"}>
                        {target.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={kpiDialogOpen} onOpenChange={(open) => { setKpiDialogOpen(open); if (!open) setEditingKpi(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKpi ? "Edit KPI" : "Create KPI"}</DialogTitle>
            <DialogDescription>
              Define a key performance indicator to track
            </DialogDescription>
          </DialogHeader>
          <Form {...kpiForm}>
            <form onSubmit={kpiForm.handleSubmit(handleKpiSubmit)} className="space-y-4">
              <FormField
                control={kpiForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lead Conversion Rate" {...field} data-testid="input-kpi-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={kpiForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe what this KPI measures..." {...field} data-testid="input-kpi-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={kpiForm.control}
                name="metric_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metric Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset column selection when metric type changes
                      kpiForm.setValue("column_id", "");
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-kpi-metric-type">
                          <SelectValue placeholder="Select metric type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METRIC_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {METRIC_TYPES.find(t => t.value === field.value)?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Column picker - shown when metric type requires a column selection */}
              {selectedMetric?.requiresColumn && (
                <FormField
                  control={kpiForm.control}
                  name="column_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedMetric.columnType === "dropdown" ? "Select Status/Stage Column" : "Select Numeric Column"}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-kpi-column">
                            <SelectValue placeholder={`Select a ${selectedMetric.columnType} column`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredColumns.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No {selectedMetric.columnType} columns found in your company schema
                            </div>
                          ) : (
                            filteredColumns.map((col) => (
                              <SelectItem key={col.id} value={col.id}>
                                <div className="flex items-center gap-2">
                                  <span>{col.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {col.type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedMetric.columnType === "dropdown" 
                          ? "Choose the column that tracks status or stage transitions" 
                          : "Choose the numeric column to sum or average"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={kpiForm.control}
                name="sheet_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-kpi-sheet-scope">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Sheets</SelectItem>
                        <SelectItem value="specific">Specific Sheets</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {kpiForm.watch("sheet_scope") === "specific" && (
                <FormField
                  control={kpiForm.control}
                  name="sheet_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Sheets</FormLabel>
                      <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-auto">
                        {sheets.map((sheet) => (
                          <div key={sheet.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value?.includes(sheet.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, sheet.id]);
                                } else {
                                  field.onChange(current.filter((id: string) => id !== sheet.id));
                                }
                              }}
                              data-testid={`checkbox-sheet-${sheet.id}`}
                            />
                            <span className="text-sm">{sheet.name}</span>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={kpiForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Enable or disable this KPI</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-kpi-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setKpiDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createKpiMutation.isPending || updateKpiMutation.isPending}
                  data-testid="button-save-kpi"
                >
                  {(createKpiMutation.isPending || updateKpiMutation.isPending) ? "Saving..." : "Save KPI"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={targetDialogOpen} onOpenChange={(open) => { setTargetDialogOpen(open); if (!open) setEditingTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTarget ? "Edit Target" : "Create Target"}</DialogTitle>
            <DialogDescription>
              Assign a KPI to users with a target value
            </DialogDescription>
          </DialogHeader>
          <Form {...targetForm}>
            <form onSubmit={targetForm.handleSubmit(handleTargetSubmit)} className="space-y-4">
              <FormField
                control={targetForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Sales Target" {...field} data-testid="input-target-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={targetForm.control}
                name="kpi_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-target-kpi">
                          <SelectValue placeholder="Select a KPI" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpis.filter(k => k.is_active).map((kpi) => {
                          const Icon = getMetricIcon(kpi.metric_type);
                          return (
                            <SelectItem key={kpi.id} value={kpi.id}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{kpi.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={targetForm.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-target-value" 
                      />
                    </FormControl>
                    <FormDescription>The goal value to achieve</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={targetForm.control}
                name="period_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-target-period">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIOD_TYPES.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={targetForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date (optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-target-start-date">
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={targetForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-target-end-date">
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={targetForm.control}
                name="assignment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-target-assignment">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all_users">All Users</SelectItem>
                        <SelectItem value="specific_users">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {targetForm.watch("assignment_type") === "specific_users" && (
                <FormField
                  control={targetForm.control}
                  name="user_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Users</FormLabel>
                      <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-auto">
                        {users.filter(u => u.role !== "super_admin").map((user) => (
                          <div key={user.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value?.includes(user.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, user.id]);
                                } else {
                                  field.onChange(current.filter((id: string) => id !== user.id));
                                }
                              }}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                            <span className="text-sm">{user.name}</span>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={targetForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Enable or disable this target</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-target-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTargetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                  data-testid="button-save-target"
                >
                  {(createTargetMutation.isPending || updateTargetMutation.isPending) ? "Saving..." : "Save Target"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteKpiId} onOpenChange={(open) => !open && setDeleteKpiId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KPI? This action cannot be undone.
              {targets.some(t => t.kpi_id === deleteKpiId) && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This KPI is being used by {targets.filter(t => t.kpi_id === deleteKpiId).length} target(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKpiId && deleteKpiMutation.mutate(deleteKpiId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-kpi"
            >
              {deleteKpiMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this target? This will remove all associated progress data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && deleteTargetMutation.mutate(deleteTargetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-target"
            >
              {deleteTargetMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
