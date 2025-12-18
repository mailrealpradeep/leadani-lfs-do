import { motion } from "framer-motion";
import { Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScoreTicker } from "./animated-counter";
import { BadgeStack } from "./badge-icon";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry } from "@shared/schema";

interface ChampionCardProps {
  entry: PowerScoreLeaderboardEntry;
  previousScore?: number;
  className?: string;
}

export function ChampionCard({ entry, previousScore, className }: ChampionCardProps) {
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const scoreChange = previousScore !== undefined ? entry.score - previousScore : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500",
        "shadow-2xl shadow-amber-500/30",
        className
      )}
      data-testid="champion-card"
    >
      <div className="absolute top-0 right-0 opacity-20">
        <Crown className="h-32 w-32 -rotate-12 translate-x-8 -translate-y-4" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 10 }}
          className="relative"
        >
          <div className="absolute -inset-2 rounded-full bg-white/30 blur-md" />
          <Avatar className="h-24 w-24 border-4 border-white shadow-xl relative">
            <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
            <AvatarFallback className="bg-amber-600 text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg"
          >
            <Crown className="h-6 w-6 text-amber-500" />
          </motion.div>
        </motion.div>

        <div className="space-y-1">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-amber-900 drop-shadow-sm"
            data-testid="text-champion-name"
          >
            {entry.user_name}
          </motion.h3>
          <p className="text-sm text-amber-800/80 font-medium">Champion</p>
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="space-y-1"
        >
          <ScoreTicker
            value={entry.score}
            size="xl"
            className="text-amber-900 drop-shadow-sm"
          />
          {scoreChange !== null && scoreChange !== 0 && (
            <div className={cn(
              "flex items-center justify-center gap-1 text-sm font-medium",
              scoreChange > 0 ? "text-green-700" : "text-red-700"
            )}>
              {scoreChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : scoreChange < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>{scoreChange > 0 ? "+" : ""}{scoreChange}</span>
            </div>
          )}
        </motion.div>

        {entry.badges && entry.badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <BadgeStack
              badges={entry.badges.map((b) => ({
                icon: b.icon,
                color: b.color,
                name: b.name,
              }))}
              maxVisible={4}
              size="md"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
