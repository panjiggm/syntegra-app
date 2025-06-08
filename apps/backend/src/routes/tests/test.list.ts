import { Context } from "hono";
import { desc, asc, and, or, sql, count, gte, lte, ilike } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetTestsRequest,
  type GetTestsResponse,
  type TestErrorResponse,
  type TestData,
  type TestPaginationMeta,
} from "shared-types";

export async function getTestsListHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: TestErrorResponse = {
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

    // Get query parameters (already validated by zValidator)
    const rawQuery = c.req.query();
    const query: GetTestsRequest = {
      page: Number(rawQuery.page) || 1,
      limit: Number(rawQuery.limit) || 10,
      search: rawQuery.search,
      module_type: rawQuery.module_type as any,
      category: rawQuery.category as any,
      status: rawQuery.status as any,
      sort_by: (rawQuery.sort_by as any) || "display_order",
      sort_order: (rawQuery.sort_order as any) || "asc",
      time_limit_min: rawQuery.time_limit_min
        ? Number(rawQuery.time_limit_min)
        : undefined,
      time_limit_max: rawQuery.time_limit_max
        ? Number(rawQuery.time_limit_max)
        : undefined,
      total_questions_min: rawQuery.total_questions_min
        ? Number(rawQuery.total_questions_min)
        : undefined,
      total_questions_max: rawQuery.total_questions_max
        ? Number(rawQuery.total_questions_max)
        : undefined,
      created_from: rawQuery.created_from,
      created_to: rawQuery.created_to,
    };

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Build WHERE conditions
    const conditions = [];

    // Search condition
    if (query.search) {
      conditions.push(
        or(
          ilike(tests.name, `%${query.search}%`),
          ilike(tests.description, `%${query.search}%`)
        )
      );
    }

    // Filter conditions
    if (query.module_type) {
      conditions.push(sql`${tests.module_type} = ${query.module_type}`);
    }

    if (query.category) {
      conditions.push(sql`${tests.category} = ${query.category}`);
    }

    if (query.status) {
      conditions.push(sql`${tests.status} = ${query.status}`);
    }

    // Time limit range filters
    if (query.time_limit_min !== undefined) {
      conditions.push(gte(tests.time_limit, query.time_limit_min));
    }

    if (query.time_limit_max !== undefined) {
      conditions.push(lte(tests.time_limit, query.time_limit_max));
    }

    // Total questions range filters
    if (query.total_questions_min !== undefined) {
      conditions.push(gte(tests.total_questions, query.total_questions_min));
    }

    if (query.total_questions_max !== undefined) {
      conditions.push(lte(tests.total_questions, query.total_questions_max));
    }

    // Date range filters
    if (query.created_from) {
      conditions.push(gte(tests.created_at, new Date(query.created_from)));
    }

    if (query.created_to) {
      conditions.push(lte(tests.created_at, new Date(query.created_to)));
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build ORDER BY clause
    const sortColumn = (() => {
      switch (query.sort_by) {
        case "name":
          return tests.name;
        case "category":
          return tests.category;
        case "module_type":
          return tests.module_type;
        case "time_limit":
          return tests.time_limit;
        case "total_questions":
          return tests.total_questions;
        case "display_order":
          return tests.display_order;
        case "created_at":
          return tests.created_at;
        case "updated_at":
          return tests.updated_at;
        default:
          return tests.display_order;
      }
    })();

    const orderBy =
      query.sort_order === "desc" ? desc(sortColumn) : asc(sortColumn);

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Debug logging
    console.log("Pagination debug:", {
      page: query.page,
      limit: query.limit,
      offset: offset,
      pageType: typeof query.page,
      limitType: typeof query.limit,
    });

    // Get total count for pagination
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(tests)
      .where(whereClause);

    // Get tests with pagination
    const testsList = await db
      .select({
        id: tests.id,
        name: tests.name,
        description: tests.description,
        module_type: tests.module_type,
        category: tests.category,
        time_limit: tests.time_limit,
        icon: tests.icon,
        card_color: tests.card_color,
        test_prerequisites: tests.test_prerequisites,
        display_order: tests.display_order,
        subcategory: tests.subcategory,
        total_questions: tests.total_questions,
        passing_score: tests.passing_score,
        status: tests.status,
        instructions: tests.instructions,
        created_at: tests.created_at,
        updated_at: tests.updated_at,
        created_by: tests.created_by,
        updated_by: tests.updated_by,
      })
      .from(tests)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(offset);

    // Debug logging for results
    console.log("Query results debug:", {
      totalCount: totalCount,
      resultCount: testsList.length,
      requestedLimit: query.limit,
      offset: offset,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / query.limit);
    const hasNextPage = query.page < totalPages;
    const hasPrevPage = query.page > 1;

    const paginationMeta: TestPaginationMeta = {
      current_page: query.page,
      per_page: query.limit,
      total: totalCount,
      total_pages: totalPages,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
    };

    // Transform database results to response format
    const transformedTests: TestData[] = testsList.map((test) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      module_type: test.module_type,
      category: test.category,
      time_limit: test.time_limit,
      icon: test.icon,
      card_color: test.card_color,
      test_prerequisites: test.test_prerequisites || [],
      display_order: test.display_order || 0,
      subcategory: test.subcategory || [],
      total_questions: test.total_questions || 0,
      passing_score: test.passing_score ? Number(test.passing_score) : null,
      status: test.status || "active",
      instructions: test.instructions,
      created_at: test.created_at,
      updated_at: test.updated_at,
      created_by: test.created_by,
      updated_by: test.updated_by,
    }));

    // Get filter statistics for frontend (optional)
    const filterStats = await getFilterStats(db, whereClause);

    const response: GetTestsResponse = {
      success: true,
      message: `Retrieved ${testsList.length} test(s) successfully`,
      data: transformedTests,
      meta: paginationMeta,
      filters: filterStats,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting tests list:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: TestErrorResponse = {
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
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid query parameters",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Failed to retrieve tests",
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

// Helper function to get filter statistics
async function getFilterStats(db: any, whereClause: any) {
  try {
    // Get time limit range
    const [timeLimitStats] = await db
      .select({
        min: sql<number>`MIN(${tests.time_limit})`,
        max: sql<number>`MAX(${tests.time_limit})`,
      })
      .from(tests)
      .where(whereClause);

    // Get questions count range
    const [questionsStats] = await db
      .select({
        min: sql<number>`MIN(${tests.total_questions})`,
        max: sql<number>`MAX(${tests.total_questions})`,
      })
      .from(tests)
      .where(whereClause);

    // Get unique values for filter dropdowns
    const moduleTypes = await db
      .selectDistinct({ module_type: tests.module_type })
      .from(tests)
      .where(whereClause);

    const categories = await db
      .selectDistinct({ category: tests.category })
      .from(tests)
      .where(whereClause);

    const statuses = await db
      .selectDistinct({ status: tests.status })
      .from(tests)
      .where(whereClause);

    return {
      module_types: moduleTypes.map(
        (item: { module_type: string }) => item.module_type
      ),
      categories: categories.map((item: { category: string }) => item.category),
      statuses: statuses.map((item: { status: string }) => item.status),
      time_limit_range: {
        min: timeLimitStats?.min || 0,
        max: timeLimitStats?.max || 0,
      },
      questions_count_range: {
        min: questionsStats?.min || 0,
        max: questionsStats?.max || 0,
      },
    };
  } catch (error) {
    console.error("Error getting filter stats:", error);
    return undefined;
  }
}
