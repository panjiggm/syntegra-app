import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type GetQuestionByIdRequest,
  type GetQuestionByIdResponse,
  type QuestionErrorResponse,
  type QuestionData,
} from "shared-types";

export async function getQuestionByIdHandler(
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
    const { testId, questionId } = c.req.param() as GetQuestionByIdRequest;

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
            message: "Only admin users can access questions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if test exists first
    const [targetTest] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        status: tests.status,
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

    // Find question by ID and test ID
    const [question] = await db
      .select({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        question_type: questions.question_type,
        options: questions.options,
        correct_answer: questions.correct_answer,
        sequence: questions.sequence,
        time_limit: questions.time_limit,
        image_url: questions.image_url,
        audio_url: questions.audio_url,
        scoring_key: questions.scoring_key,
        is_required: questions.is_required,
        created_at: questions.created_at,
        updated_at: questions.updated_at,
      })
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.test_id, testId)))
      .limit(1);

    // Check if question exists
    if (!question) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Question not found",
        errors: [
          {
            field: "questionId",
            message: `Question with ID "${questionId}" not found in test "${targetTest.name}"`,
            code: "QUESTION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Transform database result to response format
    const questionData: QuestionData = {
      id: question.id,
      test_id: question.test_id,
      question: question.question,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
      sequence: question.sequence,
      time_limit: question.time_limit,
      image_url: question.image_url,
      audio_url: question.audio_url,
      scoring_key: question.scoring_key,
      is_required: question.is_required ?? true,
      created_at: question.created_at,
      updated_at: question.updated_at,
    };

    const response: GetQuestionByIdResponse = {
      success: true,
      message: `Question #${question.sequence} retrieved successfully from test '${targetTest.name}'`,
      data: questionData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Question retrieved by admin ${auth.user.email}: Sequence ${question.sequence} from test ${targetTest.name}`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting question by ID:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
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

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid ID format",
          errors: [
            {
              field: "id",
              message: "Test ID or Question ID must be a valid UUID",
              code: "INVALID_UUID",
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
      message: "Failed to retrieve question",
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
