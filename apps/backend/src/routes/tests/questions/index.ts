import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  CreateQuestionRequestSchema,
  CreateQuestionByTestIdRequestSchema,
  GetQuestionsRequestSchema,
  GetQuestionsByTestIdRequestSchema,
  GetQuestionByIdRequestSchema,
  UpdateQuestionRequestSchema,
  UpdateQuestionByIdRequestSchema,
  DeleteQuestionByIdRequestSchema,
  BulkCreateQuestionsRequestSchema,
  ReorderQuestionsRequestSchema,
  UpdateQuestionSequenceRequestSchema,
  UpdateQuestionSequenceByIdRequestSchema,
  type QuestionErrorResponse,
} from "shared-types";
import { createQuestionHandler } from "./question.create";
import { getQuestionsListHandler } from "./question.list";
import { getQuestionByIdHandler } from "./question.get";
import { updateQuestionHandler } from "./question.update";
import { deleteQuestionHandler } from "./question.delete";
import { getQuestionStatsHandler } from "./question.stats";
import { bulkCreateQuestionsHandler } from "./question.bulk-create";
import { reorderQuestionsHandler } from "./question.reorder";
import { updateQuestionSequenceHandler } from "./question.sequence";
import { authenticateUser, requireAdmin } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const questionRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== STATISTICS ROUTES (Admin only) ====================

// Get Question Statistics for a Test
questionRoutes.get(
  "/stats",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetQuestionsByTestIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
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
  getQuestionStatsHandler
);

// ==================== UTILITY ROUTES (Admin only) ====================

// Get Question Type Options (for frontend dropdowns)
questionRoutes.get(
  "/types",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      // Import here to avoid circular dependencies
      const { QUESTION_TYPE_LABELS, QUESTION_TYPE_DESCRIPTIONS } = await import(
        "shared-types"
      );

      const questionTypeOptions = {
        success: true,
        message: "Question type options retrieved successfully",
        data: Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
          description:
            QUESTION_TYPE_DESCRIPTIONS[
              value as keyof typeof QUESTION_TYPE_DESCRIPTIONS
            ],
        })),
        timestamp: new Date().toISOString(),
      };

      return c.json(questionTypeOptions, 200);
    } catch (error) {
      console.error("Error getting question type options:", error);
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Failed to retrieve question type options",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== BULK OPERATIONS ROUTES (Admin only) ====================

// Bulk Create Questions
questionRoutes.post(
  "/bulk",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetQuestionsByTestIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
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
  zValidator("json", BulkCreateQuestionsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  bulkCreateQuestionsHandler
);

// Reorder Questions
questionRoutes.put(
  "/reorder",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetQuestionsByTestIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
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
  zValidator("json", ReorderQuestionsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  reorderQuestionsHandler
);

// ==================== BASIC CRUD ROUTES ====================

// Get All Questions for a Test (ADMIN ONLY)
questionRoutes.get(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetQuestionsByTestIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
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
  zValidator("query", GetQuestionsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  getQuestionsListHandler
);

// Create Question (Admin only)
questionRoutes.post(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", CreateQuestionByTestIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
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
  zValidator("json", CreateQuestionRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  createQuestionHandler
);

// Get Single Question (ADMIN ONLY)
questionRoutes.get(
  "/:questionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetQuestionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid question or test ID parameter",
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
  getQuestionByIdHandler
);

// Update Question (Admin only)
questionRoutes.put(
  "/:questionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateQuestionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid question or test ID parameter",
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
  zValidator("json", UpdateQuestionRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  updateQuestionHandler
);

// ==================== SEQUENCE UPDATE ROUTE (Admin only) ====================

// Update Question Sequence (Admin only)
questionRoutes.put(
  "/:questionId/sequence",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateQuestionSequenceByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid question or test ID parameter",
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
  zValidator("json", UpdateQuestionSequenceRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
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
  updateQuestionSequenceHandler
);

// Delete Question (Admin only)
questionRoutes.delete(
  "/:questionId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", DeleteQuestionByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid question or test ID parameter",
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
  deleteQuestionHandler
);

// ==================== ERROR HANDLERS ====================
questionRoutes.onError((err, c) => {
  console.error("Question routes error:", err);

  const errorResponse: QuestionErrorResponse = {
    success: false,
    message: "Question route error",
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

export { questionRoutes };
