// Buat file baru: apps/vite/app/hooks/use-question-navigation.ts

import { useNavigate } from "react-router";
import { useQuestions } from "./use-questions";

interface NavigationContext {
  currentNumber: number;
  totalQuestions: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

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
  const { useGetQuestions } = useQuestions();

  // Get all questions sorted by sequence
  const { data: questionsData } = useGetQuestions(testId, {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 50, // Get all questions
  });

  const questions = questionsData?.data || [];

  // Find current question index
  const currentQuestionIndex = questions.findIndex(
    (q) => q.id === currentQuestionId
  );

  // Navigation context
  const getNavigationContext = (): NavigationContext => {
    const currentNumber = currentQuestionIndex + 1;
    const totalQuestions = questions.length;
    const hasNext = currentQuestionIndex < questions.length - 1;
    const hasPrevious = currentQuestionIndex > 0;
    const isFirst = currentQuestionIndex === 0;
    const isLast = currentQuestionIndex === questions.length - 1;

    return {
      currentNumber,
      totalQuestions,
      hasNext,
      hasPrevious,
      isFirst,
      isLast,
    };
  };

  // Navigate to specific question
  const navigateToQuestion = (questionId: string) => {
    navigate(`/psikotes/${sessionCode}/test/${testId}/question/${questionId}`);
  };

  // Navigate to next question
  const navigateToNext = () => {
    const context = getNavigationContext();
    if (context.hasNext) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion) {
        navigateToQuestion(nextQuestion.id);
      }
    }
  };

  // Navigate to previous question
  const navigateToPrevious = () => {
    const context = getNavigationContext();
    if (context.hasPrevious) {
      const previousQuestion = questions[currentQuestionIndex - 1];
      if (previousQuestion) {
        navigateToQuestion(previousQuestion.id);
      }
    }
  };

  // Navigate to first question
  const navigateToFirst = () => {
    if (questions.length > 0) {
      navigateToQuestion(questions[0].id);
    }
  };

  // Navigate to last question
  const navigateToLast = () => {
    if (questions.length > 0) {
      navigateToQuestion(questions[questions.length - 1].id);
    }
  };

  // Get question by relative position
  const getQuestionByOffset = (offset: number) => {
    const targetIndex = currentQuestionIndex + offset;
    if (targetIndex >= 0 && targetIndex < questions.length) {
      return questions[targetIndex];
    }
    return null;
  };

  // Navigate by offset
  const navigateByOffset = (offset: number) => {
    const targetQuestion = getQuestionByOffset(offset);
    if (targetQuestion) {
      navigateToQuestion(targetQuestion.id);
    }
  };

  // Get questions around current (for preview)
  const getSurroundingQuestions = (range: number = 2) => {
    const start = Math.max(0, currentQuestionIndex - range);
    const end = Math.min(questions.length, currentQuestionIndex + range + 1);
    return questions.slice(start, end);
  };

  return {
    // Context
    getNavigationContext,
    currentQuestionIndex,
    questions,

    // Navigation methods
    navigateToQuestion,
    navigateToNext,
    navigateToPrevious,
    navigateToFirst,
    navigateToLast,
    navigateByOffset,

    // Utility methods
    getQuestionByOffset,
    getSurroundingQuestions,
  };
}
