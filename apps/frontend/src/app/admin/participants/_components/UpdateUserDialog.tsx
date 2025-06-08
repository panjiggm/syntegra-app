"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, ArrowRight, User, Settings } from "lucide-react";
import { useModalStore } from "@/stores/useModalStore";

export function UpdateUserDialog() {
  const router = useRouter();
  const { isEditUserModalOpen, closeEditUserModal, editUserId } =
    useModalStore();

  const handleNavigateToEditPage = () => {
    if (editUserId) {
      closeEditUserModal();
      router.push(`/admin/participants/${editUserId}/edit`);
    }
  };

  const handleCancel = () => {
    closeEditUserModal();
  };

  return (
    <Dialog open={isEditUserModalOpen} onOpenChange={closeEditUserModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>Update informasi akun pengguna</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Options */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <User className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium">Edit Profil</h4>
                  <p className="text-sm text-muted-foreground">
                    Update informasi dasar pengguna
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Pengaturan Akun</h4>
                  <p className="text-sm text-muted-foreground">
                    Update role, status, dan pengaturan
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">⚠️ Perhatian:</p>
              <ul className="text-xs space-y-1 text-orange-700">
                <li>• Pastikan data yang diubah sudah benar</li>
                <li>• Perubahan role akan mempengaruhi akses sistem</li>
                <li>• Email dan NIK harus unik dalam sistem</li>
                <li>• Backup data penting sebelum mengubah</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Batal
            </Button>
            <Button
              onClick={handleNavigateToEditPage}
              className="flex-1 gap-2"
              disabled={!editUserId}
            >
              Lanjut ke Form
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
