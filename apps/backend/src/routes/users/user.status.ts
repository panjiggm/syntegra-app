import { Context } from "hono";
import { eq, sql } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import { type ErrorResponse } from "shared-types";

interface AdminStatusResponse {
  success: true;
  message: string;
  data: {
    has_admin: boolean;
    bootstrap_available: boolean;
    total_users: number;
    total_admins: number;
    setup_complete: boolean;
  };
  timestamp: string;
}

export async function getAdminStatusHandler(
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
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Count total users and admins
    const [totalUsersResult] = await db
      .select({ count: sql`count(*)` })
      .from(users);

    const [totalAdminsResult] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.role, "admin"));

    const totalUsers = Number(totalUsersResult.count);
    const totalAdmins = Number(totalAdminsResult.count);
    const hasAdmin = totalAdmins > 0;
    const bootstrapAvailable = !hasAdmin;
    const setupComplete = hasAdmin;

    const response: AdminStatusResponse = {
      success: true,
      message: hasAdmin
        ? "System setup complete - admin exists"
        : "System requires bootstrap admin setup",
      data: {
        has_admin: hasAdmin,
        bootstrap_available: bootstrapAvailable,
        total_users: totalUsers,
        total_admins: totalAdmins,
        setup_complete: setupComplete,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error checking admin status:", error);

    const env = getEnv(c);
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to check admin status",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "ADMIN_STATUS_CHECK_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
