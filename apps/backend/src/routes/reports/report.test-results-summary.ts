import { type Context } from "hono";
import { eq, and, count, sql } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionParticipants,
  testResults,
  sessionResults,
  testAttempts,
  sessionModules,
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
 * Handler for GET /api/v1/reports/test-results/summary
 * Returns summary statistics for test results report
 */
export async function getTestResultsSummaryHandler(
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

    // Get summary statistics
    const summary = await getSummaryStats(db, whereClause);

    const response = {
      success: true,
      message: "Test results summary retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        summary: {
          total_sessions: summary.total_sessions,
          total_participants: summary.total_participants,
          total_completed: summary.total_completed,
          completion_rate: summary.completion_rate,
          average_score: summary.average_score,
        },
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results summary error:", error);
    return c.json(createErrorResponse("Failed to generate test results summary"), 500);
  }
}

// Get summary statistics using CTE with simpler approach
async function getSummaryStats(db: any, whereClause: any) {
  const [
    sessionsCount,
    participantsCount,
    participantsWithAttemptsCount,
    participantsWithResultsCount,
    totalTestAttemptsCount,
    totalTestResultsCount,
    totalSessionModulesCount,
    avgScoreFromSessionResults,
    avgScoreFromTestResults,
    gradeDistribution,
  ] = await Promise.all([
    // Sessions count
    db.select({ count: count() }).from(testSessions).where(whereClause),

    // Participants count
    db
      .select({ count: count() })
      .from(sessionParticipants)
      .innerJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .where(whereClause),

    // Participants with attempts
    db
      .select({ count: sql`COUNT(DISTINCT ${sessionParticipants.user_id})` })
      .from(sessionParticipants)
      .innerJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .innerJoin(
        testAttempts,
        eq(sessionParticipants.user_id, testAttempts.user_id)
      )
      .where(whereClause),

    // Participants with results (completed)
    db
      .select({ count: sql`COUNT(DISTINCT ${sessionParticipants.user_id})` })
      .from(sessionParticipants)
      .innerJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .innerJoin(
        sessionResults,
        eq(sessionParticipants.user_id, sessionResults.user_id)
      )
      .where(whereClause),

    // Total test attempts
    db
      .select({ count: count() })
      .from(testAttempts)
      .innerJoin(
        testSessions,
        eq(testAttempts.session_test_id, testSessions.id)
      )
      .where(whereClause),

    // Total test results
    db
      .select({ count: count() })
      .from(testResults)
      .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .innerJoin(
        testSessions,
        eq(testAttempts.session_test_id, testSessions.id)
      )
      .where(whereClause),

    // Total session modules
    db
      .select({ count: count() })
      .from(sessionModules)
      .innerJoin(testSessions, eq(sessionModules.session_id, testSessions.id))
      .where(whereClause),

    // Average score from session results
    db
      .select({ avg_score: sql`AVG(${sessionResults.weighted_score})` })
      .from(sessionResults)
      .innerJoin(testSessions, eq(sessionResults.session_id, testSessions.id))
      .where(whereClause),

    // Average score from test results (fallback)
    db
      .select({ avg_score: sql`AVG(${testResults.scaled_score})` })
      .from(testResults)
      .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .innerJoin(
        testSessions,
        eq(testAttempts.session_test_id, testSessions.id)
      )
      .where(whereClause),

    // Grade distribution
    db
      .select({
        grade: sessionResults.overall_grade,
        count: count(),
      })
      .from(sessionResults)
      .innerJoin(testSessions, eq(sessionResults.session_id, testSessions.id))
      .where(whereClause)
      .groupBy(sessionResults.overall_grade),
  ]);

  const completedCount = participantsWithResultsCount[0]?.count || 0;
  const totalParticipants = participantsCount[0]?.count || 0;

  // Use whichever average score has data
  const avgScoreResult = avgScoreFromSessionResults[0]?.avg_score
    ? avgScoreFromSessionResults[0]
    : avgScoreFromTestResults[0];

  const grades = gradeDistribution.reduce((acc: any, curr: any) => {
    acc[curr.grade || "Unknown"] = curr.count;
    return acc;
  }, {});

  return {
    total_sessions: Number(sessionsCount[0]?.count || 0),
    total_participants: Number(totalParticipants),
    total_completed: Number(completedCount),
    completion_rate:
      totalParticipants > 0
        ? Number(
            ((Number(completedCount) / totalParticipants) * 100).toFixed(1)
          )
        : 0,
    average_score: avgScoreResult?.avg_score
      ? Number(Number(avgScoreResult.avg_score).toFixed(1))
      : 0,
    grade_distribution: grades,
    total_test_attempts: Number(totalTestAttemptsCount[0]?.count || 0),
    total_test_results: Number(totalTestResultsCount[0]?.count || 0),
    total_session_modules: Number(totalSessionModulesCount[0]?.count || 0),
    participants_with_attempts: Number(
      participantsWithAttemptsCount[0]?.count || 0
    ),
  };
}