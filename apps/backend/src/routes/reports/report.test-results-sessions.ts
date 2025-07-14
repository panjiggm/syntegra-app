import { type Context } from "hono";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionParticipants,
  sessionResults,
  testAttempts,
  sessionModules,
  tests,
  getDbFromEnv,
} from "@/db";
import {
  validateAdminAccess,
  parseReportQuery,
  calculateDateRange,
  buildWhereClause,
  createErrorResponse,
} from "./shared/report-utils";

/**
 * Handler for GET /api/v1/reports/test-results/sessions
 * Returns sessions data for test results report
 */
export async function getTestResultsSessionsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { auth: any } }>
): Promise<Response> {
  try {
    // Validate admin access
    const accessError = validateAdminAccess(c);
    if (accessError) {
      return c.json(accessError, 403);
    }

    // Parse query parameters
    const rawQuery = c.req.query();
    const query = parseReportQuery(rawQuery);

    // Calculate date range
    const { startDate, endDate, label } = calculateDateRange(query);

    // Get database connection and build where clause
    const db = getDbFromEnv(c.env);
    const whereClause = buildWhereClause(query);

    // Get sessions with statistics
    const sessions = await getSessionsWithStats(db, whereClause);

    const simplifiedSessions = sessions.map((session: any) => ({
      session_id: session.session_id,
      session_code: session.session_code,
      session_name: session.session_name,
      date: session.date,
      total_participants: session.total_participants,
      average_score: session.average_score,
      average_duration_minutes: session.average_duration_minutes,
      test_modules: session.test_modules,
    }));

    const response = {
      success: true,
      message: "Test results sessions retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        sessions: simplifiedSessions,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results sessions error:", error);
    return c.json(createErrorResponse("Failed to generate test results sessions"), 500);
  }
}

// Get sessions with their statistics (simplified version)
async function getSessionsWithStats(db: any, whereClause: any) {
  const { inArray } = await import("drizzle-orm");

  // Single optimized query with all needed data
  const sessionsData = await db
    .select({
      session_id: testSessions.id,
      session_code: testSessions.session_code,
      session_name: testSessions.session_name,
      date: testSessions.start_time,
      total_participants: sql<number>`COUNT(DISTINCT ${sessionParticipants.user_id})`,
      total_completed: sql<number>`COUNT(DISTINCT CASE WHEN ${sessionParticipants.status} = 'completed' THEN ${sessionParticipants.user_id} END)`,
      average_score: sql<number>`COALESCE(AVG(${sessionResults.weighted_score}), 0)`,
      average_duration_minutes: sql<number>`COALESCE(AVG(${testAttempts.time_spent}) / 60, 0)`,
    })
    .from(testSessions)
    .leftJoin(
      sessionParticipants,
      eq(testSessions.id, sessionParticipants.session_id)
    )
    .leftJoin(
      sessionResults,
      and(
        eq(sessionParticipants.user_id, sessionResults.user_id),
        eq(sessionParticipants.session_id, sessionResults.session_id)
      )
    )
    .leftJoin(
      testAttempts,
      eq(sessionParticipants.user_id, testAttempts.user_id)
    )
    .where(whereClause)
    .groupBy(
      testSessions.id,
      testSessions.session_code,
      testSessions.session_name,
      testSessions.start_time
    )
    .orderBy(desc(testSessions.start_time));

  // Get session modules in a single query
  const sessionIds = sessionsData.map((s: any) => s.session_id);
  let modulesData: any[] = [];

  if (sessionIds.length > 0) {
    modulesData = await db
      .select({
        session_id: sessionModules.session_id,
        test_name: tests.name,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(inArray(sessionModules.session_id, sessionIds))
      .orderBy(asc(sessionModules.sequence));
  }

  // Group modules by session
  const modulesMap = new Map();
  modulesData.forEach((module: any) => {
    if (!modulesMap.has(module.session_id)) {
      modulesMap.set(module.session_id, []);
    }
    modulesMap.get(module.session_id).push(module.test_name);
  });

  // Format simplified response
  return sessionsData.map((session: any) => {
    const modules = modulesMap.get(session.session_id) || [];
    const completionRate =
      session.total_participants > 0
        ? Math.round(
            (session.total_completed / session.total_participants) * 100
          )
        : 0;

    return {
      session_id: session.session_id,
      session_code: session.session_code,
      session_name: session.session_name,
      date: session.date.toISOString().split("T")[0],
      total_participants: Number(session.total_participants) || 0,
      average_score: Math.round(Number(session.average_score) * 100) / 100,
      average_duration_minutes:
        Math.round(Number(session.average_duration_minutes) * 100) / 100,
      test_modules: modules.join(", "),
    };
  });
}