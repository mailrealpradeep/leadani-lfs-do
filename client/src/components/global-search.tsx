import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Phone, MapPin, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-context";
import { useAuth } from "@/lib/auth";
import { LeadEditDialog } from "./lead-edit-dialog";
import type { CompanySearchResult } from "@shared/schema";

interface GlobalSearchProps {
  onExpandedChange?: (expanded: boolean) => void;
}

interface SelectedLeadInfo {
  leadId: string;
  sheetId: string;
}

export function GlobalSearch({ onExpandedChange }: GlobalSearchProps) {
  const { user, isSuperAdmin } = useAuth();
  const { setSelectedSheetId, setIsMultiSheetMode } = useDashboard();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [selectedLead, setSelectedLead] = useState<SelectedLeadInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useQuery<CompanySearchResult[]>({
    queryKey: ["/api/leads/company-search", searchQuery],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/leads/company-search?q=${encodeURIComponent(searchQuery)}&limit=15`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30000,
  });

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsResultsOpen(false);
        if (!searchQuery.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        handleCollapse();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  const handleSearchResultClick = (result: CompanySearchResult) => {
    setSelectedLead({
      leadId: result.lead_id,
      sheetId: result.sheet_id,
    });

    setSelectedSheetId(result.sheet_id);
    setIsMultiSheetMode(false);
    setEditDialogOpen(true);

    setSearchQuery("");
    setIsResultsOpen(false);
    setIsExpanded(false);
  };

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setSelectedLead(null);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setSearchQuery("");
    setIsResultsOpen(false);
    setIsExpanded(false);
  };

  if (isSuperAdmin) {
    return null;
  }

  const showResults = isResultsOpen && searchQuery.trim().length >= 2;

  if (!isExpanded) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className="h-9 w-9 shrink-0"
          data-testid="button-global-search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {selectedLead && (
          <LeadEditDialog
            leadId={selectedLead.leadId}
            sheetId={selectedLead.sheetId}
            open={editDialogOpen}
            onOpenChange={handleEditDialogClose}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative flex-1" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            placeholder="Search leads by name or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length >= 2) {
                setIsResultsOpen(true);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setIsResultsOpen(true);
              }
            }}
            className="pl-9 pr-10 h-9 w-full"
            data-testid="input-global-search"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 h-7 w-7"
            onClick={handleCollapse}
            data-testid="button-close-search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto min-w-[280px]">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No leads found for "{searchQuery}"
              </div>
            ) : (
              <div className="py-1">
                {searchResults.map((result) => {
                  const isOwner = result.owner_user_id === user?.id;
                  return (
                    <button
                      key={result.lead_id}
                      type="button"
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-3 py-2 text-left hover-elevate flex flex-col gap-1 border-b last:border-b-0"
                      data-testid={`search-result-${result.lead_id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          {result.full_name || "Unknown"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                          isOwner 
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        }`}>
                          {isOwner ? "Yours" : result.owner_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {result.mobile_no || "No phone"}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {result.sheet_name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-primary">Click to open</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedLead && (
        <LeadEditDialog
          leadId={selectedLead.leadId}
          sheetId={selectedLead.sheetId}
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
        />
      )}
    </>
  );
}
