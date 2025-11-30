import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Target,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  AlertCircle,
  Check,
  X,
  Edit,
  Copy,
  MoreVertical,
  RefreshCw,
  BarChart3,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  TargetWithDetails,
  Sheet,
  User,
  CustomColumn,
  InsertTarget,
  TargetCondition,
  TargetGoalConfig,
} from "@shared/schema";

const GOAL_TYPES = [
  { value: "count", label: "Count Leads", description: "Count leads matching conditions" },
  { value: "sum", label: "Sum Values", description: "Sum of a numeric column" },
  { value: "average", label: "Average Value", description: "Average of a numeric column" },
  { value: "percentage", label: "Percentage", description: "Percentage of leads meeting criteria" },
  { value: "updates", label: "Lead Updates", description: "Number of lead updates" },
  { value: "conversion", label: "Conversion Rate", description: "Convert from one status to another" },
  { value: "compliance", label: "NFDT Compliance", description: "Follow-up date compliance rate" },
] as const;

const OPERATORS = [
  { value: "equals", label: "Equals", types: ["text", "number", "dropdown"] },
  { value: "not_equals", label: "Not Equals", types: ["text", "number", "dropdown"] },
  { value: "contains", label: "Contains", types: ["text"] },
  { value: "not_contains", label: "Does Not Contain", types: ["text"] },
  { value: "starts_with", label: "Starts With", types: ["text"] },
  { value: "ends_with", label: "Ends With", types: ["text"] },
  { value: "is_empty", label: "Is Empty", types: ["text", "number", "dropdown"] },
  { value: "is_not_empty", label: "Is Not Empty", types: ["text", "number", "dropdown"] },
  { value: "in", label: "Is One Of", types: ["dropdown"] },
  { value: "not_in", label: "Is Not One Of", types: ["dropdown"] },
  { value: "greater_than", label: "Greater Than", types: ["number"] },
  { value: "less_than", label: "Less Than", types: ["number"] },
  { value: "greater_equal", label: "Greater or Equal", types: ["number"] },
  { value: "less_equal", label: "Less or Equal", types: ["number"] },
  { value: "between", label: "Between", types: ["number"] },
  { value: "is_today", label: "Is Today", types: ["date"] },
  { value: "is_this_week", label: "Is This Week", types: ["date"] },
  { value: "is_this_month", label: "Is This Month", types: ["date"] },
  { value: "is_overdue", label: "Is Overdue", types: ["date"] },
] as const;

const INDUSTRY_PRESETS = {
  education: {
    label: "Education",
    goals: [
      { name: "New Inquiries", type: "count", condition: { status: "inquiry" } },
      { name: "Demo Calls", type: "count", condition: { status: "demo_scheduled" } },
      { name: "Admission Conversion", type: "conversion", from: "inquiry", to: "admitted" },
    ],
  },
  real_estate: {
    label: "Real Estate",
    goals: [
      { name: "Site Visits", type: "count", condition: { status: "site_visit" } },
      { name: "Booking Amount", type: "sum", column: "booking_amount" },
      { name: "Closure Rate", type: "percentage", condition: { status: "closed" } },
    ],
  },
  retail: {
    label: "Retail",
    goals: [
      { name: "Customer Contacts", type: "count", condition: {} },
      { name: "Sales Value", type: "sum", column: "sale_amount" },
      { name: "Repeat Customers", type: "percentage", condition: { is_repeat: true } },
    ],
  },
  it_services: {
    label: "IT Services",
    goals: [
      { name: "Proposals Sent", type: "count", condition: { status: "proposal" } },
      { name: "Contract Value", type: "sum", column: "contract_value" },
      { name: "Win Rate", type: "conversion", from: "proposal", to: "won" },
    ],
  },
  construction: {
    label: "Construction",
    goals: [
      { name: "Site Quotations", type: "count", condition: { status: "quoted" } },
      { name: "Project Value", type: "sum", column: "project_value" },
      { name: "Approval Rate", type: "percentage", condition: { status: "approved" } },
    ],
  },
};

const targetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  assignment_type: z.enum(["individual", "team", "all_users"]),
  scope_type: z.enum(["company_wide", "specific_sheets", "multiple_sheets"]),
  time_type: z.enum(["one_time", "recurring"]),
  recurring_frequency: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  start_date: z.date(),
  end_date: z.date().nullable().optional(),
  enable_notifications: z.boolean().default(true),
  notification_milestones: z.array(z.number()).default([20, 40, 60, 80, 100]),
  track_overachievement: z.boolean().default(false),
  scope_sheet_ids: z.array(z.string()).optional(),
  assigned_user_ids: z.array(z.string()).optional(),
  goals: z.array(z.object({
    name: z.string().min(1, "Goal name is required"),
    goal_type: z.enum(["count", "sum", "average", "percentage", "updates", "conversion", "compliance"]),
    target_value: z.number().min(0, "Target value must be positive"),
    column_key: z.string().optional(),
    conditions: z.array(z.any()).optional(),
    logical_operator: z.enum(["and", "or"]).default("and"),
    numerator_conditions: z.array(z.any()).optional(),
    denominator_conditions: z.array(z.any()).optional(),
  })).min(1, "At least one goal is required"),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

interface SimpleCondition {
  column_key: string;
  operator: string;
  value?: any;
  value2?: any;
}

interface ConditionBuilderProps {
  columns: CustomColumn[];
  conditions: SimpleCondition[];
  onChange: (conditions: SimpleCondition[]) => void;
  logicalOperator: "and" | "or";
  onLogicalOperatorChange: (op: "and" | "or") => void;
}

function ConditionBuilder({
  columns,
  conditions,
  onChange,
  logicalOperator,
  onLogicalOperatorChange,
}: ConditionBuilderProps) {
  const addCondition = () => {
    const firstCol = columns[0];
    onChange([
      ...conditions,
      {
        column_key: firstCol?.column_key || "",
        operator: "equals",
        value: "",
      },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<SimpleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const getOperatorsForColumn = (columnKey: string) => {
    const col = columns.find(c => c.column_key === columnKey);
    if (!col) return OPERATORS;
    const colType = col.type as string;
    return OPERATORS.filter(op => (op.types as readonly string[]).includes(colType));
  };

  return (
    <div className="space-y-3">
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm">Match</Label>
          <Select value={logicalOperator} onValueChange={(v) => onLogicalOperatorChange(v as "and" | "or")}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">All</SelectItem>
              <SelectItem value="or">Any</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">conditions</span>
        </div>
      )}

      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
          <Select
            value={condition.column_key}
            onValueChange={(v) => updateCondition(index, { column_key: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.column_key} value={col.column_key}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(v) => updateCondition(index, { operator: v })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOperatorsForColumn(condition.column_key).map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!["is_empty", "is_not_empty", "is_today", "is_this_week", "is_this_month", "is_overdue"].includes(condition.operator) && (
            <Input
              value={condition.value || ""}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
              placeholder="Value"
              className="w-32"
              data-testid={`condition-value-${index}`}
            />
          )}

          {condition.operator === "between" && (
            <Input
              value={condition.value2 || ""}
              onChange={(e) => updateCondition(index, { value2: e.target.value })}
              placeholder="To"
              className="w-24"
              data-testid={`condition-value2-${index}`}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeCondition(index)}
            data-testid={`remove-condition-${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addCondition}
        data-testid="add-condition"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Condition
      </Button>
    </div>
  );
}

interface GoalBuilderProps {
  columns: CustomColumn[];
  goals: TargetFormData["goals"];
  onChange: (goals: TargetFormData["goals"]) => void;
}

function GoalBuilder({ columns, goals, onChange }: GoalBuilderProps) {
  const [expandedGoal, setExpandedGoal] = useState<number | null>(0);

  const addGoal = () => {
    onChange([
      ...goals,
      {
        name: `Goal ${goals.length + 1}`,
        goal_type: "count",
        target_value: 10,
        conditions: [],
        logical_operator: "and",
      },
    ]);
    setExpandedGoal(goals.length);
  };

  const updateGoal = (index: number, updates: Partial<TargetFormData["goals"][0]>) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], ...updates };
    onChange(newGoals);
  };

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
    setExpandedGoal(null);
  };

  return (
    <div className="space-y-3">
      {goals.map((goal, index) => (
        <Collapsible
          key={index}
          open={expandedGoal === index}
          onOpenChange={(open) => setExpandedGoal(open ? index : null)}
        >
          <div className="border rounded-lg">
            <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate">
              <div className="flex items-center gap-3">
                {expandedGoal === index ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">{goal.name || `Goal ${index + 1}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {GOAL_TYPES.find(t => t.value === goal.goal_type)?.label} • Target: {goal.target_value}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {GOAL_TYPES.find(t => t.value === goal.goal_type)?.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGoal(index);
                  }}
                  disabled={goals.length === 1}
                  data-testid={`remove-goal-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4 border-t">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Goal Name</Label>
                    <Input
                      value={goal.name}
                      onChange={(e) => updateGoal(index, { name: e.target.value })}
                      placeholder="e.g., New Leads, Conversions"
                      data-testid={`goal-name-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Goal Type</Label>
                    <Select
                      value={goal.goal_type}
                      onValueChange={(v) => updateGoal(index, { goal_type: v as any })}
                    >
                      <SelectTrigger data-testid={`goal-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div>{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={goal.target_value}
                    onChange={(e) => updateGoal(index, { target_value: parseFloat(e.target.value) || 0 })}
                    data-testid={`goal-target-${index}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {goal.goal_type === "percentage" || goal.goal_type === "conversion" || goal.goal_type === "compliance"
                      ? "Enter as percentage (0-100)"
                      : "Enter the number to achieve"}
                  </p>
                </div>

                {(goal.goal_type === "sum" || goal.goal_type === "average") && (
                  <div className="space-y-2">
                    <Label>Column to Calculate</Label>
                    <Select
                      value={goal.column_key || ""}
                      onValueChange={(v) => updateGoal(index, { column_key: v })}
                    >
                      <SelectTrigger data-testid={`goal-column-${index}`}>
                        <SelectValue placeholder="Select numeric column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns
                          .filter(c => c.type === "number" || c.type === "percentage")
                          .map((col) => (
                            <SelectItem key={col.column_key} value={col.column_key}>
                              {col.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Conditions (when to count leads)</Label>
                  <ConditionBuilder
                    columns={columns}
                    conditions={goal.conditions || []}
                    onChange={(conditions) => updateGoal(index, { conditions })}
                    logicalOperator={goal.logical_operator || "and"}
                    onLogicalOperatorChange={(op) => updateGoal(index, { logical_operator: op })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      <Button
        variant="outline"
        onClick={addGoal}
        className="w-full"
        data-testid="add-goal"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Goal
      </Button>
    </div>
  );
}

interface TargetCardProps {
  target: TargetWithDetails;
  onEdit: (target: TargetWithDetails) => void;
  onDelete: (target: TargetWithDetails) => void;
  onRecalculate: (targetId: string) => void;
}

function TargetCard({ target, onEdit, onDelete, onRecalculate }: TargetCardProps) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card className="hover-elevate" data-testid={`target-card-${target.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{target.name}</CardTitle>
            {target.description && (
              <CardDescription className="line-clamp-2">{target.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={statusColors[target.status]}>
              {target.status.charAt(0).toUpperCase() + target.status.slice(1)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`target-menu-${target.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(target)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRecalculate(target.id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalculate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(target)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {target.assignment_type === "all_users"
                ? "All Users"
                : `${target.assigned_users?.length || 0} Users`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {target.time_type === "recurring" && target.recurring_frequency
                ? target.recurring_frequency.charAt(0).toUpperCase() + target.recurring_frequency.slice(1)
                : "One-time"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{target.goals?.length || 0} Goals</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Period</span>
            <span>
              {format(new Date(target.start_date), "MMM d, yyyy")}
              {target.end_date && ` - ${format(new Date(target.end_date), "MMM d, yyyy")}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Scope</span>
            <span>
              {target.scope_type === "company_wide"
                ? "All Sheets"
                : `${target.scope_sheet_ids?.length || 0} Sheets`}
            </span>
          </div>
        </div>

        {target.goals && target.goals.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium">Goals</div>
              {target.goals.slice(0, 3).map((goal: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="truncate">{goal.name}</span>
                  <Badge variant="outline" className="ml-2 flex-shrink-0">
                    Target: {goal.config?.target_value}
                  </Badge>
                </div>
              ))}
              {target.goals.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{target.goals.length - 3} more goals
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function TargetManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TargetWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: targets = [], isLoading } = useQuery<TargetWithDetails[]>({
    queryKey: ["/api/targets"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
  });

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/columns"],
  });

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      assignment_type: "individual",
      scope_type: "company_wide",
      time_type: "recurring",
      recurring_frequency: "monthly",
      start_date: new Date(),
      end_date: null,
      enable_notifications: true,
      notification_milestones: [20, 40, 60, 80, 100],
      track_overachievement: false,
      scope_sheet_ids: [],
      assigned_user_ids: [],
      goals: [
        {
          name: "New Leads",
          goal_type: "count",
          target_value: 10,
          conditions: [],
          logical_operator: "and",
        },
      ],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const payload = {
        ...data,
        start_date: data.start_date.toISOString(),
        end_date: data.end_date?.toISOString() || null,
        notification_milestones: data.enable_notifications ? data.notification_milestones : null,
      };
      return await apiRequest<TargetWithDetails>("POST", "/api/targets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: "Target created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TargetFormData> }) => {
      return await apiRequest<TargetWithDetails>("PATCH", `/api/targets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setEditTarget(null);
      toast({ title: "Target updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setDeleteTarget(null);
      toast({ title: "Target deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async (targetId: string) => {
      return await apiRequest("POST", `/api/targets/${targetId}/recalculate-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Progress recalculated for all users" });
    },
    onError: (error: any) => {
      toast({
        title: "Error recalculating progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredTargets = targets.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  const onSubmit = (data: TargetFormData) => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const watchAssignmentType = form.watch("assignment_type");
  const watchScopeType = form.watch("scope_type");
  const watchTimeType = form.watch("time_type");
  const watchGoals = form.watch("goals");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{filteredTargets.length} targets</Badge>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-target">
              <Plus className="h-4 w-4 mr-2" />
              Create Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Target</DialogTitle>
              <DialogDescription>
                Set performance goals for your team with flexible tracking options
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="flex flex-col flex-1 overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Monthly Lead Generation Target"
                              {...field}
                              data-testid="target-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add details about this target..."
                              {...field}
                              data-testid="target-description"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="assignment_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignment Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="assignment-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">
                                  <div>
                                    <div>Individual</div>
                                    <div className="text-xs text-muted-foreground">
                                      Each user has their own target
                                    </div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="team">
                                  <div>
                                    <div>Team</div>
                                    <div className="text-xs text-muted-foreground">
                                      Combined total for assigned users
                                    </div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="all_users">
                                  <div>
                                    <div>All Users</div>
                                    <div className="text-xs text-muted-foreground">
                                      Applies to everyone in company
                                    </div>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scope_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scope</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="scope-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="company_wide">
                                  All Sheets
                                </SelectItem>
                                <SelectItem value="specific_sheets">
                                  Specific Sheets
                                </SelectItem>
                                <SelectItem value="multiple_sheets">
                                  Multiple Sheets
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchAssignmentType !== "all_users" && (
                      <FormField
                        control={form.control}
                        name="assigned_user_ids"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign Users</FormLabel>
                            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={field.value?.includes(user.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, user.id]);
                                      } else {
                                        field.onChange(
                                          current.filter((id: string) => id !== user.id)
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`user-${user.id}`}
                                    className="text-sm flex-1 cursor-pointer"
                                  >
                                    {user.name} ({user.email})
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {(watchScopeType === "specific_sheets" ||
                      watchScopeType === "multiple_sheets") && (
                      <FormField
                        control={form.control}
                        name="scope_sheet_ids"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Sheets</FormLabel>
                            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                              {sheets.map((sheet) => (
                                <div
                                  key={sheet.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`sheet-${sheet.id}`}
                                    checked={field.value?.includes(sheet.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, sheet.id]);
                                      } else {
                                        field.onChange(
                                          current.filter((id: string) => id !== sheet.id)
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`sheet-${sheet.id}`}
                                    className="text-sm flex-1 cursor-pointer"
                                  >
                                    {sheet.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="time_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="time-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="one_time">One-Time</SelectItem>
                                <SelectItem value="recurring">Recurring</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {watchTimeType === "recurring" && (
                        <FormField
                          control={form.control}
                          name="recurring_frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="recurring-frequency">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    data-testid="start-date"
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {field.value
                                      ? format(field.value, "PPP")
                                      : "Pick a date"}
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
                          </FormItem>
                        )}
                      />

                      {watchTimeType === "one_time" && (
                        <FormField
                          control={form.control}
                          name="end_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                      data-testid="end-date"
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      {field.value
                                        ? format(field.value, "PPP")
                                        : "Pick a date"}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Goals</Label>
                      </div>
                      <GoalBuilder
                        columns={columns}
                        goals={watchGoals}
                        onChange={(goals) => form.setValue("goals", goals)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="enable_notifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Notifications</FormLabel>
                              <FormDescription>
                                Send milestone notifications to users
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="enable-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="track_overachievement"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Track Overachievement</FormLabel>
                              <FormDescription>
                                Continue tracking progress beyond 100%
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="track-overachievement"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <DialogFooter className="pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="submit-target"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Target"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTargets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Target className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No targets yet</h3>
              <p className="text-muted-foreground">
                Create your first performance target to start tracking team progress
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Target
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTargets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onRecalculate={(id) => recalculateMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Target</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action
              cannot be undone and will remove all associated progress data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="confirm-delete-target"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
