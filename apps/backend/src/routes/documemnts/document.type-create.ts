import { Context } from "hono";
import { eq, count } from "drizzle-orm";
import { getDbFromEnv, documentTypes, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import { z } from "zod";

// Request schema for creating document types
export const CreateDocumentTypeRequestSchema = z.object({
  key: z.string().min(1, "Key is required").max(100, "Key must not exceed 100 characters"),
  name: z.string().min(1, "Name is required").max(255, "Name must not exceed 255 characters"),
  weight: z.number().min(0).max(100).default(1.0),
  max_score: z.number().min(0).optional(),
});

export type CreateDocumentTypeRequest = z.infer<typeof CreateDocumentTypeRequestSchema>;

export type CreateDocumentTypeResponse = {
  success: true;
  message: string;
  data: {
    id: string;
    key: string;
    name: string;
    weight: string;
    max_score: string | null;
    created_at: Date;
    updated_at: Date;
  };
  timestamp: string;
};

export type ErrorResponse = {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
};

export async function createDocumentTypeHandler(
  c: Context<{ Bindings: CloudflareBindings }>
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
    const data = (await c.req.json()) as CreateDocumentTypeRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Admin access required",
        errors: [
          {
            field: "authentication",
            message: "Only admin users can create document types",
            code: "ADMIN_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if document type with same key already exists
    const existingDocumentType = await db
      .select({
        key: documentTypes.key,
      })
      .from(documentTypes)
      .where(eq(documentTypes.key, data.key))
      .limit(1);

    if (existingDocumentType.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Document type with this key already exists",
        errors: [
          {
            field: "key",
            message: "Key must be unique",
            code: "UNIQUE_CONSTRAINT",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Prepare data for database insertion
    const insertData = {
      key: data.key,
      name: data.name,
      weight: data.weight.toString(),
      max_score: data.max_score?.toString() || null,
    };

    // Insert document type into database
    const [newDocumentType] = await db
      .insert(documentTypes)
      .values(insertData)
      .returning();

    if (!newDocumentType) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to create document type",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const response: CreateDocumentTypeResponse = {
      success: true,
      message: "Document type created successfully",
      data: {
        id: newDocumentType.id,
        key: newDocumentType.key,
        name: newDocumentType.name,
        weight: newDocumentType.weight || "1.00",
        max_score: newDocumentType.max_score,
        created_at: newDocumentType.created_at,
        updated_at: newDocumentType.updated_at,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating document type:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Document type with this key already exists",
          errors: [
            {
              field: "key",
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