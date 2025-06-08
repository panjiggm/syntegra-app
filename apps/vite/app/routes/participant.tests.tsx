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
import { ParticipantRoute } from "~/components/auth/route-guards";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
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

// Mock data - nanti akan diganti dengan API call
const mockAnalytics = {
  totalSessions: 3,
  completedSessions: 1,
  upcomingSessions: 1,
  expiredSessions: 1,
};

const mockSessions = [
  {
    id: "session-1",
    session_name: "Tes Seleksi Security",
    session_code: "SEC-001",
    start_time: "2024-12-15T08:00:00Z",
    end_time: "2024-12-15T10:00:00Z",
    target_position: "Security Officer",
    status: "active",
    location: "Ruang Meeting A",
    description:
      "Tes psikologi untuk posisi security dengan fokus pada keamanan dan kedisiplinan",
    is_active: true,
    is_expired: false,
    time_remaining: "2 hari 5 jam",
    current_participants: 15,
    max_participants: 25,
    session_modules: [
      {
        id: "mod-1",
        test: {
          id: "wais-1",
          name: "WAIS Intelligence Test",
          description:
            "Tes kecerdasan untuk mengukur kemampuan kognitif secara komprehensif",
          module_type: "intelligence",
          category: "wais",
          time_limit: 45,
          icon: "🧠",
          card_color: "from-blue-500 to-blue-600",
          total_questions: 60,
          status: "active",
        },
      },
      {
        id: "mod-2",
        test: {
          id: "mbti-1",
          name: "MBTI Personality Test",
          description:
            "Tes kepribadian untuk mengidentifikasi tipe kepribadian Myers-Briggs",
          module_type: "personality",
          category: "mbti",
          time_limit: 30,
          icon: "👥",
          card_color: "from-green-500 to-green-600",
          total_questions: 93,
          status: "active",
        },
      },
      {
        id: "mod-3",
        test: {
          id: "wartegg-1",
          name: "Wartegg Drawing Test",
          description:
            "Tes proyektif gambar untuk menganalisis kepribadian melalui gambar",
          module_type: "projective",
          category: "wartegg",
          time_limit: 60,
          icon: "🎨",
          card_color: "from-purple-500 to-purple-600",
          total_questions: 8,
          status: "active",
        },
      },
      {
        id: "mod-4",
        test: {
          id: "riasec-1",
          name: "RIASEC Interest Test",
          description:
            "Tes minat untuk mengidentifikasi kesesuaian karir berdasarkan Holland Theory",
          module_type: "interest",
          category: "riasec",
          time_limit: 25,
          icon: "🎯",
          card_color: "from-orange-500 to-orange-600",
          total_questions: 42,
          status: "active",
        },
      },
    ],
  },
  {
    id: "session-2",
    session_name: "Tes Seleksi Staff",
    session_code: "STF-002",
    start_time: "2024-12-10T12:00:00Z",
    end_time: "2024-12-10T14:00:00Z",
    target_position: "Staff Administration",
    status: "completed",
    location: "Ruang Meeting B",
    description:
      "Tes psikologi untuk posisi staff dengan fokus pada kemampuan administratif",
    is_active: false,
    is_expired: true,
    time_remaining: "Expired",
    current_participants: 20,
    max_participants: 20,
    session_modules: [
      {
        id: "mod-5",
        test: {
          id: "kraepelin-1",
          name: "Kraepelin Test",
          description:
            "Tes konsentrasi dan ketahanan untuk mengukur konsistensi kerja",
          module_type: "cognitive",
          category: "kraepelin",
          time_limit: 30,
          icon: "📊",
          card_color: "from-red-500 to-red-600",
          total_questions: 500,
          status: "active",
        },
      },
      {
        id: "mod-6",
        test: {
          id: "big-five-1",
          name: "Big Five Personality",
          description:
            "Tes kepribadian berdasarkan lima faktor utama kepribadian",
          module_type: "personality",
          category: "big_five",
          time_limit: 25,
          icon: "⭐",
          card_color: "from-indigo-500 to-indigo-600",
          total_questions: 50,
          status: "active",
        },
      },
      {
        id: "mod-7",
        test: {
          id: "papi-1",
          name: "PAPI Kostick Test",
          description:
            "Tes untuk mengukur preferensi perilaku dalam lingkungan kerja",
          module_type: "personality",
          category: "papi_kostick",
          time_limit: 40,
          icon: "💼",
          card_color: "from-teal-500 to-teal-600",
          total_questions: 90,
          status: "active",
        },
      },
      {
        id: "mod-8",
        test: {
          id: "dap-1",
          name: "Draw A Person Test",
          description: "Tes proyektif gambar orang untuk analisis kepribadian",
          module_type: "projective",
          category: "dap",
          time_limit: 20,
          icon: "👤",
          card_color: "from-pink-500 to-pink-600",
          total_questions: 3,
          status: "active",
        },
      },
    ],
  },
  {
    id: "session-3",
    session_name: "Tes Seleksi Manager",
    session_code: "MGR-003",
    start_time: "2024-12-20T08:00:00Z",
    end_time: "2024-12-20T10:00:00Z",
    target_position: "Manager",
    status: "draft",
    location: "Ruang Meeting C",
    description:
      "Tes psikologi untuk posisi manager dengan fokus pada kepemimpinan",
    is_active: false,
    is_expired: false,
    time_remaining: "7 hari 3 jam",
    current_participants: 5,
    max_participants: 15,
    session_modules: [
      {
        id: "mod-9",
        test: {
          id: "raven-1",
          name: "Raven's Progressive Matrices",
          description:
            "Tes kecerdasan non-verbal untuk mengukur kemampuan pemecahan masalah",
          module_type: "intelligence",
          category: "raven",
          time_limit: 40,
          icon: "🧩",
          card_color: "from-cyan-500 to-cyan-600",
          total_questions: 36,
          status: "active",
        },
      },
      {
        id: "mod-10",
        test: {
          id: "epps-1",
          name: "EPPS Personality Test",
          description:
            "Tes untuk mengukur kebutuhan psikologis dan motivasi individu",
          module_type: "personality",
          category: "epps",
          time_limit: 35,
          icon: "💡",
          card_color: "from-amber-500 to-amber-600",
          total_questions: 225,
          status: "active",
        },
      },
      {
        id: "mod-11",
        test: {
          id: "army-alpha-1",
          name: "Army Alpha Test",
          description:
            "Tes kecerdasan untuk mengukur kemampuan verbal dan numerik",
          module_type: "intelligence",
          category: "army_alpha",
          time_limit: 50,
          icon: "🎖️",
          card_color: "from-emerald-500 to-emerald-600",
          total_questions: 80,
          status: "active",
        },
      },
      {
        id: "mod-12",
        test: {
          id: "htp-1",
          name: "House-Tree-Person Test",
          description:
            "Tes proyektif untuk menganalisis kepribadian melalui gambar rumah, pohon, orang",
          module_type: "projective",
          category: "htp",
          time_limit: 45,
          icon: "🏠",
          card_color: "from-lime-500 to-lime-600",
          total_questions: 3,
          status: "active",
        },
      },
    ],
  },
];

const getStatusBadge = (
  status: string,
  isActive: boolean,
  isExpired: boolean
) => {
  if (isExpired) {
    return (
      <Badge variant="destructive">
        <AlertCircle className="size-3 mr-1" />
        Expired
      </Badge>
    );
  }

  if (status === "completed") {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        <CheckCircle className="size-3 mr-1" />
        Selesai
      </Badge>
    );
  }

  if (isActive) {
    return (
      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
        <Timer className="size-3 mr-1" />
        Aktif
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock className="size-3 mr-1" />
      Menunggu
    </Badge>
  );
};

function TestsContent() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate overall progress
  const totalTests = mockSessions.reduce(
    (acc, session) => acc + session.session_modules.length,
    0
  );
  const completedTests = mockSessions
    .filter((session) => session.status === "completed")
    .reduce((acc, session) => acc + session.session_modules.length, 0);
  const progressPercentage =
    totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tes Psikologi Saya
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Kelola dan ikuti tes psikologi yang tersedia
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Halo, {user?.name}!</p>
              <p className="text-xs text-gray-500">{user?.phone}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockAnalytics.totalSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi tes yang tersedia
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
                {mockAnalytics.completedSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi yang telah diselesaikan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Timer className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {mockAnalytics.upcomingSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi yang akan datang
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertCircle className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {mockAnalytics.expiredSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi yang telah berakhir
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Progress Tes</CardTitle>
                <CardDescription>
                  {completedTests} dari {totalTests} modul tes telah
                  diselesaikan
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-xs text-muted-foreground">Selesai</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Sessions and Test Modules */}
        <div className="space-y-8">
          {mockSessions.map((session, sessionIndex) => (
            <div key={session.id} className="space-y-6">
              {/* Session Header */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          {session.session_name}
                        </CardTitle>
                        {getStatusBadge(
                          session.status,
                          session.is_active,
                          session.is_expired
                        )}
                      </div>
                      <CardDescription className="text-base">
                        {session.description}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Kode: {session.session_code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.time_remaining}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {new Date(session.start_time).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.start_time).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}{" "}
                          -{" "}
                          {new Date(session.end_time).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {session.target_position}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Posisi target
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{session.location}</div>
                        <div className="text-xs text-muted-foreground">
                          Lokasi tes
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {session.current_participants}/
                          {session.max_participants}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Peserta
                        </div>
                      </div>
                    </div>
                  </div>

                  {session.is_active && !session.is_expired && (
                    <div className="mt-4 pt-4 border-t">
                      <Button className="w-full sm:w-auto">
                        Mulai Tes Sekarang
                      </Button>
                    </div>
                  )}

                  {session.status === "completed" && (
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" className="w-full sm:w-auto">
                        Lihat Detail Tes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {session.session_modules.map((module) => (
                  <div key={module.id} className="relative">
                    <CardTestModule test={module.test as any} />
                    {session.status === "completed" && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="size-3 mr-1" />
                          Selesai
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {sessionIndex < mockSessions.length - 1 && (
                <div className="border-b border-gray-200 pt-4"></div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {mockSessions.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto flex items-center justify-center size-12 bg-gray-100 rounded-full mb-4">
                <Target className="size-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Belum Ada Tes Tersedia
              </h3>
              <p className="text-gray-600 mb-4">
                Saat ini belum ada sesi tes yang tersedia untuk Anda. Silakan
                hubungi administrator untuk informasi lebih lanjut.
              </p>
              <Button variant="outline">Hubungi Administrator</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
