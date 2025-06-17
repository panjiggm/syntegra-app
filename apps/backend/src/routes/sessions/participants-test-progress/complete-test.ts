import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  participantTestProgress,
  sessionParticipants,
  tests,
  sessionModules,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";

export async function completeTestHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse = {
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
    const { sessionId, participantId, testId } = c.req.param();

    // Get request body (optional fields for completion)
    const body = await c.req.json().catch(() => ({}));
    const { answered_questions } = body;

    // Get database connection
    const db = getDbFromEnv(c.env);

    // Verify participant exists and belongs to session
    const [participant] = await db
      .select({
        id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.user_id, participantId),
          eq(sessionParticipants.session_id, sessionId)
        )
      )
      .limit(1);

    if (!participant) {
      const errorResponse = {
        success: false,
        message: "Participant not found in session",
        errors: [
          {
            field: "participantId",
            message: `Participant with ID "${participantId}" not found in session "${sessionId}"`,
            code: "PARTICIPANT_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Get existing progress record
    const [existingProgress] = await db
      .select({
        id: participantTestProgress.id,
        status: participantTestProgress.status,
        started_at: participantTestProgress.started_at,
        completed_at: participantTestProgress.completed_at,
        expected_completion_at: participantTestProgress.expected_completion_at,
        answered_questions: participantTestProgress.answered_questions,
        total_questions: participantTestProgress.total_questions,
        time_spent: participantTestProgress.time_spent,
        is_auto_completed: participantTestProgress.is_auto_completed,
      })
      .from(participantTestProgress)
      .where(
        and(
          eq(participantTestProgress.participant_id, participant.id),
          eq(participantTestProgress.session_id, sessionId),
          eq(participantTestProgress.test_id, testId)
        )
      )
      .limit(1);

    if (!existingProgress) {
      const errorResponse = {
        success: false,
        message: "Test progress not found",
        errors: [
          {
            field: "testId",
            message: `Test progress not found for test "${testId}" and participant "${participantId}"`,
            code: "PROGRESS_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if test is already completed
    if (
      existingProgress.status === "completed" ||
      existingProgress.status === "auto_completed"
    ) {
      const errorResponse = {
        success: false,
        message: "Test already completed",
        errors: [
          {
            field: "testId",
            message: `Test "${testId}" has already been completed`,
            code: "TEST_ALREADY_COMPLETED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if test has started
    if (existingProgress.status === "not_started") {
      const errorResponse = {
        success: false,
        message: "Test not started",
        errors: [
          {
            field: "testId",
            message: `Test "${testId}" has not been started yet`,
            code: "TEST_NOT_STARTED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate answered_questions if provided
    if (answered_questions !== undefined) {
      if (
        answered_questions < 0 ||
        answered_questions > (existingProgress.total_questions || 0)
      ) {
        const errorResponse = {
          success: false,
          message: "Invalid answered questions count",
          errors: [
            {
              field: "answered_questions",
              message: `Answered questions must be between 0 and ${existingProgress.total_questions || 0}`,
              code: "INVALID_ANSWERED_QUESTIONS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    const now = new Date();

    // Check if test time has already expired
    let isTimeExpired = false;
    if (existingProgress.expected_completion_at) {
      isTimeExpired = now >= existingProgress.expected_completion_at;
    }

    // Determine completion type and time
    let completedAt = now;
    let isAutoCompleted = false;
    let completionStatus = "completed";

    // If time has expired, mark as auto-completed
    if (isTimeExpired) {
      completedAt = existingProgress.expected_completion_at || now;
      isAutoCompleted = true;
      completionStatus = "auto_completed";
    }

    // Prepare update data
    const updateData: any = {
      status: completionStatus,
      completed_at: completedAt,
      is_auto_completed: isAutoCompleted,
      updated_at: now,
      last_activity_at: now,
    };

    // Use provided values or keep existing ones
    if (answered_questions !== undefined) {
      updateData.answered_questions = answered_questions;
    }

    // Always calculate time spent based on started_at
    if (existingProgress.started_at) {
      const timeSpentCalculated = Math.floor(
        (completedAt.getTime() - existingProgress.started_at.getTime()) / 1000
      );
      updateData.time_spent = timeSpentCalculated;
    }

    // Complete the test
    const [completedProgress] = await db
      .update(participantTestProgress)
      .set(updateData)
      .where(eq(participantTestProgress.id, existingProgress.id))
      .returning();

    // Get test info for response
    const [testInfo] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        module_type: tests.module_type,
        time_limit: tests.time_limit,
        total_questions: tests.total_questions,
        icon: tests.icon,
        card_color: tests.card_color,
        question_type: tests.question_type,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    // Calculate computed fields
    const progressPercentage = testInfo?.total_questions
      ? Math.min(
          100,
          Math.round(
            ((completedProgress.answered_questions || 0) /
              testInfo.total_questions) *
              100
          )
        )
      : 0;

    const message = isAutoCompleted
      ? "Test auto-completed due to time expiry"
      : "Test completed successfully";

    const response = {
      success: true,
      message,
      data: {
        ...completedProgress,
        test: testInfo,
        time_remaining: 0,
        progress_percentage: progressPercentage,
        is_time_expired: isTimeExpired,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error completing test:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse = {
          success: false,
          message: "Invalid ID format",
          errors: [
            {
              field: "id",
              message: "ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse = {
      success: false,
      message: "Failed to complete test",
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
