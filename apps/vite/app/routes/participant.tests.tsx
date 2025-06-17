import React from "react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ParticipantRoute } from "~/components/auth/route-guards";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useParticipantSessions } from "~/hooks/use-participant-sessions";
import CardTestModule from "~/components/card/card-test-module";
import {
  Clock,
  Calendar,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  Timer,
  MapPin,
  BookOpen,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import type { Route } from "./+types/participant.tests";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Tests - Syntegra Psikotes" },
    { name: "description", content: "Daftar tes psikologi yang tersedia" },
  ];
}

export default function ParticipantTests() {
  return (
    <ParticipantRoute>
      <TestsContent />
    </ParticipantRoute>
  );
}

function TestsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    useGetParticipantSessions,
    getTestStatusBadge,
    getSessionStatusBadge,
    formatTimeSpent,
    formatTimeRemaining,
    getQuestionTypeLabel,
    canStartTest,
    canContinueTest,
  } = useParticipantSessions();

  // Get participant's sessions with progress
  const sessionsQuery = useGetParticipantSessions();

  if (authLoading || sessionsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (sessionsQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
            <p className="text-muted-foreground mb-4">
              Terjadi kesalahan saat memuat data sesi tes Anda.
            </p>
            <Button onClick={() => sessionsQuery.refetch()}>Coba Lagi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = sessionsQuery.data;
  const sessions = data?.sessions || [];
  const summary = data?.summary;
  const participantInfo = data?.participant_info;

  // Create test modules data for CardTestModule component
  const createTestModuleData = (test: any) => ({
    id: test.test_id,
    name: test.test_name,
    description: `${getQuestionTypeLabel(test.question_type)} • ${test.total_questions} soal • ${test.time_limit} menit`,
    module_type: test.test_module_type,
    category: test.test_category,
    time_limit: test.time_limit,
    total_questions: test.total_questions,
    icon: test.icon,
    card_color: test.card_color,
    status: "active" as const,
    question_type: test.question_type,
  });

  const getTestProgressBadge = (test: any) => {
    const statusInfo = getTestStatusBadge(test.progress_status);

    return (
      <Badge className={`${statusInfo.color} text-xs border`}>
        {test.progress_status === "completed" ||
        test.progress_status === "auto_completed" ? (
          <CheckCircle className="size-3 mr-1" />
        ) : test.progress_status === "in_progress" ? (
          <Timer className="size-3 mr-1" />
        ) : (
          <Clock className="size-3 mr-1" />
        )}
        {statusInfo.label}
      </Badge>
    );
  };

  const getSessionBadge = (session: any) => {
    const statusInfo = getSessionStatusBadge(session);

    return (
      <Badge className={`${statusInfo.color} text-xs border`}>
        {session.is_expired ? (
          <AlertCircle className="size-3 mr-1" />
        ) : session.session_status === "completed" ? (
          <CheckCircle className="size-3 mr-1" />
        ) : session.is_active ? (
          <Timer className="size-3 mr-1" />
        ) : (
          <Clock className="size-3 mr-1" />
        )}
        {statusInfo.label}
      </Badge>
    );
  };

  const getTestActionButton = (test: any, session: any) => {
    if (
      test.progress_status === "completed" ||
      test.progress_status === "auto_completed"
    ) {
      return (
        <Button variant="outline" size="sm" disabled>
          <CheckCircle className="size-4 mr-2" />
          Selesai
        </Button>
      );
    }

    if (test.progress_status === "in_progress") {
      if (test.is_time_expired) {
        return (
          <Button variant="destructive" size="sm" disabled>
            <AlertCircle className="size-4 mr-2" />
            Waktu Habis
          </Button>
        );
      }

      if (canContinueTest(test, session)) {
        return (
          <Button size="sm">
            <Play className="size-4 mr-2" />
            Lanjutkan Tes
          </Button>
        );
      }
    }

    if (canStartTest(test, session)) {
      return (
        <Button size="sm">
          <ChevronRight className="size-4 mr-2" />
          Mulai Tes
        </Button>
      );
    }

    return (
      <Button variant="secondary" size="sm" disabled>
        <Pause className="size-4 mr-2" />
        Tidak Tersedia
      </Button>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.total_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi tes yang terdaftar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.completed_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi yang telah diselesaikan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif</CardTitle>
              <Timer className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary?.active_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">Sesi yang aktif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Berakhir</CardTitle>
              <AlertCircle className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.expired_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi yang telah berakhir
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Progress Tes Keseluruhan</CardTitle>
                <CardDescription>
                  {summary?.completed_tests_across_sessions || 0} dari{" "}
                  {summary?.total_tests_across_sessions || 0} tes telah
                  diselesaikan
                </CardDescription>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold text-primary">
                  {summary?.overall_progress_percentage || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Selesai</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress
              value={summary?.overall_progress_percentage || 0}
              className="h-3"
            />
          </CardContent>
        </Card>

        {/* Sessions Accordion */}
        {sessions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                Sesi Tes Anda
              </CardTitle>
              <CardDescription>
                Klik pada sesi untuk melihat detail dan progress tes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {sessions.map((session) => (
                  <AccordionItem
                    key={session.session_id}
                    value={session.session_id}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 items-start justify-between text-left pr-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="font-semibold text-base truncate min-w-0 flex-1">
                                  {session.session_name}
                                </h3>
                                <div className="flex-shrink-0">
                                  {getSessionBadge(session)}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {session.session_description ||
                                  "Tidak ada deskripsi"}
                              </p>

                              {/* Session Info Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <Calendar className="size-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {new Date(
                                        session.start_time
                                      ).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {new Date(
                                        session.start_time
                                      ).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Target className="size-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium truncate">
                                      {session.target_position}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Posisi target
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <MapPin className="size-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium truncate">
                                      {session.session_location ||
                                        "Tidak ditentukan"}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Lokasi tes
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <CheckCircle className="size-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {session.completed_tests}/
                                      {session.total_tests}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Tes selesai
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-left sm:text-right flex-shrink-0">
                              <div className="text-sm font-medium">
                                Kode: {session.session_code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatTimeRemaining(session)}
                              </div>
                              <div className="mt-1">
                                <Progress
                                  value={session.session_progress_percentage}
                                  className="h-2 w-20"
                                />
                                <div className="text-xs text-muted-foreground mt-1">
                                  {session.session_progress_percentage}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-4">
                      {/* Session Action Button */}
                      <div className="mb-6">
                        {session.is_active &&
                          !session.is_expired &&
                          session.in_progress_tests > 0 && (
                            <Button className="w-full sm:w-auto mr-2">
                              <Play className="size-4 mr-2" />
                              Lanjutkan Tes
                            </Button>
                          )}

                        {session.session_status === "completed" && (
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            <BookOpen className="size-4 mr-2" />
                            Lihat Hasil
                          </Button>
                        )}
                      </div>

                      {/* Test Progress Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-sm">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="font-semibold text-green-700">
                            {session.completed_tests}
                          </div>
                          <div className="text-green-600">Selesai</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="font-semibold text-blue-700">
                            {session.in_progress_tests}
                          </div>
                          <div className="text-blue-600">Berlangsung</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="font-semibold text-gray-700">
                            {session.not_started_tests}
                          </div>
                          <div className="text-gray-600">Belum Mulai</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="font-semibold text-orange-700">
                            {session.total_tests}
                          </div>
                          <div className="text-orange-600">Total Tes</div>
                        </div>
                      </div>

                      {/* Test Modules List */}
                      {session.tests && session.tests.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-sm mb-4 text-muted-foreground">
                            Detail Tes ({session.tests.length} tes)
                          </h4>
                          <div className="space-y-4">
                            {session.tests
                              .sort((a, b) => a.sequence - b.sequence)
                              .map((test) => (
                                <div
                                  key={test.test_id}
                                  className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-white"
                                >
                                  {/* Test Card */}
                                  <div className="flex-shrink-0">
                                    <CardTestModule
                                      test={createTestModuleData(test)}
                                    />
                                  </div>

                                  {/* Test Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                          <h5 className="font-medium truncate min-w-0 flex-1">
                                            {test.test_name}
                                          </h5>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {getTestProgressBadge(test)}
                                            {!test.is_required && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                Opsional
                                              </Badge>
                                            )}
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground mb-3">
                                          <div>
                                            <span className="font-medium">
                                              Tipe:
                                            </span>{" "}
                                            {getQuestionTypeLabel(
                                              test.question_type
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Waktu:
                                            </span>{" "}
                                            {test.time_limit} menit
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Soal:
                                            </span>{" "}
                                            {test.total_questions}
                                          </div>
                                        </div>

                                        {/* Progress Info */}
                                        {test.progress_status !==
                                          "not_started" && (
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                                            {/* <div>
                                              <span className="font-medium text-muted-foreground">
                                                Progress:
                                              </span>{" "}
                                              <span className="text-primary">
                                                {test.answered_questions}/
                                                {test.total_questions} soal (
                                                {test.progress_percentage}%)
                                              </span>
                                            </div> */}
                                            <div>
                                              <span className="font-medium text-muted-foreground">
                                                Waktu Terpakai:
                                              </span>{" "}
                                              <span>
                                                {formatTimeSpent(
                                                  test.time_spent
                                                )}
                                              </span>
                                            </div>
                                            {test.completed_at && (
                                              <div>
                                                <span className="font-medium text-muted-foreground">
                                                  Selesai:
                                                </span>{" "}
                                                <span>
                                                  {new Date(
                                                    test.completed_at
                                                  ).toLocaleDateString(
                                                    "id-ID"
                                                  )}{" "}
                                                  {new Date(
                                                    test.completed_at
                                                  ).toLocaleTimeString(
                                                    "id-ID",
                                                    {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    }
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Progress Bar */}
                                        {/* {test.progress_status !==
                                          "not_started" && (
                                          <div className="mb-3">
                                            <Progress
                                              value={test.progress_percentage}
                                              className="h-2"
                                            />
                                          </div>
                                        )} */}
                                      </div>

                                      {/* Action Button */}
                                      <div className="flex-shrink-0">
                                        {getTestActionButton(test, session)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="size-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            Belum ada tes yang ditambahkan dalam sesi ini
                          </p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto flex items-center justify-center size-12 bg-gray-100 rounded-full mb-4">
                <Target className="size-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Belum Ada Sesi Terdaftar
              </h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Anda belum terdaftar dalam sesi tes apapun. Silakan hubungi
                administrator untuk mendaftarkan Anda dalam sesi tes.
              </p>
              <Button variant="outline">Hubungi Administrator</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
