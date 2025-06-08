"use client";

import { useNextAuth } from "@/hooks/useNextAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "participant")[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = ["admin", "participant"],
  redirectTo,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useNextAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to appropriate login page
        const loginPath = allowedRoles.includes("admin")
          ? "/admin/login"
          : "/participant/login";
        router.push(redirectTo || loginPath);
        return;
      }

      if (user && !allowedRoles.includes(user.role)) {
        // User doesn't have required role
        const fallbackPath =
          user.role === "admin" ? "/admin/dashboard" : "/participant/dashboard";
        router.push(redirectTo || fallbackPath);
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, allowedRoles, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !allowedRoles.includes(user.role))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
