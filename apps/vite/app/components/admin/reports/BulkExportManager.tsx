import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  Download,
  Filter,
  Calendar as CalendarIcon,
  FileText,
  Table,
  BarChart3,
  Settings,
  Clock,
  Users,
  TrendingUp,
  Globe,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import SessionReportPDF from "./pdf/SessionReportPDF";
import IndividualReportPDF from "./pdf/IndividualReportPDF";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;

interface BulkExportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  datePeriod?: string;
  status?: string;
  reportType: "sessions" | "individuals" | "combined";
  format: "pdf" | "excel" | "csv";
  includeCharts: boolean;
  includeDetailedAnalysis: boolean;
  includeRecommendations: boolean;
}

export function BulkExportManager() {
  const [filter, setFilter] = useState<BulkExportFilter>({
    format: "pdf",
    reportType: "sessions",
    datePeriod: "all",
    includeCharts: true,
    includeDetailedAnalysis: true,
    includeRecommendations: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper function to calculate date range based on period
  const getDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case "today":
        return {
          dateFrom: today,
          dateTo: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        };
      
      case "this_week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { dateFrom: startOfWeek, dateTo: endOfWeek };
      }
      
      case "last_week": {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { dateFrom: startOfLastWeek, dateTo: endOfLastWeek };
      }
      
      case "this_month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { dateFrom: startOfMonth, dateTo: endOfMonth };
      }
      
      case "this_year": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return { dateFrom: startOfYear, dateTo: endOfYear };
      }
      
      default:
        // Handle specific months/years
        if (period.startsWith("month_")) {
          const month = parseInt(period.split("_")[1]);
          const startOfMonth = new Date(now.getFullYear(), month, 1);
          const endOfMonth = new Date(now.getFullYear(), month + 1, 0);
          return { dateFrom: startOfMonth, dateTo: endOfMonth };
        }
        
        if (period.startsWith("year_")) {
          const year = parseInt(period.split("_")[1]);
          const startOfYear = new Date(year, 0, 1);
          const endOfYear = new Date(year, 11, 31);
          return { dateFrom: startOfYear, dateTo: endOfYear };
        }
        
        return { dateFrom: undefined, dateTo: undefined };
    }
  };

  const handleBulkExport = async () => {
    setIsExporting(true);

    try {
      // Calculate date range from period if selected
      const dateRange = filter.datePeriod && filter.datePeriod !== "custom" && filter.datePeriod !== "all"
        ? getDateRangeFromPeriod(filter.datePeriod)
        : { dateFrom: filter.dateFrom, dateTo: filter.dateTo };

      // TODO: Fetch bulk data from API based on filters
      const apiParams = new URLSearchParams();
      if (dateRange.dateFrom) apiParams.set("date_from", dateRange.dateFrom.toISOString());
      if (dateRange.dateTo) apiParams.set("date_to", dateRange.dateTo.toISOString());
      if (filter.status) apiParams.set("status", filter.status);
      if (filter.datePeriod) apiParams.set("period", filter.datePeriod);

      // Call the appropriate bulk API endpoint
      const endpoint = filter.reportType === "sessions" 
        ? `/reports/export/bulk/sessions?${apiParams.toString()}`
        : filter.reportType === "individuals"
        ? `/reports/export/bulk/individuals?${apiParams.toString()}`
        : `/reports/export/bulk/combined?${apiParams.toString()}`;

      // For now, simulate the API call with mock data
      const mockBulkData = {
        reportType: filter.reportType,
        period: filter.datePeriod,
        dateRange,
        totalRecords: filter.reportType === "sessions" ? 5 : 25,
        generatedAt: new Date().toISOString(),
        filters: {
          dateFrom: dateRange.dateFrom?.toISOString(),
          dateTo: dateRange.dateTo?.toISOString(),
          status: filter.status,
          period: filter.datePeriod,
        },
        sessions: filter.reportType !== "individuals" ? [
          { session_name: "Session A", session_code: "SA001", participants: 5, average_score: 85.2 },
          { session_name: "Session B", session_code: "SB002", participants: 8, average_score: 78.5 },
          { session_name: "Session C", session_code: "SC003", participants: 6, average_score: 92.1 },
        ] : [],
        individuals: filter.reportType !== "sessions" ? [
          { name: "John Doe", email: "john@example.com", overall_score: 85.2, status: "completed" },
          { name: "Jane Smith", email: "jane@example.com", overall_score: 78.5, status: "completed" },
        ] : [],
        statistics: {
          total_sessions: filter.reportType !== "individuals" ? 3 : 0,
          total_participants: filter.reportType !== "sessions" ? 2 : 19,
          average_score: 85.3,
          completion_rate: 94.2,
        },
      };

      switch (filter.format) {
        case "pdf":
          await handleBulkPDFExport(mockBulkData);
          break;
        case "excel":
          await handleBulkExcelExport(mockBulkData);
          break;
        case "csv":
          await handleBulkCSVExport(mockBulkData);
          break;
      }

      toast.success(
        `Bulk export berhasil! ${mockBulkData.totalRecords} record di-export dalam format ${filter.format.toUpperCase()}`
      );
    } catch (error) {
      console.error("Bulk export error:", error);
      toast.error("Gagal melakukan bulk export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkPDFExport = async (bulkData: any) => {
    const fileName = `bulk_${filter.reportType}_report_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;

    // TODO: Create BulkReportPDF component for multiple records
    // For now, use existing SessionReportPDF as template
    const mockSessionData = {
      session: {
        session_name: `Bulk ${filter.reportType} Report`,
        session_code: "BULK001",
        start_time: bulkData.dateRange.dateFrom?.toISOString() || new Date().toISOString(),
        end_time: bulkData.dateRange.dateTo?.toISOString() || new Date().toISOString(),
        target_position: "Multiple Positions",
        total_participants: bulkData.statistics.total_participants,
      },
      participants: bulkData.individuals,
      statistics: bulkData.statistics,
    };

    const pdfComponent = (
      <SessionReportPDF
        data={mockSessionData}
        generatedAt={bulkData.generatedAt}
        filters={bulkData.filters}
      />
    );

    const blob = await pdf(pdfComponent).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkExcelExport = async (bulkData: any) => {
    toast.info("Excel bulk export akan segera tersedia");
  };

  const handleBulkCSVExport = async (bulkData: any) => {
    const fileName = `bulk_${filter.reportType}_report_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;

    let csvContent = "";
    
    if (filter.reportType === "sessions") {
      csvContent = [
        ["Session Name", "Session Code", "Participants", "Average Score"],
        ...bulkData.sessions.map((s: any) => [
          s.session_name,
          s.session_code,
          s.participants,
          s.average_score.toFixed(1),
        ]),
      ]
        .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
        .join("\n");
    } else {
      csvContent = [
        ["Name", "Email", "Overall Score", "Status"],
        ...bulkData.individuals.map((i: any) => [
          i.name,
          i.email,
          i.overall_score.toFixed(1),
          i.status,
        ]),
      ]
        .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
        .join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getReportTypeIcon = () => {
    switch (filter.reportType) {
      case "sessions":
        return <Users className="h-4 w-4" />;
      case "individuals":
        return <FileText className="h-4 w-4" />;
      case "combined":
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
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
      {/* Report Type Selection */}
      <div className="space-y-2">
        <Label>Jenis Laporan</Label>
        <Select
          value={filter.reportType}
          onValueChange={(value: any) =>
            setFilter((f) => ({ ...f, reportType: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih jenis laporan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sessions">📊 Laporan Sesi (Bulk Sessions)</SelectItem>
            <SelectItem value="individuals">👥 Laporan Peserta (Bulk Individuals)</SelectItem>
            <SelectItem value="combined">🌐 Laporan Gabungan (Combined)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Export Format Buttons */}
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

      {/* Date Period Filter */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Periode Data</Label>
          <Select
            value={filter.datePeriod || "all"}
            onValueChange={(value) =>
              setFilter((f) => ({ ...f, datePeriod: value, dateFrom: undefined, dateTo: undefined }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌍 Semua Data</SelectItem>
              <SelectItem value="today">📅 Hari Ini</SelectItem>
              <SelectItem value="this_week">📅 Minggu Ini</SelectItem>
              <SelectItem value="last_week">📅 Minggu Lalu</SelectItem>
              <SelectItem value="this_month">📅 Bulan Ini</SelectItem>
              <SelectItem value="month_0">🗓️ Januari</SelectItem>
              <SelectItem value="month_1">🗓️ Februari</SelectItem>
              <SelectItem value="month_2">🗓️ Maret</SelectItem>
              <SelectItem value="month_3">🗓️ April</SelectItem>
              <SelectItem value="month_4">🗓️ Mei</SelectItem>
              <SelectItem value="month_5">🗓️ Juni</SelectItem>
              <SelectItem value="month_6">🗓️ Juli</SelectItem>
              <SelectItem value="month_7">🗓️ Agustus</SelectItem>
              <SelectItem value="month_8">🗓️ September</SelectItem>
              <SelectItem value="month_9">🗓️ Oktober</SelectItem>
              <SelectItem value="month_10">🗓️ November</SelectItem>
              <SelectItem value="month_11">🗓️ Desember</SelectItem>
              <SelectItem value="this_year">📅 Tahun Ini</SelectItem>
              <SelectItem value="year_2024">🗓️ Tahun 2024</SelectItem>
              <SelectItem value="year_2023">🗓️ Tahun 2023</SelectItem>
              <SelectItem value="year_2022">🗓️ Tahun 2022</SelectItem>
              <SelectItem value="custom">🎯 Pilih Tanggal Kustom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range - only show when "custom" is selected */}
        {filter.datePeriod === "custom" && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filter.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.dateFrom
                      ? format(filter.dateFrom, "PPP", { locale: id })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filter.dateFrom}
                    onSelect={(date) =>
                      setFilter((f) => ({ ...f, dateFrom: date }))
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
                      !filter.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.dateTo
                      ? format(filter.dateTo, "PPP", { locale: id })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filter.dateTo}
                    onSelect={(date) =>
                      setFilter((f) => ({ ...f, dateTo: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label>Status Peserta</Label>
        <Select
          value={filter.status || ""}
          onValueChange={(value) =>
            setFilter((f) => ({ ...f, status: value || undefined }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">✅ Semua Status</SelectItem>
            <SelectItem value="completed">✅ Selesai</SelectItem>
            <SelectItem value="in_progress">🔄 Dalam Proses</SelectItem>
            <SelectItem value="not_started">⏳ Belum Mulai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Opsi Lanjutan
        </Button>

        {showAdvanced && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filter.includeCharts}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      includeCharts: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">
                  📊 Sertakan grafik dan visualisasi
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filter.includeDetailedAnalysis}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      includeDetailedAnalysis: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">📈 Sertakan analisis detail</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filter.includeRecommendations}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      includeRecommendations: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">💡 Sertakan rekomendasi</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters */}
      {(filter.datePeriod !== "all" || filter.status || filter.reportType !== "sessions") && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter Aktif:</Label>
          <div className="flex flex-wrap gap-2">
            {filter.reportType && (
              <Badge variant="secondary" className="gap-1">
                {getReportTypeIcon()}
                Jenis: {
                  filter.reportType === "sessions" ? "Sessions" :
                  filter.reportType === "individuals" ? "Individuals" :
                  "Combined"
                }
              </Badge>
            )}
            {filter.datePeriod && filter.datePeriod !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Periode: {
                  filter.datePeriod === "today" ? "Hari Ini" :
                  filter.datePeriod === "this_week" ? "Minggu Ini" :
                  filter.datePeriod === "last_week" ? "Minggu Lalu" :
                  filter.datePeriod === "this_month" ? "Bulan Ini" :
                  filter.datePeriod === "this_year" ? "Tahun Ini" :
                  filter.datePeriod.startsWith("month_") ? 
                    ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                     "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                    [parseInt(filter.datePeriod.split("_")[1])] :
                  filter.datePeriod.startsWith("year_") ? 
                    `Tahun ${filter.datePeriod.split("_")[1]}` :
                  filter.datePeriod === "custom" ? "Kustom" :
                  filter.datePeriod
                }
              </Badge>
            )}
            {filter.dateFrom && filter.datePeriod === "custom" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Dari: {format(filter.dateFrom, "dd MMM yyyy", { locale: id })}
              </Badge>
            )}
            {filter.dateTo && filter.datePeriod === "custom" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Sampai: {format(filter.dateTo, "dd MMM yyyy", { locale: id })}
              </Badge>
            )}
            {filter.status && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                Status: {
                  filter.status === "completed" ? "Selesai" :
                  filter.status === "in_progress" ? "Dalam Proses" :
                  filter.status === "not_started" ? "Belum Mulai" :
                  filter.status
                }
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleBulkExport}
        disabled={isExporting}
        className="w-full gap-2"
        size="lg"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Mengexport...
          </>
        ) : (
          <>
            {getFormatIcon()}
            🚀 Bulk Export {filter.format.toUpperCase()}
          </>
        )}
      </Button>

      {/* Export Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          {getReportTypeIcon()}
          <span>
            Mode: Bulk Export - {
              filter.reportType === "sessions" ? "Multiple Sessions" :
              filter.reportType === "individuals" ? "Multiple Individuals" :
              "Combined Data"
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3" />
          <span>Format: {filter.format.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3" />
          <span>Export semua data sesuai filter yang dipilih</span>
        </div>
      </div>
    </div>
  );
}