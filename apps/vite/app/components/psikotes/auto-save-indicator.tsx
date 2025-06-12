// apps/vite/app/components/psikotes/auto-save-indicator.tsx
import React from "react";
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error" | "unsaved";
  lastSaved?: Date;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  className,
}: AutoSaveIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case "saving":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "saved":
        return <CheckCircle className="h-3 w-3" />;
      case "error":
        return <AlertCircle className="h-3 w-3" />;
      case "unsaved":
        return <Save className="h-3 w-3" />;
      default:
        return <Save className="h-3 w-3" />;
    }
  };

  const getText = () => {
    switch (status) {
      case "saving":
        return "Menyimpan...";
      case "saved":
        return lastSaved
          ? `Tersimpan ${formatRelativeTime(lastSaved)}`
          : "Tersimpan";
      case "error":
        return "Gagal menyimpan";
      case "unsaved":
        return "Belum tersimpan";
      default:
        return "";
    }
  };

  const getVariant = () => {
    switch (status) {
      case "saved":
        return "default";
      case "error":
        return "destructive";
      case "saving":
      case "unsaved":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "baru saja";
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} jam lalu`;
  };

  if (status === "idle") return null;

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        "flex items-center gap-1 text-xs",
        status === "unsaved" && "animate-pulse",
        className
      )}
    >
      {getIcon()}
      <span>{getText()}</span>
    </Badge>
  );
}
