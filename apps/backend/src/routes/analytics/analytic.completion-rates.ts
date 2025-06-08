import { Context } from "hono";
import { eq, and, count, sql, desc, gte, lte, avg } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  testAttempts,
  testSessions,
  sessionParticipants,
  users,
  userAnswers,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type CompletionRateAnalyticsQuery,
  type CompletionRateAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
  calculateCompletionRate,
  calculatePercentageChange,
} from "shared-types";

export async function getCompletionRateAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: CompletionRateAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      test_id: rawQuery.test_id,
      session_id: rawQuery.session_id,
      user_id: rawQuery.user_id,
      include_trends: rawQuery.include_trends !== "false",
      group_by: (rawQuery.group_by as any) || "test",
    };

    // Get date range
    const { from, to } =
      queryParams.date_from && queryParams.date_to
        ? {
            from: new Date(queryParams.date_from),
            to: new Date(queryParams.date_to),
          }
        : getAnalyticsDateRange(queryParams.period);

    // Build filter conditions
    const filterConditions: any[] = [
      gte(testAttempts.start_time, from),
      lte(testAttempts.start_time, to),
    ];

    if (queryParams.test_id) {
      filterConditions.push(eq(testAttempts.test_id, queryParams.test_id));
    }

    if (queryParams.session_id) {
      filterConditions.push(
        eq(testAttempts.session_test_id, queryParams.session_id)
      );
    }

    if (queryParams.user_id) {
      filterConditions.push(eq(testAttempts.user_id, queryParams.user_id));
    }

    // Get completion summary statistics
    const [totalAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(and(...filterConditions));

    const [completedAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(and(...filterConditions, eq(testAttempts.status, "completed")));

    const [dropoutAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(
        and(
          ...filterConditions,
          sql`${testAttempts.status} IN ('abandoned', 'expired')`
        )
      );

    // Calculate average completion time for completed attempts
    const [avgCompletionTime] = await db
      .select({
        avg_time: avg(testAttempts.time_spent),
      })
      .from(testAttempts)
      .where(
        and(
          ...filterConditions,
          eq(testAttempts.status, "completed"),
          sql`${testAttempts.time_spent} IS NOT NULL`
        )
      );

    const overallCompletionRate = calculateCompletionRate(
      completedAttempts.count,
      totalAttempts.count
    );

    const dropoutRate = calculateCompletionRate(
      dropoutAttempts.count,
      totalAttempts.count
    );

    // Calculate completion rate trend compared to previous period
    const previousPeriodStart = new Date(
      from.getTime() - (to.getTime() - from.getTime())
    );
    const [previousTotalAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(
        and(
          gte(testAttempts.start_time, previousPeriodStart),
          lte(testAttempts.start_time, from),
          queryParams.test_id
            ? eq(testAttempts.test_id, queryParams.test_id)
            : undefined,
          queryParams.session_id
            ? eq(testAttempts.session_test_id, queryParams.session_id)
            : undefined,
          queryParams.user_id
            ? eq(testAttempts.user_id, queryParams.user_id)
            : undefined
        )
      );

    const [previousCompletedAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(
        and(
          gte(testAttempts.start_time, previousPeriodStart),
          lte(testAttempts.start_time, from),
          eq(testAttempts.status, "completed"),
          queryParams.test_id
            ? eq(testAttempts.test_id, queryParams.test_id)
            : undefined,
          queryParams.session_id
            ? eq(testAttempts.session_test_id, queryParams.session_id)
            : undefined,
          queryParams.user_id
            ? eq(testAttempts.user_id, queryParams.user_id)
            : undefined
        )
      );

    const previousCompletionRate = calculateCompletionRate(
      previousCompletedAttempts.count,
      previousTotalAttempts.count
    );

    const completionRateTrend = calculatePercentageChange(
      overallCompletionRate,
      previousCompletionRate
    );

    const completionSummary = {
      overall_completion_rate: overallCompletionRate,
      total_attempts: totalAttempts.count,
      completed_attempts: completedAttempts.count,
      dropout_rate: dropoutRate,
      average_completion_time_minutes: avgCompletionTime.avg_time
        ? Math.round(Number(avgCompletionTime.avg_time) / 60)
        : 0,
      completion_rate_trend: completionRateTrend,
    };

    // Get breakdown by test if requested
    let breakdownByTest = undefined;
    if (queryParams.group_by === "test" || !queryParams.session_id) {
      const testBreakdown = await db
        .select({
          test_id: tests.id,
          test_name: tests.name,
          category: tests.category,
          total_attempts: count(testAttempts.id),
          completed_attempts: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
          avg_completion_time: avg(testAttempts.time_spent),
        })
        .from(tests)
        .leftJoin(testAttempts, eq(tests.id, testAttempts.test_id))
        .where(
          and(
            eq(tests.status, "active"),
            gte(testAttempts.start_time, from),
            lte(testAttempts.start_time, to),
            queryParams.test_id ? eq(tests.id, queryParams.test_id) : undefined,
            queryParams.session_id
              ? eq(testAttempts.session_test_id, queryParams.session_id)
              : undefined,
            queryParams.user_id
              ? eq(testAttempts.user_id, queryParams.user_id)
              : undefined
          )
        )
        .groupBy(tests.id, tests.name, tests.category)
        .orderBy(desc(count(testAttempts.id)))
        .limit(20);

      breakdownByTest = await Promise.all(
        testBreakdown.map(async (test) => {
          // Get dropout points for this test
          const testQuestions = await db
            .select({
              sequence: questions.sequence,
              total_answers: count(userAnswers.id),
            })
            .from(questions)
            .leftJoin(userAnswers, eq(questions.id, userAnswers.question_id))
            .leftJoin(
              testAttempts,
              and(
                eq(userAnswers.attempt_id, testAttempts.id),
                gte(testAttempts.start_time, from),
                lte(testAttempts.start_time, to)
              )
            )
            .where(eq(questions.test_id, test.test_id))
            .groupBy(questions.sequence)
            .orderBy(questions.sequence)
            .limit(10); // Top 10 dropout points

          const totalTestAttempts = test.total_attempts;
          const dropoutPoints = testQuestions.map((question) => {
            const dropoutCount = Math.max(
              0,
              totalTestAttempts - question.total_answers
            );
            const dropoutPercentage =
              totalTestAttempts > 0
                ? (dropoutCount / totalTestAttempts) * 100
                : 0;

            return {
              question_index: question.sequence,
              dropout_count: dropoutCount,
              dropout_percentage: Math.round(dropoutPercentage * 100) / 100,
            };
          });

          return {
            test_id: test.test_id,
            test_name: test.test_name,
            category: test.category,
            total_attempts: test.total_attempts,
            completed_attempts: Number(test.completed_attempts) || 0,
            completion_rate: calculateCompletionRate(
              Number(test.completed_attempts) || 0,
              test.total_attempts
            ),
            average_completion_time_minutes: test.avg_completion_time
              ? Math.round(Number(test.avg_completion_time) / 60)
              : 0,
            dropout_points: dropoutPoints.slice(0, 5), // Top 5 dropout points
          };
        })
      );
    }

    // Get breakdown by session if requested
    let breakdownBySession = undefined;
    if (queryParams.group_by === "session" || queryParams.session_id) {
      const sessionBreakdown = await db
        .select({
          session_id: testSessions.id,
          session_name: testSessions.session_name,
          total_participants: count(sessionParticipants.id),
          completed_participants: sql<number>`COUNT(CASE WHEN ${sessionParticipants.status} = 'completed' THEN 1 END)`,
        })
        .from(testSessions)
        .leftJoin(
          sessionParticipants,
          eq(testSessions.id, sessionParticipants.session_id)
        )
        .where(
          and(
            gte(testSessions.created_at, from),
            lte(testSessions.created_at, to),
            queryParams.session_id
              ? eq(testSessions.id, queryParams.session_id)
              : undefined
          )
        )
        .groupBy(testSessions.id, testSessions.session_name)
        .orderBy(desc(count(sessionParticipants.id)))
        .limit(20);

      breakdownBySession = sessionBreakdown.map((session) => ({
        session_id: session.session_id,
        session_name: session.session_name,
        completion_rate: calculateCompletionRate(
          Number(session.completed_participants) || 0,
          session.total_participants
        ),
        total_participants: session.total_participants,
        completed_participants: Number(session.completed_participants) || 0,
      }));
    }

    // Get breakdown by user if requested
    let breakdownByUser = undefined;
    if (queryParams.group_by === "user" || queryParams.user_id) {
      const userBreakdown = await db
        .select({
          user_id: users.id,
          user_name: users.name,
          total_attempts: count(testAttempts.id),
          completed_attempts: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
          avg_score: avg(
            sql`CAST(${testAttempts.questions_answered} AS DECIMAL) / NULLIF(CAST(${testAttempts.total_questions} AS DECIMAL), 0) * 100`
          ),
        })
        .from(users)
        .leftJoin(testAttempts, eq(users.id, testAttempts.user_id))
        .where(
          and(
            eq(users.role, "participant"),
            gte(testAttempts.start_time, from),
            lte(testAttempts.start_time, to),
            queryParams.test_id
              ? eq(testAttempts.test_id, queryParams.test_id)
              : undefined,
            queryParams.session_id
              ? eq(testAttempts.session_test_id, queryParams.session_id)
              : undefined,
            queryParams.user_id ? eq(users.id, queryParams.user_id) : undefined
          )
        )
        .groupBy(users.id, users.name)
        .orderBy(desc(count(testAttempts.id)))
        .limit(50);

      breakdownByUser = userBreakdown.map((user) => ({
        user_id: user.user_id,
        user_name: user.user_name,
        total_attempts: user.total_attempts,
        completed_attempts: Number(user.completed_attempts) || 0,
        completion_rate: calculateCompletionRate(
          Number(user.completed_attempts) || 0,
          user.total_attempts
        ),
        average_score: user.avg_score ? Math.round(Number(user.avg_score)) : 0,
      }));
    }

    // Get trends if requested
    let trends = undefined;
    if (queryParams.include_trends) {
      trends = [];
      const daysDiff = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );
      const maxPoints = Math.min(daysDiff, 30);

      for (let i = 0; i < maxPoints; i++) {
        const date = new Date(
          from.getTime() + (i * (to.getTime() - from.getTime())) / maxPoints
        );
        const nextDate = new Date(
          from.getTime() +
            ((i + 1) * (to.getTime() - from.getTime())) / maxPoints
        );

        const [dayTotal] = await db
          .select({ count: count() })
          .from(testAttempts)
          .where(
            and(
              gte(testAttempts.start_time, date),
              lte(testAttempts.start_time, nextDate),
              queryParams.test_id
                ? eq(testAttempts.test_id, queryParams.test_id)
                : undefined,
              queryParams.session_id
                ? eq(testAttempts.session_test_id, queryParams.session_id)
                : undefined,
              queryParams.user_id
                ? eq(testAttempts.user_id, queryParams.user_id)
                : undefined
            )
          );

        const [dayCompleted] = await db
          .select({ count: count() })
          .from(testAttempts)
          .where(
            and(
              gte(testAttempts.start_time, date),
              lte(testAttempts.start_time, nextDate),
              eq(testAttempts.status, "completed"),
              queryParams.test_id
                ? eq(testAttempts.test_id, queryParams.test_id)
                : undefined,
              queryParams.session_id
                ? eq(testAttempts.session_test_id, queryParams.session_id)
                : undefined,
              queryParams.user_id
                ? eq(testAttempts.user_id, queryParams.user_id)
                : undefined
            )
          );

        const [dayAvgTime] = await db
          .select({
            avg_time: avg(testAttempts.time_spent),
          })
          .from(testAttempts)
          .where(
            and(
              gte(testAttempts.start_time, date),
              lte(testAttempts.start_time, nextDate),
              eq(testAttempts.status, "completed"),
              sql`${testAttempts.time_spent} IS NOT NULL`,
              queryParams.test_id
                ? eq(testAttempts.test_id, queryParams.test_id)
                : undefined,
              queryParams.session_id
                ? eq(testAttempts.session_test_id, queryParams.session_id)
                : undefined,
              queryParams.user_id
                ? eq(testAttempts.user_id, queryParams.user_id)
                : undefined
            )
          );

        trends.push({
          date: date.toISOString().split("T")[0],
          completion_rate: calculateCompletionRate(
            dayCompleted.count,
            dayTotal.count
          ),
          total_attempts: dayTotal.count,
          completed_attempts: dayCompleted.count,
          average_completion_time: dayAvgTime.avg_time
            ? Math.round(Number(dayAvgTime.avg_time) / 60)
            : 0,
        });
      }
    }

    const response: CompletionRateAnalyticsResponse = {
      success: true,
      data: {
        completion_summary: completionSummary,
        breakdown_by_test: breakdownByTest,
        breakdown_by_session: breakdownBySession,
        breakdown_by_user: breakdownByUser,
        trends,
        metadata: {
          total_records: totalAttempts.count,
          period_start: from.toISOString(),
          period_end: to.toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting completion rate analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve completion rate analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
