import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./useApi";
import type {
  GetSessionsRequest,
  GetSessionsResponse,
  GetSessionByIdResponse,
  GetSessionByCodeResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  DeleteSessionResponse,
  SessionStatsResponse,
} from "shared-types";

export function useSessions() {
  const { apiCall } = useApi();
  const queryClient = useQueryClient();

  // Get all sessions with comprehensive filtering
  const useGetSessions = (params?: GetSessionsRequest) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.target_position)
      queryParams.set("target_position", params.target_position);
    if (params?.proctor_id) queryParams.set("proctor_id", params.proctor_id);
    if (params?.start_date_from)
      queryParams.set("start_date_from", params.start_date_from);
    if (params?.start_date_to)
      queryParams.set("start_date_to", params.start_date_to);
    if (params?.created_from)
      queryParams.set("created_from", params.created_from);
    if (params?.created_to) queryParams.set("created_to", params.created_to);
    if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);

    return useQuery({
      queryKey: ["sessions", params],
      queryFn: () =>
        apiCall<GetSessionsResponse>(`/sessions?${queryParams.toString()}`),
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 403/404 errors
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Get session by ID
  const useGetSessionById = (sessionId: string) => {
    return useQuery({
      queryKey: ["sessions", sessionId],
      queryFn: () => apiCall<GetSessionByIdResponse>(`/sessions/${sessionId}`),
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Get session by code (for participants)
  const useGetSessionByCode = (sessionCode: string) => {
    return useQuery({
      queryKey: ["sessions", "public", sessionCode],
      queryFn: () =>
        apiCall<GetSessionByCodeResponse>(`/sessions/public/${sessionCode}`),
      enabled: !!sessionCode,
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter for public access
      retry: (failureCount, error: any) => {
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    });
  };

  // Get session statistics
  const useGetSessionStats = () => {
    return useQuery({
      queryKey: ["sessions", "stats"],
      queryFn: () => apiCall<SessionStatsResponse>("/sessions/stats/summary"),
      staleTime: 10 * 60 * 1000, // 10 minutes for stats
      retry: (failureCount, error: any) => {
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  // Create session
  const useCreateSession = () => {
    return useMutation({
      mutationFn: (data: CreateSessionRequest) =>
        apiCall<CreateSessionResponse>("/sessions", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      onSuccess: (data) => {
        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: ["sessions"] });

        // Set the newly created session in cache
        if (data.success && data.data) {
          queryClient.setQueryData(["sessions", data.data.id], {
            success: true,
            message: "Session retrieved successfully",
            data: data.data,
            timestamp: data.timestamp,
          });
        }
      },
      onError: (error) => {
        console.error("Create session error:", error);
      },
    });
  };

  // Update session
  const useUpdateSession = () => {
    return useMutation({
      mutationFn: ({
        sessionId,
        data,
      }: {
        sessionId: string;
        data: UpdateSessionRequest;
      }) =>
        apiCall<UpdateSessionResponse>(`/sessions/${sessionId}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      onSuccess: (data, variables) => {
        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: ["sessions"] });

        // Update specific session in cache
        queryClient.invalidateQueries({
          queryKey: ["sessions", variables.sessionId],
        });

        // Invalidate session stats
        queryClient.invalidateQueries({ queryKey: ["sessions", "stats"] });
      },
      onError: (error) => {
        console.error("Update session error:", error);
      },
    });
  };

  // Delete session
  const useDeleteSession = () => {
    return useMutation({
      mutationFn: (sessionId: string) =>
        apiCall<DeleteSessionResponse>(`/sessions/${sessionId}`, {
          method: "DELETE",
        }),
      onSuccess: (data, sessionId) => {
        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: ["sessions"] });

        // Remove specific session from cache
        queryClient.removeQueries({ queryKey: ["sessions", sessionId] });

        // Invalidate session stats
        queryClient.invalidateQueries({ queryKey: ["sessions", "stats"] });
      },
      onError: (error) => {
        console.error("Delete session error:", error);
      },
    });
  };

  // Session status management mutations
  const useActivateSession = () => {
    return useMutation({
      mutationFn: (sessionId: string) =>
        apiCall(`/sessions/${sessionId}/activate`, {
          method: "POST",
        }),
      onSuccess: (data, sessionId) => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["sessions", "stats"] });
      },
    });
  };

  const useCancelSession = () => {
    return useMutation({
      mutationFn: (sessionId: string) =>
        apiCall(`/sessions/${sessionId}/cancel`, {
          method: "POST",
        }),
      onSuccess: (data, sessionId) => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["sessions", "stats"] });
      },
    });
  };

  const useCompleteSession = () => {
    return useMutation({
      mutationFn: (sessionId: string) =>
        apiCall(`/sessions/${sessionId}/complete`, {
          method: "POST",
        }),
      onSuccess: (data, sessionId) => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["sessions", "stats"] });
      },
    });
  };

  // Trigger manual session status update
  const useTriggerStatusUpdate = () => {
    return useMutation({
      mutationFn: () =>
        apiCall("/sessions/trigger-status-update", {
          method: "POST",
        }),
      onSuccess: () => {
        // Refresh all session data after status update
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
      },
    });
  };

  return {
    // Query hooks
    useGetSessions,
    useGetSessionById,
    useGetSessionByCode,
    useGetSessionStats,

    // Mutation hooks
    useCreateSession,
    useUpdateSession,
    useDeleteSession,

    // Session status management
    useActivateSession,
    useCancelSession,
    useCompleteSession,
    useTriggerStatusUpdate,
  };
}

// Helper functions for working with session data
export const sessionHelpers = {
  // Format session code for display
  formatSessionCode: (code: string) => {
    return code?.toUpperCase() || "";
  },

  // Check if session is currently active
  isSessionActive: (session: any) => {
    if (!session?.start_time || !session?.end_time || !session?.status)
      return false;

    const now = new Date();
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);

    return session.status === "active" && startTime <= now && now <= endTime;
  },

  // Check if session is expired
  isSessionExpired: (session: any) => {
    if (!session?.end_time || !session?.status) return false;

    const now = new Date();
    const endTime = new Date(session.end_time);

    return (
      session.status === "expired" ||
      (session.status !== "completed" && now > endTime)
    );
  },

  // Calculate session duration in minutes
  getSessionDuration: (session: any) => {
    if (!session?.start_time || !session?.end_time) return 0;

    try {
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);

      return Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );
    } catch (error) {
      console.error("Error calculating session duration:", error);
      return 0;
    }
  },

  // Get time remaining until session starts or ends
  getTimeRemaining: (session: any) => {
    if (!session?.start_time || !session?.end_time) {
      return { type: "expired", minutes: 0, hours: 0 };
    }

    try {
      const now = new Date();
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);

      if (now < startTime) {
        // Session hasn't started
        const diff = startTime.getTime() - now.getTime();
        return {
          type: "until_start",
          minutes: Math.round(diff / (1000 * 60)),
          hours: Math.round(diff / (1000 * 60 * 60)),
        };
      } else if (now < endTime) {
        // Session is active
        const diff = endTime.getTime() - now.getTime();
        return {
          type: "until_end",
          minutes: Math.round(diff / (1000 * 60)),
          hours: Math.round(diff / (1000 * 60 * 60)),
        };
      } else {
        // Session has ended
        return {
          type: "expired",
          minutes: 0,
          hours: 0,
        };
      }
    } catch (error) {
      console.error("Error calculating time remaining:", error);
      return { type: "expired", minutes: 0, hours: 0 };
    }
  },

  // Generate participant link
  generateParticipantLink: (sessionCode: string, baseUrl?: string) => {
    if (!sessionCode) return "";

    const base =
      baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/psikotest/${sessionCode.toLowerCase()}`;
  },

  // Format participants count
  formatParticipantsCount: (current: number = 0, max: number | null = null) => {
    if (max === null || max === undefined) {
      return `${current} peserta`;
    }
    return `${current}/${max} peserta`;
  },

  // Get session status badge info
  getStatusBadge: (status: string = "") => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      active: { label: "Aktif", className: "bg-green-100 text-green-800" },
      expired: { label: "Berakhir", className: "bg-red-100 text-red-800" },
      completed: { label: "Selesai", className: "bg-blue-100 text-blue-800" },
      cancelled: {
        label: "Dibatalkan",
        className: "bg-orange-100 text-orange-800",
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status || "Unknown",
        className: "bg-gray-100 text-gray-800",
      }
    );
  },
};
