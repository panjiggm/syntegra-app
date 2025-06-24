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
import { useTestDialogStore } from "~/stores/use-test-dialog-store";
import { useTests } from "~/hooks/use-tests";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function DialogDeleteTest() {
  const {
    isDeleteTestModalOpen,
    deleteTestId,
    deleteTestName,
    closeDeleteTestModal,
  } = useTestDialogStore();
  const navigate = useNavigate();

  // Debug logging
  console.log("Dialog state:", {
    isDeleteTestModalOpen,
    deleteTestId,
    deleteTestName,
  });

  const { useDeleteTest } = useTests();
  const deleteTestMutation = useDeleteTest();

  const [confirmationText, setConfirmationText] = useState("");
  const [isTypingConfirmation, setIsTypingConfirmation] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isDeleteTestModalOpen) {
      setConfirmationText("");
      setIsTypingConfirmation(false);
    }
  }, [isDeleteTestModalOpen]);

  const requiredConfirmationText = "HAPUS TES";
  const isConfirmationValid =
    confirmationText.trim() === requiredConfirmationText;

  const handleDelete = async () => {
    if (!deleteTestId || !isConfirmationValid) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading("Menghapus tes...");

      await deleteTestMutation.mutateAsync(deleteTestId);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      toast.success("Tes berhasil dihapus!");

      // Close modal and redirect
      closeDeleteTestModal();
      navigate("/admin/tests");
    } catch (error: any) {
      console.error("Delete test error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      // Determine error message
      let errorMessage = "Terjadi kesalahan saat menghapus tes";

      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("not found")) {
          errorMessage = "Tes tidak ditemukan atau sudah dihapus";
        } else if (
          errorMsg.includes("permission") ||
          errorMsg.includes("unauthorized")
        ) {
          errorMessage = "Anda tidak memiliki izin untuk menghapus tes ini";
        } else if (
          errorMsg.includes("constraint") ||
          errorMsg.includes("referenced")
        ) {
          errorMessage =
            "Tes tidak dapat dihapus karena masih digunakan dalam sesi aktif";
        } else if (errorMsg.includes("questions")) {
          errorMessage =
            "Tes tidak dapat dihapus karena masih memiliki soal aktif";
        } else {
          errorMessage = error.message;
        }
      }

      // Show error toast
      toast.error("Gagal menghapus tes" + ": " + errorMessage);
    }
  };

  const handleConfirmationChange = (value: string) => {
    setConfirmationText(value);
    setIsTypingConfirmation(true);
  };

  return (
    <AlertDialog
      open={isDeleteTestModalOpen}
      onOpenChange={closeDeleteTestModal}
    >
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold">
                Hapus Tes
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
                  Anda akan menghapus tes psikotes:
                </p>
                <p className="text-red-700 font-semibold text-base">
                  {deleteTestName}
                </p>
                <p className="text-red-600 mt-2 text-xs">
                  Semua data terkait tes ini akan dihapus secara permanen,
                  termasuk:
                </p>
                <ul className="text-red-600 text-xs mt-1 ml-3 list-disc space-y-1">
                  <li>Konfigurasi dan metadata tes</li>
                  <li>Semua soal dan jawaban dalam tes</li>
                  <li>Hasil tes dan statistik peserta</li>
                  <li>Riwayat penggunaan dalam sesi</li>
                  <li>Template dan instruksi tes</li>
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
                disabled={deleteTestMutation.isPending}
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
                ✓ Konfirmasi valid - tes siap dihapus
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteTestMutation.isPending}
            onClick={closeDeleteTestModal}
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || deleteTestMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteTestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Tes
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
