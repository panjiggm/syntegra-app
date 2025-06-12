import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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

// Icons
import {
  ClockIcon,
  Plus,
  Trash2,
  GripVertical,
  Info,
  Settings,
  BookOpen,
} from "lucide-react";

// Hooks and Stores
import { useSessionDialogStore } from "~/stores/use-session-dialog-store";
import { useSessions } from "~/hooks/use-sessions";

// Validation
import {
  createSessionSchema,
  createSessionDefaultValues,
  targetPositionOptions,
  type CreateSessionFormData,
} from "~/lib/validations/session";
import Calendar20 from "~/components/calendar-20";

export const DialogCreateSession = () => {
  const { isOpen, mode, editSessionId, closeDialog } = useSessionDialogStore();

  const [activeTab, setActiveTab] = useState("basic");
  const [isInitializing, setIsInitializing] = useState(false);

  const {
    useCreateSession,
    useUpdateSession,
    useGetSessionById,
    useGetAvailableTests,
    useGetAvailableProctors,
  } = useSessions();

  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();

  // Queries for form data
  const { data: testsData, isLoading: testsLoading } = useGetAvailableTests();
  const { data: proctorsData, isLoading: proctorsLoading } =
    useGetAvailableProctors();
  const { data: editData, isLoading: editLoading } = useGetSessionById(
    editSessionId || ""
  );

  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: createSessionDefaultValues,
  });

  console.log("errors form session : ", form.formState.errors);

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "session_modules",
  });

  // Function to calculate and distribute weights evenly
  const redistributeWeights = (moduleCount?: number) => {
    const currentModules = form.getValues("session_modules");
    const totalModules = moduleCount || currentModules.length;

    if (totalModules === 0) return;

    const totalWeight = 10;
    const baseWeight = Math.floor(totalWeight / totalModules);
    const remainder = totalWeight % totalModules;

    // Update weights for all modules (regardless of whether test_id is selected)
    for (let i = 0; i < totalModules; i++) {
      // For the last modules, add the remainder to distribute 100 exactly
      const weight =
        i >= totalModules - remainder ? baseWeight + 1 : baseWeight;
      form.setValue(`session_modules.${i}.weight`, weight);
    }
  };

  // Watch for changes in session_modules to auto-redistribute weights
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Don't redistribute during initialization to preserve edit data
      if (isInitializing) return;

      // Redistribute weights when test_id is selected/changed (not for add/remove as they have their own handlers)
      if (name?.includes(".test_id") && value.session_modules) {
        const totalModules = value.session_modules.length;
        if (totalModules > 0) {
          redistributeWeights(totalModules);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isInitializing]);

  // Reset form when dialog opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      if (mode === "create") {
        form.reset(createSessionDefaultValues);
        setActiveTab("basic");
      } else if (mode === "edit" && editData) {
        // Populate form with edit data
        const formData: CreateSessionFormData = {
          session_name: editData.session_name,
          session_code: editData.session_code,
          start_time: editData.start_time,
          end_time: editData.end_time,
          target_position: editData.target_position,
          max_participants: editData.max_participants || undefined,
          description: editData.description || "",
          location: editData.location || "",
          proctor_id: "",
          auto_expire: true,
          allow_late_entry: false,
          session_modules:
            editData.session_modules?.map((module, index) => ({
              test_id: module.test_id,
              sequence: index + 1,
              is_required: module.is_required ?? true,
              weight: module.weight || 1,
            })) || [],
        };
        form.reset(formData);
        setActiveTab("basic");
      }
      setTimeout(() => setIsInitializing(false), 100);
    } else {
      form.reset(createSessionDefaultValues);
      setIsInitializing(false);
    }
  }, [isOpen, mode, editData, form]);

  const generateSessionCode = (sessionName: string) => {
    // Generate session code from session name + timestamp
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
      // Transform data for backend compatibility
      const transformedData = {
        ...data,
        // Generate session_code if empty
        session_code:
          data.session_code?.trim() || generateSessionCode(data.session_name),
        // Convert datetime to ISO string with timezone
        start_time: data.start_time
          ? new Date(data.start_time).toISOString()
          : "",
        end_time: data.end_time ? new Date(data.end_time).toISOString() : "",
        // Convert empty strings to null for optional UUID fields
        proctor_id: data.proctor_id?.trim() || undefined,
        // Convert 0 to undefined for max_participants
        max_participants:
          data.max_participants === 0 ? undefined : data.max_participants,
      };

      if (mode === "create") {
        await createSessionMutation.mutateAsync(transformedData);
      } else if (mode === "edit" && editSessionId) {
        await updateSessionMutation.mutateAsync({
          sessionId: editSessionId,
          data: transformedData,
        });
      }
      closeDialog();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error("Submit error:", error);
    }
  };

  const handleAddModule = () => {
    const nextSequence = fields.length + 1;

    append({
      test_id: "",
      sequence: nextSequence,
      is_required: true,
      weight: 1, // Temporary weight, will be redistributed
    });

    // Always redistribute weights after adding a module
    setTimeout(() => {
      redistributeWeights(fields.length + 1);
    }, 0);
  };

  const handleRemoveModule = (index: number) => {
    remove(index);

    // Redistribute weights after removing
    setTimeout(() => {
      redistributeWeights(fields.length - 1);
    }, 0);
  };

  const isLoading =
    createSessionMutation.isPending || updateSessionMutation.isPending;
  const isDataLoading =
    testsLoading || proctorsLoading || (mode === "edit" && editLoading);

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        style={{
          minWidth: "55%",
          width: "100%",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <>
                <Plus className="h-5 w-5" />
                Buat Sesi Psikotes Baru
              </>
            ) : (
              <>
                <Settings className="h-5 w-5" />
                Edit Sesi Psikotes
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="basic"
                    className="flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    Informasi Dasar
                  </TabsTrigger>
                  <TabsTrigger
                    value="timing"
                    className="flex items-center gap-2"
                  >
                    <ClockIcon className="h-4 w-4" />
                    Waktu & Durasi
                  </TabsTrigger>
                  <TabsTrigger
                    value="modules"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Modul Tes
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Pengaturan
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informasi Dasar Sesi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="">
                        <FormField
                          control={form.control}
                          name="session_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama Sesi *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Contoh: Tes Psikologi Batch 1 - Security"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="target_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Posisi Target *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih posisi target" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {targetPositionOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                                  placeholder="Tidak terbatas"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                              </FormControl>
                              <FormDescription>
                                Kosongkan untuk tidak membatasi peserta
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deskripsi</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Deskripsi sesi psikotes..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lokasi</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Contoh: Ruang Meeting Lt. 2"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="proctor_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proktor</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih proktor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {proctorsData?.map((proctor) => (
                                    <SelectItem
                                      key={proctor.id}
                                      value={proctor.id}
                                    >
                                      {proctor.name} ({proctor.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Timing Tab */}
                <TabsContent value="timing" className="space-y-4">
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
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Modul Tes</CardTitle>
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
                    </CardHeader>
                    <CardContent>
                      {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Belum ada modul tes</p>
                          <p className="text-sm">
                            Klik "Tambah Modul" untuk menambahkan tes
                          </p>
                        </div>
                      ) : (
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">
                                  Urutan
                                </TableHead>
                                <TableHead>Tes</TableHead>
                                <TableHead className="w-[120px]">
                                  Bobot
                                </TableHead>
                                <TableHead className="w-[100px]">
                                  Wajib
                                </TableHead>
                                <TableHead className="w-[80px]">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                      <Badge variant="outline">
                                        {index + 1}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`session_modules.${index}.test_id`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Pilih tes" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {testsData?.map((test) => (
                                                <SelectItem
                                                  key={test.id}
                                                  value={test.id}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {test.icon && (
                                                      <span>{test.icon}</span>
                                                    )}
                                                    <span>{test.name}</span>
                                                    <Badge
                                                      variant="secondary"
                                                      className="text-xs"
                                                    >
                                                      {test.module_type}
                                                    </Badge>
                                                    <Badge
                                                      variant="secondary"
                                                      className="text-xs"
                                                    >
                                                      {test.total_questions}{" "}
                                                      Soal
                                                    </Badge>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
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
                                              step="0.1"
                                              min="0.1"
                                              max="10"
                                              disabled
                                              className="w-full"
                                              {...field}
                                              onChange={(e) =>
                                                field.onChange(
                                                  Number(e.target.value)
                                                )
                                              }
                                            />
                                          </FormControl>
                                          <FormMessage />
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
                                      className="text-red-600 hover:text-red-700"
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
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pengaturan Sesi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="auto_expire"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Kadaluarsa Otomatis
                              </FormLabel>
                              <FormDescription>
                                Sesi akan otomatis berakhir pada waktu yang
                                telah ditentukan
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="allow_late_entry"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Izinkan Masuk Terlambat
                              </FormLabel>
                              <FormDescription>
                                Peserta dapat bergabung setelah sesi dimulai
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                  {mode === "create" ? "Buat Sesi" : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
