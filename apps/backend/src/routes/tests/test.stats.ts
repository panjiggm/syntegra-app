import { Context } from "hono";
import { eq, sql, count } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetTestStatsResponse,
  type TestErrorResponse,
  type TestStats,
} from "shared-types";

export async function getTestStatsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: TestErrorResponse = {
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

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get total tests count
    const [{ totalTests }] = await db
      .select({ totalTests: count() })
      .from(tests);

    // Get tests count by status
    const [{ activeTests }] = await db
      .select({ activeTests: count() })
      .from(tests)
      .where(eq(tests.status, "active"));

    const [{ inactiveTests }] = await db
      .select({ inactiveTests: count() })
      .from(tests)
      .where(eq(tests.status, "inactive"));

    const [{ archivedTests }] = await db
      .select({ archivedTests: count() })
      .from(tests)
      .where(eq(tests.status, "archived"));

    // Get tests count by module_type
    const moduleTypeStats = await db
      .select({
        module_type: tests.module_type,
        count: count(),
      })
      .from(tests)
      .groupBy(tests.module_type);

    // Get tests count by category
    const categoryStats = await db
      .select({
        category: tests.category,
        count: count(),
      })
      .from(tests)
      .groupBy(tests.category);

    // Get average time limit and questions count
    const [averages] = await db
      .select({
        avgTimeLimit: sql<number>`AVG(${tests.time_limit})`,
        avgQuestionsCount: sql<number>`AVG(${tests.total_questions})`,
      })
      .from(tests)
      .where(eq(tests.status, "active"));

    // Transform module type stats to record
    const byModuleType: Record<string, number> = {};
    moduleTypeStats.forEach((stat) => {
      byModuleType[stat.module_type] = stat.count;
    });

    // Transform category stats to record
    const byCategory: Record<string, number> = {};
    categoryStats.forEach((stat) => {
      byCategory[stat.category] = stat.count;
    });

    const stats: TestStats = {
      total_tests: totalTests,
      active_tests: activeTests,
      inactive_tests: inactiveTests,
      archived_tests: archivedTests,
      by_module_type: byModuleType,
      by_category: byCategory,
      avg_time_limit: Math.round((averages?.avgTimeLimit || 0) * 100) / 100, // Round to 2 decimal places
      avg_questions_count:
        Math.round((averages?.avgQuestionsCount || 0) * 100) / 100,
    };

    const response: GetTestStatsResponse = {
      success: true,
      message: "Test statistics retrieved successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test statistics:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle aggregation errors
      if (
        error.message.includes("aggregate") ||
        error.message.includes("group")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Failed to calculate statistics",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Failed to retrieve test statistics",
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
