import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";
import type { CreateSessionFormData } from "~/lib/validations/session";

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
  proctor_id: string;
  auto_expire: boolean;
  allow_late_entry: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  time_remaining: number;
  participant_link: string;
  session_duration_hours: number;
  total_test_time_minutes: number;
  total_questions: number;
  session_modules: SessionModule[];
  proctor: UserInfo;
  created_by_user: UserInfo;
  updated_by_user: UserInfo;
}

interface SessionModule {
  id: string;
  session_id: string;
  test_id: string;
  sequence: number;
  is_required: boolean;
  weight: number;
  created_at: string;
  test: TestInfo;
}

interface TestInfo {
  id: string;
  name: string;
  category: string;
  module_type: string;
  time_limit: number;
  total_questions: number;
  icon?: string;
  card_color?: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
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
  data: Session[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  filters: {
    statuses: string[];
    target_positions: string[];
    proctors: any[];
  };
  timestamp: string;
}

interface CreateSessionResponse {
  success: boolean;
  message: string;
  data: Session;
  timestamp: string;
}

interface UpdateSessionResponse {
  success: boolean;
  message: string;
  data: Session;
  timestamp: string;
}

interface TestOption {
  id: string;
  name: string;
  category: string;
  module_type: string;
  time_limit: number;
  total_questions: number;
  icon?: string;
  card_color?: string;
}

interface ProctorOption {
  id: string;
  name: string;
  email: string;
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

        return response;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
      refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    });
  };

  // Get session by ID (Query)
  const useGetSessionById = (sessionId: string) => {
    return useQuery({
      queryKey: queryKeys.sessions.detail(sessionId),
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: Session;
          message: string;
        }>(`/sessions/${sessionId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to get session");
        }
        return response.data;
      },
      enabled: !!sessionId,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Get available tests for session modules (Query)
  const useGetAvailableTests = () => {
    return useQuery({
      queryKey: queryKeys.tests.list({ status: "active" }),
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: TestOption[];
          message: string;
        }>(`/tests?status=active&limit=100`);

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch tests");
        }

        return response.data;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes - tests don't change often
    });
  };

  // Get available proctors (Query)
  const useGetAvailableProctors = () => {
    return useQuery({
      queryKey: ["proctors"],
      queryFn: async () => {
        const response = await apiClient.get<{
          success: boolean;
          data: ProctorOption[];
          message: string;
        }>(`/users?role=admin&limit=50`);

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch proctors");
        }

        return response.data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Create session (Mutation)
  const useCreateSession = () => {
    return useMutation({
      mutationFn: async (data: CreateSessionFormData) => {
        const response = await apiClient.post<CreateSessionResponse>(
          "/sessions",
          data
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to create session");
        }

        return response;
      },
      onSuccess: (response) => {
        // Invalidate and refetch sessions list
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

        // Optionally add the new session to the cache
        queryClient.setQueryData(
          queryKeys.sessions.detail(response.data.id),
          response.data
        );

        toast.success("Sesi berhasil dibuat!", {
          description: `Sesi "${response.data.session_name}" telah dibuat dengan kode: ${response.data.session_code}`,
        });
      },
      onError: (error: Error) => {
        console.error("Create session error:", error);

        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("session code") &&
          errorMessage.includes("exists")
        ) {
          toast.error("Kode sesi sudah digunakan", {
            description:
              "Silakan gunakan kode sesi yang berbeda atau biarkan kosong untuk dibuat otomatis",
          });
        } else if (errorMessage.includes("invalid test")) {
          toast.error("Tes tidak valid", {
            description:
              "Satu atau lebih tes yang dipilih tidak valid atau tidak aktif",
          });
        } else if (errorMessage.includes("invalid proctor")) {
          toast.error("Proktor tidak valid", {
            description: "Proktor yang dipilih tidak valid atau bukan admin",
          });
        } else if (errorMessage.includes("time")) {
          toast.error("Waktu tidak valid", {
            description: "Periksa kembali waktu mulai dan selesai sesi",
          });
        } else {
          toast.error("Gagal membuat sesi", {
            description: error.message || "Terjadi kesalahan saat membuat sesi",
          });
        }
      },
    });
  };

  // Update session (Mutation)
  const useUpdateSession = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        data,
      }: {
        sessionId: string;
        data: CreateSessionFormData;
      }) => {
        const response = await apiClient.put<UpdateSessionResponse>(
          `/sessions/${sessionId}`,
          data
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to update session");
        }

        return response;
      },
      onSuccess: (response, { sessionId }) => {
        // Update the session in cache
        queryClient.setQueryData(
          queryKeys.sessions.detail(sessionId),
          response.data
        );

        // Invalidate sessions list to refresh
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

        toast.success("Sesi berhasil diperbarui!", {
          description: `Sesi "${response.data.session_name}" telah diperbarui`,
        });
      },
      onError: (error: Error) => {
        console.error("Update session error:", error);

        toast.error("Gagal memperbarui sesi", {
          description:
            error.message || "Terjadi kesalahan saat memperbarui sesi",
        });
      },
    });
  };

  // Delete session (Mutation)
  const useDeleteSession = () => {
    return useMutation({
      mutationFn: async (sessionId: string) => {
        const response = await apiClient.delete(`/sessions/${sessionId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to delete session");
        }
        return response;
      },
      onSuccess: (_, sessionId) => {
        // Remove from cache
        queryClient.removeQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

        toast.success("Sesi berhasil dihapus", {
          description: "Sesi telah dihapus dari sistem",
        });
      },
      onError: (error: Error) => {
        toast.error("Gagal menghapus sesi", {
          description: error.message || "Terjadi kesalahan saat menghapus sesi",
        });
      },
    });
  };

  // Get session statistics (Query)
  const useGetSessionStats = () => {
    return useQuery({
      queryKey: ["sessions", "stats"],
      queryFn: async () => {
        const response = await apiClient.get("/sessions/stats/summary");
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch session stats");
        }
        return response.data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 60 * 1000, // Auto-refresh every minute
    });
  };

  return {
    // Queries
    useGetSessions,
    useGetSessionById,
    useGetAvailableTests,
    useGetAvailableProctors,
    useGetSessionStats,

    // Mutations
    useCreateSession,
    useUpdateSession,
    useDeleteSession,
  };
}
