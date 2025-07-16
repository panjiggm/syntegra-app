import React from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useDashboard } from "~/hooks/use-dashboard";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { Route } from "./+types/admin.dashboard";
import { Link } from "react-router";
import { DashboardChartSection } from "~/components/admin/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Dashboard - Syntegra Psikotes" },
    { name: "description", content: "Dashboard admin Syntegra Psikotes" },
  ];
}

export default function AdminDashboard() {
  return <DashboardContent />;
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { useGetAdminDashboard } = useDashboard();
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch,
  } = useGetAdminDashboard();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
            Selamat datang, {user?.name}! Kelola sistem psikotes Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={dashboardLoading}
          >
            <RefreshCw
              className={`size-4 mr-2 ${dashboardLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      {dashboardError ? (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-red-600 mb-2">Gagal memuat data dashboard</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(dashboardError as Error).message}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Peserta
              </CardTitle>
              <span className="text-2xl">👥</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  dashboardData?.overview.total_participants || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.overview.total_admins || 0} admin terdaftar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesi Aktif</CardTitle>
              <span className="text-2xl">📊</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  dashboardData?.overview.active_sessions || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.overview.total_sessions || 0} total sesi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tes Selesai</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  dashboardData?.overview.completed_attempts || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.overview.total_attempts || 0} total percobaan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Modul Tes Aktif
              </CardTitle>
              <span className="text-2xl">📋</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  dashboardData?.overview.active_tests || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.overview.total_tests || 0} total tes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Charts Section */}
      <DashboardChartSection />

      {/* Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Sesi Terbaru</CardTitle>
            <CardDescription>
              Sesi-sesi yang baru saja dibuat atau diperbarui
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : dashboardData?.recent_sessions &&
              dashboardData.recent_sessions.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {session.session_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kode: {session.session_code} • {session.participants}{" "}
                        peserta
                      </p>
                    </div>
                    <div className="text-right">
                      <Link to={`/admin/sessions/${session?.id}`}>
                        <Button
                          variant="link"
                          size="sm"
                          className="cursor-pointer text-xs"
                        >
                          Lihat Detail
                          <ArrowUpRight />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Belum ada sesi terbaru
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tes Populer</CardTitle>
            <CardDescription>
              Tes dengan jumlah percobaan terbanyak
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : dashboardData?.popular_tests &&
              dashboardData.popular_tests.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.popular_tests.slice(0, 5).map((test, index) => (
                  <div
                    key={test.test_id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{test.test_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {test.attempt_count} percobaan
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Link to={`/admin/tests/${test?.test_id}`}>
                        <Button
                          variant="link"
                          size="sm"
                          className="cursor-pointer text-xs"
                        >
                          Lihat Detail
                          <ArrowUpRight />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Belum ada data tes populer
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
