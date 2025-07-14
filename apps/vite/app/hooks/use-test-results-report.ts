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
  summary: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), "summary", params] as const,
  sessions: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), "sessions", params] as const,
  participants: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), "participants", params] as const,
  positions: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), "positions", params] as const,
  modules: (params: TestResultsReportParams) =>
    [...testResultsReportKeys.reports(), "modules", params] as const,
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

// ==================== GRANULAR API FUNCTIONS ====================

async function fetchTestResultsSummary(
  params: TestResultsReportParams
): Promise<any> {
  const searchParams = new URLSearchParams();

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
  const url = `/reports/test-results/summary${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<any>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results summary");
  }

  return response;
}

async function fetchTestResultsSessions(
  params: TestResultsReportParams
): Promise<any> {
  const searchParams = new URLSearchParams();

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
  const url = `/reports/test-results/sessions${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<any>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results sessions");
  }

  return response;
}

async function fetchTestResultsParticipants(
  params: TestResultsReportParams
): Promise<any> {
  const searchParams = new URLSearchParams();

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
  const url = `/reports/test-results/participants${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<any>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results participants");
  }

  return response;
}

async function fetchTestResultsPositions(
  params: TestResultsReportParams
): Promise<any> {
  const searchParams = new URLSearchParams();

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
  const url = `/reports/test-results/positions${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<any>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results positions");
  }

  return response;
}

async function fetchTestResultsModules(
  params: TestResultsReportParams
): Promise<any> {
  const searchParams = new URLSearchParams();

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
  const url = `/reports/test-results/modules${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<any>(url);

  if (!response.success) {
    throw new Error(response.message || "Failed to fetch test results modules");
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

// ==================== GRANULAR HOOKS ====================

/**
 * Hook to fetch test results summary only
 */
export function useTestResultsSummary(
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
    queryKey: testResultsReportKeys.summary(params),
    queryFn: () => fetchTestResultsSummary(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch test results sessions only
 */
export function useTestResultsSessions(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
  } = options;

  return useQuery({
    queryKey: testResultsReportKeys.sessions(params),
    queryFn: () => fetchTestResultsSessions(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch test results participants only
 */
export function useTestResultsParticipants(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
  } = options;

  return useQuery({
    queryKey: testResultsReportKeys.participants(params),
    queryFn: () => fetchTestResultsParticipants(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch test results positions only
 */
export function useTestResultsPositions(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
  } = options;

  return useQuery({
    queryKey: testResultsReportKeys.positions(params),
    queryFn: () => fetchTestResultsPositions(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch test results modules only
 */
export function useTestResultsModules(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
  } = options;

  return useQuery({
    queryKey: testResultsReportKeys.modules(params),
    queryFn: () => fetchTestResultsModules(params),
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    staleTime,
    gcTime,
    retry: (failureCount, error: any) => {
      if (error?.response?.status && [400, 403, 404].includes(error.response.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// ==================== PARALLEL FETCHING HOOKS ====================

/**
 * Hook to fetch all test results data in parallel for faster loading
 * Returns all endpoints data separately for granular UI updates
 */
export function useTestResultsReportParallel(
  params: TestResultsReportParams = { period_type: "this_month" },
  options: UseTestResultsReportOptions = {}
) {
  const summary = useTestResultsSummary(params, options);
  const sessions = useTestResultsSessions(params, options);
  const participants = useTestResultsParticipants(params, options);
  const positions = useTestResultsPositions(params, options);
  const modules = useTestResultsModules(params, options);

  return {
    summary,
    sessions,
    participants,
    positions,
    modules,
    // Combined loading state
    isLoading: summary.isLoading || sessions.isLoading || participants.isLoading || positions.isLoading || modules.isLoading,
    // Combined error state
    hasError: summary.isError || sessions.isError || participants.isError || positions.isError || modules.isError,
    // All data loaded
    isAllLoaded: summary.isSuccess && sessions.isSuccess && participants.isSuccess && positions.isSuccess && modules.isSuccess,
    // Refetch all
    refetchAll: () => {
      summary.refetch();
      sessions.refetch();
      participants.refetch();
      positions.refetch();
      modules.refetch();
    },
  };
}

/**
 * Hook to fetch specific parts of test results report
 * Useful when you only need certain sections
 */
export function useTestResultsReportSelective(
  params: TestResultsReportParams = { period_type: "this_month" },
  sections: {
    includeSummary?: boolean;
    includeSessions?: boolean;
    includeParticipants?: boolean;
    includePositions?: boolean;
    includeModules?: boolean;
  } = {},
  options: UseTestResultsReportOptions = {}
) {
  const {
    includeSummary = true,
    includeSessions = true,
    includeParticipants = true,
    includePositions = true,
    includeModules = true,
  } = sections;

  const summary = useTestResultsSummary(params, { 
    ...options, 
    enabled: includeSummary && (options.enabled ?? true) 
  });
  
  const sessions = useTestResultsSessions(params, { 
    ...options, 
    enabled: includeSessions && (options.enabled ?? true) 
  });
  
  const participants = useTestResultsParticipants(params, { 
    ...options, 
    enabled: includeParticipants && (options.enabled ?? true) 
  });
  
  const positions = useTestResultsPositions(params, { 
    ...options, 
    enabled: includePositions && (options.enabled ?? true) 
  });
  
  const modules = useTestResultsModules(params, { 
    ...options, 
    enabled: includeModules && (options.enabled ?? true) 
  });

  const activeQueries = [
    includeSummary && summary,
    includeSessions && sessions,
    includeParticipants && participants,
    includePositions && positions,
    includeModules && modules,
  ].filter(Boolean);

  return {
    summary: includeSummary ? summary : null,
    sessions: includeSessions ? sessions : null,
    participants: includeParticipants ? participants : null,
    positions: includePositions ? positions : null,
    modules: includeModules ? modules : null,
    // Combined states based on active queries
    isLoading: activeQueries.some(q => q && q.isLoading),
    hasError: activeQueries.some(q => q && q.isError),
    isAllLoaded: activeQueries.every(q => q && q.isSuccess),
    // Refetch only active sections
    refetchActive: () => {
      activeQueries.forEach(q => q && q.refetch());
    },
  };
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
  // Original hooks
  useTestResultsReport,
  useCurrentMonthTestResults,
  useLastMonthTestResults,
  useTodayTestResults,
  useThisYearTestResults,
  useCustomDateRangeTestResults,
  usePositionTestResults,
  useSessionTestResults,
  
  // New granular hooks
  useTestResultsSummary,
  useTestResultsSessions,
  useTestResultsParticipants,
  useTestResultsPositions,
  useTestResultsModules,
  
  // Parallel fetching hooks
  useTestResultsReportParallel,
  useTestResultsReportSelective,
  
  // Utility hooks
  useRefreshTestResultsReport,
  usePrefetchTestResultsReport,
  useCachedTestResultsReports,
  
  // Query keys
  testResultsReportKeys,
};