import { Context } from "hono";
import { eq } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionModules,
  tests,
  users,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetSessionByIdRequest,
  type GetSessionByIdResponse,
  type SessionErrorResponse,
  isSessionActive,
  isSessionExpired,
  getTimeRemaining,
  generateParticipantLink,
} from "shared-types";

export async function getSessionByIdHandler(
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

    // Get path parameters (already validated by zValidator)
    const { sessionId } = c.req.param() as GetSessionByIdRequest;

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
            message: "Only admin users can access test session details",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find session by ID
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        target_position: testSessions.target_position,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        status: testSessions.status,
        description: testSessions.description,
        location: testSessions.location,
        proctor_id: testSessions.proctor_id,
        auto_expire: testSessions.auto_expire,
        allow_late_entry: testSessions.allow_late_entry,
        created_at: testSessions.created_at,
        updated_at: testSessions.updated_at,
        created_by: testSessions.created_by,
        updated_by: testSessions.updated_by,
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

    // Get session modules with test details
    const sessionModulesWithTests = await db
      .select({
        module_id: sessionModules.id,
        session_id: sessionModules.session_id,
        test_id: sessionModules.test_id,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
        weight: sessionModules.weight,
        module_created_at: sessionModules.created_at,
        test_name: tests.name,
        test_category: tests.category,
        test_module_type: tests.module_type,
        test_time_limit: tests.time_limit,
        test_total_questions: tests.total_questions,
        test_icon: tests.icon,
        test_card_color: tests.card_color,
        test_status: tests.status,
        test_description: tests.description,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, session.id))
      .orderBy(sessionModules.sequence);

    // Get proctor info if exists
    let proctorInfo = null;
    if (session.proctor_id) {
      const [proctor] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.proctor_id))
        .limit(1);
      proctorInfo = proctor || null;
    }

    // Get creator and updater info
    let creatorInfo = null;
    if (session.created_by) {
      const [creator] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.created_by))
        .limit(1);
      creatorInfo = creator || null;
    }

    let updaterInfo = null;
    if (session.updated_by && session.updated_by !== session.created_by) {
      const [updater] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.updated_by))
        .limit(1);
      updaterInfo = updater || null;
    }

    // Transform session modules for response
    const sessionModulesForResponse = sessionModulesWithTests.map((module) => ({
      id: module.module_id,
      session_id: module.session_id,
      test_id: module.test_id,
      sequence: module.sequence,
      is_required: module.is_required ?? true,
      weight: Number(module.weight),
      created_at: module.module_created_at,
      test: {
        id: module.test_id,
        name: module.test_name,
        category: module.test_category,
        module_type: module.test_module_type,
        time_limit: module.test_time_limit,
        total_questions: module.test_total_questions || 0,
        icon: module.test_icon,
        card_color: module.test_card_color,
      },
    }));

    // Calculate computed fields
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
    const participantLink = generateParticipantLink(
      session.session_code,
      env.FRONTEND_URL
    );

    // Calculate session statistics
    const sessionDurationHours = Math.ceil(
      (session.end_time.getTime() - session.start_time.getTime()) /
        (1000 * 60 * 60)
    );
    const totalTestTime = sessionModulesWithTests.reduce(
      (total, module) => total + module.test_time_limit,
      0
    );
    const totalQuestions = sessionModulesWithTests.reduce(
      (total, module) => total + (module.test_total_questions || 0),
      0
    );

    // Prepare response data with all details
    const responseData = {
      id: session.id,
      session_name: session.session_name,
      session_code: session.session_code,
      start_time: session.start_time,
      end_time: session.end_time,
      target_position: session.target_position || "",
      max_participants: session.max_participants,
      current_participants: session.current_participants ?? 0,
      status: (session.status || "draft") as any,
      description: session.description,
      location: session.location,
      proctor_id: session.proctor_id,
      auto_expire: session.auto_expire ?? true,
      allow_late_entry: session.allow_late_entry ?? false,
      created_at: session.created_at,
      updated_at: session.updated_at,
      created_by: session.created_by,
      updated_by: session.updated_by,
      session_modules: sessionModulesForResponse,
      proctor: proctorInfo,
      is_active: isActive,
      is_expired: isExpired,
      time_remaining: timeRemaining,
      participant_link: participantLink,
      // Additional computed fields for detailed view
      session_duration_hours: sessionDurationHours,
      total_test_time_minutes: totalTestTime,
      total_questions: totalQuestions,
      created_by_user: creatorInfo,
      updated_by_user: updaterInfo,
    };

    const response: GetSessionByIdResponse = {
      success: true,
      message: `Test session '${session.session_name}' retrieved successfully`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Session details retrieved by admin ${auth.user.email}: ${session.session_name} (${session.session_code}) - ${sessionModulesWithTests.length} modules`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session by ID:", error);

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
