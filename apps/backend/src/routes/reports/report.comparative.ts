import { Context } from "hono";
import { eq, and, desc, asc, count, sql, avg, sum } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
  testResults,
  tests,
  users,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetComparativeReportQuery,
  type GetComparativeReportResponse,
  type ReportErrorResponse,
  type ComparativeReportData,
  calculateCompletionRate,
  calculateReportTimeEfficiency,
  determineRecommendationCategory,
} from "shared-types";

export async function getComparativeReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const { sessionId } = c.req.param();
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: GetComparativeReportQuery = {
      format: (rawQuery.format as any) || "json",
      comparison_metric: (rawQuery.comparison_metric as any) || "scaled_score",
      include_charts: rawQuery.include_charts !== "false",
      include_rankings: rawQuery.include_rankings !== "false",
      include_distribution_analysis:
        rawQuery.include_distribution_analysis !== "false",
      include_cluster_analysis: rawQuery.include_cluster_analysis === "true",
      top_performers_count: parseInt(rawQuery.top_performers_count) || 10,
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
        status: testSessions.status,
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

    // Get all participants and their results
    const participantResults = await db
      .select({
        user_id: users.id,
        name: users.name,
        email: users.email,
        gender: users.gender,
        education: users.education,
        birth_date: users.birth_date,
        overall_score: avg(sql`CAST(${testResults.scaled_score} AS DECIMAL)`),
        overall_percentile: avg(
          sql`CAST(${testResults.percentile} AS DECIMAL)`
        ),
        overall_grade: testResults.grade, // We'll take the most common grade later
        total_attempts: count(testAttempts.id),
        completed_attempts: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
        total_time: sum(testAttempts.time_spent),
        avg_completion_percentage: avg(
          sql`CAST(${testResults.completion_percentage} AS DECIMAL)`
        ),
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .leftJoin(
        testAttempts,
        and(
          eq(testAttempts.user_id, users.id),
          eq(testAttempts.session_test_id, sessionId)
        )
      )
      .leftJoin(testResults, eq(testResults.attempt_id, testAttempts.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .groupBy(
        users.id,
        users.name,
        users.email,
        users.gender,
        users.education,
        users.birth_date,
        testResults.grade
      )
      .having(sql`COUNT(${testAttempts.id}) > 0`); // Only participants with attempts

    if (participantResults.length < 2) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Insufficient data for comparative analysis",
        errors: [
          {
            field: "participants",
            message:
              "At least 2 participants with completed tests are required for comparison",
            code: "INSUFFICIENT_DATA",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get detailed trait scores for each participant
    const participantTraits = await db
      .select({
        user_id: testResults.user_id,
        traits: testResults.traits,
      })
      .from(testResults)
      .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          sql`${testResults.traits} IS NOT NULL`
        )
      );

    // Process participant data for rankings
    const processedParticipants = participantResults.map((participant) => {
      const overallScore = Number(participant.overall_score) || 0;
      const overallPercentile = Number(participant.overall_percentile) || 0;
      const completionRate = calculateCompletionRate(
        Number(participant.completed_attempts),
        participant.total_attempts
      );

      // Calculate time efficiency
      const totalTimeMinutes = (Number(participant.total_time) || 0) / 60;
      const expectedTimeMinutes = participant.total_attempts * 60; // Assume 60 min per test
      const timeEfficiency = calculateReportTimeEfficiency(
        totalTimeMinutes,
        expectedTimeMinutes
      );

      // Get traits for this participant
      const userTraits = participantTraits
        .filter((t) => t.user_id === participant.user_id)
        .flatMap((t) => {
          try {
            return Array.isArray(t.traits)
              ? t.traits
              : JSON.parse(t.traits as unknown as string);
          } catch {
            return [];
          }
        });

      // Identify standout traits (high scores) and concern areas (low scores)
      const standoutTraits = userTraits
        .filter((trait: any) => trait.score >= 80)
        .map((trait: any) => trait.name)
        .slice(0, 3);

      const concernAreas = userTraits
        .filter((trait: any) => trait.score <= 40)
        .map((trait: any) => trait.name)
        .slice(0, 3);

      // Determine recommendation category
      const positionFitScore = overallPercentile;
      const recommendationCategory = determineRecommendationCategory(
        overallScore,
        completionRate,
        positionFitScore
      );

      return {
        user_id: participant.user_id,
        name: participant.name,
        email: participant.email,
        overall_score: Math.round(overallScore),
        percentile: Math.round(overallPercentile),
        grade: participant.overall_grade,
        completion_rate: Math.round(completionRate),
        time_efficiency: Math.round(timeEfficiency),
        standout_traits: standoutTraits,
        concern_areas: concernAreas,
        recommendation_category: recommendationCategory,
        raw_data: {
          total_attempts: participant.total_attempts,
          completed_attempts: Number(participant.completed_attempts),
          total_time_minutes: totalTimeMinutes,
          traits: userTraits,
        },
      };
    });

    // Sort participants based on comparison metric
    let sortedParticipants = [...processedParticipants];
    switch (queryParams.comparison_metric) {
      case "raw_score":
      case "scaled_score":
        sortedParticipants.sort((a, b) => b.overall_score - a.overall_score);
        break;
      case "percentile":
        sortedParticipants.sort((a, b) => b.percentile - a.percentile);
        break;
      case "completion_rate":
        sortedParticipants.sort(
          (a, b) => b.completion_rate - a.completion_rate
        );
        break;
      case "time_efficiency":
        sortedParticipants.sort(
          (a, b) => b.time_efficiency - a.time_efficiency
        );
        break;
      default:
        sortedParticipants.sort((a, b) => b.overall_score - a.overall_score);
    }

    // Assign rankings
    const participantRankings = sortedParticipants.map(
      (participant, index) => ({
        rank: index + 1,
        user_id: participant.user_id,
        name: participant.name,
        email: participant.email,
        overall_score: participant.overall_score,
        percentile: participant.percentile,
        grade: participant.grade,
        completion_rate: participant.completion_rate,
        time_efficiency: participant.time_efficiency,
        standout_traits: participant.standout_traits,
        concern_areas: participant.concern_areas,
        recommendation_category: participant.recommendation_category,
      })
    );

    // Calculate statistical analysis
    const scores = processedParticipants.map((p) => p.overall_score);
    const meanScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore =
      sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)];

    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) /
      scores.length;
    const standardDeviation = Math.sqrt(variance);

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Calculate quartiles
    const q1Index = Math.floor(sortedScores.length * 0.25);
    const q2Index = Math.floor(sortedScores.length * 0.5);
    const q3Index = Math.floor(sortedScores.length * 0.75);

    const q1 = sortedScores[q1Index];
    const q2 = sortedScores[q2Index];
    const q3 = sortedScores[q3Index];

    // Identify outliers using IQR method
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = processedParticipants
      .filter(
        (p) => p.overall_score < lowerBound || p.overall_score > upperBound
      )
      .map((p) => ({
        user_id: p.user_id,
        name: p.name,
        score: p.overall_score,
        type:
          p.overall_score > upperBound
            ? ("high_outlier" as const)
            : ("low_outlier" as const),
      }));

    // Get test-by-test comparison
    const testsInSession = await db
      .select({
        test_id: tests.id,
        test_name: tests.name,
        test_category: tests.category,
      })
      .from(tests)
      .innerJoin(testAttempts, eq(tests.id, testAttempts.test_id))
      .where(eq(testAttempts.session_test_id, sessionId))
      .groupBy(tests.id, tests.name, tests.category);

    const testComparisons = await Promise.all(
      testsInSession.map(async (test) => {
        // Get top performers for this test
        const topPerformers = await db
          .select({
            user_id: users.id,
            name: users.name,
            scaled_score: testResults.scaled_score,
            percentile: testResults.percentile,
          })
          .from(testResults)
          .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .innerJoin(users, eq(testAttempts.user_id, users.id))
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testResults.test_id, test.test_id),
              sql`${testResults.scaled_score} IS NOT NULL`
            )
          )
          .orderBy(desc(sql`CAST(${testResults.scaled_score} AS DECIMAL)`))
          .limit(3);

        // Get bottom performers for this test
        const bottomPerformers = await db
          .select({
            user_id: users.id,
            name: users.name,
            scaled_score: testResults.scaled_score,
            percentile: testResults.percentile,
          })
          .from(testResults)
          .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .innerJoin(users, eq(testAttempts.user_id, users.id))
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testResults.test_id, test.test_id),
              sql`${testResults.scaled_score} IS NOT NULL`
            )
          )
          .orderBy(asc(sql`CAST(${testResults.scaled_score} AS DECIMAL)`))
          .limit(3);

        // Get score distribution for this test
        const testScores = await db
          .select({
            scaled_score: testResults.scaled_score,
          })
          .from(testResults)
          .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .where(
            and(
              eq(testAttempts.session_test_id, sessionId),
              eq(testResults.test_id, test.test_id),
              sql`${testResults.scaled_score} IS NOT NULL`
            )
          );

        const scoreDistribution = {
          "0-20": 0,
          "21-40": 0,
          "41-60": 0,
          "61-80": 0,
          "81-100": 0,
        };

        testScores.forEach((result) => {
          const score = parseFloat(result.scaled_score || "0");
          if (score <= 20) scoreDistribution["0-20"]++;
          else if (score <= 40) scoreDistribution["21-40"]++;
          else if (score <= 60) scoreDistribution["41-60"]++;
          else if (score <= 80) scoreDistribution["61-80"]++;
          else scoreDistribution["81-100"]++;
        });

        return {
          test_id: test.test_id,
          test_name: test.test_name,
          test_category: test.test_category,
          top_performers: topPerformers.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            score: Math.round(parseFloat(p.scaled_score || "0")),
            percentile: Math.round(parseFloat(p.percentile || "0")),
          })),
          bottom_performers: bottomPerformers.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            score: Math.round(parseFloat(p.scaled_score || "0")),
            percentile: Math.round(parseFloat(p.percentile || "0")),
          })),
          score_distribution: scoreDistribution,
        };
      })
    );

    // Analyze trait distribution
    const allTraits = participantTraits.flatMap((pt) => {
      try {
        const traits = Array.isArray(pt.traits)
          ? pt.traits
          : JSON.parse(pt.traits as unknown as string);
        return traits.map((trait: any) => ({
          user_id: pt.user_id,
          trait_name: trait.name,
          trait_category: trait.category || "General",
          score: trait.score,
        }));
      } catch {
        return [];
      }
    });

    // Group traits by name
    const traitGroups = allTraits.reduce(
      (groups, trait) => {
        if (!groups[trait.trait_name]) {
          groups[trait.trait_name] = [];
        }
        groups[trait.trait_name].push(trait);
        return groups;
      },
      {} as Record<string, any[]>
    );

    const traitDistribution = Object.entries(traitGroups)
      .map(([traitName, traits]) => {
        const scores = (traits as any[]).map((t: any) => t.score);
        const averageScore =
          scores.reduce((sum: number, score: number) => sum + score, 0) /
          scores.length;
        const variance =
          scores.reduce(
            (sum: number, score: number) =>
              sum + Math.pow(score - averageScore, 2),
            0
          ) / scores.length;
        const variability = Math.sqrt(variance);

        // Create distribution by strength levels
        const distribution = {
          very_low: 0,
          low: 0,
          average: 0,
          high: 0,
          very_high: 0,
        };

        scores.forEach((score: number) => {
          if (score < 20) distribution.very_low++;
          else if (score < 40) distribution.low++;
          else if (score < 60) distribution.average++;
          else if (score < 80) distribution.high++;
          else distribution.very_high++;
        });

        // Get top scorers for this trait
        const topScorers = (traits as any[])
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 3)
          .map((t: any) => {
            const participant = processedParticipants.find(
              (p) => p.user_id === t.user_id
            );
            return {
              user_id: t.user_id,
              name: participant?.name || "Unknown",
              score: t.score,
            };
          });

        return {
          trait_name: traitName,
          trait_category: (traits as any[])[0]?.trait_category || "General",
          distribution,
          top_scorers: topScorers,
          average_score: Math.round(averageScore),
          variability: Math.round(variability),
        };
      })
      .slice(0, 15); // Limit to top 15 traits

    // Simple cluster analysis (if requested)
    let clusterAnalysis = null;
    if (
      queryParams.include_cluster_analysis &&
      processedParticipants.length >= 4
    ) {
      // Simplified clustering based on overall performance
      const clusters = [];

      // High performers cluster
      const highPerformers = processedParticipants.filter(
        (p) => p.overall_score >= 80
      );
      if (highPerformers.length > 0) {
        clusters.push({
          cluster_id: "high_performers",
          cluster_name:
            queryParams.language === "id"
              ? "Performer Tinggi"
              : "High Performers",
          participant_count: highPerformers.length,
          characteristics: [
            queryParams.language === "id" ? "Skor tinggi" : "High scores",
            queryParams.language === "id"
              ? "Completion rate baik"
              : "Good completion rate",
          ],
          representative_traits: highPerformers
            .flatMap((p) => p.standout_traits)
            .filter((trait, index, arr) => arr.indexOf(trait) === index)
            .slice(0, 3),
          members: highPerformers.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            distance_from_center: Math.abs(p.overall_score - 90), // Distance from ideal score
          })),
        });
      }

      // Average performers cluster
      const averagePerformers = processedParticipants.filter(
        (p) => p.overall_score >= 60 && p.overall_score < 80
      );
      if (averagePerformers.length > 0) {
        clusters.push({
          cluster_id: "average_performers",
          cluster_name:
            queryParams.language === "id"
              ? "Performer Rata-rata"
              : "Average Performers",
          participant_count: averagePerformers.length,
          characteristics: [
            queryParams.language === "id" ? "Skor menengah" : "Moderate scores",
            queryParams.language === "id"
              ? "Potensi pengembangan"
              : "Development potential",
          ],
          representative_traits: averagePerformers
            .flatMap((p) => p.standout_traits)
            .filter((trait, index, arr) => arr.indexOf(trait) === index)
            .slice(0, 3),
          members: averagePerformers.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            distance_from_center: Math.abs(p.overall_score - 70),
          })),
        });
      }

      // Low performers cluster
      const lowPerformers = processedParticipants.filter(
        (p) => p.overall_score < 60
      );
      if (lowPerformers.length > 0) {
        clusters.push({
          cluster_id: "developing_performers",
          cluster_name:
            queryParams.language === "id"
              ? "Performer Berkembang"
              : "Developing Performers",
          participant_count: lowPerformers.length,
          characteristics: [
            queryParams.language === "id"
              ? "Memerlukan pengembangan"
              : "Requires development",
            queryParams.language === "id"
              ? "Potensi peningkatan besar"
              : "High improvement potential",
          ],
          representative_traits: lowPerformers
            .flatMap((p) => p.concern_areas)
            .filter((trait, index, arr) => arr.indexOf(trait) === index)
            .slice(0, 3),
          members: lowPerformers.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            distance_from_center: Math.abs(p.overall_score - 50),
          })),
        });
      }

      clusterAnalysis = {
        clusters,
        cluster_validity: clusters.length > 1 ? 0.75 : 0.5, // Simplified validity score
      };
    }

    // Generate hiring recommendations
    const hiringRecommendations = {
      highly_recommended: participantRankings
        .filter((p) => p.recommendation_category === "highly_recommended")
        .map((p) => p.user_id),
      recommended: participantRankings
        .filter((p) => p.recommendation_category === "recommended")
        .map((p) => p.user_id),
      conditional: participantRankings
        .filter((p) => p.recommendation_category === "conditional")
        .map((p) => p.user_id),
      not_recommended: participantRankings
        .filter((p) => p.recommendation_category === "not_recommended")
        .map((p) => p.user_id),
      decision_criteria: [
        {
          criterion:
            queryParams.language === "id"
              ? "Skor Keseluruhan"
              : "Overall Score",
          weight: 0.4,
          description:
            queryParams.language === "id"
              ? "Skor rata-rata dari semua tes yang diambil"
              : "Average score from all tests taken",
        },
        {
          criterion:
            queryParams.language === "id"
              ? "Tingkat Penyelesaian"
              : "Completion Rate",
          weight: 0.3,
          description:
            queryParams.language === "id"
              ? "Persentase tes yang diselesaikan"
              : "Percentage of tests completed",
        },
        {
          criterion:
            queryParams.language === "id"
              ? "Efisiensi Waktu"
              : "Time Efficiency",
          weight: 0.2,
          description:
            queryParams.language === "id"
              ? "Efisiensi penggunaan waktu dalam menyelesaikan tes"
              : "Efficiency in time usage for completing tests",
        },
        {
          criterion:
            queryParams.language === "id"
              ? "Kesesuaian Trait"
              : "Trait Compatibility",
          weight: 0.1,
          description:
            queryParams.language === "id"
              ? "Kesesuaian trait dengan posisi yang dituju"
              : "Trait compatibility with target position",
        },
      ],
    };

    // Generate charts if requested
    let charts = undefined;
    if (queryParams.include_charts) {
      charts = [
        {
          type: "scatter" as const,
          title:
            queryParams.language === "id"
              ? "Perbandingan Skor vs Efisiensi Waktu"
              : "Score vs Time Efficiency Comparison",
          data: participantRankings.map((p) => ({
            name: p.name,
            score: p.overall_score,
            time_efficiency: p.time_efficiency,
            recommendation: p.recommendation_category,
          })),
          description:
            queryParams.language === "id"
              ? "Hubungan antara skor keseluruhan dan efisiensi waktu"
              : "Relationship between overall score and time efficiency",
        },
        {
          type: "box_plot" as const,
          title:
            queryParams.language === "id"
              ? "Distribusi Skor per Tes"
              : "Score Distribution by Test",
          data: testComparisons.map((test) => ({
            test: test.test_name,
            scores: Object.entries(test.score_distribution).map(
              ([range, count]) => ({
                range,
                count,
              })
            ),
          })),
          description:
            queryParams.language === "id"
              ? "Distribusi skor untuk setiap tes"
              : "Score distribution for each test",
        },
        {
          type: "radar" as const,
          title:
            queryParams.language === "id"
              ? "Profil Trait Top 5 Performer"
              : "Top 5 Performers Trait Profile",
          data: participantRankings.slice(0, 5).map((p) => ({
            name: p.name,
            traits: traitDistribution.slice(0, 6).map((trait) => ({
              trait: trait.trait_name,
              score:
                trait.top_scorers.find((ts) => ts.user_id === p.user_id)
                  ?.score || 50,
            })),
          })),
          description:
            queryParams.language === "id"
              ? "Profil trait 5 performer teratas"
              : "Trait profile of top 5 performers",
        },
      ];
    }

    // Build report data
    const reportData: ComparativeReportData = {
      session_context: {
        session_id: session.id,
        session_name: session.session_name,
        target_position: session.target_position,
        total_participants: participantRankings.length,
        comparison_metric: queryParams.comparison_metric,
      },
      participant_rankings: participantRankings,
      statistical_analysis: {
        mean_score: Math.round(meanScore),
        median_score: Math.round(medianScore),
        standard_deviation: Math.round(standardDeviation * 100) / 100,
        score_range: {
          min: minScore,
          max: maxScore,
        },
        quartiles: {
          q1: Math.round(q1),
          q2: Math.round(q2),
          q3: Math.round(q3),
        },
        outliers,
      },
      test_comparisons: testComparisons,
      trait_distribution: traitDistribution,
      cluster_analysis: clusterAnalysis,
      hiring_recommendations: hiringRecommendations,
      charts,
    };

    const response: GetComparativeReportResponse = {
      success: true,
      message: `Comparative analysis report for session "${session.session_name}" generated successfully`,
      data: reportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error generating comparative analysis report:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to generate comparative analysis report",
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
