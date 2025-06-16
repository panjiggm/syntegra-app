import { useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.test.complete";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

// Icons
import {
  CheckCircle,
  Award,
  Trophy,
  Download,
  Home,
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
} from "lucide-react";

// Hooks
import { useAuth } from "~/contexts/auth-context";
import { usePsikotesContext } from "./_psikotes";

// Utils
import { formatDateTime } from "~/lib/utils/date";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Psikotes ${params.sessionCode} Selesai - Syntegra` },
    {
      name: "description",
      content: "Halaman penyelesaian semua tes psikologi",
    },
  ];
}

export default function PsikotesTestComplete() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sessionData, sessionCode } = usePsikotesContext();

  const handleGoToDashboard = () => {
    navigate("/participant/dashboard");
  };

  const handleLogout = () => {
    logout();
  };

  const handleDownloadResults = () => {
    // TODO: Implement download functionality
    alert("Fitur download hasil akan tersedia segera");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Success Card */}
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Trophy className="h-12 w-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl text-emerald-800 mb-2">
              Selamat! Semua Tes Telah Selesai
            </CardTitle>
            <p className="text-emerald-700 text-lg">
              <strong>{user?.name}</strong>, Anda telah menyelesaikan semua tes
              dalam sesi <strong>{sessionData.session_name}</strong>
            </p>
          </CardHeader>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Tanggal Sesi</p>
                  <p className="text-sm text-blue-600">
                    {formatDateTime(sessionData.start_time).split(",")[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Durasi</p>
                  <p className="text-sm text-green-600">
                    {sessionData.session_duration_hours} jam
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-800">Posisi Target</p>
                  <p className="text-sm text-purple-600">
                    {sessionData.target_position || "Umum"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tests Completed */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Tes yang Telah Diselesaikan
              </h3>
              <div className="grid gap-3">
                {sessionData.session_modules
                  ?.sort((a: any, b: any) => a.sequence - b.sequence)
                  .map((module: any, index: number) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border-l-4 border-l-green-500"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{module.test.name}</h4>
                          {module.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Wajib
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{module.test.total_questions} soal</span>
                          <span>{module.test.time_limit} menit</span>
                          <span className="capitalize">
                            {module.test.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          Selesai
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Langkah Selanjutnya</CardTitle>
            <p className="text-sm text-muted-foreground">
              Terima kasih telah menyelesaikan semua tes. Hasil akan diproses
              dan dapat diakses melalui dashboard.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button onClick={handleGoToDashboard} className="w-full">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ke Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadResults}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Hasil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Informasi Penting</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <ul className="space-y-2 text-sm">
              <li>
                • Hasil tes akan diproses dalam 1-2 hari kerja setelah sesi
                berakhir
              </li>
              <li>
                • Anda akan menerima notifikasi ketika hasil sudah tersedia
              </li>
              <li>• Hasil dapat diakses melalui dashboard participant Anda</li>
              <li>
                • Jika ada pertanyaan, silakan hubungi administrator melalui
                kontak yang telah disediakan
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="sm:w-auto"
          >
            <Home className="h-4 w-4 mr-2" />
            Kembali ke Beranda
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="sm:w-auto"
          >
            Logout
          </Button>
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
