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
import {
  type GetParticipantTestProgressRequest,
  type GetParticipantTestProgressResponse,
  type ParticipantTestProgressErrorResponse,
  calculateTimeRemaining,
  calculateProgressPercentage,
  isTestTimeExpired,
} from "shared-types";

export async function getParticipantTestProgressHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
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
    const { sessionId, participantId } =
      c.req.param() as GetParticipantTestProgressRequest;

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
          eq(sessionParticipants.id, participantId),
          eq(sessionParticipants.session_id, sessionId)
        )
      )
      .limit(1);

    if (!participant) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
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

    // Get all tests for this session
    const sessionTestsQuery = await db
      .select({
        test_id: sessionModules.test_id,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
        test_name: tests.name,
        test_category: tests.category,
        test_module_type: tests.module_type,
        test_time_limit: tests.time_limit,
        test_total_questions: tests.total_questions,
        test_icon: tests.icon,
        test_card_color: tests.card_color,
        test_question_type: tests.question_type,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, sessionId))
      .orderBy(sessionModules.sequence);

    // Get existing progress records
    const existingProgress = await db
      .select()
      .from(participantTestProgress)
      .where(
        and(
          eq(participantTestProgress.participant_id, participantId),
          eq(participantTestProgress.session_id, sessionId)
        )
      );

    const progressMap = new Map(existingProgress.map((p) => [p.test_id, p]));

    const now = new Date();
    const progressData = [];

    // Check for auto-completion of tests that have exceeded time limit
    const autoCompletionUpdates = [];

    for (const sessionTest of sessionTestsQuery) {
      const existingRecord = progressMap.get(sessionTest.test_id);

      let progressRecord = existingRecord;

      // If test is started but not completed, check for auto-completion
      if (
        existingRecord &&
        existingRecord.status === "in_progress" &&
        existingRecord.started_at &&
        !existingRecord.completed_at
      ) {
        const timeExpired = isTestTimeExpired(
          existingRecord.started_at,
          sessionTest.test_time_limit
        );

        if (timeExpired) {
          // Auto-complete the test
          const updatedRecord = {
            ...existingRecord,
            status: "auto_completed" as const,
            completed_at: new Date(
              existingRecord.started_at.getTime() +
                sessionTest.test_time_limit * 60 * 1000
            ),
            is_auto_completed: true,
            updated_at: now,
          };

          autoCompletionUpdates.push({
            id: existingRecord.id,
            updates: {
              status: "auto_completed" as const,
              completed_at: updatedRecord.completed_at,
              is_auto_completed: true,
              updated_at: now,
            },
          });

          progressRecord = updatedRecord;
        }
      }

      // Create progress data with computed fields
      const timeRemaining = progressRecord?.started_at
        ? calculateTimeRemaining(
            progressRecord.started_at,
            sessionTest.test_time_limit
          )
        : sessionTest.test_time_limit * 60;

      const progressPercentage = calculateProgressPercentage(
        progressRecord?.answered_questions || 0,
        sessionTest.test_total_questions ?? 0
      );

      const isTimeExpired = progressRecord?.started_at
        ? isTestTimeExpired(
            progressRecord.started_at,
            sessionTest.test_time_limit
          )
        : false;

      progressData.push({
        id: progressRecord?.id || "",
        participant_id: participantId,
        session_id: sessionId,
        test_id: sessionTest.test_id,
        user_id: participant.user_id,
        status: progressRecord?.status || "not_started",
        started_at: progressRecord?.started_at || null,
        completed_at: progressRecord?.completed_at || null,
        expected_completion_at: progressRecord?.expected_completion_at || null,
        answered_questions: progressRecord?.answered_questions || 0,
        total_questions: sessionTest.test_total_questions ?? 0,
        time_spent: progressRecord?.time_spent || 0,
        is_auto_completed: progressRecord?.is_auto_completed || false,
        last_activity_at: progressRecord?.last_activity_at || null,
        created_at: progressRecord?.created_at || now,
        updated_at: progressRecord?.updated_at || now,
        test: {
          id: sessionTest.test_id,
          name: sessionTest.test_name,
          category: sessionTest.test_category,
          module_type: sessionTest.test_module_type,
          time_limit: sessionTest.test_time_limit,
          total_questions: sessionTest.test_total_questions ?? 0,
          icon: sessionTest.test_icon,
          card_color: sessionTest.test_card_color,
          question_type: sessionTest.test_question_type,
        },
        time_remaining: timeRemaining,
        progress_percentage: progressPercentage,
        is_time_expired: isTimeExpired,
      });
    }

    // Perform auto-completion updates if any
    if (autoCompletionUpdates.length > 0) {
      for (const update of autoCompletionUpdates) {
        await db
          .update(participantTestProgress)
          .set(update.updates)
          .where(eq(participantTestProgress.id, update.id));
      }
    }

    const response: GetParticipantTestProgressResponse = {
      success: true,
      message: `Retrieved test progress for participant in session`,
      data: progressData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting participant test progress:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: ParticipantTestProgressErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: ParticipantTestProgressErrorResponse = {
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
    const errorResponse: ParticipantTestProgressErrorResponse = {
      success: false,
      message: "Failed to retrieve test progress",
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
