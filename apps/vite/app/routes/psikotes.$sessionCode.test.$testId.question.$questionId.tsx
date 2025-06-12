import { useState, useEffect, useCallback, useRef } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useNavigate, useParams } from "react-router";
import { useQuestions } from "~/hooks/use-questions";
import { useSessions } from "~/hooks/use-sessions";
import { useTestAttempt } from "~/hooks/use-test-attempt";
import { useAuth } from "~/contexts/auth-context";
import {
  Clock,
  CheckCircle,
  ArrowLeft,
  LogOut,
  AlertTriangle,
  Save,
} from "lucide-react";
import { formatDistanceToNow, parseISO, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

export const meta: MetaFunction = () => {
  return [
    { title: "Mengerjakan Soal - Syntegra Psikotes" },
    { name: "description", content: "Halaman mengerjakan soal psikotes" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { sessionCode, testId, questionId } = params;

  if (!sessionCode || !testId || !questionId) {
    throw new Response("Missing required parameters", { status: 400 });
  }

  return {
    sessionCode,
    testId,
    questionId,
  };
}

export default function QuestionPage() {
  const { sessionCode, testId, questionId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // States
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { useGetPublicSessionByCode } = useSessions();
  const { useGetQuestions, useGetQuestionById } = useQuestions();
  const {
    useGetAttempt,
    useGetAttemptProgress,
    useSubmitAnswer,
    useAutoSave,
    useGetAnswer,
    useUpdateAttempt,
    useFinishAttempt,
  } = useTestAttempt();

  // Queries
  const sessionQuery = useGetPublicSessionByCode(sessionCode);
  const questionsQuery = useGetQuestions(testId, {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 100,
  });
  const currentQuestionQuery = useGetQuestionById(testId, questionId);

  // Mutations
  const submitAnswer = useSubmitAnswer();
  const autoSave = useAutoSave();
  const updateAttempt = useUpdateAttempt();
  const finishAttempt = useFinishAttempt();

  // Get attempt data
  const attemptQuery = useGetAttempt(attemptId || "");
  const progressQuery = useGetAttemptProgress(attemptId || "");
  const answerQuery = useGetAnswer(attemptId || "", questionId);

  // Get attempt ID from sessionStorage on mount
  useEffect(() => {
    const storedAttemptId = sessionStorage.getItem(`attempt_${testId}`);
    if (storedAttemptId) {
      setAttemptId(storedAttemptId);
    } else {
      // No attempt found, redirect to test detail
      navigate(`/psikotes/${sessionCode}/test/${testId}`);
    }
  }, [testId, sessionCode, navigate]);

  // Set question start time and update status to in_progress
  useEffect(() => {
    if (attemptId && currentQuestionQuery.data) {
      setQuestionStartTime(new Date());

      // Update attempt status to in_progress if it's the first question
      if (attemptQuery.data?.status === "started") {
        updateAttempt.mutate({
          attemptId,
          data: { status: "in_progress" },
        });
      }
    }
  }, [attemptId, currentQuestionQuery.data?.data.id]);

  // Timer for tracking time spent
  useEffect(() => {
    if (questionStartTime) {
      timerRef.current = setInterval(() => {
        setTimeSpent(
          Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
        );
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [questionStartTime]);

  // Load existing answer when question changes
  useEffect(() => {
    if (answerQuery.data?.answer) {
      const existingAnswer = answerQuery.data.answer;
      if (existingAnswer.answer) {
        setSelectedAnswer(existingAnswer.answer);
      } else if (existingAnswer.answer_data) {
        // Handle complex answer data if needed
        setSelectedAnswer(JSON.stringify(existingAnswer.answer_data));
      }
      setHasUnsavedChanges(false);
    } else {
      setSelectedAnswer("");
      setHasUnsavedChanges(false);
    }
  }, [questionId, answerQuery.data]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!attemptId || !selectedAnswer.trim() || isAutoSaving) return;

    setIsAutoSaving(true);
    autoSave.mutate(
      {
        attemptId,
        data: {
          question_id: questionId,
          answer: selectedAnswer,
          time_taken: timeSpent,
        },
      },
      {
        onSuccess: () => {
          setHasUnsavedChanges(false);
          setIsAutoSaving(false);
        },
        onError: () => {
          setIsAutoSaving(false);
        },
      }
    );
  }, [
    attemptId,
    questionId,
    selectedAnswer,
    timeSpent,
    autoSave,
    isAutoSaving,
  ]);

  // Auto-save when answer changes (debounced)
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }

      autoSaveRef.current = setTimeout(() => {
        triggerAutoSave();
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [hasUnsavedChanges, triggerAutoSave]);

  // Handle answer change
  const handleAnswerChange = (value: string) => {
    setSelectedAnswer(value);
    setHasUnsavedChanges(true);
  };

  // Handle navigation
  const handleNext = async () => {
    if (!attemptId || !questionsQuery.data) return;

    // Save current answer first
    if (selectedAnswer.trim()) {
      try {
        await submitAnswer.mutateAsync({
          attemptId,
          data: {
            question_id: questionId,
            answer: selectedAnswer,
            time_taken: timeSpent,
          },
        });
      } catch (error) {
        console.error("Failed to save answer:", error);
        return;
      }
    }

    const questions = questionsQuery.data.data;
    const currentIndex = questions.findIndex((q) => q.id === questionId);

    if (currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${nextQuestion.id}`
      );
    } else {
      // Last question - finish test
      handleFinishTest();
    }
  };

  const handlePrevious = () => {
    if (!questionsQuery.data) return;

    const questions = questionsQuery.data.data;
    const currentIndex = questions.findIndex((q) => q.id === questionId);

    if (currentIndex > 0) {
      const prevQuestion = questions[currentIndex - 1];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${prevQuestion.id}`
      );
    }
  };

  const handleQuestionSelect = (selectedQuestionId: string) => {
    navigate(
      `/psikotes/${sessionCode}/test/${testId}/question/${selectedQuestionId}`
    );
  };

  const handleFinishTest = async () => {
    if (!attemptId || !progressQuery.data) return;

    try {
      const result = await finishAttempt.mutateAsync({
        attemptId,
        data: {
          completion_type: "completed",
          questions_answered: progressQuery.data.questions_answered,
          time_spent: progressQuery.data.time_spent || 0,
          final_browser_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            completedAt: new Date().toISOString(),
            finalUrl: window.location.href,
          },
        },
      });

      // Clear session storage
      sessionStorage.removeItem(`attempt_${testId}`);

      // Navigate to completion page
      if (result.next_test) {
        navigate(`/psikotes/${sessionCode}/test/${result.next_test.id}`);
      } else {
        navigate(`/psikotes/${sessionCode}/test/complete`);
      }
    } catch (error) {
      console.error("Failed to finish test:", error);
    }
  };

  const handleLogout = () => {
    if (hasUnsavedChanges) {
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
  };

  // Handle page unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  // Error states
  if (
    sessionQuery.error ||
    questionsQuery.error ||
    currentQuestionQuery.error
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-gray-600 mb-4">
            {sessionQuery.error?.message ||
              questionsQuery.error?.message ||
              currentQuestionQuery.error?.message}
          </p>
          <Button onClick={() => navigate(`/psikotes/${sessionCode}`)}>
            Kembali ke Sesi
          </Button>
        </div>
      </div>
    );
  }

  const sessionData = sessionQuery.data;
  const questions = questionsQuery.data?.data || [];
  const currentQuestion = currentQuestionQuery.data?.data;
  const progress = progressQuery.data;
  const attempt = attemptQuery.data;

  if (!sessionData || !currentQuestion || !questions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentIndex = questions.findIndex((q) => q.id === questionId);
  const currentQuestionNumber = currentIndex + 1;
  const totalQuestions = questions.length;
  const answeredCount = progress?.questions_answered || 0;

  // Check if attempt is expired
  if (attempt?.is_expired || progress?.is_expired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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

  const timeRemaining = progress?.time_remaining || 0;
  const progressPercentage = progress?.progress_percentage || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/psikotes/${sessionCode}/test/${testId}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {attempt?.test.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-600">
                Soal {currentQuestionNumber} dari {totalQuestions}
              </p>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>
                  {answeredCount}/{totalQuestions} terjawab
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>
                  {Math.floor(timeRemaining / 60)}:
                  {(timeRemaining % 60).toString().padStart(2, "0")}
                </span>
              </div>

              {hasUnsavedChanges && (
                <Badge variant="outline" className="animate-pulse">
                  <Save className="h-3 w-3 mr-1" />
                  {isAutoSaving ? "Menyimpan..." : "Belum tersimpan"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Panel - Navigation */}
        <div className="w-80 bg-white border-r border-gray-200 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Navigasi Soal</h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answeredIds = new Set(
                  progress?.answered_question_ids ?? []
                );
                const isAnswered = answeredIds.has(question.id);
                const isActive = question.id === questionId;

                return (
                  <Button
                    key={question.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuestionSelect(question.id)}
                    className={`
                      w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all p-0
                      ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                          : isAnswered
                            ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                      }
                    `}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Soal Aktif</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Question Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Question */}
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

              {/* Answer Options */}
              <div className="mb-8">
                {currentQuestion.question_type === "multiple_choice" &&
                  currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            name="answer"
                            value={option.value}
                            checked={selectedAnswer === option.value}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-gray-900">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                {currentQuestion.question_type === "true_false" && (
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="answer"
                        value="true"
                        checked={selectedAnswer === "true"}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-900">Benar</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="answer"
                        value="false"
                        checked={selectedAnswer === "false"}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-900">Salah</span>
                    </label>
                  </div>
                )}

                {currentQuestion.question_type === "text" && (
                  <textarea
                    value={selectedAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Tulis jawaban Anda di sini..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                  />
                )}

                {currentQuestion.question_type === "rating_scale" && (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Sangat Tidak Setuju
                    </span>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className="cursor-pointer">
                          <input
                            type="radio"
                            name="answer"
                            value={rating.toString()}
                            checked={selectedAnswer === rating.toString()}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="sr-only"
                          />
                          <div
                            className={`
                              w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all
                              ${
                                selectedAnswer === rating.toString()
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
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  Sebelumnya
                </Button>

                <span className="text-sm text-gray-600">
                  {currentQuestionNumber} dari {totalQuestions}
                </span>

                <Button
                  onClick={handleNext}
                  disabled={submitAnswer.isPending}
                  className={
                    currentIndex === questions.length - 1
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                >
                  {submitAnswer.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  {currentIndex === questions.length - 1
                    ? "Selesai"
                    : "Selanjutnya"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
