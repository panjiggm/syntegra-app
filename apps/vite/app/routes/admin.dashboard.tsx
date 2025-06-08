import React from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AdminRoute } from "~/components/auth/route-guards";
import { useAuth } from "~/contexts/auth-context";
import { useLogout } from "~/hooks/use-auth-form";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import type { Route } from "./+types/admin.dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Dashboard - Syntegra Psikotes" },
    { name: "description", content: "Dashboard admin Syntegra Psikotes" },
  ];
}

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <DashboardContent />
    </AdminRoute>
  );
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { logout, isLoading: logoutLoading } = useLogout();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Selamat datang, {user?.name}!
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logout()}
              disabled={logoutLoading}
            >
              {logoutLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Keluar...
                </>
              ) : (
                "Keluar"
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Peserta
                </CardTitle>
                <span className="text-2xl">👥</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% dari bulan lalu
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sesi Aktif
                </CardTitle>
                <span className="text-2xl">📊</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  3 akan berakhir hari ini
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tes Selesai
                </CardTitle>
                <span className="text-2xl">✅</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">892</div>
                <p className="text-xs text-muted-foreground">
                  +12.3% dari bulan lalu
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Laporan Pending
                </CardTitle>
                <span className="text-2xl">📋</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">Perlu ditinjau</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Aksi Cepat</CardTitle>
                <CardDescription>
                  Lakukan tindakan umum dengan cepat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">👥</span>
                  Kelola Peserta
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">📝</span>
                  Buat Sesi Baru
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">📊</span>
                  Lihat Laporan
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">⚙️</span>
                  Pengaturan Tes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profil Admin</CardTitle>
                <CardDescription>Informasi akun Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.name}</h3>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Profil
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>
                Aktivitas sistem dalam 24 jam terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    time: "10:30",
                    action: 'Sesi "Test Security" dimulai',
                    user: "25 peserta",
                  },
                  {
                    time: "09:15",
                    action: "Laporan bulanan dibuat",
                    user: "System",
                  },
                  {
                    time: "08:45",
                    action: "Peserta baru ditambahkan",
                    user: "12 orang",
                  },
                  {
                    time: "08:20",
                    action: "Konfigurasi tes MBTI diperbarui",
                    user: "Admin",
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 py-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.user}</p>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
