import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  Flag,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useTestAttempt, type TestAttempt } from "~/hooks/use-test-attempt";

interface TestInterfaceProps {
  attempt: TestAttempt;
  onTestComplete: () => void;
}

export function TestInterface({ attempt, onTestComplete }: TestInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(
    attempt.attempt_info.time_remaining
  );
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { useSubmitAnswer, useAutoSave, useFinishAttempt } = useTestAttempt();

  const submitAnswerMutation = useSubmitAnswer();
  const autoSaveMutation = useAutoSave();
  const finishAttemptMutation = useFinishAttempt();

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const progress =
    ((currentQuestionIndex + 1) / attempt.questions.length) * 100;

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-finish when time runs out
          finishAttemptMutation.mutate({
            attemptId: attempt.attempt_id,
            forceFinish: true,
          });
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt.attempt_id, finishAttemptMutation]);

  // Auto-save on answer change
  useEffect(() => {
    const currentAnswer = answers[currentQuestion.id];
    if (currentAnswer) {
      // Clear previous timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        setIsAutoSaving(true);
        autoSaveMutation.mutate(
          {
            attemptId: attempt.attempt_id,
            data: {
              question_id: currentQuestion.id,
              answer: currentAnswer,
              time_taken: 30, // Could track actual time
            },
          },
          {
            onSettled: () => setIsAutoSaving(false),
          }
        );
      }, 2000); // Auto-save after 2 seconds of no changes
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [answers, currentQuestion.id, attempt.attempt_id, autoSaveMutation]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSaveAnswer = () => {
    const answer = answers[currentQuestion.id];
    if (answer) {
      submitAnswerMutation.mutate({
        attemptId: attempt.attempt_id,
        data: {
          question_id: currentQuestion.id,
          answer,
          time_taken: 60, // Track actual time taken
        },
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < attempt.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleFinishTest = () => {
    finishAttemptMutation.mutate(
      {
        attemptId: attempt.attempt_id,
      },
      {
        onSuccess: () => {
          onTestComplete();
        },
      }
    );
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const renderQuestion = () => {
    const currentAnswer = answers[currentQuestion.id] || "";

    switch (currentQuestion.question_type) {
      case "multiple_choice":
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) =>
              handleAnswerChange(currentQuestion.id, value)
            }
            className="space-y-3"
          >
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "true_false":
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) =>
              handleAnswerChange(currentQuestion.id, value)
            }
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">
                Benar
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">
                Salah
              </Label>
            </div>
          </RadioGroup>
        );

      case "text":
        return (
          <Textarea
            placeholder="Tulis jawaban Anda di sini..."
            value={currentAnswer}
            onChange={(e) =>
              handleAnswerChange(currentQuestion.id, e.target.value)
            }
            className="min-h-32"
          />
        );

      case "rating_scale":
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) =>
              handleAnswerChange(currentQuestion.id, value)
            }
            className="flex space-x-4"
          >
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <RadioGroupItem value={option.value} id={`rating-${index}`} />
                <Label
                  htmlFor={`rating-${index}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return (
          <p className="text-muted-foreground">
            Tipe soal ini belum didukung: {currentQuestion.question_type}
          </p>
        );
    }
  };

  const isLastQuestion = currentQuestionIndex === attempt.questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {attempt.test_info.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Soal {currentQuestionIndex + 1} dari {attempt.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isAutoSaving && (
                <Badge variant="outline" className="bg-blue-50">
                  <Save className="h-3 w-3 mr-1 animate-pulse" />
                  Menyimpan...
                </Badge>
              )}
              <Badge
                variant={timeRemaining < 300 ? "destructive" : "outline"}
                className="flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Badge variant="outline">{currentQuestionIndex + 1}</Badge>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-4">
                {currentQuestion.question}
              </h3>
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question image"
                  className="max-w-full h-auto rounded-lg mb-4"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderQuestion()}</CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                onClick={handleSaveAnswer}
                disabled={
                  !answers[currentQuestion.id] || submitAnswerMutation.isPending
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan Jawaban
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{attempt.questions.length} terjawab
              </span>

              {isLastQuestion ? (
                <Button
                  onClick={handleFinishTest}
                  disabled={finishAttemptMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Selesaikan Test
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  disabled={
                    currentQuestionIndex === attempt.questions.length - 1
                  }
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning for low time */}
      {timeRemaining < 300 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Perhatian: Waktu tersisa kurang dari 5 menit!
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
