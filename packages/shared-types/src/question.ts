import { z } from "zod";

// ==================== ENUMS ====================
export const QuestionTypeEnum = z.enum([
  "multiple_choice",
  "true_false",
  "text",
  "rating_scale",
  "drawing",
  "sequence",
  "matrix",
]);

// ==================== REQUEST SCHEMAS ====================

// Option Schema for multiple choice and rating scale questions
export const QuestionOptionSchema = z.object({
  value: z.string().min(1, "Option value is required"),
  label: z.string().min(1, "Option label is required"),
  score: z.number().optional(), // For scoring-based questions
});

// Scoring Key Schema for complex scoring
export const ScoringKeySchema = z.record(z.string(), z.number());

// Create Question Request Schema
export const CreateQuestionRequestSchema = z
  .object({
    question: z.string().min(1, "Question text is required"),
    question_type: QuestionTypeEnum,
    options: z
      .array(QuestionOptionSchema)
      .min(1, "At least one option is required")
      .max(10, "Maximum 10 options allowed")
      .optional(),
    correct_answer: z.string().optional(),
    sequence: z
      .number()
      .min(1, "Sequence must be at least 1")
      .int("Sequence must be an integer"),
    time_limit: z
      .number()
      .min(1, "Time limit must be at least 1 second")
      .max(3600, "Time limit cannot exceed 1 hour")
      .optional(),
    image_url: z
      .string()
      .url("Invalid image URL")
      .max(500, "Image URL is too long")
      .optional(),
    audio_url: z
      .string()
      .url("Invalid audio URL")
      .max(500, "Audio URL is too long")
      .optional(),
    scoring_key: ScoringKeySchema.optional(),
    is_required: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const { question_type, options } = data;
      // Multiple choice and rating scale must have options
      if (["multiple_choice", "rating_scale"].includes(question_type)) {
        return options && options.length >= 2;
      }
      // True/false should have exactly 2 options
      if (question_type === "true_false") {
        return options && options.length === 2;
      }
      return true;
    },
    {
      message: "Options are required for this question type",
      path: ["options"],
    }
  );

// Create Question By Test ID Request Schema (Path Parameters)
export const CreateQuestionByTestIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Update Question Request Schema
export const UpdateQuestionRequestSchema = z
  .object({
    question: z.string().min(1, "Question text is required").optional(),
    question_type: QuestionTypeEnum.optional(),
    options: z
      .array(QuestionOptionSchema)
      .min(1, "At least one option is required")
      .max(10, "Maximum 10 options allowed")
      .optional(),
    correct_answer: z.string().optional(),
    sequence: z
      .number()
      .min(1, "Sequence must be at least 1")
      .int("Sequence must be an integer")
      .optional(),
    time_limit: z
      .number()
      .min(1, "Time limit must be at least 1 second")
      .max(3600, "Time limit cannot exceed 1 hour")
      .optional(),
    image_url: z
      .string()
      .url("Invalid image URL")
      .max(500, "Image URL is too long")
      .optional(),
    audio_url: z
      .string()
      .url("Invalid audio URL")
      .max(500, "Audio URL is too long")
      .optional(),
    scoring_key: ScoringKeySchema.optional(),
    is_required: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided for update
      const hasAtLeastOneField = Object.values(data).some(
        (value) => value !== undefined
      );
      return hasAtLeastOneField;
    },
    {
      message: "At least one field must be provided for update",
      path: ["root"],
    }
  );

// Update Question By ID Request Schema (Path Parameters)
export const UpdateQuestionByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
  questionId: z.string().uuid("Invalid question ID format"),
});

// Delete Question By ID Request Schema (Path Parameters)
export const DeleteQuestionByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
  questionId: z.string().uuid("Invalid question ID format"),
});

// Get Questions Request Schema (Query Parameters)
export const GetQuestionsRequestSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(20),

  // Search
  search: z.string().optional(), // Search by question text

  // Filters
  question_type: QuestionTypeEnum.optional(),
  has_image: z.coerce.boolean().optional(),
  has_audio: z.coerce.boolean().optional(),
  is_required: z.coerce.boolean().optional(),

  // Time limit range filters
  time_limit_min: z.coerce
    .number()
    .min(0, "Time limit must be positive")
    .optional(),
  time_limit_max: z.coerce
    .number()
    .min(0, "Time limit must be positive")
    .optional(),

  // Sorting
  sort_by: z
    .enum([
      "sequence",
      "question_type",
      "time_limit",
      "created_at",
      "updated_at",
    ])
    .default("sequence"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

// Get Questions By Test ID Request Schema (Path Parameters)
export const GetQuestionsByTestIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Get Question By ID Request Schema (Path Parameters)
export const GetQuestionByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
  questionId: z.string().uuid("Invalid question ID format"),
});

// ==================== RESPONSE SCHEMAS ====================

export const QuestionDataSchema = z.object({
  id: z.string().uuid(),
  test_id: z.string().uuid(),
  question: z.string(),
  question_type: QuestionTypeEnum,
  options: z.array(QuestionOptionSchema).nullable(),
  correct_answer: z.string().nullable(),
  sequence: z.number(),
  time_limit: z.number().nullable(),
  image_url: z.string().nullable(),
  audio_url: z.string().nullable(),
  scoring_key: ScoringKeySchema.nullable(),
  is_required: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Create Question Response Schema
export const CreateQuestionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: QuestionDataSchema,
  timestamp: z.string(),
});

// Update Question Response Schema
export const UpdateQuestionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: QuestionDataSchema,
  timestamp: z.string(),
});

// Delete Question Response Schema
export const DeleteQuestionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    test_id: z.string().uuid(),
    question: z.string(),
    sequence: z.number(),
    deleted_at: z.string().datetime(),
  }),
  timestamp: z.string(),
});

// Get Question By ID Response Schema
export const GetQuestionByIdResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: QuestionDataSchema,
  timestamp: z.string(),
});

// Pagination Meta Schema
export const QuestionPaginationMetaSchema = z.object({
  current_page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
  has_next_page: z.boolean(),
  has_prev_page: z.boolean(),
});

// Get Questions Response Schema
export const GetQuestionsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(QuestionDataSchema),
  meta: QuestionPaginationMetaSchema,
  test_info: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    module_type: z.string(),
    total_questions: z.number(),
  }),
  filters: z
    .object({
      question_types: z.array(QuestionTypeEnum),
      time_limit_range: z.object({
        min: z.number(),
        max: z.number(),
      }),
    })
    .optional(),
  timestamp: z.string(),
});

// Question Statistics Schema
export const QuestionStatsSchema = z.object({
  total_questions: z.number(),
  by_question_type: z.record(z.string(), z.number()),
  with_images: z.number(),
  with_audio: z.number(),
  required_questions: z.number(),
  optional_questions: z.number(),
  avg_time_limit: z.number(),
  sequence_gaps: z.array(z.number()), // Missing sequence numbers
});

export const GetQuestionStatsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: QuestionStatsSchema,
  test_info: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
  }),
  timestamp: z.string(),
});

// Error response schema
export const QuestionErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const QuestionErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(QuestionErrorDetailSchema).optional(),
  timestamp: z.string(),
});

// ==================== BULK OPERATIONS SCHEMAS ====================

// Bulk Create Questions Request Schema
export const BulkCreateQuestionsRequestSchema = z.object({
  questions: z
    .array(CreateQuestionRequestSchema)
    .min(1, "At least one question is required")
    .max(50, "Maximum 50 questions can be created at once"),
  auto_sequence: z.boolean().default(true), // Auto-assign sequence numbers
  start_sequence: z.number().min(1).default(1), // Starting sequence number if auto_sequence is true
});

// Bulk Create Questions Response Schema
export const BulkCreateQuestionsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    created_questions: z.array(QuestionDataSchema),
    total_created: z.number(),
    skipped_questions: z
      .array(
        z.object({
          index: z.number(),
          question: z.string(),
          reason: z.string(),
        })
      )
      .optional(),
  }),
  timestamp: z.string(),
});

// Reorder Questions Request Schema
export const ReorderQuestionsRequestSchema = z.object({
  question_orders: z
    .array(
      z.object({
        question_id: z.string().uuid("Invalid question ID format"),
        new_sequence: z.number().min(1, "Sequence must be at least 1"),
      })
    )
    .min(1, "At least one question order is required"),
});

// Reorder Questions Response Schema
export const ReorderQuestionsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    updated_questions: z.array(
      z.object({
        id: z.string().uuid(),
        sequence: z.number(),
        updated_at: z.date(),
      })
    ),
    total_updated: z.number(),
  }),
  timestamp: z.string(),
});

// Update Question Sequence Request Schema (Body)
export const UpdateQuestionSequenceRequestSchema = z.object({
  sequence: z
    .number()
    .min(1, "Sequence must be at least 1")
    .int("Sequence must be an integer"),
});

// Update Question Sequence By ID Request Schema (Path Parameters)
export const UpdateQuestionSequenceByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
  questionId: z.string().uuid("Invalid question ID format"),
});

// Update Question Sequence Response Schema
export const UpdateQuestionSequenceResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    test_id: z.string().uuid(),
    question: z.string(),
    old_sequence: z.number(),
    new_sequence: z.number(),
    updated_at: z.date(),
  }),
  conflicts: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        question: z.string(),
        old_sequence: z.number(),
        new_sequence: z.number(),
      })
    )
    .optional(), // Questions that had their sequence automatically adjusted
  timestamp: z.string(),
});

// Base question schema for bulk operations
export const BulkQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.enum([
    "multiple_choice",
    "true_false",
    "text",
    "rating_scale",
    "drawing",
    "sequence",
    "matrix",
  ]),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number().optional(),
      })
    )
    .optional(),
  correct_answer: z.string().optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z
    .record(z.string(), z.union([z.number(), z.string()]))
    .optional(),
  is_required: z.boolean().default(true),
});

// Individual question response for bulk operations
export const BulkQuestionResponseSchema = z.object({
  id: z.string(),
  question: z.string(),
  question_type: z.enum([
    "multiple_choice",
    "true_false",
    "text",
    "rating_scale",
    "drawing",
    "sequence",
    "matrix",
  ]),
  sequence: z.number(),
  time_limit: z.number().nullable(),
  is_required: z.boolean(),
  created_at: z.string().datetime(),
});

// Bulk create questions response data
export const BulkCreateQuestionsDataSchema = z.object({
  created_count: z.number(),
  questions: z.array(BulkQuestionResponseSchema),
  test_id: z.string(),
  new_total_questions: z.number(),
});

// Database schema for creating questions
export const CreateQuestionDBSchema = z.object({
  test_id: z.string(),
  question: z.string(),
  question_type: z.enum([
    "multiple_choice",
    "true_false",
    "text",
    "rating_scale",
    "drawing",
    "sequence",
    "matrix",
  ]),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number().optional(),
      })
    )
    .nullable()
    .optional(),
  correct_answer: z.string().nullable().optional(),
  sequence: z.number(),
  time_limit: z.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  scoring_key: z
    .record(z.string(), z.union([z.number(), z.string()]))
    .nullable()
    .optional(),
  is_required: z.boolean().default(true),
});

// ==================== TYPE EXPORTS ====================
export type QuestionType = z.infer<typeof QuestionTypeEnum>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type ScoringKey = z.infer<typeof ScoringKeySchema>;

export type CreateQuestionRequest = z.infer<typeof CreateQuestionRequestSchema>;
export type CreateQuestionByTestIdRequest = z.infer<
  typeof CreateQuestionByTestIdRequestSchema
>;
export type CreateQuestionResponse = z.infer<
  typeof CreateQuestionResponseSchema
>;
export type UpdateQuestionRequest = z.infer<typeof UpdateQuestionRequestSchema>;
export type UpdateQuestionByIdRequest = z.infer<
  typeof UpdateQuestionByIdRequestSchema
>;
export type UpdateQuestionResponse = z.infer<
  typeof UpdateQuestionResponseSchema
>;
export type DeleteQuestionByIdRequest = z.infer<
  typeof DeleteQuestionByIdRequestSchema
>;
export type DeleteQuestionResponse = z.infer<
  typeof DeleteQuestionResponseSchema
>;
export type GetQuestionsRequest = z.infer<typeof GetQuestionsRequestSchema>;
export type GetQuestionsResponse = z.infer<typeof GetQuestionsResponseSchema>;
export type GetQuestionsByTestIdRequest = z.infer<
  typeof GetQuestionsByTestIdRequestSchema
>;
export type GetQuestionByIdRequest = z.infer<
  typeof GetQuestionByIdRequestSchema
>;
export type GetQuestionByIdResponse = z.infer<
  typeof GetQuestionByIdResponseSchema
>;
export type QuestionPaginationMeta = z.infer<
  typeof QuestionPaginationMetaSchema
>;
export type QuestionErrorResponse = z.infer<typeof QuestionErrorResponseSchema>;
export type QuestionData = z.infer<typeof QuestionDataSchema>;
export type QuestionErrorDetail = z.infer<typeof QuestionErrorDetailSchema>;
export type QuestionStats = z.infer<typeof QuestionStatsSchema>;
export type GetQuestionStatsResponse = z.infer<
  typeof GetQuestionStatsResponseSchema
>;

// Bulk operations types
export type BulkCreateQuestionsRequest = z.infer<
  typeof BulkCreateQuestionsRequestSchema
>;
export type BulkCreateQuestionsResponse = z.infer<
  typeof BulkCreateQuestionsResponseSchema
>;
export type ReorderQuestionsRequest = z.infer<
  typeof ReorderQuestionsRequestSchema
>;
export type ReorderQuestionsResponse = z.infer<
  typeof ReorderQuestionsResponseSchema
>;
export type UpdateQuestionSequenceRequest = z.infer<
  typeof UpdateQuestionSequenceRequestSchema
>;
export type UpdateQuestionSequenceByIdRequest = z.infer<
  typeof UpdateQuestionSequenceByIdRequestSchema
>;
export type UpdateQuestionSequenceResponse = z.infer<
  typeof UpdateQuestionSequenceResponseSchema
>;
export type BulkQuestion = z.infer<typeof BulkQuestionSchema>;
export type BulkQuestionResponse = z.infer<typeof BulkQuestionResponseSchema>;
export type BulkCreateQuestionsData = z.infer<
  typeof BulkCreateQuestionsDataSchema
>;

// ==================== DATABASE TYPES ====================
export type CreateQuestionDB = {
  test_id: string;
  question: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  sequence: number;
  time_limit: number | null;
  image_url: string | null;
  audio_url: string | null;
  scoring_key: ScoringKey | null;
  is_required: boolean;
};

export type UpdateQuestionDB = {
  question?: string;
  question_type?: QuestionType;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  sequence?: number;
  time_limit?: number | null;
  image_url?: string | null;
  audio_url?: string | null;
  scoring_key?: ScoringKey | null;
  is_required?: boolean;
  updated_at: Date;
};

export type UpdateQuestionSequenceDB = {
  sequence: number;
  updated_at: Date;
};

// ==================== UTILITY TYPES ====================

// For frontend display
export type QuestionCardData = {
  id: string;
  test_id: string;
  question: string;
  question_type: QuestionType;
  sequence: number;
  time_limit: number | null;
  has_image: boolean;
  has_audio: boolean;
  is_required: boolean;
  options_count: number;
};

// For test taking
export type QuestionForTest = {
  id: string;
  question: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  sequence: number;
  time_limit: number | null;
  image_url: string | null;
  audio_url: string | null;
  is_required: boolean;
};

// Filter options for frontend
export type QuestionFilterOptions = {
  question_types: { value: QuestionType; label: string }[];
};

// ==================== CONSTANTS ====================
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  text: "Text Input",
  rating_scale: "Rating Scale",
  drawing: "Drawing",
  sequence: "Sequence",
  matrix: "Matrix",
};

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  multiple_choice: "Choose one answer from multiple options",
  true_false: "Choose between True or False",
  text: "Open text response",
  rating_scale: "Rate on a scale (e.g., 1-5)",
  drawing: "Draw or sketch response",
  sequence: "Arrange items in correct order",
  matrix: "Pattern recognition or matrix reasoning",
};

// Default question time limits by type (in seconds)
export const DEFAULT_QUESTION_TIME_LIMITS: Record<QuestionType, number> = {
  multiple_choice: 60,
  true_false: 30,
  text: 180,
  rating_scale: 45,
  drawing: 300,
  sequence: 120,
  matrix: 90,
};

// Helper function to get default time limit by question type
export function getDefaultTimeLimitByQuestionType(
  questionType: QuestionType
): number {
  return DEFAULT_QUESTION_TIME_LIMITS[questionType];
}

// ==================== VALIDATION HELPERS ====================

// Validate question options based on question type
export function validateQuestionOptions(
  questionType: QuestionType,
  options: QuestionOption[] | null | undefined
): boolean {
  switch (questionType) {
    case "multiple_choice":
      return (
        options !== null &&
        options !== undefined &&
        options.length >= 2 &&
        options.length <= 10
      );
    case "true_false":
      return options !== null && options !== undefined && options.length === 2;
    case "rating_scale":
      return (
        options !== null &&
        options !== undefined &&
        options.length >= 2 &&
        options.length <= 10
      );
    case "text":
    case "drawing":
    case "sequence":
    case "matrix":
      return true; // These types don't require options
    default:
      return false;
  }
}

// Check if question type requires options
export function questionTypeRequiresOptions(
  questionType: QuestionType
): boolean {
  return ["multiple_choice", "true_false", "rating_scale"].includes(
    questionType
  );
}

// Check if question type supports scoring
export function questionTypeSupportsScoringKey(
  questionType: QuestionType
): boolean {
  return ["multiple_choice", "rating_scale", "sequence", "matrix"].includes(
    questionType
  );
}

// Check if question type supports media
export function questionTypeSupportsMedia(questionType: QuestionType): boolean {
  return true; // All question types can have images/audio
}
