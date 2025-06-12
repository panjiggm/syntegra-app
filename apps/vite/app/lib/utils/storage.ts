// apps/vite/app/lib/utils/storage.ts

/**
 * Local storage utilities for test attempt data
 */

interface AttemptData {
  attemptId: string;
  testId: string;
  sessionCode: string;
  startTime: string;
  timeLimit: number;
  currentQuestionId?: string;
  answers: Record<string, any>;
  timeSpent: number;
  lastActivity: string;
}

interface SessionProgress {
  sessionCode: string;
  completedTests: string[];
  currentTestId?: string;
  totalTests: number;
  lastActivity: string;
}

class TestStorageManager {
  private static instance: TestStorageManager;
  private readonly ATTEMPT_PREFIX = "psikotes_attempt_";
  private readonly SESSION_PREFIX = "psikotes_session_";
  private readonly ANSWER_PREFIX = "psikotes_answers_";
  private readonly TEMP_DATA_PREFIX = "psikotes_temp_";

  static getInstance(): TestStorageManager {
    if (!TestStorageManager.instance) {
      TestStorageManager.instance = new TestStorageManager();
    }
    return TestStorageManager.instance;
  }

  /**
   * Store attempt data
   */
  storeAttemptData(testId: string, data: AttemptData): void {
    try {
      const key = `${this.ATTEMPT_PREFIX}${testId}`;
      const dataWithTimestamp = {
        ...data,
        lastActivity: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.warn("Failed to store attempt data:", error);
    }
  }

  /**
   * Get attempt data
   */
  getAttemptData(testId: string): AttemptData | null {
    try {
      const key = `${this.ATTEMPT_PREFIX}${testId}`;
      const data = localStorage.getItem(key);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.warn("Failed to get attempt data:", error);
      return null;
    }
  }

  /**
   * Remove attempt data
   */
  removeAttemptData(testId: string): void {
    try {
      const key = `${this.ATTEMPT_PREFIX}${testId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove attempt data:", error);
    }
  }

  /**
   * Store answers for a specific test
   */
  storeAnswers(
    sessionCode: string,
    testId: string,
    answers: Record<string, any>
  ): void {
    try {
      const key = `${this.ANSWER_PREFIX}${sessionCode}_${testId}`;
      const data = {
        answers,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to store answers:", error);
    }
  }

  /**
   * Get answers for a specific test
   */
  getAnswers(sessionCode: string, testId: string): Record<string, any> {
    try {
      const key = `${this.ANSWER_PREFIX}${sessionCode}_${testId}`;
      const data = localStorage.getItem(key);
      if (!data) return {};

      const parsed = JSON.parse(data);
      return parsed.answers || {};
    } catch (error) {
      console.warn("Failed to get answers:", error);
      return {};
    }
  }

  /**
   * Store single answer
   */
  storeAnswer(
    sessionCode: string,
    testId: string,
    questionId: string,
    answer: any
  ): void {
    const currentAnswers = this.getAnswers(sessionCode, testId);
    currentAnswers[questionId] = {
      answer,
      timestamp: new Date().toISOString(),
    };
    this.storeAnswers(sessionCode, testId, currentAnswers);
  }

  /**
   * Get single answer
   */
  getAnswer(sessionCode: string, testId: string, questionId: string): any {
    const answers = this.getAnswers(sessionCode, testId);
    return answers[questionId]?.answer || null;
  }

  /**
   * Store session progress
   */
  storeSessionProgress(
    sessionCode: string,
    progress: Omit<SessionProgress, "sessionCode">
  ): void {
    try {
      const key = `${this.SESSION_PREFIX}${sessionCode}`;
      const data = {
        sessionCode,
        ...progress,
        lastActivity: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to store session progress:", error);
    }
  }

  /**
   * Get session progress
   */
  getSessionProgress(sessionCode: string): SessionProgress | null {
    try {
      const key = `${this.SESSION_PREFIX}${sessionCode}`;
      const data = localStorage.getItem(key);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.warn("Failed to get session progress:", error);
      return null;
    }
  }

  /**
   * Mark test as completed in session
   */
  markTestCompleted(sessionCode: string, testId: string): void {
    const progress = this.getSessionProgress(sessionCode) || {
      completedTests: [] as string[],
      totalTests: 0,
      lastActivity: new Date().toISOString(),
    };

    if (!progress.completedTests.includes(testId)) {
      progress.completedTests.push(testId);
    }

    this.storeSessionProgress(sessionCode, progress);
  }

  /**
   * Store temporary data (e.g., form drafts, unsaved changes)
   */
  storeTempData(key: string, data: any): void {
    try {
      const fullKey = `${this.TEMP_DATA_PREFIX}${key}`;
      const dataWithTimestamp = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(fullKey, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.warn("Failed to store temp data:", error);
    }
  }

  /**
   * Get temporary data
   */
  getTempData(key: string): any {
    try {
      const fullKey = `${this.TEMP_DATA_PREFIX}${key}`;
      const stored = localStorage.getItem(fullKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Check if data is too old (e.g., more than 24 hours)
      const dataAge = Date.now() - new Date(parsed.timestamp).getTime();
      if (dataAge > 24 * 60 * 60 * 1000) {
        this.removeTempData(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn("Failed to get temp data:", error);
      return null;
    }
  }

  /**
   * Remove temporary data
   */
  removeTempData(key: string): void {
    try {
      const fullKey = `${this.TEMP_DATA_PREFIX}${key}`;
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.warn("Failed to remove temp data:", error);
    }
  }

  /**
   * Clean up expired data
   */
  cleanupExpiredData(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      keys.forEach((key) => {
        if (
          key.startsWith(this.ATTEMPT_PREFIX) ||
          key.startsWith(this.SESSION_PREFIX) ||
          key.startsWith(this.ANSWER_PREFIX)
        ) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              const lastActivity = new Date(
                parsed.lastActivity || parsed.lastUpdated || parsed.timestamp
              );
              const age = now - lastActivity.getTime();

              if (age > maxAge) {
                localStorage.removeItem(key);
                console.log(`Cleaned up expired data: ${key}`);
              }
            }
          } catch (error) {
            // If we can't parse the data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn("Failed to cleanup expired data:", error);
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalItems: number;
    attemptItems: number;
    sessionItems: number;
    answerItems: number;
    tempItems: number;
    totalSizeKB: number;
  } {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    let attemptItems = 0;
    let sessionItems = 0;
    let answerItems = 0;
    let tempItems = 0;

    keys.forEach((key) => {
      const value = localStorage.getItem(key) || "";
      totalSize += key.length + value.length;

      if (key.startsWith(this.ATTEMPT_PREFIX)) attemptItems++;
      else if (key.startsWith(this.SESSION_PREFIX)) sessionItems++;
      else if (key.startsWith(this.ANSWER_PREFIX)) answerItems++;
      else if (key.startsWith(this.TEMP_DATA_PREFIX)) tempItems++;
    });

    return {
      totalItems: keys.length,
      attemptItems,
      sessionItems,
      answerItems,
      tempItems,
      totalSizeKB: Math.round((totalSize / 1024) * 100) / 100,
    };
  }

  /**
   * Clear all test-related data
   */
  clearAllTestData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.startsWith(this.ATTEMPT_PREFIX) ||
          key.startsWith(this.SESSION_PREFIX) ||
          key.startsWith(this.ANSWER_PREFIX) ||
          key.startsWith(this.TEMP_DATA_PREFIX)
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear test data:", error);
    }
  }

  /**
   * Export all test data (for backup)
   */
  exportTestData(): string {
    try {
      const keys = Object.keys(localStorage);
      const testData: Record<string, any> = {};

      keys.forEach((key) => {
        if (
          key.startsWith(this.ATTEMPT_PREFIX) ||
          key.startsWith(this.SESSION_PREFIX) ||
          key.startsWith(this.ANSWER_PREFIX)
        ) {
          testData[key] = localStorage.getItem(key);
        }
      });

      return JSON.stringify({
        exportDate: new Date().toISOString(),
        data: testData,
      });
    } catch (error) {
      console.warn("Failed to export test data:", error);
      return "{}";
    }
  }

  /**
   * Import test data (from backup)
   */
  importTestData(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      const data = parsed.data || {};

      Object.entries(data).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          (key.startsWith(this.ATTEMPT_PREFIX) ||
            key.startsWith(this.SESSION_PREFIX) ||
            key.startsWith(this.ANSWER_PREFIX))
        ) {
          localStorage.setItem(key, value);
        }
      });

      return true;
    } catch (error) {
      console.warn("Failed to import test data:", error);
      return false;
    }
  }
}

// Export singleton instance
export const testStorage = TestStorageManager.getInstance();

// Export types
export type { AttemptData, SessionProgress };

// Cleanup expired data on load
if (typeof window !== "undefined") {
  // Run cleanup when the module loads
  setTimeout(() => {
    testStorage.cleanupExpiredData();
  }, 1000);

  // Run cleanup periodically (every hour)
  setInterval(
    () => {
      testStorage.cleanupExpiredData();
    },
    60 * 60 * 1000
  );
}
