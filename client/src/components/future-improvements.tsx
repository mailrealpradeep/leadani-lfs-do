import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Lightbulb, 
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  CheckCircle2,
  Target,
  FileText,
  Save,
  X,
  GripVertical,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FutureImprovement {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'ready' | 'completed';
  priority: 'high' | 'medium' | 'low';
  estimated_effort: string | null;
  cost_estimate: string | null;
  discussion_notes: string | null;
  technical_details: {
    affected_files?: string[];
    architecture_notes?: string;
    implementation_steps?: string[];
    dependencies?: string[];
  };
  order_index: number;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  planned: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
  in_progress: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  ready: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  completed: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30"
};

const statusLabels: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  ready: "Ready to Build",
  completed: "Completed"
};

const emptyForm = {
  title: "",
  description: "",
  status: "planned" as const,
  priority: "medium" as const,
  estimated_effort: "",
  cost_estimate: "",
  discussion_notes: "",
  technical_details: {
    affected_files: [] as string[],
    architecture_notes: "",
    implementation_steps: [] as string[],
    dependencies: [] as string[],
  },
  order_index: 0,
};

export function FutureImprovements() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<FutureImprovement | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [affectedFilesText, setAffectedFilesText] = useState("");
  const [implementationStepsText, setImplementationStepsText] = useState("");
  const [dependenciesText, setDependenciesText] = useState("");

  const { data: improvements = [], isLoading } = useQuery<FutureImprovement[]>({
    queryKey: ["/api/super-admin/future-improvements"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/super-admin/future-improvements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/future-improvements"] });
      toast({ title: "Improvement added", description: "New improvement has been saved." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to add improvement", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/super-admin/future-improvements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/future-improvements"] });
      toast({ title: "Improvement updated", description: "Changes have been saved." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update improvement", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/future-improvements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/future-improvements"] });
      toast({ title: "Improvement deleted", description: "The improvement has been removed." });
      setIsDeleteDialogOpen(false);
      setSelectedImprovement(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete improvement", description: error.message });
    },
  });

  const handleOpenCreate = () => {
    setFormData({ ...emptyForm, order_index: improvements.length });
    setAffectedFilesText("");
    setImplementationStepsText("");
    setDependenciesText("");
    setSelectedImprovement(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (improvement: FutureImprovement) => {
    setSelectedImprovement(improvement);
    setFormData({
      title: improvement.title,
      description: improvement.description,
      status: improvement.status,
      priority: improvement.priority,
      estimated_effort: improvement.estimated_effort || "",
      cost_estimate: improvement.cost_estimate || "",
      discussion_notes: improvement.discussion_notes || "",
      technical_details: improvement.technical_details || {},
      order_index: improvement.order_index,
    });
    setAffectedFilesText((improvement.technical_details?.affected_files || []).join("\n"));
    setImplementationStepsText((improvement.technical_details?.implementation_steps || []).join("\n"));
    setDependenciesText((improvement.technical_details?.dependencies || []).join("\n"));
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedImprovement(null);
    setFormData(emptyForm);
    setAffectedFilesText("");
    setImplementationStepsText("");
    setDependenciesText("");
  };

  const handleSubmit = () => {
    const technicalDetails = {
      affected_files: affectedFilesText.split("\n").filter(line => line.trim()),
      architecture_notes: formData.technical_details.architecture_notes || "",
      implementation_steps: implementationStepsText.split("\n").filter(line => line.trim()),
      dependencies: dependenciesText.split("\n").filter(line => line.trim()),
    };

    const submitData = {
      ...formData,
      estimated_effort: formData.estimated_effort || null,
      cost_estimate: formData.cost_estimate || null,
      discussion_notes: formData.discussion_notes || null,
      technical_details: technicalDetails,
    };

    if (selectedImprovement) {
      updateMutation.mutate({ id: selectedImprovement.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = () => {
    if (selectedImprovement) {
      deleteMutation.mutate(selectedImprovement.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading improvements...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-bold" data-testid="text-future-improvements-title">Future Improvements</h2>
              <p className="text-sm text-muted-foreground">Planned features and enhancements for Leadani LFS</p>
            </div>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-add-improvement">
            <Plus className="h-4 w-4 mr-2" />
            Add Improvement
          </Button>
        </div>

        {improvements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No improvements yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add your first future improvement to start tracking ideas.</p>
              <Button onClick={handleOpenCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Improvement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {improvements.map((improvement) => (
              <Card key={improvement.id} data-testid={`card-improvement-${improvement.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{improvement.title}</CardTitle>
                        <CardDescription className="mt-1">{improvement.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={statusColors[improvement.status]}>
                        {statusLabels[improvement.status]}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[improvement.priority]}>
                        {improvement.priority.charAt(0).toUpperCase() + improvement.priority.slice(1)} Priority
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenEdit(improvement)}
                        data-testid={`button-edit-improvement-${improvement.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setSelectedImprovement(improvement); setIsDeleteDialogOpen(true); }}
                        data-testid={`button-delete-improvement-${improvement.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {(improvement.estimated_effort || improvement.cost_estimate) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {improvement.estimated_effort && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Estimated Effort:</span>
                          <span className="font-medium">{improvement.estimated_effort}</span>
                        </div>
                      )}
                      {improvement.cost_estimate && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Cost Estimate:</span>
                          <span className="font-medium">{improvement.cost_estimate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {improvement.discussion_notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          Discussion Notes
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                          {improvement.discussion_notes}
                        </div>
                      </div>
                    </>
                  )}

                  {improvement.technical_details?.implementation_steps && improvement.technical_details.implementation_steps.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-emerald-500" />
                          Implementation Steps
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="space-y-2">
                            {improvement.technical_details.implementation_steps.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="text-sm">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {improvement.technical_details?.affected_files && improvement.technical_details.affected_files.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-purple-500" />
                          Affected Files
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {improvement.technical_details.affected_files.map((file, idx) => (
                            <Badge key={idx} variant="secondary" className="font-mono text-xs">
                              {file}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {improvement.technical_details?.architecture_notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          Architecture Notes
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                          {improvement.technical_details.architecture_notes}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedImprovement ? "Edit Improvement" : "Add New Improvement"}
              </DialogTitle>
              <DialogDescription>
                {selectedImprovement ? "Update the improvement details." : "Create a new future improvement idea."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., WhatsApp Chat Integration"
                  data-testid="input-improvement-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this improvement will do..."
                  rows={3}
                  data-testid="input-improvement-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-improvement-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="ready">Ready to Build</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger data-testid="select-improvement-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_effort">Estimated Effort</Label>
                  <Input
                    id="estimated_effort"
                    value={formData.estimated_effort}
                    onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value })}
                    placeholder="e.g., 1-2 weeks"
                    data-testid="input-improvement-effort"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_estimate">Cost Estimate</Label>
                  <Input
                    id="cost_estimate"
                    value={formData.cost_estimate}
                    onChange={(e) => setFormData({ ...formData, cost_estimate: e.target.value })}
                    placeholder="e.g., $5-20/month"
                    data-testid="input-improvement-cost"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discussion_notes">Discussion Notes</Label>
                <Textarea
                  id="discussion_notes"
                  value={formData.discussion_notes}
                  onChange={(e) => setFormData({ ...formData, discussion_notes: e.target.value })}
                  placeholder="Notes from discussions, decisions, user feedback..."
                  rows={4}
                  data-testid="input-improvement-notes"
                />
              </div>

              <Separator />
              <p className="text-sm font-medium">Technical Details</p>

              <div className="space-y-2">
                <Label htmlFor="implementation_steps">Implementation Steps (one per line)</Label>
                <Textarea
                  id="implementation_steps"
                  value={implementationStepsText}
                  onChange={(e) => setImplementationStepsText(e.target.value)}
                  placeholder="Step 1: Create webhook endpoint&#10;Step 2: Add phone matching logic&#10;Step 3: ..."
                  rows={4}
                  data-testid="input-improvement-steps"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="affected_files">Affected Files (one per line)</Label>
                <Textarea
                  id="affected_files"
                  value={affectedFilesText}
                  onChange={(e) => setAffectedFilesText(e.target.value)}
                  placeholder="server/routes.ts&#10;client/src/components/lead-chat.tsx&#10;..."
                  rows={3}
                  data-testid="input-improvement-files"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="architecture_notes">Architecture Notes</Label>
                <Textarea
                  id="architecture_notes"
                  value={formData.technical_details.architecture_notes || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    technical_details: { ...formData.technical_details, architecture_notes: e.target.value } 
                  })}
                  placeholder="Technical architecture considerations, data flow, dependencies..."
                  rows={3}
                  data-testid="input-improvement-architecture"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dependencies">Dependencies (one per line)</Label>
                <Textarea
                  id="dependencies"
                  value={dependenciesText}
                  onChange={(e) => setDependenciesText(e.target.value)}
                  placeholder="socket.io integration&#10;BSP webhook access&#10;..."
                  rows={2}
                  data-testid="input-improvement-dependencies"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.title || !formData.description || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-improvement"
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedImprovement ? "Save Changes" : "Add Improvement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Improvement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedImprovement?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-improvement"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
