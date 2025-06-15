import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";

// UI Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Alert, AlertDescription } from "~/components/ui/alert";

// Icons
import {
  ClockIcon,
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  Check,
  ChevronsUpDown,
  ArrowLeft,
  Users,
  Calendar,
  Target,
  Zap,
  AlertCircle,
  FileText,
} from "lucide-react";

// Hooks and Stores
import { useSessions } from "~/hooks/use-sessions";
import { useAuth } from "~/contexts/auth-context";

// Validation
import {
  createSessionSchema,
  createSessionDefaultValues,
  targetPositionOptions,
  type CreateSessionFormData,
} from "~/lib/validations/session";
import Calendar20 from "~/components/calendar-20";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { QuestionTypeBadge } from "~/components/question-type-badge";

export function meta() {
  return [
    { title: "Buat Sesi Baru - Syntegra Psikotes" },
    { name: "description", content: "Membuat sesi tes psikologi baru" },
  ];
}

export default function AdminSessionsNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openTestSelector, setOpenTestSelector] = useState<number | null>(null);

  const { useCreateSession, useGetAvailableTests } = useSessions();

  const createSessionMutation = useCreateSession();
  const { data: testsData, isLoading: testsLoading } = useGetAvailableTests();

  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      ...createSessionDefaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "session_modules",
  });

  // Function to calculate and distribute weights evenly
  const redistributeWeights = (moduleCount: number) => {
    if (moduleCount === 0) return;

    const evenWeight = Math.round((100 / moduleCount) * 100) / 100;
    const currentModules = form.getValues("session_modules");

    currentModules.forEach((_, index) => {
      form.setValue(`session_modules.${index}.weight`, evenWeight);
    });
  };

  const generateSessionCode = (sessionName: string) => {
    const cleanName = sessionName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(" ")
      .map((word) => word.substring(0, 3).toUpperCase())
      .join("")
      .substring(0, 6);

    const timestamp = Date.now().toString().slice(-4);
    return `${cleanName}${timestamp}`;
  };

  const onSubmit = async (data: CreateSessionFormData) => {
    try {
      if (!user?.id) {
        toast.error("Error: Admin ID tidak tersedia");
        return;
      }

      const transformedData = {
        ...data,
        proctor_id: user.id,
        session_code:
          data.session_code?.trim() || generateSessionCode(data.session_name),
        start_time: data.start_time
          ? new Date(data.start_time).toISOString()
          : "",
        end_time: data.end_time ? new Date(data.end_time).toISOString() : "",
        max_participants:
          data.max_participants === 0 ? undefined : data.max_participants,
      };

      await createSessionMutation.mutateAsync(transformedData);
      toast.success("Sesi psikotes berhasil dibuat!");
      navigate("/admin/sessions");
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const handleAddModule = () => {
    const nextSequence = fields.length + 1;

    append({
      test_id: "",
      sequence: nextSequence,
      is_required: true,
      weight: 1,
    });

    setTimeout(() => {
      redistributeWeights(fields.length + 1);
    }, 0);
  };

  const handleRemoveModule = (index: number) => {
    remove(index);
    setTimeout(() => {
      redistributeWeights(fields.length - 1);
    }, 0);
  };

  const isLoading = createSessionMutation.isPending;

  // Group tests by module type for better organization
  const groupedTests =
    testsData?.reduce(
      (acc, test) => {
        const type = test.module_type || "Lainnya";
        if (!acc[type]) acc[type] = [];
        acc[type].push(test);
        return acc;
      },
      {} as Record<string, typeof testsData>
    ) || {};

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/sessions")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Sesi Psikotes Baru</h1>
          <p className="text-muted-foreground">
            Konfigurasikan sesi tes psikologi untuk kandidat
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Tab */}

              <Card>
                <CardHeader>
                  <CardTitle>Informasi Dasar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="session_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Sesi</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contoh: Psikotes Security Batch 1"
                            {...field}
                          />
                        </FormControl>
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
                            placeholder="Deskripsi sesi psikotes..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posisi Target</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="">Pilih posisi target</option>
                              {targetPositionOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            Pilih posisi target untuk sesi ini
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_participants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maksimal Peserta</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Contoh: 50"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : parseInt(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Kosongkan untuk unlimited
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Timing Tab */}
              <Card>
                <CardHeader>
                  <CardTitle>Waktu & Durasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Calendar20
                        value={form.watch("start_time")}
                        onChange={(value) => form.setValue("start_time", value)}
                        endValue={form.watch("end_time")}
                        onEndChange={(value) =>
                          form.setValue("end_time", value)
                        }
                        label="Pilih Waktu Sesi"
                        endLabel="Waktu Selesai *"
                      />
                      {(form.formState.errors.start_time ||
                        form.formState.errors.end_time) && (
                        <div className="mt-2 space-y-1">
                          {form.formState.errors.start_time && (
                            <p className="text-sm text-red-500">
                              {form.formState.errors.start_time.message}
                            </p>
                          )}
                          {form.formState.errors.end_time && (
                            <p className="text-sm text-red-500">
                              {form.formState.errors.end_time.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show validation errors for timing */}
                  {(form.formState.errors.start_time ||
                    form.formState.errors.end_time) && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {form.formState.errors.start_time?.message ||
                          form.formState.errors.end_time?.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Modules Tab */}
              <Card>
                <CardHeader>
                  <CardTitle>Modul Tes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Modul Tes</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddModule}
                      disabled={!testsData || testsData.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Modul
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">Belum ada modul tes</p>
                      <p className="text-sm">
                        Klik "Tambah Modul" untuk menambahkan tes
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Urutan</TableHead>
                            <TableHead>Tes</TableHead>
                            <TableHead className="w-[120px]">Bobot</TableHead>
                            <TableHead className="w-[100px]">Wajib</TableHead>
                            <TableHead className="w-[80px]">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                  <Badge variant="outline">{index + 1}</Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`session_modules.${index}.test_id`}
                                  render={({ field }) => (
                                    <FormItem className="w-full">
                                      <Popover
                                        open={openTestSelector === index}
                                        onOpenChange={(open) =>
                                          setOpenTestSelector(
                                            open ? index : null
                                          )
                                        }
                                      >
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              className={cn(
                                                "w-full justify-between",
                                                !field.value &&
                                                  "text-muted-foreground"
                                              )}
                                            >
                                              {field.value
                                                ? testsData?.find(
                                                    (test) =>
                                                      test.id === field.value
                                                  )?.name
                                                : "Pilih tes..."}
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0">
                                          <Command>
                                            <CommandInput placeholder="Cari tes..." />
                                            <CommandEmpty>
                                              Tes tidak ditemukan.
                                            </CommandEmpty>
                                            <CommandList>
                                              {Object.entries(groupedTests).map(
                                                ([moduleType, tests]) => (
                                                  <CommandGroup
                                                    key={moduleType}
                                                    heading={moduleType}
                                                  >
                                                    {tests.map((test) => (
                                                      <CommandItem
                                                        key={test.id}
                                                        value={test.name}
                                                        onSelect={() => {
                                                          field.onChange(
                                                            test.id
                                                          );
                                                          setOpenTestSelector(
                                                            null
                                                          );
                                                        }}
                                                      >
                                                        <Check
                                                          className={cn(
                                                            "mr-2 h-4 w-4",
                                                            field.value ===
                                                              test.id
                                                              ? "opacity-100"
                                                              : "opacity-0"
                                                          )}
                                                        />
                                                        <div className="flex items-center gap-2 flex-1">
                                                          {test.icon && (
                                                            <span>
                                                              {test.icon}
                                                            </span>
                                                          )}
                                                          <div>
                                                            <div className="font-medium">
                                                              {test.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                              <Badge
                                                                variant="outline"
                                                                className="flex items-center gap-2"
                                                              >
                                                                <FileText className="h-4 w-4" />
                                                                {
                                                                  test.total_questions
                                                                }{" "}
                                                                Soal
                                                              </Badge>
                                                              <QuestionTypeBadge
                                                                questionType={
                                                                  (test as any)
                                                                    .question_type ||
                                                                  "multiple_choice"
                                                                }
                                                              />
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </CommandItem>
                                                    ))}
                                                  </CommandGroup>
                                                )
                                              )}
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`session_modules.${index}.weight`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          className="w-20"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`session_modules.${index}.is_required`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveModule(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Card>
                <CardContent>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/admin/sessions")}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && (
                        <LoadingSpinner size="sm" className="mr-2" />
                      )}
                      Buat Sesi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        {/* Right Side - Tips Cards */}
        <div className="space-y-4">
          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Security:</strong> WAIS, MBTI, Wartegg, Holland
                  (RIASEC)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Staff:</strong> Kraepelin, Big Five, PAPI Kostick, DAP
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-purple-500 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Manager:</strong> Raven's, EPPS, Army Alpha, HTP
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Manajemen Waktu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Durasi optimal:</strong> 2-3 jam untuk sesi lengkap
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Buffer time:</strong> Tambahkan 15-30 menit untuk
                  persiapan
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Contoh Sesi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900">
                  Sesi Security (08:00-10:00)
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  4 modul tes dengan fokus pada keamanan dan kepribadian
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-900">
                  Sesi Staff (12:00-14:00)
                </div>
                <div className="text-xs text-green-700 mt-1">
                  4 modul tes dengan fokus pada kemampuan analitis
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-900">
                  Sesi Manager (08:00-10:00)
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  4 modul tes dengan fokus pada kepemimpinan
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
