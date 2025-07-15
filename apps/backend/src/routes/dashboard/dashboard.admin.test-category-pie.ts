import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, tests } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Test Category Pie Data Point Interface
interface TestCategoryPieDataPoint {
  category: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Test Category Pie Response Interface
interface TestCategoryPieResponse {
  success: true;
  message: string;
  data: {
    total_tests: number;
    categories_count: number;
    data_points: TestCategoryPieDataPoint[];
    summary: {
      most_popular_category: string;
      most_popular_count: number;
      least_popular_category: string;
      least_popular_count: number;
      diversity_score: number; // 0-1, higher = more diverse
    };
  };
  timestamp: string;
}

// Category colors mapping
const CATEGORY_COLORS: Record<string, string> = {
  wais: "#3B82F6", // blue
  mbti: "#10B981", // emerald
  wartegg: "#F59E0B", // amber
  riasec: "#8B5CF6", // violet
  kraepelin: "#EF4444", // red
  pauli: "#06B6D4", // cyan
  bigfive: "#84CC16", // lime
  disc: "#EC4899", // pink
  other: "#6B7280", // gray
};

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  wais: "WAIS (Intelligence)",
  mbti: "MBTI (Personality)",
  wartegg: "Wartegg (Projective)",
  riasec: "RIASEC (Interest)",
  kraepelin: "Kraepelin (Concentration)",
  pauli: "Pauli (Attention)",
  bigfive: "Big Five (Personality)",
  disc: "DISC (Behavior)",
  other: "Other",
};

export async function getTestCategoryPieHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get test distribution by category
    const categoryDistribution = await db
      .select({
        category: tests.category,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(tests)
      .groupBy(tests.category)
      .orderBy(sql`COUNT(*) DESC`);

    // Calculate total tests
    const totalTests = categoryDistribution.reduce((sum, item) => sum + item.count, 0);

    // Convert to pie chart data points
    const dataPoints: TestCategoryPieDataPoint[] = categoryDistribution.map((item) => {
      const percentage = totalTests > 0 ? (item.count / totalTests) * 100 : 0;
      
      return {
        category: item.category,
        value: item.count,
        label: CATEGORY_LABELS[item.category] || item.category.toUpperCase(),
        percentage: Math.round(percentage * 100) / 100,
        color: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
      };
    });

    // Calculate summary statistics
    const mostPopular = dataPoints[0] || { category: "", value: 0, label: "" };
    const leastPopular = dataPoints[dataPoints.length - 1] || { category: "", value: 0, label: "" };
    
    // Calculate diversity score (Shannon diversity index normalized)
    let diversityScore = 0;
    if (totalTests > 0) {
      const entropy = dataPoints.reduce((sum, point) => {
        const proportion = point.value / totalTests;
        return sum - (proportion * Math.log2(proportion));
      }, 0);
      
      // Normalize to 0-1 scale (divide by log2 of max possible categories)
      const maxEntropy = Math.log2(dataPoints.length);
      diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    const response: TestCategoryPieResponse = {
      success: true,
      message: "Test category pie chart data retrieved successfully",
      data: {
        total_tests: totalTests,
        categories_count: dataPoints.length,
        data_points: dataPoints,
        summary: {
          most_popular_category: mostPopular.label,
          most_popular_count: mostPopular.value,
          least_popular_category: leastPopular.label,
          least_popular_count: leastPopular.value,
          diversity_score: Math.round(diversityScore * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test category pie data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve test category pie data",
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