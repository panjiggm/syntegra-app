"use client";

import { useState } from "react";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Play,
  Brain,
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  Database,
  Zap,
  RefreshCw,
  AlertCircle,
  Award,
  UserCheck,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { useGetAdminDashboard } = useDashboard();
  const { data, isLoading, error, refetch } = useGetAdminDashboard();

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    refetch();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  };

  const getSessionStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft" },
      active: { variant: "default" as const, label: "Aktif" },
      expired: { variant: "destructive" as const, label: "Kedaluwarsa" },
      completed: { variant: "outline" as const, label: "Selesai" },
      cancelled: { variant: "destructive" as const, label: "Dibatalkan" },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || {
        variant: "secondary" as const,
        label: status,
      }
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Gagal Memuat Dashboard
          </h3>
          <p className="text-muted-foreground mb-4">
            {error.message || "Terjadi kesalahan saat memuat data dashboard"}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Database className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Data Tidak Tersedia</h3>
          <p className="text-muted-foreground">
            Dashboard data belum tersedia atau masih dalam proses loading
          </p>
        </div>
      </div>
    );
  }

  const { overview, recent_sessions, popular_tests } = data.data;

  // Calculate completion rate
  const completionRate =
    overview.total_attempts > 0
      ? (overview.completed_attempts / overview.total_attempts) * 100
      : 0;

  // Tambahkan array di dalam component atau di luar component
  const quickActions = [
    {
      icon: Users,
      title: "Kelola Peserta",
      description: "Tambah, edit, atau hapus peserta",
      url: "/admin/participants",
    },
    {
      icon: Play,
      title: "Buat Sesi Baru",
      description: "Jadwalkan sesi psikotes",
      url: "/admin/sessions",
    },
    {
      icon: Brain,
      title: "Kelola Tes",
      description: "Atur modul psikotes",
      url: "/admin/tests",
    },
    {
      icon: BarChart3,
      title: "Lihat Laporan",
      description: "Analisis hasil psikotes",
      url: "/admin/reports",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau sistem psikotes digital Syntegra Services
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview.total_users)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.total_participants)} peserta,{" "}
              {formatNumber(overview.total_admins)} admin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesi & Tes</CardTitle>
            <Play className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview.total_sessions)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.active_sessions)} sesi aktif dari{" "}
              {formatNumber(overview.total_tests)} tes tersedia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tes Aktif</CardTitle>
            <Brain className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview.active_tests)}
            </div>
            <p className="text-xs text-muted-foreground">
              dari {formatNumber(overview.total_tests)} total tes psikotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tingkat Penyelesaian
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(completionRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.completed_attempts)} dari{" "}
              {formatNumber(overview.total_attempts)} percobaan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5" />
              Statistik Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Peserta</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(overview.total_participants)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Admin</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(overview.total_admins)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Pengguna</span>
                <span className="font-medium">
                  {formatNumber(overview.total_users)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Rasio Peserta:Admin</span>
                <span className="font-medium">
                  {overview.total_admins > 0
                    ? `${Math.round(
                        overview.total_participants / overview.total_admins
                      )}:1`
                    : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Statistik Tes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Percobaan</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(overview.total_attempts)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Selesai</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(overview.completed_attempts)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tingkat Penyelesaian</span>
                <span className="font-medium">
                  {formatPercentage(completionRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tes Aktif</span>
                <span className="font-medium">
                  {formatNumber(overview.active_tests)} /{" "}
                  {formatNumber(overview.total_tests)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Statistik Sesi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Sesi</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(overview.total_sessions)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Aktif</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(overview.active_sessions)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Peserta Sesi</span>
                <span className="font-medium">
                  {formatNumber(overview.total_session_participants)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Modul Sesi</span>
                <span className="font-medium">
                  {formatNumber(overview.total_session_modules)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Sesi Terkini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_sessions && recent_sessions.length > 0 ? (
                recent_sessions.map((session) => {
                  const statusConfig = getSessionStatusBadge(session.status);
                  return (
                    <div
                      key={session.id}
                      className="flex items-start justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {session.session_name}
                          </h4>
                          <Badge
                            variant={statusConfig.variant}
                            className="text-xs"
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">
                          Kode: {session.session_code}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Mulai:{" "}
                            </span>
                            <span>{formatDateTime(session.start_time)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Selesai:{" "}
                            </span>
                            <span>{formatDateTime(session.end_time)}</span>
                          </div>
                        </div>

                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">
                            Peserta: {session.participants}
                          </span>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          Detail
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Belum ada sesi yang dibuat
                  </p>
                  <Button variant="outline" className="mt-2" size="sm">
                    Buat Sesi Baru
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5" />
              Tes Populer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popular_tests && popular_tests.length > 0 ? (
                popular_tests.map((test, index) => (
                  <div
                    key={test.test_id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{test.test_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {test.test_id}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatNumber(test.attempt_count)}
                      </p>
                      <p className="text-xs text-muted-foreground">percobaan</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Award className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Belum ada data tes populer
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data akan muncul setelah ada percobaan tes
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5" />
            Aksi Cepat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4"
                  asChild
                >
                  <Link href={action.url}>
                    <div className="flex flex-col items-center gap-2">
                      <IconComponent className="size-6" />
                      <span className="text-sm font-medium">
                        {action.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>Dashboard terakhir diperbarui: {formatDateTime(data.timestamp)}</p>
        <p>Sistem Psikotes Syntegra Services</p>
      </div>
    </div>
  );
}
