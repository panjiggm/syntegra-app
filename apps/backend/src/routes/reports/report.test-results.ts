// apps/backend/src/routes/reports/report.test-results.ts
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
  type GetTestResultsReportResponse,
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

    // Debug log untuk melihat tanggal yang dihitung
    console.log("Debug period calculation:", {
      period_type: query.period_type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label
    });

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

    // Debug: Check if there are any sessions in the date range without status filter
    const totalSessionsInDateRange = await db
      .select({ count: count() })
      .from(testSessions)
      .where(between(testSessions.start_time, startDate, endDate));
    
    // Debug: Check total sessions in database
    const totalSessionsAll = await db
      .select({ count: count() })
      .from(testSessions);
    
    // Debug: Check all sessions with their dates
    const allSessionsDates = await db
      .select({ 
        id: testSessions.id,
        start_time: testSessions.start_time,
        status: testSessions.status 
      })
      .from(testSessions)
      .limit(10);
    
    console.log("Debug sessions extensive check:", {
      totalSessionsInDateRange: totalSessionsInDateRange[0]?.count || 0,
      totalSessionsAll: totalSessionsAll[0]?.count || 0,
      sampleSessions: allSessionsDates.map(s => ({
        id: s.id,
        start_time: s.start_time?.toISOString(),
        status: s.status
      })),
      queryDateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    // Get summary statistics
    const summary = await getSummaryStats(db, whereClause);

    // Get sessions with statistics
    const sessions = await getSessionsWithStats(db, whereClause);

    // Get all participants with their results
    const participants = await getParticipantsWithResults(db, whereClause);

    // Get position summary
    const positionSummary = await getPositionSummary(db, whereClause);

    // Get test module summary
    const testModuleSummary = await getTestModuleSummary(db, whereClause);

    const response: GetTestResultsReportResponse = {
      success: true,
      message: "Test results report retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        summary,
        sessions,
        participants,
        position_summary: positionSummary,
        test_module_summary: testModuleSummary,
        generated_at: new Date().toISOString(),
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
      endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
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

// Get summary statistics
async function getSummaryStats(db: any, whereClause: any) {
  const [sessionsCount] = await db
    .select({ count: count() })
    .from(testSessions)
    .where(whereClause);

  const [participantsCount] = await db
    .select({ count: count() })
    .from(sessionParticipants)
    .innerJoin(
      testSessions,
      eq(sessionParticipants.session_id, testSessions.id)
    )
    .where(whereClause);

  const [completedCount] = await db
    .select({ count: count() })
    .from(sessionParticipants)
    .innerJoin(
      testSessions,
      eq(sessionParticipants.session_id, testSessions.id)
    )
    .where(and(whereClause, eq(sessionParticipants.status, "completed")));

  const avgScoreResult = await db
    .select({
      avg_score: sql`AVG(${sessionResults.weighted_score})`,
    })
    .from(sessionResults)
    .innerJoin(testSessions, eq(sessionResults.session_id, testSessions.id))
    .where(whereClause);

  const gradeDistribution = await db
    .select({
      grade: sessionResults.overall_grade,
      count: count(),
    })
    .from(sessionResults)
    .innerJoin(testSessions, eq(sessionResults.session_id, testSessions.id))
    .where(whereClause)
    .groupBy(sessionResults.overall_grade);

  const grades = gradeDistribution.reduce((acc: any, curr: any) => {
    acc[curr.grade || "Unknown"] = curr.count;
    return acc;
  }, {});

  return {
    total_sessions: sessionsCount.count,
    total_participants: participantsCount.count,
    total_completed: completedCount.count,
    completion_rate:
      participantsCount.count > 0
        ? Number(
            ((completedCount.count / participantsCount.count) * 100).toFixed(1)
          )
        : 0,
    average_score: avgScoreResult[0]?.avg_score
      ? Number(Number(avgScoreResult[0].avg_score).toFixed(1))
      : 0,
    grade_distribution: grades,
  };
}

// Get sessions with their statistics
async function getSessionsWithStats(db: any, whereClause: any) {
  const sessionsData = await db
    .select({
      session_id: testSessions.id,
      session_code: testSessions.session_code,
      session_name: testSessions.session_name,
      start_time: testSessions.start_time,
      end_time: testSessions.end_time,
      target_position: testSessions.target_position,
      location: testSessions.location,
      proctor_name: users.name,
    })
    .from(testSessions)
    .leftJoin(users, eq(testSessions.proctor_id, users.id))
    .where(whereClause)
    .orderBy(desc(testSessions.start_time));

  // Get statistics for each session
  const sessions = await Promise.all(
    sessionsData.map(async (session: any) => {
      const [participantsCount] = await db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(eq(sessionParticipants.session_id, session.session_id));

      const [completedCount] = await db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.session_id, session.session_id),
            eq(sessionParticipants.status, "completed")
          )
        );

      const avgScoreResult = await db
        .select({
          avg_score: sql`AVG(${sessionResults.weighted_score})`,
          avg_duration: sql`AVG(${testAttempts.time_spent})`,
        })
        .from(sessionResults)
        .leftJoin(
          testAttempts,
          eq(sessionResults.user_id, testAttempts.user_id)
        )
        .where(eq(sessionResults.session_id, session.session_id));

      const modules = await db
        .select({
          test_name: tests.name,
        })
        .from(sessionModules)
        .innerJoin(tests, eq(sessionModules.test_id, tests.id))
        .where(eq(sessionModules.session_id, session.session_id))
        .orderBy(asc(sessionModules.sequence));

      return {
        session_id: session.session_id,
        session_code: session.session_code,
        session_name: session.session_name,
        date: session.start_time.toISOString().split("T")[0],
        time: `${session.start_time.toTimeString().slice(0, 5)}-${session.end_time.toTimeString().slice(0, 5)}`,
        target_position: session.target_position || "Unknown",
        location: session.location,
        proctor_name: session.proctor_name,
        total_participants: participantsCount.count,
        completed_participants: completedCount.count,
        completion_rate:
          participantsCount.count > 0
            ? Number(
                (
                  (completedCount.count / participantsCount.count) *
                  100
                ).toFixed(1)
              )
            : 0,
        average_score: avgScoreResult[0]?.avg_score
          ? Number(Number(avgScoreResult[0].avg_score).toFixed(1))
          : 0,
        average_duration_minutes: avgScoreResult[0]?.avg_duration
          ? Math.round(Number(avgScoreResult[0].avg_duration) / 60)
          : 0,
        test_modules: modules
          .map((m: { test_name: string }) => m.test_name)
          .join(", "),
      };
    })
  );

  return sessions;
}

// Get participants with their results
async function getParticipantsWithResults(db: any, whereClause: any) {
  // First, get the participant data without JSON fields to avoid GROUP BY issues
  const participantsData = await db
    .select({
      session_code: testSessions.session_code,
      session_name: testSessions.session_name,
      nik: users.nik,
      name: users.name,
      gender: users.gender,
      birth_date: users.birth_date,
      education: users.education,
      total_score: sessionResults.weighted_score,
      overall_grade: sessionResults.overall_grade,
      overall_percentile: sessionResults.overall_percentile,
      completion_rate: sessionResults.completion_rate,
      status: sessionParticipants.status,
      user_id: users.id,
      session_id: testSessions.id,
    })
    .from(sessionParticipants)
    .innerJoin(
      testSessions,
      eq(sessionParticipants.session_id, testSessions.id)
    )
    .innerJoin(users, eq(sessionParticipants.user_id, users.id))
    .leftJoin(
      sessionResults,
      and(
        eq(sessionResults.user_id, users.id),
        eq(sessionResults.session_id, testSessions.id)
      )
    )
    .where(whereClause)
    .orderBy(asc(testSessions.session_code), asc(users.name));

  // Then, for each participant, get their test attempts and additional data
  const participantsWithDetails = await Promise.all(
    participantsData.map(async (participant: any) => {
      // Get test attempts for this user
      const attempts = await db
        .select({
          start_time: testAttempts.start_time,
          actual_end_time: testAttempts.actual_end_time,
        })
        .from(testAttempts)
        .where(eq(testAttempts.user_id, participant.user_id));

      // Get session results with JSON fields
      const [sessionResult] = await db
        .select({
          recommended_positions: sessionResults.recommended_positions,
          primary_traits: sessionResults.primary_traits,
        })
        .from(sessionResults)
        .where(
          and(
            eq(sessionResults.user_id, participant.user_id),
            eq(sessionResults.session_id, participant.session_id)
          )
        )
        .limit(1);

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
          ? new Date(
              Math.max(...endTimes.map((t: any) => new Date(t).getTime()))
            )
          : null;

      return {
        ...participant,
        start_time,
        end_time,
        recommended_positions: sessionResult?.recommended_positions,
        primary_traits: sessionResult?.primary_traits,
      };
    })
  );

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
      status:
        participant.status === "completed"
          ? "Completed"
          : participant.status === "started"
            ? "In Progress"
            : "Not Started",
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
    .groupBy(tests.name, tests.category);

  return moduleData.map((module: any) => ({
    test_name: module.test_name,
    category: module.category,
    total_attempts: module.total_attempts,
    average_score: module.avg_score
      ? Number(Number(module.avg_score).toFixed(1))
      : 0,
    completion_rate: module.completion_rate
      ? Number(Number(module.completion_rate).toFixed(1))
      : 0,
  }));
}
