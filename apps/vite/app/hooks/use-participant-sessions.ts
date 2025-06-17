import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";

// Types for participant sessions API response
export interface ParticipantSessionTest {
  test_id: string;
  test_name: string;
  test_category: string;
  test_module_type: string;
  question_type: string | null;
  time_limit: number;
  total_questions: number;
  sequence: number;
  is_required: boolean;
  icon: string | null;
  card_color: string | null;

  // Progress data
  progress_status:
    | "not_started"
    | "in_progress"
    | "completed"
    | "auto_completed";
  started_at: string | null;
  completed_at: string | null;
  time_spent: number; // in seconds
  answered_questions: number;
  progress_percentage: number;
  is_time_expired: boolean;
}

export interface ParticipantSession {
  session_id: string;
  session_name: string;
  session_code: string;
  session_description: string | null;
  session_location: string | null;
  target_position: string;
  start_time: string;
  end_time: string;
  session_status: string;
  is_active: boolean;
  is_expired: boolean;
  time_remaining: number; // in minutes

  // Participant info
  participant_status: string;
  registered_at: string | null;

  // Session progress
  total_tests: number;
  completed_tests: number;
  in_progress_tests: number;
  not_started_tests: number;
  session_progress_percentage: number;

  // Tests in this session
  tests: ParticipantSessionTest[];
}

export interface ParticipantSessionsSummary {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  expired_sessions: number;
  total_tests_across_sessions: number;
  completed_tests_across_sessions: number;
  overall_progress_percentage: number;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  phone: string;
}

interface GetParticipantSessionsResponse {
  success: boolean;
  message: string;
  data: {
    participant_info: ParticipantInfo;
    sessions: ParticipantSession[];
    summary: ParticipantSessionsSummary;
  };
  timestamp: string;
}

export function useParticipantSessions() {
  // Get participant's sessions with test progress
  const useGetParticipantSessions = () => {
    return useQuery({
      queryKey: ["participant-sessions"],
      queryFn: async () => {
        const response = await apiClient.get<GetParticipantSessionsResponse>(
          "/sessions/my-sessions"
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch participant sessions"
          );
        }

        return response.data;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - keep fresh for real-time progress
      refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        // Don't retry on 403/404 errors
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Helper functions for working with session data
  const getTestStatusBadge = (
    status: ParticipantSessionTest["progress_status"]
  ) => {
    switch (status) {
      case "completed":
      case "auto_completed":
        return {
          label: "Selesai",
          variant: "success" as const,
          color: "text-green-700 bg-green-100",
        };
      case "in_progress":
        return {
          label: "Sedang Berlangsung",
          variant: "warning" as const,
          color: "text-blue-700 bg-blue-100",
        };
      case "not_started":
      default:
        return {
          label: "Belum Dimulai",
          variant: "secondary" as const,
          color: "text-gray-700 bg-gray-100",
        };
    }
  };

  const getSessionStatusBadge = (session: ParticipantSession) => {
    if (session.is_expired) {
      return {
        label: "Berakhir",
        variant: "destructive" as const,
        color: "text-red-700 bg-red-100",
      };
    }

    if (session.session_status === "completed") {
      return {
        label: "Selesai",
        variant: "success" as const,
        color: "text-green-700 bg-green-100",
      };
    }

    if (session.is_active) {
      return {
        label: "Aktif",
        variant: "default" as const,
        color: "text-blue-700 bg-blue-100",
      };
    }

    return {
      label: "Menunggu",
      variant: "secondary" as const,
      color: "text-gray-700 bg-gray-100",
    };
  };

  const formatTimeSpent = (timeInSeconds: number) => {
    if (timeInSeconds === 0) return "Belum dimulai";

    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    if (hours > 0) {
      return `${hours}j ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimeRemaining = (session: ParticipantSession) => {
    if (session.is_expired) return "Berakhir";

    const timeRemaining = session.time_remaining || 0;
    if (timeRemaining <= 0) return "Berakhir";

    const hours = Math.floor(timeRemaining / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} hari ${hours % 24} jam`;
    } else if (hours > 0) {
      return `${hours} jam`;
    } else {
      return `${timeRemaining} menit`;
    }
  };

  const getQuestionTypeLabel = (questionType: string | null) => {
    switch (questionType) {
      case "multiple_choice":
        return "Pilihan Ganda";
      case "true_false":
        return "Benar/Salah";
      case "text":
        return "Jawaban Teks";
      case "rating_scale":
        return "Skala Rating";
      case "drawing":
        return "Menggambar";
      case "sequence":
        return "Urutan";
      case "matrix":
        return "Matriks";
      default:
        return "Tidak Diketahui";
    }
  };

  const canStartTest = (
    test: ParticipantSessionTest,
    session: ParticipantSession
  ) => {
    // Can't start if session is expired or not active
    if (session.is_expired || !session.is_active) {
      return false;
    }

    // Can't start if test is already completed
    if (
      test.progress_status === "completed" ||
      test.progress_status === "auto_completed"
    ) {
      return false;
    }

    // Can't start if time is expired for in-progress test
    if (test.progress_status === "in_progress" && test.is_time_expired) {
      return false;
    }

    return true;
  };

  const canContinueTest = (
    test: ParticipantSessionTest,
    session: ParticipantSession
  ) => {
    return (
      session.is_active &&
      !session.is_expired &&
      test.progress_status === "in_progress" &&
      !test.is_time_expired
    );
  };

  return {
    // Query hooks
    useGetParticipantSessions,

    // Helper functions
    getTestStatusBadge,
    getSessionStatusBadge,
    formatTimeSpent,
    formatTimeRemaining,
    getQuestionTypeLabel,
    canStartTest,
    canContinueTest,
  };
}
