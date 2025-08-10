import { Context } from "hono";
import { and, eq, like, ilike, gte, lte, count, asc, desc } from "drizzle-orm";
import { getDbFromEnv, documentTypes, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import { z } from "zod";

// Query parameters schema for listing document types
export const GetDocumentTypesRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort_by: z.enum(["key", "name", "weight", "max_score", "created_at", "updated_at"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
});

export type GetDocumentTypesRequest = z.infer<typeof GetDocumentTypesRequestSchema>;

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
};

export type GetDocumentTypesResponse = {
  success: true;
  message: string;
  data: Array<{
    id: string;
    key: string;
    name: string;
    weight: string;
    max_score: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  meta: PaginationMeta;
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

export async function listDocumentTypesHandler(
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

    // Get authenticated user (both admin and participant can access)
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authentication",
            message: "User must be authenticated to access this resource",
            code: "UNAUTHORIZED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Get and parse query parameters
    const rawQueryParams = c.req.query();

    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(rawQueryParams.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(rawQueryParams.limit || "10", 10))
    );

    // Parse other parameters
    const queryParams = {
      page,
      limit,
      search: rawQueryParams.search || undefined,
      sort_by: rawQueryParams.sort_by || "created_at",
      sort_order: (rawQueryParams.sort_order as "asc" | "desc") || "desc",
      created_from: rawQueryParams.created_from || undefined,
      created_to: rawQueryParams.created_to || undefined,
    };

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Build where conditions
    const conditions = [];

    // Search functionality - search across key and name
    if (queryParams.search) {
      const searchTerm = `%${queryParams.search}%`;
      conditions.push(
        eq(documentTypes.key, queryParams.search) || // Exact match on key
        ilike(documentTypes.name, searchTerm) || // Partial match on name
        ilike(documentTypes.key, searchTerm) // Partial match on key
      );
    }

    // Date range filters
    if (queryParams.created_from) {
      conditions.push(
        gte(documentTypes.created_at, new Date(queryParams.created_from))
      );
    }

    if (queryParams.created_to) {
      conditions.push(
        lte(documentTypes.created_at, new Date(queryParams.created_to))
      );
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(documentTypes)
      .where(whereClause);

    const total = totalResult.count;

    // Calculate pagination
    const offset = (queryParams.page - 1) * queryParams.limit;
    const totalPages = Math.ceil(total / queryParams.limit);

    // Build sorting
    const validSortColumns = {
      key: documentTypes.key,
      name: documentTypes.name,
      weight: documentTypes.weight,
      max_score: documentTypes.max_score,
      created_at: documentTypes.created_at,
      updated_at: documentTypes.updated_at,
    };

    const sortColumn =
      validSortColumns[queryParams.sort_by as keyof typeof validSortColumns] ||
      documentTypes.created_at;
    const sortDirection = queryParams.sort_order === "asc" ? asc : desc;

    // Get document types with pagination and sorting
    const documentTypesList = await db
      .select({
        id: documentTypes.id,
        key: documentTypes.key,
        name: documentTypes.name,
        weight: documentTypes.weight,
        max_score: documentTypes.max_score,
        created_at: documentTypes.created_at,
        updated_at: documentTypes.updated_at,
      })
      .from(documentTypes)
      .where(whereClause)
      .orderBy(sortDirection(sortColumn))
      .limit(queryParams.limit)
      .offset(offset);

    // Prepare pagination meta
    const meta: PaginationMeta = {
      current_page: queryParams.page,
      per_page: queryParams.limit,
      total: total,
      total_pages: totalPages,
      has_next_page: queryParams.page < totalPages,
      has_prev_page: queryParams.page > 1,
    };

    // Prepare success response
    const response: GetDocumentTypesResponse = {
      success: true,
      message: `Successfully retrieved ${documentTypesList.length} document types`,
      data: documentTypesList.map((docType) => ({
        id: docType.id,
        key: docType.key,
        name: docType.name,
        weight: docType.weight || "1.00",
        max_score: docType.max_score,
        created_at: docType.created_at,
        updated_at: docType.updated_at,
      })),
      meta,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error fetching document types:", error);

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

      // Handle invalid query errors
      if (
        error.message.includes("invalid") ||
        error.message.includes("syntax")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Invalid query parameters",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
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