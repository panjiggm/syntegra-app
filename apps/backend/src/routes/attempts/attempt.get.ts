import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests, testSessions } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetTestAttemptResponse,
  type AttemptErrorResponse,
  getAttemptTimeRemaining,
  calculateAttemptProgress,
  canContinueAttempt,
  isAttemptExpired,
} from "shared-types";

export async function getTestAttemptHandler(
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
      .where(
        and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.user_id, user.id) // Ensure user can only access their own attempts
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

    // Calculate computed fields
    const timeRemaining = getAttemptTimeRemaining({
      end_time: attempt.end_time,
      start_time: attempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const progressPercentage = calculateAttemptProgress({
      questions_answered: attempt.questions_answered || 0,
      total_questions: attempt.total_questions || 0,
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

    // If attempt is expired but not marked as such, update it
    if (isExpired && attempt.status !== "expired") {
      await db
        .update(testAttempts)
        .set({
          status: "expired",
          actual_end_time: new Date(),
          updated_at: new Date(),
        })
        .where(eq(testAttempts.id, attemptId));

      attempt.status = "expired";
      attempt.actual_end_time = new Date();
    }

    const response: GetTestAttemptResponse = {
      success: true,
      message: "Test attempt retrieved successfully",
      data: {
        id: attempt.id,
        user_id: attempt.user_id,
        test_id: attempt.test_id,
        session_test_id: attempt.session_test_id,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        actual_end_time: attempt.actual_end_time,
        status: attempt.status,
        ip_address: attempt.ip_address,
        user_agent: attempt.user_agent,
        browser_info: (attempt.browser_info as Record<string, any>) || null,
        attempt_number: attempt.attempt_number || 0,
        time_spent: attempt.time_spent,
        questions_answered: attempt.questions_answered || 0,
        total_questions: attempt.total_questions || 0,
        created_at: attempt.created_at,
        updated_at: attempt.updated_at,
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
        can_continue: canContinue,
        is_expired: isExpired,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test attempt:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to retrieve test attempt",
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
