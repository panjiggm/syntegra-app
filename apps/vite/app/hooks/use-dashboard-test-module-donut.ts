import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Test Module Donut Data Point Interface
export interface TestModuleDonutDataPoint {
  module_type: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Test Module Donut Summary Interface
export interface TestModuleDonutSummary {
  most_popular_module: string;
  most_popular_count: number;
  least_popular_module: string;
  least_popular_count: number;
  diversity_score: number;
}

// Main Response Interface
export interface TestModuleDonutResponse {
  total_tests: number;
  module_types_count: number;
  data_points: TestModuleDonutDataPoint[];
  summary: TestModuleDonutSummary;
}

// API Response Interface
export interface GetTestModuleDonutApiResponse {
  success: boolean;
  message: string;
  data: TestModuleDonutResponse;
  timestamp: string;
}

// Error Response Interface
export interface TestModuleDonutErrorResponse {
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
export interface UseTestModuleDonutOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useTestModuleDonut(options: UseTestModuleDonutOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 10 * 60 * 1000, // 10 minutes (longer for donut chart - less frequent updates)
    refetchInterval = 15 * 60 * 1000, // 15 minutes (slow update for module distribution)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/test-module-donut";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "test-module-donut"],
    queryFn: async (): Promise<TestModuleDonutResponse> => {
      const response = await apiClient.get<GetTestModuleDonutApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch test module donut data"
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
    select: (data: TestModuleDonutResponse) => ({
      ...data,
      // Add formatted data points for donut chart consumption
      chartData: data.data_points.map((point) => ({
        name: point.label, // For Recharts donut chart
        value: point.value,
        module_type: point.module_type,
        percentage: point.percentage,
        color: point.color,
        fill: point.color, // For Recharts donut chart fill
        label: point.label,
        // Additional formatting for donut charts
        formattedValue: point.value.toLocaleString(),
        formattedPercentage: `${point.percentage}%`,
        displayLabel: `${point.label} (${point.percentage}%)`,
        tooltipLabel: `${point.label}: ${point.value} tes (${point.percentage}%)`,
      })),
      // Add summary with formatted values
      formattedSummary: {
        ...data.summary,
        diversity_score: Math.round(data.summary.diversity_score * 100) / 100,
        diversity_percentage: `${Math.round(data.summary.diversity_score * 100)}%`,
        diversity_level: 
          data.summary.diversity_score >= 0.8 ? "Tinggi" :
          data.summary.diversity_score >= 0.6 ? "Sedang" :
          data.summary.diversity_score >= 0.4 ? "Rendah" : "Sangat Rendah",
        diversity_color:
          data.summary.diversity_score >= 0.8 ? "text-green-600" :
          data.summary.diversity_score >= 0.6 ? "text-blue-600" :
          data.summary.diversity_score >= 0.4 ? "text-yellow-600" : "text-red-600",
        diversity_bg:
          data.summary.diversity_score >= 0.8 ? "bg-green-50" :
          data.summary.diversity_score >= 0.6 ? "bg-blue-50" :
          data.summary.diversity_score >= 0.4 ? "bg-yellow-50" : "bg-red-50",
      },
      // Additional chart-specific formatting
      donutChartConfig: {
        dataKey: "value",
        nameKey: "name",
        cx: "50%",
        cy: "50%",
        outerRadius: 80,
        innerRadius: 45, // For donut chart hole
        paddingAngle: 3,
        labelLine: false,
        label: {
          position: "outside",
          fontSize: 12,
          fill: "#374151",
        },
      },
      // Colors palette for consistent theming
      colorPalette: data.data_points.map(point => point.color),
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load test module donut data",
      endpoint,
    },
  });
}

// Hook for multiple test module donuts comparison (if needed in the future)
export function useMultipleTestModuleDonuts(
  configs: Array<{
    key: string;
    options?: UseTestModuleDonutOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [...queryKeys.dashboard.all(), "test-module-donut", config.key],
    queryFn: async (): Promise<TestModuleDonutResponse> => {
      const response = await apiClient.get<GetTestModuleDonutApiResponse>(
        "/dashboard/admin/test-module-donut"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch test module donut data"
        );
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 10 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 15 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for test module donut chart options
export function useTestModuleDonutOptions() {
  const chartTypes = [
    {
      value: "donut",
      label: "Donut Chart",
      description: "Traditional donut chart visualization",
    },
    {
      value: "pie",
      label: "Pie Chart",
      description: "Pie chart without center hole",
    },
    {
      value: "bar",
      label: "Bar Chart",
      description: "Horizontal bar visualization",
    },
  ];

  const displayOptions = [
    { value: "percentage", label: "Show Percentage", description: "Display percentage values" },
    { value: "count", label: "Show Count", description: "Display raw count values" },
    { value: "both", label: "Show Both", description: "Display both percentage and count" },
  ];

  const legendPositions = [
    { value: "top", label: "Top", description: "Legend at top" },
    { value: "bottom", label: "Bottom", description: "Legend at bottom" },
    { value: "left", label: "Left", description: "Legend at left" },
    { value: "right", label: "Right", description: "Legend at right" },
  ];

  const colorSchemes = [
    {
      name: "Default",
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#6B7280"],
    },
    {
      name: "Pastel",
      colors: ["#93C5FD", "#6EE7B7", "#FCD34D", "#C4B5FD", "#FCA5A5", "#67E8F9", "#9CA3AF"],
    },
    {
      name: "Dark",
      colors: ["#1E40AF", "#059669", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#4B5563"],
    },
  ];

  return {
    chartTypes,
    displayOptions,
    legendPositions,
    colorSchemes,
  };
}

// Helper function to format test module donut data for charts
export function formatTestModuleDonutDataForChart(data: TestModuleDonutResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.label,
      value: point.value,
      module_type: point.module_type,
      percentage: point.percentage,
      color: point.color,
      fill: point.color,
      formattedValue: `${point.value} tes`,
      formattedPercentage: `${point.percentage}%`,
      tooltip: `${point.label}: ${point.value} tes (${point.percentage}%)`,
    })),
    summary: {
      total: data.total_tests,
      modules: data.module_types_count,
      mostPopular: {
        module: data.summary.most_popular_module,
        count: data.summary.most_popular_count,
      },
      leastPopular: {
        module: data.summary.least_popular_module,
        count: data.summary.least_popular_count,
      },
      diversity: {
        score: data.summary.diversity_score,
        percentage: `${Math.round(data.summary.diversity_score * 100)}%`,
        level: 
          data.summary.diversity_score >= 0.8 ? "Tinggi" :
          data.summary.diversity_score >= 0.6 ? "Sedang" :
          data.summary.diversity_score >= 0.4 ? "Rendah" : "Sangat Rendah",
      },
    },
  };
}

// Hook for real-time test module donut updates
export function useRealtimeTestModuleDonut(options: UseTestModuleDonutOptions = {}) {
  return useTestModuleDonut({
    ...options,
    refetchInterval: 5 * 60 * 1000, // 5 minutes for real-time updates
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
  });
}

// Hook for test module donut with filtering (future enhancement)
export function useTestModuleDonutWithFilter(
  filters: {
    category?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  },
  options: UseTestModuleDonutOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 10 * 60 * 1000,
    refetchInterval = 15 * 60 * 1000,
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  // Build endpoint with filters (if API supports it in the future)
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.status) params.append("status", filters.status);
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }

  const endpoint = `/dashboard/admin/test-module-donut?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "test-module-donut-filtered",
      filters,
    ],
    queryFn: async (): Promise<TestModuleDonutResponse> => {
      const response = await apiClient.get<GetTestModuleDonutApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered test module donut data"
        );
      }

      return response.data;
    },
    enabled: enabled && !!user && user.role === "admin",
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    meta: {
      errorMessage: "Failed to load filtered test module donut data",
      endpoint,
    },
  });
}

// Utility function to get module type colors mapping
export function getModuleTypeColorMapping(): Record<string, string> {
  return {
    intelligence: "#3B82F6", // blue
    personality: "#10B981", // emerald
    aptitude: "#F59E0B", // amber
    interest: "#8B5CF6", // violet
    projective: "#EF4444", // red
    cognitive: "#06B6D4", // cyan
    other: "#6B7280", // gray
  };
}

// Utility function to get module type display names
export function getModuleTypeDisplayNames(): Record<string, string> {
  return {
    intelligence: "Intelligence Tests",
    personality: "Personality Tests",
    aptitude: "Aptitude Tests",
    interest: "Interest Tests",
    projective: "Projective Tests",
    cognitive: "Cognitive Tests",
    other: "Other Tests",
  };
}