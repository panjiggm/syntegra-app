import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Trend Line Period Types
export type TrendPeriod = "daily" | "weekly" | "monthly";
export type TrendRange = "7d" | "30d" | "90d" | "1y";

// Trend Line Query Parameters Interface
export interface UseTrendLineQueryParams {
  period?: TrendPeriod;
  range?: TrendRange;
  test_id?: string;
  category?: string;
  module_type?: string;
  date_from?: string;
  date_to?: string;
}

// Trend Line Data Point Interface
export interface TrendLineDataPoint {
  date: string;
  value: number;
  label: string;
  metadata?: Record<string, any>;
}

// Trend Line Summary Interface
export interface TrendLineSummary {
  average_per_period: number;
  total_change: number;
  percentage_change: number;
  trend_direction: "up" | "down" | "stable";
  peak_date: string;
  peak_value: number;
}

// Trend Line Filters Applied Interface
export interface TrendLineFiltersApplied {
  test_id?: string;
  category?: string;
  module_type?: string;
  date_from?: string;
  date_to?: string;
}

// Main Response Interface
export interface TrendLineResponse {
  period: TrendPeriod;
  range: TrendRange;
  total_count: number;
  data_points: TrendLineDataPoint[];
  summary: TrendLineSummary;
  filters_applied: TrendLineFiltersApplied;
}

// API Response Interface
export interface GetTrendLineApiResponse {
  success: boolean;
  message: string;
  data: TrendLineResponse;
  timestamp: string;
}

// Error Response Interface
export interface TrendLineErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}

// Hook Options Interface
export interface UseTrendLineOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useTrendLine(
  params: UseTrendLineQueryParams = {},
  options: UseTrendLineOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 2 * 60 * 1000, // 2 minutes
    refetchInterval = 5 * 60 * 1000, // 5 minutes
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  // Build query parameters
  const queryParams = new URLSearchParams();

  if (params.period) queryParams.append("period", params.period);
  if (params.range) queryParams.append("range", params.range);
  if (params.test_id) queryParams.append("test_id", params.test_id);
  if (params.category) queryParams.append("category", params.category);
  if (params.module_type) queryParams.append("module_type", params.module_type);
  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);

  const queryString = queryParams.toString();
  const endpoint = `/dashboard/admin/trend-line${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "trend-line",
      params.period || "daily",
      params.range || "30d",
      params.test_id,
      params.category,
      params.module_type,
      params.date_from,
      params.date_to,
    ],
    queryFn: async (): Promise<TrendLineResponse> => {
      const response = await apiClient.get<GetTrendLineApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch trend line data");
      }

      return response.data;
    },
    enabled: enabled && !!user && user.role === "admin",
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    // Transform data for easier consumption
    select: (data: TrendLineResponse) => ({
      ...data,
      // Add formatted data points for chart consumption
      chartData: data.data_points.map((point) => ({
        date: point.date,
        value: point.value,
        label: point.label,
        formattedValue: point.value.toLocaleString(),
        metadata: point.metadata,
      })),
      // Add summary with formatted values
      formattedSummary: {
        ...data.summary,
        average_per_period:
          Math.round(data.summary.average_per_period * 100) / 100,
        total_change: Math.round(data.summary.total_change * 100) / 100,
        percentage_change:
          Math.round(data.summary.percentage_change * 100) / 100,
        trend_direction_icon:
          data.summary.trend_direction === "up"
            ? "=�"
            : data.summary.trend_direction === "down"
              ? "=�"
              : "=�",
        trend_direction_color:
          data.summary.trend_direction === "up"
            ? "text-green-600"
            : data.summary.trend_direction === "down"
              ? "text-red-600"
              : "text-gray-600",
      },
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load trend line data",
      endpoint,
    },
  });
}

// Hook for multiple trend lines comparison
export function useMultipleTrendLines(
  trendConfigs: Array<{
    key: string;
    params: UseTrendLineQueryParams;
    options?: UseTrendLineOptions;
  }>
) {
  const { user } = useAuth();

  const queries = trendConfigs.map((config) => ({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "trend-line",
      config.key,
      config.params.period || "daily",
      config.params.range || "30d",
      config.params.test_id,
      config.params.category,
      config.params.module_type,
      config.params.date_from,
      config.params.date_to,
    ],
    queryFn: async (): Promise<TrendLineResponse> => {
      const queryParams = new URLSearchParams();

      if (config.params.period)
        queryParams.append("period", config.params.period);
      if (config.params.range) queryParams.append("range", config.params.range);
      if (config.params.test_id)
        queryParams.append("test_id", config.params.test_id);
      if (config.params.category)
        queryParams.append("category", config.params.category);
      if (config.params.module_type)
        queryParams.append("module_type", config.params.module_type);
      if (config.params.date_from)
        queryParams.append("date_from", config.params.date_from);
      if (config.params.date_to)
        queryParams.append("date_to", config.params.date_to);

      const queryString = queryParams.toString();
      const endpoint = `/dashboard/admin/trend-line${queryString ? `?${queryString}` : ""}`;

      const response = await apiClient.get<GetTrendLineApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch trend line data");
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 2 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 5 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for trend line periods and ranges
export function useTrendLineOptions() {
  const periodOptions = [
    {
      value: "daily" as const,
      label: "Daily",
      description: "View daily trends",
    },
    {
      value: "weekly" as const,
      label: "Weekly",
      description: "View weekly trends",
    },
    {
      value: "monthly" as const,
      label: "Monthly",
      description: "View monthly trends",
    },
  ];

  const rangeOptions = [
    { value: "7d" as const, label: "Last 7 Days", description: "Past week" },
    { value: "30d" as const, label: "Last 30 Days", description: "Past month" },
    {
      value: "90d" as const,
      label: "Last 90 Days",
      description: "Past quarter",
    },
    { value: "1y" as const, label: "Last Year", description: "Past year" },
  ];

  const moduleTypeOptions = [
    { value: "intelligence", label: "Intelligence Tests" },
    { value: "personality", label: "Personality Tests" },
    { value: "aptitude", label: "Aptitude Tests" },
    { value: "interest", label: "Interest Tests" },
    { value: "projective", label: "Projective Tests" },
    { value: "cognitive", label: "Cognitive Tests" },
  ];

  const categoryOptions = [
    { value: "wais", label: "WAIS" },
    { value: "mbti", label: "MBTI" },
    { value: "wartegg", label: "Wartegg" },
    { value: "riasec", label: "RIASEC" },
    { value: "kraepelin", label: "Kraepelin" },
    { value: "pauli", label: "Pauli" },
    { value: "big_five", label: "Big Five" },
    { value: "papi_kostick", label: "PAPI Kostick" },
    { value: "dap", label: "DAP" },
    { value: "raven", label: "Raven" },
    { value: "epps", label: "EPPS" },
    { value: "army_alpha", label: "Army Alpha" },
    { value: "htp", label: "HTP" },
    { value: "disc", label: "DISC" },
    { value: "iq", label: "IQ" },
    { value: "eq", label: "EQ" },
  ];

  return {
    periodOptions,
    rangeOptions,
    moduleTypeOptions,
    categoryOptions,
  };
}

// Helper function to format trend data for charts
export function formatTrendDataForChart(data: TrendLineResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.label,
      value: point.value,
      date: point.date,
      fullDate: new Date(point.date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    })),
    summary: {
      total: data.total_count,
      average: data.summary.average_per_period,
      trend: data.summary.trend_direction,
      change: data.summary.percentage_change,
      peak: {
        date: data.summary.peak_date,
        value: data.summary.peak_value,
      },
    },
  };
}

// Hook for real-time trend line updates
export function useRealtimeTrendLine(
  params: UseTrendLineQueryParams = {},
  options: UseTrendLineOptions = {}
) {
  return useTrendLine(params, {
    ...options,
    refetchInterval: 30 * 1000, // 30 seconds for real-time updates
    staleTime: 15 * 1000, // 15 seconds stale time
  });
}
