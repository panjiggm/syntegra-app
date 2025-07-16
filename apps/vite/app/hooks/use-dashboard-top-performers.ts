import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Top Performer Data Point Interface
export interface TopPerformerDataPoint {
  user_id: string;
  name: string;
  email: string;
  average_raw_score: number;
  average_scaled_score: number;
  total_tests_taken: number;
  total_tests_completed: number;
  completion_rate: number;
  performance_rank: number;
  performance_percentile: number;
  consistency_score: number;
  last_test_date: string;
}

// Performance Metrics Interface
export interface PerformanceMetrics {
  highest_average_score: number;
  average_score_across_all: number;
  top_10_percent_threshold: number;
  most_consistent_performer: {
    name: string;
    consistency_score: number;
  };
}

// Calculation Info Interface
export interface CalculationInfo {
  last_updated: string;
  data_freshness: "fresh" | "stale";
  next_update_in_hours: number;
}

// Main Response Interface
export interface TopPerformersResponse {
  total_participants: number;
  top_performers: TopPerformerDataPoint[];
  performance_metrics: PerformanceMetrics;
  calculation_info: CalculationInfo;
}

// API Response Interface
export interface GetTopPerformersApiResponse {
  success: boolean;
  message: string;
  data: TopPerformersResponse;
  timestamp: string;
}

// Error Response Interface
export interface TopPerformersErrorResponse {
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
export interface UseTopPerformersOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useTopPerformers(options: UseTopPerformersOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 minutes (cached data updated daily)
    refetchInterval = 30 * 60 * 1000, // 30 minutes (slow update for performance data)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/top-performers";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "top-performers"],
    queryFn: async (): Promise<TopPerformersResponse> => {
      const response = await apiClient.get<GetTopPerformersApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch top performers data"
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
    select: (data: TopPerformersResponse) => ({
      ...data,
      // Add formatted data points for chart consumption
      chartData: data.top_performers.map((performer, index) => ({
        // For bar charts
        name: performer.name,
        score: performer.average_raw_score,
        scaled_score: performer.average_scaled_score,
        rank: performer.performance_rank,
        completion_rate: performer.completion_rate,
        consistency: performer.consistency_score,
        tests_taken: performer.total_tests_taken,
        
        // For ranking visualization
        position: index + 1,
        shortName: performer.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        
        // Chart styling
        fill: getPerformanceColor(performer.performance_percentile),
        color: getPerformanceColor(performer.performance_percentile),
        
        // Tooltip data
        tooltipData: {
          name: performer.name,
          score: `${performer.average_raw_score}`,
          rank: `#${performer.performance_rank}`,
          percentile: `${performer.performance_percentile}%`,
          completion: `${performer.completion_rate}%`,
          consistency: `${performer.consistency_score}%`,
          tests: `${performer.total_tests_completed}/${performer.total_tests_taken}`,
        },
        
        // Additional chart data
        performanceLevel: getPerformanceLevel(performer.performance_percentile),
        badgeColor: getBadgeColor(performer.performance_rank),
      })),
      
      // Summary stats for dashboard cards
      summaryStats: {
        totalParticipants: data.total_participants,
        topPerformerScore: data.top_performers[0]?.average_raw_score || 0,
        averageScore: data.performance_metrics.average_score_across_all,
        top10Threshold: data.performance_metrics.top_10_percent_threshold,
        consistencyChampion: data.performance_metrics.most_consistent_performer,
        freshness: data.calculation_info.data_freshness,
        lastUpdated: data.calculation_info.last_updated,
        nextUpdate: data.calculation_info.next_update_in_hours,
      },
      
      // Performance distribution for pie/donut charts
      performanceDistribution: generatePerformanceDistribution(data.top_performers),
      
      // Ranking data for leaderboard
      leaderboardData: data.top_performers.slice(0, 10).map((performer, index) => ({
        position: index + 1,
        name: performer.name,
        score: performer.average_raw_score,
        change: 0, // Could be calculated if historical data available
        badge: getRankBadge(index + 1),
        avatar: generateAvatar(performer.name),
      })),
      
      // Trends data (if historical data becomes available)
      trendsData: data.top_performers.map(performer => ({
        name: performer.name,
        currentScore: performer.average_raw_score,
        completionTrend: performer.completion_rate,
        consistencyTrend: performer.consistency_score,
      })),
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load top performers data",
      endpoint,
    },
  });
}

// Hook for real-time top performers updates
export function useRealtimeTopPerformers(options: UseTopPerformersOptions = {}) {
  return useTopPerformers({
    ...options,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for real-time updates
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}

// Hook for top performers with filtering (future enhancement)
export function useTopPerformersWithFilter(
  filters: {
    limit?: number;
    minTestsTaken?: number;
    dateRange?: { start: string; end: string };
  },
  options: UseTopPerformersOptions = {}
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
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.minTestsTaken) params.append("min_tests", filters.minTestsTaken.toString());
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }

  const endpoint = `/dashboard/admin/top-performers?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "top-performers-filtered",
      filters,
    ],
    queryFn: async (): Promise<TopPerformersResponse> => {
      const response = await apiClient.get<GetTopPerformersApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered top performers data"
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
      errorMessage: "Failed to load filtered top performers data",
      endpoint,
    },
  });
}

// Utility function to get performance color based on percentile
function getPerformanceColor(percentile: number): string {
  if (percentile >= 90) return "#10B981"; // green-500 - excellent
  if (percentile >= 75) return "#3B82F6"; // blue-500 - good
  if (percentile >= 50) return "#F59E0B"; // amber-500 - average
  if (percentile >= 25) return "#EF4444"; // red-500 - below average
  return "#6B7280"; // gray-500 - poor
}

// Utility function to get performance level
function getPerformanceLevel(percentile: number): string {
  if (percentile >= 90) return "Excellent";
  if (percentile >= 75) return "Good";
  if (percentile >= 50) return "Average";
  if (percentile >= 25) return "Below Average";
  return "Poor";
}

// Utility function to get badge color based on rank
function getBadgeColor(rank: number): string {
  if (rank === 1) return "bg-yellow-500 text-white"; // gold
  if (rank === 2) return "bg-gray-400 text-white"; // silver
  if (rank === 3) return "bg-amber-600 text-white"; // bronze
  if (rank <= 10) return "bg-blue-500 text-white"; // top 10
  return "bg-gray-200 text-gray-700"; // default
}

// Utility function to get rank badge
function getRankBadge(position: number): string {
  if (position === 1) return ">G";
  if (position === 2) return ">H";
  if (position === 3) return ">I";
  if (position <= 10) return "<Æ";
  return "P";
}

// Utility function to generate avatar
function generateAvatar(name: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=40`;
}

// Utility function to generate performance distribution
function generatePerformanceDistribution(performers: TopPerformerDataPoint[]) {
  const ranges = [
    { label: "90-100%", min: 90, max: 100, color: "#10B981" },
    { label: "80-89%", min: 80, max: 90, color: "#3B82F6" },
    { label: "70-79%", min: 70, max: 80, color: "#F59E0B" },
    { label: "60-69%", min: 60, max: 70, color: "#EF4444" },
    { label: "Below 60%", min: 0, max: 60, color: "#6B7280" },
  ];

  return ranges.map(range => {
    const count = performers.filter(p => 
      p.performance_percentile >= range.min && p.performance_percentile < range.max
    ).length;
    
    return {
      name: range.label,
      value: count,
      percentage: performers.length > 0 ? (count / performers.length) * 100 : 0,
      color: range.color,
      fill: range.color,
    };
  }).filter(range => range.value > 0); // Only include ranges with data
}

// Helper function to format top performers data for specific chart types
export function formatTopPerformersForChart(data: TopPerformersResponse, chartType: "bar" | "line" | "radar" = "bar") {
  const performers = data.top_performers.slice(0, 10); // Top 10 for charts

  switch (chartType) {
    case "bar":
      return performers.map(performer => ({
        name: performer.name.split(' ')[0], // First name only for space
        score: performer.average_raw_score,
        completion: performer.completion_rate,
        rank: performer.performance_rank,
      }));
    
    case "line":
      return performers.map((performer, index) => ({
        x: index + 1,
        y: performer.average_raw_score,
        label: performer.name,
      }));
    
    case "radar":
      return performers.slice(0, 5).map(performer => ({ // Top 5 for radar
        name: performer.name.split(' ')[0],
        score: performer.average_raw_score,
        completion: performer.completion_rate,
        consistency: performer.consistency_score,
        efficiency: (performer.total_tests_completed / performer.total_tests_taken) * 100,
      }));
    
    default:
      return performers;
  }
}

// Hook for top performers comparison
export function useTopPerformersComparison(userIds: string[]) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "top-performers-comparison", userIds],
    queryFn: async () => {
      // This would be a separate API endpoint for comparison
      const response = await apiClient.post<GetTopPerformersApiResponse>(
        "/dashboard/admin/top-performers/compare",
        { user_ids: userIds }
      );

      if (!response.success) {
        throw new Error("Failed to fetch comparison data");
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin" && userIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}