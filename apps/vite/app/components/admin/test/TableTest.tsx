import { useState } from "react";
import { Link } from "react-router";
import { formatDistance, format } from "date-fns";
import { id } from "date-fns/locale";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Skeleton } from "~/components/ui/skeleton";

// Icons
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  TrendingUp,
  Clock,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";

// Hooks
import { useTests, type TestData } from "~/hooks/use-tests";
import { QuestionTypeBadge } from "~/components/question-type-badge";

interface TableTestProps {
  data: TestData[];
  isLoading?: boolean;
  onEdit?: (test: TestData) => void;
  onDelete?: (test: TestData) => void;
  onDuplicate?: (test: TestData) => void;
  onView?: (test: TestData) => void;
  selectedTests?: string[];
  onSelectTest?: (testId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export function TableTest({
  data,
  isLoading = false,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  selectedTests = [],
  onSelectTest,
  onSelectAll,
  sortBy = "name",
  sortOrder = "asc",
  onSort,
}: TableTestProps) {
  const [deleteTest, setDeleteTest] = useState<TestData | null>(null);
  const { useDeleteTest, useDuplicateTest } = useTests();

  const deleteTestMutation = useDeleteTest();
  const duplicateTestMutation = useDuplicateTest();

  const handleDelete = async () => {
    if (!deleteTest) return;

    try {
      await deleteTestMutation.mutateAsync(deleteTest.id);
      setDeleteTest(null);
      onDelete?.(deleteTest);
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const handleDuplicate = async (test: TestData) => {
    try {
      await duplicateTestMutation.mutateAsync(test.id);
      onDuplicate?.(test);
    } catch (error) {
      console.error("Failed to duplicate test:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getModuleTypeColor = (moduleType: string) => {
    switch (moduleType) {
      case "intelligence":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "personality":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cognitive":
        return "bg-green-100 text-green-800 border-green-200";
      case "projective":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "interest":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "aptitude":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatModuleType = (moduleType: string) => {
    switch (moduleType) {
      case "intelligence":
        return "Inteligensi";
      case "personality":
        return "Kepribadian";
      case "cognitive":
        return "Kognitif";
      case "projective":
        return "Proyektif";
      case "interest":
        return "Minat";
      case "aptitude":
        return "Bakat";
      default:
        return moduleType;
    }
  };

  const formatCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      wais: "WAIS",
      mbti: "MBTI",
      wartegg: "Wartegg",
      riasec: "RIASEC (Holland)",
      kraepelin: "Kraepelin",
      pauli: "Pauli",
      big_five: "Big Five",
      papi_kostick: "PAPI Kostick",
      dap: "DAP",
      raven: "Raven",
      epps: "EPPS",
      army_alpha: "Army Alpha",
      htp: "HTP",
      disc: "DISC",
      iq: "IQ",
      eq: "EQ",
    };
    return categoryMap[category] || category.toUpperCase();
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const handleSort = (field: string) => {
    onSort?.(field);
  };

  const allSelected = data.length > 0 && selectedTests.length === data.length;
  const someSelected =
    selectedTests.length > 0 && selectedTests.length < data.length;

  if (isLoading) {
    return <TableTestSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el)
                      (el as HTMLInputElement).indeterminate = someSelected;
                  }}
                  onCheckedChange={(checked) => {
                    onSelectAll?.(!!checked);
                  }}
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Nama Tes
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("module_type")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Tipe Modul
                  {getSortIcon("module_type")}
                </Button>
              </TableHead>
              <TableHead className="h-auto p-0 font-semibold hover:bg-transparent">
                Tipe Soal
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("category")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Kategori
                  {getSortIcon("category")}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("time_limit")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Waktu
                  {getSortIcon("time_limit")}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("total_questions")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Soal
                  {getSortIcon("total_questions")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("created_at")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Dibuat
                  {getSortIcon("created_at")}
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Tidak ada tes ditemukan</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((test, index) => (
                <TableRow key={test.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedTests.includes(test.id)}
                      className="cursor-pointer"
                      onCheckedChange={(checked) => {
                        onSelectTest?.(test.id, !!checked);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {test.icon && (
                        <span className="text-lg">{test.icon}</span>
                      )}
                      <div>
                        <Link to={`/admin/tests/${test.id}`}>
                          <div className="font-medium line-clamp-1 hover:underline cursor-pointer">
                            {test.name}
                          </div>
                        </Link>
                        {test.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1 truncate max-w-[200px]">
                            {test.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getModuleTypeColor(test.module_type)}
                    >
                      {formatModuleType(test.module_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <QuestionTypeBadge questionType={test.question_type} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatCategory(test.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {test.time_limit}m
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {test.total_questions}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {format(new Date(test.created_at), "dd MMM yyyy", {
                          locale: id,
                        })}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDistance(new Date(test.created_at), new Date(), {
                          addSuffix: true,
                          locale: id,
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TestTableActions
                      test={test}
                      onView={onView}
                      onDelete={(test) => setDeleteTest(test)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTest} onOpenChange={() => setDeleteTest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tes</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tes "{deleteTest?.name}"?
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data
              terkait termasuk soal dan hasil tes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTestMutation.isPending && (
                <LoadingSpinner size="sm" className="mr-2" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Test Table Actions Component
interface TestTableActionsProps {
  test: TestData;
  onView?: (test: TestData) => void;
  onDelete?: (test: TestData) => void;
}

function TestTableActions({ test, onView, onDelete }: TestTableActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
          <span className="sr-only">Buka menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onView?.(test)}>
          <Eye className="mr-2 h-4 w-4" />
          Lihat Detail
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={`/admin/tests/${test.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Tes
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onDelete?.(test)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Skeleton Component
function TableTestSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Nama Tes</TableHead>
            <TableHead>Tipe Modul</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-center">Waktu</TableHead>
            <TableHead className="text-center">Soal</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-6" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-5 w-16 mx-auto" />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
