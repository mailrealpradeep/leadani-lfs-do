import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Webhook, Settings, Copy, Trash2, Power, PowerOff, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { ConfigureWebhook } from "@/components/configure-webhook";
import type { CompanyWebhook, WebhookRequest } from "@shared/schema";

export default function Webhooks() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<CompanyWebhook | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<CompanyWebhook | null>(null);
  const [newWebhookName, setNewWebhookName] = useState("");

  const { data: webhooks = [], isLoading } = useQuery<CompanyWebhook[]>({
    queryKey: ["/api/admin/company/webhooks"],
  });

  const { data: selectedWebhookRequests = [] } = useQuery<WebhookRequest[]>({
    queryKey: ["/api/admin/company/webhooks", selectedWebhook?.id, "requests"],
    enabled: !!selectedWebhook && requestsDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/admin/company/webhooks", { name, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks"] });
      setCreateDialogOpen(false);
      setNewWebhookName("");
      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create webhook",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return apiRequest("PUT", `/api/admin/company/webhooks/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks"] });
      toast({
        title: "Webhook updated",
        description: "Webhook status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update webhook",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/company/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/webhooks"] });
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
      toast({
        title: "Webhook deleted",
        description: "Webhook has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete webhook",
        variant: "destructive",
      });
    },
  });

  const copyWebhookUrl = (token: string) => {
    const url = `${window.location.origin}/api/public/webhooks/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    });
  };

  const handleCreate = () => {
    if (!newWebhookName.trim()) {
      toast({
        title: "Error",
        description: "Webhook name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newWebhookName);
  };

  const handleToggle = (webhook: CompanyWebhook) => {
    toggleMutation.mutate({ id: webhook.id, is_active: !webhook.is_active });
  };

  const handleDelete = (webhook: CompanyWebhook) => {
    setWebhookToDelete(webhook);
    setDeleteDialogOpen(true);
  };

  const handleConfigure = (webhook: CompanyWebhook) => {
    setSelectedWebhook(webhook);
    setConfigureDialogOpen(true);
  };

  const handleViewRequests = (webhook: CompanyWebhook) => {
    setSelectedWebhook(webhook);
    setRequestsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Webhook Integration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically create leads from external sources
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-webhook">
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6 max-w-6xl">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No webhooks yet</p>
                  <p className="text-sm mt-2">
                    Create your first webhook to start receiving leads from external sources
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} data-testid={`card-webhook-${webhook.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          Created {format(new Date(webhook.created_at), "PPP")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(webhook)}
                          data-testid={`button-toggle-${webhook.id}`}
                        >
                          {webhook.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewRequests(webhook)}
                          data-testid={`button-view-requests-${webhook.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConfigure(webhook)}
                          data-testid={`button-configure-${webhook.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(webhook)}
                          data-testid={`button-delete-${webhook.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-muted rounded-md text-sm font-mono break-all">
                          {window.location.origin}/api/public/webhooks/{webhook.token}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyWebhookUrl(webhook.token)}
                          data-testid={`button-copy-url-${webhook.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Secret Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-muted rounded-md text-sm font-mono">
                          {webhook.secret}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(webhook.secret);
                            toast({
                              title: "Copied to clipboard",
                              description: "Secret key has been copied",
                            });
                          }}
                          data-testid={`button-copy-secret-${webhook.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Create a new webhook to receive leads from external sources
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Webhook Name</Label>
              <Input
                id="name"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                placeholder="e.g., Website Form, Facebook Ads"
                data-testid="input-webhook-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-create-webhook-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Webhook Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Webhook: {selectedWebhook?.name}</DialogTitle>
            <DialogDescription>
              Set up field mappings and allocation rules for this webhook
            </DialogDescription>
          </DialogHeader>
          {selectedWebhook && (
            <ConfigureWebhook
              webhook={selectedWebhook}
              onClose={() => setConfigureDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Webhook Requests Dialog */}
      <Dialog open={requestsDialogOpen} onOpenChange={setRequestsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Webhook Requests: {selectedWebhook?.name}</DialogTitle>
            <DialogDescription>Recent webhook calls and their status</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedWebhookRequests.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">No webhook requests yet</p>
                <p className="text-xs text-muted-foreground">
                  Send a test from Paperform or your webhook provider to see the field names here
                </p>
              </div>
            ) : (
              selectedWebhookRequests.map((request) => {
                const fieldNames = request.payload && typeof request.payload === 'object' 
                  ? Object.keys(request.payload) 
                  : [];
                
                const isPendingAllocation = request.status === "pending_allocation";
                const isPendingConfiguration = request.status === "pending_configuration";
                
                return (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-3 ${isPendingAllocation ? "border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-900/10" : ""}`}
                    data-testid={`request-${request.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          request.status === "success" ? "default" : 
                          isPendingConfiguration ? "secondary" : 
                          isPendingAllocation ? "outline" :
                          "destructive"
                        } className={isPendingAllocation ? "border-yellow-500 text-yellow-600" : ""}>
                          {isPendingConfiguration ? "pending setup" : 
                           isPendingAllocation ? "pending allocation" : 
                           request.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), "PPpp")}
                        </span>
                      </div>
                    </div>
                    {request.error_message && !isPendingAllocation && (
                      <p className="text-xs text-destructive mb-2">{request.error_message}</p>
                    )}
                    {isPendingConfiguration && !request.error_message && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Data received successfully. Configure allocation rules to start creating leads.
                      </p>
                    )}
                    {isPendingAllocation && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-2">
                        Data received but not allocated. {request.error_message || "Please configure or fix your allocation rules."}
                      </p>
                    )}
                    
                    {/* Field Names - Prominently Displayed */}
                    {fieldNames.length > 0 && (
                      <div className="mb-3 p-3 bg-muted/50 rounded-md">
                        <Label className="text-xs font-semibold mb-2 block">
                          Field Names Received (use these for mapping):
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {fieldNames.map((fieldName) => (
                            <div
                              key={fieldName}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-background rounded border text-xs font-mono"
                            >
                              <code>{fieldName}</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(fieldName);
                                  toast({
                                    title: "Copied",
                                    description: `Field name "${fieldName}" copied to clipboard`,
                                  });
                                }}
                                data-testid={`button-copy-field-${fieldName}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <details>
                      <summary className="text-sm cursor-pointer hover-elevate active-elevate-2 p-2 rounded">
                        View Full Payload
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                        {JSON.stringify(request.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{webhookToDelete?.name}"? This action cannot be
              undone and will remove all associated field mappings and allocation rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => webhookToDelete && deleteMutation.mutate(webhookToDelete.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
