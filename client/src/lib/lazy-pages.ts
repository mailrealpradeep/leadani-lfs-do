import { lazy } from "react";

// Auth-critical and lightweight public pages stay eager in App.tsx.
// Everything below is loaded on demand when the user navigates to that route.

export const LazyOnboarding = lazy(() => import("@/pages/onboarding"));
export const LazyDashboard = lazy(() => import("@/pages/dashboard"));
export const LazyReports = lazy(() => import("@/pages/reports"));
export const LazyTeamPerformance = lazy(() => import("@/pages/team-performance"));
export const LazyAdmin = lazy(() => import("@/pages/admin"));
export const LazyWebhooks = lazy(() => import("@/pages/webhooks"));
export const LazyOutgoingWebhooks = lazy(() => import("@/pages/outgoing-webhooks"));
export const LazyInstaSupportPage = lazy(() => import("@/pages/insta-support"));
export const LazyAuditLogs = lazy(() => import("@/pages/audit"));
export const LazyAttendance = lazy(() => import("@/pages/attendance"));
export const LazyTasks = lazy(() => import("@/pages/tasks"));
export const LazySuperAdmin = lazy(() => import("@/pages/super-admin"));
export const LazyActivityLogs = lazy(() => import("@/pages/activity-logs"));
export const LazyLeaderboard = lazy(() => import("@/pages/leaderboard"));
export const LazyMyTargets = lazy(() => import("@/pages/my-targets"));
export const LazyWorkingTarget = lazy(() => import("@/pages/working-target"));
export const LazyFeatures = lazy(() => import("@/pages/features"));
export const LazyHelp = lazy(() => import("@/pages/help"));
export const LazyGuide = lazy(() => import("@/pages/guide"));
export const LazyVisits = lazy(() => import("@/pages/visits"));
export const LazyVisited = lazy(() => import("@/pages/visited"));
export const LazyHotLeads = lazy(() => import("@/pages/hot-leads"));
export const LazyCustomViewPage = lazy(() => import("@/pages/custom-view"));
export const LazyPlan = lazy(() => import("@/pages/plan"));
export const LazyWatchlist = lazy(() => import("@/pages/watchlist"));
export const LazyPowerScore = lazy(() => import("@/pages/powerscore"));
export const LazyPowerScoreTransactions = lazy(() => import("@/pages/powerscore-transactions"));
export const LazyFollowupTransactions = lazy(() => import("@/pages/followup-transactions"));
export const LazyPowerFlow = lazy(() => import("@/pages/powerflow"));
export const LazyVisionBoard = lazy(() => import("@/pages/vision-board"));
export const LazyConversionSettings = lazy(() => import("@/pages/conversion-settings"));
export const LazySailaAI = lazy(() => import("@/pages/saila"));
export const LazyRadar = lazy(() => import("@/pages/radar"));
export const LazyCallSchedule = lazy(() => import("@/pages/call-schedule"));
export const LazyIncomingMessages = lazy(() => import("@/pages/incoming-messages"));
export const LazyWorkReportView = lazy(() => import("@/pages/work-report-view"));
export const LazyNoticePage = lazy(() => import("@/pages/notice"));

/** Prefetch the default post-login home screen while the user is authenticating. */
export function prefetchVisionBoardPage() {
  void import("@/pages/vision-board");
}
