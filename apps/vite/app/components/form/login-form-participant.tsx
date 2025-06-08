import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Link } from "react-router";
import { Eye, EyeOff, Loader2, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuthForm } from "~/hooks/use-auth-form";

// Participant login validation schema
const participantLoginSchema = z.object({
  phone: z
    .string()
    .min(1, "Nomor telepon wajib diisi")
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^(\+62|62|0)[0-9]+$/, "Format nomor telepon tidak valid"),
});

type ParticipantLoginData = z.infer<typeof participantLoginSchema>;

interface LoginFormParticipantProps {
  className?: string;
  onSuccess?: () => void;
}

export function LoginFormParticipant({
  className,
  onSuccess,
}: LoginFormParticipantProps) {
  const navigate = useNavigate();
  const { handleParticipantLogin, isLoading, error } = useAuthForm({
    onSuccess: () => {
      toast.success("Login berhasil!", {
        description: "Selamat datang di Syntegra",
      });
      onSuccess?.();
      navigate("/participant/dashboard");
    },
    onError: (err) => {
      const errorMessage = err.message || "Login gagal";

      if (errorMessage.includes("phone") || errorMessage.includes("Phone")) {
        toast.error("Nomor telepon tidak ditemukan", {
          description: "Pastikan nomor telepon sudah terdaftar",
          duration: 6000,
        });
      } else if (
        errorMessage.includes("inactive") ||
        errorMessage.includes("deactivated")
      ) {
        toast.error("Akun tidak aktif", {
          description: "Akun Anda telah dinonaktifkan. Hubungi administrator",
          duration: 8000,
        });
      } else if (errorMessage.includes("locked")) {
        toast.error("Akun terkunci", {
          description:
            "Akun Anda terkunci karena terlalu banyak percobaan login gagal",
          duration: 8000,
        });
      } else {
        toast.error("Login gagal", {
          description: errorMessage,
          duration: 5000,
        });
      }
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ParticipantLoginData>({
    resolver: zodResolver(participantLoginSchema),
    mode: "onChange",
    defaultValues: {
      phone: "",
    },
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  const isFormValid = Object.keys(errors).length === 0 && watchedValues.phone;

  const onSubmit = async (data: ParticipantLoginData) => {
    await handleParticipantLogin({
      phone: data.phone.trim(),
    });
  };

  const isSubmittingForm = isLoading || isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Logo Section */}
          <div className="hidden bg-gradient-to-br from-green-600 to-blue-700 p-8 text-white md:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <img
                  src="/images/syntegra-clear-logo.png"
                  alt="Syntegra Logo"
                  className="w-32 h-32 md:w-40 md:h-40 mb-6"
                />
                <h2 className="text-2xl font-bold">Login Peserta</h2>
                <p className="mt-2 text-green-100">
                  Akses platform tes psikologi Syntegra
                </p>
              </div>

              <div className="space-y-4">
                {/* Info Box */}
                <div className="rounded-lg bg-green-800/50 p-4">
                  <div className="flex items-start gap-3">
                    <Users className="size-5 text-green-200 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-100">
                        Akses Peserta
                      </h4>
                      <p className="text-sm text-green-200 mt-1">
                        Login menggunakan nomor telepon yang telah terdaftar
                        untuk mengakses tes psikologi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col gap-2 text-sm">
                  <Link
                    to="/"
                    className="text-green-200 hover:text-white transition-colors"
                  >
                    ← Kembali ke Beranda
                  </Link>
                  <Link
                    to="/participant/register"
                    className="text-green-200 hover:text-white transition-colors"
                  >
                    Belum punya akun? Daftar di sini
                  </Link>
                  <Link
                    to="/admin/login"
                    className="text-green-200 hover:text-white transition-colors"
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
              <h1 className="text-3xl font-bold tracking-tight">
                Selamat Datang Kembali
              </h1>
              <p className="text-muted-foreground">
                Masuk dengan nomor telepon Anda untuk melanjutkan
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone Number Field */}
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
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmittingForm || !isFormValid}
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Users className="size-4 mr-2" />
                    Masuk
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
                to="/participant/register"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Belum punya akun? Daftar di sini
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
