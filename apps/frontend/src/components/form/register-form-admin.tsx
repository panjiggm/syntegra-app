"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  User,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useUsers } from "@/hooks/useUsers";

// Admin registration validation schema
const adminRegistrationSchema = z
  .object({
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
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(128, "Password terlalu panjang")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus"
      ),
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi password tidak boleh kosong"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password dan konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

type AdminRegistrationData = z.infer<typeof adminRegistrationSchema>;

export function RegisterFormAdmin({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  } = useForm<AdminRegistrationData>({
    resolver: zodResolver(adminRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid =
    Object.keys(errors).length === 0 &&
    watchedValues.name &&
    watchedValues.email &&
    watchedValues.password &&
    watchedValues.confirmPassword;

  const onSubmit = async (data: AdminRegistrationData) => {
    try {
      clearErrors();

      // Show loading toast
      const loadingToast = toast.loading("Mendaftarkan admin...", {
        description: "Mohon tunggu, kami sedang memproses pendaftaran admin",
      });

      // Prepare data for API call (admin registration)
      const registrationData = {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: "admin" as const, // Force admin role
      };

      // Call create user API
      const response = await createUserMutation.mutateAsync(registrationData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.success) {
        // Show success toast
        toast.success("Pendaftaran admin berhasil!", {
          description: `Akun admin ${data.name} telah berhasil dibuat`,
          duration: 8000,
          action: {
            label: "Login Sekarang",
            onClick: () => router.push("/admin/login"),
          },
        });

        // Reset form
        reset();

        // Auto redirect to login after 4 seconds
        setTimeout(() => {
          router.push("/admin/login");
        }, 4000);
      } else {
        throw new Error(response.message || "Registrasi admin gagal");
      }
    } catch (error: any) {
      console.error("Admin registration error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      let errorMessage = "Terjadi kesalahan saat mendaftar admin";
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
          setError(field as keyof AdminRegistrationData, {
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
        errorMessage.toLowerCase().includes("admin") &&
        errorMessage.toLowerCase().includes("limit")
      ) {
        toast.error("Batas Admin Tercapai", {
          description:
            "Sudah ada 3 admin dalam sistem. Tidak bisa menambah admin baru.",
          duration: 8000,
          action: {
            label: "Login Admin",
            onClick: () => router.push("/admin/login"),
          },
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
          duration: 6000,
        });
      } else if (errorMessage.toLowerCase().includes("password")) {
        setError("password", {
          type: "manual",
          message: "Password tidak memenuhi persyaratan keamanan",
        });
        toast.error("Password tidak valid", {
          description:
            "Password harus mengandung huruf besar, kecil, angka, dan karakter khusus",
          duration: 6000,
        });
      } else {
        // Generic error toast
        toast.error("Pendaftaran admin gagal", {
          description: errorMessage,
          duration: 8000,
        });
      }
    }
  };

  const isLoading = createUserMutation.isPending || isSubmitting;

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "" };

    let strength = 0;
    const checks = [
      /[a-z]/.test(password), // lowercase
      /[A-Z]/.test(password), // uppercase
      /\d/.test(password), // numbers
      /[@$!%*?&]/.test(password), // special chars
      password.length >= 8, // length
    ];

    strength = checks.filter(Boolean).length;

    const labels = [
      "",
      "Sangat Lemah",
      "Lemah",
      "Sedang",
      "Kuat",
      "Sangat Kuat",
    ];
    const colors = [
      "",
      "text-red-500",
      "text-orange-500",
      "text-yellow-500",
      "text-blue-500",
      "text-green-500",
    ];

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
      percentage: (strength / 5) * 100,
    };
  };

  const passwordStrength = getPasswordStrength(watchedValues.password || "");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Logo Section */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-primary/5 to-blue-500/5">
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Image
                src="/images/syntegra-clear-logo.png"
                width={200}
                height={200}
                alt="Syntegra Services Logo"
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
                priority
              />
              <div className="mt-4 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Shield className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Admin Registration
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sistem Psikotes Digital
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Daftar Akun Administrator
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Daftar Admin</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  Buat akun administrator baru untuk sistem psikotes
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Name Field */}
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    <User className="size-4 inline mr-1" />
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Contoh: Ahmad Rizki Pratama"
                    disabled={isLoading}
                    {...register("name")}
                    className={cn(
                      errors.name &&
                        "border-red-500 focus-visible:ring-red-500",
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
                    <Mail className="size-4 inline mr-1" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@syntegra.com"
                    disabled={isLoading}
                    {...register("email")}
                    className={cn(
                      errors.email &&
                        "border-red-500 focus-visible:ring-red-500",
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

                {/* Password Field */}
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    <Lock className="size-4 inline mr-1" />
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter dengan huruf besar, kecil, angka & simbol"
                      disabled={isLoading}
                      {...register("password")}
                      className={cn(
                        "pr-10",
                        errors.password &&
                          "border-red-500 focus-visible:ring-red-500",
                        !errors.password &&
                          passwordStrength.strength >= 4 &&
                          "border-green-500 focus-visible:ring-green-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {watchedValues.password && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className={passwordStrength.color}>
                          {passwordStrength.label}
                        </span>
                        <span className="text-muted-foreground">
                          {passwordStrength.strength}/5
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            passwordStrength.strength <= 2 && "bg-red-500",
                            passwordStrength.strength === 3 && "bg-yellow-500",
                            passwordStrength.strength === 4 && "bg-blue-500",
                            passwordStrength.strength === 5 && "bg-green-500"
                          )}
                          style={{ width: `${passwordStrength.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Konfirmasi Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi password yang sama"
                      disabled={isLoading}
                      {...register("confirmPassword")}
                      className={cn(
                        "pr-10",
                        errors.confirmPassword &&
                          "border-red-500 focus-visible:ring-red-500",
                        !errors.confirmPassword &&
                          watchedValues.confirmPassword &&
                          watchedValues.password ===
                            watchedValues.confirmPassword &&
                          "border-green-500 focus-visible:ring-green-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                    {!errors.confirmPassword &&
                      watchedValues.confirmPassword &&
                      watchedValues.password ===
                        watchedValues.confirmPassword && (
                        <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 size-4 text-green-500" />
                      )}
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.confirmPassword.message}
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
                      "Daftar Sebagai Admin"
                    )}
                  </Button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Informasi Admin:</p>
                    <ul className="text-xs space-y-1 text-amber-700">
                      <li>• Akun admin memiliki akses penuh ke sistem</li>
                      <li>• Password harus kuat untuk keamanan</li>
                      <li>• Maksimal 3 admin dalam sistem</li>
                      <li>• NIK akan auto-generate jika tidak diisi</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-3">
                <div className="mt-3 after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <Link href="/">
                    <span className="bg-background text-muted-foreground relative z-10 px-2 hover:underline hover:text-primary transition-colors">
                      Kembali ke Home
                    </span>
                  </Link>
                </div>

                <div className="text-center text-sm">
                  Sudah memiliki akun admin?{" "}
                  <Link
                    href="/admin/login"
                    className="underline underline-offset-4 text-primary hover:text-primary/80 transition-colors"
                  >
                    Masuk ke Dashboard Admin
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

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
