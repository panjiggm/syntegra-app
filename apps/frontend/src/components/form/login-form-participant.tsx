"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useNextAuth } from "@/hooks/useNextAuth";

// PARTICIPANT LOGIN FORM (Updated)
const participantLoginSchema = z.object({
  phone: z
    .string()
    .min(1, "Nomor telepon tidak boleh kosong")
    .max(20, "Nomor telepon terlalu panjang")
    .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid"),
  rememberMe: z.boolean(),
});

type ParticipantLoginFormData = z.infer<typeof participantLoginSchema>;

export function LoginFormParticipant({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { useParticipantLogin } = useNextAuth();

  const participantLoginMutation = useParticipantLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    watch,
  } = useForm<ParticipantLoginFormData>({
    resolver: zodResolver(participantLoginSchema),
    mode: "onChange",
    defaultValues: {
      phone: "+62812345678",
      rememberMe: true, // Default to remember me
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: ParticipantLoginFormData) => {
    try {
      clearErrors();

      // Create participant login request
      const loginRequest = {
        phone: data.phone.trim(),
        rememberMe: data.rememberMe,
      };

      await participantLoginMutation.mutateAsync(loginRequest);
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle specific error cases based on the error message
      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("user not found") ||
          errorMsg.includes("tidak ditemukan") ||
          errorMsg.includes("no participant found")
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
        } else if (errorMsg.includes("phone")) {
          setError("phone", {
            type: "manual",
            message: error.message,
          });
        } else {
          // Generic error handling is done in the mutation's onError
          // Just set form-level error for display
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

  const isLoading = participantLoginMutation.isPending;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
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
              Masuk untuk mengakses psikotes Anda
            </p>
            <div className="text-center text-sm">
              Belum memiliki akun?{" "}
              <Link
                href="/participant/register"
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
                disabled={isLoading}
                {...register("phone")}
                className={cn(
                  errors.phone && "border-red-500 focus-visible:ring-red-500"
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
                disabled={isLoading}
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
                    ? "Session akan disimpan hingga expired (JWT)"
                    : "Session akan menggunakan default Next-Auth"}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses Login...
                </>
              ) : (
                "Masuk ke Sistem"
              )}
            </Button>
          </div>

          {/* Info Box with Next-Auth Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informasi Login:</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li>
                    • Session dikelola dengan Next-Auth v5 untuk keamanan
                    optimal
                  </li>
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
