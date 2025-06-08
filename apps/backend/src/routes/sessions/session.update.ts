import { Context } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  testSessions,
  sessionModules,
  users,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type UpdateSessionRequest,
  type UpdateSessionByIdRequest,
  type UpdateSessionResponse,
  type SessionErrorResponse,
  type UpdateSessionDB,
  type CreateSessionModuleDB,
  generateParticipantLink,
  isSessionActive,
  isSessionExpired,
  getTimeRemaining,
} from "shared-types";

export async function updateSessionHandler(
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
    const { sessionId } = c.req.param() as UpdateSessionByIdRequest;
    const data = (await c.req.json()) as UpdateSessionRequest;

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
            message: "Only admin users can update test sessions",
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

    // Check if session can be updated (prevent updating active sessions with participants)
    const isCurrentlyActive = isSessionActive({
      start_time: existingSession.start_time,
      end_time: existingSession.end_time,
      status: existingSession.status || "draft",
    });

    if (isCurrentlyActive && (existingSession.current_participants || 0) > 0) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot update active session with participants",
        errors: [
          {
            field: "session_status",
            message:
              "Session is currently active and has participants. Cannot be modified.",
            code: "SESSION_ACTIVE_WITH_PARTICIPANTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Validate proctor exists if provided
    if (data.proctor_id) {
      const [proctor] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, data.proctor_id), eq(users.role, "admin")))
        .limit(1);

      if (!proctor) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid proctor",
          errors: [
            {
              field: "proctor_id",
              message: "Proctor must be an existing admin user",
              code: "INVALID_PROCTOR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Validate session timing if dates are being updated
    if (data.start_time || data.end_time) {
      const startTime = data.start_time
        ? new Date(data.start_time)
        : existingSession.start_time;
      const endTime = data.end_time
        ? new Date(data.end_time)
        : existingSession.end_time;
      const now = new Date();

      // Only validate future start time for draft sessions
      if (
        existingSession.status === "draft" &&
        data.start_time &&
        startTime <= now
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid start time",
          errors: [
            {
              field: "start_time",
              message: "Start time must be in the future",
              code: "INVALID_START_TIME",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      if (endTime <= startTime) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid end time",
          errors: [
            {
              field: "end_time",
              message: "End time must be after start time",
              code: "INVALID_END_TIME",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Calculate session duration and validate it's reasonable
      const sessionDurationHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      if (sessionDurationHours > 12) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Session duration too long",
          errors: [
            {
              field: "end_time",
              message: "Session duration cannot exceed 12 hours",
              code: "DURATION_TOO_LONG",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Handle session modules update if provided
    let updatedSessionModules = [];
    if (data.session_modules) {
      // Validate all test IDs exist and are active
      const testIds = data.session_modules.map((module) => module.test_id);
      const existingTests = await db
        .select({
          id: tests.id,
          name: tests.name,
          category: tests.category,
          module_type: tests.module_type,
          time_limit: tests.time_limit,
          total_questions: tests.total_questions,
          status: tests.status,
          icon: tests.icon,
          card_color: tests.card_color,
        })
        .from(tests)
        .where(inArray(tests.id, testIds));

      const foundTestIds = existingTests.map((test) => test.id);
      const missingTestIds = testIds.filter((id) => !foundTestIds.includes(id));

      if (missingTestIds.length > 0) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid test IDs",
          errors: [
            {
              field: "session_modules",
              message: `The following test IDs do not exist: ${missingTestIds.join(", ")}`,
              code: "INVALID_TEST_IDS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Check if any tests are not active
      const inactiveTests = existingTests.filter(
        (test) => test.status !== "active"
      );
      if (inactiveTests.length > 0) {
        const inactiveTestNames = inactiveTests
          .map((test) => test.name)
          .join(", ");
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Some tests are not active",
          errors: [
            {
              field: "session_modules",
              message: `The following tests are not active and cannot be used: ${inactiveTestNames}`,
              code: "INACTIVE_TESTS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Delete existing session modules
      await db
        .delete(sessionModules)
        .where(eq(sessionModules.session_id, sessionId));

      // Insert new session modules
      const sessionModulesData: CreateSessionModuleDB[] =
        data.session_modules.map((module) => ({
          session_id: sessionId,
          test_id: module.test_id,
          sequence: module.sequence,
          is_required: module.is_required,
          weight: module.weight.toString(), // Convert to string for database
        }));

      const createdModules = await db
        .insert(sessionModules)
        .values(sessionModulesData)
        .returning();

      // Prepare session modules with test details for response
      updatedSessionModules = createdModules.map((module) => {
        const testInfo = existingTests.find(
          (test) => test.id === module.test_id
        )!;
        return {
          id: module.id,
          session_id: module.session_id,
          test_id: module.test_id,
          sequence: module.sequence,
          is_required: module.is_required ?? true,
          weight: Number(module.weight),
          created_at: module.created_at,
          test: {
            id: testInfo.id,
            name: testInfo.name,
            category: testInfo.category,
            module_type: testInfo.module_type,
            time_limit: testInfo.time_limit,
            total_questions: testInfo.total_questions || 0,
            icon: testInfo.icon,
            card_color: testInfo.card_color,
          },
        };
      });
    } else {
      // If session_modules not provided, get existing modules
      const existingModules = await db
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
        })
        .from(sessionModules)
        .innerJoin(tests, eq(sessionModules.test_id, tests.id))
        .where(eq(sessionModules.session_id, sessionId))
        .orderBy(sessionModules.sequence);

      updatedSessionModules = existingModules.map((module) => ({
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
    }

    // Prepare update data
    const updateData: UpdateSessionDB = {
      updated_at: new Date(),
      updated_by: auth.user.id,
    };

    // Only add fields that are provided in the request
    if (data.session_name !== undefined)
      updateData.session_name = data.session_name;
    if (data.start_time !== undefined)
      updateData.start_time = new Date(data.start_time);
    if (data.end_time !== undefined)
      updateData.end_time = new Date(data.end_time);
    if (data.target_position !== undefined)
      updateData.target_position = data.target_position;
    if (data.max_participants !== undefined)
      updateData.max_participants = data.max_participants;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.proctor_id !== undefined) updateData.proctor_id = data.proctor_id;
    if (data.auto_expire !== undefined)
      updateData.auto_expire = data.auto_expire;
    if (data.allow_late_entry !== undefined)
      updateData.allow_late_entry = data.allow_late_entry;
    if (data.status !== undefined) updateData.status = data.status;

    // Update session in database
    const [updatedSession] = await db
      .update(testSessions)
      .set(updateData)
      .where(eq(testSessions.id, sessionId))
      .returning();

    if (!updatedSession) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to update session",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Get proctor info if exists
    let proctorInfo = null;
    if (updatedSession.proctor_id) {
      const [proctor] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, updatedSession.proctor_id))
        .limit(1);
      proctorInfo = proctor || null;
    }

    // Calculate computed fields
    const isActive = isSessionActive({
      start_time: updatedSession.start_time,
      end_time: updatedSession.end_time,
      status: updatedSession.status || "draft",
    });
    const isExpired = isSessionExpired({
      end_time: updatedSession.end_time,
      status: updatedSession.status || "draft",
    });
    const timeRemaining = getTimeRemaining(updatedSession.end_time);
    const participantLink = generateParticipantLink(
      updatedSession.session_code,
      env.FRONTEND_URL
    );

    // Prepare success response
    const responseData = {
      id: updatedSession.id,
      session_name: updatedSession.session_name,
      session_code: updatedSession.session_code,
      start_time: updatedSession.start_time,
      end_time: updatedSession.end_time,
      target_position: updatedSession.target_position || "",
      max_participants: updatedSession.max_participants,
      current_participants: updatedSession.current_participants ?? 0,
      status: (updatedSession.status || "draft") as any,
      description: updatedSession.description,
      location: updatedSession.location,
      proctor_id: updatedSession.proctor_id,
      auto_expire: updatedSession.auto_expire ?? true,
      allow_late_entry: updatedSession.allow_late_entry ?? false,
      created_at: updatedSession.created_at,
      updated_at: updatedSession.updated_at,
      created_by: updatedSession.created_by,
      updated_by: updatedSession.updated_by,
      session_modules: updatedSessionModules,
      proctor: proctorInfo,
      is_active: isActive,
      is_expired: isExpired,
      time_remaining: timeRemaining,
      participant_link: participantLink,
    };

    const response: UpdateSessionResponse = {
      success: true,
      message: `Test session '${updatedSession.session_name}' updated successfully`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Session updated by admin ${auth.user.email}: ${updatedSession.session_name} (${updatedSession.session_code}) - ${updatedSessionModules.length} modules`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Unique constraint violation",
          errors: [
            {
              message: "One or more fields must be unique",
              code: "UNIQUE_CONSTRAINT",
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
              message:
                "One or more referenced items (tests, proctor) are invalid",
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
      message: "Failed to update session",
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
