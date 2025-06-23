import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";

export interface TestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  session_test_id: string | null;
  start_time: string;
  end_time: string;
  actual_end_time: string | null;
  status: "started" | "in_progress" | "completed" | "abandoned" | "expired";
  ip_address: string | null;
  user_agent: string | null;
  browser_info: Record<string, any> | null;
  attempt_number: number;
  time_spent: number | null;
  questions_answered: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
  test: {
    id: string;
    name: string;
    category: string;
    module_type: string;
    time_limit: number;
    total_questions: number;
    icon?: string;
    card_color?: string;
    instructions?: string;
  };
  session: {
    id: string;
    session_name: string;
    session_code: string;
    target_position: string;
  } | null;
  time_remaining: number;
  progress_percentage: number;
  can_continue: boolean;
  is_expired: boolean;
}

export interface TestQuestion {
  id: string;
  question: string;
  question_type: string;
  options?: Array<{
    value: string;
    label: string;
    score?: number;
  }>;
  sequence: number;
  time_limit?: number;
  image_url?: string;
  audio_url?: string;
  is_required: boolean;
}

export interface Answer {
  id: string;
  user_id: string;
  question_id: string;
  attempt_id: string;
  answer: string | null;
  answer_data: Record<string, any> | null;
  score: number | null;
  time_taken: number | null;
  is_correct: boolean | null;
  confidence_level: number | null;
  answered_at: string;
  created_at: string;
  question: TestQuestion;
  is_answered: boolean;
}

interface StartTestAttemptRequest {
  test_id: string;
  session_code?: string;
  browser_info?: Record<string, any>;
}

interface SubmitAnswerRequest {
  question_id: string;
  answer?: string;
  answer_data?: any;
  time_taken?: number;
  confidence_level?: number;
  is_draft?: boolean;
}

interface UpdateAttemptRequest {
  status?: "in_progress" | "completed" | "abandoned";
  questions_answered?: number;
  browser_info?: Record<string, any>;
}

interface FinishAttemptRequest {
  completion_type: "completed" | "abandoned" | "expired";
  questions_answered: number;
  final_browser_info?: Record<string, any>;
}

export function useTestAttempt() {
  const queryClient = useQueryClient();

  // Start test attempt
  const useStartAttempt = () => {
    return useMutation({
      mutationFn: async (data: StartTestAttemptRequest) => {
        const response = await apiClient.post<{
          success: boolean;
          data: TestAttempt;
          message: string;
        }>("/attempts/start", data);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: (data) => {
        // Cache the attempt data
        queryClient.setQueryData(["attempt", data.id], data);

        toast.success("Tes dimulai!", {
          description: `${data.test.name} - ${data.test.total_questions} soal`,
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal memulai tes", {
          description: error.message,
        });
      },
    });
  };

  // Get test attempt details
  const useGetAttempt = (attemptId: string) => {
    return useQuery({
      queryKey: ["attempt", attemptId],
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: TestAttempt;
          message: string;
        }>(`/attempts/${attemptId}`);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      enabled: !!attemptId,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refresh every minute
    });
  };

  // Get attempt progress
  const useGetAttemptProgress = (attemptId: string) => {
    return useQuery({
      queryKey: ["attempt-progress", attemptId],
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: {
            attempt_id: string;
            status: string;
            start_time: string;
            time_spent: number | null;
            time_remaining: number;
            time_limit: number;
            questions_answered: number;
            total_questions: number;
            progress_percentage: number;
            completion_rate: number;
            can_continue: boolean;
            is_expired: boolean;
            is_nearly_expired: boolean;
            answered_question_ids: string[];
            test: {
              id: string;
              name: string;
              category: string;
              module_type: string;
              time_limit: number;
              total_questions: number;
            };
          };
          message: string;
        }>(`/attempts/${attemptId}/progress`);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      enabled: !!attemptId,
      refetchInterval: 30 * 1000, // Refresh every 30 seconds
    });
  };

  // Submit answer
  const useSubmitAnswer = () => {
    return useMutation({
      mutationFn: async ({
        attemptId,
        data,
      }: {
        attemptId: string;
        data: SubmitAnswerRequest;
      }) => {
        const response = await apiClient.post<{
          success: boolean;
          data: {
            answer: Answer;
            attempt_progress: {
              total_questions: number;
              answered_questions: number;
              progress_percentage: number;
              time_remaining: number;
            };
            next_question: {
              id: string;
              sequence: number;
              question_type: string;
            } | null;
          };
          message: string;
        }>(`/attempts/${attemptId}/answers`, data);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: (data, variables) => {
        // Update progress in cache
        queryClient.setQueryData(
          ["attempt-progress", variables.attemptId],
          (old: any) => ({
            ...old,
            questions_answered: data.attempt_progress.answered_questions,
            progress_percentage: data.attempt_progress.progress_percentage,
            time_remaining: data.attempt_progress.time_remaining,
          })
        );

        // Invalidate progress to get fresh answered_question_ids
        queryClient.invalidateQueries({
          queryKey: ["attempt-progress", variables.attemptId],
        });

        // Cache the answer
        queryClient.setQueryData(
          ["attempt-answer", variables.attemptId, data.answer.question_id],
          data.answer
        );

        if (!variables.data.is_draft) {
          toast.success("Jawaban tersimpan", {
            description: `Progress: ${data.attempt_progress.progress_percentage}%`,
          });
        }
      },
      onError: (error: Error) => {
        toast.error("Gagal menyimpan jawaban", {
          description: error.message,
        });
      },
    });
  };

  // Auto-save answer (silent)
  const useAutoSave = () => {
    return useMutation({
      mutationFn: async ({
        attemptId,
        data,
      }: {
        attemptId: string;
        data: SubmitAnswerRequest;
      }) => {
        const response = await apiClient.post<{
          success: boolean;
          data: {
            answer_id: string;
            is_new: boolean;
            auto_saved_at: string;
          };
          message: string;
        }>(`/attempts/${attemptId}/answers/auto-save`, data);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onError: (error: Error) => {
        console.warn("Auto-save failed:", error.message);
      },
    });
  };

  // Get specific answer
  const useGetAnswer = (attemptId: string, questionId: string) => {
    return useQuery({
      queryKey: ["attempt-answer", attemptId, questionId],
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: {
            answer: Answer | null;
            question: TestQuestion;
            is_answered: boolean;
            can_modify: boolean;
          };
          message: string;
        }>(`/attempts/${attemptId}/answers/${questionId}`);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      enabled: !!attemptId && !!questionId,
      staleTime: 10 * 1000, // 10 seconds
    });
  };

  // Get all answers for an attempt
  const useGetAttemptAnswers = (attemptId: string, options?: {
    page?: number;
    limit?: number;
    include_correct_answers?: boolean;
    include_score?: boolean;
  }) => {
    return useQuery({
      queryKey: ["attempt-answers", attemptId, options],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (options?.page) params.append("page", options.page.toString());
        if (options?.limit) params.append("limit", options.limit.toString());
        if (options?.include_correct_answers) params.append("include_correct_answers", "true");
        if (options?.include_score) params.append("include_score", "true");

        const response = await apiClient.get<{
          success: boolean;
          data: Answer[];
          meta: {
            current_page: number;
            per_page: number;
            total: number;
            total_pages: number;
            has_next_page: boolean;
            has_prev_page: boolean;
            total_answers: number;
            correct_answers: number;
            wrong_answers: number;
            unanswered_questions: number;
          };
          summary: {
            total_questions: number;
            answered_questions: number;
            unanswered_questions: number;
            progress_percentage: number;
            average_time_per_question: number;
            total_time_spent: number;
            average_confidence_level: number | null;
          };
          message: string;
        }>(`/attempts/${attemptId}/answers${params.toString() ? `?${params.toString()}` : ""}`);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response;
      },
      enabled: !!attemptId,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Update attempt
  const useUpdateAttempt = () => {
    return useMutation({
      mutationFn: async ({
        attemptId,
        data,
      }: {
        attemptId: string;
        data: UpdateAttemptRequest;
      }) => {
        const response = await apiClient.put<{
          success: boolean;
          data: TestAttempt;
          message: string;
        }>(`/attempts/${attemptId}`, data);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: (data, variables) => {
        // Update attempt in cache
        queryClient.setQueryData(["attempt", variables.attemptId], data);
      },
    });
  };

  // Finish test
  const useFinishAttempt = () => {
    return useMutation({
      mutationFn: async ({
        attemptId,
        data,
      }: {
        attemptId: string;
        data: FinishAttemptRequest;
      }) => {
        const response = await apiClient.post<{
          success: boolean;
          data: {
            attempt: TestAttempt;
            result?: {
              id: string;
              raw_score: number;
              scaled_score: number;
              percentile: number | null;
              grade: string | null;
              is_passed: boolean | null;
              completion_percentage: number;
              calculated_at: string;
            };
            next_test?: {
              id: string;
              name: string;
              category: string;
              module_type: string;
              sequence: number;
            };
          };
          message: string;
        }>(`/attempts/${attemptId}/finish`, data);

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: (data, variables) => {
        // Update attempt in cache
        queryClient.setQueryData(
          ["attempt", variables.attemptId],
          data.attempt
        );

        // Clear progress cache since test is finished
        queryClient.removeQueries({
          queryKey: ["attempt-progress", variables.attemptId],
        });

        toast.success("Tes selesai!", {
          description: "Jawaban Anda telah disimpan",
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal menyelesaikan tes", {
          description: error.message,
        });
      },
    });
  };

  return {
    useStartAttempt,
    useGetAttempt,
    useGetAttemptProgress,
    useSubmitAnswer,
    useAutoSave,
    useGetAnswer,
    useGetAttemptAnswers,
    useUpdateAttempt,
    useFinishAttempt,
  };
}
