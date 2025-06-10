/**
 * Session Utilities for Scheduler and Status Management
 * These utilities help with session status transitions and scheduling
 */

import { SessionStatus } from "./session";

// Session Status Constants
export const SESSION_STATUS = {
  DRAFT: "draft" as const,
  ACTIVE: "active" as const,
  EXPIRED: "expired" as const,
  COMPLETED: "completed" as const,
  CANCELLED: "cancelled" as const,
} as const;

/**
 * Check if a session should be auto-activated (past start_time but not expired)
 */
export function shouldSessionBeActivated(session: {
  start_time: string | Date;
  end_time: string | Date;
  status: string;
}): boolean {
  const now = new Date();
  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);

  return (
    session.status === SESSION_STATUS.DRAFT &&
    now >= startTime &&
    now <= endTime
  );
}

/**
 * Get session duration in hours
 */
export function getSessionDurationHours(
  startTime: string | Date,
  endTime: string | Date
): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  return Math.ceil(durationMs / (1000 * 60 * 60));
}

/**
 * Validate session time range
 */
export function validateSessionTimeRange(
  startTime: string | Date,
  endTime: string | Date
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // Check if end time is after start time
  if (end <= start) {
    errors.push("End time must be after start time");
  }

  // Check if session duration is reasonable (not more than 24 hours)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > 24) {
    errors.push("Session duration cannot exceed 24 hours");
  }

  // Check if session duration is at least 30 minutes
  if (durationHours < 0.5) {
    errors.push("Session duration must be at least 30 minutes");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get next session status based on current status and time
 */
export function getNextSessionStatus(session: {
  start_time: string | Date;
  end_time: string | Date;
  status: string;
  auto_expire?: boolean;
}): SessionStatus {
  const now = new Date();
  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);

  // If manually set to completed or cancelled, keep those statuses
  if (
    session.status === SESSION_STATUS.COMPLETED ||
    session.status === SESSION_STATUS.CANCELLED
  ) {
    return session.status as SessionStatus;
  }

  // If past end time and auto_expire is enabled, mark as expired
  if (now > endTime && (session.auto_expire ?? true)) {
    return SESSION_STATUS.EXPIRED;
  }

  // If past start time but before end time, should be active
  if (
    now >= startTime &&
    now <= endTime &&
    session.status === SESSION_STATUS.DRAFT
  ) {
    return SESSION_STATUS.ACTIVE;
  }

  // Otherwise, keep current status
  return session.status as SessionStatus;
}

/**
 * Format session code for display
 */
export function formatSessionCode(code: string): string {
  return code.toUpperCase();
}

/**
 * Session statistics calculation helpers
 */
export const SessionStatsCalculation = {
  /**
   * Calculate completion rate for a session
   */
  calculateCompletionRate(
    totalParticipants: number,
    completedParticipants: number
  ): number {
    if (totalParticipants === 0) return 0;
    return Math.round((completedParticipants / totalParticipants) * 100);
  },

  /**
   * Calculate attendance rate for a session
   */
  calculateAttendanceRate(
    registeredParticipants: number,
    actualParticipants: number
  ): number {
    if (registeredParticipants === 0) return 0;
    return Math.round((actualParticipants / registeredParticipants) * 100);
  },

  /**
   * Get session progress percentage
   */
  calculateSessionProgress(
    startTime: string | Date,
    endTime: string | Date,
    currentTime: Date = new Date()
  ): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const current = currentTime;

    if (current <= start) return 0;
    if (current >= end) return 100;

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = current.getTime() - start.getTime();

    return Math.round((elapsed / totalDuration) * 100);
  },
};
