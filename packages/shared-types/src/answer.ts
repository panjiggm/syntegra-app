import { z } from "zod";

// ==================== ENUMS ====================
export const AnswerTypeEnum = z.enum([
  "text",
  "multiple_choice",
  "true_false",
  "rating_scale",
  "drawing",
  "sequence",
  "matrix",
]);

// ==================== REQUEST SCHEMAS ====================

// Submit Answer Request Schema
export const SubmitAnswerRequestSchema = z.object({
  question_id: z.string().uuid("Invalid question ID format"),
  answer: z.string().min(1, "Answer is required").optional(),
  answer_data: z.record(z.any()).optional(), // For complex answers like drawings, arrays
  time_taken: z.number().min(0, "Time taken must be positive").optional(),
  confidence_level: z
    .number()
    .min(1, "Confidence level must be at least 1")
    .max(5, "Confidence level must be at most 5")
    .optional(),
  is_draft: z.boolean().default(false), // For auto-save functionality
});

// Auto-save Answer Request Schema
export const AutoSaveAnswerRequestSchema = z.object({
  question_id: z.string().uuid("Invalid question ID format"),
  answer: z.string().optional(),
  answer_data: z.record(z.any()).optional(),
  time_taken: z.number().min(0).optional(),
  confidence_level: z.number().min(1).max(5).optional(),
});

// Auto-save Answer By Attempt Request Schema (Path Parameters)
export const AutoSaveAnswerByAttemptRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

// Get Attempt Answers Query Schema
export const GetAttemptAnswersQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(50),

  // Filters
  question_id: z.string().uuid("Invalid question ID format").optional(),
  is_answered: z.coerce.boolean().optional(), // Filter answered/unanswered
  confidence_level: z.coerce.number().min(1).max(5).optional(),

  // Sorting
  sort_by: z
    .enum(["answered_at", "time_taken", "confidence_level", "sequence"])
    .default("answered_at"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),

  // Response format
  include_correct_answers: z.coerce.boolean().default(false), // Admin only
  include_score: z.coerce.boolean().default(false), // Admin only
});

// Path Parameter Schemas
export const GetAttemptAnswersRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

export const SubmitAnswerByAttemptRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
});

export const GetSpecificAnswerRequestSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID format"),
  questionId: z.string().uuid("Invalid question ID format"),
});

// ==================== RESPONSE SCHEMAS ====================

// User Answer Data Schema
export const UserAnswerDataSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  question_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  answer: z.string().nullable(),
  answer_data: z.record(z.any()).nullable(),
  score: z.number().nullable(),
  time_taken: z.number().nullable(),
  is_correct: z.boolean().nullable(),
  confidence_level: z.number().nullable(),
  answered_at: z.date(),
  created_at: z.date(),

  // Populated fields
  question: z
    .object({
      id: z.string().uuid(),
      question: z.string(),
      question_type: z.string(),
      sequence: z.number(),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            score: z.number().optional(),
          })
        )
        .nullable(),
      correct_answer: z.string().nullable(),
      time_limit: z.number().nullable(),
      image_url: z.string().nullable(),
      audio_url: z.string().nullable(),
      is_required: z.boolean(),
    })
    .optional(),

  // Computed fields
  is_answered: z.boolean().optional(),
  answer_display: z.string().optional(), // Formatted answer for display
});

// Submit Answer Response Schema
export const SubmitAnswerResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    answer: UserAnswerDataSchema,
    attempt_progress: z.object({
      total_questions: z.number(),
      answered_questions: z.number(),
      progress_percentage: z.number(),
      time_remaining: z.number(), // in seconds
    }),
    next_question: z
      .object({
        id: z.string().uuid(),
        sequence: z.number(),
        question_type: z.string(),
      })
      .nullable(),
  }),
  timestamp: z.string(),
});

// Auto-save Answer Response Schema
export const AutoSaveAnswerResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    answer_id: z.string().uuid().optional(),
    is_new: z.boolean(),
    auto_saved_at: z.string().datetime(),
  }),
  timestamp: z.string(),
});

// Get Attempt Answers Response Schema
export const GetAttemptAnswersResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(UserAnswerDataSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next_page: z.boolean(),
    has_prev_page: z.boolean(),
  }),
  summary: z.object({
    total_questions: z.number(),
    answered_questions: z.number(),
    unanswered_questions: z.number(),
    progress_percentage: z.number(),
    average_time_per_question: z.number(), // in seconds
    total_time_spent: z.number(), // in seconds
    average_confidence_level: z.number().nullable(),
  }),
  timestamp: z.string(),
});

// Get Specific Answer Response Schema
export const GetSpecificAnswerResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z
    .object({
      answer: UserAnswerDataSchema.nullable(),
      question: z.object({
        id: z.string().uuid(),
        question: z.string(),
        question_type: z.string(),
        sequence: z.number(),
        options: z
          .array(
            z.object({
              value: z.string(),
              label: z.string(),
              score: z.number().optional(),
            })
          )
          .nullable(),
        time_limit: z.number().nullable(),
        image_url: z.string().nullable(),
        audio_url: z.string().nullable(),
        is_required: z.boolean(),
      }),
      is_answered: z.boolean(),
      can_modify: z.boolean(), // Based on attempt status and rules
    })
    .nullable(),
  timestamp: z.string(),
});

// Answer Statistics Schema (for admin)
export const AnswerStatsSchema = z.object({
  attempt_id: z.string().uuid(),
  total_questions: z.number(),
  answered_questions: z.number(),
  correct_answers: z.number(),
  incorrect_answers: z.number(),
  skipped_questions: z.number(),
  total_score: z.number(),
  average_score: z.number(),
  completion_percentage: z.number(),
  total_time_spent: z.number(), // in seconds
  average_time_per_question: z.number(),
  fastest_answer: z.number().nullable(),
  slowest_answer: z.number().nullable(),
  confidence_distribution: z.record(z.string(), z.number()), // confidence level -> count
});

export const GetAnswerStatsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: AnswerStatsSchema,
  timestamp: z.string(),
});

// Error response schema
export const AnswerErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const AnswerErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(AnswerErrorDetailSchema).optional(),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type AnswerType = z.infer<typeof AnswerTypeEnum>;

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;
export type SubmitAnswerByAttemptRequest = z.infer<
  typeof SubmitAnswerByAttemptRequestSchema
>;
export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponseSchema>;

export type AutoSaveAnswerRequest = z.infer<typeof AutoSaveAnswerRequestSchema>;
export type AutoSaveAnswerByAttemptRequest = z.infer<
  typeof AutoSaveAnswerByAttemptRequestSchema
>;
export type AutoSaveAnswerResponse = z.infer<
  typeof AutoSaveAnswerResponseSchema
>;

export type GetAttemptAnswersRequest = z.infer<
  typeof GetAttemptAnswersRequestSchema
>;
export type GetAttemptAnswersQuery = z.infer<
  typeof GetAttemptAnswersQuerySchema
>;
export type GetAttemptAnswersResponse = z.infer<
  typeof GetAttemptAnswersResponseSchema
>;

export type GetSpecificAnswerRequest = z.infer<
  typeof GetSpecificAnswerRequestSchema
>;
export type GetSpecificAnswerResponse = z.infer<
  typeof GetSpecificAnswerResponseSchema
>;

export type UserAnswerData = z.infer<typeof UserAnswerDataSchema>;
export type AnswerErrorResponse = z.infer<typeof AnswerErrorResponseSchema>;
export type AnswerErrorDetail = z.infer<typeof AnswerErrorDetailSchema>;
export type AnswerStats = z.infer<typeof AnswerStatsSchema>;
export type GetAnswerStatsResponse = z.infer<
  typeof GetAnswerStatsResponseSchema
>;

// ==================== DATABASE TYPES ====================
export type CreateUserAnswerDB = {
  user_id: string;
  question_id: string;
  attempt_id: string;
  answer: string | null;
  answer_data: Record<string, any> | null;
  score: string | null;
  time_taken: number | null;
  is_correct: boolean | null;
  confidence_level: number | null;
  answered_at: Date;
};

export type UpdateUserAnswerDB = {
  answer?: string | null;
  answer_data?: Record<string, any> | null;
  score?: string | null;
  time_taken?: number | null;
  is_correct?: boolean | null;
  confidence_level?: number | null;
  answered_at: Date;
};

// ==================== UTILITY FUNCTIONS ====================

// Validate answer based on question type
export function validateAnswerByQuestionType(
  questionType: string,
  answer: string | null,
  answerData: Record<string, any> | null,
  options?: Array<{ value: string; label: string; score?: number }>
): { isValid: boolean; errorMessage?: string } {
  switch (questionType) {
    case "multiple_choice":
      if (!answer) {
        return { isValid: false, errorMessage: "Answer is required" };
      }
      if (options && !options.some((opt) => opt.value === answer)) {
        return { isValid: false, errorMessage: "Invalid option selected" };
      }
      return { isValid: true };

    case "true_false":
      if (!answer || !["true", "false"].includes(answer)) {
        return {
          isValid: false,
          errorMessage: "Answer must be 'true' or 'false'",
        };
      }
      return { isValid: true };

    case "text":
      if (!answer || answer.trim().length === 0) {
        return { isValid: false, errorMessage: "Text answer is required" };
      }
      return { isValid: true };

    case "rating_scale":
      if (!answer) {
        return { isValid: false, errorMessage: "Rating is required" };
      }
      const rating = parseInt(answer);
      if (isNaN(rating) || rating < 1 || rating > 10) {
        return {
          isValid: false,
          errorMessage: "Rating must be between 1 and 10",
        };
      }
      return { isValid: true };

    case "drawing":
      if (!answerData || !answerData.drawing_data) {
        return { isValid: false, errorMessage: "Drawing data is required" };
      }
      return { isValid: true };

    case "sequence":
      if (!answerData || !Array.isArray(answerData.sequence)) {
        return { isValid: false, errorMessage: "Sequence data is required" };
      }
      return { isValid: true };

    case "matrix":
      if (!answerData || !answerData.matrix_selection) {
        return { isValid: false, errorMessage: "Matrix selection is required" };
      }
      return { isValid: true };

    default:
      return { isValid: true }; // Allow unknown question types for flexibility
  }
}

// Format answer for display
export function formatAnswerForDisplay(
  answer: string | null,
  answerData: Record<string, any> | null,
  questionType: string,
  options?: Array<{ value: string; label: string }>
): string {
  if (!answer && !answerData) {
    return "No answer provided";
  }

  switch (questionType) {
    case "multiple_choice":
      if (options && answer) {
        const option = options.find((opt) => opt.value === answer);
        return option ? option.label : answer;
      }
      return answer || "No answer";

    case "true_false":
      return answer === "true"
        ? "True"
        : answer === "false"
          ? "False"
          : "No answer";

    case "rating_scale":
      return answer ? `${answer} out of 10` : "No rating";

    case "drawing":
      return "Drawing submitted";

    case "sequence":
      if (answerData?.sequence) {
        return `Sequence: ${answerData.sequence.join(", ")}`;
      }
      return "Sequence submitted";

    case "matrix":
      if (answerData?.matrix_selection) {
        return `Matrix selection: ${answerData.matrix_selection}`;
      }
      return "Matrix selection submitted";

    case "text":
      return answer || "No text provided";

    default:
      return answer || "Answer submitted";
  }
}

// Calculate answer score based on question type and correct answer
export function calculateAnswerScore(
  answer: string | null,
  answerData: Record<string, any> | null,
  questionType: string,
  correctAnswer: string | null,
  scoringKey?: Record<string, number>,
  options?: Array<{ value: string; label: string; score?: number }>
): { score: number; isCorrect: boolean } {
  if (!answer && !answerData) {
    return { score: 0, isCorrect: false };
  }

  switch (questionType) {
    case "multiple_choice":
    case "true_false":
      const isCorrect = answer === correctAnswer;
      const score = isCorrect ? 1 : 0;
      return { score, isCorrect };

    case "rating_scale":
      if (options && answer) {
        const option = options.find((opt) => opt.value === answer);
        return { score: option?.score || 0, isCorrect: true };
      }
      return { score: 0, isCorrect: false };

    case "text":
      // Text answers typically need manual scoring
      return { score: 0, isCorrect: false };

    case "drawing":
    case "sequence":
    case "matrix":
      // Complex answers typically need manual scoring or AI evaluation
      return { score: 0, isCorrect: false };

    default:
      return { score: 0, isCorrect: false };
  }
}

// Check if answer can be modified
export function canModifyAnswer(
  attemptStatus: string,
  attemptEndTime: Date | null,
  questionTimeLimit?: number | null
): boolean {
  // Cannot modify if attempt is completed or expired
  if (["completed", "expired", "abandoned"].includes(attemptStatus)) {
    return false;
  }

  // Check if attempt time has expired
  if (attemptEndTime) {
    const now = new Date();
    if (now > attemptEndTime) {
      return false;
    }
  }

  // Add more complex logic here if needed
  // For example, check if question-specific time limit has expired

  return true;
}

// ==================== CONSTANTS ====================
export const ANSWER_TYPE_LABELS: Record<string, string> = {
  text: "Text Answer",
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  rating_scale: "Rating Scale",
  drawing: "Drawing",
  sequence: "Sequence",
  matrix: "Matrix",
};

export const CONFIDENCE_LEVEL_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

// Auto-save interval for draft answers (in seconds)
export const AUTO_SAVE_INTERVAL = 30;

// Maximum file size for drawing answers (in bytes)
export const MAX_DRAWING_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Maximum text length for text answers
export const MAX_TEXT_ANSWER_LENGTH = 5000;
