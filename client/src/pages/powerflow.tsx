import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  TrendingUp,
  Calculator,
  Settings,
  RefreshCw,
  ChevronRight,
  Target,
  Users,
  Calendar,
  BarChart3,
  ArrowDown,
  Zap,
  Activity,
  AlertCircle,
  Building2,
  User,
} from "lucide-react";
import type { Sheet, PowerFlowConfig, PowerFlowStageMetrics } from "@shared/schema";

interface PerSheetAnalytics {
  sheet_id: string;
  sheet_name: string;
  stages: PowerFlowStageMetrics[];
  total_leads: number;
  overall_conversion_rate: number;
}

interface PowerFlowAnalyticsResponse {
  stages: PowerFlowStageMetrics[];
  total_leads: number;
  overall_conversion_rate: number;
  per_sheet_analytics?: PerSheetAnalytics[];
}

interface SimulationResult {
  target_conversions: number;
  required_by_stage: { stage_name: string; required_count: number; color: string; conversion_rate: number }[];
}

type Period = "today" | "yesterday" | "this_week" | "this_month" | "last_30_days";

export default function PowerFlow() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"analytics" | "simulator" | "config">("analytics");
  const [period, setPeriod] = useState<Period>("last_30_days");
  const [selectedSheetId, setSelectedSheetId] = useState<string>("all");
  const [targetConversions, setTargetConversions] = useState<number>(100);
  const [useCompanyData, setUseCompanyData] = useState<boolean>(true);

  const isAdmin = isCompanyAdmin || isSuperAdmin;

  // Fetch user's accessible sheets
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch PowerFlow config
  const { data: config, isLoading: configLoading } = useQuery<PowerFlowConfig>({
    queryKey: ["/api/powerflow/config"],
  });

  // Fetch analytics data
  const { 
    data: analytics, 
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery<PowerFlowAnalyticsResponse>({
    queryKey: ["/api/powerflow/analytics", period, selectedSheetId, useCompanyData],
    queryFn: async () => {
      const sheetParam = selectedSheetId === "all" ? "" : `&sheet_id=${selectedSheetId}`;
      const personalDataParam = useCompanyData ? "" : "&use_personal_data=true";
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/powerflow/analytics?period=${period}${sheetParam}${personalDataParam}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!config?.is_enabled,
  });

  // Simulation calculation
  const simulationResult = useMemo((): SimulationResult | null => {
    if (!analytics?.stages || analytics.stages.length < 2) return null;
    
    const target = targetConversions || 0;
    if (target <= 0) return null;

    const stages = [...analytics.stages];
    const required: { stage_name: string; required_count: number; color: string; conversion_rate: number }[] = [];
    
    // Start from the last stage and work backward
    // The conversion_rate on each stage represents the rate FROM that stage TO the next stage
    // So when going backward, to find how many we need at stage[i-1] to get currentRequired at stage[i],
    // we divide by stages[i-1].conversion_rate (the rate from prev to current)
    let currentRequired = target;
    for (let i = stages.length - 1; i >= 0; i--) {
      const stage = stages[i];
      required.unshift({
        stage_name: stage.stage_name,
        required_count: Math.ceil(currentRequired),
        color: stage.color,
        conversion_rate: stage.conversion_rate,
      });
      
      // Calculate required for previous stage
      // Use the PREVIOUS stage's conversion_rate (which is the rate from prev to current)
      if (i > 0) {
        const prevStage = stages[i - 1];
        if (prevStage.conversion_rate > 0) {
          // prevStage.conversion_rate is the rate from stages[i-1] to stages[i]
          currentRequired = currentRequired / (prevStage.conversion_rate / 100);
        } else if (prevStage.count > 0 && stage.count > 0) {
          // Fallback to historical ratio if no conversion rate
          const ratio = prevStage.count / stage.count;
          currentRequired = currentRequired * ratio;
        }
      }
    }

    return {
      target_conversions: target,
      required_by_stage: required,
    };
  }, [analytics, targetConversions]);

  if (configLoading) {
    return (
      <div className="h-full overflow-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!config?.is_enabled) {
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <Card className="max-w-xl mx-auto mt-12">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>PowerFlow Not Configured</CardTitle>
            <CardDescription>
              Pipeline analytics is not yet set up for your company.
              {isAdmin && " Configure your sales pipeline stages to get started."}
            </CardDescription>
          </CardHeader>
          {isAdmin && (
            <CardContent className="text-center">
              <Button onClick={() => setActiveTab("config")} data-testid="button-configure-powerflow">
                <Settings className="h-4 w-4 mr-2" />
                Configure Pipeline
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-powerflow-title">
            <Zap className="h-6 w-6 text-primary" />
            PowerFlow
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pipeline analytics and conversion simulation
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40" data-testid="select-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
            <SelectTrigger className="w-40" data-testid="select-sheet">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Sheets" />
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
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchAnalytics()}
            disabled={analyticsLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${analyticsLoading ? "animate-spin" : ""}`} />
          </Button>
          
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => setActiveTab("config")} data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="simulator" data-testid="tab-simulator">
            <Calculator className="h-4 w-4 mr-2" />
            Simulator
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {analyticsLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : analyticsError ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <p className="text-lg font-medium">Failed to Load Analytics</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error fetching pipeline data
                </p>
                <Button variant="outline" onClick={() => refetchAnalytics()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : analytics?.stages && analytics.stages.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Leads</p>
                        <p className="text-2xl font-bold" data-testid="text-total-leads">
                          {analytics.total_leads.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                        <p className="text-2xl font-bold" data-testid="text-conversions">
                          {analytics.stages[analytics.stages.length - 1]?.count.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Overall Conversion</p>
                        <p className="text-2xl font-bold" data-testid="text-overall-conversion">
                          {analytics.overall_conversion_rate}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Funnel Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conversion Funnel</CardTitle>
                  <CardDescription>Stage-by-stage performance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.stages.map((stage, index) => {
                      const maxCount = Math.max(...analytics.stages.map(s => s.count));
                      const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                      const isLast = index === analytics.stages.length - 1;
                      
                      return (
                        <motion.div
                          key={stage.stage_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <div className="flex items-center gap-4">
                            {/* Stage Label */}
                            <div className="w-28 md:w-40 shrink-0">
                              <p className="font-medium text-sm truncate" data-testid={`text-stage-name-${index}`}>
                                {stage.stage_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stage.count.toLocaleString()} leads
                              </p>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="flex-1 relative h-10 bg-muted rounded-lg overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPercent}%` }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="absolute inset-y-0 left-0 rounded-lg"
                                style={{ backgroundColor: stage.color || "#3b82f6" }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-3">
                                <span className="text-sm font-medium text-white drop-shadow-md">
                                  {stage.count.toLocaleString()}
                                </span>
                                {!isLast && stage.conversion_rate > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {stage.conversion_rate}% →
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Conversion Arrow */}
                          {!isLast && (
                            <div className="absolute left-[7.5rem] md:left-[10.5rem] -bottom-2 flex items-center justify-center">
                              <ArrowDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Stage-to-Stage Conversion Rates */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analytics.stages.slice(0, -1).map((stage, index) => {
                  const nextStage = analytics.stages[index + 1];
                  return (
                    <Card key={stage.stage_id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-sm font-medium truncate max-w-[80px]">
                              {stage.stage_name}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: nextStage.color }}
                            />
                            <span className="text-sm font-medium truncate max-w-[80px]">
                              {nextStage.stage_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold" data-testid={`text-conversion-rate-${index}`}>
                            {stage.conversion_rate}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {stage.count} → {nextStage.count}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Per-Sheet Analytics Breakdown */}
              {analytics.per_sheet_analytics && analytics.per_sheet_analytics.length > 0 && (
                <div className="space-y-6 mt-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Per-Sheet Breakdown</h3>
                    <Badge variant="secondary">{analytics.per_sheet_analytics.length} sheets</Badge>
                  </div>
                  
                  <div className="space-y-8">
                    {analytics.per_sheet_analytics.map((sheetData) => (
                      <motion.div
                        key={sheetData.sheet_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        data-testid={`sheet-analytics-${sheetData.sheet_id}`}
                        className="space-y-4"
                      >
                        {/* Sheet Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="flex items-center gap-2 text-base font-semibold">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {sheetData.sheet_name}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">{sheetData.total_leads.toLocaleString()}</span> leads
                            </span>
                            <Badge variant="outline">
                              {sheetData.overall_conversion_rate}% overall
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Conversion Cards Grid - matching main card style */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {sheetData.stages.slice(0, -1).map((stage, idx) => {
                            const nextStage = sheetData.stages[idx + 1];
                            return (
                              <Card key={stage.stage_id}>
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stage.color }}
                                      />
                                      <span className="text-sm font-medium truncate max-w-[80px]">
                                        {stage.stage_name}
                                      </span>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: nextStage.color }}
                                      />
                                      <span className="text-sm font-medium truncate max-w-[80px]">
                                        {nextStage.stage_name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-3xl font-bold">
                                      {stage.conversion_rate}%
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {stage.count} → {nextStage.count}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Data Available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No lead activity found for the selected period
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Backward Simulation
              </CardTitle>
              <CardDescription>
                Calculate how many leads you need at each stage to achieve your target conversions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Slider and Data Source Toggle */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Monthly Conversions Slider */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="target-conversions">Monthly Conversions</Label>
                      <Badge variant="secondary" className="text-lg px-3">
                        {targetConversions}
                      </Badge>
                    </div>
                    <Slider
                      id="target-conversions"
                      value={[targetConversions]}
                      onValueChange={(value) => setTargetConversions(value[0])}
                      min={1}
                      max={101}
                      step={1}
                      data-testid="slider-target-conversions"
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1</span>
                      <span>50</span>
                      <span>101</span>
                    </div>
                  </div>

                  {/* Data Source Toggle */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Own Data</span>
                    </div>
                    <Switch
                      checked={useCompanyData}
                      onCheckedChange={setUseCompanyData}
                      data-testid="switch-company-data"
                    />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Company Data</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {useCompanyData ? "company-wide" : "your personal"} conversion rates from {period.replace(/_/g, " ")}
                </p>
              </div>

              {/* Simulation Results */}
              {simulationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Monthly Target Header */}
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      Monthly Target: {simulationResult.target_conversions} conversions
                    </span>
                  </div>
                  
                  {/* Monthly Requirements */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Monthly Requirements
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {simulationResult.required_by_stage.map((item, index) => (
                        <motion.div
                          key={item.stage_name}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="relative overflow-hidden">
                            <div
                              className="absolute top-0 left-0 w-1 h-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <CardContent className="pt-4 pl-5">
                              <p className="text-sm text-muted-foreground">{item.stage_name}</p>
                              <p
                                className="text-2xl font-bold mt-1"
                                data-testid={`text-required-${index}`}
                              >
                                {item.required_count.toLocaleString()}
                              </p>
                              {index < simulationResult.required_by_stage.length - 1 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  @ {item.conversion_rate}% rate
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Requirements (25 days / 6 days per week ≈ 4.17 weeks) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Weekly Requirements <Badge variant="outline" className="text-xs">6 days/week</Badge>
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {simulationResult.required_by_stage.map((item, index) => {
                        const weeksPerMonth = 25 / 6; // ~4.17 weeks
                        const weeklyCount = Math.ceil(item.required_count / weeksPerMonth);
                        return (
                          <Card key={`weekly-${item.stage_name}`} className="relative overflow-hidden">
                            <div
                              className="absolute top-0 left-0 w-1 h-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <CardContent className="pt-4 pl-5">
                              <p className="text-sm text-muted-foreground">{item.stage_name}</p>
                              <p className="text-xl font-bold mt-1">
                                {weeklyCount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">per week</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Requirements (25 working days per month) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Daily Requirements <Badge variant="outline" className="text-xs">25 days/month</Badge>
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {simulationResult.required_by_stage.map((item) => {
                        const dailyCount = Math.ceil(item.required_count / 25);
                        return (
                          <Card key={`daily-${item.stage_name}`} className="relative overflow-hidden">
                            <div
                              className="absolute top-0 left-0 w-1 h-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <CardContent className="pt-4 pl-5">
                              <p className="text-sm text-muted-foreground">{item.stage_name}</p>
                              <p className="text-xl font-bold mt-1">
                                {dailyCount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">per day</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual Flow */}
                  <div className="flex items-center justify-center gap-2 flex-wrap py-4 bg-muted/50 rounded-lg">
                    {simulationResult.required_by_stage.map((item, index) => (
                      <div key={item.stage_name} className="flex items-center gap-2">
                        <div
                          className="px-3 py-2 rounded-lg text-white text-sm font-medium"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.required_count.toLocaleString()}
                        </div>
                        {index < simulationResult.required_by_stage.length - 1 && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!simulationResult && analytics?.stages && analytics.stages.length > 1 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Enter a target number above to see required leads at each stage</p>
                </div>
              )}

              {(!analytics?.stages || analytics.stages.length < 2) && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Need at least 2 pipeline stages with data for simulation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
