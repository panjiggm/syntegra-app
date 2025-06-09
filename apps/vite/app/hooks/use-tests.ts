import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Types for Tests API
export interface TestData {
  id: string;
  name: string;
  description: string;
  module_type:
    | "intelligence"
    | "personality"
    | "cognitive"
    | "projective"
    | "interest"
    | "aptitude";
  category: string;
  time_limit: number;
  total_questions: number;
  icon?: string;
  card_color?: string;
  status: "active" | "inactive" | "draft" | "archived";
  display_order: number;
  instructions?: string;
  passing_score?: number;
  difficulty_level?: "easy" | "medium" | "hard" | "expert";
  tags?: string[];
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  question_count?: number;
  attempt_count?: number;
  average_score?: number;
  completion_rate?: number;
}

export interface GetTestsRequest {
  page?: number;
  limit?: number;
  search?: string;
  module_type?: string;
  category?: string;
  status?: string;
  time_limit_min?: number;
  time_limit_max?: number;
  total_questions_min?: number;
  total_questions_max?: number;
  difficulty_level?: string;
  sort_by?:
    | "name"
    | "created_at"
    | "updated_at"
    | "display_order"
    | "total_questions"
    | "time_limit";
  sort_order?: "asc" | "desc";
  created_from?: string;
  created_to?: string;
  tags?: string[];
  include_stats?: boolean;
}

export interface GetTestsResponse {
  success: boolean;
  message: string;
  data: TestData[];
  meta: {
    current_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    per_page: number;
    total: number;
    total_pages: number;
  };
  filters: {
    module_types: string[];
    categories: string[];
    statuses: string[];
    time_limit_range: {
      min: number;
      max: number;
    };
    questions_count_range: {
      min: number;
      max: number;
    };
  };
  timestamp: string;
}

export interface TestStatsData {
  total_tests: number;
  active_tests: number;
  inactive_tests: number;
  archived_tests: number;
  by_module_type: {
    cognitive: number;
    projective: number;
    intelligence: number;
    personality: number;
    aptitude: number;
  };
  by_category: {
    pauli: number;
    eq: number;
    disc: number;
    htp: number;
    iq: number;
    dap: number;
    big_five: number;
    wais: number;
    mbti: number;
    raven: number;
    wartegg: number;
    kraepelin: number;
    epps: number;
  };
  avg_time_limit: number;
  avg_questions_count: number;
}

export interface GetTestStatsResponse {
  success: boolean;
  message: string;
  data: TestStatsData;
  timestamp: string;
}

export interface GetTestFilterOptionsResponse {
  success: boolean;
  message: string;
  data: {
    module_types: Array<{ value: string; label: string; count: number }>;
    categories: Array<{ value: string; label: string; count: number }>;
    statuses: Array<{ value: string; label: string; count: number }>;
    difficulty_levels: Array<{ value: string; label: string; count: number }>;
    tags: Array<{ value: string; label: string; count: number }>;
    time_limit_range: { min: number; max: number };
    questions_range: { min: number; max: number };
  };
  timestamp: string;
}

export function useTests() {
  const queryClient = useQueryClient();

  // Get all tests with comprehensive filtering and caching
  const useGetTests = (params?: GetTestsRequest) => {
    const queryParams = new URLSearchParams();

    // Build query parameters
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.search) queryParams.set("search", params.search.trim());
    if (params?.module_type) queryParams.set("module_type", params.module_type);
    if (params?.category) queryParams.set("category", params.category);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.difficulty_level)
      queryParams.set("difficulty_level", params.difficulty_level);
    if (params?.time_limit_min)
      queryParams.set("time_limit_min", params.time_limit_min.toString());
    if (params?.time_limit_max)
      queryParams.set("time_limit_max", params.time_limit_max.toString());
    if (params?.total_questions_min)
      queryParams.set(
        "total_questions_min",
        params.total_questions_min.toString()
      );
    if (params?.total_questions_max)
      queryParams.set(
        "total_questions_max",
        params.total_questions_max.toString()
      );
    if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
    if (params?.created_from)
      queryParams.set("created_from", params.created_from);
    if (params?.created_to) queryParams.set("created_to", params.created_to);
    if (params?.include_stats)
      queryParams.set("include_stats", params.include_stats.toString());
    if (params?.tags && params.tags.length > 0) {
      params.tags.forEach((tag) => queryParams.append("tags", tag));
    }

    return useQuery({
      queryKey: queryKeys.tests.list(params),
      queryFn: async () => {
        const response = await apiClient.get<GetTestsResponse>(
          `/tests?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch tests");
        }
        return response;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
      refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });
  };

  // Get test statistics with real-time updates
  const useGetTestStats = () => {
    return useQuery({
      queryKey: queryKeys.tests.stats(),
      queryFn: async () => {
        const response = await apiClient.get<GetTestStatsResponse>(
          "/tests/stats/summary"
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch test statistics"
          );
        }
        return response.data;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 3 * 60 * 1000, // Auto refetch every 3 minutes
      retry: 3,
    });
  };

  // Get test filter options for dynamic filters
  const useGetTestFilterOptions = () => {
    return useQuery({
      queryKey: queryKeys.tests.filterOptions(),
      queryFn: async () => {
        const response = await apiClient.get<GetTestFilterOptionsResponse>(
          "/tests/filters/options"
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch filter options");
        }
        return response.data;
      },
      staleTime: 15 * 60 * 1000, // 15 minutes (filter options don't change often)
      retry: 2,
    });
  };

  // Delete test with confirmation
  const useDeleteTest = () => {
    return useMutation({
      mutationFn: async (testId: string) => {
        const response = await apiClient.delete(`/tests/${testId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to delete test");
        }
        return response.data;
      },
      onMutate: async (testId) => {
        // Get test name for toast
        const test = queryClient.getQueryData(
          queryKeys.tests.detail(testId)
        ) as TestData;
        return { testName: test?.name || "Test" };
      },
      onSuccess: (_, testId, context) => {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKeys.tests.detail(testId) });

        // Invalidate lists and stats
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.stats() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.tests.filterOptions(),
        });

        toast.success("Tes berhasil dihapus!", {
          description: `${context?.testName} telah dihapus dari sistem`,
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal menghapus tes", {
          description: error.message,
          duration: 5000,
        });
      },
    });
  };

  // Duplicate test
  const useDuplicateTest = () => {
    return useMutation({
      mutationFn: async (testId: string) => {
        const response = await apiClient.post(`/tests/${testId}/duplicate`);
        if (!response.success) {
          throw new Error(response.message || "Failed to duplicate test");
        }
        return response.data;
      },
      onSuccess: (duplicatedTest) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.stats() });

        toast.success("Tes berhasil diduplikasi!", {
          description: `${duplicatedTest.name} telah dibuat`,
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal menduplikasi tes", {
          description: error.message,
          duration: 5000,
        });
      },
    });
  };

  return {
    // Queries
    useGetTests,
    useGetTestStats,
    useGetTestFilterOptions,

    // Mutations
    useDeleteTest,
    useDuplicateTest,
  };
}
