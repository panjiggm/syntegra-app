import { Context } from "hono";
import { eq, and, count, sql, desc, gte, lte } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type SessionAnalyticsQuery,
  type SessionAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
  calculateCompletionRate,
} from "shared-types";

export async function getSessionAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: SessionAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      session_id: rawQuery.session_id,
      status: rawQuery.status as any,
      include_participants: rawQuery.include_participants !== "false",
      include_completion_rates: rawQuery.include_completion_rates !== "false",
      group_by: (rawQuery.group_by as any) || "session",
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
      gte(testSessions.created_at, from),
      lte(testSessions.created_at, to),
    ];

    if (queryParams.session_id) {
      filterConditions.push(eq(testSessions.id, queryParams.session_id));
    }

    if (queryParams.status) {
      filterConditions.push(
        sql`${testSessions.status} = ${queryParams.status}`
      );
    }

    // Get session summary statistics
    const [totalSessions] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(and(...filterConditions));

    const [activeSessions] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(
        and(
          ...filterConditions,
          eq(testSessions.status, "active"),
          lte(testSessions.start_time, new Date()),
          gte(testSessions.end_time, new Date())
        )
      );

    const [completedSessions] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(and(...filterConditions, eq(testSessions.status, "completed")));

    const [cancelledSessions] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(and(...filterConditions, eq(testSessions.status, "cancelled")));

    // Get total participants
    const [totalParticipants] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .leftJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .where(and(...filterConditions));

    // Calculate average participants per session
    const averageParticipantsPerSession =
      totalSessions.count > 0
        ? Math.round(totalParticipants.count / totalSessions.count)
        : 0;

    // Calculate average session duration for completed sessions
    const completedSessionsWithDuration = await db
      .select({
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
      })
      .from(testSessions)
      .where(and(...filterConditions, eq(testSessions.status, "completed")));

    const averageSessionDuration =
      completedSessionsWithDuration.length > 0
        ? Math.round(
            completedSessionsWithDuration.reduce((sum, session) => {
              const duration =
                session.end_time.getTime() - session.start_time.getTime();
              return sum + duration / (1000 * 60); // Convert to minutes
            }, 0) / completedSessionsWithDuration.length
          )
        : 0;

    // Calculate overall completion rate (participants who completed at least one test)
    const [participantsWithCompletedTests] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .leftJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .leftJoin(
        testAttempts,
        eq(sessionParticipants.user_id, testAttempts.user_id)
      )
      .where(
        and(
          ...filterConditions,
          eq(testAttempts.status, "completed"),
          eq(testAttempts.session_test_id, testSessions.id)
        )
      );

    const overallCompletionRate = calculateCompletionRate(
      participantsWithCompletedTests.count,
      totalParticipants.count
    );

    const sessionSummary = {
      total_sessions: totalSessions.count,
      active_sessions: activeSessions.count,
      completed_sessions: completedSessions.count,
      cancelled_sessions: cancelledSessions.count,
      total_participants: totalParticipants.count,
      average_participants_per_session: averageParticipantsPerSession,
      average_session_duration_minutes: averageSessionDuration,
      overall_completion_rate: overallCompletionRate,
    };

    // Get session breakdown if requested
    let sessionBreakdown = undefined;
    if (
      queryParams.include_participants ||
      queryParams.include_completion_rates
    ) {
      const breakdownData = await db
        .select({
          session_id: testSessions.id,
          session_name: testSessions.session_name,
          session_code: testSessions.session_code,
          status: testSessions.status,
          start_time: testSessions.start_time,
          end_time: testSessions.end_time,
          max_participants: testSessions.max_participants,
          participant_count: count(sessionParticipants.id),
        })
        .from(testSessions)
        .leftJoin(
          sessionParticipants,
          eq(testSessions.id, sessionParticipants.session_id)
        )
        .where(and(...filterConditions))
        .groupBy(
          testSessions.id,
          testSessions.session_name,
          testSessions.session_code,
          testSessions.status,
          testSessions.start_time,
          testSessions.end_time,
          testSessions.max_participants
        )
        .orderBy(desc(testSessions.created_at))
        .limit(50);

      sessionBreakdown = await Promise.all(
        breakdownData.map(async (session) => {
          // Calculate completion rate for this session
          const [completedParticipants] = await db
            .select({ count: count() })
            .from(sessionParticipants)
            .leftJoin(
              testAttempts,
              and(
                eq(sessionParticipants.user_id, testAttempts.user_id),
                eq(testAttempts.session_test_id, session.session_id)
              )
            )
            .where(
              and(
                eq(sessionParticipants.session_id, session.session_id),
                eq(testAttempts.status, "completed")
              )
            );

          const completionRate = calculateCompletionRate(
            completedParticipants.count,
            session.participant_count
          );

          // Calculate duration
          let durationMinutes = null;
          if (
            session.status === "completed" &&
            session.start_time &&
            session.end_time
          ) {
            durationMinutes = Math.round(
              (session.end_time.getTime() - session.start_time.getTime()) /
                (1000 * 60)
            );
          }

          return {
            session_id: session.session_id,
            session_name: session.session_name,
            session_code: session.session_code,
            status: session.status as any,
            participant_count: session.participant_count,
            max_participants: session.max_participants,
            completion_rate: completionRate,
            start_time: session.start_time?.toISOString() || null,
            end_time: session.end_time?.toISOString() || null,
            duration_minutes: durationMinutes,
          };
        })
      );
    }

    // Get participant data if requested
    let participantData = undefined;
    if (queryParams.include_participants) {
      const participantStats = await db
        .select({
          session_id: testSessions.id,
          total_participants: count(sessionParticipants.id),
          active_participants: sql<number>`COUNT(CASE WHEN ${sessionParticipants.status} = 'registered' THEN 1 END)`,
          completed_participants: sql<number>`COUNT(CASE WHEN ${sessionParticipants.status} = 'completed' THEN 1 END)`,
        })
        .from(testSessions)
        .leftJoin(
          sessionParticipants,
          eq(testSessions.id, sessionParticipants.session_id)
        )
        .where(and(...filterConditions))
        .groupBy(testSessions.id)
        .limit(20);

      participantData = participantStats.map((stat) => {
        const totalParticipants = stat.total_participants;
        const completedParticipants = Number(stat.completed_participants) || 0;
        const dropoutRate =
          totalParticipants > 0
            ? Math.round(
                ((totalParticipants - completedParticipants) /
                  totalParticipants) *
                  100
              )
            : 0;

        return {
          session_id: stat.session_id,
          total_participants: totalParticipants,
          active_participants: Number(stat.active_participants) || 0,
          completed_participants: completedParticipants,
          dropout_rate: dropoutRate,
        };
      });
    }

    // Get trends if requested
    let trends = undefined;
    if (queryParams.include_completion_rates) {
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

        const [sessionsCreated] = await db
          .select({ count: count() })
          .from(testSessions)
          .where(
            and(
              gte(testSessions.created_at, date),
              lte(testSessions.created_at, nextDate),
              queryParams.session_id
                ? eq(testSessions.id, queryParams.session_id)
                : undefined,
              queryParams.status
                ? sql`${testSessions.status} = ${queryParams.status}`
                : undefined
            )
          );

        const [sessionsCompleted] = await db
          .select({ count: count() })
          .from(testSessions)
          .where(
            and(
              gte(testSessions.end_time, date),
              lte(testSessions.end_time, nextDate),
              eq(testSessions.status, "completed"),
              queryParams.session_id
                ? eq(testSessions.id, queryParams.session_id)
                : undefined
            )
          );

        const [dayParticipants] = await db
          .select({ count: count() })
          .from(sessionParticipants)
          .leftJoin(
            testSessions,
            eq(sessionParticipants.session_id, testSessions.id)
          )
          .where(
            and(
              gte(testSessions.created_at, date),
              lte(testSessions.created_at, nextDate),
              queryParams.session_id
                ? eq(testSessions.id, queryParams.session_id)
                : undefined,
              queryParams.status
                ? sql`${testSessions.status} = ${queryParams.status}`
                : undefined
            )
          );

        trends.push({
          date: date.toISOString().split("T")[0],
          sessions_created: sessionsCreated.count,
          sessions_completed: sessionsCompleted.count,
          total_participants: dayParticipants.count,
          completion_rate: calculateCompletionRate(
            sessionsCompleted.count,
            sessionsCreated.count
          ),
        });
      }
    }

    const response: SessionAnalyticsResponse = {
      success: true,
      data: {
        session_summary: sessionSummary,
        session_breakdown: sessionBreakdown,
        participant_data: participantData,
        trends,
        metadata: {
          total_records: totalSessions.count,
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
    console.error("Error getting session analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve session analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
