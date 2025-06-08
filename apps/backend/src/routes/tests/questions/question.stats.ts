import { Context } from "hono";
import { eq, sql, and } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type GetQuestionsByTestIdRequest,
  type GetQuestionStatsResponse,
  type QuestionErrorResponse,
  type QuestionStats,
} from "shared-types";

export async function getQuestionStatsHandler(
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
    const { testId } = c.req.param() as GetQuestionsByTestIdRequest;

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
            message: "Only admin users can access question statistics",
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

    // Get total questions count
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(eq(questions.test_id, testId));

    const totalQuestions = totalCount?.count || 0;

    // Get questions by type
    const questionsByType = await db
      .select({
        question_type: questions.question_type,
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(eq(questions.test_id, testId))
      .groupBy(questions.question_type);

    const byQuestionType: Record<string, number> = {};
    questionsByType.forEach((item) => {
      byQuestionType[item.question_type] = item.count;
    });

    // Get questions with images
    const [withImagesCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(
        and(
          eq(questions.test_id, testId),
          sql`${questions.image_url} IS NOT NULL`
        )
      );

    const withImages = withImagesCount?.count || 0;

    // Get questions with audio
    const [withAudioCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(
        and(
          eq(questions.test_id, testId),
          sql`${questions.audio_url} IS NOT NULL`
        )
      );

    const withAudio = withAudioCount?.count || 0;

    // Get required vs optional questions
    const [requiredCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(
        and(eq(questions.test_id, testId), eq(questions.is_required, true))
      );

    const requiredQuestions = requiredCount?.count || 0;
    const optionalQuestions = totalQuestions - requiredQuestions;

    // Get average time limit
    const [avgTimeLimit] = await db
      .select({
        avg: sql<number>`AVG(${questions.time_limit})`,
      })
      .from(questions)
      .where(
        and(
          eq(questions.test_id, testId),
          sql`${questions.time_limit} IS NOT NULL`
        )
      );

    const avgTimeLimitValue = avgTimeLimit?.avg || 0;

    // Get all sequences to find gaps
    const allSequences = await db
      .select({
        sequence: questions.sequence,
      })
      .from(questions)
      .where(eq(questions.test_id, testId))
      .orderBy(questions.sequence);

    // Find sequence gaps
    const sequenceGaps: number[] = [];
    if (allSequences.length > 0) {
      const sequences = allSequences.map((s) => s.sequence);
      const maxSequence = Math.max(...sequences);

      for (let i = 1; i <= maxSequence; i++) {
        if (!sequences.includes(i)) {
          sequenceGaps.push(i);
        }
      }
    }

    // Build stats response
    const statsData: QuestionStats = {
      total_questions: totalQuestions,
      by_question_type: byQuestionType,
      with_images: withImages,
      with_audio: withAudio,
      required_questions: requiredQuestions,
      optional_questions: optionalQuestions,
      avg_time_limit: Math.round(avgTimeLimitValue * 100) / 100, // Round to 2 decimal places
      sequence_gaps: sequenceGaps,
    };

    const response: GetQuestionStatsResponse = {
      success: true,
      message: `Question statistics for test '${targetTest.name}' retrieved successfully`,
      data: statsData,
      test_info: {
        id: targetTest.id,
        name: targetTest.name,
        category: targetTest.category,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Question statistics retrieved for test ${targetTest.name} by admin: ${auth.user.email} (${totalQuestions} questions)`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting question statistics:", error);

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
    }

    // Generic error response
    const errorResponse: QuestionErrorResponse = {
      success: false,
      message: "Failed to retrieve question statistics",
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
