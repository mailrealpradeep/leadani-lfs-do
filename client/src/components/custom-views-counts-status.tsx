import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomViewsCountsStatusProps {
  isInitialLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  computedAtMs?: number;
  onRetry?: () => void;
  className?: string;
}

export function CustomViewsCountsStatus({
  isInitialLoading,
  isFetching,
  isError,
  computedAtMs,
  onRetry,
  className,
}: CustomViewsCountsStatusProps) {
  const [showFreshBanner, setShowFreshBanner] = useState(false);
  const [dismissedFresh, setDismissedFresh] = useState(false);
  const [ageTick, setAgeTick] = useState(0);
  const wasFetchingRef = useRef(false);
  const hadDataRef = useRef(false);

  useEffect(() => {
    if (computedAtMs) {
      hadDataRef.current = true;
    }
  }, [computedAtMs]);

  useEffect(() => {
    if (isFetching) {
      wasFetchingRef.current = true;
      return;
    }

    if (wasFetchingRef.current && hadDataRef.current && !isInitialLoading) {
      wasFetchingRef.current = false;
      setDismissedFresh(false);
      setShowFreshBanner(true);
      const timer = window.setTimeout(() => setShowFreshBanner(false), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [isFetching, isInitialLoading]);

  useEffect(() => {
    if (!isFetching || !computedAtMs || isInitialLoading) return;
    const timer = window.setInterval(() => setAgeTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isFetching, computedAtMs, isInitialLoading]);

  const ageSeconds = computedAtMs
    ? Math.max(0, Math.floor((Date.now() - computedAtMs) / 1000))
    : 0;
  void ageTick;

  if (isInitialLoading) {
    return null;
  }

  if (showFreshBanner && !dismissedFresh) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
          className,
        )}
        role="status"
        aria-live="polite"
        data-testid="custom-views-counts-fresh"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Fresh data</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          onClick={() => {
            setDismissedFresh(true);
            setShowFreshBanner(false);
          }}
          aria-label="Dismiss fresh data notice"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive",
          className,
        )}
        role="alert"
        data-testid="custom-views-counts-error"
      >
        <span>Couldn&apos;t refresh counts</span>
        {onRetry && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isFetching && computedAtMs) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
          className,
        )}
        role="status"
        aria-live="polite"
        data-testid="custom-views-counts-stale"
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {ageSeconds >= 1 ? (
            <>
              Data is <strong>{ageSeconds}s</strong> old · Refreshing fresh data…
            </>
          ) : (
            <>Refreshing fresh data…</>
          )}
        </span>
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 ml-auto" />
      </div>
    );
  }

  return null;
}
