import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, userPerformanceStats, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Top Performers Data Point Interface
interface TopPerformerDataPoint {
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
}

// Top Performers Response Interface
interface TopPerformersResponse {
  success: true;
  message: string;
  data: {
    total_participants: number;
    top_performers: TopPerformerDataPoint[];
    performance_metrics: {
      highest_average_score: number;
      average_score_across_all: number;
      top_10_percent_threshold: number;
      most_consistent_performer: {
        name: string;
        consistency_score: number;
      };
    };
    calculation_info: {
      last_updated: string;
      data_freshness: string; // "fresh" | "stale"
      next_update_in_hours: number;
    };
  };
  timestamp: string;
}

export async function getTopPerformersHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get top performers from cached performance stats
    const topPerformers = await db
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
      .orderBy(sql`${userPerformanceStats.average_raw_score} DESC`)
      .limit(20); // Top 20 performers

    // Get total participants count
    const totalParticipantsResult = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(userPerformanceStats);

    const totalParticipants = totalParticipantsResult[0]?.count || 0;

    // Calculate performance metrics
    const allScores = await db
      .select({
        average_raw_score: userPerformanceStats.average_raw_score,
        consistency_score: userPerformanceStats.consistency_score,
      })
      .from(userPerformanceStats)
      .where(sql`${userPerformanceStats.average_raw_score} IS NOT NULL`);

    let performanceMetrics = {
      highest_average_score: 0,
      average_score_across_all: 0,
      top_10_percent_threshold: 0,
      most_consistent_performer: {
        name: "N/A",
        consistency_score: 0,
      },
    };

    if (allScores.length > 0) {
      const scores = allScores.map(s => Number(s.average_raw_score) || 0);
      const consistencyScores = allScores.map(s => Number(s.consistency_score) || 0);

      performanceMetrics.highest_average_score = Math.max(...scores);
      performanceMetrics.average_score_across_all = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Calculate top 10% threshold
      const sortedScores = [...scores].sort((a, b) => b - a);
      const top10PercentIndex = Math.floor(sortedScores.length * 0.1);
      performanceMetrics.top_10_percent_threshold = sortedScores[top10PercentIndex] || 0;

      // Find most consistent performer
      const maxConsistencyIndex = consistencyScores.indexOf(Math.max(...consistencyScores));
      if (maxConsistencyIndex >= 0 && topPerformers[maxConsistencyIndex]) {
        performanceMetrics.most_consistent_performer = {
          name: topPerformers[maxConsistencyIndex].name,
          consistency_score: Math.max(...consistencyScores),
        };
      }
    }

    // Calculate data freshness
    const lastUpdate = topPerformers[0]?.calculation_date;
    const now = new Date();
    const hoursAgo = lastUpdate ? (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60) : 24;
    
    const dataFreshness = hoursAgo < 6 ? "fresh" : "stale";
    const nextUpdateInHours = Math.max(0, 24 - hoursAgo); // Daily updates

    // Format top performers data
    const formattedTopPerformers: TopPerformerDataPoint[] = topPerformers.map((performer) => ({
      user_id: performer.user_id,
      name: performer.name,
      email: performer.email,
      average_raw_score: Math.round((Number(performer.average_raw_score) || 0) * 100) / 100,
      average_scaled_score: Math.round((Number(performer.average_scaled_score) || 0) * 100) / 100,
      total_tests_taken: Number(performer.total_tests_taken) || 0,
      total_tests_completed: Number(performer.total_tests_completed) || 0,
      completion_rate: Math.round((Number(performer.completion_rate) || 0) * 100) / 100,
      performance_rank: Number(performer.performance_rank) || 0,
      performance_percentile: Math.round((Number(performer.performance_percentile) || 0) * 100) / 100,
      consistency_score: Math.round((Number(performer.consistency_score) || 0) * 100) / 100,
      last_test_date: performer.last_test_date?.toISOString() || "",
    }));

    const response: TopPerformersResponse = {
      success: true,
      message: "Top performers data retrieved successfully",
      data: {
        total_participants: totalParticipants,
        top_performers: formattedTopPerformers,
        performance_metrics: {
          ...performanceMetrics,
          highest_average_score: Math.round(performanceMetrics.highest_average_score * 100) / 100,
          average_score_across_all: Math.round(performanceMetrics.average_score_across_all * 100) / 100,
          top_10_percent_threshold: Math.round(performanceMetrics.top_10_percent_threshold * 100) / 100,
          most_consistent_performer: {
            ...performanceMetrics.most_consistent_performer,
            consistency_score: Math.round(performanceMetrics.most_consistent_performer.consistency_score * 100) / 100,
          },
        },
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
    console.error("Error getting top performers data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve top performers data",
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