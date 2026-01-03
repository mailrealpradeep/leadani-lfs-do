import type { PowerScoreActionType } from "@shared/schema";

export const POWERSCORE_ACTION_LABELS: Record<PowerScoreActionType, string> = {
  lead_update: "Lead Update",
  login: "Login Bonus",
  dropdown_change: "Dropdown Change",
  lead_created: "Lead Created",
  followup: "Followup",
};

export const POWERSCORE_ACTION_ICONS: Record<PowerScoreActionType, string> = {
  lead_update: "pencil",
  login: "clock",
  dropdown_change: "arrow-right-left",
  lead_created: "plus-circle",
  followup: "phone",
};

export const POWERSCORE_PERIODS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
] as const;

export type PowerScorePeriod = typeof POWERSCORE_PERIODS[number]["id"];

export const POWERSCORE_BADGE_COLORS = [
  { id: "gold", label: "Gold", gradient: "from-yellow-400 to-amber-500", text: "text-amber-900" },
  { id: "silver", label: "Silver", gradient: "from-gray-300 to-gray-400", text: "text-gray-800" },
  { id: "bronze", label: "Bronze", gradient: "from-orange-400 to-orange-600", text: "text-orange-900" },
  { id: "blue", label: "Blue", gradient: "from-blue-400 to-blue-600", text: "text-white" },
  { id: "green", label: "Green", gradient: "from-green-400 to-green-600", text: "text-white" },
  { id: "purple", label: "Purple", gradient: "from-purple-400 to-purple-600", text: "text-white" },
  { id: "red", label: "Red", gradient: "from-red-400 to-red-600", text: "text-white" },
] as const;

export const RANK_STYLES = {
  1: {
    bgGradient: "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500",
    borderColor: "border-amber-400",
    iconColor: "text-amber-600",
    badge: "Champion",
  },
  2: {
    bgGradient: "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400",
    borderColor: "border-gray-400",
    iconColor: "text-gray-600",
    badge: "Runner-up",
  },
  3: {
    bgGradient: "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500",
    borderColor: "border-orange-400",
    iconColor: "text-orange-600",
    badge: "3rd Place",
  },
} as const;

export const ANIMATION_DURATIONS = {
  counterTick: 50,
  pulseGlow: 1000,
  celebration: 3000,
  fadeIn: 300,
} as const;

export const SOCKET_EVENTS = {
  SCORE_UPDATE: "powerscore:update",
  MILESTONE_ACHIEVED: "powerscore:milestone",
  APPRECIATION_RECEIVED: "powerscore:appreciation",
  LEADERBOARD_CHANGE: "powerscore:leaderboard",
} as const;
