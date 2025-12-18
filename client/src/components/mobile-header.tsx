import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "./dashboard-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Sheet } from "@shared/schema";

export function MobileHeader() {
  const [location] = useLocation();
  const { company } = useAuth();
  const { selectedSheetId, setSelectedSheetId } = useDashboard();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);
  const isOnDashboard = location === "/" || location === "/dashboard";

  const getPageTitle = () => {
    if (isOnDashboard) {
      return selectedSheet?.name || "Select Sheet";
    }
    const titles: Record<string, string> = {
      "/reports": "Reports",
      "/visits": "Visit Schedules",
      "/working-target": "Working Target",
      "/attendance": "Attendance",
      "/tasks": "Tasks",
      "/leaderboard": "Leaderboard",
      "/admin": "Admin Console",
      "/team-performance": "Team Performance",
      "/activity-logs": "Activity Log",
    };
    return titles[location] || "Leadani";
  };

  return (
    <header 
      className="sticky top-0 z-40 bg-background border-b"
      data-testid="mobile-header"
    >
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Left: Title or Sheet Selector */}
        <div className="flex-1 min-w-0">
          {isOnDashboard && sheets.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-lg hover:bg-transparent flex items-center gap-1 max-w-full"
                  data-testid="button-sheet-selector"
                >
                  <span className="truncate">{selectedSheet?.name || "Select Sheet"}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {sheets.map((sheet) => (
                  <DropdownMenuItem
                    key={sheet.id}
                    onClick={() => setSelectedSheetId(sheet.id)}
                    className={selectedSheetId === sheet.id ? "bg-accent" : ""}
                    data-testid={`menu-item-sheet-${sheet.id}`}
                  >
                    {sheet.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <h1 className="font-semibold text-lg truncate">{getPageTitle()}</h1>
          )}
        </div>

        {/* Right: Search + Theme Toggle */}
        <div className="flex items-center gap-1">
          <GlobalSearch onExpandedChange={setIsSearchExpanded} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
