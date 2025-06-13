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
  type CreateSessionRequest,
  type CreateSessionResponse,
  type SessionErrorResponse,
  type CreateSessionDB,
  type CreateSessionModuleDB,
  generateSessionCode,
  generateParticipantLink,
  isSessionActive,
  isSessionExpired,
  getTimeRemaining,
} from "shared-types";

export async function createSessionHandler(
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

    // Get validated data from request
    const data = (await c.req.json()) as CreateSessionRequest;

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
            message: "Only admin users can create test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Generate session code if not provided
    const sessionCode =
      data.session_code ||
      generateSessionCode(data.session_name, data.target_position);

    // Check if session code already exists
    const existingSession = await db
      .select({
        id: testSessions.id,
        session_code: testSessions.session_code,
      })
      .from(testSessions)
      .where(eq(testSessions.session_code, sessionCode))
      .limit(1);

    if (existingSession.length > 0) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session code already exists",
        errors: [
          {
            field: "session_code",
            message: `Session code "${sessionCode}" is already in use`,
            code: "UNIQUE_CONSTRAINT",
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

    // **NEW: Validate forced_question_type and uniform_question_settings for each module**
    for (let i = 0; i < data.session_modules.length; i++) {
      const module = data.session_modules[i];

      // If forced_question_type is specified, validate settings
      if (module.forced_question_type) {
        const validQuestionTypes = [
          "multiple_choice",
          "true_false",
          "text",
          "rating_scale",
          "drawing",
          "sequence",
          "matrix",
        ];

        if (!validQuestionTypes.includes(module.forced_question_type)) {
          const errorResponse: SessionErrorResponse = {
            success: false,
            message: "Invalid forced question type",
            errors: [
              {
                field: `session_modules[${i}].forced_question_type`,
                message: `Invalid question type: ${module.forced_question_type}. Must be one of: ${validQuestionTypes.join(", ")}`,
                code: "INVALID_QUESTION_TYPE",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }

        // Validate uniform_question_settings based on question_type
        if (module.uniform_question_settings) {
          const settings = module.uniform_question_settings;

          switch (module.forced_question_type) {
            case "multiple_choice":
              if (
                settings.options_count &&
                (settings.options_count < 2 || settings.options_count > 6)
              ) {
                const errorResponse: SessionErrorResponse = {
                  success: false,
                  message: "Invalid options count for multiple choice",
                  errors: [
                    {
                      field: `session_modules[${i}].uniform_question_settings.options_count`,
                      message: "Multiple choice options must be between 2-6",
                      code: "INVALID_OPTIONS_COUNT",
                    },
                  ],
                  timestamp: new Date().toISOString(),
                };
                return c.json(errorResponse, 400);
              }
              break;

            case "rating_scale":
              if (
                settings.rating_scale_max &&
                (settings.rating_scale_max < 3 ||
                  settings.rating_scale_max > 10)
              ) {
                const errorResponse: SessionErrorResponse = {
                  success: false,
                  message: "Invalid rating scale maximum",
                  errors: [
                    {
                      field: `session_modules[${i}].uniform_question_settings.rating_scale_max`,
                      message: "Rating scale maximum must be between 3-10",
                      code: "INVALID_RATING_SCALE",
                    },
                  ],
                  timestamp: new Date().toISOString(),
                };
                return c.json(errorResponse, 400);
              }
              break;

            case "text":
              if (
                settings.text_max_length &&
                (settings.text_max_length < 10 ||
                  settings.text_max_length > 5000)
              ) {
                const errorResponse: SessionErrorResponse = {
                  success: false,
                  message: "Invalid text maximum length",
                  errors: [
                    {
                      field: `session_modules[${i}].uniform_question_settings.text_max_length`,
                      message:
                        "Text maximum length must be between 10-5000 characters",
                      code: "INVALID_TEXT_LENGTH",
                    },
                  ],
                  timestamp: new Date().toISOString(),
                };
                return c.json(errorResponse, 400);
              }
              break;
          }

          // Validate time_per_question if provided (common for all types)
          if (
            settings.time_per_question &&
            (settings.time_per_question < 5 || settings.time_per_question > 600)
          ) {
            const errorResponse: SessionErrorResponse = {
              success: false,
              message: "Invalid time per question",
              errors: [
                {
                  field: `session_modules[${i}].uniform_question_settings.time_per_question`,
                  message:
                    "Time per question must be between 5 seconds to 10 minutes",
                  code: "INVALID_TIME_LIMIT",
                },
              ],
              timestamp: new Date().toISOString(),
            };
            return c.json(errorResponse, 400);
          }
        }
      }
    }

    // Validate session timing
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);
    const now = new Date();

    if (startTime <= now) {
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

    // Start transaction-like operations
    try {
      // Insert session into database
      const sessionData: CreateSessionDB = {
        session_name: data.session_name,
        session_code: sessionCode,
        start_time: startTime,
        end_time: endTime,
        target_position: data.target_position,
        max_participants: data.max_participants || null,
        description: data.description || null,
        location: data.location || null,
        proctor_id: data.proctor_id || null,
        auto_expire: data.auto_expire,
        allow_late_entry: data.allow_late_entry,
        status: "draft", // New sessions start as draft
        created_by: auth.user.id,
        updated_by: auth.user.id,
      };

      const [newSession] = await db
        .insert(testSessions)
        .values(sessionData)
        .returning();

      if (!newSession) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Failed to create session",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      // **UPDATED: Insert session modules with new fields**
      const sessionModulesData: CreateSessionModuleDB[] =
        data.session_modules.map((module) => ({
          session_id: newSession.id,
          test_id: module.test_id,
          sequence: module.sequence,
          is_required: module.is_required,
          weight: module.weight.toString(), // Convert to string for database
          forced_question_type: module.forced_question_type || null, // NEW
          uniform_question_settings: module.uniform_question_settings || null, // NEW
        }));

      const createdModules = await db
        .insert(sessionModules)
        .values(sessionModulesData)
        .returning();

      if (createdModules.length !== data.session_modules.length) {
        // Cleanup: delete the session if modules insertion failed
        await db.delete(testSessions).where(eq(testSessions.id, newSession.id));

        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Failed to create session modules",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      // Get proctor info if exists
      let proctorInfo = null;
      if (newSession.proctor_id) {
        const [proctor] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, newSession.proctor_id))
          .limit(1);
        proctorInfo = proctor || null;
      }

      // **UPDATED: Prepare session modules with test details and new fields for response**
      const sessionModulesWithTests = createdModules.map((module) => {
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
          forced_question_type: module.forced_question_type, // NEW
          uniform_question_settings: module.uniform_question_settings as any, // NEW - cast to expected type
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

      // Calculate computed fields
      const isActive = isSessionActive({
        start_time: newSession.start_time,
        end_time: newSession.end_time,
        status: newSession.status || "draft",
      });
      const isExpired = isSessionExpired({
        end_time: newSession.end_time,
        status: newSession.status || "draft",
      });
      const timeRemaining = getTimeRemaining(newSession.end_time);
      const participantLink = generateParticipantLink(
        sessionCode,
        env.FRONTEND_URL
      );

      // Prepare success response
      const responseData = {
        id: newSession.id,
        session_name: newSession.session_name,
        session_code: newSession.session_code,
        start_time: newSession.start_time,
        end_time: newSession.end_time,
        target_position: newSession.target_position || "",
        max_participants: newSession.max_participants,
        current_participants: newSession.current_participants ?? 0,
        status: (newSession.status || "draft") as any,
        description: newSession.description,
        location: newSession.location,
        proctor_id: newSession.proctor_id,
        auto_expire: newSession.auto_expire ?? true,
        allow_late_entry: newSession.allow_late_entry ?? false,
        created_at: newSession.created_at,
        updated_at: newSession.updated_at,
        created_by: newSession.created_by,
        updated_by: newSession.updated_by,
        session_modules: sessionModulesWithTests,
        proctor: proctorInfo,
        is_active: isActive,
        is_expired: isExpired,
        time_remaining: timeRemaining,
        participant_link: participantLink,
      };

      const response: CreateSessionResponse = {
        success: true,
        message: `Test session '${newSession.session_name}' created successfully with code: ${sessionCode}`,
        data: responseData,
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Session created by admin ${auth.user.email}: ${newSession.session_name} (${sessionCode}) for ${data.target_position} - ${data.session_modules.length} modules`
      );

      return c.json(response, 201);
    } catch (dbError) {
      console.error("Database transaction error:", dbError);
      throw dbError; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    console.error("Error creating session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("session_code")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Session code already exists",
          errors: [
            {
              field: "session_code",
              message: "Please try with a different session code",
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

      // Handle invalid JSON in session modules
      if (error.message.includes("JSON") || error.message.includes("json")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid JSON data in request",
          errors: [
            {
              field: "session_modules",
              message: "Session modules contain invalid data",
              code: "INVALID_JSON",
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
              message: "Failed to complete session creation transaction",
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
      message: "Internal server error",
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
