import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useIsFetching } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  Sparkles, 
  TrendingUp,
  Calendar,
  CalendarIcon,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  Zap,
  Users,
  MessageSquare,
  MapPin,
  RefreshCw,
  X,
  Image as ImageIcon,
  Phone,
  Flag,
  Award,
  Heart,
  Bell,
  Bookmark,
  Check,
  Flame,
  AlertTriangle,
  ExternalLink,
  Activity,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { VisionBoard, VisionBoardEarning, CompanyHoliday, VisionBoardMessage } from "@shared/schema";
import { getCompanyTimezone } from "@/lib/timezone-utils";
import { calculateExpectedPercentage, type PeriodType } from "@/lib/vision-board-utils";

interface VisionBoardProgress {
  board: VisionBoard;
  earnings: {
    total: number;
    progress_percent: number;
    goal: number;
    remaining: number;
    projected_incentive?: number;
    actual_incentive?: number;
    projected_progress_percent?: number;
  };
  timeline: {
    total_days: number;
    days_elapsed: number;
    days_remaining: number;
    time_progress_percent: number;
  };
  effort_targets: {
    yearly: { sales: number; visits: number; leads_attended: number; followups: number };
    monthly: { sales: number; visits: number; leads_attended: number; followups: number };
    weekly: { sales: number; visits: number; leads_attended: number; followups: number };
    daily: { sales: number; visits: number; leads_attended: number; followups: number };
  };
}

// New API response format for vision board
interface VisionBoardApiResponse {
  mode: 'personal' | 'team';
  board?: VisionBoard | null;
  board_count?: number;
  aggregate?: {
    id: string;
    company_id: string;
    goal_amount: number;
    total_goal: number;
    total_earnings: number;
    currency: string;
    goal_description: string;
    target_date: string;
    start_date: string;
    images: string[];
    effort_targets: { sales: number; visits: number; leads_attended: number; followups: number };
    is_active: boolean;
  };
  progress?: {
    earnings: {
      total: number;
      progress_percent: number;
      goal: number;
      remaining: number;
      projected_incentive?: number;
      actual_incentive?: number;
      projected_progress_percent?: number;
    };
    team_totals?: {
      total_earnings: number;
      total_goal: number;
      overall_progress_percent: number;
      projected_incentive?: number;
      actual_incentive?: number;
      projected_progress_percent?: number;
    };
  };
}

// Custom View interface for Vision Board
interface CustomView {
  id: string;
  name: string;
  icon: string;
  icon_color: string;
  show_badge: boolean;
  section: 'custom_views' | 'data_mismatch' | 'action_today' | 'overdue_actions' | 'achievement';
  is_enabled: boolean;
}

// Icon mapping for custom views
const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  zap: Zap,
  target: Target,
  flag: Flag,
  award: Award,
  heart: Heart,
  bell: Bell,
  bookmark: Bookmark,
  check: Check,
  clock: Clock,
  flame: Flame,
  users: Users,
  "trending-up": TrendingUp,
  "alert-triangle": AlertTriangle,
};

// Color mapping for custom views
const COLOR_MAP: Record<string, string> = {
  blue: "text-blue-500",
  green: "text-green-500",
  orange: "text-orange-500",
  red: "text-red-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
  yellow: "text-yellow-500",
  teal: "text-teal-500",
  indigo: "text-indigo-500",
  gray: "text-gray-500",
};

const BG_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10",
  green: "bg-green-500/10",
  orange: "bg-orange-500/10",
  red: "bg-red-500/10",
  purple: "bg-purple-500/10",
  pink: "bg-pink-500/10",
  yellow: "bg-yellow-500/10",
  teal: "bg-teal-500/10",
  indigo: "bg-indigo-500/10",
  gray: "bg-gray-500/10",
};

const BADGE_BG_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  yellow: "bg-yellow-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  gray: "bg-gray-500",
};

// Section display configuration
const SECTION_CONFIG: Record<string, { title: string; icon: LucideIcon; gradient: string }> = {
  overdue_actions: { title: "Overdue Actions", icon: AlertTriangle, gradient: "from-red-500/20 to-orange-500/20" },
  action_today: { title: "Action Today", icon: Clock, gradient: "from-amber-500/20 to-yellow-500/20" },
  data_mismatch: { title: "Data Mismatch", icon: AlertTriangle, gradient: "from-orange-500/20 to-red-500/20" },
  achievement: { title: "Achievement", icon: Award, gradient: "from-green-500/20 to-emerald-500/20" },
  custom_views: { title: "Custom Views", icon: Star, gradient: "from-blue-500/20 to-purple-500/20" },
};

const currencySymbols: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
};

const motivationalMessages = [
  "Every sale brings you closer to your dream!",
  "Your hard work is building your future",
  "One step at a time leads to great destinations",
  "Today's efforts create tomorrow's success",
  "You're making incredible progress!",
  "Keep pushing, your dream is within reach",
  "Every follow-up counts towards your goal",
  "Champions are made through daily discipline",
];

function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

function CircularProgress({ 
  progress, 
  size = 200, 
  strokeWidth = 12,
  children 
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Helper function to get motivational message based on progress
function getMotivationalMessage(actualProgress: number, projectedProgress: number): string {
  const ratio = projectedProgress > 0 ? (actualProgress / projectedProgress) * 100 : 0;
  
  if (actualProgress >= 100) return "Goal Achieved!";
  if (ratio >= 80) return "Almost there!";
  if (ratio >= 50) return "Halfway to target!";
  if (ratio >= 25) return "Building momentum!";
  if (actualProgress > 0) return "Great start!";
  return "Let's go!";
}

function DualRingProgress({ 
  actualProgress, 
  projectedProgress,
  size = 200, 
  outerStrokeWidth = 10,
  innerStrokeWidth = 10,
  children 
}: { 
  actualProgress: number; 
  projectedProgress: number;
  size?: number;
  outerStrokeWidth?: number;
  innerStrokeWidth?: number;
  children?: React.ReactNode;
}) {
  const gap = 6;
  const outerRadius = (size - outerStrokeWidth) / 2;
  const innerRadius = outerRadius - outerStrokeWidth / 2 - gap - innerStrokeWidth / 2;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  
  // Guard against undefined/NaN values FIRST
  const safeProjectedProgress = Number.isFinite(projectedProgress) ? projectedProgress : 0;
  const safeActualProgress = Number.isFinite(actualProgress) ? actualProgress : 0;
  
  // Use safe values for offset calculations
  const outerOffset = outerCircumference - (Math.min(safeProjectedProgress, 100) / 100) * outerCircumference;
  const innerOffset = innerCircumference - (Math.min(safeActualProgress, 100) / 100) * innerCircumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="dual-ring-container">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Outer ring background - clean light track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStrokeWidth}
          className="text-amber-100 dark:text-amber-950/40"
        />
        {/* Outer ring - Clean amber/orange for PROJECTED */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={outerStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={outerCircumference}
          initial={{ strokeDashoffset: outerCircumference }}
          animate={{ strokeDashoffset: outerOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Inner ring background - clean light track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStrokeWidth}
          className="text-emerald-100 dark:text-emerald-800/50"
        />
        {/* Inner ring - Clean emerald for ACTUAL */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          className="stroke-emerald-500 dark:stroke-emerald-400"
          strokeWidth={innerStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={innerCircumference}
          initial={{ strokeDashoffset: innerCircumference }}
          animate={{ strokeDashoffset: innerOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function EffortMetricCard({ 
  icon: Icon, 
  label, 
  target, 
  achieved = 0,
  gradient,
  delay = 0,
  expectedPercent,
  selectedPeriod,
  loading = false,
}: {
  icon: React.ElementType;
  label: string;
  target: number;
  achieved?: number;
  gradient: string;
  delay?: number;
  expectedPercent?: number;
  selectedPeriod?: "daily" | "weekly" | "monthly" | "yearly";
  loading?: boolean;
}) {
  const progress = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
  
  // Format percentage: 1 decimal for yearly, whole number for others
  const formatPercent = (percent: number) => {
    if (selectedPeriod === "yearly") {
      return percent.toFixed(1);  // Show 1 decimal (e.g., "2.1")
    }
    return Math.round(percent).toString();  // Whole number (e.g., "26")
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden"
    >
      <div className={cn(
        "relative rounded-2xl p-4 backdrop-blur-xl border",
        "bg-white/80 dark:bg-slate-800/80",
        "border-white/20 dark:border-slate-700/50",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-30",
          `bg-gradient-to-br ${gradient}`
        )} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : expectedPercent !== undefined ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Expected</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  )}>
                    {formatPercent(expectedPercent)}% ({Math.round(target * expectedPercent / 100)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Actual</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    progress >= 100 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : progress >= expectedPercent
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  )}>
                    {formatPercent(progress)}% ({achieved})
                  </span>
                </div>
              </div>
            ) : (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                progress >= 100 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              )}>
                {Math.round(progress)}%
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-2xl font-bold">{achieved}</span>
            )}
            <span className="text-sm text-muted-foreground">/ {loading ? "—" : target}</span>
          </div>
          
          <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
              className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VisionBoardMessageCard({
  message,
  delay = 0,
}: {
  message: VisionBoardMessage;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="relative overflow-hidden"
    >
      <div className={cn(
        "relative rounded-xl p-4 backdrop-blur-xl border",
        "bg-white/80 dark:bg-slate-800/80",
        "border-white/20 dark:border-slate-700/50",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-full h-full rounded-xl blur-3xl opacity-20",
          "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
        )} />
        
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-xl bg-gradient-to-br",
              "from-purple-500 via-pink-500 to-orange-500",
              "flex-shrink-0"
            )}>
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {message.title && (
                <h4 className="text-sm font-semibold mb-1 text-slate-900 dark:text-slate-100">
                  {message.title}
                </h4>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                {message.message}
              </p>
              {message.expires_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Expires: {format(new Date(message.expires_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VisionBoardMessages() {
  const { user } = useAuth();
  const { data: messages = [], isLoading: messagesLoading } = useQuery<VisionBoardMessage[]>({
    queryKey: ["/api/vision-board/messages"],
    enabled: !!user?.company_id,
    staleTime: 0,
    gcTime: 0,
  });
  
  if (messagesLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    );
  }
  if (!messages || messages.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="space-y-3">
        {messages.slice(0, 3).map((msg, idx) => (
          <VisionBoardMessageCard key={msg.id} message={msg} delay={idx * 0.1} />
        ))}
      </div>
    </div>
  );
}

function AverageEffortMeterCard({
  newLeadsProgress,
  followupsProgress,
  visitsProgress,
  expectedPercent,
  selectedPeriod,
  delay = 0.5,
}: {
  newLeadsProgress: number;
  followupsProgress: number;
  visitsProgress: number;
  expectedPercent?: number;
  selectedPeriod?: "daily" | "weekly" | "monthly" | "yearly";
  delay?: number;
}) {
  // Calculate average of the 3 percentages
  const validProgresses = [newLeadsProgress, followupsProgress, visitsProgress].filter(p => !isNaN(p) && isFinite(p));
  const averageProgress = validProgresses.length > 0
    ? validProgresses.reduce((sum, p) => sum + p, 0) / validProgresses.length
    : 0;
  
  // Format percentage: 1 decimal for yearly, whole number for others
  const formatPercent = (percent: number) => {
    if (selectedPeriod === "yearly") {
      return percent.toFixed(1);
    }
    return Math.round(percent).toString();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="relative overflow-hidden"
    >
      <div className={cn(
        "relative rounded-2xl p-4 backdrop-blur-xl border",
        "bg-white/80 dark:bg-slate-800/80",
        "border-white/20 dark:border-slate-700/50",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
      )}>
        {/* Vibrant multi-color gradient overlay */}
        <div className={cn(
          "absolute top-0 right-0 w-full h-full rounded-2xl blur-3xl opacity-20",
          "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
        )} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-xl bg-gradient-to-br",
                "from-purple-500 via-pink-500 to-orange-500"
              )}>
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Average Effort Meter</h3>
                <p className="text-xs text-muted-foreground">
                  Combined progress of New Leads, Follow-ups & Visits
                </p>
              </div>
            </div>
            {expectedPercent !== undefined ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Expected</span>
                  <span className={cn(
                    "text-sm px-2.5 py-1 rounded-full font-medium",
                    "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  )}>
                    {formatPercent(expectedPercent)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Actual</span>
                  <span className={cn(
                    "text-sm px-2.5 py-1 rounded-full font-medium",
                    averageProgress >= 100 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : averageProgress >= (expectedPercent ?? 0)
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  )}>
                    {formatPercent(averageProgress)}%
                  </span>
                </div>
              </div>
            ) : (
              <span className={cn(
                "text-sm px-2.5 py-1 rounded-full font-medium",
                averageProgress >= 100 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              )}>
                {formatPercent(averageProgress)}%
              </span>
            )}
          </div>
          
          {/* Large horizontal progress bar */}
          <div className="mt-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, averageProgress)}%` }}
              transition={{ duration: 1.2, delay: delay + 0.3, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                "from-purple-500 via-pink-500 to-orange-500"
              )}
            />
          </div>
          
          {/* Breakdown of individual metrics */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Leads: {formatPercent(newLeadsProgress)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Follow-ups: {formatPercent(followupsProgress)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Visits: {formatPercent(visitsProgress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ImageCarousel({ images }: { images: { url: string; caption?: string }[] }) {
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${images[current].url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </motion.div>
      </AnimatePresence>
      
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            data-testid="button-carousel-next"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === current ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                )}
                data-testid={`button-carousel-dot-${idx}`}
              />
            ))}
          </div>
        </>
      )}
      
      {images[current].caption && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 left-0 right-0 text-center text-white text-lg font-medium px-4"
        >
          {images[current].caption}
        </motion.p>
      )}
    </div>
  );
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goal_amount: "",
    currency: "INR",
    goal_description: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    target_date: "",
    images: [] as { url: string; caption?: string }[],
    effort_targets: {
      sales: 0,
      visits: 0,
      leads_attended: 0,
      followups: 0,
    },
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/vision-board", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      toast({ title: "Vision Board Created!", description: "Your journey to success begins now!" });
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: imageUrl.trim(), caption: imageCaption.trim() || undefined }],
      }));
      setImageUrl("");
      setImageCaption("");
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.goal_amount || Number(formData.goal_amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid goal amount", variant: "destructive" });
      return;
    }
    if (!formData.start_date || !formData.target_date) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.target_date)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    
    createMutation.mutate({
      ...formData,
      goal_amount: Number(formData.goal_amount),
      start_date: new Date(formData.start_date).toISOString(),
      target_date: new Date(formData.target_date).toISOString(),
    });
  };

  const yearlyToMonthly = (yearly: number) => Math.ceil(yearly / 12);
  const yearlyToWeekly = (yearly: number) => Math.ceil(yearly / 52);
  const yearlyToDaily = (yearly: number) => Math.ceil(yearly / 365);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Star className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Create Your Vision Board</CardTitle>
            <CardDescription>
              Step {step} of 4 - {step === 1 ? "Set Your Goal" : step === 2 ? "Add Dream Images" : step === 3 ? "Set Effort Targets" : "Review & Create"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="goal_amount">Goal Amount</Label>
                      <Input
                        id="goal_amount"
                        type="number"
                        placeholder="e.g., 1000000"
                        value={formData.goal_amount}
                        onChange={e => setFormData(prev => ({ ...prev, goal_amount: e.target.value }))}
                        data-testid="input-goal-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ INR</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                          <SelectItem value="EUR">€ EUR</SelectItem>
                          <SelectItem value="GBP">£ GBP</SelectItem>
                          <SelectItem value="AED">د.إ AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_date">End Date</Label>
                      <Input
                        id="target_date"
                        type="date"
                        value={formData.target_date}
                        onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                        data-testid="input-target-date"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="goal_description">What will you achieve with this goal?</Label>
                    <Textarea
                      id="goal_description"
                      placeholder="Describe your dream - buying a house, car, vacation, etc."
                      value={formData.goal_description}
                      onChange={e => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                      rows={3}
                      data-testid="input-goal-description"
                    />
                  </div>
                </motion.div>
              )}
              
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="image_url"
                            placeholder="Paste image URL..."
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            data-testid="input-image-url"
                          />
                          <Button onClick={addImage} size="icon" data-testid="button-add-image">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_caption">Caption (optional)</Label>
                        <Input
                          id="image_caption"
                          placeholder="e.g., My dream home"
                          value={imageCaption}
                          onChange={e => setImageCaption(e.target.value)}
                          data-testid="input-image-caption"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video">
                          <img src={img.url} alt={img.caption || `Dream ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removeImage(idx)}
                              data-testid={`button-remove-image-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {img.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {formData.images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Add images of your dreams to stay motivated</p>
                    </div>
                  )}
                </motion.div>
              )}
              
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    Set your yearly effort targets. Monthly, weekly, and daily targets will be auto-calculated.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Yearly Sales
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.sales || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, sales: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 120"
                        data-testid="input-yearly-sales"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.sales)}/mo, {yearlyToWeekly(formData.effort_targets.sales)}/wk, {yearlyToDaily(formData.effort_targets.sales)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Yearly Visits
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.visits || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, visits: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 365"
                        data-testid="input-yearly-visits"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.visits)}/mo, {yearlyToWeekly(formData.effort_targets.visits)}/wk, {yearlyToDaily(formData.effort_targets.visits)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Yearly New Leads
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.leads_attended || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, leads_attended: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 500"
                        data-testid="input-yearly-leads"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.leads_attended)}/mo, {yearlyToWeekly(formData.effort_targets.leads_attended)}/wk, {yearlyToDaily(formData.effort_targets.leads_attended)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        Yearly Follow-ups
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.followups || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, followups: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 2000"
                        data-testid="input-yearly-followups"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.followups)}/mo, {yearlyToWeekly(formData.effort_targets.followups)}/wk, {yearlyToDaily(formData.effort_targets.followups)}/day
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 space-y-4">
                    <div className="text-center">
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {formatCurrency(Number(formData.goal_amount), formData.currency)}
                      </h3>
                      <p className="text-muted-foreground mt-1">{formData.goal_description || "Your Goal"}</p>
                      {formData.target_date && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Target: {format(new Date(formData.target_date), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    
                    {formData.images.length > 0 && (
                      <div className="flex justify-center gap-2 flex-wrap">
                        {formData.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.caption || `Dream ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold text-green-600">{formData.effort_targets.sales}</div>
                        <div className="text-muted-foreground text-xs">Sales/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-600">{formData.effort_targets.visits}</div>
                        <div className="text-muted-foreground text-xs">Visits/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-purple-600">{formData.effort_targets.leads_attended}</div>
                        <div className="text-muted-foreground text-xs">Leads/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-orange-600">{formData.effort_targets.followups}</div>
                        <div className="text-muted-foreground text-xs">Follow-ups/yr</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(prev => prev - 1)}
                disabled={step === 1}
                data-testid="button-wizard-back"
              >
                Back
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep(prev => prev + 1)}
                  disabled={step === 1 && (!formData.goal_amount || !formData.target_date || !formData.start_date || new Date(formData.start_date) >= new Date(formData.target_date))}
                  data-testid="button-wizard-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-wizard-create"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Vision Board
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface ClosedSale {
  id: string;
  name: string;
  mobile_no: string;
  status: string;
  converted_at: string;
  has_earning: boolean;
}

function UpdateIncentivesDialog({ 
  visionBoardId, 
  onSuccess,
  triggerVariant = "full"
}: { 
  visionBoardId: string; 
  onSuccess: () => void;
  triggerVariant?: "full" | "ghost";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "additional">("sales");
  const [selectedLead, setSelectedLead] = useState<ClosedSale | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: closedSales, isLoading: loadingSales, refetch: refetchSales } = useQuery<ClosedSale[]>({
    queryKey: ["/api/vision-board/closed-sales"],
    queryFn: async () => {
      const response = await fetch("/api/vision-board/closed-sales", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch closed sales");
      return response.json();
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/vision-board/${visionBoardId}/earnings`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/closed-sales"] });
      toast({ title: "Incentive Added!", description: "Your earnings have been updated!" });
      setAmount("");
      setDescription("");
      setSelectedLead(null);
      refetchSales();
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddSaleValue = (lead: ClosedSale) => {
    if (!amount) {
      toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
      return;
    }
    addMutation.mutate({
      amount: Number(amount),
      source_type: "closing",
      source_lead_id: lead.id,
      description: description || `Sale: ${lead.name}`,
    });
  };

  const handleAddIncentive = () => {
    if (!amount) {
      toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
      return;
    }
    addMutation.mutate({
      amount: Number(amount),
      source_type: "incentive",
      description: description || "Additional Incentive",
    });
    setAmount("");
    setDescription("");
  };

  const salesWithoutEarnings = closedSales?.filter(s => !s.has_earning) || [];
  const salesWithEarnings = closedSales?.filter(s => s.has_earning) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "ghost" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 px-3"
            data-testid="button-update-incentives"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Add Incentive</span>
          </Button>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            data-testid="button-update-incentives"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Update Incentives
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Incentives</DialogTitle>
          <DialogDescription>
            Add values to your closed sales or record additional incentives
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab("sales")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-all",
              activeTab === "sales" 
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium" 
                : "text-muted-foreground hover:bg-muted"
            )}
            data-testid="tab-closed-sales"
          >
            Closed Sales ({salesWithoutEarnings.length})
          </button>
          <button
            onClick={() => setActiveTab("additional")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-all",
              activeTab === "additional" 
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium" 
                : "text-muted-foreground hover:bg-muted"
            )}
            data-testid="tab-additional-incentive"
          >
            Additional Incentive
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "sales" ? (
            <div className="space-y-3">
              {loadingSales ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : salesWithoutEarnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending sales to add values to.</p>
                  {salesWithEarnings.length > 0 && (
                    <p className="text-xs mt-2 text-green-600">{salesWithEarnings.length} sale(s) already recorded</p>
                  )}
                </div>
              ) : (
                salesWithoutEarnings.map((sale) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{sale.name}</p>
                        <p className="text-xs text-muted-foreground">{sale.mobile_no}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        {sale.status}
                      </span>
                    </div>
                    
                    {selectedLead?.id === sale.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter amount..."
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex-1"
                            data-testid={`input-sale-amount-${sale.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddSaleValue(sale)}
                            disabled={!amount || addMutation.isPending}
                            data-testid={`button-save-sale-${sale.id}`}
                          >
                            {addMutation.isPending ? "..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLead(null);
                              setAmount("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        <Input
                          placeholder="Note (optional)"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          data-testid={`input-sale-note-${sale.id}`}
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedLead(sale);
                          setAmount("");
                          setDescription("");
                        }}
                        data-testid={`button-add-value-${sale.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Value
                      </Button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Record bonuses, performance incentives, or any additional earnings not tied to a specific sale.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="incentive_amount">Amount</Label>
                  <Input
                    id="incentive_amount"
                    type="number"
                    placeholder="Enter amount..."
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    data-testid="input-incentive-amount"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="incentive_description">Description</Label>
                  <Input
                    id="incentive_description"
                    placeholder="e.g., Performance bonus, Referral reward"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    data-testid="input-incentive-description"
                  />
                </div>
                
                <Button
                  onClick={handleAddIncentive}
                  disabled={!amount || addMutation.isPending}
                  className="w-full"
                  data-testid="button-add-incentive"
                >
                  {addMutation.isPending ? "Adding..." : "Add Incentive"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVisionWizard({ 
  visionBoard, 
  onSuccess,
  triggerVariant = "icon"
}: { 
  visionBoard: VisionBoard; 
  onSuccess: () => void;
  triggerVariant?: "icon" | "ghost";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goal_amount: visionBoard.goal_amount.toString(),
    currency: visionBoard.currency || "INR",
    goal_description: visionBoard.goal_description || "",
    start_date: visionBoard.start_date 
      ? format(new Date(visionBoard.start_date), "yyyy-MM-dd") 
      : format(new Date(visionBoard.created_at), "yyyy-MM-dd"),
    target_date: format(new Date(visionBoard.target_date), "yyyy-MM-dd"),
    images: (visionBoard.images || []) as { url: string; caption?: string }[],
    effort_targets: visionBoard.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setFormData({
        goal_amount: visionBoard.goal_amount.toString(),
        currency: visionBoard.currency || "INR",
        goal_description: visionBoard.goal_description || "",
        start_date: visionBoard.start_date 
          ? format(new Date(visionBoard.start_date), "yyyy-MM-dd") 
          : format(new Date(visionBoard.created_at), "yyyy-MM-dd"),
        target_date: format(new Date(visionBoard.target_date), "yyyy-MM-dd"),
        images: (visionBoard.images || []) as { url: string; caption?: string }[],
        effort_targets: visionBoard.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      });
    }
  }, [open, visionBoard]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/vision-board/${visionBoard.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoard.id, "progress"] });
      toast({ title: "Vision Board Updated!", description: "Your changes have been saved." });
      setOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: imageUrl.trim(), caption: imageCaption.trim() || undefined }],
      }));
      setImageUrl("");
      setImageCaption("");
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.goal_amount || Number(formData.goal_amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid goal amount", variant: "destructive" });
      return;
    }
    if (!formData.start_date || !formData.target_date) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.target_date)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    
    updateMutation.mutate({
      goal_amount: Number(formData.goal_amount),
      currency: formData.currency,
      goal_description: formData.goal_description,
      start_date: new Date(formData.start_date).toISOString(),
      target_date: new Date(formData.target_date).toISOString(),
      images: formData.images,
      effort_targets: formData.effort_targets,
    });
  };

  const yearlyToMonthly = (yearly: number) => Math.ceil(yearly / 12);
  const yearlyToWeekly = (yearly: number) => Math.ceil(yearly / 52);
  const yearlyToDaily = (yearly: number) => Math.ceil(yearly / 365);

  const isStep1Valid = formData.goal_amount && formData.start_date && formData.target_date && 
    new Date(formData.start_date) < new Date(formData.target_date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "ghost" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 px-3"
            data-testid="button-edit-vision"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Edit Goal</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-edit-vision"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2 p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Edit2 className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl">Edit Vision Board</DialogTitle>
          <DialogDescription>
            Step {step} of 4 - {step === 1 ? "Goal Settings" : step === 2 ? "Dream Images" : step === 3 ? "Effort Targets" : "Review & Save"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="edit-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="edit_goal_amount">Goal Amount</Label>
                    <Input
                      id="edit_goal_amount"
                      type="number"
                      placeholder="e.g., 1000000"
                      value={formData.goal_amount}
                      onChange={e => setFormData(prev => ({ ...prev, goal_amount: e.target.value }))}
                      data-testid="input-edit-goal-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                        <SelectItem value="AED">د.إ AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_start_date">Start Date</Label>
                    <Input
                      id="edit_start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      data-testid="input-edit-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_target_date">End Date</Label>
                    <Input
                      id="edit_target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                      data-testid="input-edit-target-date"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_goal_description">Goal Description</Label>
                  <Textarea
                    id="edit_goal_description"
                    placeholder="Describe your dream - buying a house, car, vacation, etc."
                    value={formData.goal_description}
                    onChange={e => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                    rows={3}
                    data-testid="input-edit-goal-description"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="edit-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit_image_url">Image URL</Label>
                      <Input
                        id="edit_image_url"
                        type="url"
                        placeholder="https://example.com/dream-image.jpg"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        data-testid="input-edit-image-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_image_caption">Caption (optional)</Label>
                      <Input
                        id="edit_image_caption"
                        placeholder="My dream home..."
                        value={imageCaption}
                        onChange={e => setImageCaption(e.target.value)}
                        data-testid="input-edit-image-caption"
                      />
                    </div>
                    <Button onClick={addImage} disabled={!imageUrl.trim()} variant="outline" data-testid="button-edit-add-image">
                      <Plus className="h-4 w-4 mr-2" /> Add Image
                    </Button>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border">
                          <img src={img.url} alt={img.caption || "Dream"} className="w-full h-24 object-cover" />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(idx)}
                            data-testid={`button-edit-remove-image-${idx}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {img.caption && (
                            <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                              {img.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {formData.images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Add images of your dreams to stay motivated</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="edit-step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Set your yearly effort targets. These will be auto-calculated for daily, weekly, and monthly views.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_sales" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" /> Sales (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_sales"
                      type="number"
                      min="0"
                      value={formData.effort_targets.sales}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, sales: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-sales"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.sales)}/mo, {yearlyToWeekly(formData.effort_targets.sales)}/wk, {yearlyToDaily(formData.effort_targets.sales)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_visits" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" /> Visits (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_visits"
                      type="number"
                      min="0"
                      value={formData.effort_targets.visits}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, visits: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-visits"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.visits)}/mo, {yearlyToWeekly(formData.effort_targets.visits)}/wk, {yearlyToDaily(formData.effort_targets.visits)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_leads" className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" /> New Leads (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_leads"
                      type="number"
                      min="0"
                      value={formData.effort_targets.leads_attended}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, leads_attended: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-leads"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.leads_attended)}/mo, {yearlyToWeekly(formData.effort_targets.leads_attended)}/wk, {yearlyToDaily(formData.effort_targets.leads_attended)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_followups" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-500" /> Follow-ups (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_followups"
                      type="number"
                      min="0"
                      value={formData.effort_targets.followups}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, followups: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-followups"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.followups)}/mo, {yearlyToWeekly(formData.effort_targets.followups)}/wk, {yearlyToDaily(formData.effort_targets.followups)}/day
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="edit-step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Goal Amount</span>
                    <span className="font-bold text-lg">
                      {currencySymbols[formData.currency] || formData.currency}{Number(formData.goal_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <span className="text-sm">
                      {format(new Date(formData.start_date), "MMM d, yyyy")} - {format(new Date(formData.target_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {formData.goal_description && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Description</span>
                      <p className="mt-1">{formData.goal_description}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground mb-1">Dream Images</p>
                    <p className="font-medium">{formData.images.length} image(s)</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground mb-1">Yearly Targets</p>
                    <p className="font-medium text-xs">
                      {formData.effort_targets.sales} sales, {formData.effort_targets.visits} visits
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => step === 1 ? setOpen(false) : setStep(prev => prev - 1)}
            data-testid="button-edit-wizard-back"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(prev => prev + 1)}
              disabled={step === 1 && !isStep1Valid}
              data-testid="button-edit-wizard-next"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              data-testid="button-edit-wizard-save"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VisionBoardPreloader() {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Loading your vision...",
    "Preparing your goals...",
    "Calculating progress...",
    "Almost there...",
  ];

  // Rotate messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Generate random particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"
    >
      {/* Animated gradient background overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-800/50 via-indigo-800/50 to-blue-800/50"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: -100,
            scale: [0, 1, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
          <Sparkles className="w-4 h-4 text-yellow-300/60" />
        </motion.div>
      ))}

      {/* Main content container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Rotating gradient rings */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="ringGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="ringGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            
            {/* Outer ring */}
            <motion.circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="url(#ringGradient1)"
              strokeWidth="4"
              transformOrigin="100 100"
              animate={{ rotate: 360 }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            
            {/* Middle ring */}
            <motion.circle
              cx="100"
              cy="100"
              r="71"
              fill="none"
              stroke="url(#ringGradient2)"
              strokeWidth="3"
              transformOrigin="100 100"
              animate={{ rotate: -360 }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            
            {/* Inner ring */}
            <motion.circle
              cx="100"
              cy="100"
              r="48"
              fill="none"
              stroke="url(#ringGradient3)"
              strokeWidth="2"
              transformOrigin="100 100"
              animate={{ rotate: 360 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </svg>

          {/* Pulsing center icon */}
          <motion.div
            className="absolute flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotate: {
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <div className="relative">
              <Target className="w-16 h-16 text-white drop-shadow-lg" />
              <motion.div
                className="absolute inset-0 rounded-full bg-white/20 blur-xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xl font-semibold text-white drop-shadow-lg">
            {messages[messageIndex]}
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

let hasVisionBoardLoadedOnce = false;

export default function VisionBoardPage() {
  const { user, company } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTab = searchParams.get("tab") === "work-report" ? "work-report" : "vision";
  const [activeVisionTab, setActiveVisionTab] = useState<"vision" | "work-report">(initialTab);
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "yesterday" | "weekly" | "monthly" | "last_month" | "yearly">("daily");
  const [conversionDateFilter, setConversionDateFilter] = useState<"all_time" | "this_week" | "last_week" | "this_month" | "last_month" | "last_30_days" | "custom">("last_30_days");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [conversionSectionVisible, setConversionSectionVisible] = useState(false);
  const conversionObserverRef = useRef<IntersectionObserver | null>(null);
  const conversionSectionRef = useCallback((node: HTMLDivElement | null) => {
    if (conversionObserverRef.current) {
      conversionObserverRef.current.disconnect();
      conversionObserverRef.current = null;
    }
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setConversionSectionVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(node);
      conversionObserverRef.current = observer;
    }
  }, []);
  
  // User filter state for Admin/Multi-sheet users
  // 'company' = company-wide vision, 'me' = personal, user ID = specific user
  const isAdminOrMultiSheet = user?.role === 'company_admin' || user?.is_multi_sheet_user;
  const [selectedUserView, setSelectedUserView] = useState<string>(isAdminOrMultiSheet ? 'company' : 'me');
  const [quickActionsUserId, setQuickActionsUserId] = useState<string>("all");

  // Work Report state
  const [workReportDate, setWorkReportDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [workReportUserFilter, setWorkReportUserFilter] = useState<string>("all");
  const isFetchingCount = useIsFetching();

  // Fetch all users for the dropdown (only for Admin/Multi-sheet users)
  const { data: allUsers = [] } = useQuery<Array<{ id: string; name: string; email: string }>>({
    queryKey: ["/api/company/users"],
    enabled: !!isAdminOrMultiSheet && !!user?.company_id,
    staleTime: 0,
    gcTime: 0,
  });

  // Work Report query — slot-centric API
  interface WorkReportSlot {
    label: string;
    slotMinutes: number;
    start: number;
    end: number;
    data: Record<string, { uniqueLeads: number; activityMinutes: number }>;
  }
  interface WorkReportResponse {
    date: string;
    users: Array<{ id: string; name: string }>;
    slots: WorkReportSlot[];
  }
  const workReportQueryKey = ["/api/work-report", workReportDate, workReportUserFilter];
  const {
    data: workReportData,
    isLoading: workReportLoading,
    refetch: refetchWorkReport,
  } = useQuery<WorkReportResponse>({
    queryKey: workReportQueryKey,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const urlParams = new URLSearchParams({ date: workReportDate });
      if (workReportUserFilter !== "all") urlParams.append("userId", workReportUserFilter);
      const res = await fetch(`/api/work-report?${urlParams}`, {
        credentials: "include",
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok) throw new Error("Failed to fetch work report");
      return res.json();
    },
    enabled: !!user?.company_id,
    staleTime: 60_000,
  });
  
  // Determine which user to view (for admin-controlled data)
  const viewingUserId = selectedUserView === 'me' ? user?.id : 
                        selectedUserView !== 'company' ? selectedUserView : null;
  const isCompanyView = selectedUserView === 'company' && isAdminOrMultiSheet;
  
  // Fetch admin-controlled company vision data (for Company Vision view)
  interface AdminCompanyVisionResponse {
    board: {
      id: string;
      company_id: string;
      year: number;
      goal_amount: number;
      currency: string;
      goal_description: string;
      annual_targets: { sales: number; visits: number; leads_attended: number; followups: number };
    } | null;
    monthly_targets: Array<{
      id: string;
      month: number;
      targets: { sales: number; visits: number; leads_attended: number; followups: number };
      is_auto_calculated: boolean;
    }>;
    year: number;
  }
  
  const { data: adminCompanyVision, isLoading: loadingAdminCompany } = useQuery<AdminCompanyVisionResponse>({
    queryKey: ["/api/vision-board/admin/company-data", new Date().getFullYear()],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/vision-board/admin/company-data?year=${new Date().getFullYear()}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch company vision');
      return res.json();
    },
    enabled: isCompanyView,
    staleTime: 0,
    gcTime: 0,
  });
  
  // Fetch admin-controlled user vision data (for specific user view or 'me')
  interface AdminUserVisionResponse {
    target: {
      id: string;
      user_id: string;
      year: number;
      goal_amount: number;
      currency: string;
      goal_description: string;
      annual_targets: { sales: number; visits: number; leads_attended: number; followups: number };
    } | null;
    monthly_targets: Array<{
      id: string;
      month: number;
      targets: { sales: number; visits: number; leads_attended: number; followups: number };
      is_auto_calculated: boolean;
    }>;
    incentives: Array<{
      id: string;
      month: number;
      amount: number;
      currency: string;
    }>;
    user_name: string;
    year: number;
    effort_achieved?: {
      yearly: { sales: number; visits: number; leads_attended: number; followups: number };
      monthly: { sales: number; visits: number; leads_attended: number; followups: number };
      last_month: { sales: number; visits: number; leads_attended: number; followups: number };
      weekly: { sales: number; visits: number; leads_attended: number; followups: number };
      daily: { sales: number; visits: number; leads_attended: number; followups: number };
      yesterday: { sales: number; visits: number; leads_attended: number; followups: number };
    };
  }
  
  const { data: adminUserVision, isLoading: loadingAdminUser } = useQuery<AdminUserVisionResponse>({
    queryKey: ["/api/vision-board/admin/user-data", viewingUserId, new Date().getFullYear()],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/vision-board/admin/user-data/${viewingUserId}?year=${new Date().getFullYear()}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch user vision');
      return res.json();
    },
    enabled: !!viewingUserId,
    staleTime: 0,
    gcTime: 0,
  });
  
  // Helper to scale yearly targets based on selected period
  // Uses same Math.ceil logic as existing yearlyToMonthly/Weekly/Daily helpers
  const scaleTargetByPeriod = (yearlyTarget: number, period: "daily" | "yesterday" | "weekly" | "monthly" | "last_month" | "yearly"): number => {
    switch (period) {
      case "daily": return Math.ceil(yearlyTarget / 365);
      case "yesterday": return Math.ceil(yearlyTarget / 365); // Same as daily
      case "weekly": return Math.ceil(yearlyTarget / 52);
      case "monthly": return Math.ceil(yearlyTarget / 12);
      case "last_month": return Math.ceil(yearlyTarget / 12); // Same as monthly
      case "yearly": return yearlyTarget;
      default: return yearlyTarget;
    }
  };
  
  // Helper to scale all effort targets for a period
  // When monthlyTargets is provided, uses: Year = annual, Month = from table, Week = Month÷4, Day = Month÷25
  const getScaledEffortTargets = (
    targets: { sales: number; visits: number; leads_attended: number; followups: number } | null | undefined,
    period: "daily" | "yesterday" | "weekly" | "monthly" | "last_month" | "yearly",
    monthlyTargets?: Array<{ month: number; targets: { sales: number; visits: number; leads_attended: number; followups: number } }>
  ) => {
    if (!targets) return { sales: 0, visits: 0, leads_attended: 0, followups: 0 };
    
    // If monthly targets provided, use them for month/week/day calculations
    if (monthlyTargets && monthlyTargets.length > 0) {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const monthTarget = monthlyTargets.find(mt => mt.month === currentMonth)?.targets;
      const lastMonthTarget = monthlyTargets.find(mt => mt.month === lastMonth)?.targets;
      
      if (monthTarget) {
        switch (period) {
          case "yearly":
            // Year = annual target
            return targets;
          case "monthly":
            // Month = from table
            return monthTarget;
          case "last_month":
            // Last month = from table or fallback to monthly calculation
            return lastMonthTarget || monthTarget;
          case "weekly":
            // Week = Month ÷ 4 (round UP to ensure targets stay on higher side)
            return {
              sales: Math.ceil(monthTarget.sales / 4),
              visits: Math.ceil(monthTarget.visits / 4),
              leads_attended: Math.ceil(monthTarget.leads_attended / 4),
              followups: Math.ceil(monthTarget.followups / 4),
            };
          case "daily":
            // Day = Month ÷ 25 (round UP to ensure targets stay on higher side)
            return {
              sales: Math.ceil(monthTarget.sales / 25),
              visits: Math.ceil(monthTarget.visits / 25),
              leads_attended: Math.ceil(monthTarget.leads_attended / 25),
              followups: Math.ceil(monthTarget.followups / 25),
            };
          case "yesterday":
            // Yesterday = same as daily (Month ÷ 25, round UP)
            return {
              sales: Math.ceil(monthTarget.sales / 25),
              visits: Math.ceil(monthTarget.visits / 25),
              leads_attended: Math.ceil(monthTarget.leads_attended / 25),
              followups: Math.ceil(monthTarget.followups / 25),
            };
        }
      }
    }
    
    // Fallback to original calculation (divide annual by 12/52/260)
    return {
      sales: scaleTargetByPeriod(targets.sales, period),
      visits: scaleTargetByPeriod(targets.visits, period),
      leads_attended: scaleTargetByPeriod(targets.leads_attended, period),
      followups: scaleTargetByPeriod(targets.followups, period),
    };
  };
  
  // Super admin check - they don't have a company
  if (user && !user.company_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Star className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Vision Board</CardTitle>
            <CardDescription className="text-base">
              Vision Board is a personal goal tracking feature for company team members. 
              As a Super Admin, you can view company-wide vision boards through the admin panel 
              once you select a company to manage.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>To access Vision Board features, please log in as a company admin or user account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { data: apiResponse, isLoading: boardLoading } = useQuery<VisionBoardApiResponse>({
    queryKey: ["/api/vision-board"],
    staleTime: 0,
    gcTime: 0,
  });

  // Determine if this is team view or personal view
  const isTeamView = apiResponse?.mode === 'team';
  const visionBoard = isTeamView ? null : apiResponse?.board;
  const teamAggregate = isTeamView ? apiResponse?.aggregate : null;
  const teamProgress = isTeamView ? apiResponse?.progress : null;
  const boardCount = apiResponse?.board_count || 0;

  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery<VisionBoardProgress>({
    queryKey: ["/api/vision-board", visionBoard?.id, "progress"],
    enabled: !!visionBoard?.id && !isTeamView,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: earnings } = useQuery<VisionBoardEarning[]>({
    queryKey: ["/api/vision-board", visionBoard?.id, "earnings"],
    enabled: !!visionBoard?.id && !isTeamView,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch user's own pipeline data for projected incentive (Vision Board dual-ring)
  interface MyPipelineResponse {
    projected_incentive: number;
    actual_incentive: number;
    currency: string;
    stages: Array<{
      stage_number: number;
      stage_name: string;
      color: string;
      count: number;
      incentives: number;
      projected_incentive: number;
      is_final_stage: boolean;
    }>;
  }
  
  const { data: myPipelineData, isLoading: isPipelineLoading } = useQuery<MyPipelineResponse>({
    queryKey: ["/api/vision-board/my-pipeline"],
    enabled: !isTeamView && !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });
  
  // Use projected incentive directly from API response
  const userProjectedData = {
    projectedIncentive: myPipelineData?.projected_incentive || 0,
    actualIncentive: myPipelineData?.actual_incentive || 0,
  };

  // Fetch custom views for Vision Board section cards
  const { data: customViews = [] } = useQuery<CustomView[]>({
    queryKey: ["/api/custom-views"],
    enabled: !!user?.company_id,
    staleTime: 0,
    gcTime: 0,
  });

  const enabledViews = customViews.filter(v => v.is_enabled);

  // Fetch custom view counts — with optional per-user filter for admins
  const { data: customViewsCounts, isLoading: isLoadingCounts } = useQuery<{ counts: Record<string, number> }>({
    queryKey: ["/api/custom-views-counts", quickActionsUserId],
    queryFn: async () => {
      const url = quickActionsUserId !== "all"
        ? `/api/custom-views-counts?userId=${encodeURIComponent(quickActionsUserId)}`
        : "/api/custom-views-counts";
      return apiRequest<{ counts: Record<string, number> }>("GET", url);
    },
    enabled: enabledViews.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60000,
  });

  // Fetch company settings for weekly_off_days
  const { data: companySettings } = useQuery<{ settings: { timezone?: string; weekly_off_days?: number[] } }>({
    queryKey: ["/api/admin/company/settings"],
    enabled: !!user?.company_id,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch company holidays for expected percentage calculation
  // Fetch holidays for the current year to cover all periods
  const currentYear = new Date().getFullYear();
  const { data: holidays = [] } = useQuery<CompanyHoliday[]>({
    queryKey: ["/api/holidays"],
    enabled: !!user?.company_id,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch conversion performance data
  interface ConversionPerformanceData {
    company: {
      user_name: string;
      stage_i_count: number;
      stages: Array<{
        stage_id: string;
        stage_name: string;
        stage_number: number;
        count: number;
        conversion_percent_from_stage_i: number;
      }>;
      overall_percent: number;
    } | null;
    sheets: Array<{
      sheet_id: string;
      sheet_name: string;
      stage_i_count: number;
      stages: Array<{
        stage_id: string;
        stage_name: string;
        stage_number: number;
        count: number;
        conversion_percent_from_stage_i: number;
      }>;
      overall_percent: number;
    }>;
    stages_config: Array<{
      stage_id: string;
      stage_number: number;
      stage_name: string;
      color: string;
    }>;
  }

  const { data: conversionPerformance, isLoading: conversionPerformanceLoading, error: conversionPerformanceError } = useQuery<ConversionPerformanceData>({
    queryKey: ["/api/vision-board/conversion-performance", conversionDateFilter, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("dateFilter", conversionDateFilter);
      if (conversionDateFilter === "custom" && customStartDate && customEndDate) {
        params.append("startDate", customStartDate.toISOString());
        params.append("endDate", customEndDate.toISOString());
      }
      const res = await fetch(`/api/vision-board/conversion-performance?${params.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch conversion performance");
      return res.json();
    },
    enabled: !!user?.company_id && conversionSectionVisible,
    staleTime: 0,
    gcTime: 0,
  });

  // Group views by section in the specified order
  const sectionOrder = ['overdue_actions', 'action_today', 'data_mismatch', 'achievement', 'custom_views'] as const;
  const viewsBySection = sectionOrder.reduce((acc, section) => {
    const sectionViews = enabledViews.filter(v => v.section === section);
    if (sectionViews.length > 0) {
      acc[section] = sectionViews;
    }
    return acc;
  }, {} as Record<string, CustomView[]>);

  // Loading states — split initial page load from user-switch transitions
  const isUserSwitching = loadingAdminCompany || loadingAdminUser;
  const isInitialLoading = (boardLoading || isUserSwitching) && !hasVisionBoardLoadedOnce;

  if (isInitialLoading) {
    return (
      <AnimatePresence>
        <VisionBoardPreloader />
      </AnimatePresence>
    );
  }
  // Mark as loaded so subsequent visits skip the full preloader
  hasVisionBoardLoadedOnce = true;

  // Admin viewing Company Vision with no targets set
  if (isCompanyView && !loadingAdminCompany && !adminCompanyVision?.board) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
              <Target className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Company Vision Not Configured</CardTitle>
            <CardDescription className="text-base">
              Set up your company's annual vision targets in the Admin Console.
              Go to Vision Board Targets to configure company-wide goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/admin">
              <Button data-testid="button-go-to-admin">
                Go to Admin Console
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Viewing specific user with no admin targets set - only show empty state for admin viewing others
  // Regular users viewing themselves should fall back to personal board (handled below)
  if (viewingUserId && !loadingAdminUser && !adminUserVision?.target && viewingUserId !== user?.id && isAdminOrMultiSheet) {
    const userName = allUsers.find(u => u.id === selectedUserView)?.name || 'This user';
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Star className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Vision Targets Not Set</CardTitle>
            <CardDescription className="text-base">
              {`${userName}'s vision targets haven't been configured yet. Go to Admin Console to set up their annual goals.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/admin">
              <Button data-testid="button-go-to-admin">
                Go to Admin Console
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Team view with no boards - show empty state (fallback for non-admin users)
  if (isTeamView && (!teamAggregate || boardCount === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Team Vision Board</CardTitle>
            <CardDescription className="text-base">
              No team members have created vision boards yet.
              As an admin or multi-sheet user, you can view team totals once team members set up their vision boards.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Team members can access Vision Board to set their personal goals and track progress.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Personal view - show setup wizard if no board (boardLoading guard prevents false-positive
  // flash when gcTime:0 clears visionBoard from cache before the fresh fetch resolves)
  if (!boardLoading && !isTeamView && !visionBoard) {
    return <SetupWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] })} />;
  }

  // Unified data for admin-controlled views, team views, and personal views
  const teamTotals = teamProgress?.team_totals;
  const visionYear = new Date().getFullYear();
  const yearStart = new Date(visionYear, 0, 1);
  const yearEnd = new Date(visionYear, 11, 31);
  
  // Calculate total incentives from admin_actual_incentives for a user
  const totalUserIncentives = adminUserVision?.incentives?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
  
  // Priority 1: Admin viewing Company Vision - uses team aggregation for actual performance
  // Priority 2: Admin/User viewing specific user's admin-controlled targets - uses personal progress
  // Priority 3: Old team view (for multi-sheet users without admin data)  
  // Priority 4: Old personal vision board (user-created) - regular user experience unchanged
  
  // For Company Vision, use team totals for actual performance data
  // These provide company-wide aggregation from all users' vision board progress
  const hasTeamData = teamProgress && teamTotals;
  const companyGoalAmount = adminCompanyVision?.board?.goal_amount || 0;
  const companyActualIncentives = hasTeamData ? (teamTotals?.actual_incentive || 0) : 0;
  const companyProjectedIncentives = hasTeamData ? (teamTotals?.projected_incentive || 0) : 0;
  
  const displayData = isCompanyView && adminCompanyVision?.board ? {
    goalAmount: companyGoalAmount,
    goalDescription: adminCompanyVision.board.goal_description || 'Company Annual Goal',
    currency: adminCompanyVision.board.currency || "INR",
    images: ((adminCompanyVision.board.images || []) as Array<{url: string; caption?: string; id?: string; order?: number}>).map(img => typeof img === 'string' ? { url: img, caption: '' } : { url: img.url, caption: img.caption || '' }),
    progressPercent: companyGoalAmount > 0 
      ? Math.min(100, (companyActualIncentives / companyGoalAmount) * 100) 
      : 0,
    earned: companyActualIncentives,
    remaining: Math.max(0, companyGoalAmount - companyActualIncentives),
    projectedIncentive: companyProjectedIncentives,
    actualIncentive: companyActualIncentives,
    projectedProgressPercent: companyGoalAmount > 0 
      ? Math.min(100, (companyProjectedIncentives / companyGoalAmount) * 100) 
      : 0,
    effortTargets: getScaledEffortTargets(adminCompanyVision.board.annual_targets, selectedPeriod, adminCompanyVision.monthly_targets),
    effortAchieved: teamProgress?.team_effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: yearEnd,
    startDate: yearStart,
  } : viewingUserId && adminUserVision?.target ? {
    goalAmount: adminUserVision.target.goal_amount || 0,
    goalDescription: adminUserVision.target.goal_description || `${adminUserVision.user_name}'s Goals`,
    currency: adminUserVision.target.currency || "INR",
    images: ((adminUserVision.target.images || []) as Array<{url: string; caption?: string; id?: string; order?: number}>).map(img => typeof img === 'string' ? { url: img, caption: '' } : { url: img.url, caption: img.caption || '' }),
    // Use actual earnings from progress API for consistency
    progressPercent: adminUserVision.target.goal_amount > 0 
      ? Math.min(100, ((progress?.earnings.total || totalUserIncentives) / adminUserVision.target.goal_amount) * 100) 
      : 0,
    earned: progress?.earnings.total || totalUserIncentives,
    remaining: Math.max(0, (adminUserVision.target.goal_amount || 0) - (progress?.earnings.total || totalUserIncentives)),
    projectedIncentive: userProjectedData.projectedIncentive,
    actualIncentive: progress?.earnings.total || totalUserIncentives,
    projectedProgressPercent: adminUserVision.target.goal_amount > 0 
      ? Math.min(100, (userProjectedData.projectedIncentive / adminUserVision.target.goal_amount) * 100) 
      : 0,
    effortTargets: getScaledEffortTargets(adminUserVision.target.annual_targets, selectedPeriod, adminUserVision.monthly_targets),
    // Use effort_achieved from adminUserVision response (calculated on backend)
    effortAchieved: adminUserVision.effort_achieved?.[selectedPeriod] || progress?.effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: yearEnd,
    startDate: yearStart,
  } : isTeamView && teamAggregate ? {
    goalAmount: teamTotals?.total_goal || 0,
    goalDescription: `Team Total (${boardCount} members)`,
    currency: teamAggregate.currency || "INR",
    images: (teamAggregate.images || []).map((url: string) => ({ url, caption: "" })),
    progressPercent: teamTotals?.overall_progress_percent || 0,
    earned: teamTotals?.total_earnings || 0,
    remaining: Math.max(0, (teamTotals?.total_goal || 0) - (teamTotals?.total_earnings || 0)),
    projectedIncentive: teamTotals?.projected_incentive || 0,
    actualIncentive: teamTotals?.actual_incentive || 0,
    projectedProgressPercent: teamTotals?.projected_progress_percent || 0,
    effortTargets: getScaledEffortTargets(teamAggregate.effort_targets, selectedPeriod),
    effortAchieved: teamProgress?.team_effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: new Date(teamAggregate.target_date),
    startDate: new Date(teamAggregate.start_date),
  } : visionBoard ? {
    goalAmount: visionBoard.goal_amount,
    goalDescription: visionBoard.goal_description,
    currency: visionBoard.currency || "INR",
    images: ((visionBoard.images || []) as Array<any>).map((img: any) => typeof img === 'string' ? { url: img, caption: '' } : { url: img.url, caption: img.caption || '' }),
    progressPercent: progress?.earnings.progress_percent || 0,
    earned: progress?.earnings.total || 0,
    remaining: progress?.earnings.remaining || 0,
    projectedIncentive: userProjectedData.projectedIncentive,
    actualIncentive: userProjectedData.actualIncentive,
    projectedProgressPercent: visionBoard.goal_amount > 0 
      ? Math.min(100, (userProjectedData.projectedIncentive / visionBoard.goal_amount) * 100) 
      : 0,
    effortTargets: getScaledEffortTargets(visionBoard.effort_targets, selectedPeriod),
    effortAchieved: progress?.effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: new Date(visionBoard.target_date),
    startDate: visionBoard.start_date ? new Date(visionBoard.start_date) : new Date(visionBoard.created_at!),
  } : null;

  if (!displayData && !boardLoading) return null;

  // When boardLoading=true, displayData may be null (gcTime:0 cleared cache on remount).
  // These fallbacks only activate during that window; all render uses are inside
  // boardLoading ? <skeleton> : <real section> blocks so no fallback value ever renders.
  const currency = displayData ? displayData.currency : 'INR';
  const currencySymbol = currencySymbols[currency] || currency;
  const images = displayData ? displayData.images : ([] as Array<{url: string; caption: string}>);
  const currentTargets = displayData ? displayData.effortTargets : { sales: 0, visits: 0, leads_attended: 0, followups: 0 };
  const currentAchieved = displayData ? displayData.effortAchieved : { sales: 0, visits: 0, leads_attended: 0, followups: 0 };
  
  // Calculate individual progress percentages for the 3 metrics (excluding Sales)
  const newLeadsProgress = currentTargets.leads_attended > 0 
    ? Math.min(100, (currentAchieved.leads_attended / currentTargets.leads_attended) * 100) 
    : 0;
  const followupsProgress = currentTargets.followups > 0 
    ? Math.min(100, (currentAchieved.followups / currentTargets.followups) * 100) 
    : 0;
  const visitsProgress = currentTargets.visits > 0 
    ? Math.min(100, (currentAchieved.visits / currentTargets.visits) * 100) 
    : 0;
  
  // Calculate expected percentage based on selected period
  const weeklyOffDays = companySettings?.settings?.weekly_off_days || [];
  const timezone = getCompanyTimezone(company);
  const holidayDates = holidays.map(h => h.date); // h.date is ISO string
  const expectedPercent = calculateExpectedPercentage(
    selectedPeriod,
    weeklyOffDays,
    holidayDates,
    timezone,
    displayData?.startDate  // Pass Vision Board start date for yearly calculation
  );
  
  // Labels based on view type
  const getLabels = () => {
    if (isCompanyView && adminCompanyVision?.board) {
      return {
        headerTitle: "Company Goal",
        progressLabel: "Company Progress",
        progressSubLabel: "Total Completed",
        earnedLabel: "Company Earned",
        remainingLabel: "Company Remaining",
        effortTitle: "Company Effort Targets",
      };
    }
    if (viewingUserId && adminUserVision?.target) {
      const isOwnView = viewingUserId === user?.id;
      const userName = isOwnView ? "Your" : `${adminUserVision.user_name}'s`;
      return {
        headerTitle: isOwnView ? "Your Goal" : `${adminUserVision.user_name}'s Goal`,
        progressLabel: `${userName} Progress`,
        progressSubLabel: "Completed",
        earnedLabel: "Earned",
        remainingLabel: "Remaining",
        effortTitle: `${userName} Effort Targets`,
      };
    }
    if (isTeamView) {
      return {
        headerTitle: "Team Goal",
        progressLabel: "Team Progress",
        progressSubLabel: "Total Completed",
        earnedLabel: "Team Earned",
        remainingLabel: "Team Remaining",
        effortTitle: "Team Effort Targets",
      };
    }
    return {
      headerTitle: "Your Dream",
      progressLabel: "Vision Progress",
      progressSubLabel: "Completed",
      earnedLabel: "Earned",
      remainingLabel: "Remaining",
      effortTitle: "Effort Targets",
    };
  };
  const labels = getLabels();

  // Refresh all vision board data
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/admin/company-data"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/admin/user-data"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/my-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/closed-sales"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/conversion-performance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vision-board/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/custom-views"] });
    queryClient.invalidateQueries({ queryKey: ["/api/custom-views-counts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/work-report"] });
  };

  // Get selected user name for display
  const getSelectedUserName = () => {
    if (selectedUserView === 'company') return 'Company Vision';
    if (selectedUserView === 'me') return 'My Vision';
    const selectedUser = allUsers.find(u => u.id === selectedUserView);
    return selectedUser?.name || 'Unknown User';
  };

  return (
    <div className="relative h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pb-16">
      {/* Subtle inline spinner overlay during user-switch transitions (no full-page preloader) */}
      {isUserSwitching && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg px-6 py-4 shadow-lg border">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* Top-right controls: Refresh button (all users) + User filter dropdown (admins) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefreshAll}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg h-9 w-9"
              data-testid="button-vision-board-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingCount > 0 ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh all data</TooltipContent>
        </Tooltip>
        {isAdminOrMultiSheet && (
          <Select value={selectedUserView} onValueChange={setSelectedUserView}>
            <SelectTrigger 
              className="w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 shadow-lg"
              data-testid="select-vision-user-filter"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select View" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company" data-testid="option-company-vision">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Company Vision
                </div>
              </SelectItem>
              <SelectItem value="me" data-testid="option-my-vision">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  My Vision
                </div>
              </SelectItem>
              {allUsers.filter(u => u.id !== user?.id).map(u => (
                <SelectItem key={u.id} value={u.id} data-testid={`option-user-${u.id}`}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {u.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Tab bar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg p-0.5">
        <button
          onClick={() => setActiveVisionTab("vision")}
          data-testid="tab-vision"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeVisionTab === "vision" ? "bg-white dark:bg-slate-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Target className="h-3.5 w-3.5" />
          Vision Board
        </button>
        <button
          onClick={() => setActiveVisionTab("work-report")}
          data-testid="tab-work-report"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeVisionTab === "work-report" ? "bg-white dark:bg-slate-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Clock className="h-3.5 w-3.5" />
          Work Report
        </button>
      </div>

      {activeVisionTab === "work-report" ? (
        <div className="pt-16 pb-12 px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Time-wise Work Report
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAdminOrMultiSheet && allUsers.length > 0 && (
                      <Select value={workReportUserFilter} onValueChange={setWorkReportUserFilter}>
                        <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-work-report-user">
                          <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {allUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <input
                      type="date"
                      value={workReportDate}
                      onChange={e => setWorkReportDate(e.target.value)}
                      className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground"
                      data-testid="input-work-report-date"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => refetchWorkReport()}
                      aria-label="Refresh work report"
                      data-testid="button-refresh-work-report"
                    >
                      <RefreshCw className={`h-4 w-4 ${workReportLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {workReportLoading ? (
                  <div className="p-6 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : !workReportData || workReportData.users.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No activity found for {workReportDate}
                  </div>
                ) : (
                  <WorkReportTable
                    workReportData={workReportData}
                    workReportDate={workReportDate}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <>

      {boardLoading ? (
        <div className="h-[30vh] min-h-[200px] bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-orange-500/40 animate-pulse flex flex-col items-center justify-center gap-3">
          <Skeleton className="h-4 w-32 bg-white/20" />
          <Skeleton className="h-8 w-48 bg-white/30" />
          <Skeleton className="h-4 w-40 bg-white/20" />
        </div>
      ) : images.length > 0 ? (
        <div className="relative h-[40vh] min-h-[300px]">
          <ImageCarousel images={images} />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-white"
            >
              {isTeamView && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Team Total ({boardCount} members)</span>
                </div>
              )}
              <p className="text-sm uppercase tracking-wider mb-2 opacity-80">{labels.headerTitle}</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                {formatCurrency(displayData.goalAmount, currency)}
              </h1>
              {displayData.goalDescription && (
                <p className="text-lg opacity-90">{displayData.goalDescription}</p>
              )}
            </motion.div>
          </div>
        </div>
      ) : (
        <div className={cn(
          "relative h-[30vh] min-h-[200px] flex items-center justify-center",
          isTeamView 
            ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-500"
            : "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500"
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-white"
          >
            {isTeamView && (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Team Total ({boardCount} members)</span>
              </div>
            )}
            <p className="text-sm uppercase tracking-wider mb-2 opacity-80">{labels.headerTitle}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {formatCurrency(displayData.goalAmount, currency)}
            </h1>
            {displayData.goalDescription && (
              <p className="text-lg opacity-90">{displayData.goalDescription}</p>
            )}
          </motion.div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        <div className="flex flex-col gap-6">
          {/* Row 1: Vision Progress + Effort Target (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
            {/* Column 1: Vision Progress */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl overflow-hidden h-full">
              <CardContent className="p-6">
                <div className="mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{labels.progressLabel}</span>
                </div>
                {boardLoading ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Skeleton className="h-44 w-44 rounded-full" />
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-28" />
                    <div className="w-full flex gap-2 mt-2">
                      <Skeleton className="h-10 flex-1 rounded-lg" />
                      <Skeleton className="h-10 flex-1 rounded-lg" />
                    </div>
                  </div>
                ) : (
                <div className="flex flex-col items-center">
                  {/* Unified dual-ring UI for both team and personal views */}
                  <DualRingProgress 
                    actualProgress={displayData.progressPercent}
                    projectedProgress={isPipelineLoading ? 0 : displayData.projectedProgressPercent}
                    size={180}
                    outerStrokeWidth={8}
                    innerStrokeWidth={12}
                  >
                    <div className="text-center px-2" data-testid="dual-ring-center-content">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      >
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-actual-earned">
                          {formatCurrency(displayData.earned || 0, currency)}
                        </p>
                        <p className="text-xs text-muted-foreground -mt-0.5">/</p>
                        {isPipelineLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto" data-testid="text-projected-incentive" />
                        ) : (
                          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400" data-testid="text-projected-incentive">
                            {formatCurrency(displayData.projectedIncentive || 0, currency)}
                          </p>
                        )}
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="text-[10px] font-medium mt-1 bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent"
                        data-testid="text-motivational-message"
                      >
                        {getMotivationalMessage(displayData.progressPercent || 0, isPipelineLoading ? 0 : (displayData.projectedProgressPercent || 0))}
                      </motion.p>
                    </div>
                  </DualRingProgress>
                  
                  {/* Unified legend for both team and personal views */}
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs" data-testid="dual-ring-legend">
                    <div className="flex items-center gap-1.5" data-testid="legend-projected">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">
                        {isPipelineLoading ? (
                          <Loader2 className="inline h-3 w-3 animate-spin align-middle" />
                        ) : (
                          <>Projected {Math.round(displayData.projectedProgressPercent || 0)}% 
                          <span className="font-medium text-amber-600 dark:text-amber-400" data-testid="card-projected">
                            ({formatCurrency(displayData.projectedIncentive || 0, currency)})
                          </span></>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" data-testid="legend-actual">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">
                        Actual {Math.round(displayData.progressPercent || 0)}% 
                        <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="card-actual">
                          ({formatCurrency(displayData.earned || 0, currency)})
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Unified Remaining section for both team and personal views */}
                  <div className="mt-3 w-full" data-testid="compact-stats">
                    <div className="pt-1" data-testid="remaining-section-dual">
                      <p className="text-xs text-muted-foreground text-center mb-1.5">{labels.remainingLabel}</p>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-center py-1 px-2 rounded bg-amber-50 dark:bg-amber-950/30">
                          <p className="text-[10px] text-amber-600 dark:text-amber-400">Projected</p>
                          {isPipelineLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto my-0.5" />
                          ) : (
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                              {formatCurrency(Math.max(0, displayData.goalAmount - (displayData.projectedIncentive || 0)), currency)}
                            </p>
                          )}
                        </div>
                        <div className="flex-1 text-center py-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Actual</p>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(displayData.remaining || 0, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Edit Goal / Add Incentive links - subtle */}
                  {!isTeamView && visionBoard && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/50" data-testid="action-bar">
                      <EditVisionWizard 
                        visionBoard={visionBoard} 
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
                          refetchProgress();
                        }}
                        triggerVariant="ghost"
                      />
                      <span className="text-muted-foreground/50">·</span>
                      <UpdateIncentivesDialog 
                        visionBoardId={visionBoard.id} 
                        onSuccess={() => refetchProgress()}
                        triggerVariant="ghost"
                      />
                    </div>
                  )}
                  
                  {/* Messages Section */}
                  <VisionBoardMessages />
                </div>
                )}
              </CardContent>
            </Card>
            
          </motion.div>

            {/* Column 2: Effort Target */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      {labels.effortTitle}
                    </CardTitle>
                  {/* Unified date filter for both team and personal views */}
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg flex-wrap">
                    {(["daily", "yesterday", "weekly", "monthly", "last_month", "yearly"] as const).map((period) => {
                      const periodLabels: Record<typeof period, string> = {
                        daily: "Today",
                        yesterday: "Yesterday",
                        weekly: "This Week",
                        monthly: "This Month",
                        last_month: "Last Month",
                        yearly: "This Year"
                      };
                      return (
                        <button
                          key={period}
                          onClick={() => setSelectedPeriod(period)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-all",
                            selectedPeriod === period
                              ? "bg-white dark:bg-slate-600 shadow font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`button-period-${period}`}
                        >
                          {periodLabels[period]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EffortMetricCard
                    icon={Users}
                    label="New Leads"
                    target={currentTargets.leads_attended}
                    achieved={currentAchieved.leads_attended}
                    gradient="from-purple-400 to-pink-500"
                    delay={0.1}
                    expectedPercent={expectedPercent}
                    selectedPeriod={selectedPeriod}
                    loading={boardLoading || progressLoading}
                  />
                  <EffortMetricCard
                    icon={MessageSquare}
                    label="Follow-ups"
                    target={currentTargets.followups}
                    achieved={currentAchieved.followups}
                    gradient="from-orange-400 to-red-500"
                    delay={0.2}
                    expectedPercent={expectedPercent}
                    selectedPeriod={selectedPeriod}
                    loading={boardLoading || progressLoading}
                  />
                  <EffortMetricCard
                    icon={MapPin}
                    label="Visits"
                    target={currentTargets.visits}
                    achieved={currentAchieved.visits}
                    gradient="from-blue-400 to-cyan-500"
                    delay={0.3}
                    expectedPercent={expectedPercent}
                    selectedPeriod={selectedPeriod}
                    loading={boardLoading || progressLoading}
                  />
                  <EffortMetricCard
                    icon={CheckCircle2}
                    label="Sales"
                    target={currentTargets.sales}
                    achieved={currentAchieved.sales}
                    gradient="from-green-400 to-emerald-500"
                    delay={0.4}
                    expectedPercent={expectedPercent}
                    selectedPeriod={selectedPeriod}
                    loading={boardLoading || progressLoading}
                  />
                </div>
                
                {/* Average Effort Meter Card - Full Width */}
                <div className="mt-3">
                  <AverageEffortMeterCard
                    newLeadsProgress={newLeadsProgress}
                    followupsProgress={followupsProgress}
                    visitsProgress={visitsProgress}
                    expectedPercent={expectedPercent}
                    selectedPeriod={selectedPeriod}
                    delay={0.5}
                  />
                </div>
                
                <p className="text-xs text-center text-muted-foreground mt-6">
                  Effort metrics are auto-tracked based on your lead activities
                </p>
              </CardContent>
            </Card>
          </motion.div>
          </div>
          
          {/* Row 2: Quick Actions (single column) */}
          {/* Custom Views Section Cards */}
            {Object.keys(viewsBySection).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
                  {user?.role === 'company_admin' && (
                    <Select value={quickActionsUserId} onValueChange={setQuickActionsUserId}>
                      <SelectTrigger
                        className="h-7 text-xs w-[140px]"
                        data-testid="select-quick-actions-user-filter"
                      >
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {allUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sectionOrder.map((section, sectionIdx) => {
                    const views = viewsBySection[section];
                    if (!views || views.length === 0) return null;
                    
                    const config = SECTION_CONFIG[section];
                    const SectionIcon = config.icon;
                    const totalCount = views.reduce((sum, view) => {
                      return sum + (customViewsCounts?.counts?.[view.id] || 0);
                    }, 0);
                    
                    return (
                      <motion.div
                        key={section}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + sectionIdx * 0.1 }}
                      >
                        <Card className={cn(
                          "border-0 shadow-lg bg-gradient-to-br backdrop-blur-xl overflow-hidden",
                          totalCount > 0 ? config.gradient : "from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30",
                          totalCount > 0 ? "bg-white/80 dark:bg-slate-800/80" : "bg-white/60 dark:bg-slate-800/60 opacity-75"
                        )}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "p-1.5 rounded-lg",
                                  totalCount > 0 ? "bg-white/50 dark:bg-slate-700/50" : "bg-slate-200/50 dark:bg-slate-700/30"
                                )}>
                                  <SectionIcon className={cn(
                                    "h-4 w-4",
                                    totalCount > 0 ? "text-foreground/80" : "text-muted-foreground/60"
                                  )} />
                                </div>
                                <CardTitle className={cn(
                                  "text-sm font-medium",
                                  totalCount === 0 && "text-muted-foreground"
                                )}>{config.title}</CardTitle>
                              </div>
                              {isLoadingCounts ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
                              ) : totalCount > 0 ? (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground/10 px-2 text-xs font-medium">
                                  {totalCount}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  All caught up
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-1 pb-3">
                            <div className="space-y-1">
                              {views.map((view) => {
                                const ViewIcon = ICON_MAP[view.icon] || Star;
                                const colorClass = COLOR_MAP[view.icon_color] || "text-blue-500";
                                const bgClass = BG_COLOR_MAP[view.icon_color] || "bg-blue-500/10";
                                const badgeBgClass = BADGE_BG_MAP[view.icon_color] || "bg-blue-500";
                                const count = customViewsCounts?.counts?.[view.id] || 0;
                                
                                return (
                                  <Link 
                                    key={view.id} 
                                    href={`/custom-view/${view.id}`}
                                    data-testid={`link-vision-board-view-${view.id}`}
                                  >
                                    <motion.div
                                      whileHover={{ x: 4 }}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer",
                                        "bg-white/60 dark:bg-slate-700/50",
                                        "hover:bg-white/90 dark:hover:bg-slate-600/60",
                                        "transition-colors duration-150"
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className={cn("p-1.5 rounded-md", bgClass)}>
                                          <ViewIcon className={cn("h-3.5 w-3.5", colorClass)} />
                                        </div>
                                        <span className="text-sm font-medium">{view.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {view.show_badge && (
                                          isLoadingCounts ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
                                          ) : count > 0 ? (
                                            <span className={cn(
                                              "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium text-white",
                                              badgeBgClass
                                            )}>
                                              {count}
                                            </span>
                                          ) : null
                                        )}
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50" />
                                      </div>
                                    </motion.div>
                                  </Link>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Conversion Performance Table */}
            <div ref={conversionSectionRef} />
            {(conversionPerformance || conversionPerformanceLoading || conversionPerformanceError) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Conversion Performance
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Select
                          value={conversionDateFilter}
                          onValueChange={(v) => setConversionDateFilter(v as typeof conversionDateFilter)}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_time">All Time</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="last_week">Last Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                        {conversionDateFilter === "custom" && (
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-[140px] justify-start text-left font-normal text-xs"
                                >
                                  <CalendarIcon className="h-3 w-3 mr-2" />
                                  {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={customStartDate}
                                  onSelect={setCustomStartDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <span className="text-xs text-muted-foreground">to</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-[140px] justify-start text-left font-normal text-xs"
                                >
                                  <CalendarIcon className="h-3 w-3 mr-2" />
                                  {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "End date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={customEndDate}
                                  onSelect={setCustomEndDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {conversionPerformanceLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : conversionPerformanceError ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p>Failed to load conversion performance data</p>
                        <p className="text-xs mt-1">{conversionPerformanceError.message}</p>
                      </div>
                    ) : !conversionPerformance || (!conversionPerformance.company && conversionPerformance.sheets.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No conversion performance data available</p>
                        <p className="text-xs mt-1">Conversion settings may not be configured</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold sticky left-0 bg-background z-10">Sheet</TableHead>
                              <TableHead className="font-semibold text-center">
                                {(() => {
                                  // Get Stage I name from stages_config
                                  const stageI = conversionPerformance.stages_config?.find(s => s.stage_number === 1);
                                  return stageI?.stage_name || "Stage I";
                                })()}
                              </TableHead>
                              {(() => {
                                // Get stages from company or first sheet to determine headers
                                const stagesForHeader = conversionPerformance.company?.stages || conversionPerformance.sheets[0]?.stages || [];
                                // Find the last stage number to determine if current stage is the last
                                const maxStageNumber = Math.max(...(conversionPerformance.stages_config?.map(s => s.stage_number) || [1]));
                                
                                return stagesForHeader.map((stage) => {
                                  const stageConfig = conversionPerformance.stages_config?.find(s => s.stage_id === stage.stage_id);
                                  const stageColor = stageConfig?.color || '#3b82f6';
                                  
                                  // Find previous stage for conversion path
                                  const previousStageNumber = stage.stage_number - 1;
                                  const previousStage = conversionPerformance.stages_config?.find(s => s.stage_number === previousStageNumber);
                                  // Use "Lead" when previous stage is Stage I, otherwise use the stage name
                                  const previousStageName = previousStageNumber === 1 ? "Lead" : (previousStage?.stage_name || "Previous");
                                  
                                  // Use "Conv." for the last stage, otherwise use full stage name
                                  const currentStageName = stage.stage_number === maxStageNumber ? "Conv." : stage.stage_name;
                                  const conversionPath = `${previousStageName} to ${currentStageName}`;
                                  
                                  return (
                                    <React.Fragment key={stage.stage_id}>
                                      <TableHead className="font-semibold text-center" style={{ color: stageColor, borderColor: `${stageColor}40` }}>
                                        {stage.stage_name}
                                      </TableHead>
                                      <TableHead className="font-semibold text-center" style={{ color: stageColor, borderColor: `${stageColor}40` }}>
                                        {conversionPath}
                                      </TableHead>
                                    </React.Fragment>
                                  );
                                });
                              })()}
                              <TableHead className="font-semibold text-center">Lead to Conv.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Company Row - Only for Admins */}
                            {conversionPerformance.company && (
                              <TableRow className="bg-muted/50 font-semibold">
                                <TableCell className="font-bold sticky left-0 bg-muted/50 z-10">
                                  {conversionPerformance.company.user_name}
                                </TableCell>
                                <TableCell className="text-center font-semibold">
                                  {conversionPerformance.company.stage_i_count.toLocaleString()}
                                </TableCell>
                                {conversionPerformance.company.stages.map((stage) => {
                                  const stageConfig = conversionPerformance.stages_config?.find(s => s.stage_id === stage.stage_id);
                                  const stageColor = stageConfig?.color || '#3b82f6';
                                  return (
                                    <React.Fragment key={stage.stage_id}>
                                      <TableCell className="text-center" style={{ borderColor: `${stageColor}20` }}>
                                        {stage.count.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-center" style={{ borderColor: `${stageColor}20` }}>
                                        {stage.conversion_percent_from_stage_i.toFixed(1)}%
                                      </TableCell>
                                    </React.Fragment>
                                  );
                                })}
                                <TableCell className="text-center font-semibold">
                                  {conversionPerformance.company.overall_percent.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            )}
                            {/* Sheet Rows */}
                            {conversionPerformance.sheets.map((sheet) => (
                              <TableRow key={sheet.sheet_id}>
                                <TableCell className="sticky left-0 bg-background z-10">
                                  <span className="font-medium">{sheet.sheet_name}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {sheet.stage_i_count.toLocaleString()}
                                </TableCell>
                                {sheet.stages.map((stage) => {
                                  const stageConfig = conversionPerformance.stages_config?.find(s => s.stage_id === stage.stage_id);
                                  const stageColor = stageConfig?.color || '#3b82f6';
                                  return (
                                    <React.Fragment key={stage.stage_id}>
                                      <TableCell className="text-center" style={{ borderColor: `${stageColor}20` }}>
                                        {stage.count.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-center" style={{ borderColor: `${stageColor}20` }}>
                                        {stage.conversion_percent_from_stage_i.toFixed(1)}%
                                      </TableCell>
                                    </React.Fragment>
                                  );
                                })}
                                <TableCell className="text-center">
                                  {sheet.overall_percent.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {earnings && earnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="mt-6 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Recent Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {earnings.slice(0, 10).map((earning, idx) => (
                        <motion.div
                          key={earning.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              earning.source_type === "closing"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-purple-100 dark:bg-purple-900/30"
                            )}>
                              {earning.source_type === "closing" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {earning.source_type === "closing" ? "Sale" : "Incentive"}
                              </p>
                              {earning.description && (
                                <p className="text-xs text-muted-foreground">{earning.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">
                              +{formatCurrency(earning.amount, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(earning.earned_at), "MMM d")}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            

          {/* Row 3: Goal Timeline (single column) */}
          {!isTeamView && progress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Goal Timeline</span>
                  </div>
                  
                  <div className="text-center py-3">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {progress?.timeline.days_remaining || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">days remaining</p>
                  </div>
                  
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.timeline.time_progress_percent || 0}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.ceil((progress?.timeline.days_remaining || 0) / 7)}
                      </p>
                      <p className="text-xs text-muted-foreground">weeks</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.ceil((progress?.timeline.days_remaining || 0) / 30)}
                      </p>
                      <p className="text-xs text-muted-foreground">months</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.round(progress?.timeline.time_progress_percent || 0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">elapsed</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground border-t pt-3">
                    Target: {format(displayData.targetDate, "MMMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

interface WorkReportTableProps {
  workReportData: {
    date: string;
    users: Array<{ id: string; name: string }>;
    slots: Array<{
      label: string;
      slotMinutes: number;
      start: number;
      end: number;
      data: Record<string, { uniqueLeads: number; activityMinutes: number }>;
    }>;
  };
  workReportDate: string;
}

function WorkReportTable({ workReportData, workReportDate }: WorkReportTableProps) {
  const { users, slots } = workReportData;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-700/40">
            <th className="sticky left-0 z-10 bg-slate-50/95 dark:bg-slate-700/95 backdrop-blur-sm whitespace-nowrap font-semibold px-3 py-2 text-left border-b border-r border-border/30 min-w-[90px]">
              Time Slot
            </th>
            {users.map(u => (
              <th key={u.id} className="whitespace-nowrap font-medium px-2 py-2 text-center border-b border-border/30 min-w-[80px] max-w-[110px]">
                <span className="block truncate max-w-[100px]" title={u.name}>
                  {u.name.split(" ")[0]}
                </span>
              </th>
            ))}
            <th className="whitespace-nowrap font-semibold px-2 py-2 text-center border-b border-border/30 min-w-[70px] text-slate-600 dark:text-slate-300">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, slotIdx) => {
            const rowTotal = users.reduce((sum, u) => sum + (slot.data[u.id]?.uniqueLeads || 0), 0);
            const rowMins = users.reduce((sum, u) => sum + (slot.data[u.id]?.activityMinutes || 0), 0);
            const isEven = slotIdx % 2 === 0;
            return (
              <tr key={slot.label} className={isEven ? "bg-white/60 dark:bg-slate-800/40" : "bg-slate-50/40 dark:bg-slate-800/10"}>
                <td className={`sticky left-0 z-10 font-medium px-3 py-1.5 whitespace-nowrap border-r border-border/30 ${isEven ? "bg-white/95 dark:bg-slate-800/95" : "bg-slate-50/95 dark:bg-slate-800/60"} backdrop-blur-sm`}>
                  {slot.label}
                </td>
                {users.map(u => {
                  const cell = slot.data[u.id];
                  const leads = cell?.uniqueLeads || 0;
                  const mins = cell?.activityMinutes || 0;
                  const searchParams = new URLSearchParams({
                    date: workReportDate,
                    slotStart: String(slot.start),
                    slotEnd: String(slot.end),
                    userId: u.id,
                    slotLabel: slot.label,
                    userName: u.name,
                  });
                  return (
                    <td key={u.id} className="text-center px-2 py-1">
                      {leads > 0 ? (
                        <Link href={`/work-report-view?${searchParams.toString()}`}>
                          <button
                            className="inline-flex flex-col items-center gap-0 cursor-pointer hover-elevate rounded px-1.5 py-0.5 min-w-[48px]"
                            data-testid={`cell-work-report-${u.id}-${slot.label}`}
                          >
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{leads} leads</span>
                            <span className="text-[9px] text-muted-foreground">{mins} min</span>
                          </button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center px-2 py-1">
                  {rowTotal > 0 ? (
                    <div className="inline-flex flex-col items-center gap-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{rowTotal} leads</span>
                      <span className="text-[9px] text-muted-foreground">{rowMins} min</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/30">—</span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="bg-slate-100/80 dark:bg-slate-700/60 font-semibold border-t border-border/40">
            <td className="sticky left-0 z-10 bg-slate-100/95 dark:bg-slate-700/95 backdrop-blur-sm px-3 py-2 text-xs whitespace-nowrap border-r border-border/30">
              Total
            </td>
            {users.map(u => {
              const totalLeads = slots.reduce((s, slot) => s + (slot.data[u.id]?.uniqueLeads || 0), 0);
              const totalMins = slots.reduce((s, slot) => s + (slot.data[u.id]?.activityMinutes || 0), 0);
              return (
                <td key={u.id} className="text-center px-2 py-2">
                  <div className="inline-flex flex-col items-center gap-0">
                    <span className="text-xs font-bold">{totalLeads} leads</span>
                    <span className="text-[9px] text-muted-foreground">{totalMins} min</span>
                  </div>
                </td>
              );
            })}
            <td className="text-center px-2 py-2">
              <div className="inline-flex flex-col items-center gap-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {slots.reduce((s, slot) => s + users.reduce((su, u) => su + (slot.data[u.id]?.uniqueLeads || 0), 0), 0)} leads
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {slots.reduce((s, slot) => s + users.reduce((su, u) => su + (slot.data[u.id]?.activityMinutes || 0), 0), 0)} min
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
