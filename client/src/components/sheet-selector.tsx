import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronDown, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSheetSelect: (sheetId: string) => void;
}

export function SheetSelector({ selectedSheetId, onSheetSelect }: SheetSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");

  const { data: sheets, isLoading } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest<Sheet>("POST", "/api/sheets", {
        name,
        owner_id: user?.id,
        settings: {},
      });
    },
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setIsCreateDialogOpen(false);
      setNewSheetName("");
      onSheetSelect(newSheet.id);
      toast({
        title: "Sheet created",
        description: `${newSheet.name} has been created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create sheet",
        description: error.message,
      });
    },
  });

  const handleCreateSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSheetName.trim()) {
      createMutation.mutate(newSheetName.trim());
    }
  };

  const selectedSheet = sheets?.find((s) => s.id === selectedSheetId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="justify-between min-w-[200px]"
            data-testid="button-sheet-selector"
          >
            {isLoading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : selectedSheet ? (
              <span className="truncate">{selectedSheet.name}</span>
            ) : (
              <span className="text-muted-foreground">Select a sheet</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Your Sheets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sheets && sheets.length > 0 ? (
            sheets.map((sheet) => (
              <DropdownMenuItem
                key={sheet.id}
                onClick={() => onSheetSelect(sheet.id)}
                data-testid={`sheet-option-${sheet.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{sheet.name}</span>
                  {sheet.id === selectedSheetId && (
                    <Check className="h-4 w-4 ml-2 shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No sheets yet
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-sheet"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create new sheet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new sheet</DialogTitle>
            <DialogDescription>
              Create a workspace to organize and manage your leads
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSheet}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Sheet name</Label>
                <Input
                  id="sheet-name"
                  placeholder="e.g., Sales North, Marketing Leads"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  data-testid="input-sheet-name"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create-sheet"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newSheetName.trim() || createMutation.isPending}
                data-testid="button-confirm-create-sheet"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create sheet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
