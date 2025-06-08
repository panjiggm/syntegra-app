import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetUsersRequestSchema,
  GetUserByIdRequestSchema,
  UpdateUserRequestSchema,
  UpdateUserByIdRequestSchema,
  DeleteUserByIdRequestSchema,
  CSVUploadRequestSchema,
  BulkCreateUsersRequestSchema,
  type ErrorResponse,
  z,
} from "shared-types";
import { createUserHandler } from "./user.create";
import { getUsersListHandler } from "./user.list";
import { getUserByIdHandler } from "./user.get";
import { updateUserHandler } from "./user.update";
import { deleteUserHandler } from "./user.delete";
import { getUserSchemaHandler } from "./user.schema";
import { getAdminStatusHandler } from "./user.status";
import { getUserDetailHandler } from "./user.detail";
import {
  authenticateUser,
  requireAdmin,
  requireRole,
  optionalAuth,
} from "@/middleware/auth";
import { validateCreateUser } from "@/lib/middleware/validateCreateUser";
import {
  validateSyntegraCSVHandler,
  createUsersFromCSVHandler,
} from "./user.bulk.csv";
import {
  userRegistrationRateLimit,
  generalApiRateLimit,
} from "@/middleware/rateLimiter";

const userRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PUBLIC ROUTES ====================

// Get User Schema Endpoint (public untuk dokumentasi)
userRoutes.get(
  "/schema",
  generalApiRateLimit, // General rate limiting
  getUserSchemaHandler
);

// Get Admin Status Endpoint (public untuk bootstrap check)
userRoutes.get(
  "/admin-status",
  generalApiRateLimit, // General rate limiting
  getAdminStatusHandler
);

// Create User Endpoint (PUBLIC - untuk self-registration participant & admin creation)
userRoutes.post(
  "/",
  userRegistrationRateLimit, // 5 registrations per hour per IP
  optionalAuth, // Optional auth to detect if admin is creating user
  validateCreateUser, // Custom validation middleware
  createUserHandler
);

// ==================== PROTECTED ROUTES ====================

// Get All Users Endpoint (ADMIN ONLY - Participants NOT allowed)
userRoutes.get(
  "/",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireAdmin, // Second: Verify user is admin (participants will get 403 Forbidden)
  zValidator("query", GetUsersRequestSchema, (result, c) => {
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
  getUsersListHandler
);

// ==================== INDIVIDUAL USER ROUTES ====================

// Get Single User (Admin can access any user, participants can only access their own)
userRoutes.get(
  "/:userId",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireRole("admin", "participant"), // Both roles can access but with restrictions
  zValidator("param", GetUserByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  getUserByIdHandler
);

// Get User Detail (Admin can access any user, participants can only access their own)
userRoutes.get(
  "/:userId/details",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireAdmin, // Only admin can access user details
  zValidator("param", GetUserByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  getUserDetailHandler
);

// Update User (Admin can update any user, participants can only update their own)
userRoutes.put(
  "/:userId",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireRole("admin", "participant"), // Both roles can access but with restrictions
  zValidator("param", UpdateUserByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  zValidator("json", UpdateUserRequestSchema, (result, c) => {
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
  updateUserHandler
);

// Delete User (Admin only) - SOFT DELETE IMPLEMENTATION
userRoutes.delete(
  "/:userId",
  generalApiRateLimit, // General rate limiting
  authenticateUser,
  requireAdmin, // Only admin can delete users
  zValidator("param", DeleteUserByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
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
  deleteUserHandler
);

// ==================== BULK OPERATIONS (Admin only) ====================

// Bulk Validate CSV (Syntegra format)
userRoutes.post(
  "/bulk/validate-csv",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CSVUploadRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "CSV validation failed",
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
  validateSyntegraCSVHandler
);

// Bulk Create Users from CSV (Syntegra format)
userRoutes.post(
  "/bulk/csv",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CSVUploadRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "CSV validation failed",
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
  createUsersFromCSVHandler
);

// ==================== JSON BULK OPERATIONS ====================

// Bulk Create Users from JSON
userRoutes.post(
  "/bulk/json",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", BulkCreateUsersRequestSchema, (result, c) => {
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
  async (c) => {
    // Placeholder implementation for JSON bulk import
    return c.json(
      {
        success: false,
        message: "JSON bulk import not implemented yet",
        timestamp: new Date().toISOString(),
      },
      501
    );
  }
);

// ==================== USER STATISTICS (Admin only) ====================

// Get User Statistics
userRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c, next) => {
    // Implementation untuk user statistics akan dibuat terpisah
    return c.json(
      {
        success: false,
        message: "User statistics not implemented yet",
        timestamp: new Date().toISOString(),
      },
      501
    );
  }
);

// ==================== ERROR HANDLERS ====================
userRoutes.onError((err, c) => {
  console.error("User routes error:", err);

  const errorResponse: ErrorResponse = {
    success: false,
    message: "User route error",
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

export { userRoutes };
