import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";
import { env } from "~/lib/env-config";

// ==================== TYPES ====================

export interface IndividualReportQuery {
  format?: "json" | "pdf" | "html";
  include_charts?: boolean;
  include_detailed_analysis?: boolean;
  include_recommendations?: boolean;
  include_comparison_data?: boolean;
  session_filter?: string;
  date_from?: string;
  date_to?: string;
  language?: "id" | "en";
}

export interface SessionSummaryReportQuery {
  format?: "json" | "pdf" | "html";
  include_charts?: boolean;
  include_participant_breakdown?: boolean;
  include_test_analysis?: boolean;
  include_trends?: boolean;
  language?: "id" | "en";
}

export interface ComparativeReportQuery {
  format?: "json" | "pdf" | "html";
  comparison_metric?:
    | "raw_score"
    | "scaled_score"
    | "percentile"
    | "trait_scores"
    | "completion_rate"
    | "time_efficiency";
  include_charts?: boolean;
  include_rankings?: boolean;
  include_distribution_analysis?: boolean;
  include_cluster_analysis?: boolean;
  top_performers_count?: number;
  language?: "id" | "en";
}

export interface BatchReportQuery {
  format?: "excel" | "csv" | "json";
  include_personal_data?: boolean;
  include_detailed_scores?: boolean;
  include_trait_breakdown?: boolean;
  include_recommendations?: boolean;
  include_raw_answers?: boolean;
  sort_by?: "name" | "score" | "completion_rate" | "registration_order";
  sort_order?: "asc" | "desc";
  language?: "id" | "en";
}

// Individual Report Data Types
export interface IndividualReportData {
  participant: {
    id: string;
    name: string;
    email: string;
    nik: string;
    gender?: string;
    birth_date?: string;
    education?: string;
    phone?: string;
    address?: string;
    profile_picture_url?: string;
  };
  assessment_overview: {
    total_tests_taken: number;
    total_tests_completed: number;
    overall_completion_rate: number;
    total_time_spent_minutes: number;
    assessment_period: {
      start_date: string;
      end_date: string;
    };
    sessions_participated: Array<{
      session_id: string;
      session_name: string;
      target_position?: string;
      participation_date: string;
    }>;
  };
  test_performances: Array<{
    test_id: string;
    test_name: string;
    test_category: string;
    module_type: string;
    attempt_id: string;
    raw_score?: number;
    scaled_score?: number;
    percentile?: number;
    grade?: string;
    completion_rate: number;
    time_spent_minutes: number;
    time_efficiency: number;
    trait_scores: Array<{
      trait_name: string;
      trait_category: string;
      raw_score: number;
      scaled_score: number;
      percentile?: number;
      interpretation: string;
      description: string;
      strength_level: "very_low" | "low" | "average" | "high" | "very_high";
    }>;
    strengths: string[];
    areas_for_development: string[];
    status: string;
    completed_at?: string;
  }>;
  psychological_profile: {
    dominant_traits: string[];
    personality_type?: string;
    cognitive_style?: string;
    behavioral_tendencies: string[];
    aptitude_areas: string[];
    interest_categories: string[];
    overall_assessment: string;
    reliability_index: number;
  };
  overall_assessment: {
    composite_score?: number;
    overall_percentile?: number;
    overall_grade?: string;
    competency_match: number;
    readiness_level: "not_ready" | "developing" | "ready" | "exceeds";
  };
  recommendations: Array<{
    category: "position_fit" | "development" | "training" | "career_path";
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    action_items: string[];
    supporting_evidence: string[];
  }>;
  comparison_data?: {
    peer_group_size: number;
    percentile_in_group: number;
    ranking_in_group: number;
    above_average_traits: string[];
    below_average_traits: string[];
  };
  charts?: Array<{
    type: "bar" | "line" | "pie" | "radar" | "scatter" | "box_plot";
    title: string;
    data: any;
    description: string;
  }>;
  report_metadata: {
    generated_at: string;
    generated_by: string;
    report_version: string;
    data_sources: string[];
    reliability_notes: string[];
  };
}

// Session Summary Report Data Types
export interface SessionSummaryReportData {
  session_info: {
    id: string;
    session_name: string;
    session_code: string;
    target_position?: string;
    start_time: string;
    end_time: string;
    location?: string;
    description?: string;
    proctor_name?: string;
  };
  participation_stats: {
    total_invited: number;
    total_registered: number;
    total_started: number;
    total_completed: number;
    no_show_count: number;
    dropout_count: number;
    completion_rate: number;
    average_time_spent_minutes: number;
  };
  test_modules: Array<{
    test_id: string;
    test_name: string;
    test_category: string;
    module_type: string;
    sequence: number;
    participants_started: number;
    participants_completed: number;
    completion_rate: number;
    average_score: number;
    average_time_minutes: number;
    difficulty_level:
      | "very_easy"
      | "easy"
      | "moderate"
      | "difficult"
      | "very_difficult";
    discrimination_index: number;
  }>;
  performance_distribution: {
    score_ranges: Record<string, number>;
    grade_distribution: Record<string, number>;
    percentile_ranges: Record<string, number>;
    top_performers: Array<{
      user_id: string;
      name: string;
      overall_score: number;
      percentile: number;
    }>;
  };
  assessment_quality: {
    overall_reliability: number;
    completion_consistency: number;
    time_efficiency_average: number;
    data_quality_score: number;
    anomaly_count: number;
  };
  key_insights: Array<{
    type: "strength" | "concern" | "trend" | "recommendation";
    title: string;
    description: string;
    supporting_data: Record<string, any>;
  }>;
  charts?: Array<{
    type: "bar" | "line" | "pie" | "radar" | "scatter" | "box_plot";
    title: string;
    data: any;
    description: string;
  }>;
}

// Response Types
export interface IndividualReportResponse {
  success: boolean;
  message: string;
  data: IndividualReportData;
  timestamp: string;
}

export interface SessionSummaryReportResponse {
  success: boolean;
  message: string;
  data: SessionSummaryReportData;
  timestamp: string;
}

export interface ComparativeReportResponse {
  success: boolean;
  message: string;
  data: any; // Will be typed based on backend implementation
  timestamp: string;
}

export interface BatchReportResponse {
  success: boolean;
  message: string;
  data: any; // Will be typed based on backend implementation
  timestamp: string;
}

export interface ReportConfigResponse {
  success: boolean;
  message: string;
  data: {
    report_types: Array<{ value: string; label: string }>;
    report_formats: Array<{ value: string; label: string }>;
    strength_levels: Array<{ value: string; label: string }>;
    recommendation_categories: Array<{ value: string; label: string }>;
    limits: {
      max_participants_batch: number;
      max_chart_data_points: number;
      max_file_size_mb: number;
      report_expiry_hours: number;
    };
    supported_languages: Array<{ value: string; label: string }>;
    chart_types: Array<{ value: string; label: string }>;
    comparison_metrics: Array<{ value: string; label: string }>;
  };
  timestamp: string;
}

export interface ReportStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_test_results: number;
    total_sessions: number;
    total_participants: number;
    recent_results_30_days: number;
    recent_sessions_30_days: number;
    report_generation_capacity: {
      individual_reports_per_hour: number;
      batch_reports_per_hour: number;
      max_concurrent_reports: number;
    };
    data_availability: {
      has_test_results: boolean;
      has_sessions: boolean;
      has_participants: boolean;
    };
  };
  timestamp: string;
}

export interface ReportHealthResponse {
  success: boolean;
  data: {
    status: "healthy" | "degraded" | "unhealthy";
    database: {
      status: "connected" | "disconnected";
      response_time_ms: number;
    };
    services: {
      individual_reports: "active" | "inactive";
      session_reports: "active" | "inactive";
      comparative_reports: "active" | "inactive";
      batch_reports: "active" | "inactive";
    };
    data_availability: {
      test_results_available: boolean;
    };
    report_limits: {
      max_participants_batch: number;
      max_chart_data_points: number;
      max_file_size_mb: number;
    };
    timestamp: string;
  };
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}

// ==================== QUERY KEYS ====================

export const reportQueryKeys = {
  all: ["reports"] as const,

  // Individual reports
  individual: () => [...reportQueryKeys.all, "individual"] as const,
  individualById: (userId: string, params?: IndividualReportQuery) =>
    [...reportQueryKeys.individual(), userId, params] as const,

  // Session summary reports
  sessionSummary: () => [...reportQueryKeys.all, "session-summary"] as const,
  sessionSummaryById: (sessionId: string, params?: SessionSummaryReportQuery) =>
    [...reportQueryKeys.sessionSummary(), sessionId, params] as const,

  // Comparative reports
  comparative: () => [...reportQueryKeys.all, "comparative"] as const,
  comparativeById: (sessionId: string, params?: ComparativeReportQuery) =>
    [...reportQueryKeys.comparative(), sessionId, params] as const,

  // Batch reports
  batch: () => [...reportQueryKeys.all, "batch"] as const,
  batchById: (sessionId: string, params?: BatchReportQuery) =>
    [...reportQueryKeys.batch(), sessionId, params] as const,

  // Config and stats
  config: () => [...reportQueryKeys.all, "config"] as const,
  stats: () => [...reportQueryKeys.all, "stats"] as const,
  health: () => [...reportQueryKeys.all, "health"] as const,
} as const;

// ==================== HOOKS ====================

export function useReports() {
  const queryClient = useQueryClient();

  // Individual Report
  const useGetIndividualReport = (
    userId: string,
    params?: IndividualReportQuery
  ) => {
    const queryParams = new URLSearchParams();

    if (params?.format) queryParams.set("format", params.format);
    if (params?.include_charts !== undefined)
      queryParams.set("include_charts", params.include_charts.toString());
    if (params?.include_detailed_analysis !== undefined)
      queryParams.set(
        "include_detailed_analysis",
        params.include_detailed_analysis.toString()
      );
    if (params?.include_recommendations !== undefined)
      queryParams.set(
        "include_recommendations",
        params.include_recommendations.toString()
      );
    if (params?.include_comparison_data !== undefined)
      queryParams.set(
        "include_comparison_data",
        params.include_comparison_data.toString()
      );
    if (params?.session_filter)
      queryParams.set("session_filter", params.session_filter);
    if (params?.date_from) queryParams.set("date_from", params.date_from);
    if (params?.date_to) queryParams.set("date_to", params.date_to);
    if (params?.language) queryParams.set("language", params.language);

    return useQuery({
      queryKey: reportQueryKeys.individualById(userId, params),
      queryFn: async () => {
        const response = await apiClient.get<IndividualReportResponse>(
          `/reports/individual/${userId}?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch individual report"
          );
        }
        return response;
      },
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Session Summary Report
  const useGetSessionSummaryReport = (
    sessionId: string,
    params?: SessionSummaryReportQuery
  ) => {
    const queryParams = new URLSearchParams();

    if (params?.format) queryParams.set("format", params.format);
    if (params?.include_charts !== undefined)
      queryParams.set("include_charts", params.include_charts.toString());
    if (params?.include_participant_breakdown !== undefined)
      queryParams.set(
        "include_participant_breakdown",
        params.include_participant_breakdown.toString()
      );
    if (params?.include_test_analysis !== undefined)
      queryParams.set(
        "include_test_analysis",
        params.include_test_analysis.toString()
      );
    if (params?.include_trends !== undefined)
      queryParams.set("include_trends", params.include_trends.toString());
    if (params?.language) queryParams.set("language", params.language);

    return useQuery({
      queryKey: reportQueryKeys.sessionSummaryById(sessionId, params),
      queryFn: async () => {
        const response = await apiClient.get<SessionSummaryReportResponse>(
          `/reports/session/${sessionId}?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch session summary report"
          );
        }
        return response;
      },
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Comparative Report
  const useGetComparativeReport = (
    sessionId: string,
    params?: ComparativeReportQuery
  ) => {
    const queryParams = new URLSearchParams();

    if (params?.format) queryParams.set("format", params.format);
    if (params?.comparison_metric)
      queryParams.set("comparison_metric", params.comparison_metric);
    if (params?.include_charts !== undefined)
      queryParams.set("include_charts", params.include_charts.toString());
    if (params?.include_rankings !== undefined)
      queryParams.set("include_rankings", params.include_rankings.toString());
    if (params?.include_distribution_analysis !== undefined)
      queryParams.set(
        "include_distribution_analysis",
        params.include_distribution_analysis.toString()
      );
    if (params?.include_cluster_analysis !== undefined)
      queryParams.set(
        "include_cluster_analysis",
        params.include_cluster_analysis.toString()
      );
    if (params?.top_performers_count)
      queryParams.set(
        "top_performers_count",
        params.top_performers_count.toString()
      );
    if (params?.language) queryParams.set("language", params.language);

    return useQuery({
      queryKey: reportQueryKeys.comparativeById(sessionId, params),
      queryFn: async () => {
        const response = await apiClient.get<ComparativeReportResponse>(
          `/reports/comparative/${sessionId}?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch comparative report"
          );
        }
        return response;
      },
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Batch Report
  const useGetBatchReport = (sessionId: string, params?: BatchReportQuery) => {
    const queryParams = new URLSearchParams();

    if (params?.format) queryParams.set("format", params.format);
    if (params?.include_personal_data !== undefined)
      queryParams.set(
        "include_personal_data",
        params.include_personal_data.toString()
      );
    if (params?.include_detailed_scores !== undefined)
      queryParams.set(
        "include_detailed_scores",
        params.include_detailed_scores.toString()
      );
    if (params?.include_trait_breakdown !== undefined)
      queryParams.set(
        "include_trait_breakdown",
        params.include_trait_breakdown.toString()
      );
    if (params?.include_recommendations !== undefined)
      queryParams.set(
        "include_recommendations",
        params.include_recommendations.toString()
      );
    if (params?.include_raw_answers !== undefined)
      queryParams.set(
        "include_raw_answers",
        params.include_raw_answers.toString()
      );
    if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
    if (params?.language) queryParams.set("language", params.language);

    return useQuery({
      queryKey: reportQueryKeys.batchById(sessionId, params),
      queryFn: async () => {
        const response = await apiClient.get<BatchReportResponse>(
          `/reports/batch/${sessionId}?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch batch report");
        }
        return response;
      },
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Report Configuration
  const useGetReportConfig = () => {
    return useQuery({
      queryKey: reportQueryKeys.config(),
      queryFn: async () => {
        const response =
          await apiClient.get<ReportConfigResponse>("/reports/config");
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch report config");
        }
        return response;
      },
      staleTime: 30 * 60 * 1000, // 30 minutes - config rarely changes
    });
  };

  // Report Statistics
  const useGetReportStats = () => {
    return useQuery({
      queryKey: reportQueryKeys.stats(),
      queryFn: async () => {
        const response = await apiClient.get<ReportStatsResponse>(
          "/reports/stats/summary"
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch report stats");
        }
        return response;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Report Health Check
  const useGetReportHealth = () => {
    return useQuery({
      queryKey: reportQueryKeys.health(),
      queryFn: async () => {
        const response =
          await apiClient.get<ReportHealthResponse>("/reports/health");
        if (!response.success) {
          throw new Error("Failed to fetch report health");
        }
        return response;
      },
      staleTime: 1 * 60 * 1000, // 1 minute
      refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    });
  };

  // Download Report (trigger download)
  const useDownloadReport = () => {
    return useMutation({
      mutationFn: async ({
        reportType,
        id,
        params,
        filename,
      }: {
        reportType: "individual" | "session" | "comparative" | "batch";
        id: string;
        params?: any;
        filename?: string;
      }) => {
        let url = "";
        const queryParams = new URLSearchParams();

        // Build URL based on report type
        switch (reportType) {
          case "individual":
            url = `/reports/individual/${id}`;
            break;
          case "session":
            url = `/reports/session/${id}`;
            break;
          case "comparative":
            url = `/reports/comparative/${id}`;
            break;
          case "batch":
            url = `/reports/batch/${id}`;
            break;
        }

        // Add parameters
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.set(key, String(value));
            }
          });
        }

        // Force format to appropriate download format
        if (reportType === "batch") {
          queryParams.set("format", "excel");
        } else {
          queryParams.set("format", "pdf");
        }

        const fullUrl = `${url}?${queryParams.toString()}`;

        // Make request and trigger download
        const response = await fetch(
          `${env.VITE_API_BASE_URL || ""}${fullUrl}`,
          {
            headers: {
              Authorization: `Bearer ${apiClient.getTokens()?.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to download report");
        }

        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download =
          filename ||
          `report-${reportType}-${id}.${reportType === "batch" ? "xlsx" : "pdf"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true };
      },
      onSuccess: () => {
        toast.success("Report berhasil diunduh");
      },
      onError: (error: Error) => {
        toast.error("Gagal mengunduh report", {
          description: error.message,
        });
      },
    });
  };

  // Regenerate Report (force refresh)
  const useRegenerateReport = () => {
    return useMutation({
      mutationFn: async ({
        reportType,
        id,
      }: {
        reportType: "individual" | "session" | "comparative" | "batch";
        id: string;
      }) => {
        // Invalidate relevant queries to force refetch
        switch (reportType) {
          case "individual":
            queryClient.invalidateQueries({
              queryKey: reportQueryKeys.individual(),
            });
            break;
          case "session":
            queryClient.invalidateQueries({
              queryKey: reportQueryKeys.sessionSummary(),
            });
            break;
          case "comparative":
            queryClient.invalidateQueries({
              queryKey: reportQueryKeys.comparative(),
            });
            break;
          case "batch":
            queryClient.invalidateQueries({
              queryKey: reportQueryKeys.batch(),
            });
            break;
        }

        return { success: true };
      },
      onSuccess: () => {
        toast.success("Report berhasil di-generate ulang");
      },
      onError: (error: Error) => {
        toast.error("Gagal men-generate ulang report", {
          description: error.message,
        });
      },
    });
  };

  return {
    // Query hooks
    useGetIndividualReport,
    useGetSessionSummaryReport,
    useGetComparativeReport,
    useGetBatchReport,
    useGetReportConfig,
    useGetReportStats,
    useGetReportHealth,

    // Mutation hooks
    useDownloadReport,
    useRegenerateReport,

    // Query keys (for manual cache invalidation)
    queryKeys: reportQueryKeys,
  };
}
