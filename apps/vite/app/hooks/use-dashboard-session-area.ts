import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Session Area Data Point Interface
export interface SessionAreaDataPoint {
  month: string;
  year: number;
  value: number;
  label: string;
  fullMonth: string;
}

// Session Area Summary Interface
export interface SessionAreaSummary {
  average_per_month: number;
  total_change: number;
  percentage_change: number;
  trend_direction: "up" | "down" | "stable";
  peak_month: string;
  peak_value: number;
  lowest_month: string;
  lowest_value: number;
}

// Session Area Year Info Interface
export interface SessionAreaYearInfo {
  start_date: string;
  end_date: string;
  months_covered: number;
}

// Main Response Interface
export interface SessionAreaResponse {
  period: "monthly";
  range: "1y";
  total_sessions: number;
  data_points: SessionAreaDataPoint[];
  summary: SessionAreaSummary;
  year_info: SessionAreaYearInfo;
}

// API Response Interface
export interface GetSessionAreaApiResponse {
  success: boolean;
  message: string;
  data: SessionAreaResponse;
  timestamp: string;
}

// Error Response Interface
export interface SessionAreaErrorResponse {
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
export interface UseSessionAreaOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useSessionArea(options: UseSessionAreaOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes (longer than trend line)
    refetchInterval = 10 * 60 * 1000, // 10 minutes (slower update)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/session-area";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "session-area"],
    queryFn: async (): Promise<SessionAreaResponse> => {
      const response = await apiClient.get<GetSessionAreaApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch session area data"
        );
      }

      return response.data;
    },
    enabled: enabled && !!user && user.role === "admin",
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    // Transform data for easier consumption
    select: (data: SessionAreaResponse) => ({
      ...data,
      // Add formatted data points for chart consumption
      chartData: data.data_points.map((point) => ({
        month: point.month,
        year: point.year,
        value: point.value,
        label: point.label,
        fullMonth: point.fullMonth,
        formattedValue: point.value.toLocaleString(),
        // Additional formatting for area charts
        name: point.label, // For Recharts XAxis
        sessions: point.value, // Alternative naming
      })),
      // Add summary with formatted values
      formattedSummary: {
        ...data.summary,
        average_per_month:
          Math.round(data.summary.average_per_month * 100) / 100,
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
        trend_direction_bg:
          data.summary.trend_direction === "up"
            ? "bg-green-50"
            : data.summary.trend_direction === "down"
              ? "bg-red-50"
              : "bg-gray-50",
      },
      // Additional chart-specific formatting
      areaChartConfig: {
        dataKey: "value",
        stroke: "#3b82f6",
        fill: "url(#colorSessions)",
        strokeWidth: 2,
        dot: { fill: "#3b82f6", strokeWidth: 2, r: 4 },
      },
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load session area data",
      endpoint,
    },
  });
}

// Hook for multiple session areas comparison (if needed in the future)
export function useMultipleSessionAreas(
  configs: Array<{
    key: string;
    options?: UseSessionAreaOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [...queryKeys.dashboard.all(), "session-area", config.key],
    queryFn: async (): Promise<SessionAreaResponse> => {
      const response = await apiClient.get<GetSessionAreaApiResponse>(
        "/dashboard/admin/session-area"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch session area data"
        );
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 5 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 10 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for session area chart options
export function useSessionAreaOptions() {
  const colorOptions = [
    { value: "#3b82f6", label: "Blue", name: "Primary Blue" },
    { value: "#10b981", label: "Green", name: "Success Green" },
    { value: "#f59e0b", label: "Yellow", name: "Warning Yellow" },
    { value: "#ef4444", label: "Red", name: "Error Red" },
    { value: "#8b5cf6", label: "Purple", name: "Purple" },
    { value: "#06b6d4", label: "Cyan", name: "Info Cyan" },
  ];

  const gradientOptions = [
    {
      id: "colorSessions",
      colors: [
        { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.8 },
        { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0.1 },
      ],
    },
    {
      id: "colorSessionsGreen",
      colors: [
        { offset: "5%", stopColor: "#10b981", stopOpacity: 0.8 },
        { offset: "95%", stopColor: "#10b981", stopOpacity: 0.1 },
      ],
    },
    {
      id: "colorSessionsPurple",
      colors: [
        { offset: "5%", stopColor: "#8b5cf6", stopOpacity: 0.8 },
        { offset: "95%", stopColor: "#8b5cf6", stopOpacity: 0.1 },
      ],
    },
  ];

  const chartTypes = [
    {
      value: "area",
      label: "Area Chart",
      description: "Smooth area visualization",
    },
    {
      value: "line",
      label: "Line Chart",
      description: "Simple line visualization",
    },
    { value: "bar", label: "Bar Chart", description: "Bar visualization" },
  ];

  return {
    colorOptions,
    gradientOptions,
    chartTypes,
  };
}

// Helper function to format session area data for charts
export function formatSessionAreaDataForChart(data: SessionAreaResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.label,
      value: point.value,
      month: point.month,
      year: point.year,
      fullMonth: point.fullMonth,
      formattedValue: `${point.value} sesi`,
      tooltip: `${point.fullMonth}: ${point.value} sesi`,
    })),
    summary: {
      total: data.total_sessions,
      average: data.summary.average_per_month,
      trend: data.summary.trend_direction,
      change: data.summary.percentage_change,
      peak: {
        month: data.summary.peak_month,
        value: data.summary.peak_value,
      },
      lowest: {
        month: data.summary.lowest_month,
        value: data.summary.lowest_value,
      },
    },
    yearInfo: {
      startDate: new Date(data.year_info.start_date).toLocaleDateString(
        "id-ID",
        {
          year: "numeric",
          month: "long",
        }
      ),
      endDate: new Date(data.year_info.end_date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
      }),
      monthsCovered: data.year_info.months_covered,
    },
  };
}

// Hook for real-time session area updates
export function useRealtimeSessionArea(options: UseSessionAreaOptions = {}) {
  return useSessionArea({
    ...options,
    refetchInterval: 2 * 60 * 1000, // 2 minutes for real-time updates
    staleTime: 1 * 60 * 1000, // 1 minute stale time
  });
}

// Hook for session area with custom date range (future enhancement)
export function useSessionAreaWithDateRange(
  startDate: string,
  endDate: string,
  options: UseSessionAreaOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    refetchInterval = 10 * 60 * 1000,
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  // Build endpoint with date range (if API supports it in the future)
  const endpoint = `/dashboard/admin/session-area?start_date=${startDate}&end_date=${endDate}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "session-area-custom",
      startDate,
      endDate,
    ],
    queryFn: async (): Promise<SessionAreaResponse> => {
      const response = await apiClient.get<GetSessionAreaApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch session area data"
        );
      }

      return response.data;
    },
    enabled:
      enabled && !!user && user.role === "admin" && !!startDate && !!endDate,
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    meta: {
      errorMessage: "Failed to load custom session area data",
      endpoint,
    },
  });
}
