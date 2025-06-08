import { Context } from "hono";
import { z } from "zod";
import { eq, max, sql } from "drizzle-orm";
import { getDbFromEnv, questions, tests, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type BulkCreateQuestionsResponse,
  type QuestionErrorResponse,
  type CreateQuestionDB,
} from "shared-types";

// Individual question validation schemas
const MultipleChoiceQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("multiple_choice"),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number().optional(),
      })
    )
    .min(2, "Multiple choice questions need at least 2 options"),
  correct_answer: z.string().optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

const TrueFalseQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("true_false"),
  correct_answer: z.enum(["true", "false"]).optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

const TextQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("text"),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

const RatingScaleQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("rating_scale"),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number(),
      })
    )
    .min(2, "Rating scale questions need at least 2 options"),
  correct_answer: z.string().optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

const DrawingQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("drawing"),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  is_required: z.boolean().default(true),
});

const SequenceQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("sequence"),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number().optional(),
      })
    )
    .min(3, "Sequence questions need at least 3 options"),
  correct_answer: z.string().optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

const MatrixQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  question_type: z.literal("matrix"),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        score: z.number().optional(),
      })
    )
    .min(4, "Matrix questions need at least 4 options"),
  correct_answer: z.string().optional(),
  time_limit: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  scoring_key: z.record(z.string(), z.number()).optional(),
  is_required: z.boolean().default(true),
});

// Union schema for all question types
const QuestionSchema = z.union([
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  TextQuestionSchema,
  RatingScaleQuestionSchema,
  DrawingQuestionSchema,
  SequenceQuestionSchema,
  MatrixQuestionSchema,
]);

// Bulk request schema
const BulkCreateQuestionsRequestSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .min(1, "At least one question is required"),
  start_sequence: z.number().positive().optional(),
  auto_sequence: z.boolean().default(true),
});

export async function bulkCreateQuestionsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message:
              "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get testId from URL params
    const testId = c.req.param("testId");
    if (!testId) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Test ID is required",
        errors: [
          {
            field: "testId",
            message: "Test ID parameter is missing",
            code: "REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Parse and validate request body
    const rawBody = await c.req.json();
    const validationResult =
      BulkCreateQuestionsRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const {
      questions: questionsData,
      start_sequence,
      auto_sequence,
    } = validationResult.data;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Verify test exists
    const [testExists] = await db
      .select({ id: tests.id })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    if (!testExists) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "testId",
            message: "Test with this ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Get current max sequence for auto-numbering
    let currentMaxSequence = 0;
    if (auto_sequence) {
      const [maxSeqResult] = await db
        .select({ maxSeq: max(questions.sequence) })
        .from(questions)
        .where(eq(questions.test_id, testId));

      currentMaxSequence = maxSeqResult?.maxSeq || 0;
    }

    // Prepare questions for insertion
    const questionsToInsert: CreateQuestionDB[] = questionsData.map(
      (questionData, index) => {
        let sequence: number;

        if (auto_sequence) {
          sequence = currentMaxSequence + index + 1;
        } else if (start_sequence) {
          sequence = start_sequence + index;
        } else {
          sequence = index + 1;
        }

        const baseQuestion: CreateQuestionDB = {
          test_id: testId,
          question: questionData.question,
          question_type: questionData.question_type,
          sequence,
          time_limit: questionData.time_limit || null,
          image_url: questionData.image_url || null,
          audio_url: questionData.audio_url || null,
          is_required: questionData.is_required ?? true,
          options: null,
          correct_answer: null,
          scoring_key: null,
        };

        // Add type-specific fields
        switch (questionData.question_type) {
          case "multiple_choice":
          case "rating_scale":
          case "sequence":
          case "matrix":
            baseQuestion.options = questionData.options;
            baseQuestion.correct_answer = questionData.correct_answer || null;
            baseQuestion.scoring_key = questionData.scoring_key || null;
            break;

          case "true_false":
            baseQuestion.correct_answer = questionData.correct_answer || null;
            baseQuestion.scoring_key = questionData.scoring_key || null;
            break;

          case "text":
            baseQuestion.scoring_key = questionData.scoring_key || null;
            break;

          case "drawing":
            // Drawing questions don't need additional fields
            break;
        }

        return baseQuestion;
      }
    );

    // Check for duplicate sequences if not auto-sequencing
    if (!auto_sequence) {
      const sequencesToCheck = questionsToInsert.map((q) => q.sequence);
      const existingSequences = await db
        .select({ sequence: questions.sequence })
        .from(questions)
        .where(eq(questions.test_id, testId));

      const existingSeqNumbers = existingSequences.map((s) => s.sequence);
      const duplicates = sequencesToCheck.filter((seq) =>
        existingSeqNumbers.includes(seq)
      );

      if (duplicates.length > 0) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Sequence numbers already exist",
          errors: [
            {
              field: "sequence",
              message: `Sequence numbers already exist: ${duplicates.join(", ")}`,
              code: "DUPLICATE_SEQUENCE",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }
    }

    // Insert questions in bulk
    const insertedQuestions = await db
      .insert(questions)
      .values(questionsToInsert)
      .returning();

    // Update test's total_questions count
    const newTotalQuestions = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(eq(questions.test_id, testId));

    await db
      .update(tests)
      .set({
        total_questions: newTotalQuestions[0].count,
        updated_at: new Date(),
      })
      .where(eq(tests.id, testId));

    // Prepare response
    const response: BulkCreateQuestionsResponse = {
      success: true,
      message: `Successfully created ${insertedQuestions.length} questions`,
      data: {
        total_created: insertedQuestions.length,
        created_questions: insertedQuestions.map((q) => ({
          ...q,
          is_required: q.is_required ?? true,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error in bulk create questions:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Duplicate sequence numbers detected",
          errors: [
            {
              field: "sequence",
              message:
                "One or more sequence numbers already exist for this test",
              code: "UNIQUE_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }
    }

    // Generic error response
    const errorResponse: QuestionErrorResponse = {
      success: false,
      message: "Failed to create questions",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "INTERNAL_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
