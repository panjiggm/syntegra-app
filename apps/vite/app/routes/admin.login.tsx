import React, { useState } from "react";
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
import type { Route } from "./+types/admin.login";

// Form validation schema
const loginSchema = z.object({
  identifier: z.string().min(1, "NIK atau Email harus diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Login - Syntegra Psikotes" },
    { name: "description", content: "Login untuk admin Syntegra Psikotes" },
  ];
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated as admin
  if (isAuthenticated && hasRole("admin")) {
    const from = (location.state as any)?.from || "/admin/dashboard";
    return <Navigate to={from} replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const { isLoading, error, handleAdminLogin, clearError } = useAuthForm({
    onSuccess: () => {
      const from = (location.state as any)?.from || "/admin/dashboard";
      navigate(from, { replace: true });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    clearError();
    handleAdminLogin(data);
  };

  return (
    <PublicRoute redirectTo="/admin/dashboard">
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Admin Login
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Masuk ke dashboard admin Syntegra Psikotes
            </p>
          </div>

          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Masuk sebagai Admin</CardTitle>
                <CardDescription>
                  Masukkan NIK atau email dan password Anda
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier">NIK atau Email</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Masukkan NIK atau email"
                    {...register("identifier")}
                    disabled={isLoading}
                  />
                  {errors.identifier && (
                    <p className="text-sm text-red-600">
                      {errors.identifier.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      {...register("password")}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Masuk...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Bukan admin?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={() => navigate("/participant/login")}
                    >
                      Masuk sebagai peserta
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
