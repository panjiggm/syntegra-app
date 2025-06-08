import { Context } from "hono";
import { eq, or, count } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import { hashPassword } from "@/lib/auth";
import {
  type CreateUserRequest,
  type CreateUserResponse,
  type ErrorResponse,
  type CreateUserDB,
} from "shared-types";

// Helper function to generate admin NIK (AUTO-ADM-YYYY-XXXX)
function generateAdminNIK(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `AUTO-ADM-${year}-${randomNum}`;
}

export async function createUserHandler(
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

    // Get validated data from request
    const data = (await c.req.json()) as CreateUserRequest & {
      password?: string;
    };

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Check if user is authenticated (admin) or self-registering
    const auth = c.get("auth");
    const isAdminCreation = auth && auth.user.role === "admin";
    const isSelfRegistration = !auth;

    // ADMIN COUNT CHECK: Allow up to 3 admins maximum
    let isBootstrapAdminCreation = false;
    let currentAdminCount = 0;

    if (data.role === "admin") {
      // Count existing active admins
      const adminCountResult = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin"));

      currentAdminCount = adminCountResult[0]?.count || 0;

      // Check if creating admin when no authentication (self-registration)
      if (isSelfRegistration) {
        if (currentAdminCount === 0) {
          isBootstrapAdminCreation = true;
          console.log("🚀 Bootstrap: Creating first admin user");
        } else if (currentAdminCount < 3) {
          isBootstrapAdminCreation = true;
          console.log(`🔧 Creating admin ${currentAdminCount + 1}/3`);
        }
      }

      // Validate admin limit (3 maximum)
      if (currentAdminCount >= 3) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Maximum number of admin users reached",
          errors: [
            {
              field: "role",
              message:
                "Cannot create more admin users. Maximum limit is 3 admins.",
              code: "ADMIN_LIMIT_EXCEEDED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Handle NIK logic based on role
    let finalNik: string | null = null;

    if (data.role === "admin") {
      // Admin users: NIK is optional
      if (data.nik) {
        // If NIK provided, use it
        finalNik = data.nik;
      } else {
        // If no NIK provided, generate one automatically
        finalNik = generateAdminNIK();
        console.log(`Auto-generated NIK for admin: ${finalNik}`);
      }
    } else {
      // Participant users: NIK is required
      if (!data.nik) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "NIK is required for participant users",
          errors: [
            {
              field: "nik",
              message: "Participant users must have a NIK",
              code: "NIK_REQUIRED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
      finalNik = data.nik;
    }

    // Validation logic based on creation type
    if (isBootstrapAdminCreation) {
      // Admin creation without authentication (self-registration when < 3 admins)
      console.log(`Creating admin ${currentAdminCount + 1}/3: ${data.email}`);

      if (!data.password) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Password is required for admin users",
          errors: [
            {
              field: "password",
              message: "Admin users must have a password",
              code: "PASSWORD_REQUIRED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Validate password strength for admin
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (data.password.length < 8 || !passwordRegex.test(data.password)) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Admin password does not meet requirements",
          errors: [
            {
              field: "password",
              message:
                "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character",
              code: "PASSWORD_TOO_WEAK",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Force role to admin
      data.role = "admin";
    } else if (isAdminCreation) {
      // Admin creating user - can create both admin and participant
      console.log(
        `Admin ${auth.user.email} creating user with role: ${data.role}`
      );

      if (data.role === "admin") {
        // Check admin limit even for admin creation
        if (currentAdminCount >= 3) {
          const errorResponse: ErrorResponse = {
            success: false,
            message: "Maximum number of admin users reached",
            errors: [
              {
                field: "role",
                message:
                  "Cannot create more admin users. Maximum limit is 3 admins.",
                code: "ADMIN_LIMIT_EXCEEDED",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }

        // Admin creating another admin - password required
        if (!data.password) {
          const errorResponse: ErrorResponse = {
            success: false,
            message: "Password is required for admin users",
            errors: [
              {
                field: "password",
                message: "Admin users must have a password",
                code: "PASSWORD_REQUIRED",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }

        // Validate password strength
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (data.password.length < 8 || !passwordRegex.test(data.password)) {
          const errorResponse: ErrorResponse = {
            success: false,
            message: "Password does not meet requirements",
            errors: [
              {
                field: "password",
                message:
                  "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character",
                code: "PASSWORD_TOO_WEAK",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }
      } else if (data.password) {
        // Admin creating participant with password - not allowed
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Participants cannot have passwords",
          errors: [
            {
              field: "password",
              message:
                "Participant users authenticate using NIK and email only",
              code: "PASSWORD_NOT_ALLOWED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    } else if (isSelfRegistration) {
      // Self-registration logic
      if (data.role === "admin" && !isBootstrapAdminCreation) {
        const errorResponse: ErrorResponse = {
          success: false,
          message:
            "Cannot self-register as admin - maximum admin limit reached",
          errors: [
            {
              field: "role",
              message: `Self-registration as admin is only allowed when there are fewer than 3 admins in the system. Current admin count: ${currentAdminCount}/3`,
              code: "ADMIN_LIMIT_REACHED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      if (!isBootstrapAdminCreation) {
        if (data.password) {
          const errorResponse: ErrorResponse = {
            success: false,
            message: "Password not allowed for participant registration",
            errors: [
              {
                field: "password",
                message: "Participants authenticate using NIK and email only",
                code: "PASSWORD_NOT_ALLOWED",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }

        // Force role to participant for self-registration
        data.role = "participant";
        console.log(`Self-registration for participant: ${data.email}`);
      }
    }

    // Check if NIK or email already exists
    const conditions = [eq(users.email, data.email)];
    if (finalNik) {
      conditions.push(eq(users.nik, finalNik));
    }

    const existingUser = await db
      .select({
        nik: users.nik,
        email: users.email,
      })
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (existingUser.length > 0) {
      const conflictField =
        existingUser[0].email === data.email ? "email" : "NIK";
      const errorResponse: ErrorResponse = {
        success: false,
        message: `User with this ${conflictField} already exists`,
        errors: [
          {
            field: conflictField.toLowerCase(),
            message: `${conflictField} is already taken`,
            code: "UNIQUE_CONSTRAINT",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Hash password if provided (for admin users only)
    let hashedPassword: string | null = null;
    if (data.password && data.role === "admin") {
      hashedPassword = await hashPassword(data.password);
    }

    // Prepare data for database insertion
    const insertData: CreateUserDB & { password?: string | null } = {
      nik: finalNik || "", // Use generated or provided NIK
      name: data.name,
      role: data.role,
      email: data.email,
      password: hashedPassword,
      gender: data.gender || "other",
      phone: data.phone || "",
      birth_place: data.birth_place || null,
      birth_date: data.birth_date ? new Date(data.birth_date) : null,
      religion: data.religion || null,
      education: data.education || null,
      address: data.address || null,
      province: data.province || null,
      regency: data.regency || null,
      district: data.district || null,
      village: data.village || null,
      postal_code: data.postal_code || null,
      profile_picture_url: data.profile_picture_url || null,
      created_by: isAdminCreation ? auth.user.id : null,
      updated_by: isAdminCreation ? auth.user.id : null,
      is_active: true,
      email_verified: data.role === "admin", // Admin accounts are pre-verified
      login_attempts: 0,
    };

    // Insert user into database
    const [newUser] = await db.insert(users).values(insertData).returning();

    if (!newUser) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to create user",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response (exclude sensitive data)
    const responseData = {
      id: newUser.id,
      nik: newUser.nik || "", // Convert null to empty string for response
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
      gender: newUser.gender || "other",
      phone: newUser.phone || "",
      birth_place: newUser.birth_place,
      birth_date: newUser.birth_date,
      religion: newUser.religion,
      education: newUser.education,
      address: newUser.address,
      province: newUser.province,
      regency: newUser.regency,
      district: newUser.district,
      village: newUser.village,
      postal_code: newUser.postal_code,
      profile_picture_url: newUser.profile_picture_url,
      is_active: newUser.is_active ?? true,
      email_verified: newUser.email_verified ?? false,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      created_by: newUser.created_by,
      updated_by: newUser.updated_by,
    };

    // Determine creation type for response message
    let creationType: string;
    if (isBootstrapAdminCreation) {
      if (currentAdminCount === 0) {
        creationType = "Bootstrap admin creation";
      } else {
        creationType = `Admin creation (${currentAdminCount + 1}/3)`;
      }
    } else if (isAdminCreation) {
      creationType = `Admin creation (${currentAdminCount + 1}/3)`;
    } else {
      creationType = "Self-registration";
    }

    // Determine if NIK was auto-generated
    const nikMessage =
      data.role === "admin" && !data.nik
        ? ` (NIK auto-generated: ${finalNik})`
        : "";

    const response: CreateUserResponse = {
      success: true,
      message: `${creationType}: ${data.role === "admin" ? "Admin" : "Participant"} user created successfully${nikMessage}`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating user:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "User with this NIK or email already exists",
          errors: [
            {
              message: "Unique constraint violation",
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

      // Handle password hashing errors
      if (
        error.message.includes("hash") ||
        error.message.includes("password")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Failed to process password",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
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
