import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  Copy,
  ExternalLink,
  Info,
  Globe,
} from "lucide-react";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export function WhatsAppCloudAdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const { data: configs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/whatsapp-cloud/config"],
  });

  const { data: metaIds } = useQuery<{ fb_app_id: string | null; fb_config_id: string | null }>({
    queryKey: ["/api/whatsapp-cloud/meta-app-id"],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { code: string; waba_id?: string; phone_number_id?: string }) => {
      return await apiRequest("POST", "/api/whatsapp-cloud/connect", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-cloud/config"] });
      toast({ title: "Connected", description: "WhatsApp Business connected successfully" });
      setConnecting(false);
    },
    onError: (error: any) => {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
      setConnecting(false);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/whatsapp-cloud/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-cloud/config"] });
      toast({ title: "Disconnected", description: "WhatsApp Business disconnected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!metaIds?.fb_app_id) return;
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: metaIds.fb_app_id!,
        cookie: true,
        xfbml: true,
        version: "v22.0",
      });
      setSdkLoaded(true);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [metaIds?.fb_app_id]);

  const handleConnect = useCallback(() => {
    if (!window.FB || !metaIds?.fb_config_id) {
      toast({ title: "Not Ready", description: "Facebook SDK not loaded or configuration missing. Contact Super Admin.", variant: "destructive" });
      return;
    }

    setConnecting(true);

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const { code } = response.authResponse;
          const wabaId = response.authResponse.waba_id;
          const phoneNumberId = response.authResponse.phone_number_id;

          connectMutation.mutate({
            code,
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
          });
        } else {
          setConnecting(false);
          toast({ title: "Cancelled", description: "Connection was cancelled or not authorized" });
        }
      },
      {
        config_id: metaIds.fb_config_id,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: 3,
        },
      }
    );
  }, [metaIds, connectMutation, toast]);

  const activeConfig = configs.find((c: any) => c.account_status === "connected");
  const isConfigured = !!metaIds?.fb_app_id && !!metaIds?.fb_config_id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConfigured && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Platform Not Configured</p>
                <p className="text-sm text-muted-foreground">
                  WhatsApp Cloud API integration has not been set up yet. Please contact the Super Admin to configure the Meta platform credentials.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeConfig ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">WhatsApp Business Connected</CardTitle>
              </div>
              <Badge variant="default" className="bg-green-600 text-white">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Business Name</Label>
                <p className="text-sm font-medium" data-testid="text-wa-business-name">{activeConfig.business_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <p className="text-sm font-medium" data-testid="text-wa-phone">{activeConfig.display_phone_number || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WABA ID</Label>
                <p className="text-sm font-mono text-xs" data-testid="text-wa-waba-id">{activeConfig.waba_id || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                <p className="text-sm font-mono text-xs" data-testid="text-wa-phone-id">{activeConfig.phone_number_id || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Connected At</Label>
                <p className="text-sm" data-testid="text-wa-connected-at">
                  {activeConfig.connected_at ? new Date(activeConfig.connected_at).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Connected By</Label>
                <p className="text-sm" data-testid="text-wa-connected-by">{activeConfig.connected_by_name || "—"}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate" data-testid="text-wa-webhook-url">
                  {window.location.origin}/api/whatsapp-cloud/webhook
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp-cloud/webhook`);
                    toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
                  }}
                  data-testid="button-copy-webhook"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {activeConfig.webhook_verify_token && (
              <div>
                <Label className="text-xs text-muted-foreground">Webhook Verify Token</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate" data-testid="text-wa-verify-token">
                    {activeConfig.webhook_verify_token}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(activeConfig.webhook_verify_token);
                      toast({ title: "Copied", description: "Verify token copied to clipboard" });
                    }}
                    data-testid="button-copy-verify-token"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDisconnectOpen(true)}
              data-testid="button-disconnect-whatsapp"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Connect WhatsApp Business</CardTitle>
            </div>
            <CardDescription>
              Connect your WhatsApp Business number to receive leads directly in Leadani LFS. 
              You'll be redirected to Facebook to authorize access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">What happens when you connect:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  Your WhatsApp Business number gets linked to this account
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  Incoming messages can be automatically converted to leads
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  You keep full ownership of your WhatsApp Business Account
                </li>
              </ul>
            </div>

            <Button
              onClick={handleConnect}
              disabled={!isConfigured || !sdkLoaded || connecting}
              className="w-full sm:w-auto"
              data-testid="button-connect-whatsapp"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {connecting ? "Connecting..." : "Connect with Facebook"}
            </Button>

            {!sdkLoaded && isConfigured && (
              <p className="text-xs text-muted-foreground">Loading Facebook SDK...</p>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect WhatsApp Business?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection between your WhatsApp Business number and Leadani LFS. 
              You can reconnect at any time. Existing leads will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-disconnect">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-disconnect"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MetaPlatformSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fb_app_id: "",
    fb_app_secret: "",
    fb_config_id: "",
    webhook_verify_token: "",
  });
  const [showSecret, setShowSecret] = useState(false);

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/super-admin/meta-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        fb_app_id: settings.fb_app_id || "",
        fb_app_secret: settings.fb_app_secret || "",
        fb_config_id: settings.fb_config_id || "",
        webhook_verify_token: settings.webhook_verify_token || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/super-admin/meta-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/meta-settings"] });
      toast({ title: "Saved", description: "Meta platform settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Meta Developer App Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the Meta (Facebook) Developer App credentials for WhatsApp Cloud API. 
            These are Leadani's own platform credentials — not per-company.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb_app_id">Facebook App ID</Label>
            <Input
              id="fb_app_id"
              value={formData.fb_app_id}
              onChange={(e) => setFormData((p) => ({ ...p, fb_app_id: e.target.value }))}
              placeholder="Enter Facebook App ID"
              data-testid="input-fb-app-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb_app_secret">Facebook App Secret</Label>
            <div className="flex gap-2">
              <Input
                id="fb_app_secret"
                type={showSecret ? "text" : "password"}
                value={formData.fb_app_secret}
                onChange={(e) => setFormData((p) => ({ ...p, fb_app_secret: e.target.value }))}
                placeholder="Enter Facebook App Secret"
                data-testid="input-fb-app-secret"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
                data-testid="button-toggle-secret"
              >
                {showSecret ? <XCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb_config_id">Facebook Login Configuration ID</Label>
            <Input
              id="fb_config_id"
              value={formData.fb_config_id}
              onChange={(e) => setFormData((p) => ({ ...p, fb_config_id: e.target.value }))}
              placeholder="Enter Configuration ID for Embedded Signup"
              data-testid="input-fb-config-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_verify_token">Global Webhook Verify Token</Label>
            <Input
              id="webhook_verify_token"
              value={formData.webhook_verify_token}
              onChange={(e) => setFormData((p) => ({ ...p, webhook_verify_token: e.target.value }))}
              placeholder="Custom token for webhook verification"
              data-testid="input-webhook-verify-token"
            />
            <p className="text-xs text-muted-foreground">
              Use this token when configuring the webhook URL in Meta Developer Dashboard.
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-xs text-muted-foreground">Webhook URL (for Meta Dashboard)</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate" data-testid="text-webhook-url">
                {window.location.origin}/api/whatsapp-cloud/webhook
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp-cloud/webhook`);
                  toast({ title: "Copied", description: "Webhook URL copied" });
                }}
                data-testid="button-copy-webhook-url"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            data-testid="button-save-meta-settings"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Go to <strong>developers.facebook.com</strong> and create a Business-type App</li>
            <li>Add the <strong>WhatsApp</strong> product to your app</li>
            <li>Complete <strong>Business Verification</strong> for your Meta Business Manager</li>
            <li>Add <strong>Facebook Login for Business</strong> product, create a configuration with "WhatsApp Embedded Signup" variation</li>
            <li>Copy the <strong>App ID</strong>, <strong>App Secret</strong>, and <strong>Configuration ID</strong> above</li>
            <li>In Meta Dashboard, set the webhook URL to the URL shown above with the verify token</li>
            <li>Subscribe to the <strong>messages</strong> webhook field</li>
            <li>Submit your app for <strong>App Review</strong> (whatsapp_business_management, whatsapp_business_messaging permissions)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}