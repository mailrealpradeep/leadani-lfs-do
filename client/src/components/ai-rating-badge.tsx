import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Star, RefreshCw, Loader2, Sparkles, TrendingUp, MessageSquare, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AIRatingCategory = 'New' | 'Hot' | 'Warm' | 'Neutral' | 'Cold' | 'Poor';

interface AIRatingDetails {
  engagement_score: number;
  sentiment_score: number;
  progression_score: number;
  followup_count: number;
  key_signals: string[];
  last_remarks: string[];
}

interface AIRatingBadgeProps {
  leadId: string;
  rating?: AIRatingCategory | null;
  score?: number | null;
  summary?: string | null;
  details?: AIRatingDetails | null;
  updatedAt?: string | null;
  compact?: boolean;
  showRefresh?: boolean;
}

const ratingColors: Record<AIRatingCategory, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted-foreground/30" },
  Hot: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/30" },
  Warm: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
  Neutral: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/30" },
  Cold: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  Poor: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
};

function StarRating({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i <= fullStars
              ? "fill-yellow-400 text-yellow-400"
              : i === fullStars + 1 && hasHalf
              ? "fill-yellow-400/50 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function AIRatingBadge({
  leadId,
  rating,
  score,
  summary,
  details,
  updatedAt,
  compact = false,
  showRefresh = true,
}: AIRatingBadgeProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/ai-rating`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    refreshMutation.mutate();
  };

  const currentRating = rating || 'New';
  const colors = ratingColors[currentRating];

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${colors.bg} ${colors.text} ${colors.border} cursor-pointer text-xs px-1.5`}
            data-testid={`badge-ai-rating-${leadId}`}
          >
            {currentRating === 'New' ? (
              <span className="text-xs">New</span>
            ) : (
              <>
                <Star className="h-3 w-3 fill-current mr-0.5" />
                {score || 0}
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{currentRating}</div>
            {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} cursor-pointer gap-1`}
          data-testid={`badge-ai-rating-${leadId}`}
        >
          {currentRating === 'New' ? (
            <span>New</span>
          ) : (
            <>
              <StarRating score={score || 0} />
              <span>{currentRating}</span>
            </>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">AI Insights</span>
            </div>
            {showRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing || refreshMutation.isPending}
                className="h-7 px-2"
                data-testid="button-refresh-ai-rating"
              >
                {isRefreshing || refreshMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          {currentRating === 'New' ? (
            <div className="text-sm text-muted-foreground">
              <p>Less than 3 follow-ups recorded.</p>
              <p className="mt-1">AI analysis will be available after more interactions.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge className={`${colors.bg} ${colors.text}`}>{currentRating}</Badge>
                <StarRating score={score || 0} size="md" />
              </div>

              {summary && (
                <p className="text-sm text-muted-foreground">{summary}</p>
              )}

              {details && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                      <Activity className="h-3 w-3 mb-1 text-muted-foreground" />
                      <span className="font-medium">{details.engagement_score.toFixed(1)}</span>
                      <span className="text-muted-foreground">Engage</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                      <MessageSquare className="h-3 w-3 mb-1 text-muted-foreground" />
                      <span className="font-medium">{details.sentiment_score.toFixed(1)}</span>
                      <span className="text-muted-foreground">Sentiment</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                      <TrendingUp className="h-3 w-3 mb-1 text-muted-foreground" />
                      <span className="font-medium">{details.progression_score.toFixed(1)}</span>
                      <span className="text-muted-foreground">Progress</span>
                    </div>
                  </div>

                  {details.key_signals.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium">Key Signals:</span>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {details.key_signals.slice(0, 3).map((signal, i) => (
                          <li key={i}>{signal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {updatedAt && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Last analyzed: {new Date(updatedAt).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AIRatingCell({
  leadId,
  rating,
  score,
  summary,
  details,
  updatedAt,
}: AIRatingBadgeProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <AIRatingBadge
        leadId={leadId}
        rating={rating}
        score={score}
        summary={summary}
        details={details}
        updatedAt={updatedAt}
        compact
        showRefresh={false}
      />
    </div>
  );
}
