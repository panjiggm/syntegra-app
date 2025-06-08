import { Context } from "hono";
import { eq, and, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  questions,
  userAnswers,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type DeleteQuestionByIdRequest,
  type DeleteQuestionResponse,
  type QuestionErrorResponse,
} from "shared-types";

export async function deleteQuestionHandler(
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
    const { testId, questionId } = c.req.param() as DeleteQuestionByIdRequest;

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
            message: "Only admin users can delete questions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if test exists
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

    // Check if test is archived
    if (targetTest.status === "archived") {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Cannot delete questions from archived test",
        errors: [
          {
            field: "status",
            message: "Questions cannot be deleted from archived tests",
            code: "TEST_ARCHIVED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if question exists and belongs to the test
    const [existingQuestion] = await db
      .select({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        sequence: questions.sequence,
        question_type: questions.question_type,
        created_at: questions.created_at,
      })
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.test_id, testId)))
      .limit(1);

    if (!existingQuestion) {
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

    // Check if question has any user answers (this would prevent deletion)
    const [answerCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(userAnswers)
      .where(eq(userAnswers.question_id, questionId));

    const hasAnswers = answerCount && answerCount.count > 0;

    if (hasAnswers) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Question cannot be deleted",
        errors: [
          {
            field: "dependencies",
            message: `Question #${existingQuestion.sequence} has ${answerCount?.count || 0} user answer(s) and cannot be deleted. Archive the test instead if you need to disable it.`,
            code: "HAS_DEPENDENCIES",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Delete the question (hard delete since no dependencies)
    const deletedAt = new Date().toISOString();

    const [deletedQuestion] = await db
      .delete(questions)
      .where(eq(questions.id, questionId))
      .returning({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        sequence: questions.sequence,
      });

    if (!deletedQuestion) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Failed to delete question",
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
    const response: DeleteQuestionResponse = {
      success: true,
      message: `Question #${deletedQuestion.sequence} has been permanently deleted from test '${targetTest.name}'`,
      data: {
        id: deletedQuestion.id,
        test_id: deletedQuestion.test_id,
        question: deletedQuestion.question,
        sequence: deletedQuestion.sequence,
        deleted_at: deletedAt,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Question permanently deleted by admin ${auth.user.email}: Sequence ${deletedQuestion.sequence} from test ${targetTest.name} (${targetTest.category})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error deleting question:", error);

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

      // Handle foreign key constraint errors
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Cannot delete question due to existing dependencies",
          errors: [
            {
              field: "dependencies",
              message: "Question has dependent records that prevent deletion",
              code: "FOREIGN_KEY_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

      // Handle transaction errors
      if (error.message.includes("transaction")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Database transaction failed",
          errors: [
            {
              message: "Failed to complete deletion transaction",
              code: "TRANSACTION_ERROR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
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
