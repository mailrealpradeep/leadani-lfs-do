import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, Save, ShieldCheck, Sparkles, ListX, Brain, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface QualityCheckSettings {
  // Standard check (instant, no API)
  standard_check_enabled: boolean;
  blacklist_words: string[];
  standard_warning_message?: string;
  // AI check (optional enhancement)
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

const DEFAULT_BLACKLIST = [
  "ok", "okay", "done", "yes", "no", "k", "kk", "hmm", "fine", 
  "called", "will call", "busy", "not responding", "no response",
  "switched off", "not reachable", "later", "cb", "call back"
];

export function QualityCheckSettings() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [localSettings, setLocalSettings] = useState<QualityCheckSettings>({
    standard_check_enabled: false,
    blacklist_words: [],
    standard_warning_message: '',
    enabled: false,
    sarvam_api_key: '',
    acceptance_level: 'moderate',
    warning_message: '',
  });
  const [blacklistText, setBlacklistText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["/api/admin/company/settings"],
  });

  useEffect(() => {
    if (data?.settings?.quality_check_settings) {
      const settings = data.settings.quality_check_settings;
      setLocalSettings({
        standard_check_enabled: settings.standard_check_enabled || false,
        blacklist_words: settings.blacklist_words || [],
        standard_warning_message: settings.standard_warning_message || '',
        enabled: settings.enabled || false,
        sarvam_api_key: settings.sarvam_api_key || '',
        acceptance_level: settings.acceptance_level || 'moderate',
        warning_message: settings.warning_message || '',
      });
      setBlacklistText((settings.blacklist_words || []).join(', '));
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
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
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

  const handleBlacklistChange = (text: string) => {
    setBlacklistText(text);
    const words = text
      .split(/[,\n]/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);
    setLocalSettings(prev => ({ ...prev, blacklist_words: words }));
    setHasChanges(true);
  };

  const handleAddDefaults = () => {
    const current = new Set(localSettings.blacklist_words);
    DEFAULT_BLACKLIST.forEach(word => current.add(word.toLowerCase()));
    const merged = Array.from(current);
    setLocalSettings(prev => ({ ...prev, blacklist_words: merged }));
    setBlacklistText(merged.join(', '));
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
      {/* Standard Quality Check Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListX className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium text-sm">Standard Quality Check</h4>
              <p className="text-xs text-muted-foreground">
                Instant validation using blacklist words (no API required)
              </p>
            </div>
          </div>
          <Switch
            checked={localSettings.standard_check_enabled}
            onCheckedChange={(checked) => handleChange('standard_check_enabled', checked)}
            data-testid="switch-standard-check-enabled"
          />
        </div>

        {localSettings.standard_check_enabled && (
          <div className="space-y-4 pl-8 border-l-2 border-muted">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="blacklist-words">Blacklist Words / Phrases</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDefaults}
                  data-testid="button-add-default-blacklist"
                >
                  Add Defaults
                </Button>
              </div>
              <Textarea
                id="blacklist-words"
                placeholder="ok, done, called, will call, busy, not responding..."
                value={blacklistText}
                onChange={(e) => handleBlacklistChange(e.target.value)}
                className="resize-none min-h-[80px]"
                rows={3}
                data-testid="input-blacklist-words"
              />
              <p className="text-xs text-muted-foreground">
                Separate words or phrases with commas or new lines. Remarks matching these exactly will be flagged.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standard-warning-message">Warning Message</Label>
              <Textarea
                id="standard-warning-message"
                placeholder="Your remark appears to be too brief. Please provide more details about the conversation."
                value={localSettings.standard_warning_message || ''}
                onChange={(e) => handleChange('standard_warning_message', e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="input-standard-warning-message"
              />
              <p className="text-xs text-muted-foreground">
                This message appears when a remark matches a blacklisted word
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-muted" />

      {/* AI Quality Check Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium text-sm">AI Quality Check</h4>
              <p className="text-xs text-muted-foreground">
                Enhanced validation using Sarvam AI (requires API key)
              </p>
            </div>
          </div>
          <Switch
            checked={localSettings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
            data-testid="switch-ai-check-enabled"
          />
        </div>

        {localSettings.enabled && (
          <div className="space-y-4 pl-8 border-l-2 border-muted">
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
                {" "}(free tier available)
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
              <Label htmlFor="ai-warning-message">Warning Message</Label>
              <Textarea
                id="ai-warning-message"
                placeholder="Please add more details about the conversation or outcome."
                value={localSettings.warning_message || ''}
                onChange={(e) => handleChange('warning_message', e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="input-ai-warning-message"
              />
              <p className="text-xs text-muted-foreground">
                This message appears when AI determines the remark is not meaningful
              </p>
            </div>
          </div>
        )}
      </div>

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

      <Separator className="my-6" />

      <BatchAIRatingSection apiKeyConfigured={!!localSettings.sarvam_api_key} />
    </div>
  );
}

function BatchAIRatingSection({ apiKeyConfigured }: { apiKeyConfigured: boolean }) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    successful: number;
    remaining?: number;
    timedOut?: boolean;
    results: Array<{ leadId: string; sheetId: string; success: boolean; rating?: string; score?: number }>;
  } | null>(null);

  // Check if API key is configured (either via settings or environment)
  const { data: statusData } = useQuery<{ apiKeyConfigured: boolean; source: string }>({
    queryKey: ["/api/ai-ratings/status"],
  });

  const isKeyAvailable = apiKeyConfigured || statusData?.apiKeyConfigured;

  const batchMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      return await apiRequest<{
        message: string;
        processed: number;
        successful: number;
        remaining?: number;
        timedOut?: boolean;
        results: Array<{ leadId: string; sheetId: string; success: boolean; rating?: string; score?: number }>;
      }>("POST", "/api/ai-ratings/batch-all", { limit: 100 });
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: data.timedOut ? "Partial Analysis Complete" : "Batch Analysis Complete",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run batch analysis.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const getRatingBadgeColor = (rating: string) => {
    switch (rating) {
      case 'Hot': return 'bg-red-500/20 text-red-600';
      case 'Warm': return 'bg-orange-500/20 text-orange-600';
      case 'Neutral': return 'bg-blue-500/20 text-blue-600';
      case 'Cold': return 'bg-cyan-500/20 text-cyan-600';
      case 'Poor': return 'bg-gray-500/20 text-gray-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-medium">AI Lead Rating - Batch Analysis</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Analyze all existing leads with 3+ follow-ups that haven't been rated yet. 
        This uses the Sarvam AI API to analyze followup remarks and assign quality ratings.
        Ratings will update in real-time as they're processed.
      </p>

      <div className="flex items-center gap-4">
        <Button
          onClick={() => batchMutation.mutate()}
          disabled={isProcessing || !isKeyAvailable}
          data-testid="button-batch-ai-rating"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Analyze All Unrated Leads
            </>
          )}
        </Button>

        {!isKeyAvailable && (
          <p className="text-sm text-yellow-600">
            Please configure and save your Sarvam API key above first (or set SARVAM_API_KEY environment variable).
          </p>
        )}
        
        {statusData?.source === 'environment' && !apiKeyConfigured && (
          <p className="text-sm text-green-600">
            Using environment API key
          </p>
        )}
      </div>

      {result && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Results</span>
            <span className="text-sm text-muted-foreground">
              {result.successful}/{result.processed} successfully rated
              {result.remaining ? ` (${result.remaining} remaining)` : ''}
            </span>
          </div>
          
          {result.timedOut && result.remaining && result.remaining > 0 && (
            <p className="text-sm text-yellow-600">
              Time limit reached. Click the button again to process remaining leads.
            </p>
          )}

          {result.results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {result.results.slice(0, 20).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.leadId.slice(0, 8)}...
                  </span>
                  {r.success ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRatingBadgeColor(r.rating || '')}`}>
                      {r.rating} ({r.score}/5)
                    </span>
                  ) : (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                </div>
              ))}
              {result.results.length > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  And {result.results.length - 20} more...
                </p>
              )}
            </div>
          )}

          {result.processed === 0 && (
            <p className="text-sm text-muted-foreground">
              No unrated leads with 3+ follow-ups found. All leads are already rated.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
