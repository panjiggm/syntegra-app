// Buat file baru: apps/vite/app/lib/utils/storage.ts

export const testStorage = {
  // Store attempt data
  setAttemptData: (
    testId: string,
    attemptData: {
      attemptId: string;
      testId: string;
      sessionCode: string;
      startTime: string;
      endTime: string;
      timeLimit: number;
      totalQuestions: number;
    }
  ) => {
    try {
      sessionStorage.setItem(`attempt_${testId}`, attemptData.attemptId);
      sessionStorage.setItem(
        `attempt_data_${testId}`,
        JSON.stringify(attemptData)
      );
      console.log("Attempt data stored successfully:", attemptData);
    } catch (error) {
      console.error("Failed to store attempt data:", error);
    }
  },

  // Get attempt ID
  getAttemptId: (testId: string): string | null => {
    try {
      return sessionStorage.getItem(`attempt_${testId}`);
    } catch (error) {
      console.error("Failed to get attempt ID:", error);
      return null;
    }
  },

  // Get attempt data
  getAttemptData: (testId: string) => {
    try {
      const data = sessionStorage.getItem(`attempt_data_${testId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get attempt data:", error);
      return null;
    }
  },

  // Remove attempt data
  removeAttemptData: (testId: string) => {
    try {
      sessionStorage.removeItem(`attempt_${testId}`);
      sessionStorage.removeItem(`attempt_data_${testId}`);
      console.log("Attempt data removed for test:", testId);
    } catch (error) {
      console.error("Failed to remove attempt data:", error);
    }
  },

  // Store answer draft for offline capabilities
  setAnswerDraft: (attemptId: string, questionId: string, answer: any) => {
    try {
      const key = `draft_${attemptId}_${questionId}`;
      sessionStorage.setItem(
        key,
        JSON.stringify({
          answer,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to store answer draft:", error);
    }
  },

  // Get answer draft
  getAnswerDraft: (attemptId: string, questionId: string) => {
    try {
      const key = `draft_${attemptId}_${questionId}`;
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get answer draft:", error);
      return null;
    }
  },

  // Remove answer draft
  removeAnswerDraft: (attemptId: string, questionId: string) => {
    try {
      const key = `draft_${attemptId}_${questionId}`;
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove answer draft:", error);
    }
  },

  // Store test result temporarily
  setTestResult: (testId: string, result: any) => {
    try {
      sessionStorage.setItem(`test_result_${testId}`, JSON.stringify(result));
    } catch (error) {
      console.error("Failed to store test result:", error);
    }
  },

  // Get test result
  getTestResult: (testId: string) => {
    try {
      const data = sessionStorage.getItem(`test_result_${testId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get test result:", error);
      return null;
    }
  },

  // Check if user has active attempt
  hasActiveAttempt: (testId: string): boolean => {
    const attemptId = testStorage.getAttemptId(testId);
    const attemptData = testStorage.getAttemptData(testId);

    if (!attemptId || !attemptData) {
      return false;
    }

    // Check if attempt is not expired based on stored data
    try {
      const endTime = new Date(attemptData.endTime);
      const now = new Date();
      return now < endTime;
    } catch (error) {
      console.error("Failed to check attempt expiry:", error);
      return false;
    }
  },

  // Clear all test data for cleanup
  clearAllTestData: () => {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (
          key.startsWith("attempt_") ||
          key.startsWith("attempt_data_") ||
          key.startsWith("draft_") ||
          key.startsWith("test_result_")
        ) {
          sessionStorage.removeItem(key);
        }
      });
      console.log("All test data cleared from storage");
    } catch (error) {
      console.error("Failed to clear test data:", error);
    }
  },
};
