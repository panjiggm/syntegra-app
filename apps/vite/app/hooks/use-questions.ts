import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Define question types based on the backend schema
export interface QuestionData {
  id: string;
  test_id: string;
  question: string;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix";
  options?: {
    value: string;
    label: string;
    score?: number;
  }[];
  correct_answer?: string;
  sequence: number;
  time_limit?: number;
  image_url?: string;
  audio_url?: string;
  scoring_key?: Record<string, number>;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetQuestionsRequest {
  page?: number;
  limit?: number;
  search?: string;
  question_type?: string;
  is_required?: boolean;
  sort_by?:
    | "sequence"
    | "question"
    | "question_type"
    | "created_at"
    | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface GetQuestionsResponse {
  success: boolean;
  message: string;
  data: QuestionData[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  timestamp: string;
}

export interface GetQuestionByIdResponse {
  success: boolean;
  message: string;
  data: QuestionData;
  timestamp: string;
}

export interface CreateQuestionRequest {
  question: string;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix";
  options?: {
    value: string;
    label: string;
    score?: number;
  }[];
  correct_answer?: string;
  sequence?: number;
  time_limit?: number;
  image_url?: string;
  audio_url?: string;
  scoring_key?: Record<string, number>;
  is_required?: boolean;
}

export interface CreateQuestionResponse {
  success: boolean;
  message: string;
  data: QuestionData;
  timestamp: string;
}

export interface UpdateQuestionRequest {
  question?: string;
  question_type?:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix";
  options?: {
    value: string;
    label: string;
    score?: number;
  }[];
  correct_answer?: string;
  sequence?: number;
  time_limit?: number;
  image_url?: string;
  audio_url?: string;
  scoring_key?: Record<string, number>;
  is_required?: boolean;
}

export interface UpdateQuestionResponse {
  success: boolean;
  message: string;
  data: QuestionData;
  timestamp: string;
}

export interface DeleteQuestionResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface QuestionStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_questions: number;
    by_question_type: Record<string, number>;
    required_questions: number;
    optional_questions: number;
    avg_time_limit: number;
    questions_with_images: number;
    questions_with_audio: number;
  };
  timestamp: string;
}

export function useQuestions() {
  const queryClient = useQueryClient();

  // Get questions for a specific test
  const useGetQuestions = (testId: string, params?: GetQuestionsRequest) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.question_type)
      queryParams.set("question_type", params.question_type);
    if (params?.is_required !== undefined)
      queryParams.set("is_required", params.is_required.toString());
    if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);

    return useQuery({
      queryKey: ["questions", testId, params],
      queryFn: async () => {
        const response = await apiClient.get<GetQuestionsResponse>(
          `/tests/${testId}/questions?${queryParams.toString()}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch questions");
        }
        return response;
      },
      enabled: !!testId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get question by ID
  const useGetQuestionById = (testId: string, questionId: string) => {
    return useQuery({
      queryKey: ["questions", testId, questionId],
      queryFn: async () => {
        const response = await apiClient.get<GetQuestionByIdResponse>(
          `/tests/${testId}/questions/${questionId}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch question");
        }
        return response;
      },
      enabled: !!(testId && questionId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Get question statistics
  const useGetQuestionStats = (testId: string) => {
    return useQuery({
      queryKey: ["questions", testId, "stats"],
      queryFn: async () => {
        const response = await apiClient.get<QuestionStatsResponse>(
          `/tests/${testId}/questions/stats`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch question stats");
        }
        return response;
      },
      enabled: !!testId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create question
  const useCreateQuestion = (testId: string) => {
    return useMutation({
      mutationFn: async (data: CreateQuestionRequest) => {
        const response = await apiClient.post<CreateQuestionResponse>(
          `/tests/${testId}/questions`,
          data
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create question");
        }
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] }); // Refresh test data
        toast.success("Soal berhasil dibuat");
      },
      onError: (error: Error) => {
        toast.error("Gagal membuat soal", {
          description: error.message,
        });
      },
    });
  };

  // Update question
  const useUpdateQuestion = (testId: string) => {
    return useMutation({
      mutationFn: async ({
        questionId,
        data,
      }: {
        questionId: string;
        data: UpdateQuestionRequest;
      }) => {
        const response = await apiClient.put<UpdateQuestionResponse>(
          `/tests/${testId}/questions/${questionId}`,
          data
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update question");
        }
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] });
        toast.success("Soal berhasil diperbarui");
      },
      onError: (error: Error) => {
        toast.error("Gagal memperbarui soal", {
          description: error.message,
        });
      },
    });
  };

  // Update question sequence
  const useUpdateQuestionSequence = (testId: string) => {
    return useMutation({
      mutationFn: async ({
        questionId,
        sequence,
      }: {
        questionId: string;
        sequence: number;
      }) => {
        const response = await apiClient.put<UpdateQuestionResponse>(
          `/tests/${testId}/questions/${questionId}/sequence`,
          { sequence }
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to update question sequence"
          );
        }
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        toast.success("Urutan soal berhasil diubah");
      },
      onError: (error: Error) => {
        toast.error("Gagal mengubah urutan soal", {
          description: error.message,
        });
      },
    });
  };

  // Delete question
  const useDeleteQuestion = (testId: string) => {
    return useMutation({
      mutationFn: async (questionId: string) => {
        const response = await apiClient.delete<DeleteQuestionResponse>(
          `/tests/${testId}/questions/${questionId}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to delete question");
        }
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] });
        toast.success("Soal berhasil dihapus");
      },
      onError: (error: Error) => {
        toast.error("Gagal menghapus soal", {
          description: error.message,
        });
      },
    });
  };

  // Bulk operations
  const useBulkUpdateQuestions = (testId: string) => {
    return useMutation({
      mutationFn: async (
        questions: Array<{ id: string; sequence: number }>
      ) => {
        const response = await apiClient.put(
          `/tests/${testId}/questions/bulk/sequence`,
          { questions }
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to update question order"
          );
        }
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        toast.success("Urutan soal berhasil diperbarui");
      },
      onError: (error: Error) => {
        toast.error("Gagal memperbarui urutan soal", {
          description: error.message,
        });
      },
    });
  };

  return {
    useGetQuestions,
    useGetQuestionById,
    useGetQuestionStats,
    useCreateQuestion,
    useUpdateQuestion,
    useUpdateQuestionSequence,
    useDeleteQuestion,
    useBulkUpdateQuestions,
  };
}
