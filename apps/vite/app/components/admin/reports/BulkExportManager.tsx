import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { Badge } from "~/components/ui/badge";
import {
  Filter,
  Calendar as CalendarIcon,
  FileText,
  Table,
  BarChart3,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import SessionReportPDF from "./pdf/SessionReportPDF";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { useTestResultsReport } from "~/hooks/use-test-results-report";
import { useSessions } from "~/hooks/use-sessions";

// Define filter interface for test results report
interface TestResultsFilter {
  period_type:
    | "today"
    | "this_week"
    | "this_month"
    | "last_month"
    | "this_year"
    | "custom";
  start_date?: string;
  end_date?: string;
  session_id?: string;
  format: "pdf" | "excel" | "csv";
  includeCharts: boolean;
  includeDetailedAnalysis: boolean;
  includeRecommendations: boolean;
}

export function BulkExportManager() {
  const [filter, setFilter] = useState<TestResultsFilter>({
    period_type: "this_month",
    format: "pdf",
    includeCharts: true,
    includeDetailedAnalysis: true,
    includeRecommendations: true,
  });

  const [isExporting, setIsExporting] = useState(false);

  // Initialize hooks
  const { useGetSessions } = useSessions();
  const sessionsQuery = useGetSessions({ limit: 100 });

  // Test Results Report hook
  const testResultsReport = useTestResultsReport(
    {
      period_type: filter.period_type,
      start_date: filter.start_date,
      end_date: filter.end_date,
      session_id: filter.session_id,
    },
    { enabled: false }
  );

  // Helper function to format date to local YYYY-MM-DD without timezone issues
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleExport = async () => {
    // Basic validation
    if (
      filter.period_type === "custom" &&
      (!filter.start_date || !filter.end_date)
    ) {
      toast.error("Pilih tanggal mulai dan selesai untuk periode kustom");
      return;
    }

    setIsExporting(true);

    try {
      toast.info("Mengambil data test results...");

      // Fetch test results data
      const result = await testResultsReport.refetch();

      if (!result.data) {
        toast.error("Tidak ada data yang ditemukan");
        return;
      }

      const reportData = result.data;
      console.log("✅ Test Results Report Response:", reportData);

      // Process the data based on format
      switch (filter.format) {
        case "pdf":
          await handlePDFExport(reportData);
          break;
        case "excel":
          await handleExcelExport(reportData);
          break;
        case "csv":
          await handleCSVExport(reportData);
          break;
      }

      toast.success(
        `Export berhasil! ${reportData.data.summary.total_sessions} sessions, ${reportData.data.summary.total_participants} participants dalam format ${filter.format.toUpperCase()}`
      );
    } catch (error: any) {
      console.error("Export error:", error);
      const errorMessage = error.message?.toLowerCase();

      if (errorMessage?.includes("no data found")) {
        toast.error("Tidak ada data yang ditemukan untuk filter yang dipilih");
      } else if (errorMessage?.includes("invalid date")) {
        toast.error("Format tanggal tidak valid");
      } else {
        toast.error(
          `Gagal melakukan export: ${error.message || "Unknown error"}`
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePDFExport = async (reportData: any) => {
    const fileName = `test-results-report-${filter.period_type}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Transform test results data to PDF format
    const pdfData = {
      session: {
        session_name: `Test Results Report - ${reportData.data.period.label}`,
        session_code: "TEST-RESULTS",
        start_time: reportData.data.period.start_date,
        end_time: reportData.data.period.end_date,
        target_position: "Multiple Positions",
        total_participants: reportData.data.summary.total_participants,
      },
      participants: reportData.data.participants.map((participant: any) => ({
        name: participant.name,
        nik: participant.nik,
        gender: participant.gender,
        age: participant.age,
        education: participant.education,
        total_score: participant.total_score,
        overall_grade: participant.overall_grade,
        overall_percentile: participant.overall_percentile,
        completion_rate: participant.completion_rate,
        duration_minutes: participant.duration_minutes,
        status: participant.status,
        recommended_position: participant.recommended_position,
        compatibility_score: participant.compatibility_score,
        primary_traits: participant.primary_traits,
        session_code: participant.session_code,
        session_name: participant.session_name,
      })),
      statistics: {
        total_sessions: reportData.data.summary.total_sessions,
        total_participants: reportData.data.summary.total_participants,
        total_completed: reportData.data.summary.total_completed,
        average_score: reportData.data.summary.average_score,
        completion_rate: reportData.data.summary.completion_rate,
        grade_distribution: reportData.data.summary.grade_distribution,
      },
      sessions: reportData.data.sessions,
      position_summary: reportData.data.position_summary,
      test_module_summary: reportData.data.test_module_summary,
    };

    const pdfComponent = (
      <SessionReportPDF
        data={pdfData}
        generatedAt={reportData.data.generated_at}
        filters={{
          period_type: filter.period_type,
          start_date: filter.start_date,
          end_date: filter.end_date,
          session_id: filter.session_id,
        }}
      />
    );

    const blob = await pdf(pdfComponent).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExcelExport = async (reportData: any) => {
    const fileName = `test-results-report-${filter.period_type}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Import the Excel generator
    const { generateSessionReportExcel } = await import("~/lib/excel/SessionReportExcel");

    // Transform test results data to Excel format (same as PDF)
    const excelData = {
      session: {
        session_name: `Test Results Report - ${reportData.data.period.label}`,
        session_code: "TEST-RESULTS",
        start_time: reportData.data.period.start_date,
        end_time: reportData.data.period.end_date,
        target_position: "Multiple Positions",
        total_participants: reportData.data.summary.total_participants,
      },
      participants: reportData.data.participants.map((participant: any) => ({
        name: participant.name,
        nik: participant.nik,
        gender: participant.gender,
        age: participant.age,
        education: participant.education,
        total_score: participant.total_score,
        overall_grade: participant.overall_grade,
        overall_percentile: participant.overall_percentile,
        completion_rate: participant.completion_rate,
        duration_minutes: participant.duration_minutes,
        status: participant.status,
        recommended_position: participant.recommended_position,
        compatibility_score: participant.compatibility_score,
        primary_traits: participant.primary_traits,
        session_code: participant.session_code,
        session_name: participant.session_name,
      })),
      statistics: {
        total_sessions: reportData.data.summary.total_sessions,
        total_participants: reportData.data.summary.total_participants,
        total_completed: reportData.data.summary.total_completed,
        average_score: reportData.data.summary.average_score,
        completion_rate: reportData.data.summary.completion_rate,
        grade_distribution: reportData.data.summary.grade_distribution,
      },
      sessions: reportData.data.sessions,
      position_summary: reportData.data.position_summary,
      test_module_summary: reportData.data.test_module_summary,
    };

    // Generate Excel file
    const buffer = await generateSessionReportExcel({
      data: excelData,
      generatedAt: reportData.data.generated_at,
      filters: {
        period_type: filter.period_type,
        start_date: filter.start_date,
        end_date: filter.end_date,
        session_id: filter.session_id,
      },
    });

    // Download the file
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVExport = async (reportData: any) => {
    const fileName = `test-results-report-${filter.period_type}-${new Date().toISOString().split("T")[0]}.csv`;

    // Participants data
    const participantsCSV = [
      ["=== PARTICIPANTS DATA ==="],
      [
        "Session Code",
        "Session Name",
        "NIK",
        "Name",
        "Gender",
        "Age",
        "Education",
        "Total Score",
        "Grade",
        "Percentile",
        "Completion Rate",
        "Duration (minutes)",
        "Status",
        "Recommended Position",
        "Compatibility Score",
        "Primary Traits",
      ],
      ...reportData.data.participants.map((p: any) => [
        p.session_code || "",
        p.session_name || "",
        p.nik || "",
        p.name || "",
        p.gender || "",
        p.age || "",
        p.education || "",
        (p.total_score || 0).toFixed(1),
        p.overall_grade || "",
        (p.overall_percentile || 0).toFixed(1),
        `${(p.completion_rate || 0).toFixed(1)}%`,
        p.duration_minutes || 0,
        p.status || "",
        p.recommended_position || "",
        (p.compatibility_score || 0).toFixed(1),
        p.primary_traits || "",
      ]),
      [""],
    ];

    // Sessions data
    const sessionsCSV = [
      ["=== SESSIONS DATA ==="],
      [
        "Session ID",
        "Session Code",
        "Session Name",
        "Date",
        "Time",
        "Target Position",
        "Location",
        "Proctor",
        "Total Participants",
        "Total Tes",
        "Completion Rate",
        "Average Score",
        "Average Duration",
        "Test Modules",
      ],
      ...reportData.data.sessions.map((s: any) => [
        s.session_id || "",
        s.session_code || "",
        s.session_name || "",
        s.date || "",
        s.time || "",
        s.target_position || "",
        s.location || "",
        s.proctor_name || "",
        s.total_participants || 0,
        s.test_modules ? s.test_modules.split(',').length : 0,
        `${(s.completion_rate || 0).toFixed(1)}%`,
        (s.average_score || 0).toFixed(1),
        s.average_duration_minutes || 0,
        s.test_modules || "",
      ]),
      [""],
    ];

    // Position summary data
    const positionSummaryCSV = [
      ["=== POSITION SUMMARY ==="],
      [
        "Target Position",
        "Total Participants",
        "Completed",
        "Completion Rate",
        "Average Score",
        "Grade A",
        "Grade B",
        "Grade C",
        "Grade D",
      ],
      ...reportData.data.position_summary.map((p: any) => [
        p.target_position || "",
        p.total_participants || 0,
        p.completed || 0,
        `${(p.completion_rate || 0).toFixed(1)}%`,
        (p.average_score || 0).toFixed(1),
        p.grade_A || 0,
        p.grade_B || 0,
        p.grade_C || 0,
        p.grade_D || 0,
      ]),
      [""],
    ];

    // Test module summary data
    const testModuleSummaryCSV = [
      ["=== TEST MODULE SUMMARY ==="],
      [
        "Test Name",
        "Category",
        "Total Attempts",
        "Average Score",
        "Completion Rate",
      ],
      ...reportData.data.test_module_summary.map((t: any) => [
        t.test_name || "",
        t.category || "",
        t.total_attempts || 0,
        (t.average_score || 0).toFixed(1),
        `${(t.completion_rate || 0).toFixed(1)}%`,
      ]),
    ];

    const csvContent = [
      ...participantsCSV,
      ...sessionsCSV,
      ...positionSummaryCSV,
      ...testModuleSummaryCSV,
    ]
      .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFormatIcon = () => {
    switch (filter.format) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "excel":
        return <Table className="h-4 w-4" />;
      case "csv":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Quick Export Format Buttons */}
        <div className="space-y-3">
          <Label>Pilih Tipe File</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={filter.format === "pdf" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter((f) => ({ ...f, format: "pdf" }))}
              className="justify-start gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant={filter.format === "excel" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter((f) => ({ ...f, format: "excel" }))}
              className="justify-start gap-2"
            >
              <Table className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant={filter.format === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter((f) => ({ ...f, format: "csv" }))}
              className="justify-start gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Period Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Periode Data</Label>
            <Select
              value={filter.period_type}
              onValueChange={(value: any) =>
                setFilter((f) => ({
                  ...f,
                  period_type: value,
                  start_date: undefined,
                  end_date: undefined,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">📅 Hari Ini</SelectItem>
                <SelectItem value="this_week">📅 Minggu Ini</SelectItem>
                <SelectItem value="this_month">📅 Bulan Ini</SelectItem>
                <SelectItem value="last_month">📅 Bulan Lalu</SelectItem>
                <SelectItem value="this_year">📅 Tahun Ini</SelectItem>
                <SelectItem value="custom">🎯 Pilih Tanggal Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range - only show when "custom" is selected */}
          {filter.period_type === "custom" && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filter.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filter.start_date
                        ? format(new Date(filter.start_date), "PPP", {
                            locale: id,
                          })
                        : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        filter.start_date
                          ? new Date(filter.start_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFilter((f) => ({
                          ...f,
                          start_date: date
                            ? formatDateToLocal(date)
                            : undefined,
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filter.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filter.end_date
                        ? format(new Date(filter.end_date), "PPP", {
                            locale: id,
                          })
                        : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        filter.end_date ? new Date(filter.end_date) : undefined
                      }
                      onSelect={(date) =>
                        setFilter((f) => ({
                          ...f,
                          end_date: date ? formatDateToLocal(date) : undefined,
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Session Selection */}
        <div className="space-y-2">
          <Label>Filter Sesi (Opsional)</Label>
          <Select
            value={filter.session_id || ""}
            onValueChange={(value) =>
              setFilter((f) => ({
                ...f,
                session_id: value === "all" ? undefined : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua sesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌍 Semua Sesi</SelectItem>
              {sessionsQuery.data?.data.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  📊 {session.session_code} - {session.session_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {(filter.period_type !== "this_month" || filter.session_id) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter Aktif:</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Periode:{" "}
              {filter.period_type === "today"
                ? "Hari Ini"
                : filter.period_type === "this_week"
                  ? "Minggu Ini"
                  : filter.period_type === "this_month"
                    ? "Bulan Ini"
                    : filter.period_type === "last_month"
                      ? "Bulan Lalu"
                      : filter.period_type === "this_year"
                        ? "Tahun Ini"
                        : filter.period_type === "custom"
                          ? "Kustom"
                          : filter.period_type}
            </Badge>
            {filter.start_date && filter.period_type === "custom" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Dari:{" "}
                {format(new Date(filter.start_date), "dd MMM yyyy", {
                  locale: id,
                })}
              </Badge>
            )}
            {filter.end_date && filter.period_type === "custom" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Sampai:{" "}
                {format(new Date(filter.end_date), "dd MMM yyyy", {
                  locale: id,
                })}
              </Badge>
            )}
            {filter.session_id && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                Sesi:{" "}
                {sessionsQuery.data?.data.find(
                  (s) => s.id === filter.session_id
                )?.session_code || "Selected"}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={
            isExporting ||
            testResultsReport.isLoading ||
            testResultsReport.isFetching
          }
          size="lg"
        >
          {isExporting ||
          testResultsReport.isLoading ||
          testResultsReport.isFetching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Mengexport...
            </>
          ) : (
            <>
              {getFormatIcon()}
              📊 Export Test Results {filter.format.toUpperCase()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
