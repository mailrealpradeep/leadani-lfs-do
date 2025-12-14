import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { format, parseISO } from "date-fns";
import {
  Shield,
  Building2,
  Users,
  FileSpreadsheet,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  TrendingUp,
  Trash2,
  Key,
  Copy,
  Check,
  Mail,
  LogIn,
  Code,
  Lightbulb,
  History,
  LayoutDashboard,
  Database,
  Plus,
  Lock,
  GripVertical,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Redirect } from "wouter";
import { ApiDocumentation } from "@/components/api-documentation";
import { FutureImprovements } from "@/components/future-improvements";
import { ApiKeysManager } from "@/components/api-keys-manager";
import { DataRecovery } from "@/components/data-recovery";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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

interface SystemValueDefinition {
  id: string;
  column_type: 'lead_status' | 'visit_status' | 'visit_type' | 'lost_reason';
  value: string;
  display_order: number;
  is_active: boolean;
  deprecated_at: string | null;
  replaced_by: string | null;
  created_at: string;
}

type Section = "dashboard" | "users" | "companies" | "recovery" | "api-docs" | "api-keys" | "system-values" | "future";

const SUPER_ADMIN_EMAIL = "adminleadani@leadani.com";

const menuItems = [
  { id: "dashboard" as Section, title: "Dashboard", icon: LayoutDashboard },
  { id: "users" as Section, title: "Users", icon: Users },
  { id: "companies" as Section, title: "Companies", icon: Building2 },
  { id: "system-values" as Section, title: "System Values", icon: Database },
  { id: "recovery" as Section, title: "Recovery", icon: History },
  { id: "api-docs" as Section, title: "API Docs", icon: Code },
  { id: "api-keys" as Section, title: "API Keys", icon: Key },
  { id: "future" as Section, title: "Future", icon: Lightbulb },
];

function SuperAdminSidebar({ activeSection, setActiveSection }: { 
  activeSection: Section; 
  setActiveSection: (section: Section) => void;
}) {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          <span className="font-semibold group-data-[collapsible=icon]:hidden">Super Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => setActiveSection(item.id)}
                    tooltip={item.title}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function SuperAdminContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithCompany | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isCompanySuspendDialogOpen, setIsCompanySuspendDialogOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

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
        description: `User has been ${selectedUser?.is_active ? "suspended" : "activated"} successfully.`,
      });
      setIsSuspendDialogOpen(false);
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/super-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({
        title: "User deleted",
        description: "User has been permanently deleted.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: error.message,
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest<{ temporaryPassword: string }>("POST", `/api/super-admin/users/${userId}/reset-password`);
    },
    onSuccess: (data) => {
      setNewPassword(data.temporaryPassword);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({
        title: "Password reset",
        description: "A new temporary password has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
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
        description: `Company has been ${selectedCompany?.is_active ? "suspended" : "activated"} successfully.`,
      });
      setIsCompanySuspendDialogOpen(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update company",
        description: error.message,
      });
    },
  });

  const handleLoginAsUser = async (targetUser: UserWithCompany) => {
    try {
      setIsImpersonating(true);
      const codeResponse = await apiRequest<{ code: string; user: any }>(
        "POST",
        `/api/super-admin/impersonate/${targetUser.id}`
      );
      const tokenResponse = await apiRequest<{ token: string; user: any; company: any }>(
        "POST",
        "/api/impersonate/redeem",
        { code: codeResponse.code }
      );
      localStorage.removeItem("auth_token");
      localStorage.removeItem("impersonating");
      localStorage.removeItem("impersonated_user_name");
      localStorage.removeItem("impersonated_user_email");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("impersonating");
      sessionStorage.removeItem("impersonated_user_name");
      sessionStorage.removeItem("impersonated_user_email");
      queryClient.clear();
      localStorage.setItem("auth_token", tokenResponse.token);
      localStorage.setItem("impersonating", "true");
      localStorage.setItem("impersonated_user_name", targetUser.name);
      localStorage.setItem("impersonated_user_email", targetUser.email);
      sessionStorage.setItem("impersonating", "true");
      sessionStorage.setItem("impersonated_user_name", targetUser.name);
      sessionStorage.setItem("impersonated_user_email", targetUser.email);
      window.location.href = "/";
    } catch (error: any) {
      setIsImpersonating(false);
      toast({
        variant: "destructive",
        title: "Failed to login as user",
        description: error.message || "Could not impersonate user",
      });
    }
  };

  const copyToClipboard = (text: string, type: "email" | "password") => {
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
    toast({
      title: "Copied",
      description: `${type === "email" ? "Email" : "Password"} copied to clipboard.`,
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = 
      userTypeFilter === "all" || 
      (userTypeFilter === "admin" && u.role === "company_admin") ||
      (userTypeFilter === "user" && u.role === "user");
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && u.is_active) ||
      (statusFilter === "suspended" && !u.is_active);
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const StatCard = ({ title, value, icon: Icon, description }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderDashboard = () => (
    <div className="space-y-4">
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
    </div>
  );

  const renderUsers = () => (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-user-type">
            <SelectValue placeholder="User Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="font-medium">{u.company_name || "-"}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "company_admin" ? "default" : "secondary"}>
                        {u.role === "super_admin" ? "Super Admin" : u.role === "company_admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword("");
                          setIsResetPasswordDialogOpen(true);
                        }}
                        disabled={u.email === SUPER_ADMIN_EMAIL}
                        data-testid={`button-reset-password-${u.id}`}
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "destructive"}>
                        {u.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.email !== SUPER_ADMIN_EMAIL && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleLoginAsUser(u)}
                              disabled={isImpersonating || !u.is_active}
                              data-testid={`button-login-as-${u.id}`}
                            >
                              <LogIn className="h-3 w-3 mr-1" />
                              {isImpersonating ? "Logging in..." : "Login As"}
                            </Button>
                            <Button
                              variant={u.is_active ? "outline" : "default"}
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsSuspendDialogOpen(true);
                              }}
                              data-testid={`button-suspend-${u.id}`}
                            >
                              {u.is_active ? (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDeleteDialogOpen(true);
                              }}
                              data-testid={`button-delete-${u.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );

  const renderCompanies = () => (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-companies"
          />
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Sheets</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companiesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((c) => (
                  <TableRow key={c.id} data-testid={`row-company-${c.id}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.userCount}</TableCell>
                    <TableCell>{c.sheetCount}</TableCell>
                    <TableCell>{c.leadCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(c.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "destructive"}>
                        {c.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={c.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(c);
                          setIsCompanySuspendDialogOpen(true);
                        }}
                        data-testid={`button-company-suspend-${c.id}`}
                      >
                        {c.is_active ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );

  // System Values state
  const [selectedColumnType, setSelectedColumnType] = useState<string>("lead_status");
  const [newValueInput, setNewValueInput] = useState("");
  const [isAddingValue, setIsAddingValue] = useState(false);
  const [syncTargetCompanyId, setSyncTargetCompanyId] = useState<string>("");
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data: systemValues = [], isLoading: systemValuesLoading, refetch: refetchSystemValues } = useQuery<SystemValueDefinition[]>({
    queryKey: ["/api/admin/system-values"],
    enabled: isSuperAdmin && activeSection === "system-values",
  });

  const { data: allCompaniesForSync = [] } = useQuery<{id: string, name: string}[]>({
    queryKey: ["/api/admin/companies"],
    enabled: isSuperAdmin && activeSection === "system-values",
  });

  const createSystemValueMutation = useMutation({
    mutationFn: async (data: { column_type: string; value: string }) => {
      return await apiRequest("POST", "/api/admin/system-values", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-values"] });
      setNewValueInput("");
      setIsAddingValue(false);
      toast({ title: "Success", description: "System value created" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deprecateSystemValueMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/system-values/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-values"] });
      toast({ title: "Value deprecated", description: "System value has been deprecated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const restoreSystemValueMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/admin/system-values/${id}`, { is_active: true, deprecated_at: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-values"] });
      toast({ title: "Value restored", description: "System value has been restored" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const syncAllCompaniesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/system-columns/sync-execute", { confirm: true });
    },
    onSuccess: (data: any) => {
      toast({ title: "Sync completed", description: data.message || "System values synced to all companies" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Sync failed", description: error.message });
    },
  });

  const syncCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return await apiRequest("POST", `/api/admin/system-columns/sync-company/${companyId}`);
    },
    onSuccess: (data: any) => {
      toast({ title: "Sync completed", description: data.message || "System values synced to company" });
      setSyncTargetCompanyId("");
      setShowSyncPreview(false);
      setSyncPreviewData(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Sync failed", description: error.message });
    },
  });

  const forceSyncCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return await apiRequest("POST", `/api/admin/system-columns/sync-company/${companyId}?force=true`);
    },
    onSuccess: (data: any) => {
      toast({ title: "Force sync completed", description: "System values and lock icons refreshed for all columns" });
      setSyncTargetCompanyId("");
      setShowSyncPreview(false);
      setSyncPreviewData(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Force sync failed", description: error.message });
    },
  });

  const handlePreviewSync = async () => {
    if (!syncTargetCompanyId) return;
    setIsLoadingPreview(true);
    try {
      const data = await apiRequest("GET", `/api/admin/system-columns/sync-preview/${syncTargetCompanyId}`);
      setSyncPreviewData(data);
      setShowSyncPreview(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Preview failed", description: error.message });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const columnTypeLabels: Record<string, string> = {
    lead_status: "Lead Status",
    visit_status: "Visit Status",
    visit_type: "Visit Type",
    lost_reason: "Lost Reason",
  };

  const filteredSystemValues = systemValues
    .filter(v => v.column_type === selectedColumnType)
    .sort((a, b) => a.display_order - b.display_order);

  const renderSystemValues = () => (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedColumnType} onValueChange={setSelectedColumnType}>
          <SelectTrigger className="w-[200px]" data-testid="select-column-type">
            <SelectValue placeholder="Select column type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead_status">Lead Status</SelectItem>
            <SelectItem value="visit_status">Visit Status</SelectItem>
            <SelectItem value="visit_type">Visit Type</SelectItem>
            <SelectItem value="lost_reason">Lost Reason</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => setIsAddingValue(true)}
          disabled={isAddingValue}
          data-testid="button-add-value"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Value
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetchSystemValues()}
          data-testid="button-refresh-values"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isAddingValue && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Enter new value..."
              value={newValueInput}
              onChange={(e) => setNewValueInput(e.target.value)}
              className="flex-1"
              data-testid="input-new-value"
            />
            <Button
              onClick={() => {
                if (newValueInput.trim()) {
                  createSystemValueMutation.mutate({
                    column_type: selectedColumnType,
                    value: newValueInput.trim(),
                  });
                }
              }}
              disabled={!newValueInput.trim() || createSystemValueMutation.isPending}
              data-testid="button-save-value"
            >
              {createSystemValueMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingValue(false);
                setNewValueInput("");
              }}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncAllCompaniesMutation.mutate()}
              disabled={syncAllCompaniesMutation.isPending}
              data-testid="button-sync-all-companies"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncAllCompaniesMutation.isPending ? 'animate-spin' : ''}`} />
              {syncAllCompaniesMutation.isPending ? "Syncing..." : "Sync to All Companies"}
            </Button>
          </div>
          <div className="h-px sm:h-auto sm:w-px bg-border" />
          <div className="flex items-center gap-2 flex-1">
            <Select value={syncTargetCompanyId} onValueChange={setSyncTargetCompanyId}>
              <SelectTrigger className="w-[200px]" data-testid="select-sync-company">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {allCompaniesForSync.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handlePreviewSync}
              disabled={!syncTargetCompanyId || isLoadingPreview}
              data-testid="button-sync-selected-company"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingPreview ? 'animate-spin' : ''}`} />
              {isLoadingPreview ? "Loading..." : "Preview & Sync"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {columnTypeLabels[selectedColumnType] || selectedColumnType} Values
            <Badge variant="secondary" className="ml-auto">
              {filteredSystemValues.length} values
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            {systemValuesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSystemValues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No system values defined for {columnTypeLabels[selectedColumnType]}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSystemValues.map((v, idx) => (
                    <TableRow key={v.id} className={v.deprecated_at ? "opacity-50" : ""} data-testid={`row-value-${v.id}`}>
                      <TableCell className="text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="font-medium">{v.value}</TableCell>
                      <TableCell>
                        {v.deprecated_at ? (
                          <Badge variant="destructive">Deprecated</Badge>
                        ) : v.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(v.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.deprecated_at ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreSystemValueMutation.mutate(v.id)}
                            disabled={restoreSystemValueMutation.isPending}
                            data-testid={`button-restore-${v.id}`}
                          >
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deprecateSystemValueMutation.mutate(v.id)}
                            disabled={deprecateSystemValueMutation.isPending}
                            data-testid={`button-deprecate-${v.id}`}
                          >
                            Deprecate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return renderUsers();
      case "companies":
        return renderCompanies();
      case "recovery":
        return (
          <div className="h-full">
            <DataRecovery />
          </div>
        );
      case "api-docs":
        return (
          <ScrollArea className="h-full">
            <ApiDocumentation />
          </ScrollArea>
        );
      case "api-keys":
        return (
          <div className="h-full">
            <ApiKeysManager />
          </div>
        );
      case "system-values":
        return renderSystemValues();
      case "future":
        return <FutureImprovements />;
      default:
        return renderDashboard();
    }
  };

  // Get current section info for header
  const currentSection = menuItems.find(item => item.id === activeSection) || menuItems[0];
  const sectionDescriptions: Record<Section, string> = {
    dashboard: "System overview and statistics",
    users: "Manage all system users",
    companies: "Manage all registered companies",
    "system-values": "Manage system-wide column values",
    recovery: "Restore data from point-in-time snapshots",
    "api-docs": "Reference for API integration",
    "api-keys": "Manage API access credentials",
    future: "Planned improvements and features",
  };

  return (
    <div className="flex h-screen w-full">
      <SuperAdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2 border-b shrink-0">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div className="h-5 w-px bg-border" />
          <currentSection.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold leading-none" data-testid={`text-${activeSection}-title`}>
              {currentSection.title}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{sectionDescriptions[activeSection]}</p>
          </div>
          {activeSection === "dashboard" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/super-admin"] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <ThemeToggle />
        </header>
        
        <div className="flex-1 p-4 overflow-auto">
          {renderContent()}
        </div>
      </main>

      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? "Suspend User?" : "Activate User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_active 
                ? `Are you sure you want to suspend ${selectedUser?.name}? They will not be able to log in.`
                : `Are you sure you want to activate ${selectedUser?.name}? They will be able to log in again.`
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
              data-testid="button-confirm-suspend"
            >
              {selectedUser?.is_active ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{selectedUser?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  deleteUserMutation.mutate(selectedUser.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => {
        setIsResetPasswordDialogOpen(open);
        if (!open) {
          setNewPassword("");
          setCopiedEmail(false);
          setCopiedPassword(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Credentials</DialogTitle>
            <DialogDescription>
              Get login credentials for <strong>{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 font-mono text-sm">{selectedUser?.email}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(selectedUser?.email || "", "email")}
                  data-testid="button-copy-email"
                >
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                Password
              </label>
              {newPassword ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 font-mono text-sm">{newPassword}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(newPassword, "password")}
                      data-testid="button-copy-password"
                    >
                      {copiedPassword ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use these credentials to log in. User should change password after login.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border-2 border-dashed">
                    <span className="flex-1 text-sm text-muted-foreground">Click "Generate Password" to create new credentials</span>
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedUser) {
                        resetPasswordMutation.mutate(selectedUser.id);
                      }
                    }}
                    disabled={resetPasswordMutation.isPending}
                    className="w-full"
                    data-testid="button-confirm-reset-password"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {resetPasswordMutation.isPending ? "Generating..." : "Generate Password"}
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              {newPassword ? "Done" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCompanySuspendDialogOpen} onOpenChange={setIsCompanySuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCompany?.is_active ? "Suspend Company?" : "Activate Company?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCompany?.is_active 
                ? `Are you sure you want to suspend ${selectedCompany?.name}? All users in this company will be affected.`
                : `Are you sure you want to activate ${selectedCompany?.name}? All users will regain access.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCompany) {
                  toggleCompanyStatusMutation.mutate({
                    companyId: selectedCompany.id,
                    isActive: !selectedCompany.is_active
                  });
                }
              }}
              data-testid="button-confirm-company-suspend"
            >
              {selectedCompany?.is_active ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSyncPreview} onOpenChange={(open) => { if (!open) { setShowSyncPreview(false); setSyncPreviewData(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Preview: {syncPreviewData?.company?.name}</DialogTitle>
            <DialogDescription>
              Review the changes that will be made when syncing system values.
            </DialogDescription>
          </DialogHeader>
          
          {syncPreviewData && (
            <div className="space-y-4 py-4">
              {!syncPreviewData.summary.has_changes ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">All system columns and values are already synced!</p>
                  {syncPreviewData.summary.total_hidden_system_values > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{syncPreviewData.summary.total_hidden_system_values}</span> system value{syncPreviewData.summary.total_hidden_system_values !== 1 ? 's' : ''} hidden by company
                      </span>
                    </div>
                  )}
                  <p className="text-sm mt-2">If lock icons are not showing, use Force Sync below.</p>
                  <Button 
                    variant="outline"
                    className="mt-4"
                    onClick={() => forceSyncCompanyMutation.mutate(syncTargetCompanyId)}
                    disabled={forceSyncCompanyMutation.isPending}
                    data-testid="button-force-sync"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${forceSyncCompanyMutation.isPending ? 'animate-spin' : ''}`} />
                    {forceSyncCompanyMutation.isPending ? "Force Syncing..." : "Force Sync"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-primary">{syncPreviewData.summary.columns_to_create}</div>
                      <div className="text-xs text-muted-foreground">Columns to Create</div>
                    </Card>
                    {syncPreviewData.summary.columns_to_convert > 0 && (
                      <Card className="p-3 border-destructive">
                        <div className="text-2xl font-bold text-destructive">{syncPreviewData.summary.columns_to_convert}</div>
                        <div className="text-xs text-muted-foreground">Type Conversions</div>
                      </Card>
                    )}
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-blue-500">{syncPreviewData.summary.total_values_to_add}</div>
                      <div className="text-xs text-muted-foreground">Values to Add</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-amber-500">{syncPreviewData.summary.total_values_to_mark_system}</div>
                      <div className="text-xs text-muted-foreground">Values to Mark System</div>
                    </Card>
                    {syncPreviewData.summary.total_hidden_system_values > 0 && (
                      <Card className="p-3">
                        <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                          <EyeOff className="h-5 w-5" />
                          {syncPreviewData.summary.total_hidden_system_values}
                        </div>
                        <div className="text-xs text-muted-foreground">Hidden by Company</div>
                      </Card>
                    )}
                  </div>

                  {syncPreviewData.columns_to_create.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-500" />
                        Columns to Create
                      </h4>
                      <div className="space-y-2">
                        {syncPreviewData.columns_to_create.map((col: any) => (
                          <Card key={col.column_key} className="p-3">
                            <div className="font-medium">{col.name}</div>
                            <div className="text-xs text-muted-foreground mb-1">Column key: {col.column_key}</div>
                            <div className="flex flex-wrap gap-1">
                              {col.values.map((v: string) => (
                                <Badge key={v} variant="secondary">{v}</Badge>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {syncPreviewData.columns_existing.filter((col: any) => col.values_to_add.length > 0 || col.values_to_mark_system.length > 0 || col.will_convert_to_dropdown).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                        Existing Columns to Update
                      </h4>
                      <div className="space-y-2">
                        {syncPreviewData.columns_existing
                          .filter((col: any) => col.values_to_add.length > 0 || col.values_to_mark_system.length > 0 || col.will_convert_to_dropdown)
                          .map((col: any) => (
                            <Card key={col.column_key} className="p-3">
                              <div className="font-medium flex items-center gap-2">
                                {col.name}
                                {col.will_convert_to_dropdown && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Type Change
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Current type: {col.current_type}
                                {col.will_convert_to_dropdown && (
                                  <span className="text-destructive font-medium"> → will be converted to dropdown</span>
                                )}
                              </div>
                              {col.values_to_add.length > 0 && (
                                <div className="mb-1">
                                  <span className="text-xs text-green-600 font-medium">Add: </span>
                                  {col.values_to_add.map((v: string) => (
                                    <Badge key={v} variant="outline" className="mr-1 border-green-500 text-green-600">{v}</Badge>
                                  ))}
                                </div>
                              )}
                              {col.values_to_mark_system.length > 0 && (
                                <div className="mb-1">
                                  <span className="text-xs text-amber-600 font-medium">Mark as system: </span>
                                  {col.values_to_mark_system.map((v: string) => (
                                    <Badge key={v} variant="outline" className="mr-1 border-amber-500 text-amber-600">{v}</Badge>
                                  ))}
                                </div>
                              )}
                              {col.hidden_system_values?.length > 0 && (
                                <div>
                                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1">
                                    <EyeOff className="h-3 w-3" />
                                    Hidden by company:
                                  </span>
                                  {col.hidden_system_values.map((v: string) => (
                                    <Badge key={v} variant="outline" className="mr-1 opacity-60">{v}</Badge>
                                  ))}
                                </div>
                              )}
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSyncPreview(false); setSyncPreviewData(null); }}>
              Cancel
            </Button>
            {syncPreviewData?.summary?.has_changes && (
              <Button 
                onClick={() => syncCompanyMutation.mutate(syncTargetCompanyId)}
                disabled={syncCompanyMutation.isPending}
                data-testid="button-confirm-sync"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncCompanyMutation.isPending ? 'animate-spin' : ''}`} />
                {syncCompanyMutation.isPending ? "Syncing..." : "Apply Changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdmin() {
  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <SuperAdminContent />
    </SidebarProvider>
  );
}
