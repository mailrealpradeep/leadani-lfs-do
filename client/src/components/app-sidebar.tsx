import { useState } from "react";
import { Home, LayoutGrid, BarChart3, Settings, Users, Webhook, Plus, FileUp, Settings as SettingsIcon, Search, Download, Trash2, UsersRound, Clock, CheckSquare, Shield, Eye, EyeOff, Columns, Send, Activity, Trophy, Target, Rows, Crosshair, HelpCircle, MapPin, CheckCircle2, Flame, Star, Zap, Flag, Award, Heart, Bell, Bookmark, Check, TrendingUp, AlertTriangle, LucideIcon, Sparkles, GitBranchPlus, History, GitBranch, Key, Bot, Radar } from "lucide-react";
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
  useSidebar,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const { setOpenMobile, isMobile } = useSidebar();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  
  // Change password dialog state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Close mobile sidebar when navigating
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check if the current user is the dedicated Super Admin account - must be before any useQuery that depends on it
  const isSuperAdminAccount = user?.email === "adminleadani@leadani.com";

  const { data: sheets } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });

  // Fetch company settings to check allow_user_add_lead
  const { data: companySettings } = useQuery<{ settings: { allow_user_add_lead?: boolean } }>({
    queryKey: ["/api/company/settings"],
    enabled: !isSuperAdminAccount,
  });
  
  const isMultiSheetUser = (sheets?.length || 0) > 1;
  const allowUserAddLead = companySettings?.settings?.allow_user_add_lead !== false; // Default true
  const canAddLead = isCompanyAdmin || isSuperAdmin || isMultiSheetUser || allowUserAddLead;

  // Fetch row filters for active count display
  const { data: rowFilters = [] } = useQuery<UserRowFilterRecord[]>({
    queryKey: ["/api/sheets", selectedSheetId, "row-filters"],
    enabled: !!selectedSheetId && !isMultiSheetMode,
  });

  const activeRowFiltersCount = rowFilters.filter(f => f.is_active).length;

  // Fetch hot leads count for badge
  const { data: hotLeadsData } = useQuery<{ count: number }>({
    queryKey: ["/api/hot-leads/count"],
    enabled: !isSuperAdminAccount,
    refetchInterval: 60000, // Refresh every minute
  });

  const hotLeadsCount = hotLeadsData?.count || 0;

  // Fetch custom views for sidebar
  interface CustomView {
    id: string;
    name: string;
    icon: string;
    icon_color: string;
    show_badge: boolean;
    section: 'custom_views' | 'data_mismatch' | 'action_today' | 'overdue_actions' | 'achievement';
    is_enabled: boolean;
  }

  const { data: customViews = [] } = useQuery<CustomView[]>({
    queryKey: ["/api/custom-views"],
    enabled: !isSuperAdminAccount,
  });

  const enabledViews = customViews.filter(v => v.is_enabled);
  
  // Separate views by section
  const customViewsSection = enabledViews.filter(v => !v.section || v.section === 'custom_views');
  const dataMismatchSection = enabledViews.filter(v => v.section === 'data_mismatch');
  const actionTodaySection = enabledViews.filter(v => v.section === 'action_today');
  const overdueActionsSection = enabledViews.filter(v => v.section === 'overdue_actions');
  const achievementSection = enabledViews.filter(v => v.section === 'achievement');

  // Fetch custom views counts for badges
  const { data: customViewsCounts } = useQuery<{ counts: Record<string, number> }>({
    queryKey: ["/api/custom-views-counts"],
    enabled: !isSuperAdminAccount && enabledViews.some(v => v.show_badge),
    refetchInterval: 60000,
  });

  // Icon mapping for custom views
  const ICON_MAP: Record<string, LucideIcon> = {
    star: Star,
    zap: Zap,
    target: Target,
    flag: Flag,
    award: Award,
    heart: Heart,
    bell: Bell,
    bookmark: Bookmark,
    check: Check,
    clock: Clock,
    flame: Flame,
    users: Users,
    "trending-up": TrendingUp,
    "alert-triangle": AlertTriangle,
  };

  // Color mapping for custom views
  const COLOR_MAP: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    orange: "text-orange-500",
    red: "text-red-500",
    purple: "text-purple-500",
    pink: "text-pink-500",
    yellow: "text-yellow-500",
    teal: "text-teal-500",
    indigo: "text-indigo-500",
    gray: "text-gray-500",
  };

  const getBadgeColor = (color: string): string => {
    const bgMap: Record<string, string> = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
      pink: "bg-pink-500",
      yellow: "bg-yellow-500",
      teal: "bg-teal-500",
      indigo: "bg-indigo-500",
      gray: "bg-gray-500",
    };
    return bgMap[color] || "bg-blue-500";
  };

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

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to change password",
        description: error.message,
      });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

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
      url: "/dashboard",
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
    {
      title: "PowerScore",
      url: "/powerscore",
      icon: Sparkles,
      testId: "link-powerscore",
    },
    {
      title: "PowerFlow",
      url: "/powerflow",
      icon: GitBranchPlus,
      testId: "link-powerflow",
    },
    {
      title: "Vision Board",
      url: "/vision-board",
      icon: Star,
      testId: "link-vision-board",
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
    {
      title: "Visit Schedules",
      url: "/visits",
      icon: MapPin,
      testId: "link-visits",
    },
    {
      title: "Visited Calendar",
      url: "/visited",
      icon: CheckCircle2,
      testId: "link-visited",
    },
    // HOT LEADS FEATURE HIDDEN - Dec 2025
    // Reason: Functionality is covered by Custom Views feature
    // To restore: Uncomment this menu item and the AccordionItem in admin.tsx
    // Related files: hot-leads.tsx, hot-leads-config.tsx, spreadsheet-grid.tsx (hotLeadsMode)
    // See docs/HIDDEN_FEATURES.md for full details
    // {
    //   title: "Hot Leads",
    //   url: "/hot-leads",
    //   icon: Flame,
    //   testId: "link-hot-leads",
    //   badge: hotLeadsCount,
    // },
    {
      title: "Radar",
      url: "/radar",
      icon: Radar,
      testId: "link-radar",
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
          title: "PowerScore Transactions",
          url: "/powerscore/transactions",
          icon: History,
          testId: "link-powerscore-transactions",
        },
        {
          title: "Followup Transactions",
          url: "/followup-transactions",
          icon: History,
          testId: "link-followup-transactions",
        },
        {
          title: "Outgoing Webhooks",
          url: "/outgoing-webhooks",
          icon: Send,
          testId: "link-outgoing-webhooks",
        },
        {
          title: "Insta Support",
          url: "/insta-support",
          icon: Sparkles,
          testId: "link-insta-support",
        },
        {
          title: "Conversion Settings",
          url: "/conversion-settings",
          icon: GitBranch,
          testId: "link-conversion-settings",
        },
        {
          title: "Saila.AI",
          url: "/saila",
          icon: Bot,
          testId: "link-saila-ai",
        },
      ]
    : [];

  return (
    <>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
              Leadani LFS
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
                      <Link href={item.url} onClick={handleNavClick}>
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
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className={item.url === "/hot-leads" ? "h-4 w-4 text-orange-500" : "h-4 w-4"} />
                        <span className="flex-1">{item.title}</span>
                        {"badge" in item && (item as any).badge > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-medium text-white animate-pulse">
                            {(item as any).badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Custom Views Section */}
          {!isSuperAdminAccount && customViewsSection.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Custom Views</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customViewsSection.map((view) => {
                    const IconComponent = ICON_MAP[view.icon] || Star;
                    const colorClass = COLOR_MAP[view.icon_color] || "text-blue-500";
                    const count = customViewsCounts?.counts?.[view.id] || 0;
                    const viewUrl = `/custom-view/${view.id}`;
                    
                    return (
                      <SidebarMenuItem key={view.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === viewUrl}
                          data-testid={`link-custom-view-${view.id}`}
                        >
                          <Link href={viewUrl} onClick={handleNavClick}>
                            <IconComponent className={`h-4 w-4 ${colorClass}`} />
                            <span className="flex-1">{view.name}</span>
                            {view.show_badge && count > 0 && (
                              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${getBadgeColor(view.icon_color)} px-1.5 text-xs font-medium text-white`}>
                                {count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Data Mismatch Section */}
          {!isSuperAdminAccount && dataMismatchSection.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Data Mismatch</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {dataMismatchSection.map((view) => {
                    const IconComponent = ICON_MAP[view.icon] || AlertTriangle;
                    const colorClass = COLOR_MAP[view.icon_color] || "text-red-500";
                    const count = customViewsCounts?.counts?.[view.id] || 0;
                    const viewUrl = `/custom-view/${view.id}`;
                    
                    return (
                      <SidebarMenuItem key={view.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === viewUrl}
                          data-testid={`link-data-mismatch-${view.id}`}
                        >
                          <Link href={viewUrl} onClick={handleNavClick}>
                            <IconComponent className={`h-4 w-4 ${colorClass}`} />
                            <span className="flex-1">{view.name}</span>
                            {view.show_badge && count > 0 && (
                              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${getBadgeColor(view.icon_color)} px-1.5 text-xs font-medium text-white`}>
                                {count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Action Today Section */}
          {!isSuperAdminAccount && actionTodaySection.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Action Today</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {actionTodaySection.map((view) => {
                    const IconComponent = ICON_MAP[view.icon] || Clock;
                    const colorClass = COLOR_MAP[view.icon_color] || "text-amber-500";
                    const count = customViewsCounts?.counts?.[view.id] || 0;
                    const viewUrl = `/custom-view/${view.id}`;
                    
                    return (
                      <SidebarMenuItem key={view.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === viewUrl}
                          data-testid={`link-action-today-${view.id}`}
                        >
                          <Link href={viewUrl} onClick={handleNavClick}>
                            <IconComponent className={`h-4 w-4 ${colorClass}`} />
                            <span className="flex-1">{view.name}</span>
                            {view.show_badge && count > 0 && (
                              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${getBadgeColor(view.icon_color)} px-1.5 text-xs font-medium text-white`}>
                                {count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Overdue Actions Section */}
          {!isSuperAdminAccount && overdueActionsSection.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Overdue Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {overdueActionsSection.map((view) => {
                    const IconComponent = ICON_MAP[view.icon] || AlertTriangle;
                    const colorClass = COLOR_MAP[view.icon_color] || "text-red-500";
                    const count = customViewsCounts?.counts?.[view.id] || 0;
                    const viewUrl = `/custom-view/${view.id}`;
                    
                    return (
                      <SidebarMenuItem key={view.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === viewUrl}
                          data-testid={`link-overdue-actions-${view.id}`}
                        >
                          <Link href={viewUrl} onClick={handleNavClick}>
                            <IconComponent className={`h-4 w-4 ${colorClass}`} />
                            <span className="flex-1">{view.name}</span>
                            {view.show_badge && count > 0 && (
                              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${getBadgeColor(view.icon_color)} px-1.5 text-xs font-medium text-white`}>
                                {count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Achievement Section */}
          {!isSuperAdminAccount && achievementSection.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Achievement</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {achievementSection.map((view) => {
                    const IconComponent = ICON_MAP[view.icon] || Award;
                    const colorClass = COLOR_MAP[view.icon_color] || "text-green-500";
                    const count = customViewsCounts?.counts?.[view.id] || 0;
                    const viewUrl = `/custom-view/${view.id}`;
                    
                    return (
                      <SidebarMenuItem key={view.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === viewUrl}
                          data-testid={`link-achievement-${view.id}`}
                        >
                          <Link href={viewUrl} onClick={handleNavClick}>
                            <IconComponent className={`h-4 w-4 ${colorClass}`} />
                            <span className="flex-1">{view.name}</span>
                            {view.show_badge && count > 0 && (
                              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${getBadgeColor(view.icon_color)} px-1.5 text-xs font-medium text-white`}>
                                {count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

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
                        <Link href={item.url} onClick={handleNavClick}>
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

          {(location === "/" || location === "/dashboard") && !isSuperAdminAccount && (
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
                        {canAddLead && (
                          <Button
                            onClick={actions.onAddLead}
                            className="w-full justify-start"
                            data-testid="button-add-lead"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Lead
                          </Button>
                        )}
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
              onClick={() => setIsChangePasswordOpen(true)}
              data-testid="button-change-password"
              title="Change Password"
            >
              <Key className="h-4 w-4" />
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

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={(open) => {
        setIsChangePasswordOpen(open);
        if (!open) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent data-testid="dialog-change-password">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePasswordOpen(false)}
              data-testid="button-cancel-change-password"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
              data-testid="button-confirm-change-password"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
