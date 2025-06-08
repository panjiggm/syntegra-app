import { Context } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type UpdateTestRequest,
  type UpdateTestByIdRequest,
  type UpdateTestResponse,
  type TestErrorResponse,
  type UpdateTestDB,
  validateCategoryForModuleType,
  getDefaultTimeLimitByCategory,
  getRecommendedCardColorByCategory,
} from "shared-types";

export async function updateTestHandler(
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
    const { testId } = c.req.param() as UpdateTestByIdRequest;

    // Get validated data from request (already validated by zValidator)
    const data = (await c.req.json()) as UpdateTestRequest;

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
            message: "Only admin users can update tests",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if test exists first
    const [existingTest] = await db
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

    if (!existingTest) {
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

    // Validate category matches module type if both are being updated
    if (data.category && data.module_type) {
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
    }
    // Validate category with existing module type if only category is being updated
    else if (data.category && !data.module_type) {
      if (
        !validateCategoryForModuleType(data.category, existingTest.module_type)
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid category for existing module type",
          errors: [
            {
              field: "category",
              message: `Category '${data.category}' is not valid for existing module type '${existingTest.module_type}'`,
              code: "INVALID_CATEGORY_MODULE_COMBINATION",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }
    // Validate module type with existing category if only module type is being updated
    else if (data.module_type && !data.category) {
      if (
        !validateCategoryForModuleType(existingTest.category, data.module_type)
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid module type for existing category",
          errors: [
            {
              field: "module_type",
              message: `Module type '${data.module_type}' is not valid for existing category '${existingTest.category}'`,
              code: "INVALID_CATEGORY_MODULE_COMBINATION",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Check if new name already exists (if name is being updated)
    if (data.name && data.name !== existingTest.name) {
      const nameConflict = await db
        .select({
          id: tests.id,
          name: tests.name,
        })
        .from(tests)
        .where(and(eq(tests.name, data.name), ne(tests.id, testId)))
        .limit(1);

      if (nameConflict.length > 0) {
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
    }

    // Validate prerequisites exist if provided
    if (data.test_prerequisites && data.test_prerequisites.length > 0) {
      // Don't allow test to be its own prerequisite
      if (data.test_prerequisites.includes(testId)) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Test cannot be its own prerequisite",
          errors: [
            {
              field: "test_prerequisites",
              message: "Circular prerequisite dependency detected",
              code: "CIRCULAR_DEPENDENCY",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Check if all prerequisite tests exist and are active
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

    // Prepare update data - only include fields that are being updated
    const updateData: UpdateTestDB = {
      updated_at: new Date(),
      updated_by: auth.user.id,
    };

    // Add fields to update if they are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.module_type !== undefined)
      updateData.module_type = data.module_type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.time_limit !== undefined) updateData.time_limit = data.time_limit;
    if (data.icon !== undefined) updateData.icon = data.icon || null;
    if (data.card_color !== undefined)
      updateData.card_color = data.card_color || null;
    if (data.test_prerequisites !== undefined)
      updateData.test_prerequisites = data.test_prerequisites || null;
    if (data.display_order !== undefined)
      updateData.display_order = data.display_order;
    if (data.subcategory !== undefined)
      updateData.subcategory = data.subcategory || null;
    if (data.total_questions !== undefined)
      updateData.total_questions = data.total_questions;
    if (data.passing_score !== undefined)
      updateData.passing_score =
        data.passing_score !== null ? String(data.passing_score) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.instructions !== undefined)
      updateData.instructions = data.instructions || null;

    // Update test in database
    const [updatedTest] = await db
      .update(tests)
      .set(updateData)
      .where(eq(tests.id, testId))
      .returning();

    if (!updatedTest) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Failed to update test",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const responseData = {
      id: updatedTest.id,
      name: updatedTest.name,
      description: updatedTest.description,
      module_type: updatedTest.module_type,
      category: updatedTest.category,
      time_limit: updatedTest.time_limit,
      icon: updatedTest.icon,
      card_color: updatedTest.card_color,
      test_prerequisites: updatedTest.test_prerequisites || [],
      display_order: updatedTest.display_order ?? 0,
      subcategory: updatedTest.subcategory || [],
      total_questions: updatedTest.total_questions ?? 0,
      passing_score: updatedTest.passing_score
        ? Number(updatedTest.passing_score)
        : null,
      status: updatedTest.status ?? "active",
      instructions: updatedTest.instructions,
      created_at: updatedTest.created_at,
      updated_at: updatedTest.updated_at,
      created_by: updatedTest.created_by,
      updated_by: updatedTest.updated_by,
    };

    const response: UpdateTestResponse = {
      success: true,
      message: `Test '${updatedTest.name}' updated successfully`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Test updated by admin ${auth.user.email}: ${updatedTest.name} (${updatedTest.category})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating test:", error);

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

      // Handle permission errors
      if (
        error.message.includes("permission") ||
        error.message.includes("access")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Access denied",
          errors: [
            {
              field: "authorization",
              message: "Insufficient permissions to update test",
              code: "ACCESS_DENIED",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 403);
      }

      // Handle validation errors
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Validation error",
          errors: [
            {
              message: "Request data validation failed",
              code: "VALIDATION_ERROR",
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
