import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry } from "@shared/schema";

interface ContenderRowProps {
  entry: PowerScoreLeaderboardEntry;
  index: number;
  pointsToTop3: number | null;
  isCurrentUser?: boolean;
  className?: string;
}

export function ContenderRow({ 
  entry, 
  index, 
  pointsToTop3, 
  isCurrentUser = false,
  className 
}: ContenderRowProps) {
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isCurrentUser 
          ? "bg-primary/10 border border-primary/20" 
          : "bg-card hover-elevate",
        className
      )}
      data-testid={`contender-row-${entry.rank}`}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
        entry.rank <= 6 ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground/70"
      )}>
        #{entry.rank}
      </div>

      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
        <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h5 className={cn(
          "font-medium truncate text-sm",
          isCurrentUser && "text-primary"
        )} data-testid={`text-contender-name-${entry.rank}`}>
          {entry.user_name}
          {isCurrentUser && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
        </h5>
      </div>

      <div className="text-right">
        <AnimatedCounter
          value={entry.score}
          className="text-lg font-bold"
        />
        {pointsToTop3 !== null && pointsToTop3 > 0 && (
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{pointsToTop3.toLocaleString()} to Top 3</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ContenderGridProps {
  entries: PowerScoreLeaderboardEntry[];
  currentUserId?: string;
  top3Score?: number;
}

export function ContenderGrid({ entries, currentUserId, top3Score }: ContenderGridProps) {
  return (
    <div className="space-y-2" data-testid="contender-grid">
      {entries.map((entry, index) => {
        const pointsToTop3 = top3Score !== undefined ? top3Score - entry.score + 1 : null;
        return (
          <ContenderRow
            key={entry.user_id}
            entry={entry}
            index={index}
            pointsToTop3={pointsToTop3}
            isCurrentUser={entry.user_id === currentUserId}
          />
        );
      })}
    </div>
  );
}
