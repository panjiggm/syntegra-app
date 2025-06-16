import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";
import { addMinutes, isAfter } from "date-fns";

// Types for participant test progress
export interface ParticipantTestProgress {
  id: string;
  participant_id: string;
  session_id: string;
  test_id: string;
  user_id: string;
  status: "not_started" | "in_progress" | "completed" | "auto_completed";
  started_at: string | null;
  completed_at: string | null;
  expected_completion_at: string | null;
  answered_questions: number;
  total_questions: number;
  time_spent: number; // in seconds
  is_auto_completed: boolean;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  test: {
    id: string;
    name: string;
    category: string;
    module_type: string;
    time_limit: number; // in minutes
    total_questions: number;
    icon: string | null;
    card_color: string | null;
    question_type: string | null;
  };
  time_remaining: number; // in seconds
  progress_percentage: number;
  is_time_expired: boolean;
}

interface GetParticipantTestProgressResponse {
  success: boolean;
  message: string;
  data: ParticipantTestProgress[];
  timestamp: string;
}

interface GetTestProgressResponse {
  success: boolean;
  message: string;
  data: ParticipantTestProgress;
  timestamp: string;
}

interface StartTestResponse {
  success: boolean;
  message: string;
  data: ParticipantTestProgress;
  timestamp: string;
}

interface UpdateTestProgressResponse {
  success: boolean;
  message: string;
  data: ParticipantTestProgress;
  timestamp: string;
}

interface CompleteTestResponse {
  success: boolean;
  message: string;
  data: ParticipantTestProgress;
  timestamp: string;
}

export function useParticipantTestProgress() {
  const queryClient = useQueryClient();

  // Helper function to calculate if test time has expired
  const isTestTimeExpired = (
    startedAt: string | null,
    timeLimitMinutes: number
  ): boolean => {
    if (!startedAt) return false;
    const startTime = new Date(startedAt);
    const expectedCompletion = addMinutes(startTime, timeLimitMinutes);
    return isAfter(new Date(), expectedCompletion);
  };

  // Helper function to calculate time remaining in seconds
  const calculateTimeRemaining = (
    startedAt: string | null,
    timeLimitMinutes: number
  ): number => {
    if (!startedAt) return timeLimitMinutes * 60;

    const startTime = new Date(startedAt);
    const expectedCompletion = addMinutes(startTime, timeLimitMinutes);
    const now = new Date();

    if (isAfter(now, expectedCompletion)) return 0;

    return Math.floor((expectedCompletion.getTime() - now.getTime()) / 1000);
  };

  // Get all test progress for a participant in a session
  const useGetParticipantTestProgress = (
    sessionId: string,
    participantId: string
  ) => {
    return useQuery({
      queryKey: ["participant-test-progress", sessionId, participantId],
      queryFn: async () => {
        const response =
          await apiClient.get<GetParticipantTestProgressResponse>(
            `/sessions/${sessionId}/participants-test-progress/${participantId}/test-progress`
          );
        if (!response.success) {
          throw new Error(response.message || "Failed to get test progress");
        }
        return response.data;
      },
      enabled: !!sessionId && !!participantId,
      staleTime: 0, // Always refetch for real-time data
      refetchInterval: 60 * 1000, // Revalidate every 1 minute
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Get specific test progress for a participant
  const useGetTestProgress = (
    sessionId: string,
    participantId: string,
    testId: string
  ) => {
    return useQuery({
      queryKey: ["test-progress", sessionId, participantId, testId],
      queryFn: async () => {
        const response = await apiClient.get<GetTestProgressResponse>(
          `/sessions/${sessionId}/participants-test-progress/${participantId}/test-progress/${testId}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to get test progress");
        }
        return response.data;
      },
      enabled: !!sessionId && !!participantId && !!testId,
      staleTime: 0, // Always refetch for real-time data
      refetchInterval: 60 * 1000, // Revalidate every 1 minute
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Start a test for a participant
  const useStartTest = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        participantId,
        testId,
      }: {
        sessionId: string;
        participantId: string;
        testId: string;
      }) => {
        const response = await apiClient.post<StartTestResponse>(
          `/sessions/${sessionId}/participants-test-progress/${participantId}/test-progress/${testId}/start`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to start test");
        }
        return response.data;
      },
      onSuccess: (data, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: [
            "participant-test-progress",
            variables.sessionId,
            variables.participantId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            "test-progress",
            variables.sessionId,
            variables.participantId,
            variables.testId,
          ],
        });

        toast.success("Test started successfully");
      },
      onError: (error: any) => {
        console.error("Start test error:", error);
        toast.error(error.message || "Failed to start test");
      },
    });
  };

  // Update test progress (answered questions, time tracking)
  const useUpdateTestProgress = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        participantId,
        testId,
        answered_questions,
        time_spent,
      }: {
        sessionId: string;
        participantId: string;
        testId: string;
        answered_questions?: number;
        time_spent?: number;
      }) => {
        const response = await apiClient.put<UpdateTestProgressResponse>(
          `/sessions/${sessionId}/participants-test-progress/${participantId}/test-progress/${testId}`,
          {
            answered_questions,
            time_spent,
          }
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update test progress");
        }
        return response.data;
      },
      onSuccess: (data, variables) => {
        // Update cache optimistically
        queryClient.setQueryData(
          [
            "test-progress",
            variables.sessionId,
            variables.participantId,
            variables.testId,
          ],
          data
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: [
            "participant-test-progress",
            variables.sessionId,
            variables.participantId,
          ],
        });
      },
      onError: (error: any) => {
        console.error("Update test progress error:", error);
        // Don't show toast for progress updates to avoid spam
      },
    });
  };

  // Complete a test for a participant
  const useCompleteTest = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        participantId,
        testId,
        is_auto_completed = false,
      }: {
        sessionId: string;
        participantId: string;
        testId: string;
        is_auto_completed?: boolean;
      }) => {
        const response = await apiClient.post<CompleteTestResponse>(
          `/sessions/${sessionId}/participants-test-progress/${participantId}/test-progress/${testId}/complete`,
          {
            is_auto_completed,
          }
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to complete test");
        }
        return response.data;
      },
      onSuccess: (data, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: [
            "participant-test-progress",
            variables.sessionId,
            variables.participantId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            "test-progress",
            variables.sessionId,
            variables.participantId,
            variables.testId,
          ],
        });

        if (variables.is_auto_completed) {
          toast.warning("Test completed automatically due to time limit");
        } else {
          toast.success("Test completed successfully");
        }
      },
      onError: (error: any) => {
        console.error("Complete test error:", error);
        toast.error(error.message || "Failed to complete test");
      },
    });
  };

  // Custom hook for real-time test monitoring
  const useTestTimeMonitoring = (
    progress: ParticipantTestProgress | undefined
  ) => {
    const completeTest = useCompleteTest();

    return useQuery({
      queryKey: ["test-time-monitoring", progress?.id],
      queryFn: async () => {
        if (
          !progress ||
          progress.status !== "in_progress" ||
          !progress.started_at
        ) {
          return null;
        }

        const timeExpired = isTestTimeExpired(
          progress.started_at,
          progress.test.time_limit
        );

        if (timeExpired && !progress.completed_at) {
          // Auto-complete the test
          try {
            await completeTest.mutateAsync({
              sessionId: progress.session_id,
              participantId: progress.participant_id,
              testId: progress.test_id,
              is_auto_completed: true,
            });
          } catch (error) {
            console.error("Failed to auto-complete test:", error);
          }
        }

        return {
          timeExpired,
          timeRemaining: calculateTimeRemaining(
            progress.started_at,
            progress.test.time_limit
          ),
        };
      },
      enabled:
        !!progress &&
        progress.status === "in_progress" &&
        !!progress.started_at,
      refetchInterval: 60 * 1000, // Check every minute
      refetchIntervalInBackground: true,
      retry: false,
    });
  };

  return {
    // Query hooks
    useGetParticipantTestProgress,
    useGetTestProgress,

    // Mutation hooks
    useStartTest,
    useUpdateTestProgress,
    useCompleteTest,

    // Utility hooks
    useTestTimeMonitoring,

    // Helper functions
    isTestTimeExpired,
    calculateTimeRemaining,
  };
}
