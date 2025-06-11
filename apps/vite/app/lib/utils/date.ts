/**
 * Date utilities for consistent date formatting across the application
 * All functions use local timezone to prevent UTC conversion issues
 */

import { parseISO } from "date-fns";

export const formatTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "--:--";
  }
};

export const formatDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "Invalid Date";
  }
};

/**
 * Get date string in YYYY-MM-DD format using local timezone
 * This is used for date comparisons to avoid UTC conversion issues
 */
export const getLocalDateString = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("sv-SE"); // YYYY-MM-DD format
  } catch (error) {
    console.error("Error getting local date string:", error);
    return "";
  }
};

/**
 * Check if two dates are the same day in local timezone
 */
export const isSameLocalDate = (
  date1: string | Date,
  date2: string | Date
): boolean => {
  return getLocalDateString(date1) === getLocalDateString(date2);
};

/**
 * Format date for Indonesian long format
 */
export const formatDateLong = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting long date:", error);
    return "Invalid Date";
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffMinutes) < 1) {
      return "Sekarang";
    } else if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0
        ? `dalam ${diffMinutes} menit`
        : `${Math.abs(diffMinutes)} menit lalu`;
    } else if (Math.abs(diffHours) < 24) {
      return diffHours > 0
        ? `dalam ${diffHours} jam`
        : `${Math.abs(diffHours)} jam lalu`;
    } else {
      return diffDays > 0
        ? `dalam ${diffDays} hari`
        : `${Math.abs(diffDays)} hari lalu`;
    }
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "-";
  }
}

/**
 * Get duration between two dates in minutes
 */
export function getDurationInMinutes(
  startDate: string | Date,
  endDate: string | Date
): number {
  try {
    const start =
      typeof startDate === "string" ? parseISO(startDate) : startDate;
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60));
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${remainingMinutes} menit`;
}
