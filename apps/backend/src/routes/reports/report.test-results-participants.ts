import { type Context } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import {
  testSessions,
  sessionParticipants,
  sessionResults,
  testAttempts,
  users,
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
 * Handler for GET /api/v1/reports/test-results/participants
 * Returns participants data for test results report
 */
export async function getTestResultsParticipantsHandler(
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

    // Get all participants with their results
    const participants = await getParticipantsWithResults(db, whereClause);

    const simplifiedParticipants = participants.map((participant: any) => ({
      nik: participant.nik,
      name: participant.name,
      gender: participant.gender,
      age: participant.age,
      total_score: participant.total_score,
      overall_grade: participant.overall_grade,
    }));

    const response = {
      success: true,
      message: "Test results participants retrieved successfully",
      data: {
        period: {
          type: query.period_type,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          label,
        },
        participants: simplifiedParticipants,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Get test results participants error:", error);
    return c.json(createErrorResponse("Failed to generate test results participants"), 500);
  }
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