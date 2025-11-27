import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { useDashboard } from "@/components/dashboard-context";
import { SpreadsheetGrid } from "@/components/spreadsheet-grid";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { DropdownManagerModal } from "@/components/dropdown-manager-modal";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { ColumnsDialog } from "@/components/columns-dialog";
import { DeletedLeadsDialog } from "@/components/deleted-leads-dialog";
import type { Sheet } from "@shared/schema";

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedSheetId, setSelectedSheetId, selectedSheetIds, isMultiSheetMode, setActions } = useDashboard();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isColumnVisibilityOpen, setIsColumnVisibilityOpen] = useState(false);
  const [isDeletedLeadsOpen, setIsDeletedLeadsOpen] = useState(false);
  const [dropdownColumn, setDropdownColumn] = useState<string | null>(null);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Set dashboard actions for sidebar
  useEffect(() => {
    setActions({
      onAddLead: () => setIsAddLeadOpen(true),
      onImport: () => setIsImportOpen(true),
      onToggleColumns: () => setIsColumnVisibilityOpen(true),
      onViewDeletedLeads: () => setIsDeletedLeadsOpen(true),
      onExport: () => {
        if (selectedSheetId) {
          window.open(`/api/sheets/${selectedSheetId}/export?format=csv`, "_blank");
        }
      },
    });
  }, [setActions, selectedSheetId]);

  // Auto-select first sheet if available (use useEffect to avoid render-phase setState)
  useEffect(() => {
    if (!selectedSheetId && sheets && sheets.length > 0) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [selectedSheetId, sheets, setSelectedSheetId]);

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
      <div ref={containerRef} className="flex-1 p-4 overflow-hidden">
        {isMultiSheetMode && selectedSheetIds.length > 0 ? (
          <SpreadsheetGrid
            sheetIds={selectedSheetIds}
            onOpenLeadDetail={handleOpenLeadDetail}
            onOpenDropdownManager={handleOpenDropdownManager}
            onScroll={handleGridScroll}
          />
        ) : selectedSheetId ? (
          <SpreadsheetGrid
            sheetId={selectedSheetId}
            onOpenLeadDetail={handleOpenLeadDetail}
            onOpenDropdownManager={handleOpenDropdownManager}
            onScroll={handleGridScroll}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No sheet selected</h2>
              <p className="text-muted-foreground">
                Select a sheet from the sidebar to view and manage leads, or create a new sheet to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      <LeadDetailDrawer
        leadId={selectedLeadId}
        open={isLeadDetailOpen}
        onOpenChange={setIsLeadDetailOpen}
      />

      {(selectedSheetId || (isMultiSheetMode && selectedSheetIds.length > 0)) && (
        <>
          {selectedSheetId && (
            <>
              <DropdownManagerModal
                sheetId={selectedSheetId}
                columnKey={dropdownColumn}
                open={isDropdownManagerOpen}
                onOpenChange={setIsDropdownManagerOpen}
              />
              <ColumnsDialog
                sheetId={selectedSheetId}
                open={isColumnVisibilityOpen}
                onOpenChange={setIsColumnVisibilityOpen}
              />
              <ImportDialog
                sheetId={selectedSheetId}
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
              />
              <DeletedLeadsDialog
                sheetId={selectedSheetId}
                open={isDeletedLeadsOpen}
                onOpenChange={setIsDeletedLeadsOpen}
              />
            </>
          )}
          <AddLeadDialog
            sheetId={selectedSheetId || (selectedSheetIds.length > 0 ? selectedSheetIds[0] : "")}
            sheetIds={selectedSheetIds}
            isMultiSheetMode={isMultiSheetMode}
            open={isAddLeadOpen}
            onOpenChange={setIsAddLeadOpen}
          />
        </>
      )}
    </div>
  );
}
