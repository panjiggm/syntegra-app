import { Context } from "hono";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  questions,
  userAnswers,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  BulkDeleteQuestionsRequest,
  BulkDeleteQuestionsResponse,
  type QuestionErrorResponse,
} from "shared-types";

export async function bulkDeleteQuestionsHandler(
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

    // Get path parameters
    const { testId } = c.req.param();

    // Get request body
    const body = (await c.req.json()) as BulkDeleteQuestionsRequest;

    // Validate request body
    if (
      !body.questionIds ||
      !Array.isArray(body.questionIds) ||
      body.questionIds.length === 0
    ) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid request body",
        errors: [
          {
            field: "questionIds",
            message: "questionIds must be a non-empty array of UUIDs",
            code: "INVALID_REQUEST_BODY",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Limit bulk delete to reasonable number
    if (body.questionIds.length > 100) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Too many questions to delete",
        errors: [
          {
            field: "questionIds",
            message: "Maximum 100 questions can be deleted at once",
            code: "BULK_LIMIT_EXCEEDED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get database connection
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

    // Get all target questions and verify they exist and belong to the test
    const existingQuestions = await db
      .select({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        sequence: questions.sequence,
        question_type: questions.question_type,
        time_limit: questions.time_limit,
        created_at: questions.created_at,
      })
      .from(questions)
      .where(
        and(
          inArray(questions.id, body.questionIds),
          eq(questions.test_id, testId)
        )
      );

    // Check if all requested questions exist
    const foundIds = existingQuestions.map((q) => q.id);
    const notFoundIds = body.questionIds.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Some questions not found",
        errors: [
          {
            field: "questionIds",
            message: `Questions not found in test "${targetTest.name}": ${notFoundIds.join(", ")}`,
            code: "QUESTIONS_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if any questions have user answers
    const questionsWithAnswers = await db
      .select({
        question_id: userAnswers.question_id,
        count: sql<number>`count(*)`,
      })
      .from(userAnswers)
      .where(inArray(userAnswers.question_id, body.questionIds))
      .groupBy(userAnswers.question_id);

    if (questionsWithAnswers.length > 0) {
      const questionsWithAnswersDetails = questionsWithAnswers.map((answer) => {
        const question = existingQuestions.find(
          (q) => q.id === answer.question_id
        );
        return `Question #${question?.sequence} (${answer.count} answers)`;
      });

      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Some questions cannot be deleted",
        errors: [
          {
            field: "dependencies",
            message: `The following questions have user answers and cannot be deleted: ${questionsWithAnswersDetails.join(", ")}. Archive the test instead if you need to disable it.`,
            code: "HAS_DEPENDENCIES",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Start database transaction
    const deletedAt = new Date().toISOString();

    // Delete all questions (hard delete since no dependencies)
    const deletedQuestions = await db
      .delete(questions)
      .where(inArray(questions.id, body.questionIds))
      .returning({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        sequence: questions.sequence,
      });

    if (deletedQuestions.length === 0) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Failed to delete questions",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // 🔄 RE-SEQUENCE: Update sequence untuk semua question yang tersisa
    // Menggunakan ROW_NUMBER() untuk generate urutan baru berdasarkan sequence lama
    await db.execute(sql`
      UPDATE ${questions} 
      SET 
        sequence = reordered.new_sequence,
        updated_at = NOW()
      FROM (
        SELECT 
          id, 
          ROW_NUMBER() OVER (ORDER BY sequence ASC, created_at ASC) as new_sequence
        FROM ${questions} 
        WHERE test_id = ${testId}
      ) as reordered
      WHERE ${questions}.id = reordered.id
    `);

    // 🔄 AUTO-CALCULATE TEST DURATION: Get updated question count and total duration
    const [testStatsResult] = await db
      .select({
        questionCount: sql<number>`count(*)`,
        totalDurationSeconds: sql<number>`COALESCE(SUM(${questions.time_limit}), 0)`,
      })
      .from(questions)
      .where(eq(questions.test_id, testId));

    const newTotalQuestions = testStatsResult?.questionCount || 0;
    const totalDurationSeconds = testStatsResult?.totalDurationSeconds || 0;

    // Convert seconds to minutes (round up to ensure enough time)
    const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);

    // 🎯 UPDATE TEST: Both question count AND auto-calculated time limit
    await db
      .update(tests)
      .set({
        total_questions: newTotalQuestions,
        time_limit: totalDurationMinutes, // ← AUTO-CALCULATED from remaining questions
        updated_at: new Date(),
        updated_by: auth.user.id,
      })
      .where(eq(tests.id, testId));

    // Sort deleted questions by sequence for better UX
    const sortedDeletedQuestions = deletedQuestions.sort(
      (a, b) => a.sequence - b.sequence
    );

    // Prepare success response with duration info
    const response: BulkDeleteQuestionsResponse = {
      success: true,
      message: `Successfully deleted ${deletedQuestions.length} questions from test '${targetTest.name}'. Test duration updated to ${totalDurationMinutes} minutes (${newTotalQuestions} questions remaining). Question sequences have been reordered.`,
      data: {
        deleted_questions: sortedDeletedQuestions.map((q) => ({
          id: q.id,
          test_id: testId,
          question: q.question,
          question_type:
            existingQuestions.find((eq) => eq.id === q.id)?.question_type ||
            "multiple_choice",
          options: [],
          correct_answer: null,
          sequence: q.sequence,
          time_limit:
            existingQuestions.find((eq) => eq.id === q.id)?.time_limit || null,
          image_url: null,
          audio_url: null,
          scoring_key: null,
          is_required: true,
          created_at:
            existingQuestions.find((eq) => eq.id === q.id)?.created_at ||
            new Date(),
          updated_at: new Date(),
        })),
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error bulk deleting questions:", error);

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
              field: "questionIds",
              message: "All question IDs must be valid UUIDs",
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
          message: "Cannot delete questions due to existing dependencies",
          errors: [
            {
              field: "dependencies",
              message:
                "Some questions have dependent records that prevent deletion",
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
              message: "Failed to complete bulk deletion transaction",
              code: "TRANSACTION_ERROR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      // Handle JSON parsing errors
      if (error.message.includes("JSON") || error.message.includes("parse")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid JSON request body",
          errors: [
            {
              field: "body",
              message: "Request body must be valid JSON",
              code: "INVALID_JSON",
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
