import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, UserPlus, Clock, RefreshCw, Webhook, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSettings {
  lead_assigned?: boolean;
  nfdt_reminder?: boolean;
  lead_updated?: boolean;
  webhook_received?: boolean;
  user_joined?: boolean;
}

interface CompanySettings {
  notification_settings?: NotificationSettings;
  mobile_card_columns?: string[];
}

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    lead_assigned: true,
    nfdt_reminder: true,
    lead_updated: false,
    webhook_received: true,
    user_joined: true,
  });

  const { data: companyData, isLoading } = useQuery<{ settings: CompanySettings }>({
    queryKey: ["/api/admin/company/settings"],
  });

  useEffect(() => {
    if (companyData?.settings?.notification_settings) {
      setSettings({
        lead_assigned: companyData.settings.notification_settings.lead_assigned ?? true,
        nfdt_reminder: companyData.settings.notification_settings.nfdt_reminder ?? true,
        lead_updated: companyData.settings.notification_settings.lead_updated ?? false,
        webhook_received: companyData.settings.notification_settings.webhook_received ?? true,
        user_joined: companyData.settings.notification_settings.user_joined ?? true,
      });
    }
  }, [companyData]);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const currentSettings = companyData?.settings || {};
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: {
          ...currentSettings,
          notification_settings: newSettings,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      toast({
        title: "Settings saved",
        description: "Notification preferences have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notification settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(newSettings);
    updateMutation.mutate(newSettings);
  };

  const notificationTypes = [
    {
      key: "lead_assigned" as keyof NotificationSettings,
      title: "Lead Assigned",
      description: "Notify users when a lead is assigned to them",
      icon: UserCheck,
    },
    {
      key: "nfdt_reminder" as keyof NotificationSettings,
      title: "Follow-up Reminder",
      description: "Remind users when a follow-up date/time is due",
      icon: Clock,
    },
    {
      key: "lead_updated" as keyof NotificationSettings,
      title: "Lead Updated",
      description: "Notify lead owners when their lead is updated by others",
      icon: RefreshCw,
    },
    {
      key: "webhook_received" as keyof NotificationSettings,
      title: "Webhook Lead Received",
      description: "Notify admins when a new lead arrives via webhook",
      icon: Webhook,
    },
    {
      key: "user_joined" as keyof NotificationSettings,
      title: "New User Joined",
      description: "Notify admins when a new team member joins",
      icon: UserPlus,
    },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Loading notification settings...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const anyEnabled = Object.values(settings).some(Boolean);

  return (
    <Card className={className} data-testid="card-notification-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {anyEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Configure which events trigger push notifications for your team. Users must enable notifications on their devices to receive alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationTypes.map(({ key, title, description, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
            data-testid={`notification-setting-${key}`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                  {title}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              </div>
            </div>
            <Switch
              id={key}
              checked={settings[key]}
              onCheckedChange={() => handleToggle(key)}
              disabled={updateMutation.isPending}
              data-testid={`switch-${key}`}
            />
          </div>
        ))}

        {updateMutation.isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Push notifications require users to install the app and grant notification permission. 
            Notifications are sent to all devices where the user has enabled them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
