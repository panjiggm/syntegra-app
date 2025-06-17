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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useReports } from "~/hooks/use-reports";
import { useSessions } from "~/hooks/use-sessions";
import { useUsers } from "~/hooks/use-users";
import {
  FileText,
  BarChart3,
  Users,
  Activity,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Check,
  ChevronsUpDown,
  User,
  Clock,
  Target,
  Award,
  Brain,
  Lightbulb,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "~/lib/utils";
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
  const [activeTab, setActiveTab] = useState<string>("individual");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  const {
    useGetIndividualReport,
    useGetSessionSummaryReport,
    useGetComparativeReport,
    useGetReportStats,
    useGetReportHealth,
  } = useReports();

  const { useGetSessions } = useSessions();
  const { useGetUsers } = useUsers();

  const { data: stats, isLoading: statsLoading } = useGetReportStats();

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = useGetReportHealth();

  const { data: sessions, isLoading: sessionsLoading } = useGetSessions();
  const { data: users, isLoading: usersLoading } = useGetUsers();

  // Get individual report data
  const {
    data: individualReport,
    isLoading: individualLoading,
    error: individualError,
  } = useGetIndividualReport(selectedUser, {
    include_charts: true,
    include_detailed_analysis: true,
    include_recommendations: true,
    include_comparison_data: true,
  });

  // Get session summary report data
  const {
    data: sessionReport,
    isLoading: sessionLoading,
    error: sessionError,
  } = useGetSessionSummaryReport(selectedSession, {
    include_charts: true,
    include_participant_breakdown: true,
    include_test_analysis: true,
  });

  // Get comparative report data
  const {
    data: comparativeReport,
    isLoading: comparativeLoading,
    error: comparativeError,
  } = useGetComparativeReport(selectedSession, {
    include_charts: true,
    include_rankings: true,
    include_distribution_analysis: true,
    comparison_metric: "scaled_score",
  });

  const selectedUserName =
    users?.data?.find((u) => u.id === selectedUser)?.name || "";

  // Helper functions
  const getStrengthLevelColor = (level: string) => {
    switch (level) {
      case "very_high":
        return "bg-green-100 text-green-800";
      case "high":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-gray-100 text-gray-800";
      case "low":
        return "bg-orange-100 text-orange-800";
      case "very_low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat dan analisa hasil laporan psikotes
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

      {/* Main Reports Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Psikotes</CardTitle>
              <CardDescription>
                Lihat dan analisa hasil laporan psikotes berdasarkan jenis yang
                dipilih
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger
                    value="individual"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Laporan Individual</span>
                    <span className="sm:hidden">Individual</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="session"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Ringkasan Sesi</span>
                    <span className="sm:hidden">Sesi</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="comparative"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      Analisis Komparatif
                    </span>
                    <span className="sm:hidden">Komparatif</span>
                  </TabsTrigger>
                </TabsList>

                {/* Individual Report Tab */}
                <TabsContent value="individual" className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="space-y-2 flex-1">
                      <Label>Pilih Peserta</Label>
                      <Popover
                        open={userSearchOpen}
                        onOpenChange={setUserSearchOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userSearchOpen}
                            className="w-full justify-between"
                            disabled={usersLoading}
                          >
                            {selectedUser
                              ? selectedUserName
                              : usersLoading
                                ? "Memuat peserta..."
                                : "Pilih peserta..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Cari peserta..." />
                            <CommandList>
                              <CommandEmpty>
                                Tidak ada peserta ditemukan.
                              </CommandEmpty>
                              <CommandGroup>
                                {users?.data
                                  ?.filter(
                                    (user) => user.role === "participant"
                                  )
                                  .map((user) => (
                                    <CommandItem
                                      key={user.id}
                                      value={`${user.name} ${user.email}`}
                                      onSelect={() => {
                                        setSelectedUser(user.id);
                                        setUserSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedUser === user.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {user.email}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Individual Report Content */}
                  {selectedUser && (
                    <div className="space-y-4">
                      {individualLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner size="lg" />
                        </div>
                      ) : individualError ? (
                        <Card className="border-red-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="h-5 w-5" />
                              <span>Gagal memuat laporan individual</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : individualReport?.data ? (
                        <IndividualReportDisplay
                          data={individualReport.data}
                          getStrengthLevelColor={getStrengthLevelColor}
                        />
                      ) : null}
                    </div>
                  )}
                </TabsContent>

                {/* Session Summary Tab */}
                <TabsContent value="session" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pilih Sesi</Label>
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

                  {/* Session Report Content */}
                  {selectedSession && (
                    <div className="space-y-4">
                      {sessionLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner size="lg" />
                        </div>
                      ) : sessionError ? (
                        <Card className="border-red-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="h-5 w-5" />
                              <span>Gagal memuat ringkasan sesi</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : sessionReport?.data ? (
                        <SessionReportDisplay data={sessionReport.data} />
                      ) : null}
                    </div>
                  )}
                </TabsContent>

                {/* Comparative Analysis Tab */}
                <TabsContent value="comparative" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pilih Sesi untuk Analisis Komparatif</Label>
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

                  {/* Comparative Report Content */}
                  {selectedSession && (
                    <div className="space-y-4">
                      {comparativeLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner size="lg" />
                        </div>
                      ) : comparativeError ? (
                        <Card className="border-red-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="h-5 w-5" />
                              <span>Gagal memuat analisis komparatif</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : comparativeReport?.data ? (
                        <ComparativeReportDisplay
                          data={comparativeReport.data}
                        />
                      ) : null}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                  {Object.entries(health?.data.services || {})
                    .filter(([service, status]) => service !== "batch_reports")
                    .map(([service, status]) => (
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
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Individual Report Display Component
function IndividualReportDisplay({
  data,
  getStrengthLevelColor,
}: {
  data: any;
  getStrengthLevelColor: (level: string) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Participant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informasi Peserta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Nama</Label>
              <p className="text-sm text-muted-foreground">
                {data.participant.name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">
                {data.participant.email}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">NIK</Label>
              <p className="text-sm text-muted-foreground">
                {data.participant.nik}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Jenis Kelamin</Label>
              <p className="text-sm text-muted-foreground">
                {data.participant.gender || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ringkasan Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.assessment_overview.total_tests_completed}
              </div>
              <p className="text-sm text-muted-foreground">Tes Selesai</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.assessment_overview.overall_completion_rate}%
              </div>
              <p className="text-sm text-muted-foreground">
                Tingkat Penyelesaian
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(data.assessment_overview.total_time_spent_minutes)}m
              </div>
              <p className="text-sm text-muted-foreground">Total Waktu</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.overall_assessment.overall_grade || "N/A"}
              </div>
              <p className="text-sm text-muted-foreground">Grade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Performances */}
      <Card>
        <CardHeader>
          <CardTitle>Performa Tes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {data.test_performances?.map((performance: any, index: number) => (
              <AccordionItem key={index} value={`test-${index}`}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">{performance.test_name}</span>
                    <Badge
                      variant="outline"
                      className={`${
                        performance.scaled_score > 80
                          ? "bg-green-100 text-green-700 border-green-600"
                          : performance.scaled_score > 60 &&
                              performance.scaled_score < 80
                            ? "bg-yellow-100 text-yellow-700 border-yellow-600"
                            : "bg-red-100 text-red-700 border-red-600"
                      }`}
                    >
                      Skor:{" "}
                      {performance.scaled_score ||
                        performance.raw_score ||
                        "N/A"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">Kategori</Label>
                        <p className="text-sm text-muted-foreground">
                          {performance.test_category}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm">Penyelesaian</Label>
                        <p className="text-sm text-muted-foreground">
                          {performance.completion_rate}%
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm">Waktu</Label>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(performance.time_spent_minutes)}m
                        </p>
                      </div>
                      {/* <div>
                        <Label className="text-sm">Efisiensi</Label>
                        <p className="text-sm text-muted-foreground">
                          {performance.time_efficiency}%
                        </p>
                      </div> */}
                    </div>

                    {/* Trait Scores */}
                    {performance.trait_scores?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2">
                          Skor Trait
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {performance.trait_scores
                            .slice(0, 6)
                            .map((trait: any, traitIndex: number) => (
                              <div
                                key={traitIndex}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <span className="text-sm">
                                  {trait.trait_name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={getStrengthLevelColor(
                                    trait.strength_level
                                  )}
                                >
                                  {trait.scaled_score}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Rekomendasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recommendations.map((rec: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge
                      variant={
                        rec.priority === "high"
                          ? "destructive"
                          : rec.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {rec.description}
                  </p>
                  {rec.action_items?.length > 0 && (
                    <div>
                      <Label className="text-xs font-medium">
                        Action Items:
                      </Label>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {rec.action_items
                          .slice(0, 3)
                          .map((item: string, itemIndex: number) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Session Report Display Component
function SessionReportDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informasi Sesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Nama Sesi</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_info.session_name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Kode Sesi</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_info.session_code}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Posisi Target</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_info.target_position || "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Proktor</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_info.proctor_name || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participation Stats */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Statistik Partisipasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.participation_stats.total_registered}
              </div>
              <p className="text-sm text-muted-foreground">Terdaftar</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.participation_stats.total_completed}
              </div>
              <p className="text-sm text-muted-foreground">Selesai</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.participation_stats.dropout_count}
              </div>
              <p className="text-sm text-muted-foreground">Dropout</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.participation_stats.completion_rate}%
              </div>
              <p className="text-sm text-muted-foreground">Rate Selesai</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Test Modules Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analisis Modul Tes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {data.test_modules?.map((module: any, index: number) => (
              <AccordionItem key={index} value={`module-${index}`}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">{module.test_name}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {module.completion_rate}% selesai
                      </Badge>
                      <Badge variant="secondary">
                        Skor: {module.average_score}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm">Kategori</Label>
                      <p className="text-sm text-muted-foreground">
                        {module.test_category}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Peserta Mulai</Label>
                      <p className="text-sm text-muted-foreground">
                        {module.participants_started}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Waktu Rata-rata</Label>
                      <p className="text-sm text-muted-foreground">
                        {module.average_time_minutes}m
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Tingkat Kesulitan</Label>
                      <Badge variant="outline">{module.difficulty_level}</Badge>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Top Performers */}
      {data.performance_distribution?.top_performers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.performance_distribution.top_performers.map(
                (performer: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <p className="font-medium">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rank #{index + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-lg ${
                          performer.overall_score > 80
                            ? "bg-green-100 text-green-700 border-green-600"
                            : performer.overall_score > 60 &&
                                performer.overall_score < 80
                              ? "bg-yellow-100 text-yellow-700 border-yellow-600"
                              : "bg-red-100 text-red-700 border-red-600"
                        }`}
                      >
                        {performer.overall_score}
                      </Badge>
                      {/* <p className="text-sm text-muted-foreground">
                        {performer.percentile}%
                      </p> */}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Comparative Report Display Component
function ComparativeReportDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Session Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Konteks Analisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Sesi</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_context.session_name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Total Peserta</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_context.total_participants}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Metrik Perbandingan</Label>
              <p className="text-sm text-muted-foreground">
                {data.session_context.comparison_metric}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistical Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analisis Statistik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.statistical_analysis.mean_score}
              </div>
              <p className="text-sm text-muted-foreground">Rata-rata</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.statistical_analysis.median_score}
              </div>
              <p className="text-sm text-muted-foreground">Median</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.statistical_analysis.standard_deviation}
              </div>
              <p className="text-sm text-muted-foreground">Std Dev</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.statistical_analysis.score_range.min}-
                {data.statistical_analysis.score_range.max}
              </div>
              <p className="text-sm text-muted-foreground">Range</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participant Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Peringkat Peserta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.participant_rankings
              ?.slice(0, 10)
              .map((participant: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                      {participant.rank}
                    </div>
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {participant.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${
                          participant.overall_score > 80
                            ? "bg-green-100 text-green-700 border-green-600"
                            : participant.overall_score > 60 &&
                                participant.overall_score < 80
                              ? "bg-yellow-100 text-yellow-700 border-yellow-600"
                              : "bg-red-100 text-red-700 border-red-600"
                        }`}
                      >
                        Nilai: <strong>{participant.overall_score}</strong>
                      </Badge>
                      <Badge variant="secondary">
                        Selesai: {participant.completion_rate}%
                      </Badge>
                    </div>
                    {/* <p className="text-sm text-muted-foreground mt-1">
                      {participant.recommendation_category}
                    </p> */}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Hiring Recommendations */}
      {/* {data.hiring_recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Rekomendasi Hiring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-green-600">
                  {data.hiring_recommendations.highly_recommended?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Sangat Direkomendasikan
                </p>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {data.hiring_recommendations.recommended?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Direkomendasikan
                </p>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-orange-600">
                  {data.hiring_recommendations.conditional?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Bersyarat</p>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-red-600">
                  {data.hiring_recommendations.not_recommended?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Tidak Direkomendasikan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}
