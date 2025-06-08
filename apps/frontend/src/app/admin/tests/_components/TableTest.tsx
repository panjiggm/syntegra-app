import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

// Label mappings
const MODULE_TYPE_LABELS = {
  intelligence: "Inteligensi",
  personality: "Kepribadian",
  aptitude: "Bakat",
  interest: "Minat",
  projective: "Proyektif",
  cognitive: "Kognitif",
} as const;

const CATEGORY_LABELS = {
  wais: "WAIS",
  mbti: "MBTI",
  wartegg: "Wartegg",
  riasec: "RIASEC",
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
  iq: "IQ Test",
  eq: "EQ Test",
} as const;

// Status badge component
const StatusBadge = ({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) => {
  const variants = {
    active: "bg-green-100 text-green-700 hover:bg-green-200",
    inactive: "bg-red-100 text-red-700 hover:bg-red-200",
    archived: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  const labels = {
    active: "Aktif",
    inactive: "Tidak Aktif",
    archived: "Diarsipkan",
  };

  return (
    <Badge className={variants[status]} variant="secondary">
      {labels[status]}
    </Badge>
  );
};

// Module type badge component
const ModuleTypeBadge = ({
  moduleType,
}: {
  moduleType: keyof typeof MODULE_TYPE_LABELS;
}) => {
  const variants = {
    intelligence: "bg-cyan-100 text-cyan-700",
    personality: "bg-pink-100 text-pink-700",
    aptitude: "bg-emerald-100 text-emerald-700",
    interest: "bg-amber-100 text-amber-700",
    projective: "bg-purple-100 text-purple-700",
    cognitive: "bg-indigo-100 text-indigo-700",
  };

  return (
    <Badge className={variants[moduleType]} variant="secondary">
      {MODULE_TYPE_LABELS[moduleType]}
    </Badge>
  );
};

// Category badge component
const CategoryBadge = ({
  category,
}: {
  category: keyof typeof CATEGORY_LABELS;
}) => {
  return (
    <Badge variant="outline" className="text-xs">
      {CATEGORY_LABELS[category]}
    </Badge>
  );
};

interface Test {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  module_type: string;
  time_limit: number;
  total_questions?: number | null;
  passing_score?: number | null;
  status: "active" | "inactive" | "archived";
  created_at: string | Date;
  icon?: string | null;
}

interface Meta {
  total: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

interface TableTestProps {
  tests: Test[];
  meta?: Meta;
  isLoading: boolean;
  error?: Error | null;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageLimitChange: (limit: string) => void;
  onRefetch: () => void;
  onDeleteTest: (testId: string, testName: string) => void;
  isDeleting: boolean;
}

export default function TableTest({
  tests,
  meta,
  isLoading,
  error,
  currentPage,
  itemsPerPage,
  onPageChange,
  onPageLimitChange,
  onRefetch,
  onDeleteTest,
  isDeleting,
}: TableTestProps) {
  // Format tanggal
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Tes Psikotes</CardTitle>
        <CardDescription>
          {meta
            ? `Menampilkan ${tests.length} dari ${meta.total} tes`
            : "Memuat data..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Gagal Memuat Data
              </h3>
              <p className="text-muted-foreground mb-4">
                {error.message || "Terjadi kesalahan saat memuat data tes"}
              </p>
              <Button onClick={onRefetch} variant="outline">
                <RefreshCw className="size-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama & Deskripsi</TableHead>
                  <TableHead>Pertanyaan</TableHead>
                  <TableHead>Tipe & Durasi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        Tidak ada tes yang ditemukan
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Link href={`/admin/tests/${test.id}?tab=overview`}>
                          <div className="space-y-2">
                            <div className="font-medium hover:underline cursor-pointer">
                              {test.icon} {test.name}
                            </div>
                            {test.description && (
                              <div className="text-xs text-muted-foreground max-w-sc truncate line-clamp-2">
                                {test.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {test.total_questions || 0} soal
                        </div>
                        {test.passing_score && (
                          <div className="text-xs text-muted-foreground">
                            Passing: {test.passing_score}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <ModuleTypeBadge
                            moduleType={
                              test.module_type as keyof typeof MODULE_TYPE_LABELS
                            }
                          />
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {test.time_limit} menit
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CategoryBadge
                          category={
                            test.category as keyof typeof CATEGORY_LABELS
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={test.status || "active"} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{formatDate(test.created_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Buka menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi Tes</DropdownMenuLabel>
                            <Link href={`/admin/tests/${test.id}?tab=overview`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Lihat Detail
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/tests/edit?testId=${test.id}`}>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Tes
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <Link href={`/admin/tests/${test.id}?tab=question`}>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Kelola Pertanyaan
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDeleteTest(test.id, test.name)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isDeleting ? "Menghapus..." : "Hapus Tes"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-limit" className="text-sm whitespace-nowrap">
                Tampilkan:
              </Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={onPageLimitChange}
              >
                <SelectTrigger id="page-limit" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per halaman</span>
            </div>

            {meta && (
              <div className="text-sm text-muted-foreground">
                Menampilkan {(meta.current_page - 1) * meta.per_page + 1} hingga{" "}
                {Math.min(meta.current_page * meta.per_page, meta.total)} dari{" "}
                {meta.total} tes
              </div>
            )}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!meta.has_prev_page}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from(
                  { length: Math.min(5, meta.total_pages) },
                  (_, i) => {
                    let page;
                    if (meta.total_pages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= meta.total_pages - 2) {
                      page = meta.total_pages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  }
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!meta.has_next_page}
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
