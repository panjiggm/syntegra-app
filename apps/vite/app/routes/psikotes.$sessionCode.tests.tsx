import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.tests";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Progress } from "~/components/ui/progress";

// Icons
import {
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  FileText,
  Timer,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";

// Hooks
import { useSessions } from "~/hooks/use-sessions";
import { useAuth } from "~/contexts/auth-context";

// Utils
import { formatDateTime, formatTime } from "~/lib/utils/date";
import {
  hasSessionStarted,
  hasSessionEnded,
  isSessionActive,
} from "~/lib/utils/session";
import { toast } from "sonner";

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

export default function PsikotesTestsPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [participantStatus, setParticipantStatus] = useState<string | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set()
  );

  const { useGetPublicSessionByCode, useCheckParticipant } = useSessions();
  const checkParticipant = useCheckParticipant();

  // Get session data
  const {
    data: sessionData,
    isLoading: isValidatingSession,
    error: sessionError,
    refetch,
  } = useGetPublicSessionByCode(sessionCode || "");

  // Session timing checks
  const sessionHasStarted = sessionData?.start_time
    ? hasSessionStarted(sessionData.start_time)
    : false;
  const sessionHasEnded = sessionData?.end_time
    ? hasSessionEnded(sessionData.end_time)
    : false;
  const sessionIsActive = sessionData
    ? isSessionActive(sessionData.start_time, sessionData.end_time)
    : false;

  // Check participant registration
  useEffect(() => {
    if (sessionCode && user?.phone) {
      checkParticipantRegistration(sessionCode, user.phone);
    }
  }, [sessionCode, user]);

  const checkParticipantRegistration = async (
    sessionCode: string,
    phone: string
  ) => {
    try {
      const checkResult = await checkParticipant.mutateAsync({
        sessionCode,
        phone: phone.trim(),
      });

      if (checkResult.data.participant_exists) {
        setParticipantStatus(
          checkResult.data.participant?.status || "registered"
        );
      } else {
        setParticipantStatus(null);
      }
    } catch (error) {
      console.error("Error checking participant registration:", error);
      setParticipantStatus(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing session data:", error);
      toast.error("Gagal memperbarui data sesi");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartTest = (testId: string, moduleName: string) => {
    navigate(`/psikotes/${sessionCode}/test/${testId}`);
  };

  const getModuleStatusBadge = (moduleIndex: number) => {
    // TODO: This would be based on actual completion status from API
    // For now, showing sample statuses
    if (moduleIndex === 0) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200"
        >
          <Timer className="h-3 w-3 mr-1" />
          Belum Dimulai
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200"
      >
        <PlayCircle className="h-3 w-3 mr-1" />
        Tersedia
      </Badge>
    );
  };

  const calculateProgress = () => {
    // TODO: Calculate based on actual completion data
    return 0; // 0% for now
  };

  // Loading state
  if (isValidatingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Memvalidasi sesi...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session not found or error
  if (sessionError || (!isValidatingSession && !sessionData)) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Sesi Tidak Ditemukan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes dengan kode <strong>{sessionCode}</strong> tidak
              ditemukan atau sudah berakhir.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session has ended
  if (sessionHasEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <CardTitle className="text-gray-800">Sesi Telah Berakhir</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes <strong>{sessionData?.session_name}</strong> telah
              berakhir pada {formatDateTime(sessionData?.end_time || "")}.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate("/participant/dashboard")}
                className="w-full"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ke Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => logout()}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Akses Dibatasi</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Anda perlu login untuk mengakses halaman ini.
            </p>
            <Button
              onClick={() => navigate(`/psikotes/${sessionCode}`)}
              className="w-full"
            >
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not registered in session
  if (participantStatus === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Anda tidak terdaftar sebagai peserta dalam sesi psikotes ini.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate("/participant/dashboard")}
                className="w-full"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ke Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => logout()}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session not active yet
  if (!sessionIsActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Sesi Belum Aktif</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes akan dimulai pada{" "}
              {formatDateTime(sessionData?.start_time || "")}.
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard clause to ensure sessionData exists
  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Memvalidasi sesi...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main tests page
  return (
    <div className="min-h-screen p-4">
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
                Anda telah menyelesaikan 0 dari{" "}
                {sessionData.session_modules?.length || 0} tes yang tersedia.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tes yang Tersedia</CardTitle>
            <p className="text-sm text-muted-foreground">
              Klik tombol "Mulai Tes" untuk memulai mengerjakan tes. Pastikan
              koneksi internet stabil.
            </p>
          </CardHeader>
          <CardContent>
            {sessionData.session_modules &&
            sessionData.session_modules.length > 0 ? (
              <div className="space-y-4">
                {sessionData.session_modules
                  .sort((a: any, b: any) => a.sequence - b.sequence)
                  .map((module: any, index: number) => (
                    <Card
                      key={module.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {module.test.name}
                                </h3>
                                {getModuleStatusBadge(index)}
                              </div>
                              {module.test.icon && (
                                <span className="text-2xl ml-auto">
                                  {module.test.icon}
                                </span>
                              )}
                            </div>

                            <div className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground mb-4">
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4" />
                                <span>{module.test.time_limit} menit</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{module.test.total_questions} soal</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <span>{module.test.category}</span>
                              </div>
                            </div>

                            {module.test.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {module.test.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2">
                              {module.is_required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Wajib
                                </Badge>
                              )}
                              {/* <Badge variant="outline" className="text-xs">
                                Bobot: {module.weight}%
                              </Badge> */}
                            </div>
                          </div>

                          <div className="ml-6">
                            <Button
                              onClick={() =>
                                handleStartTest(
                                  module.test.id,
                                  module.test.name
                                )
                              }
                              className="curson-pointer"
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Mulai Tes
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
