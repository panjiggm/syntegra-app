// apps/vite/app/components/psikotes/test-progress.tsx
import React from "react";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { CheckCircle, Clock, FileText } from "lucide-react";
import { cn } from "~/lib/utils";

interface TestProgressProps {
  totalQuestions: number;
  answeredQuestions: number;
  timeSpent?: number;
  timeRemaining?: number;
  className?: string;
}

export function TestProgress({
  totalQuestions,
  answeredQuestions,
  timeSpent,
  timeRemaining,
  className,
}: TestProgressProps) {
  const progressPercentage = Math.round(
    (answeredQuestions / totalQuestions) * 100
  );

  const formatTime = (seconds?: number) => {
    if (!seconds) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress Pengerjaan</span>
          <span className="text-sm text-muted-foreground">
            {progressPercentage}%
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>
            <div className="font-medium">
              {answeredQuestions}/{totalQuestions}
            </div>
            <div className="text-xs text-muted-foreground">Terjawab</div>
          </div>
        </div>

        {timeRemaining && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-medium font-mono">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">Tersisa</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          <FileText className="h-3 w-3 mr-1" />
          {totalQuestions} Soal
        </Badge>

        {timeSpent && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(timeSpent)} Digunakan
          </Badge>
        )}
      </div>
    </div>
  );
}
