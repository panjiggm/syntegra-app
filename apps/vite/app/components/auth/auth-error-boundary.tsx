import React from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useAuth } from "~/contexts/auth-context";

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class AuthErrorBoundaryClass extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Auth Error Boundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent error={this.state.error} retry={this.retry} />
        );
      }

      // Default error UI
      return (
        <DefaultAuthErrorFallback error={this.state.error} retry={this.retry} />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultAuthErrorFallback({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const { logout } = useAuth();

  const isAuthError =
    error.message.includes("token") ||
    error.message.includes("unauthorized") ||
    error.message.includes("authentication");

  const handleLogoutAndRetry = async () => {
    try {
      await logout();
      retry();
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
      // Force reload as last resort
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              {isAuthError ? "Authentication Error" : "Something Went Wrong"}
            </CardTitle>
            <CardDescription className="text-center">
              {isAuthError
                ? "There was a problem with your session. Please try logging in again."
                : "An unexpected error occurred. Please try again."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Error:</strong> {error.message}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-3">
              <Button onClick={retry} variant="default">
                Try Again
              </Button>

              {isAuthError && (
                <Button onClick={handleLogoutAndRetry} variant="outline">
                  Logout & Retry
                </Button>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Reload Page
              </Button>
            </div>

            {import.meta.env.DEV && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Technical Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Hook for imperative error handling
export function useAuthErrorHandler() {
  const { logout } = useAuth();

  const handleAuthError = React.useCallback(
    async (error: Error) => {
      console.error("Auth error:", error);

      // Check if it's an authentication error
      if (
        error.message.includes("token") ||
        error.message.includes("unauthorized") ||
        error.message.includes("authentication") ||
        error.message.includes("session")
      ) {
        try {
          await logout();
          // Optionally redirect to login
          window.location.href = "/login";
        } catch (logoutError) {
          console.error("Logout failed after auth error:", logoutError);
          // Force reload as last resort
          window.location.reload();
        }
      }
    },
    [logout]
  );

  return { handleAuthError };
}

// Wrapper component for easier use
export function AuthErrorBoundary({
  children,
  fallback,
  onError,
}: AuthErrorBoundaryProps) {
  return (
    <AuthErrorBoundaryClass fallback={fallback} onError={onError}>
      {children}
    </AuthErrorBoundaryClass>
  );
}

// Higher-order component
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function AuthErrorBoundaryWrapper(props: P) {
    return (
      <AuthErrorBoundary fallback={fallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
}
