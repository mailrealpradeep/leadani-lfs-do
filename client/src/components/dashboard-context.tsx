import { createContext, useContext, useState, ReactNode } from "react";

interface DashboardContextType {
  selectedSheetId: string | null;
  setSelectedSheetId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: "all" | "hot" | "warm" | "cold";
  setCategoryFilter: (filter: "all" | "hot" | "warm" | "cold") => void;
  activeQuickFilter: string | null;
  setActiveQuickFilter: (filter: string | null) => void;
  quickFilterHandlers: {
    onApplyFilter?: (filterType: string) => void;
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
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [quickFilterHandlers, setQuickFilterHandlers] = useState<DashboardContextType["quickFilterHandlers"]>({});
  const [actions, setActions] = useState<DashboardContextType["actions"]>({});

  return (
    <DashboardContext.Provider
      value={{
        selectedSheetId,
        setSelectedSheetId,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        activeQuickFilter,
        setActiveQuickFilter,
        quickFilterHandlers,
        setQuickFilterHandlers,
        actions,
        setActions,
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
      searchQuery: "",
      setSearchQuery: () => {},
      categoryFilter: "all" as "all" | "hot" | "warm" | "cold",
      setCategoryFilter: () => {},
      activeQuickFilter: null,
      setActiveQuickFilter: () => {},
      quickFilterHandlers: {},
      setQuickFilterHandlers: () => {},
      actions: {},
      setActions: () => {},
    };
  }
  return context;
}
