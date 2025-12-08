import { createContext, useContext, useState, ReactNode } from "react";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ColumnVisibilityConfig {
  columns: Array<{ key: string; label: string }>;
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
}

interface DashboardContextType {
  selectedSheetId: string | null;
  setSelectedSheetId: (id: string | null) => void;
  selectedSheetIds: string[];
  setSelectedSheetIds: (ids: string[]) => void;
  isMultiSheetMode: boolean;
  setIsMultiSheetMode: (enabled: boolean) => void;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: "all" | "hot" | "warm" | "cold";
  setCategoryFilter: (filter: "all" | "hot" | "warm" | "cold") => void;
  activeQuickFilter: string | null;
  setActiveQuickFilter: (filter: string | null) => void;
  thoughtFilter: "sure" | "maybe" | null;
  setThoughtFilter: (filter: "sure" | "maybe" | null) => void;
  quickFilterHandlers: {
    onApplyFilter?: (filterId: string, filterConfig: any) => void;
    onClearAllFilters?: () => void;
  };
  setQuickFilterHandlers: (handlers: DashboardContextType["quickFilterHandlers"]) => void;
  actions: {
    onAddLead?: () => void;
    onImport?: () => void;
    onManageColumns?: () => void;
    onToggleColumns?: () => void;
    onViewDeletedLeads?: () => void;
    onExport?: () => void;
  };
  setActions: (actions: DashboardContextType["actions"]) => void;
  columnVisibilityConfig: ColumnVisibilityConfig | null;
  setColumnVisibilityConfig: (config: ColumnVisibilityConfig | null) => void;
  isColumnVisibilityOpen: boolean;
  setIsColumnVisibilityOpen: (open: boolean) => void;
  isRowFiltersOpen: boolean;
  setIsRowFiltersOpen: (open: boolean) => void;
  pendingLead: { leadId: string; sheetId: string } | null;
  setPendingLead: (lead: { leadId: string; sheetId: string } | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [isMultiSheetMode, setIsMultiSheetMode] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [thoughtFilter, setThoughtFilter] = useState<"sure" | "maybe" | null>(null);
  const [quickFilterHandlers, setQuickFilterHandlers] = useState<DashboardContextType["quickFilterHandlers"]>({});
  const [actions, setActions] = useState<DashboardContextType["actions"]>({});
  const [columnVisibilityConfig, setColumnVisibilityConfig] = useState<ColumnVisibilityConfig | null>(null);
  const [isColumnVisibilityOpen, setIsColumnVisibilityOpen] = useState(false);
  const [isRowFiltersOpen, setIsRowFiltersOpen] = useState(false);
  const [pendingLead, setPendingLead] = useState<{ leadId: string; sheetId: string } | null>(null);

  return (
    <DashboardContext.Provider
      value={{
        selectedSheetId,
        setSelectedSheetId,
        selectedSheetIds,
        setSelectedSheetIds,
        isMultiSheetMode,
        setIsMultiSheetMode,
        pagination,
        setPagination,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        activeQuickFilter,
        setActiveQuickFilter,
        thoughtFilter,
        setThoughtFilter,
        quickFilterHandlers,
        setQuickFilterHandlers,
        actions,
        setActions,
        columnVisibilityConfig,
        setColumnVisibilityConfig,
        isColumnVisibilityOpen,
        setIsColumnVisibilityOpen,
        isRowFiltersOpen,
        setIsRowFiltersOpen,
        pendingLead,
        setPendingLead,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    return {
      selectedSheetId: null,
      setSelectedSheetId: () => {},
      selectedSheetIds: [] as string[],
      setSelectedSheetIds: () => {},
      isMultiSheetMode: false,
      setIsMultiSheetMode: () => {},
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      setPagination: () => {},
      searchQuery: "",
      setSearchQuery: () => {},
      categoryFilter: "all" as "all" | "hot" | "warm" | "cold",
      setCategoryFilter: () => {},
      activeQuickFilter: null,
      setActiveQuickFilter: () => {},
      thoughtFilter: null,
      setThoughtFilter: () => {},
      quickFilterHandlers: {},
      setQuickFilterHandlers: () => {},
      actions: {},
      setActions: () => {},
      columnVisibilityConfig: null as ColumnVisibilityConfig | null,
      setColumnVisibilityConfig: () => {},
      isColumnVisibilityOpen: false,
      setIsColumnVisibilityOpen: () => {},
      isRowFiltersOpen: false,
      setIsRowFiltersOpen: () => {},
      pendingLead: null,
      setPendingLead: () => {},
    };
  }
  return context;
}
