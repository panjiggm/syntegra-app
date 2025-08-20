import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import { 
  GetUserByIdRequestSchema,
  type ErrorResponse,
  z,
} from "shared-types";
import { getAdministrationListHandler } from "./administration.list";
import { getAdministrationDetailHandler } from "./administration.detail";
import {
  authenticateUser,
  requireAdmin,
} from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const administrationRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PROTECTED ROUTES (Admin only) ====================

// Get Administration List - Shows all participants with document counts
administrationRoutes.get(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin, // Only admin can view administration data
  getAdministrationListHandler
);

// Get Administration Detail for specific user - Shows document types and upload status
administrationRoutes.get(
  "/:userId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin, // Only admin can view user administration details
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
  getAdministrationDetailHandler
);

// ==================== ERROR HANDLERS ====================
administrationRoutes.onError((err, c) => {
  console.error("Administration routes error:", err);

  const errorResponse: ErrorResponse = {
    success: false,
    message: "Administration route error",
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

export { administrationRoutes };