import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardProvider, useDashboard } from "@/components/dashboard-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuickFiltersBar } from "@/components/quick-filters-bar";
import { GlobalSearch } from "@/components/global-search";
import { PWAInstallPrompt, useShouldShowInstallPrompt } from "@/components/pwa-install-prompt";
import { registerServiceWorker } from "@/hooks/use-push-notifications";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CustomColumn } from "@shared/schema";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import TeamPerformance from "@/pages/team-performance";
import Admin from "@/pages/admin";
import Webhooks from "@/pages/webhooks";
import OutgoingWebhooks from "@/pages/outgoing-webhooks";
import AuditLogs from "@/pages/audit";
import Attendance from "@/pages/attendance";
import Tasks from "@/pages/tasks";
import SuperAdmin from "@/pages/super-admin";
import Impersonate from "@/pages/impersonate";
import ActivityLogs from "@/pages/activity-logs";
import Leaderboard from "@/pages/leaderboard";
import MyTargets from "@/pages/my-targets";
import WorkingTarget from "@/pages/working-target";
import Features from "@/pages/features";

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
  
  return <ProtectedRoute component={Dashboard} />;
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: () => JSX.Element; adminOnly?: boolean }) {
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
  const { isAuthenticated } = useAuth();
  
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/impersonate" component={Impersonate} />
      <Route path="/features" component={Features} />
      
      {/* Landing page - public, but redirect if authenticated */}
      <Route path="/">
        <AuthenticatedHomeRouter />
      </Route>
      
      {/* Protected routes */}
      <Route path="/onboarding">
        {() => <ProtectedRoute component={Onboarding} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/team-performance">
        {() => <ProtectedRoute component={TeamPerformance} />}
      </Route>
      <Route path="/audit">
        {() => <ProtectedRoute component={AuditLogs} />}
      </Route>
      <Route path="/activity-logs">
        {() => <ProtectedRoute component={ActivityLogs} />}
      </Route>
      <Route path="/webhooks">
        {() => <ProtectedRoute component={Webhooks} />}
      </Route>
      <Route path="/outgoing-webhooks">
        {() => <ProtectedRoute component={OutgoingWebhooks} adminOnly />}
      </Route>
      <Route path="/attendance">
        {() => <ProtectedRoute component={Attendance} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={Tasks} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly />}
      </Route>
      <Route path="/leaderboard">
        {() => <ProtectedRoute component={Leaderboard} />}
      </Route>
      <Route path="/my-targets">
        {() => <ProtectedRoute component={MyTargets} />}
      </Route>
      <Route path="/working-target">
        {() => <ProtectedRoute component={WorkingTarget} />}
      </Route>
      <Route path="/super-admin">
        {() => <ProtectedRoute component={SuperAdmin} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardHeader() {
  const [location] = useLocation();
  const { selectedSheetId, activeQuickFilter, quickFilterHandlers } = useDashboard();
  const isMobile = useIsMobile();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Only show quick filters on dashboard/root routes when sheet is selected
  const showQuickFilters = (location === "/" || location === "/dashboard") && !!selectedSheetId;
  
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
  const shouldShowInstall = useShouldShowInstallPrompt();
  
  useEffect(() => {
    registerServiceWorker();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Router />;
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
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </div>
        {shouldShowInstall && <PWAInstallPrompt forceMobile />}
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
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
