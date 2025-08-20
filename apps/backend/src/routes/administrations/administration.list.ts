import { type Context } from "hono";
import { eq, count, sql, and, or, ilike, asc, desc } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import { users, administrationDocuments, documentTypes } from "@/db/schema";
import { type ErrorResponse } from "shared-types";
import { getDbFromEnv } from "@/db";

export const getAdministrationListHandler = async (
  c: Context<{ Bindings: CloudflareBindings }>
) => {
  try {
    const db = getDbFromEnv(c.env);

    // Parse query parameters
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "10")));
    const search = c.req.query("search")?.trim() || "";
    const sortBy = c.req.query("sort_by") || "name";
    const sortOrder = c.req.query("sort_order") || "asc";
    const status = c.req.query("status"); // "complete", "partial", "pending"

    const offset = (page - 1) * limit;

    // Build base query conditions
    let whereConditions = eq(users.role, "participant");

    // Add search condition
    if (search) {
      whereConditions = and(
        whereConditions,
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.phone, `%${search}%`)
        )
      );
    }

    // First, get participants with document counts (for status filtering)
    const baseQuery = db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        document_count: sql<number>`CAST(COUNT(DISTINCT ${administrationDocuments.id}) AS INTEGER)`,
        total_document_types: sql<number>`(SELECT COUNT(*) FROM ${documentTypes})`,
      })
      .from(users)
      .leftJoin(
        administrationDocuments,
        eq(users.id, administrationDocuments.user_id)
      )
      .where(whereConditions)
      .groupBy(users.id, users.name, users.phone);

    // Get total count for pagination
    const totalCountQuery = db
      .select({ 
        count: sql<number>`CAST(COUNT(DISTINCT ${users.id}) AS INTEGER)` 
      })
      .from(users)
      .leftJoin(
        administrationDocuments,
        eq(users.id, administrationDocuments.user_id)
      )
      .where(whereConditions);

    const [totalResult] = await totalCountQuery;
    const totalCount = totalResult?.count || 0;

    // Build sort order
    let orderByClause;
    const sortDirection = sortOrder === "desc" ? desc : asc;

    switch (sortBy) {
      case "document_count":
        orderByClause = sortDirection(sql`document_count`);
        break;
      case "phone":
        orderByClause = sortDirection(users.phone);
        break;
      case "name":
      default:
        orderByClause = sortDirection(users.name);
        break;
    }

    // Execute main query with pagination
    const administrationList = await baseQuery
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Apply status filtering after query (since it depends on calculated values)
    let filteredList = administrationList;
    if (status) {
      filteredList = administrationList.filter((item) => {
        const percentage = item.total_document_types > 0 
          ? (item.document_count / item.total_document_types) * 100 
          : 0;
        
        switch (status) {
          case "complete":
            return percentage === 100;
          case "partial":
            return percentage > 0 && percentage < 100;
          case "pending":
            return percentage === 0;
          default:
            return true;
        }
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      success: true,
      message: "Administration list retrieved successfully",
      data: filteredList,
      meta: {
        current_page: page,
        per_page: limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching administration list:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to fetch administration list",
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
