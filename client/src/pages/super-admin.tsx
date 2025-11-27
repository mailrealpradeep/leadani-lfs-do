import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  Shield,
  Building2,
  Users,
  FileSpreadsheet,
  Search,
  UserCheck,
  UserX,
  LogIn,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Redirect, useLocation } from "wouter";

interface SuperAdminStats {
  totalCompanies: number;
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
  totalTasks: number;
  totalSheets: number;
  recentSignups: number;
  webhookErrors: number;
}

interface CompanyWithStats {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  userCount: number;
  leadCount: number;
  sheetCount: number;
}

interface UserWithCompany {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
}

const SUPER_ADMIN_EMAIL = "adminleadani@leadani.com";

export default function SuperAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserWithCompany | null>(null);
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  // Reset expanded companies when search query changes to avoid stale view state
  useEffect(() => {
    setExpandedCompanies(new Set());
  }, [searchQuery]);

  // Check if user is authorized - must be done before hooks but after auth check
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // All hooks must be called unconditionally BEFORE any early returns
  const { data: stats, isLoading: statsLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/stats"],
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<CompanyWithStats[]>({
    queryKey: ["/api/super-admin/companies"],
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithCompany[]>({
    queryKey: ["/api/super-admin/users"],
    enabled: isSuperAdmin && !authLoading,
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/status`, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({
        title: "User status updated",
        description: `User has been ${selectedUser?.is_active ? "disabled" : "enabled"} successfully.`,
      });
      setIsToggleStatusDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update user",
        description: error.message,
      });
    },
  });

  const toggleCompanyStatusMutation = useMutation({
    mutationFn: async ({ companyId, isActive }: { companyId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/companies/${companyId}/status`, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({
        title: "Company status updated",
        description: "Company status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update company",
        description: error.message,
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest<{ code: string; user: any }>("POST", `/api/super-admin/impersonate/${userId}`);
    },
    onSuccess: (data) => {
      const impersonateUrl = `${window.location.origin}/impersonate?code=${data.code}`;
      
      const newWindow = window.open(impersonateUrl, "_blank", "noopener,noreferrer");
      
      if (newWindow) {
        toast({
          title: "New window opened",
          description: `Viewing ${selectedUser?.name}'s account in a new window. Your admin session remains active here.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Popup blocked",
          description: "Please allow popups for this site to view user accounts in new windows.",
        });
      }
      
      setIsImpersonateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Impersonation failed",
        description: error.message,
      });
    },
  });

  const toggleCompanyExpanded = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  const getUsersForCompany = (companyId: string) => {
    return users.filter(u => u.company_id === companyId);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleQuickImpersonate = (user: UserWithCompany) => {
    setSelectedUser(user);
    setIsImpersonateDialogOpen(true);
  };

  // Early returns AFTER all hooks are called
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Redirect to="/" />;
  }

  const StatCard = ({ title, value, icon: Icon, description, trend }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: "up" | "down" | "neutral";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const UserRow = ({ u, showCompany = false }: { u: UserWithCompany; showCompany?: boolean }) => (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
      data-testid={`row-user-${u.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
            {u.name?.substring(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{u.name}</p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          {showCompany && u.company_name && (
            <p className="text-xs text-muted-foreground truncate">{u.company_name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div className="hidden sm:flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {u.role === "super_admin" ? "Super Admin" : 
             u.role === "company_admin" ? "Admin" : "User"}
          </Badge>
          <Badge variant={u.is_active ? "default" : "secondary"} className="text-xs">
            {u.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedUser(u);
              setIsToggleStatusDialogOpen(true);
            }}
            title={u.is_active ? "Disable user" : "Enable user"}
            data-testid={`button-toggle-user-${u.id}`}
          >
            {u.is_active ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>
          {u.email !== SUPER_ADMIN_EMAIL && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleQuickImpersonate(u)}
              title="Login as this user for support"
              data-testid={`button-impersonate-${u.id}`}
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              Support
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const CompanyCard = ({ company }: { company: CompanyWithStats }) => {
    const isExpanded = expandedCompanies.has(company.id);
    const companyUsers = getUsersForCompany(company.id);
    
    return (
      <Card className="overflow-visible">
        <button
          type="button"
          onClick={() => toggleCompanyExpanded(company.id)}
          className="w-full text-left p-4 md:p-6 rounded-t-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          data-testid={`card-company-${company.id}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-primary" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base truncate">{company.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Created {format(parseISO(company.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{company.userCount}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span className="font-medium">{company.sheetCount}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <span className="font-medium">{company.leadCount}</span>
                  <span>leads</span>
                </span>
              </div>
              <Badge variant={company.is_active ? "default" : "secondary"} className="flex-shrink-0">
                {company.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </button>
        
        {/* Action buttons - separate from clickable header */}
        <div className="px-4 md:px-6 pb-2 flex items-center gap-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleCompanyStatusMutation.mutate({
              companyId: company.id,
              isActive: !company.is_active
            })}
            disabled={toggleCompanyStatusMutation.isPending}
            data-testid={`button-toggle-company-${company.id}`}
          >
            {company.is_active ? "Disable Company" : "Enable Company"}
          </Button>
          <span className="text-xs text-muted-foreground sm:hidden">
            {company.userCount} users, {company.sheetCount} sheets, {company.leadCount} leads
          </span>
        </div>

        {/* Expandable user list */}
        {isExpanded && (
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Users in {company.name} ({companyUsers.length})
              </h4>
            </div>
            {companyUsers.length > 0 ? (
              <div className="space-y-2">
                {companyUsers.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg">
                No users in this company yet
              </p>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 space-y-6 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-super-admin-title">Super Admin Console</h1>
              <p className="text-sm text-muted-foreground">Manage companies and users across the platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-super-admin-search"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/super-admin"] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {statsLoading ? (
          <div className="flex items-center justify-center h-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Companies"
              value={companies.length}
              icon={Building2}
              description={`${companies.filter(c => c.is_active).length} active`}
            />
            <StatCard
              title="Users"
              value={stats?.totalUsers || 0}
              icon={Users}
              description={`${stats?.activeUsers || 0} active`}
            />
            <StatCard
              title="Sheets"
              value={stats?.totalSheets || 0}
              icon={FileSpreadsheet}
            />
            <StatCard
              title="Leads"
              value={stats?.totalLeads || 0}
              icon={TrendingUp}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            {searchQuery ? (
              /* Search Results View */
              <div className="space-y-6 pr-4">
                {/* Company Results */}
                {filteredCompanies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Companies ({filteredCompanies.length})
                    </h3>
                    <div className="space-y-3">
                      {filteredCompanies.map((company) => (
                        <CompanyCard key={company.id} company={company} />
                      ))}
                    </div>
                  </div>
                )}

                {/* User Results */}
                {filteredUsers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users ({filteredUsers.length})
                    </h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {filteredUsers.map((u) => (
                            <UserRow key={u.id} u={u} showCompany />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {filteredCompanies.length === 0 && filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : (
              /* Default Company List View */
              <div className="space-y-3 pr-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    All Companies ({companies.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click a company to see users inside
                  </p>
                </div>
                {companiesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : companies.length > 0 ? (
                  companies.map((company) => (
                    <CompanyCard key={company.id} company={company} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No companies yet</p>
                      <p className="text-sm">Companies will appear here when they sign up</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Toggle Status Dialog */}
      <AlertDialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? "Disable User?" : "Enable User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_active 
                ? `Are you sure you want to disable ${selectedUser?.name}? They will not be able to log in until re-enabled.`
                : `Are you sure you want to enable ${selectedUser?.name}? They will be able to log in again.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  toggleUserStatusMutation.mutate({
                    userId: selectedUser.id,
                    isActive: !selectedUser.is_active
                  });
                }
              }}
            >
              {selectedUser?.is_active ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate Dialog */}
      <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login as User for Support</DialogTitle>
            <DialogDescription>
              You are about to log in as <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
              This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              A new browser window will open with this user's account. Your admin session will remain active in this window.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImpersonateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  impersonateMutation.mutate(selectedUser.id);
                }
              }}
              disabled={impersonateMutation.isPending}
              data-testid="button-confirm-impersonate"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {impersonateMutation.isPending ? "Opening..." : "Open in New Window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
