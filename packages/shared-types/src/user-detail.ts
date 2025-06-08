// packages/shared-types/src/user-detail.ts

import { z } from "zod";

// ==================== USER DETAIL SCHEMAS ====================

// Test Session Detail Schema
export const TestSessionDetailSchema = z.object({
  id: z.string().uuid(),
  session_name: z.string(),
  session_code: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.string(),
  participant_status: z.string(),
  score: z.number().optional(),
  completion_percentage: z.number().optional(),
});

// Test Attempt Detail Schema
export const TestAttemptDetailSchema = z.object({
  id: z.string().uuid(),
  test_name: z.string(),
  test_category: z.string(),
  module_type: z.string(),
  attempt_date: z.string().datetime(),
  duration_minutes: z.number(),
  status: z.string(),
  raw_score: z.number().optional(),
  scaled_score: z.number().optional(),
  percentile: z.number().optional(),
  grade: z.string().optional(),
  is_passed: z.boolean().optional(),
});

// Test Result Analysis Schema
export const TestResultAnalysisSchema = z.object({
  test_name: z.string(),
  category: z.string(),
  traits: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      description: z.string(),
      category: z.string(),
    })
  ),
  recommendations: z.array(z.string()),
  detailed_analysis: z.any(),
});

// User Detail Statistics Schema
export const UserDetailStatsSchema = z.object({
  total_sessions: z.number(),
  completed_sessions: z.number(),
  total_attempts: z.number(),
  completed_attempts: z.number(),
  average_score: z.number(),
  total_time_spent_minutes: z.number(),
  completion_rate: z.number(),
  categories_attempted: z.array(z.string()),
});

// Performance by Category Schema
export const PerformanceByCategorySchema = z.object({
  category: z.string(),
  attempts: z.number(),
  average_score: z.number(),
  best_score: z.number(),
  completion_rate: z.number(),
});

// Psychotest History Schema
export const PsychotestHistorySchema = z.object({
  sessions: z.array(TestSessionDetailSchema),
  attempts: z.array(TestAttemptDetailSchema),
  results_analysis: z.array(TestResultAnalysisSchema),
  statistics: UserDetailStatsSchema,
  performance_by_category: z.array(PerformanceByCategorySchema),
});

// Address Schema
export const AddressDetailSchema = z.object({
  full_address: z.string().nullable(),
  province: z.string().nullable(),
  regency: z.string().nullable(),
  district: z.string().nullable(),
  village: z.string().nullable(),
  postal_code: z.string().nullable(),
});

// Personal Info Schema
export const PersonalInfoSchema = z.object({
  phone: z.string(),
  gender: z.enum(["male", "female", "other"]),
  birth_place: z.string().nullable(),
  birth_date: z.string().datetime().nullable(),
  age: z.number().nullable(),
  religion: z
    .enum([
      "islam",
      "kristen",
      "katolik",
      "hindu",
      "buddha",
      "konghucu",
      "other",
    ])
    .nullable(),
  education: z
    .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
    .nullable(),
  address: AddressDetailSchema,
});

// Profile Schema
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  nik: z.string(),
  name: z.string(),
  email: z.string().email(),
  profile_picture_url: z.string().nullable(),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  created_at: z.string().datetime(),
  last_login: z.string().datetime().nullable(),
});

// Main User Detail Data Schema
export const UserDetailDataSchema = z.object({
  profile: UserProfileSchema,
  personal_info: PersonalInfoSchema,
  psychotest_history: PsychotestHistorySchema.nullable(),
});

// User Detail Response Schema
export const UserDetailResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: UserDetailDataSchema,
  timestamp: z.string().datetime(),
});

// User Detail Request Schema
export const GetUserDetailRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// ==================== TYPE EXPORTS ====================

export type TestSessionDetail = z.infer<typeof TestSessionDetailSchema>;
export type TestAttemptDetail = z.infer<typeof TestAttemptDetailSchema>;
export type TestResultAnalysis = z.infer<typeof TestResultAnalysisSchema>;
export type UserDetailStats = z.infer<typeof UserDetailStatsSchema>;
export type PerformanceByCategory = z.infer<typeof PerformanceByCategorySchema>;
export type PsychotestHistory = z.infer<typeof PsychotestHistorySchema>;
export type AddressDetail = z.infer<typeof AddressDetailSchema>;
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserDetailData = z.infer<typeof UserDetailDataSchema>;
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;
export type GetUserDetailRequest = z.infer<typeof GetUserDetailRequestSchema>;

// Add this line to packages/shared-types/src/index.ts

// Export all user-detail related types and schemas
export * from "./user-detail";

export const USER_DETAIL_CONSTANTS = {
  // Status mappings
  STATUS_LABELS: {
    completed: "Selesai",
    in_progress: "Berlangsung",
    started: "Dimulai",
    abandoned: "Ditinggalkan",
    expired: "Kadaluarsa",
  },

  // Gender mappings
  GENDER_LABELS: {
    male: "Laki-laki",
    female: "Perempuan",
    other: "Lainnya",
  },

  // Religion mappings
  RELIGION_LABELS: {
    islam: "Islam",
    kristen: "Kristen",
    katolik: "Katolik",
    hindu: "Hindu",
    buddha: "Buddha",
    konghucu: "Konghucu",
    other: "Lainnya",
  },

  // Education mappings
  EDUCATION_LABELS: {
    sd: "SD",
    smp: "SMP",
    sma: "SMA",
    diploma: "Diploma",
    s1: "S1",
    s2: "S2",
    s3: "S3",
    other: "Lainnya",
  },

  // Category colors
  CATEGORY_COLORS: {
    wais: "bg-blue-100 text-blue-800",
    mbti: "bg-purple-100 text-purple-800",
    wartegg: "bg-green-100 text-green-800",
    riasec: "bg-orange-100 text-orange-800",
    kraepelin: "bg-red-100 text-red-800",
    pauli: "bg-pink-100 text-pink-800",
    big_five: "bg-indigo-100 text-indigo-800",
    papi_kostick: "bg-cyan-100 text-cyan-800",
    default: "bg-gray-100 text-gray-800",
  },

  // Status colors
  STATUS_COLORS: {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    started: "bg-yellow-100 text-yellow-800",
    abandoned: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
  },

  // Grade colors
  GRADE_COLORS: {
    A: "text-green-600",
    B: "text-blue-600",
    C: "text-yellow-600",
    D: "text-orange-600",
    E: "text-red-600",
  },
} as const;
