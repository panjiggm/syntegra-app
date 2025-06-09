import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTests } from "~/hooks/use-tests";
import { Plus, RefreshCw } from "lucide-react";
import type { GetTestsRequest } from "~/hooks/use-tests";
import { CardAnalyticTest } from "~/components/admin/test/CardAnalyticTest";
import { FilterTest } from "~/components/admin/test/FilterTest";
import { CardTest } from "~/components/admin/test/CardTest";
import { useNavigate } from "react-router";

export function meta() {
  return [
    { title: "Modul Psikotes - Admin Panel" },
    { name: "description", content: "Kelola modul tes psikologi" },
  ];
}

export default function AdminTestsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GetTestsRequest>({
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const [searchTerm, setSearchTerm] = useState("");

  const {
    useGetTests,
    useGetTestStats,
    useGetTestFilterOptions,
    useDeleteTest,
    useDuplicateTest,
  } = useTests();

  const {
    data: testsData,
    isLoading: testsLoading,
    error: testsError,
    refetch: refetchTests,
  } = useGetTests(filters);

  const { data: statsData, isLoading: statsLoading } = useGetTestStats();

  const { data: filterOptions, isLoading: filterOptionsLoading } =
    useGetTestFilterOptions();

  const deleteTestMutation = useDeleteTest();
  const duplicateTestMutation = useDuplicateTest();

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm.trim() || undefined,
      page: 1,
    }));
  };

  const handleFilterChange = (key: keyof GetTestsRequest, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDeleteTest = (testId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus tes ini?")) {
      deleteTestMutation.mutate(testId);
    }
  };

  const handleDuplicateTest = (testId: string) => {
    duplicateTestMutation.mutate(testId);
  };

  const hasFilters = Boolean(
    filters.search || filters.module_type || filters.status || filters.category
  );

  // Only show error state for tests error, not loading
  if (testsError) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {/* Header - Always show */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Modul Psikotes
            </h1>
            <p className="text-muted-foreground text-sm">
              Kelola dan konfigurasikan modul tes psikologi
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchTests()}
              disabled={testsLoading}
            >
              <RefreshCw
                className={`size-4 mr-2 ${testsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button>
              <Plus className="size-4 mr-2" />
              Tambah Tes
            </Button>
          </div>
        </div>

        {/* Error State for Tests */}
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold">Gagal memuat data tes</h2>
          <p className="text-muted-foreground">{testsError.message}</p>
          <Button onClick={() => refetchTests()}>
            <RefreshCw className="size-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header - Always show */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modul Psikotes</h1>
          <p className="text-muted-foreground text-sm">
            Kelola dan konfigurasikan modul tes psikologi
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetchTests()}
            disabled={testsLoading}
          >
            <RefreshCw
              className={`size-4 mr-2 ${testsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => navigate("/admin/tests/new")}>
            <Plus className="size-4 mr-2" />
            Tambah Tes
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Show with skeleton loading */}
      <CardAnalyticTest statsData={statsData} isLoading={statsLoading} />

      {/* Filters - Always show */}
      <FilterTest
        filters={filters}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        isLoading={testsLoading}
        filterOptions={filterOptions}
      />

      {/* Tests Grid - Show loading indicator within component */}
      <CardTest
        tests={testsData?.data || []}
        onDuplicateTest={handleDuplicateTest}
        onDeleteTest={handleDeleteTest}
        isDuplicating={duplicateTestMutation.isPending}
        isDeleting={deleteTestMutation.isPending}
        hasFilters={hasFilters}
        isLoading={testsLoading && !testsData}
      />

      {/* Pagination - Only show when data is available and not loading initial */}
      {testsData?.meta && testsData.meta.total_pages > 1 && !testsLoading && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            {(testsData.meta.current_page - 1) * testsData.meta.per_page + 1} -{" "}
            {Math.min(
              testsData.meta.current_page * testsData.meta.per_page,
              testsData.meta.total
            )}{" "}
            dari {testsData.meta.total} tes
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(testsData.meta.current_page - 1)}
              disabled={!testsData.meta.has_prev_page || testsLoading}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(testsData.meta.current_page + 1)}
              disabled={!testsData.meta.has_next_page || testsLoading}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
