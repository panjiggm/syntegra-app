import { isAfter, isBefore, parseISO, isWithinInterval } from "date-fns";

/**
 * Session status type
 */
export type SessionStatus = "draft" | "active" | "completed";

/**
 * Session status with display information
 */
export interface SessionStatusInfo {
  status: SessionStatus;
  label: string;
  variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
  description?: string;
}

/**
 * Determine session status based on current time and session dates
 */
export function getSessionStatus(
  startTime: string | Date,
  endTime: string | Date
): SessionStatus {
  try {
    const now = new Date();
    const start =
      typeof startTime === "string" ? parseISO(startTime) : startTime;
    const end = typeof endTime === "string" ? parseISO(endTime) : endTime;

    // If current time is before start time -> Draft
    if (isBefore(now, start)) {
      return "draft";
    }

    // If current time is after end time -> Completed
    if (isAfter(now, end)) {
      return "completed";
    }

    // If current time is between start and end -> Active
    if (isWithinInterval(now, { start, end })) {
      return "active";
    }

    // Fallback to draft if unable to determine
    return "draft";
  } catch (error) {
    console.error("Error determining session status:", error);
    return "draft";
  }
}

/**
 * Get session status with display information for UI components
 */
export function getSessionStatusInfo(
  startTime: string | Date,
  endTime: string | Date
): SessionStatusInfo {
  const status = getSessionStatus(startTime, endTime);

  switch (status) {
    case "draft":
      return {
        status: "draft",
        label: "Draft",
        variant: "secondary",
        description: "Sesi belum dimulai",
      };
    case "active":
      return {
        status: "active",
        label: "Active",
        variant: "success",
        description: "Sesi sedang berlangsung",
      };
    case "completed":
      return {
        status: "completed",
        label: "Completed",
        variant: "default",
        description: "Sesi telah selesai",
      };
    default:
      return {
        status: "draft",
        label: "Draft",
        variant: "secondary",
        description: "Status tidak diketahui",
      };
  }
}

/**
 * Get remaining time until session ends in minutes
 */
export function getSessionTimeRemaining(endTime: string): number {
  if (!endTime) return 0;

  try {
    const end = parseISO(endTime);
    const now = new Date();

    if (isAfter(now, end)) {
      return 0; // Session has ended
    }

    const diffMs = end.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return Math.max(0, diffMinutes);
  } catch (error) {
    console.error("Error calculating remaining time:", error);
    return 0;
  }
}

/**
 * Format session status for display
 */
export function getSessionStatusLabel(
  startTime: string,
  endTime: string,
  status?: string
): string {
  if (status === "cancelled") return "Dibatalkan";
  if (status === "completed") return "Selesai";

  if (hasSessionEnded(endTime)) return "Berakhir";
  if (isSessionActive(startTime, endTime)) return "Aktif";
  if (!hasSessionStarted(startTime)) return "Belum Dimulai";

  return "Draft";
}

/**
 * Get session status color for UI
 */
export function getSessionStatusColor(
  startTime: string,
  endTime: string,
  status?: string
): string {
  if (status === "cancelled") return "text-red-600 bg-red-50";
  if (status === "completed") return "text-green-600 bg-green-50";

  if (hasSessionEnded(endTime)) return "text-gray-600 bg-gray-50";
  if (isSessionActive(startTime, endTime)) return "text-green-600 bg-green-50";
  if (!hasSessionStarted(startTime)) return "text-yellow-600 bg-yellow-50";

  return "text-blue-600 bg-blue-50";
}

/**
 * Check if session has started
 */
export function hasSessionStarted(startTime: string | Date): boolean {
  try {
    const now = new Date();
    const start =
      typeof startTime === "string" ? parseISO(startTime) : startTime;
    return isAfter(now, start) || now.getTime() === start.getTime();
  } catch (error) {
    console.error("Error checking if session has started:", error);
    return false;
  }
}

/**
 * Check if session has ended
 */
export function hasSessionEnded(endTime: string | Date): boolean {
  try {
    const now = new Date();
    const end = typeof endTime === "string" ? parseISO(endTime) : endTime;
    return isAfter(now, end);
  } catch (error) {
    console.error("Error checking if session has ended:", error);
    return false;
  }
}

/**
 * Check if session is currently active (between start and end time)
 */
export function isSessionActive(
  startTime: string | Date,
  endTime: string | Date
): boolean {
  return getSessionStatus(startTime, endTime) === "active";
}

/**
 * Get time remaining until session starts (in milliseconds)
 * Returns negative if session has already started
 */
export function getTimeUntilSessionStarts(startTime: string | Date): number {
  try {
    const now = new Date();
    const start =
      typeof startTime === "string" ? parseISO(startTime) : startTime;
    return start.getTime() - now.getTime();
  } catch (error) {
    console.error("Error calculating time until session starts:", error);
    return 0;
  }
}

/**
 * Get time remaining until session ends (in milliseconds)
 * Returns negative if session has already ended
 */
export function getTimeUntilSessionEnds(endTime: string | Date): number {
  try {
    const now = new Date();
    const end = typeof endTime === "string" ? parseISO(endTime) : endTime;
    return end.getTime() - now.getTime();
  } catch (error) {
    console.error("Error calculating time until session ends:", error);
    return 0;
  }
}
