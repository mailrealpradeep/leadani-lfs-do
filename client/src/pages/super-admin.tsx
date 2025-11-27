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
  Activity,
  Search,
  UserCheck,
  UserX,
  LogIn,
  RefreshCw,
  Webhook,
  ChevronLeft,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Redirect, Link, useLocation } from "wouter";

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

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  company_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

interface WebhookLogEntry {
  id: string;
  company_id: string;
  company_name: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const SUPER_ADMIN_EMAIL = "adminleadani@leadani.com";

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithCompany | null>(null);
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return <Redirect to="/" />;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/stats"],
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<CompanyWithStats[]>({
    queryKey: ["/api/super-admin/companies"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithCompany[]>({
    queryKey: ["/api/super-admin/users"],
  });

  const { data: activityLogs = [], isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/super-admin/activity"],
  });

  const { data: webhookLogs = [], isLoading: webhooksLoading } = useQuery<WebhookLogEntry[]>({
    queryKey: ["/api/super-admin/webhook-logs"],
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCompany = companyFilter === "all" || u.company_id === companyFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && u.is_active) ||
      (statusFilter === "inactive" && !u.is_active);
    
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, icon: Icon, description, trend }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: "up" | "down" | "neutral";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 space-y-6 flex flex-col flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-super-admin-title">Super Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage all companies and users</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users, companies..."
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <Activity className="h-4 w-4 mr-2 hidden sm:block" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="companies" data-testid="tab-companies">
              <Building2 className="h-4 w-4 mr-2 hidden sm:block" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2 hidden sm:block" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Clock className="h-4 w-4 mr-2 hidden sm:block" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="webhooks" data-testid="tab-webhooks">
              <Webhook className="h-4 w-4 mr-2 hidden sm:block" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="flex-1 mt-4">
            {statsLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Companies"
                    value={stats?.totalCompanies || 0}
                    icon={Building2}
                  />
                  <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    description={`${stats?.activeUsers || 0} active`}
                  />
                  <StatCard
                    title="Total Leads"
                    value={stats?.totalLeads || 0}
                    icon={FileSpreadsheet}
                  />
                  <StatCard
                    title="Total Tasks"
                    value={stats?.totalTasks || 0}
                    icon={Activity}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Sheets"
                    value={stats?.totalSheets || 0}
                    icon={FileSpreadsheet}
                  />
                  <StatCard
                    title="Recent Signups"
                    value={stats?.recentSignups || 0}
                    icon={UserCheck}
                    description="Last 7 days"
                    trend="up"
                  />
                  <StatCard
                    title="Webhook Errors"
                    value={stats?.webhookErrors || 0}
                    icon={AlertCircle}
                    description="Last 24 hours"
                  />
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Status</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">Healthy</div>
                      <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions across the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {activityLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : activityLogs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No recent activity
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activityLogs.slice(0, 10).map((log) => (
                            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                              <Activity className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  <span className="font-medium">{log.user_name}</span>
                                  <span className="text-muted-foreground"> {log.action} </span>
                                  <span className="font-medium">{log.entity_type}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.company_name && <span>{log.company_name} • </span>}
                                  {format(parseISO(log.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="companies" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Companies</CardTitle>
                <CardDescription>Manage all registered companies</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {companiesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Users</TableHead>
                          <TableHead className="text-center">Leads</TableHead>
                          <TableHead className="text-center">Sheets</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>
                              <Badge variant={company.is_active ? "default" : "secondary"}>
                                {company.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{company.userCount}</TableCell>
                            <TableCell className="text-center">{company.leadCount}</TableCell>
                            <TableCell className="text-center">{company.sheetCount}</TableCell>
                            <TableCell>
                              {format(parseISO(company.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
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
                                {company.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Enable
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No companies found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Manage all users across companies</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-company-filter">
                        <Building2 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {usersLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.company_name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {u.role === "super_admin" ? "Super Admin" : 
                                 u.role === "company_admin" ? "Admin" : "User"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? "default" : "secondary"}>
                                {u.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(parseISO(u.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsToggleStatusDialogOpen(true);
                                  }}
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
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setIsImpersonateDialogOpen(true);
                                    }}
                                    data-testid={`button-impersonate-${u.id}`}
                                  >
                                    <LogIn className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent platform activity across all companies</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {activityLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.user_name}</p>
                                <p className="text-xs text-muted-foreground">{log.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.entity_type}</TableCell>
                            <TableCell>{log.company_name || "-"}</TableCell>
                            <TableCell>
                              {format(parseISO(log.created_at), "MMM d, h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                        {activityLogs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No activity logs found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Webhook Logs</CardTitle>
                <CardDescription>Monitor webhook activity and troubleshoot issues</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {webhooksLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {webhookLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.company_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{log.endpoint}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.method}</Badge>
                            </TableCell>
                            <TableCell>{log.status_code || "-"}</TableCell>
                            <TableCell>
                              {log.success ? (
                                <Badge className="bg-green-500/10 text-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(parseISO(log.created_at), "MMM d, h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                        {webhookLogs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No webhook logs found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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

      <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login as User</DialogTitle>
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
