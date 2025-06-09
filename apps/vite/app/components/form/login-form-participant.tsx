import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent } from "~/components/ui/card";
import { Link } from "react-router";
import { AlertCircle, Loader2, Info, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuthForm } from "~/hooks/use-auth-form";

// Participant login validation schema
const participantLoginSchema = z.object({
  phone: z
    .string()
    .min(1, "Nomor telepon tidak boleh kosong")
    .max(20, "Nomor telepon terlalu panjang")
    .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid"),
  rememberMe: z.boolean().optional(),
});

type ParticipantLoginData = z.infer<typeof participantLoginSchema>;

interface LoginFormParticipantProps {
  className?: string;
  onSuccess?: () => void;
}

export function LoginFormParticipant({
  className,
  onSuccess,
  ...props
}: LoginFormParticipantProps & React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { handleParticipantLogin, isLoading, error } = useAuthForm({
    onSuccess: () => {
      toast.success("Login berhasil!", {
        description: "Selamat datang di Syntegra Services",
      });
      onSuccess?.();
      navigate("/participant/dashboard");
    },
    onError: (err) => {
      // Error handling is done in form submission
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    watch,
  } = useForm<ParticipantLoginData>({
    resolver: zodResolver(participantLoginSchema),
    mode: "onChange",
    defaultValues: {
      phone: "+62812345678",
      rememberMe: true,
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid = Object.keys(errors).length === 0 && watchedValues.phone;

  const onSubmit = async (data: ParticipantLoginData) => {
    try {
      clearErrors();

      await handleParticipantLogin({
        phone: data.phone.trim(),
        rememberMe: data.rememberMe,
      });
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle specific error cases based on the error message
      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("user not found") ||
          errorMsg.includes("tidak ditemukan") ||
          errorMsg.includes("no participant found") ||
          errorMsg.includes("phone")
        ) {
          setError("phone", {
            type: "manual",
            message: "Nomor telepon tidak terdaftar",
          });

          toast.error("Login gagal", {
            description: "Nomor telepon tidak ditemukan dalam sistem",
          });
        } else if (
          errorMsg.includes("account") &&
          errorMsg.includes("locked")
        ) {
          toast.error("Akun Terkunci", {
            description:
              "Akun Anda sementara dikunci. Hubungi admin untuk bantuan.",
          });
        } else if (
          errorMsg.includes("inactive") ||
          errorMsg.includes("deactivated")
        ) {
          toast.error("Akun Nonaktif", {
            description: "Akun Anda tidak aktif. Hubungi admin untuk aktivasi.",
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
          message: "Terjadi kesalahan saat login",
        });
      }
    }
  };

  const isSubmittingForm = isLoading || isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 font-medium hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <img
                  src="/images/syntegra-clear-logo.png"
                  alt="Syntegra Services Logo"
                  className="w-20 h-20 md:w-40 md:h-40 object-contain"
                />
              </div>
              <span className="sr-only">Syntegra Services</span>
            </Link>
            <h1 className="text-xl font-bold">
              Selamat Datang di Syntegra Services
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Masuk untuk mengakses psikotes Anda
            </p>
            <div className="text-center text-sm">
              Belum memiliki akun?{" "}
              <Link
                to="/participant/register"
                className="underline underline-offset-4 text-primary hover:text-primary/80"
              >
                Daftar
              </Link>
            </div>
          </div>

          {/* Global Error Display */}
          {errors.root && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="size-4 flex-shrink-0" />
              <span>
                {errors.root.message || "Terjadi kesalahan saat login"}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Phone Field */}
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Nomor Telepon
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08123456789 atau +628123456789"
                disabled={isSubmittingForm}
                {...register("phone")}
                className={cn(
                  "transition-colors duration-200",
                  errors.phone
                    ? "border-red-500 focus-visible:ring-red-500"
                    : watchedValues.phone
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                )}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {errors.phone.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Masukkan nomor telepon yang terdaftar di sistem
              </p>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                {...register("rememberMe")}
                disabled={isSubmittingForm}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Ingat saya
                </Label>
                <p className="text-xs text-muted-foreground">
                  {watchedValues.rememberMe
                    ? "Session akan disimpan hingga expired"
                    : "Session akan menggunakan default"}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmittingForm}
              size="lg"
            >
              {isSubmittingForm ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses Login...
                </>
              ) : (
                <>
                  <Phone className="mr-2 size-4" />
                  Masuk ke Sistem
                </>
              )}
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informasi Login:</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li>
                    • Login menggunakan nomor telepon yang telah terdaftar
                  </li>
                  <li>• Session dikelola dengan sistem keamanan optimal</li>
                  <li>
                    • Token akan di-refresh secara otomatis saat mendekati
                    expired
                  </li>
                  <li>
                    • Anda dapat mengelola session aktif di pengaturan akun
                  </li>
                  <li>• Logout otomatis jika terjadi error authentication</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <Link to="/">
              <span className="relative z-10 bg-background px-2 text-muted-foreground hover:underline hover:text-primary transition-colors">
                Kembali ke Home
              </span>
            </Link>
          </div>

          {/* Additional Navigation */}
          <div className="flex flex-col gap-2 text-sm text-center">
            <Link
              to="/admin/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Login sebagai Admin
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
