import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";

// ==================== TYPES ====================

export interface UseTestResultsReportOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export interface TestResultsReportParams {
  period_type?: "today" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
  position?: string;
  session_id?: string;
}

export interface TestResultsReportPeriod {
  type: "today" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";
  start_date: string;
  end_date: string;
  label: string;
}

export interface TestResultsReportSummary {
  total_sessions: number;
  total_participants: number;
  total_completed: number;
  completion_rate: number;
  average_score: number;
  grade_distribution: {
    [grade: string]: number;
  };
}

export interface TestResultsReportSession {
  session_id: string;
  session_code: string;
  session_name: string;
  date: string;
  time: string;
  target_position: string;
  location: string | null;
  proctor_name: string | null;
  total_participants: number;
  completed_participants: number;
  completion_rate: number;
  average_score: number;
  average_duration_minutes: number;
  test_modules: string;
}

export interface TestResultsReportParticipant {
  session_code: string;
  session_name: string;
  nik: string | null;
  name: string;
  gender: string;
  age: number | null;
  education: string;
  total_score: number;
  overall_grade: string;
  overall_percentile: number;
  completion_rate: number;
  duration_minutes: number;
  status: string;
  recommended_position: string;
  compatibility_score: number;
  primary_traits: string;
}

export interface TestResultsReportPositionSummary {
  target_position: string;
  total_participants: number;
  completed: number;
  completion_rate: number;
  average_score: number;
  grade_A: number;
  grade_B: number;
  grade_C: number;
  grade_D: number;
}

export interface TestResultsReportModuleSummary {
  test_name: string;
  category: string;
  total_attempts: number;
  average_score: number;
  completion_rate: number;
}

export interface TestResultsReportData {
  period: TestResultsReportPeriod;
  summary: TestResultsReportSummary;
  sessions: TestResultsReportSession[];
  participants: TestResultsReportParticipant[];
  position_summary: TestResultsReportPositionSummary[];
  test_module_summary: TestResultsReportModuleSummary[];
  generated_at: string;
}

export interface TestResultsReportResponse {
  success: boolean;
  message: string;
  data: TestResultsReportData;
  timestamp: string;
}

// ==================== QUERY KEYS ====================

export const testResultsReportKeys = {
  all: ["test-results-report"] as const,
  reports: () => [...testResultsReportKeys.all, "reports"] as const,
  report: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), params] as const,
  period: (periodType: string) =>
    [...testResultsReportKeys.reports(), "period", periodType] as const,
  position: (position: string) =>
    [...testResultsReportKeys.reports(), "position", position] as const,
  session: (sessionId: string) =>
    [...testResultsReportKeys.reports(), "session", sessionId] as const,
};

// ==================== API FUNCTIONS ====================

async function fetchTestResultsReport(
  params: TestResultsReportParams
): Promise<TestResultsReportResponse> {
  const searchParams = new URLSearchParams();

  // Add parameters to URL
  if (params.period_type) {
    searchParams.append("period_type", params.period_type);
  }
  if (params.start_date) {
    searchParams.append("start_date", params.start_date);
  }
  if (params.end_date) {
    searchParams.append("end_date", params.end_date);
  }
  if (params.position) {
    searchParams.append("position", params.position);
  }
  if (params.session_id) {
    searchParams.append("session_id", params.session_id);
  }

  const queryString = searchParams.toString();
  const url = `/reports/test-results${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<TestResultsReportResponse>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results report");
  }

  return response;
}

// ==================== HOOKS ====================

/**
 * Hook to fetch test results report
 * Supports various period types and filters
 */
export function useTestResultsReport(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 30 * 60 * 1000, // 30 minutes
  } = options;

  return useQuery({
    queryKey: testResultsReportKeys.report(params),
    queryFn: () => fetchTestResultsReport(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      // Don't retry on 400/403/404 errors
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for current month test results report
 */
export function useCurrentMonthTestResults(
  additionalParams: Omit<TestResultsReportParams, "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    { 
      period_type: "this_month",
      ...additionalParams 
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for current data
      ...options,
    }
  );
}

/**
 * Hook for last month test results report
 */
export function useLastMonthTestResults(
  additionalParams: Omit<TestResultsReportParams, "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    { 
      period_type: "last_month",
      ...additionalParams 
    },
    options
  );
}

/**
 * Hook for today's test results report
 */
export function useTodayTestResults(
  additionalParams: Omit<TestResultsReportParams, "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    { 
      period_type: "today",
      ...additionalParams 
    },
    {
      staleTime: 30 * 1000, // 30 seconds for real-time data
      refetchOnWindowFocus: true,
      ...options,
    }
  );
}

/**
 * Hook for this year's test results report
 */
export function useThisYearTestResults(
  additionalParams: Omit<TestResultsReportParams, "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    { 
      period_type: "this_year",
      ...additionalParams 
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for yearly data
      ...options,
    }
  );
}

/**
 * Hook for custom date range test results report
 */
export function useCustomDateRangeTestResults(
  startDate: string,
  endDate: string,
  additionalParams: Omit<TestResultsReportParams, "period_type" | "start_date" | "end_date"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    {
      period_type: "custom",
      start_date: startDate,
      end_date: endDate,
      ...additionalParams,
    },
    {
      enabled: !!(startDate && endDate), // Only enable if both dates are provided
      ...options,
    }
  );
}

/**
 * Hook for test results report filtered by position
 */
export function usePositionTestResults(
  position: string,
  periodType: TestResultsReportParams["period_type"] = "this_month",
  additionalParams: Omit<TestResultsReportParams, "position" | "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    {
      period_type: periodType,
      position,
      ...additionalParams,
    },
    {
      enabled: !!position,
      ...options,
    }
  );
}

/**
 * Hook for specific session test results report
 */
export function useSessionTestResults(
  sessionId: string,
  periodType: TestResultsReportParams["period_type"] = "this_year",
  additionalParams: Omit<TestResultsReportParams, "session_id" | "period_type"> = {},
  options: UseTestResultsReportOptions = {}
) {
  return useTestResultsReport(
    {
      period_type: periodType,
      session_id: sessionId,
      ...additionalParams,
    },
    {
      enabled: !!sessionId,
      ...options,
    }
  );
}

/**
 * Mutation hook for refreshing test results report
 * Useful for manual refresh or when data changes
 */
export function useRefreshTestResultsReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TestResultsReportParams) => {
      // Invalidate relevant queries first
      await queryClient.invalidateQueries({
        queryKey: testResultsReportKeys.reports(),
      });
      
      // Fetch fresh data
      return fetchTestResultsReport(params);
    },
    onSuccess: (data, variables) => {
      // Update the specific query cache
      queryClient.setQueryData(
        testResultsReportKeys.report(variables),
        data
      );
    },
    onError: (error) => {
      console.error("Failed to refresh test results report:", error);
    },
  });
}

/**
 * Hook to prefetch test results report
 * Useful for warming up cache before navigation
 */
export function usePrefetchTestResultsReport() {
  const queryClient = useQueryClient();

  return {
    prefetch: (params: TestResultsReportParams) => {
      return queryClient.prefetchQuery({
        queryKey: testResultsReportKeys.report(params),
        queryFn: () => fetchTestResultsReport(params),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchCurrentMonth: (additionalParams = {}) => {
      return queryClient.prefetchQuery({
        queryKey: testResultsReportKeys.report({
          period_type: "this_month",
          ...additionalParams,
        }),
        queryFn: () => fetchTestResultsReport({
          period_type: "this_month",
          ...additionalParams,
        }),
        staleTime: 2 * 60 * 1000,
      });
    },
  };
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook to get all cached test results reports
 * Useful for dashboard summaries
 */
export function useCachedTestResultsReports() {
  const queryClient = useQueryClient();

  const getCachedReports = () => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.findAll({
      queryKey: testResultsReportKeys.reports(),
    });

    return queries
      .filter((query) => query.state.data)
      .map((query) => ({
        key: query.queryKey,
        data: query.state.data as TestResultsReportResponse,
        updatedAt: query.state.dataUpdatedAt,
      }));
  };

  return {
    getCachedReports,
    invalidateAll: () => {
      return queryClient.invalidateQueries({
        queryKey: testResultsReportKeys.all,
      });
    },
    removeAll: () => {
      return queryClient.removeQueries({
        queryKey: testResultsReportKeys.all,
      });
    },
  };
}

// ==================== EXPORT ALL ====================

export default {
  useTestResultsReport,
  useCurrentMonthTestResults,
  useLastMonthTestResults,
  useTodayTestResults,
  useThisYearTestResults,
  useCustomDateRangeTestResults,
  usePositionTestResults,
  useSessionTestResults,
  useRefreshTestResultsReport,
  usePrefetchTestResultsReport,
  useCachedTestResultsReports,
  testResultsReportKeys,
};