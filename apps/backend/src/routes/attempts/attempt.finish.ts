import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  testAttempts,
  tests,
  testSessions,
  sessionModules,
  testResults,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type FinishTestAttemptRequest,
  type FinishTestAttemptResponse,
  type AttemptErrorResponse,
  calculateAttemptProgress,
  isAttemptExpired,
} from "shared-types";

export async function finishTestAttemptHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();
    const requestData: FinishTestAttemptRequest = await c.req.json();

    // Get current attempt with related test and session data
    const attemptResult = await db
      .select({
        attempt: testAttempts,
        test: tests,
        session: testSessions,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(
        and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.user_id, user.id) // Ensure user can only finish their own attempts
        )
      )
      .limit(1);

    if (attemptResult.length === 0) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Test attempt not found",
        errors: [
          {
            field: "attempt_id",
            message:
              "Test attempt with the provided ID does not exist or you don't have access to it",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const { attempt, test, session } = attemptResult[0];

    if (!test) {
      const errorResponse: AttemptErrorResponse = {
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

    // Check if attempt is already finished
    if (
      attempt.status === "completed" ||
      attempt.status === "expired" ||
      attempt.status === "abandoned"
    ) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Test attempt is already finished",
        errors: [
          {
            field: "attempt_status",
            message: `Attempt is already ${attempt.status}`,
            code: "ATTEMPT_ALREADY_FINISHED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Determine final status based on completion type and validation
    let finalStatus = requestData.completion_type;

    // Auto-detect if time expired
    const isExpired = isAttemptExpired({
      status: attempt.status,
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    if (isExpired && finalStatus === "completed") {
      finalStatus = "expired"; // Override to expired if time limit exceeded
    }

    const now = new Date();

    // Calculate completion percentage
    const completionPercentage =
      (test.total_questions || 0) > 0
        ? Math.round(
            (requestData.questions_answered / (test.total_questions || 1)) * 100
          )
        : 100;

    // Update the attempt
    const updateData = {
      status: finalStatus,
      actual_end_time: now,
      time_spent: requestData.time_spent,
      questions_answered: requestData.questions_answered,
      browser_info: requestData.final_browser_info || attempt.browser_info,
      updated_at: now,
    };

    const [updatedAttempt] = await db
      .update(testAttempts)
      .set(updateData)
      .where(eq(testAttempts.id, attemptId))
      .returning();

    // Check if a test result already exists for this attempt
    const existingResult = await db
      .select()
      .from(testResults)
      .where(eq(testResults.attempt_id, attemptId))
      .limit(1);

    let testResult = null;

    // Create or update test result if attempt was completed
    if (finalStatus === "completed" && existingResult.length === 0) {
      // Basic result calculation (in a real system, this would be more sophisticated)
      const rawScore =
        (test.total_questions || 0) > 0
          ? (requestData.questions_answered / (test.total_questions || 1)) * 100
          : 0;

      const resultData = {
        attempt_id: attemptId,
        user_id: user.id,
        test_id: test.id,
        session_result_id: null, // Will be set when session results are calculated
        raw_score: rawScore.toString(),
        scaled_score: rawScore.toString(), // For now, same as raw score
        percentile: null, // Would need more data to calculate
        grade:
          rawScore >= 80
            ? "A"
            : rawScore >= 70
              ? "B"
              : rawScore >= 60
                ? "C"
                : rawScore >= 50
                  ? "D"
                  : "E",
        traits: null, // Would be calculated based on test type and answers
        trait_names: null,
        description: `Test completed with ${completionPercentage}% completion rate`,
        recommendations: null,
        detailed_analysis: null,
        is_passed: test.passing_score
          ? rawScore >= parseFloat(test.passing_score)
          : rawScore >= 60,
        completion_percentage: completionPercentage.toString(),
        calculated_at: now,
        created_at: now,
        updated_at: now,
      };

      const [newResult] = await db
        .insert(testResults)
        .values(resultData)
        .returning();

      testResult = {
        id: newResult.id,
        raw_score: parseFloat(newResult.raw_score || "0"),
        scaled_score: parseFloat(newResult.scaled_score || "0"),
        percentile: newResult.percentile
          ? parseFloat(newResult.percentile)
          : null,
        grade: newResult.grade,
        is_passed: newResult.is_passed,
        completion_percentage: parseFloat(
          newResult.completion_percentage || "0"
        ),
        calculated_at: newResult.calculated_at,
      };
    } else if (existingResult.length > 0) {
      const existing = existingResult[0];
      testResult = {
        id: existing.id,
        raw_score: parseFloat(existing.raw_score || "0"),
        scaled_score: parseFloat(existing.scaled_score || "0"),
        percentile: existing.percentile
          ? parseFloat(existing.percentile)
          : null,
        grade: existing.grade,
        is_passed: existing.is_passed,
        completion_percentage: parseFloat(
          existing.completion_percentage || "0"
        ),
        calculated_at: existing.calculated_at,
      };
    }

    // Check for next test in session
    let nextTest = null;
    if (session && finalStatus === "completed") {
      // Get all tests in the session ordered by sequence
      const sessionTests = await db
        .select({
          module: sessionModules,
          test: tests,
        })
        .from(sessionModules)
        .leftJoin(tests, eq(sessionModules.test_id, tests.id))
        .where(eq(sessionModules.session_id, session.id))
        .orderBy(sessionModules.sequence);

      // Find current test position and get next test
      const currentTestIndex = sessionTests.findIndex(
        (st) => st.test?.id === test.id
      );
      if (currentTestIndex >= 0 && currentTestIndex < sessionTests.length - 1) {
        const nextSessionTest = sessionTests[currentTestIndex + 1];
        if (nextSessionTest.test) {
          nextTest = {
            id: nextSessionTest.test.id,
            name: nextSessionTest.test.name,
            category: nextSessionTest.test.category,
            module_type: nextSessionTest.test.module_type,
            sequence: nextSessionTest.module.sequence,
          };
        }
      }
    }

    // Calculate final computed fields
    const timeRemaining = 0; // No time remaining after finishing
    const progressPercentage = calculateAttemptProgress({
      questions_answered: updatedAttempt.questions_answered || 0,
      total_questions: updatedAttempt.total_questions || 0,
    });

    const response: FinishTestAttemptResponse = {
      success: true,
      message: `Test attempt ${finalStatus} successfully`,
      data: {
        attempt: {
          id: updatedAttempt.id,
          user_id: updatedAttempt.user_id,
          test_id: updatedAttempt.test_id,
          session_test_id: updatedAttempt.session_test_id,
          start_time: updatedAttempt.start_time,
          end_time: updatedAttempt.end_time,
          actual_end_time: updatedAttempt.actual_end_time,
          status: updatedAttempt.status,
          ip_address: updatedAttempt.ip_address,
          user_agent: updatedAttempt.user_agent,
          browser_info:
            (updatedAttempt.browser_info as Record<string, any>) || null,
          attempt_number: updatedAttempt.attempt_number || 0,
          time_spent: updatedAttempt.time_spent,
          questions_answered: updatedAttempt.questions_answered || 0,
          total_questions: updatedAttempt.total_questions || 0,
          created_at: updatedAttempt.created_at,
          updated_at: updatedAttempt.updated_at,
          test: {
            id: test.id,
            name: test.name,
            category: test.category,
            module_type: test.module_type,
            time_limit: test.time_limit || 0,
            total_questions: test.total_questions || 0,
            icon: test.icon,
            card_color: test.card_color,
            instructions: test.instructions,
          },
          session: session
            ? {
                id: session.id,
                session_name: session.session_name,
                session_code: session.session_code,
                target_position: session.target_position || "",
              }
            : null,
          time_remaining: timeRemaining,
          progress_percentage: progressPercentage,
          can_continue: false,
          is_expired: finalStatus === "expired",
        },
        result: testResult || undefined,
        next_test: nextTest,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error finishing test attempt:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to finish test attempt",
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
