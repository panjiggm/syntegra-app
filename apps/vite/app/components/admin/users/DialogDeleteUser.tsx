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
import { useUsersStore } from "~/stores/use-users-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";
import { useNavigate } from "react-router";

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export function DialogDeleteUser() {
  const {
    isDeleteUserModalOpen,
    deleteUserId,
    deleteUserName,
    closeDeleteUserModal,
  } = useUsersStore();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [confirmationText, setConfirmationText] = useState("");
  const [isTypingConfirmation, setIsTypingConfirmation] = useState(false);

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.delete<DeleteUserResponse>(
        `/users/${userId}`
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to delete user");
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch user-related queries
      navigate("/admin/users");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isDeleteUserModalOpen) {
      setConfirmationText("");
      setIsTypingConfirmation(false);
    }
  }, [isDeleteUserModalOpen]);

  const requiredConfirmationText = "HAPUS PESERTA";
  const isConfirmationValid =
    confirmationText.trim() === requiredConfirmationText;

  const handleDelete = async () => {
    if (!deleteUserId || !isConfirmationValid) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading("Menghapus peserta...");

      await deleteUserMutation.mutateAsync(deleteUserId);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      toast.success("Peserta berhasil dihapus!");

      // Close modal
      closeDeleteUserModal();
    } catch (error: any) {
      console.error("Delete user error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      // Determine error message
      let errorMessage = "Terjadi kesalahan saat menghapus peserta";

      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("not found")) {
          errorMessage = "Peserta tidak ditemukan atau sudah dihapus";
        } else if (
          errorMsg.includes("permission") ||
          errorMsg.includes("unauthorized")
        ) {
          errorMessage = "Anda tidak memiliki izin untuk menghapus peserta ini";
        } else if (
          errorMsg.includes("constraint") ||
          errorMsg.includes("referenced")
        ) {
          errorMessage =
            "Peserta tidak dapat dihapus karena masih memiliki data tes aktif";
        } else {
          errorMessage = error.message;
        }
      }

      // Show error toast
      toast.error("Gagal menghapus peserta: " + errorMessage);
    }
  };

  const handleConfirmationChange = (value: string) => {
    setConfirmationText(value);
    setIsTypingConfirmation(true);
  };

  return (
    <AlertDialog
      open={isDeleteUserModalOpen}
      onOpenChange={closeDeleteUserModal}
    >
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold">
                Hapus Peserta
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
                  Anda akan menghapus peserta:
                </p>
                <p className="text-red-700 font-semibold text-base">
                  {deleteUserName}
                </p>
                <p className="text-red-600 mt-2 text-xs">
                  Semua data terkait peserta ini akan dihapus secara permanen,
                  termasuk:
                </p>
                <ul className="text-red-600 text-xs mt-1 ml-3 list-disc space-y-1">
                  <li>Data profil dan informasi pribadi</li>
                  <li>Riwayat tes dan hasil evaluasi</li>
                  <li>Session dan appointment terkait</li>
                  <li>Log aktivitas peserta</li>
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
                disabled={deleteUserMutation.isPending}
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
                ✓ Konfirmasi valid - peserta siap dihapus
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteUserMutation.isPending}
            onClick={closeDeleteUserModal}
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || deleteUserMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Peserta
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
