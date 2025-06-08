import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests, testSessions } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type UpdateTestAttemptRequest,
  type UpdateTestAttemptResponse,
  type AttemptErrorResponse,
  getAttemptTimeRemaining,
  calculateAttemptProgress,
  canContinueAttempt,
  isAttemptExpired,
} from "shared-types";

export async function updateTestAttemptHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();
    const requestData: UpdateTestAttemptRequest = await c.req.json();

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
          eq(testAttempts.user_id, user.id) // Ensure user can only update their own attempts
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

    // Check if attempt can still be updated
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

    if (
      isExpired ||
      attempt.status === "completed" ||
      attempt.status === "expired"
    ) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Cannot update completed or expired attempt",
        errors: [
          {
            field: "attempt_status",
            message: "This attempt is no longer active and cannot be updated",
            code: "ATTEMPT_NOT_ACTIVE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate status transition if status is being updated
    if (requestData.status) {
      const currentStatus = attempt.status;
      const newStatus = requestData.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        started: ["in_progress", "abandoned", "expired"],
        in_progress: ["completed", "abandoned", "expired"],
        // completed, abandoned, expired are final states
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        const errorResponse: AttemptErrorResponse = {
          success: false,
          message: "Invalid status transition",
          errors: [
            {
              field: "status",
              message: `Cannot transition from ${currentStatus} to ${newStatus}`,
              code: "INVALID_STATUS_TRANSITION",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (requestData.status) {
      updateData.status = requestData.status;

      // If marking as in_progress for the first time, no special handling needed
      // The status change itself indicates the user has started actively taking the test
    }

    if (requestData.questions_answered !== undefined) {
      // Validate questions_answered doesn't exceed total_questions
      if (
        test.total_questions &&
        requestData.questions_answered > test.total_questions
      ) {
        const errorResponse: AttemptErrorResponse = {
          success: false,
          message: "Questions answered cannot exceed total questions",
          errors: [
            {
              field: "questions_answered",
              message: `Questions answered (${requestData.questions_answered}) cannot exceed total questions (${test.total_questions})`,
              code: "INVALID_PROGRESS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
      updateData.questions_answered = requestData.questions_answered;
    }

    if (requestData.time_spent !== undefined) {
      updateData.time_spent = requestData.time_spent;
    }

    if (requestData.browser_info) {
      updateData.browser_info = requestData.browser_info;
    }

    // Update the attempt
    const [updatedAttempt] = await db
      .update(testAttempts)
      .set(updateData)
      .where(eq(testAttempts.id, attemptId))
      .returning();

    // Calculate computed fields for response
    const timeRemaining = getAttemptTimeRemaining({
      end_time: updatedAttempt.end_time,
      start_time: updatedAttempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const progressPercentage = calculateAttemptProgress({
      questions_answered: updatedAttempt.questions_answered || 0,
      total_questions: updatedAttempt.total_questions || 0,
    });

    const updatedCanContinue = canContinueAttempt({
      status: updatedAttempt.status,
      end_time: updatedAttempt.end_time,
      start_time: updatedAttempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const updatedIsExpired = isAttemptExpired({
      status: updatedAttempt.status,
      end_time: updatedAttempt.end_time,
      start_time: updatedAttempt.start_time,
      test: { time_limit: test.time_limit || 0 },
    });

    const response: UpdateTestAttemptResponse = {
      success: true,
      message: "Test attempt updated successfully",
      data: {
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
        can_continue: updatedCanContinue,
        is_expired: updatedIsExpired,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating test attempt:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to update test attempt",
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
