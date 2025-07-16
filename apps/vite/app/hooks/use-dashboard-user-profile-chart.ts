import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// User Profile Chart Data Point Interface
export interface UserProfileChartDataPoint {
  category: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// User Profile Chart Section Interface
export interface UserProfileChartSection {
  type: "gender" | "education" | "religion";
  title: string;
  total_users: number;
  data_points: UserProfileChartDataPoint[];
  summary: {
    most_common: string;
    most_common_count: number;
    least_common: string;
    least_common_count: number;
    diversity_score: number;
  };
}

// Overall Summary Interface
export interface UserProfileOverallSummary {
  total_participants: number;
  diversity_scores: {
    gender: number;
    education: number;
    religion: number;
    overall: number;
  };
  demographics_health: "Excellent" | "Good" | "Fair" | "Poor";
}

// Main Response Interface
export interface UserProfileChartResponse {
  total_users: number;
  sections: UserProfileChartSection[];
  overall_summary: UserProfileOverallSummary;
}

// API Response Interface
export interface GetUserProfileChartApiResponse {
  success: boolean;
  message: string;
  data: UserProfileChartResponse;
  timestamp: string;
}

// Error Response Interface
export interface UserProfileChartErrorResponse {
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
export interface UseUserProfileChartOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useUserProfileChart(options: UseUserProfileChartOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 minutes (demographics don't change frequently)
    refetchInterval = 30 * 60 * 1000, // 30 minutes (slow update for demographics)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/user-profile-chart";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "user-profile-chart"],
    queryFn: async (): Promise<UserProfileChartResponse> => {
      const response = await apiClient.get<GetUserProfileChartApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch user profile chart data"
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
    select: (data: UserProfileChartResponse) => ({
      ...data,
      // Add formatted sections with chart-ready data
      formattedSections: data.sections.map((section) => ({
        ...section,
        // Format data for chart libraries
        chartData: section.data_points.map((point) => ({
          name: point.label, // For Recharts
          value: point.value,
          category: point.category,
          percentage: point.percentage,
          color: point.color,
          fill: point.color, // For Recharts fill
          label: point.label,
          // Additional formatting
          formattedValue: point.value.toLocaleString(),
          formattedPercentage: `${point.percentage}%`,
          displayLabel: `${point.label} (${point.percentage}%)`,
          tooltipLabel: `${point.label}: ${point.value} peserta (${point.percentage}%)`,
        })),
        // Formatted summary
        formattedSummary: {
          ...section.summary,
          diversity_score: Math.round(section.summary.diversity_score * 100) / 100,
          diversity_percentage: `${Math.round(section.summary.diversity_score * 100)}%`,
          diversity_level: 
            section.summary.diversity_score >= 0.8 ? "Sangat Baik" :
            section.summary.diversity_score >= 0.6 ? "Baik" :
            section.summary.diversity_score >= 0.4 ? "Cukup" : "Kurang",
          diversity_color:
            section.summary.diversity_score >= 0.8 ? "text-green-600" :
            section.summary.diversity_score >= 0.6 ? "text-blue-600" :
            section.summary.diversity_score >= 0.4 ? "text-yellow-600" : "text-red-600",
          diversity_bg:
            section.summary.diversity_score >= 0.8 ? "bg-green-50" :
            section.summary.diversity_score >= 0.6 ? "bg-blue-50" :
            section.summary.diversity_score >= 0.4 ? "bg-yellow-50" : "bg-red-50",
        },
        // Chart configuration for each section
        chartConfig: {
          dataKey: "value",
          nameKey: "name",
          cx: "50%",
          cy: "50%",
          outerRadius: 80,
          innerRadius: section.type === "gender" ? 30 : 25, // Different inner radius for variety
          paddingAngle: 2,
          labelLine: false,
          label: {
            position: "outside",
            fontSize: 12,
            fill: "#374151",
          },
        },
      })),
      // Enhanced overall summary
      enhancedOverallSummary: {
        ...data.overall_summary,
        // Format diversity scores
        formattedDiversityScores: {
          gender: `${Math.round(data.overall_summary.diversity_scores.gender * 100)}%`,
          education: `${Math.round(data.overall_summary.diversity_scores.education * 100)}%`,
          religion: `${Math.round(data.overall_summary.diversity_scores.religion * 100)}%`,
          overall: `${Math.round(data.overall_summary.diversity_scores.overall * 100)}%`,
        },
        // Health status styling
        healthStatusColor: 
          data.overall_summary.demographics_health === "Excellent" ? "text-green-600" :
          data.overall_summary.demographics_health === "Good" ? "text-blue-600" :
          data.overall_summary.demographics_health === "Fair" ? "text-yellow-600" : "text-red-600",
        healthStatusBg:
          data.overall_summary.demographics_health === "Excellent" ? "bg-green-50" :
          data.overall_summary.demographics_health === "Good" ? "bg-blue-50" :
          data.overall_summary.demographics_health === "Fair" ? "bg-yellow-50" : "bg-red-50",
        // Health description
        healthDescription:
          data.overall_summary.demographics_health === "Excellent" ? "Keragaman demografis sangat baik" :
          data.overall_summary.demographics_health === "Good" ? "Keragaman demografis baik" :
          data.overall_summary.demographics_health === "Fair" ? "Keragaman demografis cukup" : "Keragaman demografis kurang",
      },
      // Quick stats for dashboard cards
      quickStats: {
        totalParticipants: data.total_users,
        genderDistribution: data.sections.find(s => s.type === "gender")?.data_points.length || 0,
        educationLevels: data.sections.find(s => s.type === "education")?.data_points.length || 0,
        religionGroups: data.sections.find(s => s.type === "religion")?.data_points.length || 0,
        averageDiversityScore: Math.round(data.overall_summary.diversity_scores.overall * 100) / 100,
      },
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load user profile chart data",
      endpoint,
    },
  });
}

// Hook for specific profile section
export function useUserProfileSection(
  sectionType: "gender" | "education" | "religion",
  options: UseUserProfileChartOptions = {}
) {
  const profileQuery = useUserProfileChart(options);

  return {
    ...profileQuery,
    data: profileQuery.data?.formattedSections.find(s => s.type === sectionType),
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
  };
}

// Hook for demographics summary only
export function useUserProfileSummary(options: UseUserProfileChartOptions = {}) {
  const profileQuery = useUserProfileChart(options);

  return {
    ...profileQuery,
    data: profileQuery.data?.enhancedOverallSummary,
    quickStats: profileQuery.data?.quickStats,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
  };
}

// Hook for multiple profile comparisons (if needed in the future)
export function useMultipleUserProfileCharts(
  configs: Array<{
    key: string;
    options?: UseUserProfileChartOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "user-profile-chart",
      config.key,
    ],
    queryFn: async (): Promise<UserProfileChartResponse> => {
      const response = await apiClient.get<GetUserProfileChartApiResponse>(
        "/dashboard/admin/user-profile-chart"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch user profile chart data"
        );
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 15 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 30 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for user profile chart options
export function useUserProfileChartOptions() {
  const chartTypes = [
    {
      value: "pie",
      label: "Pie Chart",
      description: "Traditional pie chart visualization",
    },
    {
      value: "donut",
      label: "Donut Chart",
      description: "Donut chart with center hole",
    },
    {
      value: "bar",
      label: "Bar Chart",
      description: "Horizontal bar visualization",
    },
    {
      value: "column",
      label: "Column Chart",
      description: "Vertical column visualization",
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

  const sectionTypes = [
    { value: "gender", label: "Gender Distribution", description: "User distribution by gender" },
    { value: "education", label: "Education Distribution", description: "User distribution by education level" },
    { value: "religion", label: "Religion Distribution", description: "User distribution by religion" },
  ];

  return {
    chartTypes,
    displayOptions,
    legendPositions,
    sectionTypes,
  };
}

// Helper function to format user profile data for charts
export function formatUserProfileDataForChart(data: UserProfileChartResponse) {
  return {
    sections: data.sections.map((section) => ({
      type: section.type,
      title: section.title,
      total: section.total_users,
      data: section.data_points.map((point) => ({
        name: point.label,
        value: point.value,
        category: point.category,
        percentage: point.percentage,
        color: point.color,
        fill: point.color,
        formattedValue: `${point.value} peserta`,
        formattedPercentage: `${point.percentage}%`,
        tooltip: `${point.label}: ${point.value} peserta (${point.percentage}%)`,
      })),
      summary: {
        mostCommon: section.summary.most_common,
        mostCommonCount: section.summary.most_common_count,
        leastCommon: section.summary.least_common,
        leastCommonCount: section.summary.least_common_count,
        diversity: {
          score: section.summary.diversity_score,
          percentage: `${Math.round(section.summary.diversity_score * 100)}%`,
          level: 
            section.summary.diversity_score >= 0.8 ? "Sangat Baik" :
            section.summary.diversity_score >= 0.6 ? "Baik" :
            section.summary.diversity_score >= 0.4 ? "Cukup" : "Kurang",
        },
      },
    })),
    overall: {
      totalParticipants: data.total_users,
      diversityScores: data.overall_summary.diversity_scores,
      healthStatus: data.overall_summary.demographics_health,
      healthDescription:
        data.overall_summary.demographics_health === "Excellent" ? "Keragaman demografis sangat baik" :
        data.overall_summary.demographics_health === "Good" ? "Keragaman demografis baik" :
        data.overall_summary.demographics_health === "Fair" ? "Keragaman demografis cukup" : "Keragaman demografis kurang",
    },
  };
}

// Hook for real-time user profile updates
export function useRealtimeUserProfileChart(options: UseUserProfileChartOptions = {}) {
  return useUserProfileChart({
    ...options,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for real-time updates
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}

// Hook for user profile chart with filtering (future enhancement)
export function useUserProfileChartWithFilter(
  filters: {
    dateRange?: { start: string; end: string };
    ageRange?: { min: number; max: number };
    province?: string;
    status?: string;
  },
  options: UseUserProfileChartOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000,
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
  if (filters.ageRange) {
    params.append("min_age", filters.ageRange.min.toString());
    params.append("max_age", filters.ageRange.max.toString());
  }
  if (filters.province) params.append("province", filters.province);
  if (filters.status) params.append("status", filters.status);

  const endpoint = `/dashboard/admin/user-profile-chart?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "user-profile-chart-filtered",
      filters,
    ],
    queryFn: async (): Promise<UserProfileChartResponse> => {
      const response = await apiClient.get<GetUserProfileChartApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered user profile chart data"
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
      errorMessage: "Failed to load filtered user profile chart data",
      endpoint,
    },
  });
}

// Utility function to get profile section colors mapping
export function getProfileSectionColorMappings() {
  return {
    gender: {
      male: "#3B82F6", // blue
      female: "#EC4899", // pink
      other: "#8B5CF6", // violet
    },
    education: {
      sd: "#EF4444", // red
      smp: "#F59E0B", // amber
      sma: "#10B981", // emerald
      diploma: "#06B6D4", // cyan
      s1: "#3B82F6", // blue
      s2: "#8B5CF6", // violet
      s3: "#84CC16", // lime
      other: "#6B7280", // gray
    },
    religion: {
      islam: "#10B981", // emerald
      kristen: "#3B82F6", // blue
      katolik: "#8B5CF6", // violet
      hindu: "#F59E0B", // amber
      buddha: "#06B6D4", // cyan
      konghucu: "#84CC16", // lime
      other: "#6B7280", // gray
    },
  };
}

// Utility function to get profile section display names
export function getProfileSectionDisplayNames() {
  return {
    gender: {
      male: "Laki-laki",
      female: "Perempuan",
      other: "Lainnya",
    },
    education: {
      sd: "SD",
      smp: "SMP",
      sma: "SMA",
      diploma: "Diploma",
      s1: "S1",
      s2: "S2",
      s3: "S3",
      other: "Lainnya",
    },
    religion: {
      islam: "Islam",
      kristen: "Kristen",
      katolik: "Katolik",
      hindu: "Hindu",
      buddha: "Buddha",
      konghucu: "Konghucu",
      other: "Lainnya",
    },
  };
}

// Helper function to calculate age distribution (if needed)
export function calculateAgeDistribution(birthDates: string[]) {
  const currentYear = new Date().getFullYear();
  const ages = birthDates
    .map(date => currentYear - new Date(date).getFullYear())
    .filter(age => age > 0 && age < 100);

  const ageGroups = {
    "18-25": 0,
    "26-35": 0,
    "36-45": 0,
    "46-55": 0,
    "56+": 0,
  };

  ages.forEach(age => {
    if (age >= 18 && age <= 25) ageGroups["18-25"]++;
    else if (age >= 26 && age <= 35) ageGroups["26-35"]++;
    else if (age >= 36 && age <= 45) ageGroups["36-45"]++;
    else if (age >= 46 && age <= 55) ageGroups["46-55"]++;
    else if (age >= 56) ageGroups["56+"]++;
  });

  return ageGroups;
}