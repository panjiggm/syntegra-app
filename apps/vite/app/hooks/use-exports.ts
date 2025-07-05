import { useMutation } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";

// ==================== TYPES ====================

export type ExportFormat = "pdf" | "excel" | "csv";
export type ExportReportType = "sessions" | "individuals" | "combined";
export type ExportStatus = "all" | "completed" | "in_progress" | "not_started";

export interface ExportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  datePeriod?: string;
  status?: ExportStatus;
  reportType: ExportReportType;
  format: ExportFormat;
  includeCharts: boolean;
  includeDetailedAnalysis: boolean;
  includeRecommendations: boolean;
}

export interface ExportRequest {
  // Date filters
  date_from?: string;
  date_to?: string;
  period?: string;
  
  // Status filter
  status?: ExportStatus;
  
  // Report options
  report_type: ExportReportType;
  format: ExportFormat;
  include_charts?: boolean;
  include_detailed_analysis?: boolean;
  include_recommendations?: boolean;
}

// Session Export Data Types
export interface SessionExportData {
  session: {
    session_name: string;
    session_code: string;
    start_time: string;
    end_time: string;
    target_position: string;
    total_participants: number;
  };
  participants: ParticipantExportData[];
  statistics: ExportStatistics;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    period?: string;
  };
}

export interface ParticipantExportData {
  name: string;
  email: string;
  nik: string;
  position?: string;
  overall_score: number;
  completion_rate: number;
  status: "completed" | "in_progress" | "not_started";
  last_test_date: string | null;
}

export interface ExportStatistics {
  total_participants: number;
  completed_tests: number;
  average_score: number;
  completion_rate: number;
}

// Bulk Export Data Types
export interface BulkSessionsExportData {
  sessions: BulkSessionData[];
  statistics: BulkExportStatistics;
  filters: ExportFilters;
  generated_at: string;
  total_records: number;
}

export interface BulkSessionData {
  session_name: string;
  session_code: string;
  start_time: string;
  end_time: string;
  target_position: string;
  participants: number;
  completed_participants: number;
  average_score: number;
  completion_rate: number;
  status: string;
}

export interface BulkIndividualsExportData {
  individuals: BulkIndividualData[];
  statistics: BulkExportStatistics;
  filters: ExportFilters;
  generated_at: string;
  total_records: number;
}

export interface BulkIndividualData {
  name: string;
  email: string;
  nik: string;
  position?: string;
  total_sessions: number;
  completed_sessions: number;
  overall_score: number;
  completion_rate: number;
  last_activity: string | null;
  status: "active" | "inactive";
}

export interface BulkCombinedExportData {
  sessions: BulkSessionData[];
  individuals: BulkIndividualData[];
  statistics: BulkExportStatistics;
  filters: ExportFilters;
  generated_at: string;
  total_records: number;
}

export interface BulkExportStatistics {
  total_sessions?: number;
  total_participants?: number;
  average_score: number;
  completion_rate: number;
  active_sessions?: number;
  completed_sessions?: number;
  active_participants?: number;
  period_summary?: {
    start_date: string;
    end_date: string;
    duration_days: number;
  };
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  period?: string;
  report_type: ExportReportType;
  format: ExportFormat;
}

// API Response Types
export interface ExportResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface SessionExportResponse extends ExportResponse<SessionExportData> {}

export interface BulkSessionsExportResponse extends ExportResponse<BulkSessionsExportData> {}

export interface BulkIndividualsExportResponse extends ExportResponse<BulkIndividualsExportData> {}

export interface BulkCombinedExportResponse extends ExportResponse<BulkCombinedExportData> {}

export interface ExportErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}

// ==================== HOOKS ====================

export function useExports() {
  // Export single session data
  const useExportSessionData = () => {
    return useMutation({
      mutationFn: async ({ sessionId, params }: { sessionId: string; params?: ExportRequest }) => {
        const queryParams = new URLSearchParams();
        
        if (params?.date_from) queryParams.set("date_from", params.date_from);
        if (params?.date_to) queryParams.set("date_to", params.date_to);
        if (params?.status) queryParams.set("status", params.status);
        if (params?.period) queryParams.set("period", params.period);

        const response = await apiClient.get<SessionExportResponse>(
          `/reports/export-data/${sessionId}?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to export session data");
        }

        return response.data;
      },
      onError: (error: Error) => {
        console.error("Export session data error:", error);
        toast.error("Gagal mengexport data sesi");
      },
    });
  };

  // Export bulk sessions data
  const useExportBulkSessions = () => {
    return useMutation({
      mutationFn: async (params: ExportRequest) => {
        const queryParams = new URLSearchParams();
        
        if (params.date_from) queryParams.set("date_from", params.date_from);
        if (params.date_to) queryParams.set("date_to", params.date_to);
        if (params.status) queryParams.set("status", params.status);
        if (params.period) queryParams.set("period", params.period);
        if (params.format) queryParams.set("format", params.format);
        if (params.include_charts !== undefined) {
          queryParams.set("include_charts", params.include_charts.toString());
        }
        if (params.include_detailed_analysis !== undefined) {
          queryParams.set("include_detailed_analysis", params.include_detailed_analysis.toString());
        }
        if (params.include_recommendations !== undefined) {
          queryParams.set("include_recommendations", params.include_recommendations.toString());
        }

        const response = await apiClient.get<BulkSessionsExportResponse>(
          `/reports/export/bulk/sessions?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to export bulk sessions data");
        }

        return response.data;
      },
      onError: (error: Error) => {
        console.error("Export bulk sessions error:", error);
        
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("no data found")) {
          toast.error("Tidak ada data sesi yang ditemukan");
        } else if (errorMessage.includes("invalid date")) {
          toast.error("Format tanggal tidak valid");
        } else {
          toast.error("Gagal mengexport data sesi bulk");
        }
      },
    });
  };

  // Export bulk individuals data
  const useExportBulkIndividuals = () => {
    return useMutation({
      mutationFn: async (params: ExportRequest) => {
        const queryParams = new URLSearchParams();
        
        if (params.date_from) queryParams.set("date_from", params.date_from);
        if (params.date_to) queryParams.set("date_to", params.date_to);
        if (params.status) queryParams.set("status", params.status);
        if (params.period) queryParams.set("period", params.period);
        if (params.format) queryParams.set("format", params.format);
        if (params.include_charts !== undefined) {
          queryParams.set("include_charts", params.include_charts.toString());
        }
        if (params.include_detailed_analysis !== undefined) {
          queryParams.set("include_detailed_analysis", params.include_detailed_analysis.toString());
        }
        if (params.include_recommendations !== undefined) {
          queryParams.set("include_recommendations", params.include_recommendations.toString());
        }

        const response = await apiClient.get<BulkIndividualsExportResponse>(
          `/reports/export/bulk/individuals?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to export bulk individuals data");
        }

        return response.data;
      },
      onError: (error: Error) => {
        console.error("Export bulk individuals error:", error);
        
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("no data found")) {
          toast.error("Tidak ada data peserta yang ditemukan");
        } else if (errorMessage.includes("invalid date")) {
          toast.error("Format tanggal tidak valid");
        } else {
          toast.error("Gagal mengexport data peserta bulk");
        }
      },
    });
  };

  // Export bulk combined data
  const useExportBulkCombined = () => {
    return useMutation({
      mutationFn: async (params: ExportRequest) => {
        const queryParams = new URLSearchParams();
        
        if (params.date_from) queryParams.set("date_from", params.date_from);
        if (params.date_to) queryParams.set("date_to", params.date_to);
        if (params.status) queryParams.set("status", params.status);
        if (params.period) queryParams.set("period", params.period);
        if (params.format) queryParams.set("format", params.format);
        if (params.include_charts !== undefined) {
          queryParams.set("include_charts", params.include_charts.toString());
        }
        if (params.include_detailed_analysis !== undefined) {
          queryParams.set("include_detailed_analysis", params.include_detailed_analysis.toString());
        }
        if (params.include_recommendations !== undefined) {
          queryParams.set("include_recommendations", params.include_recommendations.toString());
        }

        const response = await apiClient.get<BulkCombinedExportResponse>(
          `/reports/export/bulk/combined?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to export bulk combined data");
        }

        return response.data;
      },
      onError: (error: Error) => {
        console.error("Export bulk combined error:", error);
        
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("no data found")) {
          toast.error("Tidak ada data yang ditemukan");
        } else if (errorMessage.includes("invalid date")) {
          toast.error("Format tanggal tidak valid");
        } else {
          toast.error("Gagal mengexport data gabungan bulk");
        }
      },
    });
  };

  return {
    useExportSessionData,
    useExportBulkSessions,
    useExportBulkIndividuals,
    useExportBulkCombined,
  };
}

// ==================== UTILITY FUNCTIONS ====================

// Convert filter object to export request
export function filterToExportRequest(filter: ExportFilter): ExportRequest {
  return {
    date_from: filter.dateFrom?.toISOString(),
    date_to: filter.dateTo?.toISOString(),
    period: filter.datePeriod,
    status: filter.status,
    report_type: filter.reportType,
    format: filter.format,
    include_charts: filter.includeCharts,
    include_detailed_analysis: filter.includeDetailedAnalysis,
    include_recommendations: filter.includeRecommendations,
  };
}

// Generate filename for exports
export function generateExportFilename(
  reportType: ExportReportType,
  format: ExportFormat,
  prefix: string = "bulk"
): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "_");
  return `${prefix}_${reportType}_report_${timestamp}.${format}`;
}

// Validate export filters
export function validateExportFilters(filter: ExportFilter): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check date range
  if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
    errors.push("Tanggal mulai tidak boleh lebih besar dari tanggal selesai");
  }

  // Check if custom date range is provided when period is custom
  if (filter.datePeriod === "custom" && (!filter.dateFrom || !filter.dateTo)) {
    errors.push("Tanggal mulai dan selesai harus diisi untuk periode kustom");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Format export statistics for display
export function formatExportStatistics(stats: BulkExportStatistics): Record<string, string> {
  return {
    "Total Sesi": stats.total_sessions?.toString() || "0",
    "Total Peserta": stats.total_participants?.toString() || "0",
    "Rata-rata Skor": stats.average_score.toFixed(1),
    "Tingkat Penyelesaian": `${stats.completion_rate.toFixed(1)}%`,
    "Sesi Aktif": stats.active_sessions?.toString() || "0",
    "Sesi Selesai": stats.completed_sessions?.toString() || "0",
  };
}