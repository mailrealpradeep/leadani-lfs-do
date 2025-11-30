import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import {
  History,
  Building2,
  FileSpreadsheet,
  Clock,
  Calendar,
  RotateCcw,
  Eye,
  Database,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Plus,
  Minus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SnapshotStats {
  totalSnapshots: number;
  companiesWithSnapshots: number;
  sheetsWithSnapshots: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
}

interface Snapshot {
  id: string;
  company_id: string;
  sheet_id: string;
  sheet_name: string;
  company_name?: string;
  lead_count: number;
  data_hash: string;
  created_at: string;
}

interface RestorePreview {
  snapshot_id: string;
  snapshot_date: string;
  sheet_name: string;
  current_lead_count: number;
  snapshot_lead_count: number;
  changes: {
    to_restore: number;
    to_remove: number;
    to_update: number;
  };
  preview_leads: {
    restore: any[];
    remove: any[];
    update: any[];
  };
}

interface Company {
  id: string;
  name: string;
}

function formatSnapshotDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

function groupSnapshotsByDate(snapshots: Snapshot[]): Map<string, Snapshot[]> {
  const groups = new Map<string, Snapshot[]>();
  
  for (const snapshot of snapshots) {
    const dateKey = format(parseISO(snapshot.created_at), "yyyy-MM-dd");
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(snapshot);
  }
  
  return groups;
}

function DateLabel({ dateKey }: { dateKey: string }) {
  const date = parseISO(dateKey);
  if (isToday(date)) return <span className="text-primary font-medium">Today</span>;
  if (isYesterday(date)) return <span>Yesterday</span>;
  return <span>{format(date, "MMMM d, yyyy")}</span>;
}

export function DataRecovery() {
  const { toast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Snapshot | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<SnapshotStats>({
    queryKey: ["/api/admin/snapshots/stats"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<Snapshot[]>({
    queryKey: ["/api/admin/snapshots/by-company", selectedCompanyId],
    queryFn: () => apiRequest<Snapshot[]>("GET", `/api/admin/snapshots/by-company/${selectedCompanyId}`),
    enabled: !!selectedCompanyId,
  });

  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery<RestorePreview>({
    queryKey: ["/api/admin/snapshots", previewSnapshot?.id, "preview"],
    queryFn: () => apiRequest<RestorePreview>("GET", `/api/admin/snapshots/${previewSnapshot!.id}/preview`),
    enabled: !!previewSnapshot,
  });

  const restoreMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      return await apiRequest("POST", `/api/admin/snapshots/${snapshotId}/restore`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/snapshots"] });
      toast({
        title: "Snapshot Restored",
        description: `Restored ${data.restored} leads, updated ${data.updated}, removed ${data.removed}`,
      });
      setConfirmRestore(null);
      setPreviewSnapshot(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: error.message,
      });
    },
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return await apiRequest("POST", `/api/admin/snapshots/create-manual/${sheetId}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/snapshots"] });
      toast({
        title: data.success ? "Snapshot Created" : "No Changes",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Create Snapshot",
        description: error.message,
      });
    },
  });

  const toggleSheet = (sheetId: string) => {
    setExpandedSheets(prev => {
      const next = new Set(prev);
      if (next.has(sheetId)) {
        next.delete(sheetId);
      } else {
        next.add(sheetId);
      }
      return next;
    });
  };

  const toggleDate = (dateKey: string, sheetId: string) => {
    const key = `${sheetId}-${dateKey}`;
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const snapshotsBySheet = new Map<string, Snapshot[]>();
  for (const snapshot of snapshots) {
    if (!snapshotsBySheet.has(snapshot.sheet_id)) {
      snapshotsBySheet.set(snapshot.sheet_id, []);
    }
    snapshotsBySheet.get(snapshot.sheet_id)!.push(snapshot);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Snapshots</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSnapshots || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.companiesWithSnapshots || 0}</div>
            <p className="text-xs text-muted-foreground">
              With snapshots
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sheets</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sheetsWithSnapshots || 0}</div>
            <p className="text-xs text-muted-foreground">
              Being backed up
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.newestSnapshot
                ? formatDistanceToNow(parseISO(stats.newestSnapshot), { addSuffix: true })
                : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              Hourly automatic snapshots
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-6">
        <Card className="w-72 shrink-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Select Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {companies.map((company) => (
                  <Button
                    key={company.id}
                    variant={selectedCompanyId === company.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCompanyId(company.id)}
                    data-testid={`button-company-${company.id}`}
                  >
                    {company.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Snapshots
            </CardTitle>
            <CardDescription>
              {selectedCompanyId
                ? `${snapshots.length} snapshots across ${snapshotsBySheet.size} sheets`
                : "Select a company to view snapshots"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCompanyId ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p>Select a company from the left panel</p>
              </div>
            ) : snapshotsLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : snapshotsBySheet.size === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Database className="h-12 w-12 mb-4 opacity-50" />
                <p>No snapshots for this company yet</p>
                <p className="text-sm">Snapshots are created every hour</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {Array.from(snapshotsBySheet.entries()).map(([sheetId, sheetSnapshots]) => {
                    const sheetName = sheetSnapshots[0].sheet_name;
                    const isExpanded = expandedSheets.has(sheetId);
                    const snapshotsByDate = groupSnapshotsByDate(sheetSnapshots);
                    const latestSnapshot = sheetSnapshots[0];

                    return (
                      <Collapsible
                        key={sheetId}
                        open={isExpanded}
                        onOpenChange={() => toggleSheet(sheetId)}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className="flex items-center gap-2 p-3 rounded-lg hover-elevate cursor-pointer bg-muted/50"
                            data-testid={`sheet-${sheetId}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            <span className="font-medium flex-1">{sheetName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {sheetSnapshots.length} snapshots
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {latestSnapshot.lead_count} leads
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 mt-2 space-y-2">
                            {Array.from(snapshotsByDate.entries()).map(([dateKey, dateSnapshots]) => {
                              const dateExpanded = expandedDates.has(`${sheetId}-${dateKey}`);
                              
                              return (
                                <Collapsible
                                  key={dateKey}
                                  open={dateExpanded}
                                  onOpenChange={() => toggleDate(dateKey, sheetId)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <div
                                      className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                                      data-testid={`date-${dateKey}`}
                                    >
                                      {dateExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      <DateLabel dateKey={dateKey} />
                                      <span className="text-sm text-muted-foreground">
                                        ({dateSnapshots.length} snapshots)
                                      </span>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-3">
                                      {dateSnapshots.map((snapshot) => (
                                        <div
                                          key={snapshot.id}
                                          className="flex items-center gap-2 p-2 rounded hover-elevate"
                                          data-testid={`snapshot-${snapshot.id}`}
                                        >
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-sm flex-1">
                                            {format(parseISO(snapshot.created_at), "h:mm a")}
                                          </span>
                                          <Badge variant="outline" className="text-xs">
                                            {snapshot.lead_count} leads
                                          </Badge>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewSnapshot(snapshot);
                                            }}
                                            data-testid={`button-preview-${snapshot.id}`}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Preview
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmRestore(snapshot);
                                            }}
                                            data-testid={`button-restore-${snapshot.id}`}
                                          >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Restore
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!previewSnapshot} onOpenChange={() => setPreviewSnapshot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Restore Preview
            </DialogTitle>
            <DialogDescription>
              {previewSnapshot && formatSnapshotDate(previewSnapshot.created_at)}
              {" - "}
              {previewSnapshot?.sheet_name}
            </DialogDescription>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Current State</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-2xl font-bold">{previewData.current_lead_count} leads</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Snapshot State</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-2xl font-bold">{previewData.snapshot_lead_count} leads</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Changes if Restored</CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{previewData.changes.to_restore}</span>
                    <span className="text-muted-foreground">leads will be restored (currently deleted)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{previewData.changes.to_remove}</span>
                    <span className="text-muted-foreground">leads will be removed (not in snapshot)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{previewData.changes.to_update}</span>
                    <span className="text-muted-foreground">leads will be reverted to snapshot state</span>
                  </div>
                </CardContent>
              </Card>

              {previewData.changes.to_restore === 0 && 
               previewData.changes.to_remove === 0 && 
               previewData.changes.to_update === 0 && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>No changes needed - current state matches snapshot</span>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewSnapshot(null)}>
              Close
            </Button>
            {previewData && (previewData.changes.to_restore > 0 || 
                            previewData.changes.to_remove > 0 || 
                            previewData.changes.to_update > 0) && (
              <Button
                type="button"
                onClick={() => {
                  setConfirmRestore(previewSnapshot);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore This Snapshot
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Restore
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore <strong>{confirmRestore?.sheet_name}</strong> to the snapshot from{" "}
              <strong>{confirmRestore && formatSnapshotDate(confirmRestore.created_at)}</strong>?
              <br /><br />
              This action will:
              <ul className="list-disc ml-6 mt-2">
                <li>Restore deleted leads that existed at snapshot time</li>
                <li>Remove leads that were created after the snapshot</li>
                <li>Revert any field changes made after the snapshot</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && restoreMutation.mutate(confirmRestore.id)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
