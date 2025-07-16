import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, userPerformanceStats, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Challenging Performers Data Point Interface
interface ChallengingPerformerDataPoint {
  user_id: string;
  name: string;
  email: string;
  average_raw_score: number;
  average_scaled_score: number;
  total_tests_taken: number;
  total_tests_completed: number;
  completion_rate: number;
  performance_rank: number;
  performance_percentile: number;
  consistency_score: number;
  last_test_date: string;
  improvement_potential: number; // 0-100 score indicating potential for improvement
}

// Challenging Performers Response Interface
interface ChallengingPerformersResponse {
  success: true;
  message: string;
  data: {
    total_participants: number;
    challenging_performers: ChallengingPerformerDataPoint[];
    support_metrics: {
      lowest_average_score: number;
      average_score_across_all: number;
      bottom_10_percent_threshold: number;
      most_improvement_potential: {
        name: string;
        improvement_score: number;
      };
      completion_rate_issues: number; // count of users with <50% completion rate
    };
    recommendations: {
      additional_support_needed: number;
      retake_recommendations: number;
      personalized_learning_candidates: number;
    };
    calculation_info: {
      last_updated: string;
      data_freshness: string; // "fresh" | "stale"
      next_update_in_hours: number;
    };
  };
  timestamp: string;
}

export async function getChallengingPerformersHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get challenging performers (lowest scores) from cached performance stats
    const challengingPerformers = await db
      .select({
        user_id: userPerformanceStats.user_id,
        name: users.name,
        email: users.email,
        average_raw_score: userPerformanceStats.average_raw_score,
        average_scaled_score: userPerformanceStats.average_scaled_score,
        total_tests_taken: userPerformanceStats.total_tests_taken,
        total_tests_completed: userPerformanceStats.total_tests_completed,
        completion_rate: userPerformanceStats.completion_rate,
        performance_rank: userPerformanceStats.performance_rank,
        performance_percentile: userPerformanceStats.performance_percentile,
        consistency_score: userPerformanceStats.consistency_score,
        last_test_date: userPerformanceStats.last_test_date,
        calculation_date: userPerformanceStats.calculation_date,
      })
      .from(userPerformanceStats)
      .innerJoin(users, sql`${userPerformanceStats.user_id} = ${users.id}`)
      .where(sql`${userPerformanceStats.average_raw_score} IS NOT NULL`)
      .orderBy(sql`${userPerformanceStats.average_raw_score} ASC`) // Ascending for lowest scores
      .limit(20); // Bottom 20 performers

    // Get total participants count
    const totalParticipantsResult = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(userPerformanceStats);

    const totalParticipants = totalParticipantsResult[0]?.count || 0;

    // Get all performance data for metrics calculation
    const allPerformanceData = await db
      .select({
        average_raw_score: userPerformanceStats.average_raw_score,
        completion_rate: userPerformanceStats.completion_rate,
        total_tests_taken: userPerformanceStats.total_tests_taken,
        total_tests_completed: userPerformanceStats.total_tests_completed,
      })
      .from(userPerformanceStats)
      .where(sql`${userPerformanceStats.average_raw_score} IS NOT NULL`);

    // Calculate support metrics
    let supportMetrics = {
      lowest_average_score: 0,
      average_score_across_all: 0,
      bottom_10_percent_threshold: 0,
      most_improvement_potential: {
        name: "N/A",
        improvement_score: 0,
      },
      completion_rate_issues: 0,
    };

    let recommendations = {
      additional_support_needed: 0,
      retake_recommendations: 0,
      personalized_learning_candidates: 0,
    };

    if (allPerformanceData.length > 0) {
      const scores = allPerformanceData.map(d => Number(d.average_raw_score) || 0);
      const completionRates = allPerformanceData.map(d => Number(d.completion_rate) || 0);

      supportMetrics.lowest_average_score = Math.min(...scores);
      supportMetrics.average_score_across_all = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Calculate bottom 10% threshold
      const sortedScores = [...scores].sort((a, b) => a - b);
      const bottom10PercentIndex = Math.floor(sortedScores.length * 0.1);
      supportMetrics.bottom_10_percent_threshold = sortedScores[bottom10PercentIndex] || 0;

      // Count completion rate issues
      supportMetrics.completion_rate_issues = completionRates.filter(rate => rate < 50).length;
    }

    // Calculate improvement potential and recommendations for each performer
    const formattedChallengingPerformers: ChallengingPerformerDataPoint[] = challengingPerformers.map((performer) => {
      const avgScore = Number(performer.average_raw_score) || 0;
      const completionRate = Number(performer.completion_rate) || 0;
      const totalTaken = Number(performer.total_tests_taken) || 0;
      const totalCompleted = Number(performer.total_tests_completed) || 0;
      const consistencyScore = Number(performer.consistency_score) || 0;

      // Calculate improvement potential based on multiple factors
      // Higher potential if: low completion rate, inconsistent scores, few tests taken
      let improvementPotential = 0;
      
      if (completionRate < 50) improvementPotential += 30; // Low completion rate
      if (consistencyScore < 50) improvementPotential += 25; // Inconsistent performance
      if (totalTaken < 5) improvementPotential += 20; // Limited test experience
      if (avgScore < supportMetrics.average_score_across_all * 0.7) improvementPotential += 25; // Significantly below average
      
      improvementPotential = Math.min(100, improvementPotential); // Cap at 100

      // Count recommendations
      if (avgScore < supportMetrics.average_score_across_all * 0.6) {
        recommendations.additional_support_needed++;
      }
      if (completionRate < 70 && totalTaken >= 3) {
        recommendations.retake_recommendations++;
      }
      if (improvementPotential > 60) {
        recommendations.personalized_learning_candidates++;
      }

      return {
        user_id: performer.user_id,
        name: performer.name,
        email: performer.email,
        average_raw_score: Math.round(avgScore * 100) / 100,
        average_scaled_score: Math.round((Number(performer.average_scaled_score) || 0) * 100) / 100,
        total_tests_taken: totalTaken,
        total_tests_completed: totalCompleted,
        completion_rate: Math.round(completionRate * 100) / 100,
        performance_rank: Number(performer.performance_rank) || 0,
        performance_percentile: Math.round((Number(performer.performance_percentile) || 0) * 100) / 100,
        consistency_score: Math.round(consistencyScore * 100) / 100,
        last_test_date: performer.last_test_date?.toISOString() || "",
        improvement_potential: Math.round(improvementPotential * 100) / 100,
      };
    });

    // Find performer with highest improvement potential
    if (formattedChallengingPerformers.length > 0) {
      const maxImprovementPerformer = formattedChallengingPerformers.reduce((max, current) => 
        current.improvement_potential > max.improvement_potential ? current : max
      );
      
      supportMetrics.most_improvement_potential = {
        name: maxImprovementPerformer.name,
        improvement_score: maxImprovementPerformer.improvement_potential,
      };
    }

    // Calculate data freshness
    const lastUpdate = challengingPerformers[0]?.calculation_date;
    const now = new Date();
    const hoursAgo = lastUpdate ? (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60) : 24;
    
    const dataFreshness = hoursAgo < 6 ? "fresh" : "stale";
    const nextUpdateInHours = Math.max(0, 24 - hoursAgo); // Daily updates

    const response: ChallengingPerformersResponse = {
      success: true,
      message: "Challenging performers data retrieved successfully",
      data: {
        total_participants: totalParticipants,
        challenging_performers: formattedChallengingPerformers,
        support_metrics: {
          ...supportMetrics,
          lowest_average_score: Math.round(supportMetrics.lowest_average_score * 100) / 100,
          average_score_across_all: Math.round(supportMetrics.average_score_across_all * 100) / 100,
          bottom_10_percent_threshold: Math.round(supportMetrics.bottom_10_percent_threshold * 100) / 100,
        },
        recommendations,
        calculation_info: {
          last_updated: lastUpdate?.toISOString() || "",
          data_freshness: dataFreshness,
          next_update_in_hours: Math.round(nextUpdateInHours * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting challenging performers data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve challenging performers data",
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error occurred",
            code: "INTERNAL_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}