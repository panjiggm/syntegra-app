import { Context } from "hono";
import { eq, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetSessionStatsResponse,
  type SessionErrorResponse,
  type SessionStats,
} from "shared-types";

export async function getSessionStatsHandler(
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
            message: "Only admin users can access session statistics",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get total sessions count
    const [totalSessionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testSessions);

    const totalSessions = totalSessionsResult?.count || 0;

    // Get sessions by status
    const sessionsByStatus = await db
      .select({
        status: testSessions.status,
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .groupBy(testSessions.status);

    // Initialize status counts
    let activeSessionsCount = 0;
    let expiredSessionsCount = 0;
    let completedSessionsCount = 0;
    let draftSessionsCount = 0;
    let cancelledSessionsCount = 0;

    const byStatus: Record<string, number> = {};

    sessionsByStatus.forEach((item) => {
      const status = item.status || "draft";
      const count = item.count;
      byStatus[status] = count;

      switch (status) {
        case "active":
          activeSessionsCount = count;
          break;
        case "expired":
          expiredSessionsCount = count;
          break;
        case "completed":
          completedSessionsCount = count;
          break;
        case "draft":
          draftSessionsCount = count;
          break;
        case "cancelled":
          cancelledSessionsCount = count;
          break;
      }
    });

    // Get sessions by target position
    const sessionsByTargetPosition = await db
      .select({
        target_position: testSessions.target_position,
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .groupBy(testSessions.target_position)
      .orderBy(sql`count(*) DESC`)
      .limit(10); // Top 10 target positions

    const byTargetPosition: Record<string, number> = {};
    sessionsByTargetPosition.forEach((item) => {
      const key = item.target_position || "unspecified";
      byTargetPosition[key] = item.count;
    });

    // Get total participants across all sessions
    const [totalParticipantsResult] = await db
      .select({
        total: sql<number>`sum(${testSessions.current_participants})`,
      })
      .from(testSessions);

    const totalParticipants = totalParticipantsResult?.total || 0;

    // Calculate average participants per session
    const avgParticipantsPerSession =
      totalSessions > 0
        ? Math.round((totalParticipants / totalSessions) * 100) / 100
        : 0;

    // Get additional statistics
    const now = new Date();

    // Sessions happening today
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [todaySessionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .where(
        sql`${testSessions.start_time} >= ${todayStart} AND ${testSessions.start_time} < ${todayEnd}`
      );

    const todaySessionsCount = todaySessionsResult?.count || 0;

    // Sessions happening this week
    const weekStart = new Date(
      now.getTime() - now.getDay() * 24 * 60 * 60 * 1000
    );
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [weekSessionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .where(
        sql`${testSessions.start_time} >= ${weekStart} AND ${testSessions.start_time} < ${weekEnd}`
      );

    const weekSessionsCount = weekSessionsResult?.count || 0;

    // Sessions happening this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [monthSessionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testSessions)
      .where(
        sql`${testSessions.start_time} >= ${monthStart} AND ${testSessions.start_time} < ${monthEnd}`
      );

    const monthSessionsCount = monthSessionsResult?.count || 0;

    // Prepare stats response
    const statsData: SessionStats = {
      total_sessions: totalSessions,
      active_sessions: activeSessionsCount,
      expired_sessions: expiredSessionsCount,
      completed_sessions: completedSessionsCount,
      draft_sessions: draftSessionsCount,
      cancelled_sessions: cancelledSessionsCount,
      by_status: byStatus,
      by_target_position: byTargetPosition,
      total_participants: totalParticipants,
      avg_participants_per_session: avgParticipantsPerSession,
      // Additional stats
      today_sessions: todaySessionsCount,
      week_sessions: weekSessionsCount,
      month_sessions: monthSessionsCount,
    };

    const response: GetSessionStatsResponse = {
      success: true,
      message: "Session statistics retrieved successfully",
      data: statsData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Session statistics retrieved by admin ${auth.user.email}: ${totalSessions} total sessions`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session statistics:", error);

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

      // Handle aggregation errors
      if (error.message.includes("aggregate")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Database aggregation error",
          errors: [
            {
              message: "Failed to calculate session statistics",
              code: "AGGREGATION_ERROR",
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
      message: "Failed to retrieve session statistics",
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
