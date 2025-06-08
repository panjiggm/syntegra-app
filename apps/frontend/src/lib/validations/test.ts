import { z } from "zod";

export const createTestSchema = z.object({
  name: z
    .string()
    .min(1, "Nama tes wajib diisi")
    .min(3, "Nama tes minimal 3 karakter")
    .max(255, "Nama tes maksimal 255 karakter")
    .refine((val) => val.trim().length > 0, "Nama tes tidak boleh hanya spasi"),

  description: z
    .string()
    .max(1000, "Deskripsi maksimal 1000 karakter")
    .optional()
    .or(z.literal("")),

  module_type: z.enum(
    [
      "intelligence",
      "personality",
      "aptitude",
      "interest",
      "projective",
      "cognitive",
    ],
    {
      required_error: "Tipe modul wajib dipilih",
      invalid_type_error: "Tipe modul tidak valid",
    }
  ),

  category: z.enum(
    [
      "wais",
      "mbti",
      "wartegg",
      "riasec",
      "kraepelin",
      "pauli",
      "big_five",
      "papi_kostick",
      "dap",
      "raven",
      "epps",
      "army_alpha",
      "htp",
      "disc",
      "iq",
      "eq",
    ],
    {
      required_error: "Kategori wajib dipilih",
      invalid_type_error: "Kategori tidak valid",
    }
  ),

  time_limit: z
    .number({
      required_error: "Batas waktu wajib diisi",
      invalid_type_error: "Batas waktu harus berupa angka",
    })
    .min(1, "Batas waktu minimal 1 menit")
    .max(480, "Batas waktu maksimal 480 menit (8 jam)")
    .int("Batas waktu harus berupa bilangan bulat"),

  icon: z
    .string()
    .max(10, "Icon maksimal 10 karakter")
    .optional()
    .or(z.literal("")),

  card_color: z
    .string()
    .max(100, "Warna kartu maksimal 100 karakter")
    .optional()
    .or(z.literal("")),

  passing_score: z
    .number({
      invalid_type_error: "Skor kelulusan harus berupa angka",
    })
    .min(0, "Skor kelulusan minimal 0")
    .max(100, "Skor kelulusan maksimal 100")
    .optional()
    .or(z.literal(0)),

  display_order: z
    .number({
      invalid_type_error: "Urutan tampilan harus berupa angka",
    })
    .min(0, "Urutan tampilan minimal 0")
    .max(9999, "Urutan tampilan maksimal 9999")
    .int("Urutan tampilan harus berupa bilangan bulat")
    .optional()
    .or(z.literal(0)),

  status: z
    .enum(["active", "inactive", "archived"], {
      invalid_type_error: "Status tidak valid",
    })
    .default("active"),
});

export type CreateTestFormData = z.infer<typeof createTestSchema>;

// Form default values
export const createTestDefaultValues: Partial<CreateTestFormData> = {
  name: "",
  description: "",
  module_type: undefined,
  category: undefined,
  time_limit: 30,
  icon: "",
  card_color: "",
  passing_score: 0,
  display_order: 0,
  status: "active",
};

// Module type options
export const moduleTypeOptions = [
  { value: "intelligence", label: "Inteligensi" },
  { value: "personality", label: "Kepribadian" },
  { value: "aptitude", label: "Bakat" },
  { value: "interest", label: "Minat" },
  { value: "projective", label: "Proyektif" },
  { value: "cognitive", label: "Kognitif" },
] as const;

// Category options grouped by module type
export const categoryOptionsByModuleType = {
  intelligence: [
    { value: "wais", label: "WAIS (Wechsler Adult Intelligence Scale)" },
    { value: "raven", label: "Raven's Progressive Matrices" },
    { value: "iq", label: "IQ Test" },
    { value: "army_alpha", label: "Army Alpha" },
  ],
  personality: [
    { value: "mbti", label: "MBTI (Myers-Briggs Type Indicator)" },
    { value: "big_five", label: "Big Five Personality" },
    { value: "disc", label: "DISC Assessment" },
    { value: "epps", label: "EPPS (Edwards Personal Preference Schedule)" },
  ],
  aptitude: [
    { value: "kraepelin", label: "Kraepelin Test" },
    { value: "pauli", label: "Pauli Test" },
    { value: "papi_kostick", label: "PAPI Kostick" },
  ],
  interest: [{ value: "riasec", label: "RIASEC (Holland Interest)" }],
  projective: [
    { value: "wartegg", label: "Wartegg Test" },
    { value: "dap", label: "DAP (Draw-A-Person)" },
    { value: "htp", label: "HTP (House-Tree-Person)" },
  ],
  cognitive: [{ value: "eq", label: "EQ (Emotional Intelligence)" }],
} as const;

// Status options
export const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "archived", label: "Diarsipkan" },
] as const;
