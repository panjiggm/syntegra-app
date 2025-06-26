import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  Target,
  MapPin,
  FileText,
  BarChart3,
  Download,
  TrendingUp,
  Activity,
  CheckCircle,
  Award,
  CalendarCheck,
  BriefcaseBusiness,
  Computer,
  BrainCircuit,
  Brain,
} from "lucide-react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { cn } from "~/lib/utils";
import { useReports, type SessionReportsListItem } from "~/hooks/use-reports";
import { Label } from "~/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { formatScore } from "~/lib/utils/score";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { ChartContainer } from "~/components/ui/chart";
import { Button } from "~/components/ui/button";

interface SessionDetailViewProps {
  session: SessionReportsListItem;
}

export function SessionDetailView({ session }: SessionDetailViewProps) {
  const { useGetSessionSummaryReport } = useReports();
  const { data: reportData, isLoading } = useGetSessionSummaryReport(
    session.session_id
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const data = reportData?.data;

  const exportToPDF = async () => {
    if (!contentRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const element = contentRef.current;

      // Get the full height of the content
      const fullHeight = element.scrollHeight;
      const fullWidth = element.scrollWidth;

      // Create canvas with full dimensions
      const canvas = await htmlToImage.toCanvas(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: fullWidth,
        height: fullHeight,
        // useCORS: true,
        // allowTaint: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Convert pixel dimensions to mm (1px = 0.264583mm)
      const canvasWidthMM = (canvas.width * 0.264583) / 2; // Divide by 2 because of pixelRatio
      const canvasHeightMM = (canvas.height * 0.264583) / 2;

      // Calculate scale to fit PDF width
      const scale = pdfWidth / canvasWidthMM;
      const scaledHeight = canvasHeightMM * scale;

      // Calculate how many pages we need
      const totalPages = Math.ceil(scaledHeight / pdfHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate the portion of canvas for this page
        const sourceY = ((i * pdfHeight) / scale / 0.264583) * 2; // Convert back to canvas pixels
        const sourceHeight = (pdfHeight / scale / 0.264583) * 2;

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        const pageCtx = pageCanvas.getContext("2d");

        if (pageCtx) {
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);

          // Draw the slice from the main canvas
          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            canvas.width,
            pageCanvas.height
          );

          // Convert to image and add to PDF
          const pageDataUrl = pageCanvas.toDataURL("image/png");
          const actualHeight = Math.min(
            pdfHeight,
            scaledHeight - i * pdfHeight
          );

          pdf.addImage(pageDataUrl, "PNG", 0, 0, pdfWidth, actualHeight);
        }
      }

      pdf.save(`${data?.session_info.session_name || "Session"}_Report.pdf`);
      setIsExporting(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsExporting(false);
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
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={exportToPDF}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isLoading || isExporting}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Generating PDF..." : "Export PDF"}
        </Button>
      </div>

      <div ref={contentRef}>
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {data?.session_info.session_name}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Computer className="h-3 w-3" />
                  Kode Sesi: {data?.session_info.session_code}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <BriefcaseBusiness className="h-3 w-3" />
                  Posisi:{" "}
                  <span className="capitalize">
                    {data?.session_info.target_position || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Test Modules Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Analisis Modul Tes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {data?.test_modules?.map((module: any, index: number) => (
                      <AccordionItem key={index} value={`module-${index}`}>
                        <AccordionTrigger className="cursor-pointer">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                              <span>{module?.test_icon}</span>
                              <span className="font-bold">
                                {module.test_name}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="secondary">
                                Skor: {formatScore(module.average_score)}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm">Kategori</Label>
                              <p className="text-xs text-muted-foreground">
                                {module.test_category}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Peserta Mulai</Label>
                              <p className="text-xs text-muted-foreground">
                                {module.participants_started}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Avg Waktu</Label>
                              <p className="text-xs text-muted-foreground">
                                {module.average_time_minutes} menit
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Level</Label>
                              <Badge variant="outline">
                                {module.difficulty_level?.split("_").join(" ")}
                              </Badge>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
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
                        origin="session"
                      />
                    ))}
                </>
              )}

              {data?.charts && data.charts.length > 0 && (
                <>
                  {data.charts
                    .filter((chart: any) => chart.type === "line")
                    .map((chart: any, index: number) => (
                      <ChartContainer
                        key={index}
                        chart={chart}
                        origin="session"
                      />
                    ))}
                </>
              )}

              {/* Top Performers */}
              {data &&
                data?.performance_distribution?.top_performers?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Rank Peserta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.performance_distribution.top_performers.map(
                          (performer: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded"
                            >
                              <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">
                                  #{index + 1}
                                </p>
                                <p className="text-sm font-bold">
                                  {performer.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant="outline"
                                  className={`text-sm ${
                                    performer.overall_score > 80
                                      ? "bg-green-100 text-green-700 border-green-600"
                                      : performer.overall_score > 60 &&
                                          performer.overall_score < 80
                                        ? "bg-yellow-100 text-yellow-700 border-yellow-600"
                                        : "bg-red-100 text-red-700 border-red-600"
                                  }`}
                                >
                                  {formatScore(performer.overall_score)}
                                </Badge>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
