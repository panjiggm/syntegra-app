import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type DeleteUserResponse,
  type ErrorResponse,
  AUTH_ERROR_CODES,
} from "shared-types";

export async function deleteUserHandler(
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

    // Authorization check: Only admin can delete users
    if (auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only administrators can delete users",
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

    // Check if user exists and is active
    const [existingUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
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

    // Check if user is already deleted (soft deleted)
    if (!existingUser.is_active) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User already deleted",
        errors: [
          {
            field: "status",
            message: "User has already been deactivated",
            code: "USER_ALREADY_DELETED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Prevent admin from deleting themselves
    if (auth.user.id === userId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Cannot delete your own account",
        errors: [
          {
            field: "self_deletion",
            message: "Administrators cannot delete their own account",
            code: "SELF_DELETION_NOT_ALLOWED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if this is the last active admin
    if (existingUser.role === "admin") {
      const [activeAdminCount] = await db
        .select({ count: users.id })
        .from(users)
        .where(eq(users.role, "admin") && eq(users.is_active, true));

      if (Number(activeAdminCount.count) <= 1) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot delete the last admin",
          errors: [
            {
              field: "last_admin",
              message:
                "Cannot delete the last active administrator. At least one admin must remain active.",
              code: "LAST_ADMIN_DELETION_NOT_ALLOWED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Perform soft delete (set is_active to false)
    const deletedAt = new Date();
    const [deletedUser] = await db
      .update(users)
      .set({
        is_active: false,
        updated_at: deletedAt,
        updated_by: auth.user.id,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        updated_at: users.updated_at,
      });

    if (!deletedUser) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to delete user",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // TODO: Optionally invalidate all user sessions when user is deleted
    // This can be implemented later if needed:
    // await deleteAllUserSessions(db, userId);

    // Prepare success response
    const response: DeleteUserResponse = {
      success: true,
      message: `User "${deletedUser.name}" has been successfully deleted`,
      data: {
        id: deletedUser.id,
        name: deletedUser.name,
        email: deletedUser.email,
        deleted_at: deletedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error deleting user:", error);

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

      // Handle constraint violations
      if (error.message.includes("constraint")) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot delete user due to database constraints",
          errors: [
            {
              field: "constraints",
              message:
                "User cannot be deleted because they have associated data",
              code: "CONSTRAINT_VIOLATION",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
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
