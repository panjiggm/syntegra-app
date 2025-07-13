import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
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
  AlertTriangle,
} from "lucide-react";
import { useQuestions } from "~/hooks/use-questions";
import { useQuestionDialogStore } from "~/stores/use-question-dialog-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface TestData {
  id: string;
  name: string;
  description?: string;
  module_type: string;
  category: string;
  question_type?:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix"
    | undefined
    | null;
  time_limit?: number;
  total_questions?: number;
  status: "active" | "inactive" | "archived" | "draft";
  created_at?: string;
  updated_at?: string;
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
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk delete states
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isTypingConfirmation, setIsTypingConfirmation] = useState(false);

  const {
    openCreateDialog,
    openEditDialog,
    openDeleteQuestionModal,
    openViewQuestionModal,
  } = useQuestionDialogStore();

  // API calls
  const { useGetQuestions, useUpdateQuestionSequence, useBulkDeleteQuestions } =
    useQuestions();

  // Bulk delete mutation
  const bulkDeleteMutation = useBulkDeleteQuestions(testId);

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

  // Update sequence mutation
  const updateSequenceMutation = useUpdateQuestionSequence(testId);

  // Reset pagination when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page
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

    try {
      await updateSequenceMutation.mutateAsync({
        questionId,
        sequence: questions[newIndex].sequence,
      });
    } catch (error) {
      console.error("Error moving question:", error);
    }
  };

  // Bulk delete handlers
  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds((prev) => [...prev, questionId]);
    } else {
      setSelectedQuestionIds((prev) => prev.filter((id) => id !== questionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentQuestions = questionsQuery.data?.data || [];
      setSelectedQuestionIds(currentQuestions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleOpenBulkDeleteDialog = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const handleCloseBulkDeleteDialog = () => {
    setIsBulkDeleteDialogOpen(false);
    setConfirmationText("");
    setIsTypingConfirmation(false);
  };

  const handleConfirmationChange = (value: string) => {
    setConfirmationText(value);
    setIsTypingConfirmation(true);
  };

  const requiredConfirmationText = "HAPUS SOAL";
  const isConfirmationValid =
    confirmationText.trim() === requiredConfirmationText;

  const handleBulkDelete = async () => {
    if (!isConfirmationValid || selectedQuestionIds.length === 0) return;

    try {
      await bulkDeleteMutation.mutateAsync({
        questionIds: selectedQuestionIds,
      });

      // Reset selection and close dialog
      setSelectedQuestionIds([]);
      handleCloseBulkDeleteDialog();
    } catch (error) {
      console.error("Error bulk deleting questions:", error);
    }
  };

  // Get questions data
  const questions = questionsQuery.data?.data || [];
  const totalPages = questionsQuery.data?.meta?.total_pages || 1;
  const totalQuestions = questionsQuery.data?.meta?.total || 0;

  // Check if all current questions are selected
  const currentQuestions = questionsQuery.data?.data || [];
  const allCurrentQuestionsSelected =
    currentQuestions.length > 0 &&
    currentQuestions.every((q) => selectedQuestionIds.includes(q.id));

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Bank Soal</h2>
          <p className="text-muted-foreground">
            Kelola soal-soal untuk tes "{test.name}"
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk Delete Button - Only show when questions are selected */}
          {selectedQuestionIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleOpenBulkDeleteDialog}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus {selectedQuestionIds.length} Soal
                </>
              )}
            </Button>
          )}

          <Button onClick={() => openCreateDialog(testId, test)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Soal
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari soal..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipe Soal</Label>
                <Select
                  value={questionTypeFilter}
                  onValueChange={(value) => {
                    setQuestionTypeFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="multiple_choice">
                      Pilihan Ganda
                    </SelectItem>
                    <SelectItem value="true_false">Benar/Salah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Wajib</Label>
                <Select
                  value={isRequiredFilter}
                  onValueChange={(value) => {
                    setIsRequiredFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="true">Wajib</SelectItem>
                    <SelectItem value="false">Opsional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Items per Halaman</Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => handleLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daftar Soal ({totalQuestions})
            </CardTitle>

            {/* Select All Checkbox */}
            {currentQuestions.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allCurrentQuestionsSelected}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Pilih Semua ({currentQuestions.length})
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {questionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Memuat soal...</span>
            </div>
          ) : questionsQuery.error ? (
            <div className="text-center py-12">
              <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
              <p className="text-muted-foreground mb-4">
                {questionsQuery.error instanceof Error
                  ? questionsQuery.error.message
                  : "Terjadi kesalahan saat memuat data soal"}
              </p>
              <Button
                onClick={() => questionsQuery.refetch()}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Soal</h3>
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
              <Button onClick={() => openCreateDialog(testId, test)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Soal Pertama
              </Button>
            </div>
          ) : (
            questions.map((question, index) => (
              <Card
                key={question.id}
                className="hover:shadow-md transition-shadow mb-4"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Checkbox Selection */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`question-${question.id}`}
                        checked={selectedQuestionIds.includes(question.id)}
                        onCheckedChange={(checked) =>
                          handleSelectQuestion(question.id, checked as boolean)
                        }
                        className="mt-1"
                      />

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

                              {/* Trait Badge for Rating Scale Questions */}
                              {question.question_type === "rating_scale" &&
                                question.scoring_key &&
                                typeof question.scoring_key === "object" &&
                                (question.scoring_key as any).trait && (
                                  <Badge
                                    variant="outline"
                                    className="bg-indigo-50 text-indigo-700 border-indigo-200"
                                  >
                                    <BarChart3 className="w-3 h-3 mr-1" />
                                    {(question.scoring_key as any).trait}
                                  </Badge>
                                )}

                              {question.is_required ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Wajib
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Opsional
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-sm leading-relaxed mb-2">
                              {question.question.length > 200
                                ? `${question.question.substring(0, 200)}...`
                                : question.question}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {question.time_limit && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {question.time_limit}s
                                </div>
                              )}
                              {question.image_url && (
                                <div className="flex items-center gap-1">
                                  <Image className="w-3 h-3" />
                                  Gambar
                                </div>
                              )}
                              {question.audio_url && (
                                <div className="flex items-center gap-1">
                                  <Volume2 className="w-3 h-3" />
                                  Audio
                                </div>
                              )}
                              <span>
                                Dibuat: {formatDate(question.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleMoveQuestion(question.id, "up")
                            }
                            disabled={
                              index === 0 || updateSequenceMutation.isPending
                            }
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Pindah ke atas</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openViewQuestionModal(question.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              openEditDialog(testId, question.id, test)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Soal
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              openDeleteQuestionModal(
                                question.id,
                                question.question
                              )
                            }
                            className="text-red-600"
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, totalQuestions)} dari{" "}
            {totalQuestions} soal
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                )
                .map((page, index, arr) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  </div>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={handleCloseBulkDeleteDialog}
      >
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold">
                  Hapus {selectedQuestionIds.length} Soal
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                  Tindakan ini tidak dapat dibatalkan
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-2">
                    Anda akan menghapus {selectedQuestionIds.length} soal secara
                    bersamaan:
                  </p>
                  <p className="text-red-600 mt-3 text-xs">
                    Semua data terkait soal-soal ini akan dihapus secara
                    permanen, termasuk:
                  </p>
                  <ul className="text-red-600 text-xs mt-1 ml-3 list-disc space-y-1">
                    <li>Teks pertanyaan dan konfigurasi soal</li>
                    <li>Pilihan jawaban dan kunci jawaban</li>
                    <li>Media lampiran (gambar/audio)</li>
                    <li>Hasil jawaban peserta untuk soal-soal ini</li>
                    <li>Statistik dan analytics soal</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Untuk melanjutkan, ketik{" "}
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-red-600">
                    {requiredConfirmationText}
                  </span>
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => handleConfirmationChange(e.target.value)}
                  placeholder="Ketik konfirmasi untuk melanjutkan"
                  className={`mt-2 ${
                    isTypingConfirmation
                      ? isConfirmationValid
                        ? "border-green-500 focus-visible:ring-green-500"
                        : "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                  disabled={bulkDeleteMutation.isPending}
                />
              </div>

              {isTypingConfirmation && !isConfirmationValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Teks konfirmasi tidak sesuai
                </p>
              )}

              {isConfirmationValid && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  ✓ Konfirmasi valid - soal siap dihapus
                </p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={bulkDeleteMutation.isPending}
              onClick={handleCloseBulkDeleteDialog}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={!isConfirmationValid || bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus {selectedQuestionIds.length} Soal
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
