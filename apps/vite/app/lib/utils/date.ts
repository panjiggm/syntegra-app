/**
 * Date utilities for consistent date formatting across the application
 * All functions use local timezone to prevent UTC conversion issues
 */

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
