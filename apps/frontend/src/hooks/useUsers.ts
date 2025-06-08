"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./useApi";
import type {
  UserData,
  GetUsersRequest,
  GetUsersResponse,
  GetUserByIdResponse,
  DeleteUserResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
} from "shared-types";

export function useUsers() {
  const { apiCall } = useApi();
  const queryClient = useQueryClient();

  // Get all users with comprehensive filtering
  const useGetUsers = (params?: GetUsersRequest) => {
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
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
    if (params?.created_from)
      queryParams.set("created_from", params.created_from);
    if (params?.created_to) queryParams.set("created_to", params.created_to);

    return useQuery({
      queryKey: ["users", params],
      queryFn: () =>
        apiCall<GetUsersResponse>(`/users?${queryParams.toString()}`),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get user by ID
  const useGetUserById = (userId: string) => {
    return useQuery({
      queryKey: ["users", userId],
      queryFn: () => apiCall<GetUserByIdResponse>(`/users/${userId}`),
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create user
  const useCreateUser = () => {
    return useMutation({
      mutationFn: (data: CreateUserRequest) =>
        apiCall<CreateUserResponse>("/users", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
    });
  };

  // Update user
  const useUpdateUser = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
        apiCall<UpdateUserResponse>(`/users/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
    });
  };

  // Delete user
  const useDeleteUser = () => {
    return useMutation({
      mutationFn: (userId: string) =>
        apiCall<DeleteUserResponse>(`/users/${userId}`, {
          method: "DELETE",
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
    });
  };

  return {
    useGetUsers,
    useGetUserById,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
  };
}
