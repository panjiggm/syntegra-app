"use client";

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lightbulb, CheckCircle, Palette } from "lucide-react";

interface TestData {
  id: string;
  name: string;
  description: string | null;
  module_type: string;
  category: string;
  time_limit: number;
  icon: string | null;
  card_color: string | null;
  passing_score: number | null;
  display_order: number;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
  total_questions: number;
}

interface SidebarTipsProps {
  form: UseFormReturn<any>;
  test: TestData;
  initialDataLoaded: boolean;
}

export function SidebarTips({
  form,
  test,
  initialDataLoaded,
}: SidebarTipsProps) {
  return (
    <div className="space-y-6">
      {/* Test Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="h-5 w-5" />
            Informasi Tes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Dibuat:</span>
              <br />
              <span className="text-xs">
                {new Date(test.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span className="font-medium">Diperbarui:</span>
              <br />
              <span className="text-xs">
                {new Date(test.updated_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium">Total Pertanyaan:</span>{" "}
            {test.total_questions || 0}
          </div>
          <div>
            <span className="font-medium">Status Saat Ini:</span>{" "}
            <Badge variant="outline" className="ml-1">
              {test.status === "active"
                ? "Aktif"
                : test.status === "inactive"
                  ? "Tidak Aktif"
                  : "Diarsipkan"}
            </Badge>
          </div>
          <div>
            <span className="font-medium">Icon Saat Ini:</span>{" "}
            <span className="text-lg ml-1">{test.icon || "Tidak ada"}</span>
          </div>
          <div>
            <span className="font-medium">Warna Saat Ini:</span>{" "}
            {test.card_color ? (
              <Badge className={test.card_color} variant="secondary">
                {test.card_color}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Tidak ada</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Design Tips */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Palette className="h-5 w-5" />
            Tips Desain Visual
          </CardTitle>
        </CardHeader>
        <CardContent className="text-purple-800 text-sm space-y-3">
          <div>
            <h4 className="font-semibold mb-1">Perubahan Icon:</h4>
            <p>
              Icon yang Anda pilih akan langsung terlihat di preview. Emoji
              dapat membantu peserta mengenali jenis tes dengan mudah.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Perubahan Warna:</h4>
            <p>
              Warna akan mempengaruhi tampilan card di dashboard peserta. Pilih
              warna yang kontras dan mudah dibaca.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Live Preview:</h4>
            <p>
              Gunakan fitur preview untuk melihat perubahan sebelum menyimpan.
              Anda juga bisa membandingkan dengan versi sebelumnya.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Lightbulb className="h-5 w-5" />
            Tips Edit Tes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-800 text-sm space-y-3">
          <div>
            <h4 className="font-semibold mb-1">Perubahan Tipe Modul:</h4>
            <p>
              Jika mengubah tipe modul, kategori akan direset otomatis untuk
              memastikan kompatibilitas
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Status Tes:</h4>
            <p>
              Tes yang sedang digunakan dalam sesi aktif sebaiknya tidak diubah
              statusnya ke "Tidak Aktif"
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Optimisasi Performa:</h4>
            <p>
              Sistem hanya akan menyimpan field yang berubah untuk
              mengoptimalkan performa
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Form Status */}
      {form.formState.isDirty && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Form memiliki perubahan yang belum disimpan.
            {form.formState.isValid
              ? " Form sudah valid dan siap disimpan."
              : " Lengkapi semua field yang wajib diisi."}
          </AlertDescription>
        </Alert>
      )}

      {!form.formState.isDirty && initialDataLoaded && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Tidak ada perubahan pada form. Lakukan perubahan pada field yang
            ingin diperbarui.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
