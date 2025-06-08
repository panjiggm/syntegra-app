import { Context } from "hono";
import { eq, and, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  users,
  testAttempts,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type RemoveParticipantFromSessionRequest,
  type RemoveParticipantFromSessionResponse,
  type SessionErrorResponse,
  isSessionActive,
} from "shared-types";

export async function removeParticipantFromSessionHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: SessionErrorResponse = {
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
    const { sessionId, participantId } =
      c.req.param() as RemoveParticipantFromSessionRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message:
              "Only admin users can remove participants from test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find session and validate
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        current_participants: testSessions.current_participants,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    // Check if session exists
    if (!session) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "sessionId",
            message: `Test session with ID "${sessionId}" not found`,
            code: "SESSION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Find participant and validate
    const [participant] = await db
      .select({
        participant_id: sessionParticipants.id,
        session_id: sessionParticipants.session_id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        user_name: users.name,
        user_nik: users.nik,
        user_email: users.email,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(
        and(
          eq(sessionParticipants.id, participantId),
          eq(sessionParticipants.session_id, sessionId)
        )
      )
      .limit(1);

    // Check if participant exists
    if (!participant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant not found",
        errors: [
          {
            field: "participantId",
            message: `Participant with ID "${participantId}" not found in this session`,
            code: "PARTICIPANT_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if session is currently active and participant has started
    const isCurrentlyActive = isSessionActive({
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status || "draft",
    });

    if (isCurrentlyActive && participant.status === "started") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot remove participant who has started the test",
        errors: [
          {
            field: "participant_status",
            message:
              "Participant has already started the test and cannot be removed",
            code: "PARTICIPANT_STARTED_TEST",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if participant has completed the test
    if (participant.status === "completed") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot remove participant who has completed the test",
        errors: [
          {
            field: "participant_status",
            message:
              "Participant has completed the test and cannot be removed to preserve data integrity",
            code: "PARTICIPANT_COMPLETED_TEST",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if participant has any test attempts (data integrity)
    const [existingAttempts] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.user_id, participant.user_id),
          eq(testAttempts.session_test_id, sessionId)
        )
      );

    const attemptCount = existingAttempts?.count || 0;

    // Prevent removal if participant has test attempts (data integrity)
    if (attemptCount > 0) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot remove participant with existing test attempts",
        errors: [
          {
            field: "participant_attempts",
            message: `Participant has ${attemptCount} test attempt(s). Cannot be removed to preserve data integrity.`,
            code: "PARTICIPANT_HAS_ATTEMPTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Remove participant from session
    const [removedParticipant] = await db
      .delete(sessionParticipants)
      .where(eq(sessionParticipants.id, participantId))
      .returning({
        id: sessionParticipants.id,
        session_id: sessionParticipants.session_id,
        user_id: sessionParticipants.user_id,
      });

    if (!removedParticipant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to remove participant from session",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Update session current_participants count
    await db
      .update(testSessions)
      .set({
        current_participants: sql`${testSessions.current_participants} - 1`,
        updated_at: new Date(),
      })
      .where(eq(testSessions.id, sessionId));

    // Prepare success response
    const response: RemoveParticipantFromSessionResponse = {
      success: true,
      message: `Participant ${participant.user_name} removed from session '${session.session_name}' successfully`,
      data: {
        id: removedParticipant.id,
        session_id: removedParticipant.session_id,
        user_id: removedParticipant.user_id,
        user_name: participant.user_name,
        removed_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Participant removed by admin ${auth.user.email}: ${participant.user_name} (${participant.user_nik}) from session ${session.session_name} (${session.session_code})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error removing participant from session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle foreign key constraint errors
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint") ||
        error.message.includes("violates")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Cannot remove participant due to data dependencies",
          errors: [
            {
              field: "participant_dependencies",
              message:
                "Participant has related data that prevents removal. Please remove dependencies first.",
              code: "FOREIGN_KEY_CONSTRAINT",
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
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid UUID format",
          errors: [
            {
              field: "identifiers",
              message: "Session ID or Participant ID must be valid UUIDs",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to remove participant from session",
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
