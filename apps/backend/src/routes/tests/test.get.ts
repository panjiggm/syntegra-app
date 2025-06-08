import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type GetTestByIdRequest,
  type GetTestByIdResponse,
  type TestErrorResponse,
  type TestData,
} from "shared-types";

export async function getTestByIdHandler(
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

    // Get path parameters (already validated by zValidator)
    const { testId } = c.req.param() as GetTestByIdRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Find test by ID
    const [test] = await db
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
      .where(eq(tests.id, testId))
      .limit(1);

    // Check if test exists
    if (!test) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "testId",
            message: `Test with ID "${testId}" not found`,
            code: "TEST_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Transform database result to response format
    const testData: TestData = {
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
    };

    const response: GetTestByIdResponse = {
      success: true,
      message: "Test retrieved successfully",
      data: testData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test by ID:", error);

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

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid test ID format",
          errors: [
            {
              field: "testId",
              message: "Test ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Failed to retrieve test",
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
