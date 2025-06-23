import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTestAttempt } from "~/hooks/use-test-attempt";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { cn } from "~/lib/utils";

interface AttemptAnswersDrawerProps {
  attemptId: string;
  testName: string;
  children: React.ReactNode;
}

export function AttemptAnswersDrawer({
  attemptId,
  testName,
  children,
}: AttemptAnswersDrawerProps) {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { useGetAttemptAnswers } = useTestAttempt();

  // Get paginated data for display
  const { data, isLoading } = useGetAttemptAnswers(attemptId, {
    page: currentPage,
    limit,
    include_correct_answers: true,
    include_score: true,
  });

  const answers = data?.data || [];
  const summary = data?.summary;
  const meta = data?.meta;

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "🔘";
      case "true_false":
        return "✅";
      case "text":
        return "📝";
      case "rating_scale":
        return "⭐";
      case "drawing":
        return "🎨";
      case "sequence":
        return "🔢";
      case "matrix":
        return "📊";
      default:
        return "❓";
    }
  };

  const getAnswerStatusColor = (
    isCorrect: boolean | null,
    isAnswered: boolean
  ) => {
    if (!isAnswered) return "bg-gray-100 text-gray-700";
    if (isCorrect === null) return "bg-blue-100 text-blue-700";
    return isCorrect
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  const getAnswerStatusIcon = (
    isCorrect: boolean | null,
    isAnswered: boolean
  ) => {
    if (!isAnswered) return <Clock className="h-3 w-3" />;
    if (isCorrect === null) return <FileText className="h-3 w-3" />;
    return isCorrect ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : (
      <XCircle className="h-3 w-3" />
    );
  };

  const formatAnswerDisplay = (answer: any) => {
    if (!answer.is_answered) return "Tidak dijawab";

    if (answer.answer_display) {
      return answer.answer_display;
    }

    if (answer.answer) {
      return answer.answer;
    }

    if (answer.answer_data) {
      return JSON.stringify(answer.answer_data);
    }

    return "Tidak ada jawaban";
  };

  // Function to get correct answer display
  const getCorrectAnswerDisplay = (question: any) => {
    if (!question.correct_answer) return "Tidak ada jawaban benar";

    // For multiple choice questions with options
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find(
        (option: any) => option.value === question.correct_answer
      );

      if (correctOption) {
        return `${question.correct_answer}: ${correctOption.label}`;
      }
    }

    // For other question types, just return the correct answer
    return question.correct_answer;
  };

  // Get total correct/wrong from meta (provided by backend)
  const correctAnswers = meta?.correct_answers || 0;
  const wrongAnswers = meta?.wrong_answers || 0;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="w-full max-w-xl fixed right-0 top-0 mt-0 rounded-none">
        <div className="flex flex-col h-full">
          {/* Fixed Header */}
          <DrawerHeader className="flex-shrink-0 border-b bg-white">
            <div className="flex flex-col">
              <div>
                <DrawerTitle className="text-lg font-bold">
                  Detail Jawaban - {testName}
                </DrawerTitle>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {meta && (
                  <>
                    <Badge variant="outline" className="bg-blue-50">
                      Total: {meta.total_answers}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700"
                    >
                      Benar: {correctAnswers}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Salah: {wrongAnswers}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-50">
                      Belum: {meta.unanswered_questions}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.progress_percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(summary.total_time_spent / 60)}m
                  </div>
                  <p className="text-xs text-muted-foreground">Total Waktu</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.average_time_per_question}s
                  </div>
                  <p className="text-xs text-muted-foreground">Rata-rata</p>
                </div>
              </div>
            )}
          </DrawerHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <Card
                    key={answer.id}
                    className="transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Question Number & Type */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">
                              {answer.question.sequence || index + 1}
                            </span>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-lg">
                              {getQuestionTypeIcon(
                                answer.question.question_type
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Question & Answer */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm leading-tight">
                              {answer.question.question}
                            </h4>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "ml-2 flex-shrink-0",
                                getAnswerStatusColor(
                                  answer.is_correct,
                                  answer.is_answered
                                )
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {getAnswerStatusIcon(
                                  answer.is_correct,
                                  answer.is_answered
                                )}
                                <span className="text-xs">
                                  {!answer.is_answered
                                    ? "Belum dijawab"
                                    : answer.is_correct === null
                                      ? "Tidak dinilai"
                                      : answer.is_correct
                                        ? "Benar"
                                        : "Salah"}
                                </span>
                              </div>
                            </Badge>
                          </div>

                          {/* Options for multiple choice */}
                          {answer.question.options &&
                            answer.question.options.length > 0 && (
                              <div className="mb-2">
                                <div className="grid grid-cols-1 gap-1">
                                  {answer.question.options.map(
                                    (option, optIndex) => (
                                      <div
                                        key={optIndex}
                                        className={cn(
                                          "text-xs p-2 rounded border",
                                          answer.answer === option.value
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-gray-50 border-gray-200"
                                        )}
                                      >
                                        <span className="font-medium">
                                          {option.value}:
                                        </span>{" "}
                                        {option.label}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* User Answer */}
                          <div className="bg-gray-50 p-3 rounded-lg mb-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Jawaban Peserta:
                            </p>
                            <p className="text-sm font-medium">
                              {formatAnswerDisplay(answer)}
                            </p>

                            {/* Answer Stats */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {answer.time_taken && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {answer.time_taken}s
                                </span>
                              )}
                              {answer.score !== null && (
                                <span>Skor: {answer.score}</span>
                              )}
                            </div>
                          </div>

                          {/* Correct Answer */}
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 font-medium mb-1">
                              Jawaban yang Benar:
                            </p>
                            <p className="text-sm font-medium text-green-800">
                              {getCorrectAnswerDisplay(answer.question)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {meta && meta.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {(currentPage - 1) * limit + 1} -{" "}
                      {Math.min(currentPage * limit, meta.total)} dari{" "}
                      {meta.total}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!meta.has_prev_page}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3">
                        {currentPage} dari {meta.total_pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(meta.total_pages, prev + 1)
                          )
                        }
                        disabled={!meta.has_next_page}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
