import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, documentTypes, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import { z } from "zod";

// Request schema for updating document types
export const UpdateDocumentTypeRequestSchema = z.object({
  key: z.string().min(1, "Key is required").max(100, "Key must not exceed 100 characters").optional(),
  name: z.string().min(1, "Name is required").max(255, "Name must not exceed 255 characters").optional(),
  weight: z.number().min(0).max(100).optional(),
});

export const UpdateDocumentTypeByIdRequestSchema = z.object({
  typeId: z.string().uuid("Document type ID must be a valid UUID"),
});

export type UpdateDocumentTypeRequest = z.infer<typeof UpdateDocumentTypeRequestSchema>;

export type UpdateDocumentTypeResponse = {
  success: true;
  message: string;
  data: {
    id: string;
    key: string;
    name: string;
    weight: string;
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

export async function updateDocumentTypeHandler(
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

    // Get typeId from path parameters
    const typeId = c.req.param("typeId");

    // Validate typeId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!typeId || !uuidRegex.test(typeId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid document type ID format",
        errors: [
          {
            field: "typeId",
            message: "Document type ID must be a valid UUID",
            code: "INVALID_UUID",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get authenticated user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Admin access required",
        errors: [
          {
            field: "authentication",
            message: "Only admin users can update document types",
            code: "ADMIN_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get validated data from request
    const data = (await c.req.json()) as UpdateDocumentTypeRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Check if document type exists
    const [existingDocumentType] = await db
      .select({
        id: documentTypes.id,
        key: documentTypes.key,
        name: documentTypes.name,
        weight: documentTypes.weight,
        created_at: documentTypes.created_at,
        updated_at: documentTypes.updated_at,
      })
      .from(documentTypes)
      .where(eq(documentTypes.id, typeId))
      .limit(1);

    if (!existingDocumentType) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Document type not found",
        errors: [
          {
            field: "typeId",
            message: `No document type found with ID: ${typeId}`,
            code: "DOCUMENT_TYPE_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check for key uniqueness if key is being updated
    if (data.key && data.key !== existingDocumentType.key) {
      const [keyExists] = await db
        .select({ id: documentTypes.id })
        .from(documentTypes)
        .where(
          and(
            eq(documentTypes.key, data.key),
            eq(documentTypes.id, typeId) // exclude current record
          )
        )
        .limit(1);

      // Actually we need to check if key exists for other records
      const [keyExistsOther] = await db
        .select({ id: documentTypes.id })
        .from(documentTypes)
        .where(eq(documentTypes.key, data.key))
        .limit(1);

      if (keyExistsOther && keyExistsOther.id !== typeId) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Document type key already exists",
          errors: [
            {
              field: "key",
              message: "A document type with this key already exists",
              code: "KEY_ALREADY_EXISTS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }
    }

    // Prepare data for database update
    const updateData: Partial<typeof documentTypes.$inferInsert> = {
      updated_at: new Date(),
    };

    // Add fields that are being updated
    if (data.key !== undefined) updateData.key = data.key;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.weight !== undefined) updateData.weight = data.weight.toString();

    // Update document type in database
    const [updatedDocumentType] = await db
      .update(documentTypes)
      .set(updateData)
      .where(eq(documentTypes.id, typeId))
      .returning();

    if (!updatedDocumentType) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to update document type",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const response: UpdateDocumentTypeResponse = {
      success: true,
      message: "Document type updated successfully",
      data: {
        id: updatedDocumentType.id,
        key: updatedDocumentType.key,
        name: updatedDocumentType.name,
        weight: updatedDocumentType.weight || "1.00",
        created_at: updatedDocumentType.created_at,
        updated_at: updatedDocumentType.updated_at,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating document type:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Document type key already exists",
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