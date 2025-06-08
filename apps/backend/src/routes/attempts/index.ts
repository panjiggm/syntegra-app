import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  StartTestAttemptRequestSchema,
  GetAttemptByIdRequestSchema,
  UpdateAttemptByIdRequestSchema,
  UpdateTestAttemptRequestSchema,
  FinishAttemptByIdRequestSchema,
  FinishTestAttemptRequestSchema,
  GetUserAttemptsRequestSchema,
  GetUserAttemptsQuerySchema,
  GetSessionAttemptsRequestSchema,
  GetSessionAttemptsQuerySchema,
  GetAttemptProgressRequestSchema,
  type AttemptErrorResponse,
} from "shared-types";
import { startTestAttemptHandler } from "./attempt.start";
import { getTestAttemptHandler } from "./attempt.get";
import { updateTestAttemptHandler } from "./attempt.update";
import { finishTestAttemptHandler } from "./attempt.finish";
import { getUserAttemptsHandler } from "./attempt.get-user";
import { getSessionAttemptsHandler } from "./attempt.get-session";
import { getAttemptProgressHandler } from "./attempt.get-progress";
import {
  authenticateUser,
  requireParticipant,
  requireAdmin,
} from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import { answerRoutes } from "./answers";

const attemptRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== ANSWERS ROUTES ====================
// Mount answers routes under /:attemptId/answers
attemptRoutes.route("/:attemptId/answers", answerRoutes);

// ==================== NEW ENDPOINTS ====================

// Get User's Test Attempts (Admin only)
attemptRoutes.get(
  "/user/:userId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetUserAttemptsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
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
  zValidator("query", GetUserAttemptsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
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
  getUserAttemptsHandler
);

// Get Session's Test Attempts (Admin only)
attemptRoutes.get(
  "/session/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionAttemptsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
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
  zValidator("query", GetSessionAttemptsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
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
  getSessionAttemptsHandler
);

// Get Attempt Progress (Participant can access own, Admin can access all)
attemptRoutes.get(
  "/:attemptId/progress",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetAttemptProgressRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Invalid attempt ID parameter",
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
  getAttemptProgressHandler
);

// ==================== EXISTING ENDPOINTS ====================

// Start Test Attempt (Participant only)
attemptRoutes.post(
  "/start",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("json", StartTestAttemptRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Validation failed",
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
  startTestAttemptHandler
);

// Get Test Attempt Details (Participant can access own, Admin can access all)
attemptRoutes.get(
  "/:attemptId",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("param", GetAttemptByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Invalid attempt ID parameter",
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
  getTestAttemptHandler
);

// Update Test Attempt (Participant can update own, Admin can update all)
attemptRoutes.put(
  "/:attemptId",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("param", UpdateAttemptByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Invalid attempt ID parameter",
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
  zValidator("json", UpdateTestAttemptRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Validation failed",
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
  updateTestAttemptHandler
);

// Finish Test Attempt (Participant can finish own, Admin can finish all)
attemptRoutes.post(
  "/:attemptId/finish",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("param", FinishAttemptByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Invalid attempt ID parameter",
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
  zValidator("json", FinishTestAttemptRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Validation failed",
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
  finishTestAttemptHandler
);

// ==================== UTILITY ROUTES ====================

// Get Attempt Status Labels (for frontend)
attemptRoutes.get(
  "/utils/status-options",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const { ATTEMPT_STATUS_LABELS, ATTEMPT_STATUS_COLORS } = await import(
        "shared-types"
      );

      const response = {
        success: true,
        message: "Attempt status options retrieved successfully",
        data: {
          statuses: Object.entries(ATTEMPT_STATUS_LABELS).map(
            ([value, label]) => ({
              value,
              label,
              color:
                ATTEMPT_STATUS_COLORS[
                  value as keyof typeof ATTEMPT_STATUS_COLORS
                ],
            })
          ),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting attempt status options:", error);
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Failed to retrieve status options",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Attempt Statistics (Admin only)
attemptRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const { getDbFromEnv, testAttempts } = await import("@/db");
      const { count, sql } = await import("drizzle-orm");

      const db = getDbFromEnv(c.env);

      // Get basic statistics
      const [totalAttempts] = await db
        .select({ count: count() })
        .from(testAttempts);

      const [statusStats] = await db
        .select({
          started: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'started' THEN 1 END)`,
          in_progress: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'in_progress' THEN 1 END)`,
          completed: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
          abandoned: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'abandoned' THEN 1 END)`,
          expired: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'expired' THEN 1 END)`,
        })
        .from(testAttempts);

      const [timeStats] = await db
        .select({
          avg_time_spent: sql<number>`AVG(${testAttempts.time_spent})`,
          total_time_spent: sql<number>`SUM(${testAttempts.time_spent})`,
        })
        .from(testAttempts)
        .where(sql`${testAttempts.time_spent} IS NOT NULL`);

      const stats = {
        total_attempts: totalAttempts.count,
        by_status: {
          started: Number(statusStats.started) || 0,
          in_progress: Number(statusStats.in_progress) || 0,
          completed: Number(statusStats.completed) || 0,
          abandoned: Number(statusStats.abandoned) || 0,
          expired: Number(statusStats.expired) || 0,
        },
        completion_rate:
          totalAttempts.count > 0
            ? Math.round(
                (Number(statusStats.completed) / totalAttempts.count) * 100
              )
            : 0,
        average_time_spent_minutes: timeStats.avg_time_spent
          ? Math.round(Number(timeStats.avg_time_spent) / 60)
          : 0,
        total_time_spent_hours: timeStats.total_time_spent
          ? Math.round(Number(timeStats.total_time_spent) / 3600)
          : 0,
      };

      const response = {
        success: true,
        message: "Attempt statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting attempt statistics:", error);
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Failed to retrieve attempt statistics",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== ERROR HANDLERS ====================
attemptRoutes.onError((err, c) => {
  console.error("Test attempt routes error:", err);

  const errorResponse: AttemptErrorResponse = {
    success: false,
    message: "Test attempt route error",
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

export { attemptRoutes };
