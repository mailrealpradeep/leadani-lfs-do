import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, ArrowRightLeft, AlertTriangle, Loader2, Calendar, Percent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sheet } from "@shared/schema";

interface SheetLeadCount {
  sheet_id: string;
  sheet_name: string;
  lead_count: number;
}

interface ClearDataPreview {
  total_leads: number;
  sheets: SheetLeadCount[];
}

interface TransferPreview {
  source_lead_count: number;
  duplicates: { mobile: string; name: string }[];
}

interface TransferDestination {
  sheet_id: string;
  percentage: number;
}

export function DataManagement() {
  const { toast } = useToast();
  
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [cutoffDate, setCutoffDate] = useState("");
  
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [sourceSheetId, setSourceSheetId] = useState("");
  const [transferMode, setTransferMode] = useState<"single" | "multi">("single");
  const [singleDestinationId, setSingleDestinationId] = useState("");
  const [multiDestinations, setMultiDestinations] = useState<TransferDestination[]>([]);
  const [transferRemark, setTransferRemark] = useState("");
  const [transferConfirmText, setTransferConfirmText] = useState("");
  
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const { data: clearPreview, isLoading: isLoadingClearPreview, refetch: refetchClearPreview } = useQuery<ClearDataPreview>({
    queryKey: ["/api/admin/data-management/clear-preview", useDateFilter, cutoffDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (useDateFilter && cutoffDate) {
        params.append("before_date", cutoffDate);
      }
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/data-management/clear-preview?${params.toString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch preview");
      return response.json();
    },
    enabled: clearDialogOpen,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: transferPreview, isLoading: isLoadingTransferPreview } = useQuery<TransferPreview>({
    queryKey: ["/api/admin/data-management/transfer-preview", sourceSheetId, 
      transferMode === "single" ? singleDestinationId : multiDestinations.map(d => d.sheet_id).join(",")],
    queryFn: async () => {
      const destinationIds = transferMode === "single" 
        ? [singleDestinationId] 
        : multiDestinations.map(d => d.sheet_id);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/data-management/transfer-preview?source_sheet_id=${sourceSheetId}&destination_sheet_ids=${destinationIds.join(",")}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch preview");
      return response.json();
    },
    enabled: transferDialogOpen && !!sourceSheetId && (
      (transferMode === "single" && !!singleDestinationId) ||
      (transferMode === "multi" && multiDestinations.length > 0 && multiDestinations.every(d => d.sheet_id))
    ),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/data-management/clear-all", {
        before_date: useDateFilter && cutoffDate ? cutoffDate : null,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setClearDialogOpen(false);
      setClearConfirmText("");
      toast({
        title: "Data cleared successfully",
        description: `${data.deleted_count || 0} leads have been moved to trash.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear data",
        variant: "destructive",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const destinations = transferMode === "single"
        ? [{ sheet_id: singleDestinationId, percentage: 100 }]
        : multiDestinations;
      
      return await apiRequest("POST", "/api/admin/data-management/bulk-transfer", {
        source_sheet_id: sourceSheetId,
        destinations,
        remark: transferRemark,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setTransferDialogOpen(false);
      setTransferConfirmText("");
      setSourceSheetId("");
      setSingleDestinationId("");
      setMultiDestinations([]);
      setTransferRemark("");
      toast({
        title: "Transfer completed",
        description: `${data.transferred_count || 0} leads have been transferred.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer leads",
        variant: "destructive",
      });
    },
  });

  const totalPercentage = useMemo(() => {
    return multiDestinations.reduce((sum, d) => sum + (d.percentage || 0), 0);
  }, [multiDestinations]);

  const hasLeadsToClear = (clearPreview?.total_leads || 0) > 0;
  const isDeleteTyped = clearConfirmText.trim().toUpperCase() === "DELETE";
  const canClear = isDeleteTyped && hasLeadsToClear;
  
  const isTransferTyped = transferConfirmText.trim().toUpperCase() === "TRANSFER";
  const canTransfer = isTransferTyped && 
    sourceSheetId && 
    (transferMode === "single" ? !!singleDestinationId : (multiDestinations.length > 0 && totalPercentage === 100)) &&
    (transferPreview?.duplicates?.length || 0) === 0;

  const handleAddDestination = () => {
    setMultiDestinations([...multiDestinations, { sheet_id: "", percentage: 0 }]);
  };

  const handleRemoveDestination = (index: number) => {
    setMultiDestinations(multiDestinations.filter((_, i) => i !== index));
  };

  const handleDestinationChange = (index: number, field: "sheet_id" | "percentage", value: string | number) => {
    const updated = [...multiDestinations];
    if (field === "sheet_id") {
      updated[index].sheet_id = value as string;
    } else {
      updated[index].percentage = Number(value);
    }
    setMultiDestinations(updated);
  };

  const availableDestinations = sheets.filter(s => 
    s.id !== sourceSheetId && 
    !s.deleted_at &&
    (transferMode === "single" || !multiDestinations.some(d => d.sheet_id === s.id))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Clear Past Data
          </CardTitle>
          <CardDescription>
            Remove all test leads before going live. Leads will be soft-deleted and can be recovered within 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setClearDialogOpen(true)}
            data-testid="button-open-clear-dialog"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Leads
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Bulk Transfer Leads
          </CardTitle>
          <CardDescription>
            Transfer all leads from one sheet to another. Useful when team members leave or when redistributing workload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setTransferDialogOpen(true)}
            data-testid="button-open-transfer-dialog"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer Leads
          </Button>
        </CardContent>
      </Card>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear All Company Leads
            </DialogTitle>
            <DialogDescription>
              This will soft-delete all leads from your company. They can be recovered from the trash within 30 days.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="use-date-filter"
                checked={useDateFilter}
                onCheckedChange={setUseDateFilter}
                data-testid="switch-date-filter"
              />
              <Label htmlFor="use-date-filter">Only clear leads created before a specific date</Label>
            </div>
            
            {useDateFilter && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-cutoff-date"
                />
              </div>
            )}

            <Separator />

            {isLoadingClearPreview ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview...
              </div>
            ) : clearPreview ? (
              <div className="space-y-3">
                <div className="text-lg font-semibold">
                  Total leads to delete: <span className="text-destructive">{clearPreview.total_leads}</span>
                </div>
                
                {clearPreview.sheets.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Breakdown by sheet:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {clearPreview.sheets.map((sheet) => (
                        <div key={sheet.sheet_id} className="flex items-center justify-between text-sm">
                          <span>{sheet.sheet_name}</span>
                          <Badge variant="secondary">{sheet.lead_count} leads</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <Separator />

            <div className="space-y-2">
              <Label>Type DELETE to confirm</Label>
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Type DELETE"
                data-testid="input-clear-confirm"
              />
              {isDeleteTyped && !hasLeadsToClear && !isLoadingClearPreview && (
                <p className="text-sm text-muted-foreground">
                  No leads to delete{useDateFilter && cutoffDate ? " for the selected date range" : ""}.
                </p>
              )}
              {!isDeleteTyped && clearConfirmText.length > 0 && (
                <p className="text-sm text-destructive">
                  Please type DELETE (case insensitive) to confirm.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canClear || clearMutation.isPending}
              onClick={() => clearMutation.mutate()}
              data-testid="button-confirm-clear"
            >
              {clearMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                `Clear ${hasLeadsToClear ? clearPreview?.total_leads : 0} Leads`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Bulk Transfer Leads
            </DialogTitle>
            <DialogDescription>
              Transfer all leads from one sheet to one or more destination sheets.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Sheet</Label>
              <Select value={sourceSheetId} onValueChange={setSourceSheetId}>
                <SelectTrigger data-testid="select-source-sheet">
                  <SelectValue placeholder="Select source sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.filter(s => !s.deleted_at).map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Label>Transfer Mode:</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={transferMode === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransferMode("single")}
                  data-testid="button-mode-single"
                >
                  Single Destination
                </Button>
                <Button
                  variant={transferMode === "multi" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransferMode("multi")}
                  data-testid="button-mode-multi"
                >
                  Multiple (% Split)
                </Button>
              </div>
            </div>

            {transferMode === "single" ? (
              <div className="space-y-2">
                <Label>Destination Sheet</Label>
                <Select value={singleDestinationId} onValueChange={setSingleDestinationId}>
                  <SelectTrigger data-testid="select-destination-sheet">
                    <SelectValue placeholder="Select destination sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDestinations.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Destination Sheets</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddDestination}
                    data-testid="button-add-destination"
                  >
                    Add Destination
                  </Button>
                </div>
                
                {multiDestinations.map((dest, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select 
                      value={dest.sheet_id} 
                      onValueChange={(v) => handleDestinationChange(index, "sheet_id", v)}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-dest-${index}`}>
                        <SelectValue placeholder="Select sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheets.filter(s => 
                          !s.deleted_at && 
                          s.id !== sourceSheetId && 
                          (s.id === dest.sheet_id || !multiDestinations.some(d => d.sheet_id === s.id))
                        ).map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {sheet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 w-24">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={dest.percentage}
                        onChange={(e) => handleDestinationChange(index, "percentage", e.target.value)}
                        className="w-16"
                        data-testid={`input-percentage-${index}`}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDestination(index)}
                      data-testid={`button-remove-dest-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {multiDestinations.length > 0 && (
                  <div className={`text-sm ${totalPercentage === 100 ? "text-green-600" : "text-destructive"}`}>
                    Total: {totalPercentage}% {totalPercentage !== 100 && "(must equal 100%)"}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Transfer Remark (for audit trail)</Label>
              <Textarea
                value={transferRemark}
                onChange={(e) => setTransferRemark(e.target.value)}
                placeholder="e.g., Employee resignation - leads transferred to new owner"
                data-testid="input-transfer-remark"
              />
            </div>

            <Separator />

            {isLoadingTransferPreview ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for duplicates...
              </div>
            ) : transferPreview ? (
              <div className="space-y-3">
                <div className="text-sm">
                  Leads to transfer: <span className="font-semibold">{transferPreview.source_lead_count}</span>
                </div>
                
                {transferPreview.duplicates.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      {transferPreview.duplicates.length} duplicate mobile numbers found
                    </div>
                    <div className="text-sm text-muted-foreground">
                      These leads already exist in the destination sheet(s). Please resolve duplicates before transferring.
                    </div>
                    <div className="max-h-20 overflow-y-auto mt-2 space-y-1">
                      {transferPreview.duplicates.slice(0, 5).map((dup, i) => (
                        <div key={i} className="text-xs">
                          {dup.name} - {dup.mobile}
                        </div>
                      ))}
                      {transferPreview.duplicates.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          ...and {transferPreview.duplicates.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <Separator />

            <div className="space-y-2">
              <Label>Type TRANSFER to confirm</Label>
              <Input
                value={transferConfirmText}
                onChange={(e) => setTransferConfirmText(e.target.value)}
                placeholder="Type TRANSFER"
                data-testid="input-transfer-confirm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canTransfer || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Transfer Leads"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
