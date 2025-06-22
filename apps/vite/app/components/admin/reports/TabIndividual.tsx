import { useState, useEffect, useMemo } from "react";
import {
  useReports,
  type IndividualReportsListItem,
} from "~/hooks/use-reports";
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
  Users,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  User,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { formatScore } from "~/lib/utils/score";

interface TabIndividualProps {
  onSelectIndividual: (individual: IndividualReportsListItem) => void;
  selectedIndividual: IndividualReportsListItem | null;
}

export function TabIndividual({
  onSelectIndividual,
  selectedIndividual,
}: TabIndividualProps) {
  // Filters
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "name" | "email" | "overall_score" | "completion_rate" | "last_test_date"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);

  // Use the new hook
  const { useGetIndividualReportsList } = useReports();

  // Memoize query params to avoid unnecessary refetches
  const queryParams = useMemo(
    () => ({
      page: currentPage,
      per_page: perPage,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(search.trim() && { search: search.trim() }),
      ...(sessionFilter && { session_id: sessionFilter }),
    }),
    [currentPage, perPage, sortBy, sortOrder, search, sessionFilter]
  );

  // Use the hook with memoized params
  const {
    data: individuals,
    isLoading: loading,
    error,
    refetch: refetchIndividuals,
  } = useGetIndividualReportsList(queryParams);

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

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-gray-100 text-gray-800";
    switch (grade.toUpperCase()) {
      case "A":
        return "bg-green-100 text-green-800";
      case "B":
        return "bg-blue-100 text-blue-800";
      case "C":
        return "bg-yellow-100 text-yellow-800";
      case "D":
        return "bg-orange-100 text-orange-800";
      case "E":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Peserta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <Label>Cari Peserta</Label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, email, atau NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <Label>Urut berdasarkan</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as typeof sortBy)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Urutkan berdasarkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nama</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="overall_score">
                    Skor Keseluruhan
                  </SelectItem>
                  <SelectItem value="completion_rate">
                    Tingkat Penyelesaian
                  </SelectItem>
                  <SelectItem value="last_test_date">Tes Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individuals List */}
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
                onClick={() => refetchIndividuals()}
              >
                Coba Lagi
              </Button>
            </div>
          ) : individuals?.individuals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Tidak ada data individual ditemukan</p>
            </div>
          ) : (
            <div className="space-y-0">
              {(individuals?.individuals as IndividualReportsListItem[])?.map(
                (individual) => (
                  <div
                    key={individual.user_id}
                    className={cn(
                      "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedIndividual?.user_id === individual.user_id &&
                        "bg-blue-50 border-l-4 border-l-blue-500"
                    )}
                    onClick={() => onSelectIndividual(individual)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-muted-foreground mr-2 inline-block" />
                            <h3 className="font-bold text-md truncate">
                              {individual.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1">
                            {individual.overall_grade && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs font-bold",
                                  getGradeColor(individual.overall_grade)
                                )}
                              >
                                {individual.overall_grade}
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
                                {formatScore(individual.overall_score) || 0}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {individual.email} • NIK: {individual.nik}
                        </p>

                        <div className="mt-2 text-xs text-muted-foreground">
                          <span>
                            {individual.total_tests_completed}/
                            {individual.total_tests_taken} Tes
                          </span>
                          <span className="mx-2">•</span>
                          <span>{individual.sessions_count} Sesi Tes</span>
                          {individual.last_test_date && (
                            <>
                              <span className="mx-2">•</span>
                              <span>
                                Terakhir:{" "}
                                {formatDate(individual.last_test_date)}
                              </span>
                            </>
                          )}
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
        {individuals?.pagination && individuals.individuals.length > 0 && (
          <div className="p-4 border-t bg-muted/25">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan{" "}
                {(individuals?.pagination.current_page - 1) *
                  individuals?.pagination.per_page +
                  1}{" "}
                -{" "}
                {Math.min(
                  individuals.pagination.current_page *
                    individuals.pagination.per_page,
                  individuals.pagination.total
                )}{" "}
                dari {individuals.pagination.total} peserta
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!individuals.pagination.has_prev_page}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm px-2">
                  {individuals?.pagination.current_page} /{" "}
                  {individuals?.pagination.total_pages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!individuals?.pagination.has_next_page}
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
