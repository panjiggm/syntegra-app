import { Context } from "hono";
import { eq, or, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  questions,
  testAttempts,
  testResults,
  sessionModules,
  isDatabaseConfigured,
} from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  type DeleteTestByIdRequest,
  type DeleteTestResponse,
  type TestErrorResponse,
} from "shared-types";

export async function deleteTestHandler(
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
    const { testId } = c.req.param() as DeleteTestByIdRequest;

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
            message: "Only admin users can delete tests",
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
        category: tests.category,
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

    // Check if test is already archived (soft deleted)
    if (existingTest.status === "archived") {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Test is already archived",
        errors: [
          {
            field: "status",
            message: "Cannot delete an already archived test",
            code: "ALREADY_ARCHIVED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if test has any dependencies (other tests that depend on this test as prerequisite)
    const dependentTests = await db
      .select({
        id: tests.id,
        name: tests.name,
      })
      .from(tests)
      .where(
        sql`${tests.test_prerequisites}::jsonb @> ${`["${testId}"]`}::jsonb`
      )
      .limit(5); // Limit to 5 for error message

    if (dependentTests.length > 0) {
      const dependentTestNames = dependentTests
        .map((test) => test.name)
        .join(", ");
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Test has dependencies and cannot be deleted",
        errors: [
          {
            field: "dependencies",
            message: `The following tests depend on this test as a prerequisite: ${dependentTestNames}${dependentTests.length === 5 ? " and others" : ""}. Please remove these dependencies first.`,
            code: "HAS_DEPENDENCIES",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if test has any test attempts (users have taken this test)
    const [attemptCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(testAttempts)
      .where(eq(testAttempts.test_id, testId));

    const hasAttempts = attemptCount && attemptCount.count > 0;

    // Check if test is used in any session modules
    const [sessionModuleCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(sessionModules)
      .where(eq(sessionModules.test_id, testId));

    const hasSessionModules =
      sessionModuleCount && sessionModuleCount.count > 0;

    // If test has attempts or is used in sessions, perform soft delete (archive)
    // Otherwise, perform hard delete
    if (hasAttempts || hasSessionModules) {
      console.log(
        `🗂️ Soft deleting test ${existingTest.name} (has ${attemptCount?.count || 0} attempts and ${sessionModuleCount?.count || 0} session modules)`
      );

      // Soft delete: set status to archived
      const [archivedTest] = await db
        .update(tests)
        .set({
          status: "archived",
          updated_at: new Date(),
          updated_by: auth.user.id,
        })
        .where(eq(tests.id, testId))
        .returning({
          id: tests.id,
          name: tests.name,
          category: tests.category,
          updated_at: tests.updated_at,
        });

      if (!archivedTest) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Failed to archive test",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      const response: DeleteTestResponse = {
        success: true,
        message: `Test '${archivedTest.name}' has been archived (soft deleted) because it has existing test attempts or is used in sessions`,
        data: {
          id: archivedTest.id,
          name: archivedTest.name,
          category: archivedTest.category,
          deleted_at: archivedTest.updated_at.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Test archived by admin ${auth.user.email}: ${archivedTest.name} (${archivedTest.category})`
      );

      return c.json(response, 200);
    } else {
      console.log(
        `🗑️ Hard deleting test ${existingTest.name} (no attempts or session modules)`
      );

      // Hard delete: remove test and all related data
      // Start a transaction to ensure data consistency
      const deletedAt = new Date().toISOString();

      // First, delete all questions related to this test
      await db.delete(questions).where(eq(questions.test_id, testId));

      // Then delete the test itself
      const [deletedTest] = await db
        .delete(tests)
        .where(eq(tests.id, testId))
        .returning({
          id: tests.id,
          name: tests.name,
          category: tests.category,
        });

      if (!deletedTest) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Failed to delete test",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      const response: DeleteTestResponse = {
        success: true,
        message: `Test '${deletedTest.name}' has been permanently deleted`,
        data: {
          id: deletedTest.id,
          name: deletedTest.name,
          category: deletedTest.category,
          deleted_at: deletedAt,
        },
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Test permanently deleted by admin ${auth.user.email}: ${deletedTest.name} (${deletedTest.category})`
      );

      return c.json(response, 200);
    }
  } catch (error) {
    console.error("Error deleting test:", error);

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

      // Handle foreign key constraint errors
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Cannot delete test due to existing dependencies",
          errors: [
            {
              field: "dependencies",
              message: "Test has dependent records that prevent deletion",
              code: "FOREIGN_KEY_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

      // Handle transaction errors
      if (error.message.includes("transaction")) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Database transaction failed",
          errors: [
            {
              message: "Failed to complete deletion transaction",
              code: "TRANSACTION_ERROR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
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
