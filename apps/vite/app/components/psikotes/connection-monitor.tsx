// apps/vite/app/components/psikotes/connection-monitor.tsx
import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface ConnectionMonitorProps {
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  autoHide?: boolean;
  className?: string;
}

export function ConnectionMonitor({
  onConnectionLost,
  onConnectionRestored,
  autoHide = true,
  className,
}: ConnectionMonitorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(!navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<
    "good" | "poor" | "offline"
  >("good");

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality("good");
      setShowAlert(false);
      onConnectionRestored?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality("offline");
      setShowAlert(true);
      onConnectionLost?.();
    };

    // Test connection quality periodically
    const testConnection = async () => {
      if (!navigator.onLine) {
        setConnectionQuality("offline");
        return;
      }

      try {
        const start = Date.now();
        const response = await fetch("/api/v1/health", {
          method: "HEAD",
          cache: "no-cache",
        });
        const latency = Date.now() - start;

        if (response.ok) {
          setConnectionQuality(latency > 3000 ? "poor" : "good");
        } else {
          setConnectionQuality("poor");
        }
      } catch {
        setConnectionQuality("poor");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Test connection every 30 seconds
    const interval = setInterval(testConnection, 30000);

    // Initial test
    testConnection();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [onConnectionLost, onConnectionRestored]);

  const getStatusBadge = () => {
    switch (connectionQuality) {
      case "offline":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        );
      case "poor":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-yellow-600"
          >
            <Wifi className="h-3 w-3" />
            Koneksi Lambat
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-green-600"
          >
            <Wifi className="h-3 w-3" />
            Online
          </Badge>
        );
    }
  };

  if (autoHide && isOnline && connectionQuality === "good") {
    return null;
  }

  if (!isOnline && showAlert) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Koneksi Terputus</strong>
            <br />
            Jawaban mungkin tidak tersimpan. Periksa koneksi internet Anda.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAlert(false)}
          >
            Tutup
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <div className={className}>{getStatusBadge()}</div>;
}
