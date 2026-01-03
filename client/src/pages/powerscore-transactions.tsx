import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  History, 
  Search, 
  Ban, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  User as UserIcon,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface TransactionWithDetails {
  id: string;
  user_id: string;
  user_name: string;
  rule_id: string | null;
  rule_name: string | null;
  points: number;
  action_type: string;
  description: string | null;
  status: string;
  voided_at: string | null;
  voided_by_user_id: string | null;
  voided_by_user_name?: string;
  void_reason: string | null;
  voided_by_transaction_id: string | null;
  created_at: string;
  is_adjustment: boolean;
}

interface TransactionsResponse {
  transactions: TransactionWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

interface SimpleUser {
  id: string;
  name: string;
}

export default function PowerScoreTransactions() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<TransactionWithDetails | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const { data: usersData } = useQuery<SimpleUser[]>({
    queryKey: ["/api/users/simple"],
  });

  const transactionsQueryUrl = `/api/powerscore/transactions?page=${page}&limit=25${selectedUserId !== "all" ? `&userId=${selectedUserId}` : ""}`;
  
  const { 
    data: transactionsData, 
    isLoading, 
    isError,
    refetch 
  } = useQuery<TransactionsResponse>({
    queryKey: [transactionsQueryUrl],
    enabled: isAdmin,
  });

  const voidMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/powerscore/transactions/${id}/void`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Transaction voided",
        description: "The transaction has been voided and points adjusted",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
      setVoidDialogOpen(false);
      setTransactionToVoid(null);
      setVoidReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to void transaction",
        variant: "destructive",
      });
    },
  });

  const handleVoidClick = (transaction: TransactionWithDetails) => {
    setTransactionToVoid(transaction);
    setVoidReason("");
    setVoidDialogOpen(true);
  };

  const handleVoidConfirm = () => {
    if (!transactionToVoid || !voidReason.trim()) return;
    voidMutation.mutate({ id: transactionToVoid.id, reason: voidReason.trim() });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return dateString;
    }
  };

  const getActionTypeBadge = (actionType: string) => {
    const styles: Record<string, string> = {
      login: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      lead_update: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      dropdown_change: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      lead_created: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      void_adjustment: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      admin_manual: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return styles[actionType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getStatusBadge = (transaction: TransactionWithDetails) => {
    if (transaction.voided_at) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          Voided
        </Badge>
      );
    }
    if (transaction.status === "pending") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
          Pending Approval
        </Badge>
      );
    }
    if (transaction.is_adjustment) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
          Adjustment
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        Awarded
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <p>You do not have permission to view this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
    <div className="container mx-auto py-6 px-4 space-y-6" data-testid="page-powerscore-transactions">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            PowerScore Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all PowerScore point transactions
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="gap-2"
          data-testid="button-refresh-transactions"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="user-filter" className="text-sm font-medium mb-2 block">
                Filter by User
              </Label>
              <Select 
                value={selectedUserId} 
                onValueChange={(value) => {
                  setSelectedUserId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-user-filter">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {usersData?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transactionsData && (
              <div className="text-sm text-muted-foreground">
                Showing {transactionsData.transactions.length} of {transactionsData.total} transactions
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
              <p>Failed to load transactions</p>
            </div>
          ) : !transactionsData?.transactions.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsData.transactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={cn(
                          transaction.voided_at && "opacity-60"
                        )}
                        data-testid={`row-transaction-${transaction.id}`}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className={cn(transaction.voided_at && "line-through")}>
                              {transaction.user_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", getActionTypeBadge(transaction.action_type))}
                          >
                            {transaction.action_type === "admin_manual" 
                              ? "Manual Point" 
                              : transaction.action_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className={cn(
                            "text-sm truncate",
                            transaction.voided_at && "line-through"
                          )}>
                            {transaction.rule_name || transaction.description || "-"}
                          </div>
                          {transaction.voided_at && transaction.void_reason && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Void reason: {transaction.void_reason}
                            </div>
                          )}
                          {transaction.is_adjustment && !transaction.voided_at && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              Adjustment for voided transaction
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          <span className={cn(
                            transaction.points > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                            transaction.voided_at && "line-through opacity-60"
                          )}>
                            {transaction.points > 0 ? "+" : ""}{transaction.points}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!transaction.voided_at && !transaction.is_adjustment && transaction.status === "awarded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVoidClick(transaction)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              data-testid={`button-void-${transaction.id}`}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Void
                            </Button>
                          )}
                          {transaction.voided_at && transaction.voided_by_user_name && (
                            <span className="text-xs text-muted-foreground">
                              by {transaction.voided_by_user_name}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {transactionsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {transactionsData.page} of {transactionsData.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(transactionsData.totalPages, p + 1))}
                      disabled={page >= transactionsData.totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Void Transaction
            </DialogTitle>
            <DialogDescription>
              This will deduct {transactionToVoid?.points} points from {transactionToVoid?.user_name}'s score.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {transactionToVoid && (
            <div className="py-4 space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div><strong>User:</strong> {transactionToVoid.user_name}</div>
                <div><strong>Points:</strong> {transactionToVoid.points}</div>
                <div><strong>Action:</strong> {transactionToVoid.action_type.replace(/_/g, " ")}</div>
                <div><strong>Date:</strong> {formatDate(transactionToVoid.created_at)}</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="void-reason" className="text-sm font-medium">
                  Reason for voiding <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="void-reason"
                  placeholder="Enter the reason for voiding this transaction..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-void-reason"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be recorded in the audit trail.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              data-testid="button-cancel-void"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={!voidReason.trim() || voidMutation.isPending}
              data-testid="button-confirm-void"
            >
              {voidMutation.isPending ? "Voiding..." : "Void Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
