import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.tests";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";

// Icons
import {
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  RefreshCw,
  PlayCircle,
  FileText,
  Timer,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// Hooks
import { useAuth } from "~/contexts/auth-context";
import { usePsikotesContext } from "~/routes/_psikotes";

// Utils
import { formatTime } from "~/lib/utils/date";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionData, sessionCode, refetchSession, isRefreshing } =
    usePsikotesContext();

  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set()
  );

  const handleRefresh = async () => {
    await refetchSession();
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
                              className="cursor-pointer"
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
