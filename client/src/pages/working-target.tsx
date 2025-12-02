import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Crosshair, Plus, Trash2, Edit, Target, TrendingUp, 
  Calendar, Clock, CheckCircle2, XCircle, Loader2,
  BarChart3, Columns, ArrowRight, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { CustomColumn, Sheet, WorkingTargetRecord } from "@shared/schema";

type TargetType = 'fixed' | 'single_column' | 'compare_columns';
type PeriodType = 'daily' | 'weekly' | 'monthly';

interface EvaluationResult {
  currentValue: number;
  targetValue: number;
  compliancePercentage: number;
  isAchieved: boolean;
  details: Record<string, any>;
}

interface TargetEvaluation {
  target: WorkingTargetRecord;
  result: EvaluationResult;
}

interface CreateTargetData {
  name: string;
  target_type: TargetType;
  period_type: PeriodType;
  config: any;
  sheet_ids?: string[];
}

const TARGET_TYPE_INFO = {
  fixed: {
    icon: BarChart3,
    label: "Fixed Target",
    description: "Track predefined metrics like lead updates count",
    color: "text-blue-500",
  },
  single_column: {
    icon: Columns,
    label: "Column Compliance",
    description: "Check if column values meet a condition",
    color: "text-green-500",
  },
  compare_columns: {
    icon: ArrowRight,
    label: "Status Transition",
    description: "Count transitions from one value to another",
    color: "text-purple-500",
  },
};

const PERIOD_TYPE_INFO = {
  daily: { label: "Daily", icon: Clock },
  weekly: { label: "Weekly", icon: Calendar },
  monthly: { label: "Monthly", icon: Calendar },
};

export default function WorkingTarget() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? "admin" : "progress");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<WorkingTargetRecord | null>(null);
  
  const [wizardStep, setWizardStep] = useState(1);
  const [targetType, setTargetType] = useState<TargetType>('fixed');
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [targetName, setTargetName] = useState('');
  
  const [fixedMetric, setFixedMetric] = useState<'lead_updates' | 'status_transitions'>('lead_updates');
  const [fixedTargetValue, setFixedTargetValue] = useState<number>(10);
  
  const [singleColumnId, setSingleColumnId] = useState('');
  const [singleOperator, setSingleOperator] = useState<'equals' | 'not_equals' | 'is_empty' | 'is_not_empty'>('is_not_empty');
  const [singleValue, setSingleValue] = useState('');
  
  const [compareColumnId, setCompareColumnId] = useState('');
  const [compareFromValue, setCompareFromValue] = useState('');
  const [compareToValue, setCompareToValue] = useState('');
  const [compareResultType, setCompareResultType] = useState<'count' | 'percentage'>('count');
  const [compareTargetValue, setCompareTargetValue] = useState<number>(5);
  
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);

  const { data: targets, isLoading: targetsLoading } = useQuery<WorkingTargetRecord[]>({
    queryKey: ['/api/working-targets'],
    enabled: isAdmin,
  });

  const { data: evaluations, isLoading: evaluationsLoading } = useQuery<TargetEvaluation[]>({
    queryKey: ['/api/working-targets/evaluate/me'],
  });

  const { data: columns } = useQuery<CustomColumn[]>({
    queryKey: ['/api/custom-columns'],
  });

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ['/api/sheets'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTargetData) => {
      return apiRequest('/api/working-targets', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Target created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets/evaluate/me'] });
      handleCloseCreateDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create target", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTargetData> & { is_active?: boolean } }) => {
      return apiRequest(`/api/working-targets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Target updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets/evaluate/me'] });
      setEditDialogOpen(false);
      setSelectedTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update target", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/working-targets/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: "Target deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets/evaluate/me'] });
      setDeleteDialogOpen(false);
      setSelectedTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete target", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setWizardStep(1);
    setTargetType('fixed');
    setPeriodType('daily');
    setTargetName('');
    setFixedMetric('lead_updates');
    setFixedTargetValue(10);
    setSingleColumnId('');
    setSingleOperator('is_not_empty');
    setSingleValue('');
    setCompareColumnId('');
    setCompareFromValue('');
    setCompareToValue('');
    setCompareResultType('count');
    setCompareTargetValue(5);
    setSelectedSheetIds([]);
  };

  const handleCreateTarget = () => {
    let config: any;
    
    if (targetType === 'fixed') {
      config = {
        type: 'fixed',
        config: {
          metric: fixedMetric,
          target_value: fixedTargetValue,
        },
      };
    } else if (targetType === 'single_column') {
      config = {
        type: 'single_column',
        config: {
          column_id: singleColumnId,
          operator: singleOperator,
          value: singleValue,
        },
      };
    } else {
      config = {
        type: 'compare_columns',
        config: {
          column_id: compareColumnId,
          from_value: compareFromValue,
          to_value: compareToValue,
          result_type: compareResultType,
          target_value: compareTargetValue,
        },
      };
    }

    createMutation.mutate({
      name: targetName,
      target_type: targetType,
      period_type: periodType,
      config,
      sheet_ids: selectedSheetIds.length > 0 ? selectedSheetIds : undefined,
    });
  };

  const handleEditTarget = (target: WorkingTargetRecord) => {
    setSelectedTarget(target);
    setEditDialogOpen(true);
    setTargetName(target.name);
    setPeriodType(target.period_type as PeriodType);
    setSelectedSheetIds(target.sheet_ids || []);
    
    if (target.target_type === 'fixed') {
      const conf = (target.config as any).config;
      setFixedMetric(conf.metric);
      setFixedTargetValue(conf.target_value);
    } else if (target.target_type === 'single_column') {
      const conf = (target.config as any).config;
      setSingleColumnId(conf.column_id);
      setSingleOperator(conf.operator);
      setSingleValue(conf.value || '');
    } else {
      const conf = (target.config as any).config;
      setCompareColumnId(conf.column_id);
      setCompareFromValue(conf.from_value);
      setCompareToValue(conf.to_value);
      setCompareResultType(conf.result_type);
      setCompareTargetValue(conf.target_value);
    }
  };

  const handleSaveEdit = () => {
    if (!selectedTarget) return;
    
    let config: any;
    
    if (selectedTarget.target_type === 'fixed') {
      config = {
        type: 'fixed',
        config: {
          metric: fixedMetric,
          target_value: fixedTargetValue,
        },
      };
    } else if (selectedTarget.target_type === 'single_column') {
      config = {
        type: 'single_column',
        config: {
          column_id: singleColumnId,
          operator: singleOperator,
          value: singleValue,
        },
      };
    } else {
      config = {
        type: 'compare_columns',
        config: {
          column_id: compareColumnId,
          from_value: compareFromValue,
          to_value: compareToValue,
          result_type: compareResultType,
          target_value: compareTargetValue,
        },
      };
    }

    updateMutation.mutate({
      id: selectedTarget.id,
      data: {
        name: targetName,
        period_type: periodType,
        config,
        sheet_ids: selectedSheetIds.length > 0 ? selectedSheetIds : undefined,
      },
    });
  };

  const getColumnName = (columnId: string) => {
    const column = columns?.find(c => c.column_key === columnId);
    return column?.name || columnId;
  };

  const renderProgressCard = (evaluation: TargetEvaluation) => {
    const { target, result } = evaluation;
    const TypeInfo = TARGET_TYPE_INFO[target.target_type as TargetType];
    const TypeIcon = TypeInfo.icon;

    return (
      <Card key={target.id} data-testid={`card-target-progress-${target.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <TypeIcon className={`h-5 w-5 ${TypeInfo.color}`} />
              <CardTitle className="text-lg">{target.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {PERIOD_TYPE_INFO[target.period_type as PeriodType].label}
              </Badge>
              {result.isAchieved ? (
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Achieved
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Target className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {Math.round(result.compliancePercentage)}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, result.compliancePercentage)} 
              className="h-2"
            />
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Current / Target</span>
            <span className="font-medium">
              {target.target_type === 'single_column' 
                ? `${result.currentValue} / ${result.targetValue} leads`
                : `${result.currentValue} / ${result.targetValue}`}
            </span>
          </div>

          {target.target_type === 'single_column' && result.details.nonCompliantCount > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {result.details.nonCompliantCount} leads need attention
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAdminTargetCard = (target: WorkingTargetRecord) => {
    const TypeInfo = TARGET_TYPE_INFO[target.target_type as TargetType];
    const TypeIcon = TypeInfo.icon;
    const config = (target.config as any).config;

    let description = '';
    if (target.target_type === 'fixed') {
      description = `${config.metric === 'lead_updates' ? 'Lead Updates' : 'Status Transitions'} >= ${config.target_value}`;
    } else if (target.target_type === 'single_column') {
      description = `${getColumnName(config.column_id)} ${config.operator} ${config.value || ''}`.trim();
    } else {
      description = `${getColumnName(config.column_id)}: ${config.from_value} → ${config.to_value} (${config.target_value})`;
    }

    return (
      <Card key={target.id} data-testid={`card-target-admin-${target.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <TypeIcon className={`h-5 w-5 ${TypeInfo.color}`} />
              <div>
                <CardTitle className="text-lg">{target.name}</CardTitle>
                <CardDescription className="text-xs mt-1">{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={target.is_active ? "default" : "secondary"}>
                {target.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">
                {PERIOD_TYPE_INFO[target.period_type as PeriodType].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {target.sheet_ids && target.sheet_ids.length > 0 
                ? `Applied to ${target.sheet_ids.length} sheet(s)`
                : 'Applied to all sheets'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditTarget(target)}
                data-testid={`button-edit-target-${target.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateMutation.mutate({ 
                  id: target.id, 
                  data: { is_active: !target.is_active } 
                })}
                data-testid={`button-toggle-target-${target.id}`}
              >
                {target.is_active ? (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTarget(target);
                  setDeleteDialogOpen(true);
                }}
                data-testid={`button-delete-target-${target.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-working-target-title">Working Targets</h1>
            <p className="text-muted-foreground">Track performance goals and team progress</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-target">
            <Plus className="h-4 w-4 mr-2" />
            Create Target
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="progress" data-testid="tab-progress">
            <TrendingUp className="h-4 w-4 mr-2" />
            My Progress
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Target className="h-4 w-4 mr-2" />
              Manage Targets
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          {evaluationsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : evaluations && evaluations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {evaluations.map(renderProgressCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active targets assigned to you</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-4">
            {targetsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : targets && targets.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {targets.map(renderAdminTargetCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No working targets created yet</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Target
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Working Target</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Choose the type of target you want to create"}
              {wizardStep === 2 && "Configure your target settings"}
              {wizardStep === 3 && "Set the target details and period"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {wizardStep === 1 && (
                <div className="space-y-3">
                  {(Object.keys(TARGET_TYPE_INFO) as TargetType[]).map((type) => {
                    const info = TARGET_TYPE_INFO[type];
                    const Icon = info.icon;
                    return (
                      <Card
                        key={type}
                        className={`cursor-pointer transition-all hover-elevate ${
                          targetType === type ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setTargetType(type)}
                        data-testid={`card-type-${type}`}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-background ${info.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{info.label}</h3>
                            <p className="text-sm text-muted-foreground">{info.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  {targetType === 'fixed' && (
                    <>
                      <div className="space-y-2">
                        <Label>Metric</Label>
                        <Select value={fixedMetric} onValueChange={(v: any) => setFixedMetric(v)}>
                          <SelectTrigger data-testid="select-fixed-metric">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead_updates">Lead Updates Count</SelectItem>
                            <SelectItem value="status_transitions">Status Transitions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Value</Label>
                        <Input
                          type="number"
                          value={fixedTargetValue}
                          onChange={(e) => setFixedTargetValue(parseInt(e.target.value) || 0)}
                          placeholder="Enter target value"
                          data-testid="input-fixed-target-value"
                        />
                      </div>
                    </>
                  )}

                  {targetType === 'single_column' && (
                    <>
                      <div className="space-y-2">
                        <Label>Column</Label>
                        <Select value={singleColumnId} onValueChange={setSingleColumnId}>
                          <SelectTrigger data-testid="select-single-column">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns?.map((col) => (
                              <SelectItem key={col.column_key} value={col.column_key}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Operator</Label>
                        <Select value={singleOperator} onValueChange={(v: any) => setSingleOperator(v)}>
                          <SelectTrigger data-testid="select-single-operator">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="is_empty">Is Empty</SelectItem>
                            <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(singleOperator === 'equals' || singleOperator === 'not_equals') && (
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input
                            value={singleValue}
                            onChange={(e) => setSingleValue(e.target.value)}
                            placeholder="Enter value to compare"
                            data-testid="input-single-value"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {targetType === 'compare_columns' && (
                    <>
                      <div className="space-y-2">
                        <Label>Column</Label>
                        <Select value={compareColumnId} onValueChange={setCompareColumnId}>
                          <SelectTrigger data-testid="select-compare-column">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns?.map((col) => (
                              <SelectItem key={col.column_key} value={col.column_key}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From Value</Label>
                          <Input
                            value={compareFromValue}
                            onChange={(e) => setCompareFromValue(e.target.value)}
                            placeholder="Initial value"
                            data-testid="input-compare-from"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>To Value</Label>
                          <Input
                            value={compareToValue}
                            onChange={(e) => setCompareToValue(e.target.value)}
                            placeholder="Target value"
                            data-testid="input-compare-to"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Result Type</Label>
                        <Select value={compareResultType} onValueChange={(v: any) => setCompareResultType(v)}>
                          <SelectTrigger data-testid="select-compare-result-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">Count Transitions</SelectItem>
                            <SelectItem value="percentage">Percentage of Transitions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target {compareResultType === 'percentage' ? 'Percentage' : 'Count'}</Label>
                        <Input
                          type="number"
                          value={compareTargetValue}
                          onChange={(e) => setCompareTargetValue(parseInt(e.target.value) || 0)}
                          placeholder="Enter target"
                          data-testid="input-compare-target"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Name</Label>
                    <Input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder="e.g., Daily Updates Goal"
                      data-testid="input-target-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                      <SelectTrigger data-testid="select-period-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Apply to Sheets (optional)</Label>
                    <Select
                      value={selectedSheetIds.length > 0 ? selectedSheetIds[0] : "all"}
                      onValueChange={(v) => {
                        if (v === 'all') {
                          setSelectedSheetIds([]);
                        } else {
                          setSelectedSheetIds([v]);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-sheets">
                        <SelectValue placeholder="All sheets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sheets</SelectItem>
                        {sheets?.map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {sheet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                Back
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)} data-testid="button-next-step">
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreateTarget} 
                disabled={!targetName || createMutation.isPending}
                data-testid="button-create-target-submit"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Target
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Working Target</DialogTitle>
            <DialogDescription>Update the target settings</DialogDescription>
          </DialogHeader>

          {selectedTarget && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Target Name</Label>
                  <Input
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    data-testid="input-edit-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                    <SelectTrigger data-testid="select-edit-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedTarget.target_type === 'fixed' && (
                  <>
                    <div className="space-y-2">
                      <Label>Metric</Label>
                      <Select value={fixedMetric} onValueChange={(v: any) => setFixedMetric(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead_updates">Lead Updates Count</SelectItem>
                          <SelectItem value="status_transitions">Status Transitions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={fixedTargetValue}
                        onChange={(e) => setFixedTargetValue(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </>
                )}

                {selectedTarget.target_type === 'single_column' && (
                  <>
                    <div className="space-y-2">
                      <Label>Column</Label>
                      <Select value={singleColumnId} onValueChange={setSingleColumnId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns?.map((col) => (
                            <SelectItem key={col.column_key} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select value={singleOperator} onValueChange={(v: any) => setSingleOperator(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="is_empty">Is Empty</SelectItem>
                          <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(singleOperator === 'equals' || singleOperator === 'not_equals') && (
                      <div className="space-y-2">
                        <Label>Value</Label>
                        <Input
                          value={singleValue}
                          onChange={(e) => setSingleValue(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                {selectedTarget.target_type === 'compare_columns' && (
                  <>
                    <div className="space-y-2">
                      <Label>Column</Label>
                      <Select value={compareColumnId} onValueChange={setCompareColumnId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns?.map((col) => (
                            <SelectItem key={col.column_key} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Value</Label>
                        <Input
                          value={compareFromValue}
                          onChange={(e) => setCompareFromValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To Value</Label>
                        <Input
                          value={compareToValue}
                          onChange={(e) => setCompareToValue(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Result Type</Label>
                      <Select value={compareResultType} onValueChange={(v: any) => setCompareResultType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">Count Transitions</SelectItem>
                          <SelectItem value="percentage">Percentage of Transitions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target {compareResultType === 'percentage' ? 'Percentage' : 'Count'}</Label>
                      <Input
                        type="number"
                        value={compareTargetValue}
                        onChange={(e) => setCompareTargetValue(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Apply to Sheets (optional)</Label>
                  <Select
                    value={selectedSheetIds.length > 0 ? selectedSheetIds[0] : "all"}
                    onValueChange={(v) => {
                      if (v === 'all') {
                        setSelectedSheetIds([]);
                      } else {
                        setSelectedSheetIds([v]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sheets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sheets</SelectItem>
                      {sheets?.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!targetName || updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTarget && deleteMutation.mutate(selectedTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
