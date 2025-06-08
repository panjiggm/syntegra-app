import { sign, verify } from "jsonwebtoken";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import {
  type JWTPayload,
  type AuthUserData,
  type CreateAuthSessionDB,
  AUTH_CONSTANTS,
} from "shared-types";
import { users, authSessions, type Database } from "../db";

// ==================== PASSWORD UTILITIES ====================

/**
 * Hash password menggunakan Web Crypto API (PBKDF2)
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Convert password to ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);

    // Import password as key
    const key = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    // Derive key using PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000, // 100k iterations for security
        hash: "SHA-256",
      },
      key,
      256 // 32 bytes = 256 bits
    );

    // Combine salt and hash
    const combined = new Uint8Array(salt.length + hashBuffer.byteLength);
    combined.set(salt);
    combined.set(new Uint8Array(hashBuffer), salt.length);

    // Convert to base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

/**
 * Verify password dengan hash
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    // Decode the hash
    const combined = new Uint8Array(
      atob(hash)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    // Extract salt (first 16 bytes) and stored hash (remaining bytes)
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Convert password to ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);

    // Import password as key
    const key = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    // Derive key using same parameters
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256
    );

    // Compare hashes
    const computedHash = new Uint8Array(hashBuffer);

    // Constant-time comparison
    if (computedHash.length !== storedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash[i] ^ storedHash[i];
    }

    return result === 0;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

// ==================== JWT UTILITIES ====================

/**
 * Generate JWT access token
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
  secret: string
): string {
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
  };

  return sign(jwtPayload, secret, {
    algorithm: "HS256",
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  secret: string
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    sub: userId,
    session_id: sessionId,
    type: "refresh",
    iat: now,
    exp: now + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
  };

  return sign(payload, secret, {
    algorithm: "HS256",
  });
}

/**
 * Verify dan decode JWT token
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  try {
    const decoded = verify(token, secret, {
      algorithms: ["HS256"],
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    console.error("Error verifying token:", error);
    throw new Error("Invalid token");
  }
}

/**
 * Generate random token untuk reset password, dll
 */
export function generateRandomToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// ==================== DATABASE UTILITIES ====================

/**
 * Buat session di database dengan session ID yang sudah ditentukan
 */
export async function createAuthSession(
  db: Database,
  sessionData: CreateAuthSessionDB & { id?: string }
): Promise<string> {
  try {
    // Jika tidak ada ID yang diberikan, generate satu
    const sessionId = sessionData.id || crypto.randomUUID();

    const [session] = await db
      .insert(authSessions)
      .values({
        id: sessionId, // Explicitly set the session ID
        ...sessionData,
      })
      .returning({ id: authSessions.id });

    if (!session) {
      throw new Error("Failed to create session");
    }

    return session.id;
  } catch (error) {
    console.error("Error creating auth session:", error);
    throw new Error("Failed to create session");
  }
}

/**
 * Hapus session dari database
 */
export async function deleteAuthSession(
  db: Database,
  sessionId: string
): Promise<void> {
  try {
    await db.delete(authSessions).where(eq(authSessions.id, sessionId));
  } catch (error) {
    console.error("Error deleting auth session:", error);
    throw new Error("Failed to delete session");
  }
}

/**
 * Hapus semua session user
 */
export async function deleteAllUserSessions(
  db: Database,
  userId: string
): Promise<void> {
  try {
    await db.delete(authSessions).where(eq(authSessions.user_id, userId));
  } catch (error) {
    console.error("Error deleting user sessions:", error);
    throw new Error("Failed to delete sessions");
  }
}

/**
 * Validate session di database - FIXED VERSION
 */
export async function validateSession(
  db: Database,
  sessionId: string
): Promise<boolean> {
  try {
    const [session] = await db
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, sessionId),
          eq(authSessions.is_active, true),
          gt(authSessions.expires_at, new Date()) // Session is valid if expires_at > current time
        )
      )
      .limit(1);

    return Boolean(session);
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
}

/**
 * Update last used session
 */
export async function updateSessionLastUsed(
  db: Database,
  sessionId: string
): Promise<void> {
  try {
    await db
      .update(authSessions)
      .set({ last_used: new Date() })
      .where(eq(authSessions.id, sessionId));
  } catch (error) {
    console.error("Error updating session last used:", error);
    // Non-critical error, don't throw
  }
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(db: Database): Promise<void> {
  try {
    await db
      .delete(authSessions)
      .where(lt(authSessions.expires_at, new Date()));
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    // Non-critical error, don't throw
  }
}

// ==================== USER UTILITIES ====================

/**
 * Check apakah user perlu password berdasarkan role
 */
export function requiresPassword(role: "admin" | "participant"): boolean {
  return role === "admin";
}

/**
 * Increment login attempts
 */
export async function incrementLoginAttempts(
  db: Database,
  userId: string
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        login_attempts: sql`${users.login_attempts} + 1`,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("Error incrementing login attempts:", error);
    throw new Error("Failed to update login attempts");
  }
}

/**
 * Reset login attempts
 */
export async function resetLoginAttempts(
  db: Database,
  userId: string
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        login_attempts: 0,
        account_locked_until: null,
        last_login: new Date(),
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("Error resetting login attempts:", error);
    throw new Error("Failed to reset login attempts");
  }
}

/**
 * Lock user account
 */
export async function lockUserAccount(
  db: Database,
  userId: string
): Promise<void> {
  try {
    const lockUntil = new Date();
    lockUntil.setSeconds(
      lockUntil.getSeconds() + AUTH_CONSTANTS.ACCOUNT_LOCKOUT_DURATION
    );

    await db
      .update(users)
      .set({
        account_locked_until: lockUntil,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("Error locking user account:", error);
    throw new Error("Failed to lock account");
  }
}

/**
 * Check apakah account ter-lock
 */
export function isAccountLocked(user: {
  account_locked_until: Date | null;
  login_attempts: number | null;
}): boolean {
  if (!user.account_locked_until) return false;

  const now = new Date();
  const isLocked = user.account_locked_until > now;

  // If lock period has expired but login attempts still high, account is still locked
  if (
    !isLocked &&
    (user.login_attempts || 0) >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS
  ) {
    return true;
  }

  return isLocked;
}

/**
 * Convert database user ke AuthUserData
 */
export function toAuthUserData(user: any): AuthUserData {
  return {
    id: user.id,
    nik: user.nik,
    name: user.name,
    role: user.role,
    email: user.email,
    gender: user.gender,
    phone: user.phone,
    birth_place: user.birth_place,
    birth_date: user.birth_date,
    religion: user.religion,
    education: user.education,
    address: user.address,
    province: user.province,
    regency: user.regency,
    district: user.district,
    village: user.village,
    postal_code: user.postal_code,
    profile_picture_url: user.profile_picture_url,
    is_active: user.is_active ?? true,
    email_verified: user.email_verified ?? false,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate identifier (bisa NIK atau email)
 */
export function parseIdentifier(identifier: string): {
  type: "nik" | "email";
  value: string;
} {
  // Check if it's a valid email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(identifier)) {
    return { type: "email", value: identifier };
  }

  // Check if it's a valid NIK (16 digits)
  const nikRegex = /^\d{16}$/;
  if (nikRegex.test(identifier)) {
    return { type: "nik", value: identifier };
  }

  throw new Error("Invalid identifier format");
}
