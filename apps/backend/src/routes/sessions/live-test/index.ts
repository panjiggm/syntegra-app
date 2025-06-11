import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetSessionByIdRequestSchema,
  type SessionErrorResponse,
} from "shared-types";
import { getLiveTestDataHandler } from "./live-test.get";
import { getLiveTestParticipantsHandler } from "./live-test-participants.get";
import { getLiveTestStatsHandler } from "./live-test-stats.get";
import { getLiveTestEventsHandler } from "./live-test-events.get";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import { authenticateUser, requireAdmin } from "@/middleware/auth";

const liveTestRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== LIVE TEST MONITORING ROUTES ====================

// Get Live Test Data (comprehensive overview)
liveTestRoutes.get(
  "/",
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
  getLiveTestDataHandler
);

// Get Live Test Participants Progress
liveTestRoutes.get(
  "/participants",
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
  getLiveTestParticipantsHandler
);

// Get Live Test Statistics
liveTestRoutes.get(
  "/stats",
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
  getLiveTestStatsHandler
);

// Get Live Test Events (for real-time updates)
liveTestRoutes.get(
  "/events",
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
  getLiveTestEventsHandler
);

export { liveTestRoutes };
