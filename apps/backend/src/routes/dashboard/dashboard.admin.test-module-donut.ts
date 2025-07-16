import { Context } from "hono";
import { sql, eq } from "drizzle-orm";
import { getDbFromEnv, tests, testAttempts } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Test Module Donut Data Point Interface
interface TestModuleDonutDataPoint {
  module_type: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Test Module Donut Response Interface
interface TestModuleDonutResponse {
  success: true;
  message: string;
  data: {
    total_tests: number;
    module_types_count: number;
    data_points: TestModuleDonutDataPoint[];
    summary: {
      most_popular_module: string;
      most_popular_count: number;
      least_popular_module: string;
      least_popular_count: number;
      diversity_score: number; // 0-1, higher = more diverse
    };
  };
  timestamp: string;
}

// Module type colors mapping
const MODULE_TYPE_COLORS: Record<string, string> = {
  intelligence: "#3B82F6", // blue
  personality: "#10B981", // emerald
  aptitude: "#F59E0B", // amber
  interest: "#8B5CF6", // violet
  projective: "#EF4444", // red
  cognitive: "#06B6D4", // cyan
  other: "#6B7280", // gray
};

// Module type display names
const MODULE_TYPE_LABELS: Record<string, string> = {
  intelligence: "Intelligence Tests",
  personality: "Personality Tests",
  aptitude: "Aptitude Tests",
  interest: "Interest Tests",
  projective: "Projective Tests",
  cognitive: "Cognitive Tests",
  other: "Other Tests",
};

export async function getTestModuleDonutHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get test distribution by module_type from completed test attempts
    const moduleDistribution = await db
      .select({
        module_type: tests.module_type,
        count: sql<number>`COUNT(DISTINCT ${testAttempts.id})::int`,
      })
      .from(testAttempts)
      .innerJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(eq(testAttempts.status, "completed"))
      .groupBy(tests.module_type)
      .orderBy(sql`COUNT(DISTINCT ${testAttempts.id}) DESC`);

    // Calculate total completed test attempts
    const totalCompletedAttempts = moduleDistribution.reduce((sum, item) => sum + item.count, 0);

    // Convert to donut chart data points
    const dataPoints: TestModuleDonutDataPoint[] = moduleDistribution.map((item) => {
      const percentage = totalCompletedAttempts > 0 ? (item.count / totalCompletedAttempts) * 100 : 0;
      
      return {
        module_type: item.module_type,
        value: item.count,
        label: MODULE_TYPE_LABELS[item.module_type] || item.module_type.charAt(0).toUpperCase() + item.module_type.slice(1),
        percentage: Math.round(percentage * 100) / 100,
        color: MODULE_TYPE_COLORS[item.module_type] || MODULE_TYPE_COLORS.other,
      };
    });

    // Calculate summary statistics
    const mostPopular = dataPoints[0] || { module_type: "", value: 0, label: "" };
    const leastPopular = dataPoints[dataPoints.length - 1] || { module_type: "", value: 0, label: "" };
    
    // Calculate diversity score (Shannon diversity index normalized)
    let diversityScore = 0;
    if (totalCompletedAttempts > 0) {
      const entropy = dataPoints.reduce((sum, point) => {
        const proportion = point.value / totalCompletedAttempts;
        return sum - (proportion * Math.log2(proportion));
      }, 0);
      
      // Normalize to 0-1 scale (divide by log2 of max possible module types)
      const maxEntropy = Math.log2(dataPoints.length);
      diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    const response: TestModuleDonutResponse = {
      success: true,
      message: "Test module donut chart data retrieved successfully",
      data: {
        total_tests: totalCompletedAttempts,
        module_types_count: dataPoints.length,
        data_points: dataPoints,
        summary: {
          most_popular_module: mostPopular.label,
          most_popular_count: mostPopular.value,
          least_popular_module: leastPopular.label,
          least_popular_count: leastPopular.value,
          diversity_score: Math.round(diversityScore * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test module donut data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve test module donut data",
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