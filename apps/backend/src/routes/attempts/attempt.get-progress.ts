import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests, testSessions } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetAttemptProgressResponse,
  type AttemptErrorResponse,
  getAttemptTimeRemaining,
  calculateAttemptProgress,
  calculateTimeEfficiency,
  estimateCompletionTime,
  canContinueAttempt,
  isAttemptExpired,
  isAttemptNearlyExpired,
} from "shared-types";

export async function getAttemptProgressHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();

    // Get attempt with related test and session data
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
      const errorResponse: AttemptErrorResponse = {
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

    // Authorization check - participants can only view their own attempts, admins can view all
    if (user.role === "participant" && attempt.user_id !== user.id) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "attempt_access",
            message: "You can only view your own test attempt progress",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Calculate all progress metrics
    const timeRemaining = getAttemptTimeRemaining({
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const progressPercentage = calculateAttemptProgress({
      questions_answered: attempt.questions_answered || 0,
      total_questions: attempt.total_questions || 0,
    });

    const timeEfficiency = calculateTimeEfficiency({
      time_spent: attempt.time_spent,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const estimatedCompletion = estimateCompletionTime({
      questions_answered: attempt.questions_answered || 0,
      total_questions: attempt.total_questions || 0,
      time_spent: attempt.time_spent,
      start_time: attempt.start_time,
    });

    const canContinue = canContinueAttempt({
      status: attempt.status,
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const isExpired = isAttemptExpired({
      status: attempt.status,
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const isNearlyExpired = isAttemptNearlyExpired({
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    // Calculate completion rate (percentage of questions answered)
    const completionRate =
      (attempt.total_questions || 0) > 0
        ? Math.round(
            ((attempt.questions_answered || 0) /
              (attempt.total_questions || 0)) *
              100
          )
        : 0;

    // If attempt is expired but not marked as such, we should note this
    // but not update it here (that should be done by the update endpoint)
    let currentStatus = attempt.status;
    if (isExpired && attempt.status !== "expired") {
      // In a real scenario, you might want to trigger an update here
      // or add a flag to indicate the status should be updated
      console.log(
        `Attempt ${attemptId} appears to be expired but status is ${attempt.status}`
      );
    }

    const progressData = {
      attempt_id: attempt.id,
      status: currentStatus,
      start_time: attempt.start_time,
      time_spent: attempt.time_spent,
      time_remaining: timeRemaining,
      time_limit: test.time_limit || 0,
      questions_answered: attempt.questions_answered || 0,
      total_questions: attempt.total_questions || 0,
      progress_percentage: progressPercentage,
      completion_rate: completionRate,
      time_efficiency: timeEfficiency,
      can_continue: canContinue,
      is_expired: isExpired,
      is_nearly_expired: isNearlyExpired,
      estimated_completion_time: estimatedCompletion ?? undefined,
      test: {
        id: test.id,
        name: test.name,
        category: test.category,
        module_type: test.module_type,
        time_limit: test.time_limit || 0,
        total_questions: test.total_questions || 0,
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

    const response: GetAttemptProgressResponse = {
      success: true,
      message: "Attempt progress retrieved successfully",
      data: progressData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting attempt progress:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to retrieve attempt progress",
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
