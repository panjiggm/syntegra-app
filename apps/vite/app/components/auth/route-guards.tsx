import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

interface RouteGuardProps {
  children: React.ReactNode;
}

interface ProtectedRouteProps extends RouteGuardProps {
  requiredRole?: "admin" | "participant";
  fallbackPath?: string;
}

interface PublicRouteProps extends RouteGuardProps {
  redirectTo?: string;
}

// Loading Component
function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    </div>
  );
}

// Protected Route - requires authentication and optionally specific role
export function ProtectedRoute({
  children,
  requiredRole,
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, canAccess } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return <AuthLoading />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />
    );
  }

  // Check role-based access
  if (requiredRole && !canAccess(requiredRole)) {
    // Redirect based on user role
    const redirectPath =
      user?.role === "admin" ? "/admin/dashboard" : "/participant/dashboard";

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

// Admin Route - shorthand for admin-only protected route
export function AdminRoute({
  children,
  fallbackPath,
}: RouteGuardProps & { fallbackPath?: string }) {
  return (
    <ProtectedRoute
      requiredRole="admin"
      fallbackPath={fallbackPath || "/admin/login"}
    >
      {children}
    </ProtectedRoute>
  );
}

// Participant Route - shorthand for participant-only protected route
export function ParticipantRoute({
  children,
  fallbackPath,
}: RouteGuardProps & { fallbackPath?: string }) {
  return (
    <ProtectedRoute
      requiredRole="participant"
      fallbackPath={fallbackPath || "/participant/login"}
    >
      {children}
    </ProtectedRoute>
  );
}

// Public Route - accessible only when not authenticated
export function PublicRoute({ children, redirectTo }: PublicRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <AuthLoading />;
  }

  // Redirect authenticated users
  if (isAuthenticated && user) {
    const defaultRedirect =
      user.role === "admin" ? "/admin/dashboard" : "/participant/dashboard";

    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  return <>{children}</>;
}

// Conditional Route - shows different content based on auth status
interface ConditionalRouteProps {
  authenticated: React.ReactNode;
  unauthenticated: React.ReactNode;
  loading?: React.ReactNode;
}

export function ConditionalRoute({
  authenticated,
  unauthenticated,
  loading,
}: ConditionalRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <>{loading || <AuthLoading />}</>;
  }

  return <>{isAuthenticated ? authenticated : unauthenticated}</>;
}

// Role-based Route - shows different content based on user role
interface RoleBasedRouteProps {
  admin?: React.ReactNode;
  participant?: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function RoleBasedRoute({
  admin,
  participant,
  fallback,
  loading,
}: RoleBasedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <>{loading || <AuthLoading />}</>;
  }

  if (!isAuthenticated || !user) {
    return <>{fallback || null}</>;
  }

  switch (user.role) {
    case "admin":
      return <>{admin || fallback || null}</>;
    case "participant":
      return <>{participant || fallback || null}</>;
    default:
      return <>{fallback || null}</>;
  }
}

// Higher-order component for route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: "admin" | "participant"
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Higher-order component for public-only routes
export function withPublicOnly<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function PublicOnlyComponent(props: P) {
    return (
      <PublicRoute redirectTo={redirectTo}>
        <Component {...props} />
      </PublicRoute>
    );
  };
}
