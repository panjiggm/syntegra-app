import { useState, useEffect, useMemo } from "react";
import { useReports, type SessionReportsListItem } from "~/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Search,
  Calendar,
  Clock,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  MapPin,
  BarChart3,
  Brain,
  CalendarCheck2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { formatScore } from "~/lib/utils/score";

interface TabSessionProps {
  onSelectSession: (session: SessionReportsListItem) => void;
  selectedSession: SessionReportsListItem | null;
}

export function TabSession({
  onSelectSession,
  selectedSession,
}: TabSessionProps) {
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [hasResultsFilter, setHasResultsFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "session_name" | "start_time" | "total_participants" | "completion_rate"
  >("start_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);

  // Use the new hook
  const { useGetSessionReportsList } = useReports();

  // Memoize query params to avoid unnecessary refetches
  const queryParams = useMemo(
    () => ({
      page: currentPage,
      per_page: perPage,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(search.trim() && { search: search.trim() }),
      ...(statusFilter && { status: statusFilter as any }),
      ...(hasResultsFilter && { has_results: hasResultsFilter === "true" }),
    }),
    [
      currentPage,
      perPage,
      sortBy,
      sortOrder,
      search,
      statusFilter,
      hasResultsFilter,
    ]
  );

  // Use the hook with memoized params
  const {
    data: sessions,
    isLoading: loading,
    error,
    refetch: refetchSessions,
  } = useGetSessionReportsList(queryParams);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Akan Datang";
      case "active":
        return "Berlangsung";
      case "completed":
        return "Selesai";
      case "cancelled":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}j ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daftar Sesi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama sesi, kode, atau posisi target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_time">Waktu Mulai</SelectItem>
                <SelectItem value="session_name">Nama Sesi</SelectItem>
                <SelectItem value="total_participants">
                  Total Peserta
                </SelectItem>
                <SelectItem value="completion_rate">
                  Tingkat Penyelesaian
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error?.message || "An error occurred"}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetchSessions()}
              >
                Coba Lagi
              </Button>
            </div>
          ) : sessions?.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Tidak ada data sesi ditemukan</p>
            </div>
          ) : (
            <div className="space-y-0">
              {(sessions?.sessions as SessionReportsListItem[])?.map(
                (session) => (
                  <div
                    key={session.session_id}
                    className={cn(
                      "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedSession?.session_id === session.session_id &&
                        "bg-blue-50 border-l-4 border-l-blue-500"
                    )}
                    onClick={() => onSelectSession(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <CalendarCheck2 className="h-5 w-5 text-muted-foreground mr-2 inline-block" />
                            <h3 className="font-bold text-md truncate">
                              {session.session_name}
                            </h3>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getStatusColor(session.status)
                            )}
                          >
                            {getStatusLabel(session.status)}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {session.session_code}
                          {session.target_position &&
                            ` • ${session.target_position}`}
                          {session.location && (
                            <span className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                          )}
                        </p>

                        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 text-xs mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(session.start_time)} •{" "}
                              {formatTime(session.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDuration(session.total_duration_minutes)}{" "}
                              durasi tes
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            <span>{session.total_test_modules} modul tes</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 text-xs mb-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{session.total_registered} peserta</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>
                              {session.average_score
                                ? `Avg: ${formatScore(session.average_score)}`
                                : "Belum ada skor"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {sessions?.pagination && sessions.sessions.length > 0 && (
          <div className="p-4 border-t bg-muted/25">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan{" "}
                {(sessions.pagination.current_page - 1) *
                  sessions.pagination.per_page +
                  1}{" "}
                -{" "}
                {Math.min(
                  sessions.pagination.current_page *
                    sessions.pagination.per_page,
                  sessions.pagination.total
                )}{" "}
                dari {sessions.pagination.total} sesi
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!sessions.pagination.has_prev_page}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm px-2">
                  {sessions.pagination.current_page} /{" "}
                  {sessions.pagination.total_pages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!sessions.pagination.has_next_page}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
