import { type Context } from "hono";
import { eq, and, between, desc, asc, sql, count } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionParticipants,
  testResults,
  sessionResults,
  users,
  tests,
  sessionModules,
  testAttempts,
  getDbFromEnv,
} from "@/db";
import {
  type GetTestResultsReportQuery,
  type ReportErrorResponse,
} from "shared-types";

/**
 * Handler for GET /api/v1/reports/test-results
 * Returns test results report for specified period
 */
export async function getTestResultsReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { auth: any } }>
): Promise<Response> {
  try {
    const rawQuery = c.req.query();
    const auth = c.get("auth");
    const currentUser = auth.user;

    // Only admins can access test results reports
    if (currentUser.role !== "admin") {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Parse and validate query parameters
    const query: GetTestResultsReportQuery = {
      period_type: (rawQuery.period_type as any) || "this_month",
      start_date: rawQuery.start_date,
      end_date: rawQuery.end_date,
      position: rawQuery.position,
      session_id: rawQuery.session_id,
    };

    // Calculate date range based on period_type
    const { startDate, endDate, label } = calculateDateRange(query);

    // Get database connection
    const db = getDbFromEnv(c.env);

    // Build base date filter
    const dateFilter = between(testSessions.start_time, startDate, endDate);
    // Temporarily remove status filter to debug
    // const dateFilter = and(
    //   between(testSessions.start_time, startDate, endDate),
    //   eq(testSessions.status, "completed")
    // );

    // Add optional filters
    const filters = [dateFilter];
    if (query.position) {
      filters.push(eq(testSessions.target_position, query.position));
    }
    if (query.session_id) {
      filters.push(eq(testSessions.id, query.session_id));
    }

    const whereClause = and(...filters);

    // Get summary statistics
    const summary = await getSummaryStats(db, whereClause);

    // Get sessions with statistics
    const sessions = await getSessionsWithStats(db, whereClause);

    // Get all participants with their results
    const participants = await getParticipantsWithResults(db, whereClause);

    // Calculate average score from participants data (more reliable)
    const participantsWithScores = participants.filter(
      (p: any) => p.total_score && p.total_score > 0
    );
    const avgScoreFromParticipants =
      participantsWithScores.length > 0
        ? participantsWithScores.reduce(
            (sum: number, p: any) => sum + p.total_score,
            0
          ) / participantsWithScores.length
        : 0;

    // Update summary with more accurate average score
    if (avgScoreFromParticipants > 0) {
      summary.average_score = Number(avgScoreFromParticipants.toFixed(1));
    }

    // Get position summary
    const positionSummary = await getPositionSummary(db, whereClause);

    // Get test module summary
    const testModuleSummary = await getTestModuleSummary(db, whereClause);

    // Simplified response structure
    const simplifiedPositionSummary = positionSummary.map((pos: any) => ({
      target_position: pos.target_position,
      total_participants: pos.total_participants,
    }));

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

    const simplifiedParticipants = participants.map((participant: any) => ({
      nik: participant.nik,
      name: participant.name,
      gender: participant.gender,
      age: participant.age,
      total_score: participant.total_score,
      overall_grade: participant.overall_grade,
    }));

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
      message: "Test results report retrieved successfully",
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
        position_summary: simplifiedPositionSummary,
        sessions: simplifiedSessions,
        participants: simplifiedParticipants,
        test_module_summary: simplifiedTestModuleSummary,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results report error:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to generate test results report",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// Helper function to calculate date range
function calculateDateRange(query: GetTestResultsReportQuery) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (query.period_type) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      label = "Hari Ini";
      break;

    case "this_week":
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        diff + 6,
        23,
        59,
        59
      );
      label = "Minggu Ini";
      break;

    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `${now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
      break;

    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      endDate = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      label = `${lastMonth.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
      break;

    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // December 31st
      label = `Tahun ${now.getFullYear()}`;
      break;

    case "custom":
      if (!query.start_date || !query.end_date) {
        throw new Error(
          "Start date and end date are required for custom period"
        );
      }
      startDate = new Date(query.start_date);
      endDate = new Date(query.end_date);
      endDate.setHours(23, 59, 59);
      label = `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`;
      break;

    default:
      // Default to this month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `${now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
  }

  return { startDate, endDate, label };
}

// Get summary statistics using CTE with simpler approach
async function getSummaryStats(db: any, whereClause: any) {
  // Since Drizzle CTE syntax is complex, let's use a more efficient approach
  // Execute multiple optimized queries in parallel instead of complex CTE

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

// Get participants with their results
async function getParticipantsWithResults(db: any, whereClause: any) {
  // First, get all session participants that match the filter
  const sessionParticipantsData = await db
    .select({
      session_id: testSessions.id,
      session_code: testSessions.session_code,
      session_name: testSessions.session_name,
      user_id: sessionParticipants.user_id,
      participant_status: sessionParticipants.status,
      nik: users.nik,
      name: users.name,
      gender: users.gender,
      birth_date: users.birth_date,
      education: users.education,
    })
    .from(sessionParticipants)
    .innerJoin(
      testSessions,
      eq(sessionParticipants.session_id, testSessions.id)
    )
    .innerJoin(users, eq(sessionParticipants.user_id, users.id))
    .where(whereClause)
    .orderBy(asc(testSessions.session_code), asc(users.name));

  // Import calculation functions and Drizzle utilities
  const {
    calculateFreshScoresForUsers,
    groupFreshScoresByUser,
    calculateUserAverageFromFreshScores,
  } = await import("@/lib/reportCalculations");

  const { inArray } = await import("drizzle-orm");

  // Get all unique user IDs
  const userIds = [
    ...new Set(sessionParticipantsData.map((p: any) => p.user_id)),
  ] as string[];

  // Calculate fresh scores for all users (this will give us the real scores and grades)
  const allUsersFreshScores = await calculateFreshScoresForUsers(db, userIds);

  // Group fresh scores by user
  const userFreshScores = groupFreshScoresByUser(allUsersFreshScores);

  // Get session results for additional data
  const sessionIds = [
    ...new Set(sessionParticipantsData.map((p: any) => p.session_id)),
  ] as string[];

  let sessionResultsData: any[] = [];

  if (userIds.length > 0 && sessionIds.length > 0) {
    sessionResultsData = await db
      .select({
        user_id: sessionResults.user_id,
        session_id: sessionResults.session_id,
        weighted_score: sessionResults.weighted_score,
        overall_grade: sessionResults.overall_grade,
        overall_percentile: sessionResults.overall_percentile,
        completion_rate: sessionResults.completion_rate,
        recommended_positions: sessionResults.recommended_positions,
        primary_traits: sessionResults.primary_traits,
      })
      .from(sessionResults)
      .where(
        and(
          inArray(sessionResults.user_id, userIds),
          inArray(sessionResults.session_id, sessionIds)
        )
      );
  }

  // Create maps for quick lookup
  const sessionResultsMap = new Map();
  sessionResultsData.forEach((result) => {
    const key = `${result.user_id}-${result.session_id}`;
    sessionResultsMap.set(key, result);
  });

  // Now combine the data
  const participantsData = sessionParticipantsData.map((participant: any) => {
    const sessionResultKey = `${participant.user_id}-${participant.session_id}`;
    const sessionResult = sessionResultsMap.get(sessionResultKey);

    // Get fresh scores for this user
    const userScores = userFreshScores[participant.user_id] || [];
    let freshAverage = null;
    let calculatedGrade = null;

    if (userScores.length > 0) {
      freshAverage = calculateUserAverageFromFreshScores(userScores);

      // Calculate grade based on fresh scores
      if (freshAverage.overallScore > 0) {
        if (freshAverage.overallScore >= 90) calculatedGrade = "A";
        else if (freshAverage.overallScore >= 80) calculatedGrade = "B";
        else if (freshAverage.overallScore >= 70) calculatedGrade = "C";
        else if (freshAverage.overallScore >= 60) calculatedGrade = "D";
        else calculatedGrade = "E";
      }
    }

    return {
      ...participant,
      // Use session results if available, otherwise use calculated fresh scores
      total_score:
        sessionResult?.weighted_score ||
        (freshAverage ? freshAverage.overallScore : null),
      overall_grade: sessionResult?.overall_grade || calculatedGrade,
      overall_percentile:
        sessionResult?.overall_percentile ||
        (freshAverage ? freshAverage.overallPercentile : null),
      completion_rate: sessionResult?.completion_rate,
      status: participant.participant_status,
      recommended_positions: sessionResult?.recommended_positions,
      primary_traits: sessionResult?.primary_traits,
    };
  });

  // Get test attempts for duration calculation
  let userAttemptsData: any[] = [];

  if (userIds.length > 0) {
    userAttemptsData = await db
      .select({
        user_id: testAttempts.user_id,
        start_time: testAttempts.start_time,
        actual_end_time: testAttempts.actual_end_time,
      })
      .from(testAttempts)
      .where(inArray(testAttempts.user_id, userIds));
  }

  // Group attempts by user
  const userAttemptsMap = new Map();
  userAttemptsData.forEach((attempt) => {
    if (!userAttemptsMap.has(attempt.user_id)) {
      userAttemptsMap.set(attempt.user_id, []);
    }
    userAttemptsMap.get(attempt.user_id).push(attempt);
  });

  // Add timing data to participants
  const participantsWithDetails = participantsData.map((participant: any) => {
    const attempts = userAttemptsMap.get(participant.user_id) || [];

    const startTimes = attempts
      .map((a: { start_time: Date }) => a.start_time)
      .filter(Boolean);
    const endTimes = attempts
      .map((a: { actual_end_time: Date }) => a.actual_end_time)
      .filter(Boolean);

    const start_time =
      startTimes.length > 0
        ? new Date(
            Math.min(...startTimes.map((t: any) => new Date(t).getTime()))
          )
        : null;
    const end_time =
      endTimes.length > 0
        ? new Date(Math.max(...endTimes.map((t: any) => new Date(t).getTime())))
        : null;

    return {
      ...participant,
      start_time,
      end_time,
    };
  });

  // Remove chart data generation - no longer needed

  return participantsWithDetails.map((participant: any) => {
    const age = participant.birth_date
      ? new Date().getFullYear() - participant.birth_date.getFullYear()
      : null;

    const duration =
      participant.start_time && participant.end_time
        ? Math.round(
            (new Date(participant.end_time).getTime() -
              new Date(participant.start_time).getTime()) /
              (1000 * 60)
          )
        : 0;

    // Handle JSON objects directly (no need to parse strings)
    let recommendedPosition = "N/A";
    let compatibilityScore = 0;

    if (participant.recommended_positions) {
      try {
        const positions = Array.isArray(participant.recommended_positions)
          ? participant.recommended_positions
          : participant.recommended_positions;
        recommendedPosition = positions?.[0]?.position || "N/A";
        compatibilityScore = positions?.[0]?.compatibility_score || 0;
      } catch (error) {
        console.error("Error processing recommended_positions:", error);
      }
    }

    // Determine proper status text
    let statusText = "Not Started";
    if (participant.status === "completed") {
      statusText = "Completed";
    } else if (
      participant.status === "started" ||
      participant.status === "in_progress"
    ) {
      statusText = "In Progress";
    }

    return {
      session_code: participant.session_code,
      session_name: participant.session_name,
      nik: participant.nik,
      name: participant.name,
      gender:
        participant.gender === "male"
          ? "Laki-laki"
          : participant.gender === "female"
            ? "Perempuan"
            : "Lainnya",
      age,
      education: participant.education?.toUpperCase(),
      total_score: participant.total_score
        ? Number(participant.total_score)
        : 0,
      overall_grade: participant.overall_grade || "N/A",
      overall_percentile: participant.overall_percentile
        ? Number(participant.overall_percentile)
        : 0,
      completion_rate: participant.completion_rate
        ? Number(participant.completion_rate)
        : 0,
      duration_minutes: duration,
      status: statusText,
      recommended_position: recommendedPosition,
      compatibility_score: compatibilityScore,
      primary_traits: (() => {
        if (participant.primary_traits) {
          try {
            const traits = Array.isArray(participant.primary_traits)
              ? participant.primary_traits
              : participant.primary_traits;
            return Array.isArray(traits) ? traits.join(", ") : "N/A";
          } catch (error) {
            console.error("Error processing primary_traits:", error);
            return "N/A";
          }
        }
        return "N/A";
      })(),
    };
  });
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

// Generate test module icon based on database icon and performance
function generateTestModuleIcon(module: any): string {
  // Priority 1: Use existing icon from tests table if available
  if (module.icon) {
    return module.icon;
  }

  // Priority 2: Category-based fallback icons (jika icon database kosong)
  const categoryIcons: Record<string, string> = {
    wais: "🧠",
    mbti: "🎭",
    wartegg: "🎨",
    riasec: "🔍",
    kraepelin: "🔢",
    pauli: "➕",
    big_five: "🌟",
    papi_kostick: "📊",
    dap: "👤",
    raven: "🧩",
    epps: "💭",
    army_alpha: "🎯",
    htp: "🏠",
    disc: "🎪",
    iq: "🤔",
    eq: "❤️",
  };

  // Default to category-based icon or generic test icon
  return categoryIcons[module.category] || "📝";
}
