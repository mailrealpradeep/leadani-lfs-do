import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Users,
  LogIn,
  FileEdit,
  ArrowRightLeft,
  Target,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreTicker } from "./animated-counter";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry } from "@shared/schema";

interface FullRankingsProps {
  leaderboard: PowerScoreLeaderboardEntry[];
  currentUserId?: string;
  period: string;
}

interface BreakdownEntry {
  rule_id: string;
  rule_name: string;
  action_type: string;
  points_earned: number;
  daily_cap: number | null;
}

const actionTypeIcons: Record<string, { icon: typeof LogIn; color: string; bgColor: string }> = {
  login: { 
    icon: LogIn, 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40"
  },
  lead_update: { 
    icon: FileEdit, 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  dropdown_change: { 
    icon: ArrowRightLeft, 
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40"
  },
};

const rankIcons: Record<number, { icon: typeof Trophy; color: string }> = {
  1: { icon: Crown, color: "text-amber-500" },
  2: { icon: Medal, color: "text-gray-400" },
  3: { icon: Award, color: "text-orange-500" },
};

function PointsBreakdown({ userId, period }: { userId: string; period: string }) {
  const { data, isLoading } = useQuery<{ breakdown: BreakdownEntry[] }>({
    queryKey: [`/api/powerscore/breakdown/${userId}?period=${period}`],
  });

  if (isLoading) {
    return (
      <div className="py-3 px-4 text-sm text-muted-foreground">
        Loading breakdown...
      </div>
    );
  }

  const breakdown = data?.breakdown || [];

  if (breakdown.length === 0) {
    return (
      <div className="py-3 px-4 text-sm text-muted-foreground">
        No points earned in this period
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-border/50 bg-muted/30"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Points Breakdown</span>
        </div>
        
        <div className="space-y-3">
          {breakdown.map((entry, index) => {
            const config = actionTypeIcons[entry.action_type] || actionTypeIcons.lead_update;
            const Icon = config.icon;
            const percentage = entry.daily_cap 
              ? Math.min(100, Math.round((entry.points_earned / entry.daily_cap) * 100))
              : 100;
            
            return (
              <motion.div
                key={entry.rule_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
                data-testid={`breakdown-entry-${entry.rule_id}`}
              >
                <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{entry.rule_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.points_earned}{entry.daily_cap ? ` / ${entry.daily_cap}` : ''}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
                
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-bold min-w-[48px] justify-center",
                    percentage >= 100 
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700" 
                      : ""
                  )}
                >
                  {percentage}%
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function RankingRow({ 
  entry, 
  rank, 
  isCurrentUser,
  period,
  isExpanded,
  onToggle,
}: { 
  entry: PowerScoreLeaderboardEntry; 
  rank: number; 
  isCurrentUser: boolean;
  period: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const RankIcon = rankIcons[rank]?.icon || Trophy;
  const rankColor = rankIcons[rank]?.color || "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.03 }}
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-colors",
        isCurrentUser && "ring-2 ring-blue-500/50 border-blue-500/30",
        isExpanded && "shadow-md"
      )}
      data-testid={`ranking-row-${rank}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
        data-testid={`button-expand-ranking-${rank}`}
      >
        <div className="flex items-center justify-center w-8">
          {rank <= 3 ? (
            <RankIcon className={cn("h-5 w-5", rankColor)} />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
          )}
        </div>
        
        <Avatar className={cn(
          "h-10 w-10 ring-2",
          isCurrentUser ? "ring-blue-500" : "ring-transparent"
        )}>
          <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" data-testid={`text-ranking-name-${rank}`}>
              {entry.user_name}
            </span>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                You
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate block">
            {entry.user_email}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <ScoreTicker value={entry.score} size="md" className="font-bold" />
          </div>
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <PointsBreakdown userId={entry.user_id} period={period} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FullRankings({ leaderboard, currentUserId, period }: FullRankingsProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleToggle = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  return (
    <Card className="border-0 shadow-lg" data-testid="card-full-rankings">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="font-bold">Full Rankings</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {leaderboard.length} participants
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <RankingRow
              key={entry.user_id}
              entry={entry}
              rank={index + 1}
              isCurrentUser={entry.user_id === currentUserId}
              period={period}
              isExpanded={expandedUserId === entry.user_id}
              onToggle={() => handleToggle(entry.user_id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
