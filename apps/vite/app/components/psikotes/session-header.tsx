import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, LogOut, RefreshCw, Users, MapPin } from "lucide-react";
import { Timer } from "./timer";
import { TestProgress } from "./test-progress";
import { AutoSaveIndicator } from "./auto-save-indicator";

interface SessionHeaderProps {
  sessionName: string;
  testName: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
  startTime: string;
  timeLimitMinutes: number;
  targetPosition?: string;
  location?: string;
  autoSaveStatus?: "idle" | "saving" | "saved" | "error" | "unsaved";
  lastSaved?: Date;
  onBack?: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  onTimeUp?: () => void;
}

export function SessionHeader({
  sessionName,
  testName,
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  startTime,
  timeLimitMinutes,
  targetPosition,
  location,
  autoSaveStatus = "idle",
  lastSaved,
  onBack,
  onLogout,
  onRefresh,
  onTimeUp,
}: SessionHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          )}

          <div>
            <h1 className="text-xl font-semibold text-gray-900">{testName}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
              <span>{sessionName}</span>
              {targetPosition && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{targetPosition}</span>
                  </div>
                </>
              )}
              {location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{location}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <TestProgress
              totalQuestions={totalQuestions}
              answeredQuestions={answeredQuestions}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Timer
            startTime={startTime}
            timeLimitMinutes={timeLimitMinutes}
            onTimeUp={onTimeUp}
            showProgress={false}
          />

          <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />

          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {onLogout && (
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="block md:hidden mt-4">
        <TestProgress
          totalQuestions={totalQuestions}
          answeredQuestions={answeredQuestions}
        />
      </div>
    </div>
  );
}
