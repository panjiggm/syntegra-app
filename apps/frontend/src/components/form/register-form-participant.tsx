"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useUsers } from "@/hooks/useUsers";

// Form validation schema for participant registration
const participantRegistrationSchema = z.object({
  nik: z
    .string()
    .min(1, "NIK tidak boleh kosong")
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya boleh berisi angka"),
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
  phone: z
    .string()
    .min(1, "Nomor HP tidak boleh kosong")
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP maksimal 15 digit")
    .regex(/^[\d+\-\s()]+$/, "Format nomor HP tidak valid"),
  gender: z.enum(["male", "female"], {
    required_error: "Jenis kelamin harus dipilih",
  }),
});

type ParticipantRegistrationData = z.infer<
  typeof participantRegistrationSchema
>;

export function RegisterFormParticipant({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showNIK, setShowNIK] = useState(false);
  const router = useRouter();
  const { useCreateUser } = useUsers();

  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    watch,
    reset,
  } = useForm<ParticipantRegistrationData>({
    resolver: zodResolver(participantRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      nik: "",
      name: "",
      email: "",
      phone: "",
      gender: undefined,
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid =
    Object.keys(errors).length === 0 &&
    watchedValues.nik &&
    watchedValues.name &&
    watchedValues.email &&
    watchedValues.phone &&
    watchedValues.gender;

  const onSubmit = async (data: ParticipantRegistrationData) => {
    try {
      clearErrors();

      // Show loading toast
      const loadingToast = toast.loading("Mendaftarkan akun...", {
        description: "Mohon tunggu, kami sedang memproses pendaftaran Anda",
      });

      // Format phone number (remove any spaces, brackets, dashes)
      const formattedPhone = data.phone.replace(/[\s\-()]/g, "");

      // Prepare data for API call (participant registration)
      const registrationData = {
        nik: data.nik,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: formattedPhone,
        gender: data.gender,
        role: "participant" as const, // Force participant role
      };

      // Call create user API
      const response = await createUserMutation.mutateAsync(registrationData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.success) {
        // Show success toast
        toast.success("Pendaftaran berhasil!", {
          description: `Akun participant ${data.name} telah berhasil dibuat`,
          duration: 5000,
          action: {
            label: "Login Sekarang",
            onClick: () => router.push("/participant/login"),
          },
        });

        // Reset form
        reset();

        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/participant/login");
        }, 3000);
      } else {
        throw new Error(response.message || "Registrasi gagal");
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      let errorMessage = "Terjadi kesalahan saat mendaftar";
      let fieldErrors: { [key: string]: string } = {};

      // Handle API error response
      if (error.data && error.data.errors) {
        // Parse field-specific errors
        error.data.errors.forEach((err: any) => {
          if (err.field) {
            fieldErrors[err.field] = err.message;
          }
        });

        // Set form field errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(field as keyof ParticipantRegistrationData, {
            type: "manual",
            message: message,
          });
        });

        // Use the main error message
        errorMessage = error.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific common errors
      if (
        errorMessage.toLowerCase().includes("nik") &&
        errorMessage.toLowerCase().includes("exist")
      ) {
        setError("nik", {
          type: "manual",
          message: "NIK sudah terdaftar dalam sistem",
        });
        toast.error("NIK sudah terdaftar", {
          description: "NIK yang Anda masukkan sudah digunakan oleh akun lain",
        });
      } else if (
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
        });
      } else {
        // Generic error toast
        toast.error("Pendaftaran gagal", {
          description: errorMessage,
          duration: 5000,
        });
      }
    }
  };

  const isLoading = createUserMutation.isPending || isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Image
                  src="/images/syntegra-logo.jpg"
                  width={200}
                  height={200}
                  alt="Syntegra Services Logo"
                  className="w-20 h-20 md:w-40 md:h-40 object-contain"
                  priority
                />
              </div>
              <span className="sr-only">Syntegra Services</span>
            </Link>
            <h1 className="text-xl font-bold">
              Selamat Datang di Syntegra Services
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Daftar untuk mengikuti psikotes
            </p>
            <div className="text-center text-sm">
              Sudah memiliki akun?{" "}
              <Link
                href="/participant/login"
                className="underline underline-offset-4 text-primary hover:text-primary/80"
              >
                Masuk ke akun
              </Link>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {/* NIK Field */}
            <div className="grid gap-2">
              <Label htmlFor="nik" className="text-sm font-medium">
                Nomor Induk Kependudukan (NIK){" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="nik"
                  type={showNIK ? "text" : "password"}
                  placeholder="1234567890123456"
                  disabled={isLoading}
                  {...register("nik")}
                  className={cn(
                    "pr-10",
                    errors.nik && "border-red-500 focus-visible:ring-red-500",
                    !errors.nik &&
                      watchedValues.nik &&
                      watchedValues.nik.length === 16 &&
                      "border-green-500 focus-visible:ring-green-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowNIK(!showNIK)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showNIK ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
                {!errors.nik &&
                  watchedValues.nik &&
                  watchedValues.nik.length === 16 && (
                    <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 size-4 text-green-500" />
                  )}
              </div>
              {errors.nik && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.nik.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                NIK akan digunakan sebagai identitas login Anda
              </p>
            </div>

            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Contoh: Ahmad Rizki Pratama"
                disabled={isLoading}
                {...register("name")}
                className={cn(
                  errors.name && "border-red-500 focus-visible:ring-red-500",
                  !errors.name &&
                    watchedValues.name &&
                    watchedValues.name.length > 0 &&
                    "border-green-500 focus-visible:ring-green-500"
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh@email.com"
                disabled={isLoading}
                {...register("email")}
                className={cn(
                  errors.email && "border-red-500 focus-visible:ring-red-500",
                  !errors.email &&
                    watchedValues.email &&
                    watchedValues.email.includes("@") &&
                    "border-green-500 focus-visible:ring-green-500"
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Nomor HP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="081234567890"
                disabled={isLoading}
                {...register("phone")}
                className={cn(
                  errors.phone && "border-red-500 focus-visible:ring-red-500",
                  !errors.phone &&
                    watchedValues.phone &&
                    watchedValues.phone.length >= 10 &&
                    "border-green-500 focus-visible:ring-green-500"
                )}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.phone.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: 08123456789 atau +6281234567890
              </p>
            </div>

            {/* Gender Field */}
            <div className="grid gap-2">
              <Label htmlFor="gender" className="text-sm font-medium">
                Jenis Kelamin <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        errors.gender &&
                          "border-red-500 focus-visible:ring-red-500",
                        !errors.gender &&
                          field.value &&
                          "border-green-500 focus-visible:ring-green-500"
                      )}
                    >
                      <SelectValue placeholder="Pilih Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.gender.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isFormValid}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Memproses Pendaftaran...
                  </>
                ) : (
                  "Daftar Sekarang"
                )}
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informasi Pendaftaran:</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li>• NIK akan digunakan sebagai username login</li>
                  <li>• Email harus valid dan dapat diakses</li>
                  <li>• Nomor HP akan digunakan untuk notifikasi</li>
                  <li>• Data yang dimasukkan harus sesuai dengan KTP</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <Link href="/">
              <span className="relative z-10 bg-background px-2 text-muted-foreground hover:underline hover:text-primary transition-colors">
                Kembali ke Home
              </span>
            </Link>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        <p className="text-xs text-muted-foreground">
          © 2025 Syntegra Services. Dikembangkan oleh{" "}
          <a
            href="https://oknum.studio"
            className="text-emerald-700 font-bold hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Oknum.Studio
          </a>
        </p>
      </div>
    </div>
  );
}
