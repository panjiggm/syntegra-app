import { useState, useEffect, useCallback, useRef } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useNavigate, useParams } from "react-router";
import { useQuestions } from "~/hooks/use-questions";
import { useTestAttempt } from "~/hooks/use-test-attempt";
import { useAuth } from "~/contexts/auth-context";
import { useSessions } from "~/hooks/use-sessions";
import { useParticipantTestProgress } from "~/hooks/use-participant-test-progress";
import {
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  LogOut,
  AlertTriangle,
  Save,
  Flag,
  RotateCcw,
  Menu,
  X,
  Grid3X3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

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

  return { sessionCode, testId, questionId };
}

export default function QuestionPage() {
  const { sessionCode, testId, questionId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ==================== STATES ====================
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState<number>(0);
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [isExpiring, setIsExpiring] = useState(false);

  // ==================== REFS ====================
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== HOOKS ====================
  const { useGetQuestions, useGetQuestionById } = useQuestions();
  const {
    useSubmitAnswer,
    useAutoSave,
    useGetAttemptProgress,
    useGetAnswer,
    useFinishAttempt,
  } = useTestAttempt();
  const { useGetPublicSessionByCode } = useSessions();
  const { useGetTestProgress, useUpdateTestProgress, useCompleteTest } =
    useParticipantTestProgress();

  // ==================== SESSION DATA ====================
  // Get session data to obtain session ID
  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useGetPublicSessionByCode(sessionCode);

  const sessionId = sessionData?.id;

  // ==================== QUERIES ====================
  const questionsQuery = useGetQuestions(testId, {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 100,
  });

  const currentQuestionQuery = useGetQuestionById(testId, questionId);

  const testProgressQuery = useGetTestProgress(
    sessionId || "", // Use sessionId instead of sessionCode
    user?.id || "",
    testId
  );

  const answerQuery = useGetAnswer(attemptId || "", questionId);
  const progressQuery = useGetAttemptProgress(attemptId || "");

  // ==================== MUTATIONS ====================
  const submitAnswer = useSubmitAnswer();
  const autoSave = useAutoSave();
  const updateProgress = useUpdateTestProgress();
  const completeTest = useCompleteTest();
  const finishAttempt = useFinishAttempt();

  // ==================== COMPUTED VALUES ====================
  const questions = questionsQuery.data?.data || [];
  const currentQuestion = currentQuestionQuery.data?.data;
  const testProgress = testProgressQuery.data;
  const progress = progressQuery.data;

  const currentIndex = questions.findIndex((q) => q.id === questionId);
  const currentQuestionNumber = currentIndex + 1;
  const totalQuestions = questions.length;
  const answeredCount = progress?.answered_question_ids?.length || 0;
  const progressPercentage =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Timer computed values - use API data directly
  const timeRemaining = testProgress?.time_remaining || 0;
  const isTimeExpired = testProgress?.is_time_expired || false;
  const isTimeCritical = displayTimeRemaining <= 300; // 5 minutes
  const isTimeAlmostUp = displayTimeRemaining <= 60; // 1 minute

  const handleTimeExpiry = useCallback(async () => {
    if (!user?.id || !sessionId || !attemptId || isExpiring) {
      console.log("Time expiry blocked - already expiring or missing data");
      return;
    }

    // Set flag to prevent multiple calls
    setIsExpiring(true);
    console.log("Time expired - starting auto-completion flow (single execution)");

    try {
      // Step 1: Auto-save current answer if there is one
      if (selectedAnswer.trim()) {
        console.log("Auto-saving current answer before time expiry");
        await autoSave.mutateAsync({
          attemptId,
          data: {
            question_id: questionId,
            answer: selectedAnswer,
            time_taken: questionStartTime
              ? Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
              : 0,
          },
        });
      }

      // Step 2: Complete the test with auto-completion flag
      console.log("Completing test automatically");
      await completeTest.mutateAsync({
        sessionId: sessionId,
        participantId: user.id,
        testId,
        is_auto_completed: true,
      });

      // Step 3: Finish the attempt
      console.log("Finishing attempt with auto-completion");
      await finishAttempt.mutateAsync({
        attemptId: attemptId,
        data: {
          completion_type: "expired",
          questions_answered: answeredCount + (selectedAnswer.trim() ? 1 : 0),
        },
      });

      // Step 4: Clean up and redirect
      sessionStorage.removeItem(`attempt_${testId}`);
      toast.error("Waktu habis! Test telah diselesaikan secara otomatis.");

      console.log("Redirecting to complete page");
      navigate(`/psikotes/${sessionCode}/${sessionId}/complete`);
    } catch (error) {
      console.error("Auto-completion failed:", error);
      toast.error("Gagal menyelesaikan test secara otomatis");
      
      // Still try to redirect even if some steps failed
      navigate(`/psikotes/${sessionCode}/${sessionId}/complete`);
    }
  }, [
    sessionId,
    user?.id,
    testId,
    attemptId,
    selectedAnswer,
    questionId,
    questionStartTime,
    answeredCount,
    autoSave,
    completeTest,
    finishAttempt,
    navigate,
    sessionCode,
    isExpiring,
  ]);

  // ==================== TIMER SYNC ====================
  // Sync display timer with API data
  useEffect(() => {
    if (timeRemaining !== undefined) {
      setDisplayTimeRemaining(timeRemaining);
    }
  }, [timeRemaining, isTimeExpired, testProgress?.status]);

  // Real-time countdown display with backup timer trigger
  useEffect(() => {
    if (displayTimeRemaining > 0 && !isTimeExpired && !isExpiring) {
      countdownIntervalRef.current = setInterval(() => {
        setDisplayTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime % 30 === 0) {
            // Log every 30 seconds
            console.log(
              "Countdown update - Display time remaining:",
              newTime,
              "seconds"
            );
          }

          // Backup trigger when local timer hits 0 (in case API is slow)
          if (newTime === 0 && !isExpiring) {
            console.log("Local timer reached 0 - backup trigger for auto-completion");
            // Add small delay to let API update first, then trigger if needed
            setTimeout(() => {
              if (!isExpiring) {
                console.log("API didn't respond in time - using backup trigger");
                handleTimeExpiry();
              }
            }, 1000); // 1 second grace period for API
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [displayTimeRemaining, isTimeExpired, isExpiring, handleTimeExpiry]);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const storedAttemptId = sessionStorage.getItem(`attempt_${testId}`);
    if (storedAttemptId) {
      setAttemptId(storedAttemptId);
    } else {
      navigate(`/psikotes/${sessionCode}/test/${testId}`);
    }
  }, [testId, sessionCode, navigate]);

  // Set responsive navigation state on mount
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setIsNavigationOpen(isMobile);
    };

    // Set initial state
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(new Date());
    }
  }, [questionId, currentQuestion?.id]);

  // ==================== ANSWER MANAGEMENT ====================
  useEffect(() => {
    // Reset answer state when question changes
    setSelectedAnswer("");
    setHasUnsavedChanges(false);
    
    // Refetch answer for new question to ensure fresh data
    if (attemptId && questionId) {
      answerQuery.refetch();
    }
  }, [questionId, attemptId]);

  // Separate effect for setting answer data
  useEffect(() => {
    if (answerQuery.data?.answer) {
      const existingAnswer = answerQuery.data.answer;
      if (existingAnswer.answer) {
        setSelectedAnswer(existingAnswer.answer);
      } else if (existingAnswer.answer_data) {
        setSelectedAnswer(JSON.stringify(existingAnswer.answer_data));
      }
      setHasUnsavedChanges(false);
    }
  }, [answerQuery.data]);

  // ==================== EVENT HANDLERS ====================
  const handleAnswerChange = (value: string) => {
    setSelectedAnswer(value);
    setHasUnsavedChanges(true);
  };

  // ==================== AUTO-SAVE ====================
  const triggerAutoSave = useCallback(async () => {
    if (!attemptId || !selectedAnswer.trim() || isAutoSaving) return;

    setIsAutoSaving(true);
    try {
      await autoSave.mutateAsync({
        attemptId,
        data: {
          question_id: questionId,
          answer: selectedAnswer,
          time_taken: questionStartTime
            ? Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
            : 0,
        },
      });

      // Update progress tracking
      if (user?.id && sessionId) {
        await updateProgress.mutateAsync({
          sessionId: sessionId,
          participantId: user.id,
          testId,
          answered_questions: answeredCount,
        });
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    attemptId,
    selectedAnswer,
    questionId,
    questionStartTime,
    isAutoSaving,
    autoSave,
    sessionId,
    user?.id,
    testId,
    answeredCount,
    testProgress?.time_spent,
    updateProgress,
  ]);

  useEffect(() => {
    if (hasUnsavedChanges && selectedAnswer.trim()) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        triggerAutoSave();
      }, 2000); // Auto-save after 2 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, selectedAnswer, triggerAutoSave]);

  // ==================== TIME EXPIRY CHECK ====================
  useEffect(() => {
    if (isTimeExpired && !isExpiring) {
      console.log("API detected time expired - triggering auto-completion");
      handleTimeExpiry();
    }
  }, [isTimeExpired, handleTimeExpiry, isExpiring]);

  // ==================== CLEANUP ====================
  useEffect(() => {
    return () => {
      // Clear all timers on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleNext = async () => {
    if (!attemptId) return;

    // Save current answer first
    if (selectedAnswer.trim()) {
      try {
        await submitAnswer.mutateAsync({
          attemptId,
          data: {
            question_id: questionId,
            answer: selectedAnswer,
            time_taken: questionStartTime
              ? Math.floor((Date.now() - questionStartTime.getTime()) / 1000)
              : 0,
          },
        });
      } catch (error) {
        console.error("Failed to save answer:", error);
        toast.error("Gagal menyimpan jawaban");
        return;
      }
    }

    if (currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${nextQuestion.id}`
      );
    } else {
      handleFinishTest();
    }
  };

  const handlePrevious = () => {
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
    if (!user?.id || !sessionId) return;

    try {
      await completeTest.mutateAsync({
        sessionId: sessionId,
        participantId: user.id,
        testId,
        is_auto_completed: false,
      });

      // Finish attempt
      await finishAttempt.mutateAsync({
        attemptId: attemptId || "",
        data: {
          completion_type: "completed",
          questions_answered: answeredCount,
        },
      });

      toast.success("Test berhasil diselesaikan!");
      sessionStorage.removeItem(`attempt_${testId}`);
      navigate(`/psikotes/${sessionCode}/${sessionId}/complete`);
    } catch (error) {
      console.error("Failed to finish test:", error);
      toast.error("Gagal menyelesaikan test");
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

  // ==================== TIME WARNING EFFECTS ====================
  useEffect(() => {
    if (displayTimeRemaining === 300) {
      toast.warning("Waktu tersisa 5 menit!");
    } else if (displayTimeRemaining === 60) {
      toast.error("Waktu tersisa 1 menit!");
    }
  }, [displayTimeRemaining]);

  // ==================== KEYBOARD NAVIGATION ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard navigation when typing in text areas
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        handlePrevious();
      } else if (
        e.key === "ArrowRight" &&
        currentIndex < questions.length - 1
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        if (currentIndex === questions.length - 1) {
          handleFinishTest();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    questions.length,
    handleNext,
    handlePrevious,
    handleFinishTest,
  ]);

  // ==================== PAGE UNLOAD WARNING ====================
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

  // ==================== LOADING STATES ====================
  if (
    isLoadingSession ||
    questionsQuery.isLoading ||
    currentQuestionQuery.isLoading ||
    testProgressQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">
            {isLoadingSession
              ? "Memuat sesi..."
              : testProgressQuery.isLoading
                ? "Memuat progress test..."
                : "Memuat soal..."}
          </p>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATES ====================
  if (sessionError || questionsQuery.error || currentQuestionQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-gray-600 mb-4">
              {sessionError?.message ||
                questionsQuery.error?.message ||
                currentQuestionQuery.error?.message}
            </p>
            <Button onClick={() => navigate(`/psikotes/${sessionCode}`)}>
              Kembali ke Sesi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== NO DATA STATES ====================
  if (!sessionData || !sessionId || !currentQuestion || !questions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-yellow-600 mb-2">
              {!sessionData || !sessionId
                ? "Sesi Tidak Ditemukan"
                : "Soal Tidak Ditemukan"}
            </h2>
            <p className="text-gray-600 mb-4">
              {!sessionData || !sessionId
                ? "Sesi yang Anda cari tidak tersedia."
                : "Soal yang Anda cari tidak tersedia."}
            </p>
            <Button onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}>
              Kembali ke Daftar Tes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== TIME EXPIRED STATE ====================
  if (isTimeExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <Clock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Waktu Habis
            </h2>
            <p className="text-gray-600 mb-4">
              Waktu pengerjaan tes telah berakhir.
            </p>
            <Button onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}>
              Kembali ke Daftar Tes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== RENDER MAIN UI ====================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="container mx-auto max-w-7xl bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between py-4">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {testProgress?.test?.name || "Test"}
                </h1>
                <p className="text-sm text-gray-600">
                  Soal {currentQuestionNumber} dari {totalQuestions}
                </p>
              </div>
            </div>

            {/* Center Section - Progress */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  {answeredCount}/{totalQuestions} terjawab
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-10">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  isTimeAlmostUp
                    ? "bg-red-50 border-red-200 text-red-700"
                    : isTimeCritical
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                }`}
              >
                <Clock
                  className={`h-4 w-4 ${isTimeAlmostUp ? "animate-pulse" : ""}`}
                />
                <span className="font-mono font-medium">
                  {Math.floor(displayTimeRemaining / 60)}:
                  {(displayTimeRemaining % 60).toString().padStart(2, "0")}
                </span>
                {isTimeCritical && (
                  <Badge
                    variant={isTimeAlmostUp ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {isTimeAlmostUp ? "HAMPIR HABIS!" : "TERBATAS"}
                  </Badge>
                )}
              </div>

              {/* Auto-save indicator */}
              {(hasUnsavedChanges || isAutoSaving) && (
                <div
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                    isAutoSaving
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  <Save
                    className={`h-3 w-3 ${isAutoSaving ? "animate-spin" : "animate-pulse"}`}
                  />
                  <span>
                    {isAutoSaving ? "Menyimpan..." : "Belum tersimpan"}
                  </span>
                </div>
              )}

              {/* Auto-saved confirmation */}
              {!hasUnsavedChanges && !isAutoSaving && selectedAnswer.trim() && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  <span>Tersimpan</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h1 className="text-sm font-semibold text-gray-900 truncate max-w-32">
                    {testProgress?.test?.name || "Test"}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {currentQuestionNumber}/{totalQuestions}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Timer Mobile */}
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                    isTimeAlmostUp
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : isTimeCritical
                        ? "bg-orange-50 border border-orange-200 text-orange-700"
                        : "bg-blue-50 border border-blue-200 text-blue-700"
                  }`}
                >
                  <Clock
                    className={`h-3 w-3 ${isTimeAlmostUp ? "animate-pulse" : ""}`}
                  />
                  <span className="font-mono font-medium">
                    {Math.floor(displayTimeRemaining / 60)}:
                    {(displayTimeRemaining % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Navigation Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNavigationOpen(!isNavigationOpen)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">
                  Progress: {answeredCount}/{totalQuestions}
                </span>
                <span className="text-gray-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>

            {/* Auto-save indicator mobile */}
            {(hasUnsavedChanges || isAutoSaving) && (
              <div className="mt-2">
                <div
                  className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                    isAutoSaving
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  <Save
                    className={`h-3 w-3 ${isAutoSaving ? "animate-spin" : "animate-pulse"}`}
                  />
                  <span>
                    {isAutoSaving ? "Menyimpan..." : "Belum tersimpan"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl flex flex-col md:flex-row">
        {/* Desktop Sidebar - Question Navigation */}
        <div className="hidden md:block w-80 bg-white border-r border-gray-200 h-[calc(100vh-120px)] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Navigasi Soal</h3>
              <Badge variant="outline" className="text-xs">
                {answeredCount}/{totalQuestions}
              </Badge>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((question, index) => {
                // Track answered questions - for now just current question
                // TODO: Implement comprehensive answered tracking with test progress API
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

            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded border-2 border-blue-600" />
                <span>Soal Aktif</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded" />
                <span>Belum Dijawab</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Test Statistics */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Waktu tersisa:</span>
                <span
                  className={`font-medium ${isTimeCritical ? "text-orange-600" : "text-gray-900"}`}
                >
                  {Math.floor(displayTimeRemaining / 60)}:
                  {(displayTimeRemaining % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rata-rata per soal:</span>
                <span className="font-medium text-gray-900">
                  {totalQuestions > 0
                    ? Math.round(
                        displayTimeRemaining /
                          (totalQuestions - currentQuestionNumber + 1)
                      )
                    : 0}
                  s
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testProgressQuery.refetch()}
                className="w-full"
                disabled={testProgressQuery.isFetching}
              >
                <RotateCcw
                  className={`h-4 w-4 mr-2 ${testProgressQuery.isFetching ? "animate-spin" : ""}`}
                />
                {testProgressQuery.isFetching
                  ? "Refreshing..."
                  : "Refresh Progress"}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Panel - Collapsible */}
        {isNavigationOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 relative z-10">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Navigasi Soal</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Question Grid - Horizontal scroll on mobile */}
              <div className="overflow-x-auto">
                <div
                  className="flex space-x-2 pb-2"
                  style={{ minWidth: "max-content" }}
                >
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
                        onClick={() => {
                          handleQuestionSelect(question.id);
                          setIsNavigationOpen(false);
                        }}
                        className={`
                          w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all p-0 flex-shrink-0
                          ${
                            isActive
                              ? "bg-blue-600 text-white border-blue-600"
                              : isAnswered
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-gray-50 text-gray-700 border-gray-300"
                          }
                        `}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Content */}
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-sm">
              <CardContent className="p-4 md:p-8">
                {/* Question Header */}
                <div className="mb-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {currentQuestion.question_type
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                      {currentQuestion.is_required && (
                        <Badge variant="destructive">WAJIB</Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Nomor {currentQuestionNumber}
                    </Badge>
                  </div>

                  <h2 className="text-xl font-medium text-gray-900 leading-relaxed">
                    {currentQuestion.question}
                  </h2>

                  {currentQuestion.image_url && (
                    <div className="mt-6">
                      <img
                        src={currentQuestion.image_url}
                        alt="Question illustration"
                        className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}

                  {currentQuestion.audio_url && (
                    <div className="mt-6">
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

                <Separator className="my-8" />

                {/* Answer Options */}
                <div className="mb-8">
                  {/* Multiple Choice */}
                  {currentQuestion.question_type === "multiple_choice" &&
                    currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                              selectedAnswer === option.value
                                ? "border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="answer"
                              value={option.value}
                              checked={selectedAnswer === option.value}
                              onChange={(e) =>
                                handleAnswerChange(e.target.value)
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-gray-900 flex-1">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                  {/* True/False */}
                  {currentQuestion.question_type === "true_false" && (
                    <div className="space-y-3">
                      {[
                        { value: "true", label: "Benar" },
                        { value: "false", label: "Salah" },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedAnswer === option.value
                              ? "border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="answer"
                            value={option.value}
                            checked={selectedAnswer === option.value}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-gray-900 flex-1">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Text Input */}
                  {currentQuestion.question_type === "text" && (
                    <textarea
                      value={selectedAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Tulis jawaban Anda di sini..."
                      className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={6}
                    />
                  )}

                  {/* Rating Scale */}
                  {currentQuestion.question_type === "rating_scale" && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600 font-medium">
                          Sangat Tidak Setuju
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          Sangat Setuju
                        </span>
                      </div>
                      <div className="flex justify-center space-x-4">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <label key={rating} className="cursor-pointer">
                            <input
                              type="radio"
                              name="answer"
                              value={rating.toString()}
                              checked={selectedAnswer === rating.toString()}
                              onChange={(e) =>
                                handleAnswerChange(e.target.value)
                              }
                              className="sr-only"
                            />
                            <div
                              className={`
                              w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-medium transition-all hover:scale-105
                              ${
                                selectedAnswer === rating.toString()
                                  ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                              }
                            `}
                            >
                              {rating}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="pt-6 md:pt-8 border-t border-gray-200">
                  {/* Desktop Navigation */}
                  <div className="hidden md:flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="min-w-[120px]"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Sebelumnya
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">
                        Soal {currentQuestionNumber} dari {totalQuestions}
                      </p>
                      <div className="w-64 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleNext}
                      disabled={submitAnswer.isPending}
                      className={`min-w-[120px] ${
                        currentIndex === questions.length - 1
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }`}
                    >
                      {submitAnswer.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : currentIndex === questions.length - 1 ? (
                        <Flag className="h-4 w-4 mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {currentIndex === questions.length - 1
                        ? "Selesai"
                        : "Selanjutnya"}
                    </Button>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="md:hidden space-y-4">
                    {/* Progress */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        Soal {currentQuestionNumber} dari {totalQuestions}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Sebelumnya
                      </Button>

                      <Button
                        onClick={handleNext}
                        disabled={submitAnswer.isPending}
                        className={`flex-1 ${
                          currentIndex === questions.length - 1
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }`}
                      >
                        {submitAnswer.isPending ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : currentIndex === questions.length - 1 ? (
                          <Flag className="h-4 w-4 mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        {currentIndex === questions.length - 1
                          ? "Selesai"
                          : "Selanjutnya"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
