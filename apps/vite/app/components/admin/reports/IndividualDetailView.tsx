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

interface IndividualDetailViewProps {
  individual: IndividualReportsListItem;
}

export function IndividualDetailView({
  individual,
}: IndividualDetailViewProps) {
  const { useGetIndividualReport } = useReports();
  const { data: reportData, isLoading } = useGetIndividualReport(
    individual.user_id
  );

  const data = reportData?.data;

  console.log("Individual Detail View", reportData);

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-gray-100 text-gray-800";
    switch (grade.toUpperCase()) {
      case "A":
        return "text-green-800";
      case "B":
        return "text-blue-800";
      case "C":
        return "text-yellow-800";
      case "D":
        return "text-orange-800";
      case "E":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Mail className="h-3 w-3" />
                    {individual.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    NIK: {individual.nik}
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      📊 Laporan Individual - Export tersedia di bagian atas
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {individual.overall_grade && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      getGradeColor(individual.overall_grade)
                    )}
                  >
                    Grade <b>{individual.overall_grade}</b>
                  </Badge>
                )}
                {individual.overall_score && (
                  <Badge
                    variant="outline"
                    className={`${
                      individual.overall_score > 80
                        ? "bg-green-100 text-green-700 border-green-600"
                        : individual.overall_score > 60 &&
                            individual.overall_score < 80
                          ? "bg-yellow-100 text-yellow-700 border-yellow-600"
                          : "bg-red-100 text-red-700 border-red-600"
                    }`}
                  >
                    Skor <b>{formatScore(individual.overall_score) || 0}</b>
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
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
                      <div className="text-xl font-bold text-blue-600">
                        {data?.assessment_overview.total_tests_completed}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tes Selesai
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">
                        {formatTime(
                          data?.assessment_overview.total_time_spent_minutes
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total Waktu
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">
                        {data?.overall_assessment.overall_grade || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getGradeLabel(data?.overall_assessment.overall_grade)}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">
                        {formatScore(
                          data?.overall_assessment.overall_percentile
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Skor Keseluruhan
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Test Performances */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Performa Tes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {data?.test_performances?.map(
                      (performance: any, index: number) => (
                        <AccordionItem key={index} value={`test-${index}`}>
                          <AccordionTrigger className="cursor-pointer">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-2">
                                <span>{performance.icon}</span>
                                <span className="font-bold">
                                  {performance.test_name}
                                </span>
                              </div>
                              {performance?.module_type !== "personality" ? (
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
                                  Score:{" "}
                                  {formatScore(performance.scaled_score) ||
                                    formatScore(performance.raw_score) ||
                                    0}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No Score
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <Label className="text-sm">Kategori</Label>
                                  <p className="text-xs text-muted-foreground">
                                    {performance.test_category}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm">
                                    Penyelesaian
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {formatScore(performance.completion_rate)}%
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm">Waktu</Label>
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(performance.time_spent_minutes)}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm">Grade</Label>
                                  <div>
                                    <p
                                      className={`text-xs font-bold ${getGradeColor(performance.grade)}`}
                                    >
                                      {performance.grade} (
                                      {getGradeLabel(performance.grade)})
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Attempt Answer List */}
                              {performance.attempt_id && (
                                <div className="flex justify-center items-center mt-4">
                                  <AttemptAnswersDrawer
                                    attemptId={performance.attempt_id}
                                    testName={performance.test_name}
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
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Charts */}
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

              {/* Recommendations */}
              {data && data?.recommendations?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Rekomendasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.recommendations.map((rec: any, index: number) => (
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
          </CardContent>
        </Card>
    </div>
  );
}
