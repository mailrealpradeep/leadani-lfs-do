import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  Flame,
  Award,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getUserAvatarProps } from "@/lib/avatar-icons";

interface TargetBreakdown {
  targetId: string;
  targetName: string;
  targetType: string;
  compliancePercentage: number | null;  // null indicates N/A (empty cohort)
  isAchieved: boolean;
  currentValue: number;
  targetValue: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  rank: number;
  previousRank: number | null;
  totalTargets: number;
  achievedTargets: number;
  averageCompliance: number;
  totalCurrentValue: number;
  totalTargetValue: number;
  targetBreakdown: TargetBreakdown[];
}

interface LeaderboardResult {
  entries: LeaderboardEntry[];
  dateRange: {
    start: string;
    end: string;
    preset: string;
  };
  totalUsers: number;
  totalTargets: number;
}

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

// Group presets by target type for visual organization
const datePresets: { value: DatePreset; label: string; icon: any; targetType: 'daily' | 'weekly' | 'monthly' }[] = [
  { value: 'today', label: 'Today', icon: Zap, targetType: 'daily' },
  { value: 'yesterday', label: 'Yesterday', icon: Calendar, targetType: 'daily' },
  { value: 'this_week', label: 'This Week', icon: Calendar, targetType: 'weekly' },
  { value: 'last_week', label: 'Last Week', icon: Calendar, targetType: 'weekly' },
  { value: 'this_month', label: 'This Month', icon: Calendar, targetType: 'monthly' },
  { value: 'last_month', label: 'Last Month', icon: Calendar, targetType: 'monthly' },
];

function CircularProgress({ 
  value, 
  size = 80, 
  strokeWidth = 8,
  showLabel = true,
  className = "",
  delay = 0 
}: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
  delay?: number;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(Math.min(value, 100));
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const getColor = () => {
    if (value >= 100) return 'stroke-green-500';
    if (value >= 75) return 'stroke-emerald-500';
    if (value >= 50) return 'stroke-amber-500';
    return 'stroke-orange-500';
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: delay / 1000 }}
          strokeLinecap="round"
          className={getColor()}
        />
      </svg>
      {showLabel && (
        <motion.div 
          className="absolute flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay / 1000 + 0.5, duration: 0.3 }}
        >
          <span className="text-lg font-bold">{Math.round(value)}%</span>
        </motion.div>
      )}
    </div>
  );
}

function RankChange({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return (
      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
        <Sparkles className="h-3 w-3 mr-1" />
        New
      </Badge>
    );
  }
  const diff = previous - current;
  if (diff === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  if (diff > 0) {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{diff}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-0">
      <TrendingDown className="h-3 w-3 mr-1" />
      {diff}
    </Badge>
  );
}

function PodiumCard({ 
  entry, 
  place, 
  isCurrentUser 
}: { 
  entry: LeaderboardEntry; 
  place: 1 | 2 | 3; 
  isCurrentUser: boolean;
}) {
  const placeConfig = {
    1: {
      height: 'h-48',
      order: 'order-2',
      gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
      bgGradient: 'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
      borderColor: 'border-yellow-300 dark:border-yellow-600',
      icon: Crown,
      iconColor: 'text-yellow-500',
      label: '1st',
      delay: 0.2,
    },
    2: {
      height: 'h-40',
      order: 'order-1',
      gradient: 'from-gray-300 via-gray-400 to-gray-500',
      bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/30',
      borderColor: 'border-gray-300 dark:border-gray-600',
      icon: Medal,
      iconColor: 'text-gray-400',
      label: '2nd',
      delay: 0.4,
    },
    3: {
      height: 'h-32',
      order: 'order-3',
      gradient: 'from-orange-400 via-amber-600 to-orange-700',
      bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30',
      borderColor: 'border-orange-300 dark:border-orange-600',
      icon: Medal,
      iconColor: 'text-orange-500',
      label: '3rd',
      delay: 0.6,
    },
  };

  const config = placeConfig[place];
  const IconComponent = config.icon;
  const avatarProps = getUserAvatarProps(entry.userId);
  const UserIcon = avatarProps.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: config.delay, 
        duration: 0.5, 
        type: "spring",
        stiffness: 200 
      }}
      className={cn("flex flex-col items-center", config.order)}
      data-testid={`podium-place-${place}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: config.delay + 0.3, type: "spring", stiffness: 300 }}
        className={cn(
          "relative mb-3 rounded-full p-1",
          `bg-gradient-to-br ${avatarProps.gradient}`
        )}
      >
        <Avatar className={cn(
          "border-4 border-background",
          place === 1 ? "h-24 w-24" : place === 2 ? "h-20 w-20" : "h-16 w-16"
        )}>
          <AvatarFallback className={cn(
            "flex items-center justify-center",
            avatarProps.bgColor
          )}>
            <UserIcon className={cn(
              avatarProps.iconColor,
              place === 1 ? "h-10 w-10" : place === 2 ? "h-8 w-8" : "h-6 w-6"
            )} />
          </AvatarFallback>
        </Avatar>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: config.delay + 0.5, type: "spring", stiffness: 400 }}
          className={cn(
            "absolute -top-1 -right-1 rounded-full p-1.5",
            `bg-gradient-to-br ${config.gradient}`,
            "shadow-lg"
          )}
        >
          <IconComponent className={cn("h-4 w-4 text-white")} />
        </motion.div>
        {isCurrentUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: config.delay + 0.7 }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
          >
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">
              You
            </Badge>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: config.delay + 0.4 }}
        className="text-center mb-2"
      >
        <p className="font-semibold text-sm truncate max-w-[90px] sm:max-w-[120px]">{entry.userName}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[90px] sm:max-w-[120px]">{entry.userEmail}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: config.delay + 0.5 }}
        className={cn(
          "w-24 sm:w-28 flex flex-col items-center justify-end rounded-t-xl border-2",
          config.height,
          config.borderColor,
          `bg-gradient-to-t ${config.bgGradient}`
        )}
      >
        <div className="py-3 text-center">
          <CircularProgress 
            value={entry.averageCompliance} 
            size={56} 
            strokeWidth={5}
            delay={config.delay * 1000 + 600}
          />
          <div className="mt-2 flex items-center justify-center gap-1">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-medium">
              {entry.achievedTargets}/{entry.totalTargets}
            </span>
          </div>
        </div>
        <div className={cn(
          "w-full py-1.5 text-center font-bold text-white rounded-t-lg",
          `bg-gradient-to-r ${config.gradient}`
        )}>
          {config.label}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Podium({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  const top3 = entries.slice(0, 3);
  
  if (top3.length === 0) return null;

  const getEntry = (rank: 1 | 2 | 3) => top3.find(e => e.rank === rank);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center items-end gap-2 sm:gap-6 md:gap-8 py-8 px-2"
      data-testid="podium-section"
    >
      {getEntry(2) && (
        <PodiumCard 
          entry={getEntry(2)!} 
          place={2} 
          isCurrentUser={getEntry(2)!.userId === currentUserId}
        />
      )}
      {getEntry(1) && (
        <PodiumCard 
          entry={getEntry(1)!} 
          place={1} 
          isCurrentUser={getEntry(1)!.userId === currentUserId}
        />
      )}
      {getEntry(3) && (
        <PodiumCard 
          entry={getEntry(3)!} 
          place={3} 
          isCurrentUser={getEntry(3)!.userId === currentUserId}
        />
      )}
    </motion.div>
  );
}

function LeaderboardRow({ 
  entry, 
  index, 
  isCurrentUser,
  isExpanded,
  onToggle,
}: { 
  entry: LeaderboardEntry; 
  index: number;
  isCurrentUser: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const avatarProps = getUserAvatarProps(entry.userId);
  const UserIcon = avatarProps.Icon;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      data-testid={`leaderboard-row-${entry.userId}`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all",
              "hover:bg-muted/50",
              isCurrentUser && "bg-primary/5 border border-primary/20",
              isExpanded && "bg-muted/30"
            )}
            data-testid={`button-expand-row-${entry.userId}`}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50">
              {getRankBadge(entry.rank)}
            </div>

            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              `bg-gradient-to-br ${avatarProps.gradient}`
            )}>
              <UserIcon className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{entry.userName}</span>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{entry.userEmail}</p>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>{entry.achievedTargets}/{entry.totalTargets}</span>
                </div>
                <p className="text-xs text-muted-foreground">Achieved</p>
              </div>
            </div>

            <CircularProgress 
              value={entry.averageCompliance} 
              size={48} 
              strokeWidth={4}
              delay={index * 50}
            />

            <div className="hidden sm:block">
              <RankChange current={entry.rank} previous={entry.previousRank} />
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-16 mr-4 mb-4 p-4 rounded-lg bg-muted/30 border"
          >
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Breakdown
            </h4>
            <div className="grid gap-2">
              {entry.targetBreakdown.map((target, i) => (
                <motion.div
                  key={target.targetId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded bg-background/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {target.isAchieved ? (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Trophy className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                        <Target className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{target.targetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {target.compliancePercentage === null ? "No leads" : `${target.currentValue} / ${target.targetValue}`}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={target.compliancePercentage === null ? "secondary" : (target.isAchieved ? "default" : "outline")}
                    className={cn(
                      target.compliancePercentage !== null && target.isAchieved && "bg-green-600",
                      target.compliancePercentage === null && "text-muted-foreground"
                    )}
                  >
                    {target.compliancePercentage === null ? "N/A" : `${Math.round(target.compliancePercentage)}%`}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function DateFilterButtons({ 
  selected, 
  onSelect 
}: { 
  selected: DatePreset; 
  onSelect: (preset: DatePreset) => void;
}) {
  // Group presets by target type
  const groups = [
    { label: 'Daily', type: 'daily' as const, presets: datePresets.filter(p => p.targetType === 'daily') },
    { label: 'Weekly', type: 'weekly' as const, presets: datePresets.filter(p => p.targetType === 'weekly') },
    { label: 'Monthly', type: 'monthly' as const, presets: datePresets.filter(p => p.targetType === 'monthly') },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-3"
      data-testid="date-filters"
    >
      {groups.map((group) => (
        <div key={group.type} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide hidden sm:inline">
            {group.label}:
          </span>
          <div className="flex gap-1">
            {group.presets.map((preset) => {
              const Icon = preset.icon;
              const isActive = selected === preset.value;
              return (
                <motion.div
                  key={preset.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onSelect(preset.value)}
                    className={cn(
                      "gap-1 transition-all h-8 px-2.5 text-xs",
                      isActive && "shadow-sm",
                      !isActive && "hover:bg-muted"
                    )}
                    data-testid={`button-filter-${preset.value}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden xs:inline sm:inline">{preset.label}</span>
                    <span className="xs:hidden sm:hidden">{preset.label.split(' ')[0]}</span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-center items-end gap-4 py-8">
        <Skeleton className="w-28 h-40 rounded-t-xl" />
        <Skeleton className="w-28 h-48 rounded-t-xl" />
        <Skeleton className="w-28 h-32 rounded-t-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full blur-xl" />
        <div className="relative p-6 rounded-full bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800">
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-center"
      >
        <h3 className="text-xl font-semibold">No Rankings Yet</h3>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Working targets need to be created and assigned to team members to see the leaderboard rankings.
        </p>
      </motion.div>
    </motion.div>
  );
}

function StatsCards({ data }: { data: LeaderboardResult }) {
  const topPerformerCompliance = data.entries.length > 0 && data.entries[0]?.averageCompliance !== undefined
    ? `${Math.round(data.entries[0].averageCompliance)}%`
    : "—";
    
  const perfectScoreCount = data.entries.filter(e => e.averageCompliance >= 100).length;

  const stats = [
    {
      id: "participants",
      label: "Total Participants",
      value: data.totalUsers,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "targets",
      label: "Active Targets",
      value: data.totalTargets,
      icon: Target,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: "top-performer",
      label: "Top Performer",
      value: topPerformerCompliance,
      icon: Flame,
      gradient: "from-orange-500 to-red-600",
    },
    {
      id: "perfect-scores",
      label: "Perfect Scores",
      value: perfectScoreCount,
      icon: Award,
      gradient: "from-emerald-500 to-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-cards">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="overflow-hidden" data-testid={`stat-card-${stat.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg",
                  `bg-gradient-to-br ${stat.gradient}`
                )}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid={`text-stat-value-${stat.id}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<LeaderboardResult>({
    queryKey: [`/api/working-targets/leaderboard?preset=${datePreset}`],
    refetchInterval: 60000,
  });

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setExpandedRows(new Set());
  };

  // Get the current target type label based on selected preset
  const getTargetTypeLabel = () => {
    const preset = datePresets.find(p => p.value === datePreset);
    if (!preset) return 'Targets';
    switch (preset.targetType) {
      case 'daily': return 'Daily Targets';
      case 'weekly': return 'Weekly Targets';
      case 'monthly': return 'Monthly Targets';
      default: return 'Targets';
    }
  };

  const getTargetTypeColor = () => {
    const preset = datePresets.find(p => p.value === datePreset);
    if (!preset) return 'bg-muted';
    switch (preset.targetType) {
      case 'daily': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'weekly': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'monthly': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="h-full p-4 md:p-6 space-y-6 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg"
            >
              <Trophy className="h-6 w-6" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">
                Team performance rankings
              </p>
            </div>
          </div>
          
          {/* Target Type Badge */}
          <motion.div
            key={datePreset}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <Badge className={cn("text-sm px-3 py-1", getTargetTypeColor())} variant="outline">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              {getTargetTypeLabel()}
            </Badge>
          </motion.div>
        </div>
        
        {/* Filter Buttons Row */}
        <DateFilterButtons selected={datePreset} onSelect={handlePresetChange} />
      </motion.div>

      {data && data.entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <StatsCards data={data} />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="p-6">
                <LoadingSkeleton />
              </CardContent>
            </Card>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="border-destructive">
              <CardContent className="p-6 text-center text-destructive">
                Failed to load leaderboard. Please try again.
              </CardContent>
            </Card>
          </motion.div>
        ) : !data || data.entries.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card>
              <CardContent className="p-6">
                <EmptyState />
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-50/50 via-amber-50/30 to-orange-50/50 dark:from-yellow-950/20 dark:via-amber-950/10 dark:to-orange-950/20">
                <Podium entries={data.entries} currentUserId={user?.id} />
              </div>
              <Separator />
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Full Rankings
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(data.dateRange.start), "MMM d")} — {format(new Date(data.dateRange.end), "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {data.totalUsers} participants
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {data.entries.map((entry, index) => (
                    <LeaderboardRow
                      key={entry.userId}
                      entry={entry}
                      index={index}
                      isCurrentUser={entry.userId === user?.id}
                      isExpanded={expandedRows.has(entry.userId)}
                      onToggle={() => toggleRow(entry.userId)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
