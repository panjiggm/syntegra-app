import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Define types locally for now (to be replaced with shared-types later)
interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "participant";
  nik?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  birth_place?: string;
  birth_date?: string;
  religion?: string;
  education?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  postal_code?: string;
}

interface User {
  id: string;
  nik: string | null;
  name: string;
  role: string;
  email: string;
  gender: string | null;
  phone: string | null;
  birth_place: string | null;
  birth_date: Date | null;
  religion: string | null;
  education: string | null;
  address: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  postal_code: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: Date;
  updated_by: Date;
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  data?: User;
  timestamp: string;
}

// Additional types for better API integration
interface GetUsersRequest {
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "participant";
  gender?: "male" | "female" | "other";
  religion?: string;
  education?: string;
  province?: string;
  regency?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  created_from?: string;
  created_to?: string;
}

export interface GetUsersResponse {
  success: boolean;
  message: string;
  data: User[];
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

export function useUsers() {
  const queryClient = useQueryClient();

  // Get all users with filters (Query)
  const useGetUsers = (params?: GetUsersRequest) => {
    return useQuery({
      queryKey: queryKeys.users.list(params),
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.role) queryParams.set("role", params.role);
        if (params?.gender) queryParams.set("gender", params.gender);
        if (params?.religion) queryParams.set("religion", params.religion);
        if (params?.education) queryParams.set("education", params.education);
        if (params?.province) queryParams.set("province", params.province);
        if (params?.regency) queryParams.set("regency", params.regency);
        if (params?.is_active !== undefined)
          queryParams.set("is_active", params.is_active.toString());
        if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
        if (params?.sort_order)
          queryParams.set("sort_order", params.sort_order);
        if (params?.created_from)
          queryParams.set("created_from", params.created_from);
        if (params?.created_to)
          queryParams.set("created_to", params.created_to);

        const response = await apiClient.get<GetUsersResponse>(
          `/users?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch users");
        }

        return response;
      },
      enabled: true,
    });
  };

  // Get user by ID (Query)
  const useGetUserById = (userId: string) => {
    return useQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: async () => {
        const response = await apiClient.get(`/users/${userId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to get user");
        }
        return response.data;
      },
      enabled: !!userId,
    });
  };

  // Create admin (Mutation)
  const useCreateAdmin = () => {
    return useMutation({
      mutationFn: async (data: Omit<CreateUserRequest, "role">) => {
        const adminData: CreateUserRequest = {
          ...data,
          role: "admin",
        };

        const response = await apiClient.post<CreateUserResponse>(
          "/users",
          adminData
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create admin");
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        // Show success toast
        toast.success("Admin berhasil dibuat!");
      },
      onError: (error: Error) => {
        // Handle specific error cases
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("email") && errorMessage.includes("exist")) {
          toast.error("Email sudah terdaftar");
        } else if (
          errorMessage.includes("admin") &&
          errorMessage.includes("limit")
        ) {
          toast.error("Batas admin tercapai");
        } else {
          toast.error("Gagal membuat admin");
        }
      },
    });
  };

  // Create participant (Mutation)
  const useCreateParticipant = () => {
    return useMutation({
      mutationFn: async (data: Omit<CreateUserRequest, "role">) => {
        const participantData: CreateUserRequest = {
          ...data,
          role: "participant",
        };

        const response = await apiClient.post<CreateUserResponse>(
          "/users",
          participantData
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create participant");
        }
        return response;
      },
      onSuccess: () => {
        // Invalidate users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("Peserta berhasil didaftarkan!");
      },
      onError: (error: Error) => {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("email")) {
          toast.error("Email sudah terdaftar");
        } else if (errorMessage.includes("nik")) {
          toast.error("NIK sudah terdaftar");
        } else if (errorMessage.includes("phone")) {
          toast.error("Nomor telepon sudah terdaftar");
        } else {
          toast.error("Gagal mendaftarkan peserta");
        }
      },
    });
  };

  // Update user (Mutation)
  const useUpdateUser = () => {
    return useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: Partial<CreateUserRequest>;
      }) => {
        const response = await apiClient.put(`/users/${id}`, data);
        if (!response.success) {
          throw new Error(response.message || "Failed to update user");
        }
        return response;
      },
      onSuccess: (_, variables) => {
        // Invalidate specific user and users list
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("User berhasil diupdate!");
      },
      onError: (error: Error) => {
        toast.error("Gagal update user: " + error.message);
      },
    });
  };

  // Delete user (Mutation)
  const useDeleteUser = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const response = await apiClient.delete(`/users/${userId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to delete user");
        }
        return response;
      },
      onSuccess: () => {
        // Invalidate users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("User berhasil dihapus");
      },
      onError: (error: Error) => {
        toast.error("Gagal menghapus user: " + error.message);
      },
    });
  };

  return {
    // Queries
    useGetUsers,
    useGetUserById,

    // Mutations
    useCreateAdmin,
    useCreateParticipant,
    useUpdateUser,
    useDeleteUser,
  };
}
