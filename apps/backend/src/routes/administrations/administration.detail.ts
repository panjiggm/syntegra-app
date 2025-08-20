import { type Context } from "hono";
import { eq, sql, and } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import { users, administrationDocuments, documentTypes } from "@/db/schema";
import { type ErrorResponse } from "shared-types";
import { getDbFromEnv } from "@/db";

export const getAdministrationDetailHandler = async (
  c: Context<{ Bindings: CloudflareBindings }>
) => {
  try {
    const userId = c.req.param("userId");

    if (!userId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User ID is required",
        errors: [
          {
            field: "userId",
            message: "User ID parameter is required",
            code: "MISSING_PARAMETER",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const db = getDbFromEnv(c.env);

    // Check if user exists and is a participant
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "userId",
            message: "User with the specified ID does not exist",
            code: "USER_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    if (user[0].role !== "participant") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Only participant users have administration documents",
        errors: [
          {
            field: "userId",
            message:
              "User must be a participant to have administration documents",
            code: "INVALID_USER_ROLE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get all document types with their upload status for this user
    const documentDetails = await db
      .select({
        document_type_id: documentTypes.id,
        document_type_key: documentTypes.key,
        document_type_name: documentTypes.name,
        document_type_weight: documentTypes.weight,
        document_id: administrationDocuments.id,
        score: administrationDocuments.score,
        file_url: administrationDocuments.file_url,
        uploaded_at: administrationDocuments.uploaded_at,
        is_uploaded: sql<boolean>`CASE WHEN ${administrationDocuments.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(documentTypes)
      .leftJoin(
        administrationDocuments,
        and(
          eq(documentTypes.id, administrationDocuments.document_type_id),
          eq(administrationDocuments.user_id, userId)
        )
      )
      .orderBy(documentTypes.name);

    return c.json({
      success: true,
      message: "Administration detail retrieved successfully",
      data: {
        user: user[0],
        documents: documentDetails,
        summary: {
          total_document_types: documentDetails.length,
          uploaded_count: documentDetails.filter((d) => d.is_uploaded).length,
          pending_count: documentDetails.filter((d) => !d.is_uploaded).length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching administration detail:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to fetch administration detail",
      ...(c.env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "DATABASE_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
};
