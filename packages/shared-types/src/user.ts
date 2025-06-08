// packages/shared-types/src/user.ts

import { z } from "zod";

// ==================== ENUMS ====================
export const RoleEnum = z.enum(["admin", "participant"]);
export const GenderEnum = z.enum(["male", "female", "other"]);
export const ReligionEnum = z.enum([
  "islam",
  "kristen",
  "katolik",
  "hindu",
  "buddha",
  "konghucu",
  "other",
]);
export const EducationEnum = z.enum([
  "sd",
  "smp",
  "sma",
  "diploma",
  "s1",
  "s2",
  "s3",
  "other",
]);

// ==================== BASE USER SCHEMAS ====================

// Schema untuk create user - NIK optional untuk semua role
export const CreateUserRequestSchema = z
  .object({
    nik: z.string().min(1, "NIK cannot be empty").optional(), // NIK sekarang optional
    name: z.string().min(1, "Name is required").max(255, "Name too long"),
    role: RoleEnum,
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(), // Optional karena participant tidak butuh password

    // Profile fields (optional)
    gender: GenderEnum.optional(),
    phone: z.string().max(20, "Phone number too long").optional(),
    birth_place: z.string().max(100, "Birth place too long").optional(),
    birth_date: z.date().optional(),
    religion: ReligionEnum.optional(),
    education: EducationEnum.optional(),
    address: z.string().optional(),
    province: z.string().max(100, "Province name too long").optional(),
    regency: z.string().max(100, "Regency name too long").optional(),
    district: z.string().max(100, "District name too long").optional(),
    village: z.string().max(100, "Village name too long").optional(),
    postal_code: z.string().max(10, "Postal code too long").optional(),
    profile_picture_url: z.string().url("Invalid URL format").optional(),
  })
  // Custom validation untuk role-specific requirements
  .refine(
    (data) => {
      // Jika role adalah participant, NIK wajib
      if (data.role === "participant" && !data.nik) {
        return false;
      }
      return true;
    },
    {
      message: "NIK is required for participant users",
      path: ["nik"], // Specify which field the error is for
    }
  )
  .refine(
    (data) => {
      // Jika role adalah admin, password wajib
      if (data.role === "admin" && !data.password) {
        return false;
      }
      return true;
    },
    {
      message: "Password is required for admin users",
      path: ["password"],
    }
  )
  .refine(
    (data) => {
      // Jika role adalah participant, password tidak boleh ada
      if (data.role === "participant" && data.password) {
        return false;
      }
      return true;
    },
    {
      message:
        "Participants cannot have passwords - they authenticate using NIK and email only",
      path: ["password"],
    }
  );

// Schema untuk database insertion
export const CreateUserDBSchema = z.object({
  nik: z.string().min(1, "NIK cannot be empty"),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  role: RoleEnum,
  email: z.string().email("Invalid email format"),
  password: z.string().nullable(),

  // Profile fields
  gender: GenderEnum.default("other"),
  phone: z.string().default(""),
  birth_place: z.string().nullable(),
  birth_date: z.date().nullable(),
  religion: ReligionEnum.nullable(),
  education: EducationEnum.nullable(),
  address: z.string().nullable(),
  province: z.string().nullable(),
  regency: z.string().nullable(),
  district: z.string().nullable(),
  village: z.string().nullable(),
  postal_code: z.string().nullable(),
  profile_picture_url: z.string().nullable(),

  // System fields
  is_active: z.boolean().default(true),
  email_verified: z.boolean().default(false),
  login_attempts: z.number().default(0),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});

// Schema untuk response
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  nik: z.string(),
  name: z.string(),
  role: RoleEnum,
  email: z.string().email(),

  // Profile fields
  gender: GenderEnum,
  phone: z.string(),
  birth_place: z.string().nullable(),
  birth_date: z.date().nullable(),
  religion: ReligionEnum.nullable(),
  education: EducationEnum.nullable(),
  address: z.string().nullable(),
  province: z.string().nullable(),
  regency: z.string().nullable(),
  district: z.string().nullable(),
  village: z.string().nullable(),
  postal_code: z.string().nullable(),
  profile_picture_url: z.string().nullable(),

  // System fields
  is_active: z.boolean(),
  email_verified: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});

export const CreateUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UserResponseSchema,
  timestamp: z.string(),
});

// ==================== UTILITY SCHEMAS ====================

export const GetUsersRequestSchema = z.object({
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default("10"),
  role: RoleEnum.optional(),
  search: z.string().optional(),
  sort_by: z
    .enum(["name", "email", "created_at", "updated_at"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  is_active: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
  gender: GenderEnum.optional(),
  religion: ReligionEnum.optional(),
  education: EducationEnum.optional(),
  province: z.string().optional(),
  regency: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
});

export const GetUserByIdRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// ==================== RESPONSE SCHEMAS ====================

// UserData schema - simplified user data for responses
export const UserDataSchema = z.object({
  id: z.string().uuid(),
  nik: z.string(),
  name: z.string(),
  role: RoleEnum,
  email: z.string().email(),
  gender: GenderEnum,
  phone: z.string(),
  birth_place: z.string().nullable(),
  birth_date: z.date().nullable(),
  religion: ReligionEnum.nullable(),
  education: EducationEnum.nullable(),
  address: z.string().nullable(),
  province: z.string().nullable(),
  regency: z.string().nullable(),
  district: z.string().nullable(),
  village: z.string().nullable(),
  postal_code: z.string().nullable(),
  profile_picture_url: z.string().nullable(),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});

// Get User By ID Response Schema
export const GetUserByIdResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: UserDataSchema,
  timestamp: z.string(),
});

// Get Users List Response Schema
export const GetUsersResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(UserDataSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next_page: z.boolean(),
    has_prev_page: z.boolean(),
  }),
  timestamp: z.string(),
});

// Delete User Response Schema
export const DeleteUserResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    deleted_at: z.string(),
  }),
  timestamp: z.string(),
});

export const UpdateUserRequestSchema = z.object({
  nik: z.string().min(1, "NIK cannot be empty").optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  role: RoleEnum.optional(),
  email: z.string().email("Invalid email format").optional(),
  // password omitted - handled separately
  gender: GenderEnum.optional(),
  phone: z.string().max(20, "Phone number too long").optional(),
  birth_place: z.string().max(100, "Birth place too long").optional(),
  birth_date: z.date().optional(),
  religion: ReligionEnum.optional(),
  education: EducationEnum.optional(),
  address: z.string().optional(),
  province: z.string().max(100, "Province name too long").optional(),
  regency: z.string().max(100, "Regency name too long").optional(),
  district: z.string().max(100, "District name too long").optional(),
  village: z.string().max(100, "Village name too long").optional(),
  postal_code: z.string().max(10, "Postal code too long").optional(),
  profile_picture_url: z.string().url("Invalid URL format").optional(),
  is_active: z.boolean().optional(), // Admin-only field
});

export const UpdateUserByIdRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Schema untuk database update
export const UpdateUserDBSchema = z.object({
  nik: z.string().min(1, "NIK cannot be empty").optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  role: RoleEnum.optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().nullable().optional(),

  // Profile fields
  gender: GenderEnum.optional(),
  phone: z.string().optional(),
  birth_place: z.string().nullable().optional(),
  birth_date: z.date().nullable().optional(),
  religion: ReligionEnum.nullable().optional(),
  education: EducationEnum.nullable().optional(),
  address: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  regency: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  village: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  profile_picture_url: z.string().nullable().optional(),

  // System fields
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional(),
  updated_by: z.string().uuid().nullable().optional(),
  updated_at: z.date().optional(),
});

// Schema untuk update response
export const UpdateUserResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: UserResponseSchema,
  timestamp: z.string(),
});

export const DeleteUserByIdRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// ==================== TYPE EXPORTS ====================

export type Role = z.infer<typeof RoleEnum>;
export type Gender = z.infer<typeof GenderEnum>;
export type Religion = z.infer<typeof ReligionEnum>;
export type Education = z.infer<typeof EducationEnum>;

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type CreateUserDB = z.infer<typeof CreateUserDBSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

export type GetUsersRequest = z.infer<typeof GetUsersRequestSchema>;
export type GetUserByIdRequest = z.infer<typeof GetUserByIdRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserDB = z.infer<typeof UpdateUserDBSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type UpdateUserByIdRequest = z.infer<typeof UpdateUserByIdRequestSchema>;
export type DeleteUserByIdRequest = z.infer<typeof DeleteUserByIdRequestSchema>;

// Additional response types
export type UserData = z.infer<typeof UserDataSchema>;
export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;
export type GetUsersResponse = z.infer<typeof GetUsersResponseSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
