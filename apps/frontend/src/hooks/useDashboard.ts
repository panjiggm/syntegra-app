"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useApi } from "./useApi";

// Admin Dashboard Types (existing)
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

// Participant Dashboard Types (new)
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
  const { data: session } = useSession();
  const { apiCall } = useApi();

  // Get admin dashboard data (existing)
  const useGetAdminDashboard = () => {
    return useQuery({
      queryKey: ["dashboard", "admin", session?.user?.id],
      queryFn: () => apiCall<GetAdminDashboardResponse>("/dashboard/admin"),
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
      enabled: !!session?.user && session.user.role === "admin",
    });
  };

  // Get participant dashboard data (new)
  const useGetParticipantDashboard = () => {
    return useQuery({
      queryKey: ["dashboard", "participant", session?.user?.id],
      queryFn: () =>
        apiCall<GetParticipantDashboardResponse>("/dashboard/participant"),
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 3 * 60 * 1000, // Auto refetch every 3 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: !!session?.user && session.user.role === "participant",
    });
  };

  return {
    useGetAdminDashboard,
    useGetParticipantDashboard,
  };
}
