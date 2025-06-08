"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./useApi";

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
  const { apiCall } = useApi();
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
      queryFn: () =>
        apiCall<GetQuestionsResponse>(
          `/tests/${testId}/questions?${queryParams.toString()}`
        ),
      enabled: !!testId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get question by ID
  const useGetQuestionById = (testId: string, questionId: string) => {
    return useQuery({
      queryKey: ["questions", testId, questionId],
      queryFn: () =>
        apiCall<GetQuestionByIdResponse>(
          `/tests/${testId}/questions/${questionId}`
        ),
      enabled: !!(testId && questionId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Get question statistics
  const useGetQuestionStats = (testId: string) => {
    return useQuery({
      queryKey: ["questions", testId, "stats"],
      queryFn: () =>
        apiCall<QuestionStatsResponse>(`/tests/${testId}/questions/stats`),
      enabled: !!testId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create question
  const useCreateQuestion = (testId: string) => {
    return useMutation({
      mutationFn: (data: CreateQuestionRequest) =>
        apiCall<CreateQuestionResponse>(`/tests/${testId}/questions`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] }); // Refresh test data
      },
    });
  };

  // Update question
  const useUpdateQuestion = (testId: string) => {
    return useMutation({
      mutationFn: ({
        questionId,
        data,
      }: {
        questionId: string;
        data: UpdateQuestionRequest;
      }) =>
        apiCall<UpdateQuestionResponse>(
          `/tests/${testId}/questions/${questionId}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] });
      },
    });
  };

  // Update question sequence
  const useUpdateQuestionSequence = (testId: string) => {
    return useMutation({
      mutationFn: ({
        questionId,
        sequence,
      }: {
        questionId: string;
        sequence: number;
      }) =>
        apiCall<UpdateQuestionResponse>(
          `/tests/${testId}/questions/${questionId}/sequence`,
          {
            method: "PUT",
            body: JSON.stringify({ sequence }),
          }
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
      },
    });
  };

  // Delete question
  const useDeleteQuestion = (testId: string) => {
    return useMutation({
      mutationFn: (questionId: string) =>
        apiCall<DeleteQuestionResponse>(
          `/tests/${testId}/questions/${questionId}`,
          {
            method: "DELETE",
          }
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
        queryClient.invalidateQueries({ queryKey: ["tests", testId] });
      },
    });
  };

  // Bulk operations
  const useBulkUpdateQuestions = (testId: string) => {
    return useMutation({
      mutationFn: (questions: Array<{ id: string; sequence: number }>) =>
        apiCall(`/tests/${testId}/questions/bulk/sequence`, {
          method: "PUT",
          body: JSON.stringify({ questions }),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["questions", testId] });
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
