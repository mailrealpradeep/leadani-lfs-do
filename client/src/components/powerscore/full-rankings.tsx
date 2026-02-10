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
  TrendingUp,
  PenLine,
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

interface BreakdownDetail {
  description: string;
  points: number;
  created_at: string;
}

interface BreakdownEntry {
  rule_id: string;
  rule_name: string;
  action_type: string;
  points_earned: number;
  transaction_count: number;
  daily_cap: number | null;
  details?: BreakdownDetail[];
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
  admin_manual: {
    icon: PenLine,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
};

const rankIcons: Record<number, { icon: typeof Trophy; color: string }> = {
  1: { icon: Crown, color: "text-amber-500" },
  2: { icon: Medal, color: "text-gray-400" },
  3: { icon: Award, color: "text-orange-500" },
};

function ManualPointDetails({ details }: { details: BreakdownDetail[] }) {
  return (
    <div className="ml-9 mt-1.5 space-y-1">
      {details.map((detail, i) => {
        const reasonMatch = detail.description?.match(/\(([^)]+)\)$/);
        const reason = reasonMatch ? reasonMatch[1] : detail.description || 'Manual adjustment';
        const adminMatch = detail.description?.match(/^Manual Point by ([^(]+)/);
        const adminName = adminMatch ? adminMatch[1].trim() : '';
        
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-md bg-muted/50"
            data-testid={`manual-detail-${i}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground shrink-0">
                {detail.points > 0 ? '+' : ''}{detail.points} pts
              </span>
              <span className="truncate">{reason}</span>
            </div>
            {adminName && (
              <span className="text-muted-foreground shrink-0 text-[10px]">
                by {adminName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PointsBreakdown({ userId, period }: { userId: string; period: string }) {
  const [expandedManual, setExpandedManual] = useState<string | null>(null);
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
            const capReached = entry.daily_cap && entry.points_earned >= entry.daily_cap;
            const progressValue = entry.daily_cap 
              ? Math.min(100, Math.round((entry.points_earned / entry.daily_cap) * 100))
              : 100;
            const hasDetails = entry.details && entry.details.length > 0;
            const entryKey = entry.action_type === 'admin_manual' ? `admin_manual_${index}` : entry.rule_id;
            const isExpanded = expandedManual === entryKey;
            
            return (
              <div key={entryKey}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-3",
                    hasDetails && "cursor-pointer"
                  )}
                  onClick={hasDetails ? () => setExpandedManual(isExpanded ? null : entryKey) : undefined}
                  data-testid={`breakdown-entry-${entryKey}`}
                >
                  <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-sm font-medium truncate">{entry.rule_name}</span>
                        {hasDetails && (
                          <ChevronDown className={cn(
                            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {entry.transaction_count} {entry.transaction_count === 1 ? 'action' : 'actions'}, {entry.points_earned} pts
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-1.5" />
                  </div>
                  
                  {capReached ? (
                    <Badge 
                      variant="outline" 
                      className="text-xs font-medium min-w-[85px] justify-center bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700"
                    >
                      Cap Reached
                    </Badge>
                  ) : entry.daily_cap ? (
                    <span className="text-xs text-muted-foreground min-w-[85px] text-right">
                      {entry.points_earned} / {entry.daily_cap}
                    </span>
                  ) : null}
                </motion.div>
                
                <AnimatePresence>
                  {isExpanded && hasDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ManualPointDetails details={entry.details!} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
  leaderboard,
}: { 
  entry: PowerScoreLeaderboardEntry; 
  rank: number; 
  isCurrentUser: boolean;
  period: string;
  isExpanded: boolean;
  onToggle: () => void;
  leaderboard: PowerScoreLeaderboardEntry[];
}) {
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const RankIcon = rankIcons[rank]?.icon || Trophy;
  const rankColor = rankIcons[rank]?.color || "text-muted-foreground";

  const getPointsToReach = () => {
    if (rank === 1) return null;
    
    if (rank === 2) {
      const top1Score = leaderboard[0]?.score || 0;
      const gap = Math.max(0, top1Score - entry.score);
      return { points: gap, targetRank: "#1" };
    }
    
    if (rank === 3) {
      const top2Score = leaderboard[1]?.score || 0;
      const gap = Math.max(0, top2Score - entry.score);
      return { points: gap, targetRank: "#2" };
    }
    
    const top3Score = leaderboard[2]?.score || 0;
    const gap = Math.max(0, top3Score - entry.score);
    return { points: gap, targetRank: "Top 3" };
  };

  const pointsToReach = getPointsToReach();

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
            {pointsToReach && pointsToReach.points > 0 && (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span 
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
                  data-testid={`text-gap-to-rank-${rank}`}
                >
                  {pointsToReach.points} pts to {pointsToReach.targetRank}
                </span>
              </div>
            )}
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
              leaderboard={leaderboard}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
