import { Context } from "hono";
import {
  and,
  or,
  eq,
  like,
  gte,
  lte,
  count,
  asc,
  desc,
  notInArray,
} from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  sessionParticipants,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetUsersRequest,
  type GetUsersResponse,
  type ErrorResponse,
  type PaginationMeta,
} from "shared-types";

export async function getAvailableUsersForSessionHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
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

    // Get session ID from path parameters
    const sessionId = c.req.param("sessionId");

    // Validate sessionId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      const errorResponse: ErrorResponse = {
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

    // Get and parse query parameters
    const rawQueryParams = c.req.query();

    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(rawQueryParams.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(rawQueryParams.limit || "10", 10))
    );

    // Parse filters
    const queryParams = {
      page,
      limit,
      search: rawQueryParams.search || undefined,
      role: (rawQueryParams.role as any) || "participant", // Default to participant role
      gender: (rawQueryParams.gender as any) || undefined,
      is_active: rawQueryParams.is_active !== "false", // Default to true
      sort_by: (rawQueryParams.sort_by as any) || "name",
      sort_order: (rawQueryParams.sort_order as any) || "asc",
    };

    // Get environment and database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authentication context
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can access this resource",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // First, get all user IDs who are already participants in this session
    const existingParticipants = await db
      .select({
        user_id: sessionParticipants.user_id,
      })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, sessionId));

    const existingParticipantIds = existingParticipants.map((p) => p.user_id);

    // Build where conditions for users
    const whereConditions = [];

    // Exclude users who are already participants
    if (existingParticipantIds.length > 0) {
      whereConditions.push(notInArray(users.id, existingParticipantIds));
    }

    // Search filter
    if (queryParams.search) {
      const searchTerm = `%${queryParams.search.toLowerCase()}%`;
      whereConditions.push(
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm),
          like(users.nik, searchTerm)
        )
      );
    }

    // Role filter (default to participant)
    if (queryParams.role) {
      whereConditions.push(eq(users.role, queryParams.role));
    }

    // Gender filter
    if (queryParams.gender) {
      whereConditions.push(eq(users.gender, queryParams.gender));
    }

    // Active status filter (default to active only)
    whereConditions.push(eq(users.is_active, true));

    // Combine where conditions
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Build sorting
    const sortColumn = (() => {
      switch (queryParams.sort_by) {
        case "name":
          return users.name;
        case "email":
          return users.email;
        case "created_at":
          return users.created_at;
        case "updated_at":
          return users.updated_at;
        default:
          return users.name;
      }
    })();

    const sortDirection = queryParams.sort_order === "desc" ? desc : asc;

    // Get total count for pagination
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    // Calculate pagination
    const offset = (queryParams.page - 1) * queryParams.limit;
    const totalPages = Math.ceil(total / queryParams.limit);

    // Get users with pagination and sorting
    const usersList = await db
      .select({
        id: users.id,
        nik: users.nik,
        name: users.name,
        role: users.role,
        email: users.email,
        gender: users.gender,
        phone: users.phone,
        birth_place: users.birth_place,
        birth_date: users.birth_date,
        religion: users.religion,
        education: users.education,
        address: users.address,
        province: users.province,
        regency: users.regency,
        district: users.district,
        village: users.village,
        postal_code: users.postal_code,
        profile_picture_url: users.profile_picture_url,
        is_active: users.is_active,
        email_verified: users.email_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
        created_by: users.created_by,
        updated_by: users.updated_by,
      })
      .from(users)
      .where(whereClause)
      .orderBy(sortDirection(sortColumn))
      .limit(queryParams.limit)
      .offset(offset);

    // Prepare pagination meta
    const meta: PaginationMeta = {
      current_page: queryParams.page,
      per_page: queryParams.limit,
      total: total,
      total_pages: totalPages,
      has_next_page: queryParams.page < totalPages,
      has_prev_page: queryParams.page > 1,
    };

    // Prepare success response
    const response: GetUsersResponse = {
      success: true,
      message: `Successfully retrieved ${usersList.length} available users for session`,
      data: usersList.map((user) => ({
        id: user.id,
        nik: user.nik || "",
        name: user.name,
        role: user.role,
        email: user.email,
        gender: user.gender || "other",
        phone: user.phone || "",
        birth_place: user.birth_place,
        birth_date: user.birth_date,
        religion: user.religion,
        education: user.education,
        address: user.address,
        province: user.province,
        regency: user.regency,
        district: user.district,
        village: user.village,
        postal_code: user.postal_code,
        profile_picture_url: user.profile_picture_url,
        is_active: user.is_active ?? true,
        email_verified: user.email_verified ?? false,
        created_at: user.created_at,
        updated_at: user.updated_at,
        created_by: user.created_by,
        updated_by: user.updated_by,
      })),
      meta,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Available users for session retrieved by admin ${auth.user.email}: ${usersList.length} users available for session ${sessionId} - page ${queryParams.page}/${totalPages}`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting available users for session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: ErrorResponse = {
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
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to retrieve available users for session",
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
