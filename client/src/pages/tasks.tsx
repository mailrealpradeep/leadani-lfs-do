import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isWithinInterval } from "date-fns";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Link2,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  Filter,
  X,
  MessageSquare,
  Repeat,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  start_date: string | null;
  due_date: string | null;
  status: "pending" | "ongoing" | "completed";
  user_remarks: string | null;
  admin_remarks: string | null;
  assigned_to_user_id: string;
  created_by_user_id: string;
  assigned_to_name: string;
  created_by_name: string;
  recurrence_type: RecurrenceType;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
  linked_leads?: Array<{ id: string; full_name: string; mobile_no: string }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskCounts {
  pending: number;
  ongoing: number;
  overdue: number;
  dueToday: number;
  total: number;
}

interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  update_type: string;
  old_value: any;
  new_value: any;
  description: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  ongoing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  ongoing: "Ongoing",
  completed: "Completed",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// These functions are now defined inside the component to use timezone-aware comparisons

export default function Tasks() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  const { formatInTimezone, isBeforeToday, isSameDay, getCurrentDate } = useCompanyTimezone();
  
  // Timezone-aware date formatting and comparison functions
  const formatTaskDate = (dateStr: string | null, pattern: string = "MMM d, yyyy"): string => {
    if (!dateStr) return "";
    return formatInTimezone(dateStr, pattern);
  };
  
  const getDueDateClass = (dueDate: string | null, status: string): string => {
    if (!dueDate || status === "completed") return "";
    const due = parseISO(dueDate);
    const today = getCurrentDate();
    
    if (isBeforeToday(due)) {
      return "text-red-600 dark:text-red-400 font-medium";
    }
    if (isSameDay(due, today)) {
      return "text-amber-600 dark:text-amber-400 font-medium";
    }
    return "";
  };
  
  const getDueDateBadgeVariant = (dueDate: string | null, status: string): "destructive" | "secondary" | "outline" => {
    if (!dueDate || status === "completed") return "secondary";
    const due = parseISO(dueDate);
    const today = getCurrentDate();
    
    if (isBeforeToday(due)) return "destructive";
    if (isSameDay(due, today)) return "secondary";
    return "outline";
  };
  
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  
  // Sorting state
  type SortField = "priority" | "start_date" | "due_date" | "recurrence_type" | "assigned_to_name" | null;
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Date filter state
  type DateFilterOption = "all" | "overdue" | "today" | "tomorrow" | "this_week" | "custom";
  const [startDateFilter, setStartDateFilter] = useState<DateFilterOption>("all");
  const [dueDateFilter, setDueDateFilter] = useState<DateFilterOption>("all");
  const [customStartDateRange, setCustomStartDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [customDueDateRange, setCustomDueDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    start_date: "",
    due_date: "",
    assigned_to_user_id: "",
    admin_remarks: "",
    user_remarks: "",
    recurrence_type: "none" as RecurrenceType,
  });
  
  const [newComment, setNewComment] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { statusFilter, assignedFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === "active") {
        params.set("status", "pending,ongoing");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("includeCompleted", statusFilter === "all" || statusFilter === "completed" ? "true" : "false");
      if (assignedFilter !== "all") {
        params.set("assignedTo", assignedFilter);
      }
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });

  const { data: taskCounts } = useQuery<TaskCounts>({
    queryKey: ["/api/tasks/counts"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/company/users"],
    enabled: isAdmin,
  });

  const { data: taskUpdates = [] } = useQuery<TaskUpdate[]>({
    queryKey: ["/api/tasks", selectedTask?.id, "updates"],
    queryFn: async () => {
      if (!selectedTask) return [];
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks/${selectedTask.id}/updates`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch task updates");
      return response.json();
    },
    enabled: !!selectedTask && isViewDialogOpen,
  });

  // Helper to check if a date matches a filter
  const matchesDateFilter = (dateStr: string | null, filter: DateFilterOption, customRange: { from: string; to: string }) => {
    if (filter === "all") return true;
    if (!dateStr) return false; // If no date and filter is not "all", exclude it
    
    const date = parseISO(dateStr);
    const today = getCurrentDate();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    switch (filter) {
      case "overdue":
        return isBeforeToday(date);
      case "today":
        return isWithinInterval(date, { start: todayStart, end: todayEnd });
      case "tomorrow":
        const tomorrowStart = startOfDay(addDays(today, 1));
        const tomorrowEnd = endOfDay(addDays(today, 1));
        return isWithinInterval(date, { start: tomorrowStart, end: tomorrowEnd });
      case "this_week":
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      case "custom":
        if (!customRange.from || !customRange.to) return true;
        const rangeStart = startOfDay(parseISO(customRange.from));
        const rangeEnd = endOfDay(parseISO(customRange.to));
        return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
      default:
        return true;
    }
  };

  const sortedTasks = useMemo(() => {
    // First, filter by date filters
    let filtered = [...tasks].filter(task => {
      const matchesStartDate = matchesDateFilter(task.start_date, startDateFilter, customStartDateRange);
      const matchesDueDate = matchesDateFilter(task.due_date, dueDateFilter, customDueDateRange);
      return matchesStartDate && matchesDueDate;
    });
    
    // Then sort
    return filtered.sort((a, b) => {
      // If a sort field is specified, use it
      if (sortField) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const recurrenceOrder = { daily: 0, weekly: 1, monthly: 2, none: 3 };
        
        let comparison = 0;
        
        switch (sortField) {
          case "priority":
            comparison = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
            break;
          case "start_date":
            if (!a.start_date && !b.start_date) comparison = 0;
            else if (!a.start_date) comparison = 1;
            else if (!b.start_date) comparison = -1;
            else comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            break;
          case "due_date":
            if (!a.due_date && !b.due_date) comparison = 0;
            else if (!a.due_date) comparison = 1;
            else if (!b.due_date) comparison = -1;
            else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case "recurrence_type":
            comparison = recurrenceOrder[a.recurrence_type as keyof typeof recurrenceOrder] - recurrenceOrder[b.recurrence_type as keyof typeof recurrenceOrder];
            break;
          case "assigned_to_name":
            comparison = (a.assigned_to_name || "").localeCompare(b.assigned_to_name || "");
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      }
      
      // Default sort by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, sortField, sortDirection, startDateFilter, dueDateFilter, customStartDateRange, customDueDateRange]);
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Task created", description: "The task has been created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      resetForm();
      toast({ title: "Task updated", description: "The task has been updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      toast({ title: "Task deleted", description: "The task has been deleted successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      return await apiRequest("POST", `/api/tasks/${taskId}/updates`, { comment });
    },
    onSuccess: (_, variables) => {
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", variables.taskId, "updates"] });
      }
      setNewComment("");
      toast({ title: "Update added", description: "Your update has been added" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleAddComment = () => {
    if (!selectedTask) return;
    
    const commentText = newComment.trim();
    if (!commentText) {
      toast({ variant: "destructive", title: "Error", description: "Please enter an update" });
      return;
    }
    
    addCommentMutation.mutate({ taskId: selectedTask.id, comment: commentText });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      start_date: "",
      due_date: "",
      assigned_to_user_id: user?.id || "",
      admin_remarks: "",
      user_remarks: "",
      recurrence_type: "none",
    });
    setNewComment("");
  };

  const handleCreateTask = () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Title is required" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditTask = () => {
    if (!selectedTask) return;
    const updateData: any = {};
    
    if (isAdmin) {
      updateData.title = formData.title;
      updateData.description = formData.description;
      updateData.priority = formData.priority;
      updateData.start_date = formData.start_date || null;
      updateData.due_date = formData.due_date || null;
      updateData.assigned_to_user_id = formData.assigned_to_user_id;
      updateData.admin_remarks = formData.admin_remarks;
      updateData.recurrence_type = formData.recurrence_type;
    } else {
      updateData.user_remarks = formData.user_remarks;
    }
    
    updateMutation.mutate({ taskId: selectedTask.id, data: updateData });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateMutation.mutate({ taskId, data: { status: newStatus } });
  };

  const openViewDialog = (task: Task) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      start_date: task.start_date || "",
      due_date: task.due_date || "",
      assigned_to_user_id: task.assigned_to_user_id,
      admin_remarks: task.admin_remarks || "",
      user_remarks: task.user_remarks || "",
      recurrence_type: task.recurrence_type || "none",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const canDeleteTask = (task: Task) => {
    if (isAdmin) return true;
    return task.created_by_user_id === user?.id;
  };

  const canEditTask = (task: Task) => {
    if (isAdmin) return true;
    return task.assigned_to_user_id === user?.id;
  };

  if (tasksLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 space-y-4 flex flex-col flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-tasks-title">Tasks</h1>
            {taskCounts && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-task-count">
                  {taskCounts.total} Active
                </Badge>
                {taskCounts.overdue > 0 && (
                  <Badge variant="destructive" data-testid="badge-overdue-count">
                    {taskCounts.overdue} Overdue
                  </Badge>
                )}
                {taskCounts.dueToday > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400" data-testid="badge-today-count">
                    {taskCounts.dueToday} Due Today
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => {
              resetForm();
              setFormData(prev => ({ ...prev, assigned_to_user_id: user?.id || "" }));
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-create-task"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        <div className={`${isMobile ? 'bg-muted/30 rounded-xl p-3 border border-border/50' : ''}`}>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap items-center gap-3'}`}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className={`${isMobile ? 'w-full bg-background shadow-sm' : 'w-[160px]'}`} 
                data-testid="select-status-filter"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Pending & Ongoing</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
                <SelectItem value="ongoing">Ongoing Only</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="all">All Tasks</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger 
                  className={`${isMobile ? 'w-full bg-background shadow-sm' : 'w-[180px]'}`} 
                  data-testid="select-assigned-filter"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Assigned To" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={startDateFilter} onValueChange={(v: DateFilterOption) => setStartDateFilter(v)}>
              <SelectTrigger 
                className={`${isMobile ? 'w-full bg-background shadow-sm' : 'w-[160px]'}`} 
                data-testid="select-start-date-filter"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Start Date" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Start Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueDateFilter} onValueChange={(v: DateFilterOption) => setDueDateFilter(v)}>
              <SelectTrigger 
                className={`${isMobile ? 'w-full bg-background shadow-sm' : 'w-[160px]'}`} 
                data-testid="select-due-date-filter"
              >
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Due Date" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Due Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(startDateFilter === "custom" || dueDateFilter === "custom") && (
            <div className={`flex ${isMobile ? 'flex-col gap-2 mt-2' : 'flex-wrap items-center gap-3 mt-3'}`}>
              {startDateFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Start:</span>
                  <Input
                    type="date"
                    value={customStartDateRange.from}
                    onChange={(e) => setCustomStartDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-[140px] h-8"
                    data-testid="input-start-date-from"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={customStartDateRange.to}
                    onChange={(e) => setCustomStartDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-[140px] h-8"
                    data-testid="input-start-date-to"
                  />
                </div>
              )}
              {dueDateFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Due:</span>
                  <Input
                    type="date"
                    value={customDueDateRange.from}
                    onChange={(e) => setCustomDueDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-[140px] h-8"
                    data-testid="input-due-date-from"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={customDueDateRange.to}
                    onChange={(e) => setCustomDueDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-[140px] h-8"
                    data-testid="input-due-date-to"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <Card className="flex-1">
            <CardContent className="flex flex-col items-center justify-center h-full py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === "active" 
                  ? "You have no pending or ongoing tasks" 
                  : "No tasks match the current filters"}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({ ...prev, assigned_to_user_id: user?.id || "" }));
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first task
              </Button>
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ScrollArea className="flex-1">
            <div className="space-y-3 pb-20">
              {sortedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  isAdmin={isAdmin}
                  onView={() => openViewDialog(task)}
                  onEdit={() => openEditDialog(task)}
                  onDelete={() => openDeleteDialog(task)}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                  canEdit={canEditTask(task)}
                  canDelete={canDeleteTask(task)}
                  formatTaskDate={formatTaskDate}
                  getDueDateBadgeVariant={getDueDateBadgeVariant}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <TasksGrid 
              tasks={sortedTasks}
              isAdmin={isAdmin}
              onView={openViewDialog}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onStatusChange={handleStatusChange}
              canEditTask={canEditTask}
              canDeleteTask={canDeleteTask}
              formatTaskDate={formatTaskDate}
              getDueDateClass={getDueDateClass}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task {isAdmin ? "for yourself or assign it to a team member" : "for yourself"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={2}
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: "low" | "medium" | "high") => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select 
                  value={formData.recurrence_type} 
                  onValueChange={(value: RecurrenceType) => setFormData(prev => ({ ...prev, recurrence_type: value }))}
                >
                  <SelectTrigger data-testid="select-task-recurrence">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  data-testid="input-task-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select 
                    value={formData.assigned_to_user_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to_user_id: value }))}
                  >
                    <SelectTrigger data-testid="select-task-assignee">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_remarks">Admin Remarks</Label>
                  <Textarea
                    id="admin_remarks"
                    value={formData.admin_remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, admin_remarks: e.target.value }))}
                    placeholder="Add remarks visible to the assigned user"
                    rows={2}
                    data-testid="input-task-admin-remarks"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={createMutation.isPending}
              data-testid="button-submit-task"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg leading-tight">{selectedTask?.title}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge className={STATUS_COLORS[selectedTask?.status || "pending"]}>
                {STATUS_LABELS[selectedTask?.status || "pending"]}
              </Badge>
              <Badge className={PRIORITY_COLORS[selectedTask?.priority || "medium"]}>
                {PRIORITY_LABELS[selectedTask?.priority || "medium"]} Priority
              </Badge>
            </div>
          </DialogHeader>
          {selectedTask && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned To</Label>
                  <p className="font-medium text-sm">{selectedTask.assigned_to_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created By</Label>
                  <p className="font-medium text-sm">{selectedTask.created_by_name}</p>
                </div>
                {selectedTask.start_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Start Date</Label>
                    <p className="text-sm">{formatTaskDate(selectedTask.start_date)}</p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Due Date</Label>
                    <p className={`text-sm ${getDueDateClass(selectedTask.due_date, selectedTask.status)}`}>
                      {formatTaskDate(selectedTask.due_date)}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="whitespace-pre-wrap mt-1 text-sm">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.admin_remarks && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Admin Remarks</Label>
                  <p className="whitespace-pre-wrap mt-1 text-sm">{selectedTask.admin_remarks}</p>
                </div>
              )}

              {selectedTask.user_remarks && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">User Remarks</Label>
                  <p className="whitespace-pre-wrap mt-1 text-sm">{selectedTask.user_remarks}</p>
                </div>
              )}

              {selectedTask.linked_leads && selectedTask.linked_leads.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Linked Leads</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.linked_leads.map(lead => (
                      <Badge key={lead.id} variant="outline" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        {lead.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {canEditTask(selectedTask) && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Add Update</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an update or comment..."
                      rows={2}
                      className="flex-1"
                      data-testid="input-task-comment"
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      size="sm"
                      className="self-end sm:self-end w-full sm:w-auto"
                      data-testid="button-add-comment"
                    >
                      {addCommentMutation.isPending ? "Adding..." : "Add Update"}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs mb-2 block">Updates & Activity</Label>
                <ScrollArea className="h-[150px] sm:h-[180px] border rounded-lg p-3">
                  {taskUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {taskUpdates.map(update => (
                        <div key={update.id} className="text-sm border-b pb-2 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-xs sm:text-sm">{update.user_name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatInTimezone(update.created_at, "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs sm:text-sm">{update.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No updates yet</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedTask && canEditTask(selectedTask) && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(selectedTask);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
            {isAdmin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-edit-task-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    data-testid="input-edit-task-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value: "low" | "medium" | "high") => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-task-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recurrence">Recurrence</Label>
                    <Select 
                      value={formData.recurrence_type} 
                      onValueChange={(value: RecurrenceType) => setFormData(prev => ({ ...prev, recurrence_type: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-task-recurrence">
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start_date">Start Date</Label>
                    <Input
                      id="edit-start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-due_date">Due Date</Label>
                    <Input
                      id="edit-due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-assigned_to">Assign To</Label>
                  <Select 
                    value={formData.assigned_to_user_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to_user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-admin_remarks">Admin Remarks</Label>
                  <Textarea
                    id="edit-admin_remarks"
                    value={formData.admin_remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, admin_remarks: e.target.value }))}
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  You can update your remarks below. Use the status dropdown in the task list to change status.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="user-remarks">Your Remarks</Label>
                  <Textarea
                    id="user-remarks"
                    value={formData.user_remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_remarks: e.target.value }))}
                    placeholder="Add your notes or updates about this task"
                    rows={3}
                    data-testid="input-user-remarks"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditTask} 
              disabled={updateMutation.isPending}
              data-testid="button-update-task"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedTask && deleteMutation.mutate(selectedTask.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-task"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TaskCard({ 
  task, 
  isAdmin, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusChange,
  canEdit,
  canDelete,
  formatTaskDate,
  getDueDateBadgeVariant,
}: { 
  task: Task; 
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  formatTaskDate: (date: string | null, pattern?: string) => string;
  getDueDateBadgeVariant: (dueDate: string | null, status: string) => "destructive" | "secondary" | "outline";
}) {
  return (
    <Card 
      className="hover-elevate cursor-pointer" 
      data-testid={`card-task-${task.id}`}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={STATUS_COLORS[task.status]} variant="secondary">
                {STATUS_LABELS[task.status]}
              </Badge>
              <Badge className={PRIORITY_COLORS[task.priority || "medium"]} variant="secondary">
                {PRIORITY_LABELS[task.priority || "medium"]}
              </Badge>
              {task.due_date && (
                <Badge variant={getDueDateBadgeVariant(task.due_date, task.status)}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatTaskDate(task.due_date, "MMM d")}
                </Badge>
              )}
              {task.recurrence_type && task.recurrence_type !== "none" && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  {task.recurrence_type.charAt(0).toUpperCase() + task.recurrence_type.slice(1)}
                </Badge>
              )}
            </div>
            <h3 className="font-medium truncate">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{task.assigned_to_name}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" data-testid={`button-task-menu-${task.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("pending"); }} disabled={task.status === "pending"}>
                    Set as Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("ongoing"); }} disabled={task.status === "ongoing"}>
                    Set as Ongoing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("completed"); }} disabled={task.status === "completed"}>
                    Mark Completed
                  </DropdownMenuItem>
                </>
              )}
              {isAdmin && canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

const RECURRENCE_LABELS: Record<string, string> = {
  none: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

type SortField = "priority" | "start_date" | "due_date" | "recurrence_type" | "assigned_to_name" | null;

function SortableHeader({ 
  label, 
  field, 
  sortField, 
  sortDirection, 
  onSort,
  className = ""
}: { 
  label: string; 
  field: SortField; 
  sortField: SortField; 
  sortDirection: "asc" | "desc"; 
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = sortField === field;
  
  return (
    <th 
      className={`text-left p-3 font-medium text-sm cursor-pointer hover:bg-muted/80 transition-colors select-none ${className}`}
      onClick={() => onSort(field)}
      data-testid={`header-sort-${field}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
        )}
      </div>
    </th>
  );
}

function TasksGrid({ 
  tasks, 
  isAdmin, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusChange,
  canEditTask,
  canDeleteTask,
  formatTaskDate,
  getDueDateClass,
  sortField,
  sortDirection,
  onSort,
}: { 
  tasks: Task[]; 
  isAdmin: boolean;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  formatTaskDate: (date: string | null, pattern?: string) => string;
  getDueDateClass: (dueDate: string | null, status: string) => string;
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-sm">Title</th>
            <SortableHeader label="Priority" field="priority" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-[100px]" />
            <th className="text-left p-3 font-medium text-sm w-[120px]">Status</th>
            <SortableHeader label="Assigned To" field="assigned_to_name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-[140px]" />
            <SortableHeader label="Start Date" field="start_date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-[110px]" />
            <SortableHeader label="Due Date" field="due_date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-[110px]" />
            <SortableHeader label="Recurrence" field="recurrence_type" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-[110px]" />
            <th className="text-center p-3 font-medium text-sm w-[80px]">Updates</th>
            <th className="text-center p-3 font-medium text-sm w-[70px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr 
              key={task.id} 
              className="border-b hover:bg-muted/30 transition-colors"
              data-testid={`row-task-${task.id}`}
            >
              <td className="p-3">
                <div 
                  className="font-medium cursor-pointer hover:text-primary"
                  onClick={() => onView(task)}
                >
                  {task.title}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                    {task.description}
                  </p>
                )}
              </td>
              <td className="p-3">
                <Badge className={PRIORITY_COLORS[task.priority || "medium"]} variant="secondary">
                  {PRIORITY_LABELS[task.priority || "medium"]}
                </Badge>
              </td>
              <td className="p-3">
                {canEditTask(task) ? (
                  <Select 
                    value={task.status} 
                    onValueChange={(value) => onStatusChange(task.id, value)}
                  >
                    <SelectTrigger className="h-8 w-[110px]" data-testid={`select-status-${task.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={STATUS_COLORS[task.status]}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                )}
              </td>
              <td className="p-3 text-sm">
                {task.assigned_to_name}
              </td>
              <td className="p-3 text-sm">
                {task.start_date ? (
                  <span>{formatTaskDate(task.start_date)}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3">
                {task.due_date ? (
                  <span className={getDueDateClass(task.due_date, task.status)}>
                    {formatTaskDate(task.due_date)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3 text-sm">
                <Badge variant="outline" className="text-xs">
                  {RECURRENCE_LABELS[task.recurrence_type] || "One-time"}
                </Badge>
              </td>
              <td className="p-3 text-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onView(task)}
                  className="gap-1"
                  data-testid={`button-view-updates-${task.id}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">View</span>
                </Button>
              </td>
              <td className="p-3 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-grid-task-menu-${task.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(task)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {isAdmin && canEditTask(task) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Task
                        </DropdownMenuItem>
                      </>
                    )}
                    {canDeleteTask(task) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(task)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Task
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
