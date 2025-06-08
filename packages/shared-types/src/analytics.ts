import { z } from "zod";

// ==================== ENUMS ====================
export const AnalyticsPeriodEnum = z.enum([
  "today",
  "week",
  "month",
  "quarter",
  "year",
  "all_time",
]);

export const AnalyticsTestStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "expired",
]);

export const AnalyticsSessionStatusEnum = z.enum([
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
  "expired",
]);

export const MetricTypeEnum = z.enum([
  "response_time",
  "throughput",
  "error_rate",
  "cpu_usage",
  "memory_usage",
  "disk_usage",
]);

// ==================== REQUEST SCHEMAS ====================

// Base Analytics Query Schema
export const BaseAnalyticsQuerySchema = z.object({
  period: AnalyticsPeriodEnum.default("month"),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  timezone: z.string().default("Asia/Jakarta"),
});

// Test Analytics Query Schema
export const TestAnalyticsQuerySchema = BaseAnalyticsQuerySchema.extend({
  test_id: z.string().uuid().optional(),
  category: z.string().optional(),
  include_breakdown: z.coerce.boolean().default(true),
  include_trends: z.coerce.boolean().default(true),
  group_by: z
    .enum(["test", "category", "day", "week", "month"])
    .default("test"),
});

// Session Analytics Query Schema
export const SessionAnalyticsQuerySchema = BaseAnalyticsQuerySchema.extend({
  session_id: z.string().uuid().optional(),
  status: AnalyticsSessionStatusEnum.optional(),
  include_participants: z.coerce.boolean().default(true),
  include_completion_rates: z.coerce.boolean().default(true),
  group_by: z
    .enum(["session", "status", "day", "week", "month"])
    .default("session"),
});

// User Analytics Query Schema
export const UserAnalyticsQuerySchema = BaseAnalyticsQuerySchema.extend({
  role: z.enum(["admin", "participant"]).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  education: z
    .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
    .optional(),
  province: z.string().optional(),
  include_demographics: z.coerce.boolean().default(true),
  include_activity: z.coerce.boolean().default(true),
  group_by: z
    .enum(["role", "gender", "education", "province", "day", "week", "month"])
    .default("role"),
});

// Performance Analytics Query Schema
export const PerformanceAnalyticsQuerySchema = BaseAnalyticsQuerySchema.extend({
  metric_type: MetricTypeEnum.optional(),
  include_details: z.coerce.boolean().default(false),
  resolution: z.enum(["minute", "hour", "day"]).default("hour"),
});

// Completion Rate Analytics Query Schema
export const CompletionRateAnalyticsQuerySchema =
  BaseAnalyticsQuerySchema.extend({
    test_id: z.string().uuid().optional(),
    session_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    include_trends: z.coerce.boolean().default(true),
    group_by: z
      .enum(["test", "session", "user", "day", "week", "month"])
      .default("test"),
  });

// Trait Distribution Analytics Query Schema
export const TraitAnalyticsQuerySchema = BaseAnalyticsQuerySchema.extend({
  trait_name: z.string().optional(),
  test_id: z.string().uuid().optional(),
  include_correlations: z.coerce.boolean().default(false),
  include_distribution: z.coerce.boolean().default(true),
  group_by: z
    .enum(["trait", "test", "gender", "education", "age_group"])
    .default("trait"),
});

// ==================== RESPONSE SCHEMAS ====================

// Analytics Metadata Schema
export const AnalyticsMetadataSchema = z.object({
  total_records: z.number(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  generated_at: z.string().datetime(),
  data_freshness: z.string().datetime(),
});

// Test Analytics Data Schema
export const TestAnalyticsDataSchema = z.object({
  test_summary: z.object({
    total_tests: z.number(),
    total_attempts: z.number(),
    completed_attempts: z.number(),
    in_progress_attempts: z.number(),
    average_completion_time_minutes: z.number(),
    overall_completion_rate: z.number(),
    average_score: z.number(),
  }),
  test_breakdown: z
    .array(
      z.object({
        test_id: z.string().uuid(),
        test_name: z.string(),
        category: z.string(),
        total_attempts: z.number(),
        completed_attempts: z.number(),
        completion_rate: z.number(),
        average_score: z.number(),
        average_completion_time_minutes: z.number(),
      })
    )
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        total_attempts: z.number(),
        completed_attempts: z.number(),
        completion_rate: z.number(),
        average_score: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// Session Analytics Data Schema
export const SessionAnalyticsDataSchema = z.object({
  session_summary: z.object({
    total_sessions: z.number(),
    active_sessions: z.number(),
    completed_sessions: z.number(),
    cancelled_sessions: z.number(),
    total_participants: z.number(),
    average_participants_per_session: z.number(),
    average_session_duration_minutes: z.number(),
    overall_completion_rate: z.number(),
  }),
  session_breakdown: z
    .array(
      z.object({
        session_id: z.string().uuid(),
        session_name: z.string(),
        session_code: z.string(),
        status: AnalyticsSessionStatusEnum,
        participant_count: z.number(),
        max_participants: z.number().nullable(),
        completion_rate: z.number(),
        start_time: z.string().datetime().nullable(),
        end_time: z.string().datetime().nullable(),
        duration_minutes: z.number().nullable(),
      })
    )
    .optional(),
  participant_data: z
    .array(
      z.object({
        session_id: z.string().uuid(),
        total_participants: z.number(),
        active_participants: z.number(),
        completed_participants: z.number(),
        dropout_rate: z.number(),
      })
    )
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        sessions_created: z.number(),
        sessions_completed: z.number(),
        total_participants: z.number(),
        completion_rate: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// User Analytics Data Schema
export const UserAnalyticsDataSchema = z.object({
  user_summary: z.object({
    total_users: z.number(),
    active_users: z.number(),
    new_users_this_period: z.number(),
    admin_users: z.number(),
    participant_users: z.number(),
    average_login_frequency: z.number(),
    user_retention_rate: z.number(),
  }),
  demographics: z
    .object({
      gender_distribution: z.record(z.string(), z.number()),
      education_distribution: z.record(z.string(), z.number()),
      province_distribution: z.record(z.string(), z.number()),
      age_distribution: z.record(z.string(), z.number()),
    })
    .optional(),
  activity_data: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        total_logins: z.number(),
        total_tests_taken: z.number(),
        total_sessions_joined: z.number(),
        last_activity: z.string().datetime(),
        activity_score: z.number(),
      })
    )
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        new_registrations: z.number(),
        active_users: z.number(),
        total_logins: z.number(),
        retention_rate: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// Performance Analytics Data Schema
export const PerformanceAnalyticsDataSchema = z.object({
  performance_summary: z.object({
    average_response_time_ms: z.number(),
    average_throughput_per_second: z.number(),
    error_rate_percentage: z.number(),
    uptime_percentage: z.number(),
    total_requests: z.number(),
    successful_requests: z.number(),
    failed_requests: z.number(),
  }),
  system_metrics: z.object({
    cpu_usage_percentage: z.number(),
    memory_usage_percentage: z.number(),
    disk_usage_percentage: z.number(),
    network_io_mbps: z.number(),
    active_connections: z.number(),
    database_connections: z.number(),
  }),
  detailed_metrics: z
    .array(
      z.object({
        timestamp: z.string().datetime(),
        response_time_ms: z.number(),
        throughput_per_second: z.number(),
        error_count: z.number(),
        cpu_usage: z.number(),
        memory_usage: z.number(),
      })
    )
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        average_response_time: z.number(),
        error_rate: z.number(),
        uptime_percentage: z.number(),
        total_requests: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// Completion Rate Analytics Data Schema
export const CompletionRateAnalyticsDataSchema = z.object({
  completion_summary: z.object({
    overall_completion_rate: z.number(),
    total_attempts: z.number(),
    completed_attempts: z.number(),
    dropout_rate: z.number(),
    average_completion_time_minutes: z.number(),
    completion_rate_trend: z.number(), // percentage change from previous period
  }),
  breakdown_by_test: z
    .array(
      z.object({
        test_id: z.string().uuid(),
        test_name: z.string(),
        category: z.string(),
        total_attempts: z.number(),
        completed_attempts: z.number(),
        completion_rate: z.number(),
        average_completion_time_minutes: z.number(),
        dropout_points: z.array(
          z.object({
            question_index: z.number(),
            dropout_count: z.number(),
            dropout_percentage: z.number(),
          })
        ),
      })
    )
    .optional(),
  breakdown_by_session: z
    .array(
      z.object({
        session_id: z.string().uuid(),
        session_name: z.string(),
        completion_rate: z.number(),
        total_participants: z.number(),
        completed_participants: z.number(),
      })
    )
    .optional(),
  breakdown_by_user: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        user_name: z.string(),
        total_attempts: z.number(),
        completed_attempts: z.number(),
        completion_rate: z.number(),
        average_score: z.number(),
      })
    )
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        completion_rate: z.number(),
        total_attempts: z.number(),
        completed_attempts: z.number(),
        average_completion_time: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// Trait Analytics Data Schema
export const TraitAnalyticsDataSchema = z.object({
  trait_summary: z.object({
    total_trait_measurements: z.number(),
    unique_traits: z.number(),
    most_common_traits: z.array(z.string()),
    average_trait_score: z.number(),
    trait_diversity_index: z.number(),
  }),
  trait_distribution: z
    .array(
      z.object({
        trait_name: z.string(),
        trait_category: z.string(),
        total_measurements: z.number(),
        average_score: z.number(),
        min_score: z.number(),
        max_score: z.number(),
        standard_deviation: z.number(),
        percentile_25: z.number(),
        percentile_50: z.number(),
        percentile_75: z.number(),
        score_distribution: z.record(z.string(), z.number()), // score range -> count
      })
    )
    .optional(),
  correlations: z
    .array(
      z.object({
        trait_1: z.string(),
        trait_2: z.string(),
        correlation_coefficient: z.number(),
        significance_level: z.number(),
        sample_size: z.number(),
      })
    )
    .optional(),
  demographic_breakdown: z
    .object({
      by_gender: z.record(z.string(), z.record(z.string(), z.number())),
      by_education: z.record(z.string(), z.record(z.string(), z.number())),
      by_age_group: z.record(z.string(), z.record(z.string(), z.number())),
    })
    .optional(),
  trends: z
    .array(
      z.object({
        date: z.string().date(),
        total_measurements: z.number(),
        average_score: z.number(),
        unique_traits: z.number(),
      })
    )
    .optional(),
  metadata: AnalyticsMetadataSchema,
});

// Error Response Schema
export const AnalyticsErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  }),
  timestamp: z.string().datetime(),
});

// ==================== API RESPONSE SCHEMAS ====================

// Test Analytics Response
export const TestAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: TestAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// Session Analytics Response
export const SessionAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: SessionAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// User Analytics Response
export const UserAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: UserAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// Performance Analytics Response
export const PerformanceAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: PerformanceAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// Completion Rate Analytics Response
export const CompletionRateAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: CompletionRateAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// Trait Analytics Response
export const TraitAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: TraitAnalyticsDataSchema,
  timestamp: z.string().datetime(),
});

// ==================== TYPE EXPORTS ====================

// Enum types
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodEnum>;
export type AnalyticsTestStatus = z.infer<typeof AnalyticsTestStatusEnum>;
export type AnalyticsSessionStatus = z.infer<typeof AnalyticsSessionStatusEnum>;
export type MetricType = z.infer<typeof MetricTypeEnum>;

// Request types
export type BaseAnalyticsQuery = z.infer<typeof BaseAnalyticsQuerySchema>;
export type TestAnalyticsQuery = z.infer<typeof TestAnalyticsQuerySchema>;
export type SessionAnalyticsQuery = z.infer<typeof SessionAnalyticsQuerySchema>;
export type UserAnalyticsQuery = z.infer<typeof UserAnalyticsQuerySchema>;
export type PerformanceAnalyticsQuery = z.infer<
  typeof PerformanceAnalyticsQuerySchema
>;
export type CompletionRateAnalyticsQuery = z.infer<
  typeof CompletionRateAnalyticsQuerySchema
>;
export type TraitAnalyticsQuery = z.infer<typeof TraitAnalyticsQuerySchema>;

// Response data types
export type AnalyticsMetadata = z.infer<typeof AnalyticsMetadataSchema>;
export type TestAnalyticsData = z.infer<typeof TestAnalyticsDataSchema>;
export type SessionAnalyticsData = z.infer<typeof SessionAnalyticsDataSchema>;
export type UserAnalyticsData = z.infer<typeof UserAnalyticsDataSchema>;
export type PerformanceAnalyticsData = z.infer<
  typeof PerformanceAnalyticsDataSchema
>;
export type CompletionRateAnalyticsData = z.infer<
  typeof CompletionRateAnalyticsDataSchema
>;
export type TraitAnalyticsData = z.infer<typeof TraitAnalyticsDataSchema>;

// API response types
export type TestAnalyticsResponse = z.infer<typeof TestAnalyticsResponseSchema>;
export type SessionAnalyticsResponse = z.infer<
  typeof SessionAnalyticsResponseSchema
>;
export type UserAnalyticsResponse = z.infer<typeof UserAnalyticsResponseSchema>;
export type PerformanceAnalyticsResponse = z.infer<
  typeof PerformanceAnalyticsResponseSchema
>;
export type CompletionRateAnalyticsResponse = z.infer<
  typeof CompletionRateAnalyticsResponseSchema
>;
export type TraitAnalyticsResponse = z.infer<
  typeof TraitAnalyticsResponseSchema
>;
export type AnalyticsErrorResponse = z.infer<
  typeof AnalyticsErrorResponseSchema
>;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get date range for a specific analytics period
 */
export function getAnalyticsDateRange(period: AnalyticsPeriod): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const to = new Date(now);
  let from = new Date(now);

  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "week":
      from.setDate(now.getDate() - 7);
      break;
    case "month":
      from.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      from.setMonth(now.getMonth() - 3);
      break;
    case "year":
      from.setFullYear(now.getFullYear() - 1);
      break;
    case "all_time":
      from = new Date(2020, 0, 1); // Arbitrary start date
      break;
  }

  return { from, to };
}

/**
 * Calculate completion rate percentage
 */
export function calculateCompletionRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

/**
 * Format analytics period for display
 */
export function formatAnalyticsPeriod(period: AnalyticsPeriod): string {
  switch (period) {
    case "today":
      return "Today";
    case "week":
      return "Last 7 Days";
    case "month":
      return "Last 30 Days";
    case "quarter":
      return "Last 3 Months";
    case "year":
      return "Last 12 Months";
    case "all_time":
      return "All Time";
    default:
      return "Unknown Period";
  }
}
