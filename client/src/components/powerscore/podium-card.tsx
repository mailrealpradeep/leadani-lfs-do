import { motion } from "framer-motion";
import { Medal, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScoreTicker } from "./animated-counter";
import { RankBadge } from "./badge-icon";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry } from "@shared/schema";

interface PodiumCardProps {
  entry: PowerScoreLeaderboardEntry;
  rank: 2 | 3;
  pointsToFirst?: number;
  className?: string;
}

const rankStyles = {
  2: {
    gradient: "from-gray-100 via-gray-200 to-gray-300",
    border: "border-gray-400",
    shadow: "shadow-gray-400/20",
    accent: "text-gray-700",
    bg: "bg-gray-100",
  },
  3: {
    gradient: "from-orange-100 via-orange-200 to-orange-300",
    border: "border-orange-400",
    shadow: "shadow-orange-400/20",
    accent: "text-orange-700",
    bg: "bg-orange-100",
  },
};

export function PodiumCard({ entry, rank, pointsToFirst, className }: PodiumCardProps) {
  const style = rankStyles[rank];
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank === 2 ? 0.1 : 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-4",
        `bg-gradient-to-br ${style.gradient}`,
        `shadow-lg ${style.shadow}`,
        "border",
        style.border,
        className
      )}
      data-testid={`podium-card-${rank}`}
    >
      <div className="absolute top-2 right-2 opacity-10">
        <Medal className="h-16 w-16" />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-white shadow-md">
            <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
            <AvatarFallback className={cn(style.bg, style.accent, "font-bold")}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <RankBadge rank={rank} size="sm" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold truncate", style.accent)} data-testid={`text-podium-name-${rank}`}>
            {entry.user_name}
          </h4>
          <ScoreTicker value={entry.score} size="md" className={style.accent} />
        </div>

        {pointsToFirst !== undefined && pointsToFirst > 0 && (
          <div className="text-right">
            <div className={cn("flex items-center gap-1 text-xs font-medium", style.accent)}>
              <TrendingUp className="h-3 w-3" />
              <span>{pointsToFirst.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground">to #1</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
