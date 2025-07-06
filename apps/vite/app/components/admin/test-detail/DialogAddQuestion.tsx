import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useQuestionDialogStore } from "~/stores/use-question-dialog-store";
import { useQuestions } from "~/hooks/use-questions";
import { useTests } from "~/hooks/use-tests";

// Question form schema
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
  time_limit: z.number().min(1, "Waktu minimal 1 detik").optional(),
  image_url: z
    .string()
    .url("URL gambar tidak valid")
    .optional()
    .or(z.literal("")),
  audio_url: z
    .string()
    .url("URL audio tidak valid")
    .optional()
    .or(z.literal("")),
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

// Question type labels
const QUESTION_TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Pilihan Ganda", icon: "📝" },
  { value: "true_false", label: "Benar/Salah", icon: "✅" },
  { value: "text", label: "Esai", icon: "📄" },
  { value: "rating_scale", label: "Skala Rating", icon: "⭐" },
  { value: "drawing", label: "Gambar", icon: "🎨" },
  { value: "sequence", label: "Urutan", icon: "🔢" },
  { value: "matrix", label: "Matriks", icon: "📊" },
] as const;

// Helper function to clean data - remove null, undefined, and empty strings
const cleanData = (obj: any): any => {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip null, undefined, empty strings, and NaN values
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && isNaN(value))
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      // Only include non-empty arrays
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

export function DialogAddQuestion() {
  const { isOpen, testId, editQuestionId, mode, closeDialog } =
    useQuestionDialogStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API hooks
  const {
    useCreateQuestion,
    useUpdateQuestion,
    useGetQuestionById,
    useGetQuestionStats,
  } = useQuestions();
  const { useGetTestById } = useTests();
  const createQuestionMutation = useCreateQuestion(testId || "");
  const updateQuestionMutation = useUpdateQuestion(testId || "");
  const editQuestionQuery = useGetQuestionById(
    testId || "",
    editQuestionId || ""
  );

  const { data: questionStats } = useGetQuestionStats(testId || "");
  const { data: testData } = useGetTestById(testId || "");
  const total_questions = Number(questionStats?.data?.total_questions) || 0;
  const testDefaultTimeLimit = testData?.data?.default_question_time_limit || 60;

  // Calculate next sequence number
  const nextSequence =
    mode === "create"
      ? (total_questions || 0) + 1
      : editQuestionQuery.data?.data?.sequence || 1;

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
      question_type: "multiple_choice",
      options: [
        { value: "A", label: "", score: 0 },
        { value: "B", label: "", score: 0 },
      ],
      correct_answer: "",
      is_required: true,
      sequence: nextSequence,
      time_limit: testDefaultTimeLimit,
      sequence_items: [],
    },
  });

  // Field arrays for dynamic options
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

  const watchedQuestionType = watch("question_type");

  // Check if current question type supports media (image/audio)
  const supportsMedia = (type: string) => {
    return ["multiple_choice", "true_false", "text", "matrix"].includes(type);
  };

  // Update option values when option fields change
  useEffect(() => {
    optionFields.forEach((field, index) => {
      const newValue = String.fromCharCode(65 + index);
      setValue(`options.${index}.value`, newValue);
    });
  }, [optionFields.length, setValue]);

  // Load edit data
  useEffect(() => {
    if (mode === "edit" && editQuestionQuery.data?.data) {
      const question = editQuestionQuery.data.data;
      reset({
        question: question.question,
        question_type: question.question_type,
        options: question.options || [],
        correct_answer: question.correct_answer || "",
        sequence: question.sequence,
        time_limit: question.time_limit || testDefaultTimeLimit,
        image_url: question.image_url || "",
        audio_url: question.audio_url || "",
        is_required: question.is_required,
      });
    }
  }, [editQuestionQuery.data, mode, reset]);

  // Auto-set sequence number for create mode
  useEffect(() => {
    if (mode === "create" && questionStats?.data) {
      const autoSequence = total_questions + 1;
      setValue("sequence", autoSequence);
    }
  }, [total_questions, mode, setValue]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    } else if (mode === "create") {
      // Set the auto sequence when dialog opens for create mode
      const autoSequence = total_questions + 1;
      setValue("sequence", autoSequence);
    }
  }, [isOpen, reset, mode, total_questions, setValue]);

  // Handle question type change
  const handleQuestionTypeChange = (type: string) => {
    setValue("question_type", type as any);

    // Clear all fields first
    setValue("options", []);
    setValue("correct_answer", "");
    setValue("sequence_items", []);
    setValue("rating_min", undefined);
    setValue("rating_max", undefined);
    setValue("rating_min_label", "");
    setValue("rating_max_label", "");

    // Set specific fields for each question type
    switch (type) {
      case "multiple_choice":
        setValue("options", [
          { value: "A", label: "", score: 0 },
          { value: "B", label: "", score: 0 },
        ]);
        break;
      case "true_false":
        // No need to set options here, will be handled in submission
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
      case "text":
      case "drawing":
      case "matrix":
        // These types don't need specific setup
        break;
    }
  };

  // Submit handler
  const onSubmit = async (data: QuestionFormData) => {
    if (!testId) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      mode === "create" ? "Menambahkan soal..." : "Memperbarui soal..."
    );

    try {
      // Base submission data - always required
      let submissionData: any = {
        test_id: testId,
        question: data.question,
        question_type: data.question_type,
        is_required: data.is_required,
      };

      // Add sequence if provided and valid
      if (data.sequence && data.sequence > 0) {
        submissionData.sequence = data.sequence;
      }

      // Add time_limit - use provided value or fall back to test default
      if (data.time_limit && data.time_limit > 0) {
        submissionData.time_limit = data.time_limit;
      } else {
        // Don't send time_limit to let backend use test's default_question_time_limit
        // submissionData.time_limit = testDefaultTimeLimit;
      }

      // Handle type-specific data
      switch (data.question_type) {
        case "multiple_choice":
          // Add media URLs if provided and supported
          if (data.image_url && data.image_url.trim() !== "") {
            submissionData.image_url = data.image_url;
          }
          if (data.audio_url && data.audio_url.trim() !== "") {
            submissionData.audio_url = data.audio_url;
          }

          // Add options if provided
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

          // Add correct answer if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "true_false":
          // Add media URLs if provided and supported
          if (data.image_url && data.image_url.trim() !== "") {
            submissionData.image_url = data.image_url;
          }
          if (data.audio_url && data.audio_url.trim() !== "") {
            submissionData.audio_url = data.audio_url;
          }

          // Always include true/false options
          submissionData.options = [
            { value: "true", label: "Benar" },
            { value: "false", label: "Salah" },
          ];

          // Add correct answer if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "rating_scale":
          const min = data.rating_min || 1;
          const max = data.rating_max || 5;

          // Generate rating scale options
          submissionData.options = Array.from(
            { length: max - min + 1 },
            (_, i) => {
              const currentValue = min + i;
              return {
                value: String(currentValue),
                label:
                  i === 0 && data.rating_min_label
                    ? data.rating_min_label
                    : i === max - min && data.rating_max_label
                      ? data.rating_max_label
                      : String(currentValue),
                score: currentValue,
              };
            }
          );

          // Create scoring key for rating scale
          const scoringKey: Record<string, number> = {};
          for (let i = min; i <= max; i++) {
            scoringKey[String(i)] = i;
          }
          submissionData.scoring_key = scoringKey;
          break;

        case "sequence":
          // Add sequence items if provided
          if (data.sequence_items && data.sequence_items.length > 0) {
            const validItems = data.sequence_items.filter(
              (item) => item && item.trim() !== ""
            );
            if (validItems.length > 0) {
              submissionData.options = validItems.map((item, index) => ({
                value: String(index + 1),
                label: item,
              }));
            }
          }

          // Add correct answer if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "text":
          // Add media URLs if provided and supported
          if (data.image_url && data.image_url.trim() !== "") {
            submissionData.image_url = data.image_url;
          }
          if (data.audio_url && data.audio_url.trim() !== "") {
            submissionData.audio_url = data.audio_url;
          }

          // Add criteria if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "drawing":
          // Add criteria if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;

        case "matrix":
          // Add media URLs if provided and supported
          if (data.image_url && data.image_url.trim() !== "") {
            submissionData.image_url = data.image_url;
          }
          if (data.audio_url && data.audio_url.trim() !== "") {
            submissionData.audio_url = data.audio_url;
          }

          // Add criteria if provided
          if (data.correct_answer && data.correct_answer.trim() !== "") {
            submissionData.correct_answer = data.correct_answer;
          }
          break;
      }

      console.log("Final submission data:", submissionData);

      // Call API
      if (mode === "create") {
        await createQuestionMutation.mutateAsync(submissionData);
      } else if (editQuestionId) {
        await updateQuestionMutation.mutateAsync({
          questionId: editQuestionId,
          data: submissionData,
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

  // Add option for multiple choice
  const addOption = () => {
    const nextLetter = String.fromCharCode(65 + optionFields.length);
    appendOption({ value: nextLetter, label: "", score: 0 });
  };

  // Add sequence item
  const addSequenceItem = () => {
    appendSequenceItem(`Item ${sequenceFields.length + 1}` as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent
        className="max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "64rem", width: "90vw" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <>
                <Plus className="h-5 w-5" />
                Tambah Soal Baru
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Edit Soal
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Buat soal baru untuk tes ini. Pilih jenis soal dan isi detail sesuai kebutuhan."
              : "Edit soal yang sudah ada. Pastikan perubahan sudah sesuai dengan kebutuhan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Question Type Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Jenis Soal</Label>
            <Controller
              name="question_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={handleQuestionTypeChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis soal" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.question_type && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.question_type.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Basic Question Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
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

            <div>
              <Label htmlFor="sequence" className="text-sm font-medium">
                Urutan Soal (Otomatis)
              </Label>
              <Input
                id="sequence"
                type="number"
                min="1"
                placeholder="1"
                disabled={true}
                value={watch("sequence") || ""}
                readOnly
                className="bg-muted cursor-not-allowed"
                {...register("sequence", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Urutan akan diatur otomatis berdasarkan jumlah soal yang ada
              </p>
            </div>

            <div>
              <Label htmlFor="time_limit" className="text-sm font-medium">
                Batas Waktu (detik)
              </Label>
              <Input
                id="time_limit"
                type="number"
                min="10"
                max="600"
                placeholder={testDefaultTimeLimit.toString()}
                disabled={isSubmitting}
                {...register("time_limit", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: {testDefaultTimeLimit} detik (dari pengaturan tes). Kosongkan untuk menggunakan default.
              </p>
            </div>

            {/* Media fields - only show for supported question types */}
            {supportsMedia(watchedQuestionType) && (
              <>
                <div>
                  <Label htmlFor="image_url" className="text-sm font-medium">
                    URL Gambar - Opsional
                  </Label>
                  <Input
                    id="image_url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    disabled={isSubmitting}
                    {...register("image_url")}
                  />
                </div>

                <div>
                  <Label htmlFor="audio_url" className="text-sm font-medium">
                    URL Audio - Opsional
                  </Label>
                  <Input
                    id="audio_url"
                    type="url"
                    placeholder="https://example.com/audio.mp3"
                    disabled={isSubmitting}
                    {...register("audio_url")}
                  />
                </div>
              </>
            )}
          </div>

          {/* Question Type Specific Fields */}
          {watchedQuestionType === "multiple_choice" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Pilihan Jawaban
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={isSubmitting || optionFields.length >= 8}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pilihan
                </Button>
              </div>

              <div className="space-y-3">
                {optionFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <Controller
                      name="correct_answer"
                      control={control}
                      render={({ field: radioField }) => (
                        <input
                          type="radio"
                          name="correct_answer"
                          value={String.fromCharCode(65 + index)}
                          checked={
                            radioField.value === String.fromCharCode(65 + index)
                          }
                          onChange={(e) => radioField.onChange(e.target.value)}
                          disabled={isSubmitting}
                          className="w-4 h-4"
                        />
                      )}
                    />
                    <Badge
                      variant="outline"
                      className="min-w-[40px] justify-center"
                    >
                      {String.fromCharCode(65 + index)}
                    </Badge>
                    <input
                      type="hidden"
                      {...register(`options.${index}.value`)}
                      value={String.fromCharCode(65 + index)}
                    />
                    <Input
                      placeholder="Teks pilihan jawaban"
                      disabled={isSubmitting}
                      {...register(`options.${index}.label`)}
                      className="flex-1"
                    />
                    {optionFields.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                        disabled={isSubmitting}
                        className="px-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {watchedQuestionType === "true_false" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Jawaban Benar/Salah
              </Label>
              <Controller
                name="correct_answer"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jawaban yang benar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Benar</SelectItem>
                      <SelectItem value="false">Salah</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {watchedQuestionType === "rating_scale" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Pengaturan Skala Rating
              </Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="rating_min">Nilai Minimum</Label>
                  <Input
                    id="rating_min"
                    type="number"
                    min="1"
                    placeholder="1"
                    disabled={isSubmitting}
                    {...register("rating_min", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="rating_max">Nilai Maksimum</Label>
                  <Input
                    id="rating_max"
                    type="number"
                    min="2"
                    placeholder="5"
                    disabled={isSubmitting}
                    {...register("rating_max", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="rating_min_label">Label Minimum</Label>
                  <Input
                    id="rating_min_label"
                    placeholder="Sangat Tidak Setuju"
                    disabled={isSubmitting}
                    {...register("rating_min_label")}
                  />
                </div>
                <div>
                  <Label htmlFor="rating_max_label">Label Maksimum</Label>
                  <Input
                    id="rating_max_label"
                    placeholder="Sangat Setuju"
                    disabled={isSubmitting}
                    {...register("rating_max_label")}
                  />
                </div>
              </div>
            </div>
          )}

          {watchedQuestionType === "sequence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Item Urutan</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSequenceItem}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </Button>
              </div>

              <div className="space-y-3">
                {sequenceFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className="min-w-[40px] justify-center"
                    >
                      {index + 1}
                    </Badge>
                    <Input
                      placeholder="Teks item urutan"
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
            </div>
          )}

          {watchedQuestionType === "text" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Pengaturan Esai</Label>
              <div>
                <Label htmlFor="correct_answer" className="text-sm font-medium">
                  Kriteria Penilaian (opsional)
                </Label>
                <Textarea
                  id="correct_answer"
                  placeholder="Kriteria atau kunci jawaban untuk penilaian..."
                  disabled={isSubmitting}
                  {...register("correct_answer")}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {watchedQuestionType === "drawing" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Pengaturan Gambar
              </Label>
              <div>
                <Label htmlFor="correct_answer" className="text-sm font-medium">
                  Kriteria Penilaian (opsional)
                </Label>
                <Textarea
                  id="correct_answer"
                  placeholder="Kriteria penilaian untuk hasil gambar..."
                  disabled={isSubmitting}
                  {...register("correct_answer")}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {watchedQuestionType === "matrix" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Pengaturan Matriks
              </Label>
              <p className="text-sm text-muted-foreground">
                Soal matriks akan menyediakan grid untuk peserta mengisi
                jawaban. Fitur ini akan dikembangkan lebih lanjut.
              </p>
              <div>
                <Label htmlFor="correct_answer" className="text-sm font-medium">
                  Kriteria Penilaian (opsional)
                </Label>
                <Textarea
                  id="correct_answer"
                  placeholder="Kriteria penilaian untuk soal matriks..."
                  disabled={isSubmitting}
                  {...register("correct_answer")}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Question Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Pengaturan Soal</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="is_required">Soal Wajib</Label>
                <p className="text-sm text-muted-foreground">
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "create" ? "Menambahkan..." : "Memperbarui..."}
                </>
              ) : (
                <>
                  {mode === "create" ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Soal
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
