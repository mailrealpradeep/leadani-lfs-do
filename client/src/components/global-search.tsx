import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Phone, MapPin, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/components/dashboard-context";
import { useAuth } from "@/lib/auth";
import type { CompanySearchResult } from "@shared/schema";

export function GlobalSearch() {
  const { user, isSuperAdmin } = useAuth();
  const { setSelectedSheetId, setIsMultiSheetMode } = useDashboard();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global search query - searches across all company sheets
  const { data: searchResults = [], isLoading: isSearching } = useQuery<CompanySearchResult[]>({
    queryKey: ["/api/leads/company-search", searchQuery],
    queryFn: async () => {
      console.log("[GlobalSearch] Fetching results for:", searchQuery);
      const response = await fetch(`/api/leads/company-search?q=${encodeURIComponent(searchQuery)}&limit=15`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error("[GlobalSearch] API error:", response.status);
        throw new Error("Search failed");
      }
      const data = await response.json();
      console.log("[GlobalSearch] Got results:", data.length);
      return data;
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30000,
  });

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selecting a search result
  const handleSearchResultClick = (result: CompanySearchResult) => {
    setSelectedSheetId(result.sheet_id);
    setIsMultiSheetMode(false);
    setSearchQuery("");
    setIsOpen(false);
    toast({
      title: "Lead found",
      description: `${result.full_name} in ${result.sheet_name} (${result.owner_name})`,
    });
  };

  const handleClear = () => {
    setSearchQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Don't show for super admin account
  if (isSuperAdmin) {
    return null;
  }

  const showResults = isOpen && searchQuery.trim().length >= 2;

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          className="pl-9 pr-8 w-48 sm:w-64 h-9"
          data-testid="input-global-search"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
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
