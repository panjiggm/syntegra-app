"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./useApi";
import type {
  TestData,
  GetTestsRequest,
  GetTestsResponse,
  GetTestByIdResponse,
  CreateTestRequest,
  CreateTestResponse,
  UpdateTestRequest,
  UpdateTestResponse,
  DeleteTestResponse,
  GetTestStatsResponse,
  GetTestFilterOptionsResponse,
  UpdateTestDisplayOrderRequest,
} from "shared-types";

export function useTests() {
  const { apiCall } = useApi();
  const queryClient = useQueryClient();

  // Get all tests with comprehensive filtering
  const useGetTests = (params?: GetTestsRequest) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.module_type) queryParams.set("module_type", params.module_type);
    if (params?.category) queryParams.set("category", params.category);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.time_limit_min)
      queryParams.set("time_limit_min", params.time_limit_min.toString());
    if (params?.time_limit_max)
      queryParams.set("time_limit_max", params.time_limit_max.toString());
    if (params?.total_questions_min)
      queryParams.set(
        "total_questions_min",
        params.total_questions_min.toString()
      );
    if (params?.total_questions_max)
      queryParams.set(
        "total_questions_max",
        params.total_questions_max.toString()
      );
    if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
    if (params?.created_from)
      queryParams.set("created_from", params.created_from);
    if (params?.created_to) queryParams.set("created_to", params.created_to);

    return useQuery({
      queryKey: ["tests", params],
      queryFn: () =>
        apiCall<GetTestsResponse>(`/tests?${queryParams.toString()}`),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get test by ID
  const useGetTestById = (testId: string) => {
    return useQuery({
      queryKey: ["tests", testId],
      queryFn: () => apiCall<GetTestByIdResponse>(`/tests/${testId}`),
      enabled: !!testId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Get test statistics
  const useGetTestStats = () => {
    return useQuery({
      queryKey: ["tests", "stats"],
      queryFn: () => apiCall<GetTestStatsResponse>("/tests/stats/summary"),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Get test filter options
  const useGetTestFilterOptions = () => {
    return useQuery({
      queryKey: ["tests", "filter-options"],
      queryFn: () =>
        apiCall<GetTestFilterOptionsResponse>("/tests/filters/options"),
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  // Create test
  const useCreateTest = () => {
    return useMutation({
      mutationFn: (data: CreateTestRequest) =>
        apiCall<CreateTestResponse>("/tests", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tests"] });
      },
    });
  };

  // Update test
  const useUpdateTest = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateTestRequest }) =>
        apiCall<UpdateTestResponse>(`/tests/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tests"] });
      },
    });
  };

  // Update test display order
  const useUpdateTestDisplayOrder = () => {
    return useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: UpdateTestDisplayOrderRequest;
      }) =>
        apiCall<UpdateTestResponse>(`/tests/${id}/display-order`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tests"] });
      },
    });
  };

  // Delete test
  const useDeleteTest = () => {
    return useMutation({
      mutationFn: (testId: string) =>
        apiCall<DeleteTestResponse>(`/tests/${testId}`, {
          method: "DELETE",
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tests"] });
      },
    });
  };

  return {
    useGetTests,
    useGetTestById,
    useGetTestStats,
    useGetTestFilterOptions,
    useCreateTest,
    useUpdateTest,
    useUpdateTestDisplayOrder,
    useDeleteTest,
  };
}
