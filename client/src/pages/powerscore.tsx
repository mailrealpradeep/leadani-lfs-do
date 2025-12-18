import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Zap, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  Target,
  LogIn,
  FileEdit,
  ArrowRightLeft,
  Clock,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ChampionCard } from "@/components/powerscore/champion-card";
import { PodiumCard } from "@/components/powerscore/podium-card";
import { ContenderGrid } from "@/components/powerscore/contender-row";
import { ScoreTicker } from "@/components/powerscore/animated-counter";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry, PowerScorePersonalStats } from "@shared/schema";

type Period = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all_time';

const periodLabels: Record<Period, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  all_time: 'All Time',
};

interface LeaderboardResponse {
  leaderboard: PowerScoreLeaderboardEntry[];
  period: string;
}

interface HistoryEntry {
  id: string;
  action_type: string;
  points: number;
  description: string;
  created_at: string;
  rule_name?: string;
}

interface HistoryResponse {
  history: HistoryEntry[];
}

const actionTypeConfig: Record<string, { icon: typeof Zap; color: string; bgColor: string; label: string }> = {
  login: { 
    icon: LogIn, 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    label: "Login Bonus" 
  },
  lead_update: { 
    icon: FileEdit, 
    color: "text-emerald-600 dark:text-emerald-400", 
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    label: "Lead Update" 
  },
  dropdown_change: { 
    icon: ArrowRightLeft, 
    color: "text-purple-600 dark:text-purple-400", 
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
    label: "Status Change" 
  },
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 15 }}
      className={className}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

function PointsBreakdownCard({ history }: { history: HistoryEntry[] }) {
  const recentHistory = history.slice(0, 8);
  
  if (recentHistory.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800" data-testid="card-points-breakdown">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            >
              <Flame className="h-5 w-5 text-orange-500" />
            </motion.div>
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
              Recent Points Earned
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2" data-testid="list-points-history">
            <AnimatePresence mode="popLayout">
              {recentHistory.map((entry, index) => {
                const config = actionTypeConfig[entry.action_type] || actionTypeConfig.lead_update;
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05, type: "spring", damping: 20 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                    data-testid={`row-points-entry-${entry.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className={cn("p-2 rounded-lg", config.bgColor)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", damping: 10 }}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </motion.div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-none">
                          {entry.description || config.label}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.2, type: "spring" }}
                    >
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "font-bold text-sm px-3 py-1",
                          "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm"
                        )}
                        data-testid={`badge-points-${entry.id}`}
                      >
                        +{entry.points}
                      </Badge>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CompactPersonalStats({ stats }: { stats: PowerScorePersonalStats }) {
  const comparisons = [
    { 
      label: "Today",
      current: stats.today, 
      previous: stats.yesterday,
      previousLabel: "vs Yesterday",
      gradient: "from-amber-400 to-orange-500",
      icon: Zap,
    },
    { 
      label: "This Week",
      current: stats.this_week, 
      previous: stats.last_week,
      previousLabel: "vs Last Week",
      gradient: "from-blue-400 to-cyan-500",
      icon: Calendar,
    },
    { 
      label: "This Month",
      current: stats.this_month, 
      previous: stats.last_month,
      previousLabel: "vs Last Month",
      gradient: "from-purple-400 to-pink-500",
      icon: Target,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="border-0 shadow-lg overflow-hidden" data-testid="card-personal-stats">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <CardTitle className="text-base flex items-center gap-2">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 2 }}
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
            </motion.div>
            <span className="font-bold">Your Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="grid-personal-stats">
            {comparisons.map((comparison, index) => {
              const diff = comparison.previous === 0 
                ? (comparison.current > 0 ? 100 : 0)
                : ((comparison.current - comparison.previous) / comparison.previous) * 100;
              const isPositive = diff > 0;
              const isNegative = diff < 0;
              const Icon = comparison.icon;

              return (
                <motion.div
                  key={comparison.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
                  data-testid={`card-stat-${comparison.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={cn(
                    "absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20",
                    `bg-gradient-to-br ${comparison.gradient}`
                  )} />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", comparison.gradient)}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {comparison.label}
                        </span>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1, type: "spring" }}
                        className={cn(
                          "flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full",
                          isPositive && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                          isNegative && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                          !isPositive && !isNegative && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {isPositive && <TrendingUp className="h-3 w-3" />}
                        {isNegative && <TrendingDown className="h-3 w-3" />}
                        {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                        <span>{isPositive && "+"}{diff.toFixed(0)}%</span>
                      </motion.div>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        className="text-2xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                      >
                        <ScoreTicker value={comparison.current} size="lg" />
                      </motion.span>
                      <span className="text-xs text-muted-foreground">
                        {comparison.previousLabel}: {comparison.previous.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PowerScore() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('today');

  const { 
    data: leaderboardData, 
    isLoading: leaderboardLoading, 
    error: leaderboardError,
    refetch: refetchLeaderboard 
  } = useQuery<LeaderboardResponse>({
    queryKey: [`/api/powerscore/leaderboard?period=${period}`],
  });

  const { 
    data: personalStats, 
    isLoading: statsLoading 
  } = useQuery<PowerScorePersonalStats>({
    queryKey: ["/api/powerscore/my-stats"],
  });

  const { data: historyData } = useQuery<HistoryResponse>({
    queryKey: ["/api/powerscore/history?limit=10"],
  });

  const handleRefresh = () => {
    refetchLeaderboard();
    queryClient.invalidateQueries({ queryKey: ["/api/powerscore/my-stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/powerscore/history?limit=10"] });
  };

  const leaderboard = leaderboardData?.leaderboard || [];
  const champion = leaderboard[0];
  const podium = leaderboard.slice(1, 3);
  const contenders = leaderboard.slice(3);
  const history = historyData?.history || [];

  const userRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  if (leaderboardLoading || statsLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[150px]" />
          <Skeleton className="h-[150px]" />
        </div>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Alert variant="destructive">
          <Zap className="h-4 w-4" />
          <AlertTitle>Error loading PowerScore</AlertTitle>
          <AlertDescription>{(leaderboardError as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900" data-testid="powerscore-page">
      <motion.div 
        className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-2.5 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                PowerScore
              </span>
              {userRank > 0 && (
                <motion.span 
                  className="text-sm font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  #{userRank}
                </motion.span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Gamified leaderboard - earn points for your actions
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="shadow-sm"
            data-testid="button-refresh-powerscore"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>

      <motion.div 
        className="px-4 sm:px-6 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-5 max-w-md bg-white dark:bg-slate-800 shadow-sm">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <TabsTrigger 
                key={p} 
                value={p} 
                data-testid={`tab-period-${p}`}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
              >
                {periodLabels[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      <div className="flex-1 px-4 sm:px-6 pb-6 space-y-6 overflow-auto">
        {leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  No Scores Yet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400">How to Earn Points</AlertTitle>
                  <AlertDescription className="mt-2 text-amber-700 dark:text-amber-300">
                    Earn points by taking actions like creating leads, updating statuses, 
                    converting leads, and more. Each action has a point value configured by your admin.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {champion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 15 }}
              >
                <ChampionCard entry={champion} />
              </motion.div>
            )}

            {podium.length > 0 && (
              <motion.div 
                className="grid gap-4 sm:grid-cols-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {podium[0] && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <PodiumCard 
                      entry={podium[0]} 
                      rank={2}
                      pointsToFirst={champion ? champion.score - podium[0].score : undefined}
                    />
                  </motion.div>
                )}
                {podium[1] && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, type: "spring" }}
                  >
                    <PodiumCard 
                      entry={podium[1]} 
                      rank={3}
                      pointsToFirst={champion ? champion.score - podium[1].score : undefined}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {contenders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </motion.div>
                      <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">
                        Contenders
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <ContenderGrid 
                      entries={contenders}
                      currentUserId={user?.id}
                      top3Score={podium[1]?.score || champion?.score}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <PointsBreakdownCard history={history} />
        )}

        {personalStats && (
          <CompactPersonalStats stats={personalStats} />
        )}
      </div>
    </div>
  );
}
