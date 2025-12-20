import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { 
  Crosshair, Plus, Trash2, Edit, Target, TrendingUp, 
  Calendar, Clock, CheckCircle2, XCircle, Loader2,
  BarChart3, Columns, ArrowRight, AlertCircle, ChevronDown, ChevronUp, Users, Filter
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
import { Checkbox } from "@/components/ui/checkbox";
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
import type { CustomColumn, Sheet, WorkingTargetRecord, DropdownOption } from "@shared/schema";

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

interface UserProgress {
  userId: string;
  userName: string;
  currentValue: number;
  targetValue: number;
  compliancePercentage: number;
  isAchieved: boolean;
}

interface AggregateTargetProgress {
  targetId: string;
  totalCurrentValue: number;
  totalTargetValue: number;
  averageCompliancePercentage: number;
  achievedCount: number;
  totalUsers: number;
  userProgress: UserProgress[];
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
  const [periodFilter, setPeriodFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [adminSheetFilter, setAdminSheetFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<WorkingTargetRecord | null>(null);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  
  const [wizardStep, setWizardStep] = useState(1);
  const [targetType, setTargetType] = useState<TargetType>('fixed');
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [targetName, setTargetName] = useState('');
  
  const [fixedMetric, setFixedMetric] = useState<'lead_updates' | 'status_transitions' | 'leads_created'>('lead_updates');
  const [fixedTargetValue, setFixedTargetValue] = useState<number>(10);
  
  const [singleColumnId, setSingleColumnId] = useState('');
  const [singleOperator, setSingleOperator] = useState<'equals' | 'not_equals' | 'is_empty' | 'is_not_empty'>('is_not_empty');
  const [singleValue, setSingleValue] = useState('');
  const [singleTargetPercentage, setSingleTargetPercentage] = useState<number>(100);
  
  const [compareColumnId, setCompareColumnId] = useState('');
  const [compareFromValues, setCompareFromValues] = useState<string[]>([]);
  const [compareToValues, setCompareToValues] = useState<string[]>([]);
  const [compareResultType, setCompareResultType] = useState<'count' | 'percentage'>('count');
  const [compareTargetValue, setCompareTargetValue] = useState<number>(5);
  
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [columnDropdownOptions, setColumnDropdownOptions] = useState<string[]>([]);
  const [singleColumnDropdownOptions, setSingleColumnDropdownOptions] = useState<string[]>([]);

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

  // Track previous sheet filter to detect changes
  const prevSheetFilterRef = useRef(adminSheetFilter);

  // Aggregate progress data for admin view
  const { data: aggregateData, isLoading: aggregateLoading } = useQuery<Record<string, AggregateTargetProgress>>({
    queryKey: ['/api/working-targets/aggregate', adminSheetFilter === 'all' ? '' : adminSheetFilter],
    queryFn: async () => {
      const url = adminSheetFilter === 'all' 
        ? '/api/working-targets/aggregate'
        : `/api/working-targets/aggregate?sheetId=${adminSheetFilter}`;
      return apiRequest<Record<string, AggregateTargetProgress>>('GET', url);
    },
    enabled: isAdmin && activeTab === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
    placeholderData: undefined, // Don't keep previous data between filter changes
  });

  // Clear old aggregate data when sheet filter changes to prevent stale display
  useEffect(() => {
    if (prevSheetFilterRef.current !== adminSheetFilter) {
      // Clear cached data for the old filter to prevent showing stale data
      queryClient.setQueryData(
        ['/api/working-targets/aggregate', prevSheetFilterRef.current === 'all' ? '' : prevSheetFilterRef.current],
        undefined
      );
      prevSheetFilterRef.current = adminSheetFilter;
    }
  }, [adminSheetFilter]);

  // Pre-compute grouped evaluations to avoid repeated filtering
  const groupedEvaluations = useMemo(() => {
    if (!evaluations) return { daily: [], weekly: [], monthly: [] };
    return {
      daily: evaluations.filter(e => e.target.period_type === 'daily'),
      weekly: evaluations.filter(e => e.target.period_type === 'weekly'),
      monthly: evaluations.filter(e => e.target.period_type === 'monthly'),
    };
  }, [evaluations]);

  const fetchColumnDropdownOptions = async (columnKey: string) => {
    if (!columnKey) {
      setColumnDropdownOptions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/company/dropdown-options/${columnKey}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const options = await response.json();
        const values = options.map((opt: DropdownOption) => opt.value);
        setColumnDropdownOptions(values);
      } else {
        const column = columns?.find(c => c.column_key === columnKey);
        if (column?.config?.dropdown_options) {
          setColumnDropdownOptions(column.config.dropdown_options);
        } else {
          setColumnDropdownOptions([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
      const column = columns?.find(c => c.column_key === columnKey);
      if (column?.config?.dropdown_options) {
        setColumnDropdownOptions(column.config.dropdown_options);
      } else {
        setColumnDropdownOptions([]);
      }
    }
  };

  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

  useEffect(() => {
    if (compareColumnId && !isLoadingEditData) {
      fetchColumnDropdownOptions(compareColumnId);
      setCompareFromValues([]);
      setCompareToValues([]);
    } else if (!compareColumnId) {
      setColumnDropdownOptions([]);
    }
  }, [compareColumnId]);

  const fetchSingleColumnDropdownOptions = async (columnKey: string) => {
    if (!columnKey) {
      setSingleColumnDropdownOptions([]);
      return;
    }
    
    const column = columns?.find(c => c.column_key === columnKey);
    if (!column || column.type !== 'dropdown') {
      setSingleColumnDropdownOptions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/company/dropdown-options/${columnKey}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const options = await response.json();
        const values = options.map((opt: DropdownOption) => opt.value);
        setSingleColumnDropdownOptions(values);
      } else if (column?.config?.dropdown_options) {
        setSingleColumnDropdownOptions(column.config.dropdown_options);
      } else {
        setSingleColumnDropdownOptions([]);
      }
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
      if (column?.config?.dropdown_options) {
        setSingleColumnDropdownOptions(column.config.dropdown_options);
      } else {
        setSingleColumnDropdownOptions([]);
      }
    }
  };

  useEffect(() => {
    if (singleColumnId && !isLoadingEditData) {
      fetchSingleColumnDropdownOptions(singleColumnId);
      setSingleValue('');
    } else if (!singleColumnId) {
      setSingleColumnDropdownOptions([]);
    }
  }, [singleColumnId, columns]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateTargetData) => {
      return apiRequest('POST', '/api/working-targets', data);
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
      return apiRequest('PATCH', `/api/working-targets/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Target updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-targets/evaluate/me'] });
      setEditDialogOpen(false);
      setSelectedTarget(null);
      setIsLoadingEditData(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update target", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/working-targets/${id}`);
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
    setSingleTargetPercentage(100);
    setCompareColumnId('');
    setCompareFromValues([]);
    setCompareToValues([]);
    setCompareResultType('count');
    setCompareTargetValue(5);
    setSelectedSheetIds([]);
    setColumnDropdownOptions([]);
    setSingleColumnDropdownOptions([]);
    setIsLoadingEditData(false);
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
          target_percentage: singleTargetPercentage,
        },
      };
    } else {
      config = {
        type: 'compare_columns',
        config: {
          column_id: compareColumnId,
          from_value: compareFromValues,
          to_value: compareToValues,
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

  const handleEditTarget = async (target: WorkingTargetRecord) => {
    setIsLoadingEditData(true);
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
      setSingleTargetPercentage(conf.target_percentage || 100);
      if (conf.column_id) {
        await fetchSingleColumnDropdownOptions(conf.column_id);
      }
    } else {
      const conf = (target.config as any).config;
      setCompareColumnId(conf.column_id);
      const fromVal = conf.from_value;
      const toVal = conf.to_value;
      setCompareFromValues(Array.isArray(fromVal) ? fromVal : (fromVal ? [fromVal] : []));
      setCompareToValues(Array.isArray(toVal) ? toVal : (toVal ? [toVal] : []));
      setCompareResultType(conf.result_type);
      setCompareTargetValue(conf.target_value);
      if (conf.column_id) {
        await fetchColumnDropdownOptions(conf.column_id);
      }
    }
    setIsLoadingEditData(false);
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
          target_percentage: singleTargetPercentage,
        },
      };
    } else {
      config = {
        type: 'compare_columns',
        config: {
          column_id: compareColumnId,
          from_value: compareFromValues,
          to_value: compareToValues,
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
        <CardContent className="p-3 space-y-2">
          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TypeIcon className={`h-4 w-4 shrink-0 ${TypeInfo.color}`} />
              <span className="font-medium text-sm truncate">{target.name}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                {PERIOD_TYPE_INFO[target.period_type as PeriodType].label}
              </Badge>
            </div>
            {result.isAchieved ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <span className="text-xs font-semibold text-primary">{Math.round(result.compliancePercentage)}%</span>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${result.isAchieved ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, result.compliancePercentage)}%` }}
            />
          </div>
          
          {/* Stats Row */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{result.currentValue}/{result.targetValue}</span>
            {target.target_type === 'single_column' && result.details.nonCompliantCount > 0 && (
              <span className="flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" />
                {result.details.nonCompliantCount}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const toggleExpandTarget = (targetId: string) => {
    setExpandedTargets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const renderAdminTargetCard = (target: WorkingTargetRecord) => {
    const TypeInfo = TARGET_TYPE_INFO[target.target_type as TargetType];
    const TypeIcon = TypeInfo.icon;
    const config = (target.config as any).config;
    const progress = aggregateData?.[target.id];
    const isExpanded = expandedTargets.has(target.id);

    let description = '';
    if (target.target_type === 'fixed') {
      const metricLabels: Record<string, string> = {
        'lead_updates': 'Lead Updates',
        'status_transitions': 'Status Transitions',
        'leads_created': 'Leads Added'
      };
      description = `${metricLabels[config.metric] || config.metric} >= ${config.target_value}`;
    } else if (target.target_type === 'single_column') {
      description = `${getColumnName(config.column_id)} ${config.operator} ${config.value || ''}`.trim();
    } else {
      description = `${getColumnName(config.column_id)}: ${config.from_value} → ${config.to_value} (${config.target_value})`;
    }

    const achievedPercentage = progress && progress.totalUsers > 0 
      ? Math.round((progress.achievedCount / progress.totalUsers) * 100) 
      : 0;

    return (
      <Card key={target.id} className="overflow-hidden" data-testid={`card-target-admin-${target.id}`}>
        {/* Compact Header - Clean, Classic Style */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TypeIcon className={`h-4 w-4 shrink-0 ${TypeInfo.color}`} />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate" title={target.name}>{target.name}</h3>
                <p className="text-xs text-muted-foreground truncate" title={description}>{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge 
                variant={target.is_active ? "default" : "secondary"}
                className={`text-[10px] h-5 ${target.is_active ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                {target.is_active ? "Active" : "Off"}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {PERIOD_TYPE_INFO[target.period_type as PeriodType].label}
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className="p-3 space-y-2">
          {/* Compact Stats Row */}
          {target.is_active && progress && progress.totalUsers > 0 && (
            <div className="space-y-2">
              {/* Inline Stats */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span><strong className="text-primary">{Math.round(progress.averageCompliancePercentage)}%</strong> avg</span>
                  <span><strong className="text-green-600">{progress.achievedCount}</strong>/{progress.totalUsers} achieved</span>
                </div>
                <span className="text-muted-foreground">{progress.totalCurrentValue}/{progress.totalTargetValue}</span>
              </div>

              {/* Compact Progress Bar - shows average compliance percentage */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(progress.averageCompliancePercentage))}%` }}
                />
              </div>

              {/* Expandable User List - Compact */}
              {progress.userProgress.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleExpandTarget(target.id)}
                    className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1"
                    data-testid={`button-toggle-users-${target.id}`}
                  >
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {progress.userProgress.length} users
                    </span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-1 max-h-32 overflow-y-auto mt-1">
                      {[...progress.userProgress]
                        .sort((a, b) => b.compliancePercentage - a.compliancePercentage)
                        .map((userProg, idx) => (
                        <div 
                          key={userProg.userId} 
                          className="flex items-center justify-between gap-2 py-1 px-2 text-xs rounded bg-muted/30"
                          data-testid={`user-progress-${userProg.userId}`}
                        >
                          <span className="truncate">{userProg.userName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-muted-foreground">{userProg.currentValue}/{userProg.targetValue}</span>
                            {userProg.isAchieved ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <span className="w-8 text-right">{Math.round(userProg.compliancePercentage)}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact Status Messages */}
          {target.is_active && progress && progress.totalUsers === 0 && (
            <div className="py-2 text-center text-xs text-muted-foreground">No users assigned</div>
          )}
          {!target.is_active && (
            <div className="py-2 text-center text-xs text-muted-foreground">Target inactive</div>
          )}
          {target.is_active && isTargetLoading(target.id) && (
            <div className="py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </div>
          )}
          {target.is_active && !progress && !isTargetLoading(target.id) && (
            <div className="py-2 text-center text-xs text-muted-foreground">No data</div>
          )}

          {/* Compact Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-[10px] text-muted-foreground">
              {target.sheet_ids && target.sheet_ids.length > 0 
                ? `${target.sheet_ids.length} sheet(s)`
                : 'All sheets'}
            </span>
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" onClick={() => handleEditTarget(target)} className="h-6 w-6" data-testid={`button-edit-target-${target.id}`}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: target.id, data: { is_active: !target.is_active } })} className="h-6 w-6" data-testid={`button-toggle-target-${target.id}`}>
                {target.is_active ? <XCircle className="h-3 w-3 text-muted-foreground" /> : <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setSelectedTarget(target); setDeleteDialogOpen(true); }} className="h-6 w-6" data-testid={`button-delete-target-${target.id}`}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Helper to determine per-target loading state
  const isTargetLoading = (targetId: string) => {
    return aggregateLoading && !aggregateData?.[targetId];
  };

  // Helper to determine if aggregate data is stale (refetching)
  const isDataStale = aggregateLoading && !!aggregateData;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 sm:p-4">
      {/* Compact Header with Tabs Inline */}
      <div className="flex items-center gap-3 shrink-0 border-b pb-2 mb-2">
        {/* Title - Compact */}
        <div className="flex items-center gap-2 shrink-0">
          <Crosshair className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-working-target-title">Working Targets</h1>
        </div>

        {/* Underline-style Tabs - Inline */}
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'progress' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-progress"
          >
            My Progress
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'admin' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-admin"
            >
              Manage Targets
            </button>
          )}
        </div>

        {/* Create Button - Right Aligned */}
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-target" className="ml-auto shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        )}
      </div>

      {/* Content Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsContent value="progress" className="mt-0 flex-1 min-h-0 flex flex-col">
          {evaluationsLoading ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : evaluations && evaluations.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4" data-testid="progress-scroll-area">
              {/* Daily Targets Section */}
              {groupedEvaluations.daily.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <h2 className="text-sm font-medium" data-testid="section-daily-targets">Daily</h2>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{groupedEvaluations.daily.length}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {groupedEvaluations.daily.map(renderProgressCard)}
                  </div>
                </section>
              )}

              {/* Weekly Targets Section */}
              {groupedEvaluations.weekly.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <h2 className="text-sm font-medium" data-testid="section-weekly-targets">Weekly</h2>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{groupedEvaluations.weekly.length}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {groupedEvaluations.weekly.map(renderProgressCard)}
                  </div>
                </section>
              )}

              {/* Monthly Targets Section */}
              {groupedEvaluations.monthly.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <h2 className="text-sm font-medium" data-testid="section-monthly-targets">Monthly</h2>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{groupedEvaluations.monthly.length}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {groupedEvaluations.monthly.map(renderProgressCard)}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active targets</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-0 flex-1 min-h-0 flex flex-col">
            {/* Compact Filters Bar - Single Row */}
            <div className="flex flex-wrap items-center gap-2 pb-2 shrink-0">
              {/* Sheet Filter - Compact */}
              <Select value={adminSheetFilter} onValueChange={setAdminSheetFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-sheet-filter">
                  <SelectValue placeholder="All Sheets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sheets</SelectItem>
                  {sheets?.map(sheet => (
                    <SelectItem key={sheet.id} value={sheet.id}>{sheet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Separator */}
              <div className="h-4 w-px bg-border" />

              {/* Period Filter Pills - Compact Inline */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant={periodFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriodFilter('all')}
                  className="h-7 px-2 text-xs"
                  data-testid="tab-period-all"
                >
                  All {targets && targets.length > 0 && <span className="ml-1 text-muted-foreground">{targets.length}</span>}
                </Button>
                <Button
                  variant={periodFilter === 'daily' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriodFilter('daily')}
                  className="h-7 px-2 text-xs"
                  data-testid="tab-period-daily"
                >
                  Daily {targets && targets.filter(t => t.period_type === 'daily').length > 0 && <span className="ml-1 text-muted-foreground">{targets.filter(t => t.period_type === 'daily').length}</span>}
                </Button>
                <Button
                  variant={periodFilter === 'weekly' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriodFilter('weekly')}
                  className="h-7 px-2 text-xs"
                  data-testid="tab-period-weekly"
                >
                  Weekly {targets && targets.filter(t => t.period_type === 'weekly').length > 0 && <span className="ml-1 text-muted-foreground">{targets.filter(t => t.period_type === 'weekly').length}</span>}
                </Button>
                <Button
                  variant={periodFilter === 'monthly' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriodFilter('monthly')}
                  className="h-7 px-2 text-xs"
                  data-testid="tab-period-monthly"
                >
                  Monthly {targets && targets.filter(t => t.period_type === 'monthly').length > 0 && <span className="ml-1 text-muted-foreground">{targets.filter(t => t.period_type === 'monthly').length}</span>}
                </Button>
              </div>

              {/* Loading indicator */}
              {isDataStale && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1" data-testid="admin-scroll-area">
              {targetsLoading ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
                </div>
              ) : (() => {
                const filteredTargets = targets?.filter(t => 
                  periodFilter === 'all' || t.period_type === periodFilter
                ) || [];
                
                if (filteredTargets.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          {periodFilter === 'all' ? 'No targets created yet' : `No ${periodFilter} targets`}
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                          Create performance targets to track your team's progress and achievements
                        </p>
                        <Button onClick={() => { 
                          if (periodFilter !== 'all') setPeriodType(periodFilter as PeriodType);
                          setCreateDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create {periodFilter !== 'all' ? periodFilter.charAt(0).toUpperCase() + periodFilter.slice(1) : ''} Target
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <div className="grid gap-2 md:grid-cols-2 pb-4" data-testid="admin-targets-grid">
                    {filteredTargets.map(renderAdminTargetCard)}
                  </div>
                );
              })()}
            </div>
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
                            <SelectItem value="leads_created">Leads Added (Manual Only)</SelectItem>
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
                          {singleColumnDropdownOptions.length > 0 ? (
                            <Select value={singleValue} onValueChange={setSingleValue}>
                              <SelectTrigger data-testid="select-single-value">
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {singleColumnDropdownOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={singleValue}
                              onChange={(e) => setSingleValue(e.target.value)}
                              placeholder="Enter value to compare"
                              data-testid="input-single-value"
                            />
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Target Compliance (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={singleTargetPercentage}
                          onChange={(e) => setSingleTargetPercentage(parseInt(e.target.value) || 100)}
                          placeholder="Enter target percentage"
                          data-testid="input-single-target-percentage"
                        />
                        <p className="text-xs text-muted-foreground">
                          Percentage of touched leads that must meet the condition
                        </p>
                      </div>
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
                            {columns?.filter(col => col.type === 'dropdown').map((col) => (
                              <SelectItem key={col.column_key} value={col.column_key}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {columns && columns.filter(col => col.type === 'dropdown').length === 0 && (
                          <p className="text-xs text-muted-foreground text-amber-600">
                            No dropdown columns found. Status transitions require dropdown columns.
                          </p>
                        )}
                      </div>
                      
                      {compareColumnId && columnDropdownOptions.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>From Values (Initial)</Label>
                            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                              {columnDropdownOptions.map((option) => (
                                <div key={option} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`from-${option}`}
                                    checked={compareFromValues.includes(option)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setCompareFromValues([...compareFromValues, option]);
                                      } else {
                                        setCompareFromValues(compareFromValues.filter(v => v !== option));
                                      }
                                    }}
                                    data-testid={`checkbox-from-${option}`}
                                  />
                                  <label htmlFor={`from-${option}`} className="text-sm cursor-pointer">
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {compareFromValues.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Selected: {compareFromValues.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>To Values (Target)</Label>
                            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                              {columnDropdownOptions.map((option) => (
                                <div key={option} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`to-${option}`}
                                    checked={compareToValues.includes(option)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setCompareToValues([...compareToValues, option]);
                                      } else {
                                        setCompareToValues(compareToValues.filter(v => v !== option));
                                      }
                                    }}
                                    data-testid={`checkbox-to-${option}`}
                                  />
                                  <label htmlFor={`to-${option}`} className="text-sm cursor-pointer">
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {compareToValues.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Selected: {compareToValues.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {compareColumnId && columnDropdownOptions.length === 0 && (
                        <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                          <AlertCircle className="h-4 w-4 inline-block mr-1" />
                          No dropdown options found for this column. Please configure options in Column Settings.
                        </div>
                      )}
                      
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
                          <SelectItem value="leads_created">Leads Added (Manual Only)</SelectItem>
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
                        {singleColumnDropdownOptions.length > 0 ? (
                          <Select value={singleValue} onValueChange={setSingleValue}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {singleColumnDropdownOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={singleValue}
                            onChange={(e) => setSingleValue(e.target.value)}
                          />
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Target Compliance (%)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={singleTargetPercentage}
                        onChange={(e) => setSingleTargetPercentage(parseInt(e.target.value) || 100)}
                      />
                    </div>
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
                          {columns?.filter(col => col.type === 'dropdown').map((col) => (
                            <SelectItem key={col.column_key} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {compareColumnId && columnDropdownOptions.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From Values (Initial)</Label>
                          <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                            {columnDropdownOptions.map((option) => (
                              <div key={option} className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-from-${option}`}
                                  checked={compareFromValues.includes(option)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setCompareFromValues([...compareFromValues, option]);
                                    } else {
                                      setCompareFromValues(compareFromValues.filter(v => v !== option));
                                    }
                                  }}
                                />
                                <label htmlFor={`edit-from-${option}`} className="text-sm cursor-pointer">
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                          {compareFromValues.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Selected: {compareFromValues.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>To Values (Target)</Label>
                          <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                            {columnDropdownOptions.map((option) => (
                              <div key={option} className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-to-${option}`}
                                  checked={compareToValues.includes(option)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setCompareToValues([...compareToValues, option]);
                                    } else {
                                      setCompareToValues(compareToValues.filter(v => v !== option));
                                    }
                                  }}
                                />
                                <label htmlFor={`edit-to-${option}`} className="text-sm cursor-pointer">
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                          {compareToValues.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Selected: {compareToValues.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {compareColumnId && columnDropdownOptions.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                        <AlertCircle className="h-4 w-4 inline-block mr-1" />
                        No dropdown options found for this column.
                      </div>
                    )}
                    
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
