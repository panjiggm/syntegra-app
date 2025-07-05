import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Users, ChevronLeft } from "lucide-react";

// UI Components
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Store
import { useRegistrationStore } from "~/stores/registration";

// Validation schema
const step2Schema = z.object({
  education: z.enum(
    ["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"],
    {
      required_error: "Pendidikan harus dipilih",
    }
  ),
  religion: z.enum(
    ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu", "other"],
    {
      required_error: "Agama harus dipilih",
    }
  ),
});

type Step2FormData = z.infer<typeof step2Schema>;

interface Step2DataTambahanProps {
  onNext: () => void;
  onPrev: () => void;
}

// Education options
const educationOptions = [
  { value: "sd", label: "SD/Sederajat" },
  { value: "smp", label: "SMP/Sederajat" },
  { value: "sma", label: "SMA/SMK/Sederajat" },
  { value: "diploma", label: "Diploma (D1/D2/D3)" },
  { value: "s1", label: "Sarjana (S1)" },
  { value: "s2", label: "Magister (S2)" },
  { value: "s3", label: "Doktor (S3)" },
  { value: "other", label: "Lainnya" },
];

// Religion options
const religionOptions = [
  { value: "islam", label: "Islam" },
  { value: "kristen", label: "Kristen Protestan" },
  { value: "katolik", label: "Kristen Katolik" },
  { value: "hindu", label: "Hindu" },
  { value: "buddha", label: "Buddha" },
  { value: "konghucu", label: "Konghucu" },
  { value: "other", label: "Lainnya" },
];

export function Step2DataTambahan({ onNext, onPrev }: Step2DataTambahanProps) {
  const { data, updateData } = useRegistrationStore();

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      education: data.education as any,
      religion: data.religion as any,
    },
    mode: "onChange",
  });

  const watchedEducation = watch("education");
  const watchedReligion = watch("religion");

  const onSubmit = (formData: Step2FormData) => {
    updateData(formData);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          Data Tambahan
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lengkapi informasi pendidikan dan agama
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pendidikan */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Pendidikan Terakhir *
              </Label>
              <Select
                value={watchedEducation}
                onValueChange={(value) =>
                  setValue("education", value as any, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  className={`${errors.education ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue placeholder="Pilih pendidikan terakhir" />
                </SelectTrigger>
                <SelectContent>
                  {educationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.education && (
                <p className="text-xs text-red-500">
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Agama */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Agama *
              </Label>
              <Select
                value={watchedReligion}
                onValueChange={(value) =>
                  setValue("religion", value as any, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  className={`${errors.religion ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue placeholder="Pilih agama" />
                </SelectTrigger>
                <SelectContent>
                  {religionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.religion && (
                <p className="text-xs text-red-500">
                  {errors.religion.message}
                </p>
              )}
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Informasi Data</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Data pendidikan akan digunakan untuk analisis psikologis</p>
              <p>
                • Informasi agama bersifat opsional dan tidak mempengaruhi hasil
                tes
              </p>
              <p>
                • Semua data akan dijaga kerahasiaannya sesuai kebijakan privasi
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <Button type="submit" disabled={!isValid} className="min-w-32">
              Lanjutkan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
