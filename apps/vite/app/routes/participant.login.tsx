// apps/vite/app/routes/participant.login.tsx
import React from "react";
import { Navigate, useNavigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { PublicRoute } from "~/components/auth/route-guards";
import { useAuthForm } from "~/hooks/use-auth-form";
import { useAuth } from "~/contexts/auth-context";
import type { Route } from "./+types/participant.login";

// Form validation schema
const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "Nomor HP harus diisi")
    .regex(/^(\+62|62|0)[2-9][0-9]{7,11}$/, "Format nomor HP tidak valid"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Participant Login - Syntegra Psikotes" },
    { name: "description", content: "Login untuk peserta Syntegra Psikotes" },
  ];
}

export default function ParticipantLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasRole } = useAuth();

  // Redirect if already authenticated as participant
  if (isAuthenticated && hasRole("participant")) {
    const from = (location.state as any)?.from || "/participant/dashboard";
    return <Navigate to={from} replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const { isLoading, error, handleParticipantLogin, clearError } = useAuthForm({
    onSuccess: () => {
      const from = (location.state as any)?.from || "/participant/dashboard";
      navigate(from, { replace: true });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    clearError();
    handleParticipantLogin(data);
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");

    // Convert to standard format
    if (numbers.startsWith("62")) {
      return "+" + numbers;
    } else if (numbers.startsWith("0")) {
      return "+62" + numbers.slice(1);
    } else if (numbers.length > 0) {
      return "+62" + numbers;
    }
    return numbers;
  };

  return (
    <PublicRoute redirectTo="/participant/dashboard">
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Participant Login
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Masuk untuk mengikuti tes psikologi
            </p>
          </div>

          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Masuk sebagai Peserta</CardTitle>
                <CardDescription>
                  Masukkan nomor HP yang terdaftar untuk mengikuti tes
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor HP</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0812-3456-7890"
                    {...register("phone")}
                    disabled={isLoading}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      e.target.value = formatted;
                    }}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Contoh: 0812-3456-7890 atau +62812-3456-7890
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Informasi Penting:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Pastikan nomor HP Anda sudah terdaftar</li>
                    <li>
                      • Tes dapat diakses sesuai jadwal yang telah ditentukan
                    </li>
                    <li>• Hubungi admin jika mengalami kesulitan</li>
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Memverifikasi...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Admin?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={() => navigate("/admin/login")}
                    >
                      Masuk sebagai admin
                    </Button>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2024 Syntegra Psikotes. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
