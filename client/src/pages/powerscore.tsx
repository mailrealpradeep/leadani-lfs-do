import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Zap, 
  Calendar,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ChampionCard } from "@/components/powerscore/champion-card";
import { PodiumCard } from "@/components/powerscore/podium-card";
import { ContenderGrid } from "@/components/powerscore/contender-row";
import { PersonalStatsCard } from "@/components/powerscore/personal-best-label";
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

export default function PowerScore() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('today');

  const { 
    data: leaderboardData, 
    isLoading: leaderboardLoading, 
    error: leaderboardError,
    refetch: refetchLeaderboard 
  } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/powerscore/leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/powerscore/leaderboard?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { 
    data: personalStats, 
    isLoading: statsLoading 
  } = useQuery<PowerScorePersonalStats>({
    queryKey: ["/api/powerscore/my-stats"],
  });

  const handleRefresh = () => {
    refetchLeaderboard();
    queryClient.invalidateQueries({ queryKey: ["/api/powerscore/my-stats"] });
  };

  const leaderboard = leaderboardData?.leaderboard || [];
  const champion = leaderboard[0];
  const podium = leaderboard.slice(1, 3);
  const contenders = leaderboard.slice(3);

  const userRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1;
  const userEntry = leaderboard.find(e => e.user_id === user?.id);

  if (leaderboardLoading || statsLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
        <Skeleton className="h-[400px]" />
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
    <div className="flex-1 flex flex-col overflow-auto h-full" data-testid="powerscore-page">
      <div className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              PowerScore
              {userRank > 0 && (
                <motion.span 
                  className="text-sm font-normal text-muted-foreground"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  You're #{userRank}
                </motion.span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Gamified leaderboard - earn points for your actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            data-testid="button-refresh-powerscore"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-5 max-w-md">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <TabsTrigger key={p} value={p} data-testid={`tab-period-${p}`}>
                {periodLabels[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-6 space-y-6 overflow-auto">
        {personalStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PersonalStatsCard stats={personalStats} />
            </CardContent>
          </Card>
        )}

        {leaderboard.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                No Scores Yet
              </CardTitle>
              <CardDescription>
                Start working to earn your first PowerScore points!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>How to Earn Points</AlertTitle>
                <AlertDescription className="mt-2">
                  Earn points by taking actions like creating leads, updating statuses, 
                  converting leads, and more. Each action has a point value configured by your admin.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {champion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ChampionCard entry={champion} />
              </motion.div>
            )}

            {podium.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {podium[0] && (
                  <PodiumCard 
                    entry={podium[0]} 
                    rank={2}
                    pointsToFirst={champion ? champion.score - podium[0].score : undefined}
                  />
                )}
                {podium[1] && (
                  <PodiumCard 
                    entry={podium[1]} 
                    rank={3}
                    pointsToFirst={champion ? champion.score - podium[1].score : undefined}
                  />
                )}
              </div>
            )}

            {contenders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Contenders
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
