import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Phone, MapPin, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/components/dashboard-context";
import { useAuth } from "@/lib/auth";
import type { CompanySearchResult } from "@shared/schema";

interface GlobalSearchProps {
  onExpandedChange?: (expanded: boolean) => void;
}

export function GlobalSearch({ onExpandedChange }: GlobalSearchProps) {
  const { user, isSuperAdmin } = useAuth();
  const { setSelectedSheetId, setIsMultiSheetMode, setPendingLead } = useDashboard();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global search query - searches across all company sheets
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

  // Notify parent when expanded state changes
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsResultsOpen(false);
        // Only collapse if no query
        if (!searchQuery.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  // Handle Escape key to collapse
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        handleCollapse();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Handle selecting a search result
  const handleSearchResultClick = (result: CompanySearchResult) => {
    // First switch to the lead's sheet
    setSelectedSheetId(result.sheet_id);
    setIsMultiSheetMode(false);
    
    // Set the pending lead to open the lead detail drawer
    // Include both lead ID and sheet ID so dashboard can wait for sheet switch
    setPendingLead({ leadId: result.lead_id, sheetId: result.sheet_id });
    
    // Clean up search UI
    setSearchQuery("");
    setIsResultsOpen(false);
    setIsExpanded(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setSearchQuery("");
    setIsResultsOpen(false);
    setIsExpanded(false);
  };

  // Don't show for super admin account
  if (isSuperAdmin) {
    return null;
  }

  const showResults = isResultsOpen && searchQuery.trim().length >= 2;

  // Collapsed state - just show search icon
  if (!isExpanded) {
    return (
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
    );
  }

  // Expanded state - show full search input
  return (
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
      
      {/* Search Results Dropdown */}
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
              {searchResults.map((result) => (
                <button
                  key={result.lead_id}
                  type="button"
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex flex-col gap-1 border-b last:border-b-0"
                  data-testid={`search-result-${result.lead_id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex items-center gap-1">
                      <User className="h-3 w-3 shrink-0" />
                      {result.full_name || "Unknown"}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                      result.owner_user_id === user?.id 
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}>
                      {result.owner_user_id === user?.id ? "Yours" : result.owner_name}
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
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
