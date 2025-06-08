import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type UpdateTestDisplayOrderRequest,
  type UpdateTestDisplayOrderByIdRequest,
  type UpdateTestDisplayOrderResponse,
  type TestErrorResponse,
  type UpdateTestDisplayOrderDB,
} from "shared-types";

export async function updateTestDisplayOrderHandler(
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
    const { testId } = c.req.param() as UpdateTestDisplayOrderByIdRequest;

    // Get validated data from request (already validated by zValidator)
    const data = (await c.req.json()) as UpdateTestDisplayOrderRequest;

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
            message: "Only admin users can update test display order",
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
        display_order: tests.display_order,
        status: tests.status,
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

    // Check if display order is actually changing
    if (existingTest.display_order === data.display_order) {
      const response: UpdateTestDisplayOrderResponse = {
        success: true,
        message: `Test '${existingTest.name}' display order is already ${data.display_order}`,
        data: {
          id: existingTest.id,
          name: existingTest.name,
          display_order: existingTest.display_order ?? 0,
          updated_at: new Date(),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    }

    // Prepare update data
    const updateData: UpdateTestDisplayOrderDB = {
      display_order: data.display_order,
      updated_at: new Date(),
      updated_by: auth.user.id,
    };

    // Update test display order in database
    const [updatedTest] = await db
      .update(tests)
      .set(updateData)
      .where(eq(tests.id, testId))
      .returning({
        id: tests.id,
        name: tests.name,
        display_order: tests.display_order,
        updated_at: tests.updated_at,
      });

    if (!updatedTest) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Failed to update test display order",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const response: UpdateTestDisplayOrderResponse = {
      success: true,
      message: `Test '${updatedTest.name}' display order updated from ${existingTest.display_order ?? 0} to ${updatedTest.display_order ?? 0}`,
      data: {
        id: updatedTest.id,
        name: updatedTest.name,
        display_order: updatedTest.display_order ?? 0,
        updated_at: updatedTest.updated_at,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Test display order updated by admin ${auth.user.email}: ${updatedTest.name} (${existingTest.display_order ?? 0} → ${updatedTest.display_order ?? 0})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating test display order:", error);

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
              message: "Insufficient permissions to update test display order",
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
              field: "display_order",
              message: "Invalid display order value",
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
