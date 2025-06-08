"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Clock,
  Hash,
  FileText,
  Image,
  Volume2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionDialogStore } from "@/stores/useQuestionDialogStore";
import { AddQuestionDialog } from "./AddQuestionDialog";

interface TestData {
  id: string;
  name: string;
  total_questions?: number;
}

interface TestBankSoalProps {
  testId: string;
  test: TestData;
}

// Question type labels
const QUESTION_TYPE_LABELS = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar/Salah",
  text: "Esai",
  rating_scale: "Skala Rating",
  drawing: "Gambar",
  sequence: "Urutan",
  matrix: "Matriks",
} as const;

// Question type badge component
const QuestionTypeBadge = ({
  type,
}: {
  type: keyof typeof QUESTION_TYPE_LABELS;
}) => {
  const variants = {
    multiple_choice: "bg-blue-100 text-blue-700",
    true_false: "bg-green-100 text-green-700",
    text: "bg-purple-100 text-purple-700",
    rating_scale: "bg-orange-100 text-orange-700",
    drawing: "bg-pink-100 text-pink-700",
    sequence: "bg-cyan-100 text-cyan-700",
    matrix: "bg-indigo-100 text-indigo-700",
  };

  return (
    <Badge className={variants[type]} variant="secondary">
      {QUESTION_TYPE_LABELS[type]}
    </Badge>
  );
};

export function TestBankSoal({ testId, test }: TestBankSoalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("all");
  const [isRequiredFilter, setIsRequiredFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [deleteQuestionText, setDeleteQuestionText] = useState("");
  const itemsPerPage = 10;

  // Zustand store
  const { openCreateDialog, openEditDialog } = useQuestionDialogStore();

  // API calls
  const {
    useGetQuestions,
    useGetQuestionStats,
    useDeleteQuestion,
    useUpdateQuestionSequence,
  } = useQuestions();

  // Get questions with current filters
  const questionsQuery = useGetQuestions(testId, {
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm || undefined,
    question_type:
      questionTypeFilter !== "all" ? (questionTypeFilter as any) : undefined,
    is_required:
      isRequiredFilter !== "all" ? isRequiredFilter === "true" : undefined,
    sort_by: "sequence",
    sort_order: "asc",
  });

  // Get question statistics
  const statsQuery = useGetQuestionStats(testId);

  // Delete mutation
  const deleteQuestionMutation = useDeleteQuestion(testId);

  // Update sequence mutation
  const updateSequenceMutation = useUpdateQuestionSequence(testId);

  // Reset pagination when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle delete question
  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId) return;

    try {
      await deleteQuestionMutation.mutateAsync(deleteQuestionId);
      toast.success("Soal berhasil dihapus");
      setDeleteQuestionId(null);
      setDeleteQuestionText("");
    } catch (error: any) {
      toast.error("Gagal menghapus soal", {
        description: error.message || "Terjadi kesalahan saat menghapus soal",
      });
    }
  };

  // Handle move question
  const handleMoveQuestion = async (
    questionId: string,
    direction: "up" | "down"
  ) => {
    const questions = questionsQuery.data?.data || [];
    const currentIndex = questions.findIndex((q) => q.id === questionId);

    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newSequence = questions[newIndex].sequence;

    try {
      await updateSequenceMutation.mutateAsync({
        questionId,
        sequence: newSequence,
      });
      toast.success("Urutan soal berhasil diubah");
    } catch (error: any) {
      toast.error("Gagal mengubah urutan soal", {
        description:
          error.message || "Terjadi kesalahan saat mengubah urutan soal",
      });
    }
  };

  // Loading state
  if (questionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Memuat bank soal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (questionsQuery.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Gagal Memuat Bank Soal
            </h3>
            <p className="text-muted-foreground mb-4">
              {questionsQuery.error.message ||
                "Terjadi kesalahan saat memuat bank soal"}
            </p>
            <Button onClick={() => questionsQuery.refetch()} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const questions = questionsQuery.data?.data || [];
  const meta = questionsQuery.data?.meta;
  const stats = statsQuery.data?.data;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Bank Soal</h2>
          <p className="text-muted-foreground">
            Kelola bank soal untuk tes <strong>{test.name}</strong>. Tambah,
            edit, atau hapus pertanyaan sesuai kebutuhan.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              questionsQuery.refetch();
              statsQuery.refetch();
            }}
            disabled={questionsQuery.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${questionsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => openCreateDialog(testId)}>
            <Plus className="h-4 w-4" />
            Tambah Soal Baru
          </Button>
        </div>
      </div>

      {/* Main Grid Layout: Content (80%) + Stats (20%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Content Area (80%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Filter dan Pencarian */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <Label htmlFor="search">Cari Soal</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari teks pertanyaan..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        handleFilterChange();
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full md:w-48">
                  <Label>Tipe Soal</Label>
                  <Select
                    value={questionTypeFilter}
                    onValueChange={(value) => {
                      setQuestionTypeFilter(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="multiple_choice">
                        Pilihan Ganda
                      </SelectItem>
                      <SelectItem value="true_false">Benar/Salah</SelectItem>
                      <SelectItem value="text">Esai</SelectItem>
                      <SelectItem value="rating_scale">Skala Rating</SelectItem>
                      <SelectItem value="drawing">Gambar</SelectItem>
                      <SelectItem value="sequence">Urutan</SelectItem>
                      <SelectItem value="matrix">Matriks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-48">
                  <Label>Status Wajib</Label>
                  <Select
                    value={isRequiredFilter}
                    onValueChange={(value) => {
                      setIsRequiredFilter(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="true">Wajib</SelectItem>
                      <SelectItem value="false">Opsional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Soal</CardTitle>
              <p className="text-sm text-muted-foreground">
                {meta
                  ? `Menampilkan ${questions.length} dari ${meta.total} soal`
                  : "Memuat data..."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="size-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Belum Ada Soal
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {questionsQuery.isFetching ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Memuat data...
                        </span>
                      ) : (
                        "Mulai dengan menambahkan soal pertama untuk tes ini"
                      )}
                    </p>
                    <Button onClick={() => openCreateDialog(testId)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Soal Pertama
                    </Button>
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <Card
                      key={question.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Question Header */}
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                                {question.sequence}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <QuestionTypeBadge
                                    type={
                                      question.question_type as keyof typeof QUESTION_TYPE_LABELS
                                    }
                                  />
                                  {question.is_required ? (
                                    <Badge
                                      variant="default"
                                      className="bg-green-100 text-green-700"
                                    >
                                      Wajib
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Opsional</Badge>
                                  )}
                                  {question.time_limit && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      {question.time_limit}s
                                    </Badge>
                                  )}
                                  {question.image_url && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <Image className="h-3 w-3 mr-1" />
                                      Gambar
                                    </Badge>
                                  )}
                                  {question.audio_url && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <Volume2 className="h-3 w-3 mr-1" />
                                      Audio
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium line-clamp-2">
                                  {question.question}
                                </p>
                              </div>
                            </div>

                            {/* Question Options (for multiple choice) */}
                            {question.question_type === "multiple_choice" &&
                              question.options && (
                                <div className="ml-11 space-y-1">
                                  {question.options
                                    .slice(0, 3)
                                    .map((option, optIndex) => (
                                      <div
                                        key={optIndex}
                                        className="flex items-center gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                          {String.fromCharCode(65 + optIndex)}
                                        </span>
                                        <span className="line-clamp-1">
                                          {option.label}
                                        </span>
                                        {option.score && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {option.score}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  {question.options.length > 3 && (
                                    <div className="text-xs text-muted-foreground ml-6">
                                      +{question.options.length - 3} opsi
                                      lainnya
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Question True/False */}
                            {question.question_type === "true_false" && (
                              <div className="ml-11 flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Benar
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Salah
                                </Badge>
                                {question.correct_answer && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-green-100 text-green-700"
                                  >
                                    Jawaban: {question.correct_answer}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Meta Information */}
                            <div className="ml-11 text-xs text-muted-foreground">
                              Dibuat: {formatDate(question.created_at)}
                              {question.updated_at !== question.created_at && (
                                <span>
                                  {" "}
                                  • Diperbarui:{" "}
                                  {formatDate(question.updated_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Move buttons */}
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  handleMoveQuestion(question.id, "up")
                                }
                                disabled={
                                  index === 0 ||
                                  updateSequenceMutation.isPending
                                }
                              >
                                <ChevronLeft className="h-3 w-3 rotate-90" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  handleMoveQuestion(question.id, "down")
                                }
                                disabled={
                                  index === questions.length - 1 ||
                                  updateSequenceMutation.isPending
                                }
                              >
                                <ChevronRight className="h-3 w-3 rotate-90" />
                              </Button>
                            </div>

                            {/* More actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Buka menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi Soal</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openEditDialog(testId, question.id)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Soal
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplikasi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <ArrowUpDown className="mr-2 h-4 w-4" />
                                  Ubah Urutan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setDeleteQuestionId(question.id);
                                    setDeleteQuestionText(question.question);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus Soal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {meta && meta.total_pages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 mt-6">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {(meta.current_page - 1) * meta.per_page + 1}{" "}
                    hingga{" "}
                    {Math.min(meta.current_page * meta.per_page, meta.total)}{" "}
                    dari {meta.total} soal
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
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
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!meta.has_next_page}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Statistics Sidebar (20%) */}
        <div className="lg:col-span-1">
          <div className="space-y-4 sticky top-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Statistik
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Soal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-muted-foreground">
                        Total Soal
                      </span>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.total_questions || 0}
                  </div>
                </div>

                <div className="border-t border-border my-3"></div>

                {/* Wajib */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-muted-foreground">
                        Wajib
                      </span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.required_questions || 0}
                  </div>
                </div>

                <div className="border-t border-border my-3"></div>

                {/* Opsional */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                      <span className="text-sm text-muted-foreground">
                        Opsional
                      </span>
                    </div>
                    <XCircle className="h-4 w-4 text-pink-600" />
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {stats?.optional_questions || 0}
                  </div>
                </div>

                <div className="border-t border-border my-3"></div>

                {/* Rata-rata Waktu */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-muted-foreground">
                        Avg. Waktu
                      </span>
                    </div>
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(stats?.avg_time_limit || 0)}s
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Question Dialog */}
      <AlertDialog
        open={deleteQuestionId !== null}
        onOpenChange={() => {
          setDeleteQuestionId(null);
          setDeleteQuestionText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak
                dapat dibatalkan.
              </p>
              {deleteQuestionText && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Soal yang akan dihapus:</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {deleteQuestionText}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              disabled={deleteQuestionMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteQuestionMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus Soal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Question Dialog */}
      <AddQuestionDialog />
    </div>
  );
}
