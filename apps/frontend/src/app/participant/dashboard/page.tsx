"use client";

import { useNextAuth } from "@/hooks/useNextAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  User,
  Calendar,
  Clock,
  BookOpen,
  Trophy,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Play,
  CheckCircle,
  Timer,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ParticipantDashboardPage() {
  const { user: authUser, isLoading: authLoading } = useNextAuth();
  const { useGetParticipantDashboard } = useDashboard();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetParticipantDashboard();

  // Loading state
  if (authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // Auth check
  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="size-12 text-muted-foreground mx-auto" />
          <p className="text-lg">Anda belum login</p>
          <Button onClick={() => (window.location.href = "/participant/login")}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="size-12 text-red-500 mx-auto" />
          <div>
            <p className="text-lg font-semibold">Gagal memuat dashboard</p>
            <p className="text-muted-foreground">
              Terjadi kesalahan saat mengambil data dashboard
            </p>
          </div>
          <Button onClick={() => refetchDashboard()}>
            <RefreshCw className="size-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // Extract data
  const data = dashboardData?.data;
  const user = data?.user || authUser;
  const testSummary = data?.test_summary;
  const sessionSummary = data?.session_summary;
  const recentTests = data?.recent_tests || [];
  const upcomingSessions = data?.upcoming_sessions || [];
  const testsByCategory = data?.tests_by_category || {};

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tidak diketahui";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: id });
    } catch {
      return dateString;
    }
  };

  // Helper function to format time
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Tidak diketahui";
    try {
      return format(new Date(dateString), "HH:mm", { locale: id });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard Peserta</h1>
              <p className="text-muted-foreground">
                Selamat datang, {user.name}
              </p>
            </div>
            <div className="flex flex-col justify-end gap-2 items-end">
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchDashboard()}
                  disabled={dashboardLoading}
                >
                  <RefreshCw
                    className={`size-4 mr-2 ${
                      dashboardLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
              {user.last_login && (
                <p className="text-xs text-muted-foreground">
                  Login terakhir: {formatDate(user.last_login.toString())} pada{" "}
                  {formatTime(user.last_login.toString())}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Profil Saya
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="size-10 text-primary" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    Peserta
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="break-all">{user.email}</span>
                  </div>

                  {user.nik && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="size-4 text-muted-foreground" />
                      <span>NIK: {user.nik}</span>
                    </div>
                  )}

                  {authUser.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="size-4 text-muted-foreground" />
                      <span>{authUser.phone}</span>
                    </div>
                  )}

                  {authUser.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="line-clamp-2">{authUser.address}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast.info("Fitur Edit Profil", {
                      description: "Fitur edit profil akan segera tersedia",
                    });
                  }}
                >
                  Edit Profil
                </Button>
              </CardContent>
            </Card>

            {/* Test Categories Summary */}
            {Object.keys(testsByCategory).length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5" />
                    Tes per Kategori
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(testsByCategory).map(
                      ([category, count]) => (
                        <div
                          key={category}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm capitalize">
                            {category.replace(/_/g, " ")}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="px-6 h-full">
                  <div className="flex flex-col justify-between items-start h-full">
                    <div className="mb-8">
                      <div className="flex mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="size-6 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sesi Mendatang
                      </p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold">
                        {sessionSummary?.upcoming_sessions || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="px-6 h-full">
                  <div className="flex flex-col justify-between items-start h-full">
                    <div className="mb-6">
                      <div className="flex mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="size-6 text-green-600" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tes Selesai
                      </p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold">
                        {testSummary?.completed_tests || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="px-6 h-full">
                  <div className="flex flex-col justify-between items-start h-full">
                    <div className="mb-6">
                      <div className="flex mb-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Play className="size-6 text-orange-600" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tes Berlangsung
                      </p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold">
                        {testSummary?.in_progress_tests || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="px-6 h-full">
                  <div className="flex flex-col justify-between items-start h-full">
                    <div className="mb-6">
                      <div className="flex mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Timer className="size-6 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Waktu
                      </p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold">
                        {testSummary?.total_time_spent_minutes || 0}m
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Sesi Mendatang
                </CardTitle>
                <CardDescription>
                  Jadwal psikotes yang akan datang
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-semibold">
                              {session.session_name}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-4" />
                                {formatDate(session.start_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-4" />
                                {formatTime(session.start_time)} -{" "}
                                {formatTime(session.end_time)}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Kode: {session.session_code}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            disabled={!session.can_access}
                            onClick={() => {
                              if (session.can_access) {
                                toast.success("Akses Tes", {
                                  description: "Mengarahkan ke halaman tes...",
                                });
                                // Navigate to test
                              } else {
                                toast.info("Akses Tes", {
                                  description:
                                    "Tes akan dapat diakses 30 menit sebelum waktu mulai",
                                });
                              }
                            }}
                          >
                            {session.can_access
                              ? "Mulai Tes"
                              : "Belum Bisa Akses"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada sesi yang dijadwalkan
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Hubungi administrator untuk informasi jadwal tes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="size-5" />
                  Tes Terbaru
                </CardTitle>
                <CardDescription>
                  Riwayat psikotes yang baru saja diselesaikan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTests.length > 0 ? (
                  <div className="space-y-4">
                    {recentTests.map((test, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{test.test_name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-4" />
                                {formatDate(test.completed_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-4" />
                                {test.time_spent_minutes} menit
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {test.category.toUpperCase()}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast.info("Lihat Hasil", {
                                description:
                                  "Fitur detail hasil akan segera tersedia",
                              });
                            }}
                          >
                            Lihat Hasil
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Belum ada tes yang diselesaikan
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tes yang telah selesai akan muncul di sini
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Summary Card */}
            {testSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5" />
                    Ringkasan Aktivitas
                  </CardTitle>
                  <CardDescription>
                    Statistik keseluruhan aktivitas tes Anda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {testSummary.total_attempts}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Percobaan
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {testSummary.completed_tests}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tes Selesai
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {testSummary.average_time_per_test_minutes}m
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rata-rata Waktu
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
