import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Info, Lightbulb, CheckCircle, Palette } from "lucide-react";
import { type CreateTestFormData } from "~/lib/validations/test";

interface SidebarTipsProps {
  form: UseFormReturn<any>;
}

export function SidebarTips({ form }: SidebarTipsProps) {
  return (
    <div className="space-y-6">
      {/* Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Lightbulb className="h-5 w-5" />
            Tips Membuat Tes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm space-y-3">
          <div>
            <h4 className="font-semibold mb-1">Penamaan Tes:</h4>
            <p>
              Gunakan nama yang jelas dan deskriptif, misalnya "WAIS-IV
              Intelligence Test" atau "MBTI Personality Assessment"
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Tipe Soal:</h4>
            <p>Pilih tipe soal yang sesuai dengan tes yang akan dibuat.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Skor Kelulusan:</h4>
            <p>
              Tentukan jika ada standar minimal. Kosongkan jika tes bersifat
              deskriptif tanpa nilai pass/fail
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Module Type Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Panduan Tipe Modul
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <Badge variant="outline" className="mb-2">
              Inteligensi
            </Badge>
            <p className="text-muted-foreground">
              Tes kemampuan kognitif dan kecerdasan umum
            </p>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              Kepribadian
            </Badge>
            <p className="text-muted-foreground">
              Tes untuk mengidentifikasi karakteristik kepribadian
            </p>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              Bakat
            </Badge>
            <p className="text-muted-foreground">
              Tes kemampuan spesifik dan keterampilan kerja
            </p>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              Minat
            </Badge>
            <p className="text-muted-foreground">
              Tes preferensi karir dan bidang pekerjaan
            </p>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              Proyektif
            </Badge>
            <p className="text-muted-foreground">
              Tes berbasis gambar dan interpretasi
            </p>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              Kognitif
            </Badge>
            <p className="text-muted-foreground">
              Tes kecerdasan emosional dan kognitif lainnya
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Form Status */}
      {form.formState.isDirty && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Form memiliki perubahan yang belum disimpan.
            {form.formState.isValid
              ? " Form sudah valid dan siap disimpan."
              : " Lengkapi semua field yang wajib diisi."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
