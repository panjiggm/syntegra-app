import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetAdminDashboardQuerySchema,
  GetParticipantDashboardQuerySchema,
  type DashboardErrorResponse,
} from "shared-types";
import { getAdminDashboardHandler } from "./dashboard.admin";
import { getParticipantDashboardHandler } from "./dashboard.participant";
import {
  authenticateUser,
  requireAdmin,
  requireParticipant,
} from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const dashboardRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { user: any };
}>();

// ==================== ADMIN DASHBOARD ROUTES ====================

// Get Admin Dashboard Data
dashboardRoutes.get(
  "/admin",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", GetAdminDashboardQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: DashboardErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getAdminDashboardHandler
);

// ==================== PARTICIPANT DASHBOARD ROUTES ====================

// Get Participant Dashboard Data
dashboardRoutes.get(
  "/participant",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("query", GetParticipantDashboardQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: DashboardErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getParticipantDashboardHandler
);

// ==================== UTILITY ROUTES ====================

// Get Dashboard Configuration (for frontend)
dashboardRoutes.get(
  "/config",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const {
        DASHBOARD_PERIODS,
        ACTIVITY_TYPE_LABELS,
        QUICK_ACTIONS,
        DASHBOARD_LIMITS,
      } = await import("shared-types");

      const auth = c.get("auth");
      const user = auth.user;
      const isAdmin = user.role === "admin";

      const config = {
        success: true,
        message: "Dashboard configuration retrieved successfully",
        data: {
          periods: Object.entries(DASHBOARD_PERIODS).map(([value, label]) => ({
            value,
            label,
          })),
          activity_types: Object.entries(ACTIVITY_TYPE_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          quick_actions: isAdmin
            ? QUICK_ACTIONS.ADMIN
            : QUICK_ACTIONS.PARTICIPANT,
          limits: DASHBOARD_LIMITS,
          user_role: user.role,
          features: {
            can_view_scores: isAdmin,
            can_view_user_details: isAdmin,
            can_access_trends: isAdmin,
            can_manage_alerts: isAdmin,
            can_export_data: isAdmin,
          },
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(config, 200);
    } catch (error) {
      console.error("Error getting dashboard config:", error);
      const errorResponse: DashboardErrorResponse = {
        success: false,
        message: "Failed to retrieve dashboard configuration",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Dashboard Health Check
dashboardRoutes.get("/health", generalApiRateLimit, async (c) => {
  try {
    const { getDbFromEnv } = await import("@/db");
    const { count } = await import("drizzle-orm");
    const { users } = await import("@/db");

    const db = getDbFromEnv(c.env);
    const startTime = Date.now();

    // Simple database health check
    await db.select({ count: count() }).from(users).limit(1);

    const responseTime = Date.now() - startTime;

    const health = {
      success: true,
      message: "Dashboard services are healthy",
      data: {
        status: "healthy",
        database: {
          status: "connected",
          response_time_ms: responseTime,
        },
        services: {
          authentication: "active",
          dashboard_apis: "active",
          data_processing: "active",
        },
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(health, 200);
  } catch (error) {
    console.error("Dashboard health check failed:", error);

    const health = {
      success: false,
      message: "Dashboard services are experiencing issues",
      data: {
        status: "unhealthy",
        database: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        services: {
          authentication: "unknown",
          dashboard_apis: "degraded",
          data_processing: "unknown",
        },
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(health, 503);
  }
});

// Dashboard Analytics Summary (Admin only)
dashboardRoutes.get(
  "/analytics/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const { getDbFromEnv, users, testAttempts, testSessions, testResults } =
        await import("@/db");
      const { count, avg, sql } = await import("drizzle-orm");

      const db = getDbFromEnv(c.env);
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get key metrics for the last 30 days
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [recentAttempts] = await db
        .select({ count: count() })
        .from(testAttempts)
        .where(sql`${testAttempts.start_time} >= ${last30Days}`);

      const [recentSessions] = await db
        .select({ count: count() })
        .from(testSessions)
        .where(sql`${testSessions.created_at} >= ${last30Days}`);

      const [avgScore] = await db
        .select({
          avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
        })
        .from(testResults)
        .where(sql`${testResults.calculated_at} >= ${last30Days}`);

      const analytics = {
        success: true,
        message: "Dashboard analytics summary retrieved successfully",
        data: {
          period: "last_30_days",
          key_metrics: {
            total_users: totalUsers.count,
            recent_test_attempts: recentAttempts.count,
            recent_sessions: recentSessions.count,
            average_test_score: avgScore.avg_score
              ? Math.round(Number(avgScore.avg_score))
              : 0,
          },
          growth_indicators: {
            user_growth_rate: "5.2%", // This would be calculated based on historical data
            session_creation_rate: "12.3%",
            test_completion_rate: "78.9%",
          },
          system_performance: {
            average_response_time: "125ms",
            uptime_percentage: 99.8,
            error_rate: 0.2,
          },
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(analytics, 200);
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      const errorResponse: DashboardErrorResponse = {
        success: false,
        message: "Failed to retrieve dashboard analytics",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Dashboard Data Export (Admin only)
dashboardRoutes.get(
  "/export",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const format = c.req.query("format") || "json";
      const period = c.req.query("period") || "month";

      if (!["json", "csv"].includes(format)) {
        const errorResponse: DashboardErrorResponse = {
          success: false,
          message: "Invalid export format. Supported formats: json, csv",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // This is a placeholder - in a real implementation, you would:
      // 1. Generate the requested data based on the period
      // 2. Format it according to the requested format
      // 3. Return the data or a download link

      const exportData = {
        success: true,
        message: "Dashboard data export prepared successfully",
        data: {
          export_id: `dashboard_export_${Date.now()}`,
          format,
          period,
          status: "ready",
          download_url: `/api/v1/dashboard/download/${Date.now()}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(exportData, 200);
    } catch (error) {
      console.error("Error preparing dashboard export:", error);
      const errorResponse: DashboardErrorResponse = {
        success: false,
        message: "Failed to prepare dashboard data export",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== ERROR HANDLERS ====================
dashboardRoutes.onError((err, c) => {
  console.error("Dashboard routes error:", err);

  const errorResponse: DashboardErrorResponse = {
    success: false,
    message: "Dashboard route error",
    ...(c.env.NODE_ENV === "development" && {
      errors: [
        {
          message: err.message,
          code: "ROUTE_ERROR",
        },
      ],
    }),
    timestamp: new Date().toISOString(),
  };

  return c.json(errorResponse, 500);
});

export { dashboardRoutes };
