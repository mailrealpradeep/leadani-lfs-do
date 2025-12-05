import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { formatDistanceToNow, differenceInHours, differenceInMinutes, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Camera, Check, Clock, LogIn, LogOut, MapPin, AlertTriangle, X, Settings, CheckCircle, XCircle, Loader2, Plus, Trash2, Target, FileEdit, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceEntry {
  id: string;
  user_id: string;
  company_id: string;
  entry_time: string;
  entry_location: any;
  entry_selfie_url: string | null;
  exit_time: string | null;
  exit_type: string | null;
  force_exit_reason: string | null;
  force_exit_blocking_reasons: string[] | null;
  review_status: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

interface AttendanceRule {
  id: string;
  company_id: string;
  rule_type: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface WorkingTarget {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  target_type: string;
  period_type: string;
  config: any;
  sheet_ids: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ExitTargetResponse {
  attendance_exit_target_id: string | null;
  linked_target: WorkingTarget | null;
}

interface ExitConditionProgress {
  conditionId: string;
  targetId: string;
  targetName: string;
  targetDescription: string | null;
  current: number;
  target: number;
  percentage: number;
  minPercentage: number;
  isAchieved: boolean;
  details?: Record<string, any>;
}

interface ExitProgressResponse {
  hasTarget: boolean;
  isMultiCondition?: boolean;
  allConditionsMet?: boolean;
  conditions?: ExitConditionProgress[];
}

interface TeamExitProgressResponse {
  teamSize: number;
  usersWithProgress: number;
  completedUsers: number;
  averageProgress: number;
  completionRate: number;
  userProgress: {
    userId: string;
    userName: string;
    conditions: Array<{
      targetId: string;
      targetName: string;
      percentage: number;
      isAchieved: boolean;
    }>;
    averageProgress: number;
    allConditionsMet: boolean;
  }[];
}

interface ExitCondition {
  id: string;
  company_id: string;
  working_target_id: string;
  scope_type: 'all_users' | 'specific_users' | 'specific_sheets';
  scope_ids: string[] | null;
  min_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  target_name: string;
  target_description: string | null;
  target_period_type: string | null;
  target_is_active: boolean;
}

interface Sheet {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ParsedBlockingCondition {
  type: 'leads' | 'hours' | 'updates' | 'nfdt' | 'other';
  label: string;
  description: string;
  current?: number;
  required?: number;
  progress?: number;
  requiredPercentage?: number;
  icon: 'target' | 'clock' | 'edit' | 'calendar' | 'alert';
}

function parseBlockingReason(reason: string): ParsedBlockingCondition {
  const lowerReason = reason.toLowerCase();
  
  let currentValue: number | undefined;
  let requiredValue: number | undefined;
  let progress: number | undefined;
  let targetName: string | undefined;
  let requiredPercentage: number | undefined;
  
  // New format: Target "TargetName" not met: 3/5 (60% / 80% required)
  const newFormatMatch = reason.match(/Target "([^"]+)" not met:\s*(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)%\s*\/\s*(\d+(?:\.\d+)?)%\s*required\)/i);
  if (newFormatMatch) {
    targetName = newFormatMatch[1];
    currentValue = parseFloat(newFormatMatch[2]);
    requiredValue = parseFloat(newFormatMatch[3]);
    progress = parseFloat(newFormatMatch[4]);
    requiredPercentage = parseFloat(newFormatMatch[5]);
  } else {
    // Legacy format: "(you have X)" and "minimum Y"
    const numMatch = reason.match(/\(you have (\d+(?:\.\d+)?)\)/i);
    currentValue = numMatch ? parseFloat(numMatch[1]) : undefined;
    
    const minMatch = reason.match(/minimum (\d+(?:\.\d+)?)/i);
    requiredValue = minMatch ? parseFloat(minMatch[1]) : undefined;
    
    if (currentValue !== undefined && requiredValue !== undefined && requiredValue > 0) {
      progress = Math.min(100, (currentValue / requiredValue) * 100);
    }
  }
  
  // Determine type and icon based on content
  if (lowerReason.includes('lead') && lowerReason.includes('update')) {
    return {
      type: 'updates',
      label: targetName || 'Lead Updates',
      description: reason,
      current: currentValue,
      required: requiredValue,
      progress,
      requiredPercentage,
      icon: 'edit',
    };
  }
  
  if (lowerReason.includes('lead') && !lowerReason.includes('update')) {
    return {
      type: 'leads',
      label: targetName || 'Leads Created',
      description: reason,
      current: currentValue,
      required: requiredValue,
      progress,
      requiredPercentage,
      icon: 'target',
    };
  }
  
  if (lowerReason.includes('hour') || lowerReason.includes('minute') || lowerReason.includes('time')) {
    return {
      type: 'hours',
      label: targetName || 'Working Hours',
      description: reason,
      current: currentValue,
      required: requiredValue,
      progress,
      requiredPercentage,
      icon: 'clock',
    };
  }
  
  if (lowerReason.includes('nfdt') || lowerReason.includes('follow-up') || lowerReason.includes('followup')) {
    return {
      type: 'nfdt',
      label: targetName || 'Follow-up Dates',
      description: reason,
      current: currentValue,
      required: requiredValue,
      progress,
      requiredPercentage,
      icon: 'calendar',
    };
  }
  
  // Default case - use target name if available
  return {
    type: 'other',
    label: targetName || 'Daily Target',
    description: reason,
    current: currentValue,
    required: requiredValue,
    progress,
    requiredPercentage,
    icon: 'target',
  };
}

function getConditionIcon(iconType: ParsedBlockingCondition['icon']) {
  switch (iconType) {
    case 'target': return Target;
    case 'clock': return Clock;
    case 'edit': return FileEdit;
    case 'calendar': return Calendar;
    case 'alert': return AlertCircle;
    default: return AlertCircle;
  }
}

export default function Attendance() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { formatDate, formatTime, formatInTimezone } = useCompanyTimezone();
  const isAdmin = isCompanyAdmin || isSuperAdmin;

  const [forceExitDialogOpen, setForceExitDialogOpen] = useState(false);
  const [forceExitReason, setForceExitReason] = useState("");
  const [blockingReasons, setBlockingReasons] = useState<string[]>([]);
  const [isSystemError, setIsSystemError] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReviewEntry, setSelectedReviewEntry] = useState<AttendanceEntry | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [addRuleDialogOpen, setAddRuleDialogOpen] = useState(false);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<AttendanceEntry | null>(null);
  const [newRule, setNewRule] = useState({
    rule_type: "min_leads",
    name: "",
    description: "",
    config: {} as Record<string, any>,
  });
  
  // Exit conditions state
  const [exitConditionDialogOpen, setExitConditionDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ExitCondition | null>(null);
  const [deleteConditionDialogOpen, setDeleteConditionDialogOpen] = useState(false);
  const [conditionToDelete, setConditionToDelete] = useState<ExitCondition | null>(null);
  const [newCondition, setNewCondition] = useState({
    working_target_id: "",
    scope_type: "all_users" as 'all_users' | 'specific_users' | 'specific_sheets',
    scope_ids: [] as string[],
    min_percentage: 100,
    is_active: true,
  });

  const { data: todayEntry, isLoading: loadingToday } = useQuery<AttendanceEntry | null>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery<AttendanceEntry[]>({
    queryKey: ["/api/attendance/history"],
  });

  const { data: pendingReviews = [], isLoading: loadingReviews } = useQuery<AttendanceEntry[]>({
    queryKey: ["/api/attendance/pending-reviews"],
    enabled: isAdmin,
  });

  const { data: rules = [], isLoading: loadingRules } = useQuery<AttendanceRule[]>({
    queryKey: ["/api/attendance/rules"],
    enabled: isAdmin,
  });

  const { data: todayAllEntries = [], isLoading: loadingTodayAll } = useQuery<AttendanceEntry[]>({
    queryKey: ["/api/attendance/today/all"],
    enabled: isAdmin,
  });

  // Exit target queries
  const { data: exitTargetData } = useQuery<ExitTargetResponse>({
    queryKey: ["/api/attendance/exit-target"],
    enabled: isAdmin,
  });

  const { data: availableTargets = [] } = useQuery<WorkingTarget[]>({
    queryKey: ["/api/attendance/available-targets"],
    enabled: isAdmin,
  });

  const { data: myExitProgress } = useQuery<ExitProgressResponse>({
    queryKey: ["/api/attendance/my-exit-progress"],
  });

  // Team exit progress query (admin only)
  const { data: teamExitProgress, isLoading: loadingTeamExitProgress } = useQuery<TeamExitProgressResponse>({
    queryKey: ["/api/attendance/team/exit-progress"],
    enabled: isAdmin,
  });

  // Exit conditions queries
  const { data: exitConditions = [], isLoading: loadingExitConditions } = useQuery<ExitCondition[]>({
    queryKey: ["/api/attendance/exit-conditions"],
    enabled: isAdmin,
  });

  const { data: companyUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const { data: companySheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
    enabled: isAdmin,
  });

  const entryMutation = useMutation({
    mutationFn: async (data: { location?: any; selfie_url?: string }) => {
      return await apiRequest("POST", "/api/attendance/entry", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      toast({
        title: "Entry Recorded",
        description: "Your attendance entry has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Entry Failed",
        description: error.message,
      });
    },
  });

  const exitMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/exit", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      // Clear any previous error states on success
      setIsSystemError(false);
      setBlockingReasons([]);
      toast({
        title: "Exit Recorded",
        description: "Your attendance exit has been recorded successfully.",
      });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        // Check for system errors (target evaluation failures)
        if (error.system_error) {
          // System error - clear states and show alert, don't allow force exit
          setIsSystemError(true);
          setBlockingReasons([]);
          setForceExitDialogOpen(false);
          toast({
            variant: "destructive",
            title: "System Error",
            description: "Unable to verify exit condition. Please contact your administrator to check the target configuration.",
          });
          return;
        }
        
        // Normal blocking - clear system error flag, allow force exit
        setIsSystemError(false);
        if (error.blocking_reasons && error.blocking_reasons.length > 0) {
          setBlockingReasons(error.blocking_reasons);
          setForceExitDialogOpen(true);
          return;
        }
      }
      
      const message = error instanceof Error ? error.message : "Failed to record exit";
      toast({
        variant: "destructive",
        title: "Exit Failed",
        description: message,
      });
    },
  });

  const forceExitMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Don't allow force exit if there was a system error
      if (isSystemError) {
        throw new Error("Cannot force exit when there is a system error. Please contact your administrator.");
      }
      return await apiRequest("POST", "/api/attendance/force-exit", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      setForceExitDialogOpen(false);
      setForceExitReason("");
      setBlockingReasons([]);
      setIsSystemError(false);
      toast({
        title: "Force Exit Recorded",
        description: "Your exit has been recorded and is pending admin review.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Force Exit Failed",
        description: error.message,
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ entryId, status, notes }: { entryId: string; status: string; notes?: string }) => {
      return await apiRequest("POST", `/api/attendance/${entryId}/review`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/pending-reviews"] });
      setReviewDialogOpen(false);
      setSelectedReviewEntry(null);
      setReviewNotes("");
      toast({
        title: "Review Submitted",
        description: "The force exit has been reviewed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Review Failed",
        description: error.message,
      });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      return await apiRequest("POST", "/api/attendance/rules", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/rules"] });
      setAddRuleDialogOpen(false);
      setNewRule({ rule_type: "min_leads", name: "", description: "", config: {} });
      toast({
        title: "Rule Created",
        description: "The attendance rule has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Create Rule",
        description: error.message,
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, is_enabled }: { ruleId: string; is_enabled: boolean }) => {
      return await apiRequest("PATCH", `/api/attendance/rules/${ruleId}`, { is_enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/rules"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Rule",
        description: error.message,
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest("DELETE", `/api/attendance/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/rules"] });
      toast({
        title: "Rule Deleted",
        description: "The attendance rule has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Rule",
        description: error.message,
      });
    },
  });

  const setExitTargetMutation = useMutation({
    mutationFn: async (targetId: string | null) => {
      return await apiRequest("POST", "/api/attendance/exit-target", { target_id: targetId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/exit-target"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/my-exit-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/available-targets"] });
      toast({
        title: "Exit Condition Updated",
        description: "The attendance exit condition has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Exit Condition",
        description: error.message,
      });
    },
  });

  // Exit conditions mutations
  const createExitConditionMutation = useMutation({
    mutationFn: async (data: typeof newCondition) => {
      return await apiRequest("POST", "/api/attendance/exit-conditions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/exit-conditions"] });
      setExitConditionDialogOpen(false);
      setNewCondition({
        working_target_id: "",
        scope_type: "all_users",
        scope_ids: [],
        min_percentage: 100,
        is_active: true,
      });
      toast({
        title: "Exit Condition Created",
        description: "New exit condition has been added.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Create Exit Condition",
        description: error.message,
      });
    },
  });

  const updateExitConditionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof newCondition> }) => {
      return await apiRequest("PATCH", `/api/attendance/exit-conditions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/exit-conditions"] });
      setExitConditionDialogOpen(false);
      setEditingCondition(null);
      setNewCondition({
        working_target_id: "",
        scope_type: "all_users",
        scope_ids: [],
        min_percentage: 100,
        is_active: true,
      });
      toast({
        title: "Exit Condition Updated",
        description: "Exit condition has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Exit Condition",
        description: error.message,
      });
    },
  });

  const deleteExitConditionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/attendance/exit-conditions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/exit-conditions"] });
      setDeleteConditionDialogOpen(false);
      setConditionToDelete(null);
      toast({
        title: "Exit Condition Deleted",
        description: "Exit condition has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Exit Condition",
        description: error.message,
      });
    },
  });

  const clearAttendanceMutation = useMutation({
    mutationFn: async ({ entryId, action }: { entryId: string; action: "delete" | "clear_exit" }) => {
      return await apiRequest("POST", `/api/attendance/${entryId}/clear`, { action });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/pending-reviews"] });
      toast({
        title: action === "delete" ? "Entry Deleted" : "Exit Cleared",
        description: action === "delete" 
          ? "The attendance entry has been deleted." 
          : "The exit time has been cleared. User can now record exit again.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Clear Attendance",
        description: error.message,
      });
    },
  });

  const handleEntry = () => {
    entryMutation.mutate({});
  };

  const handleExit = () => {
    exitMutation.mutate();
  };

  const handleForceExit = () => {
    if (!forceExitReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please provide a reason for the force exit.",
      });
      return;
    }
    forceExitMutation.mutate(forceExitReason);
  };

  const handleReview = (status: "approved" | "rejected") => {
    if (!selectedReviewEntry) return;
    reviewMutation.mutate({
      entryId: selectedReviewEntry.id,
      status,
      notes: reviewNotes,
    });
  };

  const formatDuration = (entry: AttendanceEntry) => {
    const start = parseISO(entry.entry_time);
    const end = entry.exit_time ? parseISO(entry.exit_time) : new Date();
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    return `${hours}h ${minutes}m`;
  };

  const hasActiveEntry = todayEntry && !todayEntry.exit_time;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto py-4 px-4 max-w-4xl pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>

      <Tabs defaultValue="my-attendance" className="space-y-4">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: isAdmin ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
          <TabsTrigger value="my-attendance" data-testid="tab-my-attendance">My Attendance</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              Admin
              {pendingReviews.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {pendingReviews.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Status
              </CardTitle>
              <CardDescription>
                {formatInTimezone(new Date(), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingToday ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {todayEntry ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                        <LogIn className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-medium">Entry Time</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(todayEntry.entry_time)}
                          </div>
                        </div>
                      </div>

                      {todayEntry.exit_time ? (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                          <LogOut className="h-5 w-5 text-blue-500" />
                          <div className="flex-1">
                            <div className="font-medium">Exit Time</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTime(todayEntry.exit_time)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatDuration(todayEntry)}</div>
                            <div className="text-sm text-muted-foreground">Duration</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                          <Clock className="h-5 w-5 text-primary animate-pulse" />
                          <div className="flex-1">
                            <div className="font-medium text-primary">Currently Active</div>
                            <div className="text-sm text-muted-foreground">
                              Working for {formatDuration(todayEntry)}
                            </div>
                          </div>
                        </div>
                      )}

                      {todayEntry.exit_type === "forced" && todayEntry.review_status && (
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${
                          todayEntry.review_status === "pending" ? "bg-amber-50 dark:bg-amber-950/30" :
                          todayEntry.review_status === "approved" ? "bg-green-50 dark:bg-green-950/30" :
                          "bg-red-50 dark:bg-red-950/30"
                        }`}>
                          {todayEntry.review_status === "pending" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : todayEntry.review_status === "approved" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">Force Exit - {todayEntry.review_status}</div>
                            <div className="text-sm text-muted-foreground">
                              {todayEntry.force_exit_reason}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No entry recorded today</p>
                      <p className="text-sm">Tap the button below to record your entry</p>
                    </div>
                  )}

                  {/* Exit Target Progress - Multiple Conditions */}
                  {hasActiveEntry && myExitProgress?.hasTarget && myExitProgress.conditions && myExitProgress.conditions.length > 0 && (
                    <div className="py-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Exit Requirements</span>
                        {myExitProgress.allConditionsMet ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> All Met
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {myExitProgress.conditions.filter(c => c.isAchieved).length}/{myExitProgress.conditions.length} Met
                          </Badge>
                        )}
                      </div>
                      
                      {myExitProgress.conditions.map((condition) => (
                        <div 
                          key={condition.conditionId} 
                          className={`p-3 rounded-lg border ${
                            condition.isAchieved 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                              : 'bg-muted/50 border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {condition.isAchieved ? (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Target className="h-4 w-4 text-primary" />
                              )}
                              <span className="text-sm font-medium">{condition.targetName}</span>
                            </div>
                            <Badge variant={condition.isAchieved ? "default" : "secondary"}>
                              {condition.current}/{condition.target}
                            </Badge>
                          </div>
                          <Progress 
                            value={Math.min(100, (condition.percentage / condition.minPercentage) * 100)} 
                            className="h-2"
                          />
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {condition.percentage}% / {condition.minPercentage}% required
                            </span>
                            {condition.isAchieved && (
                              <span className="text-xs text-green-600 dark:text-green-400">Achieved</span>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {myExitProgress.allConditionsMet ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> All conditions met - you can exit normally
                          </span>
                        ) : (
                          "Complete all conditions to exit normally"
                        )}
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    {hasActiveEntry ? (
                      <Button
                        onClick={handleExit}
                        disabled={exitMutation.isPending}
                        className="w-full h-14 text-lg"
                        variant="destructive"
                        data-testid="button-exit"
                      >
                        {exitMutation.isPending ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="h-5 w-5 mr-2" />
                        )}
                        Record Exit
                      </Button>
                    ) : !todayEntry ? (
                      <Button
                        onClick={handleEntry}
                        disabled={entryMutation.isPending}
                        className="w-full h-14 text-lg"
                        data-testid="button-entry"
                      >
                        {entryMutation.isPending ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <LogIn className="h-5 w-5 mr-2" />
                        )}
                        Record Entry
                      </Button>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        Attendance complete for today
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance history found
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      data-testid={`attendance-entry-${entry.id}`}
                    >
                      <div>
                        <div className="font-medium">
                          {formatInTimezone(entry.entry_time, "EEEE, MMM d")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(entry.entry_time)}
                          {entry.exit_time && (
                            <> - {formatTime(entry.exit_time)}</>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatDuration(entry)}</div>
                        {entry.exit_type === "forced" && (
                          <Badge variant={
                            entry.review_status === "approved" ? "default" :
                            entry.review_status === "rejected" ? "destructive" :
                            "secondary"
                          }>
                            {entry.review_status || "Pending"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4">
            {/* Team Exit Progress Summary Card */}
            <Card data-testid="team-exit-progress-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Exit Progress
                </CardTitle>
                <CardDescription>Today's team-wide exit target completion</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeamExitProgress ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !teamExitProgress || teamExitProgress.teamSize === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No team members or exit targets configured</p>
                  </div>
                ) : teamExitProgress.usersWithProgress === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exit targets assigned to team members</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="exit-stat-team-members">
                        <div className="text-2xl font-bold" data-testid="exit-value-team-members">{teamExitProgress.teamSize}</div>
                        <div className="text-xs text-muted-foreground">Team Members</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="exit-stat-avg-progress">
                        <div className="text-2xl font-bold text-blue-600" data-testid="exit-value-avg-progress">{teamExitProgress.averageProgress}%</div>
                        <div className="text-xs text-muted-foreground">Avg Progress</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="exit-stat-completed-users">
                        <div className="text-2xl font-bold text-green-600" data-testid="exit-value-completed-users">{teamExitProgress.completedUsers}</div>
                        <div className="text-xs text-muted-foreground">Exit Ready</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="exit-stat-completion-rate">
                        <div className="text-2xl font-bold" data-testid="exit-value-completion-rate">{teamExitProgress.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">Completion Rate</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2" data-testid="exit-progress-bar-section">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Team Average Progress</span>
                        <span className="font-medium" data-testid="exit-progress-label">{teamExitProgress.averageProgress}%</span>
                      </div>
                      <Progress value={teamExitProgress.averageProgress} className="h-3" data-testid="exit-team-progress-bar" />
                    </div>
                    
                    {/* User Progress List */}
                    {teamExitProgress.userProgress.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto" data-testid="exit-user-progress-list">
                        <div className="text-sm font-medium text-muted-foreground">Individual Progress</div>
                        {teamExitProgress.userProgress.map((userProg) => (
                          <div 
                            key={userProg.userId}
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              userProg.allConditionsMet 
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                                : 'bg-muted/30'
                            }`}
                            data-testid={`team-user-exit-${userProg.userId}`}
                          >
                            <div className="flex items-center gap-2">
                              {userProg.allConditionsMet ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium" data-testid={`exit-user-name-${userProg.userId}`}>{userProg.userName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={userProg.averageProgress} className="h-2 w-16" />
                              <Badge variant={userProg.allConditionsMet ? "default" : "outline"} className="min-w-[3rem] justify-center" data-testid={`exit-user-progress-${userProg.userId}`}>
                                {userProg.averageProgress}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Attendance
                </CardTitle>
                <CardDescription>View and manage today's attendance entries for all team members</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTodayAll ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : todayAllEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance entries today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAllEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 rounded-lg border bg-card"
                        data-testid={`today-entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium">{entry.user_name}</div>
                            <div className="text-sm text-muted-foreground">{entry.user_email}</div>
                          </div>
                          <Badge variant={entry.exit_time ? "default" : "secondary"}>
                            {entry.exit_time ? "Completed" : "In Progress"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1">
                            <LogIn className="h-4 w-4 text-green-500" />
                            Entry: {formatTime(entry.entry_time)}
                          </div>
                          {entry.exit_time && (
                            <div className="flex items-center gap-1">
                              <LogOut className="h-4 w-4 text-blue-500" />
                              Exit: {formatTime(entry.exit_time)}
                              {entry.exit_type === "forced" && (
                                <Badge variant="secondary" className="ml-1">Force</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {entry.exit_time && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => clearAttendanceMutation.mutate({ entryId: entry.id, action: "clear_exit" })}
                              disabled={clearAttendanceMutation.isPending}
                              data-testid={`button-clear-exit-${entry.id}`}
                            >
                              {clearAttendanceMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Clear Exit
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setEntryToDelete(entry);
                              setDeleteEntryDialogOpen(true);
                            }}
                            disabled={clearAttendanceMutation.isPending}
                            data-testid={`button-delete-entry-${entry.id}`}
                          >
                            {clearAttendanceMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete Entry
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Force Exit Review Queue
                </CardTitle>
                <CardDescription>Review pending force exit requests from team members</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReviews ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending reviews</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingReviews.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 rounded-lg border bg-card"
                        data-testid={`review-entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium">{entry.user_name}</div>
                            <div className="text-sm text-muted-foreground">{entry.user_email}</div>
                          </div>
                          <Badge variant="secondary">
                            {formatInTimezone(entry.entry_time, "MMM d")}
                          </Badge>
                        </div>
                        <div className="text-sm mb-3">
                          <strong>Reason:</strong> {entry.force_exit_reason}
                        </div>
                        {entry.force_exit_blocking_reasons && entry.force_exit_blocking_reasons.length > 0 && (
                          <div className="text-sm mb-3">
                            <strong>Unmet Rules:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {entry.force_exit_blocking_reasons.map((reason, idx) => (
                                <li key={idx} className="text-muted-foreground">{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReviewEntry(entry);
                              setReviewDialogOpen(true);
                            }}
                            data-testid={`button-review-${entry.id}`}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Exit Conditions
                  </CardTitle>
                  <CardDescription>
                    Configure multiple conditions users must meet before exiting
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCondition(null);
                    setNewCondition({
                      working_target_id: availableTargets[0]?.id || "",
                      scope_type: "all_users",
                      scope_ids: [],
                      min_percentage: 100,
                      is_active: true,
                    });
                    setExitConditionDialogOpen(true);
                  }}
                  disabled={availableTargets.length === 0}
                  data-testid="button-add-exit-condition"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </CardHeader>
              <CardContent>
                {loadingExitConditions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : exitConditions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    {availableTargets.length === 0 ? (
                      <>
                        <p className="text-sm">No daily targets available</p>
                        <p className="text-xs mt-1">Create daily targets in Working Targets first</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">No exit conditions configured</p>
                        <p className="text-xs mt-1">Add conditions to control when users can mark exit</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exitConditions.map((condition) => (
                      <div
                        key={condition.id}
                        className={`p-4 rounded-lg border ${condition.is_active ? 'bg-card' : 'bg-muted/30 opacity-75'}`}
                        data-testid={`exit-condition-${condition.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Target className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium truncate">{condition.target_name}</span>
                              {!condition.target_is_active && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  Target Inactive
                                </Badge>
                              )}
                            </div>
                            {condition.target_description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {condition.target_description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {condition.scope_type === 'all_users' && (
                                  <><Users className="h-3 w-3 mr-1" />All Users</>
                                )}
                                {condition.scope_type === 'specific_users' && (
                                  <><Users className="h-3 w-3 mr-1" />{condition.scope_ids?.length || 0} Users</>
                                )}
                                {condition.scope_type === 'specific_sheets' && (
                                  <>Sheets: {condition.scope_ids?.length || 0}</>
                                )}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Min {condition.min_percentage}%
                              </Badge>
                              <Badge variant={condition.is_active ? "default" : "secondary"} className="text-xs">
                                {condition.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCondition(condition);
                                setNewCondition({
                                  working_target_id: condition.working_target_id,
                                  scope_type: condition.scope_type,
                                  scope_ids: condition.scope_ids || [],
                                  min_percentage: condition.min_percentage,
                                  is_active: condition.is_active,
                                });
                                setExitConditionDialogOpen(true);
                              }}
                              data-testid={`button-edit-condition-${condition.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setConditionToDelete(condition);
                                setDeleteConditionDialogOpen(true);
                              }}
                              data-testid={`button-delete-condition-${condition.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={forceExitDialogOpen} onOpenChange={setForceExitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Exit Requirements Not Met
            </DialogTitle>
            <DialogDescription>
              Please complete the following requirements before exiting, or submit a force exit request for admin review.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="space-y-3">
              {blockingReasons.map((reason, idx) => {
                const parsed = parseBlockingReason(reason);
                const IconComponent = getConditionIcon(parsed.icon);
                
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                    data-testid={`blocking-condition-${idx}`}
                  >
                    <div className="flex-shrink-0 p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                      <IconComponent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{parsed.label}</span>
                        <div className="flex items-center gap-2">
                          {parsed.current !== undefined && parsed.required !== undefined && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {parsed.current} / {parsed.required}
                            </Badge>
                          )}
                          {parsed.progress !== undefined && (
                            <Badge 
                              variant={parsed.progress >= (parsed.requiredPercentage || 100) ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {Math.round(parsed.progress)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {parsed.progress !== undefined && (
                        <div className="mb-2 relative">
                          <Progress value={parsed.progress} className="h-2.5" />
                          {parsed.requiredPercentage && parsed.requiredPercentage < 100 && (
                            <div 
                              className="absolute top-0 h-2.5 w-0.5 bg-foreground/50" 
                              style={{ left: `${parsed.requiredPercentage}%` }}
                              title={`Required: ${parsed.requiredPercentage}%`}
                            />
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {parsed.progress !== undefined && parsed.requiredPercentage !== undefined ? (
                          <>
                            Your progress: <span className="font-medium text-foreground">{Math.round(parsed.progress)}%</span> — Need at least <span className="font-medium text-foreground">{parsed.requiredPercentage}%</span> to exit.
                          </>
                        ) : parsed.current !== undefined && parsed.required !== undefined ? (
                          <>
                            You need <span className="font-medium text-foreground">{parsed.required - parsed.current} more</span> to meet this requirement.
                          </>
                        ) : (
                          parsed.description
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <XCircle className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <div className="text-sm text-muted-foreground mb-3">
                If you need to exit now, please explain why below. Your request will be reviewed by an admin.
              </div>
              <div className="space-y-2">
                <Label htmlFor="force-exit-reason" className="text-sm font-medium">
                  Reason for Early Exit <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="force-exit-reason"
                  placeholder="Example: I need to leave early for a medical appointment..."
                  value={forceExitReason}
                  onChange={(e) => setForceExitReason(e.target.value)}
                  className="min-h-[80px] resize-none"
                  data-testid="input-force-exit-reason"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setForceExitDialogOpen(false);
                setForceExitReason("");
              }}
              data-testid="button-cancel-force-exit"
            >
              Continue Working
            </Button>
            <Button
              variant="default"
              onClick={handleForceExit}
              disabled={forceExitMutation.isPending || !forceExitReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-submit-force-exit"
            >
              {forceExitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Force Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Force Exit</DialogTitle>
            <DialogDescription>
              Review the force exit request from {selectedReviewEntry?.user_name}
            </DialogDescription>
          </DialogHeader>
          {selectedReviewEntry && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm mb-2">
                  <strong>Date:</strong> {formatInTimezone(selectedReviewEntry.entry_time, "EEEE, MMM d, yyyy")}
                </div>
                <div className="text-sm mb-2">
                  <strong>Reason:</strong> {selectedReviewEntry.force_exit_reason}
                </div>
                {selectedReviewEntry.force_exit_blocking_reasons && (
                  <div className="text-sm">
                    <strong>Unmet Rules:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {selectedReviewEntry.force_exit_blocking_reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes (optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add any notes about this review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview("rejected")}
              disabled={reviewMutation.isPending}
              data-testid="button-reject-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
            <Button
              onClick={() => handleReview("approved")}
              disabled={reviewMutation.isPending}
              data-testid="button-approve-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addRuleDialogOpen} onOpenChange={setAddRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exit Rule</DialogTitle>
            <DialogDescription>
              Create a new requirement for employees to meet before they can exit normally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-type">Rule Type</Label>
              <Select
                value={newRule.rule_type}
                onValueChange={(value) => setNewRule({ ...newRule, rule_type: value, config: {} })}
              >
                <SelectTrigger data-testid="select-rule-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min_leads">Minimum Leads Added</SelectItem>
                  <SelectItem value="min_hours">Minimum Hours Worked</SelectItem>
                  <SelectItem value="min_updates">Minimum Lead Updates</SelectItem>
                  <SelectItem value="nfdt_not_empty">NFDT Not Empty</SelectItem>
                  <SelectItem value="nfdt_not_past">NFDT Not Past Date</SelectItem>
                  <SelectItem value="tomorrow_visits_updated">Tomorrow Visits Updated</SelectItem>
                  <SelectItem value="today_leads_updated">Today's Leads Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Daily Lead Requirement"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                data-testid="input-rule-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description (optional)</Label>
              <Input
                id="rule-description"
                placeholder="Brief description of this rule"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                data-testid="input-rule-description"
              />
            </div>
            {newRule.rule_type === "min_leads" && (
              <div className="space-y-2">
                <Label htmlFor="min-leads">Minimum Leads</Label>
                <Input
                  id="min-leads"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={newRule.config.min_count || ""}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    config: { ...newRule.config, min_count: parseInt(e.target.value) || 1 }
                  })}
                  data-testid="input-min-leads"
                />
              </div>
            )}
            {newRule.rule_type === "min_hours" && (
              <div className="space-y-2">
                <Label htmlFor="min-hours">Minimum Hours</Label>
                <Input
                  id="min-hours"
                  type="number"
                  min="1"
                  max="24"
                  placeholder="8"
                  value={newRule.config.min_hours || ""}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    config: { ...newRule.config, min_hours: parseFloat(e.target.value) || 8 }
                  })}
                  data-testid="input-min-hours"
                />
              </div>
            )}
            {newRule.rule_type === "min_updates" && (
              <div className="space-y-2">
                <Label htmlFor="min-updates">Minimum Updates</Label>
                <Input
                  id="min-updates"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={newRule.config.min_count || ""}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    config: { ...newRule.config, min_count: parseInt(e.target.value) || 1 }
                  })}
                  data-testid="input-min-updates"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRuleMutation.mutate(newRule)}
              disabled={createRuleMutation.isPending || !newRule.name.trim()}
              data-testid="button-create-rule"
            >
              {createRuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the entire attendance entry for {entryToDelete?.user_name}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-entry">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (entryToDelete) {
                  clearAttendanceMutation.mutate({ entryId: entryToDelete.id, action: "delete" });
                }
                setDeleteEntryDialogOpen(false);
                setEntryToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-entry"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Exit Condition Dialog */}
      <Dialog open={exitConditionDialogOpen} onOpenChange={setExitConditionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCondition ? "Edit Exit Condition" : "Add Exit Condition"}
            </DialogTitle>
            <DialogDescription>
              Configure when this condition applies and the minimum achievement required
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Daily Target</Label>
              <Select
                value={newCondition.working_target_id}
                onValueChange={(value) => setNewCondition({ ...newCondition, working_target_id: value })}
                data-testid="select-condition-target"
              >
                <SelectTrigger data-testid="trigger-condition-target">
                  <SelectValue placeholder="Select a target..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select
                value={newCondition.scope_type}
                onValueChange={(value: 'all_users' | 'specific_users' | 'specific_sheets') => 
                  setNewCondition({ ...newCondition, scope_type: value, scope_ids: [] })
                }
                data-testid="select-scope-type"
              >
                <SelectTrigger data-testid="trigger-scope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All Users</SelectItem>
                  <SelectItem value="specific_users">Specific Users</SelectItem>
                  <SelectItem value="specific_sheets">Users in Specific Sheets</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newCondition.scope_type === 'all_users' && "This condition applies to all users in the company"}
                {newCondition.scope_type === 'specific_users' && "Select which users this condition applies to"}
                {newCondition.scope_type === 'specific_sheets' && "Applies to users who have access to selected sheets"}
              </p>
            </div>

            {newCondition.scope_type === 'specific_users' && (
              <div className="space-y-2">
                <Label>Select Users</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {companyUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No users found</p>
                  ) : (
                    companyUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newCondition.scope_ids.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCondition({
                                ...newCondition,
                                scope_ids: [...newCondition.scope_ids, u.id],
                              });
                            } else {
                              setNewCondition({
                                ...newCondition,
                                scope_ids: newCondition.scope_ids.filter((id) => id !== u.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{u.name}</span>
                        <span className="text-xs text-muted-foreground">({u.email})</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {newCondition.scope_ids.length} user(s) selected
                </p>
              </div>
            )}

            {newCondition.scope_type === 'specific_sheets' && (
              <div className="space-y-2">
                <Label>Select Sheets</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {companySheets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No sheets found</p>
                  ) : (
                    companySheets.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newCondition.scope_ids.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCondition({
                                ...newCondition,
                                scope_ids: [...newCondition.scope_ids, s.id],
                              });
                            } else {
                              setNewCondition({
                                ...newCondition,
                                scope_ids: newCondition.scope_ids.filter((id) => id !== s.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {newCondition.scope_ids.length} sheet(s) selected
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="min-percentage">Minimum Achievement (%)</Label>
              <Input
                id="min-percentage"
                type="number"
                min="1"
                max="100"
                value={newCondition.min_percentage}
                onChange={(e) => setNewCondition({ 
                  ...newCondition, 
                  min_percentage: Math.min(100, Math.max(1, parseInt(e.target.value) || 100))
                })}
                data-testid="input-min-percentage"
              />
              <p className="text-xs text-muted-foreground">
                Users must achieve at least {newCondition.min_percentage}% of the target to exit normally
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="condition-active">Active</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this condition</p>
              </div>
              <Switch
                id="condition-active"
                checked={newCondition.is_active}
                onCheckedChange={(checked) => setNewCondition({ ...newCondition, is_active: checked })}
                data-testid="switch-condition-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitConditionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingCondition) {
                  updateExitConditionMutation.mutate({
                    id: editingCondition.id,
                    data: newCondition,
                  });
                } else {
                  createExitConditionMutation.mutate(newCondition);
                }
              }}
              disabled={
                !newCondition.working_target_id ||
                (newCondition.scope_type !== 'all_users' && newCondition.scope_ids.length === 0) ||
                createExitConditionMutation.isPending ||
                updateExitConditionMutation.isPending
              }
              data-testid="button-save-condition"
            >
              {(createExitConditionMutation.isPending || updateExitConditionMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCondition ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exit Condition Confirmation */}
      <AlertDialog open={deleteConditionDialogOpen} onOpenChange={setDeleteConditionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exit Condition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the exit condition for "{conditionToDelete?.target_name}"? 
              Users will no longer need to meet this condition to exit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-condition">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conditionToDelete) {
                  deleteExitConditionMutation.mutate(conditionToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-condition"
            >
              {deleteExitConditionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
