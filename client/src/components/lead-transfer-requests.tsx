import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRightLeft, User, Calendar, Phone, MessageSquare, MapPin, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { TransferRequestLeadDetailsDialog } from "./transfer-request-lead-details-dialog";

interface TransferRequest {
  id: string;
  lead_id: string;
  from_sheet_id: string;
  to_sheet_id: string;
  requested_by_user_id: string;
  status: "pending" | "approved" | "rejected";
  approved_by_user_id: string | null;
  rejected_by_user_id: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    custom_fields: Record<string, any>;
  } | null;
  from_sheet_name: string | null;
  to_sheet_name: string | null;
  requestor_name: string | null;
  approver_name: string | null;
  rejector_name: string | null;
}

export function LeadTransferRequests({ headless = false }: { headless?: boolean }) {
  const { toast } = useToast();
  const { formatInTimezone } = useCompanyTimezone();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [leadDetailsDialogOpen, setLeadDetailsDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery<TransferRequest[]>({
    queryKey: ["/api/admin/lead-transfer-requests", statusFilter === "all" ? undefined : statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/admin/lead-transfer-requests"
        : `/api/admin/lead-transfer-requests?status=${statusFilter}`;
      return await apiRequest<TransferRequest[]>("GET", url);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/lead-transfer-requests/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lead-transfer-requests"] });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: "Request approved",
        description: "Lead has been transferred successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/lead-transfer-requests/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lead-transfer-requests"] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      toast({
        title: "Request rejected",
        description: "Transfer request has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: TransferRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: TransferRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (request: TransferRequest) => {
    setSelectedLeadId(request.lead_id);
    setSelectedSheetId(request.from_sheet_id);
    setLeadDetailsDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const confirmReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUpdateViaIcon = (updateVia: string) => {
    switch (updateVia) {
      case "call":
        return <Phone className="h-3 w-3 text-blue-500" />;
      case "whatsapp":
        return <MessageSquare className="h-3 w-3 text-green-500" />;
      case "visit":
        return <MapPin className="h-3 w-3 text-purple-500" />;
      default:
        return <ArrowRightLeft className="h-3 w-3 text-orange-500" />;
    }
  };

  const content = (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No transfer requests found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {request.lead?.custom_fields?.full_name || "Unknown Lead"}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Mobile: {request.lead?.custom_fields?.mobile_no || "N/A"}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Lead: {request.lead?.custom_fields?.lead_status || "N/A"}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              Visit: {request.lead?.custom_fields?.visit_status || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(request)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">From Sheet:</span>
                          <p className="font-medium">{request.from_sheet_name || "Unknown"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">To Sheet:</span>
                          <p className="font-medium">{request.to_sheet_name || "Unknown"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested By:</span>
                          <p className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.requestor_name || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested At:</span>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatInTimezone(request.created_at, "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        {request.approver_name && (
                          <div>
                            <span className="text-muted-foreground">Approved By:</span>
                            <p className="font-medium">{request.approver_name}</p>
                          </div>
                        )}
                        {request.rejector_name && (
                          <div>
                            <span className="text-muted-foreground">Rejected By:</span>
                            <p className="font-medium">{request.rejector_name}</p>
                          </div>
                        )}
                        {request.rejection_reason && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Rejection Reason:</span>
                            <p className="font-medium">{request.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Transfer Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this transfer request? The lead will be transferred to the target sheet and PowerScore will be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Transfer Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this transfer request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedLeadId && selectedSheetId && (
        <TransferRequestLeadDetailsDialog
          leadId={selectedLeadId}
          sheetId={selectedSheetId}
          open={leadDetailsDialogOpen}
          onOpenChange={(open) => {
            setLeadDetailsDialogOpen(open);
            if (!open) {
              setSelectedLeadId(null);
              setSelectedSheetId(null);
            }
          }}
        />
      )}
    </div>
  );

  if (headless) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Transfer Requests</CardTitle>
        <CardDescription>
          Review and manage lead transfer requests from users
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

