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
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CustomColumn } from "@shared/schema";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import Onboarding from "@/pages/onboarding";
import InviteAccept from "@/pages/invite-accept";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Admin from "@/pages/admin";
import Webhooks from "@/pages/webhooks";
import AuditLogs from "@/pages/audit";

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
      <Route path="/invite/:code" component={InviteAccept} />
      
      {/* Landing page - public, but redirect if authenticated */}
      <Route path="/">
        {() => isAuthenticated ? <ProtectedRoute component={Dashboard} /> : <Landing />}
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
      <Route path="/audit">
        {() => <ProtectedRoute component={AuditLogs} />}
      </Route>
      <Route path="/webhooks">
        {() => <ProtectedRoute component={Webhooks} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardHeader() {
  const [location] = useLocation();
  const { selectedSheetId, activeQuickFilter, quickFilterHandlers } = useDashboard();
  const isMobile = useIsMobile();
  
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
      
      {showQuickFilters && quickFilterHandlers.onApplyFilter && quickFilterHandlers.onClearAllFilters && (
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

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  
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
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-hidden">
              <Router />
            </main>
          </div>
        </div>
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
