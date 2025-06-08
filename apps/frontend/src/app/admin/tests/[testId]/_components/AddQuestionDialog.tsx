// apps/frontend/src/app/admin/tests/[testId]/components/AddQuestionDialog.tsx
"use client";

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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  Image,
  Volume2,
  Timer,
  Hash,
  AlertCircle,
  CheckCircle,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useQuestionDialogStore } from "@/stores/useQuestionDialogStore";
import { useQuestions } from "@/hooks/useQuestions";

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

export function AddQuestionDialog() {
  const { isOpen, testId, editQuestionId, mode, closeDialog } =
    useQuestionDialogStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API hooks
  const { useCreateQuestion, useUpdateQuestion, useGetQuestionById } =
    useQuestions();
  const createQuestionMutation = useCreateQuestion(testId || "");
  const updateQuestionMutation = useUpdateQuestion(testId || "");
  const editQuestionQuery = useGetQuestionById(
    testId || "",
    editQuestionId || ""
  );

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
      sequence: 1,
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
        time_limit: question.time_limit,
        image_url: question.image_url || "",
        audio_url: question.audio_url || "",
        is_required: question.is_required,
        // Add other fields as needed
      });
    }
  }, [editQuestionQuery.data, mode, reset]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  // Handle question type change
  const handleQuestionTypeChange = (type: string) => {
    setValue("question_type", type as any);

    // Reset type-specific fields dengan scoring 0/1
    switch (type) {
      case "multiple_choice":
        setValue("options", [
          { value: "A", label: "", score: 0 },
          { value: "B", label: "", score: 0 },
        ]);
        break;
      case "true_false":
        setValue("options", [
          { value: "true", label: "Benar", score: 1 },
          { value: "false", label: "Salah", score: 0 },
        ]);
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

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      mode === "create" ? "Menambahkan soal..." : "Memperbarui soal...",
      {
        description: "Mohon tunggu, kami sedang memproses permintaan Anda",
      }
    );

    try {
      // Prepare submission data
      const submissionData = {
        question: data.question,
        question_type: data.question_type,
        is_required: data.is_required,
        sequence: data.sequence,
        time_limit: data.time_limit,
        image_url: data.image_url || undefined,
        audio_url: data.audio_url || undefined,
        correct_answer: data.correct_answer || undefined,
        options: undefined as any,
        scoring_key: undefined as any,
      };

      // Handle type-specific data
      switch (data.question_type) {
        case "multiple_choice":
        case "true_false":
          submissionData.options = data.options?.map((option) => ({
            ...option,
            score: data.correct_answer === option.value ? 1 : 0,
          }));
          break;
        case "rating_scale":
          submissionData.options = Array.from(
            { length: (data.rating_max || 5) - (data.rating_min || 1) + 1 },
            (_, i) => {
              const currentValue = (data.rating_min || 1) + i;
              const isCorrectAnswer =
                data.correct_answer === String(currentValue);

              return {
                value: String(currentValue),
                label:
                  i === 0
                    ? data.rating_min_label || String(currentValue)
                    : i === (data.rating_max || 5) - (data.rating_min || 1)
                      ? data.rating_max_label || String(currentValue)
                      : String(currentValue),
                score: isCorrectAnswer ? 1 : 0, // 1 untuk benar, 0 untuk salah
              };
            }
          );
          break;
        case "sequence":
          submissionData.options = data.sequence_items?.map((item, index) => {
            const isCorrectAnswer = data.correct_answer === String(index + 1);
            return {
              value: String(index + 1),
              label: item,
              score: isCorrectAnswer ? 1 : 0, // 1 untuk urutan benar, 0 untuk salah
            };
          });
          break;
      }

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
          : "Soal berhasil diperbarui!",
        {
          description: `Soal "${data.question.substring(0, 50)}..." telah ${mode === "create" ? "ditambahkan" : "diperbarui"}`,
          duration: 4000,
        }
      );

      closeDialog();
      reset();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(
        mode === "create" ? "Gagal menambahkan soal" : "Gagal memperbarui soal",
        {
          description:
            error.message || "Terjadi kesalahan saat memproses permintaan",
          duration: 5000,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add option for multiple choice
  const addOption = () => {
    const nextLetter = String.fromCharCode(65 + optionFields.length);
    appendOption({ value: nextLetter, label: "", score: 0 }); // Default score 0
  };

  // Update option values when options change
  const updateOptionValues = () => {
    optionFields.forEach((field, index) => {
      const newValue = String.fromCharCode(65 + index);
      setValue(`options.${index}.value`, newValue);
    });
  };

  // Add sequence item
  const addSequenceItem = () => {
    appendSequenceItem(`Item ${sequenceFields.length + 1}` as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                Urutan Soal
              </Label>
              <Input
                id="sequence"
                type="number"
                min="1"
                placeholder="1"
                disabled={isSubmitting}
                {...register("sequence", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="time_limit" className="text-sm font-medium">
                Batas Waktu (detik)
              </Label>
              <Input
                id="time_limit"
                type="number"
                min="1"
                placeholder="60"
                disabled={isSubmitting}
                {...register("time_limit", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="image_url" className="text-sm font-medium">
                URL Gambar
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
                URL Audio
              </Label>
              <Input
                id="audio_url"
                type="url"
                placeholder="https://example.com/audio.mp3"
                disabled={isSubmitting}
                {...register("audio_url")}
              />
            </div>
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
              <p className="text-sm text-muted-foreground">
                Untuk skala rating, sistem akan otomatis membuat pilihan 1-5
                dengan scoring 0/1. Anda dapat menentukan jawaban yang benar di
                field "Jawaban Benar".
              </p>
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
              <p className="text-sm text-muted-foreground">
                Soal esai akan menggunakan textarea untuk input jawaban peserta.
                Anda dapat menambahkan kriteria penilaian di field jawaban
                benar.
              </p>
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
              <p className="text-sm text-muted-foreground">
                Soal gambar akan menyediakan canvas untuk peserta menggambar.
                Anda dapat menentukan kriteria penilaian hasil gambar.
              </p>
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
