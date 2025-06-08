import { Context } from "hono";
import { eq, and, like, gte, lte, sql, desc, asc } from "drizzle-orm";
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
  type GetSessionsRequest,
  type GetSessionsResponse,
  type SessionErrorResponse,
  isSessionActive,
  isSessionExpired,
  getTimeRemaining,
  generateParticipantLink,
} from "shared-types";

export async function getSessionsListHandler(
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

    // Get query parameters (already validated by zValidator)
    const query = c.req.query() as any as GetSessionsRequest;

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
            message: "Only admin users can list test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Build where conditions
    const whereConditions = [];

    // Search filter
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      whereConditions.push(
        sql`(
          ${testSessions.session_name} ILIKE ${searchTerm} OR
          ${testSessions.session_code} ILIKE ${searchTerm} OR
          ${testSessions.target_position} ILIKE ${searchTerm}
        )`
      );
    }

    // Status filter
    if (query.status) {
      whereConditions.push(eq(testSessions.status, query.status));
    }

    // Target position filter
    if (query.target_position) {
      whereConditions.push(
        like(testSessions.target_position, `%${query.target_position}%`)
      );
    }

    // Proctor filter
    if (query.proctor_id) {
      whereConditions.push(eq(testSessions.proctor_id, query.proctor_id));
    }

    // Date filters
    if (query.start_date_from) {
      whereConditions.push(
        gte(testSessions.start_time, new Date(query.start_date_from))
      );
    }

    if (query.start_date_to) {
      whereConditions.push(
        lte(testSessions.start_time, new Date(query.start_date_to))
      );
    }

    if (query.created_from) {
      whereConditions.push(
        gte(testSessions.created_at, new Date(query.created_from))
      );
    }

    if (query.created_to) {
      whereConditions.push(
        lte(testSessions.created_at, new Date(query.created_to))
      );
    }

    // Combine where conditions
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Build order by clause
    const orderByField = (() => {
      switch (query.sort_by) {
        case "session_name":
          return testSessions.session_name;
        case "session_code":
          return testSessions.session_code;
        case "start_time":
          return testSessions.start_time;
        case "end_time":
          return testSessions.end_time;
        case "target_position":
          return testSessions.target_position;
        case "status":
          return testSessions.status;
        case "created_at":
          return testSessions.created_at;
        case "updated_at":
          return testSessions.updated_at;
        default:
          return testSessions.start_time;
      }
    })();

    const orderByClause =
      query.sort_order === "asc" ? asc(orderByField) : desc(orderByField);

    // Get total count for pagination
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .where(whereClause);

    const total = totalCount?.count || 0;
    const totalPages = Math.ceil(total / query.limit);
    const hasNextPage = query.page < totalPages;
    const hasPrevPage = query.page > 1;

    // Get sessions with pagination
    const sessions = await db
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
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    // Get session modules and proctors for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
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

        // Transform session modules for response
        const sessionModulesForResponse = sessionModulesWithTests.map(
          (module) => ({
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
          })
        );

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

        return {
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
        };
      })
    );

    // Get filter options for response
    const uniqueStatuses = await db
      .selectDistinct({
        status: testSessions.status,
      })
      .from(testSessions)
      .where(sql`${testSessions.status} IS NOT NULL`);

    const uniqueTargetPositions = await db
      .selectDistinct({
        target_position: testSessions.target_position,
      })
      .from(testSessions)
      .where(sql`${testSessions.target_position} IS NOT NULL`)
      .limit(20); // Limit to prevent too many options

    const availableProctors = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(users.name)
      .limit(50); // Limit to prevent too many options

    // Prepare pagination meta
    const paginationMeta = {
      current_page: query.page,
      per_page: query.limit,
      total,
      total_pages: totalPages,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
    };

    // Prepare filter options
    const filterOptions = {
      statuses: uniqueStatuses.map((s) => s.status || "draft"),
      target_positions: uniqueTargetPositions
        .map((tp) => tp.target_position)
        .filter((tp): tp is string => tp !== null),
      proctors: availableProctors,
    };

    const response: GetSessionsResponse = {
      success: true,
      message: `Found ${total} test session(s)`,
      data: sessionsWithDetails,
      meta: paginationMeta,
      filters: filterOptions,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Sessions list retrieved by admin ${auth.user.email}: ${sessions.length} sessions (page ${query.page}/${totalPages})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting sessions list:", error);

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

      // Handle invalid date format errors
      if (
        error.message.includes("invalid date") ||
        error.message.includes("date")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid date format in query parameters",
          errors: [
            {
              field: "date_filters",
              message: "Date filters must be in valid ISO format",
              code: "INVALID_DATE_FORMAT",
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
          message: "Invalid UUID format in query parameters",
          errors: [
            {
              field: "proctor_id",
              message: "Proctor ID must be a valid UUID",
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
      message: "Failed to retrieve sessions",
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
