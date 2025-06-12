import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Home, ChevronLeft, Loader2 } from "lucide-react";

// UI Components
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Hooks and Store
import { useWilayah } from "~/hooks/use-wilayah";
import { useRegistrationStore } from "~/stores/registration";
import { cn } from "~/lib/utils";

// Validation schema
const step3Schema = z.object({
  address: z
    .string()
    .min(10, "Alamat minimal 10 karakter")
    .max(500, "Alamat maksimal 500 karakter"),
  province_code: z.string().min(1, "Provinsi harus dipilih"),
  regency_code: z.string().min(1, "Kab/Kota harus dipilih"),
  district_code: z.string().min(1, "Kecamatan harus dipilih"),
  village_code: z.string().min(1, "Kelurahan/Desa harus dipilih"),
  postal_code: z
    .string()
    .length(5, "Kode pos harus 5 digit")
    .regex(/^[0-9]+$/, "Kode pos hanya boleh berisi angka"),
});

type Step3FormData = z.infer<typeof step3Schema>;

interface Step3AlamatWilayahProps {
  onNext: () => void;
  onPrev: () => void;
}

export function Step3AlamatWilayah({
  onNext,
  onPrev,
}: Step3AlamatWilayahProps) {
  const { data, updateData } = useRegistrationStore();
  const { useProvinces, useRegencies, useDistricts, useVillages } =
    useWilayah();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      address: data.address,
      province_code: data.province_code,
      regency_code: data.regency_code,
      district_code: data.district_code,
      village_code: data.village_code,
      postal_code: data.postal_code,
    },
    mode: "onChange",
  });

  const watchedProvinceCode = watch("province_code");
  const watchedRegencyCode = watch("regency_code");
  const watchedDistrictCode = watch("district_code");
  const watchedVillageCode = watch("village_code");

  // API queries
  const provincesQuery = useProvinces();
  const regenciesQuery = useRegencies(watchedProvinceCode);
  const districtsQuery = useDistricts(watchedRegencyCode);
  const villagesQuery = useVillages(watchedDistrictCode);

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (watchedProvinceCode) {
      setValue("regency_code", "", { shouldValidate: true });
      setValue("district_code", "", { shouldValidate: true });
      setValue("village_code", "", { shouldValidate: true });
    }
  }, [watchedProvinceCode, setValue]);

  useEffect(() => {
    if (watchedRegencyCode) {
      setValue("district_code", "", { shouldValidate: true });
      setValue("village_code", "", { shouldValidate: true });
    }
  }, [watchedRegencyCode, setValue]);

  useEffect(() => {
    if (watchedDistrictCode) {
      setValue("village_code", "", { shouldValidate: true });
    }
  }, [watchedDistrictCode, setValue]);

  useEffect(() => {
    if (watchedVillageCode && villagesQuery.data) {
      const selectedVillage = villagesQuery.data.find(
        (v) => v.code === watchedVillageCode
      );
      if (selectedVillage?.postal_code) {
        setValue("postal_code", selectedVillage.postal_code, {
          shouldValidate: true,
        });
      }
    }
  }, [watchedVillageCode, villagesQuery.data, setValue]);

  const onSubmit = (formData: Step3FormData) => {
    // Find names for the selected codes
    const province = provincesQuery.data?.find(
      (p) => p.code === formData.province_code
    );
    const regency = regenciesQuery.data?.find(
      (r) => r.code === formData.regency_code
    );
    const district = districtsQuery.data?.find(
      (d) => d.code === formData.district_code
    );
    const village = villagesQuery.data?.find(
      (v) => v.code === formData.village_code
    );

    const dataWithNames = {
      ...formData,
      province: province?.name || "",
      regency: regency?.name || "",
      district: district?.name || "",
      village: village?.name || "",
    };

    updateData(dataWithNames);
    onNext();
  };

  const isLoading =
    provincesQuery.isLoading ||
    regenciesQuery.isLoading ||
    districtsQuery.isLoading ||
    villagesQuery.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Alamat dan Wilayah
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lengkapi alamat lengkap tempat tinggal Anda
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alamat Lengkap */}
          <div className="space-y-3">
            <Label htmlFor="address" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Alamat Lengkap *
            </Label>
            <Textarea
              id="address"
              placeholder="Masukkan alamat lengkap (Jalan, RT/RW, No. rumah, dll)"
              rows={3}
              {...register("address")}
              className={cn(errors.address && "border-red-500")}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Provinsi */}
            <div className="space-y-3">
              <Label>Provinsi *</Label>
              <Select
                value={watch("province_code")}
                onValueChange={(value) =>
                  setValue("province_code", value, { shouldValidate: true })
                }
                disabled={provincesQuery.isLoading}
              >
                <SelectTrigger
                  className={`${errors.province_code ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue
                    placeholder={
                      provincesQuery.isLoading
                        ? "Memuat provinsi..."
                        : "Pilih provinsi"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {provincesQuery.data?.map((province) => (
                    <SelectItem key={province.code} value={province.code}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.province_code && (
                <p className="text-sm text-red-500">
                  {errors.province_code.message}
                </p>
              )}
            </div>

            {/* Kabupaten/Kota */}
            <div className="space-y-3">
              <Label>Kabupaten/Kota *</Label>
              <Select
                value={watch("regency_code")}
                onValueChange={(value) =>
                  setValue("regency_code", value, { shouldValidate: true })
                }
                disabled={!watchedProvinceCode || regenciesQuery.isLoading}
              >
                <SelectTrigger
                  className={`${errors.regency_code ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue
                    placeholder={
                      !watchedProvinceCode
                        ? "Pilih provinsi dulu"
                        : regenciesQuery.isLoading
                          ? "Memuat kab/kota..."
                          : "Pilih kabupaten/kota"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {regenciesQuery.data?.map((regency) => (
                    <SelectItem key={regency.code} value={regency.code}>
                      {regency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.regency_code && (
                <p className="text-sm text-red-500">
                  {errors.regency_code.message}
                </p>
              )}
            </div>

            {/* Kecamatan */}
            <div className="space-y-3">
              <Label>Kecamatan *</Label>
              <Select
                value={watch("district_code")}
                onValueChange={(value) =>
                  setValue("district_code", value, { shouldValidate: true })
                }
                disabled={!watchedRegencyCode || districtsQuery.isLoading}
              >
                <SelectTrigger
                  className={`${errors.district_code ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue
                    placeholder={
                      !watchedRegencyCode
                        ? "Pilih kab/kota dulu"
                        : districtsQuery.isLoading
                          ? "Memuat kecamatan..."
                          : "Pilih kecamatan"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {districtsQuery.data?.map((district) => (
                    <SelectItem key={district.code} value={district.code}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district_code && (
                <p className="text-sm text-red-500">
                  {errors.district_code.message}
                </p>
              )}
            </div>

            {/* Kelurahan/Desa */}
            <div className="space-y-3">
              <Label>Kelurahan/Desa *</Label>
              <Select
                value={watch("village_code")}
                onValueChange={(value) =>
                  setValue("village_code", value, { shouldValidate: true })
                }
                disabled={!watchedDistrictCode || villagesQuery.isLoading}
              >
                <SelectTrigger
                  className={`${errors.village_code ? "border-red-500" : ""} w-full`}
                >
                  <SelectValue
                    placeholder={
                      !watchedDistrictCode
                        ? "Pilih kecamatan dulu"
                        : villagesQuery.isLoading
                          ? "Memuat kelurahan..."
                          : "Pilih kelurahan/desa"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {villagesQuery.data?.map((village) => (
                    <SelectItem key={village.code} value={village.code}>
                      {village.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.village_code && (
                <p className="text-sm text-red-500">
                  {errors.village_code.message}
                </p>
              )}
            </div>
          </div>

          {/* Kode Pos */}
          <div className="space-y-3">
            <Label htmlFor="postal_code">Kode Pos *</Label>
            <Input
              id="postal_code"
              placeholder="12345"
              maxLength={5}
              {...register("postal_code")}
              className={cn(errors.postal_code && "border-red-500", "max-w-32")}
            />
            {errors.postal_code && (
              <p className="text-sm text-red-500">
                {errors.postal_code.message}
              </p>
            )}
          </div>

          {/* Information Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Tips Pengisian</h4>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>
                • Pastikan alamat yang diisi sesuai dengan KTP atau domisili
                saat ini
              </p>
              <p>
                • Pilih wilayah secara berurutan: Provinsi → Kab/Kota →
                Kecamatan → Kelurahan
              </p>
              <p>
                • Jika ada masalah dengan data wilayah, hubungi administrator
              </p>
            </div>
          </div>

          {/* Error loading */}
          {(provincesQuery.error ||
            regenciesQuery.error ||
            districtsQuery.error ||
            villagesQuery.error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">
                Gagal Memuat Data Wilayah
              </h4>
              <p className="text-sm text-red-800">
                Terjadi masalah saat memuat data wilayah. Silakan refresh
                halaman atau coba lagi nanti.
              </p>
            </div>
          )}

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
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="min-w-32 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Lanjutkan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
