import { useNavigate, useParams } from "react-router";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Separator } from "~/components/ui/separator";

// Icons
import {
  CheckCircle,
  Award,
  Trophy,
  Home,
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  PlayCircle,
  FileText,
  ArrowRight,
  Timer,
  BookOpen,
  Calculator,
  Brain,
  AlertTriangle,
} from "lucide-react";

// Hooks
import { useAuth } from "~/contexts/auth-context";
import { useSessions } from "~/hooks/use-sessions";
import { useParticipantTestProgress } from "~/hooks/use-participant-test-progress";

// Utils
import { formatDateTime } from "~/lib/utils/date";

export function meta({
  params,
}: {
  params: { sessionCode: string; sessionId: string };
}) {
  return [
    { title: `Sesi ${params.sessionCode} - Status Tes - Syntegra` },
    {
      name: "description",
      content: "Halaman status penyelesaian tes psikologi",
    },
  ];
}

export default function PsikotesSessionComplete() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sessionCode, sessionId } = useParams();

  const { useGetSessionById } = useSessions();
  const { useGetParticipantTestProgress } = useParticipantTestProgress();

  // Get session data
  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useGetSessionById(sessionId || "");

  // Get test progress data
  const {
    data: progressData,
    isLoading: isLoadingProgress,
    error: progressError,
  } = useGetParticipantTestProgress(sessionId || "", user?.id || "");

  const handleGoToDashboard = () => {
    navigate("/participant/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate(`/psikotes/${sessionCode}`);
  };

  const handleStartTest = (testId: string) => {
    navigate(`/psikotes/${sessionCode}/test/${testId}`);
  };

  const getTestIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "verbal":
        return <BookOpen className="h-5 w-5 text-blue-600" />;
      case "numerical":
      case "numerik":
        return <Calculator className="h-5 w-5 text-green-600" />;
      case "logical":
      case "logika":
        return <Brain className="h-5 w-5 text-purple-600" />;
      case "personality":
      case "kepribadian":
        return <Users className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Selesai
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Timer className="h-3 w-3 mr-1" />
            Sedang Berlangsung
          </Badge>
        );
      case "not_started":
        return (
          <Badge variant="outline" className="text-gray-600">
            Belum Dimulai
          </Badge>
        );
      case "auto_completed":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Otomatis Selesai
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Loading states
  if (isLoadingSession || isLoadingProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Memuat data sesi...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (sessionError || progressError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Terjadi Kesalahan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {sessionError?.message ||
                progressError?.message ||
                "Tidak dapat memuat data sesi"}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData || !progressData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">
              Data Tidak Ditemukan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Data sesi atau progress tes tidak ditemukan.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create a map of test progress for easy lookup
  const progressMap = new Map();
  progressData.forEach((progress: any) => {
    progressMap.set(progress.test_id, progress);
  });

  // Calculate overall progress
  const totalTests = sessionData.session_modules?.length || 0;
  const completedTests = progressData.filter(
    (p: any) => p.status === "completed" || p.status === "auto_completed"
  ).length;
  const inProgressTests = progressData.filter(
    (p: any) => p.status === "in_progress"
  ).length;
  const notStartedTests = totalTests - completedTests - inProgressTests;
  const overallProgress =
    totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  // Check if all tests are completed
  const allTestsCompleted = completedTests === totalTests && totalTests > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Card */}
        <Card
          className={`${
            allTestsCompleted
              ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50"
              : "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50"
          }`}
        >
          <CardHeader className="text-center p-4">
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                allTestsCompleted ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              {allTestsCompleted ? (
                <Trophy className="h-8 w-8 text-emerald-600" />
              ) : (
                <FileText className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <CardTitle
              className={`text-lg ${
                allTestsCompleted ? "text-emerald-800" : "text-blue-800"
              }`}
            >
              {allTestsCompleted
                ? "Selamat! Semua Tes Telah Selesai"
                : "Status Pengerjaan Tes"}
            </CardTitle>
            <p
              className={`text-sm px-2 ${
                allTestsCompleted ? "text-emerald-700" : "text-blue-700"
              }`}
            >
              <strong>{user?.name}</strong>,{" "}
              {allTestsCompleted
                ? `Anda telah menyelesaikan semua tes dalam sesi ${sessionData.session_name}`
                : `berikut adalah status pengerjaan tes Anda dalam sesi ${sessionData.session_name}`}
            </p>
          </CardHeader>
        </Card>

        {/* Main Content Grid - 50:50 Layout */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Left Column - Test Modules */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Daftar Tes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {allTestsCompleted
                  ? "Semua tes telah diselesaikan dengan baik"
                  : "Klik 'Mulai' untuk mengerjakan tes yang belum selesai"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {sessionData.session_modules
                  ?.sort((a: any, b: any) => a.sequence - b.sequence)
                  .map((module: any, index: number) => {
                    const progress = progressMap.get(module.test.id);
                    const status = progress?.status || "not_started";
                    const isCompleted =
                      status === "completed" || status === "auto_completed";
                    const canStart = status === "not_started";

                    return (
                      <div
                        key={module.id}
                        className={`relative rounded-lg border-l-4 p-3 sm:p-4 ${
                          isCompleted
                            ? "bg-green-50 border-l-green-500"
                            : status === "in_progress"
                              ? "bg-blue-50 border-l-blue-500"
                              : "bg-gray-50 border-l-gray-300"
                        }`}
                      >
                        {/* Mobile Layout */}
                        <div className="flex gap-3 sm:hidden">
                          {/* Icon */}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted
                                ? "bg-green-100"
                                : status === "in_progress"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                            }`}
                          >
                            {getTestIcon(module.test.category)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title and Badge */}
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm leading-tight">
                                {module.test.name}
                              </h4>
                              {module.is_required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs h-4 px-1.5"
                                >
                                  Wajib
                                </Badge>
                              )}
                            </div>

                            {/* Test Info - Stacked on mobile */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3 flex-shrink-0" />
                                <span>{module.test.total_questions} soal</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{module.test.time_limit} menit</span>
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {module.test.category}
                              </div>
                            </div>

                            {/* Progress Info */}
                            {progress && (
                              <div className="space-y-1">
                                {progress.answered_questions > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                      {progress.answered_questions}/
                                      {progress.total_questions} soal
                                    </span>
                                  </div>
                                )}
                                {progress.time_spent > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Timer className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                      {Math.floor(progress.time_spent / 60)}{" "}
                                      menit
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Status and Action */}
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex-shrink-0">
                                {getStatusBadge(status)}
                              </div>
                              {canStart && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStartTest(module.test.id)
                                  }
                                  className="cursor-pointer h-7 px-2 text-xs flex-1"
                                >
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  Mulai
                                </Button>
                              )}
                              {status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStartTest(module.test.id)
                                  }
                                  className="cursor-pointer h-7 px-2 text-xs flex-1"
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Lanjutkan
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex sm:gap-4">
                          {/* Icon */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted
                                ? "bg-green-100"
                                : status === "in_progress"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                            }`}
                          >
                            {getTestIcon(module.test.category)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Title and Badge */}
                            <div className="flex flex-col gap-1">
                              <h4 className="font-medium truncate">
                                {module.test.name}
                              </h4>
                              {module.is_required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs w-fit"
                                >
                                  Wajib
                                </Badge>
                              )}
                            </div>

                            {/* Test Info - Horizontal on desktop */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {module.test.total_questions} soal
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {module.test.time_limit} menit
                              </span>
                              <span className="capitalize">
                                {module.test.category}
                              </span>
                            </div>

                            {/* Progress Info */}
                            {progress && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                {progress.answered_questions > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>
                                      Dijawab: {progress.answered_questions}/
                                      {progress.total_questions} soal
                                    </span>
                                  </div>
                                )}
                                {progress.time_spent > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    <span>
                                      Waktu:{" "}
                                      {Math.floor(progress.time_spent / 60)}{" "}
                                      menit
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions - Desktop */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {getStatusBadge(status)}
                            {canStart && (
                              <Button
                                size="sm"
                                onClick={() => handleStartTest(module.test.id)}
                                className="cursor-pointer"
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Mulai
                              </Button>
                            )}
                            {status === "in_progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartTest(module.test.id)}
                                className="cursor-pointer"
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Lanjutkan
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Session Summary & Progress */}
          <div className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-emerald-600" />
                  Progress Keseluruhan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-medium">
                      Total Progress
                    </span>
                    <span className="text-lg sm:text-xl font-bold">
                      {overallProgress}%
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-2 sm:h-3" />

                  {/* Progress Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-green-600">
                        {completedTests}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700">
                        Selesai
                      </div>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-blue-600">
                        {inProgressTests}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700">
                        Berlangsung
                      </div>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-gray-600">
                        {notStartedTests}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700">
                        Belum Mulai
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-600" />
                  Ringkasan Sesi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Session Info */}
                <div className="grid gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-blue-800 text-sm sm:text-base">
                        Tanggal Sesi
                      </p>
                      <p className="text-xs sm:text-sm text-blue-600 truncate">
                        {formatDateTime(sessionData.start_time).split(",")[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 rounded-lg">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-green-800 text-sm sm:text-base">
                        Durasi
                      </p>
                      <p className="text-xs sm:text-sm text-green-600">
                        {sessionData.session_duration_hours} jam
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-purple-800 text-sm sm:text-base">
                        Posisi Target
                      </p>
                      <p className="text-xs sm:text-sm text-purple-600 truncate">
                        {sessionData.target_position || "Umum"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-orange-50 rounded-lg">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-orange-800 text-sm sm:text-base">
                        Total Tes
                      </p>
                      <p className="text-xs sm:text-sm text-orange-600">
                        {totalTests} tes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        {allTestsCompleted ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Langkah Selanjutnya
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Terima kasih telah menyelesaikan semua tes. Hasil akan diproses
                dan dapat diakses melalui dashboard.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={handleGoToDashboard}
                  className="w-full cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Ke Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full cursor-pointer"
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                Catatan Penting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-l-4 border-l-blue-500">
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>
                      Anda dapat mengerjakan tes kapan saja sesuai jadwal sesi
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>
                      Progress akan tersimpan otomatis untuk setiap tes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>
                      Pastikan koneksi internet stabil saat mengerjakan tes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Jika ada kendala, silakan hubungi administrator</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Information - only shown when all tests completed */}
        {allTestsCompleted && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="h-6 w-6 text-blue-600" />
                Informasi Penting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Hasil tes akan diproses dalam 1-2 hari kerja setelah sesi
                    berakhir
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Anda akan menerima notifikasi ketika hasil sudah tersedia
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Hasil dapat diakses melalui dashboard participant Anda
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Jika ada pertanyaan, silakan hubungi administrator melalui
                    kontak yang telah disediakan
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons at bottom */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!allTestsCompleted && (
            <Button
              variant="outline"
              onClick={() => navigate(`/psikotes/${sessionCode}/${sessionId}`)}
              className="w-full sm:w-auto cursor-pointer"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Kembali ke Sesi
            </Button>
          )}
        </div>

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
