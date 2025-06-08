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
import { Plus, ArrowRight, Users, UserCheck } from "lucide-react";
import { useModalStore } from "@/stores/useModalStore";

export function CreateUserDialog() {
  const router = useRouter();
  const { isCreateUserModalOpen, closeCreateUserModal } = useModalStore();

  const handleNavigateToCreatePage = () => {
    closeCreateUserModal();
    router.push("/admin/participants/new");
  };

  const handleCancel = () => {
    closeCreateUserModal();
  };

  return (
    <Dialog open={isCreateUserModalOpen} onOpenChange={closeCreateUserModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah User Baru
          </DialogTitle>
          <DialogDescription>
            Buat akun baru untuk administrator atau peserta psikotes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Options */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Peserta</h4>
                  <p className="text-sm text-muted-foreground">
                    Buat akun untuk peserta psikotes
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Administrator</h4>
                  <p className="text-sm text-muted-foreground">
                    Buat akun untuk admin sistem
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">📝 Info Pembuatan Akun:</p>
              <ul className="text-xs space-y-1 text-blue-700">
                <li>
                  • Peserta: Login menggunakan nomor telepon (tanpa password)
                </li>
                <li>• Admin: Login menggunakan email/NIK + password</li>
                <li>• NIK auto-generate untuk admin jika tidak diisi</li>
                <li>• Maksimal 3 admin dalam sistem</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Batal
            </Button>
            <Button
              onClick={handleNavigateToCreatePage}
              className="flex-1 gap-2"
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
