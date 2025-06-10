import { Context } from "hono";
import { eq } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionModules,
  tests,
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
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
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

    // ==================== SESSION STATUS CALCULATION ====================

    // Calculate session status
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

    // Determine session accessibility and message
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
    } else if (session.status === "active") {
      isAccessible = true;
      if (isActive) {
        const remainingHours = Math.floor(timeRemaining / 60);
        const remainingMinutes = timeRemaining % 60;
        if (remainingHours > 0) {
          accessMessage = `Test session is active. Time remaining: ${remainingHours}h ${remainingMinutes}m`;
        } else {
          accessMessage = `Test session is active. Time remaining: ${remainingMinutes} minutes`;
        }
      } else if (session.allow_late_entry && timeRemaining > 0) {
        isAccessible = true;
        accessMessage = "Test session is available. Late entry is allowed.";
      } else {
        const now = new Date();
        if (now < session.start_time) {
          const minutesUntilStart = Math.floor(
            (session.start_time.getTime() - now.getTime()) / (1000 * 60)
          );
          if (minutesUntilStart > 60) {
            const hoursUntilStart = Math.floor(minutesUntilStart / 60);
            accessMessage = `Test session will start in ${hoursUntilStart} hour(s).`;
          } else {
            accessMessage = `Test session will start in ${minutesUntilStart} minute(s).`;
          }
        } else {
          accessMessage =
            "This test session is no longer accepting participants.";
        }
      }
    } else {
      accessMessage = "Test session is not currently available.";
    }

    // ==================== GET SESSION MODULES ====================

    // Get session modules with test details
    const sessionModulesWithTests = await db
      .select({
        module_id: sessionModules.id,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
        weight: sessionModules.weight,
        test_id: tests.id,
        test_name: tests.name,
        test_category: tests.category,
        test_module_type: tests.module_type,
        test_time_limit: tests.time_limit,
        test_total_questions: tests.total_questions,
        test_icon: tests.icon,
        test_card_color: tests.card_color,
        test_description: tests.description,
        test_instructions: tests.instructions,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, session.id))
      .orderBy(sessionModules.sequence);

    // Transform session modules for response
    const sessionModulesForResponse = sessionModulesWithTests.map((module) => ({
      id: module.module_id,
      sequence: module.sequence,
      is_required: module.is_required ?? true,
      weight: Number(module.weight) || 1,
      test: {
        id: module.test_id,
        name: module.test_name,
        category: module.test_category,
        module_type: module.test_module_type,
        time_limit: module.test_time_limit,
        total_questions: module.test_total_questions || 0,
        icon: module.test_icon,
        card_color: module.test_card_color,
        description: module.test_description,
        instructions: module.test_instructions,
      },
    }));

    // Calculate session statistics
    const totalTestTime = sessionModulesWithTests.reduce(
      (total, module) => total + module.test_time_limit,
      0
    );
    const totalQuestions = sessionModulesWithTests.reduce(
      (total, module) => total + (module.test_total_questions || 0),
      0
    );
    const sessionDurationHours = Math.ceil(
      (session.end_time.getTime() - session.start_time.getTime()) /
        (1000 * 60 * 60)
    );

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
      max_participants: session.max_participants,
      current_participants: session.current_participants || 0,
      allow_late_entry: session.allow_late_entry ?? false,
      auto_expire: session.auto_expire ?? true,

      // Session status information
      is_active: isActive,
      is_accessible: isAccessible,
      is_expired: isExpired,
      time_remaining: timeRemaining,

      // Session statistics
      session_duration_hours: sessionDurationHours,
      total_test_time_minutes: totalTestTime,
      total_questions: totalQuestions,
      total_modules: sessionModulesWithTests.length,

      // Session modules
      session_modules: sessionModulesForResponse,
    };

    const response: GetSessionByCodeResponse = {
      success: true,
      message: accessMessage,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    // Log session access
    console.log(
      `📋 Public session access: ${sessionCode} - ${session.session_name} - Status: ${session.status} - ${isAccessible ? "ACCESSIBLE" : "NOT_ACCESSIBLE"}`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session by code:", error);

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
