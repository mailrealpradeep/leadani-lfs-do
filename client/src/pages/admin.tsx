import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Building2, Users, LayoutGrid, TrendingUp, Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Company, GlobalReportSummary, InsertCompany, InsertUser } from "@shared/schema";
import { insertCompanySchema, insertUserSchema } from "@shared/schema";
import { CompanyColumnManager } from "@/components/company-column-manager";
import { QuickFilterManager } from "@/components/quick-filter-manager";

function SuperAdminView() {
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: globalReport, isLoading } = useQuery<GlobalReportSummary>({
    queryKey: ["/api/reports/global"],
  });

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return await apiRequest<Company>("POST", "/api/admin/companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/global"] });
      setCreateOpen(false);
      form.reset();
      toast({
        title: "Company created",
        description: "New company has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Super Admin Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage companies and system-wide settings
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-company">
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Add a new company to the system. Company admins can be assigned later.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (URL-friendly identifier)</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-corp" {...field} data-testid="input-company-slug" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-company">
                      {createMutation.isPending ? "Creating..." : "Create Company"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-companies">
                  {globalReport?.total_companies || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-users">
                  {globalReport?.total_users || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-sheets">
                  {globalReport?.total_sheets || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active workspaces
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-leads">
                  {globalReport?.total_leads || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all sheets
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Companies</CardTitle>
              <CardDescription>Companies in the system with their statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalReport?.companies?.map((company) => (
                  <div
                    key={company.company_id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
                    data-testid={`company-${company.company_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{company.company_name}</div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{company.user_count} users</span>
                        <span>{company.sheet_count} sheets</span>
                        <span>{company.lead_count} leads</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!globalReport?.companies || globalReport.companies.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No companies found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CompanyAdminView() {
  const { company } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema.omit({ company_id: true })),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest<User>("POST", "/api/admin/company/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/users"] });
      setCreateOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: "New user has been added to your company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Company Admin Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage users in {company?.name}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account for your company.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-user-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} data-testid="input-user-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-user-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-user-role">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="company_admin">Company Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-user">
                      {createMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Users</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "user" : "users"} in your company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                    data-testid={`user-${user.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                    <Badge variant={user.role === "company_admin" ? "default" : "secondary"}>
                      {user.role === "company_admin" ? "Admin" : "User"}
                    </Badge>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <InviteManager />
        <CompanyColumnManager />
        <QuickFilterManager />
        </div>
      </div>
    </div>
  );
}

function InviteManager() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  interface Invite {
    id: string;
    code: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    inviter_name: string | null;
    accepted_by_name: string | null;
    created_at: string;
  }

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ["/api/admin/company/invites"],
  });

  const inviteFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["user", "company_admin"], {
      required_error: "Please select a role",
    }),
  });

  type InviteFormData = z.infer<typeof inviteFormSchema>;

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "user",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest<Invite>("POST", "/api/admin/company/invites", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/invites"] });
      setCreateOpen(false);
      form.reset();
      
      // Copy invite code to clipboard
      const inviteUrl = `${window.location.origin}/invite/${data.code}`;
      navigator.clipboard.writeText(inviteUrl);
      
      toast({
        title: "Invite created",
        description: `Invite link copied to clipboard: ${inviteUrl}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest("DELETE", `/api/admin/company/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/invites"] });
      toast({
        title: "Invite deleted",
        description: "The invite has been revoked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invite",
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Copied",
      description: "Invite link copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Invitations</CardTitle>
            <CardDescription>
              Invite team members to join your company
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-invite">
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invitation</DialogTitle>
                <DialogDescription>
                  Send an invite to a team member. They'll receive a unique code to join.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="teammate@company.com"
                            {...field}
                            data-testid="input-invite-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-invite-role">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Regular User</SelectItem>
                            <SelectItem value="company_admin">Company Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-invite">
                      {createMutation.isPending ? "Creating..." : "Create Invite"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                data-testid={`invite-${invite.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{invite.email}</span>
                    <Badge
                      variant={invite.status === "accepted" ? "default" : invite.status === "expired" ? "destructive" : "secondary"}
                    >
                      {invite.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Role: {invite.role === "company_admin" ? "Company Admin" : "Regular User"}
                    </div>
                    {invite.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <span>Code: {invite.code}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2"
                          onClick={() => copyInviteLink(invite.code)}
                          data-testid={`button-copy-${invite.id}`}
                        >
                          Copy Link
                        </Button>
                      </div>
                    )}
                    {invite.accepted_by_name && (
                      <div>Accepted by: {invite.accepted_by_name}</div>
                    )}
                  </div>
                </div>
                {invite.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(invite.id)}
                    data-testid={`button-delete-invite-${invite.id}`}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            {invites.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invitations yet. Create one to invite team members.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { isSuperAdmin } = useAuth();

  if (isSuperAdmin) {
    return <SuperAdminView />;
  }

  return <CompanyAdminView />;
}
