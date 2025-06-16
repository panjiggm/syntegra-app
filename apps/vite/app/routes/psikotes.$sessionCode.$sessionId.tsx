import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.$sessionId";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";

// Icons
import {
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  RefreshCw,
  PlayCircle,
  FileText,
  Timer,
  ArrowRight,
  AlertCircle,
  Clock10,
  NotebookPen,
} from "lucide-react";

// Hooks
import { useAuth } from "~/contexts/auth-context";
import { useSessions } from "~/hooks/use-sessions";
import {
  useParticipantTestProgress,
  type ParticipantTestProgress,
} from "~/hooks/use-participant-test-progress";
import { toast } from "sonner";

// Utils
import { formatTime } from "~/lib/utils/date";
import {
  getGradientClass,
  StatusBadge,
} from "~/components/card/card-test-module";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Tes Psikologi ${params.sessionCode} - Syntegra` },
    {
      name: "description",
      content: "Halaman daftar tes psikologi yang tersedia",
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  return null;
}

export default function PsikotesSessionByIdPage() {
  const navigate = useNavigate();
  const { sessionCode, sessionId } = useParams();
  const { user } = useAuth();

  const { useGetSessionById } = useSessions();
  const {
    useGetParticipantTestProgress,
    useStartTest,
    isTestTimeExpired,
    calculateTimeRemaining,
  } = useParticipantTestProgress();

  // Get session data by ID instead of code
  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
    refetch: refetchSession,
  } = useGetSessionById(sessionId || "");

  // TODO: Get participant ID from session participants table
  // For now, we'll use a placeholder - this should be fetched based on user and session
  const participantId = user?.id || ""; // This needs to be implemented

  // Get test progress for this participant
  const {
    data: testProgressData,
    isLoading: isLoadingProgress,
    error: progressError,
  } = useGetParticipantTestProgress(sessionId || "", participantId);

  const startTestMutation = useStartTest();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchSession();
    } catch (error) {
      console.error("Error refreshing session data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartTest = async (testId: string, moduleName: string) => {
    if (!sessionId || !participantId) {
      toast.error("Missing required data to start test");
      return;
    }

    try {
      await startTestMutation.mutateAsync({
        sessionId,
        participantId,
        testId,
      });

      // Navigate to test page after successful start
      navigate(`/psikotes/${sessionCode}/test/${testId}`);
    } catch (error) {
      console.error("Failed to start test:", error);
      // Error is already handled by the mutation's onError
    }
  };

  const getModuleStatusBadge = (
    testId: string,
    testProgress?: ParticipantTestProgress
  ) => {
    if (!testProgress) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          <PlayCircle className="h-3 w-3 mr-1" />
          Tersedia
        </Badge>
      );
    }

    switch (testProgress.status) {
      case "not_started":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Timer className="h-3 w-3 mr-1" />
            Belum Dimulai
          </Badge>
        );

      case "in_progress":
        const timeExpired =
          testProgress.is_time_expired ||
          (testProgress.started_at &&
            isTestTimeExpired(
              testProgress.started_at,
              testProgress.test.time_limit
            ));

        if (timeExpired) {
          return (
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Waktu Habis
            </Badge>
          );
        }

        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Sedang Dikerjakan
          </Badge>
        );

      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Selesai
          </Badge>
        );

      case "auto_completed":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Otomatis Selesai
          </Badge>
        );

      default:
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <PlayCircle className="h-3 w-3 mr-1" />
            Tersedia
          </Badge>
        );
    }
  };

  const calculateProgress = () => {
    if (!testProgressData || testProgressData.length === 0) return 0;

    const completedTests = testProgressData.filter(
      (progress) =>
        progress.status === "completed" || progress.status === "auto_completed"
    ).length;

    return Math.round((completedTests / testProgressData.length) * 100);
  };

  // Loading state
  if (isLoadingSession || isLoadingProgress) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">
              {isLoadingSession
                ? "Memuat data sesi..."
                : "Memuat progress tes..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (sessionError || !sessionData) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="text-center p-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">
                Gagal memuat data sesi. Silakan coba lagi.
              </p>
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log("sessionData : ", sessionData);

  // Main tests page
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  {sessionData.session_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Selamat datang, <strong>{user?.name}</strong>! Silakan pilih
                  tes yang ingin dikerjakan.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Session Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Waktu Sesi</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(sessionData.start_time)} -{" "}
                    {formatTime(sessionData.end_time)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Tes</p>
                  <p className="text-xs text-muted-foreground">
                    {sessionData.session_modules?.length || 0} modul tes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Posisi Target</p>
                  <p className="text-xs text-muted-foreground">
                    {sessionData.target_position || "Umum"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Pengerjaan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Kemajuan Keseluruhan</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Anda telah menyelesaikan{" "}
                {testProgressData?.filter(
                  (progress) =>
                    progress.status === "completed" ||
                    progress.status === "auto_completed"
                ).length || 0}{" "}
                dari {sessionData.session_modules?.length || 0} tes yang
                tersedia.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tes yang Tersedia</CardTitle>
            <p className="text-sm text-muted-foreground">
              Klik card untuk memulai mengerjakan tes. Pastikan koneksi internet
              stabil.
            </p>
          </CardHeader>
          <CardContent>
            {sessionData.session_modules &&
            sessionData.session_modules.length > 0 ? (
              <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessionData.session_modules
                  .sort((a: any, b: any) => a.sequence - b.sequence)
                  .map((module: any, index: number) => {
                    const test = module.test;
                    const gradientClass = getGradientClass(test.card_color);

                    // Find test progress for this specific test
                    const testProgress = testProgressData?.find(
                      (progress) => progress.test_id === test.id
                    );

                    console.log("test : ", test);

                    return (
                      <div
                        key={module.id}
                        className="w-full max-w-2xs"
                        onClick={() => {
                          // Only allow starting if test is not completed
                          if (
                            !testProgress ||
                            (testProgress.status !== "completed" &&
                              testProgress.status !== "auto_completed")
                          ) {
                            handleStartTest(test.id, test.name);
                          }
                        }}
                      >
                        <div
                          className={`rounded-xl p-4 shadow-lg transition-all duration-200 ${
                            testProgress?.status === "completed" ||
                            testProgress?.status === "auto_completed"
                              ? "cursor-not-allowed opacity-75"
                              : "cursor-pointer hover:shadow-xl transform hover:scale-105"
                          } ${gradientClass}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-3xl">{test.icon}</span>
                            {getModuleStatusBadge(test.id, testProgress)}
                          </div>

                          <h3 className={`font-bold text-md mb-1 line-clamp-1`}>
                            {test.name}
                          </h3>
                          <p className={`text-xs mb-3 line-clamp-2`}>
                            {test.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Clock10 className="h-4 w-4" />
                              <span
                                className={`text-xs`}
                              >{`${test.time_limit} menit`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <NotebookPen className="h-4 w-4" />
                              <span
                                className={`text-xs`}
                              >{`${test.total_questions} soal`}</span>
                            </div>
                          </div>

                          <div className={`mt-2 pt-2 border-t border-gray-300`}>
                            <p className={`text-xs `}>• {test.module_type}</p>
                            <p className={`text-xs `}>
                              • {test.category?.split("_").join(" ")}
                            </p>
                            <p className={`text-xs `}>
                              • {test.question_type?.split("_").join(" ")}
                            </p>
                          </div>

                          {module.is_required && (
                            <div className="mt-2">
                              <Badge variant="destructive" className="text-xs">
                                Wajib
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-muted-foreground">
                  Tidak ada tes yang tersedia dalam sesi ini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Petunjuk Penting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Sebelum Mengerjakan:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Pastikan koneksi internet stabil</li>
                  <li>• Siapkan lingkungan yang tenang</li>
                  <li>• Gunakan komputer/laptop untuk pengalaman terbaik</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Selama Mengerjakan:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Jawaban tersimpan otomatis</li>
                  <li>• Jangan refresh atau tutup browser</li>
                  <li>• Perhatikan waktu yang tersisa</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            © 2025 Syntegra Services. Dikembangkan oleh{" "}
            <a
              href="https://oknum.studio"
              className="text-emerald-700 font-bold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Oknum.Studio
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
