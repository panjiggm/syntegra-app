import React from "react";
import { Navigate, useNavigate, useLocation } from "react-router";
import { PublicRoute } from "~/components/auth/route-guards";
import { RegisterFormAdmin } from "~/components/form/register-form-admin";
import { useAuth } from "~/contexts/auth-context";

export function meta() {
  return [
    { title: "Admin Register - Syntegra Psikotes" },
    {
      name: "description",
      content: "Daftar akun administrator Syntegra Psikotes",
    },
  ];
}

export default function AdminRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasRole } = useAuth();

  // Redirect if already authenticated as admin
  if (isAuthenticated && hasRole("admin")) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleRegisterSuccess = () => {
    // Navigate to login after successful registration
    navigate("/admin/login", { replace: true });
  };

  return (
    <PublicRoute redirectTo="/admin/dashboard">
      <div className="min-h-screen flex items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <RegisterFormAdmin onSuccess={handleRegisterSuccess} />
        </div>
      </div>
    </PublicRoute>
  );
}
