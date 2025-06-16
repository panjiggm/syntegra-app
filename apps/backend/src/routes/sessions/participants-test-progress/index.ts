import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  GetParticipantTestProgressRequestSchema,
  GetTestProgressRequestSchema,
  StartTestRequestSchema,
  UpdateTestProgressRequestSchema,
  CompleteTestRequestSchema,
  type ParticipantTestProgressErrorResponse,
} from "shared-types";
import { authenticateUser } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import type { CloudflareBindings } from "@/lib/env";

// Import handlers
import { getParticipantTestProgressHandler } from "./get-progress";
import { getTestProgressHandler } from "./get-test-progress";
import { startTestHandler } from "./start-test";
import { updateTestProgressHandler } from "./update-progress";
import { completeTestHandler } from "./complete-test";

const participantTestProgressRoutes = new Hono<{
  Bindings: CloudflareBindings;
}>();

// Get all test progress for a participant in a session
// GET /sessions/:sessionId/participants-test-progress/:participantId/test-progress
participantTestProgressRoutes.get(
  "/:participantId/test-progress",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetParticipantTestProgressRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
        success: false,
        message: "Invalid parameters",
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
  getParticipantTestProgressHandler
);

// Get specific test progress for a participant
// GET /sessions/:sessionId/participants-test-progress/:participantId/test-progress/:testId
participantTestProgressRoutes.get(
  "/:participantId/test-progress/:testId",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetTestProgressRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
        success: false,
        message: "Invalid parameters",
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
  getTestProgressHandler
);

// Start a test for a participant
// POST /sessions/:sessionId/participants-test-progress/:participantId/test-progress/:testId/start
participantTestProgressRoutes.post(
  "/:participantId/test-progress/:testId/start",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", StartTestRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
        success: false,
        message: "Invalid parameters",
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
  startTestHandler
);

// Update test progress (answered questions, time tracking)
// PUT /sessions/:sessionId/participants-test-progress/:participantId/test-progress/:testId
participantTestProgressRoutes.put(
  "/:participantId/test-progress/:testId",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", UpdateTestProgressRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
        success: false,
        message: "Invalid parameters",
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
  updateTestProgressHandler
);

// Complete a test for a participant
// POST /sessions/:sessionId/participants-test-progress/:participantId/test-progress/:testId/complete
participantTestProgressRoutes.post(
  "/:participantId/test-progress/:testId/complete",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", CompleteTestRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ParticipantTestProgressErrorResponse = {
        success: false,
        message: "Invalid parameters",
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
  completeTestHandler
);

export { participantTestProgressRoutes };
