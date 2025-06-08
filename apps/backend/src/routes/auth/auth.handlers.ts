import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  authSessions,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  hashPassword,
  verifyPassword,
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  createAuthSession,
  deleteAuthSession,
  deleteAllUserSessions,
  incrementLoginAttempts,
  resetLoginAttempts,
  lockUserAccount,
  isAccountLocked,
  toAuthUserData,
  parseIdentifier,
} from "../../lib/auth";
import {
  type AdminLoginRequest,
  type ParticipantLoginRequest,
  type RefreshTokenRequest,
  type ChangePasswordRequest,
  type LogoutRequest,
  type LoginResponse,
  type RefreshTokenResponse,
  type ProfileResponse,
  type AuthSuccessResponse,
  type ErrorResponse,
  type AuthTokens,
  AUTH_CONSTANTS,
  AUTH_ERROR_CODES,
  SessionManagementResponse,
} from "shared-types";
import { createSessionManager } from "@/lib/sessionManager";

// ==================== ADMIN LOGIN ====================

export async function adminLoginHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const data = (await c.req.json()) as AdminLoginRequest;
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    console.log("data Admin Login : ", data);

    if (!env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Parse identifier (NIK atau email)
    let identifierCondition;
    try {
      const { type, value } = parseIdentifier(data.identifier);
      identifierCondition =
        type === "email" ? eq(users.email, value) : eq(users.nik, value);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid identifier format",
        errors: [
          {
            field: "identifier",
            message: "Please provide a valid NIK (16 digits) or email address",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Find user by identifier and ensure it's an admin
    const [user] = await db
      .select()
      .from(users)
      .where(and(identifierCondition, eq(users.role, "admin")))
      .limit(1);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid credentials",
        errors: [
          {
            field: "credentials",
            message: "Invalid identifier or user is not an admin",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Account is locked",
        errors: [
          {
            field: "account",
            message: `Account is locked due to too many failed login attempts. Try again later.`,
            code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 423);
    }

    // Check if user is active
    if (!user.is_active) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Account is inactive",
        errors: [
          {
            field: "account",
            message: "Your account has been deactivated",
            code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Admin must have password
    if (!user.password) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Admin account not properly configured",
        errors: [
          {
            field: "password",
            message: "Admin account must have a password configured",
            code: "ADMIN_PASSWORD_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(user.password, data.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await incrementLoginAttempts(db, user.id);

      // Check if we should lock the account
      const currentAttempts = (user.login_attempts || 0) + 1;
      if (currentAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        await lockUserAccount(db, user.id);
      }

      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid credentials",
        errors: [
          {
            field: "password",
            message: "Incorrect password",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // FIXED: Generate session ID first, then use it for both JWT and database
    const sessionId = crypto.randomUUID();

    const accessToken = generateAccessToken(
      {
        sub: user.id,
        role: user.role,
        nik: user.nik || "",
        email: user.email,
        session_id: sessionId, // Use the same session ID
      },
      env.JWT_SECRET
    );

    const refreshToken = generateRefreshToken(
      user.id,
      sessionId, // Use the same session ID
      env.JWT_SECRET
    );

    // Create session in database with explicit session ID
    const sessionData = {
      id: sessionId, // FIXED: Explicitly set session ID
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(
        Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN * 1000
      ),
      ip_address:
        c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For") ||
        "unknown",
      user_agent: c.req.header("User-Agent") || "unknown",
      is_active: true,
      updated_at: new Date(), // ADDED: Required field for database
    };

    await createAuthSession(db, sessionData);

    // Reset login attempts and update last login
    await resetLoginAttempts(db, user.id);

    // Prepare tokens response
    const tokens: AuthTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      expires_at: new Date(
        Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN * 1000
      ).toISOString(),
    };

    const response: LoginResponse = {
      success: true,
      message: "Admin login successful",
      data: {
        user: toAuthUserData(user),
        tokens,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Admin login error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Login failed",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== PARTICIPANT LOGIN ====================

export async function participantLoginHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const data = (await c.req.json()) as ParticipantLoginRequest;
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    if (!env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Validate phone number format (basic validation)
    if (!data.phone || !data.phone.trim()) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Phone number is required",
        errors: [
          {
            field: "phone",
            message: "Please provide a valid phone number",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Find participant by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.phone, data.phone.trim()), eq(users.role, "participant"))
      )
      .limit(1);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid credentials",
        errors: [
          {
            field: "credentials",
            message: "No participant found with provided phone number",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Account is locked",
        errors: [
          {
            field: "account",
            message:
              "Account is locked due to too many failed login attempts. Try again later.",
            code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 423);
    }

    // Check if user is active
    if (!user.is_active) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Account is inactive",
        errors: [
          {
            field: "account",
            message: "Your account has been deactivated",
            code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // FIXED: Generate session ID first, then use it for both JWT and database
    const sessionId = crypto.randomUUID();

    const accessToken = generateAccessToken(
      {
        sub: user.id,
        role: user.role,
        nik: user.nik || "",
        email: user.email,
        session_id: sessionId, // Use the same session ID
      },
      env.JWT_SECRET
    );

    const refreshToken = generateRefreshToken(
      user.id,
      sessionId, // Use the same session ID
      env.JWT_SECRET
    );

    // Create session in database with explicit session ID
    const sessionData = {
      id: sessionId, // FIXED: Explicitly set session ID
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(
        Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN * 1000
      ),
      ip_address:
        c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For") ||
        "unknown",
      user_agent: c.req.header("User-Agent") || "unknown",
      is_active: true,
      updated_at: new Date(), // ADDED: Required field for database
    };

    await createAuthSession(db, sessionData);

    // Reset login attempts and update last login
    await resetLoginAttempts(db, user.id);

    // Prepare tokens response
    const tokens: AuthTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      expires_at: new Date(
        Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN * 1000
      ).toISOString(),
    };

    const response: LoginResponse = {
      success: true,
      message: "Participant login successful",
      data: {
        user: toAuthUserData(user),
        tokens,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Participant login error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Login failed",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== REFRESH TOKEN ====================

export async function refreshTokenHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const data = (await c.req.json()) as RefreshTokenRequest;
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    if (!env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyToken(data.refresh_token, env.JWT_SECRET);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid refresh token",
        errors: [
          {
            field: "refresh_token",
            message: "Refresh token is invalid or expired",
            code: AUTH_ERROR_CODES.INVALID_TOKEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Find session in database
    const [session] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.refresh_token, data.refresh_token),
          eq(authSessions.is_active, true)
        )
      )
      .limit(1);

    if (!session) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "session",
            message: "Refresh token session not found or expired",
            code: AUTH_ERROR_CODES.SESSION_NOT_FOUND,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user_id))
      .limit(1);

    if (!user || !user.is_active) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found or inactive",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // FIXED: Use existing session ID instead of generating new one
    const sessionId = session.id;

    const newAccessToken = generateAccessToken(
      {
        sub: user.id,
        role: user.role,
        nik: user.nik || "",
        email: user.email,
        session_id: sessionId, // Use existing session ID
      },
      env.JWT_SECRET
    );

    const newRefreshToken = generateRefreshToken(
      user.id,
      sessionId, // Use existing session ID
      env.JWT_SECRET
    );

    // Update session in database
    await db
      .update(authSessions)
      .set({
        token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN * 1000
        ),
        last_used: new Date(),
      })
      .where(eq(authSessions.id, session.id));

    // Prepare tokens response
    const tokens: AuthTokens = {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      expires_at: new Date(
        Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN * 1000
      ).toISOString(),
    };

    const response: RefreshTokenResponse = {
      success: true,
      message: "Token refreshed successfully",
      data: tokens,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Refresh token error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Token refresh failed",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== LOGOUT ====================

export async function logoutHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const data = (await c.req.json().catch(() => ({}))) as LogoutRequest;
    const db = getDbFromEnv(c.env);

    if (data.all_devices) {
      // Logout from all devices
      await deleteAllUserSessions(db, auth.user.id);
    } else {
      // Logout from current session only
      await deleteAuthSession(db, auth.sessionId);
    }

    const response: AuthSuccessResponse = {
      success: true,
      message: data.all_devices
        ? "Logged out from all devices successfully"
        : "Logged out successfully",
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Logout error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Logout failed",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== GET PROFILE ====================

export async function getProfileHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const response: ProfileResponse = {
      success: true,
      message: "Profile retrieved successfully",
      data: auth.user,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get profile error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to retrieve profile",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== CHANGE PASSWORD (ADMIN ONLY) ====================

export async function changePasswordHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can change password",
            code: AUTH_ERROR_CODES.FORBIDDEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const data = (await c.req.json()) as ChangePasswordRequest;
    const db = getDbFromEnv(c.env);

    // Get current user with password
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    if (!user || !user.password) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found or password not set",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      user.password,
      data.current_password
    );
    if (!isCurrentPasswordValid) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid current password",
        errors: [
          {
            field: "current_password",
            message: "Current password is incorrect",
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(data.new_password);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        updated_at: new Date(),
      })
      .where(eq(users.id, auth.user.id));

    // Optionally logout from all other devices for security
    await deleteAllUserSessions(db, auth.user.id);

    const response: AuthSuccessResponse = {
      success: true,
      message:
        "Password changed successfully. You have been logged out from all devices.",
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Change password error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to change password",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// ==================== NEW: SESSION MANAGEMENT HANDLERS ====================

export async function getActiveSessionsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const db = getDbFromEnv(c.env);
    const sessionManager = createSessionManager(db);

    const activeSessions = await sessionManager.getUserActiveSessions(
      auth.user.id
    );

    const sessionInfos = activeSessions.map((session) => ({
      id: session.id,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      created_at: session.created_at,
      last_used: session.last_used,
      expires_at: session.expires_at,
      is_current: session.id === auth.sessionId,
    }));

    const response: SessionManagementResponse = {
      success: true,
      message: "Active sessions retrieved successfully",
      data: {
        active_sessions: sessionInfos,
        total_sessions: sessionInfos.length,
        current_session_id: auth.sessionId,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get active sessions error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to retrieve active sessions",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

export async function revokeSessionHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const { sessionId } = await c.req.json();

    if (!sessionId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Session ID is required",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const db = getDbFromEnv(c.env);
    const sessionManager = createSessionManager(db);

    const revoked = await sessionManager.revokeSession(sessionId, auth.user.id);

    if (!revoked) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Session not found or already revoked",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const response: AuthSuccessResponse = {
      success: true,
      message: "Session revoked successfully",
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Revoke session error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to revoke session",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

export async function revokeAllOtherSessionsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const db = getDbFromEnv(c.env);
    const sessionManager = createSessionManager(db);

    const revokedCount = await sessionManager.revokeOtherUserSessions(
      auth.user.id,
      auth.sessionId
    );

    const response: AuthSuccessResponse = {
      success: true,
      message: `Successfully revoked ${revokedCount} other sessions`,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Revoke all other sessions error:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to revoke other sessions",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
