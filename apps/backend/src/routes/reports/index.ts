import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetIndividualReportRequestSchema,
  GetIndividualReportQuerySchema,
  GetSessionSummaryReportRequestSchema,
  GetSessionSummaryReportQuerySchema,
  GetComparativeReportRequestSchema,
  GetComparativeReportQuerySchema,
  GetBatchReportRequestSchema,
  GetBatchReportQuerySchema,
  type ReportErrorResponse,
} from "shared-types";
import { getIndividualReportHandler } from "./report.individual";
import { getSessionSummaryReportHandler } from "./report.session-summary";
import { getComparativeReportHandler } from "./report.comparative";
import { getBatchReportHandler } from "./report.batch";
import { authenticateUser, requireAdmin } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const reportRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== INDIVIDUAL ASSESSMENT REPORT ====================

// Get Individual Assessment Report (Participant can access own, Admin can access all)
reportRoutes.get(
  "/individual/:userId",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetIndividualReportRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Invalid user ID parameter",
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
  zValidator("query", GetIndividualReportQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
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
  getIndividualReportHandler
);

// ==================== SESSION SUMMARY REPORT ====================

// Get Session Summary Report (Admin only)
reportRoutes.get(
  "/session/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionSummaryReportRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Invalid session ID parameter",
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
  zValidator("query", GetSessionSummaryReportQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
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
  getSessionSummaryReportHandler
);

// ==================== COMPARATIVE ANALYSIS REPORT ====================

// Get Comparative Analysis Report (Admin only)
reportRoutes.get(
  "/comparative/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetComparativeReportRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Invalid session ID parameter",
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
  zValidator("query", GetComparativeReportQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
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
  getComparativeReportHandler
);

// ==================== BATCH RESULTS REPORT ====================

// Get Batch Results Report (Admin only)
reportRoutes.get(
  "/batch/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetBatchReportRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Invalid session ID parameter",
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
  zValidator("query", GetBatchReportQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ReportErrorResponse = {
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
  getBatchReportHandler
);

// ==================== UTILITY ROUTES ====================

// Get Report Configuration (for frontend)
reportRoutes.get(
  "/config",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const {
        REPORT_TYPE_LABELS,
        REPORT_FORMAT_LABELS,
        STRENGTH_LEVEL_LABELS,
        RECOMMENDATION_CATEGORY_LABELS,
        REPORT_LIMITS,
      } = await import("shared-types");

      const config = {
        success: true,
        message: "Report configuration retrieved successfully",
        data: {
          report_types: Object.entries(REPORT_TYPE_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          report_formats: Object.entries(REPORT_FORMAT_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          strength_levels: Object.entries(STRENGTH_LEVEL_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          recommendation_categories: Object.entries(
            RECOMMENDATION_CATEGORY_LABELS
          ).map(([value, label]) => ({
            value,
            label,
          })),
          limits: REPORT_LIMITS,
          supported_languages: [
            { value: "id", label: "Bahasa Indonesia" },
            { value: "en", label: "English" },
          ],
          chart_types: [
            { value: "bar", label: "Bar Chart" },
            { value: "line", label: "Line Chart" },
            { value: "pie", label: "Pie Chart" },
            { value: "radar", label: "Radar Chart" },
            { value: "scatter", label: "Scatter Plot" },
            { value: "box_plot", label: "Box Plot" },
          ],
          comparison_metrics: [
            { value: "raw_score", label: "Raw Score" },
            { value: "scaled_score", label: "Scaled Score" },
            { value: "percentile", label: "Percentile" },
            { value: "trait_scores", label: "Trait Scores" },
            { value: "completion_rate", label: "Completion Rate" },
            { value: "time_efficiency", label: "Time Efficiency" },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(config, 200);
    } catch (error) {
      console.error("Error getting report configuration:", error);
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Failed to retrieve report configuration",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Report Statistics (Admin only)
reportRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const { getDbFromEnv, testResults, testSessions, users } = await import(
        "@/db"
      );
      const { count, sql } = await import("drizzle-orm");

      const db = getDbFromEnv(c.env);

      // Get basic statistics
      const [totalResults] = await db
        .select({ count: count() })
        .from(testResults);

      const [totalSessions] = await db
        .select({ count: count() })
        .from(testSessions);

      const [totalUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.role} = 'participant'`);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentResults] = await db
        .select({ count: count() })
        .from(testResults)
        .where(sql`${testResults.calculated_at} >= ${thirtyDaysAgo}`);

      const [recentSessions] = await db
        .select({ count: count() })
        .from(testSessions)
        .where(sql`${testSessions.created_at} >= ${thirtyDaysAgo}`);

      const stats = {
        total_test_results: totalResults.count,
        total_sessions: totalSessions.count,
        total_participants: totalUsers.count,
        recent_results_30_days: recentResults.count,
        recent_sessions_30_days: recentSessions.count,
        report_generation_capacity: {
          individual_reports_per_hour: 100,
          batch_reports_per_hour: 10,
          max_concurrent_reports: 5,
        },
        data_availability: {
          has_test_results: totalResults.count > 0,
          has_sessions: totalSessions.count > 0,
          has_participants: totalUsers.count > 0,
        },
      };

      const response = {
        success: true,
        message: "Report statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting report statistics:", error);
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Failed to retrieve report statistics",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Report Health Check
reportRoutes.get(
  "/health",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const { getDbFromEnv, testResults } = await import("@/db");
      const { count } = await import("drizzle-orm");

      const db = getDbFromEnv(c.env);
      const startTime = Date.now();

      // Check database connectivity
      const [resultCount] = await db
        .select({ count: count() })
        .from(testResults)
        .limit(1);

      const responseTime = Date.now() - startTime;

      const health = {
        success: true,
        data: {
          status: "healthy",
          database: {
            status: "connected",
            response_time_ms: responseTime,
          },
          services: {
            individual_reports: "active",
            session_reports: "active",
            comparative_reports: "active",
            batch_reports: "active",
          },
          data_availability: {
            test_results_available: resultCount.count > 0,
          },
          report_limits: {
            max_participants_batch: 1000,
            max_chart_data_points: 100,
            max_file_size_mb: 50,
          },
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(health, 200);
    } catch (error) {
      console.error("Report health check failed:", error);

      const health = {
        success: false,
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: "Report services are experiencing issues",
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(health, 503);
    }
  }
);

// ==================== ERROR HANDLERS ====================
reportRoutes.onError((err, c) => {
  console.error("Report routes error:", err);

  const errorResponse: ReportErrorResponse = {
    success: false,
    message: "Report route error",
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

export { reportRoutes };
