import { Context } from "hono";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type BulkDeleteUsersResponse,
  type ErrorResponse,
  AUTH_ERROR_CODES,
} from "shared-types";

export async function bulkDeleteUsersHandler(
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

    // Get userIds from request body (validated by zValidator middleware)
    const { userIds } = await c.req.json();

    // Validate that userIds is an array
    if (!Array.isArray(userIds) || userIds.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid request",
        errors: [
          {
            field: "userIds",
            message: "userIds must be a non-empty array of user IDs",
            code: "INVALID_USER_IDS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate UUID format for each userId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = userIds.filter((id: string) => !uuidRegex.test(id));

    if (invalidIds.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid user ID format",
        errors: [
          {
            field: "userIds",
            message: `Invalid UUID format for: ${invalidIds.join(", ")}`,
            code: "INVALID_UUID",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if admin is trying to delete themselves
    if (userIds.includes(auth.user.id)) {
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

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Fetch all users to be deleted
    const usersToDelete = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    // Check if any users don't exist
    const existingIds = usersToDelete.map(user => user.id);
    const nonExistentIds = userIds.filter((id: string) => !existingIds.includes(id));

    // Separate users by their current status and role
    const activeUsers = usersToDelete.filter(user => user.is_active);
    const inactiveUsers = usersToDelete.filter(user => !user.is_active);
    const adminUsers = activeUsers.filter(user => user.role === "admin");

    // Check if we're trying to delete all active admins
    if (adminUsers.length > 0) {
      const [totalActiveAdmins] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.is_active, true)));

      if (totalActiveAdmins.count <= adminUsers.length) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot delete all active admins",
          errors: [
            {
              field: "last_admin",
              message:
                "Cannot delete all active administrators. At least one admin must remain active.",
              code: "LAST_ADMIN_DELETION_NOT_ALLOWED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Prepare arrays to track results
    const deletedUsers: Array<{ id: string; name: string; email: string }> = [];
    const failedUsers: Array<{ id: string; name?: string; email?: string; error: string }> = [];

    // Add non-existent users to failed list
    nonExistentIds.forEach((id: string) => {
      failedUsers.push({
        id,
        error: "User not found",
      });
    });

    // Add already deleted users to failed list
    inactiveUsers.forEach(user => {
      failedUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        error: "User already deleted",
      });
    });

    // Perform bulk soft delete for active users
    const deletedAt = new Date();
    const activeUserIds = activeUsers.map(user => user.id);

    if (activeUserIds.length > 0) {
      try {
        const deletedResult = await db
          .update(users)
          .set({
            is_active: false,
            updated_at: deletedAt,
            updated_by: auth.user.id,
          })
          .where(inArray(users.id, activeUserIds))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
          });

        // Add successfully deleted users to result
        deletedUsers.push(...deletedResult);
      } catch (error) {
        // If bulk delete fails, add all active users to failed list
        activeUsers.forEach(user => {
          failedUsers.push({
            id: user.id,
            name: user.name,
            email: user.email,
            error: "Database error during deletion",
          });
        });
      }
    }

    // Prepare success response
    const response: BulkDeleteUsersResponse = {
      success: true,
      message: `Bulk delete completed: ${deletedUsers.length} deleted, ${failedUsers.length} failed`,
      data: {
        deleted_count: deletedUsers.length,
        failed_count: failedUsers.length,
        deleted_users: deletedUsers,
        failed_users: failedUsers,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error in bulk delete users:", error);

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
          message: "Cannot delete users due to database constraints",
          errors: [
            {
              field: "constraints",
              message:
                "Some users cannot be deleted because they have associated data",
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