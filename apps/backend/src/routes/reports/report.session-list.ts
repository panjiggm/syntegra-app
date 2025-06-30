import { type Context } from "hono";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionReportsListQuery,
  type GetSessionReportsListResponse,
  type ReportErrorResponse,
} from "shared-types";
import { calculateFreshScoresForSession } from "@/lib/reportCalculations";
import { sessionResults } from "@/db";

/**
 * Handler for GET /api/v1/reports/session
 * Returns a paginated list of sessions with their report overview data
 */
export async function getSessionReportsListHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { auth: any } }>
): Promise<Response> {
  try {
    const rawQuery = c.req.query();

    // Parse query parameters with defaults
    const query: GetSessionReportsListQuery = {
      page: parseInt(rawQuery.page || "1"),
      per_page: Math.min(parseInt(rawQuery.per_page || "20"), 100),
      search: rawQuery.search,
      status: rawQuery.status as any,
      sort_by: (rawQuery.sort_by as any) || "start_time",
      sort_order: (rawQuery.sort_order as any) || "desc",
      has_results: rawQuery.has_results
        ? rawQuery.has_results === "true"
        : undefined,
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
    };
    const auth = c.get("auth");
    const currentUser = auth.user;
    const userRole = currentUser.role;

    // Only admins can access session reports list
    if (userRole !== "admin") {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Import database utilities and schemas
    const {
      getDbFromEnv,
      testSessions,
      sessionParticipants,
      testResults,
      tests,
      testAttempts,
      sessionModules,
    } = await import("@/db");
    const { sql, and, or, eq, count, desc, asc, isNotNull, inArray } = await import(
      "drizzle-orm"
    );

    const db = getDbFromEnv(c.env);

    // Build base query conditions
    const conditions = [];

    // Search filter
    if (query.search) {
      const searchTerm = `%${query.search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${testSessions.session_name}) LIKE ${searchTerm}`,
          sql`LOWER(${testSessions.session_code}) LIKE ${searchTerm}`,
          sql`LOWER(${testSessions.target_position}) LIKE ${searchTerm}`
        )
      );
    }

    // Status filter
    if (query.status) {
      // Map status to actual session status logic
      const now = new Date();
      switch (query.status) {
        case "upcoming":
          conditions.push(
            sql`${testSessions.start_time} > ${now.toISOString()}`
          );
          break;
        case "active":
          conditions.push(
            and(
              sql`${testSessions.start_time} <= ${now.toISOString()}`,
              sql`${testSessions.end_time} >= ${now.toISOString()}`
            )
          );
          break;
        case "completed":
          conditions.push(sql`${testSessions.end_time} < ${now.toISOString()}`);
          break;
        case "cancelled":
          // Assuming there's a status field or similar logic
          conditions.push(sql`${testSessions.description} LIKE '%cancelled%'`);
          break;
      }
    }

    // Filter sessions with test results
    if (query.has_results === true) {
      conditions.push(
        sql`${testSessions.id} IN (
          SELECT DISTINCT ${sessionResults.session_id} 
          FROM ${sessionResults} 
          WHERE ${sessionResults.session_id} IS NOT NULL
        )`
      );
    } else if (query.has_results === false) {
      conditions.push(
        sql`${testSessions.id} NOT IN (
          SELECT DISTINCT ${sessionResults.session_id} 
          FROM ${sessionResults} 
          WHERE ${sessionResults.session_id} IS NOT NULL
        )`
      );
    }

    // Date range filter
    if (query.date_from || query.date_to) {
      if (query.date_from) {
        conditions.push(sql`${testSessions.start_time} >= ${query.date_from}`);
      }
      if (query.date_to) {
        conditions.push(sql`${testSessions.end_time} <= ${query.date_to}`);
      }
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.per_page;

    // Get total count for pagination
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCount = totalCountResult.count;
    const totalPages = Math.ceil(totalCount / query.per_page);

    // Build order by clause
    let orderBy;
    const isAsc = query.sort_order === "asc";

    switch (query.sort_by) {
      case "session_name":
        orderBy = isAsc
          ? asc(testSessions.session_name)
          : desc(testSessions.session_name);
        break;
      case "start_time":
        orderBy = isAsc
          ? asc(testSessions.start_time)
          : desc(testSessions.start_time);
        break;
      case "total_participants":
        // This requires a complex subquery - we'll handle it differently
        orderBy = isAsc
          ? asc(testSessions.start_time)
          : desc(testSessions.start_time); // fallback
        break;
      case "completion_rate":
        // This requires a complex subquery - we'll handle it differently
        orderBy = isAsc
          ? asc(testSessions.start_time)
          : desc(testSessions.start_time); // fallback
        break;
      default:
        orderBy = desc(testSessions.start_time);
    }

    // Get sessions data
    const sessionsData = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        location: testSessions.location,
        description: testSessions.description,
        created_at: testSessions.created_at,
      })
      .from(testSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(query.per_page)
      .offset(offset);

    // Calculate fresh scores for all sessions
    const sessionIds = sessionsData.map((s) => s.id);
    const allSessionsFreshScores = await Promise.all(
      sessionIds.map((sessionId) =>
        calculateFreshScoresForSession(db, sessionId)
      )
    );

    // Create a map for each session's fresh scores
    const sessionFreshScoresMap = new Map();
    allSessionsFreshScores.forEach((sessionScores, index) => {
      sessionFreshScoresMap.set(sessionIds[index], sessionScores);
    });

    const totalFreshScores = allSessionsFreshScores.reduce(
      (sum, scores) => sum + scores.length,
      0
    );
    console.log(
      `Calculated ${totalFreshScores} fresh scores for ${sessionIds.length} sessions`
    );

    // Get statistics for each session
    const sessionStats = new Map();

    if (sessionIds.length > 0) {
      // Get participation statistics
      let participationStats: any[] = [];
      try {
        participationStats = await db
          .select({
            session_id: sessionParticipants.session_id,
            total_registered: count(),
            total_completed: sql<number>`COUNT(CASE WHEN ${sessionParticipants.status} = 'completed' THEN 1 END)::integer`,
          })
          .from(sessionParticipants)
          .where(inArray(sessionParticipants.session_id, sessionIds))
          .groupBy(sessionParticipants.session_id);
      } catch (participationError) {
        console.error("Error getting participation stats:", participationError);
        participationStats = [];
      }
      console.log("Participation stats:", participationStats);

      // Get timing and activity statistics from testAttempts
      let timingStats: any[] = [];
      try {
        const attemptQuery = db
          .select({
            session_id: testAttempts.session_test_id,
            avg_time: sql<number>`COALESCE(AVG(${testAttempts.time_spent}), 0)`,
            total_attempts: count(),
            last_activity: sql<string>`MAX(${testAttempts.end_time})`,
          })
          .from(testAttempts)
          .where(inArray(testAttempts.session_test_id, sessionIds))
          .groupBy(testAttempts.session_test_id);
        
        timingStats = await attemptQuery;
        console.log("Timing stats:", timingStats);
      } catch (timingError) {
        console.error("Error getting timing stats:", timingError);
        timingStats = [];
      }

      // Get test modules count and total duration
      let testModulesStats: any[] = [];
      try {
        const modulesQuery = db
          .select({
            session_id: sessionModules.session_id,
            total_modules: count(),
            total_duration: sql<number>`COALESCE(SUM(${tests.time_limit}), 0)`,
          })
          .from(sessionModules)
          .innerJoin(tests, eq(sessionModules.test_id, tests.id))
          .where(inArray(sessionModules.session_id, sessionIds))
          .groupBy(sessionModules.session_id);
        
        testModulesStats = await modulesQuery;
        console.log("Test modules stats:", testModulesStats);
      } catch (modulesError) {
        console.error("Error getting test modules stats:", modulesError);
        testModulesStats = [];
      }

      // Build session statistics map
      participationStats.forEach((stat) => {
        const completionRate =
          stat.total_registered > 0
            ? (stat.total_completed / stat.total_registered) * 100
            : 0;
        sessionStats.set(stat.session_id, {
          total_registered: stat.total_registered,
          total_completed: stat.total_completed,
          completion_rate: Math.round(completionRate * 100) / 100,
        });
      });

      timingStats.forEach((stat) => {
        const existing = sessionStats.get(stat.session_id) || {};

        // Get fresh scores for this session
        const sessionScores = sessionFreshScoresMap.get(stat.session_id) || [];
        let averageScore = null;
        let scoreRange = { min: 0, max: 0 };

        if (sessionScores.length > 0) {
          const totalScore = sessionScores.reduce(
            (sum: number, fs: any) => sum + fs.scaledScore,
            0
          );
          averageScore = totalScore / sessionScores.length;

          const scores = sessionScores.map(
            (fs: { scaledScore: number }) => fs.scaledScore
          );
          scoreRange = {
            min: Math.min(...scores),
            max: Math.max(...scores),
          };
        }

        sessionStats.set(stat.session_id, {
          ...existing,
          average_score: averageScore
            ? Math.round(averageScore * 100) / 100
            : null,
          score_range: scoreRange,
          average_time_per_participant: stat.avg_time
            ? Math.round((stat.avg_time / 60) * 100) / 100
            : 0,
          total_test_attempts: stat.total_attempts,
          last_activity: stat.last_activity,
        });
      });

      testModulesStats.forEach((stat) => {
        const existing = sessionStats.get(stat.session_id) || {};
        sessionStats.set(stat.session_id, {
          ...existing,
          total_test_modules: stat.total_modules,
          total_duration_minutes: stat.total_duration || 0,
        });
      });

      // Ensure all sessions have complete stats with defaults for missing data
      sessionIds.forEach(sessionId => {
        const existing = sessionStats.get(sessionId) || {};
        sessionStats.set(sessionId, {
          total_registered: existing.total_registered || 0,
          total_completed: existing.total_completed || 0,
          completion_rate: existing.completion_rate || 0,
          average_score: existing.average_score || null,
          score_range: existing.score_range || { min: null, max: null },
          average_time_per_participant: existing.average_time_per_participant || 0,
          total_test_attempts: existing.total_test_attempts || 0,
          last_activity: existing.last_activity || null,
          total_test_modules: existing.total_test_modules || 0,
          total_duration_minutes: existing.total_duration_minutes || 0,
        });
      });
    }

    // Determine session status
    const now = new Date();
    const getSessionStatus = (startTime: Date, endTime: Date) => {
      const start = startTime;
      const end = endTime;

      if (start > now) return "upcoming" as const;
      if (end < now) return "completed" as const;
      return "active" as const;
    };

    // Format response data
    const sessions = sessionsData.map((session) => {
      const stats = sessionStats.get(session.id) || {};
      const status = getSessionStatus(session.start_time, session.end_time);

      return {
        session_id: session.id,
        session_name: session.session_name,
        session_code: session.session_code,
        target_position: session.target_position,
        start_time: session.start_time.toISOString(),
        end_time: session.end_time.toISOString(),
        status,
        location: session.location,
        proctor_name: null, // Could be extracted from description or separate field
        total_test_modules: stats.total_test_modules || 0,
        total_duration_minutes: stats.total_duration_minutes || 0,
        total_invited: stats.total_registered || 0, // Assuming registered = invited for now
        total_registered: stats.total_registered || 0,
        total_completed: stats.total_completed || 0,
        completion_rate: stats.completion_rate || 0,
        average_score: stats.average_score || null,
        score_range: stats.score_range || { min: null, max: null },
        average_time_per_participant: stats.average_time_per_participant || 0,
        data_quality_average: Math.min(100, (stats.completion_rate || 0) + 20), // Simple calculation
        reliability_average: Math.min(100, (stats.completion_rate || 0) + 10), // Simple calculation
        created_at: session.created_at.toISOString(),
        last_activity: stats.last_activity || session.created_at.toISOString(),
        has_individual_reports: (stats.total_completed || 0) > 0,
        has_session_summary: (stats.total_completed || 0) > 0,
        has_comparative_reports: (stats.total_completed || 0) > 1, // Need at least 2 participants
        has_batch_reports: (stats.total_completed || 0) > 0,
      };
    });

    // Calculate summary statistics
    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;
    const totalParticipants = sessions.reduce(
      (sum, s) => sum + s.total_completed,
      0
    );
    const avgCompletionRate =
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.completion_rate, 0) /
          sessions.length
        : 0;

    const allDates = sessions.flatMap((s) => [s.start_time, s.end_time]).sort();

    const response: GetSessionReportsListResponse = {
      success: true,
      message: "Session reports list retrieved successfully",
      data: {
        sessions,
        pagination: {
          current_page: query.page,
          per_page: query.per_page,
          total: totalCount,
          total_pages: totalPages,
          has_next_page: query.page < totalPages,
          has_prev_page: query.page > 1,
        },
        summary: {
          total_sessions: totalCount,
          total_completed_sessions: completedSessions,
          total_participants_across_sessions: totalParticipants,
          average_completion_rate: Math.round(avgCompletionRate * 100) / 100,
          date_range: {
            earliest_session: allDates[0] || null,
            latest_session: allDates[allDates.length - 1] || null,
          },
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session reports list:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to retrieve session reports list",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
