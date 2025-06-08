"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "./useApi";
import {
  USER_DETAIL_CONSTANTS,
  type UserDetailResponse,
  type UserDetailData,
} from "shared-types";

export function useUserDetail() {
  const { apiCall } = useApi();

  // Get user detail by ID
  const useGetUserDetail = (userId: string) => {
    return useQuery({
      queryKey: ["user-detail", userId],
      queryFn: () => apiCall<UserDetailResponse>(`/users/${userId}/details`),
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 403/404 errors
        if (error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

  return {
    useGetUserDetail,
  };
}

// Helper functions for formatting data using shared constants
export const userDetailHelpers = {
  formatGender: (gender: string) => {
    return (
      USER_DETAIL_CONSTANTS.GENDER_LABELS[
        gender as keyof typeof USER_DETAIL_CONSTANTS.GENDER_LABELS
      ] || gender
    );
  },

  formatReligion: (religion: string | null) => {
    if (!religion) return "-";
    return (
      USER_DETAIL_CONSTANTS.RELIGION_LABELS[
        religion as keyof typeof USER_DETAIL_CONSTANTS.RELIGION_LABELS
      ] || religion
    );
  },

  formatEducation: (education: string | null) => {
    if (!education) return "-";
    return (
      USER_DETAIL_CONSTANTS.EDUCATION_LABELS[
        education as keyof typeof USER_DETAIL_CONSTANTS.EDUCATION_LABELS
      ] || education
    );
  },

  getStatusBadge: (status: string) => {
    const label =
      USER_DETAIL_CONSTANTS.STATUS_LABELS[
        status as keyof typeof USER_DETAIL_CONSTANTS.STATUS_LABELS
      ] || status;
    const className =
      USER_DETAIL_CONSTANTS.STATUS_COLORS[
        status as keyof typeof USER_DETAIL_CONSTANTS.STATUS_COLORS
      ] || USER_DETAIL_CONSTANTS.STATUS_COLORS.expired;
    return { label, className };
  },

  getCategoryColor: (category: string) => {
    return (
      USER_DETAIL_CONSTANTS.CATEGORY_COLORS[
        category as keyof typeof USER_DETAIL_CONSTANTS.CATEGORY_COLORS
      ] || USER_DETAIL_CONSTANTS.CATEGORY_COLORS.default
    );
  },

  formatAddress: (address: UserDetailData["personal_info"]["address"]) => {
    const parts = [
      address.full_address,
      address.village,
      address.district,
      address.regency,
      address.province,
      address.postal_code,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "-";
  },

  calculateCompletionRate: (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  formatDuration: (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  },

  getPerformanceColor: (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  },

  getGradeColor: (grade: string | undefined) => {
    if (!grade) return "text-gray-600";
    return (
      USER_DETAIL_CONSTANTS.GRADE_COLORS[
        grade as keyof typeof USER_DETAIL_CONSTANTS.GRADE_COLORS
      ] || "text-gray-600"
    );
  },
};
