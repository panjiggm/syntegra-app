import { Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import {
  getDbFromEnv,
  testAttempts,
  tests,
  testSessions,
  sessionModules,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type StartTestAttemptRequest,
  type StartTestAttemptResponse,
  type AttemptErrorResponse,
} from "shared-types";

export async function startTestAttemptHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const requestData: StartTestAttemptRequest = await c.req.json();

    // Get test details
    const test = await db
      .select()
      .from(tests)
      .where(eq(tests.id, requestData.test_id))
      .limit(1);

    if (test.length === 0) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "test_id",
            message: "Test with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const testData = test[0];

    // Check if test is active
    if (testData.status !== "active") {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Test is not available",
        errors: [
          {
            field: "test_status",
            message: "Test is not currently active",
            code: "TEST_INACTIVE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    let sessionTestId: string | null = null;
    let sessionData = null;

    // If session code is provided, validate session access
    if (requestData.session_code) {
      const sessionResult = await db
        .select({
          session: testSessions,
          module: sessionModules,
        })
        .from(testSessions)
        .leftJoin(
          sessionModules,
          eq(sessionModules.session_id, testSessions.id)
        )
        .where(
          and(
            eq(testSessions.session_code, requestData.session_code),
            eq(sessionModules.test_id, requestData.test_id)
          )
        )
        .limit(1);

      if (sessionResult.length === 0) {
        const errorResponse: AttemptErrorResponse = {
          success: false,
          message: "Invalid session or test not included in session",
          errors: [
            {
              field: "session_code",
              message:
                "Session code is invalid or test is not part of this session",
              code: "INVALID_SESSION",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      sessionData = sessionResult[0].session;
      sessionTestId = sessionData.id;

      // Check if session is active
      const now = new Date();
      if (
        sessionData.status !== "active" ||
        now < sessionData.start_time ||
        now > sessionData.end_time
      ) {
        const errorResponse: AttemptErrorResponse = {
          success: false,
          message: "Session is not currently active",
          errors: [
            {
              field: "session_status",
              message:
                "Session is not active or outside the allowed time window",
              code: "SESSION_INACTIVE",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Check for existing attempts
    const existingAttempts = await db
      .select()
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.user_id, user.id),
          eq(testAttempts.test_id, requestData.test_id),
          sessionTestId
            ? eq(testAttempts.session_test_id, sessionTestId)
            : undefined
        )
      )
      .orderBy(desc(testAttempts.attempt_number));

    // Check if user has an ongoing attempt
    const ongoingAttempt = existingAttempts.find(
      (attempt) =>
        attempt.status === "started" || attempt.status === "in_progress"
    );

    if (ongoingAttempt) {
      // Check if the ongoing attempt is still valid (not expired)
      const now = new Date();
      const timeLimit = testData.time_limit * 60 * 1000; // Convert to ms
      const elapsed = now.getTime() - ongoingAttempt.start_time.getTime();

      if (elapsed < timeLimit) {
        // Return the existing attempt
        const timeRemaining = Math.max(
          0,
          Math.floor((timeLimit - elapsed) / 1000)
        );
        const progressPercentage =
          (testData.total_questions || 0) > 0
            ? Math.round(
                ((ongoingAttempt.questions_answered || 0) /
                  (testData.total_questions || 1)) *
                  100
              )
            : 0;

        const response: StartTestAttemptResponse = {
          success: true,
          message: "Resuming existing test attempt",
          data: {
            id: ongoingAttempt.id,
            user_id: ongoingAttempt.user_id,
            test_id: ongoingAttempt.test_id,
            session_test_id: ongoingAttempt.session_test_id,
            start_time: ongoingAttempt.start_time,
            end_time: ongoingAttempt.end_time,
            actual_end_time: ongoingAttempt.actual_end_time,
            status: ongoingAttempt.status,
            ip_address: ongoingAttempt.ip_address,
            user_agent: ongoingAttempt.user_agent,
            browser_info:
              (ongoingAttempt.browser_info as Record<string, any>) || null,
            attempt_number: ongoingAttempt.attempt_number || 0,
            time_spent: ongoingAttempt.time_spent,
            questions_answered: ongoingAttempt.questions_answered || 0,
            total_questions: testData.total_questions || 0,
            created_at: ongoingAttempt.created_at,
            updated_at: ongoingAttempt.updated_at,
            test: {
              id: testData.id,
              name: testData.name,
              category: testData.category,
              module_type: testData.module_type,
              time_limit: testData.time_limit || 0,
              total_questions: testData.total_questions || 0,
              icon: testData.icon,
              card_color: testData.card_color,
              instructions: testData.instructions,
            },
            session: sessionData
              ? {
                  id: sessionData.id,
                  session_name: sessionData.session_name,
                  session_code: sessionData.session_code,
                  target_position: sessionData.target_position || "",
                }
              : null,
            time_remaining: timeRemaining,
            progress_percentage: progressPercentage,
            can_continue: true,
            is_expired: false,
          },
          timestamp: new Date().toISOString(),
        };

        return c.json(response, 200);
      } else {
        // Mark the expired attempt as expired
        await db
          .update(testAttempts)
          .set({
            status: "expired",
            actual_end_time: new Date(),
            updated_at: new Date(),
          })
          .where(eq(testAttempts.id, ongoingAttempt.id));
      }
    }

    // Create new attempt
    const nextAttemptNumber =
      existingAttempts.length > 0
        ? Math.max(...existingAttempts.map((a) => a.attempt_number || 0)) + 1
        : 1;

    const now = new Date();
    const endTime = new Date(now.getTime() + testData.time_limit * 60 * 1000);

    // Get client IP and user agent
    const clientIP =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";

    const newAttemptData = {
      user_id: user.id,
      test_id: requestData.test_id,
      session_test_id: sessionTestId,
      start_time: now,
      end_time: endTime,
      status: "started" as const,
      ip_address: clientIP,
      user_agent: userAgent,
      browser_info: requestData.browser_info || null,
      attempt_number: nextAttemptNumber,
      time_spent: null,
      questions_answered: 0,
      total_questions: testData.total_questions || 0,
    };

    const [newAttempt] = await db
      .insert(testAttempts)
      .values(newAttemptData)
      .returning();

    const timeRemaining = Math.floor(
      (endTime.getTime() - now.getTime()) / 1000
    );

    const response: StartTestAttemptResponse = {
      success: true,
      message: "Test attempt started successfully",
      data: {
        id: newAttempt.id,
        user_id: newAttempt.user_id,
        test_id: newAttempt.test_id,
        session_test_id: newAttempt.session_test_id,
        start_time: newAttempt.start_time,
        end_time: newAttempt.end_time,
        actual_end_time: newAttempt.actual_end_time,
        status: newAttempt.status,
        ip_address: newAttempt.ip_address,
        user_agent: newAttempt.user_agent,
        browser_info: (newAttempt.browser_info as Record<string, any>) || null,
        attempt_number: newAttempt.attempt_number || 0,
        time_spent: newAttempt.time_spent,
        questions_answered: newAttempt.questions_answered || 0,
        total_questions: testData.total_questions || 0,
        created_at: newAttempt.created_at,
        updated_at: newAttempt.updated_at,
        test: {
          id: testData.id,
          name: testData.name,
          category: testData.category,
          module_type: testData.module_type,
          time_limit: testData.time_limit || 0,
          total_questions: testData.total_questions || 0,
          icon: testData.icon,
          card_color: testData.card_color,
          instructions: testData.instructions,
        },
        session: sessionData
          ? {
              id: sessionData.id,
              session_name: sessionData.session_name,
              session_code: sessionData.session_code,
              target_position: sessionData.target_position || "",
            }
          : null,
        time_remaining: timeRemaining,
        progress_percentage: 0,
        can_continue: true,
        is_expired: false,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error starting test attempt:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to start test attempt",
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
