import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { HardDrive, Plus, Download, RefreshCw, Trash2, Upload, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sheet } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface BackupConfig {
  id: string;
  company_id: string;
  sheet_id: string;
  sheet_name: string;
  google_sheet_url: string;
  google_sheet_id: string;
  is_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_rows: number | null;
  last_sync_error: string | null;
  created_at: string;
}

interface BackupSyncLog {
  id: string;
  backup_config_id: string;
  sync_type: string;
  status: string;
  rows_synced: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface RestoreLog {
  id: string;
  company_id: string;
  sheet_id: string;
  file_name: string;
  restore_type: string;
  leads_created: number;
  leads_updated: number;
  updates_added: number;
  status: string;
  error_message: string | null;
  restored_by_user_id: string;
  created_at: string;
}

interface RestorePreview {
  totalRows: number;
  newLeads: number;
  existingLeads: number;
  headers: string[];
  sampleRows: string[][];
}

const backupFormSchema = z.object({
  sheet_id: z.string().min(1, "Please select a sheet"),
  google_sheet_url: z.string().url("Please enter a valid Google Sheets URL"),
});

type BackupFormData = z.infer<typeof backupFormSchema>;

function StatusBadge({ status }: { status: string }) {
  if (status === 'success' || status === 'completed') {
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
  }
  if (status === 'error' || status === 'failed') {
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
  }
  if (status === 'running') {
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
  }
  if (status === 'partial') {
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Partial</Badge>;
  }
  return <Badge variant="outline" className="bg-muted"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
}

export function BackupManager() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<BackupConfig | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreSheetId, setRestoreSheetId] = useState("");
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoreContent, setRestoreContent] = useState("");
  const [restoreFileName, setRestoreFileName] = useState("");
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { formatInTimezone } = useCompanyTimezone();

  const { data: configs = [], isLoading: configsLoading } = useQuery<BackupConfig[]>({
    queryKey: ["/api/backup-configs"],
  });

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: restoreLogs = [] } = useQuery<RestoreLog[]>({
    queryKey: ["/api/restore/logs"],
  });

  const form = useForm<BackupFormData>({
    resolver: zodResolver(backupFormSchema),
    defaultValues: {
      sheet_id: "",
      google_sheet_url: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BackupFormData) => {
      return await apiRequest<BackupConfig>("POST", "/api/backup-configs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup-configs"] });
      setCreateOpen(false);
      form.reset();
      toast({
        title: "Backup configured",
        description: "Your sheet is now linked to Google Sheets for automatic backups.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure backup",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      return await apiRequest("DELETE", `/api/backup-configs/${configId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup-configs"] });
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      toast({
        title: "Backup removed",
        description: "The backup configuration has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ configId, isEnabled }: { configId: string; isEnabled: boolean }) => {
      return await apiRequest<BackupConfig>("PATCH", `/api/backup-configs/${configId}`, { is_enabled: isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup-configs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update backup",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (configId: string) => {
      return await apiRequest("POST", `/api/backup-configs/${configId}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup-configs"] });
      toast({
        title: "Backup completed",
        description: "Your data has been synced to Google Sheets.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync backup",
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({ csv_content, sheet_id }: { csv_content: string; sheet_id: string }) => {
      return await apiRequest<RestorePreview>("POST", "/api/restore/preview", { csv_content, sheet_id });
    },
    onSuccess: (data) => {
      setRestorePreview(data);
    },
    onError: (error: any) => {
      toast({
        title: "Preview failed",
        description: error.message || "Failed to preview restore",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ csv_content, sheet_id, file_name }: { csv_content: string; sheet_id: string; file_name: string }) => {
      return await apiRequest("POST", "/api/restore/execute", { csv_content, sheet_id, file_name });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restore/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setRestoreOpen(false);
      setRestorePreview(null);
      setRestoreContent("");
      setRestoreFileName("");
      toast({
        title: "Restore completed",
        description: `Created ${data.leadsCreated} leads, updated ${data.leadsUpdated} leads.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Restore failed",
        description: error.message || "Failed to restore data",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (config: BackupConfig) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const toggleExpanded = (configId: string) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configId)) {
      newExpanded.delete(configId);
    } else {
      newExpanded.add(configId);
    }
    setExpandedConfigs(newExpanded);
  };

  const handleDownload = async (configId: string, sheetName: string) => {
    try {
      const response = await fetch(`/api/backup-configs/${configId}/download`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${sheetName}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: "Your backup file is being downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download backup",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRestoreContent(content);
      setRestoreFileName(file.name);
      
      if (restoreSheetId) {
        previewMutation.mutate({ csv_content: content, sheet_id: restoreSheetId });
      }
    };
    reader.readAsText(file);
  };

  const availableSheets = sheets.filter(s => !configs.some(c => c.sheet_id === s.id));

  if (configsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-medium">Linked Backup Sheets</h3>
          <p className="text-sm text-muted-foreground">
            Connect your LFS sheets to Google Sheets for automatic hourly backups
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" data-testid="button-restore-data">
                <Upload className="h-4 w-4 mr-2" />
                Restore Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Restore Data from Backup</DialogTitle>
                <DialogDescription>
                  Upload a CSV backup file to restore leads. Existing leads will be updated, new leads will be created.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Sheet</label>
                  <Select value={restoreSheetId} onValueChange={setRestoreSheetId}>
                    <SelectTrigger data-testid="select-restore-sheet">
                      <SelectValue placeholder="Select sheet to restore into" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Backup File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!restoreSheetId}
                      data-testid="button-select-file"
                    >
                      Select CSV File
                    </Button>
                    {restoreFileName && (
                      <span className="text-sm text-muted-foreground self-center">{restoreFileName}</span>
                    )}
                  </div>
                </div>

                {previewMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing file...
                  </div>
                )}

                {restorePreview && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Restore Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-muted-foreground">Total Rows:</span>
                          <span className="ml-2 font-medium">{restorePreview.totalRows}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">New Leads:</span>
                          <span className="ml-2 font-medium text-green-600">{restorePreview.newLeads}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Updates:</span>
                          <span className="ml-2 font-medium text-blue-600">{restorePreview.existingLeads}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="text-muted-foreground">Columns:</span>
                        <span className="ml-2">{restorePreview.headers.length} columns detected</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setRestoreOpen(false);
                    setRestorePreview(null);
                    setRestoreContent("");
                    setRestoreFileName("");
                  }}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!restorePreview || restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate({
                      csv_content: restoreContent,
                      sheet_id: restoreSheetId,
                      file_name: restoreFileName,
                    })}
                    data-testid="button-execute-restore"
                  >
                    {restoreMutation.isPending ? "Restoring..." : "Restore Data"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" data-testid="button-add-backup">
                <Plus className="h-4 w-4 mr-2" />
                Link Sheet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Sheet to Google Sheets</DialogTitle>
                <DialogDescription>
                  Connect your LFS sheet to a Google Sheet for automatic backups. Make sure your Google Sheet is set to "Anyone with the link can edit".
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sheet_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LFS Sheet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sheet">
                              <SelectValue placeholder="Select a sheet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableSheets.map((sheet) => (
                              <SelectItem key={sheet.id} value={sheet.id}>
                                {sheet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {availableSheets.length === 0 
                            ? "All sheets already have backup configured" 
                            : "Select the sheet you want to back up"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="google_sheet_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Sheet URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            {...field}
                            data-testid="input-google-sheet-url"
                          />
                        </FormControl>
                        <FormDescription>
                          Paste the full URL of your Google Sheet. Ensure it's set to "Anyone with link can edit".
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-backup">
                      {createMutation.isPending ? "Linking..." : "Link Sheet"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Backups Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link your sheets to Google Sheets for automatic hourly backups. Your data will be safe even if something goes wrong.
            </p>
            <Button type="button" onClick={() => setCreateOpen(true)} data-testid="button-setup-first-backup">
              <Plus className="h-4 w-4 mr-2" />
              Set Up First Backup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id} data-testid={`backup-config-${config.id}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(config.id)}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {expandedConfigs.has(config.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{config.sheet_name}</span>
                      </button>
                      <StatusBadge status={config.last_sync_status} />
                      {!config.is_enabled && (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {config.last_sync_at ? (
                        <span>Last synced: {formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })}</span>
                      ) : (
                        <span>Never synced</span>
                      )}
                      {config.last_sync_rows !== null && (
                        <span>{config.last_sync_rows} rows</span>
                      )}
                      <a
                        href={config.google_sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        Open Sheet <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {config.last_sync_error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        {config.last_sync_error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.is_enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ configId: config.id, isEnabled: checked })}
                      data-testid={`toggle-backup-${config.id}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(config.id, config.sheet_name)}
                      data-testid={`download-backup-${config.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(config.id)}
                      data-testid={`sync-backup-${config.id}`}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick(config)}
                      data-testid={`delete-backup-${config.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {expandedConfigs.has(config.id) && (
                  <BackupSyncLogs configId={config.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {restoreLogs.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium mb-3">Restore History</h3>
          <div className="space-y-2">
            {restoreLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="font-medium">{log.file_name}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{log.leads_created} created, {log.leads_updated} updated</span>
                  <span>{formatInTimezone(log.created_at, 'MMM d, yyyy HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Backup Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop automatic backups for "{configToDelete?.sheet_name}". Your Google Sheet data will remain unchanged, but no new backups will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => configToDelete && deleteMutation.mutate(configToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BackupSyncLogs({ configId }: { configId: string }) {
  const { formatInTimezone } = useCompanyTimezone();
  const { data: logs = [], isLoading } = useQuery<BackupSyncLog[]>({
    queryKey: ["/api/backup-configs", configId, "logs"],
    queryFn: async () => {
      const res = await fetch(`/api/backup-configs/${configId}/logs?limit=10`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-20 mt-4" />;
  }

  if (logs.length === 0) {
    return (
      <div className="mt-4 text-sm text-muted-foreground">
        No sync history yet
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium mb-2">Sync History</h4>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={log.status} />
              <span className="text-muted-foreground capitalize">{log.sync_type}</span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              {log.rows_synced !== null && <span>{log.rows_synced} rows</span>}
              <span>{formatInTimezone(log.started_at, 'MMM d, HH:mm')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
