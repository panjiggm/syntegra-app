// apps/frontend/src/schemas/createSessionSchema.ts
import { z } from "zod";

// Session Module Schema
export const SessionModuleSchema = z.object({
  test_id: z.string().uuid("Test ID harus berupa UUID yang valid"),
  test_name: z.string().optional(),
  test_category: z.string().optional(),
  sequence: z.number().min(1, "Urutan harus dimulai dari 1"),
  is_required: z.boolean(),
  weight: z
    .number()
    .min(0.1, "Bobot minimal 0.1")
    .max(5.0, "Bobot maksimal 5.0"),
});

// Create Session Form Schema
export const CreateSessionFormSchema = z
  .object({
    session_name: z
      .string()
      .min(3, "Nama sesi minimal 3 karakter")
      .max(255, "Nama sesi maksimal 255 karakter")
      .regex(
        /^[a-zA-Z0-9\s\-_]+$/,
        "Nama sesi hanya boleh mengandung huruf, angka, spasi, dash, dan underscore"
      ),

    start_time: z
      .string()
      .min(1, "Waktu mulai wajib diisi")
      .refine((val) => {
        const date = new Date(val);
        return date > new Date();
      }, "Waktu mulai harus di masa depan"),

    end_time: z.string().min(1, "Waktu selesai wajib diisi"),

    target_position: z
      .string()
      .min(2, "Posisi target minimal 2 karakter")
      .max(100, "Posisi target maksimal 100 karakter"),

    max_participants: z
      .number()
      .int("Jumlah peserta harus berupa bilangan bulat")
      .min(1, "Minimal 1 peserta")
      .max(1000, "Maksimal 1000 peserta")
      .optional()
      .nullable(),

    description: z
      .string()
      .max(1000, "Deskripsi maksimal 1000 karakter")
      .optional(),

    location: z.string().max(255, "Lokasi maksimal 255 karakter").optional(),

    proctor_id: z
      .string()
      .uuid("Proctor ID harus berupa UUID yang valid")
      .optional()
      .nullable(),

    auto_expire: z.boolean().default(true),

    allow_late_entry: z.boolean().default(false),

    session_modules: z
      .array(SessionModuleSchema)
      .min(1, "Minimal 1 modul tes harus dipilih")
      .max(10, "Maksimal 10 modul tes"),
  })
  .refine(
    (data) => {
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);
      return endTime > startTime;
    },
    {
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["end_time"],
    }
  )
  .refine(
    (data) => {
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);
      const durationHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return durationHours <= 12;
    },
    {
      message: "Durasi sesi tidak boleh lebih dari 12 jam",
      path: ["end_time"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate test IDs in modules
      const testIds = data.session_modules.map((m) => m.test_id);
      const uniqueTestIds = new Set(testIds);
      return testIds.length === uniqueTestIds.size;
    },
    {
      message: "Tidak boleh ada modul tes yang duplikat",
      path: ["session_modules"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate sequences in modules
      const sequences = data.session_modules.map((m) => m.sequence);
      const uniqueSequences = new Set(sequences);
      return sequences.length === uniqueSequences.size;
    },
    {
      message: "Urutan modul tidak boleh duplikat",
      path: ["session_modules"],
    }
  );

export type CreateSessionFormData = z.infer<typeof CreateSessionFormSchema>;
export type SessionModuleData = z.infer<typeof SessionModuleSchema>;

// Default form values
export const defaultSessionFormValues: Partial<CreateSessionFormData> = {
  auto_expire: true,
  allow_late_entry: false,
  max_participants: 50,
  session_modules: [],
};

// Common target positions
export const COMMON_TARGET_POSITIONS = [
  "Security",
  "Staff",
  "Manager",
  "Supervisor",
  "Team Leader",
  "Officer",
  "Executive",
  "Analyst",
  "Coordinator",
  "Assistant",
  "Specialist",
  "Administrator",
] as const;

// Session duration presets (in hours)
export const SESSION_DURATION_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "2 Jam", hours: 2 },
  { label: "3 Jam", hours: 3 },
  { label: "4 Jam", hours: 4 },
  { label: "6 Jam", hours: 6 },
  { label: "8 Jam", hours: 8 },
] as const;

// Validation helpers
export const validateSessionTiming = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  const errors: string[] = [];

  if (start <= now) {
    errors.push("Waktu mulai harus di masa depan");
  }

  if (end <= start) {
    errors.push("Waktu selesai harus setelah waktu mulai");
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > 12) {
    errors.push("Durasi sesi tidak boleh lebih dari 12 jam");
  }

  if (durationHours < 0.5) {
    errors.push("Durasi sesi minimal 30 menit");
  }

  return errors;
};

export const validateSessionModules = (modules: SessionModuleData[]) => {
  const errors: string[] = [];

  if (modules.length === 0) {
    errors.push("Minimal 1 modul tes harus dipilih");
  }

  const testIds = modules.map((m) => m.test_id);
  const uniqueTestIds = new Set(testIds);
  if (testIds.length !== uniqueTestIds.size) {
    errors.push("Tidak boleh ada modul tes yang duplikat");
  }

  const sequences = modules.map((m) => m.sequence);
  const uniqueSequences = new Set(sequences);
  if (sequences.length !== uniqueSequences.size) {
    errors.push("Urutan modul tidak boleh duplikat");
  }

  return errors;
};
