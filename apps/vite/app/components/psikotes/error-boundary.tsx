import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class PsikotesErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Psikotes Error Boundary caught an error:", error, errorInfo);

    this.setState({ error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (e.g., Sentry)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: { errorBoundary: { errorInfo } }
    //   });
    // }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Terjadi Kesalahan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Maaf, terjadi kesalahan yang tidak terduga saat mengerjakan tes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Detail Error
                    </span>
                  </div>
                  <div className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                    {this.state.error.message}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Apa yang bisa Anda lakukan:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Coba refresh halaman untuk memuat ulang</li>
                  <li>• Periksa koneksi internet Anda</li>
                  <li>• Jika masalah berlanjut, hubungi administrator</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Coba Lagi
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex-1"
                >
                  Refresh Halaman
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Button>

              {process.env.NODE_ENV === "development" &&
                this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      Stack Trace (Development)
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
