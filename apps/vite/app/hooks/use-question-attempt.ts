import { useState, useEffect, useCallback, useRef } from "react";
import { useTestAttempt } from "./use-test-attempt";
import { toast } from "sonner";

interface UseQuestionAttemptProps {
  attemptId: string;
  questionId: string;
  onAnswerSaved?: (answer: any) => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  autoSaveDelay?: number; // milliseconds
}

export function useQuestionAttempt({
  attemptId,
  questionId,
  onAnswerSaved,
  onNavigateNext,
  onNavigatePrevious,
  autoSaveDelay = 3000,
}: UseQuestionAttemptProps) {
  // States
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerData, setAnswerData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);

  // Refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeTrackingRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { useGetAnswer, useSubmitAnswer, useAutoSave } = useTestAttempt();

  // Queries and mutations
  const answerQuery = useGetAnswer(attemptId, questionId);
  const submitAnswer = useSubmitAnswer();
  const autoSave = useAutoSave();

  // Initialize question start time
  useEffect(() => {
    setQuestionStartTime(new Date());
    setTimeSpent(0);
  }, [questionId]);

  // Track time spent on current question
  useEffect(() => {
    if (questionStartTime) {
      timeTrackingRef.current = setInterval(() => {
        setTimeSpent(
          Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
        );
      }, 1000);
    }

    return () => {
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current);
      }
    };
  }, [questionStartTime]);

  // Load existing answer when question changes
  useEffect(() => {
    if (answerQuery.data?.answer) {
      const existingAnswer = answerQuery.data.answer;

      if (existingAnswer.answer) {
        setSelectedAnswer(existingAnswer.answer);
      }

      if (existingAnswer.answer_data) {
        setAnswerData(existingAnswer.answer_data);
      }

      if (existingAnswer.confidence_level) {
        setConfidenceLevel(existingAnswer.confidence_level);
      }

      setHasUnsavedChanges(false);
    } else {
      // Reset form for new question
      setSelectedAnswer("");
      setAnswerData(null);
      setConfidenceLevel(null);
      setHasUnsavedChanges(false);
    }
  }, [questionId, answerQuery.data]);

  // Auto-save function
  const triggerAutoSave = useCallback(async () => {
    if (!attemptId || (!selectedAnswer.trim() && !answerData) || isAutoSaving) {
      return;
    }

    setIsAutoSaving(true);

    try {
      await autoSave.mutateAsync({
        attemptId,
        data: {
          question_id: questionId,
          answer: selectedAnswer || undefined,
          answer_data: answerData || undefined,
          time_taken: timeSpent,
          confidence_level: confidenceLevel || undefined,
        },
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    attemptId,
    questionId,
    selectedAnswer,
    answerData,
    timeSpent,
    confidenceLevel,
    autoSave,
    isAutoSaving,
  ]);

  // Auto-save with debounce
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        triggerAutoSave();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, triggerAutoSave, autoSaveDelay]);

  // Handle answer change
  const handleAnswerChange = useCallback((value: string) => {
    setSelectedAnswer(value);
    setHasUnsavedChanges(true);
  }, []);

  // Handle answer data change (for complex questions)
  const handleAnswerDataChange = useCallback((data: any) => {
    setAnswerData(data);
    setHasUnsavedChanges(true);
  }, []);

  // Handle confidence level change
  const handleConfidenceLevelChange = useCallback((level: number) => {
    setConfidenceLevel(level);
    setHasUnsavedChanges(true);
  }, []);

  // Submit answer (final save)
  const submitFinalAnswer = useCallback(async () => {
    if (!attemptId) {
      throw new Error("No attempt ID");
    }

    try {
      const result = await submitAnswer.mutateAsync({
        attemptId,
        data: {
          question_id: questionId,
          answer: selectedAnswer || undefined,
          answer_data: answerData || undefined,
          time_taken: timeSpent,
          confidence_level: confidenceLevel || undefined,
          is_draft: false,
        },
      });

      setHasUnsavedChanges(false);

      if (onAnswerSaved) {
        onAnswerSaved(result);
      }

      return result;
    } catch (error) {
      console.error("Failed to submit answer:", error);
      throw error;
    }
  }, [
    attemptId,
    questionId,
    selectedAnswer,
    answerData,
    timeSpent,
    confidenceLevel,
    submitAnswer,
    onAnswerSaved,
  ]);

  // Navigate to next question with answer save
  const handleNext = useCallback(async () => {
    try {
      // Only save if there's an answer
      if (selectedAnswer.trim() || answerData) {
        await submitFinalAnswer();
      }

      if (onNavigateNext) {
        onNavigateNext();
      }
    } catch (error) {
      toast.error("Gagal menyimpan jawaban");
      console.error("Failed to save answer before navigation:", error);
    }
  }, [selectedAnswer, answerData, submitFinalAnswer, onNavigateNext]);

  // Navigate to previous question
  const handlePrevious = useCallback(() => {
    if (onNavigatePrevious) {
      onNavigatePrevious();
    }
  }, [onNavigatePrevious]);

  // Save and continue (explicit save without navigation)
  const saveAndContinue = useCallback(async () => {
    try {
      await submitFinalAnswer();
      toast.success("Jawaban tersimpan");
    } catch (error) {
      toast.error("Gagal menyimpan jawaban");
    }
  }, [submitFinalAnswer]);

  // Skip question (mark as unanswered but continue)
  const skipQuestion = useCallback(() => {
    if (onNavigateNext) {
      onNavigateNext();
    }
  }, [onNavigateNext]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current);
      }
    };
  }, []);

  // Validate answer based on question type
  const validateAnswer = useCallback(
    (questionType: string) => {
      switch (questionType) {
        case "multiple_choice":
        case "true_false":
          return selectedAnswer.trim() !== "";
        case "text":
          return selectedAnswer.trim().length >= 10; // Minimum 10 characters
        case "rating_scale":
          return selectedAnswer.trim() !== "";
        case "sequence":
        case "matrix":
          return selectedAnswer.trim() !== "";
        case "drawing":
          return answerData || selectedAnswer.trim() !== "";
        default:
          return selectedAnswer.trim() !== "";
      }
    },
    [selectedAnswer, answerData]
  );

  return {
    // State
    selectedAnswer,
    answerData,
    confidenceLevel,
    hasUnsavedChanges,
    isAutoSaving,
    timeSpent,

    // Data
    existingAnswer: answerQuery.data?.answer,
    canModify: answerQuery.data?.can_modify ?? true,
    isAnswered: answerQuery.data?.is_answered ?? false,

    // Loading states
    isLoadingAnswer: answerQuery.isLoading,
    isSubmitting: submitAnswer.isPending,

    // Handlers
    handleAnswerChange,
    handleAnswerDataChange,
    handleConfidenceLevelChange,
    handleNext,
    handlePrevious,
    submitFinalAnswer,
    saveAndContinue,
    skipQuestion,
    validateAnswer,

    // Utils
    triggerAutoSave,
  };
}
