import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Types for sessions
interface Session {
  id: string;
  session_name: string;
  session_code: string;
  start_time: string;
  end_time: string;
  target_position: string;
  status: "draft" | "active" | "completed" | "cancelled";
  location: string;
  description: string;
  is_active: boolean;
  is_expired: boolean;
  current_participants: number;
  max_participants: number;
  session_modules: any[];
}

interface GetSessionsRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  participant_id?: string;
}

interface GetSessionsResponse {
  success: boolean;
  message: string;
  data: {
    sessions: Session[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

export function useSessions() {
  const queryClient = useQueryClient();

  // Get all sessions (Query)
  const useGetSessions = (params?: GetSessionsRequest) => {
    return useQuery({
      queryKey: queryKeys.sessions.list(params),
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.status) queryParams.set("status", params.status);
        if (params?.participant_id)
          queryParams.set("participant_id", params.participant_id);

        const response = await apiClient.get<GetSessionsResponse>(
          `/sessions?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch sessions");
        }

        return response.data;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
      refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    });
  };

  // Get participant sessions (Query)
  const useGetParticipantSessions = (participantId: string) => {
    return useQuery({
      queryKey: queryKeys.sessions.participant(participantId),
      queryFn: async () => {
        const response = await apiClient.get(
          `/participants/${participantId}/sessions`
        );
        if (!response.success) {
          throw new Error(
            response.message || "Failed to get participant sessions"
          );
        }
        return response.data;
      },
      enabled: !!participantId,
      staleTime: 1 * 60 * 1000, // 1 minute
      refetchInterval: 15 * 1000, // Auto-refresh every 15 seconds for active sessions
    });
  };

  // Get session by ID (Query)
  const useGetSessionById = (sessionId: string) => {
    return useQuery({
      queryKey: queryKeys.sessions.detail(sessionId),
      queryFn: async () => {
        const response = await apiClient.get(`/sessions/${sessionId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to get session");
        }
        return response.data;
      },
      enabled: !!sessionId,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Join session (Mutation)
  const useJoinSession = () => {
    return useMutation({
      mutationFn: async (sessionId: string) => {
        const response = await apiClient.post(`/sessions/${sessionId}/join`);
        if (!response.success) {
          throw new Error(response.message || "Failed to join session");
        }
        return response;
      },
      onSuccess: (_, sessionId) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

        toast.success("Berhasil bergabung ke sesi!", {
          description: "Anda telah terdaftar dalam sesi tes ini",
        });
      },
      onError: (error: Error) => {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("full") ||
          errorMessage.includes("capacity")
        ) {
          toast.error("Sesi penuh", {
            description: "Kapasitas peserta sudah mencapai batas maksimum",
          });
        } else if (
          errorMessage.includes("expired") ||
          errorMessage.includes("closed")
        ) {
          toast.error("Sesi sudah ditutup", {
            description: "Pendaftaran untuk sesi ini sudah ditutup",
          });
        } else {
          toast.error("Gagal bergabung ke sesi", {
            description:
              error.message || "Terjadi kesalahan saat mendaftar ke sesi",
          });
        }
      },
    });
  };

  // Start test session (Mutation)
  const useStartTestSession = () => {
    return useMutation({
      mutationFn: async (sessionId: string) => {
        const response = await apiClient.post(`/sessions/${sessionId}/start`);
        if (!response.success) {
          throw new Error(response.message || "Failed to start test session");
        }
        return response;
      },
      onSuccess: (_, sessionId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        toast.success("Tes dimulai!", {
          description: "Selamat mengerjakan tes psikologi",
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal memulai tes", {
          description: error.message || "Terjadi kesalahan saat memulai tes",
        });
      },
    });
  };

  return {
    // Queries
    useGetSessions,
    useGetParticipantSessions,
    useGetSessionById,

    // Mutations
    useJoinSession,
    useStartTestSession,
  };
}
