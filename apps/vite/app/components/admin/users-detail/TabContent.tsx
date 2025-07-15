import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { SimpleRadarChart, SimpleBarChart } from "~/components/ui/chart";
import { Target, Award, TrendingUp, Clock } from "lucide-react";

interface PersonalInfo {
  phone: string;
  gender: "male" | "female" | "other";
  birth_place: string | null;
  birth_date: string | null;
  age: number | null;
  religion: string | null;
  education: string | null;
  address: {
    full_address: string | null;
    province: string | null;
    regency: string | null;
    district: string | null;
    village: string | null;
    postal_code: string | null;
  };
}

interface TestSession {
  id: string;
  session_name: string;
  session_code: string;
  start_time: string;
  end_time: string;
  status: string;
  participant_status: string;
  score?: number;
  completion_percentage?: number;
}

interface TestAttempt {
  id: string;
  test_name: string;
  test_category: string;
  module_type: string;
  attempt_date: string;
  duration_minutes: number;
  status: string;
  raw_score?: number;
  scaled_score?: number;
  percentile?: number;
  grade?: string;
  is_passed?: boolean;
}

interface TestResult {
  test_name: string;
  category: string;
  traits: Array<{
    name: string;
    score: number;
    description: string;
    category: string;
  }>;
  recommendations: string[];
  detailed_analysis: any;
}

interface TestStatistics {
  total_sessions: number;
  completed_sessions: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  total_time_spent_minutes: number;
  completion_rate: number;
  categories_attempted: string[];
}

interface PerformanceByCategory {
  category: string;
  attempts: number;
  average_score: number;
  best_score: number;
  completion_rate: number;
}

interface PsychotestHistory {
  sessions: TestSession[];
  attempts: TestAttempt[];
  results_analysis: TestResult[];
  statistics: TestStatistics;
  performance_by_category: PerformanceByCategory[];
}

interface TabContentProps {
  activeTab: "profile" | "tests" | "analysis";
  personalInfo: PersonalInfo;
  psychotestHistory: PsychotestHistory | null;
}

export function TabContent({
  activeTab,
  personalInfo,
  psychotestHistory,
}: TabContentProps) {
  // Helper functions
  const getGenderLabel = (gender: string) => {
    const labels = { male: "Laki-laki", female: "Perempuan", other: "Lainnya" };
    return labels[gender as keyof typeof labels] || gender;
  };

  const getReligionLabel = (religion: string | null) => {
    if (!religion) return "-";
    const labels = {
      islam: "Islam",
      kristen: "Kristen",
      katolik: "Katolik",
      hindu: "Hindu",
      buddha: "Buddha",
      konghucu: "Konghucu",
      other: "Lainnya",
    };
    return labels[religion as keyof typeof labels] || religion;
  };

  const getEducationLabel = (education: string | null) => {
    if (!education) return "-";
    const labels = {
      sd: "SD",
      smp: "SMP",
      sma: "SMA",
      diploma: "Diploma",
      s1: "S1",
      s2: "S2",
      s3: "S3",
      other: "Lainnya",
    };
    return labels[education as keyof typeof labels] || education;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Tidak pernah";
    return new Date(dateStr).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-700",
      in_progress: "bg-blue-100 text-blue-700",
      started: "bg-yellow-100 text-yellow-700",
      abandoned: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-700",
    };

    const labels = {
      completed: "Selesai",
      in_progress: "Berlangsung",
      started: "Dimulai",
      abandoned: "Dibatalkan",
      expired: "Kedaluwarsa",
    };

    return (
      <Badge
        className={
          variants[status as keyof typeof variants] ||
          "bg-gray-100 text-gray-700"
        }
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (activeTab === "profile") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
            <CardDescription>Data pribadi dan kontak pengguna</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Jenis Kelamin</p>
                <p className="font-medium">
                  {getGenderLabel(personalInfo.gender)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agama</p>
                <p className="font-medium">
                  {getReligionLabel(personalInfo.religion)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tempat Lahir</p>
                <p className="font-medium">{personalInfo.birth_place || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Lahir</p>
                <p className="font-medium">
                  {personalInfo.birth_date
                    ? formatDate(personalInfo.birth_date)
                    : "-"}
                  {personalInfo.age && (
                    <span className="text-muted-foreground ml-2">
                      ({personalInfo.age} tahun)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Pendidikan</p>
              <p className="font-medium">
                {getEducationLabel(personalInfo.education)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Alamat</CardTitle>
            <CardDescription>Informasi tempat tinggal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {personalInfo.address.full_address && (
              <div>
                <p className="text-sm text-muted-foreground">Alamat Lengkap</p>
                <p className="font-medium">
                  {personalInfo.address.full_address}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Provinsi</p>
                <p className="font-medium">
                  {personalInfo.address.province || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kabupaten/Kota</p>
                <p className="font-medium">
                  {personalInfo.address.regency || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kecamatan</p>
                <p className="font-medium">
                  {personalInfo.address.district || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kelurahan/Desa</p>
                <p className="font-medium">
                  {personalInfo.address.village || "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Kode Pos</p>
              <p className="font-medium">
                {personalInfo.address.postal_code || "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "tests" && psychotestHistory) {
    return (
      <div className="space-y-6">
        {/* Test Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Sesi Tes</CardTitle>
            <CardDescription>
              Riwayat partisipasi dalam sesi psikotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {psychotestHistory.sessions.length > 0 ? (
              <div className="space-y-4">
                {psychotestHistory.sessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{session.session_name}</h4>
                      {getStatusBadge(session.participant_status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Kode Sesi</p>
                        <p className="font-medium">{session.session_code}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Waktu</p>
                        <p className="font-medium">
                          {formatDateTime(session.start_time)}
                        </p>
                      </div>
                      {session.score && (
                        <div>
                          <p className="text-muted-foreground">Skor</p>
                          <p className="font-medium">{session.score}</p>
                        </div>
                      )}
                      {session.completion_percentage && (
                        <div>
                          <p className="text-muted-foreground">Penyelesaian</p>
                          <p className="font-medium">
                            {session.completion_percentage}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Belum ada riwayat sesi tes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Percobaan Tes</CardTitle>
            <CardDescription>
              Detail percobaan untuk setiap modul tes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {psychotestHistory.attempts.length > 0 ? (
              <div className="space-y-4">
                {psychotestHistory.attempts.map((attempt) => (
                  <div key={attempt.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{attempt.test_name}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">{attempt.test_category}</Badge>
                        {getStatusBadge(attempt.status)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tanggal</p>
                        <p className="font-medium">
                          {formatDate(attempt.attempt_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Durasi</p>
                        <p className="font-medium">
                          {attempt.duration_minutes} menit
                        </p>
                      </div>
                      {attempt.scaled_score && (
                        <div>
                          <p className="text-muted-foreground">Skor</p>
                          <p className="font-medium">{attempt.scaled_score}</p>
                        </div>
                      )}
                      {attempt.percentile && (
                        <div>
                          <p className="text-muted-foreground">Persentil</p>
                          <p className="font-medium">{attempt.percentile}%</p>
                        </div>
                      )}
                      {attempt.grade && (
                        <div>
                          <p className="text-muted-foreground">Grade</p>
                          <Badge
                            variant={
                              attempt.is_passed ? "default" : "destructive"
                            }
                          >
                            {attempt.grade}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Belum ada riwayat percobaan tes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "analysis" && psychotestHistory) {
    return (
      <div className="space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sesi</p>
                  <p className="text-2xl font-bold">
                    {psychotestHistory.statistics.total_sessions}
                  </p>
                </div>
                <Target className="size-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tes Selesai</p>
                  <p className="text-2xl font-bold">
                    {psychotestHistory.statistics.completed_attempts}
                  </p>
                </div>
                <Award className="size-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Rata-rata Skor
                  </p>
                  <p className="text-2xl font-bold">
                    {psychotestHistory.statistics.average_score.toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="size-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Waktu</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      psychotestHistory.statistics.total_time_spent_minutes / 60
                    )}
                    h
                  </p>
                </div>
                <Clock className="size-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consolidated Test Results & Performance Analysis */}
        {(psychotestHistory.results_analysis.length > 0 ||
          psychotestHistory.performance_by_category.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Analisis Hasil Tes & Performa</CardTitle>
              <CardDescription>
                Visualisasi hasil tes berdasarkan kategori dengan chart dan
                rekomendasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Create combined data structure */}
                {(() => {
                  // Group results by category
                  const groupedData = new Map();

                  // Add results analysis data
                  psychotestHistory.results_analysis.forEach((result) => {
                    groupedData.set(result.category, {
                      ...groupedData.get(result.category),
                      result,
                      category: result.category,
                      test_name: result.test_name,
                      traits: result.traits,
                      recommendations: result.recommendations,
                    });
                  });

                  // Add performance data
                  psychotestHistory.performance_by_category.forEach((perf) => {
                    groupedData.set(perf.category, {
                      ...groupedData.get(perf.category),
                      performance: perf,
                      category: perf.category,
                    });
                  });

                  // Separate personality and non-personality tests
                  const personalityTests: Array<{
                    result?: TestResult;
                    performance?: PerformanceByCategory;
                    category: string;
                    test_name?: string;
                    traits?: TestResult["traits"];
                    recommendations?: string[];
                  }> = [];
                  const nonPersonalityTests: Array<{
                    result?: TestResult;
                    performance?: PerformanceByCategory;
                    category: string;
                    test_name?: string;
                    traits?: TestResult["traits"];
                    recommendations?: string[];
                  }> = [];

                  Array.from(groupedData.values()).forEach((data) => {
                    if (
                      data.traits &&
                      data.traits.length > 0 &&
                      ["mbti", "big_five", "disc", "epps"].includes(
                        data.category
                      )
                    ) {
                      personalityTests.push(data);
                    } else if (data.performance) {
                      nonPersonalityTests.push(data);
                    }
                  });

                  return (
                    <>
                      {/* Non-personality tests - single bar chart */}
                      {nonPersonalityTests.length > 0 && (
                        <div className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">
                              Performa Tes Kognitif & Kemampuan
                            </h4>
                            <Badge variant="outline">
                              {nonPersonalityTests.length} kategori
                            </Badge>
                          </div>

                          {/* Combined Bar Chart */}
                          <div className="mb-4">
                            <SimpleBarChart
                              data={nonPersonalityTests.map((data) => ({
                                test: data.test_name || data.category,
                                score: data.performance?.average_score,
                              }))}
                              title="Perbandingan Skor Tes"
                              description="Rata-rata skor untuk setiap kategori tes"
                              origin="individual"
                            />
                          </div>

                          {/* Performance Stats Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nonPersonalityTests.map((data, index) => (
                              <div
                                key={index}
                                className="border rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-sm capitalize">
                                    {data.test_name || data.category}
                                  </h5>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {data.performance?.attempts} percobaan
                                  </Badge>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Rata-rata
                                    </span>
                                    <span className="font-medium">
                                      {data.performance?.average_score.toFixed(
                                        1
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Terbaik
                                    </span>
                                    <span className="font-medium">
                                      {data.performance?.best_score.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Selesai
                                    </span>
                                    <span className="font-medium">
                                      {data.performance?.completion_rate.toFixed(
                                        1
                                      )}
                                      %
                                    </span>
                                  </div>
                                </div>

                                {/* Recommendations for this test */}
                                {data.recommendations &&
                                  data.recommendations.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h6 className="text-xs font-medium mb-1">
                                        Rekomendasi
                                      </h6>
                                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                                        {data.recommendations.map(
                                          (rec, recIndex) => (
                                            <li key={recIndex}>{rec}</li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Personality tests - individual display */}
                      {personalityTests.map((data, index) => (
                        <div key={index} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">{data.test_name}</h4>
                            <div className="flex gap-2">
                              <Badge variant="outline">{data.category}</Badge>
                              {data.performance && (
                                <Badge variant="secondary">
                                  {data.performance.attempts} percobaan
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Traditional trait display */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            {data.traits?.map((trait, traitIndex) => (
                              <div
                                key={traitIndex}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm">{trait.name}</span>
                                <Badge variant="outline">{trait.score}</Badge>
                              </div>
                            ))}
                          </div>

                          {/* Radar Chart for personality tests */}
                          <div className="my-4">
                            <SimpleRadarChart
                              data={
                                data.traits?.map((trait) => ({
                                  trait: trait.name,
                                  score: trait.score,
                                })) ?? []
                              }
                              title={`${data.test_name} - Profil Kepribadian`}
                              description="Visualisasi traits dalam bentuk radar chart"
                              origin="individual"
                            />
                          </div>

                          {/* Recommendations */}
                          {data.recommendations &&
                            data.recommendations.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">
                                  Rekomendasi
                                </h5>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {data.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For non-participants or users without test history
  if (
    !psychotestHistory &&
    (activeTab === "tests" || activeTab === "analysis")
  ) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="size-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Tidak Ada Riwayat Psikotes
          </h3>
          <p className="text-gray-600 text-center">
            User ini belum pernah mengikuti tes psikologi atau merupakan admin
            user.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
