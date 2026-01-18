import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Building2, Users, LayoutGrid, TrendingUp, Plus, Pencil, Trash2, UserPlus, X, Key, Columns, Smartphone, Bell, Filter, FileSpreadsheet, Search, Palette, Target, HardDrive, Settings, Globe, Check, ChevronsUpDown, MessageSquareMore, Database, CheckCircle2, Loader2, MapPin, Calendar } from "lucide-react";
import * as ct from "countries-and-timezones";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Company, GlobalReportSummary, InsertCompany, InsertUser } from "@shared/schema";
import { insertCompanySchema, insertUserSchema } from "@shared/schema";
import { CompanyColumnManager } from "@/components/company-column-manager";
import { QuickFilterManager } from "@/components/quick-filter-manager";
import { MobileCardSettings } from "@/components/mobile-card-settings";
import { SiteVisitSettings } from "@/components/site-visit-settings";
import { SiteVisitedSettings } from "@/components/site-visited-settings";
import { NotificationSettings } from "@/components/notification-settings";
import { HighlightingRulesManager } from "@/components/highlighting-rules-manager";
import { KpiManagement } from "@/components/kpi-management";
import { BackupManager } from "@/components/backup-manager";
import { TransitionExplanationManager } from "@/components/transition-explanation-manager";
import { DataManagement } from "@/components/data-management";
import { HotLeadsConfigManager } from "@/components/hot-leads-config";
import { ValidationRulesManager } from "@/components/validation-rules-manager";
import { CustomViewsManager } from "@/components/custom-views-manager";
import { QuickUpdateFieldsSettings } from "@/components/quick-update-fields-settings";
import { AddLeadFormSettings } from "@/components/add-lead-form-settings";
import { AutoFillRulesSettings } from "@/components/auto-fill-rules-settings";
import { FinalValueSettings } from "@/components/final-value-settings";
import { LeadTransferConfig } from "@/components/lead-transfer-config";
import { LeadTransferRequests } from "@/components/lead-transfer-requests";
import { WhatsAppSettings } from "@/components/whatsapp-settings";
import { Flame, ClipboardCheck, Eye, FormInput, Zap, Sparkles, ThumbsUp, Gift, Trophy, Award, Activity, Lock, ArrowRightLeft, Phone } from "lucide-react";
import { PowerScoreSettings } from "@/components/powerscore-settings";
import { PowerFlowSettings } from "@/components/powerflow-settings";
import { QualityCheckSettings } from "@/components/quality-check-settings";
import { VisionBoardMessagingSettings } from "@/components/vision-board-messaging-settings";
import type { Sheet } from "@shared/schema";

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

// Day name helper for weekly off days
const DAY_NAMES = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// General Company Settings Component
function GeneralCompanySettings() {
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([]);

  // Get all timezones with country names using countries-and-timezones library
  const allTimezones = useMemo(() => {
    const timezones = ct.getAllTimezones();
    const countries = ct.getAllCountries();
    
    // Build timezone list with country names and UTC offsets
    const tzList = Object.values(timezones)
      .filter((tz: any) => !tz.aliasOf) // Skip aliases
      .map((tz: any) => {
        // Get country names for this timezone
        const countryNames = (tz.countries || [])
          .map((code: string) => countries[code]?.name || code)
          .filter(Boolean)
          .slice(0, 2) // Show max 2 countries
          .join(', ');
        
        const cityName = tz.name.split('/').pop()?.replace(/_/g, ' ') || tz.name;
        const label = countryNames 
          ? `(UTC${tz.utcOffsetStr}) ${countryNames} - ${cityName}`
          : `(UTC${tz.utcOffsetStr}) ${tz.name.replace(/_/g, ' ')}`;
        
        return {
          value: tz.name,
          label,
          searchLabel: `${countryNames} ${tz.name.replace(/_/g, ' ')} ${tz.utcOffsetStr}`.toLowerCase(),
          offset: tz.utcOffset
        };
      })
      .sort((a: any, b: any) => a.offset - b.offset); // Sort by UTC offset
    
    return tzList;
  }, []);

  // Fetch current company settings
  const { data: settingsData, isLoading } = useQuery<{ settings: { timezone?: string; weekly_off_days?: number[] } }>({
    queryKey: ["/api/admin/company/settings"],
  });

  // Get server timezone value (empty string if not configured)
  const serverTimezone = settingsData?.settings?.timezone || '';
  const serverWeeklyOffDays = settingsData?.settings?.weekly_off_days || [];

  // Sync weekly off days with server data
  useEffect(() => {
    if (settingsData !== undefined) {
      setWeeklyOffDays(settingsData?.settings?.weekly_off_days || []);
    }
  }, [settingsData]);
  
  // Sync local state with server data when query refetches
  // This ensures UI always reflects canonical server value, including when backend normalizes input
  useEffect(() => {
    // When server data is available, always sync local state to match
    // This handles both initial load and post-mutation refetch
    if (settingsData !== undefined) {
      setSelectedTimezone('');
    }
  }, [settingsData]);
  
  // Use local state if set, otherwise use server value
  const displayedTimezone = selectedTimezone || serverTimezone;

  // Update timezone mutation
  const updateMutation = useMutation({
    mutationFn: async (timezone: string) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { timezone }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      // Clear local state so UI reflects server value after refetch
      setSelectedTimezone('');
      setHasError(false);
      toast({
        title: "Settings updated",
        description: "Company timezone has been updated successfully.",
      });
    },
    onError: (error: any) => {
      // Reset to server value on error
      setSelectedTimezone('');
      setHasError(true);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings. Change has been reverted.",
        variant: "destructive",
      });
    },
  });

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    setHasError(false);
    updateMutation.mutate(value);
  };

  // Update weekly off days mutation
  const weeklyOffMutation = useMutation({
    mutationFn: async (days: number[]) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { weekly_off_days: days }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({
        title: "Settings updated",
        description: "Weekly off days have been updated successfully.",
      });
    },
    onError: (error: any) => {
      // Revert to server value on error
      setWeeklyOffDays(serverWeeklyOffDays);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const handleWeeklyOffToggle = (day: number, checked: boolean) => {
    const newDays = checked 
      ? [...weeklyOffDays, day].sort((a, b) => a - b)
      : weeklyOffDays.filter(d => d !== day);
    setWeeklyOffDays(newDays);
    weeklyOffMutation.mutate(newDays);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium text-sm">Company Timezone</h4>
              <p className="text-xs text-muted-foreground">
                Used for webhook timestamps and date/time display across the system
              </p>
            </div>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  className="w-full max-w-md justify-between font-normal"
                  disabled={updateMutation.isPending}
                  data-testid="select-timezone"
                >
                  {displayedTimezone
                    ? allTimezones.find((tz) => tz.value === displayedTimezone)?.label || displayedTimezone.replace(/_/g, ' ')
                    : "Not configured - Select timezone"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by country, city, or timezone..." data-testid="input-search-timezone" />
                  <CommandList>
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      {allTimezones.map((tz: any) => (
                        <CommandItem
                          key={tz.value}
                          value={`${tz.label} ${tz.searchLabel}`}
                          onSelect={() => {
                            handleTimezoneChange(tz.value);
                            setTimezoneOpen(false);
                          }}
                          data-testid={`timezone-option-${tz.value}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              displayedTimezone === tz.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{tz.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {updateMutation.isPending && (
              <p className="text-xs text-muted-foreground">Saving...</p>
            )}
            {hasError && !updateMutation.isPending && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}
            {!updateMutation.isPending && !hasError && serverTimezone && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Saved: {serverTimezone}
              </p>
            )}
          </div>
        </div>

        {/* Weekly Off Days */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium text-sm">Weekly Off Days</h4>
              <p className="text-xs text-muted-foreground">
                Select days when your team doesn't work. Used for targets, leaderboard, and performance calculations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((day) => (
                <label
                  key={day.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                    weeklyOffDays.includes(day.value)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  )}
                  data-testid={`checkbox-weekly-off-${day.value}`}
                >
                  <Checkbox
                    checked={weeklyOffDays.includes(day.value)}
                    onCheckedChange={(checked) => handleWeeklyOffToggle(day.value, checked as boolean)}
                    disabled={weeklyOffMutation.isPending}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
            {weeklyOffMutation.isPending && (
              <p className="text-xs text-muted-foreground">Saving...</p>
            )}
            {serverWeeklyOffDays.length > 0 && !weeklyOffMutation.isPending && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Off days: {serverWeeklyOffDays.map(d => DAY_NAMES.find(dn => dn.value === d)?.label).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyAdminView() {
  const { company, user: currentUser } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [selectedHighlightingSheetId, setSelectedHighlightingSheetId] = useState<string>("");
  const [selectedValidationSheetId, setSelectedValidationSheetId] = useState<string>("");
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
  });

  const { data: companySheets = [] } = useQuery<Sheet[]>({
    queryKey: ["/api/sheets"],
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

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/company/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/users"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "User deleted",
        description: "The user has been removed from your company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetPasswordFormSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest("POST", `/api/admin/company/users/${userId}/reset-password`, { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/users"] });
      setResetPasswordDialogOpen(false);
      setUserToReset(null);
      resetPasswordForm.reset();
      toast({
        title: "Password reset",
        description: "User password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleResetPasswordClick = (user: User) => {
    setUserToReset(user);
    setResetPasswordDialogOpen(true);
    resetPasswordForm.reset();
  };

  const confirmResetPassword = (data: ResetPasswordFormData) => {
    if (userToReset) {
      resetPasswordMutation.mutate({
        userId: userToReset.id,
        password: data.password,
      });
    }
  };

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
        <Accordion type="multiple" className="space-y-4" data-testid="admin-accordion">
          <AccordionItem value="general" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-general">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">General Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure company-wide settings and preferences
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <GeneralCompanySettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quality-check" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-quality-check">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Quality Check Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Validate lead update remarks using Sarvam AI
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <QualityCheckSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="vision-board-messaging" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-vision-board-messaging">
              <div className="flex items-center gap-3">
                <MessageSquareMore className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Vision Board Messaging</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create and manage messages displayed on users' Vision Board pages
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <VisionBoardMessagingSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="users" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-users">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Company Users</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {users.length} {users.length === 1 ? "user" : "users"} in your company
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
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
                    {user.id !== currentUser?.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPasswordClick(user)}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(user)}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="columns" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-columns">
              <div className="flex items-center gap-3">
                <Columns className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Company Column Schema</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Define and manage custom columns for leads
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <CompanyColumnManager headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mobile" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-mobile">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Mobile Card Display</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure how leads appear on mobile devices
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <MobileCardSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="site-visits" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-site-visits">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Site Visit Schedules</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure how scheduled site visits are tracked
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <SiteVisitSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="site-visited" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-site-visited">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Site Visited Setting</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure how completed visits are displayed
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <SiteVisitedSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="add-lead-form" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-add-lead-form">
              <div className="flex items-center gap-3">
                <FormInput className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Add Lead Form</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure fields shown when adding a new lead (required/optional)
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <AddLeadFormSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quick-update-fields" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-quick-update-fields">
              <div className="flex items-center gap-3">
                <Pencil className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Quick Update Fields</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure optional fields shown in Record Lead Update dialog
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <QuickUpdateFieldsSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="auto-fill-rules" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-auto-fill-rules">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Auto-Fill Rules</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Automatically set field values when certain conditions are met
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <AutoFillRulesSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="final-value-settings" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-final-value-settings">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <div className="font-semibold">Final Value Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Lock certain values so only Admins can change them
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <FinalValueSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-notifications">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Push Notifications</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Manage notification settings and preferences
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <NotificationSettings headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="filters" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-filters">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Quick Filters</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create and manage quick filter presets
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <QuickFilterManager headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transition-explanations" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-transition-explanations">
              <div className="flex items-center gap-3">
                <MessageSquareMore className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Transition Explanations</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Require explanations when specific dropdown values are selected
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <TransitionExplanationManager headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="highlighting" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-highlighting">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Highlighting Rules</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure row highlighting based on column conditions
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Sheet</label>
                  <Select
                    value={selectedHighlightingSheetId}
                    onValueChange={setSelectedHighlightingSheetId}
                  >
                    <SelectTrigger data-testid="select-highlighting-sheet">
                      <SelectValue placeholder="Choose a sheet to configure highlighting..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_sheets">
                        <span className="font-medium">All Sheets</span>
                      </SelectItem>
                      {companySheets.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedHighlightingSheetId ? (
                  <HighlightingRulesManager 
                    sheetId={selectedHighlightingSheetId === "all_sheets" ? null : selectedHighlightingSheetId}
                    sheetName={selectedHighlightingSheetId === "all_sheets" 
                      ? "All Sheets" 
                      : companySheets.find(s => s.id === selectedHighlightingSheetId)?.name}
                  />
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Palette className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Select a sheet to manage highlighting rules</p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* HOT LEADS FEATURE HIDDEN - Dec 2025
              Reason: Functionality is covered by Custom Views feature
              To restore: Uncomment this AccordionItem and the sidebar menu item in app-sidebar.tsx
              Related files: hot-leads.tsx, hot-leads-config.tsx, spreadsheet-grid.tsx (hotLeadsMode)
              See docs/HIDDEN_FEATURES.md for full details
          <AccordionItem value="hot-leads" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-hot-leads">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <div className="text-left">
                  <div className="font-semibold">Hot Leads</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure conditions to identify high-priority leads
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <HotLeadsConfigManager />
              </div>
            </AccordionContent>
          </AccordionItem>
          */}

          <AccordionItem value="custom-views" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-custom-views">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold">Custom Views</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create filtered sidebar menu items for quick access to specific leads
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <CustomViewsManager />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="validation-rules" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-validation-rules">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold">Validation Rules</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Prompt users to fill required fields when specific conditions are met
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Sheet</label>
                  <Select
                    value={selectedValidationSheetId}
                    onValueChange={setSelectedValidationSheetId}
                  >
                    <SelectTrigger data-testid="select-validation-sheet">
                      <SelectValue placeholder="Choose a sheet to configure validation rules..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        All Sheets (Company-wide)
                      </SelectItem>
                      {companySheets.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Create rules that prompt users to fill required fields when lead data matches specific conditions.
                    {selectedValidationSheetId === "__all__" && (
                      <span className="block mt-1 text-primary font-medium">
                        Rules created here will apply to all sheets in your company.
                      </span>
                    )}
                  </p>
                </div>
                {selectedValidationSheetId ? (
                  <ValidationRulesManager 
                    sheetId={selectedValidationSheetId === "__all__" ? null : selectedValidationSheetId} 
                    isGlobal={selectedValidationSheetId === "__all__"}
                  />
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Select a sheet to manage validation rules</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Example: When Lead Status = "Visit Scheduled", prompt for Visit Date
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* OLD TARGET SYSTEM - Not being used. Covered by Working Targets.
              When cleaning up code, remove this AccordionItem, the KpiManagement component,
              target-management.tsx, and related /api/targets backend routes.
          <AccordionItem value="targets" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-targets">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Target Management</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Set performance goals and track team progress
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <KpiManagement />
              </div>
            </AccordionContent>
          </AccordionItem>
          */}

          <AccordionItem value="powerscore" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-powerscore">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div className="text-left">
                  <div className="font-semibold">PowerScore Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure scoring rules, milestones, and gamification
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <PowerScoreSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="powerflow" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-powerflow">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold">PowerFlow Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure pipeline stages for analytics and conversion tracking
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <PowerFlowSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sheets" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-sheets">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Sheet Assignments</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Assign users to sheets and manage permissions
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <SheetAssignmentManager headless />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="backup" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-backup">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Backup System</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Link to Google Sheets for automatic hourly backups
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <BackupManager />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-management" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-data-management">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Data Management</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Clear test data or bulk transfer leads between sheets
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <DataManagement />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lead-transfer" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-lead-transfer">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Lead Transfer</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure transfer rules and manage transfer requests
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 space-y-6">
                <Tabs defaultValue="config" className="w-full">
                  <TabsList>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="requests">Transfer Requests</TabsTrigger>
                  </TabsList>
                  <TabsContent value="config" className="mt-4">
                    <LeadTransferConfig headless />
                  </TabsContent>
                  <TabsContent value="requests" className="mt-4">
                    <LeadTransferRequests headless />
                  </TabsContent>
                </Tabs>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="whatsapp" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline" data-testid="accordion-whatsapp">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">WhatsApp Lead Settings</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Configure WhatsApp message processing and lead creation
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <WhatsAppSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {userToReset?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(confirmResetPassword)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                        data-testid="input-reset-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-confirm-reset-password"
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SheetAssignment {
  sheet_id: string;
  sheet_name: string;
  role: string;
}

interface UserAssignment {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  sheets: SheetAssignment[];
}

interface AssignmentsResponse {
  users: UserAssignment[];
  available_sheets: { id: string; name: string }[];
}

interface SheetAssignmentManagerProps {
  headless?: boolean;
}

function SheetAssignmentManager({ headless = false }: SheetAssignmentManagerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAssignment | null>(null);
  const [addSheetDialogOpen, setAddSheetDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("editor");
  const [recentlyAddedSheets, setRecentlyAddedSheets] = useState<Map<string, string>>(new Map());
  const [pendingSheetId, setPendingSheetId] = useState<string | null>(null);

  const { data: assignmentsData, isLoading, refetch } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/admin/assignments"],
  });

  const users = assignmentsData?.users || [];
  const availableSheets = assignmentsData?.available_sheets || [];

  const addAssignmentMutation = useMutation({
    mutationFn: async ({ userId, sheetId, sheetName, role }: { userId: string; sheetId: string; sheetName: string; role: string }) => {
      return await apiRequest("POST", `/api/admin/assignments/${userId}`, { 
        sheet_id: sheetId, 
        action: "add",
        role 
      });
    },
    onMutate: (variables) => {
      setPendingSheetId(variables.sheetId);
    },
    onSuccess: (_data, variables) => {
      const { sheetId, sheetName } = variables;
      setRecentlyAddedSheets(prev => new Map(prev).set(sheetId, sheetName));
      toast({
        title: "Sheet assigned",
        description: `${sheetName} has been added to this user.`,
      });
      setTimeout(() => {
        refetch();
      }, 800);
      setTimeout(() => {
        setRecentlyAddedSheets(prev => {
          const next = new Map(prev);
          next.delete(sheetId);
          return next;
        });
      }, 3500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign sheet",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingSheetId(null);
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ userId, sheetId }: { userId: string; sheetId: string }) => {
      return await apiRequest("POST", `/api/admin/assignments/${userId}`, { 
        sheet_id: sheetId, 
        action: "remove" 
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Sheet removed",
        description: "User no longer has access to this sheet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove sheet",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, sheetId, role }: { userId: string; sheetId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/assignments/${userId}/${sheetId}`, { role });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Role updated",
        description: "Permission level has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.user_name?.toLowerCase().includes(query) ||
        user.user_email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const getUnassignedSheets = (user: UserAssignment) => {
    const assignedIds = new Set(user.sheets.map(s => s.sheet_id));
    return availableSheets.filter(s => !assignedIds.has(s.id));
  };

  const handleAddSheet = (user: UserAssignment) => {
    setSelectedUser(user);
    setAddSheetDialogOpen(true);
  };

  const content = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-assignments"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No users match your search" : "No users in your company yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="border rounded-lg p-4 space-y-3"
              data-testid={`assignment-user-${user.user_id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>
                      {user.user_name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{user.user_name}</span>
                      <Badge variant={user.user_role === "company_admin" ? "default" : "secondary"} className="shrink-0">
                        {user.user_role === "company_admin" ? "Admin" : "User"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{user.user_email}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSheet(user)}
                  disabled={getUnassignedSheets(user).length === 0}
                  data-testid={`button-add-sheet-${user.user_id}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sheet
                </Button>
              </div>
              
              {user.sheets.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2 pl-[52px]">
                  No sheets assigned
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pl-[52px]">
                  {user.sheets.map((sheet) => (
                    <div
                      key={sheet.sheet_id}
                      className="flex items-center gap-1 bg-muted/50 rounded-md pl-3 pr-1 py-1 group"
                      data-testid={`sheet-badge-${user.user_id}-${sheet.sheet_id}`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                      <span className="text-sm">{sheet.sheet_name}</span>
                      <Select
                        value={sheet.role}
                        onValueChange={(newRole) => 
                          updateRoleMutation.mutate({ 
                            userId: user.user_id, 
                            sheetId: sheet.sheet_id, 
                            role: newRole 
                          })
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger 
                          className="h-6 w-[70px] text-xs border-0 bg-transparent p-1" 
                          data-testid={`select-role-${user.user_id}-${sheet.sheet_id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive"
                        onClick={() => removeAssignmentMutation.mutate({ 
                          userId: user.user_id, 
                          sheetId: sheet.sheet_id 
                        })}
                        disabled={removeAssignmentMutation.isPending}
                        data-testid={`button-remove-sheet-${user.user_id}-${sheet.sheet_id}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={addSheetDialogOpen} onOpenChange={(open) => {
        setAddSheetDialogOpen(open);
        if (!open) {
          setRecentlyAddedSheets(new Map());
          setPendingSheetId(null);
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Sheet Access</DialogTitle>
            <DialogDescription>
              Select sheets to give {selectedUser?.user_name} access to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Default role:</span>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-28" data-testid="select-add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 h-[300px]">
              <div className="space-y-2 pr-4">
                {selectedUser && getUnassignedSheets(selectedUser).length === 0 && recentlyAddedSheets.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All sheets are already assigned to this user
                  </p>
                ) : (
                  <>
                    {Array.from(recentlyAddedSheets.entries()).map(([sheetId, sheetName]) => (
                      <div
                        key={sheetId}
                        className="flex items-center justify-between gap-2 p-3 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">{sheetName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Added</span>
                        </div>
                      </div>
                    ))}
                    {selectedUser && getUnassignedSheets(selectedUser).map((sheet) => (
                      <div
                        key={sheet.id}
                        className="flex items-center justify-between gap-2 p-3 border rounded-lg hover-elevate"
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{sheet.name}</span>
                        </div>
                        {pendingSheetId === sheet.id ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Adding...</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              addAssignmentMutation.mutate({ 
                                userId: selectedUser.user_id, 
                                sheetId: sheet.id,
                                sheetName: sheet.name,
                                role: selectedRole
                              });
                            }}
                            disabled={addAssignmentMutation.isPending}
                            data-testid={`button-assign-sheet-${sheet.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (headless) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sheet Assignments</CardTitle>
        <CardDescription>See which users have access to which sheets - all in one view</CardDescription>
      </CardHeader>
      <CardContent>
        {content}
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
