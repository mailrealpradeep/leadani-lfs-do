import { useState } from "react";
import { Home, LayoutGrid, BarChart3, Settings, Users, Webhook, Plus, FileUp, Settings as SettingsIcon, Search, Download, Trash2, UsersRound, Clock, CheckSquare, Shield, Eye, EyeOff, Columns, Send, Activity, Trophy, Target, Rows, Crosshair, HelpCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "./dashboard-context";
import { MultiSheetSelector } from "./multi-sheet-selector";
import { Input } from "@/components/ui/input";
import {
  Sheet as SheetUI,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sheet, UserRowFilterRecord } from "@shared/schema";
import { HideRowsPanel } from "./hide-rows-panel";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, company, logout, isSuperAdmin, isCompanyAdmin } = useAuth();
  const {
    selectedSheetId,
    setSelectedSheetId,
    selectedSheetIds,
    setSelectedSheetIds,
    isMultiSheetMode,
    setIsMultiSheetMode,
    searchQuery,
    setSearchQuery,
    actions,
    columnVisibilityConfig,
    isColumnVisibilityOpen,
    setIsColumnVisibilityOpen,
    isRowFiltersOpen,
    setIsRowFiltersOpen,
  } = useDashboard();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch row filters for active count display
  const { data: rowFilters = [] } = useQuery<UserRowFilterRecord[]>({
    queryKey: ["/api/sheets", selectedSheetId, "row-filters"],
    enabled: !!selectedSheetId && !isMultiSheetMode,
  });

  const activeRowFiltersCount = rowFilters.filter(f => f.is_active).length;

  const selectedSheet = sheets?.find(s => s.id === selectedSheetId);

  // Permission check matching backend logic:
  // - Personal sheets: only owner or super admin
  // - Company sheets: owner, company admin, or super admin
  const canDeleteSheet = selectedSheet && (
    selectedSheet.owner_id === user?.id ||
    isSuperAdmin ||
    (!selectedSheet.is_personal && isCompanyAdmin)
  );

  const deleteMutation = useMutation({
    mutationFn: async ({ sheetId, password }: { sheetId: string; password: string }) => {
      return await apiRequest("DELETE", `/api/sheets/${sheetId}`, { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setSelectedSheetId(null);
      setIsDeleteDialogOpen(false);
      setDeletePassword("");
      toast({
        title: "Sheet deleted",
        description: "The sheet has been permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete sheet",
        description: error.message,
      });
    },
  });

  // Check if the current user is the dedicated Super Admin account
  const isSuperAdminAccount = user?.email === "adminleadani@leadani.com";

  // Super Admin has a completely different, focused sidebar
  const superAdminItems = [
    {
      title: "Super Admin Console",
      url: "/super-admin",
      icon: Shield,
      testId: "link-super-admin-console",
    },
  ];

  // Regular user items - hidden for Super Admin
  // Team Performance and Webhooks are admin-only
  const mainItems = isSuperAdminAccount ? [] : [
    {
      title: "My Sheets",
      url: "/",
      icon: LayoutGrid,
      testId: "link-sheets",
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: CheckSquare,
      testId: "link-tasks",
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: Clock,
      testId: "link-attendance",
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
      testId: "link-reports",
    },
    // Team Performance - admin only
    ...((isCompanyAdmin || isSuperAdmin) ? [{
      title: "Team Performance",
      url: "/team-performance",
      icon: UsersRound,
      testId: "link-team-performance",
    }] : []),
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: Trophy,
      testId: "link-leaderboard",
    },
    // OLD TARGET SYSTEM - Not being used. Covered by Working Targets.
    // When cleaning up code, remove this menu item, the my-targets.tsx page, 
    // user-target-progress.tsx component, and related /api/targets backend routes.
    // {
    //   title: "My Targets",
    //   url: "/my-targets",
    //   icon: Target,
    //   testId: "link-my-targets",
    // },
    {
      title: "Working Target",
      url: "/working-target",
      icon: Crosshair,
      testId: "link-working-target",
    },
    {
      title: "Activity Log",
      url: "/activity-logs",
      icon: Activity,
      testId: "link-activity-logs",
    },
    // Webhooks - admin only
    ...((isCompanyAdmin || isSuperAdmin) ? [{
      title: "Webhooks",
      url: "/webhooks",
      icon: Webhook,
      testId: "link-webhooks",
    }] : []),
  ];

  // Admin items - only for company admins, not Super Admin account
  const adminItems = (!isSuperAdminAccount && (isSuperAdmin || isCompanyAdmin))
    ? [
        {
          title: "Admin Console",
          url: "/admin",
          icon: Users,
          testId: "link-admin",
        },
        {
          title: "Outgoing Webhooks",
          url: "/outgoing-webhooks",
          icon: Send,
          testId: "link-outgoing-webhooks",
        },
      ]
    : [];

  return (
    <>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
              LeadAni LFS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Show Super Admin items for dedicated Super Admin account */}
                {isSuperAdminAccount && superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith("/super-admin")}
                      data-testid={item.testId}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {/* Show regular items for non-Super-Admin users */}
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={item.testId}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {adminItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={item.testId}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {location === "/" && !isSuperAdminAccount && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel className="px-4">Current Sheet</SidebarGroupLabel>
                <SidebarGroupContent className="px-2">
                  <div className="space-y-2">
                    <MultiSheetSelector
                      selectedSheetId={selectedSheetId}
                      selectedSheetIds={selectedSheetIds}
                      isMultiMode={isMultiSheetMode}
                      onSheetSelect={setSelectedSheetId}
                      onMultiSheetSelect={setSelectedSheetIds}
                      onMultiModeChange={setIsMultiSheetMode}
                    />
                    {(selectedSheetId || (isMultiSheetMode && selectedSheetIds.length > 0)) && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={actions.onAddLead}
                          className="w-full justify-start"
                          data-testid="button-add-lead"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lead
                        </Button>
                        {(isCompanyAdmin || isSuperAdmin) && (
                          <Button
                            variant="outline"
                            onClick={actions.onImport}
                            className="w-full justify-start"
                            data-testid="button-import-leads"
                          >
                            <FileUp className="h-4 w-4 mr-2" />
                            Import
                          </Button>
                        )}
                        {columnVisibilityConfig && !isMultiSheetMode && (
                          <Button
                            variant="outline"
                            onClick={() => setIsColumnVisibilityOpen(true)}
                            className="w-full justify-start"
                            data-testid="button-view-hide-columns"
                          >
                            <Columns className="h-4 w-4 mr-2" />
                            View/Hide Columns
                            {columnVisibilityConfig.hiddenColumns.size > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {columnVisibilityConfig.hiddenColumns.size} hidden
                              </span>
                            )}
                          </Button>
                        )}
                        {selectedSheetId && !isMultiSheetMode && (
                          <Button
                            variant="outline"
                            onClick={() => setIsRowFiltersOpen(true)}
                            className="w-full justify-start"
                            data-testid="button-hide-show-rows"
                          >
                            <Rows className="h-4 w-4 mr-2" />
                            Hide/Show Rows
                            {activeRowFiltersCount > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {activeRowFiltersCount} active
                              </span>
                            )}
                          </Button>
                        )}
                        {(isCompanyAdmin || isSuperAdmin) && (
                          <Button
                            variant="outline"
                            onClick={actions.onViewDeletedLeads}
                            className="w-full justify-start"
                            data-testid="button-view-deleted-leads"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deleted Leads
                          </Button>
                        )}
                        {canDeleteSheet && (
                          <Button
                            variant="destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="w-full justify-start"
                            data-testid="button-delete-sheet"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Sheet
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>

              {(selectedSheetId || (isMultiSheetMode && selectedSheetIds.length > 0)) && (isCompanyAdmin || isSuperAdmin) && (
                <SidebarGroup>
                  <SidebarGroupLabel className="px-4">Current Sheet</SidebarGroupLabel>
                  <SidebarGroupContent className="px-2">
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={actions.onExport}
                        className="w-full justify-start"
                        data-testid="button-export"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4 border-t">
          {sessionStorage.getItem("impersonating") === "true" && (
            <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Viewing as another user
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "End Session" below to close
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user?.name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {company && (
                <p className="text-xs text-muted-foreground truncate" data-testid="text-company-name">
                  {company.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex-1"
              data-testid="button-logout"
            >
              {sessionStorage.getItem("impersonating") === "true" ? "End Session" : "Sign out"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              data-testid="button-help"
            >
              <a href="/help" target="_blank" rel="noopener noreferrer">
                <HelpCircle className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) setDeletePassword("");
      }}>
        <AlertDialogContent data-testid="dialog-delete-sheet">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSheet?.name}</strong>?
              This will permanently delete the sheet and all its leads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label htmlFor="delete-password" className="text-sm font-medium mb-2 block">
              Enter your account password to confirm
            </label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              data-testid="input-delete-password"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-sheet">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={(e) => {
                e.preventDefault();
                if (selectedSheetId && deletePassword) {
                  deleteMutation.mutate({ sheetId: selectedSheetId, password: deletePassword });
                }
              }}
              disabled={!deletePassword || deleteMutation.isPending}
              variant="destructive"
              data-testid="button-confirm-delete-sheet"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Column Visibility Sheet */}
      <SheetUI open={isColumnVisibilityOpen} onOpenChange={setIsColumnVisibilityOpen}>
        <SheetContent side="left" className="w-[320px] sm:w-[380px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              View/Hide Columns
            </SheetTitle>
            <SheetDescription>
              Toggle column visibility. Hidden columns are excluded from the spreadsheet view.
              {columnVisibilityConfig && columnVisibilityConfig.hiddenColumns.size > 0 && (
                <span className="block mt-1 text-primary">
                  {columnVisibilityConfig.hiddenColumns.size} column(s) currently hidden
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
            {columnVisibilityConfig?.columns && columnVisibilityConfig.columns.length > 0 ? (
              columnVisibilityConfig.columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover-elevate"
                  data-testid={`toggle-column-${col.key}`}
                >
                  <div className="flex items-center gap-2">
                    {columnVisibilityConfig.hiddenColumns.has(col.key) ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-primary" />
                    )}
                    <span className={columnVisibilityConfig.hiddenColumns.has(col.key) ? "text-muted-foreground" : ""}>
                      {col.label}
                    </span>
                  </div>
                  <Switch
                    checked={!columnVisibilityConfig.hiddenColumns.has(col.key)}
                    onCheckedChange={() => columnVisibilityConfig.toggleColumn(col.key)}
                    data-testid={`switch-column-${col.key}`}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-columns">
                <p>No columns available.</p>
                <p className="text-sm mt-1">Please wait for the sheet to load or select a different sheet.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </SheetUI>

      {/* Row Filters Sheet */}
      <SheetUI open={isRowFiltersOpen} onOpenChange={setIsRowFiltersOpen}>
        <SheetContent side="left" className="w-[380px] sm:w-[450px] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Rows className="h-5 w-5" />
              Hide/Show Rows
            </SheetTitle>
            <SheetDescription>
              Create filters to hide rows based on column values. Hidden rows won't appear in your view.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex-1 min-h-0 overflow-hidden">
            {selectedSheetId && (
              <HideRowsPanel 
                sheetId={selectedSheetId} 
                onFiltersChange={() => {}}
              />
            )}
          </div>
        </SheetContent>
      </SheetUI>
    </>
  );
}
