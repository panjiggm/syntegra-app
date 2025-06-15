import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useReports } from "~/hooks/use-reports";
import { useSessions } from "~/hooks/use-sessions";
import { useUsers } from "~/hooks/use-users";
import {
  FileText,
  Download,
  BarChart3,
  Users,
  FileSpreadsheet,
  Activity,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Route } from "./+types/admin.reports";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Laporan - Admin Syntegra Psikotes" },
    { name: "description", content: "Kelola dan generate laporan psikotes" },
  ];
}

export default function AdminReports() {
  return <ReportsContent />;
}

function ReportsContent() {
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [reportFormat, setReportFormat] = useState<string>("pdf");

  const {
    useGetReportStats,
    useGetReportHealth,
    useDownloadReport,
    useRegenerateReport,
  } = useReports();

  const { useGetSessions } = useSessions();
  const { useGetUsers } = useUsers();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useGetReportStats();

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = useGetReportHealth();

  const { data: sessions, isLoading: sessionsLoading } = useGetSessions();

  const { data: users, isLoading: usersLoading } = useGetUsers();

  const downloadReport = useDownloadReport();
  const regenerateReport = useRegenerateReport();

  const handleDownloadReport = () => {
    if (!selectedReportType) {
      toast.error("Pilih jenis laporan terlebih dahulu");
      return;
    }

    let id = "";
    let reportType: "individual" | "session" | "comparative" | "batch" =
      "individual";

    switch (selectedReportType) {
      case "individual":
        if (!selectedUser) {
          toast.error("Pilih peserta untuk laporan individual");
          return;
        }
        id = selectedUser;
        reportType = "individual";
        break;
      case "session":
        if (!selectedSession) {
          toast.error("Pilih sesi untuk laporan sesi");
          return;
        }
        id = selectedSession;
        reportType = "session";
        break;
      case "comparative":
        if (!selectedSession) {
          toast.error("Pilih sesi untuk laporan komparatif");
          return;
        }
        id = selectedSession;
        reportType = "comparative";
        break;
      case "batch":
        if (!selectedSession) {
          toast.error("Pilih sesi untuk laporan batch");
          return;
        }
        id = selectedSession;
        reportType = "batch";
        break;
    }

    downloadReport.mutate({
      reportType,
      id,
      params: { format: reportFormat },
    });
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">
            Generate dan kelola laporan hasil psikotes
          </p>
        </div>
      </div>

      {/* System Health & Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Sistem</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <LoadingSpinner size="sm" />
            ) : healthError ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {health?.data.status === "healthy" ? "Sehat" : "Bermasalah"}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Response: {health?.data.database.response_time_ms || 0}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hasil</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.total_test_results || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.data.recent_results_30_days || 0} hasil baru (30 hari)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.total_sessions || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.data.recent_sessions_30_days || 0} sesi baru (30 hari)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kapasitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.report_generation_capacity
                  .individual_reports_per_hour || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Laporan per jam</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generator */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generate Laporan</CardTitle>
              <CardDescription>
                Buat laporan berdasarkan jenis dan parameter yang dipilih
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Jenis Laporan</Label>
                  <Select
                    value={selectedReportType}
                    onValueChange={setSelectedReportType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jenis laporan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Laporan Individual
                        </div>
                      </SelectItem>
                      <SelectItem value="session">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Ringkasan Sesi
                        </div>
                      </SelectItem>
                      <SelectItem value="comparative">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Analisis Komparatif
                        </div>
                      </SelectItem>
                      <SelectItem value="batch">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Laporan Batch
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Selection */}
                {(selectedReportType === "session" ||
                  selectedReportType === "comparative" ||
                  selectedReportType === "batch") && (
                  <div className="space-y-2">
                    <Label htmlFor="session">Pilih Sesi</Label>
                    <Select
                      value={selectedSession}
                      onValueChange={setSelectedSession}
                      disabled={sessionsLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            sessionsLoading ? "Memuat sesi..." : "Pilih sesi"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions?.data?.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            <div className="flex flex-col">
                              <span>{session.session_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {session.session_code} •{" "}
                                {session.current_participants} peserta
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* User Selection for Individual Report */}
                {selectedReportType === "individual" && (
                  <div className="space-y-2">
                    <Label htmlFor="user">Pilih Peserta</Label>
                    <Select
                      value={selectedUser}
                      onValueChange={setSelectedUser}
                      disabled={usersLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            usersLoading ? "Memuat peserta..." : "Pilih peserta"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.data
                          ?.filter((user) => user.role === "participant")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {user.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Format Selection */}
                <div className="space-y-2">
                  <Label htmlFor="format">Format Laporan</Label>
                  <Select value={reportFormat} onValueChange={setReportFormat}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedReportType === "batch" ? (
                        <>
                          <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                          <SelectItem value="csv">CSV (.csv)</SelectItem>
                          <SelectItem value="json">JSON (.json)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                          <SelectItem value="html">HTML (.html)</SelectItem>
                          <SelectItem value="json">JSON (.json)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDownloadReport}
                  disabled={downloadReport.isPending || !selectedReportType}
                  className="flex-1"
                >
                  {downloadReport.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Laporan
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset form
                    setSelectedReportType("");
                    setSelectedSession("");
                    setSelectedUser("");
                    setReportFormat("pdf");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jenis Laporan</CardTitle>
              <CardDescription>
                Informasi tentang setiap jenis laporan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Laporan Individual</h4>
                    <p className="text-xs text-muted-foreground">
                      Laporan lengkap untuk satu peserta termasuk profil
                      psikologi dan rekomendasi
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <BarChart3 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Ringkasan Sesi</h4>
                    <p className="text-xs text-muted-foreground">
                      Statistik dan analisis keseluruhan untuk satu sesi tes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Analisis Komparatif</h4>
                    <p className="text-xs text-muted-foreground">
                      Perbandingan performa antar peserta dalam satu sesi
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Laporan Batch</h4>
                    <p className="text-xs text-muted-foreground">
                      Data mentah semua peserta dalam format spreadsheet
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Services Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Layanan</CardTitle>
              <CardDescription>
                Status ketersediaan layanan laporan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : healthError ? (
                <div className="text-center py-4 text-red-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Gagal memuat status layanan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(health?.data.services || {}).map(
                    ([service, status]) => (
                      <div
                        key={service}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm capitalize">
                          {service.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={
                            status === "active" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {status === "active" ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
