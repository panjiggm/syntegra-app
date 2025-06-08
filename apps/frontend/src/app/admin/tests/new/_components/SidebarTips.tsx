"use client";

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lightbulb, CheckCircle, Palette } from "lucide-react";
import { type CreateTestFormData } from "@/lib/validations/test";

interface SidebarTipsProps {
  form: UseFormReturn<any>;
}

export function SidebarTips({ form }: SidebarTipsProps) {
  return (
    <div className="space-y-6">
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
            <h4 className="font-semibold mb-1">Pemilihan Icon:</h4>
            <p>
              Gunakan emoji yang relevan dengan jenis tes. Contoh: 🧠 untuk tes
              inteligensi, 💭 untuk tes kepribadian, 🎯 untuk tes bakat
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Pemilihan Warna:</h4>
            <p>
              Pilih warna yang mudah dibaca dan sesuai dengan tema tes. Warna
              akan mempengaruhi tampilan card pada dashboard peserta
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Konsistensi:</h4>
            <p>
              Gunakan skema warna yang konsisten untuk kategori tes yang sama
              agar mudah dikenali
            </p>
          </div>
        </CardContent>
      </Card>

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
            <h4 className="font-semibold mb-1">Waktu Pengerjaan:</h4>
            <p>
              Sesuaikan dengan kompleksitas tes. Umumnya 15-60 menit untuk tes
              kepribadian, 30-90 menit untuk tes inteligensi
            </p>
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

      {/* Color Guide */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            Rekomendasi Warna
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="w-4 h-4 bg-cyan-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Inteligensi</span>
            </div>
            <div>
              <div className="w-4 h-4 bg-pink-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Kepribadian</span>
            </div>
            <div>
              <div className="w-4 h-4 bg-emerald-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Bakat</span>
            </div>
            <div>
              <div className="w-4 h-4 bg-amber-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Minat</span>
            </div>
            <div>
              <div className="w-4 h-4 bg-purple-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Proyektif</span>
            </div>
            <div>
              <div className="w-4 h-4 bg-indigo-500 rounded inline-block mr-2"></div>
              <span className="text-xs">Kognitif</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            Langkah Selanjutnya
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 text-sm">
          <p>
            Setelah tes dibuat, Anda perlu menambahkan pertanyaan dan jawaban.
            Tes baru akan otomatis tersedia dengan status "Aktif" dan siap
            digunakan setelah pertanyaan ditambahkan.
          </p>
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
