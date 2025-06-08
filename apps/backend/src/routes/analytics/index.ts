import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  TestAnalyticsQuerySchema,
  SessionAnalyticsQuerySchema,
  UserAnalyticsQuerySchema,
  PerformanceAnalyticsQuerySchema,
  CompletionRateAnalyticsQuerySchema,
  TraitAnalyticsQuerySchema,
  type AnalyticsErrorResponse,
} from "shared-types";
import { getTestAnalyticsHandler } from "./analytic.tests";
import { getSessionAnalyticsHandler } from "./analytic.sessions";
import { getUserAnalyticsHandler } from "./analytic.users";
import { getPerformanceAnalyticsHandler } from "./analytic.performance";
import { getCompletionRateAnalyticsHandler } from "./analytic.completion-rates";
import { getTraitAnalyticsHandler } from "./analytic.traits";
import { authenticateUser, requireAdmin } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import { getDbFromEnv, tests, testSessions, users } from "@/db";
import { count } from "drizzle-orm";

const analyticsRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { user: any };
}>();

// ==================== TEST ANALYTICS ====================
analyticsRoutes.get(
  "/tests",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", TestAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTestAnalyticsHandler
);

// ==================== SESSION ANALYTICS ====================
analyticsRoutes.get(
  "/sessions",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", SessionAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getSessionAnalyticsHandler
);

// ==================== USER ANALYTICS ====================
analyticsRoutes.get(
  "/users",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", UserAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getUserAnalyticsHandler
);

// ==================== PERFORMANCE ANALYTICS ====================
analyticsRoutes.get(
  "/performance",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", PerformanceAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getPerformanceAnalyticsHandler
);

// ==================== COMPLETION RATE ANALYTICS ====================
analyticsRoutes.get(
  "/completion-rates",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", CompletionRateAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getCompletionRateAnalyticsHandler
);

// ==================== TRAIT ANALYTICS ====================
analyticsRoutes.get(
  "/traits",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", TraitAnalyticsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTraitAnalyticsHandler
);

// ==================== UTILITY ROUTES ====================

// Get Analytics Configuration (for frontend)
analyticsRoutes.get(
  "/config",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const { AnalyticsPeriodEnum, MetricTypeEnum, formatAnalyticsPeriod } =
        await import("shared-types");

      const config = {
        success: true,
        data: {
          periods: AnalyticsPeriodEnum.options.map((period) => ({
            value: period,
            label: formatAnalyticsPeriod(period),
          })),
          metric_types: MetricTypeEnum.options.map((type) => ({
            value: type,
            label: type
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
          })),
          group_by_options: {
            tests: ["test", "category", "day", "week", "month"],
            sessions: ["session", "status", "day", "week", "month"],
            users: [
              "role",
              "gender",
              "education",
              "province",
              "day",
              "week",
              "month",
            ],
            traits: ["trait", "test", "gender", "education", "age_group"],
            completion_rates: [
              "test",
              "session",
              "user",
              "day",
              "week",
              "month",
            ],
          },
          default_timezone: "Asia/Jakarta",
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(config, 200);
    } catch (error) {
      console.error("Error getting analytics config:", error);
      const errorResponse: AnalyticsErrorResponse = {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve analytics configuration",
        },
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Analytics Health Check
analyticsRoutes.get(
  "/health",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const db = getDbFromEnv(c.env);
      const startTime = Date.now();

      // Check database connectivity
      const [userCount, sessionCount, testCount] = await Promise.all([
        db.select({ count: count() }).from(users).limit(1),
        db.select({ count: count() }).from(testSessions).limit(1),
        db.select({ count: count() }).from(tests).limit(1),
      ]);

      const responseTime = Date.now() - startTime;

      const health = {
        success: true,
        data: {
          status: "healthy",
          database: {
            status: "connected",
            response_time_ms: responseTime,
          },
          data_availability: {
            users: userCount[0]?.count > 0,
            sessions: sessionCount[0]?.count > 0,
            tests: testCount[0]?.count > 0,
          },
          services: {
            test_analytics: "active",
            session_analytics: "active",
            user_analytics: "active",
            performance_analytics: "active",
            completion_analytics: "active",
            trait_analytics: "active",
          },
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(health, 200);
    } catch (error) {
      console.error("Analytics health check failed:", error);

      const health = {
        success: false,
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: "Analytics services are experiencing issues",
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(health, 503);
    }
  }
);

export { analyticsRoutes };
