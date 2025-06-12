// apps/vite/app/routes/psikotes.$sessionCode.test.$testId.question.$questionId.example.tsx
// Contoh implementasi lengkap halaman question dengan semua fitur

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";

// Hooks
import { useQuestions } from "~/hooks/use-questions";
import { useSessions } from "~/hooks/use-sessions";
import { useTestAttempt } from "~/hooks/use-test-attempt";
import { useQuestionAttempt } from "~/hooks/use-question-attempt";
import { useQuestionNavigation } from "~/hooks/use-question-navigation";
import { useAuth } from "~/contexts/auth-context";

// Components
import { PsikotesErrorBoundary } from "~/components/psikotes/error-boundary";
import { SessionGuard } from "~/components/psikotes/session-guard";
import { SessionHeader } from "~/components/psikotes/session-header";
import { QuestionProgress } from "~/components/psikotes/question-progress";
import { TestCompletionModal } from "~/components/psikotes/test-completion-modal";
import { ConnectionMonitor } from "~/components/psikotes/connection-monitor";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";

// Utils
import { testStorage } from "~/lib/utils/storage";

export default function QuestionPage() {
  const { sessionCode, testId, questionId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Local states
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionReason, setCompletionReason] = useState<
    "completed" | "time_up" | "manual"
  >("completed");

  // Hooks
  const { useGetQuestions, useGetQuestionById } = useQuestions();
  const { useGetPublicSessionByCode } = useSessions();
  const {
    useGetAttempt,
    useGetAttemptProgress,
    useUpdateAttempt,
    useFinishAttempt,
  } = useTestAttempt();

  // Queries
  const sessionQuery = useGetPublicSessionByCode(sessionCode || "");
  const questionsQuery = useGetQuestions(testId || "", {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 100,
  });
  const currentQuestionQuery = useGetQuestionById(
    testId || "",
    questionId || ""
  );
  const attemptQuery = useGetAttempt(attemptId || "");
  const progressQuery = useGetAttemptProgress(attemptId || "");

  // Navigation hook
  const navigation = useQuestionNavigation({
    sessionCode: sessionCode || "",
    testId: testId || "",
    currentQuestionId: questionId || "",
    attemptId: attemptId || "",
  });

  // Question attempt hook
  const questionAttempt = useQuestionAttempt({
    attemptId: attemptId || "",
    questionId: questionId || "",
    onAnswerSaved: (answer) => {
      console.log("Answer saved:", answer);
    },
    onNavigateNext: () => {
      navigation.navigateToNext();
    },
    onNavigatePrevious: () => {
      navigation.navigateToPrevious();
    },
    autoSaveDelay: 3000,
  });

  // Mutations
  const updateAttempt = useUpdateAttempt();
  const finishAttempt = useFinishAttempt();

  // Get attempt ID from storage
  useEffect(() => {
    const storedAttemptId = sessionStorage.getItem(`attempt_${testId}`);
    if (storedAttemptId) {
      setAttemptId(storedAttemptId);
    } else {
      navigate(`/psikotes/${sessionCode}/test/${testId}`);
    }
  }, [testId, sessionCode, navigate]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    setCompletionReason("time_up");
    setShowCompletionModal(true);
  }, []);

  // Handle test completion
  const handleTestCompletion = useCallback(async () => {
    if (!attemptId || !progressQuery.data) return;

    try {
      const result = await finishAttempt.mutateAsync({
        attemptId,
        data: {
          completion_type:
            completionReason === "time_up" ? "expired" : "completed",
          questions_answered: progressQuery.data.questions_answered,
          time_spent: progressQuery.data.time_spent || 0,
          final_browser_info: {
            completedAt: new Date().toISOString(),
            reason: completionReason,
          },
        },
      });

      // Clear local storage
      sessionStorage.removeItem(`attempt_${testId}`);
      testStorage.removeAttemptData(testId || "");

      // Navigate to completion page
      if (result.next_test) {
        navigate(`/psikotes/${sessionCode}/test/${result.next_test.id}`);
      } else {
        navigate(`/psikotes/${sessionCode}/test/complete`);
      }
    } catch (error) {
      console.error("Failed to finish test:", error);
      toast.error("Gagal menyelesaikan tes");
    }
  }, [
    attemptId,
    progressQuery.data,
    finishAttempt,
    completionReason,
    testId,
    sessionCode,
    navigate,
  ]);

  // Handle manual completion
  const handleManualCompletion = useCallback(() => {
    setCompletionReason("manual");
    setShowCompletionModal(true);
  }, []);

  // Handle navigation
  const handleBack = useCallback(() => {
    if (questionAttempt.hasUnsavedChanges) {
      if (
        confirm(
          "Anda memiliki perubahan yang belum disimpan. Yakin ingin kembali?"
        )
      ) {
        navigate(`/psikotes/${sessionCode}/test/${testId}`);
      }
    } else {
      navigate(`/psikotes/${sessionCode}/test/${testId}`);
    }
  }, [questionAttempt.hasUnsavedChanges, navigate, sessionCode, testId]);

  // Handle logout
  const handleLogout = useCallback(() => {
    if (questionAttempt.hasUnsavedChanges) {
      if (
        confirm(
          "Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?"
        )
      ) {
        logout();
      }
    } else {
      logout();
    }
  }, [questionAttempt.hasUnsavedChanges, logout]);

  // Handle question type specific rendering
  const renderQuestionInput = () => {
    const question = currentQuestionQuery.data?.data;
    if (!question) return null;

    switch (question.question_type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.value}
                  checked={questionAttempt.selectedAnswer === option.value}
                  onChange={(e) =>
                    questionAttempt.handleAnswerChange(e.target.value)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "true_false":
        return (
          <div className="space-y-3">
            {["true", "false"].map((value) => (
              <label
                key={value}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="answer"
                  value={value}
                  checked={questionAttempt.selectedAnswer === value}
                  onChange={(e) =>
                    questionAttempt.handleAnswerChange(e.target.value)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-900">
                  {value === "true" ? "Benar" : "Salah"}
                </span>
              </label>
            ))}
          </div>
        );

      case "text":
        return (
          <textarea
            value={questionAttempt.selectedAnswer}
            onChange={(e) => questionAttempt.handleAnswerChange(e.target.value)}
            placeholder="Tulis jawaban Anda di sini..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={4}
          />
        );

      case "rating_scale":
        return (
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-600">Sangat Tidak Setuju</span>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating} className="cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    value={rating.toString()}
                    checked={
                      questionAttempt.selectedAnswer === rating.toString()
                    }
                    onChange={(e) =>
                      questionAttempt.handleAnswerChange(e.target.value)
                    }
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all
                      ${
                        questionAttempt.selectedAnswer === rating.toString()
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                      }
                    `}
                  >
                    {rating}
                  </div>
                </label>
              ))}
            </div>
            <span className="text-sm text-gray-600">Sangat Setuju</span>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Tipe soal tidak didukung: {question.question_type}
            </p>
          </div>
        );
    }
  };

  // Loading states
  if (
    sessionQuery.isLoading ||
    questionsQuery.isLoading ||
    currentQuestionQuery.isLoading ||
    (attemptId && attemptQuery.isLoading)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Data validation
  const sessionData = sessionQuery.data;
  const questions = questionsQuery.data?.data || [];
  const currentQuestion = currentQuestionQuery.data?.data;
  const attempt = attemptQuery.data;
  const progress = progressQuery.data;

  if (!sessionData || !currentQuestion || !questions.length || !attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Data tidak lengkap
          </h2>
          <p className="text-gray-600 mb-4">
            Gagal memuat data yang diperlukan
          </p>
          <Button onClick={() => navigate(`/psikotes/${sessionCode}`)}>
            Kembali ke Sesi
          </Button>
        </div>
      </div>
    );
  }

  // Check if attempt is expired
  if (attempt.is_expired || progress?.is_expired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Waktu Habis
          </h2>
          <p className="text-gray-600 mb-4">
            Waktu pengerjaan tes telah berakhir.
          </p>
          <Button onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}>
            Kembali ke Daftar Tes
          </Button>
        </div>
      </div>
    );
  }

  const navigationContext = navigation.getNavigationContext();

  return (
    <PsikotesErrorBoundary>
      <SessionGuard sessionCode={sessionCode || ""}>
        <div className="min-h-screen bg-gray-50">
          {/* Connection Monitor */}
          <ConnectionMonitor
            onConnectionLost={() => toast.warning("Koneksi terputus")}
            onConnectionRestored={() => toast.success("Koneksi pulih")}
          />

          {/* Header */}
          <SessionHeader
            sessionName={sessionData.session_name}
            testName={attempt.test.name}
            currentQuestion={navigationContext.currentNumber}
            totalQuestions={navigationContext.totalQuestions}
            answeredQuestions={progress?.questions_answered || 0}
            startTime={attempt.start_time}
            timeLimitMinutes={attempt.test.time_limit}
            targetPosition={sessionData.target_position}
            location={sessionData.location}
            autoSaveStatus={
              questionAttempt.isAutoSaving
                ? "saving"
                : questionAttempt.hasUnsavedChanges
                  ? "unsaved"
                  : "saved"
            }
            onBack={handleBack}
            onLogout={handleLogout}
            onTimeUp={handleTimeUp}
          />

          <div className="flex flex-1">
            {/* Left Panel - Navigation */}
            <div className="w-80 bg-white border-r border-gray-200 h-[calc(100vh-80px)] overflow-y-auto">
              <div className="p-4">
                <QuestionProgress
                  questions={questions}
                  currentQuestionId={questionId || ""}
                  answeredQuestionIds={[]} // TODO: Get from progress data
                  onQuestionSelect={navigation.navigateToQuestion}
                />
              </div>
            </div>

            {/* Right Panel - Question Content */}
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardContent className="p-6">
                    {/* Question Header */}
                    <div className="mb-6">
                      <div className="flex items-start space-x-2 mb-4">
                        <Badge variant="outline">
                          {currentQuestion.question_type
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                        {currentQuestion.is_required && (
                          <Badge variant="destructive">WAJIB</Badge>
                        )}
                        <Badge variant="outline">
                          {questionAttempt.timeSpent > 0 &&
                            `${Math.floor(questionAttempt.timeSpent / 60)}:${(questionAttempt.timeSpent % 60).toString().padStart(2, "0")}`}
                        </Badge>
                      </div>

                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        {currentQuestion.question}
                      </h2>

                      {currentQuestion.image_url && (
                        <div className="mb-4">
                          <img
                            src={currentQuestion.image_url}
                            alt="Question illustration"
                            className="max-w-full h-auto rounded-lg border border-gray-200"
                          />
                        </div>
                      )}

                      {currentQuestion.audio_url && (
                        <div className="mb-4">
                          <audio controls className="w-full">
                            <source
                              src={currentQuestion.audio_url}
                              type="audio/mpeg"
                            />
                            Browser Anda tidak mendukung audio.
                          </audio>
                        </div>
                      )}
                    </div>

                    <Separator className="my-6" />

                    {/* Answer Input */}
                    <div className="mb-8">{renderQuestionInput()}</div>

                    {/* Confidence Level */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Tingkat Keyakinan (Opsional)
                      </label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            variant={
                              questionAttempt.confidenceLevel === level
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              questionAttempt.handleConfidenceLevelChange(level)
                            }
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        1 = Sangat tidak yakin, 5 = Sangat yakin
                      </p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={questionAttempt.handlePrevious}
                        disabled={!navigationContext.hasPrevious}
                      >
                        Sebelumnya
                      </Button>

                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {navigationContext.currentNumber} dari{" "}
                          {navigationContext.totalQuestions}
                        </span>

                        <Button
                          variant="outline"
                          onClick={questionAttempt.saveAndContinue}
                          disabled={questionAttempt.isSubmitting}
                        >
                          Simpan
                        </Button>

                        {navigationContext.isLast && (
                          <Button
                            onClick={handleManualCompletion}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Selesaikan Tes
                          </Button>
                        )}
                      </div>

                      <Button
                        onClick={questionAttempt.handleNext}
                        disabled={questionAttempt.isSubmitting}
                        className={
                          navigationContext.isLast
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {questionAttempt.isSubmitting ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : null}
                        {navigationContext.isLast ? "Selesai" : "Selanjutnya"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Completion Modal */}
          <TestCompletionModal
            isOpen={showCompletionModal}
            testName={attempt.test.name}
            questionsAnswered={progress?.questions_answered || 0}
            totalQuestions={attempt.test.total_questions}
            timeSpent={questionAttempt.timeSpent}
            isForced={completionReason === "time_up"}
            reason={completionReason}
            onConfirm={handleTestCompletion}
            onCancel={
              completionReason !== "time_up"
                ? () => setShowCompletionModal(false)
                : undefined
            }
            isSubmitting={finishAttempt.isPending}
          />
        </div>
      </SessionGuard>
    </PsikotesErrorBoundary>
  );
}
