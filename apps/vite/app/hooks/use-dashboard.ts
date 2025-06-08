"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Admin Dashboard Types
export interface DashboardOverview {
  total_users: number;
  total_participants: number;
  total_admins: number;
  total_tests: number;
  active_tests: number;
  total_sessions: number;
  active_sessions: number;
  total_attempts: number;
  completed_attempts: number;
  total_session_participants: number;
  total_session_modules: number;
}

export interface RecentSession {
  id: string;
  session_name: string;
  session_code: string;
  status: string;
  start_time: string;
  end_time: string;
  participants: string;
}

export interface PopularTest {
  test_id: string;
  test_name: string;
  attempt_count: number;
}

export interface GetAdminDashboardResponse {
  success: boolean;
  message: string;
  data: {
    overview: DashboardOverview;
    recent_sessions: RecentSession[];
    popular_tests: PopularTest[];
  };
  timestamp: string;
}

// Participant Dashboard Types
export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  nik: string;
  last_login: string | null;
}

export interface TestSummary {
  total_attempts: number;
  completed_tests: number;
  in_progress_tests: number;
  total_time_spent_minutes: number;
  average_time_per_test_minutes: number;
}

export interface SessionSummary {
  total_sessions: number;
  upcoming_sessions: number;
  active_sessions: number;
}

export interface RecentTest {
  test_name: string;
  category: string;
  completed_at: string;
  time_spent_minutes: number;
}

export interface UpcomingSession {
  session_name: string;
  session_code: string;
  start_time: string;
  end_time: string;
  can_access: boolean;
}

export interface GetParticipantDashboardResponse {
  success: boolean;
  message: string;
  data: {
    user: ParticipantUser;
    test_summary: TestSummary;
    session_summary: SessionSummary;
    recent_tests: RecentTest[];
    tests_by_category: Record<string, number>;
    upcoming_sessions: UpcomingSession[];
  };
  timestamp: string;
}

export function useDashboard() {
  const { user } = useAuth();

  // Get admin dashboard data
  const useGetAdminDashboard = () => {
    return useQuery({
      queryKey: queryKeys.dashboard.admin(user?.id),
      queryFn: async () => {
        const response =
          await apiClient.get<GetAdminDashboardResponse>("/dashboard/admin");
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch admin dashboard"
          );
        }
        return response.data;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
      enabled: !!user && user.role === "admin",
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });
  };

  // Get participant dashboard data
  const useGetParticipantDashboard = () => {
    return useQuery({
      queryKey: queryKeys.dashboard.participant(user?.id),
      queryFn: async () => {
        const response = await apiClient.get<GetParticipantDashboardResponse>(
          "/dashboard/participant"
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch participant dashboard"
          );
        }
        return response.data;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 3 * 60 * 1000, // Auto refetch every 3 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: !!user && user.role === "participant",
    });
  };

  return {
    useGetAdminDashboard,
    useGetParticipantDashboard,
  };
}
