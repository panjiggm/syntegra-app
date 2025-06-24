import { useState, useEffect } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useQuestionDialogStore } from "~/stores/use-question-dialog-store";
import { useQuestions } from "~/hooks/use-questions";
import { toast } from "sonner";
import { useParams } from "react-router";

export function DialogDeleteQuestion() {
  const {
    isDeleteQuestionModalOpen,
    deleteQuestionId,
    deleteQuestionText,
    closeDeleteQuestionModal,
  } = useQuestionDialogStore();

  const { testId } = useParams();
  const { useDeleteQuestion } = useQuestions();
  const deleteQuestionMutation = useDeleteQuestion(testId || "");

  const [confirmationText, setConfirmationText] = useState("");
  const [isTypingConfirmation, setIsTypingConfirmation] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isDeleteQuestionModalOpen) {
      setConfirmationText("");
      setIsTypingConfirmation(false);
    }
  }, [isDeleteQuestionModalOpen]);

  const requiredConfirmationText = "HAPUS SOAL";
  const isConfirmationValid =
    confirmationText.trim() === requiredConfirmationText;

  const handleDelete = async () => {
    if (!deleteQuestionId || !isConfirmationValid) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading("Menghapus soal...");

      await deleteQuestionMutation.mutateAsync(deleteQuestionId);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      toast.success("Soal berhasil dihapus!");

      // Close modal
      closeDeleteQuestionModal();
    } catch (error: any) {
      console.error("Delete question error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      // Determine error message
      let errorMessage = "Terjadi kesalahan saat menghapus soal";

      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("not found")) {
          errorMessage = "Soal tidak ditemukan atau sudah dihapus";
        } else if (
          errorMsg.includes("permission") ||
          errorMsg.includes("unauthorized")
        ) {
          errorMessage = "Anda tidak memiliki izin untuk menghapus soal ini";
        } else if (
          errorMsg.includes("constraint") ||
          errorMsg.includes("referenced")
        ) {
          errorMessage =
            "Soal tidak dapat dihapus karena masih digunakan dalam sesi aktif";
        } else if (errorMsg.includes("answers")) {
          errorMessage =
            "Soal tidak dapat dihapus karena sudah memiliki jawaban dari peserta";
        } else {
          errorMessage = error.message;
        }
      }

      // Show error toast
      toast.error("Gagal menghapus soal: " + errorMessage);
    }
  };

  const handleConfirmationChange = (value: string) => {
    setConfirmationText(value);
    setIsTypingConfirmation(true);
  };

  // Truncate question text for display
  const displayQuestionText = deleteQuestionText
    ? deleteQuestionText.length > 100
      ? `${deleteQuestionText.substring(0, 100)}...`
      : deleteQuestionText
    : "";

  return (
    <AlertDialog
      open={isDeleteQuestionModalOpen}
      onOpenChange={closeDeleteQuestionModal}
    >
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold">
                Hapus Soal
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
                  Anda akan menghapus soal:
                </p>
                <div className="text-red-700 font-medium text-sm bg-red-100 p-3 rounded border border-red-200">
                  {displayQuestionText}
                </div>
                <p className="text-red-600 mt-3 text-xs">
                  Semua data terkait soal ini akan dihapus secara permanen,
                  termasuk:
                </p>
                <ul className="text-red-600 text-xs mt-1 ml-3 list-disc space-y-1">
                  <li>Teks pertanyaan dan konfigurasi soal</li>
                  <li>Pilihan jawaban dan kunci jawaban</li>
                  <li>Media lampiran (gambar/audio)</li>
                  <li>Hasil jawaban peserta</li>
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
                disabled={deleteQuestionMutation.isPending}
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
            disabled={deleteQuestionMutation.isPending}
            onClick={closeDeleteQuestionModal}
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || deleteQuestionMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteQuestionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Soal
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
