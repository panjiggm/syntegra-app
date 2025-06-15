import { type UseFormReturn } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Save, Loader2, Brain, Target, FileText, Palette } from "lucide-react";
import {
  moduleTypeOptions,
  statusOptions,
  type CreateTestFormData,
} from "~/lib/validations/test";
import { Label } from "~/components/ui/label";
import { EmojiPicker } from "~/components/ui/emoji-picker";
import { ColorPicker } from "~/components/ui/color-picker";

interface FormNewTestProps {
  form: UseFormReturn<any>;
  onSubmit: (data: CreateTestFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  watchedModuleType: string | undefined;
  watchedIcon: string | undefined;
  watchedCardColor: string | undefined;
  availableCategories: readonly {
    readonly value: string;
    readonly label: string;
  }[];
}

export function FormNewTest({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  watchedModuleType,
  watchedIcon,
  watchedCardColor,
  availableCategories,
}: FormNewTestProps) {
  console.log("form errors", form.formState.errors);
  console.log("form isValid", form.formState.isValid);
  return (
    <div className="lg:col-span-2 space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Dasar
              </CardTitle>
              <CardDescription>
                Masukkan informasi dasar tentang tes psikotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Tes *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan nama tes psikotes..."
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Nama yang akan ditampilkan pada kandidat dan admin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan tujuan dan cara kerja tes ini..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Deskripsi singkat tentang tes (opsional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Visual Design */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Desain Visual
              </CardTitle>
              <CardDescription>
                Pilih icon dan warna untuk tes ini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Tes</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <EmojiPicker
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1">
                            <Input
                              placeholder="Atau ketik emoji manual..."
                              {...field}
                              disabled={isSubmitting}
                              className="text-center"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Emoji yang akan ditampilkan pada card tes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="card_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warna Tema</FormLabel>
                      <FormControl>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Warna yang akan ditampilkan pada card tes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview */}
              {(watchedIcon || watchedCardColor) && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Preview Card
                  </Label>
                  <div className="w-full max-w-sm">
                    <div
                      className={`p-4 rounded-lg border transition-all ${
                        watchedCardColor
                          ? `bg-gradient-to-r ${watchedCardColor} text-white`
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {watchedIcon && (
                          <span className="text-2xl">{watchedIcon}</span>
                        )}
                        <div>
                          <h3 className="font-semibold">
                            {form.watch("name") || "Nama Tes"}
                          </h3>
                          <p className="text-sm opacity-90">
                            {form.watch("description") || "Deskripsi tes"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Konfigurasi Tes
              </CardTitle>
              <CardDescription>
                Tentukan tipe, kategori, dan pengaturan tes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="module_type"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Tipe Modul *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih tipe modul" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {moduleTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Klasifikasi utama dari tes psikotes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Kategori *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || !watchedModuleType}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCategories.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {!watchedModuleType
                        ? "Pilih tipe modul terlebih dahulu"
                        : "Kategori spesifik dari tes"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="question_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Soal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih tipe soal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="multiple_choice">
                          Pilihan Ganda
                        </SelectItem>
                        <SelectItem value="true_false">Benar/Salah</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Soal dalam tes menggunakan tipe yang sama
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passing_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skor Kelulusan</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="80"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Skor minimum untuk lulus (0-100)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Tes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
