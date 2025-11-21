import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronDown, Check, User, Building2, Lock, Globe } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSheetSelect: (sheetId: string) => void;
}

export function SheetSelector({ selectedSheetId, onSheetSelect }: SheetSelectorProps) {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [sheetType, setSheetType] = useState<"personal" | "company">("personal");
  const [visibility, setVisibility] = useState<"company" | "restricted">("company");

  const { data: sheets, isLoading } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; is_personal: boolean; visibility: "company" | "restricted" }) => {
      return await apiRequest<Sheet>("POST", "/api/sheets", {
        name: data.name,
        is_personal: data.is_personal,
        visibility: data.visibility,
        settings: {},
      });
    },
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setIsCreateDialogOpen(false);
      setNewSheetName("");
      setSheetType("personal");
      setVisibility("company");
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
      createMutation.mutate({
        name: newSheetName.trim(),
        is_personal: sheetType === "personal",
        visibility: sheetType === "personal" ? "restricted" : visibility,
      });
    }
  };

  const selectedSheet = sheets?.find((s) => s.id === selectedSheetId);

  const personalSheets = sheets?.filter(s => s.is_personal) || [];
  const companySheets = sheets?.filter(s => !s.is_personal) || [];

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
              <div className="flex items-center gap-2">
                {selectedSheet.is_personal ? (
                  <User className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">{selectedSheet.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select a sheet</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {personalSheets.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Sheets
              </DropdownMenuLabel>
              {personalSheets.map((sheet) => (
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
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          
          {companySheets.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Sheets
              </DropdownMenuLabel>
              {companySheets.map((sheet) => (
                <DropdownMenuItem
                  key={sheet.id}
                  onClick={() => onSheetSelect(sheet.id)}
                  data-testid={`sheet-option-${sheet.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {sheet.visibility === "restricted" ? (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{sheet.name}</span>
                    </div>
                    {sheet.id === selectedSheetId && (
                      <Check className="h-4 w-4 ml-2 shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {sheets && sheets.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No sheets yet
            </div>
          )}
          
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
              Create a personal sheet or a company-wide workspace
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

              {(isCompanyAdmin || isSuperAdmin) && (
                <div className="space-y-3">
                  <Label>Sheet type</Label>
                  <RadioGroup value={sheetType} onValueChange={(v: any) => setSheetType(v)} data-testid="radio-sheet-type">
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value="personal" id="personal" data-testid="radio-personal" />
                      <div className="space-y-1">
                        <Label htmlFor="personal" className="font-normal cursor-pointer flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Personal Sheet
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Only you can access this sheet
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value="company" id="company" data-testid="radio-company" />
                      <div className="space-y-1">
                        <Label htmlFor="company" className="font-normal cursor-pointer flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Company Sheet
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Share with users in your company
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {!isCompanyAdmin && !isSuperAdmin && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Personal Sheet</p>
                      <p className="text-xs text-muted-foreground">
                        Only you can access this sheet
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {sheetType === "company" && (isCompanyAdmin || isSuperAdmin) && (
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={(v: any) => setVisibility(v)} data-testid="select-visibility">
                    <SelectTrigger id="visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Company-wide</div>
                            <div className="text-xs text-muted-foreground">
                              All company users can access
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="restricted">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Restricted</div>
                            <div className="text-xs text-muted-foreground">
                              Only assigned users can access
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
