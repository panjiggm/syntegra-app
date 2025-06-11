import { useState } from "react";
import type { Route } from "./+types/admin.live-test";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// Icons
import {
  Monitor,
  Users,
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  TrendingUp,
  Target,
  Timer,
} from "lucide-react";

// Hooks
import { useLiveTest } from "~/hooks/use-live-test";
import { useSessions } from "~/hooks/use-sessions";

// Utils
import { formatTime } from "~/lib/utils/date";

export function meta({}: Route.MetaArgs) {
  return [
    { title: `Live Test Monitoring - Syntegra Psikotes` },
    { name: "description", content: "Monitor tes psikologi secara real-time" },
  ];
}

export default function AdminLiveTestPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Hooks
  const { useGetSessions } = useSessions();
  const {
    useGetLiveTestData,
    useGetSessionParticipantsProgress,
    useGetLiveTestStats,
  } = useLiveTest();

  // Get active sessions for selection
  const { data: sessionsResponse, isLoading: sessionsLoading } = useGetSessions(
    {
      status: "active",
      limit: 50,
    }
  );

  // Get live test data for selected session
  const {
    data: liveTestData,
    isLoading: liveTestLoading,
    refetch: refetchLiveTest,
  } = useGetLiveTestData(selectedSessionId, {
    enabled: !!selectedSessionId,
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds
  });

  // Get participants progress
  const {
    data: participantsProgress,
    isLoading: progressLoading,
    refetch: refetchProgress,
  } = useGetSessionParticipantsProgress(selectedSessionId, {
    enabled: !!selectedSessionId,
    refetchInterval: autoRefresh ? 3000 : false, // Refresh every 3 seconds
  });

  // Get live stats
  const {
    data: liveStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetLiveTestStats(selectedSessionId, {
    enabled: !!selectedSessionId,
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds
  });

  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  // Manual refresh all data
  const handleRefreshAll = () => {
    if (selectedSessionId) {
      refetchLiveTest();
      refetchProgress();
      refetchStats();
    }
  };

  // Toggle auto refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Get available sessions
  const availableSessions =
    sessionsResponse?.data?.filter(
      (session) => session.status === "active" && session.is_active
    ) || [];

  // Get selected session info
  const selectedSession = availableSessions.find(
    (session) => session.id === selectedSessionId
  );

  // Status badge for participants
  const getParticipantStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case "registered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            Siap Mulai
          </Badge>
        );
      case "started":
        return (
          <Badge className="bg-green-100 text-green-700">
            <PlayCircle className="h-3 w-3 mr-1" />
            Sedang Mengerjakan ({progress}%)
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-purple-100 text-purple-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Selesai
          </Badge>
        );
      case "no_show":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Tidak Hadir
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate time remaining for participant
  const getTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return "Waktu Habis";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (diffHours > 0) {
      return `${diffHours}j ${diffMinutes}m ${diffSeconds}s`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`;
    } else {
      return `${diffSeconds}s`;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8 text-blue-600" />
            Live Test Monitoring
          </h1>
          <p className="text-muted-foreground">
            Monitor tes psikologi secara real-time
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={toggleAutoRefresh}
            className={autoRefresh ? "bg-green-50 text-green-700" : ""}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            Auto Refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Manual
          </Button>
        </div>
      </div>

      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Sesi Test Aktif</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <LoadingSpinner size="sm" />
          ) : availableSessions.length > 0 ? (
            <Select
              value={selectedSessionId}
              onValueChange={handleSessionSelect}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Pilih sesi test yang sedang berlangsung..." />
              </SelectTrigger>
              <SelectContent>
                {availableSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        LIVE
                      </Badge>
                      <span>{session.session_name}</span>
                      <span className="text-muted-foreground">
                        ({session.session_code})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-muted-foreground">
                Tidak ada sesi test yang sedang berlangsung
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Test Dashboard */}
      {selectedSessionId && selectedSession && (
        <>
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Informasi Sesi: {selectedSession.session_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium">Kode Sesi</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedSession.session_code}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Waktu Test</p>
                  <p className="text-lg">
                    {formatTime(selectedSession.start_time)} -{" "}
                    {formatTime(selectedSession.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Posisi Target</p>
                  <Badge variant="outline">
                    {selectedSession.target_position}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Durasi Test</p>
                  <p className="text-lg">
                    {selectedSession.session_duration_hours} jam
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Statistics */}
          {liveStats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Peserta
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {liveStats.total_participants}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Terdaftar dalam sesi
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sedang Mengerjakan
                  </CardTitle>
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {liveStats.active_participants}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      (liveStats.active_participants /
                        liveStats.total_participants) *
                      100
                    ).toFixed(1)}
                    % dari total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sudah Selesai
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {liveStats.completed_participants}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      (liveStats.completed_participants /
                        liveStats.total_participants) *
                      100
                    ).toFixed(1)}
                    % dari total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completion Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {liveStats.completion_rate}%
                  </div>
                  <Progress
                    value={liveStats.completion_rate}
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Participants Progress Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Progress Peserta Real-time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : participantsProgress && participantsProgress.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peserta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Modul Saat Ini</TableHead>
                        <TableHead>Waktu Tersisa</TableHead>
                        <TableHead>Mulai Test</TableHead>
                        <TableHead>Estimasi Selesai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantsProgress.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {participant.user.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {participant.user.email}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {getParticipantStatusBadge(
                              participant.status,
                              participant.overall_progress
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {participant.overall_progress}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {participant.completed_questions}/
                                  {participant.total_questions}
                                </span>
                              </div>
                              <Progress value={participant.overall_progress} />
                            </div>
                          </TableCell>

                          <TableCell>
                            {participant.current_module ? (
                              <div>
                                <div className="font-medium">
                                  {participant.current_module.test_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Soal{" "}
                                  {participant.current_module.current_question}/
                                  {participant.current_module.total_questions}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {participant.estimated_end_time ? (
                              <div className="font-mono text-sm">
                                {getTimeRemaining(
                                  participant.estimated_end_time
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {participant.started_at ? (
                              <div className="text-sm">
                                {formatTime(participant.started_at)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Belum mulai
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {participant.estimated_completion_time ? (
                              <div className="text-sm">
                                {formatTime(
                                  participant.estimated_completion_time
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">
                    Belum ada peserta yang aktif
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Modules Progress */}
          {liveTestData?.modules_progress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Progress per Modul Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {liveTestData.modules_progress.map((module) => (
                    <Card
                      key={module.test_id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {module.icon && <span>{module.icon}</span>}
                          {module.test_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Partisipasi:</span>
                          <span className="font-medium">
                            {module.participants_started}/
                            {module.total_participants}
                          </span>
                        </div>
                        <Progress
                          value={
                            (module.participants_started /
                              module.total_participants) *
                            100
                          }
                        />
                        <div className="flex justify-between text-sm">
                          <span>Selesai:</span>
                          <span className="font-medium text-green-600">
                            {module.participants_completed}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg. completion: {module.average_completion_time}{" "}
                          menit
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
