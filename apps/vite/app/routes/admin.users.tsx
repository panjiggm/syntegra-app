import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useTests } from "~/hooks/use-tests";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Brain,
  Clock,
  Users,
  BarChart3,
  FileText,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  NotepadTextDashed,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Route } from "./+types/admin.tests";
import type { GetTestsRequest, TestData } from "~/hooks/use-tests";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Modul Psikotes - Admin Panel" },
    { name: "description", content: "Kelola modul tes psikologi" },
  ];
}

export default function AdminTestsPage() {
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

  const getModuleTypeIcon = (moduleType: string) => {
    switch (moduleType) {
      case "intelligence":
        return "🧠";
      case "personality":
        return "👥";
      case "cognitive":
        return "🧮";
      case "projective":
        return "🎨";
      case "interest":
        return "🎯";
      case "aptitude":
        return "⚡";
      default:
        return "📋";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Aktif</Badge>;
      case "inactive":
        return <Badge variant="secondary">Nonaktif</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "archived":
        return <Badge variant="destructive">Arsip</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (testsLoading && !testsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (testsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-xl font-semibold">Gagal memuat data tes</h2>
        <p className="text-muted-foreground">{testsError.message}</p>
        <Button onClick={() => refetchTests()}>
          <RefreshCw className="size-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modul Psikotes</h1>
          <p className="text-muted-foreground">
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

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tes</CardTitle>
              <Brain className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total_tests}</div>
              <p className="text-xs text-muted-foreground">
                {statsData.active_tests} aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tes Aktif</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.active_tests}</div>
              <p className="text-xs text-muted-foreground">Dari semua tes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tes Nonaktif
              </CardTitle>
              <NotepadTextDashed className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.inactive_tests}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData.inactive_tests} nonaktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.archived_tests}
              </div>
              <p className="text-xs text-muted-foreground">Arsip</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
          <CardDescription>
            Gunakan filter untuk menemukan tes yang sesuai
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search">Cari Tes</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Nama tes, deskripsi, atau kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={testsLoading}>
                  <Search className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipe Modul</Label>
              <Select
                value={filters.module_type || "all"}
                onValueChange={(value) =>
                  handleFilterChange("module_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="intelligence">Intelligence</SelectItem>
                  <SelectItem value="personality">Personality</SelectItem>
                  <SelectItem value="cognitive">Cognitive</SelectItem>
                  <SelectItem value="projective">Projective</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="aptitude">Aptitude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Arsip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kategori</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {filterOptions?.categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Urutkan</Label>
              <Select
                value={`${filters.sort_by}-${filters.sort_order}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split("-");
                  setFilters((prev) => ({
                    ...prev,
                    sort_by: sortBy as any,
                    sort_order: sortOrder as any,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Terbaru</SelectItem>
                  <SelectItem value="created_at-asc">Terlama</SelectItem>
                  <SelectItem value="name-asc">Nama A-Z</SelectItem>
                  <SelectItem value="name-desc">Nama Z-A</SelectItem>
                  <SelectItem value="total_questions-desc">
                    Soal Terbanyak
                  </SelectItem>
                  <SelectItem value="time_limit-desc">Waktu Terlama</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testsData?.data.map((test: TestData) => (
          <Card key={test.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getModuleTypeIcon(test.module_type)}
                  </span>
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {test.category}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Edit className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateTest(test.id)}
                      disabled={duplicateTestMutation.isPending}
                    >
                      <Copy className="size-4 mr-2" />
                      Duplikasi
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteTest(test.id)}
                      disabled={deleteTestMutation.isPending}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {getStatusBadge(test.status)}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {test.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span>{test.total_questions} soal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{test.time_limit} menit</span>
                </div>
              </div>

              {test.attempt_count !== undefined && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Percobaan: {test.attempt_count}</span>
                    {test.average_score && (
                      <span>Rata-rata: {Math.round(test.average_score)}%</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {testsData?.meta && testsData.meta.total_pages > 1 && (
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

      {/* Empty State */}
      {testsData?.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Belum ada tes</h3>
          <p className="text-muted-foreground text-center mb-4">
            {filters.search ||
            filters.module_type ||
            filters.status ||
            filters.category
              ? "Tidak ada tes yang sesuai dengan filter"
              : "Mulai dengan membuat tes psikologi pertama Anda"}
          </p>
          <Button>
            <Plus className="size-4 mr-2" />
            Tambah Tes
          </Button>
        </div>
      )}
    </div>
  );
}
