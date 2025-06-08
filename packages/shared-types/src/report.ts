// packages/shared-types/src/report.ts
import { z } from "zod";

// ==================== ENUMS ====================
export const ReportTypeEnum = z.enum([
  "individual",
  "session_summary",
  "comparative",
  "batch",
]);

export const ReportFormatOptions = z.enum(["json", "pdf", "excel", "csv"]);

export const ReportStatusEnum = z.enum([
  "generating",
  "completed",
  "failed",
  "expired",
]);

export const ChartTypeEnum = z.enum([
  "bar",
  "line",
  "pie",
  "radar",
  "scatter",
  "box_plot",
]);

export const ComparisonMetricEnum = z.enum([
  "raw_score",
  "scaled_score",
  "percentile",
  "trait_scores",
  "completion_rate",
  "time_efficiency",
]);

// ==================== BASE SCHEMAS ====================

// Chart Data Schema
export const ChartDataSchema = z.object({
  type: ChartTypeEnum,
  title: z.string(),
  data: z.array(z.record(z.any())),
  config: z.record(z.any()).optional(),
  description: z.string().optional(),
});

// Trait Score Schema (for psychological analysis)
export const TraitScoreSchema = z.object({
  trait_name: z.string(),
  trait_category: z.string(),
  raw_score: z.number(),
  scaled_score: z.number(),
  percentile: z.number().nullable(),
  interpretation: z.string(),
  description: z.string(),
  strength_level: z.enum(["very_low", "low", "average", "high", "very_high"]),
});

// Test Performance Schema
export const TestPerformanceSchema = z.object({
  test_id: z.string().uuid(),
  test_name: z.string(),
  test_category: z.string(),
  module_type: z.string(),
  attempt_id: z.string().uuid(),
  raw_score: z.number().nullable(),
  scaled_score: z.number().nullable(),
  percentile: z.number().nullable(),
  grade: z.string().nullable(),
  completion_rate: z.number(),
  time_spent_minutes: z.number(),
  time_efficiency: z.number(), // percentage of optimal time
  trait_scores: z.array(TraitScoreSchema),
  strengths: z.array(z.string()),
  areas_for_development: z.array(z.string()),
  status: z.string(),
  completed_at: z.string().datetime().nullable(),
});

// Psychological Profile Schema
export const PsychologicalProfileSchema = z.object({
  dominant_traits: z.array(z.string()),
  personality_type: z.string().nullable(),
  cognitive_style: z.string().nullable(),
  behavioral_tendencies: z.array(z.string()),
  aptitude_areas: z.array(z.string()),
  interest_categories: z.array(z.string()),
  overall_assessment: z.string(),
  reliability_index: z.number(), // 0-1 scale
});

// Recommendation Schema
export const RecommendationSchema = z.object({
  category: z.enum(["position_fit", "development", "career_path", "team_role"]),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  action_items: z.array(z.string()),
  supporting_evidence: z.array(z.string()),
});

// ==================== REQUEST SCHEMAS ====================

// Individual Report Request
export const GetIndividualReportRequestSchema = z.object({
  user_id: z.string().uuid("Invalid user ID format"),
});

export const GetIndividualReportQuerySchema = z.object({
  format: ReportFormatOptions.default("json"),
  include_charts: z.coerce.boolean().default(true),
  include_detailed_analysis: z.coerce.boolean().default(true),
  include_recommendations: z.coerce.boolean().default(true),
  include_comparison_data: z.coerce.boolean().default(false),
  session_filter: z.string().uuid().optional(), // filter by specific session
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  language: z.enum(["id", "en"]).default("id"),
});

// Session Summary Report Request
export const GetSessionSummaryReportRequestSchema = z.object({
  session_id: z.string().uuid("Invalid session ID format"),
});

export const GetSessionSummaryReportQuerySchema = z.object({
  format: ReportFormatOptions.default("json"),
  include_charts: z.coerce.boolean().default(true),
  include_participant_breakdown: z.coerce.boolean().default(true),
  include_test_analysis: z.coerce.boolean().default(true),
  include_trends: z.coerce.boolean().default(false),
  language: z.enum(["id", "en"]).default("id"),
});

// Comparative Analysis Report Request
export const GetComparativeReportRequestSchema = z.object({
  session_id: z.string().uuid("Invalid session ID format"),
});

export const GetComparativeReportQuerySchema = z.object({
  format: ReportFormatOptions.default("json"),
  comparison_metric: ComparisonMetricEnum.default("scaled_score"),
  include_charts: z.coerce.boolean().default(true),
  include_rankings: z.coerce.boolean().default(true),
  include_distribution_analysis: z.coerce.boolean().default(true),
  include_cluster_analysis: z.coerce.boolean().default(false),
  top_performers_count: z.coerce.number().min(1).max(50).default(10),
  language: z.enum(["id", "en"]).default("id"),
});

// Batch Results Report Request
export const GetBatchReportRequestSchema = z.object({
  session_id: z.string().uuid("Invalid session ID format"),
});

export const GetBatchReportQuerySchema = z.object({
  format: ReportFormatOptions.default("excel"),
  include_personal_data: z.coerce.boolean().default(true),
  include_detailed_scores: z.coerce.boolean().default(true),
  include_trait_breakdown: z.coerce.boolean().default(false),
  include_recommendations: z.coerce.boolean().default(false),
  include_raw_answers: z.coerce.boolean().default(false),
  sort_by: z
    .enum(["name", "score", "completion_rate", "registration_order"])
    .default("name"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
  language: z.enum(["id", "en"]).default("id"),
});

// ==================== RESPONSE SCHEMAS ====================

// Individual Assessment Report Response
export const IndividualReportDataSchema = z.object({
  // Personal Information
  participant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    nik: z.string(),
    gender: z.string().nullable(),
    birth_date: z.string().datetime().nullable(),
    education: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    profile_picture_url: z.string().nullable(),
  }),

  // Assessment Overview
  assessment_overview: z.object({
    total_tests_taken: z.number(),
    total_tests_completed: z.number(),
    overall_completion_rate: z.number(),
    total_time_spent_minutes: z.number(),
    assessment_period: z.object({
      start_date: z.string().datetime(),
      end_date: z.string().datetime(),
    }),
    sessions_participated: z.array(
      z.object({
        session_id: z.string().uuid(),
        session_name: z.string(),
        target_position: z.string().nullable(),
        participation_date: z.string().datetime(),
      })
    ),
  }),

  // Test Performances
  test_performances: z.array(TestPerformanceSchema),

  // Psychological Profile
  psychological_profile: PsychologicalProfileSchema,

  // Overall Scores & Rankings
  overall_assessment: z.object({
    composite_score: z.number().nullable(),
    overall_percentile: z.number().nullable(),
    overall_grade: z.string().nullable(),
    competency_match: z.number(), // 0-100 percentage match with target position
    readiness_level: z.enum(["not_ready", "developing", "ready", "exceeds"]),
  }),

  // Recommendations
  recommendations: z.array(RecommendationSchema),

  // Comparison Data (if requested)
  comparison_data: z
    .object({
      peer_group_size: z.number(),
      percentile_in_group: z.number(),
      ranking_in_group: z.number(),
      above_average_traits: z.array(z.string()),
      below_average_traits: z.array(z.string()),
    })
    .nullable(),

  // Charts & Visualizations
  charts: z.array(ChartDataSchema).optional(),

  // Report Metadata
  report_metadata: z.object({
    generated_at: z.string().datetime(),
    generated_by: z.string().uuid(),
    report_version: z.string(),
    data_sources: z.array(z.string()),
    reliability_notes: z.array(z.string()),
  }),
});

// Session Summary Report Response
export const SessionSummaryReportDataSchema = z.object({
  // Session Information
  session_info: z.object({
    id: z.string().uuid(),
    session_name: z.string(),
    session_code: z.string(),
    target_position: z.string().nullable(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    location: z.string().nullable(),
    description: z.string().nullable(),
    proctor_name: z.string().nullable(),
  }),

  // Participation Statistics
  participation_stats: z.object({
    total_invited: z.number(),
    total_registered: z.number(),
    total_started: z.number(),
    total_completed: z.number(),
    no_show_count: z.number(),
    dropout_count: z.number(),
    completion_rate: z.number(),
    average_time_spent_minutes: z.number(),
  }),

  // Test Module Analysis
  test_modules: z.array(
    z.object({
      test_id: z.string().uuid(),
      test_name: z.string(),
      test_category: z.string(),
      module_type: z.string(),
      sequence: z.number(),
      participants_started: z.number(),
      participants_completed: z.number(),
      completion_rate: z.number(),
      average_score: z.number(),
      average_time_minutes: z.number(),
      difficulty_level: z.enum([
        "very_easy",
        "easy",
        "moderate",
        "difficult",
        "very_difficult",
      ]),
      discrimination_index: z.number(),
    })
  ),

  // Performance Distribution
  performance_distribution: z.object({
    score_ranges: z.record(z.string(), z.number()), // "0-20": count, "21-40": count, etc.
    grade_distribution: z.record(z.string(), z.number()), // "A": count, "B": count, etc.
    percentile_ranges: z.record(z.string(), z.number()),
    top_performers: z.array(
      z.object({
        user_id: z.string().uuid(),
        name: z.string(),
        overall_score: z.number(),
        percentile: z.number(),
      })
    ),
  }),

  // Quality Metrics
  assessment_quality: z.object({
    overall_reliability: z.number(),
    completion_consistency: z.number(),
    time_efficiency_average: z.number(),
    data_quality_score: z.number(),
    anomaly_count: z.number(),
  }),

  // Key Insights
  key_insights: z.array(
    z.object({
      type: z.enum(["strength", "concern", "trend", "recommendation"]),
      title: z.string(),
      description: z.string(),
      supporting_data: z.record(z.any()),
    })
  ),

  // Charts
  charts: z.array(ChartDataSchema).optional(),
});

// Comparative Analysis Report Response
export const ComparativeReportDataSchema = z.object({
  // Session Context
  session_context: z.object({
    session_id: z.string().uuid(),
    session_name: z.string(),
    target_position: z.string().nullable(),
    total_participants: z.number(),
    comparison_metric: ComparisonMetricEnum,
  }),

  // Participant Rankings
  participant_rankings: z.array(
    z.object({
      rank: z.number(),
      user_id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      overall_score: z.number(),
      percentile: z.number(),
      grade: z.string().nullable(),
      completion_rate: z.number(),
      time_efficiency: z.number(),
      standout_traits: z.array(z.string()),
      concern_areas: z.array(z.string()),
      recommendation_category: z.enum([
        "highly_recommended",
        "recommended",
        "conditional",
        "not_recommended",
      ]),
    })
  ),

  // Statistical Analysis
  statistical_analysis: z.object({
    mean_score: z.number(),
    median_score: z.number(),
    standard_deviation: z.number(),
    score_range: z.object({
      min: z.number(),
      max: z.number(),
    }),
    quartiles: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
    }),
    outliers: z.array(
      z.object({
        user_id: z.string().uuid(),
        name: z.string(),
        score: z.number(),
        type: z.enum(["high_outlier", "low_outlier"]),
      })
    ),
  }),

  // Test-by-Test Comparison
  test_comparisons: z.array(
    z.object({
      test_id: z.string().uuid(),
      test_name: z.string(),
      test_category: z.string(),
      top_performers: z.array(
        z.object({
          user_id: z.string().uuid(),
          name: z.string(),
          score: z.number(),
          percentile: z.number(),
        })
      ),
      bottom_performers: z.array(
        z.object({
          user_id: z.string().uuid(),
          name: z.string(),
          score: z.number(),
          percentile: z.number(),
        })
      ),
      score_distribution: z.record(z.string(), z.number()),
    })
  ),

  // Trait Distribution Analysis
  trait_distribution: z.array(
    z.object({
      trait_name: z.string(),
      trait_category: z.string(),
      distribution: z.record(z.string(), z.number()), // strength_level -> count
      top_scorers: z.array(
        z.object({
          user_id: z.string().uuid(),
          name: z.string(),
          score: z.number(),
        })
      ),
      average_score: z.number(),
      variability: z.number(),
    })
  ),

  // Cluster Analysis (if requested)
  cluster_analysis: z
    .object({
      clusters: z.array(
        z.object({
          cluster_id: z.string(),
          cluster_name: z.string(),
          participant_count: z.number(),
          characteristics: z.array(z.string()),
          representative_traits: z.array(z.string()),
          members: z.array(
            z.object({
              user_id: z.string().uuid(),
              name: z.string(),
              distance_from_center: z.number(),
            })
          ),
        })
      ),
      cluster_validity: z.number(),
    })
    .nullable(),

  // Hiring Recommendations
  hiring_recommendations: z.object({
    highly_recommended: z.array(z.string().uuid()),
    recommended: z.array(z.string().uuid()),
    conditional: z.array(z.string().uuid()),
    not_recommended: z.array(z.string().uuid()),
    decision_criteria: z.array(
      z.object({
        criterion: z.string(),
        weight: z.number(),
        description: z.string(),
      })
    ),
  }),

  // Charts
  charts: z.array(ChartDataSchema).optional(),
});

// Batch Results Report Response
export const BatchReportDataSchema = z.object({
  // Session Information
  session_info: z.object({
    session_id: z.string().uuid(),
    session_name: z.string(),
    session_code: z.string(),
    target_position: z.string().nullable(),
    assessment_date: z.string().date(),
    total_participants: z.number(),
  }),

  // Participant Results
  participant_results: z.array(
    z.object({
      // Personal Data
      user_id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      nik: z.string(),
      gender: z.string().nullable(),
      birth_date: z.string().date().nullable(),
      education: z.string().nullable(),
      phone: z.string().nullable(),

      // Registration & Participation
      registration_date: z.string().datetime().nullable(),
      participation_status: z.string(),
      start_time: z.string().datetime().nullable(),
      completion_time: z.string().datetime().nullable(),

      // Overall Performance
      overall_score: z.number().nullable(),
      overall_percentile: z.number().nullable(),
      overall_grade: z.string().nullable(),
      completion_rate: z.number(),
      total_time_minutes: z.number(),

      // Test-by-Test Results
      test_results: z.array(
        z.object({
          test_name: z.string(),
          test_category: z.string(),
          raw_score: z.number().nullable(),
          scaled_score: z.number().nullable(),
          percentile: z.number().nullable(),
          grade: z.string().nullable(),
          time_spent_minutes: z.number(),
          status: z.string(),
        })
      ),

      // Trait Scores (if requested)
      trait_scores: z
        .array(
          z.object({
            trait_name: z.string(),
            trait_category: z.string(),
            score: z.number(),
            interpretation: z.string(),
          })
        )
        .optional(),

      // Recommendations (if requested)
      recommendation_summary: z.string().optional(),
      position_fit_score: z.number().optional(),

      // Quality Indicators
      data_quality: z.object({
        completion_consistency: z.number(),
        response_pattern_validity: z.number(),
        time_efficiency: z.number(),
      }),
    })
  ),

  // Summary Statistics
  summary_statistics: z.object({
    total_completed: z.number(),
    average_score: z.number(),
    score_range: z.object({
      min: z.number(),
      max: z.number(),
    }),
    grade_distribution: z.record(z.string(), z.number()),
    completion_rate_average: z.number(),
    time_efficiency_average: z.number(),
  }),

  // Export Information
  export_info: z.object({
    format: ReportFormatOptions,
    generated_at: z.string().datetime(),
    generated_by: z.string(),
    file_size_kb: z.number().optional(),
    download_expires_at: z.string().datetime().optional(),
  }),
});

// Main Report Response Schemas
export const GetIndividualReportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: IndividualReportDataSchema,
  timestamp: z.string().datetime(),
});

export const GetSessionSummaryReportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: SessionSummaryReportDataSchema,
  timestamp: z.string().datetime(),
});

export const GetComparativeReportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ComparativeReportDataSchema,
  timestamp: z.string().datetime(),
});

export const GetBatchReportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: BatchReportDataSchema,
  timestamp: z.string().datetime(),
});

// File Download Response (for PDF, Excel, CSV)
export const ReportFileResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    file_url: z.string().url(),
    file_name: z.string(),
    file_size_kb: z.number(),
    format: ReportFormatOptions,
    expires_at: z.string().datetime(),
    download_token: z.string(),
  }),
  timestamp: z.string().datetime(),
});

// Report Generation Status Response
export const ReportStatusResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    report_id: z.string().uuid(),
    status: ReportStatusEnum,
    progress_percentage: z.number().min(0).max(100),
    estimated_completion_time: z.string().datetime().nullable(),
    error_message: z.string().nullable(),
  }),
  timestamp: z.string().datetime(),
});

// Error Response Schema
export const ReportErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const ReportErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(ReportErrorDetailSchema).optional(),
  timestamp: z.string().datetime(),
});

// ==================== TYPE EXPORTS ====================

// Enum Types
export type ReportType = z.infer<typeof ReportTypeEnum>;
export type ReportFormatType = z.infer<typeof ReportFormatOptions>;
export type ReportStatus = z.infer<typeof ReportStatusEnum>;
export type ChartType = z.infer<typeof ChartTypeEnum>;
export type ComparisonMetric = z.infer<typeof ComparisonMetricEnum>;

// Component Types
export type ChartData = z.infer<typeof ChartDataSchema>;
export type TraitScore = z.infer<typeof TraitScoreSchema>;
export type TestPerformance = z.infer<typeof TestPerformanceSchema>;
export type PsychologicalProfile = z.infer<typeof PsychologicalProfileSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;

// Request Types
export type GetIndividualReportRequest = z.infer<
  typeof GetIndividualReportRequestSchema
>;
export type GetIndividualReportQuery = z.infer<
  typeof GetIndividualReportQuerySchema
>;
export type GetSessionSummaryReportRequest = z.infer<
  typeof GetSessionSummaryReportRequestSchema
>;
export type GetSessionSummaryReportQuery = z.infer<
  typeof GetSessionSummaryReportQuerySchema
>;
export type GetComparativeReportRequest = z.infer<
  typeof GetComparativeReportRequestSchema
>;
export type GetComparativeReportQuery = z.infer<
  typeof GetComparativeReportQuerySchema
>;
export type GetBatchReportRequest = z.infer<typeof GetBatchReportRequestSchema>;
export type GetBatchReportQuery = z.infer<typeof GetBatchReportQuerySchema>;

// Response Data Types
export type IndividualReportData = z.infer<typeof IndividualReportDataSchema>;
export type SessionSummaryReportData = z.infer<
  typeof SessionSummaryReportDataSchema
>;
export type ComparativeReportData = z.infer<typeof ComparativeReportDataSchema>;
export type BatchReportData = z.infer<typeof BatchReportDataSchema>;

// Response Types
export type GetIndividualReportResponse = z.infer<
  typeof GetIndividualReportResponseSchema
>;
export type GetSessionSummaryReportResponse = z.infer<
  typeof GetSessionSummaryReportResponseSchema
>;
export type GetComparativeReportResponse = z.infer<
  typeof GetComparativeReportResponseSchema
>;
export type GetBatchReportResponse = z.infer<
  typeof GetBatchReportResponseSchema
>;
export type ReportFileResponse = z.infer<typeof ReportFileResponseSchema>;
export type ReportStatusResponse = z.infer<typeof ReportStatusResponseSchema>;
export type ReportErrorResponse = z.infer<typeof ReportErrorResponseSchema>;
export type ReportErrorDetail = z.infer<typeof ReportErrorDetailSchema>;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate report file name based on type and parameters
 */
export function generateReportFileName(
  reportType: ReportType,
  format: ReportFormatType,
  identifier: string,
  timestamp?: Date
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split("T")[0];

  const typeMap = {
    individual: "Individual_Assessment",
    session_summary: "Session_Summary",
    comparative: "Comparative_Analysis",
    batch: "Batch_Results",
  };

  const formatExt = {
    json: "json",
    pdf: "pdf",
    excel: "xlsx",
    csv: "csv",
  };

  return `${typeMap[reportType]}_${identifier}_${dateStr}.${formatExt[format]}`;
}

/**
 * Calculate strength level from score
 */
export function calculateStrengthLevel(
  score: number,
  maxScore: number = 100
): "very_low" | "low" | "average" | "high" | "very_high" {
  const percentage = (score / maxScore) * 100;

  if (percentage < 20) return "very_low";
  if (percentage < 40) return "low";
  if (percentage < 60) return "average";
  if (percentage < 80) return "high";
  return "very_high";
}

/**
 * Generate interpretation text from trait score
 */
export function generateTraitInterpretation(
  traitName: string,
  score: number,
  strengthLevel: string,
  language: "id" | "en" = "id"
): string {
  const interpretations = {
    id: {
      very_high: `Sangat tinggi dalam ${traitName}. Menunjukkan kemampuan luar biasa.`,
      high: `Tinggi dalam ${traitName}. Menunjukkan kemampuan yang baik.`,
      average: `Rata-rata dalam ${traitName}. Menunjukkan kemampuan yang memadai.`,
      low: `Rendah dalam ${traitName}. Memerlukan pengembangan lebih lanjut.`,
      very_low: `Sangat rendah dalam ${traitName}. Memerlukan perhatian khusus.`,
    },
    en: {
      very_high: `Very high in ${traitName}. Shows exceptional ability.`,
      high: `High in ${traitName}. Shows good ability.`,
      average: `Average in ${traitName}. Shows adequate ability.`,
      low: `Low in ${traitName}. Requires further development.`,
      very_low: `Very low in ${traitName}. Requires special attention.`,
    },
  };

  return interpretations[language][
    strengthLevel as keyof (typeof interpretations)[typeof language]
  ];
}

/**
 * Determine recommendation category based on scores
 */
export function determineRecommendationCategory(
  overallScore: number,
  completionRate: number,
  positionFitScore: number
): "highly_recommended" | "recommended" | "conditional" | "not_recommended" {
  if (overallScore >= 80 && completionRate >= 90 && positionFitScore >= 75) {
    return "highly_recommended";
  }
  if (overallScore >= 70 && completionRate >= 80 && positionFitScore >= 60) {
    return "recommended";
  }
  if (overallScore >= 60 && completionRate >= 70) {
    return "conditional";
  }
  return "not_recommended";
}

/**
 * Calculate time efficiency percentage
 */
export function calculateReportTimeEfficiency(
  actualTimeMinutes: number,
  optimalTimeMinutes: number
): number {
  if (optimalTimeMinutes === 0) return 100;
  return Math.max(
    0,
    Math.min(100, (optimalTimeMinutes / actualTimeMinutes) * 100)
  );
}

/**
 * Generate chart configuration for common psychological charts
 */
export function generatePsychologicalChartConfig(
  chartType: ChartType,
  data: any[],
  options: Record<string, any> = {}
): Record<string, any> {
  const baseConfig = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
  };

  switch (chartType) {
    case "radar":
      return {
        ...baseConfig,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
      };
    case "bar":
      return {
        ...baseConfig,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      };
    case "pie":
      return {
        ...baseConfig,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      };
    default:
      return baseConfig;
  }
}

// ==================== CONSTANTS ====================

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  individual: "Laporan Individu",
  session_summary: "Ringkasan Sesi",
  comparative: "Analisis Komparatif",
  batch: "Hasil Batch",
};

export const REPORT_FORMAT_LABELS: Record<ReportFormatType, string> = {
  json: "JSON Data",
  pdf: "PDF Document",
  excel: "Excel Spreadsheet",
  csv: "CSV File",
};

export const STRENGTH_LEVEL_LABELS: Record<string, string> = {
  very_low: "Sangat Rendah",
  low: "Rendah",
  average: "Rata-rata",
  high: "Tinggi",
  very_high: "Sangat Tinggi",
};

export const RECOMMENDATION_CATEGORY_LABELS: Record<string, string> = {
  highly_recommended: "Sangat Direkomendasikan",
  recommended: "Direkomendasikan",
  conditional: "Dengan Syarat",
  not_recommended: "Tidak Direkomendasikan",
};

// Export limits and defaults
export const REPORT_LIMITS = {
  MAX_PARTICIPANTS_BATCH: 1000,
  MAX_CHART_DATA_POINTS: 100,
  MAX_TRAIT_DISPLAY: 20,
  MAX_RECOMMENDATIONS: 10,
  MAX_FILE_SIZE_MB: 50,
  REPORT_EXPIRY_HOURS: 24,
} as const;

// ==================== ADVANCED UTILITY FUNCTIONS ====================

/**
 * Calculate psychological reliability index based on response patterns
 */
export function calculateReliabilityIndex(
  responses: Array<{ question_id: string; answer: any; time_taken: number }>,
  testConfig: { time_limit: number; total_questions: number }
): number {
  if (responses.length === 0) return 0;

  // Factor 1: Completion rate (30%)
  const completionRate = responses.length / testConfig.total_questions;

  // Factor 2: Response time consistency (40%)
  const avgTime =
    responses.reduce((sum, r) => sum + r.time_taken, 0) / responses.length;
  const timeVariance =
    responses.reduce((sum, r) => sum + Math.pow(r.time_taken - avgTime, 2), 0) /
    responses.length;
  const timeConsistency = Math.max(0, 1 - Math.sqrt(timeVariance) / avgTime);

  // Factor 3: Response pattern validity (30%)
  // Check for extreme response patterns (all same answers, etc.)
  const uniqueAnswers = new Set(responses.map((r) => JSON.stringify(r.answer)))
    .size;
  const patternValidity = Math.min(1, uniqueAnswers / (responses.length * 0.3));

  return (
    Math.round(
      (completionRate * 0.3 + timeConsistency * 0.4 + patternValidity * 0.3) *
        100
    ) / 100
  );
}

/**
 * Generate executive summary for reports
 */
export function generateExecutiveSummary(
  reportType: ReportType,
  data: any,
  language: "id" | "en" = "id"
): string {
  const templates = {
    id: {
      individual: `Peserta ${data.participant?.name} menunjukkan tingkat completion ${data.assessment_overview?.overall_completion_rate}% dengan performa keseluruhan ${data.overall_assessment?.composite_score || "N/A"}.`,
      session_summary: `Sesi ${data.session_info?.session_name} diikuti ${data.participation_stats?.total_completed} dari ${data.participation_stats?.total_registered} peserta dengan tingkat completion ${data.participation_stats?.completion_rate}%.`,
      comparative: `Analisis komparatif ${data.session_context?.total_participants} peserta menunjukkan variasi performa dengan rata-rata skor ${data.statistical_analysis?.mean_score}.`,
      batch: `Laporan batch untuk ${data.participant_results?.length} peserta dengan tingkat completion rata-rata ${data.summary_statistics?.completion_rate_average}%.`,
    },
    en: {
      individual: `Participant ${data.participant?.name} achieved ${data.assessment_overview?.overall_completion_rate}% completion rate with overall performance of ${data.overall_assessment?.composite_score || "N/A"}.`,
      session_summary: `Session ${data.session_info?.session_name} had ${data.participation_stats?.total_completed} out of ${data.participation_stats?.total_registered} participants complete with ${data.participation_stats?.completion_rate}% completion rate.`,
      comparative: `Comparative analysis of ${data.session_context?.total_participants} participants shows performance variation with average score of ${data.statistical_analysis?.mean_score}.`,
      batch: `Batch report for ${data.participant_results?.length} participants with average completion rate of ${data.summary_statistics?.completion_rate_average}%.`,
    },
  };

  return templates[language][reportType] || "Summary not available.";
}

/**
 * Validate report data completeness
 */
export function validateReportDataCompleteness(
  reportType: ReportType,
  data: any
): { isValid: boolean; missingFields: string[]; warnings: string[] } {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  switch (reportType) {
    case "individual":
      if (!data.participant?.name) missingFields.push("participant.name");
      if (!data.test_performances?.length)
        warnings.push("No test performances found");
      if (!data.psychological_profile)
        warnings.push("Psychological profile incomplete");
      break;

    case "session_summary":
      if (!data.session_info?.session_name)
        missingFields.push("session_info.session_name");
      if (!data.participation_stats) missingFields.push("participation_stats");
      if (!data.test_modules?.length) warnings.push("No test modules found");
      break;

    case "comparative":
      if (!data.participant_rankings?.length)
        missingFields.push("participant_rankings");
      if (!data.statistical_analysis)
        missingFields.push("statistical_analysis");
      if (data.participant_rankings?.length < 2)
        warnings.push("Insufficient participants for comparison");
      break;

    case "batch":
      if (!data.participant_results?.length)
        missingFields.push("participant_results");
      if (!data.summary_statistics) missingFields.push("summary_statistics");
      break;
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}
