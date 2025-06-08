import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type UpdateParticipantStatusRequest,
  type RemoveParticipantFromSessionRequest,
  type UpdateParticipantStatusResponse,
  type SessionErrorResponse,
  type UpdateSessionParticipantDB,
} from "shared-types";

export async function updateParticipantStatusHandler(
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

    // Get path parameters and request data
    const { sessionId, participantId } =
      c.req.param() as RemoveParticipantFromSessionRequest;
    const data = (await c.req.json()) as UpdateParticipantStatusRequest;

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
            message: "Only admin users can update participant status",
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
        status: testSessions.status,
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
        current_status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        invitation_sent_at: sessionParticipants.invitation_sent_at,
        unique_link: sessionParticipants.unique_link,
        link_expires_at: sessionParticipants.link_expires_at,
        created_at: sessionParticipants.created_at,
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

    // Validate status transition
    const currentStatus = participant.current_status;
    const newStatus = data.status;

    // Define valid status transitions
    const validTransitions = {
      invited: ["registered", "no_show"],
      registered: ["started", "no_show"],
      started: ["completed", "no_show"],
      completed: [], // Cannot change from completed
      no_show: ["invited", "registered"], // Can re-invite no-show participants
    };

    const allowedTransitions =
      validTransitions[currentStatus as keyof typeof validTransitions] || [];

    if (currentStatus === newStatus) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Status unchanged",
        errors: [
          {
            field: "status",
            message: `Participant is already in '${currentStatus}' status`,
            code: "STATUS_UNCHANGED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    if (!allowedTransitions.includes(newStatus as never)) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Invalid status transition",
        errors: [
          {
            field: "status",
            message: `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
            code: "INVALID_STATUS_TRANSITION",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Prepare update data
    const updateData: UpdateSessionParticipantDB = {};

    // Set status
    updateData.status = newStatus;

    // Set registered_at if status is changing to registered
    if (newStatus === "registered" && !participant.registered_at) {
      updateData.registered_at = new Date();
    }

    // Clear registered_at if status is changing back to invited from no_show
    if (newStatus === "invited" && currentStatus === "no_show") {
      updateData.registered_at = null;
    }

    // Update participant status in database
    const [updatedParticipant] = await db
      .update(sessionParticipants)
      .set(updateData)
      .where(eq(sessionParticipants.id, participantId))
      .returning({
        id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        updated_at: sessionParticipants.created_at, // Use created_at as we don't have updated_at field
      });

    if (!updatedParticipant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to update participant status",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const response: UpdateParticipantStatusResponse = {
      success: true,
      message: `Participant ${participant.user_name} status updated from '${currentStatus}' to '${newStatus}' successfully`,
      data: {
        id: updatedParticipant.id,
        user_id: updatedParticipant.user_id,
        user_name: participant.user_name,
        old_status: currentStatus as any,
        new_status: updatedParticipant.status as any,
        updated_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Participant status updated by admin ${auth.user.email}: ${participant.user_name} (${participant.user_nik}) in session ${session.session_name} - ${currentStatus} → ${newStatus}`
    );

    // Log additional information for specific status changes
    if (newStatus === "registered") {
      console.log(
        `📝 Participant ${participant.user_name} has registered for the test`
      );
    } else if (newStatus === "started") {
      console.log(
        `▶️  Participant ${participant.user_name} has started the test`
      );
    } else if (newStatus === "completed") {
      console.log(
        `✅ Participant ${participant.user_name} has completed the test`
      );
    } else if (newStatus === "no_show") {
      console.log(`❌ Participant ${participant.user_name} marked as no-show`);
    }

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating participant status:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
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

      // Handle invalid enum value errors
      if (error.message.includes("invalid input value for enum")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid status value",
          errors: [
            {
              field: "status",
              message:
                "Status must be one of: invited, registered, started, completed, no_show",
              code: "INVALID_ENUM_VALUE",
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
      message: "Failed to update participant status",
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
