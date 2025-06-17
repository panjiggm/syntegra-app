import { z } from "zod";

// ==================== ENUMS ====================
export const TestProgressStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "auto_completed", // completed by time limit
]);

// ==================== BASE SCHEMAS ====================
export const ParticipantTestProgressSchema = z.object({
  id: z.string().uuid(),
  participant_id: z.string().uuid(),
  session_id: z.string().uuid(),
  test_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: TestProgressStatusEnum,
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  expected_completion_at: z.date().nullable(), // started_at + time_limit
  answered_questions: z.number().int().min(0),
  total_questions: z.number().int().min(0),
  time_spent: z.number().int().min(0), // in seconds
  is_auto_completed: z.boolean(),
  last_activity_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),

  // Test information (from join)
  test: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    module_type: z.string(),
    time_limit: z.number().int().min(0), // in minutes
    total_questions: z.number().int().min(0),
    icon: z.string().nullable(),
    card_color: z.string().nullable(),
    question_type: z.string().nullable(),
  }),

  // Computed fields
  time_remaining: z.number().int().min(0), // in seconds
  progress_percentage: z.number().min(0).max(100),
  is_time_expired: z.boolean(),
});

// ==================== REQUEST SCHEMAS ====================

// Get Progress for Session + Participant
export const GetParticipantTestProgressRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
});

// Get Progress for Single Test
export const GetTestProgressRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
  testId: z.string().uuid("Invalid test ID format"),
});

// Start Test
export const StartTestRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
  testId: z.string().uuid("Invalid test ID format"),
});

// Update Progress (for answered questions, activity tracking)
export const UpdateTestProgressRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
  testId: z.string().uuid("Invalid test ID format"),
  answered_questions: z.number().int().min(0).optional(),
});

// Complete Test
export const CompleteTestRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
  testId: z.string().uuid("Invalid test ID format"),
  is_auto_completed: z.boolean().default(false),
});

// ==================== RESPONSE SCHEMAS ====================

// Get Progress Response
export const GetParticipantTestProgressResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(ParticipantTestProgressSchema),
  timestamp: z.string(),
});

// Single Test Progress Response
export const GetTestProgressResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ParticipantTestProgressSchema,
  timestamp: z.string(),
});

// Start Test Response
export const StartTestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ParticipantTestProgressSchema,
  timestamp: z.string(),
});

// Update Progress Response
export const UpdateTestProgressResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ParticipantTestProgressSchema,
  timestamp: z.string(),
});

// Complete Test Response
export const CompleteTestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ParticipantTestProgressSchema,
  timestamp: z.string(),
});

// Error Response
export const ParticipantTestProgressErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string().optional(),
        message: z.string(),
        code: z.string().optional(),
      })
    )
    .optional(),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type TestProgressStatus = z.infer<typeof TestProgressStatusEnum>;
export type ParticipantTestProgress = z.infer<
  typeof ParticipantTestProgressSchema
>;

// Request Types
export type GetParticipantTestProgressRequest = z.infer<
  typeof GetParticipantTestProgressRequestSchema
>;
export type GetTestProgressRequest = z.infer<
  typeof GetTestProgressRequestSchema
>;
export type StartTestRequest = z.infer<typeof StartTestRequestSchema>;
export type UpdateTestProgressRequest = z.infer<
  typeof UpdateTestProgressRequestSchema
>;
export type CompleteTestRequest = z.infer<typeof CompleteTestRequestSchema>;

// Response Types
export type GetParticipantTestProgressResponse = z.infer<
  typeof GetParticipantTestProgressResponseSchema
>;
export type GetTestProgressResponse = z.infer<
  typeof GetTestProgressResponseSchema
>;
export type StartTestResponse = z.infer<typeof StartTestResponseSchema>;
export type UpdateTestProgressResponse = z.infer<
  typeof UpdateTestProgressResponseSchema
>;
export type CompleteTestResponse = z.infer<typeof CompleteTestResponseSchema>;
export type ParticipantTestProgressErrorResponse = z.infer<
  typeof ParticipantTestProgressErrorResponseSchema
>;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate time remaining in seconds
 */
export function calculateTimeRemaining(
  startedAt: Date | null,
  timeLimitMinutes: number
): number {
  if (!startedAt) return timeLimitMinutes * 60;

  const now = new Date();
  const expectedCompletion = new Date(
    startedAt.getTime() + timeLimitMinutes * 60 * 1000
  );
  const remaining = Math.max(
    0,
    Math.floor((expectedCompletion.getTime() - now.getTime()) / 1000)
  );

  return remaining;
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(
  answeredQuestions: number,
  totalQuestions: number
): number {
  if (totalQuestions === 0) return 0;
  return Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100));
}

/**
 * Check if test time has expired
 */
export function isTestTimeExpired(
  startedAt: Date | null,
  timeLimitMinutes: number
): boolean {
  if (!startedAt) return false;

  const now = new Date();
  const expectedCompletion = new Date(
    startedAt.getTime() + timeLimitMinutes * 60 * 1000
  );

  return now >= expectedCompletion;
}

/**
 * Get expected completion time
 */
export function getExpectedCompletionTime(
  startedAt: Date,
  timeLimitMinutes: number
): Date {
  return new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
}
