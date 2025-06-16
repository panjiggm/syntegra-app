import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/psikotes.$sessionCode.test.$testId";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Separator } from "~/components/ui/separator";

// Icons
import {
  FileText,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  ArrowLeft,
  Timer,
  Users,
  Brain,
  Calculator,
  Eye,
  Lightbulb,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// Hooks
import { useQuestions } from "~/hooks/use-questions";
import { useAuth } from "~/contexts/auth-context";
import { usePsikotesContext } from "~/routes/_psikotes";

// Utils
import { useTestAttempt } from "~/hooks/use-test-attempt";
import { toast } from "sonner";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: `Tes ${params.testId} - ${params.sessionCode} - Syntegra`,
    },
    { name: "description", content: "Halaman detail tes psikologi online" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  return null;
}

export default function PsikotesTestDetailPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionData, sessionCode } = usePsikotesContext();

  const [currentTest, setCurrentTest] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);

  const { useGetQuestions } = useQuestions();

  // Get questions data to find first question
  const { data: questionsData, isLoading: isLoadingQuestions } =
    useGetQuestions(testId || "", {
      sort_by: "sequence",
      sort_order: "asc",
      limit: 1,
      page: 1,
    });

  const { useStartAttempt } = useTestAttempt();
  const startAttempt = useStartAttempt();

  // Find current test in session modules
  useEffect(() => {
    if (sessionData?.session_modules) {
      const test = sessionData.session_modules.find(
        (module: any) => module.test.id === testId
      );
      setCurrentTest(test);
    }
  }, [sessionData, testId]);

  // Countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      // Call async function
      handleNavigateToTest();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleStartCountdown = () => {
    setIsStarting(true);
    setIsReady(true);
    setCountdown(3); // 3 second countdown
  };

  const handleNavigateToTest = async () => {
    if (!testId || !sessionCode) return;

    setIsStartingAttempt(true);

    try {
      // 1. Start test attempt terlebih dahulu
      const attempt = await startAttempt.mutateAsync({
        test_id: testId,
        session_code: sessionCode,
        browser_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          startedAt: new Date().toISOString(),
          screenResolution: `${screen.width}x${screen.height}`,
          windowSize: `${window.innerWidth}x${window.innerHeight}`,
        },
      });

      // 2. Store attemptId ke sessionStorage
      sessionStorage.setItem(`attempt_${testId}`, attempt.id);

      // 3. Store additional attempt data for offline capabilities
      sessionStorage.setItem(
        `attempt_data_${testId}`,
        JSON.stringify({
          attemptId: attempt.id,
          testId: testId,
          sessionCode: sessionCode,
          startTime: attempt.start_time,
          endTime: attempt.end_time,
          timeLimit: attempt.test.time_limit,
          totalQuestions: attempt.test.total_questions,
        })
      );

      // 4. Navigate ke question pertama
      if (questionsData?.data && questionsData.data.length > 0) {
        const firstQuestion = questionsData.data[0]; // Already sorted by sequence ASC
        navigate(
          `/psikotes/${sessionCode}/test/${testId}/question/${firstQuestion.id}`
        );
      } else {
        // Fallback jika tidak ada questions data
        console.warn(
          "No questions data available, starting attempt but redirecting to test page"
        );
        toast.warning("Data soal belum tersedia, silakan coba lagi");
      }
    } catch (error) {
      console.error("Failed to start test attempt:", error);
      toast.error("Gagal memulai tes", {
        description: "Terjadi kesalahan saat memulai tes. Silakan coba lagi.",
      });
    } finally {
      setIsStartingAttempt(false);
    }
  };

  const calculateOverallProgress = () => {
    // TODO: Calculate based on completed tests
    // For now, return sample progress
    return 25; // 25% progress
  };

  const getTestIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "verbal":
        return <BookOpen className="h-6 w-6 text-blue-600" />;
      case "numerical":
      case "numerik":
        return <Calculator className="h-6 w-6 text-green-600" />;
      case "logical":
      case "logika":
        return <Brain className="h-6 w-6 text-purple-600" />;
      case "personality":
      case "kepribadian":
        return <Users className="h-6 w-6 text-orange-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  const getSampleQuestion = (category: string) => {
    switch (category.toLowerCase()) {
      case "verbal":
        return {
          question: "Sinonim dari kata 'PRESTISE' adalah...",
          options: [
            "A. Kehormatan",
            "B. Kekayaan",
            "C. Kekuasaan",
            "D. Kemampuan",
          ],
          type: "Pilihan Ganda",
        };
      case "numerical":
      case "numerik":
        return {
          question: "Jika 2x + 5 = 13, maka nilai x adalah...",
          options: ["A. 3", "B. 4", "C. 5", "D. 6"],
          type: "Soal Hitungan",
        };
      case "logical":
      case "logika":
        return {
          question: "Melanjutkan pola: 2, 4, 8, 16, ...",
          options: ["A. 24", "B. 28", "C. 32", "D. 36"],
          type: "Pola Logika",
        };
      case "personality":
      case "kepribadian":
        return {
          question: "Saya lebih suka bekerja dalam tim daripada sendiri",
          options: [
            "Sangat Setuju",
            "Setuju",
            "Netral",
            "Tidak Setuju",
            "Sangat Tidak Setuju",
          ],
          type: "Skala Likert",
        };
      default:
        return {
          question: "Contoh soal akan ditampilkan sesuai kategori tes",
          options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
          type: "Multiple Choice",
        };
    }
  };

  const getTestRules = (category: string) => {
    const baseRules = [
      "Jawaban akan tersimpan secara otomatis",
      "Waktu akan berjalan terus selama tes berlangsung",
      "Pastikan koneksi internet stabil",
    ];

    switch (category.toLowerCase()) {
      case "numerical":
      case "numerik":
        return [
          ...baseRules,
          "Kalkulator tidak diperbolehkan",
          "Kertas coret-coret diperbolehkan",
        ];
      case "verbal":
        return [
          ...baseRules,
          "Baca setiap soal dengan teliti",
          "Tidak ada pengurangan nilai untuk jawaban salah",
        ];
      case "logical":
      case "logika":
        return [
          ...baseRules,
          "Perhatikan pola dengan seksama",
          "Anda dapat kembali ke soal sebelumnya",
        ];
      case "personality":
      case "kepribadian":
        return [
          ...baseRules,
          "Jawab dengan jujur sesuai kepribadian Anda",
          "Tidak ada jawaban benar atau salah",
        ];
      default:
        return baseRules;
    }
  };

  // Loading state
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Memuat soal...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Test not found in session modules
  if (!currentTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">
              Tes Tidak Ditemukan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Tes yang Anda cari tidak tersedia dalam sesi ini.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}
              className="w-full"
            >
              Kembali ke Daftar Tes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No questions available
  if (questionsData && questionsData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Tidak Ada Soal</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Tes ini belum memiliki soal yang tersedia. Silakan hubungi
              administrator.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}
              className="w-full"
            >
              Kembali ke Daftar Tes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sampleQuestion = getSampleQuestion(currentTest.test.category);
  const testRules = getTestRules(currentTest.test.category);

  // Main test detail page
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="link"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => navigate(`/psikotes/${sessionCode}/tests`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {getTestIcon(currentTest.test.category)}
                    {currentTest.test.name}
                    {currentTest.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Wajib
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sessionData.session_name} • {currentTest.test.category}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Progress Keseluruhan</span>
                <span>{calculateOverallProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${calculateOverallProgress()}%` }}
                ></div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Test Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Test Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Informasi Tes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Timer className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Durasi</p>
                      <p className="text-xs text-muted-foreground">
                        {currentTest.test.time_limit} menit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Jumlah Soal</p>
                      <p className="text-xs text-muted-foreground">
                        {currentTest.test.total_questions} soal
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bobot</p>
                      <p className="text-xs text-muted-foreground">
                        {currentTest.weight}%
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Instruksi Tes
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Tes {currentTest.test.category} ini mengukur kemampuan
                      Anda dalam{" "}
                      {currentTest.test.category === "verbal" &&
                        "pemahaman bahasa dan komunikasi"}
                      {currentTest.test.category === "numerical" &&
                        "perhitungan dan analisis angka"}
                      {currentTest.test.category === "logical" &&
                        "penalaran dan pemecahan masalah"}
                      {currentTest.test.category === "personality" &&
                        "memahami karakteristik kepribadian Anda"}
                      . Jawablah setiap soal dengan teliti dan sesuai dengan
                      kemampuan terbaik Anda.
                    </p>
                    <p>
                      Waktu pengerjaan adalah{" "}
                      <strong>{currentTest.test.time_limit} menit</strong> untuk{" "}
                      <strong>{currentTest.test.total_questions} soal</strong>.
                      Pastikan Anda mengatur waktu dengan baik.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample Question */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  Contoh Soal
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Berikut adalah contoh format soal yang akan Anda kerjakan
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {sampleQuestion.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Contoh
                    </Badge>
                  </div>

                  <h4 className="font-medium mb-3">
                    {sampleQuestion.question}
                  </h4>

                  <div className="space-y-2">
                    {sampleQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-6 h-6 rounded border-2 border-gray-300 flex items-center justify-center bg-white">
                          <span className="text-xs text-gray-500">○</span>
                        </div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 italic">
                    * Ini hanya contoh format soal, bukan soal yang akan muncul
                    dalam tes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Rules & Action */}
          <div className="space-y-6">
            {/* Test Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Aturan Tes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {testRules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Action Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                  Mulai Tes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isReady ? (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Pastikan Anda sudah siap dan memahami instruksi tes
                      sebelum memulai.
                    </p>
                    <Button
                      onClick={handleStartCountdown}
                      className="w-full cursor-pointer"
                      size="lg"
                      disabled={isStartingAttempt}
                    >
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Mulai Mengerjakan
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                ) : countdown !== null && countdown > 0 ? (
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold text-blue-600 animate-pulse">
                      {countdown}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tes akan dimulai dalam {countdown} detik...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : isStartingAttempt ? (
                  <div className="text-center space-y-4">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm text-muted-foreground">
                      Memulai tes...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full animate-pulse w-full"></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Button
                      onClick={handleNavigateToTest}
                      className="w-full cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      size="lg"
                      disabled={isStartingAttempt}
                    >
                      {isStartingAttempt ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <PlayCircle className="h-5 w-5 mr-2" />
                      )}
                      Mulai Sekarang
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Lightbulb className="h-5 w-5" />
                  Tips Sukses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>• Baca setiap soal dengan teliti</li>
                  <li>• Jangan terlalu lama pada satu soal</li>
                  <li>• Jawab yang mudah terlebih dahulu</li>
                  <li>• Manfaatkan waktu dengan efisien</li>
                  <li>• Tetap tenang dan fokus</li>
                </ul>
              </CardContent>
            </Card>
          </div>
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
