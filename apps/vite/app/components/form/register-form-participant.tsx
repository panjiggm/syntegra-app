import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Link } from "react-router";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useUsers } from "~/hooks/useUsers";

// Participant registration validation schema
const participantRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(50, "Nama maksimal 50 karakter")
    .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh berisi huruf dan spasi"),
  email: z
    .string()
    .email("Format email tidak valid")
    .min(1, "Email wajib diisi")
    .max(100, "Email maksimal 100 karakter"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^(\+62|62|0)[0-9]+$/, "Format nomor telepon tidak valid"),
  nik: z
    .string()
    .length(16, "NIK harus 16 digit")
    .regex(/^[0-9]+$/, "NIK hanya boleh berisi angka"),
  gender: z.enum(["male", "female"], {
    required_error: "Jenis kelamin wajib dipilih",
  }),
  birth_place: z
    .string()
    .min(2, "Tempat lahir minimal 2 karakter")
    .max(50, "Tempat lahir maksimal 50 karakter"),
  birth_date: z
    .string()
    .min(1, "Tanggal lahir wajib diisi")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 17 && age <= 80;
    }, "Usia harus antara 17-80 tahun"),
  address: z
    .string()
    .min(10, "Alamat minimal 10 karakter")
    .max(200, "Alamat maksimal 200 karakter"),
  province: z.string().min(1, "Provinsi wajib dipilih"),
  regency: z.string().min(1, "Kabupaten/Kota wajib dipilih"),
  religion: z.string().min(1, "Agama wajib dipilih"),
  education: z.string().min(1, "Pendidikan terakhir wajib dipilih"),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "Anda harus menyetujui syarat dan ketentuan",
  }),
});

type ParticipantRegistrationData = z.infer<
  typeof participantRegistrationSchema
>;

interface RegisterFormParticipantProps {
  className?: string;
  onSuccess?: () => void;
}

export function RegisterFormParticipant({
  className,
  onSuccess,
}: RegisterFormParticipantProps) {
  const navigate = useNavigate();
  const { useCreateParticipant } = useUsers();
  const createParticipantMutation = useCreateParticipant();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    watch,
    reset,
    control,
  } = useForm<ParticipantRegistrationData>({
    resolver: zodResolver(participantRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      nik: "",
      gender: undefined,
      birth_place: "",
      birth_date: "",
      address: "",
      province: "",
      regency: "",
      religion: "",
      education: "",
      agreeTerms: false,
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid =
    Object.keys(errors).length === 0 && watchedValues.agreeTerms;

  const onSubmit = async (data: ParticipantRegistrationData) => {
    try {
      clearErrors();

      // Show loading toast
      const loadingToast = toast.loading("Mendaftarkan peserta...", {
        description: "Mohon tunggu, kami sedang memproses pendaftaran peserta",
      });

      // Prepare data for API call
      const registrationData = {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone.trim(),
        nik: data.nik.trim(),
        gender: data.gender,
        birth_place: data.birth_place.trim(),
        birth_date: data.birth_date,
        address: data.address.trim(),
        province: data.province,
        regency: data.regency,
        religion: data.religion,
        education: data.education,
      };

      // Real API call to create participant
      await createParticipantMutation.mutateAsync(registrationData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      toast.success("Pendaftaran peserta berhasil!", {
        description: `Akun peserta ${data.name} telah berhasil dibuat`,
        duration: 8000,
        action: {
          label: "Login Sekarang",
          onClick: () => navigate("/participant/login"),
        },
      });

      // Reset form
      reset();

      // Call success callback
      onSuccess?.();

      // Auto redirect to login after 4 seconds
      setTimeout(() => {
        navigate("/participant/login");
      }, 4000);
    } catch (error: any) {
      console.error("Participant registration error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      let errorMessage = "Terjadi kesalahan saat mendaftar peserta";

      // Handle specific common errors
      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("email") &&
          (errorMsg.includes("exist") || errorMsg.includes("already"))
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
        } else if (errorMsg.includes("nik")) {
          setError("nik", {
            type: "manual",
            message: "NIK sudah terdaftar dalam sistem",
          });
          toast.error("NIK sudah terdaftar", {
            description:
              "NIK yang Anda masukkan sudah digunakan oleh akun lain",
            duration: 6000,
          });
        } else if (errorMsg.includes("phone")) {
          setError("phone", {
            type: "manual",
            message: "Nomor telepon sudah terdaftar dalam sistem",
          });
          toast.error("Nomor telepon sudah terdaftar", {
            description:
              "Nomor telepon yang Anda masukkan sudah digunakan oleh akun lain",
            duration: 6000,
          });
        } else {
          // Generic error toast
          toast.error("Pendaftaran peserta gagal", {
            description: error.message || errorMessage,
            duration: 8000,
          });
        }
      } else {
        toast.error("Pendaftaran peserta gagal", {
          description: errorMessage,
          duration: 8000,
        });
      }
    }
  };

  const isLoading = isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Logo Section */}
          <div className="hidden bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white md:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <img
                  src="/images/syntegra-clear-logo.png"
                  alt="Syntegra Logo"
                  className="w-32 h-32 md:w-40 md:h-40 mb-6"
                />
                <h2 className="text-2xl font-bold">Daftar Peserta</h2>
                <p className="mt-2 text-blue-100">
                  Bergabunglah dengan platform tes psikologi Syntegra
                </p>
              </div>

              <div className="space-y-4">
                {/* Info Box */}
                <div className="rounded-lg bg-blue-800/50 p-4">
                  <div className="flex items-start gap-3">
                    <Users className="size-5 text-blue-200 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-100">
                        Akses Tes Psikologi
                      </h4>
                      <p className="text-sm text-blue-200 mt-1">
                        Dapatkan akses untuk mengikuti berbagai tes psikologi
                        yang tersedia di platform Syntegra
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col gap-2 text-sm">
                  <Link
                    to="/"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    ← Kembali ke Beranda
                  </Link>
                  <Link
                    to="/participant/login"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Sudah punya akun? Login di sini
                  </Link>
                  <Link
                    to="/admin/login"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Login sebagai Admin
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex flex-col justify-center p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Daftar Peserta Baru
              </h1>
              <p className="text-muted-foreground">
                Lengkapi formulir di bawah untuk membuat akun peserta
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Informasi Pribadi
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="size-4" />
                    Nama Lengkap
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    className={cn(
                      "transition-colors duration-200",
                      errors.name
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.name
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="size-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className={cn(
                      "transition-colors duration-200",
                      errors.email
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.email
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="size-4" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    className={cn(
                      "transition-colors duration-200",
                      errors.phone
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.phone
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* NIK */}
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK (Nomor Induk Kependudukan)</Label>
                  <Input
                    id="nik"
                    type="text"
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className={cn(
                      "transition-colors duration-200",
                      errors.nik
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.nik
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("nik")}
                  />
                  {errors.nik && (
                    <p className="text-sm text-red-500">{errors.nik.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Laki-laki</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Perempuan</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                  {errors.gender && (
                    <p className="text-sm text-red-500">
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                {/* Birth Place */}
                <div className="space-y-2">
                  <Label
                    htmlFor="birth_place"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="size-4" />
                    Tempat Lahir
                  </Label>
                  <Input
                    id="birth_place"
                    type="text"
                    placeholder="Kota tempat lahir"
                    className={cn(
                      "transition-colors duration-200",
                      errors.birth_place
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.birth_place
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("birth_place")}
                  />
                  {errors.birth_place && (
                    <p className="text-sm text-red-500">
                      {errors.birth_place.message}
                    </p>
                  )}
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label
                    htmlFor="birth_date"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="size-4" />
                    Tanggal Lahir
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    className={cn(
                      "transition-colors duration-200",
                      errors.birth_date
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.birth_date
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("birth_date")}
                  />
                  {errors.birth_date && (
                    <p className="text-sm text-red-500">
                      {errors.birth_date.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Informasi Alamat
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Jalan, No. Rumah, RT/RW"
                    className={cn(
                      "transition-colors duration-200",
                      errors.address
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.address
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("address")}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* Province */}
                <div className="space-y-2">
                  <Label htmlFor="province">Provinsi</Label>
                  <Input
                    id="province"
                    type="text"
                    placeholder="Nama provinsi"
                    className={cn(
                      "transition-colors duration-200",
                      errors.province
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.province
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("province")}
                  />
                  {errors.province && (
                    <p className="text-sm text-red-500">
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
                    placeholder="Nama kabupaten/kota"
                    className={cn(
                      "transition-colors duration-200",
                      errors.regency
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.regency
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("regency")}
                  />
                  {errors.regency && (
                    <p className="text-sm text-red-500">
                      {errors.regency.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Informasi Tambahan
                </div>

                {/* Religion */}
                <div className="space-y-2">
                  <Label htmlFor="religion">Agama</Label>
                  <Input
                    id="religion"
                    type="text"
                    placeholder="Agama yang dianut"
                    className={cn(
                      "transition-colors duration-200",
                      errors.religion
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.religion
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("religion")}
                  />
                  {errors.religion && (
                    <p className="text-sm text-red-500">
                      {errors.religion.message}
                    </p>
                  )}
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <Label htmlFor="education">Pendidikan Terakhir</Label>
                  <Input
                    id="education"
                    type="text"
                    placeholder="SD/SMP/SMA/D1/D2/D3/S1/S2/S3"
                    className={cn(
                      "transition-colors duration-200",
                      errors.education
                        ? "border-red-500 focus:border-red-500"
                        : watchedValues.education
                          ? "border-green-500 focus:border-green-500"
                          : ""
                    )}
                    {...register("education")}
                  />
                  {errors.education && (
                    <p className="text-sm text-red-500">
                      {errors.education.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Controller
                    name="agreeTerms"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="agreeTerms"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className={cn(
                          errors.agreeTerms ? "border-red-500" : ""
                        )}
                      />
                    )}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="agreeTerms"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Saya menyetujui{" "}
                      <Link
                        to="/terms"
                        className="text-blue-600 hover:underline"
                      >
                        Syarat dan Ketentuan
                      </Link>{" "}
                      serta{" "}
                      <Link
                        to="/privacy"
                        className="text-blue-600 hover:underline"
                      >
                        Kebijakan Privasi
                      </Link>
                    </Label>
                    {errors.agreeTerms && (
                      <p className="text-sm text-red-500">
                        {errors.agreeTerms.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  <>
                    <User className="size-4 mr-2" />
                    Daftar Sebagai Peserta
                  </>
                )}
              </Button>
            </form>

            {/* Mobile Navigation Links */}
            <div className="md:hidden flex flex-col gap-2 text-sm text-center">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Kembali ke Beranda
              </Link>
              <Link
                to="/participant/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sudah punya akun? Login di sini
              </Link>
              <Link
                to="/admin/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Login sebagai Admin
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
