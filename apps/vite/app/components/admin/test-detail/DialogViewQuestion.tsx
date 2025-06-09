import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Clock,
  Image,
  Volume2,
  CheckCircle,
  XCircle,
  Hash,
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { useQuestionDialogStore } from "~/stores/use-question-dialog-store";
import { useQuestions } from "~/hooks/use-questions";
import { useParams } from "react-router";

// Question type labels
const QUESTION_TYPE_LABELS = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar/Salah",
  text: "Esai",
  rating_scale: "Skala Rating",
  drawing: "Gambar",
  sequence: "Urutan",
  matrix: "Matriks",
} as const;

// Question type badge component
const QuestionTypeBadge = ({
  type,
}: {
  type: keyof typeof QUESTION_TYPE_LABELS;
}) => {
  const variants = {
    multiple_choice: "bg-blue-100 text-blue-700",
    true_false: "bg-green-100 text-green-700",
    text: "bg-purple-100 text-purple-700",
    rating_scale: "bg-orange-100 text-orange-700",
    drawing: "bg-pink-100 text-pink-700",
    sequence: "bg-cyan-100 text-cyan-700",
    matrix: "bg-indigo-100 text-indigo-700",
  };

  return (
    <Badge className={variants[type]} variant="secondary">
      {QUESTION_TYPE_LABELS[type]}
    </Badge>
  );
};

export function DialogViewQuestion() {
  const { testId } = useParams() as { testId: string };
  const { isViewQuestionModalOpen, viewQuestionId, closeViewQuestionModal } =
    useQuestionDialogStore();
  const { useGetQuestionById } = useQuestions();

  // Get question data
  const questionQuery = useGetQuestionById(testId, viewQuestionId || "");

  const question = questionQuery.data?.data;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render options based on question type
  const renderOptions = () => {
    if (!question?.options || question.options.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilihan Jawaban</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  question.correct_answer === option.value
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 bg-white border rounded-full text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Value: {option.value}
                    </p>
                  )}
                  {option.score !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Score: {option.score}
                    </p>
                  )}
                </div>
                {question.correct_answer === option.value && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render correct answer for non-multiple choice questions
  const renderCorrectAnswer = () => {
    if (
      !question?.correct_answer ||
      question.question_type === "multiple_choice"
    ) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jawaban Benar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm">{question.correct_answer}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render scoring key
  const renderScoringKey = () => {
    if (
      !question?.scoring_key ||
      Object.keys(question.scoring_key).length === 0
    ) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kunci Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(question.scoring_key).map(([key, score]) => (
              <div
                key={key}
                className="flex items-center justify-between p-2 rounded bg-gray-50"
              >
                <span className="text-sm font-medium">{key}</span>
                <Badge variant="outline">{score} poin</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog
      open={isViewQuestionModalOpen}
      onOpenChange={closeViewQuestionModal}
    >
      <DialogContent className="max-w-4xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detail Soal
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="space-y-6 pr-4">
            {questionQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Memuat detail soal...</p>
                </div>
              </div>
            ) : questionQuery.error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    Gagal Memuat Detail Soal
                  </h3>
                  <p className="text-muted-foreground">
                    {(questionQuery.error as Error)?.message ||
                      "Terjadi kesalahan saat memuat detail soal"}
                  </p>
                </div>
              </div>
            ) : question ? (
              <>
                {/* Question Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                            {question.sequence}
                          </div>
                          <QuestionTypeBadge
                            type={
                              question.question_type as keyof typeof QUESTION_TYPE_LABELS
                            }
                          />
                          {question.is_required ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Wajib
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Opsional
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {question.time_limit && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {question.time_limit}s
                          </Badge>
                        )}
                        {question.image_url && (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            Gambar
                          </Badge>
                        )}
                        {question.audio_url && (
                          <Badge variant="outline" className="text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            Audio
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Pertanyaan
                        </h3>
                        <p className="text-sm leading-relaxed">
                          {question.question}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Media Assets */}
                {(question.image_url || question.audio_url) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Media</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {question.image_url && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Gambar
                          </p>
                          <div className="rounded-lg border overflow-hidden">
                            <img
                              src={question.image_url}
                              alt="Question Image"
                              className="w-full max-w-md h-auto"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling!.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                            <div className="hidden p-4 text-center text-muted-foreground">
                              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                Gambar tidak dapat dimuat
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            URL: {question.image_url}
                          </p>
                        </div>
                      )}

                      {question.audio_url && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Audio
                          </p>
                          <audio
                            controls
                            className="w-full max-w-md"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling!.classList.remove(
                                "hidden"
                              );
                            }}
                          >
                            <source src={question.audio_url} />
                            Browser Anda tidak mendukung pemutaran audio.
                          </audio>
                          <div className="hidden p-4 text-center text-muted-foreground border rounded">
                            <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Audio tidak dapat dimuat</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            URL: {question.audio_url}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Options/Answers */}
                {renderOptions()}
                {renderCorrectAnswer()}
                {renderScoringKey()}

                <Separator />

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Informasi Soal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            ID Soal
                          </p>
                          <p className="text-sm font-mono">{question.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Urutan
                          </p>
                          <p className="text-sm">{question.sequence}</p>
                        </div>
                        {question.time_limit && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Batas Waktu
                            </p>
                            <p className="text-sm">
                              {question.time_limit} detik
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Dibuat
                          </p>
                          <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(question.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Diperbarui
                          </p>
                          <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(question.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
