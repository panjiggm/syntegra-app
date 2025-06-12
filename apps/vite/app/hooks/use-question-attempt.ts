// Buat file baru: apps/vite/app/hooks/use-question-attempt.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { useTestAttempt } from "./use-test-attempt";
import { testStorage } from "~/lib/utils/storage";
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
  // State
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerData, setAnswerData] = useState<any>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Refs
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<Date>(new Date());
  const timeInterval = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { useGetAnswer, useSubmitAnswer, useAutoSave } = useTestAttempt();
  const answerQuery = useGetAnswer(attemptId, questionId);
  const submitAnswer = useSubmitAnswer();
  const autoSave = useAutoSave();

  // Load existing answer when component mounts
  useEffect(() => {
    if (answerQuery.data?.answer) {
      const answer = answerQuery.data.answer;
      setSelectedAnswer(answer.answer || "");
      setAnswerData(answer.answer_data);
      setConfidenceLevel(answer.confidence_level);
      setHasUnsavedChanges(false);
    } else {
      // Try to load from draft storage
      const draft = testStorage.getAnswerDraft(attemptId, questionId);
      if (draft) {
        setSelectedAnswer(draft.answer?.answer || "");
        setAnswerData(draft.answer?.answer_data);
        setConfidenceLevel(draft.answer?.confidence_level);
        setHasUnsavedChanges(true);
        toast.info("Draft jawaban dimuat", {
          description: "Melanjutkan dari jawaban yang belum tersimpan",
        });
      }
    }
  }, [answerQuery.data, attemptId, questionId]);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer("");
    setAnswerData(null);
    setConfidenceLevel(null);
    setTimeSpent(0);
    setHasUnsavedChanges(false);
    startTime.current = new Date();

    // Clear auto-save timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
  }, [questionId]);

  // Start time tracking
  useEffect(() => {
    startTime.current = new Date();

    timeInterval.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
      }
    };
  }, [questionId]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && autoSaveDelay > 0) {
      // Clear previous timeout
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }

      // Set new timeout
      autoSaveTimeout.current = setTimeout(() => {
        handleAutoSave();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [
    hasUnsavedChanges,
    selectedAnswer,
    answerData,
    confidenceLevel,
    autoSaveDelay,
  ]);

  // Handle answer change
  const handleAnswerChange = useCallback(
    (value: string) => {
      setSelectedAnswer(value);
      setHasUnsavedChanges(true);

      // Store draft immediately
      testStorage.setAnswerDraft(attemptId, questionId, {
        answer: value,
        answer_data: answerData,
        confidence_level: confidenceLevel,
      });
    },
    [attemptId, questionId, answerData, confidenceLevel]
  );

  // Handle answer data change (for complex question types)
  const handleAnswerDataChange = useCallback(
    (data: any) => {
      setAnswerData(data);
      setHasUnsavedChanges(true);

      // Store draft
      testStorage.setAnswerDraft(attemptId, questionId, {
        answer: selectedAnswer,
        answer_data: data,
        confidence_level: confidenceLevel,
      });
    },
    [attemptId, questionId, selectedAnswer, confidenceLevel]
  );

  // Handle confidence level change
  const handleConfidenceLevelChange = useCallback(
    (level: number) => {
      setConfidenceLevel(level);
      setHasUnsavedChanges(true);

      // Store draft
      testStorage.setAnswerDraft(attemptId, questionId, {
        answer: selectedAnswer,
        answer_data: answerData,
        confidence_level: level,
      });
    },
    [attemptId, questionId, selectedAnswer, answerData]
  );

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSubmitting) return;

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

      // Remove draft from storage since it's now saved
      testStorage.removeAnswerDraft(attemptId, questionId);

      console.log("Auto-save successful");
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Keep the draft in storage for retry
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    hasUnsavedChanges,
    isSubmitting,
    autoSave,
    attemptId,
    questionId,
    selectedAnswer,
    answerData,
    timeSpent,
    confidenceLevel,
  ]);

  // Save and continue
  const saveAndContinue = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

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

      // Remove draft from storage
      testStorage.removeAnswerDraft(attemptId, questionId);

      // Call callback
      if (onAnswerSaved) {
        onAnswerSaved(result.answer);
      }

      toast.success("Jawaban tersimpan", {
        description: "Jawaban berhasil disimpan ke server",
      });
    } catch (error) {
      console.error("Failed to save answer:", error);
      toast.error("Gagal menyimpan jawaban", {
        description: "Terjadi kesalahan saat menyimpan jawaban",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    submitAnswer,
    attemptId,
    questionId,
    selectedAnswer,
    answerData,
    timeSpent,
    confidenceLevel,
    onAnswerSaved,
  ]);

  // Handle next navigation
  const handleNext = useCallback(async () => {
    if (hasUnsavedChanges) {
      await saveAndContinue();
    }

    if (onNavigateNext) {
      onNavigateNext();
    }
  }, [hasUnsavedChanges, saveAndContinue, onNavigateNext]);

  // Handle previous navigation
  const handlePrevious = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = confirm(
        "Anda memiliki perubahan yang belum tersimpan. Simpan sebelum pindah?"
      );

      if (shouldSave) {
        await saveAndContinue();
      }
    }

    if (onNavigatePrevious) {
      onNavigatePrevious();
    }
  }, [hasUnsavedChanges, saveAndContinue, onNavigatePrevious]);

  // Reset answer
  const resetAnswer = useCallback(() => {
    setSelectedAnswer("");
    setAnswerData(null);
    setConfidenceLevel(null);
    setHasUnsavedChanges(false);

    // Remove draft
    testStorage.removeAnswerDraft(attemptId, questionId);
  }, [attemptId, questionId]);

  // Get current answer data
  const getCurrentAnswerData = useCallback(() => {
    return {
      answer: selectedAnswer,
      answer_data: answerData,
      confidence_level: confidenceLevel,
      time_taken: timeSpent,
    };
  }, [selectedAnswer, answerData, confidenceLevel, timeSpent]);

  return {
    // State
    selectedAnswer,
    answerData,
    confidenceLevel,
    timeSpent,
    hasUnsavedChanges,
    isSubmitting,
    isAutoSaving,

    // Handlers
    handleAnswerChange,
    handleAnswerDataChange,
    handleConfidenceLevelChange,
    handleNext,
    handlePrevious,
    saveAndContinue,
    handleAutoSave,
    resetAnswer,

    // Utilities
    getCurrentAnswerData,

    // Query data
    existingAnswer: answerQuery.data?.answer,
    canModify: answerQuery.data?.can_modify ?? true,
    isAnswered: answerQuery.data?.is_answered ?? false,
  };
}
