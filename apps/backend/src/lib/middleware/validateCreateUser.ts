import { Context, Next } from "hono";
import { z } from "zod";
import { type CloudflareBindings } from "../env";
import { type ErrorResponse } from "shared-types";

export async function validateCreateUser(
  c: Context<{ Bindings: CloudflareBindings }>,
  next: Next
) {
  try {
    const body = await c.req.json();

    // Basic validation terlebih dahulu
    const baseValidation = z.object({
      name: z.string().min(1, "Name is required").max(255, "Name too long"),
      email: z.string().email("Invalid email format"),
      role: z.enum(["admin", "participant"]),
      nik: z.string().min(1, "NIK cannot be empty").optional(),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .optional(),

      // Profile fields (optional)
      gender: z.enum(["male", "female", "other"]).optional(),
      phone: z.string().max(20, "Phone number too long").optional(),
      birth_place: z.string().max(100, "Birth place too long").optional(),
      birth_date: z.string().datetime().optional(),
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
        .optional(),
      education: z
        .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
        .optional(),
      address: z.string().optional(),
      province: z.string().max(100, "Province name too long").optional(),
      regency: z.string().max(100, "Regency name too long").optional(),
      district: z.string().max(100, "District name too long").optional(),
      village: z.string().max(100, "Village name too long").optional(),
      postal_code: z.string().max(10, "Postal code too long").optional(),
      profile_picture_url: z.string().url("Invalid URL format").optional(),
    });

    const baseResult = baseValidation.safeParse(body);

    if (!baseResult.success) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: baseResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const data = baseResult.data;

    // Custom validation berdasarkan role
    const validationErrors: Array<{
      field: string;
      message: string;
      code: string;
    }> = [];

    // Check authentication untuk menentukan apakah ini bootstrap admin
    const auth = c.get("auth");
    const isAdminCreation = auth && auth.user.role === "admin";
    const isSelfRegistration = !auth;

    // Check if this is bootstrap admin creation
    let isBootstrapAdminCreation = false;
    if (isSelfRegistration && data.role === "admin") {
      // Kita perlu cek database untuk menentukan apakah ini bootstrap
      // Untuk sekarang, asumsikan jika tidak ada auth dan role admin, maka bootstrap
      isBootstrapAdminCreation = true;
    }

    if (data.role === "participant") {
      // Participant validation
      if (!data.nik) {
        validationErrors.push({
          field: "nik",
          message: "NIK is required for participant users",
          code: "required",
        });
      }

      if (data.password) {
        validationErrors.push({
          field: "password",
          message:
            "Participants cannot have passwords - they authenticate using NIK and email only",
          code: "not_allowed",
        });
      }
    } else if (data.role === "admin") {
      // Admin validation
      if (!data.password && (isAdminCreation || isBootstrapAdminCreation)) {
        validationErrors.push({
          field: "password",
          message: "Password is required for admin users",
          code: "required",
        });
      }

      // Validate password strength if provided
      if (data.password) {
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (data.password.length < 8 || !passwordRegex.test(data.password)) {
          validationErrors.push({
            field: "password",
            message:
              "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character",
            code: "password_too_weak",
          });
        }
      }
    }

    // Additional validation for self-registration
    if (
      isSelfRegistration &&
      data.role === "admin" &&
      !isBootstrapAdminCreation
    ) {
      validationErrors.push({
        field: "role",
        message:
          "Self-registration as admin is not allowed when admin already exists",
        code: "admin_exists",
      });
    }

    if (validationErrors.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: validationErrors,
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Jika semua validasi berhasil, lanjutkan ke handler
    return next();
  } catch (error) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Invalid JSON in request body",
      errors: [
        {
          field: "body",
          message: "Request body must be valid JSON",
          code: "invalid_json",
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 400);
  }
}
