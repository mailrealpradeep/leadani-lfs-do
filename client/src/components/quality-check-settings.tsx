import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, Save, ShieldCheck, AlertCircle } from "lucide-react";

interface QualityCheckSettings {
  enabled: boolean;
  sarvam_api_key?: string;
  acceptance_level: 'lenient' | 'moderate' | 'strict';
  warning_message?: string;
}

interface SettingsResponse {
  settings: {
    quality_check_settings?: QualityCheckSettings;
  };
}

export function QualityCheckSettings() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [localSettings, setLocalSettings] = useState<QualityCheckSettings>({
    enabled: false,
    sarvam_api_key: '',
    acceptance_level: 'moderate',
    warning_message: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["/api/admin/company/settings"],
  });

  useEffect(() => {
    if (data?.settings?.quality_check_settings) {
      setLocalSettings({
        enabled: data.settings.quality_check_settings.enabled || false,
        sarvam_api_key: data.settings.quality_check_settings.sarvam_api_key || '',
        acceptance_level: data.settings.quality_check_settings.acceptance_level || 'moderate',
        warning_message: data.settings.quality_check_settings.warning_message || '',
      });
      setHasChanges(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (settings: QualityCheckSettings) => {
      return await apiRequest("PATCH", "/api/admin/company/settings", {
        settings: { quality_check_settings: settings }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company/settings"] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Quality check settings have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: keyof QualityCheckSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h4 className="font-medium text-sm">Enable Remark Quality Check</h4>
            <p className="text-xs text-muted-foreground">
              Validate lead update remarks using Sarvam AI before saving
            </p>
          </div>
        </div>
        <Switch
          checked={localSettings.enabled}
          onCheckedChange={(checked) => handleChange('enabled', checked)}
          data-testid="switch-quality-check-enabled"
        />
      </div>

      {localSettings.enabled && (
        <div className="space-y-4 pl-8 border-l-2 border-muted">
          {!localSettings.sarvam_api_key && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Quality check is enabled but no API key is configured. Remark validation will be skipped until an API key is added.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sarvam-api-key">Sarvam API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="sarvam-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Sarvam AI API key"
                  value={localSettings.sarvam_api_key || ''}
                  onChange={(e) => handleChange('sarvam_api_key', e.target.value)}
                  data-testid="input-sarvam-api-key"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
                data-testid="button-toggle-api-key-visibility"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a 
                href="https://dashboard.sarvam.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                dashboard.sarvam.ai
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptance-level">Acceptance Level</Label>
            <Select
              value={localSettings.acceptance_level}
              onValueChange={(value: 'lenient' | 'moderate' | 'strict') => handleChange('acceptance_level', value)}
            >
              <SelectTrigger id="acceptance-level" data-testid="select-acceptance-level">
                <SelectValue placeholder="Select acceptance level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lenient">
                  <div className="flex flex-col">
                    <span>Lenient</span>
                    <span className="text-xs text-muted-foreground">Only reject single words like "ok", "done"</span>
                  </div>
                </SelectItem>
                <SelectItem value="moderate">
                  <div className="flex flex-col">
                    <span>Moderate</span>
                    <span className="text-xs text-muted-foreground">Require some specific information</span>
                  </div>
                </SelectItem>
                <SelectItem value="strict">
                  <div className="flex flex-col">
                    <span>Strict</span>
                    <span className="text-xs text-muted-foreground">Require detailed conversation summary</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warning-message">Warning Message</Label>
            <Textarea
              id="warning-message"
              placeholder="Please add more details about the conversation or outcome."
              value={localSettings.warning_message || ''}
              onChange={(e) => handleChange('warning_message', e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-warning-message"
            />
            <p className="text-xs text-muted-foreground">
              This message will be shown when a remark is not meaningful enough
            </p>
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            data-testid="button-save-quality-settings"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
