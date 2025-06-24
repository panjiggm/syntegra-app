import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Types for participants
export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  status: "invited" | "registered" | "started" | "completed" | "no_show";
  registered_at: string | null;
  invitation_sent_at: string | null;
  unique_link: string;
  link_expires_at: string;
  created_at: string;
  user: ParticipantUser;
  is_link_expired: boolean;
  access_url: string;
}

interface ParticipantUser {
  id: string;
  nik: string;
  name: string;
  email: string;
  phone: string | null;
  gender: "male" | "female" | "other" | null;
  birth_date: string | null;
  is_active: boolean;
}

interface GetSessionParticipantsRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: "invited" | "registered" | "started" | "completed" | "no_show";
  invitation_sent?: boolean;
  registered?: boolean;
  sort_by?:
    | "name"
    | "nik"
    | "email"
    | "status"
    | "registered_at"
    | "invitation_sent_at"
    | "created_at";
  sort_order?: "asc" | "desc";
}

interface GetSessionParticipantsResponse {
  success: boolean;
  message: string;
  data: SessionParticipant[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  session_info: {
    id: string;
    session_name: string;
    session_code: string;
    target_position: string;
    max_participants: number | null;
    current_participants: number;
    status: string;
  };
  filters: {
    statuses: string[];
  };
  timestamp: string;
}

interface AddParticipantRequest {
  user_id: string;
  link_expires_hours: number;
  send_invitation: boolean;
}

export interface BulkAddParticipantsRequest {
  participants: { user_id: string; custom_message?: string | undefined }[];
  link_expires_hours: number;
  send_invitations: boolean;
}

interface UpdateParticipantStatusRequest {
  status: "invited" | "registered" | "started" | "completed" | "no_show";
}

interface BulkAddParticipantsResponse {
  success: boolean;
  message: string;
  data: {
    added_participants: SessionParticipant[];
    total_added: number;
    skipped_participants?: {
      user_id: string;
      user_name: string;
      reason: string;
    }[];
    invitation_status?: {
      sent: number;
      failed: number;
      skipped: number;
    };
  };
  timestamp: string;
}

interface AddParticipantResponse {
  success: boolean;
  message: string;
  data: SessionParticipant;
  timestamp: string;
}

interface UpdateParticipantStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    user_id: string;
    user_name: string;
    old_status: string;
    new_status: string;
    updated_at: string;
  };
  timestamp: string;
}

interface RemoveParticipantResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    session_id: string;
    user_id: string;
    user_name: string;
    removed_at: string;
  };
  timestamp: string;
}

export function useSessionParticipants() {
  const queryClient = useQueryClient();

  // Get available users for session (users not already in session)
  const useGetAvailableUsers = (
    sessionId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: "participant" | "admin";
    }
  ) => {
    return useQuery({
      queryKey: ["available-users", sessionId, params],
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.role) queryParams.set("role", params.role);

        const response = await apiClient.get<{
          success: boolean;
          message: string;
          data: Array<{
            id: string;
            nik: string;
            name: string;
            email: string;
            phone: string | null;
            gender: "male" | "female" | "other" | null;
            birth_date: string | null;
            is_active: boolean;
          }>;
          meta: {
            current_page: number;
            per_page: number;
            total: number;
            total_pages: number;
            has_next_page: boolean;
            has_prev_page: boolean;
          };
          timestamp: string;
        }>(`/users/available/${sessionId}?${queryParams.toString()}`);

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch available users"
          );
        }

        return response;
      },
      enabled: !!sessionId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get session participants (Query)
  const useGetSessionParticipants = (
    sessionId: string,
    params?: GetSessionParticipantsRequest
  ) => {
    return useQuery({
      queryKey: ["session-participants", sessionId, params],
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.status) queryParams.set("status", params.status);
        if (params?.invitation_sent !== undefined)
          queryParams.set("invitation_sent", params.invitation_sent.toString());
        if (params?.registered !== undefined)
          queryParams.set("registered", params.registered.toString());
        if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
        if (params?.sort_order)
          queryParams.set("sort_order", params.sort_order);

        const response = await apiClient.get<GetSessionParticipantsResponse>(
          `/sessions/${sessionId}/participants?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to fetch session participants"
          );
        }

        return response;
      },
      enabled: !!sessionId,
      staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
      refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    });
  };

  // Add single participant (Mutation)
  const useAddParticipant = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        data,
      }: {
        sessionId: string;
        data: AddParticipantRequest;
      }) => {
        const response = await apiClient.post<AddParticipantResponse>(
          `/sessions/${sessionId}/participants`,
          data
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to add participant");
        }

        return response;
      },
      onSuccess: (response, { sessionId }) => {
        // Invalidate participants list to refresh
        queryClient.invalidateQueries({
          queryKey: ["session-participants", sessionId],
        });

        // Invalidate sessions list to update participant count
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.lists(),
        });

        // Invalidate specific session to update current_participants
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        // Invalidate available users
        queryClient.invalidateQueries({
          queryKey: ["available-users", sessionId],
        });

        toast.success("Peserta berhasil ditambahkan!");
      },
      onError: (error: Error) => {
        console.error("Add participant error:", error);

        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate")
        ) {
          toast.error("Peserta sudah terdaftar");
        } else if (
          errorMessage.includes("session full") ||
          errorMessage.includes("maximum")
        ) {
          toast.error("Sesi penuh");
        } else if (
          errorMessage.includes("cancelled") ||
          errorMessage.includes("completed")
        ) {
          toast.error("Sesi tidak dapat diubah");
        } else if (errorMessage.includes("inactive")) {
          toast.error("Peserta tidak aktif");
        } else {
          toast.error("Gagal menambah peserta");
        }
      },
    });
  };

  // Bulk add participants (Mutation)
  const useBulkAddParticipants = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        data,
      }: {
        sessionId: string;
        data: BulkAddParticipantsRequest;
      }) => {
        const response = await apiClient.post<BulkAddParticipantsResponse>(
          `/sessions/${sessionId}/participants/bulk`,
          data
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to bulk add participants"
          );
        }

        return response;
      },
      onSuccess: (response, { sessionId }) => {
        // Invalidate participants list
        queryClient.invalidateQueries({
          queryKey: ["session-participants", sessionId],
        });

        // Invalidate sessions list
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.lists(),
        });

        // Invalidate specific session
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        // Invalidate available users
        queryClient.invalidateQueries({
          queryKey: ["available-users", sessionId],
        });

        const { total_added, skipped_participants } = response.data;
        const skippedCount = skipped_participants?.length || 0;

        toast.success("Peserta berhasil ditambahkan!");

        // Show warning if some were skipped
        if (skippedCount > 0) {
          toast.warning(`${skippedCount} peserta dilewati`);
        }
      },
      onError: (error: Error) => {
        console.error("Bulk add participants error:", error);

        toast.error("Gagal menambah peserta");
      },
    });
  };

  // Update participant status (Mutation)
  const useUpdateParticipantStatus = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        participantId,
        data,
      }: {
        sessionId: string;
        participantId: string;
        data: UpdateParticipantStatusRequest;
      }) => {
        const response = await apiClient.put<UpdateParticipantStatusResponse>(
          `/sessions/${sessionId}/participants/${participantId}`,
          data
        );

        if (!response.success) {
          throw new Error(
            response.message || "Failed to update participant status"
          );
        }

        return response;
      },
      onSuccess: (response, { sessionId }) => {
        // Invalidate participants list
        queryClient.invalidateQueries({
          queryKey: ["session-participants", sessionId],
        });

        toast.success("Status peserta berhasil diperbarui!");
      },
      onError: (error: Error) => {
        console.error("Update participant status error:", error);

        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("invalid transition") ||
          errorMessage.includes("status transition")
        ) {
          toast.error("Perubahan status tidak valid");
        } else if (errorMessage.includes("unchanged")) {
          toast.error("Status tidak berubah");
        } else {
          toast.error("Gagal memperbarui status");
        }
      },
    });
  };

  // Remove participant (Mutation)
  const useRemoveParticipant = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        participantId,
      }: {
        sessionId: string;
        participantId: string;
      }) => {
        const response = await apiClient.delete<RemoveParticipantResponse>(
          `/sessions/${sessionId}/participants/${participantId}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to remove participant");
        }

        return response;
      },
      onSuccess: (response, { sessionId }) => {
        // Invalidate participants list
        queryClient.invalidateQueries({
          queryKey: ["session-participants", sessionId],
        });

        // Invalidate sessions list to update participant count
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.lists(),
        });

        // Invalidate specific session
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        toast.success("Peserta berhasil dihapus!");
      },
      onError: (error: Error) => {
        console.error("Remove participant error:", error);

        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("started") ||
          errorMessage.includes("active")
        ) {
          toast.error("Tidak dapat menghapus peserta");
        } else if (errorMessage.includes("completed")) {
          toast.error("Tidak dapat menghapus peserta");
        } else if (
          errorMessage.includes("attempts") ||
          errorMessage.includes("dependencies")
        ) {
          toast.error("Tidak dapat menghapus peserta");
        } else {
          toast.error("Gagal menghapus peserta");
        }
      },
    });
  };

  return {
    // Queries
    useGetSessionParticipants,
    useGetAvailableUsers,

    // Mutations
    useAddParticipant,
    useBulkAddParticipants,
    useUpdateParticipantStatus,
    useRemoveParticipant,
  };
}
