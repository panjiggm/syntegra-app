import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetUserByIdResponse,
  type ErrorResponse,
  type UserData,
  AUTH_ERROR_CODES,
} from "shared-types";

export async function getUserByIdHandler(
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

    // Get userId from path parameters
    const userId = c.req.param("userId");

    // Validate userId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid user ID format",
        errors: [
          {
            field: "userId",
            message: "User ID must be a valid UUID",
            code: "INVALID_UUID",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get authentication context
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authentication",
            message: "User must be authenticated to access this resource",
            code: AUTH_ERROR_CODES.UNAUTHORIZED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Authorization check: Admin can access any user, participants can only access their own data
    if (auth.user.role === "participant" && auth.user.id !== userId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Participants can only access their own user data",
            code: AUTH_ERROR_CODES.FORBIDDEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Query user from database
    const [user] = await db
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
      .where(eq(users.id, userId))
      .limit(1);

    // Check if user exists
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "userId",
            message: `No user found with ID: ${userId}`,
            code: "USER_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Prepare user data response (exclude sensitive information)
    const userData: UserData = {
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
    };

    // Prepare success response
    const response: GetUserByIdResponse = {
      success: true,
      message: `User retrieved successfully`,
      data: userData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error fetching user by ID:", error);

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

      // Handle invalid query errors
      if (
        error.message.includes("invalid") ||
        error.message.includes("syntax")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Invalid database query",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: ErrorResponse = {
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
