"use client";

import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  goHome: () => void;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "Dashboard Error Boundary caught an error:",
      error,
      errorInfo
    );

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    // Here you could send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/admin/dashboard";
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.handleReset}
          goHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  resetError,
  goHome,
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="size-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Oops! Terjadi Kesalahan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Dashboard mengalami masalah teknis. Ini mungkin masalah sementara.
          </p>

          {process.env.NODE_ENV === "development" && error && (
            <details className="text-left bg-red-50 border border-red-200 rounded p-3 text-sm">
              <summary className="cursor-pointer font-medium text-red-800 mb-2">
                Detail Error (Development)
              </summary>
              <pre className="text-red-700 overflow-auto whitespace-pre-wrap">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetError} variant="outline" className="gap-2">
              <RefreshCw className="size-4" />
              Coba Lagi
            </Button>
            <Button onClick={goHome} className="gap-2">
              <Home className="size-4" />
              Kembali ke Dashboard
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Jika masalah berlanjut, silakan hubungi administrator sistem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Specialized error fallback for dashboard components
export function DashboardErrorFallback({
  error,
  resetError,
}: ErrorFallbackProps) {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="size-5" />
          Gagal Memuat Komponen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Komponen dashboard tidak dapat dimuat dengan baik.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <details className="mb-4 text-xs bg-red-50 border border-red-200 rounded p-2">
            <summary className="cursor-pointer font-medium text-red-800">
              Error Details
            </summary>
            <pre className="mt-2 text-red-700 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}

        <Button
          onClick={resetError}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Muat Ulang
        </Button>
      </CardContent>
    </Card>
  );
}

export default ErrorBoundary;
