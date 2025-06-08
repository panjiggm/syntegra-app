import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  testResults,
  testAttempts,
  tests,
  users,
  testSessions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetResultByAttemptIdResponse,
  type TestResultErrorResponse,
} from "shared-types";

export async function getResultByAttemptIdHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { attemptId } = c.req.param();

    // Get attempt details first to check authorization
    const attemptResult = await db
      .select({
        attempt: testAttempts,
        test: tests,
        session: testSessions,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (attemptResult.length === 0) {
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

    const { attempt, test, session } = attemptResult[0];

    if (!test) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Associated test not found",
        errors: [
          {
            field: "test_data",
            message: "Test data is missing",
            code: "DATA_INTEGRITY_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Authorization check - participants can only view their own results, admins can view all
    if (
      currentUser.role === "participant" &&
      attempt.user_id !== currentUser.id
    ) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "result_access",
            message: "You can only view your own test results",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get test result with related data
    const resultQuery = await db
      .select({
        result: testResults,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          nik: users.nik || "",
        },
      })
      .from(testResults)
      .leftJoin(users, eq(testResults.user_id, users.id))
      .where(eq(testResults.attempt_id, attemptId))
      .limit(1);

    // If no result found, return null (attempt exists but no result calculated yet)
    if (resultQuery.length === 0) {
      const response: GetResultByAttemptIdResponse = {
        success: true,
        message:
          "No test result found for this attempt. Result may not be calculated yet.",
        data: null,
        timestamp: new Date().toISOString(),
      };
      return c.json(response, 200);
    }

    const { result, user } = resultQuery[0];

    if (!user) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Associated user not found",
        errors: [
          {
            field: "user_data",
            message: "User data is missing",
            code: "DATA_INTEGRITY_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Parse traits data if exists
    let parsedTraits = null;
    if (result.traits) {
      try {
        parsedTraits = Array.isArray(result.traits)
          ? result.traits
          : typeof result.traits === "string"
            ? JSON.parse(result.traits)
            : result.traits;
      } catch (error) {
        console.warn("Failed to parse traits data:", error);
        parsedTraits = null;
      }
    }

    // Parse detailed analysis if exists
    let parsedDetailedAnalysis = null;
    if (result.detailed_analysis) {
      try {
        parsedDetailedAnalysis =
          typeof result.detailed_analysis === "string"
            ? JSON.parse(result.detailed_analysis)
            : result.detailed_analysis;
      } catch (error) {
        console.warn("Failed to parse detailed analysis:", error);
        parsedDetailedAnalysis = null;
      }
    }

    // Build response data
    const testResultData = {
      id: result.id,
      attempt_id: result.attempt_id,
      user_id: result.user_id,
      test_id: result.test_id,
      session_result_id: result.session_result_id,
      raw_score: result.raw_score ? parseFloat(result.raw_score) : null,
      scaled_score: result.scaled_score
        ? parseFloat(result.scaled_score)
        : null,
      percentile: result.percentile ? parseFloat(result.percentile) : null,
      grade: result.grade,
      traits: parsedTraits,
      trait_names: Array.isArray(result.trait_names)
        ? result.trait_names
        : null,
      description: result.description,
      recommendations: result.recommendations,
      detailed_analysis: parsedDetailedAnalysis,
      is_passed: result.is_passed,
      completion_percentage: parseFloat(result.completion_percentage || "0"),
      calculated_at: result.calculated_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        nik: user.nik || "",
      },
      test: {
        id: test.id,
        name: test.name,
        category: test.category,
        module_type: test.module_type,
        time_limit: test.time_limit || 0,
        total_questions: test.total_questions || 0,
        passing_score: test.passing_score
          ? parseFloat(test.passing_score)
          : null,
      },
      attempt: {
        id: attempt.id,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        actual_end_time: attempt.actual_end_time,
        status: attempt.status,
        time_spent: attempt.time_spent,
        questions_answered: attempt.questions_answered || 0,
      },
      session: session
        ? {
            id: session.id,
            session_name: session.session_name,
            session_code: session.session_code,
            target_position: session.target_position || "",
          }
        : null,
    };

    const response: GetResultByAttemptIdResponse = {
      success: true,
      message: "Test result retrieved successfully",
      data: testResultData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test result by attempt ID:", error);

    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Failed to retrieve test result",
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
