import { type Context } from "hono";
import { eq, count, sql } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionModules,
  tests,
  testAttempts,
  testResults,
  getDbFromEnv,
} from "@/db";
import {
  validateAdminAccess,
  parseReportQuery,
  calculateDateRange,
  buildWhereClause,
  createErrorResponse,
  generateTestModuleIcon,
} from "./shared/report-utils";

/**
 * Handler for GET /api/v1/reports/test-results/modules
 * Returns test module summary for test results report
 */
export async function getTestResultsModulesHandler(
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

    // Get test module summary
    const testModuleSummary = await getTestModuleSummary(db, whereClause);

    const simplifiedTestModuleSummary = testModuleSummary.map(
      (module: any) => ({
        test_name: module.test_name,
        module_type:
          module.category === "personality" ? "personality" : "cognitive",
        category: module.category,
        icon: module.icon,
        total_attempts: module.total_attempts,
        average_score: module.average_score,
        completion_rate: module.completion_rate,
      })
    );

    const response = {
      success: true,
      message: "Test results module summary retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        test_module_summary: simplifiedTestModuleSummary,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results module summary error:", error);
    return c.json(createErrorResponse("Failed to generate test results module summary"), 500);
  }
}

// Get test module summary
async function getTestModuleSummary(db: any, whereClause: any) {
  const moduleData = await db
    .select({
      test_name: tests.name,
      category: tests.category,
      icon: tests.icon,
      total_attempts: count(testResults.id),
      avg_score: sql`AVG(${testResults.scaled_score})`,
      completion_rate: sql`(COUNT(${testResults.id}) * 100.0 / COUNT(${testAttempts.id}))`,
    })
    .from(testSessions)
    .innerJoin(sessionModules, eq(testSessions.id, sessionModules.session_id))
    .innerJoin(tests, eq(sessionModules.test_id, tests.id))
    .leftJoin(testAttempts, eq(tests.id, testAttempts.test_id))
    .leftJoin(testResults, eq(testAttempts.id, testResults.attempt_id))
    .where(whereClause)
    .groupBy(tests.name, tests.category, tests.icon);

  return moduleData.map((module: any) => ({
    test_name: module.test_name,
    category: module.category,
    icon: generateTestModuleIcon(module),
    total_attempts: module.total_attempts,
    average_score: module.avg_score
      ? Number(Number(module.avg_score).toFixed(1))
      : 0,
    completion_rate: module.completion_rate
      ? Number(Number(module.completion_rate).toFixed(1))
      : 0,
  }));
}