import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionModules,
  sessionParticipants,
  tests,
  users,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetSessionByCodeRequest,
  type GetSessionByCodeResponse,
  type SessionErrorResponse,
  isSessionActive,
  isSessionExpired,
  getTimeRemaining,
  isParticipantLinkExpired,
} from "shared-types";

export async function getSessionByCodeHandler(
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
    const { sessionCode } = c.req.param() as GetSessionByCodeRequest;

    // Get query parameters for participant validation
    const participantToken = c.req.query("token"); // Optional unique token
    const participantNik = c.req.query("nik"); // Alternative: NIK-based access
    const participantEmail = c.req.query("email"); // Alternative: Email-based access

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Find session by code
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        target_position: testSessions.target_position,
        description: testSessions.description,
        location: testSessions.location,
        status: testSessions.status,
        allow_late_entry: testSessions.allow_late_entry,
        auto_expire: testSessions.auto_expire,
      })
      .from(testSessions)
      .where(eq(testSessions.session_code, sessionCode))
      .limit(1);

    // Check if session exists
    if (!session) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "sessionCode",
            message: `Test session with code "${sessionCode}" not found`,
            code: "SESSION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // ==================== PARTICIPANT VALIDATION ====================
    let authenticatedParticipant = null;
    let participantValidationMethod = "none";

    // Method 1: Token-based validation (most secure)
    if (participantToken) {
      const [tokenParticipant] = await db
        .select({
          participant_id: sessionParticipants.id,
          user_id: sessionParticipants.user_id,
          status: sessionParticipants.status,
          unique_link: sessionParticipants.unique_link,
          link_expires_at: sessionParticipants.link_expires_at,
          registered_at: sessionParticipants.registered_at,
          user_name: users.name,
          user_nik: users.nik,
          user_email: users.email,
          user_is_active: users.is_active,
        })
        .from(sessionParticipants)
        .innerJoin(users, eq(sessionParticipants.user_id, users.id))
        .where(
          and(
            eq(sessionParticipants.session_id, session.id),
            eq(sessionParticipants.unique_link, participantToken)
          )
        )
        .limit(1);

      if (tokenParticipant) {
        // Check if token is expired
        if (
          tokenParticipant.link_expires_at &&
          isParticipantLinkExpired(tokenParticipant.link_expires_at)
        ) {
          const errorResponse: SessionErrorResponse = {
            success: false,
            message: "Access link has expired",
            errors: [
              {
                field: "token",
                message:
                  "Your access link has expired. Please contact the administrator for a new link.",
                code: "LINK_EXPIRED",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 410); // Gone
        }

        // Check if participant is active
        if (!tokenParticipant.user_is_active) {
          const errorResponse: SessionErrorResponse = {
            success: false,
            message: "Account is inactive",
            errors: [
              {
                field: "participant",
                message:
                  "Your account has been deactivated. Please contact the administrator.",
                code: "PARTICIPANT_INACTIVE",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 403);
        }

        authenticatedParticipant = tokenParticipant;
        participantValidationMethod = "token";
      }
    }

    // Method 2: NIK-based validation (fallback)
    if (!authenticatedParticipant && participantNik) {
      const [nikParticipant] = await db
        .select({
          participant_id: sessionParticipants.id,
          user_id: sessionParticipants.user_id,
          status: sessionParticipants.status,
          unique_link: sessionParticipants.unique_link,
          link_expires_at: sessionParticipants.link_expires_at,
          registered_at: sessionParticipants.registered_at,
          user_name: users.name,
          user_nik: users.nik,
          user_email: users.email,
          user_is_active: users.is_active,
        })
        .from(sessionParticipants)
        .innerJoin(users, eq(sessionParticipants.user_id, users.id))
        .where(
          and(
            eq(sessionParticipants.session_id, session.id),
            eq(users.nik, participantNik),
            eq(users.is_active, true)
          )
        )
        .limit(1);

      if (nikParticipant) {
        authenticatedParticipant = nikParticipant;
        participantValidationMethod = "nik";
      }
    }

    // Method 3: Email-based validation (fallback)
    if (!authenticatedParticipant && participantEmail) {
      const [emailParticipant] = await db
        .select({
          participant_id: sessionParticipants.id,
          user_id: sessionParticipants.user_id,
          status: sessionParticipants.status,
          unique_link: sessionParticipants.unique_link,
          link_expires_at: sessionParticipants.link_expires_at,
          registered_at: sessionParticipants.registered_at,
          user_name: users.name,
          user_nik: users.nik,
          user_email: users.email,
          user_is_active: users.is_active,
        })
        .from(sessionParticipants)
        .innerJoin(users, eq(sessionParticipants.user_id, users.id))
        .where(
          and(
            eq(sessionParticipants.session_id, session.id),
            eq(users.email, participantEmail),
            eq(users.is_active, true)
          )
        )
        .limit(1);

      if (emailParticipant) {
        authenticatedParticipant = emailParticipant;
        participantValidationMethod = "email";
      }
    }

    // ==================== PARTICIPANT ACCESS VALIDATION ====================

    // If no participant validation provided, require it
    if (!participantToken && !participantNik && !participantEmail) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant identification required",
        errors: [
          {
            field: "authentication",
            message:
              "Please provide your access token, NIK, or email to access this session.",
            code: "PARTICIPANT_IDENTIFICATION_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // If participant validation was attempted but failed
    if (!authenticatedParticipant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant not registered for this session",
        errors: [
          {
            field: "participant",
            message:
              "You are not registered for this test session. Please check your invitation or contact the administrator.",
            code: "PARTICIPANT_NOT_REGISTERED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // ==================== SESSION STATUS VALIDATION ====================

    // Calculate session status
    const now = new Date();
    const isActive = isSessionActive({
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status || "draft",
    });
    const isExpired = isSessionExpired({
      end_time: session.end_time,
      status: session.status || "draft",
    });
    const timeRemaining = getTimeRemaining(session.end_time);

    // Check if session is accessible
    let isAccessible = false;
    let accessMessage = "";

    if (session.status === "cancelled") {
      accessMessage = "This test session has been cancelled.";
    } else if (session.status === "draft") {
      accessMessage =
        "This test session is not yet active. Please check back later.";
    } else if (isExpired) {
      accessMessage =
        "This test session has expired and is no longer available.";
    } else if (!isActive && !session.allow_late_entry) {
      if (now < session.start_time) {
        const minutesUntilStart = Math.floor(
          (session.start_time.getTime() - now.getTime()) / (1000 * 60)
        );
        if (minutesUntilStart > 60) {
          const hoursUntilStart = Math.floor(minutesUntilStart / 60);
          accessMessage = `Test session will start in ${hoursUntilStart} hour(s). Please come back at the scheduled time.`;
        } else {
          accessMessage = `Test session will start in ${minutesUntilStart} minute(s). Please come back at the scheduled time.`;
        }
      } else {
        accessMessage =
          "This test session is no longer accepting new participants.";
      }
    } else if (session.status === "active") {
      isAccessible = true;
      if (isActive) {
        const remainingHours = Math.floor(timeRemaining / 60);
        const remainingMinutes = timeRemaining % 60;
        if (remainingHours > 0) {
          accessMessage = `Welcome, ${authenticatedParticipant.user_name}! Test session is active. Time remaining: ${remainingHours}h ${remainingMinutes}m`;
        } else {
          accessMessage = `Welcome, ${authenticatedParticipant.user_name}! Test session is active. Time remaining: ${remainingMinutes} minutes`;
        }
      } else if (session.allow_late_entry && timeRemaining > 0) {
        isAccessible = true;
        accessMessage = `Welcome, ${authenticatedParticipant.user_name}! Late entry is allowed for this session.`;
      }
    } else {
      accessMessage = "Test session is not currently available.";
    }

    // ==================== PARTICIPANT STATUS VALIDATION ====================

    // Check participant status for additional restrictions
    if (isAccessible) {
      if (authenticatedParticipant.status === "completed") {
        isAccessible = false;
        accessMessage = "You have already completed this test session.";
      } else if (authenticatedParticipant.status === "no_show") {
        isAccessible = false;
        accessMessage =
          "Your participation status is marked as 'no show'. Please contact the administrator.";
      }
    }

    // ==================== GET SESSION MODULES ====================

    // Get session modules with test details
    const sessionModulesWithTests = await db
      .select({
        module_id: sessionModules.id,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
        test_id: tests.id,
        test_name: tests.name,
        test_category: tests.category,
        test_module_type: tests.module_type,
        test_time_limit: tests.time_limit,
        test_icon: tests.icon,
        test_card_color: tests.card_color,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, session.id))
      .orderBy(sessionModules.sequence);

    // Transform session modules for response
    const sessionModulesForResponse = sessionModulesWithTests.map((module) => ({
      sequence: module.sequence,
      test: {
        id: module.test_id,
        name: module.test_name,
        category: module.test_category,
        module_type: module.test_module_type,
        time_limit: module.test_time_limit,
        icon: module.test_icon,
        card_color: module.test_card_color,
      },
      is_required: module.is_required ?? true,
    }));

    // ==================== UPDATE PARTICIPANT STATUS ====================

    // If participant is accessing for the first time and session is accessible
    if (isAccessible && authenticatedParticipant.status === "invited") {
      // Update participant status to "registered"
      await db
        .update(sessionParticipants)
        .set({
          status: "registered",
          registered_at: new Date(),
        })
        .where(
          eq(sessionParticipants.id, authenticatedParticipant.participant_id)
        );

      console.log(
        `📝 Participant ${authenticatedParticipant.user_name} auto-registered for session ${session.session_name}`
      );
    }

    // ==================== PREPARE RESPONSE ====================

    // Prepare response data
    const responseData = {
      id: session.id,
      session_name: session.session_name,
      session_code: session.session_code,
      start_time: session.start_time,
      end_time: session.end_time,
      target_position: session.target_position || "",
      description: session.description,
      location: session.location,
      status: (session.status || "draft") as any,
      is_active: isAccessible,
      is_expired: isExpired,
      time_remaining: timeRemaining,
      session_modules: sessionModulesForResponse,

      // Participant-specific information
      participant: isAccessible
        ? {
            id: authenticatedParticipant.participant_id,
            name: authenticatedParticipant.user_name,
            nik: authenticatedParticipant.user_nik,
            email: authenticatedParticipant.user_email,
            status: authenticatedParticipant.status,
            validation_method: participantValidationMethod,
          }
        : null,
    };

    const response: GetSessionByCodeResponse = {
      success: true,
      message: accessMessage,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    // Log session access attempt with participant info
    console.log(
      `📋 Session access: ${sessionCode} by ${authenticatedParticipant.user_name} (${authenticatedParticipant.user_nik}) via ${participantValidationMethod} - ${isAccessible ? "ALLOWED" : "DENIED"} - ${accessMessage}`
    );

    // Return appropriate status code based on accessibility
    const statusCode = isAccessible
      ? 200
      : session.status === "cancelled"
        ? 410 // Gone
        : isExpired
          ? 410 // Gone
          : !isActive
            ? 425 // Too Early
            : 200; // Default to 200 for other cases

    return c.json(response, statusCode);
  } catch (error) {
    console.error(
      "Error getting session by code with participant validation:",
      error
    );

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

      // Handle invalid session code format
      if (error.message.includes("invalid input syntax")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid session code format",
          errors: [
            {
              field: "sessionCode",
              message: "Session code format is invalid",
              code: "INVALID_SESSION_CODE",
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
      message: "Failed to retrieve session",
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
