// apps/vite/app/components/psikotes/session-guard.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "~/contexts/auth-context";
import { useSessions } from "~/hooks/use-sessions";
import { AlertTriangle, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { isSessionActive } from "~/lib/utils/session";

interface SessionGuardProps {
  sessionCode: string;
  children: React.ReactNode;
  requireParticipant?: boolean;
}

export function SessionGuard({
  sessionCode,
  children,
  requireParticipant = true,
}: SessionGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const { useGetPublicSessionByCode, useCheckParticipant } = useSessions();
  const [participantStatus, setParticipantStatus] = useState<string | null>(
    null
  );
  const [isCheckingParticipant, setIsCheckingParticipant] = useState(false);

  const sessionQuery = useGetPublicSessionByCode(sessionCode);
  const checkParticipant = useCheckParticipant();

  // Check participant registration
  useEffect(() => {
    if (requireParticipant && sessionCode && user?.phone && sessionQuery.data) {
      setIsCheckingParticipant(true);
      checkParticipant
        .mutateAsync({
          sessionCode,
          phone: user.phone.trim(),
        })
        .then((result) => {
          if (result.data.participant_exists) {
            setParticipantStatus(
              result.data.participant?.status || "registered"
            );
          } else {
            setParticipantStatus(null);
          }
        })
        .catch((error) => {
          console.error("Error checking participant registration:", error);
          setParticipantStatus(null);
        })
        .finally(() => {
          setIsCheckingParticipant(false);
        });
    }
  }, [sessionCode, user, sessionQuery.data, requireParticipant]);

  // Loading states
  if (sessionQuery.isLoading || (requireParticipant && isCheckingParticipant)) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">
              {sessionQuery.isLoading
                ? "Memvalidasi sesi..."
                : "Memeriksa peserta..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session not found
  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Sesi Tidak Ditemukan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes dengan kode <strong>{sessionCode}</strong> tidak
              ditemukan atau tidak dapat diakses.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionData = sessionQuery.data;
  const sessionIsActive = isSessionActive(
    sessionData.start_time,
    sessionData.end_time
  );

  // Session not active
  if (!sessionIsActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Sesi Tidak Aktif</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sesi psikotes <strong>{sessionData.session_name}</strong> sedang
              tidak aktif atau sudah berakhir.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
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
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Login Diperlukan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Anda perlu login untuk mengakses sesi psikotes ini.
            </p>
            <Button
              onClick={() =>
                (window.location.href = `/psikotes/${sessionCode}`)
              }
              className="w-full"
            >
              Login ke Sesi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not registered as participant
  if (requireParticipant && participantStatus === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Anda tidak terdaftar sebagai peserta dalam sesi psikotes ini.
            </p>
            <p className="text-sm text-muted-foreground">
              Hubungi administrator untuk mendaftarkan diri Anda.
            </p>
            <Button
              onClick={() => (window.location.href = "/participant/dashboard")}
              className="w-full"
            >
              Ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}
