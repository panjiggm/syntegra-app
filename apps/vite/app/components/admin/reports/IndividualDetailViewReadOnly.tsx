import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  FileText,
  BarChart3,
  Mail,
  User,
  Lightbulb,
  Brain,
  Eye,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  useReports,
  type IndividualReportsListItem,
} from "~/hooks/use-reports";
import { formatScore, formatTime, getGradeLabel } from "~/lib/utils/score";
import { Label } from "~/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { ChartContainer } from "~/components/ui/chart";
import { AttemptAnswersDrawer } from "./AttemptAnswersDrawer";
import { Button } from "~/components/ui/button";

interface IndividualDetailViewReadOnlyProps {
  individual: IndividualReportsListItem;
}

export function IndividualDetailViewReadOnly({
  individual,
}: IndividualDetailViewReadOnlyProps) {
  const { useGetIndividualReport } = useReports();
  const { data: reportData, isLoading } = useGetIndividualReport(
    individual.user_id
  );

  const data = reportData?.data;

  console.log("Individual Detail View Read Only", reportData);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {individual.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {individual.email}
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    👀 View Only - Export tersedia di bagian atas
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  Skor Keseluruhan
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatScore(individual.overall_score)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getGradeLabel(String(individual.overall_score))}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-green-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  Tingkat Penyelesaian
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {individual.completion_rate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {individual.completion_rate >= 90
                  ? "Sangat Baik"
                  : individual.completion_rate >= 70
                    ? "Baik"
                    : "Perlu Diperbaiki"}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  Total Tes
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {individual.total_tests_taken}
              </p>
              <p className="text-xs text-muted-foreground">
                {individual.total_tests_completed} selesai
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-orange-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  Kualitas Data
                </p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {individual.data_quality_score.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                {individual.data_quality_score >= 8
                  ? "Tinggi"
                  : individual.data_quality_score >= 6
                    ? "Sedang"
                    : "Rendah"}
              </p>
            </Card>
          </div>

          {/* Test Performance Analysis */}
          {data?.test_performances && data.test_performances.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analisis Performa Tes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {data.test_performances.map((test: any, index: number) => (
                    <AccordionItem key={index} value={`test-${index}`}>
                      <AccordionTrigger className="cursor-pointer">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span>{test.test_icon}</span>
                            <span className="font-bold">{test.test_name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              Skor: {formatScore(test.score)}
                            </Badge>
                            <Badge
                              variant={
                                test.completion_status === "completed"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {test.completion_status === "completed"
                                ? "Selesai"
                                : "Belum Selesai"}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm">Kategori</Label>
                            <p className="text-xs text-muted-foreground">
                              {test.test_category}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm">Waktu Pengerjaan</Label>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(test.time_taken)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm">Akurasi</Label>
                            <p className="text-xs text-muted-foreground">
                              {test.accuracy_percentage}%
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm">Tingkat Kesulitan</Label>
                            <Badge variant="outline">
                              {test.difficulty_level?.split("_").join(" ")}
                            </Badge>
                          </div>
                        </div>

                        {/* View Answers Button */}
                        {test.attempt_id && (
                          <div className="mt-4">
                            <AttemptAnswersDrawer
                              attemptId={test.attempt_id}
                              testName={test.test_name}
                            >
                              <Button
                                variant="link"
                                size="sm"
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                                Lihat Detail Jawaban
                              </Button>
                            </AttemptAnswersDrawer>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          {data?.charts && data.charts.length > 0 && (
            <>
              {data.charts
                .filter((chart: any) => chart.type === "radar")
                .map((chart: any, index: number) => (
                  <ChartContainer
                    key={index}
                    chart={chart}
                    origin="individual"
                  />
                ))}
            </>
          )}

          {data?.charts && data.charts.length > 0 && (
            <>
              {data.charts
                .filter((chart: any) => chart.type === "bar")
                .map((chart: any, index: number) => (
                  <ChartContainer
                    key={index}
                    chart={chart}
                    origin="individual"
                  />
                ))}
            </>
          )}

          {/* Trait Analysis */}
          {/* {data?. && data.trait_analysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Analisis Trait
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.trait_analysis.map((trait: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{trait.trait_name}</h4>
                        <Badge
                          variant={
                            trait.strength_level === "high"
                              ? "default"
                              : trait.strength_level === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {trait.strength_level === "high"
                            ? "Tinggi"
                            : trait.strength_level === "medium"
                              ? "Sedang"
                              : "Rendah"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {trait.description}
                      </p>
                      {trait.score && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Skor:</span>
                          <span className="text-sm">
                            {formatScore(trait.score)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )} */}
        </CardContent>
      </Card>
    </div>
  );
}
