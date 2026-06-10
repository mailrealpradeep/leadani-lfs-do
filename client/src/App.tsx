import { Suspense, useEffect, useState, type ComponentType } from "react";
import { Switch, Route, Redirect, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PointsCelebrationContainer } from "@/components/points-celebration";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardProvider, useDashboard } from "@/components/dashboard-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuickFiltersBar } from "@/components/quick-filters-bar";
import { GlobalSearch } from "@/components/global-search";
import { PWAInstallPrompt, useShouldShowInstallPrompt } from "@/components/pwa-install-prompt";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { registerServiceWorker } from "@/hooks/use-push-notifications";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBackButtonGuard, BackButtonGuardDialog } from "@/hooks/use-back-button-guard";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";
import type { CustomColumn, Sheet } from "@shared/schema";
import { PageLoader } from "@/components/page-loader";
import { LazyRouteErrorBoundary } from "@/components/lazy-route-error-boundary";
import {
  LazyActivityLogs,
  LazyAdmin,
  LazyAttendance,
  LazyAuditLogs,
  LazyCallSchedule,
  LazyConversionSettings,
  LazyCustomViewPage,
  LazyDashboard,
  LazyFeatures,
  LazyFollowupTransactions,
  LazyGuide,
  LazyHelp,
  LazyHotLeads,
  LazyIncomingMessages,
  LazyInstaSupportPage,
  LazyLeaderboard,
  LazyMyTargets,
  LazyNoticePage,
  LazyOnboarding,
  LazyOutgoingWebhooks,
  LazyPlan,
  LazyPowerFlow,
  LazyPowerScore,
  LazyPowerScoreTransactions,
  LazyRadar,
  LazyReports,
  LazySailaAI,
  LazySuperAdmin,
  LazyTasks,
  LazyTeamPerformance,
  LazyVisionBoard,
  LazyVisited,
  LazyVisits,
  LazyWatchlist,
  LazyWebhooks,
  LazyWorkReportView,
  LazyWorkingTarget,
  prefetchVisionBoardPage,
} from "@/lib/lazy-pages";
// Keep auth-critical and lightweight entry routes eager for instant first paint.
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import Impersonate from "@/pages/impersonate";

function AuthenticatedHomeRouter() {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Landing />;
  }
  
  if (isSuperAdmin) {
    return <Redirect to="/super-admin" />;
  }
  
  // Vision Board is the default home screen for all users
  return <Redirect to="/vision-board" />;
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, isSuperAdmin, isCompanyAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isSuperAdmin && !isCompanyAdmin) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <LazyRouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* Public routes — login/signup/impersonate stay eager */}
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/impersonate" component={Impersonate} />
          <Route path="/features" component={LazyFeatures} />
          <Route path="/help" component={LazyHelp} />
          <Route path="/guide" component={LazyGuide} />
          <Route path="/plan" component={LazyPlan} />

          {/* Landing page - public, but redirect if authenticated */}
          <Route path="/">
            <AuthenticatedHomeRouter />
          </Route>

          {/* Protected routes — loaded on demand */}
          <Route path="/onboarding">
            {() => <ProtectedRoute component={LazyOnboarding} />}
          </Route>
          <Route path="/dashboard">
            {() => <ProtectedRoute component={LazyDashboard} />}
          </Route>
          <Route path="/reports">
            {() => <ProtectedRoute component={LazyReports} />}
          </Route>
          <Route path="/team-performance">
            {() => <ProtectedRoute component={LazyTeamPerformance} />}
          </Route>
          <Route path="/audit">
            {() => <ProtectedRoute component={LazyAuditLogs} />}
          </Route>
          <Route path="/activity-logs">
            {() => <ProtectedRoute component={LazyActivityLogs} />}
          </Route>
          <Route path="/visits">
            {() => <ProtectedRoute component={LazyVisits} />}
          </Route>
          <Route path="/visited">
            {() => <ProtectedRoute component={LazyVisited} />}
          </Route>
          <Route path="/hot-leads">
            {() => <ProtectedRoute component={LazyHotLeads} />}
          </Route>
          <Route path="/watchlist">
            {() => <ProtectedRoute component={LazyWatchlist} />}
          </Route>
          <Route path="/powerscore">
            {() => <ProtectedRoute component={LazyPowerScore} />}
          </Route>
          <Route path="/powerscore/transactions">
            {() => <ProtectedRoute component={LazyPowerScoreTransactions} adminOnly />}
          </Route>
          <Route path="/followup-transactions">
            {() => <ProtectedRoute component={LazyFollowupTransactions} adminOnly />}
          </Route>
          <Route path="/powerflow">
            {() => <ProtectedRoute component={LazyPowerFlow} />}
          </Route>
          <Route path="/vision-board">
            {() => <ProtectedRoute component={LazyVisionBoard} />}
          </Route>
          <Route path="/conversion-settings">
            {() => <ProtectedRoute component={LazyConversionSettings} adminOnly />}
          </Route>
          <Route path="/radar">
            {() => <ProtectedRoute component={LazyRadar} />}
          </Route>
          <Route path="/call-schedule">
            {() => <ProtectedRoute component={LazyCallSchedule} />}
          </Route>
          <Route path="/incoming-messages">
            {() => <ProtectedRoute component={LazyIncomingMessages} adminOnly />}
          </Route>
          <Route path="/work-report-view">
            {() => <ProtectedRoute component={LazyWorkReportView} />}
          </Route>
          <Route path="/notice">
            {() => <ProtectedRoute component={LazyNoticePage} />}
          </Route>
          <Route path="/saila">
            {() => <ProtectedRoute component={LazySailaAI} adminOnly />}
          </Route>
          <Route path="/custom-view/:viewId">
            {() => <ProtectedRoute component={LazyCustomViewPage} />}
          </Route>
          <Route path="/webhooks">
            {() => <ProtectedRoute component={LazyWebhooks} />}
          </Route>
          <Route path="/outgoing-webhooks">
            {() => <ProtectedRoute component={LazyOutgoingWebhooks} adminOnly />}
          </Route>
          <Route path="/insta-support">
            {() => <ProtectedRoute component={LazyInstaSupportPage} />}
          </Route>
          <Route path="/attendance">
            {() => <ProtectedRoute component={LazyAttendance} />}
          </Route>
          <Route path="/tasks">
            {() => <ProtectedRoute component={LazyTasks} />}
          </Route>
          <Route path="/admin">
            {() => <ProtectedRoute component={LazyAdmin} adminOnly />}
          </Route>
          <Route path="/leaderboard">
            {() => <ProtectedRoute component={LazyLeaderboard} />}
          </Route>
          <Route path="/my-targets">
            {() => <ProtectedRoute component={LazyMyTargets} />}
          </Route>
          <Route path="/working-target">
            {() => <ProtectedRoute component={LazyWorkingTarget} />}
          </Route>
          <Route path="/super-admin">
            {() => <ProtectedRoute component={LazySuperAdmin} />}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </LazyRouteErrorBoundary>
  );
}

function DashboardHeader() {
  const [location] = useLocation();
  const { selectedSheetId, activeQuickFilter, quickFilterHandlers, actions } = useDashboard();
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Only show quick filters on dashboard/root routes when sheet is selected
  const showQuickFilters = (location === "/" || location === "/dashboard") && !!selectedSheetId;
  
  // Fetch company settings to check allow_user_add_lead
  const { data: companySettings } = useQuery<{ settings: { allow_user_add_lead?: boolean } }>({
    queryKey: ["/api/company/settings"],
  });
  
  // Fetch sheets to determine if user is multi-sheet
  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
  });
  
  const isMultiSheetUser = sheets.length > 1;
  const allowUserAddLead = companySettings?.settings?.allow_user_add_lead !== false; // Default true
  
  // Show Add Lead button when:
  // - A sheet is selected AND action is available
  // - AND (user is admin/multi-sheet OR setting allows regular users)
  const canAddLead = isCompanyAdmin || isSuperAdmin || isMultiSheetUser || allowUserAddLead;
  const showAddLead = !!selectedSheetId && !!actions.onAddLead && canAddLead;
  
  const { data: customColumns = [] } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    enabled: showQuickFilters,
  });

  return (
    <header 
      className="flex items-center gap-3 px-3 sm:px-4 py-2 border-b transition-all duration-300 shrink-0"
      data-app-header
    >
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      
      {/* Vision Board - Prominent home icon, always visible */}
      <Link href="/vision-board">
        <Button
          size="icon"
          variant={location === "/vision-board" ? "default" : "ghost"}
          className="relative"
          data-testid="button-vision-board-header"
          aria-label="Vision Board"
        >
          <span className="text-base leading-none">🎯</span>
          {location !== "/vision-board" && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </Button>
      </Link>
      
      {/* Global Search - collapses to icon, expands on click and hides quick filters */}
      <GlobalSearch onExpandedChange={setIsSearchExpanded} />
      
      {/* Quick Filters - hidden when search is expanded to keep header single-line */}
      {!isSearchExpanded && showQuickFilters && quickFilterHandlers.onApplyFilter && quickFilterHandlers.onClearAllFilters && (
        <>
          <div className="hidden md:block h-6 w-px bg-border mx-1" />
          <div className="flex-1 min-w-0">
            <QuickFiltersBar
              customColumns={customColumns as CustomColumn[]}
              activeQuickFilter={activeQuickFilter}
              onApplyFilter={quickFilterHandlers.onApplyFilter}
              onClearFilters={quickFilterHandlers.onClearAllFilters}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
      
      {/* Watchlist Button - hidden on mobile (uses bottom tab bar instead) */}
      <Link href="/watchlist" className="hidden md:block">
        <Button
          size="icon"
          variant={location === "/watchlist" ? "default" : "ghost"}
          data-testid="button-watchlist-header"
          aria-label="Watchlist"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
      
      {/* Add Lead Button - shown when sheet is selected */}
      {showAddLead && (
        <Button
          size="icon"
          variant="default"
          onClick={actions.onAddLead}
          data-testid="button-add-lead-header"
          aria-label="Add Lead"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
      
      <ThemeToggle />
    </header>
  );
}

function ImpersonationBanner() {
  const { logout, isImpersonating } = useAuth();
  const impersonatedUserName = localStorage.getItem("impersonated_user_name");
  const impersonatedUserEmail = localStorage.getItem("impersonated_user_email");
  
  if (!isImpersonating) return null;
  
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-2 text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <span>Viewing as:</span>
        <span className="font-bold">{impersonatedUserName || "User"}</span>
        {impersonatedUserEmail && (
          <span className="opacity-75">({impersonatedUserEmail})</span>
        )}
      </div>
      <button
        onClick={logout}
        className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
        data-testid="button-exit-impersonation"
      >
        Exit & Return to Login
      </button>
    </div>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const shouldShowInstall = useShouldShowInstallPrompt();
  const { showExitDialog, handleConfirmExit, handleCancelExit } = useBackButtonGuard();
  
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Warm the default home route chunk while auth resolves or after login.
  useEffect(() => {
    if (isAuthenticated) {
      prefetchVisionBoardPage();
    }
  }, [isAuthenticated]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Public pages that should render without sidebar, even when logged in
  const publicOnlyPages = ['/help', '/features', '/pricing', '/guide', '/plan'];
  const isPublicOnlyPage = publicOnlyPages.some(p => location.startsWith(p));
  
  // Super Admin has its own independent layout with its own sidebar
  const isSuperAdminPage = location.startsWith('/super-admin');
  
  if (!isAuthenticated || isPublicOnlyPage || isSuperAdminPage) {
    return (
      <>
        <Router />
        <BackButtonGuardDialog
          open={showExitDialog}
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
        />
      </>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <DashboardProvider>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex flex-col h-screen w-full">
          <ImpersonationBanner />
          <div className="flex flex-1 min-h-0">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <DashboardHeader />
              <main className="flex-1 overflow-hidden pb-14 md:pb-0">
                <Router />
              </main>
            </div>
          </div>
        </div>
        <BottomTabBar />
        {shouldShowInstall && <PWAInstallPrompt forceMobile />}
        <BackButtonGuardDialog
          open={showExitDialog}
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
        />
      </SidebarProvider>
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppLayout />
            <Toaster />
            <PointsCelebrationContainer />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
