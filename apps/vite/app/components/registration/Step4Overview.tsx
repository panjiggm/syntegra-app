// apps/vite/app/routes/registration/components/Step4Overview.tsx
import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  CheckCircle,
  ChevronLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  GraduationCap,
  Users,
  Home,
  Loader2,
  Edit,
  Calendar,
} from "lucide-react";

// UI Components
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

// Store and hooks
import { useRegistrationStore } from "~/stores/registration";
import { useUsers } from "~/hooks/use-users";
import { toast } from "sonner";

interface Step4OverviewProps {
  onPrev: () => void;
  onEdit: (step: number) => void;
}

// Helper function to format data labels
const getEducationLabel = (education: string) => {
  const labels = {
    sd: "SD/Sederajat",
    smp: "SMP/Sederajat",
    sma: "SMA/SMK/Sederajat",
    diploma: "Diploma (D1/D2/D3)",
    s1: "Sarjana (S1)",
    s2: "Magister (S2)",
    s3: "Doktor (S3)",
    other: "Lainnya",
  };
  return labels[education as keyof typeof labels] || education;
};

const getReligionLabel = (religion: string) => {
  const labels = {
    islam: "Islam",
    kristen: "Kristen Protestan",
    katolik: "Kristen Katolik",
    hindu: "Hindu",
    buddha: "Buddha",
    konghucu: "Konghucu",
    other: "Lainnya",
  };
  return labels[religion as keyof typeof labels] || religion;
};

const getGenderLabel = (gender: string) => {
  const labels = {
    male: "Laki-laki",
    female: "Perempuan",
    other: "Lainnya",
  };
  return labels[gender as keyof typeof labels] || gender;
};

export function Step4Overview({ onPrev, onEdit }: Step4OverviewProps) {
  const { data, resetData } = useRegistrationStore();
  const { useCreateParticipant } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUserMutation = useCreateParticipant();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Prepare data for API
      const userData = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        nik: data.nik,
        gender: data.gender === "" ? undefined : data.gender,
        birth_place: data.birth_place,
        birth_date: data.birth_date
          ? new Date(data.birth_date).toISOString()
          : undefined,
        education: data.education,
        religion: data.religion,
        address: data.address,
        province: data.province,
        regency: data.regency,
        district: data.district,
        village: data.village,
        postal_code: data.postal_code,
        role: "participant" as const,
        is_active: true,
      };

      await createUserMutation.mutateAsync(userData);

      toast.success("Pendaftaran berhasil!");

      // Clear registration data
      resetData();

      // Redirect to participant login
      window.location.href = "/participant/login";
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Pendaftaran gagal. Coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Review Data
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Periksa kembali data yang telah Anda masukkan sebelum melakukan
          pendaftaran
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Wajib */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Data Wajib
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Nama Lengkap</p>
                  <p className="font-medium">{data.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Nomor Telepon</p>
                  <p className="font-medium">{data.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{data.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">NIK</p>
                  <p className="font-medium">{data.nik}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Jenis Kelamin</p>
                  <p className="font-medium">{getGenderLabel(data.gender)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Tempat Lahir</p>
                  <p className="font-medium">{data.birth_place}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Tanggal Lahir</p>
                <p className="font-medium">
                  {data.birth_date
                    ? format(new Date(data.birth_date), "dd MMMM yyyy", {
                        locale: id,
                      })
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Tambahan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Data Tambahan
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Pendidikan Terakhir</p>
                  <p className="font-medium">
                    {getEducationLabel(data.education)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Agama</p>
                  <p className="font-medium">
                    {getReligionLabel(data.religion)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Alamat dan Wilayah */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Alamat dan Wilayah
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(3)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Home className="h-4 w-4 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Alamat Lengkap</p>
                <p className="font-medium">{data.address}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Provinsi</p>
                <p className="font-medium">{data.province}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Kabupaten/Kota</p>
                <p className="font-medium">{data.regency}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Kecamatan</p>
                <p className="font-medium">{data.district}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Kelurahan/Desa</p>
                <p className="font-medium">{data.village}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Kode Pos</p>
              <Badge variant="outline">{data.postal_code}</Badge>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Konfirmasi Pendaftaran
          </h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Pastikan semua data yang Anda masukkan sudah benar</p>
            <p>
              • Data yang sudah didaftarkan tidak dapat diubah melalui sistem
            </p>
            <p>
              • Anda akan mendapat akses untuk login setelah pendaftaran
              berhasil
            </p>
            <p>• Hubungi administrator jika ada masalah dengan pendaftaran</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-32 flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Mendaftarkan..." : "Daftar Sekarang"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
