import { Context } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type CreateQuestionRequest,
  type CreateQuestionByTestIdRequest,
  type CreateQuestionResponse,
  type QuestionErrorResponse,
  type CreateQuestionDB,
  validateQuestionOptions,
  questionTypeRequiresOptions,
  getDefaultTimeLimitByQuestionType,
} from "shared-types";

export async function createQuestionHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
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

    // Get path parameters (already validated by zValidator)
    const { testId } = c.req.param() as CreateQuestionByTestIdRequest;

    // Get validated data from request
    const data = (await c.req.json()) as CreateQuestionRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can create questions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if test exists and is not archived
    const [targetTest] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        status: tests.status,
        total_questions: tests.total_questions,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    if (!targetTest) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "testId",
            message: `Test with ID "${testId}" not found`,
            code: "TEST_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if test is archived
    if (targetTest.status === "archived") {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Cannot add questions to archived test",
        errors: [
          {
            field: "status",
            message: "Questions cannot be added to archived tests",
            code: "TEST_ARCHIVED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate question options based on question type
    if (questionTypeRequiresOptions(data.question_type)) {
      if (
        !data.options ||
        !validateQuestionOptions(data.question_type, data.options)
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid options for question type",
          errors: [
            {
              field: "options",
              message: `Question type '${data.question_type}' requires valid options`,
              code: "INVALID_OPTIONS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Check if sequence number already exists for this test
    const [existingQuestion] = await db
      .select({ id: questions.id, sequence: questions.sequence })
      .from(questions)
      .where(
        and(
          eq(questions.test_id, testId),
          eq(questions.sequence, data.sequence)
        )
      )
      .limit(1);

    if (existingQuestion) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Sequence number already exists",
        errors: [
          {
            field: "sequence",
            message: `A question with sequence number ${data.sequence} already exists for this test`,
            code: "SEQUENCE_EXISTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Apply defaults if not provided
    const timeLimit =
      data.time_limit || getDefaultTimeLimitByQuestionType(data.question_type);
    const isRequired = data.is_required ?? true;

    // Prepare question data for database
    const questionData: CreateQuestionDB = {
      test_id: testId,
      question: data.question,
      question_type: data.question_type,
      options: data.options || null,
      correct_answer: data.correct_answer || null,
      sequence: data.sequence,
      time_limit: timeLimit,
      image_url: data.image_url || null,
      audio_url: data.audio_url || null,
      scoring_key: data.scoring_key || null,
      is_required: isRequired,
    };

    // Insert question into database
    const [newQuestion] = await db
      .insert(questions)
      .values(questionData)
      .returning();

    if (!newQuestion) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Failed to create question",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Update test's total_questions count
    const [updatedQuestionCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(eq(questions.test_id, testId));

    const newTotalQuestions = updatedQuestionCount?.count || 0;

    // Update the test with the new question count
    await db
      .update(tests)
      .set({
        total_questions: newTotalQuestions,
        updated_at: new Date(),
        updated_by: auth.user.id,
      })
      .where(eq(tests.id, testId));

    // Prepare success response
    const responseData = {
      id: newQuestion.id,
      test_id: newQuestion.test_id,
      question: newQuestion.question,
      question_type: newQuestion.question_type,
      options: newQuestion.options,
      correct_answer: newQuestion.correct_answer,
      sequence: newQuestion.sequence,
      time_limit: newQuestion.time_limit,
      image_url: newQuestion.image_url,
      audio_url: newQuestion.audio_url,
      scoring_key: newQuestion.scoring_key,
      is_required: newQuestion.is_required ?? true,
      created_at: newQuestion.created_at,
      updated_at: newQuestion.updated_at,
    };

    const response: CreateQuestionResponse = {
      success: true,
      message: `Question #${newQuestion.sequence} created successfully for test '${targetTest.name}'`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Question created by admin ${auth.user.email}: Sequence ${newQuestion.sequence} for test ${targetTest.name} (${targetTest.category})`
    );

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating question:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations (sequence number)
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Sequence number already exists",
          errors: [
            {
              field: "sequence",
              message: "A question with this sequence number already exists",
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

      // Handle invalid JSON in options or scoring_key fields
      if (error.message.includes("JSON") || error.message.includes("json")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid JSON data in request",
          errors: [
            {
              message: "Options or scoring key contain invalid data",
              code: "INVALID_JSON",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle foreign key constraint errors (test_id)
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid test reference",
          errors: [
            {
              field: "test_id",
              message: "Test ID is invalid or test does not exist",
              code: "FOREIGN_KEY_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid test ID format",
          errors: [
            {
              field: "testId",
              message: "Test ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle check constraint violations (e.g., invalid question_type, sequence < 1)
      if (error.message.includes("check constraint")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid data provided",
          errors: [
            {
              message: "Data violates database constraints",
              code: "CHECK_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle enum constraint violations (invalid question_type)
      if (error.message.includes("invalid input value for enum")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid question type",
          errors: [
            {
              field: "question_type",
              message: "Invalid question type provided",
              code: "INVALID_ENUM",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: QuestionErrorResponse = {
      success: false,
      message: "Internal server error",
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
