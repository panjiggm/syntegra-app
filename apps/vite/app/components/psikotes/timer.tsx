import { useState, useEffect } from "react";
import { Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { getTimeStatus } from "~/lib/utils/time";

interface TimerProps {
  startTime: string | Date;
  timeLimitMinutes: number;
  onTimeUp?: () => void;
  onWarning?: (minutesLeft: number) => void;
  className?: string;
  showProgress?: boolean;
  warningThreshold?: number; // minutes
}

export function Timer({
  startTime,
  timeLimitMinutes,
  onTimeUp,
  onWarning,
  className,
  showProgress = true,
  warningThreshold = 5,
}: TimerProps) {
  const [timeStatus, setTimeStatus] = useState(() =>
    getTimeStatus(startTime, timeLimitMinutes)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const status = getTimeStatus(startTime, timeLimitMinutes);
      setTimeStatus(status);

      // Trigger callbacks
      if (status.isExpired && onTimeUp) {
        onTimeUp();
      } else if (status.status === "warning" && onWarning) {
        const minutesLeft = Math.ceil(status.timeRemaining / 60);
        onWarning(minutesLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, timeLimitMinutes, onTimeUp, onWarning]);

  const getIcon = () => {
    switch (timeStatus.status) {
      case "expired":
        return <AlertCircle className="h-4 w-4" />;
      case "danger":
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = () => {
    switch (timeStatus.status) {
      case "expired":
      case "danger":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={getBadgeVariant()}
        className={cn(
          "flex items-center gap-1 text-sm font-mono",
          timeStatus.status === "danger" && "animate-pulse"
        )}
      >
        {getIcon()}
        <span>{timeStatus.timeRemainingFormatted}</span>
      </Badge>

      {showProgress && (
        <div className="flex-1 min-w-[100px]">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-1000",
                timeStatus.status === "expired"
                  ? "bg-red-500"
                  : timeStatus.status === "danger"
                    ? "bg-red-400"
                    : timeStatus.status === "warning"
                      ? "bg-yellow-400"
                      : "bg-blue-500"
              )}
              style={{ width: `${timeStatus.progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
