import { z } from "zod";

// Session module schema
export const sessionModuleSchema = z.object({
  test_id: z.string().uuid("Test ID harus berupa UUID yang valid"),
  sequence: z
    .number({
      required_error: "Urutan wajib diisi",
      invalid_type_error: "Urutan harus berupa angka",
    })
    .min(1, "Urutan minimal 1")
    .int("Urutan harus berupa bilangan bulat"),
  is_required: z.boolean(),
  weight: z
    .number({
      required_error: "Bobot wajib diisi",
      invalid_type_error: "Bobot harus berupa angka",
    })
    .min(0.1, "Bobot minimal 0.1")
    .max(10, "Bobot maksimal 10"),
});

// Main session schema
export const createSessionSchema = z
  .object({
    session_name: z
      .string()
      .min(1, "Nama sesi wajib diisi")
      .min(3, "Nama sesi minimal 3 karakter")
      .max(255, "Nama sesi maksimal 255 karakter")
      .refine(
        (val) => val.trim().length > 0,
        "Nama sesi tidak boleh hanya spasi"
      ),

    session_code: z
      .string()
      .max(50, "Kode sesi maksimal 50 karakter")
      .regex(
        /^[A-Za-z0-9-_]*$/,
        "Kode sesi hanya boleh huruf, angka, dash, dan underscore"
      )
      .optional()
      .or(z.literal("")),

    start_time: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "Format waktu mulai tidak valid"
      ),
    // .refine(
    //   (val) => new Date(val) > new Date(),
    //   "Waktu mulai harus di masa depan"
    // ),

    end_time: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "Format waktu selesai tidak valid"
      ),

    target_position: z
      .string()
      .min(1, "Posisi target wajib diisi")
      .max(100, "Posisi target maksimal 100 karakter"),

    max_participants: z
      .number({
        invalid_type_error: "Maksimal peserta harus berupa angka",
      })
      .min(1, "Minimal 1 peserta")
      .max(1000, "Maksimal 1000 peserta")
      .optional()
      .or(z.literal(0)),

    description: z
      .string()
      .max(1000, "Deskripsi maksimal 1000 karakter")
      .optional()
      .or(z.literal("")),

    location: z
      .string()
      .max(255, "Lokasi maksimal 255 karakter")
      .optional()
      .or(z.literal("")),

    proctor_id: z
      .string()
      .uuid("Proctor ID harus berupa UUID yang valid")
      .optional()
      .or(z.literal("")),

    auto_expire: z.boolean(),

    allow_late_entry: z.boolean(),

    session_modules: z
      .array(sessionModuleSchema)
      .min(1, "Minimal harus memiliki 1 modul tes")
      .max(10, "Maksimal 10 modul tes")
      .refine((modules) => {
        const sequences = modules.map((m) => m.sequence);
        return new Set(sequences).size === sequences.length;
      }, "Urutan modul tidak boleh duplikat"),
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
  );

export type CreateSessionFormData = z.infer<typeof createSessionSchema>;
export type SessionModuleFormData = z.infer<typeof sessionModuleSchema>;

// Form default values
export const createSessionDefaultValues: Partial<CreateSessionFormData> = {
  session_name: "",
  session_code: "",
  start_time: "",
  end_time: "",
  target_position: "",
  max_participants: undefined,
  description: "",
  location: "",
  proctor_id: "",
  auto_expire: true,
  allow_late_entry: false,
  session_modules: [],
};

// Target position options
export const targetPositionOptions = [
  { value: "security", label: "Security" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "administrator", label: "Administrator" },
  { value: "officer", label: "Officer" },
  { value: "coordinator", label: "Coordinator" },
  { value: "analyst", label: "Analyst" },
  { value: "specialist", label: "Specialist" },
  { value: "general", label: "Umum" },
] as const;

// Common session durations (in hours)
export const sessionDurationPresets = [
  { label: "1 Jam", hours: 1 },
  { label: "2 Jam", hours: 2 },
  { label: "3 Jam", hours: 3 },
  { label: "4 Jam", hours: 4 },
  { label: "6 Jam", hours: 6 },
  { label: "8 Jam", hours: 8 },
] as const;
