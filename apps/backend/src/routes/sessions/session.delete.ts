import { Context } from "hono";
import { eq, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionModules,
  testAttempts,
  sessionParticipants,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type DeleteSessionByIdRequest,
  type DeleteSessionResponse,
  type SessionErrorResponse,
  isSessionActive,
} from "shared-types";

export async function deleteSessionHandler(
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
    const { sessionId } = c.req.param() as DeleteSessionByIdRequest;

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
            message: "Only admin users can delete test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find existing session
    const [existingSession] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        current_participants: testSessions.current_participants,
        created_at: testSessions.created_at,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    // Check if session exists
    if (!existingSession) {
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

    // Check if session can be deleted
    const isCurrentlyActive = isSessionActive({
      start_time: existingSession.start_time,
      end_time: existingSession.end_time,
      status: existingSession.status || "draft",
    });

    // Prevent deletion if session is active and has participants
    if (isCurrentlyActive && (existingSession.current_participants || 0) > 0) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot delete active session with participants",
        errors: [
          {
            field: "session_status",
            message:
              "Session is currently active and has participants. Cannot be deleted.",
            code: "SESSION_ACTIVE_WITH_PARTICIPANTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if session has any test attempts
    const [existingAttempts] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testAttempts)
      .where(eq(testAttempts.session_test_id, sessionId));

    const attemptCount = existingAttempts?.count || 0;

    // Prevent deletion if session has test attempts (data integrity)
    if (attemptCount > 0) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot delete session with existing test attempts",
        errors: [
          {
            field: "session_attempts",
            message: `Session has ${attemptCount} test attempt(s). Cannot be deleted to preserve data integrity.`,
            code: "SESSION_HAS_ATTEMPTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if session has participants registered
    const [existingParticipants] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, sessionId));

    const participantCount = existingParticipants?.count || 0;

    // Allow deletion but warn if there are participants (they might be just invited)
    let warningMessage = "";
    if (participantCount > 0) {
      warningMessage = ` (${participantCount} participant(s) were removed from session)`;
    }

    // Start deletion process (transaction-like operations)
    try {
      // Delete session participants first (foreign key constraint)
      if (participantCount > 0) {
        await db
          .delete(sessionParticipants)
          .where(eq(sessionParticipants.session_id, sessionId));
      }

      // Delete session modules
      await db
        .delete(sessionModules)
        .where(eq(sessionModules.session_id, sessionId));

      // Delete the session itself
      const [deletedSession] = await db
        .delete(testSessions)
        .where(eq(testSessions.id, sessionId))
        .returning({
          id: testSessions.id,
          session_name: testSessions.session_name,
          session_code: testSessions.session_code,
        });

      if (!deletedSession) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Failed to delete session",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      // Prepare success response
      const response: DeleteSessionResponse = {
        success: true,
        message: `Test session '${deletedSession.session_name}' deleted successfully${warningMessage}`,
        data: {
          id: deletedSession.id,
          session_name: deletedSession.session_name,
          session_code: deletedSession.session_code,
          deleted_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Session deleted by admin ${auth.user.email}: ${deletedSession.session_name} (${deletedSession.session_code})${warningMessage}`
      );

      return c.json(response, 200);
    } catch (dbError) {
      console.error("Database deletion error:", dbError);
      throw dbError; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    console.error("Error deleting session:", error);

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
          message: "Cannot delete session due to data dependencies",
          errors: [
            {
              field: "session_dependencies",
              message:
                "Session has related data that prevents deletion. Please remove dependencies first.",
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
          message: "Invalid session ID format",
          errors: [
            {
              field: "sessionId",
              message: "Session ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle transaction errors
      if (error.message.includes("transaction")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Database transaction failed",
          errors: [
            {
              message: "Failed to complete session deletion transaction",
              code: "TRANSACTION_ERROR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }
    }

    // Generic error response
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to delete session",
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
