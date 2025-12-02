import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { AlertCircle, Camera, Check, Clock, LogIn, LogOut, MapPin, AlertTriangle, X, Settings, CheckCircle, XCircle, Loader2, Plus, Trash2 } from "lucide-react";
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

export default function Attendance() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { formatDate, formatTime, formatInTimezone } = useCompanyTimezone();
  const isAdmin = isCompanyAdmin || isSuperAdmin;

  const [forceExitDialogOpen, setForceExitDialogOpen] = useState(false);
  const [forceExitReason, setForceExitReason] = useState("");
  const [blockingReasons, setBlockingReasons] = useState<string[]>([]);
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
      toast({
        title: "Exit Recorded",
        description: "Your attendance exit has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      if (error.blocking_reasons) {
        setBlockingReasons(error.blocking_reasons);
        setForceExitDialogOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Exit Failed",
          description: error.message,
        });
      }
    },
  });

  const forceExitMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest("POST", "/api/attendance/force-exit", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      setForceExitDialogOpen(false);
      setForceExitReason("");
      setBlockingReasons([]);
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Exit Rules
                    </CardTitle>
                    <CardDescription>Configure requirements for normal exit</CardDescription>
                  </div>
                  <Button onClick={() => setAddRuleDialogOpen(true)} size="sm" data-testid="button-add-rule">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No exit rules configured</p>
                    <p className="text-sm">Add rules to require conditions before employees can exit</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                        data-testid={`rule-${rule.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            <Badge variant="outline">{rule.rule_type.replace("_", " ")}</Badge>
                          </div>
                          {rule.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {rule.description}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground mt-1">
                            {rule.rule_type === "min_leads" && `Minimum ${rule.config.min_count || 1} leads`}
                            {rule.rule_type === "min_hours" && `Minimum ${rule.config.min_hours || 8} hours`}
                            {rule.rule_type === "min_updates" && `Minimum ${rule.config.min_count || 1} updates`}
                            {rule.rule_type === "nfdt_not_empty" && "All leads must have NFDT filled"}
                            {rule.rule_type === "nfdt_not_past" && "No leads with past NFDT dates"}
                            {rule.rule_type === "tomorrow_visits_updated" && "Tomorrow's visits must be updated today"}
                            {rule.rule_type === "today_leads_updated" && "All leads received today must be updated"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={(checked) => toggleRuleMutation.mutate({ ruleId: rule.id, is_enabled: checked })}
                            data-testid={`switch-rule-${rule.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Exit Blocked
            </DialogTitle>
            <DialogDescription>
              You cannot exit normally because the following conditions are not met:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <ul className="list-disc list-inside space-y-1">
                {blockingReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm">{reason}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-exit-reason">
                Reason for Force Exit <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="force-exit-reason"
                placeholder="Please explain why you need to exit early..."
                value={forceExitReason}
                onChange={(e) => setForceExitReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-force-exit-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceExitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceExit}
              disabled={forceExitMutation.isPending || !forceExitReason.trim()}
              data-testid="button-submit-force-exit"
            >
              {forceExitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Force Exit
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
      </div>
    </div>
  );
}
