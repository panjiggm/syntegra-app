import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";

// Types for live test monitoring
export interface LiveTestStats {
  total_participants: number;
  active_participants: number;
  completed_participants: number;
  not_started_participants: number;
  completion_rate: number;
  average_progress: number;
  estimated_completion_time: string;
}

export interface ParticipantProgress {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    nik: string;
  };
  status: "registered" | "started" | "completed" | "no_show";
  overall_progress: number;
  completed_questions: number;
  total_questions: number;
  current_module?: {
    test_id: string;
    test_name: string;
    current_question: number;
    total_questions: number;
    time_spent: number;
    time_limit: number;
  };
  started_at: string | null;
  estimated_end_time: string | null;
  estimated_completion_time: string | null;
  last_activity: string | null;
  time_spent_total: number;
}

export interface ModuleProgress {
  test_id: string;
  test_name: string;
  icon?: string;
  sequence: number;
  total_participants: number;
  participants_started: number;
  participants_completed: number;
  average_completion_time: number;
  completion_rate: number;
}

export interface LiveTestData {
  session: {
    id: string;
    session_name: string;
    session_code: string;
    start_time: string;
    end_time: string;
    status: string;
  };
  stats: LiveTestStats;
  modules_progress: ModuleProgress[];
  real_time_updates: {
    last_updated: string;
    active_connections: number;
  };
}

export interface LiveTestResponse {
  success: boolean;
  message: string;
  data: LiveTestData;
  timestamp: string;
}

export interface ParticipantsProgressResponse {
  success: boolean;
  message: string;
  data: ParticipantProgress[];
  timestamp: string;
}

export interface LiveTestStatsResponse {
  success: boolean;
  message: string;
  data: LiveTestStats;
  timestamp: string;
}

export function useLiveTest() {
  // Get live test data for a specific session
  const useGetLiveTestData = (
    sessionId: string,
    options?: {
      enabled?: boolean;
      refetchInterval?: number | false;
    }
  ) => {
    return useQuery({
      queryKey: ["live-test", "session", sessionId],
      queryFn: async () => {
        const response = await apiClient.get<LiveTestResponse>(
          `/sessions/${sessionId}/live-test`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch live test data");
        }

        return response.data;
      },
      enabled: options?.enabled ?? !!sessionId,
      refetchInterval: options?.refetchInterval ?? false,
      staleTime: 0, // Always consider data stale for real-time updates
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  };

  // Get participants progress for real-time monitoring
  const useGetSessionParticipantsProgress = (
    sessionId: string,
    options?: {
      enabled?: boolean;
      refetchInterval?: number | false;
    }
  ) => {
    return useQuery({
      queryKey: ["live-test", "participants-progress", sessionId],
      queryFn: async () => {
        const response = await apiClient.get<ParticipantsProgressResponse>(
          `/sessions/${sessionId}/live-test/participants`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch participants progress"
          );
        }

        return response.data;
      },
      enabled: options?.enabled ?? !!sessionId,
      refetchInterval: options?.refetchInterval ?? false,
      staleTime: 0, // Always fresh for real-time monitoring
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  };

  // Get live statistics
  const useGetLiveTestStats = (
    sessionId: string,
    options?: {
      enabled?: boolean;
      refetchInterval?: number | false;
    }
  ) => {
    return useQuery({
      queryKey: ["live-test", "stats", sessionId],
      queryFn: async () => {
        const response = await apiClient.get<LiveTestStatsResponse>(
          `/sessions/${sessionId}/live-test/stats`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch live test stats"
          );
        }

        return response.data;
      },
      enabled: options?.enabled ?? !!sessionId,
      refetchInterval: options?.refetchInterval ?? false,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  };

  // Get active sessions that can be monitored
  const useGetActiveSessions = () => {
    return useQuery({
      queryKey: ["live-test", "active-sessions"],
      queryFn: async () => {
        const response = await apiClient.get(
          `/sessions?status=active&is_live=true&limit=50`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch active sessions"
          );
        }

        return response.data;
      },
      staleTime: 30 * 1000, // 30 seconds - sessions don't change frequently
      refetchInterval: 60 * 1000, // Refresh every minute
    });
  };

  // Get real-time test events (for future WebSocket implementation)
  const useGetLiveTestEvents = (sessionId: string) => {
    return useQuery({
      queryKey: ["live-test", "events", sessionId],
      queryFn: async () => {
        const response = await apiClient.get(
          `/sessions/${sessionId}/live-test/events`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch live test events"
          );
        }

        return response.data;
      },
      enabled: !!sessionId,
      refetchInterval: 2000, // Every 2 seconds for event updates
      staleTime: 0,
    });
  };

  return {
    // Queries
    useGetLiveTestData,
    useGetSessionParticipantsProgress,
    useGetLiveTestStats,
    useGetActiveSessions,
    useGetLiveTestEvents,
  };
}

// Utility functions for live test
export const liveTestUtils = {
  // Calculate time remaining in human readable format
  formatTimeRemaining: (endTime: string): string => {
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return "Waktu Habis";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (diffHours > 0) {
      return `${diffHours}j ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`;
    } else {
      return `${diffSeconds}s`;
    }
  },

  // Calculate progress percentage
  calculateProgress: (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  // Get status color class
  getStatusColor: (status: string): string => {
    switch (status) {
      case "registered":
        return "text-blue-600";
      case "started":
        return "text-green-600";
      case "completed":
        return "text-purple-600";
      case "no_show":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  },

  // Format duration in minutes to human readable
  formatDuration: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}j ${remainingMinutes}m`;
  },

  // Check if participant is at risk of not completing
  isAtRisk: (
    progress: number,
    timeSpent: number,
    totalTimeLimit: number
  ): boolean => {
    const timeProgress = (timeSpent / totalTimeLimit) * 100;
    // At risk if time progress is significantly ahead of completion progress
    return timeProgress > progress + 20;
  },
};
