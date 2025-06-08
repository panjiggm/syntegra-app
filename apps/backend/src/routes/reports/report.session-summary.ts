import { Context } from "hono";
import { eq, and, desc, count, sql, avg } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
  testResults,
  tests,
  users,
  sessionModules,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionSummaryReportQuery,
  type GetSessionSummaryReportResponse,
  type ReportErrorResponse,
  type SessionSummaryReportData,
  calculateCompletionRate,
  generateExecutiveSummary,
} from "shared-types";

export async function getSessionSummaryReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const { sessionId } = c.req.param();
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: GetSessionSummaryReportQuery = {
      format: (rawQuery.format as any) || "json",
      include_charts: rawQuery.include_charts !== "false",
      include_participant_breakdown:
        rawQuery.include_participant_breakdown !== "false",
      include_test_analysis: rawQuery.include_test_analysis !== "false",
      include_trends: rawQuery.include_trends === "true",
      language: (rawQuery.language as any) || "id",
    };

    // Get session information
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        location: testSessions.location,
        description: testSessions.description,
        status: testSessions.status,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        proctor_id: testSessions.proctor_id,
        created_at: testSessions.created_at,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    if (!session) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "session_id",
            message: "Session with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Get proctor information
    let proctorName = null;
    if (session.proctor_id) {
      const [proctor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.proctor_id))
        .limit(1);
      proctorName = proctor?.name || null;
    }

    // Get participation statistics
    const [totalInvited] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, sessionId));

    const [totalRegistered] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          sql`${sessionParticipants.status} IN ('registered', 'started', 'completed')`
        )
      );

    const [totalStarted] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          sql`${sessionParticipants.status} IN ('started', 'completed')`
        )
      );

    const [totalCompleted] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          eq(sessionParticipants.status, "completed")
        )
      );

    const [noShowCount] = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          eq(sessionParticipants.status, "no_show")
        )
      );

    const dropoutCount = totalStarted.count - totalCompleted.count;
    const completionRate = calculateCompletionRate(
      totalCompleted.count,
      totalStarted.count
    );

    // Calculate average time spent
    const [avgTimeSpent] = await db
      .select({
        avg_time: avg(testAttempts.time_spent),
      })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          eq(testAttempts.status, "completed"),
          sql`${testAttempts.time_spent} IS NOT NULL`
        )
      );

    const averageTimeSpentMinutes = avgTimeSpent.avg_time
      ? Math.round(Number(avgTimeSpent.avg_time) / 60)
      : 0;

    // Get test modules for this session
    const testModules = await db
      .select({
        test_id: tests.id,
        test_name: tests.name,
        test_category: tests.category,
        module_type: tests.module_type,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
        weight: sessionModules.weight,
        time_limit: tests.time_limit,
        total_questions: tests.total_questions,
        passing_score: tests.passing_score,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, sessionId))
      .orderBy(sessionModules.sequence);

    // Analyze each test module
    const testModuleAnalysis = await Promise.all(
      testModules.map(async (module) => {
        // Get participants who started this test
        const [participantsStarted] = await db
          .select({ count: count() })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testAttempts.test_id, module.test_id)
            )
          );

        // Get participants who completed this test
        const [participantsCompleted] = await db
          .select({ count: count() })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testAttempts.test_id, module.test_id),
              eq(testAttempts.status, "completed")
            )
          );

        // Calculate completion rate for this module
        const moduleCompletionRate = calculateCompletionRate(
          participantsCompleted.count,
          participantsStarted.count
        );

        // Get average score for this module
        const [avgScore] = await db
          .select({
            avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
          })
          .from(testResults)
          .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testResults.test_id, module.test_id),
              sql`${testResults.scaled_score} IS NOT NULL`
            )
          );

        // Get average time for this module
        const [avgTime] = await db
          .select({
            avg_time: avg(testAttempts.time_spent),
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testAttempts.test_id, module.test_id),
              eq(testAttempts.status, "completed"),
              sql`${testAttempts.time_spent} IS NOT NULL`
            )
          );

        // Calculate difficulty level based on completion rate and average score
        let difficultyLevel:
          | "very_easy"
          | "easy"
          | "moderate"
          | "difficult"
          | "very_difficult" = "moderate";
        const avgScoreValue = avgScore.avg_score
          ? Number(avgScore.avg_score)
          : 0;

        if (moduleCompletionRate >= 90 && avgScoreValue >= 80) {
          difficultyLevel = "very_easy";
        } else if (moduleCompletionRate >= 80 && avgScoreValue >= 70) {
          difficultyLevel = "easy";
        } else if (moduleCompletionRate >= 60 && avgScoreValue >= 60) {
          difficultyLevel = "moderate";
        } else if (moduleCompletionRate >= 40 && avgScoreValue >= 50) {
          difficultyLevel = "difficult";
        } else {
          difficultyLevel = "very_difficult";
        }

        // Calculate discrimination index (simplified)
        const discriminationIndex =
          avgScoreValue > 0
            ? Math.min(
                1.0,
                (moduleCompletionRate / 100) * (avgScoreValue / 100)
              )
            : 0;

        return {
          test_id: module.test_id,
          test_name: module.test_name,
          test_category: module.test_category,
          module_type: module.module_type,
          sequence: module.sequence,
          participants_started: participantsStarted.count,
          participants_completed: participantsCompleted.count,
          completion_rate: moduleCompletionRate,
          average_score: Math.round(avgScoreValue),
          average_time_minutes: avgTime.avg_time
            ? Math.round(Number(avgTime.avg_time) / 60)
            : 0,
          difficulty_level: difficultyLevel,
          discrimination_index: Math.round(discriminationIndex * 100) / 100,
        };
      })
    );

    // Get performance distribution
    const allResults = await db
      .select({
        scaled_score: testResults.scaled_score,
        grade: testResults.grade,
        percentile: testResults.percentile,
        user_id: testResults.user_id,
      })
      .from(testResults)
      .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          sql`${testResults.scaled_score} IS NOT NULL`
        )
      );

    // Calculate score distribution
    const scoreRanges = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    allResults.forEach((result) => {
      const score = parseFloat(result.scaled_score || "0");
      if (score <= 20) scoreRanges["0-20"]++;
      else if (score <= 40) scoreRanges["21-40"]++;
      else if (score <= 60) scoreRanges["41-60"]++;
      else if (score <= 80) scoreRanges["61-80"]++;
      else scoreRanges["81-100"]++;
    });

    // Calculate grade distribution
    const gradeDistribution = allResults.reduce(
      (acc, result) => {
        if (result.grade) {
          acc[result.grade] = (acc[result.grade] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate percentile ranges
    const percentileRanges = {
      "0-25": 0,
      "26-50": 0,
      "51-75": 0,
      "76-100": 0,
    };

    allResults.forEach((result) => {
      const percentile = parseFloat(result.percentile || "0");
      if (percentile <= 25) percentileRanges["0-25"]++;
      else if (percentile <= 50) percentileRanges["26-50"]++;
      else if (percentile <= 75) percentileRanges["51-75"]++;
      else percentileRanges["76-100"]++;
    });

    // Get top performers
    const topPerformers = await db
      .select({
        user_id: users.id,
        name: users.name,
        avg_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
        avg_percentile: avg(sql`CAST(${testResults.percentile} AS DECIMAL)`),
      })
      .from(testResults)
      .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .innerJoin(users, eq(testAttempts.user_id, users.id))
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          sql`${testResults.scaled_score} IS NOT NULL`
        )
      )
      .groupBy(users.id, users.name)
      .orderBy(desc(avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`)))
      .limit(5);

    const topPerformersData = topPerformers.map((performer) => ({
      user_id: performer.user_id,
      name: performer.name,
      overall_score: Math.round(Number(performer.avg_score) || 0),
      percentile: Math.round(Number(performer.avg_percentile) || 0),
    }));

    // Calculate assessment quality metrics
    const totalAttempts = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(eq(testAttempts.session_test_id, sessionId));

    const completedAttempts = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          eq(testAttempts.status, "completed")
        )
      );

    const overallReliability =
      totalAttempts[0].count > 0
        ? completedAttempts[0].count / totalAttempts[0].count
        : 0;

    const completionConsistency =
      testModuleAnalysis.length > 0
        ? testModuleAnalysis.reduce(
            (sum, module) => sum + module.completion_rate,
            0
          ) /
          testModuleAnalysis.length /
          100
        : 0;

    const timeEfficiencyAverage =
      testModuleAnalysis.length > 0
        ? testModuleAnalysis.reduce((sum, module) => {
            const expectedTime = 60; // Default expected time
            const actualTime = module.average_time_minutes || expectedTime;
            return sum + Math.min(100, (expectedTime / actualTime) * 100);
          }, 0) / testModuleAnalysis.length
        : 100;

    const dataQualityScore =
      (overallReliability +
        completionConsistency +
        timeEfficiencyAverage / 100) /
      3;

    // Detect anomalies (simplified)
    let anomalyCount = 0;
    // Check for unusually fast completions
    const fastCompletions = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          eq(testAttempts.status, "completed"),
          sql`${testAttempts.time_spent} < 300` // Less than 5 minutes
        )
      );
    anomalyCount += fastCompletions[0].count;

    // Generate key insights
    const keyInsights = [];

    // Strength insights
    if (completionRate >= 80) {
      keyInsights.push({
        type: "strength" as const,
        title:
          queryParams.language === "id"
            ? "Tingkat Penyelesaian Tinggi"
            : "High Completion Rate",
        description:
          queryParams.language === "id"
            ? `${completionRate}% peserta berhasil menyelesaikan assessment dengan baik.`
            : `${completionRate}% of participants successfully completed the assessment.`,
        supporting_data: { completion_rate: completionRate },
      });
    }

    // Concern insights
    if (dropoutCount > totalStarted.count * 0.2) {
      keyInsights.push({
        type: "concern" as const,
        title:
          queryParams.language === "id"
            ? "Tingkat Dropout Tinggi"
            : "High Dropout Rate",
        description:
          queryParams.language === "id"
            ? `${dropoutCount} peserta tidak menyelesaikan assessment.`
            : `${dropoutCount} participants did not complete the assessment.`,
        supporting_data: { dropout_count: dropoutCount },
      });
    }

    // Trend insights
    if (testModuleAnalysis.length > 1) {
      const difficultyTrend = testModuleAnalysis.map((m) => m.average_score);
      const isIncreasing = difficultyTrend.every(
        (score, i) => i === 0 || score >= difficultyTrend[i - 1]
      );
      const isDecreasing = difficultyTrend.every(
        (score, i) => i === 0 || score <= difficultyTrend[i - 1]
      );

      if (isIncreasing && !isDecreasing) {
        keyInsights.push({
          type: "trend" as const,
          title:
            queryParams.language === "id"
              ? "Performa Meningkat"
              : "Improving Performance",
          description:
            queryParams.language === "id"
              ? "Skor peserta menunjukkan tren peningkatan seiring berjalannya sesi."
              : "Participant scores show an improving trend throughout the session.",
          supporting_data: { trend: "increasing" },
        });
      } else if (isDecreasing && !isIncreasing) {
        keyInsights.push({
          type: "trend" as const,
          title:
            queryParams.language === "id"
              ? "Performa Menurun"
              : "Declining Performance",
          description:
            queryParams.language === "id"
              ? "Skor peserta menunjukkan tren penurunan, mungkin karena kelelahan."
              : "Participant scores show a declining trend, possibly due to fatigue.",
          supporting_data: { trend: "decreasing" },
        });
      }
    }

    // Recommendation insights
    if (averageTimeSpentMinutes > 120) {
      // More than 2 hours
      keyInsights.push({
        type: "recommendation" as const,
        title:
          queryParams.language === "id"
            ? "Pertimbangkan Pembagian Sesi"
            : "Consider Session Division",
        description:
          queryParams.language === "id"
            ? "Durasi assessment cukup panjang. Pertimbangkan membagi menjadi beberapa sesi."
            : "Assessment duration is quite long. Consider dividing into multiple sessions.",
        supporting_data: { average_time_minutes: averageTimeSpentMinutes },
      });
    }

    // Generate charts if requested
    let charts = undefined;
    if (queryParams.include_charts) {
      charts = [
        {
          type: "pie" as const,
          title:
            queryParams.language === "id"
              ? "Distribusi Status Partisipasi"
              : "Participation Status Distribution",
          data: [
            { status: "Completed", count: totalCompleted.count },
            { status: "Dropout", count: dropoutCount },
            { status: "No Show", count: noShowCount.count },
          ],
          description:
            queryParams.language === "id"
              ? "Pembagian status partisipasi peserta"
              : "Distribution of participant status",
        },
        {
          type: "bar" as const,
          title:
            queryParams.language === "id"
              ? "Performa per Modul Tes"
              : "Performance by Test Module",
          data: testModuleAnalysis.map((module) => ({
            module: module.test_name,
            completion_rate: module.completion_rate,
            average_score: module.average_score,
          })),
          description:
            queryParams.language === "id"
              ? "Tingkat penyelesaian dan skor rata-rata per modul"
              : "Completion rate and average score per module",
        },
        {
          type: "line" as const,
          title:
            queryParams.language === "id"
              ? "Distribusi Skor"
              : "Score Distribution",
          data: Object.entries(scoreRanges).map(([range, count]) => ({
            range,
            count,
          })),
          description:
            queryParams.language === "id"
              ? "Distribusi skor peserta dalam rentang nilai"
              : "Distribution of participant scores in score ranges",
        },
      ];
    }

    // Build report data
    const reportData: SessionSummaryReportData = {
      session_info: {
        id: session.id,
        session_name: session.session_name,
        session_code: session.session_code,
        target_position: session.target_position,
        start_time: session.start_time.toISOString(),
        end_time: session.end_time.toISOString(),
        location: session.location,
        description: session.description,
        proctor_name: proctorName,
      },
      participation_stats: {
        total_invited: totalInvited.count,
        total_registered: totalRegistered.count,
        total_started: totalStarted.count,
        total_completed: totalCompleted.count,
        no_show_count: noShowCount.count,
        dropout_count: dropoutCount,
        completion_rate: completionRate,
        average_time_spent_minutes: averageTimeSpentMinutes,
      },
      test_modules: testModuleAnalysis,
      performance_distribution: {
        score_ranges: scoreRanges,
        grade_distribution: gradeDistribution,
        percentile_ranges: percentileRanges,
        top_performers: topPerformersData,
      },
      assessment_quality: {
        overall_reliability: Math.round(overallReliability * 100) / 100,
        completion_consistency: Math.round(completionConsistency * 100) / 100,
        time_efficiency_average: Math.round(timeEfficiencyAverage),
        data_quality_score: Math.round(dataQualityScore * 100) / 100,
        anomaly_count: anomalyCount,
      },
      key_insights: keyInsights,
      charts,
    };

    const response: GetSessionSummaryReportResponse = {
      success: true,
      message: `Session summary report for "${session.session_name}" generated successfully`,
      data: reportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error generating session summary report:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to generate session summary report",
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          code: "INTERNAL_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
