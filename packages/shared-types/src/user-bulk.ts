import { z } from "zod";
import {
  RoleEnum,
  GenderEnum,
  ReligionEnum,
  EducationEnum,
  UserResponseSchema,
} from "./user";

// ==================== BULK USER CREATION SCHEMAS ====================

// Single user data from CSV
export const BulkUserDataSchema = z.object({
  nik: z
    .string()
    .min(16, "NIK must be exactly 16 characters")
    .max(16, "NIK must be exactly 16 characters"),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  role: RoleEnum.default("participant"),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  gender: GenderEnum.optional(),
  phone: z.string().max(20, "Phone number is too long").optional(),
  birth_place: z.string().max(100, "Birth place is too long").optional(),
  birth_date: z.string().datetime().optional(),
  religion: ReligionEnum.optional(),
  education: EducationEnum.optional(),
  address: z.string().optional(),
  province: z.string().max(100, "Province is too long").optional(),
  regency: z.string().max(100, "Regency is too long").optional(),
  district: z.string().max(100, "District is too long").optional(),
  village: z.string().max(100, "Village is too long").optional(),
  postal_code: z.string().max(10, "Postal code is too long").optional(),
  profile_picture_url: z
    .string()
    .url("Invalid URL format")
    .max(500, "URL is too long")
    .optional(),
  // Row tracking for error reporting
  row_number: z.number().optional(),
});

// Bulk create request - array of users or CSV file
export const BulkCreateUsersRequestSchema = z.object({
  users: z
    .array(BulkUserDataSchema)
    .min(1, "At least one user is required")
    .max(1000, "Maximum 1000 users per batch"),
  options: z
    .object({
      skip_duplicates: z.boolean().default(false), // Skip users with duplicate NIK/email
      validate_only: z.boolean().default(false), // Only validate, don't insert
      default_role: RoleEnum.default("participant"),
    })
    .optional(),
});

// ==================== CSV MAPPING SCHEMAS ====================

// CSV column mapping configuration (simplified, no sheet/row config)
export const CSVColumnMappingSchema = z.object({
  nik: z.string().default("NIK KTP"),
  name: z.string().default("NAMA"),
  email: z.string().default("E-MAIL"),
  gender: z.string().default("SEX"),
  phone: z.string().default("NOMOR HP"),
  birth_place: z.string().default("TEMPAT LAHIR"),
  birth_date: z.string().default("TANGGAL LAHIR"),
  religion: z.string().default("AGAMA"),
  education: z.string().default("PENDIDIKAN TERAKHIR"),
  address: z.string().default("ALAMAT KTP"),
});

// CSV file upload request
export const CSVUploadRequestSchema = z.object({
  csv_content: z.string(), // Raw CSV content as string
  file_name: z.string(),
  column_mapping: CSVColumnMappingSchema.optional(),
  options: z
    .object({
      skip_duplicates: z.boolean().default(false),
      validate_only: z.boolean().default(false),
      default_role: RoleEnum.default("participant"),
    })
    .optional(),
});

// ==================== RESPONSE SCHEMAS ====================

// Individual user result
export const BulkUserResultSchema = z.object({
  row_number: z.number().optional(),
  nik: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(["success", "error", "skipped"]),
  user_data: UserResponseSchema.optional(), // Only present if status is success
  error: z
    .object({
      field: z.string().optional(),
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// Bulk create response
export const BulkCreateUsersResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    total_processed: z.number(),
    successful: z.number(),
    failed: z.number(),
    skipped: z.number(),
    results: z.array(BulkUserResultSchema),
    summary: z.object({
      duplicates_found: z.number(),
      validation_errors: z.number(),
      database_errors: z.number(),
    }),
  }),
  timestamp: z.string(),
});

// CSV validation response
export const CSVValidationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    file_info: z.object({
      total_rows: z.number(),
      data_rows: z.number(),
      headers_found: z.array(z.string()),
      header_row: z.number().optional(),
      data_start_row: z.number().optional(),
    }),
    column_mapping: z.record(z.string()), // Maps detected columns to our fields
    sample_data: z.array(z.record(z.any())).max(5), // First 5 rows as sample
    validation_summary: z.object({
      valid_rows: z.number(),
      invalid_rows: z.number(),
      missing_required_fields: z.array(z.string()),
      duplicate_niks: z.number(),
      duplicate_emails: z.number(),
    }),
    preview_results: z.array(BulkUserResultSchema).max(10), // Preview of first 10 results
  }),
  timestamp: z.string(),
});

// ==================== UTILITY SCHEMAS ====================

// Gender mapping forCSV
export const GenderMappingSchema = z.object({
  male: z
    .array(z.string())
    .default(["L", "Laki-laki", "Male", "M", "LAKI-LAKI"]),
  female: z
    .array(z.string())
    .default(["P", "Perempuan", "Female", "F", "PEREMPUAN"]),
  other: z.array(z.string()).default(["", "Other", "Lainnya", "LAINNYA"]),
});

// Religion mapping forCSV
export const ReligionMappingSchema = z.object({
  islam: z.array(z.string()).default(["Islam", "ISLAM"]),
  kristen: z
    .array(z.string())
    .default(["Kristen", "KRISTEN", "Kristen Protestan"]),
  katolik: z
    .array(z.string())
    .default(["Katolik", "KATOLIK", "Kristen Katolik"]),
  hindu: z.array(z.string()).default(["Hindu", "HINDU"]),
  buddha: z.array(z.string()).default(["Buddha", "BUDDHA", "Budha", "BUDHA"]),
  konghucu: z.array(z.string()).default(["Konghucu", "KONGHUCU", "Kong Hu Cu"]),
  other: z.array(z.string()).default(["Lainnya", "Other", "LAINNYA"]),
});

// Education mapping forCSV
export const EducationMappingSchema = z.object({
  sd: z.array(z.string()).default(["SD", "Sekolah Dasar"]),
  smp: z.array(z.string()).default(["SMP", "Sekolah Menengah Pertama"]),
  sma: z
    .array(z.string())
    .default([
      "SMA",
      "SMK",
      "Sekolah Menengah Atas",
      "Sekolah Menengah Kejuruan",
    ]),
  diploma: z.array(z.string()).default(["D1", "D2", "D3", "D4", "Diploma"]),
  s1: z.array(z.string()).default(["S1", "Sarjana", "Bachelor"]),
  s2: z.array(z.string()).default(["S2", "Master", "Magister"]),
  s3: z.array(z.string()).default(["S3", "Doktor", "PhD"]),
  other: z.array(z.string()).default(["Lainnya", "Other"]),
});

// ==================== TYPE EXPORTS ====================
export type BulkUserData = z.infer<typeof BulkUserDataSchema>;
export type BulkCreateUsersRequest = z.infer<
  typeof BulkCreateUsersRequestSchema
>;

export type CSVColumnMapping = z.infer<typeof CSVColumnMappingSchema>;
export type CSVUploadRequest = z.infer<typeof CSVUploadRequestSchema>;
export type BulkUserResult = z.infer<typeof BulkUserResultSchema>;
export type BulkCreateUsersResponse = z.infer<
  typeof BulkCreateUsersResponseSchema
>;
export type CSVValidationResponse = z.infer<typeof CSVValidationResponseSchema>;
export type GenderMapping = z.infer<typeof GenderMappingSchema>;
export type ReligionMapping = z.infer<typeof ReligionMappingSchema>;
export type EducationMapping = z.infer<typeof EducationMappingSchema>;

// ==================== CONSTANTS ====================
export const BULK_CONSTANTS = {
  MAX_USERS_PER_BATCH: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_CSV_FORMATS: [".csv"] as const,
  DEFAULT_SHEET_INDEX: 0,
  PREVIEW_ROWS: 10,
  SAMPLE_ROWS: 5,
} as const;

// ==================== ERROR CODES ====================
export const BULK_ERROR_CODES = {
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_FORMAT: "INVALID_FILE_FORMAT",
  CSV_PARSE_ERROR: "CSV_PARSE_ERROR",
  MISSING_REQUIRED_COLUMNS: "MISSING_REQUIRED_COLUMNS",
  DUPLICATE_NIK: "DUPLICATE_NIK",
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  BATCH_SIZE_EXCEEDED: "BATCH_SIZE_EXCEEDED",
  DATABASE_BATCH_ERROR: "DATABASE_BATCH_ERROR",
} as const;
