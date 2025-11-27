import { useState } from "react";
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
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Trash2,
  Key,
  Copy,
  Check,
  Mail,
  LogIn,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";

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
      
      // Step 1: Get impersonation code from backend
      const codeResponse = await apiRequest<{ code: string; user: any }>(
        "POST",
        `/api/super-admin/impersonate/${targetUser.id}`
      );
      
      // Step 2: Redeem the code for a token
      const tokenResponse = await apiRequest<{ token: string; user: any; company: any }>(
        "POST",
        "/api/impersonate/redeem",
        { code: codeResponse.code }
      );
      
      // Step 3: Clear only auth-related storage, preserve other preferences (theme, etc.)
      localStorage.removeItem("auth_token");
      localStorage.removeItem("impersonating");
      localStorage.removeItem("impersonated_user_name");
      localStorage.removeItem("impersonated_user_email");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("impersonating");
      sessionStorage.removeItem("impersonated_user_name");
      sessionStorage.removeItem("impersonated_user_email");
      queryClient.clear();
      
      // Step 4: Store the new token and impersonation flags in BOTH storages for consistency
      localStorage.setItem("auth_token", tokenResponse.token);
      localStorage.setItem("impersonating", "true");
      localStorage.setItem("impersonated_user_name", targetUser.name);
      localStorage.setItem("impersonated_user_email", targetUser.email);
      sessionStorage.setItem("impersonating", "true");
      sessionStorage.setItem("impersonated_user_name", targetUser.name);
      sessionStorage.setItem("impersonated_user_email", targetUser.email);
      
      // Step 5: Hard reload the page - this forces complete fresh start
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

  // Filter users based on search and filters
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

  // Filter companies based on search
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 space-y-6 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-super-admin-title">Super Admin Console</h1>
              <p className="text-sm text-muted-foreground">Manage all companies and users</p>
            </div>
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

        {/* Tabs for Users and Companies */}
        <Tabs defaultValue="users" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="companies" data-testid="tab-companies">
              <Building2 className="h-4 w-4 mr-2" />
              Companies
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

            {/* Users Table */}
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
                          <TableCell className="font-medium">
                            {u.company_name || "-"}
                          </TableCell>
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
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search */}
            <div className="flex gap-3 mb-4">
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

            {/* Companies Table */}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Suspend User Dialog */}
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

      {/* Delete User Dialog */}
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

      {/* Reset Password / Get Credentials Dialog */}
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
            {/* Email - always shown */}
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

            {/* Password - shown after generation */}
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

      {/* Suspend Company Dialog */}
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
    </div>
  );
}
