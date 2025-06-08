import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type CreateTestRequest,
  type CreateTestResponse,
  type TestErrorResponse,
  type CreateTestDB,
  validateCategoryForModuleType,
  getDefaultTimeLimitByCategory,
  getRecommendedCardColorByCategory,
} from "shared-types";

export async function createTestHandler(
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

    // Get validated data from request
    const data = (await c.req.json()) as CreateTestRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can create tests",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Validate category matches module type
    if (!validateCategoryForModuleType(data.category, data.module_type)) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid category for module type",
        errors: [
          {
            field: "category",
            message: `Category '${data.category}' is not valid for module type '${data.module_type}'`,
            code: "INVALID_CATEGORY_MODULE_COMBINATION",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if test name already exists
    const existingTest = await db
      .select({
        id: tests.id,
        name: tests.name,
      })
      .from(tests)
      .where(eq(tests.name, data.name))
      .limit(1);

    if (existingTest.length > 0) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Test with this name already exists",
        errors: [
          {
            field: "name",
            message: "Test name must be unique",
            code: "UNIQUE_CONSTRAINT",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Validate prerequisites exist if provided
    if (data.test_prerequisites && data.test_prerequisites.length > 0) {
      const prerequisiteTests = await db
        .select({ id: tests.id, status: tests.status })
        .from(tests)
        .where(eq(tests.status, "active"));

      const existingPrerequisiteIds = prerequisiteTests.map((test) => test.id);
      const invalidPrerequisites = data.test_prerequisites.filter(
        (prereqId) => !existingPrerequisiteIds.includes(prereqId)
      );

      if (invalidPrerequisites.length > 0) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid prerequisite test IDs",
          errors: [
            {
              field: "test_prerequisites",
              message: `The following test IDs do not exist or are not active: ${invalidPrerequisites.join(", ")}`,
              code: "INVALID_PREREQUISITES",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Apply defaults if not provided
    const timeLimit =
      data.time_limit || getDefaultTimeLimitByCategory(data.category);
    const cardColor =
      data.card_color || getRecommendedCardColorByCategory(data.category);
    const displayOrder = data.display_order ?? 0;
    const totalQuestions = data.total_questions ?? 0;

    // Insert test into database
    const [newTest] = await db
      .insert(tests)
      .values({
        name: data.name,
        description: data.description || null,
        module_type: data.module_type,
        category: data.category,
        time_limit: timeLimit,
        icon: data.icon || null,
        card_color: cardColor,
        test_prerequisites: data.test_prerequisites || null,
        display_order: displayOrder,
        subcategory: data.subcategory || null,
        total_questions: totalQuestions,
        passing_score: data.passing_score ? String(data.passing_score) : null,
        status: data.status || "active",
        instructions: data.instructions || null,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .returning();

    if (!newTest) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Failed to create test",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const responseData = {
      id: newTest.id,
      name: newTest.name,
      description: newTest.description,
      module_type: newTest.module_type,
      category: newTest.category,
      time_limit: newTest.time_limit,
      icon: newTest.icon,
      card_color: newTest.card_color,
      test_prerequisites: newTest.test_prerequisites || [],
      display_order: newTest.display_order ?? 0,
      subcategory: newTest.subcategory || [],
      total_questions: newTest.total_questions ?? 0,
      passing_score: newTest.passing_score
        ? Number(newTest.passing_score)
        : null,
      status: newTest.status ?? "active",
      instructions: newTest.instructions,
      created_at: newTest.created_at,
      updated_at: newTest.updated_at,
      created_by: newTest.created_by,
      updated_by: newTest.updated_by,
    };

    const response: CreateTestResponse = {
      success: true,
      message: `Test '${newTest.name}' created successfully`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Test created by admin ${auth.user.email}: ${newTest.name} (${newTest.category})`
    );

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating test:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes("unique constraint")) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Test with this name already exists",
          errors: [
            {
              field: "name",
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
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid JSON in prerequisite or subcategory fields
      if (error.message.includes("JSON") || error.message.includes("json")) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid JSON data in request",
          errors: [
            {
              message: "Prerequisites or subcategories contain invalid data",
              code: "INVALID_JSON",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle foreign key constraint errors (prerequisites)
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid prerequisite test references",
          errors: [
            {
              field: "test_prerequisites",
              message: "One or more prerequisite test IDs are invalid",
              code: "FOREIGN_KEY_CONSTRAINT",
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
