import { Context } from "hono";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests, testSessions, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetUserAttemptsResponse,
  type AttemptErrorResponse,
  type GetUserAttemptsQuery,
  getAttemptTimeRemaining,
  calculateAttemptProgress,
  canContinueAttempt,
  isAttemptExpired,
} from "shared-types";

export async function getUserAttemptsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { userId } = c.req.param();
    const rawQuery = c.req.query();

    const queryParams: GetUserAttemptsQuery = {
      page: parseInt(rawQuery.page) || 1,
      limit: Math.min(parseInt(rawQuery.limit) || 10, 100),
      sort_by: (rawQuery.sort_by as any) || "start_time",
      sort_order: (rawQuery.sort_order as any) || "desc",
      status: rawQuery.status as any,
      test_id: rawQuery.test_id,
      session_id: rawQuery.session_id,
      start_date_from: rawQuery.start_date_from,
      start_date_to: rawQuery.start_date_to,
    };

    // Validate that current user is an admin
    if (currentUser.role !== "admin") {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        errors: [
          {
            field: "user_role",
            message: "Only administrators can view user attempts",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if the target user exists
    const targetUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        nik: users.nik,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser.length === 0) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "user_id",
            message: "User with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const userData = targetUser[0];

    // Build filter conditions
    const filterConditions: any[] = [eq(testAttempts.user_id, userId)];

    if (queryParams.status) {
      filterConditions.push(eq(testAttempts.status, queryParams.status));
    }

    if (queryParams.test_id) {
      filterConditions.push(eq(testAttempts.test_id, queryParams.test_id));
    }

    if (queryParams.session_id) {
      filterConditions.push(
        eq(testAttempts.session_test_id, queryParams.session_id)
      );
    }

    if (queryParams.start_date_from) {
      filterConditions.push(
        sql`${testAttempts.start_time} >= ${new Date(queryParams.start_date_from)}`
      );
    }

    if (queryParams.start_date_to) {
      filterConditions.push(
        sql`${testAttempts.start_time} <= ${new Date(queryParams.start_date_to)}`
      );
    }

    // Count total records
    const [totalCount] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(and(...filterConditions));

    const total = totalCount.count;
    const totalPages = Math.ceil(total / queryParams.limit);
    const offset = (queryParams.page - 1) * queryParams.limit;

    // Build sort order
    let orderBy;
    const sortDirection = queryParams.sort_order === "desc" ? desc : undefined;

    switch (queryParams.sort_by) {
      case "start_time":
        orderBy = sortDirection
          ? desc(testAttempts.start_time)
          : testAttempts.start_time;
        break;
      case "end_time":
        orderBy = sortDirection
          ? desc(testAttempts.end_time)
          : testAttempts.end_time;
        break;
      case "status":
        orderBy = sortDirection
          ? desc(testAttempts.status)
          : testAttempts.status;
        break;
      case "test_name":
        orderBy = sortDirection ? desc(tests.name) : tests.name;
        break;
      case "attempt_number":
        orderBy = sortDirection
          ? desc(testAttempts.attempt_number)
          : testAttempts.attempt_number;
        break;
      case "created_at":
        orderBy = sortDirection
          ? desc(testAttempts.created_at)
          : testAttempts.created_at;
        break;
      default:
        orderBy = desc(testAttempts.start_time);
    }

    // Get attempts with related data
    const attemptResults = await db
      .select({
        attempt: testAttempts,
        test: tests,
        session: testSessions,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(and(...filterConditions))
      .orderBy(orderBy)
      .limit(queryParams.limit)
      .offset(offset);

    // Process attempts and add computed fields
    const processedAttempts = attemptResults.map(
      ({ attempt, test, session }) => {
        if (!test) {
          throw new Error(`Test data missing for attempt ${attempt.id}`);
        }

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

        return {
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
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            nik: userData.nik || "",
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
        };
      }
    );

    // Calculate summary statistics
    const allUserAttempts = await db
      .select({
        status: testAttempts.status,
        time_spent: testAttempts.time_spent,
        questions_answered: testAttempts.questions_answered,
        total_questions: testAttempts.total_questions,
      })
      .from(testAttempts)
      .where(eq(testAttempts.user_id, userId));

    const summary = {
      total_attempts: allUserAttempts.length,
      completed_attempts: allUserAttempts.filter(
        (a) => a.status === "completed"
      ).length,
      in_progress_attempts: allUserAttempts.filter(
        (a) => a.status === "started" || a.status === "in_progress"
      ).length,
      abandoned_attempts: allUserAttempts.filter(
        (a) => a.status === "abandoned"
      ).length,
      expired_attempts: allUserAttempts.filter((a) => a.status === "expired")
        .length,
      average_completion_rate:
        allUserAttempts.length > 0
          ? Math.round(
              allUserAttempts.reduce((sum, a) => {
                const rate =
                  a.total_questions && a.total_questions > 0
                    ? ((a.questions_answered || 0) / a.total_questions) * 100
                    : 0;
                return sum + rate;
              }, 0) / allUserAttempts.length
            )
          : 0,
      total_time_spent: Math.round(
        allUserAttempts.reduce((sum, a) => sum + (a.time_spent || 0), 0) / 60
      ), // Convert to minutes
    };

    const response: GetUserAttemptsResponse = {
      success: true,
      message: `Test attempts for user ${userData.name} retrieved successfully`,
      data: processedAttempts,
      meta: {
        current_page: queryParams.page,
        per_page: queryParams.limit,
        total: total,
        total_pages: totalPages,
        has_next_page: queryParams.page < totalPages,
        has_prev_page: queryParams.page > 1,
      },
      summary,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting user attempts:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to retrieve user attempts",
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
