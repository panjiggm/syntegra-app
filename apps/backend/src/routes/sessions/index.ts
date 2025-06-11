import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "../../lib/env";
import {
  CreateSessionRequestSchema,
  GetSessionsRequestSchema,
  GetSessionByIdRequestSchema,
  GetSessionByCodeRequestSchema,
  UpdateSessionRequestSchema,
  UpdateSessionByIdRequestSchema,
  DeleteSessionByIdRequestSchema,
  type SessionErrorResponse,
} from "shared-types";
import { createSessionHandler } from "./session.create";
import { getSessionByCodeHandler } from "./session.get-by-code";
import { getSessionsListHandler } from "./session.list";
import { getSessionByIdHandler } from "./session.get";
import { getSessionStatsHandler } from "./session.stats";
import { updateSessionHandler } from "./session.update";
import { deleteSessionHandler } from "./session.delete";
import { checkParticipantHandler } from "./session.check-participant";
import { authenticateUser, requireAdmin } from "../../middleware/auth";
import { generalApiRateLimit } from "../../middleware/rateLimiter";
import { participantRoutes } from "./participants";
import { liveTestRoutes } from "./live-test";

const sessionRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PARTICIPANT ROUTES ====================
// Mount participant routes under /:sessionId/participants
sessionRoutes.route("/:sessionId/participants", participantRoutes);

// ==================== LIVE TEST MONITORING ROUTES ====================
// Mount live test routes under /:sessionId/live-test
sessionRoutes.route("/:sessionId/live-test", liveTestRoutes);

// ==================== PUBLIC ROUTES (No Authentication) ====================

// Get Session by Code (for participants to access psikotes)
sessionRoutes.get(
  "/public/:sessionCode",
  generalApiRateLimit,
  zValidator("param", GetSessionByCodeRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Invalid session code parameter",
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
  getSessionByCodeHandler
);

// Check Participant in Session (public endpoint)
sessionRoutes.post(
  "/check-participant",
  generalApiRateLimit,
  checkParticipantHandler
);

// ==================== STATISTICS ROUTES (Admin only) ====================

// Get Session Statistics
sessionRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  getSessionStatsHandler
);

// ==================== SCHEDULER ROUTES (Admin only) ====================

// Manual trigger for session status updates (admin only)
sessionRoutes.post(
  "/scheduler/trigger-status-update",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      console.log("🔄 Manual session status update triggered by admin");

      const { runScheduledJobs } = await import("@/lib/scheduler");
      const results = await runScheduledJobs(c.env);

      const response = {
        success: true,
        message: "Session status update completed successfully",
        data: {
          execution_time: new Date().toISOString(),
          jobs_executed: {
            session_expiry: results.session_expiry,
            session_activation: results.session_activation,
          },
          summary: {
            total_expired: results.session_expiry.expired_count || 0,
            total_activated: results.session_activation.activated_count || 0,
            all_successful:
              results.session_expiry.success &&
              results.session_activation.success,
          },
        },
        timestamp: new Date().toISOString(),
      };

      console.log(
        "✅ Manual session status update completed:",
        response.data.summary
      );
      return c.json(response, 200);
    } catch (error) {
      console.error("❌ Manual session status update failed:", error);

      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to execute session status update",
        errors: [
          {
            field: "scheduler",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
            code: "SCHEDULER_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };

      return c.json(errorResponse, 500);
    }
  }
);

// Get scheduler status and statistics (admin only)
sessionRoutes.get(
  "/scheduler/status",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      // Get current time and environment info
      const now = new Date();
      const env = c.env;

      // Basic scheduler info
      const schedulerInfo = {
        success: true,
        message: "Scheduler status retrieved successfully",
        data: {
          current_time: now.toISOString(),
          environment: env.NODE_ENV || "development",
          scheduler_enabled: true,
          cron_pattern: "* * * * *", // Every minute
          jobs: [
            {
              name: "session_expiry_job",
              description:
                "Updates active sessions to expired when end_time is reached",
              enabled: true,
              last_execution: "Managed by Cloudflare Cron Triggers",
            },
            {
              name: "session_activation_job",
              description:
                "Auto-activates draft sessions when start_time is reached",
              enabled: true,
              last_execution: "Managed by Cloudflare Cron Triggers",
            },
          ],
          manual_trigger_endpoint:
            "/api/v1/sessions/scheduler/trigger-status-update",
          notes: [
            "In development: Jobs run every 3 minutes automatically",
            "In production: Jobs run every minute via Cloudflare Cron Triggers",
            "Use manual trigger endpoint for immediate execution",
          ],
        },
        timestamp: now.toISOString(),
      };

      return c.json(schedulerInfo, 200);
    } catch (error) {
      console.error("Error getting scheduler status:", error);

      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to get scheduler status",
        timestamp: new Date().toISOString(),
      };

      return c.json(errorResponse, 500);
    }
  }
);

// ==================== UTILITY ROUTES (Admin only) ====================

// Get Session Filter Options (for frontend dropdowns)
sessionRoutes.get(
  "/filters/options",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      // Import here to avoid circular dependencies
      const {
        SESSION_STATUS_LABELS,
        COMMON_TARGET_POSITIONS,
        SESSION_DURATION_PRESETS,
      } = await import("shared-types");

      const filterOptions = {
        success: true,
        message: "Session filter options retrieved successfully",
        data: {
          statuses: Object.entries(SESSION_STATUS_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          target_positions: COMMON_TARGET_POSITIONS.map((position) => ({
            value: position,
            label: position,
          })),
          duration_presets: SESSION_DURATION_PRESETS,
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(filterOptions, 200);
    } catch (error) {
      console.error("Error getting session filter options:", error);
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Failed to retrieve filter options",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== SESSION MANAGEMENT ROUTES (Admin only) ====================

// Get All Sessions Endpoint (ADMIN ONLY)
sessionRoutes.get(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("query", GetSessionsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  getSessionsListHandler
);

// Create Session (Admin only)
sessionRoutes.post(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CreateSessionRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  createSessionHandler
);

// Get Single Session (ADMIN ONLY)
sessionRoutes.get(
  "/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  getSessionByIdHandler
);

// Update Session (Admin only)
sessionRoutes.put(
  "/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  zValidator("json", UpdateSessionRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  updateSessionHandler
);

// Delete Session (Admin only)
sessionRoutes.delete(
  "/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", DeleteSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  deleteSessionHandler
);

// ==================== SESSION STATUS MANAGEMENT (Admin only) ====================

// Activate Session
sessionRoutes.post(
  "/:sessionId/activate",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Activate session not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// Cancel Session
sessionRoutes.post(
  "/:sessionId/cancel",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Cancel session not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// Complete Session
sessionRoutes.post(
  "/:sessionId/complete",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Complete session not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// ==================== SESSION PARTICIPANTS MANAGEMENT (Admin only) ====================

// Get Session Participants
sessionRoutes.get(
  "/:sessionId/participants",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Get session participants not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// Add Participant to Session
sessionRoutes.post(
  "/:sessionId/participants",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetSessionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: SessionErrorResponse = {
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
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Add participant to session not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// Remove Participant from Session
sessionRoutes.delete(
  "/:sessionId/participants/:participantId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Remove participant from session not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// Manual trigger for session status updates (admin only)
sessionRoutes.post(
  "/trigger-status-update",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    const { runScheduledJobs } = await import("../../lib/scheduler");
    await runScheduledJobs(c.env);

    return c.json({
      success: true,
      message: "Session status update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  }
);

// ==================== ERROR HANDLERS ====================
sessionRoutes.onError((err, c) => {
  console.error("Session routes error:", err);

  const errorResponse: SessionErrorResponse = {
    success: false,
    message: "Session route error",
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

export { sessionRoutes };
