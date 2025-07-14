import { type Context } from "hono";
import { eq, count, sql } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionParticipants,
  sessionResults,
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
 * Handler for GET /api/v1/reports/test-results/positions
 * Returns position summary for test results report
 */
export async function getTestResultsPositionsHandler(
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

    // Get position summary
    const positionSummary = await getPositionSummary(db, whereClause);

    const simplifiedPositionSummary = positionSummary.map((pos: any) => ({
      target_position: pos.target_position,
      total_participants: pos.total_participants,
    }));

    const response = {
      success: true,
      message: "Test results position summary retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        position_summary: simplifiedPositionSummary,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results position summary error:", error);
    return c.json(createErrorResponse("Failed to generate test results position summary"), 500);
  }
}

// Get position summary
async function getPositionSummary(db: any, whereClause: any) {
  const positionData = await db
    .select({
      target_position: testSessions.target_position,
      total_participants: count(sessionParticipants.id),
      completed: sql`COUNT(CASE WHEN ${sessionParticipants.status} = 'completed' THEN 1 END)`,
      avg_score: sql`AVG(${sessionResults.weighted_score})`,
      grade_A: sql`COUNT(CASE WHEN ${sessionResults.overall_grade} = 'A' THEN 1 END)`,
      grade_B: sql`COUNT(CASE WHEN ${sessionResults.overall_grade} = 'B' THEN 1 END)`,
      grade_C: sql`COUNT(CASE WHEN ${sessionResults.overall_grade} = 'C' THEN 1 END)`,
      grade_D: sql`COUNT(CASE WHEN ${sessionResults.overall_grade} = 'D' THEN 1 END)`,
    })
    .from(testSessions)
    .leftJoin(
      sessionParticipants,
      eq(testSessions.id, sessionParticipants.session_id)
    )
    .leftJoin(
      sessionResults,
      eq(sessionParticipants.user_id, sessionResults.user_id)
    )
    .where(whereClause)
    .groupBy(testSessions.target_position);

  return positionData.map((pos: any) => ({
    target_position: pos.target_position || "Unknown",
    total_participants: pos.total_participants,
    completed: Number(pos.completed),
    completion_rate:
      pos.total_participants > 0
        ? Number(
            ((Number(pos.completed) / pos.total_participants) * 100).toFixed(1)
          )
        : 0,
    average_score: pos.avg_score ? Number(Number(pos.avg_score).toFixed(1)) : 0,
    grade_A: Number(pos.grade_A),
    grade_B: Number(pos.grade_B),
    grade_C: Number(pos.grade_C),
    grade_D: Number(pos.grade_D),
  }));
}