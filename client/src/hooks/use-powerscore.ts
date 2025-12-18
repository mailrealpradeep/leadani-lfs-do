import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  PowerScoreLeaderboardEntry, 
  PowerScorePersonalStats, 
  PowerScoreHistoryEntry,
  PowerScoreRule,
  PowerScoreBadge,
  PowerScorePendingApproval,
  PowerScoreAppreciation,
  PowerScoreMilestoneBonus,
  PowerScoreLoginBonus,
  PowerScoreNotificationThreshold,
} from "@shared/schema";
import type { PowerScorePeriod } from "@/lib/powerscore-constants";

interface LeaderboardResponse {
  entries: PowerScoreLeaderboardEntry[];
  period: PowerScorePeriod;
  freezeTime: string;
  isFrozen: boolean;
}

interface PersonalStatsResponse {
  stats: PowerScorePersonalStats;
  history: PowerScoreHistoryEntry[];
}

interface UnseenAppreciationsResponse {
  appreciations: PowerScoreAppreciation[];
}

export function useLeaderboard(period: PowerScorePeriod = "today") {
  return useQuery<LeaderboardResponse>({
    queryKey: ["/api/powerscore/leaderboard", period],
    refetchInterval: 30000,
  });
}

export function usePersonalStats() {
  return useQuery<PersonalStatsResponse>({
    queryKey: ["/api/powerscore/personal-stats"],
    refetchInterval: 30000,
  });
}

export function useScoreHistory(limit = 50) {
  return useQuery<{ history: PowerScoreHistoryEntry[] }>({
    queryKey: ["/api/powerscore/history", limit],
  });
}

export function useUnseenAppreciations() {
  return useQuery<UnseenAppreciationsResponse>({
    queryKey: ["/api/powerscore/appreciations/unseen"],
  });
}

export function useMarkAppreciationSeen() {
  return useMutation({
    mutationFn: async (appreciationId: string) => {
      const response = await apiRequest("POST", `/api/powerscore/appreciations/${appreciationId}/seen`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/appreciations/unseen"] });
    },
  });
}

export function usePowerScoreRules() {
  return useQuery<{ rules: PowerScoreRule[] }>({
    queryKey: ["/api/powerscore/admin/rules"],
  });
}

export function useCreatePowerScoreRule() {
  return useMutation({
    mutationFn: async (data: Partial<PowerScoreRule>) => {
      const response = await apiRequest("POST", "/api/powerscore/admin/rules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/admin/rules"] });
    },
  });
}

export function useUpdatePowerScoreRule() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PowerScoreRule> & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/powerscore/admin/rules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/admin/rules"] });
    },
  });
}

export function useDeletePowerScoreRule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/powerscore/admin/rules/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/admin/rules"] });
    },
  });
}

export function usePowerScoreBadges() {
  return useQuery<{ badges: PowerScoreBadge[] }>({
    queryKey: ["/api/powerscore/admin/badges"],
  });
}

export function usePowerScoreMilestones() {
  return useQuery<{ milestones: PowerScoreMilestoneBonus[] }>({
    queryKey: ["/api/powerscore/admin/milestones"],
  });
}

export function usePowerScoreLoginBonuses() {
  return useQuery<{ loginBonuses: PowerScoreLoginBonus[] }>({
    queryKey: ["/api/powerscore/admin/login-bonuses"],
  });
}

export function usePowerScoreNotificationThresholds() {
  return useQuery<{ thresholds: PowerScoreNotificationThreshold[] }>({
    queryKey: ["/api/powerscore/admin/notification-thresholds"],
  });
}

export function usePendingApprovals() {
  return useQuery<{ approvals: PowerScorePendingApproval[] }>({
    queryKey: ["/api/powerscore/admin/pending-approvals"],
  });
}

export function useApproveScore() {
  return useMutation({
    mutationFn: async (approvalId: string) => {
      const response = await apiRequest("POST", `/api/powerscore/admin/pending-approvals/${approvalId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/admin/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
    },
  });
}

export function useRejectScore() {
  return useMutation({
    mutationFn: async (approvalId: string) => {
      const response = await apiRequest("POST", `/api/powerscore/admin/pending-approvals/${approvalId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/admin/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
    },
  });
}

export function useGiveAppreciation() {
  return useMutation({
    mutationFn: async (data: { userId: string; points: number; message: string }) => {
      const response = await apiRequest("POST", "/api/powerscore/admin/appreciation", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
    },
  });
}

export function usePowerScoreConfig() {
  return useQuery<{ freezeTime: string; isEnabled: boolean }>({
    queryKey: ["/api/powerscore/config"],
  });
}

export function useUpdatePowerScoreConfig() {
  return useMutation({
    mutationFn: async (data: { freezeTime?: string; isEnabled?: boolean }) => {
      const response = await apiRequest("PATCH", "/api/powerscore/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerscore/config"] });
    },
  });
}
