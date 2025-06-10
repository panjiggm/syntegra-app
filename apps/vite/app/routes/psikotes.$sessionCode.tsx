import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Badge } from "~/components/ui/badge";

// Icons
import {
  Clock,
  Users,
  BookOpen,
  Lock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// Hooks
import { useSessions } from "~/hooks/use-sessions";
import { useAuth } from "~/contexts/auth-context";

// Utils
import { formatDateTime, formatTime } from "~/lib/utils/date";
import { toast } from "sonner";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Psikotes ${params.sessionCode} - Syntegra` },
    { name: "description", content: "Akses tes psikologi online" },
  ];
}

export default function PsikotesSessionPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loginParticipant } = useAuth();

  const [phone, setPhone] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [participantStatus, setParticipantStatus] = useState<string | null>(
    null
  );

  const { useGetPublicSessionByCode, useCheckParticipant } = useSessions();
  const checkParticipant = useCheckParticipant();

  // Get session data using the hook
  const {
    data: sessionData,
    isLoading: isValidatingSession,
    error: sessionError,
  } = useGetPublicSessionByCode(sessionCode || "");

  console.log("sessionData", sessionData);
  console.log("sessionCode", sessionCode);

  // Check participant status when session data is available and user is authenticated
  useEffect(() => {
    if (sessionData && isAuthenticated && user) {
      checkParticipantStatus(sessionData.id, user.id);
    }
  }, [sessionData, isAuthenticated, user]);

  const checkParticipantStatus = async (sessionId: string, userId: string) => {
    try {
      // Check if user is registered in this session
      const response = await fetch(
        `/api/v1/sessions/${sessionId}/participants`
      );
      const data = await response.json();

      if (data.success) {
        const participant = data.data.find((p: any) => p.user_id === userId);
        setParticipantStatus(participant?.status || null);
      }
    } catch (error) {
      console.error("Error checking participant status:", error);
      setParticipantStatus(null);
    }
  };

  const handleCheckParticipant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error("Nomor telepon harus diisi");
      return;
    }

    if (!sessionCode) {
      toast.error("Kode sesi tidak valid");
      return;
    }

    setIsLoggingIn(true);

    try {
      // Check if participant exists in the session
      const checkResult = await checkParticipant.mutateAsync({
        sessionCode: sessionCode,
        phone: phone.trim(),
      });

      console.log("checkResult", checkResult);

      if (checkResult.data.participant_exists) {
        // Participant found, proceed with login
        try {
          await loginParticipant({ phone: phone.trim() });
          toast.success("Login berhasil!", {
            description: `Selamat datang, ${checkResult.data.participant?.name || "Peserta"}!`,
          });
        } catch (loginError) {
          console.error("Login error:", loginError);
          toast.error("Gagal melakukan login", {
            description: "Terjadi kesalahan saat login. Silakan coba lagi.",
          });
        }
      } else {
        // Participant not found
        toast.error("Tidak terdaftar", {
          description:
            "Nomor telepon Anda tidak terdaftar dalam sesi psikotes ini. Hubungi administrator untuk bantuan.",
        });
      }
    } catch (error) {
      console.error("Check participant error:", error);
      // Error toast is already handled by the hook
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStartTest = () => {
    if (sessionData && user) {
      // Navigate to test interface
      navigate(`/psikotes/${sessionCode}/test`);
    }
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
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
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

  // Return early if session data is not yet available
  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Memvalidasi sesi...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if session is expired or not active
  const isSessionExpired = sessionData.is_expired;
  const isSessionActive = sessionData.is_active;

  if (isSessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <CardTitle className="text-gray-800">Sesi Telah Berakhir</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes <strong>{sessionData.session_name}</strong> telah
              berakhir pada {formatDateTime(sessionData.end_time)}.
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

  // User not authenticated - show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Akses Psikotes</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {sessionData.session_name}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Info */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>
                  {formatDateTime(sessionData.start_time)} -{" "}
                  {formatTime(sessionData.end_time)}
                </span>
              </div>
              {sessionData.target_position && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Posisi: {sessionData.target_position}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>
                  {sessionData.total_questions} soal dalam{" "}
                  {sessionData.session_modules?.length || 0} modul
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleCheckParticipant} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium mb-2"
                >
                  Nomor Telepon
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Psikotes"
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Masukkan nomor telepon yang telah terdaftar untuk mengakses
              psikotes ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User authenticated but not registered in session
  if (participantStatus === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Anda tidak terdaftar sebagai peserta dalam sesi psikotes ini.
            </p>
            <p className="text-sm text-muted-foreground">
              Hubungi administrator untuk mendaftarkan diri Anda ke sesi ini.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/participant/dashboard")}
              className="w-full"
            >
              Ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User authenticated and registered - show test interface
  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">
            Selamat Datang, {user?.name || "Peserta"}!
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {sessionData.session_name}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-medium mb-2">Informasi Sesi</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateTime(sessionData.start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {sessionData.session_modules?.length || 0} Modul Tes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{sessionData.target_position || "Umum"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-medium mb-2">Status Anda</h3>
              <div className="space-y-2">
                <Badge
                  className={
                    participantStatus === "completed"
                      ? "bg-green-100 text-green-700"
                      : participantStatus === "started"
                        ? "bg-blue-100 text-blue-700"
                        : participantStatus === "registered"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                  }
                >
                  {participantStatus === "invited" && "Diundang"}
                  {participantStatus === "registered" && "Terdaftar"}
                  {participantStatus === "started" && "Sedang Mengerjakan"}
                  {participantStatus === "completed" && "Selesai"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Test Modules Preview */}
          {sessionData.session_modules &&
            sessionData.session_modules.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-medium mb-3">
                  Modul Tes yang Akan Dikerjakan
                </h3>
                <div className="grid gap-2">
                  {sessionData.session_modules
                    .sort((a: any, b: any) => a.sequence - b.sequence)
                    .map((module: any, index: number) => (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 p-2 rounded border"
                      >
                        <Badge variant="outline">{index + 1}</Badge>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {module.test.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {module.test.time_limit} menit •{" "}
                            {module.test.total_questions} soal
                          </div>
                        </div>
                        {module.test.icon && (
                          <span className="text-lg">{module.test.icon}</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {participantStatus === "completed" ? (
              <Button
                className="flex-1"
                onClick={() => navigate("/participant/dashboard")}
              >
                Lihat Hasil
              </Button>
            ) : participantStatus === "started" ? (
              <Button className="flex-1" onClick={handleStartTest}>
                Lanjutkan Tes
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleStartTest}>
                Mulai Tes
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/participant/dashboard")}
            >
              Dashboard
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              Petunjuk Penting:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pastikan koneksi internet stabil selama mengerjakan tes</li>
              <li>
                • Tes akan tersimpan otomatis setiap jawaban yang Anda berikan
              </li>
              <li>
                • Waktu pengerjaan akan berjalan sesuai durasi yang ditentukan
              </li>
              <li>
                • Jangan menutup browser atau refresh halaman saat mengerjakan
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
