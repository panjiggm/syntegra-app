import { Context } from "hono";
import { eq, inArray } from "drizzle-orm";
import { getDbFromEnv, tests, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import { type GetTestByIdRequest, type TestErrorResponse } from "shared-types";

// Response schema for prerequisites
export interface TestPrerequisite {
  id: string;
  name: string;
  category: string;
  module_type: string;
  time_limit: number;
  total_questions: number;
  status: string;
  is_completed?: boolean; // Untuk track status completion peserta
  completion_required: boolean; // Apakah wajib diselesaikan
}

export interface GetTestPrerequisitesResponse {
  success: true;
  message: string;
  data: {
    test: {
      id: string;
      name: string;
      category: string;
      module_type: string;
    };
    prerequisites: TestPrerequisite[];
    has_prerequisites: boolean;
    total_prerequisites: number;
    prerequisite_completion_required: boolean; // Apakah semua prerequisite wajib selesai
  };
  timestamp: string;
}

export async function getTestPrerequisitesHandler(
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

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can access test prerequisites",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find test by ID
    const [targetTest] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        module_type: tests.module_type,
        test_prerequisites: tests.test_prerequisites,
        status: tests.status,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    // Check if test exists
    if (!targetTest) {
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

    // Initialize response data
    const responseData = {
      test: {
        id: targetTest.id,
        name: targetTest.name,
        category: targetTest.category,
        module_type: targetTest.module_type,
      },
      prerequisites: [] as TestPrerequisite[],
      has_prerequisites: false,
      total_prerequisites: 0,
      prerequisite_completion_required: true, // Default: semua prerequisite wajib selesai
    };

    // Check if test has prerequisites
    if (
      targetTest.test_prerequisites &&
      targetTest.test_prerequisites.length > 0
    ) {
      // Get prerequisite tests details
      const prerequisiteTests = await db
        .select({
          id: tests.id,
          name: tests.name,
          category: tests.category,
          module_type: tests.module_type,
          time_limit: tests.time_limit,
          total_questions: tests.total_questions,
          status: tests.status,
        })
        .from(tests)
        .where(inArray(tests.id, targetTest.test_prerequisites))
        .orderBy(tests.display_order, tests.name);

      // Check for missing prerequisites
      const foundIds = prerequisiteTests.map((test) => test.id);
      const missingIds = targetTest.test_prerequisites.filter(
        (id) => !foundIds.includes(id)
      );

      if (missingIds.length > 0) {
        console.warn(
          `⚠️ Test ${targetTest.name} has missing prerequisites: ${missingIds.join(", ")}`
        );
      }

      // Build prerequisites response
      responseData.prerequisites = prerequisiteTests.map((prereqTest) => ({
        id: prereqTest.id,
        name: prereqTest.name,
        category: prereqTest.category,
        module_type: prereqTest.module_type,
        time_limit: prereqTest.time_limit,
        total_questions: prereqTest.total_questions || 0,
        status: prereqTest.status || "active",
        completion_required: true, // Semua prerequisite wajib diselesaikan
      }));

      responseData.has_prerequisites = true;
      responseData.total_prerequisites = prerequisiteTests.length;

      // Log untuk debugging
      console.log(
        `📋 Prerequisites for test '${targetTest.name}':`,
        prerequisiteTests.map((p) => `${p.name} (${p.category})`).join(", ")
      );
    }

    const response: GetTestPrerequisitesResponse = {
      success: true,
      message: responseData.has_prerequisites
        ? `Test '${targetTest.name}' has ${responseData.total_prerequisites} prerequisite(s)`
        : `Test '${targetTest.name}' has no prerequisites`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Prerequisites retrieved for test ${targetTest.name} by admin: ${auth.user.email}`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test prerequisites:", error);

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
      message: "Failed to retrieve test prerequisites",
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
