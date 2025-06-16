import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.test.$testId.complete";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";

// Icons
import {
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Award,
  ArrowRight,
  RotateCcw,
  Home,
  Download,
  Share2,
} from "lucide-react";

// Hooks
import { useAuth } from "~/contexts/auth-context";
import { usePsikotesContext } from "./_psikotes";

// Utils
import {
  formatDistanceToNow,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import { id } from "date-fns/locale";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: `Tes ${params.testId} Selesai - ${params.sessionCode} - Syntegra`,
    },
    { name: "description", content: "Halaman hasil tes psikologi" },
  ];
}

export default function TestCompletePage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionData, sessionCode } = usePsikotesContext();

  const [testResult, setTestResult] = useState<any>(null);

  // Load test result from session storage or API
  useEffect(() => {
    const storedResult = sessionStorage.getItem(`test_result_${testId}`);
    if (storedResult) {
      try {
        setTestResult(JSON.parse(storedResult));
      } catch (error) {
        console.error("Failed to parse stored result:", error);
      }
    }
  }, [testId]);

  // Mock test result if not available (for demo)
  useEffect(() => {
    if (!testResult && sessionData) {
      const currentTest = sessionData.session_modules?.find(
        (module: any) => module.test.id === testId
      );

      if (currentTest) {
        // Create mock result
        const mockResult = {
          test: currentTest.test,
          attempt: {
            id: `attempt_${testId}`,
            start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
            end_time: new Date().toISOString(),
            time_spent: 2700, // 45 minutes in seconds
            questions_answered: currentTest.test.total_questions,
            total_questions: currentTest.test.total_questions,
            status: "completed",
          },
          result: {
            raw_score: 85,
            scaled_score: 82,
            percentile: 78,
            grade: "B+",
            completion_percentage: 100,
            is_passed: true,
          },
          next_test: getNextTest(currentTest.sequence),
        };
        setTestResult(mockResult);
      }
    }
  }, [testResult, sessionData, testId]);

  const getNextTest = (currentSequence: number) => {
    if (!sessionData?.session_modules) return null;

    const nextModule = sessionData.session_modules.find(
      (module: any) => module.sequence === currentSequence + 1
    );

    return nextModule ? nextModule.test : null;
  };

  const handleContinue = () => {
    if (testResult?.next_test) {
      navigate(`/psikotes/${sessionCode}/test/${testResult.next_test.id}`);
    } else {
      navigate(`/psikotes/${sessionCode}/test/complete`);
    }
  };

  const handleBackToTests = () => {
    navigate(`/psikotes/${sessionCode}/tests`);
  };

  const handleDownloadCertificate = () => {
    // TODO: Implement certificate download
    alert("Fitur download sertifikat akan tersedia segera");
  };

  const handleShareResult = () => {
    // TODO: Implement share functionality
    alert("Fitur share hasil akan tersedia segera");
  };

  if (!testResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const test = testResult.test;
  const attempt = testResult.attempt;
  const result = testResult.result;
  const nextTest = testResult.next_test;

  const timeSpent = attempt.time_spent;
  const duration = intervalToDuration({ start: 0, end: timeSpent * 1000 });
  const formattedDuration = formatDuration(duration, { locale: id });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
      case "A+":
        return "text-green-600 bg-green-100";
      case "B":
      case "B+":
        return "text-blue-600 bg-blue-100";
      case "C":
      case "C+":
        return "text-yellow-600 bg-yellow-100";
      case "D":
      case "D+":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-red-600 bg-red-100";
    }
  };

  const getPerformanceLevel = (percentile: number) => {
    if (percentile >= 90)
      return { level: "Sangat Baik", color: "text-green-600" };
    if (percentile >= 75) return { level: "Baik", color: "text-blue-600" };
    if (percentile >= 50) return { level: "Cukup", color: "text-yellow-600" };
    if (percentile >= 25) return { level: "Kurang", color: "text-orange-600" };
    return { level: "Sangat Kurang", color: "text-red-600" };
  };

  const performance = getPerformanceLevel(result.percentile);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Success */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Tes Berhasil Diselesaikan!
            </CardTitle>
            <p className="text-green-700">
              Selamat, <strong>{user?.name}</strong>! Anda telah menyelesaikan
              tes <strong>{test.name}</strong>
            </p>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Test Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Ringkasan Tes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Nama Tes:
                  </span>
                  <span className="font-medium">{test.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Kategori:
                  </span>
                  <Badge variant="outline">{test.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Soal Dijawab:
                  </span>
                  <span className="font-medium">
                    {attempt.questions_answered} / {attempt.total_questions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Waktu Pengerjaan:
                  </span>
                  <span className="font-medium">{formattedDuration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className="bg-green-100 text-green-800">
                    {result.is_passed ? "Lulus" : "Tidak Lulus"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Progress:
                  </span>
                  <span className="text-sm font-medium">
                    {result.completion_percentage}%
                  </span>
                </div>
                <Progress
                  value={result.completion_percentage}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Hasil Tes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getGradeColor(result.grade)}`}
                >
                  <Award className="h-5 w-5" />
                  <span className="font-bold text-lg">
                    Grade {result.grade}
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Skor Mentah:
                  </span>
                  <span className="font-medium">{result.raw_score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Skor Standar:
                  </span>
                  <span className="font-medium">{result.scaled_score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Persentil:
                  </span>
                  <span className="font-medium">{result.percentile}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Tingkat Performa:
                  </span>
                  <span className={`font-medium ${performance.color}`}>
                    {performance.level}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Catatan:</strong> Hasil ini menunjukkan performa Anda
                  dibandingkan dengan kelompok norma. Persentil{" "}
                  {result.percentile}% berarti Anda berada di atas{" "}
                  {result.percentile}% dari peserta lain.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Langkah Selanjutnya</CardTitle>
            <p className="text-sm text-muted-foreground">
              {nextTest
                ? `Lanjutkan ke tes berikutnya: ${nextTest.name}`
                : "Semua tes dalam sesi ini telah selesai"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {nextTest ? (
                <Button onClick={handleContinue} className="flex-1 min-w-fit">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Lanjut ke {nextTest.name}
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    navigate(`/psikotes/${sessionCode}/test/complete`)
                  }
                  className="flex-1 min-w-fit"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Selesai Semua Tes
                </Button>
              )}

              <Button variant="outline" onClick={handleBackToTests}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Kembali ke Daftar Tes
              </Button>

              {result.is_passed && (
                <Button variant="outline" onClick={handleDownloadCertificate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Sertifikat
                </Button>
              )}

              <Button variant="outline" onClick={handleShareResult}>
                <Share2 className="h-4 w-4 mr-2" />
                Bagikan Hasil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session Progress */}
        {sessionData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Progress Sesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  {sessionData.session_modules?.map(
                    (module: any, index: number) => (
                      <div
                        key={module.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          module.test.id === testId
                            ? "bg-green-50 border-green-200"
                            : index <
                                sessionData.session_modules.findIndex(
                                  (m: any) => m.test.id === testId
                                )
                              ? "bg-gray-50 border-gray-200"
                              : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            module.test.id === testId
                              ? "bg-green-600 text-white"
                              : index <
                                  sessionData.session_modules.findIndex(
                                    (m: any) => m.test.id === testId
                                  )
                                ? "bg-gray-400 text-white"
                                : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {module.test.id === testId ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            module.sequence
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{module.test.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.test.total_questions} soal •{" "}
                            {module.test.time_limit} menit
                          </p>
                        </div>
                        {module.test.id === testId && (
                          <Badge className="bg-green-100 text-green-800">
                            Selesai
                          </Badge>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
