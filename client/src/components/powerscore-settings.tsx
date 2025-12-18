import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Sparkles, AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PowerScoreRule, PowerScorePendingApproval } from "@shared/schema";

const ACTION_TYPE_LABELS: Record<string, string> = {
  lead_update: "Lead Update",
  status_transition: "Status Transition",
  visit_scheduled: "Visit Scheduled",
  visit_completed: "Visit Completed",
  lead_converted: "Lead Converted",
  lead_created: "Lead Created",
  milestone_bonus: "Milestone Bonus",
  login_bonus: "Login Bonus",
  admin_appreciation: "Admin Appreciation",
};

const ACTION_TYPE_DESCRIPTIONS: Record<string, string> = {
  lead_update: "Points earned when user updates a lead",
  status_transition: "Points for transitioning lead status",
  visit_scheduled: "Points when a visit is scheduled",
  visit_completed: "Points when a visit is completed",
  lead_converted: "Points when a lead is converted to customer",
  lead_created: "Points when a new lead is created",
  milestone_bonus: "Bonus points for hitting milestones",
  login_bonus: "Points for logging in during bonus window",
  admin_appreciation: "Points given by admin as recognition",
};

interface PendingApprovalWithUser extends PowerScorePendingApproval {
  user_name?: string;
  lead_full_name?: string;
}

const ruleFormSchema = z.object({
  action_type: z.string().min(1, "Action type is required"),
  points: z.number().min(0, "Points must be 0 or more"),
  daily_cap: z.number().nullable(),
  requires_approval: z.boolean(),
  is_enabled: z.boolean(),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

export function PowerScoreSettings() {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<PowerScoreRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  const createForm = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      action_type: "lead_update",
      points: 10,
      daily_cap: null,
      requires_approval: false,
      is_enabled: true,
    },
  });

  const editForm = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      action_type: "lead_update",
      points: 10,
      daily_cap: null,
      requires_approval: false,
      is_enabled: true,
    },
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<PowerScoreRule[]>({
    queryKey: ["/api/powerscore/rules"],
  });

  const { data: pendingApprovalsData } = useQuery<{ approvals: PendingApprovalWithUser[] }>({
    queryKey: ["/api/powerscore/pending-approvals"],
  });

  const pendingApprovals = pendingApprovalsData?.approvals || [];

  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      return await apiRequest("POST", "/api/powerscore/rules", {
        ...data,
        config: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/rules"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Rule created",
        description: "New scoring rule has been added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RuleFormData> & { id: string }) => {
      return await apiRequest("PATCH", `/api/powerscore/rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/rules"] });
      setEditingRule(null);
      editForm.reset();
      toast({
        title: "Rule updated",
        description: "Scoring rule has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/powerscore/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/rules"] });
      setDeleteRuleId(null);
      toast({
        title: "Rule deleted",
        description: "Scoring rule has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      setProcessingApprovalId(id);
      return await apiRequest("POST", `/api/powerscore/pending-approvals/${id}/${action}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
      toast({
        title: variables.action === "approve" ? "Approved" : "Rejected",
        description: `Points have been ${variables.action === "approve" ? "credited" : "declined"}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingApprovalId(null);
    },
  });

  const openEditDialog = (rule: PowerScoreRule) => {
    setEditingRule(rule);
    editForm.reset({
      action_type: rule.action_type,
      points: rule.points,
      daily_cap: rule.daily_cap,
      requires_approval: rule.requires_approval,
      is_enabled: rule.is_enabled,
    });
  };

  const onCreateSubmit = (data: RuleFormData) => {
    createRuleMutation.mutate(data);
  };

  const onEditSubmit = (data: RuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, ...data });
    }
  };

  if (rulesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="rules" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="rules" data-testid="tab-powerscore-rules">
          <Sparkles className="h-4 w-4 mr-2" />
          Scoring Rules
        </TabsTrigger>
        <TabsTrigger value="approvals" data-testid="tab-powerscore-approvals">
          <Clock className="h-4 w-4 mr-2" />
          Pending Approvals
          {pendingApprovals.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingApprovals.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rules" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Configure how users earn points for different actions
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-rule">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No scoring rules configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add rules to start tracking user achievements
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_enabled ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {ACTION_TYPE_LABELS[rule.action_type] || rule.action_type}
                          </span>
                          <Badge variant={rule.points > 0 ? "default" : "secondary"}>
                            {rule.points > 0 ? "+" : ""}{rule.points} pts
                          </Badge>
                          {rule.requires_approval && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Requires Approval
                            </Badge>
                          )}
                          {rule.daily_cap && (
                            <Badge variant="outline">
                              Cap: {rule.daily_cap}/day
                            </Badge>
                          )}
                          {!rule.is_enabled && (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ACTION_TYPE_DESCRIPTIONS[rule.action_type]}
                        </p>
                        {rule.config && (rule.config.column_key || rule.config.to_value) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {rule.config.column_key && `Column: ${rule.config.column_key}`}
                            {rule.config.from_value && ` | From: ${rule.config.from_value}`}
                            {rule.config.to_value && ` | To: ${rule.config.to_value}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_enabled}
                          onCheckedChange={(checked) => {
                            updateRuleMutation.mutate({ id: rule.id, is_enabled: checked });
                          }}
                          data-testid={`toggle-rule-${rule.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(rule)}
                          data-testid={`button-edit-rule-${rule.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDeleteRuleId(rule.id)}
                          data-testid={`button-delete-rule-${rule.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="approvals" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Review and approve high-value actions before points are credited
        </p>

        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">No pending approvals</p>
              <p className="text-sm text-muted-foreground mt-1">
                All high-value actions have been reviewed
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {pendingApprovals.map((approval) => {
                const isProcessing = processingApprovalId === approval.id;
                return (
                  <Card key={approval.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {approval.user_name || "Unknown User"}
                            </span>
                            <Badge>
                              +{approval.points} pts
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {ACTION_TYPE_LABELS[approval.action_type] || approval.action_type}
                            {approval.lead_full_name && ` - ${approval.lead_full_name}`}
                          </p>
                          {approval.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {approval.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Date: {approval.score_date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600"
                            onClick={() => approvalMutation.mutate({ id: approval.id, action: "reject" })}
                            disabled={isProcessing || approvalMutation.isPending}
                            data-testid={`button-reject-${approval.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approvalMutation.mutate({ id: approval.id, action: "approve" })}
                            disabled={isProcessing || approvalMutation.isPending}
                            data-testid={`button-approve-${approval.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scoring Rule</DialogTitle>
            <DialogDescription>
              Add a new rule to define how users earn points
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-action-type">
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="daily_cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Cap (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="No limit"
                        data-testid="input-daily-cap"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum points per day for this action type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="requires_approval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Approval</FormLabel>
                      <FormDescription>
                        Admin must approve before points are credited
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="toggle-requires-approval"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  data-testid="button-save-rule"
                >
                  {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scoring Rule</DialogTitle>
            <DialogDescription>
              Modify the scoring rule settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-action-type">
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-edit-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="daily_cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Cap (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="No limit"
                        data-testid="input-edit-daily-cap"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum points per day for this action type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="requires_approval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Approval</FormLabel>
                      <FormDescription>
                        Admin must approve before points are credited
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="toggle-edit-requires-approval"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingRule(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateRuleMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateRuleMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoring Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scoring rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteRuleMutation.isPending ? "Deleting..." : "Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
