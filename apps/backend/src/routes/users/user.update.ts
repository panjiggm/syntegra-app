import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type UpdateUserRequest,
  type UpdateUserResponse,
  type ErrorResponse,
  type UpdateUserDB,
  AUTH_ERROR_CODES,
} from "shared-types";

export async function updateUserHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message:
              "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get userId from path parameters
    const userId = c.req.param("userId");

    // Validate userId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid user ID format",
        errors: [
          {
            field: "userId",
            message: "User ID must be a valid UUID",
            code: "INVALID_UUID",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get authentication context
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authentication",
            message: "User must be authenticated to access this resource",
            code: AUTH_ERROR_CODES.UNAUTHORIZED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Authorization check: Admin can update any user, participants can only update their own data
    if (auth.user.role === "participant" && auth.user.id !== userId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Participants can only update their own user data",
            code: AUTH_ERROR_CODES.FORBIDDEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get validated data from request
    const data = (await c.req.json()) as UpdateUserRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Check if user exists
    const [existingUser] = await db
      .select({
        id: users.id,
        nik: users.nik,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "userId",
            message: `No user found with ID: ${userId}`,
            code: "USER_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Validate participant restrictions
    if (auth.user.role === "participant") {
      // Participants cannot update admin-only fields
      if (data.role !== undefined || data.is_active !== undefined) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Access denied",
          errors: [
            {
              field: "authorization",
              message: "Participants cannot update role or is_active fields",
              code: AUTH_ERROR_CODES.FORBIDDEN,
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 403);
      }

      // Participants cannot change their role from participant
      if (data.role && data.role !== "participant") {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Access denied",
          errors: [
            {
              field: "role",
              message: "Participants cannot change their role",
              code: AUTH_ERROR_CODES.FORBIDDEN,
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 403);
      }
    }

    // Admin restrictions
    if (auth.user.role === "admin") {
      // Admin cannot demote themselves
      if (auth.user.id === userId && data.role === "participant") {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot demote yourself",
          errors: [
            {
              field: "role",
              message:
                "Administrators cannot change their own role to participant",
              code: "SELF_DEMOTION_NOT_ALLOWED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Admin cannot deactivate themselves
      if (auth.user.id === userId && data.is_active === false) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot deactivate your own account",
          errors: [
            {
              field: "is_active",
              message: "Administrators cannot deactivate their own account",
              code: "SELF_DEACTIVATION_NOT_ALLOWED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Check for email uniqueness if email is being updated
    if (data.email && data.email !== existingUser.email) {
      const [emailExists] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (emailExists) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Email already exists",
          errors: [
            {
              field: "email",
              message: "A user with this email already exists",
              code: "EMAIL_ALREADY_EXISTS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }
    }

    // Prepare data for database update
    const updateData: UpdateUserDB = {
      updated_at: new Date(),
      updated_by: auth.user.id,
    };

    // Add fields that are being updated
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.birth_place !== undefined)
      updateData.birth_place = data.birth_place || null;
    if (data.birth_date !== undefined)
      updateData.birth_date = data.birth_date
        ? new Date(data.birth_date)
        : null;
    if (data.religion !== undefined)
      updateData.religion = data.religion || null;
    if (data.education !== undefined)
      updateData.education = data.education || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.province !== undefined)
      updateData.province = data.province || null;
    if (data.regency !== undefined) updateData.regency = data.regency || null;
    if (data.district !== undefined)
      updateData.district = data.district || null;
    if (data.village !== undefined) updateData.village = data.village || null;
    if (data.postal_code !== undefined)
      updateData.postal_code = data.postal_code || null;
    if (data.profile_picture_url !== undefined)
      updateData.profile_picture_url = data.profile_picture_url || null;

    // Admin-only fields
    if (auth.user.role === "admin") {
      if (data.role !== undefined) updateData.role = data.role;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        nik: users.nik,
        name: users.name,
        role: users.role,
        email: users.email,
        gender: users.gender,
        phone: users.phone,
        birth_place: users.birth_place,
        birth_date: users.birth_date,
        religion: users.religion,
        education: users.education,
        address: users.address,
        province: users.province,
        regency: users.regency,
        district: users.district,
        village: users.village,
        postal_code: users.postal_code,
        profile_picture_url: users.profile_picture_url,
        is_active: users.is_active,
        email_verified: users.email_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
        created_by: users.created_by,
        updated_by: users.updated_by,
      });

    if (!updatedUser) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to update user",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const responseData = {
      id: updatedUser.id,
      nik: updatedUser.nik || "",
      name: updatedUser.name,
      role: updatedUser.role,
      email: updatedUser.email,
      gender: updatedUser.gender || "other",
      phone: updatedUser.phone || "",
      birth_place: updatedUser.birth_place,
      birth_date: updatedUser.birth_date,
      religion: updatedUser.religion,
      education: updatedUser.education,
      address: updatedUser.address,
      province: updatedUser.province,
      regency: updatedUser.regency,
      district: updatedUser.district,
      village: updatedUser.village,
      postal_code: updatedUser.postal_code,
      profile_picture_url: updatedUser.profile_picture_url,
      is_active: updatedUser.is_active ?? true,
      email_verified: updatedUser.email_verified ?? false,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
      created_by: updatedUser.created_by,
      updated_by: updatedUser.updated_by,
    };

    const response: UpdateUserResponse = {
      success: true,
      message: "User updated successfully",
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating user:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Unique constraint violation",
          errors: [
            {
              message: "Email or NIK already exists",
              code: "UNIQUE_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }
    }

    // Generic error response
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Internal server error",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "INTERNAL_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
