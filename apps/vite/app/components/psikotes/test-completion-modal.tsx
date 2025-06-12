// apps/vite/app/components/psikotes/test-completion-modal.tsx
import React from "react";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "../ui/loading-spinner";

interface TestCompletionModalProps {
  isOpen: boolean;
  testName: string;
  questionsAnswered: number;
  totalQuestions: number;
  timeSpent: number;
  isForced?: boolean;
  reason?: "completed" | "time_up" | "manual";
  onConfirm: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function TestCompletionModal({
  isOpen,
  testName,
  questionsAnswered,
  totalQuestions,
  timeSpent,
  isForced = false,
  reason = "completed",
  onConfirm,
  onCancel,
  isSubmitting = false,
}: TestCompletionModalProps) {
  const completionPercentage = Math.round(
    (questionsAnswered / totalQuestions) * 100
  );
  const timeSpentMinutes = Math.floor(timeSpent / 60);
  const unansweredQuestions = totalQuestions - questionsAnswered;

  const getIcon = () => {
    switch (reason) {
      case "time_up":
        return <Clock className="h-12 w-12 text-yellow-600" />;
      case "completed":
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-orange-600" />;
    }
  };

  const getTitle = () => {
    switch (reason) {
      case "time_up":
        return "Waktu Habis";
      case "completed":
        return "Selesaikan Tes";
      default:
        return "Selesaikan Tes";
    }
  };

  const getDescription = () => {
    switch (reason) {
      case "time_up":
        return "Waktu pengerjaan tes telah habis. Tes akan diselesaikan secara otomatis.";
      case "completed":
        return "Anda telah menyelesaikan semua soal. Apakah Anda yakin ingin mengakhiri tes?";
      default:
        return "Apakah Anda yakin ingin menyelesaikan tes sekarang?";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isForced ? onCancel : undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">{getIcon()}</div>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Ringkasan Pengerjaan:</h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-white rounded">
                <div className="font-bold text-lg text-blue-600">
                  {questionsAnswered}
                </div>
                <div className="text-xs text-gray-600">Terjawab</div>
              </div>

              <div className="text-center p-2 bg-white rounded">
                <div className="font-bold text-lg text-gray-600">
                  {unansweredQuestions}
                </div>
                <div className="text-xs text-gray-600">Belum Dijawab</div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span>Progress:</span>
              <Badge variant="outline">{completionPercentage}%</Badge>
            </div>

            <div className="flex justify-between text-sm">
              <span>Waktu Digunakan:</span>
              <span className="font-medium">{timeSpentMinutes} menit</span>
            </div>
          </div>

          {/* Warning for unanswered questions */}
          {unansweredQuestions > 0 && reason !== "time_up" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Masih ada {unansweredQuestions} soal yang belum dijawab
                </span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Soal yang tidak dijawab akan dianggap kosong.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isForced && onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Kembali
              </Button>
            )}

            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`${isForced ? "w-full" : "flex-1"} ${
                reason === "completed" ? "bg-green-600 hover:bg-green-700" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Menyimpan...
                </>
              ) : reason === "time_up" ? (
                "Selesai Otomatis"
              ) : (
                "Ya, Selesaikan Tes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
