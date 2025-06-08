import { Context } from "hono";
import { eq, and, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type AddParticipantToSessionRequest,
  type AddParticipantToSessionByIdRequest,
  type AddParticipantToSessionResponse,
  type SessionErrorResponse,
  type CreateSessionParticipantDB,
  generateUniqueParticipantToken,
  generateParticipantUniqueLink,
  isParticipantLinkExpired,
  isSessionExpired,
} from "shared-types";

export async function addParticipantToSessionHandler(
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
    const { sessionId } = c.req.param() as AddParticipantToSessionByIdRequest;
    const data = (await c.req.json()) as AddParticipantToSessionRequest;

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
            message: "Only admin users can add participants to test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find session by ID and validate
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        target_position: testSessions.target_position,
        allow_late_entry: testSessions.allow_late_entry,
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

    // Check if session can accept new participants
    if (session.status === "cancelled") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participant to cancelled session",
        errors: [
          {
            field: "session_status",
            message:
              "This session has been cancelled and cannot accept new participants",
            code: "SESSION_CANCELLED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    if (session.status === "completed") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participant to completed session",
        errors: [
          {
            field: "session_status",
            message:
              "This session has been completed and cannot accept new participants",
            code: "SESSION_COMPLETED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if session is expired
    const sessionExpired = isSessionExpired({
      end_time: session.end_time,
      status: session.status || "draft",
    });

    if (sessionExpired) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participant to expired session",
        errors: [
          {
            field: "session_status",
            message:
              "This session has expired and cannot accept new participants",
            code: "SESSION_EXPIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if session has reached maximum participants
    if (
      session.max_participants &&
      (session.current_participants || 0) >= session.max_participants
    ) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session is full",
        errors: [
          {
            field: "max_participants",
            message: `Session has reached maximum capacity of ${session.max_participants} participants`,
            code: "SESSION_FULL",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Validate user exists and is a participant
    const [user] = await db
      .select({
        id: users.id,
        nik: users.nik,
        name: users.name,
        email: users.email,
        phone: users.phone,
        gender: users.gender,
        birth_date: users.birth_date,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(and(eq(users.id, data.user_id), eq(users.role, "participant")))
      .limit(1);

    if (!user) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Invalid participant",
        errors: [
          {
            field: "user_id",
            message: "User must be an existing participant",
            code: "INVALID_PARTICIPANT",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if user is active
    if (!user.is_active) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant is not active",
        errors: [
          {
            field: "user_id",
            message: "Cannot add inactive participant to session",
            code: "PARTICIPANT_INACTIVE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if participant is already in this session
    const [existingParticipant] = await db
      .select({
        id: sessionParticipants.id,
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          eq(sessionParticipants.user_id, data.user_id)
        )
      )
      .limit(1);

    if (existingParticipant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant already added to session",
        errors: [
          {
            field: "user_id",
            message: `${user.name} is already a participant in this session with status: ${existingParticipant.status}`,
            code: "PARTICIPANT_ALREADY_EXISTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Generate unique link and expiry
    const uniqueToken = generateUniqueParticipantToken();
    const linkExpiresAt = new Date();
    linkExpiresAt.setHours(linkExpiresAt.getHours() + data.link_expires_hours);

    // Create participant entry
    const participantData: CreateSessionParticipantDB = {
      session_id: sessionId,
      user_id: data.user_id,
      status: "invited",
      unique_link: uniqueToken,
      link_expires_at: linkExpiresAt,
    };

    // Set invitation_sent_at if send_invitation is true
    if (data.send_invitation) {
      participantData.invitation_sent_at = new Date();
    }

    // Insert participant into database
    const [newParticipant] = await db
      .insert(sessionParticipants)
      .values(participantData)
      .returning();

    if (!newParticipant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to add participant to session",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Update session current_participants count
    await db
      .update(testSessions)
      .set({
        current_participants: sql`${testSessions.current_participants} + 1`,
        updated_at: new Date(),
      })
      .where(eq(testSessions.id, sessionId));

    // Generate access URL for participant
    const accessUrl = generateParticipantUniqueLink(
      session.session_code,
      newParticipant.id,
      env.FRONTEND_URL
    );

    // Check if link is expired (should not be at this point, but for completeness)
    const linkExpired = newParticipant.link_expires_at
      ? isParticipantLinkExpired(newParticipant.link_expires_at)
      : false;

    // Prepare response data
    const responseData = {
      id: newParticipant.id,
      session_id: newParticipant.session_id,
      user_id: newParticipant.user_id,
      status: newParticipant.status as any,
      registered_at: newParticipant.registered_at,
      invitation_sent_at: newParticipant.invitation_sent_at,
      unique_link: newParticipant.unique_link,
      link_expires_at: newParticipant.link_expires_at,
      created_at: newParticipant.created_at,
      user: {
        id: user.id,
        nik: user.nik || "",
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        birth_date: user.birth_date,
        is_active: user.is_active,
      },
      is_link_expired: linkExpired,
      access_url: accessUrl,
    };

    const response: AddParticipantToSessionResponse = {
      success: true,
      message: `Participant ${user.name} added to session '${session.session_name}' successfully${data.send_invitation ? " (invitation sent)" : ""}`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Participant added by admin ${auth.user.email}: ${user.name} (${user.nik}) to session ${session.session_name} (${session.session_code})`
    );

    // TODO: If send_invitation is true, trigger email/notification sending
    if (data.send_invitation) {
      console.log(
        `📧 Invitation should be sent to ${user.email} for session ${session.session_code}`
      );
      // Implementation for sending invitation would go here
    }

    return c.json(response, 201);
  } catch (error) {
    console.error("Error adding participant to session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Participant already exists in session",
          errors: [
            {
              field: "user_id",
              message: "This participant is already added to the session",
              code: "DUPLICATE_PARTICIPANT",
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

      // Handle foreign key constraint errors
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid reference data",
          errors: [
            {
              message: "Session or user reference is invalid",
              code: "FOREIGN_KEY_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid UUID format",
          errors: [
            {
              field: "identifiers",
              message: "Session ID or User ID must be valid UUIDs",
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
      message: "Failed to add participant to session",
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
