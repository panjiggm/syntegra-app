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
import { authenticateUser, requireAdmin } from "../../middleware/auth";
import { generalApiRateLimit } from "../../middleware/rateLimiter";
import { participantRoutes } from "./participants";

const sessionRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PARTICIPANT ROUTES ====================
// Mount participant routes under /:sessionId/participants
sessionRoutes.route("/:sessionId/participants", participantRoutes);

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

// ==================== STATISTICS ROUTES (Admin only) ====================

// Get Session Statistics
sessionRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  getSessionStatsHandler
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
