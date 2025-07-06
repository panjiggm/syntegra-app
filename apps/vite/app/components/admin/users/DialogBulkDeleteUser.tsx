import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { AlertTriangle, Trash, User } from "lucide-react";
import { useUsersStore } from "~/stores/use-users-store";
import { useUsers } from "~/hooks/use-users";

export function DialogBulkDeleteUser() {
  const {
    isBulkDeleteModalOpen,
    bulkDeleteUserIds,
    bulkDeleteUserNames,
    isBulkDeleting,
    closeBulkDeleteModal,
    setBulkDeleting,
  } = useUsersStore();

  const { useBulkDeleteUsers } = useUsers();
  const bulkDeleteMutation = useBulkDeleteUsers();

  const handleConfirmDelete = async () => {
    if (bulkDeleteUserIds.length === 0) return;

    try {
      setBulkDeleting(true);
      await bulkDeleteMutation.mutateAsync(bulkDeleteUserIds);
      closeBulkDeleteModal();
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCancel = () => {
    if (!isBulkDeleting) {
      closeBulkDeleteModal();
    }
  };

  return (
    <Dialog open={isBulkDeleteModalOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-left">Konfirmasi Hapus Users</DialogTitle>
              <DialogDescription className="text-left">
                Aksi ini tidak dapat dibatalkan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" />
            <span>
              {bulkDeleteUserIds.length} user akan dihapus secara permanen
            </span>
          </div>

          {/* List of users to be deleted */}
          <div className="max-h-48 overflow-y-auto rounded-md border p-3">
            <div className="space-y-2">
              {bulkDeleteUserNames.map((userName, index) => (
                <div
                  key={bulkDeleteUserIds[index]}
                  className="flex items-center justify-between rounded-sm bg-muted/50 p-2"
                >
                  <span className="text-sm font-medium">{userName}</span>
                  <Badge variant="destructive" className="text-xs">
                    Akan dihapus
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Peringatan:</p>
                <p>
                  Semua data terkait user ini akan dihapus secara permanen, 
                  termasuk hasil tes dan riwayat aktivitas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isBulkDeleting}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isBulkDeleting}
            className="flex-1"
          >
            {isBulkDeleting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash className="size-4 mr-2" />
                Hapus {bulkDeleteUserIds.length} User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}