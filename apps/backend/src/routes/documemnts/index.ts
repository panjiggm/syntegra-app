import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import { type ErrorResponse } from "shared-types";
import { createDocumentTypeHandler, CreateDocumentTypeRequestSchema } from "./document.type-create";
import { 
  updateDocumentTypeHandler, 
  UpdateDocumentTypeRequestSchema,
  UpdateDocumentTypeByIdRequestSchema 
} from "./document.type-update";
import {
  deleteDocumentTypeHandler,
  DeleteDocumentTypeByIdRequestSchema
} from "./document.type-delete";
import {
  listDocumentTypesHandler,
  GetDocumentTypesRequestSchema
} from "./document.type-list";
import {
  authenticateUser,
  requireAdmin,
  requireRole,
} from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const documentRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== DOCUMENT TYPE ROUTES ====================

// List Document Types (ADMIN & PARTICIPANT)
documentRoutes.get(
  "/types",
  generalApiRateLimit,
  authenticateUser,
  requireRole("admin", "participant"),
  zValidator("query", GetDocumentTypesRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  listDocumentTypesHandler
);

// Create Document Type (ADMIN ONLY)
documentRoutes.post(
  "/types",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CreateDocumentTypeRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  createDocumentTypeHandler
);

// Update Document Type (ADMIN ONLY)
documentRoutes.put(
  "/types/:typeId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateDocumentTypeByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid document type ID parameter",
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
  zValidator("json", UpdateDocumentTypeRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  updateDocumentTypeHandler
);

// Delete Document Type (ADMIN ONLY)
documentRoutes.delete(
  "/types/:typeId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", DeleteDocumentTypeByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid document type ID parameter",
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
  deleteDocumentTypeHandler
);

// ==================== ERROR HANDLERS ====================
documentRoutes.onError((err, c) => {
  console.error("Document routes error:", err);

  const errorResponse: ErrorResponse = {
    success: false,
    message: "Document route error",
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

export { documentRoutes };