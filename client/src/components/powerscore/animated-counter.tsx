import { useAnimatedCounter } from "@/hooks/use-score-animations";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  showSign?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  prefix = "",
  suffix = "",
  showSign = false,
}: AnimatedCounterProps) {
  const displayValue = useAnimatedCounter(value, { duration, easing: "easeOut" });

  const formattedValue = displayValue.toLocaleString();
  const sign = showSign && value > 0 ? "+" : "";

  return (
    <span className={cn("tabular-nums font-bold", className)} data-testid="animated-counter">
      {prefix}
      {sign}
      {formattedValue}
      {suffix}
    </span>
  );
}

interface ScoreTickerProps {
  value: number;
  previousValue?: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export function ScoreTicker({ value, className, size = "md" }: ScoreTickerProps) {
  const displayValue = useAnimatedCounter(value, { duration: 800, easing: "easeOut" });

  return (
    <div className={cn("font-bold tabular-nums tracking-tight", sizeClasses[size], className)} data-testid="score-ticker">
      {displayValue.toLocaleString()}
    </div>
  );
}
