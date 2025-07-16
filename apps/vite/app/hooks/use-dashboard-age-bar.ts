import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Age Bar Chart Data Point Interface
export interface AgeBarDataPoint {
  age_group: string;
  count: number;
  percentage: number;
  color: string;
  min_age: number;
  max_age: number;
}

// Age Bar Chart Statistics Interface
export interface AgeBarStatistics {
  average_age: number;
  median_age: number;
  most_common_age_group: string;
  most_common_count: number;
  age_diversity_score: number;
}

// Main Response Interface
export interface AgeBarResponse {
  total_participants: number;
  participants_with_birth_date: number;
  data_points: AgeBarDataPoint[];
  statistics: AgeBarStatistics;
}

// API Response Interface
export interface GetAgeBarApiResponse {
  success: boolean;
  message: string;
  data: AgeBarResponse;
  timestamp: string;
}

// Error Response Interface
export interface AgeBarErrorResponse {
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
export interface UseAgeBarOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useAgeBar(options: UseAgeBarOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 20 * 60 * 1000, // 20 minutes (age distribution changes slowly)
    refetchInterval = 30 * 60 * 1000, // 30 minutes (very slow update for demographics)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/age-bar";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "age-bar"],
    queryFn: async (): Promise<AgeBarResponse> => {
      const response = await apiClient.get<GetAgeBarApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch age bar chart data"
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
    select: (data: AgeBarResponse) => ({
      ...data,
      // Add formatted data points for bar chart consumption
      chartData: data.data_points.map((point) => ({
        name: point.age_group, // For Recharts bar chart
        value: point.count,
        count: point.count,
        percentage: point.percentage,
        color: point.color,
        fill: point.color, // For Recharts bar chart fill
        age_group: point.age_group,
        min_age: point.min_age,
        max_age: point.max_age,
        // Additional formatting for bar charts
        formattedValue: point.count.toLocaleString(),
        formattedPercentage: `${point.percentage}%`,
        displayLabel: `${point.age_group} tahun`,
        tooltipLabel: `${point.age_group} tahun: ${point.count} peserta (${point.percentage}%)`,
        // Range display
        rangeDisplay: point.age_group === "58+" ? "58+ tahun" : `${point.min_age}-${point.max_age} tahun`,
      })),
      // Add enhanced statistics with formatting
      enhancedStatistics: {
        ...data.statistics,
        // Format statistics values
        formattedAverageAge: `${data.statistics.average_age} tahun`,
        formattedMedianAge: `${data.statistics.median_age} tahun`,
        formattedMostCommonAgeGroup: `${data.statistics.most_common_age_group} tahun`,
        formattedMostCommonCount: data.statistics.most_common_count.toLocaleString(),
        formattedAgeDiversityScore: `${Math.round(data.statistics.age_diversity_score * 100)}%`,
        // Diversity level assessment
        diversityLevel: 
          data.statistics.age_diversity_score >= 0.8 ? "Sangat Beragam" :
          data.statistics.age_diversity_score >= 0.6 ? "Beragam" :
          data.statistics.age_diversity_score >= 0.4 ? "Cukup Beragam" : "Kurang Beragam",
        diversityColor:
          data.statistics.age_diversity_score >= 0.8 ? "text-green-600" :
          data.statistics.age_diversity_score >= 0.6 ? "text-blue-600" :
          data.statistics.age_diversity_score >= 0.4 ? "text-yellow-600" : "text-red-600",
        diversityBg:
          data.statistics.age_diversity_score >= 0.8 ? "bg-green-50" :
          data.statistics.age_diversity_score >= 0.6 ? "bg-blue-50" :
          data.statistics.age_diversity_score >= 0.4 ? "bg-yellow-50" : "bg-red-50",
        // Age insights
        ageInsights: {
          isYoungDominated: data.data_points.slice(0, 3).reduce((sum, p) => sum + p.count, 0) > (data.participants_with_birth_date * 0.6),
          isMatureDominated: data.data_points.slice(-3).reduce((sum, p) => sum + p.count, 0) > (data.participants_with_birth_date * 0.6),
          isBalanced: data.statistics.age_diversity_score >= 0.7,
          dominantGroup: data.statistics.most_common_age_group,
          dominantPercentage: Math.round((data.statistics.most_common_count / data.participants_with_birth_date) * 100),
        },
      },
      // Participation rate
      participationRate: {
        withBirthDate: data.participants_with_birth_date,
        total: data.total_participants,
        percentage: data.total_participants > 0 ? Math.round((data.participants_with_birth_date / data.total_participants) * 100) : 0,
        missing: data.total_participants - data.participants_with_birth_date,
        missingPercentage: data.total_participants > 0 ? Math.round(((data.total_participants - data.participants_with_birth_date) / data.total_participants) * 100) : 0,
      },
      // Chart configuration for Recharts
      barChartConfig: {
        dataKey: "value",
        nameKey: "name",
        margin: { top: 20, right: 30, left: 20, bottom: 5 },
        layout: "vertical", // or "horizontal"
        xAxisDataKey: "name",
        yAxisDataKey: "value",
        barCategoryGap: "20%",
        barGap: 4,
      },
      // Colors palette for consistent theming
      colorPalette: data.data_points.map(point => point.color),
      // Quick stats for dashboard cards
      quickStats: {
        totalParticipants: data.total_participants,
        withBirthDate: data.participants_with_birth_date,
        averageAge: data.statistics.average_age,
        medianAge: data.statistics.median_age,
        diversityScore: Math.round(data.statistics.age_diversity_score * 100),
        mostCommonGroup: data.statistics.most_common_age_group,
      },
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load age bar chart data",
      endpoint,
    },
  });
}

// Hook for specific age groups analysis
export function useAgeGroupAnalysis(options: UseAgeBarOptions = {}) {
  const ageBarQuery = useAgeBar(options);

  return {
    ...ageBarQuery,
    data: ageBarQuery.data ? {
      youngAdults: ageBarQuery.data.chartData.filter(item => 
        ["18-22", "23-27", "28-32"].includes(item.age_group)
      ),
      middleAge: ageBarQuery.data.chartData.filter(item => 
        ["33-37", "38-42", "43-47"].includes(item.age_group)
      ),
      seniors: ageBarQuery.data.chartData.filter(item => 
        ["48-52", "53-57", "58+"].includes(item.age_group)
      ),
      analysis: ageBarQuery.data.enhancedStatistics.ageInsights,
    } : undefined,
  };
}

// Hook for age distribution summary only
export function useAgeDistributionSummary(options: UseAgeBarOptions = {}) {
  const ageBarQuery = useAgeBar(options);

  return {
    ...ageBarQuery,
    data: ageBarQuery.data ? {
      statistics: ageBarQuery.data.enhancedStatistics,
      participationRate: ageBarQuery.data.participationRate,
      quickStats: ageBarQuery.data.quickStats,
    } : undefined,
  };
}

// Hook for multiple age bar comparisons (if needed in the future)
export function useMultipleAgeBars(
  configs: Array<{
    key: string;
    options?: UseAgeBarOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [...queryKeys.dashboard.all(), "age-bar", config.key],
    queryFn: async (): Promise<AgeBarResponse> => {
      const response = await apiClient.get<GetAgeBarApiResponse>(
        "/dashboard/admin/age-bar"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch age bar chart data"
        );
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 20 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 30 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for age bar chart options
export function useAgeBarChartOptions() {
  const chartTypes = [
    {
      value: "bar",
      label: "Bar Chart",
      description: "Horizontal bar chart visualization",
    },
    {
      value: "column",
      label: "Column Chart", 
      description: "Vertical column chart visualization",
    },
    {
      value: "area",
      label: "Area Chart",
      description: "Smooth area chart visualization",
    },
    {
      value: "line",
      label: "Line Chart",
      description: "Line chart showing age distribution trend",
    },
  ];

  const displayOptions = [
    { value: "count", label: "Show Count", description: "Display participant count" },
    { value: "percentage", label: "Show Percentage", description: "Display percentage values" },
    { value: "both", label: "Show Both", description: "Display both count and percentage" },
  ];

  const layoutOptions = [
    { value: "horizontal", label: "Horizontal", description: "Horizontal bar layout" },
    { value: "vertical", label: "Vertical", description: "Vertical column layout" },
  ];

  const ageGroupCategories = [
    { value: "detailed", label: "Detailed Groups", description: "9 age groups (18-22, 23-27, etc.)" },
    { value: "broad", label: "Broad Groups", description: "3 age categories (Young, Middle, Senior)" },
    { value: "custom", label: "Custom Groups", description: "User-defined age ranges" },
  ];

  return {
    chartTypes,
    displayOptions,
    layoutOptions,
    ageGroupCategories,
  };
}

// Helper function to format age bar data for charts
export function formatAgeBarDataForChart(data: AgeBarResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.age_group,
      value: point.count,
      count: point.count,
      percentage: point.percentage,
      color: point.color,
      fill: point.color,
      ageGroup: point.age_group,
      minAge: point.min_age,
      maxAge: point.max_age,
      formattedValue: `${point.count} peserta`,
      formattedPercentage: `${point.percentage}%`,
      tooltip: `${point.age_group} tahun: ${point.count} peserta (${point.percentage}%)`,
      rangeDisplay: point.age_group === "58+" ? "58+ tahun" : `${point.min_age}-${point.max_age} tahun`,
    })),
    statistics: {
      averageAge: data.statistics.average_age,
      medianAge: data.statistics.median_age,
      mostCommonGroup: data.statistics.most_common_age_group,
      mostCommonCount: data.statistics.most_common_count,
      diversity: {
        score: data.statistics.age_diversity_score,
        percentage: `${Math.round(data.statistics.age_diversity_score * 100)}%`,
        level: 
          data.statistics.age_diversity_score >= 0.8 ? "Sangat Beragam" :
          data.statistics.age_diversity_score >= 0.6 ? "Beragam" :
          data.statistics.age_diversity_score >= 0.4 ? "Cukup Beragam" : "Kurang Beragam",
      },
    },
    totals: {
      totalParticipants: data.total_participants,
      withBirthDate: data.participants_with_birth_date,
      participationRate: data.total_participants > 0 ? 
        Math.round((data.participants_with_birth_date / data.total_participants) * 100) : 0,
    },
  };
}

// Hook for real-time age bar updates
export function useRealtimeAgeBar(options: UseAgeBarOptions = {}) {
  return useAgeBar({
    ...options,
    refetchInterval: 15 * 60 * 1000, // 15 minutes for real-time updates
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}

// Hook for age bar with filtering (future enhancement)
export function useAgeBarWithFilter(
  filters: {
    dateRange?: { start: string; end: string };
    province?: string;
    education?: string;
    gender?: string;
  },
  options: UseAgeBarOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 20 * 60 * 1000,
    refetchInterval = 30 * 60 * 1000,
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  // Build endpoint with filters (if API supports it in the future)
  const params = new URLSearchParams();
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }
  if (filters.province) params.append("province", filters.province);
  if (filters.education) params.append("education", filters.education);
  if (filters.gender) params.append("gender", filters.gender);

  const endpoint = `/dashboard/admin/age-bar?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "age-bar-filtered",
      filters,
    ],
    queryFn: async (): Promise<AgeBarResponse> => {
      const response = await apiClient.get<GetAgeBarApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered age bar chart data"
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
      errorMessage: "Failed to load filtered age bar chart data",
      endpoint,
    },
  });
}

// Utility function to get age group colors mapping
export function getAgeGroupColorMapping(): Record<string, string> {
  return {
    "18-22": "#3B82F6", // blue (young)
    "23-27": "#06B6D4", // cyan
    "28-32": "#10B981", // emerald
    "33-37": "#84CC16", // lime
    "38-42": "#F59E0B", // amber
    "43-47": "#EF4444", // red
    "48-52": "#8B5CF6", // violet
    "53-57": "#EC4899", // pink
    "58+": "#6B7280", // gray (senior)
  };
}

// Utility function to get age group display names
export function getAgeGroupDisplayNames(): Record<string, string> {
  return {
    "18-22": "18-22 tahun",
    "23-27": "23-27 tahun",
    "28-32": "28-32 tahun",
    "33-37": "33-37 tahun",
    "38-42": "38-42 tahun",
    "43-47": "43-47 tahun",
    "48-52": "48-52 tahun",
    "53-57": "53-57 tahun",
    "58+": "58+ tahun",
  };
}

// Helper function to analyze age distribution patterns
export function analyzeAgeDistribution(data: AgeBarResponse) {
  const totalWithBirthDate = data.participants_with_birth_date;
  
  // Calculate distribution patterns
  const youngAdultsCount = data.data_points
    .filter(p => ["18-22", "23-27", "28-32"].includes(p.age_group))
    .reduce((sum, p) => sum + p.count, 0);
  
  const middleAgedCount = data.data_points
    .filter(p => ["33-37", "38-42", "43-47"].includes(p.age_group))
    .reduce((sum, p) => sum + p.count, 0);
  
  const seniorsCount = data.data_points
    .filter(p => ["48-52", "53-57", "58+"].includes(p.age_group))
    .reduce((sum, p) => sum + p.count, 0);

  const youngPercentage = totalWithBirthDate > 0 ? (youngAdultsCount / totalWithBirthDate) * 100 : 0;
  const middlePercentage = totalWithBirthDate > 0 ? (middleAgedCount / totalWithBirthDate) * 100 : 0;
  const seniorPercentage = totalWithBirthDate > 0 ? (seniorsCount / totalWithBirthDate) * 100 : 0;

  return {
    patterns: {
      youngAdults: { count: youngAdultsCount, percentage: Math.round(youngPercentage) },
      middleAged: { count: middleAgedCount, percentage: Math.round(middlePercentage) },
      seniors: { count: seniorsCount, percentage: Math.round(seniorPercentage) },
    },
    insights: {
      dominantCategory: 
        youngPercentage > middlePercentage && youngPercentage > seniorPercentage ? "young" :
        middlePercentage > seniorPercentage ? "middle" : "senior",
      isBalanced: Math.abs(youngPercentage - middlePercentage) < 20 && Math.abs(middlePercentage - seniorPercentage) < 20,
      diversityLevel: data.statistics.age_diversity_score >= 0.7 ? "high" : 
                     data.statistics.age_diversity_score >= 0.5 ? "medium" : "low",
      recommendations: [
        youngPercentage > 60 ? "Pertimbangkan strategi untuk menarik peserta yang lebih berpengalaman" : null,
        seniorPercentage > 60 ? "Pertimbangkan strategi untuk menarik peserta yang lebih muda" : null,
        data.statistics.age_diversity_score < 0.5 ? "Tingkatkan keragaman usia peserta" : null,
      ].filter(Boolean),
    },
  };
}