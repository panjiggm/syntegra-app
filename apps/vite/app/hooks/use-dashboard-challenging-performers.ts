import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Challenging Performer Data Point Interface
export interface ChallengingPerformerDataPoint {
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
  improvement_potential: number;
}

// Support Metrics Interface
export interface SupportMetrics {
  lowest_average_score: number;
  average_score_across_all: number;
  bottom_10_percent_threshold: number;
  most_improvement_potential: {
    name: string;
    improvement_score: number;
  };
  completion_rate_issues: number;
}

// Recommendations Interface
export interface Recommendations {
  additional_support_needed: number;
  retake_recommendations: number;
  personalized_learning_candidates: number;
}

// Calculation Info Interface
export interface CalculationInfo {
  last_updated: string;
  data_freshness: "fresh" | "stale";
  next_update_in_hours: number;
}

// Main Response Interface
export interface ChallengingPerformersResponse {
  total_participants: number;
  challenging_performers: ChallengingPerformerDataPoint[];
  support_metrics: SupportMetrics;
  recommendations: Recommendations;
  calculation_info: CalculationInfo;
}

// API Response Interface
export interface GetChallengingPerformersApiResponse {
  success: boolean;
  message: string;
  data: ChallengingPerformersResponse;
  timestamp: string;
}

// Error Response Interface
export interface ChallengingPerformersErrorResponse {
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
export interface UseChallengingPerformersOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useChallengingPerformers(options: UseChallengingPerformersOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 minutes (cached data updated daily)
    refetchInterval = 30 * 60 * 1000, // 30 minutes (slow update for performance data)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/challenging-performers";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "challenging-performers"],
    queryFn: async (): Promise<ChallengingPerformersResponse> => {
      const response = await apiClient.get<GetChallengingPerformersApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch challenging performers data"
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
    select: (data: ChallengingPerformersResponse) => ({
      ...data,
      // Add formatted data points for chart consumption
      chartData: data.challenging_performers.map((performer, index) => ({
        // For bar charts (improvement potential)
        name: performer.name,
        score: performer.average_raw_score,
        scaled_score: performer.average_scaled_score,
        rank: performer.performance_rank,
        completion_rate: performer.completion_rate,
        consistency: performer.consistency_score,
        improvement_potential: performer.improvement_potential,
        tests_taken: performer.total_tests_taken,
        
        // For ranking visualization (reverse order - lowest first)
        position: index + 1,
        shortName: performer.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        
        // Chart styling (warmer colors for improvement potential)
        fill: getImprovementColor(performer.improvement_potential),
        color: getImprovementColor(performer.improvement_potential),
        
        // Tooltip data
        tooltipData: {
          name: performer.name,
          score: `${performer.average_raw_score}`,
          rank: `#${performer.performance_rank}`,
          percentile: `${performer.performance_percentile}%`,
          completion: `${performer.completion_rate}%`,
          consistency: `${performer.consistency_score}%`,
          improvement: `${performer.improvement_potential}%`,
          tests: `${performer.total_tests_completed}/${performer.total_tests_taken}`,
        },
        
        // Additional chart data
        supportLevel: getSupportLevel(performer.improvement_potential),
        priorityColor: getPriorityColor(performer.improvement_potential),
        urgencyBadge: getUrgencyBadge(performer.improvement_potential),
      })),
      
      // Summary stats for dashboard cards
      summaryStats: {
        totalParticipants: data.total_participants,
        lowestScore: data.challenging_performers[0]?.average_raw_score || 0,
        averageScore: data.support_metrics.average_score_across_all,
        bottom10Threshold: data.support_metrics.bottom_10_percent_threshold,
        improvementChampion: data.support_metrics.most_improvement_potential,
        completionIssues: data.support_metrics.completion_rate_issues,
        freshness: data.calculation_info.data_freshness,
        lastUpdated: data.calculation_info.last_updated,
        nextUpdate: data.calculation_info.next_update_in_hours,
      },
      
      // Support distribution for pie/donut charts
      supportDistribution: generateSupportDistribution(data.challenging_performers),
      
      // Improvement priority list
      improvementPriorityList: data.challenging_performers
        .sort((a, b) => b.improvement_potential - a.improvement_potential)
        .slice(0, 10)
        .map((performer, index) => ({
          priority: index + 1,
          name: performer.name,
          score: performer.average_raw_score,
          improvement_potential: performer.improvement_potential,
          recommendation: getRecommendation(performer),
          urgency: getUrgencyLevel(performer.improvement_potential),
          avatar: generateAvatar(performer.name),
        })),
      
      // Recommendations summary
      recommendationsSummary: {
        total: data.recommendations.additional_support_needed + 
               data.recommendations.retake_recommendations + 
               data.recommendations.personalized_learning_candidates,
        breakdown: [
          {
            type: "Additional Support",
            count: data.recommendations.additional_support_needed,
            color: "#EF4444", // red
            description: "Students needing immediate attention"
          },
          {
            type: "Retake Recommendations", 
            count: data.recommendations.retake_recommendations,
            color: "#F59E0B", // amber
            description: "Students who should retake tests"
          },
          {
            type: "Personalized Learning",
            count: data.recommendations.personalized_learning_candidates,
            color: "#3B82F6", // blue
            description: "Students needing customized learning paths"
          }
        ]
      },
      
      // Progress tracking data
      progressTrackingData: data.challenging_performers.map(performer => ({
        name: performer.name,
        currentScore: performer.average_raw_score,
        completionRate: performer.completion_rate,
        improvementPotential: performer.improvement_potential,
        targetScore: calculateTargetScore(performer),
        estimatedTimeToImprove: estimateImprovementTime(performer),
      })),
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load challenging performers data",
      endpoint,
    },
  });
}

// Hook for real-time challenging performers updates
export function useRealtimeChallengingPerformers(options: UseChallengingPerformersOptions = {}) {
  return useChallengingPerformers({
    ...options,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for real-time updates
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}

// Hook for challenging performers with filtering
export function useChallengingPerformersWithFilter(
  filters: {
    minImprovementPotential?: number;
    maxCompletionRate?: number;
    dateRange?: { start: string; end: string };
  },
  options: UseChallengingPerformersOptions = {}
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
  if (filters.minImprovementPotential) {
    params.append("min_improvement", filters.minImprovementPotential.toString());
  }
  if (filters.maxCompletionRate) {
    params.append("max_completion", filters.maxCompletionRate.toString());
  }
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }

  const endpoint = `/dashboard/admin/challenging-performers?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "challenging-performers-filtered",
      filters,
    ],
    queryFn: async (): Promise<ChallengingPerformersResponse> => {
      const response = await apiClient.get<GetChallengingPerformersApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered challenging performers data"
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
      errorMessage: "Failed to load filtered challenging performers data",
      endpoint,
    },
  });
}

// Utility function to get improvement color based on potential
function getImprovementColor(potential: number): string {
  if (potential >= 80) return "#EF4444"; // red-500 - high priority
  if (potential >= 60) return "#F59E0B"; // amber-500 - medium priority
  if (potential >= 40) return "#3B82F6"; // blue-500 - low priority
  if (potential >= 20) return "#10B981"; // green-500 - monitoring
  return "#6B7280"; // gray-500 - stable
}

// Utility function to get support level
function getSupportLevel(potential: number): string {
  if (potential >= 80) return "Urgent Support";
  if (potential >= 60) return "High Support";
  if (potential >= 40) return "Medium Support";
  if (potential >= 20) return "Light Support";
  return "Monitoring";
}

// Utility function to get priority color based on improvement potential
function getPriorityColor(potential: number): string {
  if (potential >= 80) return "bg-red-500 text-white";
  if (potential >= 60) return "bg-amber-500 text-white";
  if (potential >= 40) return "bg-blue-500 text-white";
  if (potential >= 20) return "bg-green-500 text-white";
  return "bg-gray-500 text-white";
}

// Utility function to get urgency badge
function getUrgencyBadge(potential: number): string {
  if (potential >= 80) return "🚨"; // urgent
  if (potential >= 60) return "⚠️"; // warning
  if (potential >= 40) return "📋"; // attention
  if (potential >= 20) return "👁️"; // watch
  return "✅"; // stable
}

// Utility function to get urgency level
function getUrgencyLevel(potential: number): "Critical" | "High" | "Medium" | "Low" | "Monitor" {
  if (potential >= 80) return "Critical";
  if (potential >= 60) return "High";
  if (potential >= 40) return "Medium";
  if (potential >= 20) return "Low";
  return "Monitor";
}

// Utility function to generate avatar
function generateAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=40`;
}

// Utility function to generate support distribution
function generateSupportDistribution(performers: ChallengingPerformerDataPoint[]) {
  const ranges = [
    { label: "Critical (80-100%)", min: 80, max: 100, color: "#EF4444" },
    { label: "High (60-79%)", min: 60, max: 80, color: "#F59E0B" },
    { label: "Medium (40-59%)", min: 40, max: 60, color: "#3B82F6" },
    { label: "Low (20-39%)", min: 20, max: 40, color: "#10B981" },
    { label: "Monitor (0-19%)", min: 0, max: 20, color: "#6B7280" },
  ];

  return ranges.map(range => {
    const count = performers.filter(p => 
      p.improvement_potential >= range.min && p.improvement_potential < range.max
    ).length;
    
    return {
      name: range.label,
      value: count,
      percentage: performers.length > 0 ? (count / performers.length) * 100 : 0,
      color: range.color,
      fill: range.color,
    };
  }).filter(range => range.value > 0);
}

// Utility function to get recommendation based on performer data
function getRecommendation(performer: ChallengingPerformerDataPoint): string {
  if (performer.completion_rate < 50) {
    return "Focus on completing more tests";
  }
  if (performer.consistency_score < 30) {
    return "Work on consistency in performance";
  }
  if (performer.total_tests_taken < 3) {
    return "Encourage more test participation";
  }
  if (performer.improvement_potential >= 80) {
    return "Immediate tutoring support needed";
  }
  if (performer.improvement_potential >= 60) {
    return "Additional practice sessions recommended";
  }
  return "Continue current learning path";
}

// Utility function to calculate target score
function calculateTargetScore(performer: ChallengingPerformerDataPoint): number {
  const currentScore = performer.average_raw_score;
  const improvementFactor = Math.min(performer.improvement_potential / 100, 0.5); // Max 50% improvement
  return Math.round((currentScore * (1 + improvementFactor)) * 100) / 100;
}

// Utility function to estimate improvement time
function estimateImprovementTime(performer: ChallengingPerformerDataPoint): string {
  if (performer.improvement_potential >= 80) return "2-4 weeks";
  if (performer.improvement_potential >= 60) return "1-2 months";
  if (performer.improvement_potential >= 40) return "2-3 months";
  if (performer.improvement_potential >= 20) return "3-6 months";
  return "6+ months";
}

// Helper function to format challenging performers data for charts
export function formatChallengingPerformersForChart(
  data: ChallengingPerformersResponse, 
  chartType: "improvement" | "priority" | "scatter" = "improvement"
) {
  const performers = data.challenging_performers.slice(0, 10); // Top 10 for charts

  switch (chartType) {
    case "improvement":
      return performers.map(performer => ({
        name: performer.name.split(' ')[0], // First name only
        potential: performer.improvement_potential,
        current_score: performer.average_raw_score,
        completion: performer.completion_rate,
      }));
    
    case "priority":
      return performers
        .sort((a, b) => b.improvement_potential - a.improvement_potential)
        .map((performer, index) => ({
          priority: index + 1,
          name: performer.name.split(' ')[0],
          potential: performer.improvement_potential,
          urgency: getUrgencyLevel(performer.improvement_potential),
        }));
    
    case "scatter":
      return performers.map(performer => ({
        x: performer.completion_rate,
        y: performer.average_raw_score,
        size: performer.improvement_potential,
        name: performer.name,
        color: getImprovementColor(performer.improvement_potential),
      }));
    
    default:
      return performers;
  }
}

// Hook for challenging performers intervention tracking
export function useChallengingPerformersInterventions(userIds: string[]) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "challenging-performers-interventions", userIds],
    queryFn: async () => {
      // This would be a separate API endpoint for intervention tracking
      const response = await apiClient.post<GetChallengingPerformersApiResponse>(
        "/dashboard/admin/challenging-performers/interventions",
        { user_ids: userIds }
      );

      if (!response.success) {
        throw new Error("Failed to fetch intervention data");
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin" && userIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}