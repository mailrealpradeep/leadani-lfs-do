import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalBestLabelProps {
  currentValue: number;
  previousValue: number;
  label: string;
  className?: string;
}

export function PersonalBestLabel({ 
  currentValue, 
  previousValue, 
  label,
  className 
}: PersonalBestLabelProps) {
  const diff = previousValue === 0 ? 0 : ((currentValue - previousValue) / previousValue) * 100;
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  const isNeutral = diff === 0;

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid={`personal-best-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          isPositive && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          isNegative && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          isNeutral && "bg-muted text-muted-foreground"
        )}
      >
        {isPositive && <TrendingUp className="h-3 w-3" />}
        {isNegative && <TrendingDown className="h-3 w-3" />}
        {isNeutral && <Minus className="h-3 w-3" />}
        <span>
          {isPositive && "+"}
          {diff.toFixed(1)}%
        </span>
      </motion.div>
    </div>
  );
}

interface PersonalStatsCardProps {
  stats: {
    today: number;
    yesterday: number;
    this_week: number;
    last_week: number;
    this_month: number;
    last_month: number;
  };
  className?: string;
}

export function PersonalStatsCard({ stats, className }: PersonalStatsCardProps) {
  const comparisons = [
    { 
      label: "Today vs Yesterday", 
      current: stats.today, 
      previous: stats.yesterday,
      currentLabel: "Today",
      previousLabel: "Yesterday",
    },
    { 
      label: "This Week vs Last Week", 
      current: stats.this_week, 
      previous: stats.last_week,
      currentLabel: "This Week",
      previousLabel: "Last Week",
    },
    { 
      label: "This Month vs Last Month", 
      current: stats.this_month, 
      previous: stats.last_month,
      currentLabel: "This Month",
      previousLabel: "Last Month",
    },
  ];

  return (
    <div className={cn("space-y-4", className)} data-testid="personal-stats-card">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span>Personal Bests</span>
      </div>

      <div className="grid gap-3">
        {comparisons.map((comparison) => {
          const diff = comparison.previous === 0 
            ? (comparison.current > 0 ? 100 : 0)
            : ((comparison.current - comparison.previous) / comparison.previous) * 100;
          const isPositive = diff > 0;
          const isNegative = diff < 0;

          return (
            <motion.div
              key={comparison.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{comparison.currentLabel}</div>
                <div className="font-bold text-lg">{comparison.current.toLocaleString()}</div>
              </div>

              <div className={cn(
                "flex flex-col items-center px-3",
                isPositive && "text-green-600 dark:text-green-400",
                isNegative && "text-red-600 dark:text-red-400",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && <TrendingUp className="h-5 w-5" />}
                {isNegative && <TrendingDown className="h-5 w-5" />}
                {!isPositive && !isNegative && <Minus className="h-5 w-5" />}
                <span className="text-sm font-medium">
                  {isPositive && "+"}
                  {diff.toFixed(0)}%
                </span>
              </div>

              <div className="space-y-1 text-right">
                <div className="text-xs text-muted-foreground">{comparison.previousLabel}</div>
                <div className="font-medium text-muted-foreground">{comparison.previous.toLocaleString()}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
