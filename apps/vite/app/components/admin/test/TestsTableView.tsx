import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// Components
import { TableTest } from "./TableTest";
import { TestTablePagination } from "./TestTablePagination";
import { TestTableFilters, type TestFilters } from "./TestTableFilters";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

// Icons
import { Trash2, RotateCcw, FileText, Archive } from "lucide-react";

// Hooks
import {
  useTests,
  type TestData,
  type GetTestsRequest,
} from "~/hooks/use-tests";

// Utils
import { cn } from "~/lib/utils";

interface TestsTableViewProps {
  className?: string;
}

export function TestsTableView({ className }: TestsTableViewProps) {
  const navigate = useNavigate();

  // State
  const [filters, setFilters] = useState<TestFilters>({});
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Hooks
  const { useGetTests, useDeleteTest, useUpdateTest } = useTests();
  const deleteTestMutation = useDeleteTest();
  const updateTestMutation = useUpdateTest();

  // Build query parameters
  const queryParams = useMemo<GetTestsRequest>(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      sort_by: sortBy as any,
      sort_order: sortOrder,
      include_stats: true,
      ...filters,
    }),
    [filters, currentPage, itemsPerPage, sortBy, sortOrder]
  );

  // Fetch tests data
  const {
    data: testsResponse,
    isLoading,
    error,
    refetch,
  } = useGetTests(queryParams);

  const tests = testsResponse?.data || [];
  const meta = testsResponse?.meta;

  // Handlers
  const handleFiltersChange = useCallback((newFilters: TestFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleFiltersReset = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
      setCurrentPage(1);
    },
    [sortBy, sortOrder]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1);
  }, []);

  const handleSelectTest = useCallback((testId: string, selected: boolean) => {
    setSelectedTests((prev) =>
      selected ? [...prev, testId] : prev.filter((id) => id !== testId)
    );
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setSelectedTests(selected ? tests.map((test) => test.id) : []);
    },
    [tests]
  );

  const handleEdit = useCallback(
    (test: TestData) => {
      navigate(`/admin/tests/${test.id}/edit`);
    },
    [navigate]
  );

  const handleView = useCallback(
    (test: TestData) => {
      navigate(`/admin/tests/${test.id}`);
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback((test: TestData) => {
    // Single delete is handled by TableTest component
    console.log("Delete test:", test.id);
  }, []);

  const handleDuplicate = useCallback((test: TestData) => {
    // Duplicate is handled by TableTest component
    console.log("Duplicate test:", test.id);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    try {
      // Delete tests one by one (could be optimized with bulk API)
      for (const testId of selectedTests) {
        await deleteTestMutation.mutateAsync(testId);
      }
      setSelectedTests([]);
      setBulkDeleteDialogOpen(false);
      toast.success(`${selectedTests.length} tes berhasil dihapus`);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Gagal menghapus beberapa tes");
    }
  }, [selectedTests, deleteTestMutation]);

  const handleBulkArchive = useCallback(async () => {
    try {
      // Archive tests one by one
      for (const testId of selectedTests) {
        await updateTestMutation.mutateAsync({
          id: testId,
          data: { status: "archived" },
        });
      }
      setSelectedTests([]);
      toast.success(`${selectedTests.length} tes berhasil diarsipkan`);
    } catch (error) {
      console.error("Bulk archive failed:", error);
      toast.error("Gagal mengarsipkan beberapa tes");
    }
  }, [selectedTests, updateTestMutation]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Gagal memuat data tes</h3>
          <p className="text-muted-foreground mb-4">
            Terjadi kesalahan saat mengambil data dari server
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <TestTableFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTests.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedTests.length} tes dipilih
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  disabled={updateTestMutation.isPending}
                >
                  {updateTestMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  Arsipkan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTests([])}
                >
                  Batal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="p-0">
        <CardContent className="p-4">
          <TableTest
            data={tests}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onView={handleView}
            selectedTests={selectedTests}
            onSelectTest={handleSelectTest}
            onSelectAll={handleSelectAll}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && (
        <Card>
          <CardContent className="py-4">
            <TestTablePagination
              currentPage={meta.current_page}
              totalPages={meta.total_pages}
              totalItems={meta.total}
              itemsPerPage={meta.per_page}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tes Terpilih</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedTests.length} tes yang
              dipilih? Tindakan ini tidak dapat dibatalkan dan akan menghapus
              semua data terkait termasuk soal dan hasil tes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteTestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTestMutation.isPending && (
                <LoadingSpinner size="sm" className="mr-2" />
              )}
              Hapus {selectedTests.length} Tes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
