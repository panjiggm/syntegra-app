import { z } from "zod";

// ==================== EXISTING ENUMS ====================
export const AttemptStatusEnum = z.enum([
  "started",
  "in_progress",
  "completed",
  "abandoned",
  "expired",
]);

// ==================== NEW REQUEST SCHEMAS ====================

// Get User Attempts Request Schema (Path Parameters)
export const GetUserAttemptsRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Get User Attempts Query Schema
export const GetUserAttemptsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(10),

  // Filters
  status: AttemptStatusEnum.optional(),
  test_id: z.string().uuid("Invalid test ID format").optional(),
  session_id: z.string().uuid("Invalid session ID format").optional(),

  // Date filters
  start_date_from: z.string().datetime().optional(),
  start_date_to: z.string().datetime().optional(),

  // Sorting
  sort_by: z
    .enum([
      "start_time",
      "end_time",
      "status",
      "test_name",
      "attempt_number",
      "created_at",
    ])
    .default("start_time"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// Get Session Attempts Request Schema (Path Parameters)
export const GetSessionAttemptsRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

// Get Session Attempts Query Schema
export const GetSessionAttemptsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(10),

  // Filters
  status: AttemptStatusEnum.optional(),
  test_id: z.string().uuid("Invalid test ID format").optional(),
  user_id: z.string().uuid("Invalid user ID format").optional(),

  // Sorting
  sort_by: z
    .enum([
      "start_time",
      "user_name",
      "test_name",
      "status",
      "attempt_number",
      "progress_percentage",
    ])
    .default("start_time"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// Get Attempt Progress Request Schema (Path Parameters)
export const GetAttemptProgressRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

// ==================== EXISTING REQUEST SCHEMAS ====================

// Start Test Attempt Request Schema
export const StartTestAttemptRequestSchema = z.object({
  test_id: z.string().uuid("Invalid test ID format"),
  session_code: z.string().min(1, "Session code is required").optional(),
  browser_info: z
    .object({
      user_agent: z.string(),
      screen_width: z.number().optional(),
      screen_height: z.number().optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

// Update Test Attempt Request Schema
export const UpdateTestAttemptRequestSchema = z.object({
  status: AttemptStatusEnum.optional(),
  questions_answered: z.number().min(0).optional(),
  time_spent: z.number().min(0).optional(),
  browser_info: z
    .object({
      user_agent: z.string(),
      screen_width: z.number().optional(),
      screen_height: z.number().optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

// Finish Test Attempt Request Schema
export const FinishTestAttemptRequestSchema = z.object({
  time_spent: z.number().min(0),
  questions_answered: z.number().min(0),
  completion_type: z
    .enum(["completed", "abandoned", "expired"])
    .default("completed"),
  final_browser_info: z
    .object({
      user_agent: z.string(),
      screen_width: z.number().optional(),
      screen_height: z.number().optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

// Path Parameter Schemas
export const GetAttemptByIdRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

export const UpdateAttemptByIdRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

export const FinishAttemptByIdRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

// ==================== RESPONSE SCHEMAS ====================

// Test Attempt Data Schema (Enhanced)
export const TestAttemptDataSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  test_id: z.string().uuid(),
  session_test_id: z.string().uuid().nullable(),
  start_time: z.date(),
  end_time: z.date().nullable(),
  actual_end_time: z.date().nullable(),
  status: AttemptStatusEnum,
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  browser_info: z.record(z.any()).nullable(),
  attempt_number: z.number(),
  time_spent: z.number().nullable(),
  questions_answered: z.number(),
  total_questions: z.number().nullable(),
  created_at: z.date(),
  updated_at: z.date(),

  // Populated fields
  test: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
      module_type: z.string(),
      time_limit: z.number(),
      total_questions: z.number(),
      icon: z.string().nullable(),
      card_color: z.string().nullable(),
      instructions: z.string().nullable(),
    })
    .optional(),

  user: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      nik: z.string(),
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

  // Computed fields
  time_remaining: z.number().optional(),
  progress_percentage: z.number().optional(),
  can_continue: z.boolean().optional(),
  is_expired: z.boolean().optional(),
});

// Attempt Progress Data Schema
export const AttemptProgressDataSchema = z.object({
  attempt_id: z.string().uuid(),
  status: AttemptStatusEnum,
  start_time: z.date(),
  time_spent: z.number().nullable(),
  time_remaining: z.number(),
  time_limit: z.number(), // in minutes
  questions_answered: z.number(),
  total_questions: z.number(),
  progress_percentage: z.number(),
  completion_rate: z.number(), // questions answered / total questions
  time_efficiency: z.number(), // time spent efficiency
  can_continue: z.boolean(),
  is_expired: z.boolean(),
  is_nearly_expired: z.boolean(), // within 5 minutes
  estimated_completion_time: z.number().optional(), // estimated minutes to complete
  test: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    module_type: z.string(),
    time_limit: z.number(),
    total_questions: z.number(),
  }),
  session: z
    .object({
      id: z.string().uuid(),
      session_name: z.string(),
      session_code: z.string(),
      target_position: z.string(),
    })
    .nullable(),
});

// NEW RESPONSE SCHEMAS

// Get User Attempts Response Schema
export const GetUserAttemptsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(TestAttemptDataSchema),
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
      total_attempts: z.number(),
      completed_attempts: z.number(),
      in_progress_attempts: z.number(),
      abandoned_attempts: z.number(),
      expired_attempts: z.number(),
      average_completion_rate: z.number(),
      total_time_spent: z.number(), // in minutes
    })
    .optional(),
  timestamp: z.string(),
});

// Get Session Attempts Response Schema
export const GetSessionAttemptsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(TestAttemptDataSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next_page: z.boolean(),
    has_prev_page: z.boolean(),
  }),
  session_summary: z
    .object({
      session_id: z.string().uuid(),
      session_name: z.string(),
      session_code: z.string(),
      target_position: z.string(),
      total_participants: z.number(),
      total_attempts: z.number(),
      completed_attempts: z.number(),
      in_progress_attempts: z.number(),
      abandoned_attempts: z.number(),
      expired_attempts: z.number(),
      overall_completion_rate: z.number(),
      average_time_per_test: z.number(), // in minutes
    })
    .optional(),
  timestamp: z.string(),
});

// Get Attempt Progress Response Schema
export const GetAttemptProgressResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: AttemptProgressDataSchema,
  timestamp: z.string(),
});

// EXISTING RESPONSE SCHEMAS

// Start Test Attempt Response Schema
export const StartTestAttemptResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestAttemptDataSchema,
  timestamp: z.string(),
});

// Get Test Attempt Response Schema
export const GetTestAttemptResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestAttemptDataSchema,
  timestamp: z.string(),
});

// Update Test Attempt Response Schema
export const UpdateTestAttemptResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestAttemptDataSchema,
  timestamp: z.string(),
});

// Finish Test Attempt Response Schema
export const FinishTestAttemptResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    attempt: TestAttemptDataSchema,
    result: z
      .object({
        id: z.string().uuid(),
        raw_score: z.number().nullable(),
        scaled_score: z.number().nullable(),
        percentile: z.number().nullable(),
        grade: z.string().nullable(),
        is_passed: z.boolean().nullable(),
        completion_percentage: z.number(),
        calculated_at: z.date(),
      })
      .optional(),
    next_test: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        category: z.string(),
        module_type: z.string(),
        sequence: z.number(),
      })
      .nullable()
      .optional(),
  }),
  timestamp: z.string(),
});

// Error response schema
export const AttemptErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const AttemptErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(AttemptErrorDetailSchema).optional(),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type AttemptStatus = z.infer<typeof AttemptStatusEnum>;

// NEW TYPES
export type GetUserAttemptsRequest = z.infer<
  typeof GetUserAttemptsRequestSchema
>;
export type GetUserAttemptsQuery = z.infer<typeof GetUserAttemptsQuerySchema>;
export type GetUserAttemptsResponse = z.infer<
  typeof GetUserAttemptsResponseSchema
>;
export type GetSessionAttemptsRequest = z.infer<
  typeof GetSessionAttemptsRequestSchema
>;
export type GetSessionAttemptsQuery = z.infer<
  typeof GetSessionAttemptsQuerySchema
>;
export type GetSessionAttemptsResponse = z.infer<
  typeof GetSessionAttemptsResponseSchema
>;
export type GetAttemptProgressRequest = z.infer<
  typeof GetAttemptProgressRequestSchema
>;
export type GetAttemptProgressResponse = z.infer<
  typeof GetAttemptProgressResponseSchema
>;
export type AttemptProgressData = z.infer<typeof AttemptProgressDataSchema>;

// EXISTING TYPES
export type StartTestAttemptRequest = z.infer<
  typeof StartTestAttemptRequestSchema
>;
export type StartTestAttemptResponse = z.infer<
  typeof StartTestAttemptResponseSchema
>;
export type UpdateTestAttemptRequest = z.infer<
  typeof UpdateTestAttemptRequestSchema
>;
export type UpdateAttemptByIdRequest = z.infer<
  typeof UpdateAttemptByIdRequestSchema
>;
export type UpdateTestAttemptResponse = z.infer<
  typeof UpdateTestAttemptResponseSchema
>;
export type FinishTestAttemptRequest = z.infer<
  typeof FinishTestAttemptRequestSchema
>;
export type FinishAttemptByIdRequest = z.infer<
  typeof FinishAttemptByIdRequestSchema
>;
export type FinishTestAttemptResponse = z.infer<
  typeof FinishTestAttemptResponseSchema
>;
export type GetAttemptByIdRequest = z.infer<typeof GetAttemptByIdRequestSchema>;
export type GetTestAttemptResponse = z.infer<
  typeof GetTestAttemptResponseSchema
>;
export type AttemptErrorResponse = z.infer<typeof AttemptErrorResponseSchema>;
export type TestAttemptData = z.infer<typeof TestAttemptDataSchema>;
export type AttemptErrorDetail = z.infer<typeof AttemptErrorDetailSchema>;

// ==================== UTILITY FUNCTIONS ====================

// Check if attempt can be continued
export function canContinueAttempt(attempt: {
  status: AttemptStatus;
  end_time: Date | null;
  start_time: Date;
  test: { time_limit: number };
}): boolean {
  if (attempt.status === "completed" || attempt.status === "expired") {
    return false;
  }

  if (attempt.end_time) {
    const now = new Date();
    return now <= attempt.end_time;
  }

  const now = new Date();
  const timeLimitMs = attempt.test.time_limit * 60 * 1000;
  const elapsedMs = now.getTime() - attempt.start_time.getTime();

  return elapsedMs < timeLimitMs;
}

// Check if attempt is expired
export function isAttemptExpired(attempt: {
  status: AttemptStatus;
  end_time: Date | null;
  start_time: Date;
  test: { time_limit: number };
}): boolean {
  if (attempt.status === "expired") {
    return true;
  }

  if (attempt.end_time) {
    const now = new Date();
    return now > attempt.end_time;
  }

  const now = new Date();
  const timeLimitMs = attempt.test.time_limit * 60 * 1000;
  const elapsedMs = now.getTime() - attempt.start_time.getTime();

  return elapsedMs >= timeLimitMs;
}

// Check if attempt is nearly expired (within 5 minutes)
export function isAttemptNearlyExpired(attempt: {
  end_time: Date | null;
  start_time: Date;
  test: { time_limit: number };
}): boolean {
  const timeRemaining = getAttemptTimeRemaining(attempt);
  return timeRemaining <= 300 && timeRemaining > 0; // 5 minutes
}

// Calculate time remaining in seconds
export function getAttemptTimeRemaining(attempt: {
  end_time: Date | null;
  start_time: Date;
  test: { time_limit: number };
}): number {
  const now = new Date();

  if (attempt.end_time) {
    const diff = attempt.end_time.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  }

  const timeLimitMs = attempt.test.time_limit * 60 * 1000;
  const elapsedMs = now.getTime() - attempt.start_time.getTime();
  const remainingMs = timeLimitMs - elapsedMs;

  return Math.max(0, Math.floor(remainingMs / 1000));
}

// Calculate progress percentage
export function calculateAttemptProgress(attempt: {
  questions_answered: number;
  total_questions: number | null;
}): number {
  if (!attempt.total_questions || attempt.total_questions === 0) {
    return 0;
  }

  return Math.round(
    (attempt.questions_answered / attempt.total_questions) * 100
  );
}

// Calculate time efficiency
export function calculateTimeEfficiency(attempt: {
  time_spent: number | null;
  start_time: Date;
  test: { time_limit: number };
}): number {
  const now = new Date();
  const elapsedMs = now.getTime() - attempt.start_time.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const timeLimit = attempt.test.time_limit;

  if (timeLimit === 0) return 100;

  const efficiency = Math.max(0, 100 - (elapsedMinutes / timeLimit) * 100);
  return Math.round(efficiency);
}

// Estimate completion time based on current progress
export function estimateCompletionTime(attempt: {
  questions_answered: number;
  total_questions: number;
  time_spent: number | null;
  start_time: Date;
}): number | null {
  if (attempt.questions_answered === 0 || !attempt.total_questions) {
    return null;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - attempt.start_time.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);

  const avgTimePerQuestion = elapsedMinutes / attempt.questions_answered;
  const remainingQuestions =
    attempt.total_questions - attempt.questions_answered;
  const estimatedMinutes = remainingQuestions * avgTimePerQuestion;

  return Math.round(estimatedMinutes);
}

// Generate next attempt number for user
export function getNextAttemptNumber(
  previousAttempts: { attempt_number: number }[]
): number {
  if (previousAttempts.length === 0) {
    return 1;
  }

  const maxAttemptNumber = Math.max(
    ...previousAttempts.map((a) => a.attempt_number)
  );
  return maxAttemptNumber + 1;
}

// ==================== CONSTANTS ====================
export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  started: "Started",
  in_progress: "In Progress",
  completed: "Completed",
  abandoned: "Abandoned",
  expired: "Expired",
};

export const ATTEMPT_STATUS_COLORS: Record<AttemptStatus, string> = {
  started: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  abandoned: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

// Maximum attempts allowed per test (configurable)
export const MAX_ATTEMPTS_PER_TEST = 3;

// Auto-save interval for attempt progress (in seconds)
export const ATTEMPT_AUTO_SAVE_INTERVAL = 30;

// Warning threshold for remaining time (in seconds)
export const TIME_WARNING_THRESHOLD = 300; // 5 minutes
