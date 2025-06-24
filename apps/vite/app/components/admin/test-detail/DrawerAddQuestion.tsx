import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  AlertCircle,
  Lightbulb,
  Clock,
  HelpCircle,
  CheckCircle,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { useQuestionDialogStore } from "~/stores/use-question-dialog-store";
import { useQuestions } from "~/hooks/use-questions";
import {
  getDefaultTimeLimitByQuestionType,
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "~/lib/utils/question";
import { QuestionTypeBadge } from "~/components/question-type-badge";

// Question form schema berdasarkan question_type
const questionSchema = z.object({
  question: z
    .string()
    .min(1, "Pertanyaan tidak boleh kosong")
    .max(1000, "Pertanyaan terlalu panjang"),
  question_type: z.enum([
    "multiple_choice",
    "true_false",
    "text",
    "rating_scale",
    "drawing",
    "sequence",
    "matrix",
  ]),
  options: z
    .array(
      z.object({
        value: z.string().min(1, "Nilai tidak boleh kosong"),
        label: z.string().min(1, "Label tidak boleh kosong"),
        score: z.number().optional(),
      })
    )
    .optional(),
  correct_answer: z.string().optional(),
  sequence: z.number().min(1, "Urutan harus minimal 1").optional(),
  time_limit: z.number().min(0, "Waktu tidak boleh negatif").optional(),
  scoring_key: z.record(z.number()).optional(),
  is_required: z.boolean(),
  // Rating scale specific
  rating_min: z.number().optional(),
  rating_max: z.number().optional(),
  rating_min_label: z.string().optional(),
  rating_max_label: z.string().optional(),
  // Sequence specific
  sequence_items: z.array(z.string()).optional(),
});

type QuestionFormData = z.infer<typeof questionSchema>;

// Tips untuk setiap jenis soal
const QUESTION_TYPE_TIPS = {
  multiple_choice: {
    icon: "📝",
    title: "Tips Soal Pilihan Ganda",
    tips: [
      "Buat minimal 2-5 pilihan jawaban yang masuk akal",
      "Pastikan hanya ada satu jawaban yang paling benar",
      "Hindari pilihan jawaban yang terlalu mirip",
      "Gunakan bahasa yang jelas dan tidak ambigu",
    ],
  },
  true_false: {
    icon: "✅",
    title: "Tips Soal Benar/Salah",
    tips: [
      "Buat pernyataan yang tegas dan tidak ambigu",
      "Hindari kata-kata yang absolut seperti 'selalu' atau 'tidak pernah'",
      "Pastikan pernyataan tidak terlalu panjang",
      "Seimbangkan antara pernyataan benar dan salah",
    ],
  },
  text: {
    icon: "📄",
    title: "Tips Soal Esai",
    tips: [
      "Berikan instruksi yang jelas tentang format jawaban",
      "Tentukan panjang jawaban yang diharapkan",
      "Buat kriteria penilaian yang objektif",
      "Berikan contoh jawaban yang baik jika diperlukan",
    ],
  },
  rating_scale: {
    icon: "⭐",
    title: "Tips Skala Rating",
    tips: [
      "Tentukan skala yang konsisten (1-5, 1-7, dll)",
      "Berikan label yang jelas untuk ujung skala",
      "Hindari bias tengah dengan skala genap jika perlu",
      "Pastikan pernyataan mudah dipahami",
    ],
  },
  drawing: {
    icon: "🎨",
    title: "Tips Soal Gambar",
    tips: [
      "Berikan instruksi gambar yang spesifik dan jelas",
      "Tentukan batas waktu yang cukup untuk menggambar",
      "Siapkan kriteria penilaian yang objektif",
      "Pertimbangkan tingkat kesulitan sesuai peserta",
    ],
  },
  sequence: {
    icon: "🔢",
    title: "Tips Soal Urutan",
    tips: [
      "Pastikan ada urutan logis yang jelas",
      "Berikan minimal 3-7 item untuk diurutkan",
      "Buat instruksi pengurutan yang spesifik",
      "Hindari urutan yang terlalu mudah ditebak",
    ],
  },
  matrix: {
    icon: "📊",
    title: "Tips Soal Matriks",
    tips: [
      "Pastikan pola matriks konsisten dan logis",
      "Berikan contoh cara pengisian jika diperlukan",
      "Sesuaikan tingkat kesulitan dengan target peserta",
      "Buat pilihan jawaban yang menantang namun fair",
    ],
  },
};

// Helper function untuk membersihkan data
const cleanData = (obj: any): any => {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && isNaN(value))
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        cleaned[key] = value;
      }
    } else if (typeof value === "object") {
      const cleanedNested = cleanData(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

export function DrawerAddQuestion() {
  const { isOpen, testId, editQuestionId, mode, closeDialog, currentTest } =
    useQuestionDialogStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCorrectAnswer, setSelectedCorrectAnswer] =
    useState<string>("");

  // API hooks
  const {
    useCreateQuestion,
    useUpdateQuestion,
    useGetQuestionById,
    useGetQuestionStats,
  } = useQuestions();
  const createQuestionMutation = useCreateQuestion(testId || "");
  const updateQuestionMutation = useUpdateQuestion(testId || "");
  const editQuestionQuery = useGetQuestionById(
    testId || "",
    editQuestionId || ""
  );

  const { data: questionStats } = useGetQuestionStats(testId || "");
  const total_questions = Number(questionStats?.data?.total_questions) || 0;

  // Calculate next sequence number
  const nextSequence =
    mode === "create"
      ? (total_questions || 0) + 1
      : editQuestionQuery.data?.data?.sequence || 1;

  // Get question type from current test
  const questionType = currentTest?.question_type || "multiple_choice";

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      question: "",
      question_type: questionType,
      options: [],
      correct_answer: "",
      is_required: true,
      sequence: nextSequence,
      time_limit: getDefaultTimeLimitByQuestionType(questionType),
      sequence_items: [],
    },
  });

  // Field arrays untuk opsi dinamis
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: "options",
  });

  const {
    fields: sequenceFields,
    append: appendSequenceItem,
    remove: removeSequenceItem,
  } = useFieldArray({
    control,
    name: "sequence_items" as any,
  });

  // Update option values otomatis
  useEffect(() => {
    optionFields.forEach((field, index) => {
      const newValue = String.fromCharCode(65 + index);
      setValue(`options.${index}.value`, newValue);
    });
  }, [optionFields.length, setValue]);

  // Load data edit
  useEffect(() => {
    if (mode === "edit" && editQuestionQuery.data?.data) {
      const question = editQuestionQuery.data.data;
      reset({
        question: question.question,
        question_type: question.question_type,
        options: question.options || [],
        correct_answer: question.correct_answer || "",
        sequence: question.sequence,
        time_limit:
          question.time_limit ||
          getDefaultTimeLimitByQuestionType(question.question_type),
        is_required: question.is_required,
      });

      // Set selected correct answer for radio
      if (question.correct_answer) {
        setSelectedCorrectAnswer(question.correct_answer);
      }
    }
  }, [editQuestionQuery.data, mode, reset]);

  // Auto-set sequence number untuk create mode
  useEffect(() => {
    if (mode === "create" && questionStats?.data) {
      const autoSequence = total_questions + 1;
      setValue("sequence", autoSequence);
    }
  }, [total_questions, mode, setValue]);

  // Reset form saat dialog buka/tutup
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedCorrectAnswer("");
    } else if (mode === "create") {
      // Set default values berdasarkan question type
      setValue("question_type", questionType);
      setValue("time_limit", getDefaultTimeLimitByQuestionType(questionType));
      setValue("sequence", total_questions + 1);

      // Setup fields berdasarkan question type
      setupQuestionTypeDefaults(questionType);
    }
  }, [isOpen, reset, mode, total_questions, setValue, questionType]);

  // Setup default fields berdasarkan question type
  const setupQuestionTypeDefaults = (type: string) => {
    // Clear semua fields
    setValue("options", []);
    setValue("correct_answer", "");
    setValue("sequence_items", []);
    setValue("rating_min", undefined);
    setValue("rating_max", undefined);
    setValue("rating_min_label", "");
    setValue("rating_max_label", "");
    setSelectedCorrectAnswer("");

    // Set fields spesifik untuk setiap question type
    switch (type) {
      case "multiple_choice":
        setValue("options", [
          { value: "A", label: "", score: 0 },
          { value: "B", label: "", score: 0 },
        ]);
        break;
      case "true_false":
        // Akan di-handle dalam submission
        break;
      case "rating_scale":
        setValue("rating_min", 1);
        setValue("rating_max", 5);
        setValue("rating_min_label", "Sangat Tidak Setuju");
        setValue("rating_max_label", "Sangat Setuju");
        break;
      case "sequence":
        setValue("sequence_items", ["Item 1", "Item 2"]);
        break;
    }
  };

  // Submit handler
  const onSubmit = async (data: QuestionFormData) => {
    if (!testId) return;

    // Validation for multiple choice questions
    if (questionType === "multiple_choice") {
      if (!selectedCorrectAnswer || selectedCorrectAnswer.trim() === "") {
        toast.error("Pilih jawaban benar terlebih dahulu");
        return;
      }
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      mode === "create" ? "Menambahkan soal..." : "Memperbarui soal..."
    );

    try {
      // Base submission data
      let submissionData: any = {
        test_id: testId,
        question: data.question,
        question_type: questionType, // Gunakan question_type dari test
        is_required: data.is_required,
      };

      // Add sequence dan time_limit
      if (data.sequence && data.sequence > 0) {
        submissionData.sequence = data.sequence;
      }

      if (data.time_limit !== undefined && data.time_limit >= 0) {
        submissionData.time_limit = data.time_limit;
      }

      // Handle data spesifik berdasarkan question type
      switch (questionType) {
        case "multiple_choice":
          if (data.options && data.options.length > 0) {
            const validOptions = data.options.filter(
              (opt) => opt.label && opt.label.trim() !== ""
            );
            if (validOptions.length > 0) {
              submissionData.options = validOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }));
            }
          }

          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "true_false":
          submissionData.options = [
            { value: "true", label: "Benar" },
            { value: "false", label: "Salah" },
          ];

          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "text":
        case "drawing":
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "rating_scale":
          submissionData.options = [];
          for (let i = data.rating_min || 1; i <= (data.rating_max || 5); i++) {
            submissionData.options.push({
              value: i.toString(),
              label: i.toString(),
            });
          }
          break;

        case "sequence":
          if (data.sequence_items && data.sequence_items.length > 0) {
            submissionData.options = data.sequence_items.map((item, index) => ({
              value: (index + 1).toString(),
              label: item,
            }));
          }
          break;

        case "matrix":
          // Matrix akan dikembangkan lebih lanjut
          break;
      }

      // Clean data sebelum submit
      const cleanedData = cleanData(submissionData);

      // Submit berdasarkan mode
      if (mode === "create") {
        await createQuestionMutation.mutateAsync(cleanedData);
      } else {
        await updateQuestionMutation.mutateAsync({
          questionId: editQuestionId!,
          data: cleanedData,
        });
      }

      toast.dismiss(loadingToast);
      toast.success(
        mode === "create"
          ? "Soal berhasil ditambahkan!"
          : "Soal berhasil diperbarui!"
      );

      closeDialog();
      reset();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(
        mode === "create" ? "Gagal menambahkan soal" : "Gagal memperbarui soal"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add option untuk multiple choice
  const addOption = () => {
    const nextLetter = String.fromCharCode(65 + optionFields.length);
    appendOption({ value: nextLetter, label: "", score: 0 });
  };

  // Add sequence item
  const addSequenceItem = () => {
    appendSequenceItem(`Item ${sequenceFields.length + 1}` as any);
  };

  // Handle radio change for correct answer
  const handleCorrectAnswerChange = (optionValue: string) => {
    setSelectedCorrectAnswer(optionValue);

    // Update the form's correct_answer field
    setValue("correct_answer", optionValue);
  };

  // Get current tips
  const currentTips =
    QUESTION_TYPE_TIPS[questionType as keyof typeof QUESTION_TYPE_TIPS];

  return (
    <Sheet open={isOpen} onOpenChange={closeDialog}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6">
          <SheetTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <>
                <Plus className="h-5 w-5" />
                Tambah Soal Baru
              </>
            ) : (
              <>
                <Edit className="h-5 w-5" />
                Edit Soal
              </>
            )}
            <QuestionTypeBadge questionType={questionType} />
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? `Buat soal baru untuk tes "${currentTest?.name}". Jenis soal: ${QUESTION_TYPE_LABELS[questionType as keyof typeof QUESTION_TYPE_LABELS]}`
              : "Edit soal yang sudah ada. Pastikan perubahan sudah sesuai dengan kebutuhan."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 px-4 pb-4"
          >
            {/* Tips Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <span className="text-lg">{currentTips.icon}</span>
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  {currentTips.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1 text-sm text-blue-700">
                  {currentTips.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 mt-0.5 text-blue-600" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Separator />

            {/* Basic Question Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="question" className="text-base font-semibold">
                  Pertanyaan <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="question"
                  placeholder="Masukkan teks pertanyaan..."
                  className="mt-1 min-h-[100px]"
                  disabled={isSubmitting}
                  {...register("question")}
                />
                {errors.question && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.question.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sequence" className="text-sm font-medium">
                    Urutan Soal
                  </Label>
                  <Input
                    id="sequence"
                    type="number"
                    min="1"
                    disabled
                    {...register("sequence", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Urutan soal otomatis saat soal baru ditambahkan
                  </p>
                  {errors.sequence && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.sequence.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="time_limit"
                    className="text-sm font-medium flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Batas Waktu (detik)
                  </Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min="0"
                    max="3600"
                    disabled={isSubmitting}
                    {...register("time_limit", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: {getDefaultTimeLimitByQuestionType(questionType)}{" "}
                    detik. Set 0 untuk tidak ada batas waktu.
                  </p>
                  {errors.time_limit && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.time_limit.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Soal Wajib</Label>
                  <p className="text-xs text-muted-foreground">
                    Peserta harus menjawab soal ini untuk melanjutkan
                  </p>
                </div>
                <Controller
                  name="is_required"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Question Type Specific Fields */}

            <div className="space-y-4">
              {/* Multiple Choice */}
              {questionType === "multiple_choice" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pilihan Jawaban
                  </Label>
                  <RadioGroup
                    value={selectedCorrectAnswer}
                    onValueChange={handleCorrectAnswerChange}
                    disabled={isSubmitting}
                  >
                    <div className="space-y-3">
                      {optionFields.map((field, index) => {
                        const optionValue = String.fromCharCode(65 + index);
                        const isCorrect = selectedCorrectAnswer === optionValue;
                        return (
                          <div
                            key={field.id}
                            className={`flex gap-3 items-start p-3 border rounded-lg transition-colors ${
                              isCorrect
                                ? "bg-green-50 border-green-200"
                                : "bg-background border-border"
                            }`}
                          >
                            <div className="flex items-center mt-6">
                              <RadioGroupItem
                                value={optionValue}
                                id={`option-${index}`}
                              />
                            </div>
                            <div className="w-16">
                              <Label className="text-xs text-muted-foreground">
                                Nilai
                              </Label>
                              <Input
                                value={optionValue}
                                disabled
                                className="text-center"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">
                                Label Pilihan {index + 1}
                              </Label>
                              <Input
                                placeholder={`Pilihan ${optionValue}`}
                                disabled={isSubmitting}
                                {...register(`options.${index}.label`)}
                              />
                            </div>
                            {optionFields.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeOption(index)}
                                disabled={isSubmitting}
                                className="mt-6 px-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>

                  {optionFields.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addOption}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Pilihan
                    </Button>
                  )}

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">
                      Jawaban Benar Terpilih:
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCorrectAnswer
                        ? selectedCorrectAnswer
                        : "Belum ada jawaban yang dipilih"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pilih radio button di sebelah pilihan untuk menandai
                      sebagai jawaban benar
                    </p>
                  </div>
                </div>
              )}

              {/* True False */}
              {questionType === "true_false" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pengaturan Benar/Salah
                  </Label>
                  <div>
                    <Label className="text-sm font-medium">
                      Jawaban Benar (opsional)
                    </Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      {...register("correct_answer")}
                    >
                      <option value="">Pilih jawaban benar</option>
                      <option value="true">Benar</option>
                      <option value="false">Salah</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tentukan jawaban yang benar untuk scoring otomatis
                    </p>
                  </div>
                </div>
              )}

              {/* Text/Essay */}
              {questionType === "text" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pengaturan Esai
                  </Label>
                  <div>
                    <Label className="text-sm font-medium">
                      Kriteria Penilaian (opsional)
                    </Label>
                    <Textarea
                      placeholder="Kriteria atau kunci jawaban untuk penilaian..."
                      disabled={isSubmitting}
                      {...register("correct_answer")}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Berikan panduan penilaian untuk evaluator
                    </p>
                  </div>
                </div>
              )}

              {/* Rating Scale */}
              {questionType === "rating_scale" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pengaturan Skala Rating
                  </Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">
                        Nilai Minimum
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        disabled={isSubmitting}
                        {...register("rating_min", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Nilai Maksimum
                      </Label>
                      <Input
                        type="number"
                        min="2"
                        max="10"
                        disabled={isSubmitting}
                        {...register("rating_max", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">
                        Label Minimum
                      </Label>
                      <Input
                        placeholder="Sangat Tidak Setuju"
                        disabled={isSubmitting}
                        {...register("rating_min_label")}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Label Maksimum
                      </Label>
                      <Input
                        placeholder="Sangat Setuju"
                        disabled={isSubmitting}
                        {...register("rating_max_label")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Drawing */}
              {questionType === "drawing" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pengaturan Gambar
                  </Label>
                  <div>
                    <Label className="text-sm font-medium">
                      Kriteria Penilaian (opsional)
                    </Label>
                    <Textarea
                      placeholder="Kriteria penilaian untuk hasil gambar..."
                      disabled={isSubmitting}
                      {...register("correct_answer")}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Jelaskan aspek-aspek yang akan dinilai dari gambar
                    </p>
                  </div>
                </div>
              )}

              {/* Sequence */}
              {questionType === "sequence" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Item Urutan</Label>
                  <div className="space-y-3">
                    {sequenceFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-center">
                        <Badge variant="outline" className="px-2 py-1 text-xs">
                          {index + 1}
                        </Badge>
                        <Input
                          placeholder={`Item ${index + 1}`}
                          disabled={isSubmitting}
                          {...register(`sequence_items.${index}`)}
                          className="flex-1"
                        />
                        {sequenceFields.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSequenceItem(index)}
                            disabled={isSubmitting}
                            className="px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSequenceItem}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Item
                  </Button>
                </div>
              )}

              {/* Matrix */}
              {questionType === "matrix" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Pengaturan Matriks
                  </Label>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Soal matriks akan menyediakan grid untuk peserta mengisi
                      jawaban. Fitur ini akan dikembangkan lebih lanjut.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {mode === "create" ? "Simpan Soal" : "Update Soal"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
