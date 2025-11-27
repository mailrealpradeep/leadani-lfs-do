import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isPast, parseISO, isBefore, startOfDay } from "date-fns";
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

interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  status: "pending" | "ongoing" | "completed";
  user_remarks: string | null;
  admin_remarks: string | null;
  assigned_to_user_id: string;
  created_by_user_id: string;
  assigned_to_name: string;
  created_by_name: string;
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

function getDueDateClass(dueDate: string | null, status: string): string {
  if (!dueDate || status === "completed") return "";
  const due = parseISO(dueDate);
  const today = startOfDay(new Date());
  
  if (isBefore(due, today)) {
    return "text-red-600 dark:text-red-400 font-medium";
  }
  if (isToday(due)) {
    return "text-amber-600 dark:text-amber-400 font-medium";
  }
  return "";
}

function getDueDateBadgeVariant(dueDate: string | null, status: string): "destructive" | "secondary" | "outline" {
  if (!dueDate || status === "completed") return "secondary";
  const due = parseISO(dueDate);
  const today = startOfDay(new Date());
  
  if (isBefore(due, today)) return "destructive";
  if (isToday(due)) return "secondary";
  return "outline";
}

export default function Tasks() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    due_date: "",
    assigned_to_user_id: "",
    admin_remarks: "",
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", statusFilter === "active" ? "" : "includeCompleted=true"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === "active") {
        params.set("status", "pending,ongoing");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("includeCompleted", statusFilter === "all" || statusFilter === "completed" ? "true" : "false");
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: "include",
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
      const response = await fetch(`/api/tasks/${selectedTask.id}/updates`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch task updates");
      return response.json();
    },
    enabled: !!selectedTask && isViewDialogOpen,
  });

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (assignedFilter !== "all") {
      filtered = filtered.filter(t => t.assigned_to_user_id === assignedFilter);
    }
    return filtered.sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, assignedFilter]);

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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      start_date: "",
      due_date: "",
      assigned_to_user_id: user?.id || "",
      admin_remarks: "",
    });
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
      updateData.start_date = formData.start_date || null;
      updateData.due_date = formData.due_date || null;
      updateData.assigned_to_user_id = formData.assigned_to_user_id;
      updateData.admin_remarks = formData.admin_remarks;
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
      start_date: task.start_date || "",
      due_date: task.due_date || "",
      assigned_to_user_id: task.assigned_to_user_id,
      admin_remarks: task.admin_remarks || "",
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

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
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
              <SelectTrigger className="w-[180px]" data-testid="select-assigned-filter">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {filteredTasks.length === 0 ? (
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
              {filteredTasks.map(task => (
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
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <TasksGrid 
              tasks={filteredTasks}
              isAdmin={isAdmin}
              onView={openViewDialog}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onStatusChange={handleStatusChange}
              canEditTask={canEditTask}
              canDeleteTask={canDeleteTask}
            />
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task {isAdmin ? "for yourself or assign it to a team member" : "for yourself"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                rows={3}
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
          <DialogFooter>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTask?.title}
              <Badge className={STATUS_COLORS[selectedTask?.status || "pending"]}>
                {STATUS_LABELS[selectedTask?.status || "pending"]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned To</Label>
                  <p className="font-medium">{selectedTask.assigned_to_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created By</Label>
                  <p className="font-medium">{selectedTask.created_by_name}</p>
                </div>
                {selectedTask.start_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Start Date</Label>
                    <p>{format(parseISO(selectedTask.start_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Due Date</Label>
                    <p className={getDueDateClass(selectedTask.due_date, selectedTask.status)}>
                      {format(parseISO(selectedTask.due_date), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="whitespace-pre-wrap mt-1">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.admin_remarks && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Admin Remarks</Label>
                  <p className="whitespace-pre-wrap mt-1">{selectedTask.admin_remarks}</p>
                </div>
              )}

              {selectedTask.user_remarks && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">User Remarks</Label>
                  <p className="whitespace-pre-wrap mt-1">{selectedTask.user_remarks}</p>
                </div>
              )}

              {selectedTask.linked_leads && selectedTask.linked_leads.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Linked Leads</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.linked_leads.map(lead => (
                      <Badge key={lead.id} variant="outline">
                        <Link2 className="h-3 w-3 mr-1" />
                        {lead.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {taskUpdates.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Activity History</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="space-y-3">
                      {taskUpdates.map(update => (
                        <div key={update.id} className="text-sm border-b pb-2 last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{update.user_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(update.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{update.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                    rows={3}
                    data-testid="input-edit-task-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <p className="text-sm text-muted-foreground">
                  As a user, you can update the status of your tasks using the dropdown in the task list.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            {isAdmin && (
              <Button 
                onClick={handleEditTask} 
                disabled={updateMutation.isPending}
                data-testid="button-update-task"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
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
}: { 
  task: Task; 
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-task-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={STATUS_COLORS[task.status]} variant="secondary">
                {STATUS_LABELS[task.status]}
              </Badge>
              {task.due_date && (
                <Badge variant={getDueDateBadgeVariant(task.due_date, task.status)}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(parseISO(task.due_date), "MMM d")}
                </Badge>
              )}
            </div>
            <h3 className="font-medium truncate" onClick={onView} style={{ cursor: "pointer" }}>
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
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-task-menu-${task.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStatusChange("pending")} disabled={task.status === "pending"}>
                    Set as Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("ongoing")} disabled={task.status === "ongoing"}>
                    Set as Ongoing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("completed")} disabled={task.status === "completed"}>
                    Mark Completed
                  </DropdownMenuItem>
                </>
              )}
              {isAdmin && canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
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

function TasksGrid({ 
  tasks, 
  isAdmin, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusChange,
  canEditTask,
  canDeleteTask,
}: { 
  tasks: Task[]; 
  isAdmin: boolean;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-sm">Title</th>
            <th className="text-left p-3 font-medium text-sm w-[120px]">Status</th>
            <th className="text-left p-3 font-medium text-sm w-[150px]">Assigned To</th>
            <th className="text-left p-3 font-medium text-sm w-[120px]">Due Date</th>
            <th className="text-left p-3 font-medium text-sm w-[120px]">Created</th>
            <th className="text-center p-3 font-medium text-sm w-[80px]">Actions</th>
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
              <td className="p-3">
                {task.due_date ? (
                  <span className={getDueDateClass(task.due_date, task.status)}>
                    {format(parseISO(task.due_date), "MMM d, yyyy")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {format(parseISO(task.created_at), "MMM d, yyyy")}
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
