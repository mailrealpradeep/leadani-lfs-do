import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetSelector } from "@/components/sheet-selector";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { DropdownManagerModal } from "@/components/dropdown-manager-modal";
import { ColumnManagerModal } from "@/components/column-manager-modal";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { ColumnsDialog } from "@/components/columns-dialog";
import type { Sheet } from "@shared/schema";

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
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

  // Clean up app header when leaving dashboard
  useEffect(() => {
    return () => {
      const appHeader = document.querySelector('header[data-app-header]');
      if (appHeader) {
        appHeader.classList.remove('header-hidden');
      }
    };
  }, []);

  // Handle scroll from SpreadsheetGrid
  const handleGridScroll = useCallback((scrollTop: number, scrollingDown: boolean) => {
    const appHeader = document.querySelector('header[data-app-header]');
    
    if (appHeader) {
      if (scrollTop > 50 && scrollingDown) {
        // Scrolling down - hide app header
        appHeader.classList.add('header-hidden');
      } else if (!scrollingDown) {
        // Scrolling up - show app header
        appHeader.classList.remove('header-hidden');
      }
    }
  }, []);

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
      <div 
        className="sticky top-0 z-20 bg-background border-b px-3 sm:px-4 md:px-6 py-3 md:py-4"
        data-dashboard-header
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">Leads</h1>
            <div className="flex-shrink-0 w-full sm:w-auto max-w-[200px] sm:max-w-none">
              <SheetSelector
                selectedSheetId={selectedSheetId}
                onSheetSelect={setSelectedSheetId}
              />
            </div>
          </div>
          {selectedSheetId && (
            <>
              {/* Desktop buttons */}
              <div className="hidden sm:flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsColumnsDialogOpen(true)}
                  data-testid="button-manage-columns"
                  className="min-h-[44px]"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Columns
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsImportOpen(true)}
                  data-testid="button-import-leads"
                  className="min-h-[44px]"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button
                  onClick={() => setIsAddLeadOpen(true)}
                  data-testid="button-add-lead"
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </div>
              {/* Mobile: Single Add button */}
              <div className="sm:hidden">
                <Button
                  onClick={() => setIsAddLeadOpen(true)}
                  data-testid="button-add-lead"
                  className="w-full min-h-[44px]"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Lead
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        {selectedSheetId ? (
          <SpreadsheetGrid
            sheetId={selectedSheetId}
            onOpenLeadDetail={handleOpenLeadDetail}
            onOpenDropdownManager={handleOpenDropdownManager}
            onOpenColumnManager={() => setIsColumnManagerOpen(true)}
            onScroll={handleGridScroll}
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
          <ColumnsDialog
            sheetId={selectedSheetId}
            open={isColumnsDialogOpen}
            onOpenChange={setIsColumnsDialogOpen}
          />
        </>
      )}
    </div>
  );
}
