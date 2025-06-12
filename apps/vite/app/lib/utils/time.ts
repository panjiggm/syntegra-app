// apps/vite/app/lib/utils/time.ts
import React from "react";
import {
  formatDistanceToNow,
  formatDuration,
  intervalToDuration,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format time remaining in minutes and seconds
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "00:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Format duration from seconds to human readable format
 */
export function formatDurationFromSeconds(totalSeconds: number): string {
  const duration = intervalToDuration({ start: 0, end: totalSeconds * 1000 });

  if (totalSeconds < 60) {
    return `${totalSeconds} detik`;
  } else if (totalSeconds < 3600) {
    return `${duration.minutes} menit ${duration.seconds || 0} detik`;
  } else {
    return `${duration.hours} jam ${duration.minutes || 0} menit`;
  }
}

/**
 * Calculate time spent from start time
 */
export function calculateTimeSpent(startTime: string | Date): number {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000);
}

/**
 * Calculate time remaining for test
 */
export function calculateTimeRemaining(
  startTime: string | Date,
  timeLimitMinutes: number
): number {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const endTime = new Date(start.getTime() + timeLimitMinutes * 60 * 1000);
  const now = new Date();

  if (isAfter(now, endTime)) {
    return 0;
  }

  return Math.floor((endTime.getTime() - now.getTime()) / 1000);
}

/**
 * Check if test time has expired
 */
export function isTestExpired(
  startTime: string | Date,
  timeLimitMinutes: number
): boolean {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const endTime = new Date(start.getTime() + timeLimitMinutes * 60 * 1000);
  const now = new Date();

  return isAfter(now, endTime);
}

/**
 * Check if test time is nearly expired (within warning threshold)
 */
export function isTestNearlyExpired(
  startTime: string | Date,
  timeLimitMinutes: number,
  warningThresholdMinutes: number = 5
): boolean {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const endTime = new Date(start.getTime() + timeLimitMinutes * 60 * 1000);
  const warningTime = new Date(
    endTime.getTime() - warningThresholdMinutes * 60 * 1000
  );
  const now = new Date();

  return isAfter(now, warningTime) && isBefore(now, endTime);
}

/**
 * Get progress percentage based on time
 */
export function getTimeProgressPercentage(
  startTime: string | Date,
  timeLimitMinutes: number
): number {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const totalTimeMs = timeLimitMinutes * 60 * 1000;
  const elapsedMs = Date.now() - start.getTime();

  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= totalTimeMs) return 100;

  return Math.round((elapsedMs / totalTimeMs) * 100);
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const targetDate = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(targetDate, { addSuffix: true, locale: id });
}

/**
 * Get time status for UI display
 */
export function getTimeStatus(
  startTime: string | Date,
  timeLimitMinutes: number
) {
  const timeRemaining = calculateTimeRemaining(startTime, timeLimitMinutes);
  const isExpired = timeRemaining <= 0;
  const isNearlyExpired = isTestNearlyExpired(startTime, timeLimitMinutes);
  const progressPercentage = getTimeProgressPercentage(
    startTime,
    timeLimitMinutes
  );

  let status: "normal" | "warning" | "danger" | "expired" = "normal";
  let color: string = "text-gray-600";
  let bgColor: string = "bg-gray-100";

  if (isExpired) {
    status = "expired";
    color = "text-red-600";
    bgColor = "bg-red-100";
  } else if (timeRemaining <= 300) {
    // 5 minutes
    status = "danger";
    color = "text-red-600";
    bgColor = "bg-red-100";
  } else if (isNearlyExpired) {
    status = "warning";
    color = "text-yellow-600";
    bgColor = "bg-yellow-100";
  }

  return {
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    isExpired,
    isNearlyExpired,
    progressPercentage,
    status,
    color,
    bgColor,
  };
}

/**
 * Create a countdown timer hook
 */
export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [isActive, setIsActive] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const start = React.useCallback(() => {
    setIsActive(true);
  }, []);

  const pause = React.useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = React.useCallback(
    (newSeconds?: number) => {
      setIsActive(false);
      setSeconds(newSeconds ?? initialSeconds);
    },
    [initialSeconds]
  );

  React.useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, seconds]);

  return {
    seconds,
    formatted: formatTimeRemaining(seconds),
    isActive,
    isExpired: seconds === 0,
    start,
    pause,
    reset,
  };
}

/**
 * Auto-save interval manager
 */
export class AutoSaveManager {
  private intervalId: NodeJS.Timeout | null = null;
  private lastSaveTime: Date | null = null;

  constructor(
    private saveFunction: () => Promise<void> | void,
    private intervalMs: number = 30000 // 30 seconds default
  ) {}

  start() {
    this.stop(); // Clear any existing interval

    this.intervalId = setInterval(async () => {
      try {
        await this.saveFunction();
        this.lastSaveTime = new Date();
      } catch (error) {
        console.warn("Auto-save failed:", error);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  saveNow = async () => {
    try {
      await this.saveFunction();
      this.lastSaveTime = new Date();
    } catch (error) {
      console.error("Manual save failed:", error);
      throw error;
    }
  };

  getLastSaveTime() {
    return this.lastSaveTime;
  }

  getTimeSinceLastSave(): number | null {
    if (!this.lastSaveTime) return null;
    return Math.floor((Date.now() - this.lastSaveTime.getTime()) / 1000);
  }
}
