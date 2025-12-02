import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ColumnsDialogProps {
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomColumn {
  id: string;
  name: string;
  type: string;
}

export function ColumnsDialog({ sheetId, open, onOpenChange }: ColumnsDialogProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<CustomColumn | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: columns, isLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (columnId: string) => {
      return await apiRequest<any>("DELETE", `/api/sheets/${sheetId}/columns/${columnId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "columns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      toast({
        title: "Column deleted",
        description: "Custom column has been removed",
      });
      setDeletingId(null);
      setColumnToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setDeletingId(null);
      setColumnToDelete(null);
    },
  });

  const handleDeleteClick = (column: CustomColumn) => {
    setColumnToDelete(column);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (columnToDelete) {
      setDeletingId(columnToDelete.id);
      deleteMutation.mutate(columnToDelete.id);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Custom Columns</DialogTitle>
          <DialogDescription>
            View and delete custom columns created during imports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (!columns || columns.length === 0) && (
            <Alert data-testid="alert-no-columns">
              <AlertDescription>
                No custom columns found. Import an Excel file with unmapped columns to create custom columns automatically.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && columns && columns.length > 0 && (
            <div className="border rounded-lg" data-testid="list-custom-columns">
              <div className="grid grid-cols-[1fr,auto,auto] gap-4 px-4 py-3 border-b bg-muted font-medium text-sm">
                <div>Column Name</div>
                <div>Type</div>
                <div>Actions</div>
              </div>
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="grid grid-cols-[1fr,auto,auto] gap-4 px-4 py-3 border-b last:border-b-0 items-center"
                  data-testid={`row-column-${column.id}`}
                >
                  <div className="font-medium" data-testid={`text-column-name-${column.id}`}>
                    {column.name}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {column.type}
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(column)}
                      disabled={deletingId === column.id}
                      data-testid={`button-delete-column-${column.id}`}
                      className="hover-elevate"
                    >
                      {deletingId === column.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the column "{columnToDelete?.name}"? 
              This will remove the column and all its data from all leads in this sheet. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-column">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-column"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
