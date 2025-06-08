import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  AdminLoginRequestSchema,
  ParticipantLoginRequestSchema,
  RefreshTokenRequestSchema,
  ChangePasswordRequestSchema,
  LogoutRequestSchema,
  type ErrorResponse,
  z,
} from "shared-types";
import {
  adminLoginHandler,
  participantLoginHandler,
  refreshTokenHandler,
  logoutHandler,
  getProfileHandler,
  changePasswordHandler,
  getActiveSessionsHandler,
  revokeSessionHandler,
  revokeAllOtherSessionsHandler,
} from "./auth.handlers";
import { authenticateUser, requireAdmin } from "@/middleware/auth";
import {
  loginRateLimit,
  generalApiRateLimit,
  passwordChangeRateLimit,
} from "@/middleware/rateLimiter";

const authRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Admin Login Endpoint
authRoutes.post(
  "/admin/login",
  // loginRateLimit,
  zValidator("json", AdminLoginRequestSchema, (result, c) => {
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
  adminLoginHandler
);

// Participant Login Endpoint
authRoutes.post(
  "/participant/login",
  loginRateLimit,
  zValidator("json", ParticipantLoginRequestSchema, (result, c) => {
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
  participantLoginHandler
);

// Refresh Token Endpoint
authRoutes.post(
  "/refresh",
  generalApiRateLimit,
  zValidator("json", RefreshTokenRequestSchema, (result, c) => {
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
  refreshTokenHandler
);

// ==================== PROTECTED ROUTES (AUTH REQUIRED) ====================

// Get Current User Profile
authRoutes.get("/me", generalApiRateLimit, authenticateUser, getProfileHandler);

// Logout (current session)
authRoutes.post(
  "/logout",
  generalApiRateLimit,
  authenticateUser,
  zValidator("json", LogoutRequestSchema.optional(), (result, c) => {
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
  logoutHandler
);

// ==================== SESSION MANAGEMENT ROUTES ====================

// Get Active Sessions
authRoutes.get(
  "/sessions",
  generalApiRateLimit,
  authenticateUser,
  getActiveSessionsHandler
);

// Revoke Specific Session
authRoutes.delete(
  "/sessions/:sessionId",
  generalApiRateLimit,
  authenticateUser,
  zValidator(
    "param",
    z.object({ sessionId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Invalid session ID",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }
  ),
  async (c) => {
    // Extract sessionId from params and call handler
    const { sessionId } = c.req.param();
    (c.req as any).json = async () => ({ sessionId }); // Mock the json method
    return revokeSessionHandler(c);
  }
);

// Revoke All Other Sessions
authRoutes.post(
  "/sessions/revoke-others",
  generalApiRateLimit,
  authenticateUser,
  revokeAllOtherSessionsHandler
);

// ==================== ADMIN ONLY ROUTES ====================

// Change Password (Admin only)
authRoutes.put(
  "/change-password",
  passwordChangeRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", ChangePasswordRequestSchema, (result, c) => {
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
  changePasswordHandler
);

// ==================== UTILITY ROUTES ====================

// Health check for auth service
authRoutes.get("/health", (c) => {
  return c.json({
    success: true,
    message: "Authentication service is healthy",
    timestamp: new Date().toISOString(),
    endpoints: {
      admin_login: "POST /auth/admin/login",
      participant_login: "POST /auth/participant/login",
      refresh_token: "POST /auth/refresh",
      profile: "GET /auth/me",
      logout: "POST /auth/logout",
      change_password: "PUT /auth/change-password",
      // Session management endpoints
      get_sessions: "GET /auth/sessions",
      revoke_session: "DELETE /auth/sessions/:sessionId",
      revoke_other_sessions: "POST /auth/sessions/revoke-others",
    },
    features: {
      session_management: true,
      auto_refresh: true,
      session_limits: true,
    },
    rate_limits: {
      login: "10 attempts per 15 minutes",
      password_change: "3 changes per hour",
      general_api: "100 requests per 15 minutes",
    },
  });
});

// ==================== ERROR HANDLERS ====================
authRoutes.onError((err, c) => {
  console.error("Auth routes error:", err);

  const errorResponse: ErrorResponse = {
    success: false,
    message: "Authentication error",
    ...(c.env.NODE_ENV === "development" && {
      errors: [
        {
          message: err.message,
          code: "AUTH_ROUTE_ERROR",
        },
      ],
    }),
    timestamp: new Date().toISOString(),
  };

  return c.json(errorResponse, 500);
});

export { authRoutes };
