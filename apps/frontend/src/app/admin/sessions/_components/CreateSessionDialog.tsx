"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSessions } from "@/hooks/useSessions";
import { useUsers } from "@/hooks/useUsers";
import { useSessionStore } from "@/stores/useSessionStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { addHours } from "date-fns";
import { CheckCircle, Loader2, Plus, User } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  COMMON_TARGET_POSITIONS,
  SESSION_DURATION_PRESETS,
} from "shared-types";
import { toast } from "sonner";
import { SessionModuleSelector } from "./SessionModuleSelector";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CreateSessionFormSchema,
  defaultSessionFormValues,
} from "@/lib/validations/session";

export const CreateSessionDialog = () => {
  const {
    isCreateSessionOpen,
    closeCreateSession,
    selectedModules,
    clearModules,
    isFormSubmitting,
    setFormSubmitting,
  } = useSessionStore();

  console.log(
    "CreateSessionDialog - isCreateSessionOpen:",
    isCreateSessionOpen
  );

  const { useCreateSession } = useSessions();
  const { useGetUsers } = useUsers();
  const createSessionMutation = useCreateSession();

  // Get admin users for proctor selection
  const { data: usersResponse } = useGetUsers({
    page: 1,
    limit: 50,
    sort_by: "name",
    sort_order: "asc",
    role: "admin",
    is_active: true,
  });

  const adminUsers = usersResponse?.success ? usersResponse.data : [];

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(CreateSessionFormSchema) as any,
    defaultValues: defaultSessionFormValues,
    mode: "onChange",
  });

  const watchedStartTime = watch("start_time");

  // Auto-set end time when start time changes
  useEffect(() => {
    if (watchedStartTime) {
      const startDate = new Date(watchedStartTime);
      const endDate = addHours(startDate, 4); // Default 4 hours duration
      setValue("end_time", endDate.toISOString().slice(0, 16));
    }
  }, [watchedStartTime, setValue]);

  // Sync selected modules with form
  useEffect(() => {
    setValue("session_modules", selectedModules);
  }, [selectedModules, setValue]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isCreateSessionOpen) {
      reset(defaultSessionFormValues);
      clearModules();
      setFormSubmitting(false);
    }
  }, [isCreateSessionOpen, reset, clearModules, setFormSubmitting]);

  const onSubmit = async (data: any) => {
    try {
      setFormSubmitting(true);

      // Show loading toast
      const loadingToast = toast.loading("Membuat sesi psikotes...", {
        description: "Mohon tunggu, sedang memproses data sesi",
      });

      // Convert form data to API format
      const sessionData = {
        session_name: data.session_name,
        start_time: data.start_time,
        end_time: data.end_time,
        target_position: data.target_position,
        max_participants: data.max_participants || undefined,
        description: data.description || undefined,
        location: data.location || undefined,
        proctor_id: data.proctor_id || undefined,
        auto_expire: data.auto_expire,
        allow_late_entry: data.allow_late_entry,
        session_modules: data.session_modules.map((module: any) => ({
          test_id: module.test_id,
          sequence: module.sequence,
          is_required: module.is_required,
          weight: module.weight,
        })),
      };

      await createSessionMutation.mutateAsync(sessionData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      toast.success("Sesi psikotes berhasil dibuat!", {
        description: `Sesi "${data.session_name}" telah berhasil dibuat dan siap digunakan`,
        duration: 6000,
      });

      // Close dialog
      closeCreateSession();
    } catch (error: any) {
      console.error("Create session error:", error);

      // Dismiss loading toast
      toast.dismiss();

      // Determine error message
      let errorMessage = "Terjadi kesalahan saat membuat sesi";

      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("session_code")) {
          errorMessage =
            "Kode sesi sudah digunakan, coba nama sesi yang berbeda";
        } else if (errorMsg.includes("validation")) {
          errorMessage = "Data yang dimasukkan tidak valid";
        } else if (
          errorMsg.includes("test") &&
          errorMsg.includes("not found")
        ) {
          errorMessage = "Salah satu modul tes tidak ditemukan";
        } else if (errorMsg.includes("proctor")) {
          errorMessage = "Proktor yang dipilih tidak valid";
        } else {
          errorMessage = error.message;
        }
      }

      // Show error toast
      toast.error("Gagal membuat sesi psikotes", {
        description: errorMessage,
        duration: 8000,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDurationPreset = (hours: number) => {
    const startTime = watch("start_time");
    if (startTime) {
      const startDate = new Date(startTime);
      const endDate = addHours(startDate, hours);
      setValue("end_time", endDate.toISOString().slice(0, 16));
    }
  };

  return (
    <Dialog open={isCreateSessionOpen} onOpenChange={closeCreateSession}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Buat Sesi Psikotes Baru
          </DialogTitle>
          <DialogDescription>
            Buat jadwal sesi psikotes dengan modul tes yang sesuai untuk
            kandidat
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_name">
                    Nama Sesi <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="session_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="misal: Test Psikotes Security Batch 1"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_position">
                    Posisi Target <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="target_position"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih posisi target" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_TARGET_POSITIONS.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.target_position && (
                    <p className="text-sm text-red-500">
                      {errors.target_position.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="Deskripsi sesi psikotes (opsional)"
                      rows={3}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Logistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jadwal & Logistik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">
                    Waktu Mulai <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="datetime-local"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    )}
                  />
                  {errors.start_time && (
                    <p className="text-sm text-red-500">
                      {errors.start_time.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">
                    Waktu Selesai <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="end_time"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="datetime-local"
                        min={watchedStartTime}
                      />
                    )}
                  />
                  {errors.end_time && (
                    <p className="text-sm text-red-500">
                      {errors.end_time.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Duration Presets */}
              <div className="space-y-2">
                <Label>Preset Durasi</Label>
                <div className="flex flex-wrap gap-2">
                  {SESSION_DURATION_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDurationPreset(preset.hours)}
                      disabled={!watchedStartTime}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Lokasi</Label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="misal: Ruang Meeting A, Lantai 2"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_participants">Maksimal Peserta</Label>
                  <Controller
                    name="max_participants"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        min="1"
                        max="1000"
                        placeholder="50"
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proctor_id">Proktor</Label>
                <Controller
                  name="proctor_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih proktor (opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tidak ada proktor</SelectItem>
                        {adminUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{user.name}</span>
                              <span className="text-sm text-muted-foreground">
                                ({user.email})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Session Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Modul Tes <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionModuleSelector />
              {errors.session_modules && (
                <p className="text-sm text-red-500 mt-2">
                  {errors.session_modules.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengaturan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto Expire</Label>
                  <p className="text-sm text-muted-foreground">
                    Sesi akan otomatis berakhir pada waktu yang ditentukan
                  </p>
                </div>
                <Controller
                  name="auto_expire"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Izinkan Masuk Terlambat</Label>
                  <p className="text-sm text-muted-foreground">
                    Peserta dapat bergabung meski sesi sudah dimulai
                  </p>
                </div>
                <Controller
                  name="allow_late_entry"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCreateSession}
              disabled={isFormSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                !isValid || isFormSubmitting || selectedModules.length === 0
              }
              className="gap-2"
            >
              {isFormSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuat Sesi...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Buat Sesi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
