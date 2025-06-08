import { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../db";
import { getEnv, type CloudflareBindings } from "../lib/env";
import {
  verifyToken,
  validateSession,
  updateSessionLastUsed,
  toAuthUserData,
} from "../lib/auth";
import { type ErrorResponse, type AuthUserData } from "shared-types";

// Extend Hono context to include auth
declare module "hono" {
  interface ContextVariableMap {
    auth: {
      user: AuthUserData;
      sessionId: string;
    };
  }
}

/**
 * Middleware to authenticate user via JWT token
 * Sets auth context if valid, otherwise returns 401
 */
export async function authenticateUser(
  c: Context<{ Bindings: CloudflareBindings }>,
  next: Next
) {
  try {
    // Check if database is configured
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "Authentication service unavailable",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get Authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authorization",
            message: "Bearer token is required",
            code: "MISSING_TOKEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer "
    if (!token) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid token format",
        errors: [
          {
            field: "authorization",
            message: "Token cannot be empty",
            code: "EMPTY_TOKEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Get environment and database
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Verify JWT token
    let decodedToken;
    try {
      decodedToken = verifyToken(token, env.JWT_SECRET || "dev-secret-key");
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid or expired token",
        errors: [
          {
            field: "authorization",
            message: "Token verification failed",
            code: "INVALID_TOKEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Validate session if session_id is present
    if (decodedToken.session_id) {
      const isValidSession = await validateSession(db, decodedToken.session_id);
      if (!isValidSession) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Session expired or invalid",
          errors: [
            {
              field: "session",
              message: "Please login again",
              code: "SESSION_EXPIRED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 401);
      }

      // Update session last used (non-blocking)
      updateSessionLastUsed(db, decodedToken.session_id).catch((error) => {
        console.warn("Failed to update session last used:", error);
      });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decodedToken.sub))
      .limit(1);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "user",
            message: "User associated with token does not exist",
            code: "USER_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Check if user is active
    if (!user.is_active) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Account is deactivated",
        errors: [
          {
            field: "user",
            message: "Your account has been deactivated",
            code: "ACCOUNT_DEACTIVATED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Set auth context
    c.set("auth", {
      user: toAuthUserData(user),
      sessionId: decodedToken.session_id || "",
    });

    await next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Authentication failed",
      errors: [
        {
          message: "Internal authentication error",
          code: "AUTH_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 500);
  }
}

/**
 * Optional authentication middleware
 * Sets auth context if valid token is provided, but doesn't fail if no token
 */
export async function optionalAuth(
  c: Context<{ Bindings: CloudflareBindings }>,
  next: Next
) {
  try {
    // Check if database is configured
    if (!isDatabaseConfigured(c.env)) {
      await next();
      return;
    }

    // Get Authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await next();
      return;
    }

    // Extract token
    const token = authHeader.substring(7);
    if (!token) {
      await next();
      return;
    }

    // Get environment and database
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Verify JWT token
    let decodedToken;
    try {
      decodedToken = verifyToken(token, env.JWT_SECRET || "dev-secret-key");
    } catch (error) {
      // Invalid token, but continue without auth
      await next();
      return;
    }

    // Validate session if session_id is present
    if (decodedToken.session_id) {
      const isValidSession = await validateSession(db, decodedToken.session_id);
      if (!isValidSession) {
        await next();
        return;
      }

      // Update session last used (non-blocking)
      updateSessionLastUsed(db, decodedToken.session_id).catch((error) => {
        console.warn("Failed to update session last used:", error);
      });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decodedToken.sub))
      .limit(1);

    if (!user || !user.is_active) {
      await next();
      return;
    }

    // Set auth context
    c.set("auth", {
      user: toAuthUserData(user),
      sessionId: decodedToken.session_id || "",
    });

    await next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    // Continue without auth on error
    await next();
  }
}

/**
 * Middleware to require admin role
 * Must be used after authenticateUser
 */
export function requireAdmin(
  c: Context<{ Bindings: CloudflareBindings }>,
  next: Next
) {
  const auth = c.get("auth");

  if (!auth) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Authentication required",
      errors: [
        {
          field: "authorization",
          message: "You must be authenticated to access this resource",
          code: "AUTHENTICATION_REQUIRED",
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 401);
  }

  if (auth.user.role !== "admin") {
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Access denied",
      errors: [
        {
          field: "authorization",
          message: "Admin privileges required",
          code: "INSUFFICIENT_PRIVILEGES",
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 403);
  }

  return next();
}

/**
 * Middleware to require specific roles
 * Must be used after authenticateUser
 */
export function requireRole(...allowedRoles: ("admin" | "participant")[]) {
  return (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const auth = c.get("auth");

    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authorization",
            message: "You must be authenticated to access this resource",
            code: "AUTHENTICATION_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    if (!allowedRoles.includes(auth.user.role)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: `Required role: ${allowedRoles.join(" or ")}`,
            code: "INSUFFICIENT_PRIVILEGES",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    return next();
  };
}

/**
 * Middleware to allow user to access their own data or admin to access any data
 * Must be used after authenticateUser
 */
export function requireOwnershipOrAdmin(userIdParam: string = "userId") {
  return (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const auth = c.get("auth");

    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authorization",
            message: "You must be authenticated to access this resource",
            code: "AUTHENTICATION_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const targetUserId = c.req.param(userIdParam);
    const currentUserId = auth.user.id;
    const isAdmin = auth.user.role === "admin";

    // Admin can access any resource, users can only access their own
    if (!isAdmin && targetUserId !== currentUserId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "You can only access your own data",
            code: "INSUFFICIENT_PRIVILEGES",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    return next();
  };
}

/**
 * Middleware to ensure the authenticated user is a participant
 * This should be used after authenticateUser middleware
 */
export async function requireParticipant(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>,
  next: Next
) {
  const auth = c.get("auth");

  if (!auth.user) {
    return c.json(
      {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "auth",
            message: "User must be authenticated",
            code: "UNAUTHORIZED",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      401
    );
  }

  if (auth.user.role !== "participant") {
    return c.json(
      {
        success: false,
        message: "Participant access required",
        errors: [
          {
            field: "user_role",
            message: "Only participants can access this resource",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      403
    );
  }

  await next();
}
