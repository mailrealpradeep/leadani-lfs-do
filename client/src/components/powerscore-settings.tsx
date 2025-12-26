import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Pencil, Trash2, Sparkles, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronLeft, RefreshCw, LogIn, FileEdit, Phone, User, Mail, MapPin, Calendar, MessageSquare, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PowerScoreRule, PowerScorePendingApproval, CustomColumn } from "@shared/schema";

const ACTION_TYPES = [
  { 
    value: "lead_update", 
    label: "Lead Update",
    description: "Points for updating a lead record (adds to lead history)",
    icon: FileEdit,
  },
  { 
    value: "login", 
    label: "Login",
    description: "Points for logging in (once per 24 hours)",
    icon: LogIn,
  },
  { 
    value: "dropdown_change", 
    label: "Dropdown Field Change",
    description: "Points when a dropdown field value changes",
    icon: RefreshCw,
  },
  { 
    value: "lead_created", 
    label: "Lead Created",
    description: "Points for adding a new lead manually (excludes webhook/import)",
    icon: Plus,
  },
] as const;

interface LeadDetails {
  id: string;
  full_name: string;
  mobile: string;
  email: string;
  status: string;
  address: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface LeadUpdate {
  id: string;
  remark: string;
  nfdt: string | null;
  created_at: string;
  created_by_user_id: string;
}

interface PendingApprovalWithUser extends PowerScorePendingApproval {
  user_name?: string;
  lead_full_name?: string;
  lead_mobile?: string;
  lead_details?: LeadDetails | null;
  lead_updates?: LeadUpdate[];
}

interface WizardState {
  step: 1 | 2 | 3;
  actionType: "lead_update" | "login" | "dropdown_change" | "lead_created";
  columnKey: string;
  fromValues: string[];
  toValues: string[];
  name: string;
  points: number;
  dailyCap: number | null;
  requiresApproval: boolean;
  showAnimationTo: "user_only" | "all_users" | "admins_only" | "none";
}

const ANIMATION_VISIBILITY_OPTIONS = [
  { value: "user_only", label: "User Only", description: "Only the user who earned sees the animation" },
  { value: "all_users", label: "All Users", description: "Everyone in company sees (with user's name)" },
  { value: "admins_only", label: "Admins Only", description: "Only company admins see the animation" },
  { value: "none", label: "No Animation", description: "Points awarded silently" },
] as const;

const initialWizardState: WizardState = {
  step: 1,
  actionType: "lead_update",
  columnKey: "",
  fromValues: [],
  toValues: [],
  name: "",
  points: 10,
  dailyCap: null,
  requiresApproval: false,
  showAnimationTo: "user_only",
};

export function PowerScoreSettings() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PowerScoreRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState>(initialWizardState);
  const [selectedApproval, setSelectedApproval] = useState<PendingApprovalWithUser | null>(null);

  const { data: rules = [], isLoading: rulesLoading } = useQuery<PowerScoreRule[]>({
    queryKey: ["/api/powerscore/rules"],
  });

  const { data: pendingApprovalsData } = useQuery<{ approvals: PendingApprovalWithUser[] }>({
    queryKey: ["/api/powerscore/pending-approvals"],
  });

  const { data: columns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const pendingApprovals = pendingApprovalsData?.approvals || [];

  const dropdownColumns = columns.filter(col => col.type === "dropdown");

  const selectedColumn = dropdownColumns.find(col => col.column_key === wizard.columnKey);
  const dropdownOptions = selectedColumn?.config?.dropdown_options || [];

  const createRuleMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      action_type: string;
      config: { column_key?: string; from_values?: string[]; to_values?: string[] };
      points: number;
      daily_cap: number | null;
      requires_approval: boolean;
      show_animation_to: string;
    }) => {
      return await apiRequest("POST", "/api/powerscore/rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/rules"] });
      handleCloseDialog();
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
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/powerscore/rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/rules"] });
      handleCloseDialog();
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
      return await apiRequest("POST", `/api/powerscore/pending-approvals/${id}/review`, { action });
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

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingRule(null);
    setWizard(initialWizardState);
  };

  const openCreateDialog = () => {
    setWizard(initialWizardState);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (rule: PowerScoreRule) => {
    setEditingRule(rule);
    const startStep = rule.action_type === "dropdown_change" ? 2 : 3;
    setWizard({
      step: startStep as 1 | 2 | 3,
      actionType: rule.action_type as WizardState["actionType"],
      columnKey: rule.config?.column_key || "",
      fromValues: rule.config?.from_values || [],
      toValues: rule.config?.to_values || [],
      name: rule.name,
      points: rule.points,
      dailyCap: rule.daily_cap,
      requiresApproval: rule.requires_approval,
      showAnimationTo: (rule.show_animation_to as WizardState["showAnimationTo"]) || "user_only",
    });
    setIsCreateDialogOpen(true);
  };

  const handleNext = () => {
    if (wizard.step === 1) {
      if (!canProceedFromStep1) return;
      if (wizard.actionType === "dropdown_change") {
        setWizard(prev => ({ ...prev, step: 2 }));
      } else {
        setWizard(prev => ({ ...prev, step: 3 }));
      }
    } else if (wizard.step === 2) {
      if (!canProceedFromStep2) return;
      setWizard(prev => ({ ...prev, step: 3 }));
    }
  };

  const handleBack = () => {
    if (wizard.step === 3) {
      if (wizard.actionType === "dropdown_change") {
        setWizard(prev => ({ ...prev, step: 2 }));
      } else {
        setWizard(prev => ({ ...prev, step: 1 }));
      }
    } else if (wizard.step === 2) {
      setWizard(prev => ({ ...prev, step: 1 }));
    }
  };

  const handleSubmit = () => {
    const data = {
      name: wizard.name,
      action_type: wizard.actionType,
      config: wizard.actionType === "dropdown_change" ? {
        column_key: wizard.columnKey,
        from_values: wizard.fromValues,
        to_values: wizard.toValues,
      } : {},
      points: wizard.points,
      daily_cap: wizard.dailyCap,
      requires_approval: wizard.requiresApproval,
      show_animation_to: wizard.showAnimationTo,
    };

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const canProceedFromStep1 = !!wizard.actionType;
  const canProceedFromStep2 = wizard.actionType !== "dropdown_change" || 
    (wizard.columnKey && wizard.toValues.length > 0);
  const canSubmit = wizard.name.trim() !== "" && wizard.points >= 0;

  const toggleFromValue = (value: string) => {
    setWizard(prev => ({
      ...prev,
      fromValues: prev.fromValues.includes(value)
        ? prev.fromValues.filter(v => v !== value)
        : [...prev.fromValues, value],
    }));
  };

  const toggleToValue = (value: string) => {
    setWizard(prev => ({
      ...prev,
      toValues: prev.toValues.includes(value)
        ? prev.toValues.filter(v => v !== value)
        : [...prev.toValues, value],
    }));
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  const getColumnLabel = (columnKey: string) => {
    return columns.find(c => c.column_key === columnKey)?.name || columnKey;
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
    <Tabs defaultValue="rules" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="rules" data-testid="tab-rules">
          <Sparkles className="h-4 w-4 mr-2" />
          Scoring Rules
        </TabsTrigger>
        <TabsTrigger value="approvals" data-testid="tab-approvals">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Pending Approvals
          {pendingApprovals.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rules" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Configure scoring rules for PowerScore
          </p>
          <Button onClick={openCreateDialog} data-testid="button-add-rule">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No scoring rules configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first rule to start awarding points
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-base">
                            {rule.name}
                          </span>
                          <Badge variant={rule.points > 0 ? "default" : "secondary"}>
                            {rule.points > 0 ? "+" : ""}{rule.points} pts
                          </Badge>
                          {rule.requires_approval && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Approval Required
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
                          {getActionLabel(rule.action_type)}
                          {rule.action_type === "dropdown_change" && rule.config?.column_key && (
                            <span> - {getColumnLabel(rule.config.column_key)}</span>
                          )}
                        </p>
                        {rule.action_type === "dropdown_change" && rule.config && (
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                            {rule.config.from_values && rule.config.from_values.length > 0 && (
                              <span>From: {rule.config.from_values.join(", ")}</span>
                            )}
                            {rule.config.from_values && rule.config.from_values.length > 0 && 
                             rule.config.to_values && rule.config.to_values.length > 0 && (
                              <span>→</span>
                            )}
                            {rule.config.to_values && rule.config.to_values.length > 0 && (
                              <span>To: {rule.config.to_values.join(", ")}</span>
                            )}
                          </div>
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
                const hasLeadDetails = !!approval.lead_details;
                return (
                  <Card 
                    key={approval.id} 
                    className={hasLeadDetails ? "cursor-pointer hover-elevate" : ""}
                    onClick={hasLeadDetails ? () => setSelectedApproval(approval) : undefined}
                    data-testid={`approval-card-${approval.id}`}
                  >
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
                            {getActionLabel(approval.action_type)}
                          </p>
                          {approval.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {approval.description}
                            </p>
                          )}
                          {/* Lead Info Section */}
                          {approval.lead_details && (
                            <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{approval.lead_details.full_name || "No Name"}</span>
                              </div>
                              {approval.lead_details.mobile && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-4 w-4" />
                                  <span>{approval.lead_details.mobile}</span>
                                </div>
                              )}
                              {hasLeadDetails && (
                                <div className="flex items-center gap-1 text-xs text-primary mt-1">
                                  <Eye className="h-3 w-3" />
                                  <span>Click to view full details</span>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Date: {approval.score_date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

      {/* Create/Edit Rule Wizard Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Scoring Rule" : "Create Scoring Rule"}
            </DialogTitle>
            <DialogDescription>
              Step {wizard.step} of 3: {
                wizard.step === 1 ? "Choose action type" :
                wizard.step === 2 ? "Configure conditions" :
                "Set points and options"
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full transition-colors ${
                  step <= wizard.step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="py-4">
            {/* Step 1: Action Type Selection */}
            {wizard.step === 1 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Select Action Type</Label>
                {ACTION_TYPES.map((action) => {
                  const Icon = action.icon;
                  const isSelected = wizard.actionType === action.value;
                  return (
                    <Card
                      key={action.value}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        isSelected ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setWizard(prev => ({ ...prev, actionType: action.value as WizardState["actionType"] }))}
                      data-testid={`action-type-${action.value}`}
                    >
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className={`p-2 rounded-md ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-sm text-muted-foreground">{action.description}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Step 2: Measure Action (only for dropdown_change) */}
            {wizard.step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Select Dropdown Column</Label>
                  <Select
                    value={wizard.columnKey}
                    onValueChange={(value) => setWizard(prev => ({ 
                      ...prev, 
                      columnKey: value,
                      fromValues: [],
                      toValues: [],
                    }))}
                  >
                    <SelectTrigger data-testid="select-column" className={!wizard.columnKey ? "border-yellow-500" : ""}>
                      <SelectValue placeholder="Choose a dropdown column" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownColumns.map((col) => (
                        <SelectItem key={col.column_key} value={col.column_key}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!wizard.columnKey && (
                    <p className="text-xs text-yellow-600">Please select a column to continue</p>
                  )}
                </div>

                {wizard.columnKey && dropdownOptions.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">From Values (optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to match any previous value
                      </p>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        <div className="space-y-2">
                          {dropdownOptions.map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <Checkbox
                                id={`from-${option}`}
                                checked={wizard.fromValues.includes(option)}
                                onCheckedChange={() => toggleFromValue(option)}
                                data-testid={`from-value-${option}`}
                              />
                              <label
                                htmlFor={`from-${option}`}
                                className="text-sm cursor-pointer"
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">To Values (required)</Label>
                      <p className="text-xs text-muted-foreground">
                        Select which new values trigger points
                      </p>
                      <ScrollArea className={`h-32 border rounded-md p-2 ${wizard.toValues.length === 0 ? "border-yellow-500" : ""}`}>
                        <div className="space-y-2">
                          {dropdownOptions.map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <Checkbox
                                id={`to-${option}`}
                                checked={wizard.toValues.includes(option)}
                                onCheckedChange={() => toggleToValue(option)}
                                data-testid={`to-value-${option}`}
                              />
                              <label
                                htmlFor={`to-${option}`}
                                className="text-sm cursor-pointer"
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {wizard.toValues.length === 0 && (
                        <p className="text-xs text-yellow-600">Select at least one target value</p>
                      )}
                    </div>
                  </>
                )}

                {wizard.columnKey && dropdownOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This column has no dropdown options configured.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Points and Options */}
            {wizard.step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name" className="text-base font-medium">Rule Name</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., Visit Completion Bonus"
                    value={wizard.name}
                    onChange={(e) => setWizard(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-rule-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-base font-medium">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={0}
                    value={wizard.points}
                    onChange={(e) => setWizard(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    data-testid="input-points"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-cap" className="text-base font-medium">Daily Cap (optional)</Label>
                  <Input
                    id="daily-cap"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={wizard.dailyCap ?? ""}
                    onChange={(e) => setWizard(prev => ({ 
                      ...prev, 
                      dailyCap: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    data-testid="input-daily-cap"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum points per day for this action
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Requires Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Admin must approve before points are credited
                    </p>
                  </div>
                  <Switch
                    checked={wizard.requiresApproval}
                    onCheckedChange={(checked) => setWizard(prev => ({ ...prev, requiresApproval: checked }))}
                    data-testid="toggle-requires-approval"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="show-animation-to" className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Point Animation
                  </Label>
                  <Select 
                    value={wizard.showAnimationTo} 
                    onValueChange={(value: WizardState["showAnimationTo"]) => 
                      setWizard(prev => ({ ...prev, showAnimationTo: value }))
                    }
                  >
                    <SelectTrigger className="w-full" data-testid="select-show-animation-to">
                      <SelectValue placeholder="Select who sees the animation" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_VISIBILITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="font-medium">{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ANIMATION_VISIBILITY_OPTIONS.find(o => o.value === wizard.showAnimationTo)?.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {wizard.step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {wizard.step === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            )}
            {wizard.step < 3 && (
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  (wizard.step === 1 && !canProceedFromStep1) ||
                  (wizard.step === 2 && !canProceedFromStep2)
                }
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {wizard.step === 3 && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || createRuleMutation.isPending || updateRuleMutation.isPending}
                data-testid="button-submit"
              >
                {(createRuleMutation.isPending || updateRuleMutation.isPending) 
                  ? "Saving..." 
                  : editingRule ? "Update Rule" : "Create Rule"
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoring Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the scoring rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteRuleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Lead Details
            </DialogTitle>
            <DialogDescription>
              Review lead information before approving points
            </DialogDescription>
          </DialogHeader>
          
          {selectedApproval?.lead_details && (
            <div className="space-y-4">
              {/* Approval Info */}
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{getActionLabel(selectedApproval.action_type)}</Badge>
                  <Badge>+{selectedApproval.points} pts</Badge>
                  <span className="text-sm text-muted-foreground">
                    by {selectedApproval.user_name}
                  </span>
                </div>
                {selectedApproval.description && (
                  <p className="text-sm mt-2">{selectedApproval.description}</p>
                )}
              </div>

              {/* Lead Basic Info */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedApproval.lead_details.full_name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                        <p className="font-medium">{selectedApproval.lead_details.mobile || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedApproval.lead_details.email || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedApproval.lead_details.address || "—"}</p>
                      </div>
                    </div>
                  </div>
                  {selectedApproval.lead_details.status && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedApproval.lead_details.status}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Fields */}
              {selectedApproval.lead_details.custom_fields && 
               Object.keys(selectedApproval.lead_details.custom_fields).length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2">Custom Fields</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedApproval.lead_details.custom_fields).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-muted-foreground">{key}: </span>
                          <span className="font-medium">
                            {Array.isArray(value) ? value.join(", ") : String(value || "—")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lead Updates History */}
              {selectedApproval.lead_updates && selectedApproval.lead_updates.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Recent Updates ({selectedApproval.lead_updates.length})
                    </h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {selectedApproval.lead_updates.map((update) => (
                          <div key={update.id} className="p-2 bg-muted/50 rounded text-sm">
                            <p>{update.remark || "No remark"}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(update.created_at).toLocaleString()}</span>
                              {update.nfdt && (
                                <>
                                  <Calendar className="h-3 w-3 ml-2" />
                                  <span>NFDT: {new Date(update.nfdt).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedApproval(null)}
              data-testid="button-close-lead-details"
            >
              Close
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-600"
              onClick={() => {
                if (selectedApproval) {
                  approvalMutation.mutate({ id: selectedApproval.id, action: "reject" });
                  setSelectedApproval(null);
                }
              }}
              disabled={approvalMutation.isPending}
              data-testid="button-reject-from-dialog"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedApproval) {
                  approvalMutation.mutate({ id: selectedApproval.id, action: "approve" });
                  setSelectedApproval(null);
                }
              }}
              disabled={approvalMutation.isPending}
              data-testid="button-approve-from-dialog"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
