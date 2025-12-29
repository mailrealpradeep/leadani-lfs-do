import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  GitBranch,
  Plus,
  Settings,
  RefreshCw,
  ChevronRight,
  Target,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Edit2,
  Trash2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Layers,
  Award,
  Clock,
  Calendar,
  ArrowRight,
  Zap,
  ChevronDown,
} from "lucide-react";
import type { ConversionConfig, ConversionStage, ConversionValue, ConversionIncentive, ConversionApproval, DropdownOption, Company } from "@shared/schema";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

interface ConversionSettingsComplete {
  config: ConversionConfig | null;
  stages: ConversionStage[];
  value: ConversionValue | null;
  incentive: ConversionIncentive | null;
  approval: ConversionApproval | null;
}

interface StageMetrics {
  stage_id: string;
  stage_number: number;
  stage_name: string;
  color: string;
  expected_percent: number;
  actual_percent: number;
  count: number;
  variance: number;
}

interface AnalyticsResponse {
  stages: StageMetrics[];
  total_leads: number;
  period_start: string | null;
  period_end: string | null;
  sheets_analyzed: number;
}

type DateFilter = "today" | "this_week" | "last_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

const DEFAULT_STAGE_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#14B8A6", // teal
];

export default function ConversionSettings() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "stages" | "value" | "incentives" | "approvals">("overview");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [editingStage, setEditingStage] = useState<Partial<ConversionStage> | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageTriggerType, setNewStageTriggerType] = useState<"lead_status" | "visit_status" | "combined">("lead_status");
  const [newStageTriggerValues, setNewStageTriggerValues] = useState<string[]>([]);
  const [newStageColor, setNewStageColor] = useState(DEFAULT_STAGE_COLORS[0]);
  const [newStageExpectedPercent, setNewStageExpectedPercent] = useState<string>("");

  const isAdmin = isCompanyAdmin || isSuperAdmin;

  // Fetch company for timezone
  const { data: company } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  // Fetch conversion settings
  const { 
    data: settings, 
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery<ConversionSettingsComplete>({
    queryKey: ["/api/conversion-settings"],
  });

  // Fetch dropdown options for Lead Status and Visit Status
  const { data: dropdownOptions = [] } = useQuery<DropdownOption[]>({
    queryKey: ["/api/dropdown-options"],
  });

  const leadStatusOptions = useMemo(() => 
    dropdownOptions.filter(opt => opt.column_key === 'lead_status'),
    [dropdownOptions]
  );

  const visitStatusOptions = useMemo(() => 
    dropdownOptions.filter(opt => opt.column_key === 'visit_status'),
    [dropdownOptions]
  );

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last_week":
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return { start: lastWeekStart, end: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "this_quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [dateFilter]);

  // Fetch analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/conversion-settings/analytics", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/conversion-settings/analytics?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!settings?.config,
  });

  // Create/Update config mutation
  const configMutation = useMutation({
    mutationFn: async (data: { name?: string; is_active?: boolean }) => {
      const response = await apiRequest("POST", "/api/conversion-settings/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      toast({ title: "Configuration saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create stage mutation
  const createStageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/conversion-settings/stages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      setIsAddingStage(false);
      setNewStageName("");
      setNewStageTriggerValues([]);
      setNewStageExpectedPercent("");
      toast({ title: "Stage created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/conversion-settings/stages/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      setEditingStage(null);
      toast({ title: "Stage updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/conversion-settings/stages/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      toast({ title: "Stage deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save value settings mutation
  const valueMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/conversion-settings/value", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      toast({ title: "Value settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save incentive settings mutation
  const incentiveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/conversion-settings/incentive", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      toast({ title: "Incentive settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save approval settings mutation
  const approvalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/conversion-settings/approval", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversion-settings"] });
      toast({ title: "Approval settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Initialize config if none exists
  const handleInitialize = () => {
    configMutation.mutate({ name: "Sales Pipeline", is_active: true });
  };

  // Add new stage
  const handleAddStage = () => {
    if (!settings?.config || !newStageName.trim()) return;
    
    createStageMutation.mutate({
      config_id: settings.config.id,
      stage_number: (settings.stages?.length || 0) + 1,
      stage_name: newStageName.trim(),
      trigger_type: newStageTriggerType,
      trigger_values: newStageTriggerValues,
      color: newStageColor,
      expected_conversion_percent: newStageExpectedPercent ? parseFloat(newStageExpectedPercent) : null,
      sort_order: settings.stages?.length || 0,
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Conversion Settings is only available to Company Administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Show initialization screen if no config exists
  if (!settings?.config) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <GitBranch className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Conversion Settings</h1>
                  <p className="text-muted-foreground">Configure your sales pipeline stages</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Define Pipeline Stages</p>
                    <p className="text-sm text-muted-foreground">Create stages like Lead, Qualified, Negotiation, Won</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Set Expected Conversion Rates</p>
                    <p className="text-sm text-muted-foreground">Compare actual vs expected conversion percentages</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Configure Deal Values & Incentives</p>
                    <p className="text-sm text-muted-foreground">Track revenue and calculate sales incentives</p>
                  </div>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={handleInitialize}
                disabled={configMutation.isPending}
                data-testid="button-initialize-conversion"
              >
                {configMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Initialize Conversion Settings
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GitBranch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conversion Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your sales pipeline configuration</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-40" data-testid="select-date-filter">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchSettings();
              refetchAnalytics();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Pipeline Overview Cards */}
      {analytics && analytics.stages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold" data-testid="text-total-leads">{analytics.total_leads.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Stages</p>
                  <p className="text-3xl font-bold" data-testid="text-stage-count">{settings.stages.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Layers className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sheets Analyzed</p>
                  <p className="text-3xl font-bold" data-testid="text-sheets-count">{analytics.sheets_analyzed}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="text-lg font-semibold capitalize" data-testid="text-period">{dateFilter.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Visual Pipeline Flow */}
      {analytics && analytics.stages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Pipeline Overview
            </CardTitle>
            <CardDescription>
              Lead distribution across pipeline stages for {dateFilter.replace(/_/g, ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-4">
              {analytics.stages.map((stage, index) => (
                <motion.div
                  key={stage.stage_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-1 min-w-[180px]"
                >
                  <div 
                    className="relative p-4 rounded-lg border-2 h-full"
                    style={{ borderColor: stage.color, backgroundColor: `${stage.color}10` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: stage.color, color: stage.color }}
                      >
                        Stage {stage.stage_number}
                      </Badge>
                      {stage.variance !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${stage.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stage.variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(stage.variance)}%
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-semibold mb-2 truncate" title={stage.stage_name}>
                      {stage.stage_name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold" style={{ color: stage.color }}>
                          {stage.count.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">leads</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Expected</p>
                          <p className="font-medium">{stage.expected_percent}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Actual</p>
                          <p className="font-medium">{stage.actual_percent}%</p>
                        </div>
                      </div>
                    </div>
                    
                    {index < analytics.stages.length - 1 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="stages" data-testid="tab-stages">
            <Layers className="w-4 h-4 mr-2" />
            Stages
          </TabsTrigger>
          <TabsTrigger value="value" data-testid="tab-value">
            <DollarSign className="w-4 h-4 mr-2" />
            Value
          </TabsTrigger>
          <TabsTrigger value="incentives" data-testid="tab-incentives">
            <Award className="w-4 h-4 mr-2" />
            Incentives
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approvals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Configuration</CardTitle>
              <CardDescription>
                Current pipeline settings and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{settings.config.name}</p>
                    <p className="text-sm text-muted-foreground">Pipeline Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pipeline-active">Active</Label>
                  <Switch
                    id="pipeline-active"
                    checked={settings.config.is_active}
                    onCheckedChange={(checked) => configMutation.mutate({ is_active: checked })}
                    data-testid="switch-pipeline-active"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium">Stages</span>
                  </div>
                  <p className="text-2xl font-bold">{settings.stages.length}</p>
                  <p className="text-sm text-muted-foreground">configured</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Value Type</span>
                  </div>
                  <p className="text-2xl font-bold capitalize">
                    {settings.value?.value_type?.replace(/_/g, ' ') || 'Not Set'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.value?.currency || 'INR'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">Incentive Type</span>
                  </div>
                  <p className="text-2xl font-bold capitalize">
                    {settings.incentive?.incentive_type?.replace(/_/g, ' ') || 'Not Set'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.incentive?.incentive_type === 'percentage' && settings.incentive.percentage_value
                      ? `${settings.incentive.percentage_value}%`
                      : settings.incentive?.incentive_type === 'fixed' && settings.incentive.fixed_amount
                        ? `${settings.value?.currency || 'INR'} ${settings.incentive.fixed_amount}`
                        : 'Configure in Incentives tab'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Pipeline Stages</CardTitle>
                <CardDescription>
                  Define the stages in your sales pipeline and their trigger conditions
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddingStage(true)} data-testid="button-add-stage">
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.stages.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No stages configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Add stages to define your sales pipeline
                  </p>
                  <Button onClick={() => setIsAddingStage(true)} data-testid="button-add-first-stage">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Stage
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.stages.map((stage, index) => {
                    const stageAnalytics = analytics?.stages.find(s => s.stage_id === stage.id);
                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
                        style={{ borderLeftWidth: 4, borderLeftColor: stage.color }}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground cursor-move">
                          <GripVertical className="w-4 h-4" />
                          <span className="font-mono text-sm">{stage.stage_number}</span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{stage.stage_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {stage.trigger_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stage.trigger_values.length > 0 
                              ? stage.trigger_values.join(', ')
                              : 'No trigger values set'}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Expected</p>
                              <p className="font-medium">{stage.expected_conversion_percent || 0}%</p>
                            </div>
                            {stageAnalytics && (
                              <div>
                                <p className="text-sm text-muted-foreground">Actual</p>
                                <p className="font-medium">{stageAnalytics.actual_percent}%</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingStage(stage)}
                            data-testid={`button-edit-stage-${stage.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this stage?')) {
                                deleteStageMutation.mutate(stage.id);
                              }
                            }}
                            data-testid={`button-delete-stage-${stage.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Stage Dialog */}
          <Dialog open={isAddingStage} onOpenChange={setIsAddingStage}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Pipeline Stage</DialogTitle>
                <DialogDescription>
                  Configure a new stage in your sales pipeline
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="stage-name">Stage Name</Label>
                  <Input
                    id="stage-name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="e.g., Qualified Lead"
                    data-testid="input-stage-name"
                  />
                </div>

                <div>
                  <Label htmlFor="trigger-type">Trigger Type</Label>
                  <Select value={newStageTriggerType} onValueChange={(v) => setNewStageTriggerType(v as any)}>
                    <SelectTrigger id="trigger-type" data-testid="select-trigger-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead_status">Lead Status</SelectItem>
                      <SelectItem value="visit_status">Visit Status</SelectItem>
                      <SelectItem value="combined">Combined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Trigger Values</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {(newStageTriggerType === 'lead_status' ? leadStatusOptions :
                      newStageTriggerType === 'visit_status' ? visitStatusOptions :
                      [...leadStatusOptions, ...visitStatusOptions]
                    ).map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={newStageTriggerValues.includes(opt.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStageTriggerValues([...newStageTriggerValues, opt.value]);
                            } else {
                              setNewStageTriggerValues(newStageTriggerValues.filter(v => v !== opt.value));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm truncate">{opt.value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage-color">Color</Label>
                    <div className="flex gap-2 mt-2">
                      {DEFAULT_STAGE_COLORS.slice(0, 4).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewStageColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${newStageColor === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="expected-percent">Expected %</Label>
                    <Input
                      id="expected-percent"
                      type="number"
                      min="0"
                      max="100"
                      value={newStageExpectedPercent}
                      onChange={(e) => setNewStageExpectedPercent(e.target.value)}
                      placeholder="e.g., 25"
                      data-testid="input-expected-percent"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingStage(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddStage}
                  disabled={!newStageName.trim() || createStageMutation.isPending}
                  data-testid="button-save-stage"
                >
                  {createStageMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Stage
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Stage Dialog */}
          <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Stage</DialogTitle>
                <DialogDescription>
                  Modify stage settings
                </DialogDescription>
              </DialogHeader>

              {editingStage && (
                <div className="space-y-4">
                  <div>
                    <Label>Stage Name</Label>
                    <Input
                      value={editingStage.stage_name}
                      onChange={(e) => setEditingStage({ ...editingStage, stage_name: e.target.value })}
                      data-testid="input-edit-stage-name"
                    />
                  </div>

                  <div>
                    <Label>Expected Conversion %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingStage.expected_conversion_percent || ''}
                      onChange={(e) => setEditingStage({ 
                        ...editingStage, 
                        expected_conversion_percent: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                      data-testid="input-edit-expected-percent"
                    />
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {DEFAULT_STAGE_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditingStage({ ...editingStage, color })}
                          className={`w-8 h-8 rounded-full border-2 ${editingStage.color === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingStage(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingStage) {
                      updateStageMutation.mutate({
                        id: editingStage.id,
                        updates: {
                          stage_name: editingStage.stage_name,
                          expected_conversion_percent: editingStage.expected_conversion_percent,
                          color: editingStage.color,
                        }
                      });
                    }
                  }}
                  disabled={updateStageMutation.isPending}
                  data-testid="button-save-edit-stage"
                >
                  {updateStageMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Value Tab */}
        <TabsContent value="value" className="space-y-6 mt-6">
          <ValueSettingsTab 
            settings={settings} 
            onSave={(data) => valueMutation.mutate(data)}
            isPending={valueMutation.isPending}
          />
        </TabsContent>

        {/* Incentives Tab */}
        <TabsContent value="incentives" className="space-y-6 mt-6">
          <IncentiveSettingsTab 
            settings={settings} 
            onSave={(data) => incentiveMutation.mutate(data)}
            isPending={incentiveMutation.isPending}
          />
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6 mt-6">
          <ApprovalSettingsTab 
            settings={settings} 
            onSave={(data) => approvalMutation.mutate(data)}
            isPending={approvalMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Value Settings Tab Component
function ValueSettingsTab({ 
  settings, 
  onSave,
  isPending 
}: { 
  settings: ConversionSettingsComplete; 
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [valueType, setValueType] = useState<string>(settings.value?.value_type || 'fixed');
  const [fixedAmount, setFixedAmount] = useState<string>(settings.value?.fixed_amount?.toString() || '');
  const [sourceColumn, setSourceColumn] = useState<string>(settings.value?.source_column_key || '');
  const [defaultAmount, setDefaultAmount] = useState<string>(settings.value?.default_amount?.toString() || '');
  const [currency, setCurrency] = useState<string>(settings.value?.currency || 'INR');

  const handleSave = () => {
    onSave({
      config_id: settings.config?.id,
      value_type: valueType,
      fixed_amount: valueType === 'fixed' ? parseFloat(fixedAmount) || null : null,
      source_column_key: valueType === 'from_lead' ? sourceColumn : null,
      default_amount: valueType === 'from_lead' ? parseFloat(defaultAmount) || null : null,
      currency,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Conversion Value Settings
        </CardTitle>
        <CardDescription>
          Define how the value of each conversion is calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Value Type</Label>
          <Select value={valueType} onValueChange={setValueType}>
            <SelectTrigger className="w-full max-w-md mt-2" data-testid="select-value-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
              <SelectItem value="from_lead">From Lead Field</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {valueType === 'fixed' && (
          <div className="grid gap-4 md:grid-cols-2 max-w-md">
            <div>
              <Label>Fixed Amount</Label>
              <Input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="e.g., 50000"
                className="mt-2"
                data-testid="input-fixed-amount"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-2" data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {valueType === 'from_lead' && (
          <div className="space-y-4 max-w-md">
            <div>
              <Label>Source Column Key</Label>
              <Input
                value={sourceColumn}
                onChange={(e) => setSourceColumn(e.target.value)}
                placeholder="e.g., deal_value, budget"
                className="mt-2"
                data-testid="input-source-column"
              />
              <p className="text-sm text-muted-foreground mt-1">
                The custom field key that contains the deal value
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Default Amount (if field is empty)</Label>
                <Input
                  type="number"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  placeholder="e.g., 25000"
                  className="mt-2"
                  data-testid="input-default-amount"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-2" data-testid="select-currency-from-lead">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {valueType === 'manual' && (
          <div className="p-4 rounded-lg bg-muted/50 max-w-md">
            <p className="text-sm text-muted-foreground">
              With manual entry, users will be prompted to enter the conversion value each time a lead reaches the final stage.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={isPending} data-testid="button-save-value">
          {isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Save Value Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// Incentive Settings Tab Component
function IncentiveSettingsTab({ 
  settings, 
  onSave,
  isPending 
}: { 
  settings: ConversionSettingsComplete; 
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [incentiveType, setIncentiveType] = useState<string>(settings.incentive?.incentive_type || 'percentage');
  const [percentageValue, setPercentageValue] = useState<string>(settings.incentive?.percentage_value?.toString() || '');
  const [fixedAmount, setFixedAmount] = useState<string>(settings.incentive?.fixed_amount?.toString() || '');

  const handleSave = () => {
    onSave({
      config_id: settings.config?.id,
      incentive_type: incentiveType,
      percentage_value: incentiveType === 'percentage' ? parseFloat(percentageValue) || null : null,
      fixed_amount: incentiveType === 'fixed' ? parseFloat(fixedAmount) || null : null,
      tier_rules: [],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Incentive Settings
        </CardTitle>
        <CardDescription>
          Configure how sales incentives are calculated for conversions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Incentive Type</Label>
          <Select value={incentiveType} onValueChange={setIncentiveType}>
            <SelectTrigger className="w-full max-w-md mt-2" data-testid="select-incentive-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage of Value</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="tiered">Tiered Structure</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {incentiveType === 'percentage' && (
          <div className="max-w-md">
            <Label>Percentage</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={percentageValue}
                onChange={(e) => setPercentageValue(e.target.value)}
                placeholder="e.g., 2.5"
                className="max-w-32"
                data-testid="input-percentage-value"
              />
              <span className="text-lg">%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Incentive will be calculated as this percentage of the conversion value
            </p>
          </div>
        )}

        {incentiveType === 'fixed' && (
          <div className="max-w-md">
            <Label>Fixed Incentive Amount</Label>
            <Input
              type="number"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="e.g., 5000"
              className="mt-2"
              data-testid="input-fixed-incentive"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Fixed amount paid per conversion regardless of deal value
            </p>
          </div>
        )}

        {incentiveType === 'manual' && (
          <div className="p-4 rounded-lg bg-muted/50 max-w-md">
            <p className="text-sm text-muted-foreground">
              With manual entry, admins will set the incentive amount for each conversion individually.
            </p>
          </div>
        )}

        {incentiveType === 'tiered' && (
          <div className="p-4 rounded-lg bg-muted/50 max-w-md">
            <p className="text-sm text-muted-foreground">
              Tiered incentive structure allows different rates based on the number of conversions. This feature is coming soon.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={isPending} data-testid="button-save-incentive">
          {isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Save Incentive Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// Approval Settings Tab Component
function ApprovalSettingsTab({ 
  settings, 
  onSave,
  isPending 
}: { 
  settings: ConversionSettingsComplete; 
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState<boolean>(settings.approval?.is_enabled || false);
  const [autoApproveHours, setAutoApproveHours] = useState<string>(settings.approval?.auto_approve_hours?.toString() || '');

  const handleSave = () => {
    onSave({
      config_id: settings.config?.id,
      is_enabled: isEnabled,
      transitions_requiring_approval: [],
      auto_approve_hours: autoApproveHours ? parseInt(autoApproveHours) : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Approval Settings
        </CardTitle>
        <CardDescription>
          Configure approval workflows for stage transitions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border max-w-md">
          <div>
            <p className="font-medium">Require Approval</p>
            <p className="text-sm text-muted-foreground">
              Stage transitions require admin approval
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            data-testid="switch-approval-enabled"
          />
        </div>

        {isEnabled && (
          <div className="max-w-md">
            <Label>Auto-Approve After (hours)</Label>
            <Input
              type="number"
              min="0"
              value={autoApproveHours}
              onChange={(e) => setAutoApproveHours(e.target.value)}
              placeholder="Leave empty for no auto-approval"
              className="mt-2"
              data-testid="input-auto-approve-hours"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Pending approvals will be automatically approved after this many hours
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={isPending} data-testid="button-save-approval">
          {isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Save Approval Settings
        </Button>
      </CardContent>
    </Card>
  );
}
