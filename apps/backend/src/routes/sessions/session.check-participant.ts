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
import { type SessionErrorResponse } from "shared-types";

export async function checkParticipantHandler(
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

    // Get request body
    const { sessionCode, phone } = await c.req.json();

    // Basic validation
    if (!sessionCode || !phone) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Missing required fields",
        errors: [
          {
            field: !sessionCode ? "sessionCode" : "phone",
            message: !sessionCode
              ? "Session code is required"
              : "Phone number is required",
            code: "MISSING_REQUIRED_FIELD",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // First, find the session by code
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        status: testSessions.status,
      })
      .from(testSessions)
      .where(eq(testSessions.session_code, sessionCode.trim()))
      .limit(1);

    // Check if session exists
    if (!session) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "sessionCode",
            message: `Session with code "${sessionCode}" not found`,
            code: "SESSION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if participant exists in this session with the given phone number
    const [participant] = await db
      .select({
        participant_id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        unique_link: sessionParticipants.unique_link,
        link_expires_at: sessionParticipants.link_expires_at,
        user_name: users.name,
        user_nik: users.nik,
        user_email: users.email,
        user_phone: users.phone,
        is_active: users.is_active,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(
        and(
          eq(sessionParticipants.session_id, session.id),
          eq(users.phone, phone.trim()),
          eq(users.role, "participant"),
          eq(users.is_active, true)
        )
      )
      .limit(1);

    // Prepare response
    if (participant) {
      // Participant found
      const isLinkExpired = participant.link_expires_at
        ? new Date() > participant.link_expires_at
        : false;

      const successResponse = {
        success: true,
        message: "Participant found in session",
        data: {
          participant_exists: true,
          session: {
            id: session.id,
            session_name: session.session_name,
            session_code: session.session_code,
            status: session.status,
          },
          participant: {
            id: participant.participant_id,
            user_id: participant.user_id,
            name: participant.user_name,
            nik: participant.user_nik,
            email: participant.user_email,
            phone: participant.user_phone,
            status: participant.status,
            registered_at: participant.registered_at,
            unique_link: participant.unique_link,
            is_link_expired: isLinkExpired,
            can_access: !isLinkExpired && participant.status !== "no_show",
          },
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(successResponse, 200);
    } else {
      // Participant not found
      const notFoundResponse = {
        success: true,
        message: "Participant not found in session",
        data: {
          participant_exists: false,
          session: {
            id: session.id,
            session_name: session.session_name,
            session_code: session.session_code,
            status: session.status,
          },
          participant: null,
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(notFoundResponse, 200);
    }
  } catch (error) {
    console.error("Error checking participant:", error);

    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to check participant",
      errors: [
        {
          field: "server",
          message:
            error instanceof Error ? error.message : "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
