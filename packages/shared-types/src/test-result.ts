import { z } from "zod";

// ==================== ENUMS ====================
export const ReportFormatEnum = z.enum(["pdf", "html", "json"]);
export const CertificateFormatEnum = z.enum(["pdf", "png", "jpg"]);
export const CertificateTemplateEnum = z.enum([
  "standard",
  "premium",
  "corporate",
  "simple",
]);

// ==================== REQUEST SCHEMAS ====================

// Get Result by Attempt ID Request Schema (Path Parameters)
export const GetResultByAttemptIdRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

// Get User Results Request Schema (Path Parameters)
export const GetUserResultsRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Get User Results Query Schema
export const GetUserResultsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(10),

  // Filters
  test_id: z.string().uuid("Invalid test ID format").optional(),
  session_id: z.string().uuid("Invalid session ID format").optional(),
  is_passed: z.coerce.boolean().optional(),
  grade: z.enum(["A", "B", "C", "D", "E"]).optional(),

  // Date filters
  calculated_from: z.string().datetime().optional(),
  calculated_to: z.string().datetime().optional(),

  // Score filters
  min_score: z.coerce.number().min(0).max(100).optional(),
  max_score: z.coerce.number().min(0).max(100).optional(),
  min_percentile: z.coerce.number().min(0).max(100).optional(),
  max_percentile: z.coerce.number().min(0).max(100).optional(),

  // Sorting
  sort_by: z
    .enum([
      "calculated_at",
      "raw_score",
      "scaled_score",
      "percentile",
      "grade",
      "test_name",
      "completion_percentage",
    ])
    .default("calculated_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),

  // Include options
  include_analysis: z.coerce.boolean().default(false),
  include_recommendations: z.coerce.boolean().default(false),
});

// Get Test Results Request Schema (Path Parameters)
export const GetTestResultsRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Get Test Results Query Schema
export const GetTestResultsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(10),

  // Filters
  user_id: z.string().uuid("Invalid user ID format").optional(),
  session_id: z.string().uuid("Invalid session ID format").optional(),
  is_passed: z.coerce.boolean().optional(),
  grade: z.enum(["A", "B", "C", "D", "E"]).optional(),

  // Date filters
  calculated_from: z.string().datetime().optional(),
  calculated_to: z.string().datetime().optional(),

  // Score filters
  min_score: z.coerce.number().min(0).max(100).optional(),
  max_score: z.coerce.number().min(0).max(100).optional(),
  min_percentile: z.coerce.number().min(0).max(100).optional(),
  max_percentile: z.coerce.number().min(0).max(100).optional(),

  // Sorting
  sort_by: z
    .enum([
      "calculated_at",
      "raw_score",
      "scaled_score",
      "percentile",
      "grade",
      "user_name",
      "completion_percentage",
    ])
    .default("calculated_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),

  // Include options
  include_analysis: z.coerce.boolean().default(false),
  include_recommendations: z.coerce.boolean().default(false),
  include_user_details: z.coerce.boolean().default(true),
});

// Calculate Test Result Request Schema
export const CalculateTestResultRequestSchema = z
  .object({
    attempt_id: z.string().uuid("Invalid attempt ID format").optional(),
    result_id: z.string().uuid("Invalid result ID format").optional(),
    force_recalculate: z.boolean().default(false),
    calculation_options: z
      .object({
        include_personality_analysis: z.boolean().default(true),
        include_intelligence_scoring: z.boolean().default(true),
        include_recommendations: z.boolean().default(true),
        custom_weights: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
  })
  .refine((data) => data.attempt_id || data.result_id, {
    message: "Either attempt_id or result_id must be provided",
    path: ["root"],
  });

// Get Result Report Request Schema (Path Parameters)
export const GetResultReportRequestSchema = z.object({
  resultId: z.string().uuid("Invalid result ID format"),
});

// Get Result Report Query Schema
export const GetResultReportQuerySchema = z.object({
  format: ReportFormatEnum.default("html"),
  language: z.enum(["id", "en"]).default("id"),
  include_charts: z.coerce.boolean().default(true),
  include_recommendations: z.coerce.boolean().default(true),
  include_detailed_analysis: z.coerce.boolean().default(true),
  include_trait_explanations: z.coerce.boolean().default(true),
  template: z.enum(["standard", "detailed", "summary"]).default("standard"),
});

// Get Result Certificate Request Schema (Path Parameters)
export const GetResultCertificateRequestSchema = z.object({
  resultId: z.string().uuid("Invalid result ID format"),
});

// Get Result Certificate Query Schema
export const GetResultCertificateQuerySchema = z.object({
  format: CertificateFormatEnum.default("pdf"),
  template: CertificateTemplateEnum.default("standard"),
  language: z.enum(["id", "en"]).default("id"),
  include_qr_code: z.coerce.boolean().default(true),
  include_logo: z.coerce.boolean().default(true),
  watermark: z.coerce.boolean().default(false),
});

// ==================== RESPONSE SCHEMAS ====================

// Test Result Trait Schema
export const TestResultTraitSchema = z.object({
  name: z.string(),
  score: z.number(),
  description: z.string(),
  category: z.string(),
  percentile: z.number().optional(),
  interpretation: z.string().optional(),
});

// Test Result Data Schema
export const TestResultDataSchema = z.object({
  id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  user_id: z.string().uuid(),
  test_id: z.string().uuid(),
  session_result_id: z.string().uuid().nullable(),
  raw_score: z.number().nullable(),
  scaled_score: z.number().nullable(),
  percentile: z.number().nullable(),
  grade: z.string().nullable(),
  traits: z.array(TestResultTraitSchema).nullable(),
  trait_names: z.array(z.string()).nullable(),
  description: z.string().nullable(),
  recommendations: z.string().nullable(),
  detailed_analysis: z.record(z.any()).nullable(),
  is_passed: z.boolean().nullable(),
  completion_percentage: z.number(),
  calculated_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),

  // Populated fields
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      nik: z.string(),
    })
    .optional(),

  test: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
      module_type: z.string(),
      time_limit: z.number(),
      total_questions: z.number(),
      passing_score: z.number().nullable(),
    })
    .optional(),

  attempt: z
    .object({
      id: z.string().uuid(),
      start_time: z.date(),
      end_time: z.date().nullable(),
      actual_end_time: z.date().nullable(),
      status: z.string(),
      time_spent: z.number().nullable(),
      questions_answered: z.number(),
    })
    .optional(),

  session: z
    .object({
      id: z.string().uuid(),
      session_name: z.string(),
      session_code: z.string(),
      target_position: z.string(),
    })
    .nullable()
    .optional(),
});

// Test Result Report Data Schema
export const TestResultReportDataSchema = z.object({
  result: TestResultDataSchema,
  report_metadata: z.object({
    generated_at: z.date(),
    format: ReportFormatEnum,
    language: z.string(),
    template: z.string(),
    version: z.string().default("1.0"),
  }),
  content: z.object({
    summary: z.string(),
    detailed_analysis: z.string().optional(),
    trait_explanations: z
      .array(
        z.object({
          trait_name: z.string(),
          explanation: z.string(),
          score_interpretation: z.string(),
        })
      )
      .optional(),
    recommendations: z.array(z.string()).optional(),
    charts_data: z.record(z.any()).optional(),
  }),
  file_url: z.string().optional(), // For PDF/file downloads
});

// Test Result Certificate Data Schema
export const TestResultCertificateDataSchema = z.object({
  result: TestResultDataSchema,
  certificate_metadata: z.object({
    generated_at: z.date(),
    format: CertificateFormatEnum,
    template: CertificateTemplateEnum,
    language: z.string(),
    certificate_id: z.string(),
    verification_code: z.string(),
    qr_code_url: z.string().optional(),
  }),
  content: z.object({
    title: z.string(),
    recipient_name: z.string(),
    test_name: z.string(),
    completion_date: z.date(),
    score_summary: z.string(),
    grade: z.string(),
    issuer: z.string(),
    signature_url: z.string().optional(),
  }),
  file_url: z.string().optional(), // For PDF/image downloads
});

// Get Result by Attempt ID Response Schema
export const GetResultByAttemptIdResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestResultDataSchema.nullable(),
  timestamp: z.string(),
});

// Get User Results Response Schema
export const GetUserResultsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(TestResultDataSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next_page: z.boolean(),
    has_prev_page: z.boolean(),
  }),
  summary: z
    .object({
      total_results: z.number(),
      passed_tests: z.number(),
      failed_tests: z.number(),
      average_score: z.number(),
      highest_score: z.number(),
      lowest_score: z.number(),
      completion_rate: z.number(),
      by_grade: z.record(z.string(), z.number()),
      by_test_category: z.record(z.string(), z.number()),
    })
    .optional(),
  timestamp: z.string(),
});

// Get Test Results Response Schema
export const GetTestResultsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(TestResultDataSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next_page: z.boolean(),
    has_prev_page: z.boolean(),
  }),
  summary: z
    .object({
      total_results: z.number(),
      passed_participants: z.number(),
      failed_participants: z.number(),
      average_score: z.number(),
      highest_score: z.number(),
      lowest_score: z.number(),
      completion_rate: z.number(),
      by_grade: z.record(z.string(), z.number()),
      by_percentile_range: z.record(z.string(), z.number()),
      test_statistics: z.object({
        difficulty_level: z.string(),
        discrimination_index: z.number(),
        reliability_coefficient: z.number(),
      }),
    })
    .optional(),
  timestamp: z.string(),
});

// Calculate Test Result Response Schema
export const CalculateTestResultResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    result: TestResultDataSchema,
    calculation_details: z.object({
      calculation_method: z.string(),
      raw_answers_processed: z.number(),
      scores_calculated: z.array(
        z.object({
          trait: z.string(),
          raw_score: z.number(),
          scaled_score: z.number(),
          percentile: z.number(),
        })
      ),
      processing_time_ms: z.number(),
      recalculated: z.boolean(),
    }),
  }),
  timestamp: z.string(),
});

// Get Result Report Response Schema
export const GetResultReportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestResultReportDataSchema,
  timestamp: z.string(),
});

// Get Result Certificate Response Schema
export const GetResultCertificateResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestResultCertificateDataSchema,
  timestamp: z.string(),
});

// Error response schema
export const TestResultErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const TestResultErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(TestResultErrorDetailSchema).optional(),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type ReportFormat = z.infer<typeof ReportFormatEnum>;
export type CertificateFormat = z.infer<typeof CertificateFormatEnum>;
export type CertificateTemplate = z.infer<typeof CertificateTemplateEnum>;

export type GetResultByAttemptIdRequest = z.infer<
  typeof GetResultByAttemptIdRequestSchema
>;
export type GetResultByAttemptIdResponse = z.infer<
  typeof GetResultByAttemptIdResponseSchema
>;

export type GetUserResultsRequest = z.infer<typeof GetUserResultsRequestSchema>;
export type GetUserResultsQuery = z.infer<typeof GetUserResultsQuerySchema>;
export type GetUserResultsResponse = z.infer<
  typeof GetUserResultsResponseSchema
>;

export type GetTestResultsRequest = z.infer<typeof GetTestResultsRequestSchema>;
export type GetTestResultsQuery = z.infer<typeof GetTestResultsQuerySchema>;
export type GetTestResultsResponse = z.infer<
  typeof GetTestResultsResponseSchema
>;

export type CalculateTestResultRequest = z.infer<
  typeof CalculateTestResultRequestSchema
>;
export type CalculateTestResultResponse = z.infer<
  typeof CalculateTestResultResponseSchema
>;

export type GetResultReportRequest = z.infer<
  typeof GetResultReportRequestSchema
>;
export type GetResultReportQuery = z.infer<typeof GetResultReportQuerySchema>;
export type GetResultReportResponse = z.infer<
  typeof GetResultReportResponseSchema
>;

export type GetResultCertificateRequest = z.infer<
  typeof GetResultCertificateRequestSchema
>;
export type GetResultCertificateQuery = z.infer<
  typeof GetResultCertificateQuerySchema
>;
export type GetResultCertificateResponse = z.infer<
  typeof GetResultCertificateResponseSchema
>;

export type TestResultData = z.infer<typeof TestResultDataSchema>;
export type TestResultTrait = z.infer<typeof TestResultTraitSchema>;
export type TestResultReportData = z.infer<typeof TestResultReportDataSchema>;
export type TestResultCertificateData = z.infer<
  typeof TestResultCertificateDataSchema
>;
export type TestResultErrorResponse = z.infer<
  typeof TestResultErrorResponseSchema
>;
export type TestResultErrorDetail = z.infer<typeof TestResultErrorDetailSchema>;

// ==================== DATABASE TYPES ====================
export type CreateTestResultDB = {
  attempt_id: string;
  user_id: string;
  test_id: string;
  session_result_id?: string | null;
  raw_score?: string | null;
  scaled_score?: string | null;
  percentile?: string | null;
  grade?: string | null;
  traits?: Array<{
    name: string;
    score: number;
    description: string;
    category: string;
  }> | null;
  trait_names?: string[] | null;
  description?: string | null;
  recommendations?: string | null;
  detailed_analysis?: Record<string, any> | null;
  is_passed?: boolean | null;
  completion_percentage: string;
  calculated_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type UpdateTestResultDB = {
  raw_score?: string | null;
  scaled_score?: string | null;
  percentile?: string | null;
  grade?: string | null;
  traits?: Array<{
    name: string;
    score: number;
    description: string;
    category: string;
  }> | null;
  trait_names?: string[] | null;
  description?: string | null;
  recommendations?: string | null;
  detailed_analysis?: Record<string, any> | null;
  is_passed?: boolean | null;
  completion_percentage?: string;
  calculated_at?: Date;
  updated_at: Date;
};

// ==================== UTILITY TYPES ====================

// For frontend display
export type TestResultCardData = {
  id: string;
  test_name: string;
  category: string;
  raw_score: number | null;
  scaled_score: number | null;
  percentile: number | null;
  grade: string | null;
  is_passed: boolean | null;
  completion_percentage: number;
  calculated_at: Date;
  traits_summary: string[];
};

// For dashboard statistics
export type TestResultStats = {
  total_results: number;
  passed_rate: number;
  average_score: number;
  score_distribution: Record<string, number>;
  grade_distribution: Record<string, number>;
  trait_averages: Record<string, number>;
  completion_trends: Array<{
    date: string;
    count: number;
    average_score: number;
  }>;
};

// Filter options for frontend
export type TestResultFilterOptions = {
  grades: { value: string; label: string }[];
  test_categories: { value: string; label: string }[];
  traits: { value: string; label: string }[];
  score_ranges: { value: string; label: string; min: number; max: number }[];
};

// ==================== VALIDATION HELPERS ====================

// Validate score range
export function validateScoreRange(score: number): boolean {
  return score >= 0 && score <= 100;
}

// Validate percentile range
export function validatePercentileRange(percentile: number): boolean {
  return percentile >= 0 && percentile <= 100;
}

// Calculate grade based on score
export function calculateGrade(
  score: number,
  passingScore: number = 60
): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= passingScore) return "D";
  return "E";
}

// Determine pass/fail status
export function determinePassStatus(
  score: number,
  passingScore: number = 60
): boolean {
  return score >= passingScore;
}

// Format trait score for display
export function formatTraitScore(score: number): string {
  return `${Math.round(score)}/100`;
}

// Generate result summary text
export function generateResultSummary(result: TestResultData): string {
  const grade = result.grade || "N/A";
  const score = result.scaled_score || result.raw_score;
  const status = result.is_passed ? "LULUS" : "TIDAK LULUS";

  return `Hasil: ${grade} | Skor: ${score ? Math.round(score) : "N/A"} | Status: ${status}`;
}

// ==================== CONSTANTS ====================
export const GRADE_LABELS: Record<string, string> = {
  A: "Sangat Baik",
  B: "Baik",
  C: "Cukup",
  D: "Kurang",
  E: "Sangat Kurang",
};

export const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

export const REPORT_TEMPLATES = {
  standard: "Standard Report",
  detailed: "Detailed Analysis Report",
  summary: "Executive Summary",
};

export const CERTIFICATE_TEMPLATES_LABELS: Record<CertificateTemplate, string> =
  {
    standard: "Standard Certificate",
    premium: "Premium Certificate",
    corporate: "Corporate Certificate",
    simple: "Simple Certificate",
  };

// Score interpretation ranges
export const SCORE_INTERPRETATIONS = {
  excellent: { min: 90, max: 100, label: "Excellent", color: "green" },
  good: { min: 80, max: 89, label: "Good", color: "blue" },
  average: { min: 70, max: 79, label: "Average", color: "yellow" },
  below_average: { min: 60, max: 69, label: "Below Average", color: "orange" },
  poor: { min: 0, max: 59, label: "Poor", color: "red" },
};

// Common trait categories
export const TRAIT_CATEGORIES = {
  personality: "Personality",
  intelligence: "Intelligence",
  aptitude: "Aptitude",
  interest: "Interest",
  cognitive: "Cognitive",
  emotional: "Emotional",
};

// Default calculation weights
export const DEFAULT_CALCULATION_WEIGHTS = {
  accuracy: 0.7,
  speed: 0.2,
  consistency: 0.1,
};
