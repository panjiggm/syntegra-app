import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Test Category Pie Data Point Interface
export interface TestCategoryPieDataPoint {
  category: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Test Category Pie Summary Interface
export interface TestCategoryPieSummary {
  most_popular_category: string;
  most_popular_count: number;
  least_popular_category: string;
  least_popular_count: number;
  diversity_score: number;
}

// Main Response Interface
export interface TestCategoryPieResponse {
  total_tests: number;
  categories_count: number;
  data_points: TestCategoryPieDataPoint[];
  summary: TestCategoryPieSummary;
}

// API Response Interface
export interface GetTestCategoryPieApiResponse {
  success: boolean;
  message: string;
  data: TestCategoryPieResponse;
  timestamp: string;
}

// Error Response Interface
export interface TestCategoryPieErrorResponse {
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
export interface UseTestCategoryPieOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useTestCategoryPie(options: UseTestCategoryPieOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 10 * 60 * 1000, // 10 minutes (longer for pie chart - less frequent updates)
    refetchInterval = 15 * 60 * 1000, // 15 minutes (slow update for category distribution)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/test-category-pie";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "test-category-pie"],
    queryFn: async (): Promise<TestCategoryPieResponse> => {
      const response = await apiClient.get<GetTestCategoryPieApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch test category pie data"
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
    select: (data: TestCategoryPieResponse) => ({
      ...data,
      // Add formatted data points for pie chart consumption
      chartData: data.data_points.map((point) => ({
        name: point.label, // For Recharts pie chart
        value: point.value,
        category: point.category,
        percentage: point.percentage,
        color: point.color,
        fill: point.color, // For Recharts pie chart fill
        label: point.label,
        // Additional formatting for pie charts
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
      pieChartConfig: {
        dataKey: "value",
        nameKey: "name",
        cx: "50%",
        cy: "50%",
        outerRadius: 80,
        innerRadius: 40, // For donut chart
        paddingAngle: 2,
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
      errorMessage: "Failed to load test category pie data",
      endpoint,
    },
  });
}

// Hook for multiple test category pies comparison (if needed in the future)
export function useMultipleTestCategoryPies(
  configs: Array<{
    key: string;
    options?: UseTestCategoryPieOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [...queryKeys.dashboard.all(), "test-category-pie", config.key],
    queryFn: async (): Promise<TestCategoryPieResponse> => {
      const response = await apiClient.get<GetTestCategoryPieApiResponse>(
        "/dashboard/admin/test-category-pie"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch test category pie data"
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

// Utility hook for test category pie chart options
export function useTestCategoryPieOptions() {
  const chartTypes = [
    {
      value: "pie",
      label: "Pie Chart",
      description: "Traditional pie chart visualization",
    },
    {
      value: "donut",
      label: "Donut Chart",
      description: "Pie chart with center hole",
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
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16", "#EC4899"],
    },
    {
      name: "Pastel",
      colors: ["#93C5FD", "#6EE7B7", "#FCD34D", "#C4B5FD", "#FCA5A5", "#67E8F9", "#BEF264", "#F9A8D4"],
    },
    {
      name: "Dark",
      colors: ["#1E40AF", "#059669", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#65A30D", "#BE185D"],
    },
  ];

  return {
    chartTypes,
    displayOptions,
    legendPositions,
    colorSchemes,
  };
}

// Helper function to format test category pie data for charts
export function formatTestCategoryPieDataForChart(data: TestCategoryPieResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.label,
      value: point.value,
      category: point.category,
      percentage: point.percentage,
      color: point.color,
      fill: point.color,
      formattedValue: `${point.value} tes`,
      formattedPercentage: `${point.percentage}%`,
      tooltip: `${point.label}: ${point.value} tes (${point.percentage}%)`,
    })),
    summary: {
      total: data.total_tests,
      categories: data.categories_count,
      mostPopular: {
        category: data.summary.most_popular_category,
        count: data.summary.most_popular_count,
      },
      leastPopular: {
        category: data.summary.least_popular_category,
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

// Hook for real-time test category pie updates
export function useRealtimeTestCategoryPie(options: UseTestCategoryPieOptions = {}) {
  return useTestCategoryPie({
    ...options,
    refetchInterval: 5 * 60 * 1000, // 5 minutes for real-time updates
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
  });
}

// Hook for test category pie with filtering (future enhancement)
export function useTestCategoryPieWithFilter(
  filters: {
    moduleType?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  },
  options: UseTestCategoryPieOptions = {}
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
  if (filters.moduleType) params.append("module_type", filters.moduleType);
  if (filters.status) params.append("status", filters.status);
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }

  const endpoint = `/dashboard/admin/test-category-pie?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "test-category-pie-filtered",
      filters,
    ],
    queryFn: async (): Promise<TestCategoryPieResponse> => {
      const response = await apiClient.get<GetTestCategoryPieApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered test category pie data"
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
      errorMessage: "Failed to load filtered test category pie data",
      endpoint,
    },
  });
}

// Utility function to get category colors mapping
export function getCategoryColorMapping(): Record<string, string> {
  return {
    wais: "#3B82F6", // blue
    mbti: "#10B981", // emerald
    wartegg: "#F59E0B", // amber
    riasec: "#8B5CF6", // violet
    kraepelin: "#EF4444", // red
    pauli: "#06B6D4", // cyan
    bigfive: "#84CC16", // lime
    disc: "#EC4899", // pink
    other: "#6B7280", // gray
  };
}

// Utility function to get category display names
export function getCategoryDisplayNames(): Record<string, string> {
  return {
    wais: "WAIS (Intelligence)",
    mbti: "MBTI (Personality)",
    wartegg: "Wartegg (Projective)",
    riasec: "RIASEC (Interest)",
    kraepelin: "Kraepelin (Concentration)",
    pauli: "Pauli (Attention)",
    bigfive: "Big Five (Personality)",
    disc: "DISC (Behavior)",
    other: "Other",
  };
}