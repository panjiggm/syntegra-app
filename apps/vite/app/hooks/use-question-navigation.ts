import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useQuestions } from "./use-questions";
import { useTestAttempt } from "./use-test-attempt";

interface UseQuestionNavigationProps {
  sessionCode: string;
  testId: string;
  currentQuestionId: string;
  attemptId: string;
}

export function useQuestionNavigation({
  sessionCode,
  testId,
  currentQuestionId,
  attemptId,
}: UseQuestionNavigationProps) {
  const navigate = useNavigate();

  // States
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Hooks
  const { useGetQuestions } = useQuestions();
  const { useGetAttemptProgress, useFinishAttempt } = useTestAttempt();

  // Queries
  const questionsQuery = useGetQuestions(testId, {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 100,
  });

  const progressQuery = useGetAttemptProgress(attemptId);
  const finishAttempt = useFinishAttempt();

  const questions = questionsQuery.data?.data || [];
  const progress = progressQuery.data;

  // Track navigation history
  useEffect(() => {
    setNavigationHistory((prev) => {
      const newHistory = [...prev];
      const lastQuestion = newHistory[newHistory.length - 1];

      if (lastQuestion !== currentQuestionId) {
        newHistory.push(currentQuestionId);

        // Keep only last 10 questions in history
        if (newHistory.length > 10) {
          newHistory.shift();
        }
      }

      return newHistory;
    });
  }, [currentQuestionId]);

  // Get question metadata
  const getQuestionMeta = useCallback(() => {
    const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);
    const currentQuestion = questions[currentIndex];

    return {
      currentIndex,
      currentQuestion,
      currentNumber: currentIndex + 1,
      totalQuestions: questions.length,
      isFirst: currentIndex === 0,
      isLast: currentIndex === questions.length - 1,
      hasNext: currentIndex < questions.length - 1,
      hasPrevious: currentIndex > 0,
      nextQuestion:
        currentIndex < questions.length - 1
          ? questions[currentIndex + 1]
          : null,
      previousQuestion: currentIndex > 0 ? questions[currentIndex - 1] : null,
    };
  }, [questions, currentQuestionId]);

  // Navigate to specific question
  const navigateToQuestion = useCallback(
    (questionId: string) => {
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${questionId}`
      );
    },
    [navigate, sessionCode, testId]
  );

  // Navigate to next question
  const navigateToNext = useCallback(() => {
    const meta = getQuestionMeta();

    if (meta.hasNext && meta.nextQuestion) {
      navigateToQuestion(meta.nextQuestion.id);
    } else if (meta.isLast) {
      // This is the last question, handle test completion
      return handleTestCompletion();
    }
  }, [getQuestionMeta, navigateToQuestion]);

  // Navigate to previous question
  const navigateToPrevious = useCallback(() => {
    const meta = getQuestionMeta();

    if (meta.hasPrevious && meta.previousQuestion) {
      navigateToQuestion(meta.previousQuestion.id);
    }
  }, [getQuestionMeta, navigateToQuestion]);

  // Navigate to first unanswered question
  const navigateToFirstUnanswered = useCallback(() => {
    // This would need additional data about which questions are answered
    // For now, navigate to first question
    if (questions.length > 0) {
      navigateToQuestion(questions[0].id);
    }
  }, [questions, navigateToQuestion]);

  // Navigate to last question
  const navigateToLast = useCallback(() => {
    if (questions.length > 0) {
      const lastQuestion = questions[questions.length - 1];
      navigateToQuestion(lastQuestion.id);
    }
  }, [questions, navigateToQuestion]);

  // Navigate to first question
  const navigateToFirst = useCallback(() => {
    if (questions.length > 0) {
      navigateToQuestion(questions[0].id);
    }
  }, [questions, navigateToQuestion]);

  // Navigate by sequence number
  const navigateBySequence = useCallback(
    (sequenceNumber: number) => {
      const questionIndex = sequenceNumber - 1; // Convert to 0-based index

      if (questionIndex >= 0 && questionIndex < questions.length) {
        const question = questions[questionIndex];
        navigateToQuestion(question.id);
      }
    },
    [questions, navigateToQuestion]
  );

  // Navigate to random unanswered question
  const navigateToRandomUnanswered = useCallback(() => {
    // This would need answered questions data
    // For now, just navigate to a random question
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      navigateToQuestion(questions[randomIndex].id);
    }
  }, [questions, navigateToQuestion]);

  // Handle test completion
  const handleTestCompletion = useCallback(async () => {
    if (!progress) {
      console.error("No progress data available");
      return false;
    }

    try {
      const result = await finishAttempt.mutateAsync({
        attemptId,
        data: {
          completion_type: "completed",
          questions_answered: progress.questions_answered,
          time_spent: progress.time_spent || 0,
          final_browser_info: {
            completedAt: new Date().toISOString(),
            finalUrl: window.location.href,
          },
        },
      });

      // Clear session storage
      sessionStorage.removeItem(`attempt_${testId}`);

      // Navigate based on result
      if (result.next_test) {
        // There's another test in the session
        navigate(`/psikotes/${sessionCode}/test/${result.next_test.id}`);
      } else {
        // All tests completed
        navigate(`/psikotes/${sessionCode}/test/complete`);
      }

      return true;
    } catch (error) {
      console.error("Failed to complete test:", error);
      return false;
    }
  }, [progress, finishAttempt, attemptId, navigate, sessionCode, testId]);

  // Go back in navigation history
  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      // Get the previous question from history (excluding current)
      const previousQuestionId =
        navigationHistory[navigationHistory.length - 2];

      // Remove current and previous from history to avoid loops
      setNavigationHistory((prev) => prev.slice(0, -2));

      navigateToQuestion(previousQuestionId);
    } else {
      navigateToPrevious();
    }
  }, [navigationHistory, navigateToQuestion, navigateToPrevious]);

  // Get navigation context for UI
  const getNavigationContext = useCallback(() => {
    const meta = getQuestionMeta();

    return {
      ...meta,
      progress: {
        answered: progress?.questions_answered || 0,
        total: questions.length,
        percentage: progress?.progress_percentage || 0,
        timeRemaining: progress?.time_remaining || 0,
        canContinue: progress?.can_continue ?? true,
        isExpired: progress?.is_expired ?? false,
      },
      navigation: {
        hasHistory: navigationHistory.length > 1,
        canGoBack: navigationHistory.length > 1 || meta.hasPrevious,
        canGoForward: meta.hasNext,
        historyLength: navigationHistory.length,
      },
    };
  }, [getQuestionMeta, progress, questions.length, navigationHistory]);

  // Bulk navigation operations
  const bulkNavigation = {
    // Skip to end
    skipToEnd: () => navigateToLast(),

    // Skip n questions forward
    skipForward: (count: number) => {
      const meta = getQuestionMeta();
      const targetIndex = Math.min(
        meta.currentIndex + count,
        questions.length - 1
      );
      if (targetIndex >= 0 && targetIndex < questions.length) {
        navigateToQuestion(questions[targetIndex].id);
      }
    },

    // Skip n questions backward
    skipBackward: (count: number) => {
      const meta = getQuestionMeta();
      const targetIndex = Math.max(meta.currentIndex - count, 0);
      if (targetIndex >= 0 && targetIndex < questions.length) {
        navigateToQuestion(questions[targetIndex].id);
      }
    },

    // Jump to percentage of test
    jumpToPercentage: (percentage: number) => {
      const targetIndex = Math.floor((percentage / 100) * questions.length);
      const clampedIndex = Math.max(
        0,
        Math.min(targetIndex, questions.length - 1)
      );
      if (clampedIndex >= 0 && clampedIndex < questions.length) {
        navigateToQuestion(questions[clampedIndex].id);
      }
    },
  };

  return {
    // Basic navigation
    navigateToNext,
    navigateToPrevious,
    navigateToQuestion,
    navigateToFirst,
    navigateToLast,
    navigateBySequence,

    // Advanced navigation
    navigateToFirstUnanswered,
    navigateToRandomUnanswered,
    goBack,
    handleTestCompletion,

    // Bulk operations
    ...bulkNavigation,

    // Context and state
    getQuestionMeta,
    getNavigationContext,
    navigationHistory,

    // Data
    questions,
    progress,

    // Loading states
    isLoadingQuestions: questionsQuery.isLoading,
    isLoadingProgress: progressQuery.isLoading,
    isFinishing: finishAttempt.isPending,
  };
}
