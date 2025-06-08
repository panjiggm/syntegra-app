"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Heart,
  Loader2,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

// Form schema (before transformation)
const createUserFormSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(1, "Nama tidak boleh kosong")
    .max(255, "Nama terlalu panjang")
    .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh berisi huruf dan spasi"),
  email: z
    .string()
    .min(1, "Email tidak boleh kosong")
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),

  // Conditional fields
  nik: z.string().optional(),

  // Profile fields
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().max(20, "Nomor telepon terlalu panjang").optional(),
  birth_place: z.string().max(100, "Tempat lahir terlalu panjang").optional(),
  birth_date: z.string().optional(),
  religion: z
    .enum([
      "islam",
      "kristen",
      "katolik",
      "hindu",
      "buddha",
      "konghucu",
      "other",
    ])
    .optional(),
  education: z
    .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
    .optional(),
  address: z.string().optional(),
  province: z.string().max(100, "Nama provinsi terlalu panjang").optional(),
  regency: z.string().max(100, "Nama kabupaten terlalu panjang").optional(),
  district: z.string().max(100, "Nama kecamatan terlalu panjang").optional(),
  village: z.string().max(100, "Nama desa terlalu panjang").optional(),
  postal_code: z.string().max(10, "Kode pos terlalu panjang").optional(),
});

type CreateUserFormData = z.infer<typeof createUserFormSchema>;

export default function CreateUserPage() {
  const router = useRouter();

  const { useCreateUser } = useUsers();
  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    watch,
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      nik: "",
      gender: "other",
      phone: "",
      birth_place: "",
      birth_date: "",
      religion: undefined,
      education: undefined,
      address: "",
      province: "",
      regency: "",
      district: "",
      village: "",
      postal_code: "",
    },
  });

  // Watch form values
  const watchedValues = watch();

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      clearErrors();

      // Show loading toast
      const loadingToast = toast.loading("Membuat akun user...", {
        description: "Mohon tunggu, kami sedang memproses data",
      });

      // Prepare data for API
      const createData: any = {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        role: "participant",
      };

      // Add conditional fields
      if (data.nik) createData.nik = data.nik.trim();
      if (data.gender) createData.gender = data.gender;
      if (data.phone) createData.phone = data.phone.trim();
      if (data.birth_place) createData.birth_place = data.birth_place.trim();
      if (data.birth_date && data.birth_date.trim() !== "") {
        // Convert date string to ISO datetime string for backend validation
        const dateStr = data.birth_date.trim();
        createData.birth_date = `${dateStr}T00:00:00.000Z`;
      }
      if (data.religion) createData.religion = data.religion;
      if (data.education) createData.education = data.education;
      if (data.address) createData.address = data.address.trim();
      if (data.province) createData.province = data.province.trim();
      if (data.regency) createData.regency = data.regency.trim();
      if (data.district) createData.district = data.district.trim();
      if (data.village) createData.village = data.village.trim();
      if (data.postal_code) createData.postal_code = data.postal_code.trim();

      // Call API
      const response = await createUserMutation.mutateAsync(createData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.success) {
        // Show success toast
        toast.success("Akun user berhasil dibuat!", {
          description: `Peserta ${data.name} telah berhasil didaftarkan`,
          duration: 6000,
          action: {
            label: "Lihat Daftar User",
            onClick: () => router.push("/admin/participants"),
          },
        });

        // Reset form
        reset();

        // Auto redirect after 2 seconds
        setTimeout(() => {
          router.push("/admin/participants");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Create user error:", error);

      // Dismiss loading toast
      toast.dismiss();

      let errorMessage = "Terjadi kesalahan saat membuat akun";
      let fieldErrors: { [key: string]: string } = {};

      // Handle API error response
      if (error.data && error.data.errors) {
        error.data.errors.forEach((err: any) => {
          if (err.field) {
            fieldErrors[err.field] = err.message;
          }
        });

        // Set form field errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateUserFormData, {
            type: "manual",
            message: message,
          });
        });

        errorMessage = error.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific errors
      if (
        errorMessage.toLowerCase().includes("email") &&
        errorMessage.toLowerCase().includes("exist")
      ) {
        setError("email", {
          type: "manual",
          message: "Email sudah terdaftar dalam sistem",
        });
        toast.error("Email sudah terdaftar", {
          description:
            "Email yang Anda masukkan sudah digunakan oleh akun lain",
          duration: 6000,
        });
      } else if (
        errorMessage.toLowerCase().includes("nik") &&
        errorMessage.toLowerCase().includes("exist")
      ) {
        setError("nik", {
          type: "manual",
          message: "NIK sudah terdaftar dalam sistem",
        });
        toast.error("NIK sudah terdaftar", {
          description: "NIK yang Anda masukkan sudah digunakan oleh akun lain",
          duration: 6000,
        });
      } else if (
        errorMessage.toLowerCase().includes("admin") &&
        errorMessage.toLowerCase().includes("limit")
      ) {
        toast.error("Batas Admin Tercapai", {
          description:
            "Sudah ada 3 admin dalam sistem. Tidak bisa menambah admin baru.",
          duration: 8000,
        });
      } else {
        toast.error("Gagal membuat akun", {
          description: errorMessage,
          duration: 8000,
        });
      }
    }
  };

  const isLoading = createUserMutation.isPending || isSubmitting;

  return (
    <div className="space-y-6">
      <Button
        variant="link"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 hover:underline hover:cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Button>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tambah User Baru
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Buat akun baru untuk admin atau peserta psikotes
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information & Profile Information Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Dasar
              </CardTitle>
              <CardDescription>
                Data utama pengguna yang wajib diisi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Contoh: Ahmad Rizki Pratama"
                  disabled={isLoading}
                  {...register("name")}
                  className={cn(
                    errors.name && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    disabled={isLoading}
                    {...register("email")}
                    className={cn(
                      errors.email &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* NIK - Required for participants */}
                <div className="space-y-2">
                  <Label htmlFor="nik">
                    NIK <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nik"
                    type="text"
                    placeholder="16 digit NIK"
                    disabled={isLoading}
                    {...register("nik")}
                    className={cn(
                      errors.nik && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.nik && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.nik.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender">Jenis Kelamin</Label>
                  <Select
                    value={watchedValues.gender}
                    onValueChange={(value) =>
                      register("gender").onChange({ target: { value } })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08123456789"
                    disabled={isLoading}
                    {...register("phone")}
                    className={cn(
                      errors.phone &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Birth Place */}
                <div className="space-y-2">
                  <Label htmlFor="birth_place">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Tempat Lahir
                  </Label>
                  <Input
                    id="birth_place"
                    type="text"
                    placeholder="Jakarta"
                    disabled={isLoading}
                    {...register("birth_place")}
                    className={cn(
                      errors.birth_place &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.birth_place && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.birth_place.message}
                    </p>
                  )}
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label htmlFor="birth_date">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Tanggal Lahir
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    disabled={isLoading}
                    {...register("birth_date")}
                    className={cn(
                      errors.birth_date &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.birth_date && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.birth_date.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Religion */}
                <div className="space-y-2">
                  <Label htmlFor="religion">
                    <Heart className="h-4 w-4 inline mr-1" />
                    Agama
                  </Label>
                  <Select
                    value={watchedValues.religion}
                    onValueChange={(value) =>
                      register("religion").onChange({ target: { value } })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="islam">Islam</SelectItem>
                      <SelectItem value="kristen">Kristen</SelectItem>
                      <SelectItem value="katolik">Katolik</SelectItem>
                      <SelectItem value="hindu">Hindu</SelectItem>
                      <SelectItem value="buddha">Buddha</SelectItem>
                      <SelectItem value="konghucu">Konghucu</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <Label htmlFor="education">
                    <GraduationCap className="h-4 w-4 inline mr-1" />
                    Pendidikan
                  </Label>
                  <Select
                    value={watchedValues.education}
                    onValueChange={(value) =>
                      register("education").onChange({ target: { value } })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih pendidikan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sd">SD</SelectItem>
                      <SelectItem value="smp">SMP</SelectItem>
                      <SelectItem value="sma">SMA</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="s1">S1</SelectItem>
                      <SelectItem value="s2">S2</SelectItem>
                      <SelectItem value="s3">S3</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informasi Alamat
              </CardTitle>
              <CardDescription>
                Alamat lengkap pengguna (opsional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Textarea
                  id="address"
                  placeholder="Jl. Contoh No. 123, RT 01/RW 02"
                  disabled={isLoading}
                  {...register("address")}
                  className={cn(
                    errors.address &&
                      "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Province */}
                <div className="space-y-2">
                  <Label htmlFor="province">Provinsi</Label>
                  <Input
                    id="province"
                    type="text"
                    placeholder="DKI Jakarta"
                    disabled={isLoading}
                    {...register("province")}
                    className={cn(
                      errors.province &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.province && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.province.message}
                    </p>
                  )}
                </div>

                {/* Regency */}
                <div className="space-y-2">
                  <Label htmlFor="regency">Kabupaten/Kota</Label>
                  <Input
                    id="regency"
                    type="text"
                    placeholder="Jakarta Selatan"
                    disabled={isLoading}
                    {...register("regency")}
                    className={cn(
                      errors.regency &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.regency && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.regency.message}
                    </p>
                  )}
                </div>

                {/* District */}
                <div className="space-y-2">
                  <Label htmlFor="district">Kecamatan</Label>
                  <Input
                    id="district"
                    type="text"
                    placeholder="Tebet"
                    disabled={isLoading}
                    {...register("district")}
                    className={cn(
                      errors.district &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.district && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.district.message}
                    </p>
                  )}
                </div>

                {/* Village */}
                <div className="space-y-2">
                  <Label htmlFor="village">Kelurahan/Desa</Label>
                  <Input
                    id="village"
                    type="text"
                    placeholder="Tebet Timur"
                    disabled={isLoading}
                    {...register("village")}
                    className={cn(
                      errors.village &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.village && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.village.message}
                    </p>
                  )}
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Kode Pos</Label>
                  <Input
                    id="postal_code"
                    type="text"
                    placeholder="12345"
                    disabled={isLoading}
                    {...register("postal_code")}
                    className={cn(
                      errors.postal_code &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.postal_code && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.postal_code.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Aksi</Label>
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/participants")}
                    disabled={isLoading}
                    className="gap-2 flex-1"
                  >
                    <X className="h-4 w-4" />
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || Object.keys(errors).length > 0}
                    className="gap-2 flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Membuat Akun...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Buat Akun Peserta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
