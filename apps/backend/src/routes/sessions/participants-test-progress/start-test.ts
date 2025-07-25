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

export async function startTestHandler(
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

    // Get database connection
    const env = getEnv(c);
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

    // Verify test exists in session
    const [sessionTest] = await db
      .select({
        test_id: sessionModules.test_id,
        test_name: tests.name,
        test_time_limit: tests.time_limit,
        test_total_questions: tests.total_questions,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(
        and(
          eq(sessionModules.session_id, sessionId),
          eq(sessionModules.test_id, testId)
        )
      )
      .limit(1);

    if (!sessionTest) {
      const errorResponse = {
        success: false,
        message: "Test not found in session",
        errors: [
          {
            field: "testId",
            message: `Test with ID "${testId}" not found in session "${sessionId}"`,
            code: "TEST_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if progress already exists
    const [existingProgress] = await db
      .select()
      .from(participantTestProgress)
      .where(
        and(
          eq(participantTestProgress.participant_id, participant.id),
          eq(participantTestProgress.test_id, testId)
        )
      )
      .limit(1);

    if (existingProgress) {
      // Return existing progress instead of error (idempotent operation)
      console.log(`Test progress already exists for participant ${participant.id}, test ${testId} - returning existing`);
      
      // Calculate computed fields for existing progress
      const now = new Date();
      let timeRemaining = 0;
      let isTimeExpired = false;

      if (existingProgress.started_at && existingProgress.status === "in_progress") {
        const expectedCompletion = new Date(
          existingProgress.started_at.getTime() + sessionTest.test_time_limit * 60 * 1000
        );
        timeRemaining = Math.max(
          0,
          Math.floor((expectedCompletion.getTime() - now.getTime()) / 1000)
        );
        isTimeExpired = now >= expectedCompletion;
      } else if (existingProgress.status === "not_started") {
        timeRemaining = sessionTest.test_time_limit * 60;
      }

      const progressPercentage =
        (existingProgress.total_questions ?? 0) > 0
          ? Math.min(
              100,
              Math.round(
                ((existingProgress.answered_questions ?? 0) /
                  (existingProgress.total_questions ?? 1)) *
                  100
              )
            )
          : 0;

      const response = {
        success: true,
        message: "Test progress already exists - returning existing progress",
        data: {
          id: existingProgress.id,
          participant_id: existingProgress.participant_id,
          session_id: existingProgress.session_id,
          test_id: existingProgress.test_id,
          user_id: existingProgress.user_id,
          status: existingProgress.status,
          started_at: existingProgress.started_at,
          completed_at: existingProgress.completed_at,
          expected_completion_at: existingProgress.expected_completion_at,
          answered_questions: existingProgress.answered_questions,
          total_questions: existingProgress.total_questions,
          time_spent: existingProgress.time_spent,
          is_auto_completed: existingProgress.is_auto_completed,
          last_activity_at: existingProgress.last_activity_at,
          created_at: existingProgress.created_at,
          updated_at: existingProgress.updated_at,
          test: {
            id: testId,
            name: sessionTest.test_name,
            time_limit: sessionTest.test_time_limit,
            total_questions: sessionTest.test_total_questions,
          },
          time_remaining: timeRemaining,
          progress_percentage: progressPercentage,
          is_time_expired: isTimeExpired,
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    }

    const now = new Date();
    const expectedCompletion = new Date(
      now.getTime() + sessionTest.test_time_limit * 60 * 1000
    );

    // Create new progress record
    const [newProgress] = await db
      .insert(participantTestProgress)
      .values({
        participant_id: participant.id,
        session_id: sessionId,
        test_id: testId,
        user_id: participant.user_id,
        status: "in_progress",
        started_at: now,
        expected_completion_at: expectedCompletion,
        answered_questions: 0,
        total_questions: sessionTest.test_total_questions,
        time_spent: 0,
        is_auto_completed: false,
        last_activity_at: now,
      })
      .returning();

    const response = {
      success: true,
      message: `Test started successfully`,
      data: {
        ...newProgress,
        test: {
          id: testId,
          name: sessionTest.test_name,
          time_limit: sessionTest.test_time_limit,
          total_questions: sessionTest.test_total_questions,
        },
        time_remaining: sessionTest.test_time_limit * 60, // in seconds
        progress_percentage: 0,
        is_time_expired: false,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error starting test:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Generic error response
    const errorResponse = {
      success: false,
      message: "Failed to start test",
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
