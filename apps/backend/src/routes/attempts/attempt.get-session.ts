import { Context } from "hono";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests, testSessions, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionAttemptsResponse,
  type AttemptErrorResponse,
  type GetSessionAttemptsQuery,
  getAttemptTimeRemaining,
  calculateAttemptProgress,
  canContinueAttempt,
  isAttemptExpired,
} from "shared-types";

export async function getSessionAttemptsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { sessionId } = c.req.param();
    const rawQuery = c.req.query();

    const queryParams: GetSessionAttemptsQuery = {
      page: parseInt(rawQuery.page) || 1,
      limit: Math.min(parseInt(rawQuery.limit) || 10, 100),
      sort_by: (rawQuery.sort_by as any) || "start_time",
      sort_order: (rawQuery.sort_order as any) || "desc",
      status: rawQuery.status as any,
      test_id: rawQuery.test_id,
      user_id: rawQuery.user_id,
    };

    // Validate that current user is an admin
    if (currentUser.role !== "admin") {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        errors: [
          {
            field: "user_role",
            message: "Only administrators can view session attempts",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if the target session exists
    const targetSession = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        status: testSessions.status,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        current_participants: testSessions.current_participants,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    if (targetSession.length === 0) {
      const errorResponse: AttemptErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "session_id",
            message: "Session with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const sessionData = targetSession[0];

    // Build filter conditions
    const filterConditions: any[] = [
      eq(testAttempts.session_test_id, sessionId),
    ];

    if (queryParams.status) {
      filterConditions.push(eq(testAttempts.status, queryParams.status));
    }

    if (queryParams.test_id) {
      filterConditions.push(eq(testAttempts.test_id, queryParams.test_id));
    }

    if (queryParams.user_id) {
      filterConditions.push(eq(testAttempts.user_id, queryParams.user_id));
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
      case "user_name":
        orderBy = sortDirection ? desc(users.name) : users.name;
        break;
      case "test_name":
        orderBy = sortDirection ? desc(tests.name) : tests.name;
        break;
      case "status":
        orderBy = sortDirection
          ? desc(testAttempts.status)
          : testAttempts.status;
        break;
      case "attempt_number":
        orderBy = sortDirection
          ? desc(testAttempts.attempt_number)
          : testAttempts.attempt_number;
        break;
      case "progress_percentage":
        // Calculate progress percentage for sorting
        orderBy = sortDirection
          ? desc(
              sql`CASE 
                WHEN ${testAttempts.total_questions} > 0 
                THEN (${testAttempts.questions_answered} * 100.0 / ${testAttempts.total_questions})
                ELSE 0 
              END`
            )
          : sql`CASE 
              WHEN ${testAttempts.total_questions} > 0 
              THEN (${testAttempts.questions_answered} * 100.0 / ${testAttempts.total_questions})
              ELSE 0 
            END`;
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
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          nik: users.nik,
        },
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .leftJoin(users, eq(testAttempts.user_id, users.id))
      .where(and(...filterConditions))
      .orderBy(orderBy)
      .limit(queryParams.limit)
      .offset(offset);

    // Process attempts and add computed fields
    const processedAttempts = attemptResults.map(
      ({ attempt, test, session, user }) => {
        if (!test) {
          throw new Error(`Test data missing for attempt ${attempt.id}`);
        }

        if (!user) {
          throw new Error(`User data missing for attempt ${attempt.id}`);
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
            id: user.id,
            name: user.name,
            email: user.email,
            nik: user.nik || "",
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

    // Calculate session summary statistics
    const allSessionAttempts = await db
      .select({
        status: testAttempts.status,
        time_spent: testAttempts.time_spent,
        user_id: testAttempts.user_id,
      })
      .from(testAttempts)
      .where(eq(testAttempts.session_test_id, sessionId));

    // Get unique participants count
    const uniqueParticipants = new Set(allSessionAttempts.map((a) => a.user_id))
      .size;

    const sessionSummary = {
      session_id: sessionData.id,
      session_name: sessionData.session_name,
      session_code: sessionData.session_code,
      target_position: sessionData.target_position || "",
      total_participants: uniqueParticipants,
      total_attempts: allSessionAttempts.length,
      completed_attempts: allSessionAttempts.filter(
        (a) => a.status === "completed"
      ).length,
      in_progress_attempts: allSessionAttempts.filter(
        (a) => a.status === "started" || a.status === "in_progress"
      ).length,
      abandoned_attempts: allSessionAttempts.filter(
        (a) => a.status === "abandoned"
      ).length,
      expired_attempts: allSessionAttempts.filter((a) => a.status === "expired")
        .length,
      overall_completion_rate:
        allSessionAttempts.length > 0
          ? Math.round(
              (allSessionAttempts.filter((a) => a.status === "completed")
                .length /
                allSessionAttempts.length) *
                100
            )
          : 0,
      average_time_per_test:
        allSessionAttempts.length > 0
          ? Math.round(
              allSessionAttempts.reduce(
                (sum, a) => sum + (a.time_spent || 0),
                0
              ) /
                allSessionAttempts.length /
                60
            ) // Convert to minutes
          : 0,
    };

    const response: GetSessionAttemptsResponse = {
      success: true,
      message: `Test attempts for session ${sessionData.session_name} retrieved successfully`,
      data: processedAttempts,
      meta: {
        current_page: queryParams.page,
        per_page: queryParams.limit,
        total: total,
        total_pages: totalPages,
        has_next_page: queryParams.page < totalPages,
        has_prev_page: queryParams.page > 1,
      },
      session_summary: sessionSummary,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session attempts:", error);

    const errorResponse: AttemptErrorResponse = {
      success: false,
      message: "Failed to retrieve session attempts",
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
