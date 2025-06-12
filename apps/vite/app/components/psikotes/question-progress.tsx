// apps/vite/app/components/psikotes/question-progress.tsx
import React from "react";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface Question {
  id: string;
  sequence: number;
  is_required?: boolean;
}

interface QuestionProgressProps {
  questions: Question[];
  currentQuestionId: string;
  answeredQuestionIds: string[];
  onQuestionSelect: (questionId: string) => void;
  className?: string;
}

export function QuestionProgress({
  questions,
  currentQuestionId,
  answeredQuestionIds,
  onQuestionSelect,
  className,
}: QuestionProgressProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="font-medium text-gray-900">Navigasi Soal</h3>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((question) => {
          const isAnswered = answeredQuestionIds.includes(question.id);
          const isActive = question.id === currentQuestionId;
          const isRequired = question.is_required;

          return (
            <Button
              key={question.id}
              variant="ghost"
              size="sm"
              onClick={() => onQuestionSelect(question.id)}
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all p-0 relative",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : isAnswered
                    ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                    : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
              )}
            >
              {question.sequence}
              {isRequired && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Soal Aktif</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
          <span>Sudah Dijawab</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
          <span>Belum Dijawab</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Wajib Dijawab</span>
        </div>
      </div>
    </div>
  );
}
