import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ParticipantRoute } from "~/components/auth/route-guards";
import { useAuth } from "~/contexts/auth-context";
import { useLogout } from "~/hooks/use-auth-form";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import type { Route } from "./+types/participant.dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Participant Dashboard - Syntegra Psikotes" },
    { name: "description", content: "Dashboard peserta Syntegra Psikotes" },
  ];
}

export default function ParticipantDashboard() {
  return (
    <ParticipantRoute>
      <DashboardContent />
    </ParticipantRoute>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Peserta
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
          {/* Profile Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Profil Saya</CardTitle>
              <CardDescription>
                Informasi profil dan kontak Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-gray-600">{user?.phone}</p>
                  <p className="text-gray-600">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    Peserta Aktif
                  </Badge>
                </div>
                <Button variant="outline">Edit Profil</Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Tes Tersedia</CardTitle>
                <CardDescription>
                  Tes psikologi yang dapat Anda ikuti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: "Tes Seleksi Security",
                    time: "14:00 - 16:00",
                    status: "available",
                    modules: ["WAIS", "MBTI", "Wartegg", "RIASEC"],
                  },
                  {
                    name: "Tes Seleksi Staff",
                    time: "09:00 - 11:00",
                    status: "completed",
                    modules: ["Kraepelin", "Big Five", "PAPI", "DAP"],
                  },
                ].map((test, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{test.name}</h4>
                        <p className="text-sm text-gray-600">{test.time}</p>
                      </div>
                      <Badge
                        variant={
                          test.status === "available" ? "default" : "secondary"
                        }
                      >
                        {test.status === "available" ? "Tersedia" : "Selesai"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {test.modules.map((module, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={test.status !== "available"}
                    >
                      {test.status === "available"
                        ? "Mulai Tes"
                        : "Lihat Hasil"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Riwayat Tes</CardTitle>
                <CardDescription>
                  Tes yang telah Anda selesaikan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: "Tes Seleksi Staff",
                    date: "15 Nov 2024",
                    score: "85/100",
                    result: "Lulus",
                  },
                  {
                    name: "Tes Kepribadian",
                    date: "10 Nov 2024",
                    score: "92/100",
                    result: "Lulus",
                  },
                  {
                    name: "Tes IQ Dasar",
                    date: "5 Nov 2024",
                    score: "78/100",
                    result: "Lulus",
                  },
                ].map((history, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-3 border-b last:border-b-0"
                  >
                    <div>
                      <h4 className="font-medium">{history.name}</h4>
                      <p className="text-sm text-gray-600">{history.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{history.score}</p>
                      <Badge
                        variant={
                          history.result === "Lulus" ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {history.result}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  Lihat Semua Riwayat
                </Button>
              </CardContent>
            </Card>
          </div>

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
        </div>
      </main>
    </div>
  );
}
