import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Building2, Users, Target, DollarSign, Image, Calendar, ChevronRight, Loader2 } from "lucide-react";
import type { User, CompanyVisionBoard, UserVisionAdminTarget, AdminActualIncentive, CompanyVisionMonthlyTarget, UserVisionMonthlyTarget } from "@shared/schema";

const CURRENCIES = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'AED', label: 'د.إ AED' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type EffortTargets = {
  sales: number;
  visits: number;
  leads_attended: number;
  followups: number;
};

export function VisionBoardAdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("company");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showIncentiveDialog, setShowIncentiveDialog] = useState(false);
  const [incentiveUserId, setIncentiveUserId] = useState<string>("");

  const { data: companyVision, isLoading: loadingCompany } = useQuery<{
    board: CompanyVisionBoard | null;
    monthly_targets: CompanyVisionMonthlyTarget[];
  }>({
    queryKey: ["/api/admin/vision-board/company", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/vision-board/company?year=${selectedYear}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch company vision');
      return res.json();
    },
  });

  const { data: userTargets, isLoading: loadingUsers } = useQuery<Array<UserVisionAdminTarget & { user_name: string; user_email: string }>>({
    queryKey: ["/api/admin/vision-board/users", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/vision-board/users?year=${selectedYear}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch user targets');
      return res.json();
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/company/users"],
  });

  const { data: incentives, isLoading: loadingIncentives } = useQuery<AdminActualIncentive[]>({
    queryKey: ["/api/admin/vision-board/incentives", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/vision-board/incentives?year=${selectedYear}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch incentives');
      return res.json();
    },
  });

  const saveCompanyVisionMutation = useMutation({
    mutationFn: async (data: Partial<CompanyVisionBoard>) => {
      return await apiRequest("POST", "/api/admin/vision-board/company", {
        year: selectedYear,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/company", selectedYear] });
      toast({ title: "Company Vision saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const autoDistributeCompanyMutation = useMutation({
    mutationFn: async (data: { company_vision_id: string; annual_targets: EffortTargets }) => {
      return await apiRequest("POST", "/api/admin/vision-board/company/auto-distribute", {
        company_vision_id: data.company_vision_id,
        year: selectedYear,
        annual_targets: data.annual_targets,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/company", selectedYear] });
      toast({ title: "Targets distributed to remaining months" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveUserTargetMutation = useMutation({
    mutationFn: async (data: { userId: string } & Partial<UserVisionAdminTarget>) => {
      const { userId, ...rest } = data;
      return await apiRequest("POST", `/api/admin/vision-board/user/${userId}`, {
        year: selectedYear,
        ...rest,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/users", selectedYear] });
      setShowUserDialog(false);
      setEditingUser(null);
      toast({ title: "User target saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserTargetMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/vision-board/user/${userId}?year=${selectedYear}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/users", selectedYear] });
      toast({ title: "User target deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createIncentiveMutation = useMutation({
    mutationFn: async (data: Partial<AdminActualIncentive>) => {
      return await apiRequest("POST", "/api/admin/vision-board/incentives", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/incentives", selectedYear] });
      setShowIncentiveDialog(false);
      toast({ title: "Incentive added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteIncentiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/vision-board/incentives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board/incentives", selectedYear] });
      toast({ title: "Incentive deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const regularUsers = users?.filter(u => u.role === 'user') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="year">Year:</Label>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24" data-testid="select-vision-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" data-testid="tab-company-vision">
            <Building2 className="h-4 w-4 mr-2" />
            Company Vision
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-user-targets">
            <Users className="h-4 w-4 mr-2" />
            User Targets
          </TabsTrigger>
          <TabsTrigger value="incentives" data-testid="tab-incentives">
            <DollarSign className="h-4 w-4 mr-2" />
            Incentives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanyVisionTab
            vision={companyVision}
            loading={loadingCompany}
            onSave={(data) => saveCompanyVisionMutation.mutate(data)}
            onAutoDistribute={(visionId, targets) => autoDistributeCompanyMutation.mutate({ company_vision_id: visionId, annual_targets: targets })}
            saving={saveCompanyVisionMutation.isPending || autoDistributeCompanyMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UserTargetsTab
            targets={userTargets || []}
            users={regularUsers}
            loading={loadingUsers}
            onEdit={(userId) => {
              setEditingUser(userId);
              setShowUserDialog(true);
            }}
            onAddNew={() => {
              setEditingUser(null);
              setShowUserDialog(true);
            }}
            onDelete={(userId) => deleteUserTargetMutation.mutate(userId)}
          />
        </TabsContent>

        <TabsContent value="incentives" className="mt-4">
          <IncentivesTab
            incentives={incentives || []}
            users={regularUsers}
            loading={loadingIncentives}
            onAdd={(userId) => {
              setIncentiveUserId(userId);
              setShowIncentiveDialog(true);
            }}
            onDelete={(id) => deleteIncentiveMutation.mutate(id)}
            year={selectedYear}
          />
        </TabsContent>
      </Tabs>

      <UserTargetDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        userId={editingUser}
        users={regularUsers}
        existingTargets={userTargets || []}
        year={selectedYear}
        onSave={(data) => saveUserTargetMutation.mutate(data)}
        saving={saveUserTargetMutation.isPending}
      />

      <IncentiveDialog
        open={showIncentiveDialog}
        onOpenChange={setShowIncentiveDialog}
        userId={incentiveUserId}
        users={regularUsers}
        year={selectedYear}
        onSave={(data) => createIncentiveMutation.mutate(data)}
        saving={createIncentiveMutation.isPending}
      />
    </div>
  );
}

function CompanyVisionTab({
  vision,
  loading,
  onSave,
  onAutoDistribute,
  saving,
}: {
  vision?: { board: CompanyVisionBoard | null; monthly_targets: CompanyVisionMonthlyTarget[] };
  loading: boolean;
  onSave: (data: Partial<CompanyVisionBoard>) => void;
  onAutoDistribute: (visionId: string, targets: EffortTargets) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<{
    goal_amount: number;
    currency: string;
    goal_description: string;
    annual_targets: EffortTargets;
  }>({
    goal_amount: vision?.board?.goal_amount || 0,
    currency: vision?.board?.currency || 'INR',
    goal_description: vision?.board?.goal_description || '',
    annual_targets: vision?.board?.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const handleSave = () => {
    onSave(formData);
  };

  const handleAutoDistribute = () => {
    if (vision?.board?.id) {
      onAutoDistribute(vision.board.id, formData.annual_targets);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Company Annual Targets
          </CardTitle>
          <CardDescription>
            Set company-wide goals and effort targets for the year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Annual Goal Amount</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={formData.goal_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_amount: Number(e.target.value) }))}
                  placeholder="0"
                  data-testid="input-company-goal-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Goal Description</Label>
              <Textarea
                value={formData.goal_description}
                onChange={(e) => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                placeholder="Company's annual revenue target..."
                className="resize-none"
                data-testid="input-company-goal-description"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Annual Effort Targets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Sales</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.sales}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, sales: Number(e.target.value) }
                  }))}
                  data-testid="input-company-sales-target"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Visits</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.visits}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, visits: Number(e.target.value) }
                  }))}
                  data-testid="input-company-visits-target"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Leads Attended</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.leads_attended}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, leads_attended: Number(e.target.value) }
                  }))}
                  data-testid="input-company-leads-target"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Follow-ups</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.followups}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, followups: Number(e.target.value) }
                  }))}
                  data-testid="input-company-followups-target"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-company-vision">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Company Vision
            </Button>
            {vision?.board?.id && (
              <Button variant="outline" onClick={handleAutoDistribute} disabled={saving} data-testid="button-auto-distribute">
                Auto-Distribute to Months
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {vision?.monthly_targets && vision.monthly_targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Follow-ups</TableHead>
                  <TableHead>Auto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vision.monthly_targets.map((mt) => (
                  <TableRow key={mt.id}>
                    <TableCell>{MONTHS[mt.month - 1]}</TableCell>
                    <TableCell>{mt.targets?.sales || 0}</TableCell>
                    <TableCell>{mt.targets?.visits || 0}</TableCell>
                    <TableCell>{mt.targets?.leads_attended || 0}</TableCell>
                    <TableCell>{mt.targets?.followups || 0}</TableCell>
                    <TableCell>
                      <Badge variant={mt.is_auto_calculated ? "secondary" : "outline"}>
                        {mt.is_auto_calculated ? "Auto" : "Manual"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserTargetsTab({
  targets,
  users,
  loading,
  onEdit,
  onAddNew,
  onDelete,
}: {
  targets: Array<UserVisionAdminTarget & { user_name: string; user_email: string }>;
  users: User[];
  loading: boolean;
  onEdit: (userId: string) => void;
  onAddNew: () => void;
  onDelete: (userId: string) => void;
}) {
  if (loading) {
    return <Skeleton className="h-64" />;
  }

  const usersWithTargets = new Set(targets.map(t => t.user_id));
  const usersWithoutTargets = users.filter(u => !usersWithTargets.has(u.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">User Targets</h3>
          <p className="text-sm text-muted-foreground">
            {targets.length} users with targets configured
          </p>
        </div>
        <Button onClick={onAddNew} disabled={usersWithoutTargets.length === 0} data-testid="button-add-user-target">
          <Plus className="h-4 w-4 mr-2" />
          Add User Target
        </Button>
      </div>

      {targets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No user targets configured yet. Click "Add User Target" to get started.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Goal Amount</TableHead>
              <TableHead>Annual Targets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target) => (
              <TableRow key={target.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{target.user_name}</div>
                    <div className="text-xs text-muted-foreground">{target.user_email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {CURRENCIES.find(c => c.value === target.currency)?.label.split(' ')[0]} {target.goal_amount?.toLocaleString() || 0}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">S: {target.annual_targets?.sales || 0}</Badge>
                    <Badge variant="outline">V: {target.annual_targets?.visits || 0}</Badge>
                    <Badge variant="outline">L: {target.annual_targets?.leads_attended || 0}</Badge>
                    <Badge variant="outline">F: {target.annual_targets?.followups || 0}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(target.user_id)} data-testid={`button-edit-target-${target.user_id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(target.user_id)} data-testid={`button-delete-target-${target.user_id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function IncentivesTab({
  incentives,
  users,
  loading,
  onAdd,
  onDelete,
  year,
}: {
  incentives: AdminActualIncentive[];
  users: User[];
  loading: boolean;
  onAdd: (userId: string) => void;
  onDelete: (id: string) => void;
  year: number;
}) {
  const [selectedUser, setSelectedUser] = useState<string>("");

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  const filteredIncentives = selectedUser
    ? incentives.filter(i => i.user_id === selectedUser)
    : incentives;

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>Filter by User:</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Users</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onAdd(selectedUser || users[0]?.id || "")} disabled={users.length === 0} data-testid="button-add-incentive">
          <Plus className="h-4 w-4 mr-2" />
          Add Incentive
        </Button>
      </div>

      {filteredIncentives.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No incentives recorded for {year}. Click "Add Incentive" to record payments.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIncentives.map((incentive) => (
              <TableRow key={incentive.id}>
                <TableCell>{getUserName(incentive.user_id)}</TableCell>
                <TableCell>{MONTHS[incentive.month - 1]}</TableCell>
                <TableCell>
                  {CURRENCIES.find(c => c.value === incentive.currency)?.label.split(' ')[0]} {incentive.amount.toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{incentive.description || '-'}</TableCell>
                <TableCell>
                  {incentive.payment_date
                    ? new Date(incentive.payment_date).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(incentive.id)} data-testid={`button-delete-incentive-${incentive.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function UserTargetDialog({
  open,
  onOpenChange,
  userId,
  users,
  existingTargets,
  year,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  users: User[];
  existingTargets: Array<UserVisionAdminTarget & { user_name: string }>;
  year: number;
  onSave: (data: { userId: string } & Partial<UserVisionAdminTarget>) => void;
  saving: boolean;
}) {
  const existingTarget = userId ? existingTargets.find(t => t.user_id === userId) : null;
  const usersWithTargets = new Set(existingTargets.map(t => t.user_id));
  const availableUsers = userId ? users : users.filter(u => !usersWithTargets.has(u.id));

  const [formData, setFormData] = useState({
    userId: userId || availableUsers[0]?.id || "",
    goal_amount: existingTarget?.goal_amount || 0,
    currency: existingTarget?.currency || 'INR',
    goal_description: existingTarget?.goal_description || '',
    annual_targets: existingTarget?.annual_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
  });

  const handleSubmit = () => {
    if (!formData.userId) return;
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{userId ? 'Edit User Target' : 'Add User Target'}</DialogTitle>
          <DialogDescription>
            Set annual targets for a user for {year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select
              value={formData.userId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
              disabled={!!userId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Goal Amount</Label>
              <Input
                type="number"
                value={formData.goal_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, goal_amount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goal Description</Label>
            <Textarea
              value={formData.goal_description}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
              placeholder="Personal goal description..."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Annual Effort Targets</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Sales</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.sales}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, sales: Number(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Visits</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.visits}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, visits: Number(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Leads Attended</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.leads_attended}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, leads_attended: Number(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Follow-ups</Label>
                <Input
                  type="number"
                  value={formData.annual_targets.followups}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    annual_targets: { ...prev.annual_targets, followups: Number(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.userId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncentiveDialog({
  open,
  onOpenChange,
  userId,
  users,
  year,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  users: User[];
  year: number;
  onSave: (data: Partial<AdminActualIncentive>) => void;
  saving: boolean;
}) {
  const currentMonth = new Date().getMonth() + 1;
  const [formData, setFormData] = useState({
    user_id: userId || users[0]?.id || "",
    month: currentMonth,
    amount: 0,
    currency: 'INR',
    description: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = () => {
    if (!formData.user_id) return;
    onSave({
      user_id: formData.user_id,
      year,
      month: formData.month,
      amount: formData.amount,
      currency: formData.currency,
      description: formData.description,
      payment_date: formData.payment_date ? new Date(formData.payment_date) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Incentive Payment</DialogTitle>
          <DialogDescription>
            Record an incentive payment for a user
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={String(formData.month)}
                onValueChange={(v) => setFormData(prev => ({ ...prev, month: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Payment notes..."
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.user_id}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Incentive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
