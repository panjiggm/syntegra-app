import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  AddParticipantToSessionByIdRequestSchema,
  AddParticipantToSessionRequestSchema,
  BulkAddParticipantsToSessionRequestSchema,
  GetSessionByIdRequestSchema,
  GetSessionParticipantsRequestSchema,
  RemoveParticipantFromSessionRequestSchema,
  SessionErrorResponse,
  UpdateParticipantStatusRequestSchema,
} from "shared-types";
import { addParticipantToSessionHandler } from "./participant.add";
import { bulkAddParticipantsToSessionHandler } from "./participant.bulk";
import { getSessionParticipantsHandler } from "./participant.get";
import { removeParticipantFromSessionHandler } from "./participant.remove";
import { updateParticipantStatusHandler } from "./participant.update";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import { authenticateUser, requireAdmin } from "@/middleware/auth";

const participantRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PARTICIPANT ROUTES ====================

// Get Session Participants List
participantRoutes.get(
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
  zValidator("query", GetSessionParticipantsRequestSchema, (result, c) => {
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
  getSessionParticipantsHandler
);

// Add Single Participant to Session
participantRoutes.post(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", AddParticipantToSessionByIdRequestSchema, (result, c) => {
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
  zValidator("json", AddParticipantToSessionRequestSchema, (result, c) => {
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
  addParticipantToSessionHandler
);

// Bulk Add Participants to Session
participantRoutes.post(
  "/bulk",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", AddParticipantToSessionByIdRequestSchema, (result, c) => {
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
  zValidator("json", BulkAddParticipantsToSessionRequestSchema, (result, c) => {
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
  bulkAddParticipantsToSessionHandler
);

// Update Participant Status
participantRoutes.put(
  "/:participantId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator(
    "param",
    RemoveParticipantFromSessionRequestSchema,
    (result, c) => {
      if (!result.success) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid session ID or participant ID parameter",
          errors: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }
  ),
  zValidator("json", UpdateParticipantStatusRequestSchema, (result, c) => {
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
  updateParticipantStatusHandler
);

// Remove Participant from Session
participantRoutes.delete(
  "/:participantId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator(
    "param",
    RemoveParticipantFromSessionRequestSchema,
    (result, c) => {
      if (!result.success) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid session ID or participant ID parameter",
          errors: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }
  ),
  removeParticipantFromSessionHandler
);

export { participantRoutes };
