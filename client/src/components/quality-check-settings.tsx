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

interface JobProgress {
  jobId: string;
  companyId: string;
  status: string;
  totalLeads: number;
  processedLeads: number;
  successfulRatings: number;
  failedRatings: number;
  currentBatch: number;
  message: string;
  percentComplete: number;
}

function BatchAIRatingSection({ apiKeyConfigured }: { apiKeyConfigured: boolean }) {
  const { toast } = useToast();
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);

  const { data: statusData } = useQuery<{ apiKeyConfigured: boolean; source: string }>({
    queryKey: ["/api/ai-ratings/status"],
  });

  const { data: activeJobData, refetch: refetchActiveJob } = useQuery<{ job: JobProgress | null }>({
    queryKey: ["/api/ai-ratings/jobs"],
    refetchInterval: jobProgress?.status === 'running' || jobProgress?.status === 'pending' ? 3000 : false,
  });

  const isKeyAvailable = apiKeyConfigured || statusData?.apiKeyConfigured;

  useEffect(() => {
    if (activeJobData?.job) {
      setJobProgress(activeJobData.job);
    }
  }, [activeJobData]);

  useEffect(() => {
    const handleJobProgress = (progress: JobProgress) => {
      setJobProgress(progress);
      if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      }
    };

    const socket = (window as any).__socket;
    if (socket) {
      socket.on('ai_rating_job_progress', handleJobProgress);
      return () => {
        socket.off('ai_rating_job_progress', handleJobProgress);
      };
    }
  }, []);

  const startJobMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ message: string; job: JobProgress; totalLeads?: number }>("POST", "/api/ai-ratings/jobs");
    },
    onSuccess: (data) => {
      if (data.job) {
        setJobProgress(data.job);
      } else if (data.totalLeads === 0) {
        toast({
          title: "All Done!",
          description: data.message,
        });
      }
      refetchActiveJob();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start rating job.",
        variant: "destructive",
      });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      if (!jobProgress?.jobId) return;
      return await apiRequest("DELETE", `/api/ai-ratings/jobs/${jobProgress.jobId}`);
    },
    onSuccess: () => {
      toast({
        title: "Cancellation Requested",
        description: "The job will stop after completing the current lead.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel job.",
        variant: "destructive",
      });
    },
  });

  const isJobActive = jobProgress?.status === 'running' || jobProgress?.status === 'pending';
  const isJobComplete = jobProgress?.status === 'completed';
  const isJobFailed = jobProgress?.status === 'failed';
  const isJobCancelled = jobProgress?.status === 'cancelled';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-medium">AI Lead Rating - Batch Analysis</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Analyze all existing leads with 3+ follow-ups that haven't been rated yet. 
        Click once and the system will automatically process all leads in the background.
        Ratings will update in real-time as they're processed.
      </p>

      <div className="flex items-center gap-4">
        <Button
          onClick={() => startJobMutation.mutate()}
          disabled={startJobMutation.isPending || isJobActive || !isKeyAvailable}
          data-testid="button-batch-ai-rating"
        >
          {startJobMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : isJobActive ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Analyze All Unrated Leads
            </>
          )}
        </Button>

        {isJobActive && (
          <Button
            variant="outline"
            onClick={() => cancelJobMutation.mutate()}
            disabled={cancelJobMutation.isPending}
            data-testid="button-cancel-ai-rating"
          >
            {cancelJobMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ListX className="h-4 w-4 mr-2" />
            )}
            Cancel
          </Button>
        )}

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

      {jobProgress && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-2">
              {isJobActive && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              {isJobComplete && <Sparkles className="h-4 w-4 text-green-500" />}
              {isJobFailed && <ListX className="h-4 w-4 text-red-500" />}
              {isJobCancelled && <ListX className="h-4 w-4 text-yellow-500" />}
              {isJobActive ? 'Processing...' : isJobComplete ? 'Completed!' : isJobFailed ? 'Failed' : isJobCancelled ? 'Cancelled' : 'Status'}
            </span>
            <span className="text-sm text-muted-foreground">
              {jobProgress.successfulRatings}/{jobProgress.processedLeads} rated
              {jobProgress.totalLeads > 0 && ` of ${jobProgress.totalLeads} total`}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{jobProgress.message}</span>
              <span>{jobProgress.percentComplete}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  isJobComplete ? 'bg-green-500' : 
                  isJobFailed ? 'bg-red-500' : 
                  isJobCancelled ? 'bg-yellow-500' : 
                  'bg-purple-500'
                }`}
                style={{ width: `${jobProgress.percentComplete}%` }}
              />
            </div>
          </div>

          {jobProgress.failedRatings > 0 && (
            <p className="text-xs text-yellow-600">
              {jobProgress.failedRatings} leads failed to rate (API errors or no valid remarks)
            </p>
          )}

          {isJobComplete && (
            <p className="text-sm text-green-600">
              All eligible leads have been rated! New leads with 3+ followups will be rated automatically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
