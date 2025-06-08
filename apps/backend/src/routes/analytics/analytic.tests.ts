import { Context } from "hono";
import { eq, and, count, sql, desc, gte, lte, avg } from "drizzle-orm";
import { getDbFromEnv, tests, testAttempts, testResults, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type TestAnalyticsQuery,
  type TestAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
  calculateCompletionRate,
} from "shared-types";

export async function getTestAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: TestAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      test_id: rawQuery.test_id,
      category: rawQuery.category,
      include_breakdown: rawQuery.include_breakdown !== "false",
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

    if (queryParams.category) {
      filterConditions.push(sql`${tests.category} = ${queryParams.category}`);
    }

    // Get test summary statistics
    const [totalTests] = await db
      .select({ count: count() })
      .from(tests)
      .where(eq(tests.status, "active"));

    const [totalAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(and(...filterConditions));

    const [completedAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(and(...filterConditions, eq(testAttempts.status, "completed")));

    // Calculate average completion time for completed attempts
    const [avgCompletionTime] = await db
      .select({
        avg_time: avg(testAttempts.time_spent),
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(
        and(
          ...filterConditions,
          eq(testAttempts.status, "completed"),
          sql`${testAttempts.time_spent} IS NOT NULL`
        )
      );

    // Calculate average score
    const [avgScore] = await db
      .select({
        avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
      })
      .from(testResults)
      .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(
        and(
          gte(testResults.calculated_at, from),
          lte(testResults.calculated_at, to),
          queryParams.test_id ? eq(tests.id, queryParams.test_id) : undefined,
          queryParams.category
            ? sql`${tests.category} = ${queryParams.category}`
            : undefined
        )
      );

    const testSummary = {
      total_tests: totalTests.count,
      total_attempts: totalAttempts.count,
      completed_attempts: completedAttempts.count,
      in_progress_attempts: 0, // Will be calculated below
      average_completion_time_minutes: avgCompletionTime.avg_time
        ? Math.round(Number(avgCompletionTime.avg_time) / 60)
        : 0,
      overall_completion_rate: calculateCompletionRate(
        completedAttempts.count,
        totalAttempts.count
      ),
      average_score: avgScore.avg_score
        ? Math.round(Number(avgScore.avg_score))
        : 0,
    };

    // Get in-progress attempts
    const [inProgressAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(
        and(
          ...filterConditions,
          sql`${testAttempts.status} IN ('started', 'in_progress')`
        )
      );

    testSummary.in_progress_attempts = inProgressAttempts.count;

    // Get test breakdown if requested
    let testBreakdown = undefined;
    if (queryParams.include_breakdown) {
      const breakdownData = await db
        .select({
          test_id: tests.id,
          test_name: tests.name,
          category: tests.category,
          total_attempts: count(testAttempts.id),
          completed_attempts: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
          avg_time: avg(testAttempts.time_spent),
          avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
        })
        .from(tests)
        .leftJoin(testAttempts, eq(tests.id, testAttempts.test_id))
        .leftJoin(testResults, eq(testAttempts.id, testResults.attempt_id))
        .where(
          and(
            eq(tests.status, "active"),
            queryParams.test_id ? eq(tests.id, queryParams.test_id) : undefined,
            queryParams.category
              ? sql`${tests.category} = ${queryParams.category}`
              : undefined,
            gte(testAttempts.start_time, from),
            lte(testAttempts.start_time, to)
          )
        )
        .groupBy(tests.id, tests.name, tests.category)
        .orderBy(desc(count(testAttempts.id)))
        .limit(20);

      testBreakdown = breakdownData.map((item) => ({
        test_id: item.test_id,
        test_name: item.test_name,
        category: item.category,
        total_attempts: item.total_attempts,
        completed_attempts: Number(item.completed_attempts) || 0,
        completion_rate: calculateCompletionRate(
          Number(item.completed_attempts) || 0,
          item.total_attempts
        ),
        average_score: item.avg_score ? Math.round(Number(item.avg_score)) : 0,
        average_completion_time_minutes: item.avg_time
          ? Math.round(Number(item.avg_time) / 60)
          : 0,
      }));
    }

    // Get trends if requested
    let trends = undefined;
    if (queryParams.include_trends) {
      trends = [];
      const daysDiff = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );
      const maxPoints = Math.min(daysDiff, 30); // Limit to 30 data points

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
          .leftJoin(tests, eq(testAttempts.test_id, tests.id))
          .where(
            and(
              gte(testAttempts.start_time, date),
              lte(testAttempts.start_time, nextDate),
              queryParams.test_id
                ? eq(tests.id, queryParams.test_id)
                : undefined,
              queryParams.category
                ? sql`${tests.category} = ${queryParams.category}`
                : undefined
            )
          );

        const [dayCompleted] = await db
          .select({ count: count() })
          .from(testAttempts)
          .leftJoin(tests, eq(testAttempts.test_id, tests.id))
          .where(
            and(
              gte(testAttempts.start_time, date),
              lte(testAttempts.start_time, nextDate),
              eq(testAttempts.status, "completed"),
              queryParams.test_id
                ? eq(tests.id, queryParams.test_id)
                : undefined,
              queryParams.category
                ? sql`${tests.category} = ${queryParams.category}`
                : undefined
            )
          );

        const [dayAvgScore] = await db
          .select({
            avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
          })
          .from(testResults)
          .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .leftJoin(tests, eq(testAttempts.test_id, tests.id))
          .where(
            and(
              gte(testResults.calculated_at, date),
              lte(testResults.calculated_at, nextDate),
              queryParams.test_id
                ? eq(tests.id, queryParams.test_id)
                : undefined,
              queryParams.category
                ? sql`${tests.category} = ${queryParams.category}`
                : undefined
            )
          );

        trends.push({
          date: date.toISOString().split("T")[0],
          total_attempts: dayTotal.count,
          completed_attempts: dayCompleted.count,
          completion_rate: calculateCompletionRate(
            dayCompleted.count,
            dayTotal.count
          ),
          average_score: dayAvgScore.avg_score
            ? Math.round(Number(dayAvgScore.avg_score))
            : 0,
        });
      }
    }

    const response: TestAnalyticsResponse = {
      success: true,
      data: {
        test_summary: testSummary,
        test_breakdown: testBreakdown,
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
    console.error("Error getting test analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve test analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
