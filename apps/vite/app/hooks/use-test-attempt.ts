// apps/vite/app/hooks/use-test-attempt.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";

export interface TestAttempt {
  attempt_id: string;
  test_info: {
    id: string;
    name: string;
    time_limit: number;
    total_questions: number;
    instructions?: string;
  };
  questions: Array<{
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
  }>;
  attempt_info: {
    start_time: string;
    end_time: string;
    time_remaining: number;
  };
}

interface SubmitAnswerRequest {
  question_id: string;
  answer: string;
  answer_data?: any;
  time_taken?: number;
  confidence_level?: number;
}

export function useTestAttempt() {
  const queryClient = useQueryClient();

  // Start test attempt
  const useStartAttempt = () => {
    return useMutation({
      mutationFn: async (data: {
        session_code: string;
        test_id: string;
        participant_id: string;
      }) => {
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
        queryClient.setQueryData(["attempt", data.attempt_id], data);

        toast.success("Test dimulai!", {
          description: `${data.test_info.name} - ${data.test_info.total_questions} soal`,
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal memulai test", {
          description: error.message,
        });
      },
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
        const response = await apiClient.post(
          `/attempts/${attemptId}/answers`,
          data
        );

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: (data, variables) => {
        // Update progress in cache if needed
        console.log("Answer saved:", data.progress);
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
        const response = await apiClient.post(
          `/attempts/${attemptId}/answers/auto-save`,
          data
        );
        return response.data;
      },
      onError: (error: Error) => {
        console.warn("Auto-save failed:", error.message);
      },
    });
  };

  // Finish test
  const useFinishAttempt = () => {
    return useMutation({
      mutationFn: async ({
        attemptId,
        forceFinish = false,
      }: {
        attemptId: string;
        forceFinish?: boolean;
      }) => {
        const response = await apiClient.post(`/attempts/${attemptId}/finish`, {
          force_finish: forceFinish,
        });

        if (!response.success) {
          throw new Error(response.message);
        }

        return response.data;
      },
      onSuccess: () => {
        toast.success("Test selesai!", {
          description: "Jawaban Anda telah disimpan",
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal menyelesaikan test", {
          description: error.message,
        });
      },
    });
  };

  // Get attempt progress
  const useGetAttemptProgress = (attemptId: string) => {
    return useQuery({
      queryKey: ["attempt-progress", attemptId],
      queryFn: async () => {
        const response = await apiClient.get(`/attempts/${attemptId}/progress`);
        return response.data;
      },
      enabled: !!attemptId,
      refetchInterval: 30000, // Refresh every 30 seconds
    });
  };

  return {
    useStartAttempt,
    useSubmitAnswer,
    useAutoSave,
    useFinishAttempt,
    useGetAttemptProgress,
  };
}
