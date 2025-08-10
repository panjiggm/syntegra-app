import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, documentTypes, administrationDocuments, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import { z } from "zod";

// Request schema for deleting document types
export const DeleteDocumentTypeByIdRequestSchema = z.object({
  typeId: z.string().uuid("Document type ID must be a valid UUID"),
});

export type DeleteDocumentTypeResponse = {
  success: true;
  message: string;
  data: {
    id: string;
    key: string;
    name: string;
    deleted_at: string;
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

export async function deleteDocumentTypeHandler(
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
            message: "Only admin users can delete document types",
            code: "ADMIN_REQUIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Check if document type exists
    const [existingDocumentType] = await db
      .select({
        id: documentTypes.id,
        key: documentTypes.key,
        name: documentTypes.name,
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

    // Check if document type is being used in administration documents
    const [documentsUsingType] = await db
      .select({ count: administrationDocuments.id })
      .from(administrationDocuments)
      .where(eq(administrationDocuments.document_type_id, typeId))
      .limit(1);

    if (documentsUsingType) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Cannot delete document type",
        errors: [
          {
            field: "document_type_usage",
            message:
              "This document type is currently being used by administration documents and cannot be deleted",
            code: "DOCUMENT_TYPE_IN_USE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Perform hard delete (since there's no soft delete field in the schema)
    const deletedAt = new Date();
    const [deletedDocumentType] = await db
      .delete(documentTypes)
      .where(eq(documentTypes.id, typeId))
      .returning({
        id: documentTypes.id,
        key: documentTypes.key,
        name: documentTypes.name,
      });

    if (!deletedDocumentType) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to delete document type",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const response: DeleteDocumentTypeResponse = {
      success: true,
      message: `Document type "${deletedDocumentType.name}" has been successfully deleted`,
      data: {
        id: deletedDocumentType.id,
        key: deletedDocumentType.key,
        name: deletedDocumentType.name,
        deleted_at: deletedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error deleting document type:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
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

      // Handle foreign key constraint violations
      if (
        error.message.includes("constraint") ||
        error.message.includes("foreign key")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Cannot delete document type due to database constraints",
          errors: [
            {
              field: "constraints",
              message:
                "Document type cannot be deleted because it is referenced by administration documents",
              code: "FOREIGN_KEY_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
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