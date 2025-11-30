import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trophy,
  Medal,
  Target,
  TrendingUp,
  TrendingDown,
  Crown,
  Star,
  Users,
  Calendar,
  ChevronRight,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TargetWithDetails, User } from "@shared/schema";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalTargets: number;
  achievedTargets: number;
  averageProgress: number;
  rank: number;
  previousRank: number | null;
  targets: {
    targetId: string;
    targetName: string;
    percentage: number;
    isAchieved: boolean;
  }[];
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900">
        <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800">
        <Medal className="h-5 w-5 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900">
        <Medal className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-10 w-10 rounded-full border">
      <span className="text-lg font-semibold text-muted-foreground">{rank}</span>
    </div>
  );
}

function RankChange({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return <Badge variant="outline">New</Badge>;
  }
  const diff = previous - current;
  if (diff === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (diff > 0) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{diff}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      <TrendingDown className="h-3 w-3 mr-1" />
      {diff}
    </Badge>
  );
}

function TopPerformersCards({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  
  if (top3.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {top3.map((entry, index) => (
        <Card
          key={entry.userId}
          className={`relative overflow-hidden ${
            index === 0
              ? "border-yellow-300 dark:border-yellow-600"
              : index === 1
              ? "border-gray-300 dark:border-gray-600"
              : "border-orange-300 dark:border-orange-600"
          }`}
          data-testid={`top-performer-${index + 1}`}
        >
          {index === 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600" />
          )}
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <RankBadge rank={index + 1} />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{entry.userName}</CardTitle>
                <CardDescription className="truncate">{entry.userEmail}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-2xl font-bold">{Math.round(entry.averageProgress)}%</span>
            </div>
            <Progress value={entry.averageProgress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <Trophy className="h-4 w-4 inline mr-1" />
                {entry.achievedTargets}/{entry.totalTargets} achieved
              </span>
              <RankChange current={entry.rank} previous={entry.previousRank} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaderboardTable({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-center">Targets</TableHead>
            <TableHead className="text-center">Achieved</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-center">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.userId}
              className={entry.userId === currentUserId ? "bg-muted/50" : ""}
              data-testid={`leaderboard-row-${entry.userId}`}
            >
              <TableCell>
                <RankBadge rank={entry.rank} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {entry.userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{entry.userName}</div>
                    <div className="text-sm text-muted-foreground">{entry.userEmail}</div>
                  </div>
                  {entry.userId === currentUserId && (
                    <Badge variant="outline" className="ml-2">You</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{entry.totalTargets}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {entry.achievedTargets}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="w-full max-w-32 space-y-1">
                  <Progress value={entry.averageProgress} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(entry.averageProgress)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <RankChange current={entry.rank} previous={entry.previousRank} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TargetLeaderboard({ targetId }: { targetId: string }) {
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/targets", targetId, "leaderboard"],
    enabled: !!targetId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No participants for this target yet.
      </div>
    );
  }

  return <LeaderboardTable entries={entries} />;
}

export default function Leaderboard() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  const [selectedTarget, setSelectedTarget] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("current");
  const { toast } = useToast();

  const { data: targets = [] } = useQuery<TargetWithDetails[]>({
    queryKey: ["/api/targets"],
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
    enabled: isAdmin,
  });

  const { data: myProgress = [] } = useQuery<any[]>({
    queryKey: ["/api/targets/my/progress"],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (selectedTarget !== "all") {
        return apiRequest("POST", `/api/targets/${selectedTarget}/recalculate-all`);
      }
      const activeTargets = targets.filter(t => t.status === "active");
      await Promise.all(
        activeTargets.map(t => apiRequest("POST", `/api/targets/${t.id}/recalculate-all`))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Leaderboard refreshed" });
    },
    onError: (error: any) => {
      toast({
        title: "Error refreshing leaderboard",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buildLeaderboardData = (): LeaderboardEntry[] => {
    if (!isAdmin || !users.length) {
      if (myProgress.length === 0) return [];
      
      return [{
        userId: user?.id || "",
        userName: user?.name || "You",
        userEmail: user?.email || "",
        totalTargets: myProgress.length,
        achievedTargets: myProgress.filter((p: any) => p.isFullyAchieved).length,
        averageProgress: myProgress.reduce((sum: number, p: any) => sum + p.overallPercentage, 0) / myProgress.length,
        rank: 1,
        previousRank: null,
        targets: myProgress.map((p: any) => ({
          targetId: p.target.id,
          targetName: p.target.name,
          percentage: p.overallPercentage,
          isAchieved: p.isFullyAchieved,
        })),
      }];
    }

    const activeTargets = selectedTarget === "all"
      ? targets.filter(t => t.status === "active")
      : targets.filter(t => t.id === selectedTarget);

    const userEntries = users
      .filter(u => u.is_active)
      .map(u => {
        const userTargets = activeTargets.filter(t =>
          t.assignment_type === "all_users" ||
          t.assigned_users?.some(au => au.id === u.id)
        );

        const totalTargets = userTargets.length;
        const achievedTargets = 0;
        const averageProgress = 0;

        return {
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          totalTargets,
          achievedTargets,
          averageProgress,
          rank: 0,
          previousRank: null,
          targets: userTargets.map(t => ({
            targetId: t.id,
            targetName: t.name,
            percentage: 0,
            isAchieved: false,
          })),
        };
      })
      .filter(e => e.totalTargets > 0)
      .sort((a, b) => b.averageProgress - a.averageProgress)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return userEntries;
  };

  const leaderboardData = buildLeaderboardData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track performance and celebrate achievements
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && targets.length > 0 && (
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger className="w-48" data-testid="select-target-filter">
                <SelectValue placeholder="Filter by target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                {targets
                  .filter(t => t.status === "active")
                  .map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36" data-testid="select-timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="refresh-leaderboard"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {leaderboardData.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No leaderboard data yet</h3>
              <p className="text-muted-foreground">
                {isAdmin
                  ? "Create targets and assign users to see the leaderboard"
                  : "You don't have any assigned targets yet"}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <TopPerformersCards entries={leaderboardData} />

          <Tabs defaultValue="ranking" className="space-y-4">
            <TabsList>
              <TabsTrigger value="ranking" data-testid="tab-ranking">
                <Users className="h-4 w-4 mr-2" />
                Rankings
              </TabsTrigger>
              <TabsTrigger value="my-progress" data-testid="tab-my-progress">
                <Target className="h-4 w-4 mr-2" />
                My Progress
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle>Team Rankings</CardTitle>
                  <CardDescription>
                    Performance ranking based on target completion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaderboardTable entries={leaderboardData} currentUserId={user?.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-progress">
              <Card>
                <CardHeader>
                  <CardTitle>Your Target Progress</CardTitle>
                  <CardDescription>
                    Detailed view of your performance on assigned targets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myProgress.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      You don't have any targets assigned.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myProgress.map((progress: any) => (
                        <div
                          key={progress.target.id}
                          className="p-4 rounded-lg border hover-elevate"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {progress.isFullyAchieved ? (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <Target className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-medium">{progress.target.name}</span>
                            </div>
                            <Badge variant={progress.isFullyAchieved ? "default" : "outline"}>
                              {progress.overallPercentage}%
                            </Badge>
                          </div>
                          <Progress value={progress.overallPercentage} className="h-2" />
                          <div className="mt-2 text-sm text-muted-foreground">
                            {progress.goals.filter((g: any) => g.isAchieved).length} of{" "}
                            {progress.goals.length} goals achieved
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
