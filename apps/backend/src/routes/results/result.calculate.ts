import { Context } from "hono";
import { eq } from "drizzle-orm";
import {
  getDbFromEnv,
  testResults,
  testAttempts,
  tests,
  users,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type CalculateTestResultRequest,
  type CalculateTestResultResponse,
  type TestResultErrorResponse,
} from "shared-types";
import { calculateComprehensiveResult } from "@/lib/result-calculation";

export async function calculateTestResultHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const auth = c.get("auth");
    const currentUser = auth.user;
    const requestData: CalculateTestResultRequest = await c.req.json();

    // Validate that current user is an admin
    if (currentUser.role !== "admin") {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        errors: [
          {
            field: "user_role",
            message: "Only administrators can calculate test results",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Determine which attempt to calculate
    let attemptId: string;
    if (requestData.attempt_id) {
      attemptId = requestData.attempt_id;
    } else if (requestData.result_id) {
      // Get attempt ID from result ID
      const db = getDbFromEnv(c.env);
      const resultQuery = await db
        .select({ attempt_id: testResults.attempt_id })
        .from(testResults)
        .where(eq(testResults.id, requestData.result_id))
        .limit(1);

      if (resultQuery.length === 0) {
        const errorResponse: TestResultErrorResponse = {
          success: false,
          message: "Test result not found",
          errors: [
            {
              field: "result_id",
              message: "Test result with the provided ID does not exist",
              code: "NOT_FOUND",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 404);
      }

      attemptId = resultQuery[0].attempt_id;
    } else {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Missing required parameters",
        errors: [
          {
            field: "request_data",
            message: "Either attempt_id or result_id is required",
            code: "VALIDATION_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Use the shared calculation function
    const calculationResult = await calculateComprehensiveResult(
      attemptId,
      c.env,
      {
        include_personality_analysis: (requestData.calculation_options as any)?.include_personality_analysis ?? true,
        include_recommendations: (requestData.calculation_options as any)?.include_recommendations ?? true,
        force_recalculate: requestData.force_recalculate ?? false,
      }
    );

    if (!calculationResult.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Failed to calculate test result",
        errors: [
          {
            message: calculationResult.error || "Unknown error occurred",
            code: "CALCULATION_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    const result = calculationResult.result;

    // Get additional data for response
    const db = getDbFromEnv(c.env);
    const attemptData = await db
      .select({
        attempt: testAttempts,
        test: tests,
        user: users,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(users, eq(testAttempts.user_id, users.id))
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (attemptData.length === 0) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Test attempt not found",
        errors: [
          {
            field: "attempt_id",
            message: "Test attempt with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const { attempt, test, user } = attemptData[0];

    // Build response
    const responseData = {
      id: result.id,
      attempt_id: result.attempt_id,
      user_id: result.user_id,
      test_id: result.test_id,
      session_result_id: result.session_result_id,
      raw_score: result.raw_score ? parseFloat(result.raw_score) : null,
      scaled_score: result.scaled_score ? parseFloat(result.scaled_score) : null,
      percentile: result.percentile ? parseFloat(result.percentile) : null,
      grade: result.grade,
      traits: result.traits as any,
      trait_names: result.trait_names as string[] | null,
      description: result.description,
      recommendations: result.recommendations,
      detailed_analysis: result.detailed_analysis as any,
      is_passed: result.is_passed,
      completion_percentage: parseFloat(result.completion_percentage || "0"),
      calculated_at: result.calculated_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      user: {
        id: user?.id || "",
        name: user?.name || "",
        email: user?.email || "",
        nik: user?.nik || "",
      },
      test: {
        id: test?.id || "",
        name: test?.name || "",
        category: test?.category || "",
        module_type: test?.module_type || "",
        time_limit: test?.time_limit || 0,
        total_questions: test?.total_questions || 0,
        passing_score: test?.passing_score
          ? parseFloat(test.passing_score)
          : null,
      },
      attempt: {
        id: attempt?.id || "",
        start_time: attempt?.start_time || null,
        end_time: attempt?.end_time || null,
        actual_end_time: attempt?.actual_end_time || null,
        status: attempt?.status || "",
        time_spent: attempt?.time_spent || 0,
        questions_answered: attempt?.questions_answered || 0,
      },
      session: null, // Will be populated if session data is needed
    };

    const response: CalculateTestResultResponse = {
      success: true,
      message: requestData.force_recalculate
        ? "Test result recalculated successfully"
        : "Test result calculated successfully",
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error calculating test result:", error);

    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Failed to calculate test result",
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          code: "INTERNAL_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

