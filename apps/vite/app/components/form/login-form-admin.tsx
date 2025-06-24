import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuthForm } from "~/hooks/use-auth-form";
import { toast } from "sonner";

// Form validation schema - sesuai dengan AdminLoginRequestSchema
const adminLoginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email tidak boleh kosong")
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong")
    .min(8, "Password minimal 8 karakter"),
  rememberMe: z.boolean().optional(),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

interface LoginFormAdminProps {
  className?: string;
  onSuccess?: () => void;
}

export function LoginFormAdmin({ className, onSuccess }: LoginFormAdminProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    watch,
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "admin-new@example.com",
      password: "AdminNew123!",
      rememberMe: false,
    },
  });

  const { isLoading, error, handleAdminLogin, clearError } = useAuthForm({
    onSuccess: () => {
      toast.success("Login berhasil!");
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Admin login error:", error);
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid =
    Object.keys(errors).length === 0 &&
    watchedValues.identifier?.includes("@") &&
    watchedValues.password?.length >= 8;

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      clearErrors();
      clearError();

      // Show loading toast
      const loadingToast = toast.loading("Memproses login...");

      // Call admin login
      await handleAdminLogin({
        identifier: data.identifier.toLowerCase().trim(),
        password: data.password,
      });

      toast.dismiss(loadingToast);
    } catch (error: any) {
      console.error("Admin login error:", error);

      // Dismiss any loading toast
      toast.dismiss();

      // Handle specific error cases
      if (error?.message) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("invalid credentials") ||
          errorMsg.includes("user not found") ||
          errorMsg.includes("password incorrect") ||
          errorMsg.includes("email not found")
        ) {
          setError("identifier", {
            type: "manual",
            message: "Email atau password tidak valid",
          });
          setError("password", {
            type: "manual",
            message: "Email atau password tidak valid",
          });

          toast.error(
            "Login gagal: " + "Email atau password yang Anda masukkan salah"
          );
        } else if (
          errorMsg.includes("account") &&
          errorMsg.includes("locked")
        ) {
          toast.error(
            "Akun Terkunci: " +
              "Akun Anda sementara dikunci karena terlalu banyak percobaan login. Hubungi administrator untuk bantuan."
          );
        } else if (
          errorMsg.includes("inactive") ||
          errorMsg.includes("deactivated")
        ) {
          toast.error(
            "Akun Nonaktif: " +
              "Akun Anda tidak aktif. Hubungi administrator untuk aktivasi akun."
          );
        } else if (
          errorMsg.includes("admin") &&
          errorMsg.includes("required")
        ) {
          toast.error(
            "Akses Ditolak: " +
              "Akun ini bukan akun administrator. Gunakan halaman login participant untuk akses."
          );
        } else if (errorMsg.includes("validation")) {
          setError("root", {
            type: "manual",
            message: "Data yang dimasukkan tidak valid",
          });
        } else {
          setError("root", {
            type: "manual",
            message: error.message || "Terjadi kesalahan saat login",
          });
        }
      } else {
        setError("root", {
          type: "manual",
          message: "Terjadi kesalahan saat login. Silakan coba lagi.",
        });
      }
    }
  };

  const isLoadingState = isLoading || isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Selamat datang Admin!</h1>
                <p className="text-balance text-muted-foreground">
                  Masuk ke panel administrasi Syntegra Psikotes
                </p>
              </div>

              {/* Global Error Display */}
              {(errors.root || error) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errors.root?.message ||
                      error ||
                      "Terjadi kesalahan saat login"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-4">
                {/* Email Field */}
                <div className="grid gap-2">
                  <Label htmlFor="identifier" className="text-sm font-medium">
                    Email Administrator
                  </Label>
                  <Input
                    id="identifier"
                    type="email"
                    placeholder="admin@syntegra.com"
                    disabled={isLoadingState}
                    {...register("identifier")}
                    className={cn(
                      errors.identifier &&
                        "border-red-500 focus-visible:ring-red-500",
                      !errors.identifier &&
                        watchedValues.identifier?.includes("@") &&
                        "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                  {errors.identifier && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.identifier.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        toast.info("Reset Password: Hubungi Admin");
                      }}
                      className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground transition-colors"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password admin"
                      disabled={isLoadingState}
                      {...register("password")}
                      className={cn(
                        "pr-10",
                        errors.password &&
                          "border-red-500 focus-visible:ring-red-500",
                        !errors.password &&
                          watchedValues.password &&
                          watchedValues.password.length >= 8 &&
                          "border-green-500 focus-visible:ring-green-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoadingState}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2">
                  <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="rememberMe"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoadingState}
                      />
                    )}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ingat saya
                  </Label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoadingState || !isFormValid}
                    size="lg"
                  >
                    {isLoadingState ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Memproses Login...
                      </>
                    ) : (
                      "Masuk ke Dashboard Admin"
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
                    <p className="font-medium mb-1">Akses Administrator:</p>
                    <ul className="text-xs space-y-1 text-blue-700">
                      <li>• Gunakan email dan password administrator</li>
                      <li>• Maksimal 10 percobaan login setiap 15 menit</li>
                      <li>• Session akan aktif selama 24 jam</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-3">
                <div className="mb-2 relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <Link to="/">
                    <span className="bg-background text-muted-foreground relative z-10 px-2 hover:underline hover:text-primary transition-colors">
                      Kembali ke Home
                    </span>
                  </Link>
                </div>

                <div className="text-center text-xs">
                  Belum memiliki akun admin?{" "}
                  <Link
                    to="/admin/register"
                    className="underline underline-offset-4 text-primary hover:text-primary/80 transition-colors"
                  >
                    Daftar Admin Baru
                  </Link>
                </div>

                <div className="text-center text-xs">
                  Bukan administrator?{" "}
                  <Link
                    to="/participant/login"
                    className="underline underline-offset-4 text-muted-foreground hover:text-primary transition-colors"
                  >
                    Login sebagai Participant
                  </Link>
                </div>
              </div>
            </div>
          </form>

          {/* Logo Section */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-primary/5 to-blue-500/5">
            <div className="flex flex-col items-center justify-center h-full p-6">
              <img
                src="/images/syntegra-clear-logo.png"
                alt="Syntegra Services Logo"
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
              />
              <div className="mt-4 text-center">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Admin Panel
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sistem Psikotes Digital
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Panel Administrasi & Manajemen
                </p>
              </div>
            </div>
          </div>
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
