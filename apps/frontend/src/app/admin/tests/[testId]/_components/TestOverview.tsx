"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  FileText,
  Target,
  Calendar,
  Info,
  BookOpen,
  BarChart3,
  CheckCircle,
  Award,
  Eye,
} from "lucide-react";
import CardTestModule from "@/components/card/card-test-module";

// Module type labels mapping
const MODULE_TYPE_LABELS = {
  intelligence: "Inteligensi",
  personality: "Kepribadian",
  aptitude: "Bakat",
  interest: "Minat",
  projective: "Proyektif",
  cognitive: "Kognitif",
} as const;

// Category labels mapping
const CATEGORY_LABELS = {
  wais: "WAIS",
  mbti: "MBTI",
  wartegg: "Wartegg",
  riasec: "RIASEC",
  kraepelin: "Kraepelin",
  pauli: "Pauli",
  big_five: "Big Five",
  papi_kostick: "PAPI Kostick",
  dap: "DAP",
  raven: "Raven",
  epps: "EPPS",
  army_alpha: "Army Alpha",
  htp: "HTP",
  disc: "DISC",
  iq: "IQ Test",
  eq: "EQ Test",
} as const;

interface TestData {
  id: string;
  name: string;
  description?: string;
  module_type: keyof typeof MODULE_TYPE_LABELS;
  category: keyof typeof CATEGORY_LABELS;
  time_limit: number;
  icon?: string;
  card_color?: string;
  test_prerequisites?: string[];
  display_order?: number;
  subcategory?: string[];
  total_questions?: number;
  passing_score?: number;
  status?: "active" | "inactive" | "archived";
  instructions?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

interface TestOverviewProps {
  test: TestData;
}

// Status badge component
const StatusBadge = ({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) => {
  const variants = {
    active: "bg-green-100 text-green-700 hover:bg-green-200",
    inactive: "bg-red-100 text-red-700 hover:bg-red-200",
    archived: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  const labels = {
    active: "Aktif",
    inactive: "Tidak Aktif",
    archived: "Diarsipkan",
  };

  return (
    <Badge className={variants[status]} variant="secondary">
      {labels[status]}
    </Badge>
  );
};

export function TestOverview({ test }: TestOverviewProps) {
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get difficulty level based on time limit and questions count
  const getDifficultyLevel = () => {
    const timePerQuestion = test.total_questions
      ? test.time_limit / test.total_questions
      : test.time_limit;

    if (timePerQuestion > 3) return { level: "Mudah", color: "text-green-600" };
    if (timePerQuestion > 1.5)
      return { level: "Sedang", color: "text-yellow-600" };
    return { level: "Sulit", color: "text-red-600" };
  };

  const difficulty = getDifficultyLevel();

  return (
    <div className="space-y-6">
      {/* Test Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Soal</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.total_questions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pertanyaan tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durasi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{test.time_limit}</div>
            <p className="text-xs text-muted-foreground">Menit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tingkat Kesulitan
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${difficulty.color}`}>
              {difficulty.level}
            </div>
            <p className="text-xs text-muted-foreground">
              {test.total_questions
                ? `${(test.time_limit / test.total_questions).toFixed(1)} min/soal`
                : "Belum ada soal"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Lulus</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.passing_score || "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {test.passing_score ? "Skor minimum" : "Tidak ditetapkan"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Test Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informasi Tes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nama Tes
                  </label>
                  <p className="text-sm font-semibold">{test.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={test.status || "active"} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipe Modul
                  </label>
                  <p className="text-sm">
                    {MODULE_TYPE_LABELS[test.module_type]}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Kategori
                  </label>
                  <p className="text-sm">{CATEGORY_LABELS[test.category]}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Urutan Tampil
                  </label>
                  <p className="text-sm">{test.display_order || 0}</p>
                </div>
              </div>

              {test.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Deskripsi
                    </label>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {test.description}
                    </p>
                  </div>
                </>
              )}

              {test.subcategory && test.subcategory.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Sub-kategori
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {test.subcategory.map((sub, index) => (
                        <Badge key={index} variant="outline">
                          {sub}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview Card Peserta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Bagaimana tes ini akan terlihat pada dashboard peserta
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-4">
                <CardTestModule test={test} />
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          {test.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Instruksi Tes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {test.instructions}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prerequisites */}
          {test.test_prerequisites && test.test_prerequisites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Tes Prasyarat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tes yang harus diselesaikan sebelum mengikuti tes ini:
                  </p>
                  <div className="space-y-2">
                    {test.test_prerequisites.map((prereq, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{prereq}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Test Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  ID Tes
                </label>
                <p className="text-sm font-mono">{test.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Dibuat
                </label>
                <p className="text-sm">{formatDate(test.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Terakhir Diperbarui
                </label>
                <p className="text-sm">{formatDate(test.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Design Guide */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Info className="h-5 w-5" />
                Tips Desain Card
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 text-sm space-y-2">
              <div>
                <h4 className="font-semibold mb-1">Icon yang Disarankan:</h4>
                <div className="grid grid-cols-3 space-y-1">
                  <div>🧠 Intelligence</div>
                  <div>💭 Personality</div>
                  <div>🎯 Aptitude</div>
                  <div>❤️ Interest</div>
                  <div>🎨 Projective</div>
                  <div>⚡ Cognitive</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Konsistensi Warna:</h4>
                <p className="text-xs">
                  Gunakan warna yang konsisten untuk setiap kategori tes agar
                  mudah dikenali peserta
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Test Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistik Singkat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-xs text-muted-foreground">Percobaan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-muted-foreground">Selesai</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-xs text-muted-foreground">Rata-rata</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">0%</div>
                  <div className="text-xs text-muted-foreground">Lulus</div>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Statistik akan muncul setelah ada peserta yang mengerjakan tes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
