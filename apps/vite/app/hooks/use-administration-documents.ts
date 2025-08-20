import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";

// ==================== TYPES ====================

// Administration List Request Types
export interface GetAdministrationListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "name" | "phone" | "document_count";
  sort_order?: "asc" | "desc";
  status?: "complete" | "partial" | "pending";
}

// Administration List Types
export interface AdministrationListItem {
  id: string;
  name: string;
  phone: string | null;
  document_count: number;
  total_document_types: number;
}

export interface AdministrationListMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface GetAdministrationListResponse {
  success: boolean;
  message: string;
  data: AdministrationListItem[];
  meta: AdministrationListMeta;
  timestamp: string;
}

// Administration Detail Types
export interface AdministrationUser {
  id: string;
  name: string;
  phone: string | null;
  role: string;
}

export interface DocumentDetail {
  document_type_id: string;
  document_type_key: string;
  document_type_name: string;
  document_type_weight: string;
  document_id: string | null;
  score: string | null;
  file_url: string | null;
  uploaded_at: string | null;
  is_uploaded: boolean;
}

export interface AdministrationSummary {
  total_document_types: number;
  uploaded_count: number;
  pending_count: number;
}

export interface AdministrationDetailData {
  user: AdministrationUser;
  documents: DocumentDetail[];
  summary: AdministrationSummary;
}

export interface GetAdministrationDetailResponse {
  success: boolean;
  message: string;
  data: AdministrationDetailData;
  timestamp: string;
}

// ==================== QUERY KEYS ====================

const administrationQueryKeys = {
  all: ["administrations"] as const,
  lists: () => [...administrationQueryKeys.all, "list"] as const,
  list: (filters?: any) =>
    [...administrationQueryKeys.lists(), filters] as const,
  details: () => [...administrationQueryKeys.all, "detail"] as const,
  detail: (userId: string) =>
    [...administrationQueryKeys.details(), userId] as const,
} as const;

// ==================== HOOKS ====================

export function useAdministrationDocuments() {
  // Get Administration List - Shows all participants with document counts
  const useGetAdministrationList = (params?: GetAdministrationListRequest) => {
    return useQuery({
      queryKey: administrationQueryKeys.list(params),
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
        if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
        if (params?.status) queryParams.set("status", params.status);

        const response = await apiClient.get<GetAdministrationListResponse>(
          `/administrations?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch administration list"
          );
        }

        return response;
      },
      enabled: true,
    });
  };

  // Get Administration Detail - Shows document types and upload status for specific user
  const useGetAdministrationDetail = (userId: string) => {
    return useQuery({
      queryKey: administrationQueryKeys.detail(userId),
      queryFn: async () => {
        const response = await apiClient.get<GetAdministrationDetailResponse>(
          `/administrations/${userId}`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch administration detail"
          );
        }

        return response;
      },
      enabled: !!userId,
    });
  };

  // Helper function to calculate completion percentage
  const calculateCompletionPercentage = (
    summary: AdministrationSummary
  ): number => {
    if (summary.total_document_types === 0) return 0;
    return Math.round(
      (summary.uploaded_count / summary.total_document_types) * 100
    );
  };

  // Helper function to get status badge variant
  const getStatusVariant = (
    percentage: number
  ): "default" | "secondary" | "destructive" => {
    if (percentage === 100) return "default"; // Complete - green
    if (percentage >= 50) return "secondary"; // Partial - blue
    return "destructive"; // Low/None - red
  };

  // Helper function to get upload status text
  const getUploadStatusText = (summary: AdministrationSummary): string => {
    const percentage = calculateCompletionPercentage(summary);

    if (percentage === 100) return "Lengkap";
    if (percentage >= 50) return "Sebagian";
    if (percentage > 0) return "Kurang";
    return "Belum Ada";
  };

  // Helper function to get status filter options
  const getStatusFilterOptions = () => [
    { value: "all", label: "Semua Status" },
    { value: "complete", label: "Lengkap" },
    { value: "partial", label: "Sebagian" },
    { value: "pending", label: "Belum Ada" },
  ];

  // Helper function to get sort options
  const getSortOptions = () => [
    { value: "name", label: "Nama" },
    { value: "document_count", label: "Jumlah Dokumen" },
    { value: "phone", label: "Nomor Telepon" },
  ];

  // Helper function to determine status from item
  const getItemStatus = (item: AdministrationListItem): "complete" | "partial" | "pending" => {
    const percentage = item.total_document_types > 0 
      ? (item.document_count / item.total_document_types) * 100 
      : 0;
    
    if (percentage === 100) return "complete";
    if (percentage > 0) return "partial";
    return "pending";
  };

  return {
    // Queries
    useGetAdministrationList,
    useGetAdministrationDetail,

    // Helpers
    calculateCompletionPercentage,
    getStatusVariant,
    getUploadStatusText,
    getStatusFilterOptions,
    getSortOptions,
    getItemStatus,

    // Query Keys (for manual invalidation if needed)
    queryKeys: administrationQueryKeys,
  };
}
