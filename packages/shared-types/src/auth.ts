import { z } from "zod";

// ==================== AUTHENTICATION SCHEMAS ====================

// Admin Login Request (dengan password)
export const AdminLoginRequestSchema = z.object({
  identifier: z.string().min(1, "NIK or email is required"), // bisa NIK atau email
  password: z.string().min(1, "Password is required"),
});

// Participant Login Request (tanpa password)
export const ParticipantLoginRequestSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(20, "Phone number is too long")
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
});

// Refresh Token Request
export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

// Change Password Request (untuk admin)
export const ChangePasswordRequestSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
      ),
    confirm_password: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

// Reset Password Request
export const ResetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Reset Password Confirm Request
export const ResetPasswordConfirmRequestSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
      ),
    confirm_password: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

// Logout Request
export const LogoutRequestSchema = z.object({
  all_devices: z.boolean().default(false).optional(),
});

// ==================== RESPONSE SCHEMAS ====================

// User Data for Auth Response (tanpa sensitive data)
export const AuthUserDataSchema = z.object({
  id: z.string().uuid(),
  nik: z.string().nullable(), // Nullable for admin users
  name: z.string(),
  role: z.enum(["admin", "participant"]),
  email: z.string().email(),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string(),
  birth_place: z.string().nullable(),
  birth_date: z.date().nullable(),
  religion: z
    .enum([
      "islam",
      "kristen",
      "katolik",
      "hindu",
      "buddha",
      "konghucu",
      "other",
    ])
    .nullable(),
  education: z
    .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
    .nullable(),
  address: z.string().nullable(),
  province: z.string().nullable(),
  regency: z.string().nullable(),
  district: z.string().nullable(),
  village: z.string().nullable(),
  postal_code: z.string().nullable(),
  profile_picture_url: z.string().nullable(),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  last_login: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Authentication Tokens
export const AuthTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(), // seconds
  expires_at: z.string().datetime(), // ISO string
});

// Login Response
export const LoginResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: AuthUserDataSchema,
    tokens: AuthTokensSchema,
  }),
  timestamp: z.string(),
});

// Participant Login Response
export const ParticipantLoginResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: AuthUserDataSchema.refine((user) => user.role === "participant", {
      message: "User must be a participant",
    }),
    tokens: AuthTokensSchema,
  }),
  timestamp: z.string(),
});

// Admin Login Response
export const AdminLoginResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: AuthUserDataSchema.refine((user) => user.role === "admin", {
      message: "User must be an admin",
    }),
    tokens: AuthTokensSchema,
  }),
  timestamp: z.string(),
});

// Refresh Token Response
export const RefreshTokenResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: AuthTokensSchema,
  timestamp: z.string(),
});

// Me/Profile Response
export const ProfileResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: AuthUserDataSchema,
  timestamp: z.string(),
});

// Success Response (untuk logout, change password, dll)
export const AuthSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string(),
});

// JWT Payload Schema
export const JWTPayloadSchema = z.object({
  sub: z.string().uuid(), // user id
  role: z.enum(["admin", "participant"]),
  nik: z.string().nullable(), // Nullable for admin users
  email: z.string().email(),
  session_id: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
});

// Add new schema for session management
export const SessionInfoSchema = z.object({
  id: z.string().uuid(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.date(),
  last_used: z.date(),
  expires_at: z.date(),
  is_current: z.boolean(),
});

// Add session management response
export const SessionManagementResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    active_sessions: z.array(SessionInfoSchema),
    total_sessions: z.number(),
    current_session_id: z.string().uuid(),
  }),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;
export type ParticipantLoginRequest = z.infer<
  typeof ParticipantLoginRequestSchema
>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type ResetPasswordConfirmRequest = z.infer<
  typeof ResetPasswordConfirmRequestSchema
>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

export type AuthUserData = z.infer<typeof AuthUserDataSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type ParticipantLoginResponse = z.infer<
  typeof ParticipantLoginResponseSchema
>;
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
export type SessionManagementResponse = z.infer<
  typeof SessionManagementResponseSchema
>;

// ==================== DATABASE TYPES ====================
export type CreateAuthSessionDB = {
  id?: string; // ADDED: Optional session ID
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  updated_at?: Date; // ADDED: Optional field (database has default)
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
};

// ==================== MIDDLEWARE TYPES ====================
export type AuthContext = {
  user: AuthUserData;
  session_id: string;
};

// ==================== CONSTANTS ====================
export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRES_IN: 2 * 60 * 60, // 2 hours in seconds
  REFRESH_TOKEN_EXPIRES_IN: 7 * 24 * 60 * 60, // 7 days in seconds
  AUTO_REFRESH_THRESHOLD: 30 * 60, // 30 minutes in seconds
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION: 30 * 60, // 30 minutes in seconds
  PASSWORD_RESET_TOKEN_EXPIRES_IN: 60 * 60, // 1 hour in seconds
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: 24 * 60 * 60, // 24 hours in seconds
  MAX_ACTIVE_SESSIONS_PER_USER: 3, // Maximum 3 active sessions per user
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60, // Cleanup every 24 hours
} as const;

// ==================== VALIDATION HELPERS ====================
export const isValidNIK = (nik: string): boolean => {
  return /^\d{16}$/.test(nik);
};

export const isValidEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const isStrongPassword = (password: string): boolean => {
  return z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .safeParse(password).success;
};

// ==================== ERROR CODES ====================
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  PASSWORD_TOO_WEAK: "PASSWORD_TOO_WEAK",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  DUPLICATE_LOGIN: "DUPLICATE_LOGIN",
} as const;
