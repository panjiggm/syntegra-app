import { Navigate, useNavigate, useLocation } from "react-router";
import { PublicRoute } from "~/components/auth/route-guards";
import { LoginFormAdmin } from "~/components/form/login-form-admin";
import { useAuth } from "~/contexts/auth-context";
import type { Route } from "./+types/admin.login";

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

  // Redirect if already authenticated as admin
  if (isAuthenticated && hasRole("admin")) {
    const from = (location.state as any)?.from || "/admin/dashboard";
    return <Navigate to={from} replace />;
  }

  const handleLoginSuccess = () => {
    const from = (location.state as any)?.from || "/admin/dashboard";
    navigate(from, { replace: true });
  };

  return (
    <PublicRoute redirectTo="/admin/dashboard">
      <div className="min-h-screen flex items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-3xl">
          <LoginFormAdmin onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </PublicRoute>
  );
}
