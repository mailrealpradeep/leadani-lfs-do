import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  Flame,
  Medal,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import type { TargetWithDetails } from "@shared/schema";

interface TeamTargetProgress {
  teamSize: number;
  usersWithTargets: number;
  targetsTracked: number;
  totalTargetsAssigned: number;
  totalAchieved: number;
  averageProgress: number;
  achievementRate: number;
  userProgress: {
    userId: string;
    userName: string;
    userEmail: string;
    targets: { targetId: string; targetName: string; percentage: number; isAchieved: boolean }[];
    averageProgress: number;
    achievedCount: number;
    totalTargets: number;
  }[];
}

interface TargetProgress {
  target: TargetWithDetails;
  goals: {
    goalId: string;
    goalName: string;
    currentValue: number;
    targetValue: number;
    percentage: number;
    isAchieved: boolean;
  }[];
  overallPercentage: number;
  isFullyAchieved: boolean;
}

function ProgressRing({ percentage, size = 60 }: { percentage: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  const getColor = () => {
    if (percentage >= 100) return "stroke-green-500";
    if (percentage >= 75) return "stroke-blue-500";
    if (percentage >= 50) return "stroke-yellow-500";
    if (percentage >= 25) return "stroke-orange-500";
    return "stroke-red-500";
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-muted"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${getColor()} transition-all duration-500`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

function getTimeRemaining(target: TargetWithDetails): string {
  const now = new Date();
  
  if (target.time_type === "recurring") {
    switch (target.recurring_frequency) {
      case "daily":
        const hoursLeft = 24 - now.getHours();
        return `${hoursLeft}h remaining`;
      case "weekly":
        const dayOfWeek = now.getDay();
        const daysToSunday = 7 - dayOfWeek;
        return `${daysToSunday}d remaining`;
      case "monthly":
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = lastDay - now.getDate();
        return `${daysLeft}d remaining`;
      default:
        return "";
    }
  }
  
  if (target.end_date) {
    const endDate = new Date(target.end_date);
    const daysRemaining = differenceInDays(endDate, now);
    if (daysRemaining < 0) return "Expired";
    if (daysRemaining === 0) return "Ends today";
    return `${daysRemaining}d remaining`;
  }
  
  return "";
}

function TargetProgressCard({ progress }: { progress: TargetProgress }) {
  const [expanded, setExpanded] = useState(false);
  const { target, goals, overallPercentage, isFullyAchieved } = progress;
  const timeRemaining = getTimeRemaining(target);

  const getStatusBadge = () => {
    if (isFullyAchieved) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Trophy className="h-3 w-3 mr-1" />
          Achieved
        </Badge>
      );
    }
    if (overallPercentage >= 75) {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Flame className="h-3 w-3 mr-1" />
          On Track
        </Badge>
      );
    }
    if (overallPercentage >= 50) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Attention
      </Badge>
    );
  };

  return (
    <Card className="hover-elevate" data-testid={`target-progress-${target.id}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProgressRing percentage={overallPercentage} />
                <div className="text-left">
                  <CardTitle className="text-lg">{target.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {target.time_type === "recurring"
                        ? target.recurring_frequency?.charAt(0).toUpperCase() + (target.recurring_frequency?.slice(1) || "")
                        : "One-time"}
                    </Badge>
                    {timeRemaining && (
                      <span className="text-xs text-muted-foreground">
                        {timeRemaining}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <Separator />
            
            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.goalId}
                  className="p-3 rounded-lg border"
                  data-testid={`goal-progress-${goal.goalId}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {goal.isAchieved ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Target className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{goal.goalName}</span>
                    </div>
                    <Badge variant={goal.isAchieved ? "default" : "outline"}>
                      {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Progress
                      value={Math.min(goal.percentage, 100)}
                      className="h-2"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{goal.percentage}% complete</span>
                      {goal.percentage > 100 && (
                        <span className="text-green-600 font-medium">
                          +{goal.percentage - 100}% overachieved!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {target.description && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{target.description}</p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function NoTargets() {
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <Target className="h-16 w-16 text-muted-foreground" />
        <div>
          <h3 className="font-semibold text-lg">No targets assigned</h3>
          <p className="text-muted-foreground mt-1">
            You don't have any active targets at the moment. Check back later or contact your admin.
          </p>
        </div>
      </div>
    </Card>
  );
}

function TeamUserProgressCard({ 
  userProgress 
}: { 
  userProgress: TeamTargetProgress['userProgress'][0] 
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid={`team-user-progress-${userProgress.userId}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full" data-testid={`team-user-toggle-${userProgress.userId}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProgressRing percentage={userProgress.averageProgress} size={48} />
                <div className="text-left">
                  <CardTitle className="text-base" data-testid={`team-user-name-${userProgress.userId}`}>{userProgress.userName}</CardTitle>
                  <p className="text-xs text-muted-foreground" data-testid={`team-user-email-${userProgress.userId}`}>{userProgress.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={userProgress.achievedCount === userProgress.totalTargets && userProgress.totalTargets > 0 ? "default" : "outline"} data-testid={`team-user-achieved-${userProgress.userId}`}>
                  {userProgress.achievedCount}/{userProgress.totalTargets} achieved
                </Badge>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2" data-testid={`team-user-targets-list-${userProgress.userId}`}>
            <Separator />
            {userProgress.targets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No targets assigned</p>
            ) : (
              userProgress.targets.map((target) => (
                <div
                  key={target.targetId}
                  className="flex items-center justify-between p-2 rounded-lg border"
                  data-testid={`team-target-row-${target.targetId}`}
                >
                  <div className="flex items-center gap-2">
                    {target.isAchieved ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm" data-testid={`team-target-name-${target.targetId}`}>{target.targetName}</span>
                  </div>
                  <Badge variant={target.isAchieved ? "default" : "outline"} data-testid={`team-target-progress-${target.targetId}`}>
                    {target.percentage}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function TeamTargetProgressView() {
  const { data: teamProgress, isLoading, error } = useQuery<TeamTargetProgress>({
    queryKey: ["/api/targets/team/progress"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !teamProgress) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Users className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg">Unable to load team progress</h3>
            <p className="text-muted-foreground mt-1">
              Please try again later or check your connection.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (teamProgress.teamSize === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Users className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg">No team members</h3>
            <p className="text-muted-foreground mt-1">
              Add team members to start tracking their target progress.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="team-target-progress-view">
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="stat-team-members">
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
            <CardTitle className="text-3xl" data-testid="value-team-members">{teamProgress.teamSize}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-active-targets">
          <CardHeader className="pb-2">
            <CardDescription>Active Targets</CardDescription>
            <CardTitle className="text-3xl" data-testid="value-active-targets">{teamProgress.targetsTracked}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-team-avg-progress">
          <CardHeader className="pb-2">
            <CardDescription>Team Avg Progress</CardDescription>
            <CardTitle className="text-3xl text-blue-600" data-testid="value-team-avg-progress">{teamProgress.averageProgress}%</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-achievement-rate">
          <CardHeader className="pb-2">
            <CardDescription>Achievement Rate</CardDescription>
            <CardTitle className="text-3xl text-green-600" data-testid="value-achievement-rate">{teamProgress.achievementRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Member Progress
        </h2>
        <div className="grid gap-3 md:grid-cols-2" data-testid="team-member-progress-grid">
          {teamProgress.userProgress.map((userProg) => (
            <TeamUserProgressCard key={userProg.userId} userProgress={userProg} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserTargetProgress() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  
  // For admins, show team progress view
  if (isAdmin) {
    return <TeamTargetProgressView />;
  }
  
  const { data: progressData = [], isLoading, error } = useQuery<TargetProgress[]>({
    queryKey: ["/api/targets/my/progress"],
    enabled: !!user,
    retry: false,
  });

  const isEmptyState = !isLoading && (progressData.length === 0 || error);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (isEmptyState) {
    return <NoTargets />;
  }

  const achievedCount = progressData.filter(p => p.isFullyAchieved).length;
  const totalProgress = progressData.reduce((sum, p) => sum + p.overallPercentage, 0) / progressData.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Targets</CardDescription>
            <CardTitle className="text-3xl">{progressData.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Achieved</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {achievedCount} / {progressData.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Progress</CardDescription>
            <CardTitle className="text-3xl">{Math.round(totalProgress)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Your Targets
        </h2>
        {progressData.map((progress) => (
          <TargetProgressCard key={progress.target.id} progress={progress} />
        ))}
      </div>
    </div>
  );
}

export function CompactTargetWidget() {
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  
  // Regular user progress query
  const { data: progressData = [], isLoading: loadingPersonal } = useQuery<TargetProgress[]>({
    queryKey: ["/api/targets/my/progress"],
    enabled: !!user && !isAdmin,
  });

  // Admin team progress query
  const { data: teamProgress, isLoading: loadingTeam } = useQuery<TeamTargetProgress>({
    queryKey: ["/api/targets/team/progress"],
    enabled: !!user && isAdmin,
  });

  const isLoading = isAdmin ? loadingTeam : loadingPersonal;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Admin view - show team progress
  if (isAdmin && teamProgress) {
    if (teamProgress.teamSize === 0) {
      return null;
    }

    return (
      <Card className="hover-elevate" data-testid="team-target-widget">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Target Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {teamProgress.achievementRate}%
              </div>
              <div className="text-xs text-muted-foreground">Achievement Rate</div>
            </div>
            <div className="text-right">
              <ProgressRing percentage={teamProgress.averageProgress} size={48} />
              <div className="text-xs text-muted-foreground mt-1">
                Avg Progress
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular user view
  if (progressData.length === 0) {
    return null;
  }

  const achievedCount = progressData.filter(p => p.isFullyAchieved).length;
  const topTarget = progressData.sort((a, b) => b.overallPercentage - a.overallPercentage)[0];

  return (
    <Card className="hover-elevate" data-testid="personal-target-widget">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          Target Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {achievedCount}/{progressData.length}
            </div>
            <div className="text-xs text-muted-foreground">Targets achieved</div>
          </div>
          {topTarget && (
            <div className="text-right">
              <ProgressRing percentage={topTarget.overallPercentage} size={48} />
              <div className="text-xs text-muted-foreground mt-1 truncate max-w-24">
                {topTarget.target.name}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
