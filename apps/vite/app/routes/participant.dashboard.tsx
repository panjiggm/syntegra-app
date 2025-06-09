import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import type { Route } from "./+types/participant.dashboard";
import type { GetParticipantDashboardResponse } from "~/hooks/use-dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Participant Dashboard - Syntegra Psikotes" },
    { name: "description", content: "Dashboard peserta Syntegra Psikotes" },
  ];
}

export default function ParticipantDashboard() {
  return <DashboardContent />;
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();

  // Get participant dashboard data directly
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch,
  } = useQuery<GetParticipantDashboardResponse["data"]>({
    queryKey: ["dashboard", "participant", user?.id],
    queryFn: async () => {
      const response = await apiClient.get<GetParticipantDashboardResponse>(
        "/dashboard/participant"
      );
      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch participant dashboard"
        );
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Auto refetch every 3 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!user && user.role === "participant",
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dashboardLoading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Gagal memuat dashboard</h2>
          <p className="text-gray-600 mb-4">
            {dashboardError instanceof Error
              ? dashboardError.message
              : "Terjadi kesalahan saat memuat data"}
          </p>
          <Button onClick={() => void refetch()}>
            <RefreshCw className="size-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Selamat datang, {dashboardData?.user.name || user?.name}! Kelola tes
            psikologi Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={dashboardLoading}
          >
            <RefreshCw
              className={`size-4 mr-2 ${dashboardLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
      {/* Profile Card */}
      <Card className="mb-8 mt-4">
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
          <CardDescription>Informasi profil dan kontak Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : dashboardError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Gagal memuat data profil</p>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(dashboardData?.user.name || user?.name)
                  ?.charAt(0)
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {dashboardData?.user.name || user?.name}
                </h3>
                <p className="text-gray-600">
                  NIK: {dashboardData?.user.nik || "Tidak tersedia"}
                </p>
                <p className="text-gray-600">
                  {dashboardData?.user.email || user?.email}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">Peserta Aktif</Badge>
                  {dashboardData?.user.last_login && (
                    <Badge variant="outline" className="text-xs">
                      Login terakhir:{" "}
                      {new Date(
                        dashboardData.user.last_login
                      ).toLocaleDateString("id-ID")}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline">Edit Profil</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tes Selesai
              </CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.test_summary.completed_tests}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.test_summary.total_attempts} total percobaan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tes Berlangsung
              </CardTitle>
              <span className="text-2xl">⏳</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.test_summary.in_progress_tests}
              </div>
              <p className="text-xs text-muted-foreground">
                Tes yang sedang dikerjakan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waktu Total</CardTitle>
              <span className="text-2xl">⏰</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  dashboardData.test_summary.total_time_spent_minutes / 60
                )}
                h
              </div>
              <p className="text-xs text-muted-foreground">
                Rata-rata{" "}
                {Math.round(
                  dashboardData.test_summary.average_time_per_test_minutes
                )}{" "}
                menit/tes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Sesi Mendatang</CardTitle>
            <CardDescription>Sesi tes yang dapat Anda ikuti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : dashboardData?.upcoming_sessions &&
              dashboardData.upcoming_sessions.length > 0 ? (
              dashboardData.upcoming_sessions.map((session, index) => {
                const startTime = new Date(session.start_time);
                const endTime = new Date(session.end_time);
                const timeRange = `${startTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;

                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{session.session_name}</h4>
                        <p className="text-sm text-gray-600">
                          {startTime.toLocaleDateString("id-ID")} • {timeRange}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Kode: {session.session_code}
                        </p>
                      </div>
                      <Badge
                        variant={session.can_access ? "default" : "secondary"}
                      >
                        {session.can_access ? "Tersedia" : "Belum Tersedia"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!session.can_access}
                    >
                      {session.can_access ? "Masuk Sesi" : "Menunggu Waktu"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada sesi tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Tes Terbaru</CardTitle>
            <CardDescription>Tes yang telah Anda selesaikan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : dashboardData?.recent_tests &&
              dashboardData.recent_tests.length > 0 ? (
              dashboardData.recent_tests.map((test, index) => {
                const completedDate = new Date(test.completed_at);
                const hours = Math.floor(test.time_spent_minutes / 60);
                const minutes = test.time_spent_minutes % 60;
                const timeSpent =
                  hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;

                return (
                  <div
                    key={index}
                    className="flex justify-between items-center py-3 border-b last:border-b-0"
                  >
                    <div>
                      <h4 className="font-medium">{test.test_name}</h4>
                      <p className="text-sm text-gray-600">
                        {completedDate.toLocaleDateString("id-ID")}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {test.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{timeSpent}</p>
                      <Badge variant="secondary" className="text-xs">
                        Selesai
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada riwayat tes</p>
              </div>
            )}
            {dashboardData?.recent_tests &&
              dashboardData.recent_tests.length > 0 && (
                <Button variant="outline" className="w-full">
                  Lihat Semua Riwayat
                </Button>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Test Categories */}
      {dashboardData?.tests_by_category &&
        Object.keys(dashboardData.tests_by_category).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Kategori Tes</CardTitle>
              <CardDescription>
                Jumlah tes yang telah diselesaikan per kategori
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dashboardData.tests_by_category).map(
                  ([category, count]) => (
                    <div
                      key={category}
                      className="text-center p-4 border rounded-lg"
                    >
                      <div className="text-2xl font-bold text-blue-600">
                        {count}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {category}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Petunjuk Umum</CardTitle>
          <CardDescription>
            Hal-hal penting yang perlu diperhatikan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Sebelum Tes:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Pastikan koneksi internet stabil</li>
                <li>• Siapkan lingkungan yang tenang</li>
                <li>• Gunakan perangkat dengan layar yang cukup besar</li>
                <li>• Pastikan baterai perangkat mencukupi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Selama Tes:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Jawab semua pertanyaan dengan jujur</li>
                <li>• Perhatikan batas waktu yang diberikan</li>
                <li>• Jangan menutup browser selama tes</li>
                <li>• Hubungi admin jika ada kendala teknis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
