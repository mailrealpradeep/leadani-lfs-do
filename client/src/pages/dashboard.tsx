import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetSelector } from "@/components/sheet-selector";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { DropdownManagerModal } from "@/components/dropdown-manager-modal";
import { ColumnManagerModal } from "@/components/column-manager-modal";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { ImportDialog } from "@/components/import-dialog";
import type { Sheet } from "@shared/schema";

export default function Dashboard() {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dropdownColumn, setDropdownColumn] = useState<string | null>(null);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Auto-select first sheet if available (use useEffect to avoid render-phase setState)
  useEffect(() => {
    if (!selectedSheetId && sheets && sheets.length > 0) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [selectedSheetId, sheets]);

  const handleOpenLeadDetail = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsLeadDetailOpen(true);
  };

  const handleOpenDropdownManager = (columnKey: string) => {
    setDropdownColumn(columnKey);
    setIsDropdownManagerOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Leads</h1>
            <SheetSelector
              selectedSheetId={selectedSheetId}
              onSheetSelect={setSelectedSheetId}
            />
          </div>
          {selectedSheetId && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                data-testid="button-import-leads"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                onClick={() => setIsAddLeadOpen(true)}
                data-testid="button-add-lead"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {selectedSheetId ? (
          <SpreadsheetGrid
            sheetId={selectedSheetId}
            onOpenLeadDetail={handleOpenLeadDetail}
            onOpenDropdownManager={handleOpenDropdownManager}
            onOpenColumnManager={() => setIsColumnManagerOpen(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl">📊</div>
              <h2 className="text-2xl font-semibold">No sheet selected</h2>
              <p className="text-muted-foreground">
                Select a sheet from the dropdown above to view and manage leads, or create a new sheet to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedSheetId && (
        <>
          <LeadDetailDrawer
            leadId={selectedLeadId}
            open={isLeadDetailOpen}
            onOpenChange={setIsLeadDetailOpen}
          />
          <DropdownManagerModal
            sheetId={selectedSheetId}
            columnKey={dropdownColumn}
            open={isDropdownManagerOpen}
            onOpenChange={setIsDropdownManagerOpen}
          />
          <ColumnManagerModal
            sheetId={selectedSheetId}
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
          />
          <AddLeadDialog
            sheetId={selectedSheetId}
            open={isAddLeadOpen}
            onOpenChange={setIsAddLeadOpen}
          />
          <ImportDialog
            sheetId={selectedSheetId}
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
          />
        </>
      )}
    </div>
  );
}
