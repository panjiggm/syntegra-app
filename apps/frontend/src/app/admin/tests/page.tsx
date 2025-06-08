"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Settings,
  RefreshCw,
  Copy,
  BarChart3,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { useTests } from "@/hooks/useTests";
import { toast } from "sonner";

// Import components
import CardAnalyticsTest from "./_components/CardAnalyticsTest";
import FilterTest from "./_components/FilterTest";
import TableTest from "./_components/TableTest";

export default function AdminTestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleTypeFilter, setModuleTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // API calls
  const {
    useGetTests,
    useGetTestStats,
    useGetTestFilterOptions,
    useDeleteTest,
  } = useTests();

  // Get tests with current filters
  const testsQuery = useGetTests({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm || undefined,
    module_type:
      moduleTypeFilter !== "all" ? (moduleTypeFilter as any) : undefined,
    category: categoryFilter !== "all" ? (categoryFilter as any) : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    sort_by: "display_order",
    sort_order: "asc",
  });

  // Get test statistics
  const statsQuery = useGetTestStats();

  // Get filter options
  const filterOptionsQuery = useGetTestFilterOptions();

  // Delete mutation
  const deleteTestMutation = useDeleteTest();

  // Reset pagination when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    handleFilterChange();
  };

  // Handle module type filter change
  const handleModuleTypeChange = (value: string) => {
    setModuleTypeFilter(value);
    handleFilterChange();
  };

  // Handle category filter change
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    handleFilterChange();
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    handleFilterChange();
  };

  // Handle page limit change
  const handlePageLimitChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing limit
  };

  // Handle delete test
  const handleDeleteTest = async (testId: string, testName: string) => {
    if (
      window.confirm(`Apakah Anda yakin ingin menghapus tes "${testName}"?`)
    ) {
      try {
        await deleteTestMutation.mutateAsync(testId);
        toast.success("Tes berhasil dihapus");
      } catch (error: any) {
        toast.error("Gagal menghapus tes", {
          description: error.message || "Terjadi kesalahan saat menghapus tes",
        });
      }
    }
  };

  const tests = testsQuery.data?.data || [];
  const meta = testsQuery.data?.meta;
  const stats = statsQuery.data?.data;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Modul Psikotes</h1>
          <p className="text-muted-foreground max-w-2xl">
            Kelola berbagai jenis modul psikotes untuk evaluasi kandidat. Buat
            modul baru, edit yang sudah ada, dan pantau performa setiap tes
            untuk pengambilan keputusan yang tepat.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              testsQuery.refetch();
              statsQuery.refetch();
            }}
            disabled={testsQuery.isFetching || statsQuery.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${testsQuery.isFetching || statsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Pengaturan
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/tests/new">
              <Plus className="h-4 w-4" />
              Buat Tes Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <CardAnalyticsTest
        stats={stats}
        isLoading={statsQuery.isLoading}
        error={statsQuery.error}
      />

      {/* Filter Section */}
      <FilterTest
        searchTerm={searchTerm}
        moduleTypeFilter={moduleTypeFilter}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onModuleTypeChange={handleModuleTypeChange}
        onCategoryChange={handleCategoryChange}
        onStatusChange={handleStatusChange}
        filterOptions={filterOptionsQuery.data?.data}
        isLoading={filterOptionsQuery.isLoading}
      />

      {/* Table Section */}
      <TableTest
        tests={tests}
        meta={meta}
        isLoading={testsQuery.isLoading}
        error={testsQuery.error}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onPageLimitChange={handlePageLimitChange}
        onRefetch={() => testsQuery.refetch()}
        onDeleteTest={handleDeleteTest}
        isDeleting={deleteTestMutation.isPending}
      />

      {/* Quick Actions Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/tests/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors mb-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Buat Tes Baru</CardTitle>
              <CardDescription>
                Mulai dari template atau buat tes psikotes kustom sesuai
                kebutuhan spesifik
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors mb-3">
              <Copy className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Import Template</CardTitle>
            <CardDescription>
              Import tes dari template standar industri atau file eksternal
            </CardDescription>
          </CardHeader>
        </Card>

        <Link href="/admin/tests/analytics">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors mb-3">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Analisis Performa</CardTitle>
              <CardDescription>
                Lihat statistik lengkap dan performa semua tes yang telah
                digunakan
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Info Panel */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Brain className="h-5 w-5" />
            Tips Penggunaan Tes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Praktik Terbaik:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  • Gunakan kombinasi beberapa tes untuk evaluasi komprehensif
                </li>
                <li>
                  • Sesuaikan durasi tes dengan tingkat posisi yang dilamar
                </li>
                <li>
                  • Lakukan kalibrasi berkala untuk memastikan validitas hasil
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Rekomendasi Tes:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  • <strong>Security:</strong> WAIS, MBTI, Wartegg, RIASEC
                </li>
                <li>
                  • <strong>Staff:</strong> Kraepelin, Big Five, PAPI Kostick,
                  DAP
                </li>
                <li>
                  • <strong>Manager:</strong> Raven, EPPS, Army Alpha, HTP
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
